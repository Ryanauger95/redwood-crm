"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database, Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Download, SlidersHorizontal, RefreshCw, Users, GitBranch, Pencil, CheckSquare,
  Play, Code, Table, AlertCircle, Clock,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type ColMeta = { label: string; type: string };

const PIPELINE_STAGES = ["Prospect", "Contacted", "Meeting Scheduled", "LOI Sent", "Under LOI", "Closed", "Pass"];

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
  people:     { state_code: "string", city: "string" },
  activities: { status: "string", type: "string" },
};

const TABLES: Record<string, {
  label: string; pk: string;
  linkPrefix: string | null;
  columns: Record<string, ColMeta>;
  defaultColumns: string[];
}> = {
  businesses: {
    label: "Businesses", pk: "business_id", linkPrefix: "/accounts/",
    columns: {
      business_id:              { label: "ID",                 type: "number"  },
      le_name:                  { label: "Legal Name",         type: "string"  },
      lf_name:                  { label: "DBA Name",           type: "string"  },
      city:                     { label: "City",               type: "string"  },
      state_code:               { label: "State",              type: "string"  },
      county:                   { label: "County",             type: "string"  },
      zip_code:                 { label: "ZIP",                type: "string"  },
      address:                  { label: "Address",            type: "string"  },
      phone:                    { label: "Phone",              type: "string"  },
      email:                    { label: "Email",              type: "string"  },
      website:                  { label: "Website",            type: "string"  },
      license_type:             { label: "License Type",       type: "string"  },
      license_number:           { label: "License #",         type: "string"  },
      license_expires:          { label: "License Expires",    type: "date"    },
      business_type:            { label: "Entity Type",        type: "string"  },
      medicare_certified:       { label: "Medicare Certified", type: "boolean" },
      ccn:                      { label: "CCN",                type: "string"  },
      cms_star_rating:          { label: "CMS Stars",          type: "number"  },
      cms_ownership_type:       { label: "CMS Ownership",      type: "string"  },
      enrichment_status:        { label: "Enrichment Status",  type: "string"  },
      acquisition_fit_score:    { label: "Fit Score",          type: "number"  },
      estimated_annual_revenue: { label: "Est. Revenue",       type: "number"  },
      estimated_annual_profit:  { label: "Est. Profit",        type: "number"  },
      profit_margin_pct:        { label: "Margin %",           type: "number"  },
      estimated_employees:      { label: "Employees",          type: "number"  },
      estimated_locations:      { label: "Locations",          type: "number"  },
      founded_year:             { label: "Founded",            type: "number"  },
      service_area:             { label: "Service Area",       type: "string"  },
      primary_payor_mix:        { label: "Payor Mix",          type: "string"  },
      payor_mix_notes:          { label: "Payor Notes",        type: "string"  },
      accreditation:            { label: "Accreditation",      type: "string"  },
      pe_backed:                { label: "PE Backed",          type: "boolean" },
      acquisition_signals:      { label: "Acq. Signals",       type: "string"  },
      growth_signals:           { label: "Growth Signals",     type: "string"  },
      red_flags:                { label: "Red Flags",          type: "string"  },
      business_summary:         { label: "Summary",            type: "string"  },
      recent_news:              { label: "Recent News",        type: "string"  },
      enrichment_date:          { label: "Enriched At",        type: "date"    },
    },
    defaultColumns: ["le_name", "lf_name", "city", "county", "license_type", "acquisition_fit_score", "estimated_annual_profit", "medicare_certified"],
  },
  people: {
    label: "People", pk: "person_id", linkPrefix: "/contacts/",
    columns: {
      person_id:          { label: "ID",                type: "number" },
      full_name:          { label: "Full Name",         type: "string" },
      first_name:         { label: "First Name",        type: "string" },
      last_name:          { label: "Last Name",         type: "string" },
      city:               { label: "City",              type: "string" },
      state_code:         { label: "State",             type: "string" },
      zip_code:           { label: "ZIP",               type: "string" },
      estimated_age:      { label: "Est. Age",          type: "number" },
      linkedin_url:       { label: "LinkedIn",          type: "string" },
      owner_background:   { label: "Background",        type: "string" },
      other_businesses:   { label: "Other Businesses",  type: "string" },
      succession_signals: { label: "Succession Signals",type: "string" },
    },
    defaultColumns: ["full_name", "city", "state_code", "estimated_age", "succession_signals"],
  },
  activities: {
    label: "Activities", pk: "id", linkPrefix: null,
    columns: {
      id:           { label: "ID",       type: "number" },
      type:         { label: "Type",     type: "string" },
      subject:      { label: "Subject",  type: "string" },
      body:         { label: "Notes",    type: "string" },
      status:       { label: "Status",   type: "string" },
      due_date:     { label: "Due Date", type: "date"   },
      completed_at: { label: "Completed",type: "date"   },
      created_at:   { label: "Created",  type: "date"   },
    },
    defaultColumns: ["type", "subject", "status", "due_date", "created_at"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatValue(val: unknown, type: string): string {
  if (val === null || val === undefined) return "—";
  if (type === "boolean") return val ? "Yes" : "No";
  if (type === "date" && typeof val === "string") {
    try { return new Date(val).toLocaleDateString(); } catch { return val; }
  }
  if (type === "number" && typeof val === "string") {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 10000) return "$" + n.toLocaleString();
    return val;
  }
  return String(val);
}

function exportCSV(columns: string[], labels: Record<string, string>, rows: Record<string, unknown>[]) {
  const header = columns.map((c) => labels[c] || c).join(",");
  const body = rows.map((row) =>
    columns.map((c) => `"${String(row[c] ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `export-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface QueryResult {
  data: Record<string, unknown>[];
  total: number; page: number; pages: number; columns: string[];
}

interface CrmUser { id: number; name: string; email: string; }

// ---------------------------------------------------------------------------
// Bulk Action Bar
// ---------------------------------------------------------------------------
function BulkActionBar({
  table, selectedIds, onClear, onDone, users,
}: {
  table: string;
  selectedIds: Set<number>;
  onClear: () => void;
  onDone: () => void;
  users: CrmUser[];
}) {
  const [action, setAction] = useState<"" | "field" | "stage" | "assign">("");
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState("");

  const count = selectedIds.size;
  const updatableFields = BULK_UPDATABLE[table] || {};

  const apply = async () => {
    setApplying(true);
    try {
      let body: Record<string, unknown> = { table, ids: [...selectedIds] };
      if (action === "field") body = { ...body, action: "update_field", field, value };
      else if (action === "stage") body = { ...body, action: "set_stage", stage };
      else if (action === "assign") body = { ...body, action: "assign_to", assigned_to: assignTo };

      const res = await fetch("/api/query/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setToast(`Updated ${data.updated} records`);
      setTimeout(() => { setToast(""); onDone(); }, 1500);
    } finally {
      setApplying(false);
    }
  };

  const canApply =
    (action === "field" && field) ||
    (action === "stage" && stage) ||
    (action === "assign");

  return (
    <div className="bg-blue-700 text-white px-5 py-2.5 flex items-center gap-4 flex-wrap">
      {/* Selection count */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <CheckSquare size={15} />
        <span className="text-sm font-semibold">{count} selected</span>
        <button onClick={onClear} className="text-blue-200 hover:text-white ml-1">
          <X size={13} />
        </button>
      </div>

      <div className="w-px h-5 bg-blue-500" />

      {/* Action selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Set field */}
        <button
          onClick={() => setAction(action === "field" ? "" : "field")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            action === "field" ? "bg-white text-blue-700" : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          <Pencil size={11} /> Update Field
        </button>

        {/* Set stage (businesses only) */}
        {table === "businesses" && (
          <button
            onClick={() => setAction(action === "stage" ? "" : "stage")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              action === "stage" ? "bg-white text-blue-700" : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            <GitBranch size={11} /> Set Stage
          </button>
        )}

        {/* Assign to user (businesses only) */}
        {table === "businesses" && (
          <button
            onClick={() => setAction(action === "assign" ? "" : "assign")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              action === "assign" ? "bg-white text-blue-700" : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            <Users size={11} /> Assign To
          </button>
        )}

        {/* Export selected */}
      </div>

      {/* Inline controls based on action */}
      {action === "field" && (
        <div className="flex items-center gap-2">
          <select
            value={field}
            onChange={(e) => { setField(e.target.value); setValue(""); }}
            className="text-xs bg-blue-600 border border-blue-400 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="">— pick field —</option>
            {Object.entries(updatableFields).map(([k]) => (
              <option key={k} value={k}>{TABLES[table]?.columns[k]?.label || k}</option>
            ))}
          </select>
          {field && (
            updatableFields[field] === "boolean" ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-xs bg-blue-600 border border-blue-400 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <option value="">— pick —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="New value..."
                className="text-xs bg-blue-600 border border-blue-400 text-white placeholder-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white w-36"
              />
            )
          )}
        </div>
      )}

      {action === "stage" && (
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="text-xs bg-blue-600 border border-blue-400 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white"
        >
          <option value="">— pick stage —</option>
          {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {action === "assign" && (
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          className="text-xs bg-blue-600 border border-blue-400 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white"
        >
          <option value="">— unassign —</option>
          {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
      )}

      {action && (
        <button
          onClick={apply}
          disabled={!canApply || applying}
          className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          {applying ? "Applying..." : `Apply to ${count}`}
        </button>
      )}

      {toast && (
        <span className="ml-auto text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium">
          {toast}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SQL Editor Component
// ---------------------------------------------------------------------------
interface SqlResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  columns: string[];
  durationMs: number;
  error?: string;
}

function SqlEditor() {
  const [sql, setSql] = useState("SELECT *\nFROM foreclosure_cases\nLIMIT 25;");
  const [result, setResult] = useState<SqlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runSql = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [sql]);

  // Cmd/Ctrl+Enter to run
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runSql();
    }
    // Tab inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = sql.substring(0, start) + "  " + sql.substring(end);
      setSql(newVal);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
    }
  };

  const exportCsvSql = () => {
    if (!result || result.rows.length === 0) return;
    const header = result.columns.join(",");
    const body = result.rows.map((row) =>
      result.columns.map((c) => `"${String(row[c] ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `query-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="flex flex-col border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Code size={13} className="text-blue-500" />
            <span className="font-medium text-gray-700">SQL Editor</span>
            <span className="text-gray-400">— press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⌘ Enter</kbd> to run</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSql("")}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={runSql}
              disabled={loading || !sql.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Play size={11} />
              {loading ? "Running..." : "Run"}
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="font-mono text-sm text-gray-800 bg-[#fafafa] px-5 py-4 resize-none focus:outline-none h-44 w-full leading-relaxed placeholder-gray-300"
          placeholder="SELECT * FROM businesses LIMIT 10;"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        {result && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
            {result.error ? (
              <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
                <AlertCircle size={13} /> {result.error}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Table size={12} className="text-green-600" />
                  <span className="font-semibold text-gray-800">{result.rowCount.toLocaleString()}</span> row{result.rowCount !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} /> {result.durationMs}ms
                </div>
                <div className="ml-auto">
                  <button
                    onClick={exportCsvSql}
                    disabled={result.rows.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
                  >
                    <Download size={11} /> Export CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Database size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">Run a query to see results</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <RefreshCw size={16} className="animate-spin mr-2" /> Executing...
          </div>
        )}

        {result && !result.error && result.rows.length > 0 && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
                <tr>
                  {result.columns.map((col) => (
                    <th key={col} className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap border-r border-gray-100 last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50 transition-colors`}>
                    {result.columns.map((col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="px-3 py-2 border-r border-gray-100 last:border-r-0 max-w-xs">
                          <span className={`block truncate ${val === null ? "text-gray-300 italic" : "text-gray-700"}`}>
                            {val === null ? "null" : String(val)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && !result.error && result.rows.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Query returned 0 rows
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function QueryPage() {
  const [mode, setMode] = useState<"builder" | "sql">("sql");
  const [table, setTable] = useState("businesses");
  const [selectedCols, setSelectedCols] = useState<string[]>(TABLES.businesses.defaultColumns);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [colSearch, setColSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPks, setSelectedPks] = useState<Set<number>>(new Set());
  const [users, setUsers] = useState<CrmUser[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tableConfig = TABLES[table];
  const allCols = Object.keys(tableConfig.columns);
  const filteredColList = colSearch
    ? allCols.filter((c) =>
        c.toLowerCase().includes(colSearch.toLowerCase()) ||
        tableConfig.columns[c].label.toLowerCase().includes(colSearch.toLowerCase())
      )
    : allCols;

  // Load users once
  useEffect(() => {
    fetch("/api/query/bulk").then((r) => r.json()).then((d) => setUsers(d.users || []));
  }, []);

  const runQuery = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        table, columns: selectedCols.join(","), search,
        page: String(page), limit: String(limit), sort: sortCol, dir: sortDir,
      });
      for (const [k, v] of Object.entries(filters)) if (v) params.set(`filter_${k}`, v);
      const res = await window.fetch(`/api/query?${params}`);
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }, [table, selectedCols, search, page, limit, sortCol, sortDir, filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); runQuery(); }, 350);
  }, [search]);

  useEffect(() => { runQuery(); }, [table, selectedCols, page, limit, sortCol, sortDir, filters]);

  const switchTable = (t: string) => {
    setTable(t); setSelectedCols(TABLES[t].defaultColumns);
    setSearch(""); setFilters({}); setSortCol(""); setSortDir("desc");
    setPage(1); setColSearch(""); setSelectedPks(new Set());
  };

  const toggleCol = (col: string) => {
    setSelectedCols((p) => p.includes(col) ? p.filter((c) => c !== col) : [...p, col]);
    setPage(1);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  // Row selection helpers
  const currentPagePks = (result?.data ?? []).map((row) => Number(row[tableConfig.pk]));
  const allCurrentSelected = currentPagePks.length > 0 && currentPagePks.every((pk) => selectedPks.has(pk));
  const someCurrentSelected = currentPagePks.some((pk) => selectedPks.has(pk));

  const toggleSelectAll = () => {
    setSelectedPks((prev) => {
      const next = new Set(prev);
      if (allCurrentSelected) currentPagePks.forEach((pk) => next.delete(pk));
      else currentPagePks.forEach((pk) => next.add(pk));
      return next;
    });
  };

  const toggleRow = (pk: number) => {
    setSelectedPks((prev) => {
      const next = new Set(prev);
      if (next.has(pk)) next.delete(pk); else next.add(pk);
      return next;
    });
  };

  const columnLabels = Object.fromEntries(allCols.map((c) => [c, tableConfig.columns[c].label]));
  const hasFilters = search || Object.values(filters).some(Boolean);

  if (mode === "sql") {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 px-5 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMode("builder")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Table size={12} /> Builder
          </button>
          <button
            onClick={() => setMode("sql")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white"
          >
            <Code size={12} /> SQL
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SqlEditor />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
            <Database size={15} className="text-blue-600" /> Query Tool
          </div>
        </div>

        {/* Table selector */}
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Table</p>
          <div className="space-y-0.5">
            {Object.keys(TABLES).map((t) => (
              <button key={t} onClick={() => switchTable(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  table === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{TABLES[t].label}</span>
                <span className={`ml-1.5 text-xs ${table === t ? "text-blue-200" : "text-gray-400"}`}>
                  ({Object.keys(TABLES[t].columns).length} cols)
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column selector */}
        <div className="flex-1 flex flex-col overflow-hidden px-3 py-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Columns</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedCols(allCols)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">All</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => setSelectedCols(tableConfig.defaultColumns)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Default</button>
            </div>
          </div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={colSearch} onChange={(e) => setColSearch(e.target.value)}
              placeholder="Filter columns..."
              autoComplete="nope"
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {filteredColList.map((col) => {
              const meta = tableConfig.columns[col];
              const checked = selectedCols.includes(col);
              return (
                <label key={col} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCol(col)}
                    className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className={`text-xs font-medium block truncate ${checked ? "text-blue-700" : "text-gray-700"}`}>{meta.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{col}</span>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="pt-2 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400 text-center">{selectedCols.length} of {allCols.length} selected</p>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 flex-shrink-0 mr-2">
            <button
              onClick={() => setMode("builder")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white"
            >
              <Table size={12} /> Builder
            </button>
            <button
              onClick={() => setMode("sql")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Code size={12} /> SQL
            </button>
          </div>
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tableConfig.label.toLowerCase()}...`}
              autoComplete="nope"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters || Object.values(filters).some(Boolean)
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={13} /> Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>

          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilters({}); setPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={12} /> Clear all
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none">
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
            </select>

            <button onClick={runQuery} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => {
                if (!result) return;
                const rows = selectedPks.size > 0
                  ? result.data.filter((r) => selectedPks.has(Number(r[tableConfig.pk])))
                  : result.data;
                exportCSV(selectedCols, columnLabels, rows);
              }}
              disabled={!result || result.data.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
            >
              <Download size={13} />
              {selectedPks.size > 0 ? `Export ${selectedPks.size} selected` : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Per-column filters */}
        {showFilters && (
          <div className="bg-blue-50/50 border-b border-blue-100 px-5 py-3">
            <div className="flex flex-wrap gap-3">
              {selectedCols.map((col) => {
                const meta = tableConfig.columns[col];
                if (meta.type === "date") return null;
                return (
                  <div key={col} className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">{meta.label}</label>
                    {meta.type === "boolean" ? (
                      <select value={filters[col] || ""} onChange={(e) => setFilters((p) => ({ ...p, [col]: e.target.value }))}
                        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[90px]">
                        <option value="">Any</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input value={filters[col] || ""} onChange={(e) => { setFilters((p) => ({ ...p, [col]: e.target.value })); setPage(1); }}
                        placeholder={meta.type === "number" ? "≥ value" : "contains..."}
                        autoComplete="nope"
                        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedPks.size > 0 && (
          <BulkActionBar
            table={table}
            selectedIds={selectedPks}
            users={users}
            onClear={() => setSelectedPks(new Set())}
            onDone={() => { setSelectedPks(new Set()); runQuery(); }}
          />
        )}

        {/* Results table */}
        <div className="flex-1 overflow-auto">
          {loading && !result ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
            </div>
          ) : result && result.data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No results found</div>
          ) : result ? (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                <tr>
                  {/* Select-all checkbox */}
                  <th className="w-9 px-3 py-2.5 border-r border-gray-100">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      ref={(el) => { if (el) el.indeterminate = someCurrentSelected && !allCurrentSelected; }}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                    />
                  </th>
                  {selectedCols.map((col) => {
                    const meta = tableConfig.columns[col];
                    const isSorted = sortCol === col;
                    return (
                      <th key={col} onClick={() => handleSort(col)}
                        className="text-left px-3 py-2.5 font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 whitespace-nowrap select-none border-r border-gray-100 last:border-r-0"
                      >
                        <div className="flex items-center gap-1">
                          {meta.label}
                          {isSorted
                            ? sortDir === "asc" ? <ChevronUp size={11} className="text-blue-600" /> : <ChevronDown size={11} className="text-blue-600" />
                            : <ChevronsUpDown size={10} className="text-gray-300" />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, i) => {
                  const pk = Number(row[tableConfig.pk]);
                  const isSelected = selectedPks.has(pk);
                  return (
                    <tr key={i}
                      className={`border-b border-gray-100 transition-colors ${loading ? "opacity-60" : ""} ${
                        isSelected ? "bg-blue-50" : i % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-gray-50/50 hover:bg-blue-50/40"
                      }`}
                    >
                      {/* Row checkbox */}
                      <td className="w-9 px-3 py-2 border-r border-gray-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(pk)}
                          className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>
                      {selectedCols.map((col) => {
                        const meta = tableConfig.columns[col];
                        const val = row[col];
                        const isName = col === "le_name" || col === "lf_name" || col === "full_name";
                        const display = formatValue(val, meta.type);
                        return (
                          <td key={col} className="px-3 py-2 border-r border-gray-100 last:border-r-0 max-w-xs">
                            {isName && tableConfig.linkPrefix && pk ? (
                              <Link href={`${tableConfig.linkPrefix}${pk}`}
                                className="text-blue-600 hover:text-blue-800 font-medium hover:underline truncate block">
                                {display}
                              </Link>
                            ) : meta.type === "boolean" ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${val ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {display}
                              </span>
                            ) : col === "acquisition_fit_score" && val !== null ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                Number(val) >= 7 ? "bg-green-100 text-green-700" : Number(val) >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                              }`}>{display}</span>
                            ) : (
                              <span className={`block truncate ${val === null || val === undefined ? "text-gray-300" : "text-gray-700"}`}>{display}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* Pagination */}
        {result && (
          <div className="bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-gray-500">
              {loading ? "Loading..." : (
                <>
                  Showing <span className="font-semibold text-gray-700">{(page - 1) * limit + 1}–{Math.min(page * limit, result.total)}</span> of{" "}
                  <span className="font-semibold text-gray-700">{result.total.toLocaleString()}</span> rows
                  {selectedPks.size > 0 && <span className="ml-2 text-blue-600 font-semibold">· {selectedPks.size} selected</span>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600">Prev</button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(7, result.pages) }, (_, i) => {
                  let n: number;
                  if (result.pages <= 7) n = i + 1;
                  else if (page <= 4) n = i + 1;
                  else if (page >= result.pages - 3) n = result.pages - 6 + i;
                  else n = page - 3 + i;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                        page === n ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}>{n}</button>
                  );
                })}
              </div>
              <button onClick={() => setPage((p) => Math.min(result.pages, p + 1))} disabled={page === result.pages}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600">Next</button>
              <button onClick={() => setPage(result.pages)} disabled={page === result.pages}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
