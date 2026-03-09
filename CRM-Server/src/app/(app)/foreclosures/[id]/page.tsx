import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import { ForeclosureDetailClient } from "./ForeclosureDetailClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ForeclosureDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) notFound();

  const [caseRes, partiesRes, actionsRes, docsRes, costsRes, paymentsRes, assocRes] = await Promise.all([
    pool.query(`SELECT * FROM foreclosure_cases WHERE id = $1`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_parties WHERE case_id = $1 ORDER BY party_type, name`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_actions WHERE case_id = $1 ORDER BY begin_date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_documents WHERE case_id = $1 ORDER BY date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_costs WHERE case_id = $1`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_payments WHERE case_id = $1 ORDER BY date DESC NULLS LAST`, [caseId]),
    pool.query(`SELECT * FROM foreclosure_associated_cases WHERE case_id = $1`, [caseId]),
  ]);

  if (caseRes.rows.length === 0) notFound();

  // Serialize dates/decimals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ser(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj.toISOString();
    if (typeof obj === "object" && !Array.isArray(obj)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = ser(v);
      return out;
    }
    if (Array.isArray(obj)) return obj.map(ser);
    return obj;
  }

  const data = ser({
    ...caseRes.rows[0],
    parties: partiesRes.rows,
    actions: actionsRes.rows,
    documents: docsRes.rows,
    costs: costsRes.rows,
    payments: paymentsRes.rows,
    associatedCases: assocRes.rows,
  });

  return <ForeclosureDetailClient data={data} />;
}
