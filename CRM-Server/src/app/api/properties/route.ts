import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildPropertyWhere, FilterCondition } from "@/lib/views";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, city, state, county, asset_class, deal_stage } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate a unique BigInt id (timestamp-based)
  const id = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));

  const property = await prisma.property.create({
    data: {
      id,
      name,
      city: city || null,
      state: state || null,
      county: county || null,
      asset_class: asset_class || null,
      deal_stage: deal_stage || "Not Contacted",
    },
  });

  return NextResponse.json({ id: property.id.toString(), success: true }, { status: 201 });
}

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
    }),
  ]);

  return NextResponse.json({
    data: properties.map((p: any) => ({
      ...p,
      id: p.id.toString(),
      parent_id: p.parent_id?.toString() ?? null,
      asking_price: p.asking_price?.toString() ?? null,
      asking_price_per_sqft: p.asking_price_per_sqft?.toString() ?? null,
      annual_revenue: p.annual_revenue?.toString() ?? null,
      last_sale_amount: p.last_sale_amount?.toString() ?? null,
      last_sale_price_per_sqft: p.last_sale_price_per_sqft?.toString() ?? null,
      tax_assessed_value: p.tax_assessed_value?.toString() ?? null,
      mortgage_amount: p.mortgage_amount?.toString() ?? null,
      foreclosure_judgment_amount: p.foreclosure_judgment_amount?.toString() ?? null,
      updated_at: p.updated_at?.toISOString() ?? null,
      created_at: p.created_at?.toISOString() ?? null,
      last_contacted: p.last_contacted?.toISOString() ?? null,
      last_activity_date: p.last_activity_date?.toISOString()?.split("T")[0] ?? null,
      last_contact_date: p.last_contact_date?.toISOString()?.split("T")[0] ?? null,
      next_contact_date: p.next_contact_date?.toISOString()?.split("T")[0] ?? null,
      last_sale_date: p.last_sale_date?.toISOString()?.split("T")[0] ?? null,
      mortgage_start_date: p.mortgage_start_date?.toISOString()?.split("T")[0] ?? null,
      mortgage_expiration_date: p.mortgage_expiration_date?.toISOString()?.split("T")[0] ?? null,
      lease_start_date: p.lease_start_date?.toISOString()?.split("T")[0] ?? null,
      lease_expiration: p.lease_expiration?.toISOString()?.split("T")[0] ?? null,
      foreclosure_filed_date: p.foreclosure_filed_date?.toISOString()?.split("T")[0] ?? null,
      foreclosure_sale_date: p.foreclosure_sale_date?.toISOString()?.split("T")[0] ?? null,
      foreclosure_data_last_updated: p.foreclosure_data_last_updated?.toISOString()?.split("T")[0] ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
