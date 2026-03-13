import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const businessId = parseInt(id);

  const business = await prisma.business.findUnique({
    where: { business_id: businessId },
    include: {
      businessPeople: {
        include: { person: true },
        orderBy: { ownership_pct: "desc" },
      },
      pipelineStage: true,
      tags: true,
      activities: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      },
      assignedUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...business,
    estimated_annual_profit: business.estimated_annual_profit?.toString() ?? null,
    estimated_annual_revenue: business.estimated_annual_revenue?.toString() ?? null,
    cms_star_rating: business.cms_star_rating?.toString() ?? null,
    profit_margin_pct: business.profit_margin_pct?.toString() ?? null,
    stage: business.pipelineStage?.stage ?? "Prospect",
    businessPeople: business.businessPeople.map((bp: typeof business.businessPeople[number]) => ({
      ...bp,
      ownership_pct: bp.ownership_pct?.toString() ?? null,
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
  const businessId = parseInt(id);
  const body = await req.json();
  const userId = parseInt((session.user as { id?: string })?.id || "0");

  // Stage update
  if (body.stage !== undefined) {
    const old = await prisma.pipelineStage.findUnique({ where: { business_id: businessId } });
    await prisma.pipelineStage.upsert({
      where: { business_id: businessId },
      create: { business_id: businessId, stage: body.stage },
      update: { stage: body.stage, updated_at: new Date() },
    });
    if (userId) {
      await logAudit({ userId, action: "update", entityType: "business", entityId: businessId, fieldName: "stage", oldValue: old?.stage, newValue: body.stage });
    }
  }

  // Business field updates
  const ALLOWED_FIELDS = ["phone", "email", "website", "address", "city", "zip_code", "county", "business_summary", "service_area", "state_code", "license_type", "primary_payor_mix"] as const;
  const updateData: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updateData[field] = body[field] || null;
  }
  // pe_backed is boolean
  if ("pe_backed" in body) {
    updateData["pe_backed"] = body.pe_backed === true || body.pe_backed === "true" ? true
      : body.pe_backed === false || body.pe_backed === "false" ? false
      : null;
  }
  // assigned_user_id
  if ("assigned_user_id" in body) {
    updateData["assigned_user_id"] = body.assigned_user_id ? parseInt(body.assigned_user_id) : null;
  }

  if (Object.keys(updateData).length > 0) {
    const old = await prisma.business.findUnique({ where: { business_id: businessId }, select: Object.fromEntries(Object.keys(updateData).map(k => [k, true])) });
    await prisma.business.update({
      where: { business_id: businessId },
      data: { ...updateData, updated_at: new Date() },
    });
    if (userId) {
      for (const key of Object.keys(updateData)) {
        const oldVal = old ? (old as Record<string, unknown>)[key] : null;
        if (oldVal !== updateData[key]) {
          await logAudit({ userId, action: "update", entityType: "business", entityId: businessId, fieldName: key, oldValue: oldVal, newValue: updateData[key] });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
