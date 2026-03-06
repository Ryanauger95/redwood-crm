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
    businessPeople: business.businessPeople.map((bp) => ({
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

  // Stage update
  if (body.stage !== undefined) {
    await prisma.pipelineStage.upsert({
      where: { business_id: businessId },
      create: { business_id: businessId, stage: body.stage },
      update: { stage: body.stage, updated_at: new Date() },
    });
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

  if (Object.keys(updateData).length > 0) {
    await prisma.business.update({
      where: { business_id: businessId },
      data: { ...updateData, updated_at: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
