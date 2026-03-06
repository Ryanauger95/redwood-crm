import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchAndSync } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await prisma.gmailAccount.findUnique({ where: { user_id: user.id } });
  if (!account) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const folder = searchParams.get("folder") || "inbox"; // inbox | sent
  const thread_id = searchParams.get("thread_id") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "25")));
  const skip = (page - 1) * limit;

  // If search query provided, sync matching messages from Gmail first
  if (q) {
    try {
      await searchAndSync(user.id, q, 20);
    } catch {
      // Non-fatal — serve cached results
    }
  }

  const where: Record<string, unknown> = { gmail_account_id: account.id };

  if (thread_id) {
    where.thread_id = thread_id;
  } else if (folder === "sent") {
    where.is_sent = true;
  } else {
    where.is_sent = false;
  }

  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { from_address: { contains: q, mode: "insensitive" } },
      { snippet: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, messages] = await Promise.all([
    prisma.cachedEmail.count({ where }),
    prisma.cachedEmail.findMany({
      where,
      orderBy: { sent_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        message_id: true,
        thread_id: true,
        from_address: true,
        to_addresses: true,
        subject: true,
        snippet: true,
        sent_at: true,
        is_read: true,
        is_sent: true,
        business_id: true,
        person_id: true,
        business: { select: { business_id: true, le_name: true, lf_name: true } },
        person: { select: { person_id: true, full_name: true } },
      },
    }),
  ]);

  // Group by thread for inbox/sent view (show only latest per thread)
  if (!thread_id) {
    const seen = new Set<string>();
    const deduped = messages.filter((m) => {
      if (seen.has(m.thread_id)) return false;
      seen.add(m.thread_id);
      return true;
    });
    return NextResponse.json({ data: deduped, total, page, pages: Math.ceil(total / limit) });
  }

  return NextResponse.json({ data: messages, total, page, pages: Math.ceil(total / limit) });
}
