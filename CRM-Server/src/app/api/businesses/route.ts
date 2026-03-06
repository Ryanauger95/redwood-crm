import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildBusinessWhere, FilterCondition } from "@/lib/views";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const filtersParam = searchParams.get("filters");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const sortBy = searchParams.get("sort") || "acquisition_fit_score";
  const sortDir = (searchParams.get("dir") || "desc") as "asc" | "desc";

  let conditions: FilterCondition[] = [];
  if (filtersParam) {
    try {
      conditions = JSON.parse(filtersParam);
    } catch {
      // ignore malformed
    }
  }

  const where: Prisma.BusinessWhereInput = buildBusinessWhere(conditions);

  if (search) {
    const searchOr = [
      { le_name: { contains: search, mode: "insensitive" as const } },
      { lf_name: { contains: search, mode: "insensitive" as const } },
      { city: { contains: search, mode: "insensitive" as const } },
      { county: { contains: search, mode: "insensitive" as const } },
    ];
    if (where.AND) {
      (where.AND as Prisma.BusinessWhereInput[]).push({ OR: searchOr });
    } else {
      where.AND = [{ OR: searchOr }];
    }
  }

  const validSortFields = [
    "acquisition_fit_score",
    "le_name",
    "lf_name",
    "estimated_annual_profit",
    "city",
  ] as const;
  const sortField = validSortFields.includes(
    sortBy as (typeof validSortFields)[number]
  )
    ? sortBy
    : "acquisition_fit_score";

  const nullsLast = sortField !== "le_name" && sortField !== "lf_name";

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: nullsLast
        ? [{ [sortField]: { sort: sortDir, nulls: "last" } }]
        : [{ [sortField]: sortDir }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        business_id: true,
        le_name: true,
        lf_name: true,
        city: true,
        county: true,
        phone: true,
        email: true,
        license_type: true,
        acquisition_fit_score: true,
        estimated_annual_profit: true,
        estimated_annual_revenue: true,
        profit_margin_pct: true,
        estimated_employees: true,
        founded_year: true,
        enrichment_status: true,
        cms_star_rating: true,
        medicare_certified: true,
        pe_backed: true,
        business_summary: true,
        primary_payor_mix: true,
        pipelineStage: { select: { stage: true } },
        tags: { select: { tag: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: businesses.map((b) => ({
      ...b,
      estimated_annual_profit: b.estimated_annual_profit?.toString() ?? null,
      estimated_annual_revenue: b.estimated_annual_revenue?.toString() ?? null,
      profit_margin_pct: b.profit_margin_pct?.toString() ?? null,
      cms_star_rating: b.cms_star_rating?.toString() ?? null,
      stage: b.pipelineStage?.stage ?? null,
      tags: b.tags.map((t) => t.tag),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
