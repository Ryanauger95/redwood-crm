import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const { description } = await req.json();
  if (!description?.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 });

  const note = await prisma.propertyNote.update({
    where: { id: BigInt(noteId) },
    data: { description: description.trim(), updated_at: new Date() },
  });

  return NextResponse.json({
    ...note,
    id: note.id.toString(),
    property_id: note.property_id.toString(),
    created_at: note.created_at?.toISOString() ?? null,
    updated_at: note.updated_at?.toISOString() ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  await prisma.propertyNote.delete({ where: { id: BigInt(noteId) } });

  return NextResponse.json({ ok: true });
}
