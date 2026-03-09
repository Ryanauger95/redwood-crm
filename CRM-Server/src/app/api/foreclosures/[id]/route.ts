import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [caseRes, partiesRes, actionsRes, docsRes, costsRes, paymentsRes, assocRes] = await Promise.all([
    pool.query(`SELECT * FROM foreclosure_cases WHERE id = $1`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_parties WHERE case_id = $1 ORDER BY party_type, name`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_actions WHERE case_id = $1 ORDER BY begin_date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_documents WHERE case_id = $1 ORDER BY date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_costs WHERE case_id = $1`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_payments WHERE case_id = $1 ORDER BY date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_associated_cases WHERE case_id = $1`, [caseId]),
  ]);

  if (caseRes.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...caseRes.rows[0],
    parties: partiesRes.rows,
    actions: actionsRes.rows,
    documents: docsRes.rows,
    costs: costsRes.rows,
    payments: paymentsRes.rows,
    associatedCases: assocRes.rows,
  });
}
