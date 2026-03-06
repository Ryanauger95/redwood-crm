import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTemplate(id: number, userEmail: string) {
  const user = await prisma.crmUser.findUnique({ where: { email: userEmail } });
  if (!user) return null;
  return prisma.emailTemplate.findFirst({ where: { id, user_id: user.id } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const template = await getTemplate(parseInt(id), session.user!.email!);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getTemplate(parseInt(id), session.user!.email!);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, subject, body } = await req.json();
  const updated = await prisma.emailTemplate.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(subject !== undefined && { subject }),
      ...(body !== undefined && { body }),
      updated_at: new Date(),
    },
  });
  return NextResponse.json({ template: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getTemplate(parseInt(id), session.user!.email!);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.emailTemplate.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
