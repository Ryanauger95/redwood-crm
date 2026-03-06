import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const businessId = parseInt(id);
  const { tag } = await req.json();

  if (!tag?.trim()) return NextResponse.json({ error: "Tag is required" }, { status: 400 });

  const newTag = await prisma.tag.create({
    data: { business_id: businessId, tag: tag.trim() },
  });

  return NextResponse.json(newTag, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tagId } = await req.json();

  await prisma.tag.delete({ where: { id: tagId } });

  return NextResponse.json({ success: true });
}
