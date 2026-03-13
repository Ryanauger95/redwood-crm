import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.crmUser.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      created_at: true,
      _count: { select: { activities: true, auditLogs: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, name, password, userRole } = body;

  if (!email || !name || !password) {
    return NextResponse.json({ error: "email, name, password required" }, { status: 400 });
  }

  const existing = await prisma.crmUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.crmUser.create({
    data: {
      email,
      name,
      password_hash,
      role: userRole || "agent",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  const adminId = parseInt((session?.user as { id?: string })?.id || "0");
  await logAudit({
    userId: adminId,
    action: "create",
    entityType: "user",
    entityId: user.id,
    newValue: { email, name, role: userRole || "agent" },
  });

  return NextResponse.json(user, { status: 201 });
}
