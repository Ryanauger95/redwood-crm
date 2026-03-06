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

  const person = await prisma.person.findUnique({
    where: { person_id: personId },
    include: {
      businessPeople: {
        include: {
          business: {
            select: {
              business_id: true,
              le_name: true,
              lf_name: true,
              city: true,
              acquisition_fit_score: true,
              enrichment_status: true,
              pipelineStage: { select: { stage: true } },
            },
          },
        },
        orderBy: { ownership_pct: "desc" },
      },
      activities: {
        orderBy: { created_at: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...person,
    activities: person.activities.map((a: typeof person.activities[number]) => ({
      ...a,
      created_at: a.created_at.toISOString(),
      due_date: a.due_date?.toISOString() ?? null,
      completed_at: a.completed_at?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);
  const body = await req.json();

  const STRING_FIELDS = ["linkedin_url", "city", "state_code", "email", "owner_background", "succession_signals", "other_businesses", "associated_case_number"];
  const BOOLEAN_FIELDS = ["in_active_foreclosure"];
  const updateData: Record<string, unknown> = {};
  for (const field of STRING_FIELDS) {
    if (field in body) updateData[field] = body[field] || null;
  }
  for (const field of BOOLEAN_FIELDS) {
    if (field in body) updateData[field] = body[field] === true || body[field] === "true" ? true : body[field] === false || body[field] === "false" ? false : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const person = await prisma.person.update({
    where: { person_id: personId },
    data: updateData,
  });

  return NextResponse.json(person);
}
