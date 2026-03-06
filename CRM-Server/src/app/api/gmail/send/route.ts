import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthedClient } from "@/lib/gmail";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await prisma.gmailAccount.findUnique({ where: { user_id: user.id } });
  if (!account) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  const body = await req.json();
  const { to, subject, text, html, thread_id } = body as {
    to: string;
    subject: string;
    text: string;
    html?: string;
    thread_id?: string;
  };

  if (!to || !subject) {
    return NextResponse.json({ error: "Missing to or subject" }, { status: 400 });
  }

  try {
    const client = await getAuthedClient(user.id);
    const gmail = google.gmail({ version: "v1", auth: client });

    // Build RFC 2822 message
    const htmlPart = html || text.replace(/\n/g, "<br>");
    const boundary = `boundary_${Date.now()}`;
    const raw = [
      `From: ${account.gmail_email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      text,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlPart,
      ``,
      `--${boundary}--`,
    ].join("\r\n");

    const encoded = Buffer.from(raw).toString("base64url");

    const params: {
      userId: string;
      requestBody: { raw: string; threadId?: string };
    } = {
      userId: "me",
      requestBody: { raw: encoded },
    };
    if (thread_id) params.requestBody.threadId = thread_id;

    const sent = await gmail.users.messages.send(params);

    // Cache the sent message
    const toAddrs = to.split(",").map((t) => t.trim()).filter(Boolean);
    const [businesses, people] = await Promise.all([
      prisma.business.findMany({ where: { email: { in: toAddrs } }, select: { business_id: true } }),
      prisma.person.findMany({ where: { email: { in: toAddrs } }, select: { person_id: true } }),
    ]);

    await prisma.cachedEmail.upsert({
      where: { message_id: sent.data.id! },
      create: {
        message_id: sent.data.id!,
        thread_id: sent.data.threadId!,
        gmail_account_id: account.id,
        from_address: account.gmail_email,
        to_addresses: JSON.stringify(toAddrs),
        subject,
        body_text: text,
        body_html: htmlPart,
        sent_at: new Date(),
        is_read: true,
        is_sent: true,
        business_id: businesses[0]?.business_id ?? null,
        person_id: people[0]?.person_id ?? null,
        synced_at: new Date(),
      },
      update: { synced_at: new Date() },
    });

    return NextResponse.json({ success: true, message_id: sent.data.id, thread_id: sent.data.threadId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
