import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildBusinessWhere, FilterCondition } from "@/lib/views";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, city, state_code, license_type, phone, email } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const business = await prisma.business.create({
    data: {
      le_name: name,
      city: city || null,
      state_code: state_code || null,
      license_type: license_type || null,
      phone: phone || null,
      email: email || null,
      enrichment_status: "pending",
    },
  });

  return NextResponse.json({ business_id: business.business_id, success: true }, { status: 201 });
}

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
    "estimated_annual_revenue",
    "estimated_employees",
    "founded_year",
    "cms_star_rating",
    "county",
    "state_code",
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
      include: {
        pipelineStage: { select: { stage: true } },
        tags: { select: { tag: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: businesses.map((b: any) => ({
      ...b,
      estimated_annual_profit: b.estimated_annual_profit?.toString() ?? null,
      estimated_annual_revenue: b.estimated_annual_revenue?.toString() ?? null,
      profit_margin_pct: b.profit_margin_pct?.toString() ?? null,
      cms_star_rating: b.cms_star_rating?.toString() ?? null,
      stage: b.pipelineStage?.stage ?? null,
      tags: b.tags.map((t: any) => t.tag),
      assigned_user: b.assignedUser?.name ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
