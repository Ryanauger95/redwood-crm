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
  const viewId = parseInt(id, 10);

  const existing = await prisma.savedView.findUnique({ where: { id: viewId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, filters, columns, sort_field, sort_dir, is_hidden } = body;

  const updated = await prisma.savedView.update({
    where: { id: viewId },
    data: {
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters }),
      ...(columns !== undefined && { columns }),
      ...(sort_field !== undefined && { sort_field }),
      ...(sort_dir !== undefined && { sort_dir }),
      ...(is_hidden !== undefined && { is_hidden }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const viewId = parseInt(id, 10);

  const existing = await prisma.savedView.findUnique({ where: { id: viewId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.is_default)
    return NextResponse.json({ error: "Cannot delete default views" }, { status: 403 });

  await prisma.savedView.delete({ where: { id: viewId } });
  return NextResponse.json({ ok: true });
}
