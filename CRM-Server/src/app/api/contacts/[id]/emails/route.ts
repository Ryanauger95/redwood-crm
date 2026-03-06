import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);

  const emails = await prisma.cachedEmail.findMany({
    where: { person_id: personId },
    orderBy: { sent_at: "desc" },
    take: 100,
  });

  // Group by thread_id
  const threadMap = new Map<string, typeof emails>();
  for (const email of emails) {
    const list = threadMap.get(email.thread_id) ?? [];
    list.push(email);
    threadMap.set(email.thread_id, list);
  }

  const threads = Array.from(threadMap.entries()).map(([thread_id, messages]) => ({
    thread_id,
    latest: messages[0],
    messages: messages.sort((a, b) =>
      (a.sent_at?.getTime() ?? 0) - (b.sent_at?.getTime() ?? 0)
    ),
  }));

  return NextResponse.json({ threads });
}
