import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function serializeNote(n: {
  id: bigint;
  property_id: bigint;
  description: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  user_id: number | null;
  user?: { name: string } | null;
}) {
  return {
    ...n,
    id: n.id.toString(),
    property_id: n.property_id.toString(),
    created_at: n.created_at?.toISOString() ?? null,
    updated_at: n.updated_at?.toISOString() ?? null,
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { description } = await req.json();
  if (!description?.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });

  const note = await prisma.propertyNote.create({
    data: {
      property_id: BigInt(id),
      description: description.trim(),
      user_id: user?.id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(serializeNote(note));
}
