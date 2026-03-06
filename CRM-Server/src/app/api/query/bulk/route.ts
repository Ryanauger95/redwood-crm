import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Fields that can be bulk-updated per table
const BULK_UPDATABLE: Record<string, Record<string, string>> = {
  businesses: {
    enrichment_status: "string",
    license_type:      "string",
    primary_payor_mix: "string",
    pe_backed:         "boolean",
    accreditation:     "string",
    state_code:        "string",
    county:            "string",
    city:              "string",
  },
  people: {
    state_code: "string",
    city:       "string",
  },
  activities: {
    status: "string",
    type:   "string",
  },
};

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { table, ids, action, field, value, stage, assigned_to } = body as {
    table: string;
    ids: number[];
    action: "update_field" | "set_stage" | "assign_to";
    field?: string;
    value?: string;
    stage?: string;
    assigned_to?: string;
  };

  if (!table || !ids?.length) {
    return NextResponse.json({ error: "Missing table or ids" }, { status: 400 });
  }

  let updated = 0;

  if (action === "update_field") {
    if (!field) return NextResponse.json({ error: "Missing field" }, { status: 400 });

    const allowed = BULK_UPDATABLE[table];
    if (!allowed || !allowed[field]) {
      return NextResponse.json({ error: "Field not bulk-updatable" }, { status: 400 });
    }

    const colType = allowed[field];
    let coerced: string | boolean | null = value ?? null;
    if (colType === "boolean") coerced = value === "true";
    if (value === "" || value === null || value === undefined) coerced = null;

    if (table === "businesses") {
      const result = await prisma.business.updateMany({
        where: { business_id: { in: ids } },
        data: { [field]: coerced, updated_at: new Date() },
      });
      updated = result.count;
    } else if (table === "people") {
      const result = await prisma.person.updateMany({
        where: { person_id: { in: ids } },
        data: { [field]: coerced },
      });
      updated = result.count;
    } else if (table === "activities") {
      const result = await prisma.activity.updateMany({
        where: { id: { in: ids } },
        data: { [field]: coerced },
      });
      updated = result.count;
    }
  } else if (action === "set_stage") {
    if (!stage) return NextResponse.json({ error: "Missing stage" }, { status: 400 });
    if (table !== "businesses") return NextResponse.json({ error: "Stage only applies to businesses" }, { status: 400 });

    // Upsert pipeline stage for each business
    for (const id of ids) {
      await prisma.pipelineStage.upsert({
        where: { business_id: id },
        update: { stage, updated_at: new Date() },
        create: { business_id: id, stage },
      });
      updated++;
    }
  } else if (action === "assign_to") {
    if (table !== "businesses") return NextResponse.json({ error: "Assign only applies to businesses" }, { status: 400 });

    for (const id of ids) {
      await prisma.pipelineStage.upsert({
        where: { business_id: id },
        update: { assigned_to: assigned_to || null, updated_at: new Date() },
        create: { business_id: id, stage: "Prospect", assigned_to: assigned_to || null },
      });
      updated++;
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ updated });
}

// GET /api/query/bulk/users — returns CRM users for assign dropdown
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.crmUser.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
