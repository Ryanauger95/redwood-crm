import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// POST /api/query — execute raw SQL
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sql } = await req.json();
  if (!sql?.trim()) return NextResponse.json({ error: "No query provided" }, { status: 400 });

  const start = Date.now();
  try {
    const result = await pool.query(sql);
    const ms = Date.now() - start;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (result.rows || []).map((row: any) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) out[k] = null;
        else if (typeof v === "bigint") out[k] = v.toString();
        else if (v instanceof Date) out[k] = v.toISOString();
        else if (typeof v === "object") out[k] = JSON.stringify(v);
        else out[k] = v;
      }
      return out;
    });

    return NextResponse.json({
      rows,
      rowCount: result.rowCount ?? rows.length,
      columns: result.fields?.map((f) => f.name) ?? [],
      durationMs: ms,
    });
  } catch (err: unknown) {
    const ms = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, durationMs: ms }, { status: 400 });
  }
}

// ---------------------------------------------------------------------------
// Column whitelists — only these fields can be selected or filtered
// ---------------------------------------------------------------------------

export const TABLES = {
  businesses: {
    label: "Businesses",
    columns: {
      business_id:              { label: "ID",                  type: "number" },
      le_name:                  { label: "Legal Name",          type: "string" },
      lf_name:                  { label: "DBA Name",            type: "string" },
      city:                     { label: "City",                type: "string" },
      state_code:               { label: "State",               type: "string" },
      county:                   { label: "County",              type: "string" },
      zip_code:                 { label: "ZIP",                 type: "string" },
      address:                  { label: "Address",             type: "string" },
      phone:                    { label: "Phone",               type: "string" },
      email:                    { label: "Email",               type: "string" },
      website:                  { label: "Website",             type: "string" },
      license_type:             { label: "License Type",        type: "string" },
      license_number:           { label: "License #",          type: "string" },
      license_expires:          { label: "License Expires",     type: "date"   },
      business_type:            { label: "Entity Type",         type: "string" },
      medicare_certified:       { label: "Medicare Certified",  type: "boolean" },
      ccn:                      { label: "CCN",                 type: "string" },
      cms_star_rating:          { label: "CMS Star Rating",     type: "number" },
      cms_ownership_type:       { label: "CMS Ownership Type",  type: "string" },
      enrichment_status:        { label: "Enrichment Status",   type: "string" },
      acquisition_fit_score:    { label: "Fit Score",           type: "number" },
      estimated_annual_revenue: { label: "Est. Revenue",        type: "number" },
      estimated_annual_profit:  { label: "Est. Profit",         type: "number" },
      profit_margin_pct:        { label: "Profit Margin %",     type: "number" },
      estimated_employees:      { label: "Est. Employees",      type: "number" },
      estimated_locations:      { label: "Est. Locations",      type: "number" },
      founded_year:             { label: "Founded Year",        type: "number" },
      service_area:             { label: "Service Area",        type: "string" },
      primary_payor_mix:        { label: "Payor Mix",           type: "string" },
      payor_mix_notes:          { label: "Payor Mix Notes",     type: "string" },
      accreditation:            { label: "Accreditation",       type: "string" },
      pe_backed:                { label: "PE Backed",           type: "boolean" },
      acquisition_signals:      { label: "Acquisition Signals", type: "string" },
      growth_signals:           { label: "Growth Signals",      type: "string" },
      red_flags:                { label: "Red Flags",           type: "string" },
      business_summary:         { label: "Summary",             type: "string" },
      recent_news:              { label: "Recent News",         type: "string" },
      enrichment_date:          { label: "Enriched At",         type: "date"   },
    } as Record<string, { label: string; type: string }>,
    defaultColumns: ["le_name", "lf_name", "city", "county", "license_type", "acquisition_fit_score", "estimated_annual_profit", "medicare_certified"],
  },
  people: {
    label: "People",
    columns: {
      person_id:         { label: "ID",                 type: "number" },
      full_name:         { label: "Full Name",          type: "string" },
      first_name:        { label: "First Name",         type: "string" },
      last_name:         { label: "Last Name",          type: "string" },
      city:              { label: "City",               type: "string" },
      state_code:        { label: "State",              type: "string" },
      zip_code:          { label: "ZIP",                type: "string" },
      estimated_age:     { label: "Est. Age",           type: "number" },
      linkedin_url:      { label: "LinkedIn",           type: "string" },
      owner_background:  { label: "Background",         type: "string" },
      other_businesses:  { label: "Other Businesses",   type: "string" },
      succession_signals:{ label: "Succession Signals", type: "string" },
    } as Record<string, { label: string; type: string }>,
    defaultColumns: ["full_name", "city", "state_code", "estimated_age", "succession_signals"],
  },
  activities: {
    label: "Activities",
    columns: {
      id:           { label: "ID",          type: "number" },
      type:         { label: "Type",        type: "string" },
      subject:      { label: "Subject",     type: "string" },
      body:         { label: "Notes",       type: "string" },
      status:       { label: "Status",      type: "string" },
      due_date:     { label: "Due Date",    type: "date"   },
      completed_at: { label: "Completed",   type: "date"   },
      created_at:   { label: "Created",     type: "date"   },
    } as Record<string, { label: string; type: string }>,
    defaultColumns: ["type", "subject", "status", "due_date", "created_at"],
  },
} as const;

type TableKey = keyof typeof TABLES;

// ---------------------------------------------------------------------------
// GET /api/query
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const table = (searchParams.get("table") || "businesses") as TableKey;
  if (!TABLES[table]) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const tableConfig = TABLES[table];
  const allowedCols = Object.keys(tableConfig.columns);

  // Parse requested columns (whitelist enforced)
  const colsParam = searchParams.get("columns") || "";
  const requestedCols = colsParam
    ? colsParam.split(",").filter((c) => allowedCols.includes(c))
    : [...tableConfig.defaultColumns];
  const selectedCols = requestedCols.length > 0 ? requestedCols : [...tableConfig.defaultColumns];

  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "50")));
  const sortCol = searchParams.get("sort") || "";
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  // Build Prisma select object
  const select: Record<string, boolean> = {};
  for (const col of selectedCols) {
    select[col] = true;
  }
  // Always include the primary key
  if (table === "businesses") select["business_id"] = true;
  if (table === "people") select["person_id"] = true;
  if (table === "activities") select["id"] = true;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    const searchableString = selectedCols.filter(
      (c) => tableConfig.columns[c]?.type === "string"
    );
    if (searchableString.length > 0) {
      where.OR = searchableString.map((col) => ({
        [col]: { contains: search, mode: "insensitive" },
      }));
    }
  }

  // Per-column filters: filter_columnname=value
  for (const [key, val] of searchParams.entries()) {
    if (!key.startsWith("filter_") || !val) continue;
    const col = key.slice(7);
    if (!allowedCols.includes(col)) continue;
    const colType = tableConfig.columns[col]?.type;
    if (colType === "string") {
      where[col] = { contains: val, mode: "insensitive" };
    } else if (colType === "number") {
      const num = parseFloat(val);
      if (!isNaN(num)) where[col] = { gte: num };
    } else if (colType === "boolean") {
      where[col] = val === "true";
    }
  }

  // Execute — keep orderBy per-table to satisfy Prisma's strict types
  const skip = (page - 1) * limit;
  const validSort = sortCol && allowedCols.includes(sortCol) ? sortCol : null;

  let total = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];

  if (table === "businesses") {
    const orderBy = validSort
      ? { [validSort]: { sort: sortDir, nulls: "last" as const } }
      : { acquisition_fit_score: { sort: "desc" as const, nulls: "last" as const } };
    [total, rows] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.findMany({ where, select, orderBy, skip, take: limit }),
    ]);
  } else if (table === "people") {
    const orderBy = validSort
      ? { [validSort]: sortDir as "asc" | "desc" }
      : { full_name: "asc" as const };
    [total, rows] = await Promise.all([
      prisma.person.count({ where }),
      prisma.person.findMany({ where, select, orderBy, skip, take: limit }),
    ]);
  } else if (table === "activities") {
    const orderBy = validSort
      ? { [validSort]: sortDir as "asc" | "desc" }
      : { created_at: "desc" as const };
    [total, rows] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({ where, select, orderBy, skip, take: limit }),
    ]);
  }

  // Serialize BigInt / Decimal / Date
  const serialized = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === null || v === undefined) {
        out[k] = null;
      } else if (typeof v === "bigint") {
        out[k] = v.toString();
      } else if (v instanceof Date) {
        out[k] = v.toISOString();
      } else if (typeof v === "object" && "toString" in v && !(v instanceof Array)) {
        // Prisma Decimal
        out[k] = v.toString();
      } else {
        out[k] = v;
      }
    }
    return out;
  });

  return NextResponse.json({
    data: serialized,
    total,
    page,
    pages: Math.ceil(total / limit),
    columns: selectedCols,
    columnMeta: Object.fromEntries(
      selectedCols.map((c) => [c, tableConfig.columns[c]])
    ),
  });
}

// ---------------------------------------------------------------------------
// GET /api/query/schema — returns table/column metadata for the UI
// ---------------------------------------------------------------------------
