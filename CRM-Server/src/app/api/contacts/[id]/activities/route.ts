import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);

  const activities = await prisma.activity.findMany({
    where: { person_id: personId },
    orderBy: { created_at: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(
    activities.map((a) => ({
      ...a,
      created_at: a.created_at.toISOString(),
      due_date: a.due_date?.toISOString() ?? null,
      completed_at: a.completed_at?.toISOString() ?? null,
    }))
  );
}
