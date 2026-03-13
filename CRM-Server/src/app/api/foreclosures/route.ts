import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pool } from "pg";
import { FilterCondition, buildForeclosureSqlConditions } from "@/lib/views";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 25;
  const offset = (page - 1) * limit;
  const sort = searchParams.get("sort") || "filed_date";
  const dir = searchParams.get("dir") === "asc" ? "ASC" : "DESC";

  let filterConditions: FilterCondition[] = [];
  try {
    const raw = searchParams.get("filters");
    if (raw) filterConditions = JSON.parse(raw);
  } catch { /* ignore */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  const clauses: string[] = [];
  let idx = 1;

  if (search) {
    clauses.push(`(fc.case_number ILIKE $${idx} OR fc.tax_map_description ILIKE $${idx} OR fc.caption ILIKE $${idx} OR fc.tax_map_number ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const { clauses: filterClauses, params: filterParams } = buildForeclosureSqlConditions(filterConditions, idx);
  clauses.push(...filterClauses);
  params.push(...filterParams);
  idx += filterParams.length;

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const allowedSort: Record<string, string> = {
    case_number:      "fc.case_number",
    filed_date:       "fc.filed_date",
    status:           "fc.status",
    balance_due:      "fc.balance_due",
    fine_costs:       "fc.fine_costs",
    total_paid:       "fc.total_paid_for_fine_costs",
    disposition_date: "fc.disposition_date",
    court_agency:     "fc.court_agency",
    assigned_judge:   "fc.assigned_judge",
    scraped_at:       "fc.scraped_at",
    county:           "fc.county",
  };
  const sortCol = allowedSort[sort] || "fc.filed_date";

  const [rowsRes, countRes] = await Promise.all([
    pool.query(
      `SELECT fc.id, fc.case_number, fc.status, fc.filed_date,
              fc.disposition, fc.disposition_date, fc.disposition_judge,
              fc.caption, fc.tax_map_description, fc.tax_map_number, fc.tax_map_agency,
              fc.balance_due, fc.fine_costs, fc.total_paid_for_fine_costs,
              fc.court_agency, fc.case_type, fc.case_sub_type, fc.file_type,
              fc.assigned_judge, fc.property_id, fc.scraped_at, fc.county,
              (SELECT fp.name FROM foreclosure_parties fp WHERE fp.party_type = 'Plaintiff' AND fp.case_id = fc.id LIMIT 1) AS plaintiff
       FROM foreclosure_cases fc
       ${where}
       ORDER BY ${sortCol} ${dir} NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM foreclosure_cases fc ${where}`, params),
  ]);

  return NextResponse.json({
    data: rowsRes.rows,
    total: parseInt(countRes.rows[0].count),
    page,
    pages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
  });
}
