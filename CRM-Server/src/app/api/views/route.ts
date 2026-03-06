import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = new URL(req.url).searchParams.get("entity");
  if (!entity) return NextResponse.json({ error: "entity required" }, { status: 400 });

  const views = await prisma.savedView.findMany({
    where: { entity },
    orderBy: { sort_order: "asc" },
  });

  return NextResponse.json(views);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, entity, filters, columns, sort_field, sort_dir } = body;

  if (!name || !entity) {
    return NextResponse.json({ error: "name and entity required" }, { status: 400 });
  }

  // sort_order = max existing + 1
  const max = await prisma.savedView.findFirst({
    where: { entity },
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });

  const view = await prisma.savedView.create({
    data: {
      name,
      entity,
      filters: filters ?? [],
      columns: columns ?? [],
      sort_field: sort_field ?? null,
      sort_dir: sort_dir ?? null,
      is_default: false,
      sort_order: (max?.sort_order ?? -1) + 1,
    },
  });

  return NextResponse.json(view, { status: 201 });
}
