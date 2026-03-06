import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/utils";
import { ACTIVE_PROPERTY_DEAL_STAGES } from "@/lib/pipelineConfig";
import { buildPropertyWhere, FilterCondition } from "@/lib/views";

// ─── Businesses pipeline ──────────────────────────────────────────────────────

async function getBusinessesPipeline(search: string) {
  const pipelineStages = await prisma.pipelineStage.findMany({
    include: {
      business: {
        select: {
          business_id: true,
          le_name: true,
          lf_name: true,
          city: true,
          acquisition_fit_score: true,
          estimated_annual_profit: true,
          phone: true,
          email: true,
          cms_star_rating: true,
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  const grouped: Record<string, unknown[]> = {};
  for (const stage of PIPELINE_STAGES) grouped[stage] = [];

  for (const ps of pipelineStages) {
    const name = (ps.business.le_name || ps.business.lf_name || "").toLowerCase();
    const city = (ps.business.city || "").toLowerCase();
    if (search && !name.includes(search) && !city.includes(search)) continue;

    const stage = ps.stage as string;
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push({
      ...ps.business,
      stage: ps.stage,
      pipeline_id: ps.id,
      assigned_to: ps.assigned_to,
      estimated_annual_profit: ps.business.estimated_annual_profit?.toString() ?? null,
      cms_star_rating: ps.business.cms_star_rating?.toString() ?? null,
    });
  }

  return grouped;
}

// ─── Properties pipeline ──────────────────────────────────────────────────────

async function getPropertiesPipeline(stages: string[], search: string, filterConditions: FilterCondition[]) {
  const baseWhere = buildPropertyWhere(filterConditions);

  const makeWhere = (stage: string) => {
    const searchAnd = search
      ? [{ OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { owner_name: { contains: search, mode: "insensitive" as const } },
        ]}]
      : [];
    return {
      ...baseWhere,
      deal_stage: stage,
      AND: [
        ...((baseWhere.AND as object[]) ?? []),
        ...searchAnd,
      ],
    };
  };

  const results = await Promise.all(
    stages.map(async (stage) => {
      const where = makeWhere(stage);
      const [cards, total] = await Promise.all([
        prisma.property.findMany({
          where,
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            deal_stage: true,
            owner_name: true,
            owner_phone: true,
            asking_price: true,
            relationship_status: true,
            sales_owner: true,
            updated_at: true,
          },
          orderBy: { updated_at: "desc" },
          take: 25,
        }),
        prisma.property.count({ where }),
      ]);
      return { stage, cards, total };
    })
  );

  const grouped: Record<string, { cards: unknown[]; total: number }> = {};
  for (const { stage, cards, total } of results) {
    grouped[stage] = {
      cards: cards.map((p) => ({
        ...p,
        id: p.id.toString(),
        asking_price: p.asking_price?.toString() ?? null,
        updated_at: p.updated_at?.toISOString() ?? null,
      })),
      total,
    };
  }

  const NOT_INTERESTED_STAGES = [
    "Not Interested",
    "Not Interested - Unlikely Seller",
    "Not Interested - Private Equity / Large Corporation",
    "Not Interested - Too Small",
    "Not Interested - Sold Elsewhere",
    "Not Interested - Too Class-C",
    "Not Interested - Sophisticated",
    "Not Interested - Priced too High",
    "Not Interested - Boat / RV Rural",
    "Not Interested - Too Rural",
    "Not Interested - Office",
    "Not Interested - Too Nice",
    "Not Interested - Retail",
    'Not Interested - "Do Not Call" List',
    "Not Interested - Too Complex",
    "Not Interested - Redevelopment",
    "Not Interested - Industrial - Not functional",
    "Not Interested - 2020 Build",
    "Not Interested - 2021 Build",
    "Not Interested - Sports Facility",
    "Not Interested - Bad Area",
    "Not Interested - Too Urban",
    "Not really interested - maybe later",
  ];

  const searchAnd = search
    ? [{ OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { city: { contains: search, mode: "insensitive" as const } },
        { owner_name: { contains: search, mode: "insensitive" as const } },
      ]}]
    : [];

  const baseAnds = [...((baseWhere.AND as object[]) ?? []), ...searchAnd];

  const notInterestedWhere = {
    ...baseWhere,
    deal_stage: { in: NOT_INTERESTED_STAGES },
    AND: baseAnds,
  };

  const notInterestedCount = await prisma.property.count({ where: notInterestedWhere });

  return { stages: grouped, notInterestedCount };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || "businesses";
  const search = (searchParams.get("search") || "").toLowerCase().trim();
  const stagesParam = searchParams.get("stages");
  const filtersParam = searchParams.get("filters");

  let filterConditions: FilterCondition[] = [];
  if (filtersParam) {
    try { filterConditions = JSON.parse(filtersParam); } catch { /* ignore */ }
  }

  if (entity === "properties") {
    const stages = stagesParam
      ? stagesParam.split("|").filter(Boolean)
      : [...ACTIVE_PROPERTY_DEAL_STAGES];
    const data = await getPropertiesPipeline(stages, search, filterConditions);
    return NextResponse.json({ entity: "properties", ...data });
  }

  const grouped = await getBusinessesPipeline(search);
  return NextResponse.json({ entity: "businesses", stages: grouped });
}
