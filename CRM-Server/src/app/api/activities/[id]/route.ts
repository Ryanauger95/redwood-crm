import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const activity = await prisma.activity.update({
    where: { id: parseInt(id) },
    data: { body: body.trim(), subject: body.trim() },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    ...activity,
    created_at: activity.created_at.toISOString(),
    due_date: activity.due_date?.toISOString() ?? null,
    completed_at: activity.completed_at?.toISOString() ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.activity.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ ok: true });
}
