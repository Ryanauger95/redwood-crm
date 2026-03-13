import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildContactWhere, FilterCondition } from "@/lib/views";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { first_name, last_name, city, state_code, email, phone } = body;

  if (!first_name && !last_name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: {
      first_name: first_name || null,
      last_name: last_name || null,
      full_name: [first_name, last_name].filter(Boolean).join(" ") || null,
      city: city || null,
      state_code: state_code || null,
      email: email || null,
      phone: phone || null,
    },
  });

  return NextResponse.json({ person_id: person.person_id, success: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const filtersParam = searchParams.get("filters");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const sortBy = searchParams.get("sort") || "full_name";
  const sortDir = (searchParams.get("dir") || "asc") as "asc" | "desc";

  let conditions: FilterCondition[] = [];
  if (filtersParam) {
    try {
      conditions = JSON.parse(filtersParam);
    } catch {
      // ignore malformed
    }
  }

  const where: Prisma.PersonWhereInput = buildContactWhere(conditions);

  if (search) {
    const searchOr = [
      { full_name: { contains: search, mode: "insensitive" as const } },
      { first_name: { contains: search, mode: "insensitive" as const } },
      { last_name: { contains: search, mode: "insensitive" as const } },
      { city: { contains: search, mode: "insensitive" as const } },
    ];
    if (where.AND) {
      (where.AND as Prisma.PersonWhereInput[]).push({ OR: searchOr });
    } else {
      where.AND = [{ OR: searchOr }];
    }
  }

  const validSortFields = ["full_name", "city", "state_code"] as const;
  const safeSortBy = validSortFields.includes(
    sortBy as (typeof validSortFields)[number]
  )
    ? sortBy
    : "full_name";

  const [total, people] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      orderBy: { [safeSortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        businessPeople: {
          include: {
            business: {
              select: {
                le_name: true,
                lf_name: true,
                business_id: true,
                acquisition_fit_score: true,
              },
            },
          },
          take: 5,
        },
        _count: { select: { businessPeople: true, activities: true } },
      },
    }),
  ]);

  const serialized = people.map((p: typeof people[number]) => ({
    ...p,
    freshsales_id: p.freshsales_id?.toString() ?? null,
  }));
  return NextResponse.json({ data: serialized, total, page, pages: Math.ceil(total / limit) });
}
