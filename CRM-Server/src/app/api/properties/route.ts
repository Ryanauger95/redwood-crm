import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildPropertyWhere, FilterCondition } from "@/lib/views";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const filtersParam = searchParams.get("filters");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const sortBy = searchParams.get("sort") || "updated_at";
  const sortDir = (searchParams.get("dir") || "desc") as "asc" | "desc";

  let conditions: FilterCondition[] = [];
  if (filtersParam) {
    try { conditions = JSON.parse(filtersParam); } catch { /* ignore */ }
  }

  const where: Prisma.PropertyWhereInput = buildPropertyWhere(conditions);

  if (search) {
    const searchOr = [
      { name: { contains: search, mode: "insensitive" as const } },
      { city: { contains: search, mode: "insensitive" as const } },
      { county: { contains: search, mode: "insensitive" as const } },
      { owner_name: { contains: search, mode: "insensitive" as const } },
      { state: { contains: search, mode: "insensitive" as const } },
    ];
    if (where.AND) {
      (where.AND as Prisma.PropertyWhereInput[]).push({ OR: searchOr });
    } else {
      where.AND = [{ OR: searchOr }];
    }
  }

  const validSortFields = ["name", "updated_at", "created_at", "last_activity_date"] as const;
  const sortField = validSortFields.includes(sortBy as (typeof validSortFields)[number])
    ? sortBy : "updated_at";

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: [{ [sortField]: { sort: sortDir, nulls: "last" } }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        county: true,
        asset_class: true,
        deal_stage: true,
        relationship_status: true,
        owner_name: true,
        owner_phone: true,
        communication_status: true,
        asking_price: true,
        updated_at: true,
        sales_owner: true,
        annual_revenue: true,
        num_employees: true,
        territory: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: properties.map((p) => ({
      ...p,
      id: p.id.toString(),
      asking_price: p.asking_price?.toString() ?? null,
      annual_revenue: p.annual_revenue?.toString() ?? null,
      updated_at: p.updated_at?.toISOString() ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
