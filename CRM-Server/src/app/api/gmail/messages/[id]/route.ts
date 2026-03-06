import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthedClient } from "@/lib/gmail";
import { google } from "googleapis";

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: unknown[];
}): { text: string; html: string } {
  let text = "";
  let html = "";
  function walk(part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      for (const sub of part.parts as typeof part[]) walk(sub);
    }
  }
  walk(payload);
  return { text, html };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Try cache first
  const cached = await prisma.cachedEmail.findFirst({
    where: { message_id: id },
    include: {
      business: { select: { business_id: true, le_name: true, lf_name: true } },
      person: { select: { person_id: true, full_name: true } },
    },
  });

  if (cached && cached.body_html) {
    return NextResponse.json(cached);
  }

  // Fetch full body from Gmail
  try {
    const client = await getAuthedClient(user.id);
    const gmail = google.gmail({ version: "v1", auth: client });
    const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
    const msg = res.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { text, html } = extractBody((msg.payload ?? {}) as any);

    if (cached) {
      const updated = await prisma.cachedEmail.update({
        where: { message_id: id },
        data: { body_text: text || null, body_html: html || null },
        include: {
          business: { select: { business_id: true, le_name: true, lf_name: true } },
          person: { select: { person_id: true, full_name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ message_id: id, body_text: text, body_html: html });
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
}
