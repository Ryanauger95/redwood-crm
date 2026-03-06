import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const templates = await prisma.emailTemplate.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { name, subject, body } = await req.json();
  if (!name || !subject || !body) {
    return NextResponse.json({ error: "Missing name, subject, or body" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: { user_id: user.id, name, subject, body },
  });

  return NextResponse.json({ template }, { status: 201 });
}
