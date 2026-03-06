import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        business: { select: { le_name: true, lf_name: true, business_id: true } },
        person: { select: { full_name: true, person_id: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return NextResponse.json({ data: activities, total, pages: Math.ceil(total / limit), page });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { business_id, person_id, type, subject, body: activityBody, status, due_date } = body;

  // Get user id
  const user = await prisma.crmUser.findUnique({
    where: { email: session.user?.email ?? "" },
  });

  const activity = await prisma.activity.create({
    data: {
      business_id: business_id ? parseInt(business_id) : null,
      person_id: person_id ? parseInt(person_id) : null,
      user_id: user?.id ?? null,
      type,
      subject,
      body: activityBody,
      status: status || "open",
      due_date: due_date ? new Date(due_date) : null,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, completed_at, subject, body: activityBody, due_date } = body;

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (completed_at !== undefined) data.completed_at = completed_at ? new Date(completed_at) : null;
  if (subject !== undefined) data.subject = subject;
  if (activityBody !== undefined) data.body = activityBody;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;

  const activity = await prisma.activity.update({
    where: { id: parseInt(id) },
    data,
  });

  return NextResponse.json(activity);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  await prisma.activity.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ success: true });
}
