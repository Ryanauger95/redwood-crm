"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Scale, MapPin, FileText, Users,
  Gavel, DollarSign, Link2, ExternalLink, Download, CheckCircle, Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Party {
  id: number;
  name: string | null;
  address: string | null;
  party_type: string | null;
  party_status: string | null;
  last_updated: string | null;
}

interface Action {
  id: number;
  name: string | null;
  description: string | null;
  type: string | null;
  begin_date: string | null;
  completion_date: string | null;
  has_document: boolean;
  document_url: string | null;
}

interface Document {
  id: number;
  url: string;
  description: string | null;
  date: string | null;
  downloaded: boolean;
  downloaded_at: string | null;
  s3_url: string | null;
}

interface Cost {
  id: number;
  description: string | null;
  code: string | null;
  amount: string | null;
  charge_action: string | null;
  disbursed_amount: string | null;
}

interface Payment {
  id: number;
  date: string | null;
  receipt_number: string | null;
  entered_by: string | null;
  transaction_type: string | null;
  amount: string | null;
}

interface AssocCase {
  id: number;
  agency: string | null;
  case_number: string | null;
  relationship: string | null;
  description: string | null;
  filed_date: string | null;
  status: string | null;
  disposition: string | null;
  url: string | null;
}

interface ForeclosureData {
  id: number;
  case_number: string;
  detail_url: string | null;
  scraped_at: string | null;
  court_agency: string | null;
  filed_date: string | null;
  case_type: string | null;
  case_sub_type: string | null;
  file_type: string | null;
  status: string | null;
  assigned_judge: string | null;
  disposition: string | null;
  disposition_date: string | null;
  disposition_judge: string | null;
  caption: string | null;
  fine_costs: string | null;
  total_paid_for_fine_costs: string | null;
  balance_due: string | null;
  tax_map_agency: string | null;
  tax_map_number: string | null;
  tax_map_description: string | null;
  property_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  parties: Party[];
  actions: Action[];
  documents: Document[];
  costs: Cost[];
  payments: Payment[];
  associatedCases: AssocCase[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Dismissed: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  Cancelled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  Active:    "bg-red-50 text-red-700 ring-1 ring-red-200",
  Closed:    "bg-green-50 text-green-700 ring-1 ring-green-200",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(s: string | null) {
  if (!s) return "—";
  const n = parseFloat(s);
  return isNaN(n) ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-[13px] text-gray-800">{value || <span className="text-gray-300">—</span>}</div>
    </div>
  );
}

const PARTY_TYPE_COLORS: Record<string, string> = {
  "Plaintiff":          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Defendant":          "bg-red-50 text-red-700 ring-1 ring-red-200",
  "Plaintiff Attorney": "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

// ── Main Component ───────────────────────────────────────────────────────────

const TABS = ["Overview", "Parties", "Actions", "Documents", "Financials", "Associated Cases"] as const;
type Tab = typeof TABS[number];

export function ForeclosureDetailClient({ data }: { data: ForeclosureData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const statusCls = data.status ? (STATUS_COLORS[data.status] || "bg-blue-50 text-blue-700 ring-1 ring-blue-200") : "";

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left Sidebar ── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Back */}
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <Scale size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm font-mono">{data.case_number}</h2>
              {data.status && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${statusCls}`}>{data.status}</span>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Case Info */}
          <div className="space-y-3">
            <SidebarRow label="Court" value={data.court_agency} />
            <SidebarRow label="Case Type" value={data.case_sub_type || data.case_type} />
            <SidebarRow label="Filed" value={fmtDate(data.filed_date)} />
            <SidebarRow label="Judge" value={data.assigned_judge} />
            {data.disposition && <SidebarRow label="Disposition" value={data.disposition} />}
            {data.disposition_date && <SidebarRow label="Disposition Date" value={fmtDate(data.disposition_date)} />}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Property */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={11} /> Property
            </p>
            <SidebarRow label="Address" value={data.tax_map_description} />
            <SidebarRow label="Parcel #" value={<span className="font-mono text-xs">{data.tax_map_number}</span>} />
            {data.property_id && (
              <Link href={`/properties/${data.property_id}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <Link2 size={11} /> View linked property
              </Link>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Financials summary */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign size={11} /> Financials
            </p>
            <SidebarRow label="Total Costs" value={fmtMoney(data.fine_costs)} />
            <SidebarRow label="Total Paid" value={fmtMoney(data.total_paid_for_fine_costs)} />
            <SidebarRow
              label="Balance Due"
              value={
                data.balance_due && parseFloat(data.balance_due) > 0
                  ? <span className="font-semibold text-red-600">{fmtMoney(data.balance_due)}</span>
                  : <span className="text-green-600 font-medium">$0.00</span>
              }
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Links */}
          {data.detail_url && (
            <a href={data.detail_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
              <ExternalLink size={11} /> View on court website
            </a>
          )}
          {data.scraped_at && (
            <p className="text-[11px] text-gray-400">Scraped {fmtDate(data.scraped_at)}</p>
          )}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        {/* Caption bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <p className="text-sm text-gray-600 leading-snug">{data.caption || "No caption"}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex gap-0">
            {TABS.map((tab) => {
              let count: number | null = null;
              if (tab === "Parties") count = data.parties.length;
              if (tab === "Actions") count = data.actions.length;
              if (tab === "Documents") count = data.documents.length;
              if (tab === "Financials") count = data.costs.length + data.payments.length;
              if (tab === "Associated Cases") count = data.associatedCases.length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {tab}
                  {count !== null && count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "Overview" && <OverviewTab data={data} />}
          {activeTab === "Parties" && <PartiesTab parties={data.parties} />}
          {activeTab === "Actions" && <ActionsTab actions={data.actions} />}
          {activeTab === "Documents" && <DocumentsTab documents={data.documents} />}
          {activeTab === "Financials" && <FinancialsTab costs={data.costs} payments={data.payments} />}
          {activeTab === "Associated Cases" && <AssocCasesTab cases={data.associatedCases} />}
        </div>
      </div>
    </div>
  );
}

// ── Tab Components ────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: ForeclosureData }) {
  const fields = [
    { label: "Case Number",       value: <span className="font-mono">{data.case_number}</span> },
    { label: "Court Agency",      value: data.court_agency },
    { label: "Case Type",         value: data.case_type },
    { label: "Case Sub-Type",     value: data.case_sub_type },
    { label: "File Type",         value: data.file_type },
    { label: "Status",            value: data.status },
    { label: "Assigned Judge",    value: data.assigned_judge },
    { label: "Filed Date",        value: fmtDate(data.filed_date) },
    { label: "Disposition",       value: data.disposition },
    { label: "Disposition Date",  value: fmtDate(data.disposition_date) },
    { label: "Disposition Judge", value: data.disposition_judge },
    { label: "Tax Map Number",    value: <span className="font-mono">{data.tax_map_number}</span> },
    { label: "Tax Map Agency",    value: data.tax_map_agency },
    { label: "Property Address",  value: data.tax_map_description },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Case Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 odd:border-r odd:border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <div className="text-[13px] text-gray-800">{value || <span className="text-gray-300">—</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartiesTab({ parties }: { parties: Party[] }) {
  const grouped: Record<string, Party[]> = {};
  for (const p of parties) {
    const type = p.party_type || "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(p);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">{type}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{list.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {list.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-gray-800">{p.name || "—"}</p>
                  {p.address && <p className="text-xs text-gray-400 mt-0.5">{p.address}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.party_type && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PARTY_TYPE_COLORS[p.party_type] || "bg-gray-100 text-gray-600"}`}>
                      {p.party_type}
                    </span>
                  )}
                  {p.last_updated && <span className="text-[10px] text-gray-400">Updated {fmtDate(p.last_updated)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {parties.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No parties recorded</p>}
    </div>
  );
}

function ActionsTab({ actions }: { actions: Action[] }) {
  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Gavel size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Docket / Actions</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{actions.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {actions.map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                {a.has_document
                  ? <FileText size={14} className="text-blue-500" />
                  : <Clock size={14} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-800 leading-snug">{a.description || "—"}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {a.type && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">{a.type}</span>}
                  {a.begin_date && <span className="text-[11px] text-gray-400">{fmtDate(a.begin_date)}</span>}
                  {a.name && <span className="text-[11px] text-gray-500 font-medium">{a.name}</span>}
                </div>
              </div>
              {a.has_document && a.document_url && (
                <a href={a.document_url} target="_blank" rel="noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink size={11} /> View
                </a>
              )}
            </div>
          ))}
          {actions.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No actions recorded</p>}
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ documents }: { documents: Document[] }) {
  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Download size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Documents</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{documents.length}</span>
          <span className="ml-auto text-xs text-gray-400">
            {documents.filter(d => d.downloaded).length} downloaded
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {documents.map((d) => (
            <div key={d.id} className="px-5 py-3 flex items-center gap-4">
              <div className="flex-shrink-0">
                {d.downloaded
                  ? <CheckCircle size={14} className="text-green-500" />
                  : <Clock size={14} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-800 truncate">{d.description || "Untitled document"}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {d.date && <span className="text-[11px] text-gray-400">{fmtDate(d.date)}</span>}
                  {d.downloaded_at && <span className="text-[11px] text-gray-400">Downloaded {fmtDate(d.downloaded_at)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {d.s3_url && (
                  <a href={d.s3_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                    <Download size={11} /> S3
                  </a>
                )}
                <a href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink size={11} /> Court
                </a>
              </div>
            </div>
          ))}
          {documents.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No documents</p>}
        </div>
      </div>
    </div>
  );
}

function FinancialsTab({ costs, payments }: { costs: Cost[]; payments: Payment[] }) {
  const totalCosts = costs.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  return (
    <div className="max-w-2xl space-y-4">
      {/* Costs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <DollarSign size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Costs</h3>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Description</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Code</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-400">Amount</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-400">Disbursed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {costs.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-2.5 text-gray-700">{c.description || "—"}</td>
                <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{c.code || "—"}</td>
                <td className="px-5 py-2.5 text-right font-medium text-gray-800">{fmtMoney(c.amount)}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">{fmtMoney(c.disbursed_amount)}</td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No costs</td></tr>
            )}
          </tbody>
          {costs.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50/50">
                <td colSpan={2} className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
                <td className="px-5 py-2.5 text-right font-bold text-gray-800">{fmtMoney(String(totalCosts))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <CheckCircle size={14} className="text-green-500" />
          <h3 className="text-sm font-semibold text-gray-800">Payments</h3>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Date</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Receipt #</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-400">Entered By</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-400">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-2.5 text-gray-700">{fmtDate(p.date)}</td>
                <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{p.receipt_number || "—"}</td>
                <td className="px-5 py-2.5 text-gray-500">{p.entered_by || "—"}</td>
                <td className="px-5 py-2.5 text-right font-medium text-green-700">{fmtMoney(p.amount)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No payments</td></tr>
            )}
          </tbody>
          {payments.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50/50">
                <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Paid</td>
                <td className="px-5 py-2.5 text-right font-bold text-green-700">{fmtMoney(String(totalPaid))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function AssocCasesTab({ cases }: { cases: AssocCase[] }) {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Link2 size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Associated Cases</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cases.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {cases.map((c) => (
            <div key={c.id} className="px-5 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-gray-800 font-mono">{c.case_number}</p>
                {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                {c.relationship && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">{c.relationship}</span>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {c.status && <span className="text-[11px] text-gray-500">{c.status}</span>}
                {c.filed_date && <span className="text-[11px] text-gray-400">{fmtDate(c.filed_date)}</span>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink size={10} /> View
                  </a>
                )}
              </div>
            </div>
          ))}
          {cases.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No associated cases</p>}
        </div>
      </div>
    </div>
  );
}
