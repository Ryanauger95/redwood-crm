"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { TABLE, SortIcon as SharedSortIcon } from "@/components/shared/TablePrimitives";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/shared/Toast";
import { useRowSelection } from "@/hooks/useRowSelection";
import { getLastViewId, setLastViewId } from "@/lib/viewPersistence";
import {
  SavedViewData,
  FilterCondition,
  FORECLOSURE_FILTER_FIELDS,
  FORECLOSURE_COLUMNS,
  DEFAULT_FORECLOSURE_COLUMNS,
} from "@/lib/views";

interface ForeclosureCase {
  id: number;
  case_number: string;
  status: string | null;
  filed_date: string | null;
  disposition: string | null;
  disposition_date: string | null;
  disposition_judge: string | null;
  caption: string | null;
  tax_map_description: string | null;
  tax_map_number: string | null;
  tax_map_agency: string | null;
  balance_due: string | null;
  fine_costs: string | null;
  total_paid_for_fine_costs: string | null;
  court_agency: string | null;
  case_type: string | null;
  case_sub_type: string | null;
  file_type: string | null;
  assigned_judge: string | null;
  property_id: string | null;
  scraped_at: string | null;
  county: string | null;
  plaintiff: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Pending:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Dismissed: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  Cancelled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  Active:    "bg-red-50 text-red-700 ring-1 ring-red-200",
  Closed:    "bg-green-50 text-green-700 ring-1 ring-green-200",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const cls = STATUS_COLORS[status] || "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
}

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ForeclosuresClient() {
  const { showToast, toastElement } = useToast();
  const [cases, setCases] = useState<ForeclosureCase[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Views
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_FORECLOSURE_COLUMNS);
  const [sortField, setSortField] = useState("filed_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Row selection
  const visibleIds = cases.map(c => c.id);
  const selection = useRowSelection(visibleIds, total, pages);

  // Users for bulk assign
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  }, []);

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const isDirty = activeView
    ? !conditionsEqual(conditions, (activeView.filters as FilterCondition[]) ?? []) ||
      JSON.stringify(columns) !== JSON.stringify(activeView.columns ?? DEFAULT_FORECLOSURE_COLUMNS) ||
      sortField !== (activeView.sort_field ?? "filed_date") ||
      sortDir !== (activeView.sort_dir ?? "desc")
    : false;

  useEffect(() => {
    fetch("/api/views?entity=foreclosures")
      .then((r) => r.json())
      .then((data: SavedViewData[]) => {
        setViews(data);
        const lastId = getLastViewId("foreclosures");
        const last = lastId ? data.find((v) => v.id === lastId) : null;
        const initial = last ?? data[0];
        if (initial) activateView(initial, false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activateView(view: SavedViewData, resetPage = true) {
    setActiveViewId(view.id);
    setConditions((view.filters as FilterCondition[]) ?? []);
    setColumns((view.columns as string[]) ?? DEFAULT_FORECLOSURE_COLUMNS);
    setSortField(view.sort_field ?? "filed_date");
    setSortDir((view.sort_dir as "asc" | "desc") ?? "desc");
    setLastViewId("foreclosures", view.id);
    if (resetPage) setPage(1);
  }

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (conditions.length > 0) params.set("filters", JSON.stringify(conditions));
      params.set("page", String(page));
      params.set("sort", sortField);
      params.set("dir", sortDir);
      const res = await fetch(`/api/foreclosures?${params}`);
      const data = await res.json();
      setCases(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, conditions, page, sortField, sortDir]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => (
    <SharedSortIcon field={field} sortField={sortField} sortDir={sortDir} />
  );

  // Bulk action handlers (foreclosures are mostly read-only)
  const handleBulkAssign = async (userId: number) => {
    selection.clearSelection();
  };

  const handleBulkFieldChange = async (field: string, value: string) => {
    selection.clearSelection();
    showToast("Foreclosures are read-only");
  };

  // View CRUD
  const handleSaveCurrent = async (): Promise<void> => {
    if (!activeView || activeView.is_default) return;
    const res = await fetch(`/api/views/${activeView.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: conditions, columns, sort_field: sortField, sort_dir: sortDir }),
    });
    const updated: SavedViewData = await res.json();
    setViews((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
    activateView(updated, false);
    showToast("View saved");
  };

  const handleSaveAsNew = async (name: string) => {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entity: "foreclosures", filters: conditions, columns, sort_field: sortField, sort_dir: sortDir }),
    });
    const created: SavedViewData = await res.json();
    setViews((vs) => [...vs, created]);
    activateView(created);
    showToast("View created");
  };

  const handleRenameView = async (id: number, name: string) => {
    const res = await fetch(`/api/views/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const updated: SavedViewData = await res.json();
    setViews((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleToggleHide = async (id: number, hidden: boolean) => {
    const res = await fetch(`/api/views/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: hidden }),
    });
    const updated: SavedViewData = await res.json();
    setViews((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
    if (hidden && id === activeViewId) {
      const firstVisible = views.find((v) => v.id !== id && !v.is_hidden);
      if (firstVisible) activateView(firstVisible);
    }
  };

  const handleDeleteView = async (id: number) => {
    await fetch(`/api/views/${id}`, { method: "DELETE" });
    const remaining = views.filter((v) => v.id !== id);
    setViews(remaining);
    if (activeViewId === id && remaining.length > 0) activateView(remaining[0]);
  };

  const handleDiscard = () => { if (activeView) activateView(activeView); };

  const hasFilters = conditions.length > 0 || !!search;
  const colCount = columns.length + 2; // +1 for case_number (always on) +1 for checkbox

  return (
    <div>
      {toastElement}

      {views.length > 0 && (
        <ViewsBar
          views={views}
          activeViewId={activeViewId}
          isDirty={isDirty}
          activeView={activeView}
          onSelectView={(v) => activateView(v)}
          onRenameView={handleRenameView}
          onDeleteView={handleDeleteView}
          onToggleHide={handleToggleHide}
          onSaveCurrent={handleSaveCurrent}
          onSaveAsNew={handleSaveAsNew}
          onDiscard={handleDiscard}
        />
      )}

      {selection.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          totalCount={total}
          allPagesSelected={selection.allPagesSelected}
          hasMultiplePages={selection.hasMultiplePages}
          onSelectAllPages={selection.selectAllPages}
          onClearSelection={selection.clearSelection}
          onAssign={handleBulkAssign}
          onChangeField={handleBulkFieldChange}
          assignableUsers={users}
          editableFields={[
            { key: "status", label: "Status", options: ["Pending", "Dismissed", "Active", "Closed", "Cancelled"] },
          ]}
        />
      )}

      <div className="p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Foreclosures</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} ${hasFilters ? "matching" : "total"} cases`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-72">
            <Input
              placeholder="Search case #, address, caption..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search size={14} />}
            />
          </div>
          <FilterBuilder
            fields={FORECLOSURE_FILTER_FIELDS}
            conditions={conditions}
            onChange={(c) => { setConditions(c); setPage(1); }}
          />
          <ColumnPicker columnDefs={FORECLOSURE_COLUMNS} selected={columns} onChange={setColumns} />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={TABLE.thead}>
                  {/* Checkbox header */}
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selection.allOnPageSelected}
                      ref={(el) => { if (el) el.indeterminate = selection.someOnPageSelected && !selection.allOnPageSelected; }}
                      onChange={selection.toggleAll}
                      className={TABLE.checkbox}
                    />
                  </th>
                  {/* Case # always shown */}
                  <th
                    className={TABLE.thSort}
                    onClick={() => toggleSort("case_number")}
                  >
                    <span className="flex items-center">Case # <SortIcon field="case_number" /></span>
                  </th>
                  {columns.includes("address") && (
                    <th className={TABLE.th}>Property / Address</th>
                  )}
                  {columns.includes("plaintiff") && (
                    <th className={TABLE.th}>Plaintiff</th>
                  )}
                  {columns.includes("status") && (
                    <th
                      className={TABLE.thSort}
                      onClick={() => toggleSort("status")}
                    >
                      <span className="flex items-center">Status <SortIcon field="status" /></span>
                    </th>
                  )}
                  {columns.includes("filed_date") && (
                    <th
                      className={TABLE.thSort}
                      onClick={() => toggleSort("filed_date")}
                    >
                      <span className="flex items-center">Filed <SortIcon field="filed_date" /></span>
                    </th>
                  )}
                  {columns.includes("disposition") && (
                    <th className={TABLE.th}>Disposition</th>
                  )}
                  {columns.includes("disposition_date") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("disposition_date")}>
                      <span className="flex items-center">Disp. Date <SortIcon field="disposition_date" /></span>
                    </th>
                  )}
                  {columns.includes("balance_due") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("balance_due")}>
                      <span className="flex items-center">Balance Due <SortIcon field="balance_due" /></span>
                    </th>
                  )}
                  {columns.includes("fine_costs") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("fine_costs")}>
                      <span className="flex items-center">Fine / Costs <SortIcon field="fine_costs" /></span>
                    </th>
                  )}
                  {columns.includes("total_paid") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("total_paid")}>
                      <span className="flex items-center">Total Paid <SortIcon field="total_paid" /></span>
                    </th>
                  )}
                  {columns.includes("court_agency") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("court_agency")}>
                      <span className="flex items-center">Court <SortIcon field="court_agency" /></span>
                    </th>
                  )}
                  {columns.includes("case_sub_type") && (
                    <th className={TABLE.th}>Case Type</th>
                  )}
                  {columns.includes("file_type") && (
                    <th className={TABLE.th}>File Type</th>
                  )}
                  {columns.includes("assigned_judge") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("assigned_judge")}>
                      <span className="flex items-center">Judge <SortIcon field="assigned_judge" /></span>
                    </th>
                  )}
                  {columns.includes("disposition_judge") && (
                    <th className={TABLE.th}>Disp. Judge</th>
                  )}
                  {columns.includes("caption") && (
                    <th className={TABLE.th}>Caption</th>
                  )}
                  {columns.includes("tax_map_number") && (
                    <th className={TABLE.th}>Parcel #</th>
                  )}
                  {columns.includes("tax_map_agency") && (
                    <th className={TABLE.th}>Tax Map Agency</th>
                  )}
                  {columns.includes("scraped_at") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("scraped_at")}>
                      <span className="flex items-center">Scraped <SortIcon field="scraped_at" /></span>
                    </th>
                  )}
                  {columns.includes("county") && (
                    <th className={TABLE.thSort} onClick={() => toggleSort("county")}>
                      <span className="flex items-center">County <SortIcon field="county" /></span>
                    </th>
                  )}
                  {columns.includes("case_type") && (
                    <th className={TABLE.th}>Case Type (Main)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <td key={j} className={TABLE.cell}>
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + ((i * 13 + j * 7) % 45)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="text-center py-16 text-gray-400">
                      <Scale size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No foreclosure cases found</p>
                      {hasFilters && (
                        <button onClick={() => { setSearch(""); setConditions([]); setPage(1); }} className="text-xs text-blue-600 hover:underline mt-1">
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className={TABLE.row}>
                      {/* Checkbox per row */}
                      <td className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selection.isSelected(c.id)}
                          onChange={() => selection.toggleOne(c.id)}
                          className={TABLE.checkbox}
                        />
                      </td>
                      {/* Case # — always shown */}
                      <td className={TABLE.cell}>
                        <Link href={`/foreclosures/${c.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm font-mono">
                          {c.case_number}
                        </Link>
                        {c.court_agency && !columns.includes("court_agency") && (
                          <div className="text-xs text-gray-400 mt-0.5">{c.court_agency}</div>
                        )}
                      </td>

                      {columns.includes("address") && (
                        <td className={TABLE.cell}>
                          <div className="text-sm text-gray-800 max-w-xs truncate">{c.tax_map_description || "—"}</div>
                          {c.tax_map_number && <div className="text-xs text-gray-400 font-mono mt-0.5">{c.tax_map_number}</div>}
                          {c.property_id && (
                            <Link href={`/properties/${c.property_id}`} className="text-xs text-blue-500 hover:underline mt-0.5 block">
                              → Linked property
                            </Link>
                          )}
                        </td>
                      )}

                      {columns.includes("plaintiff") && (
                        <td className={`${TABLE.cellText} max-w-[180px]`}>
                          <span className="truncate block">{c.plaintiff || "—"}</span>
                        </td>
                      )}

                      {columns.includes("status") && (
                        <td className={TABLE.cell}>
                          <StatusBadge status={c.status} />
                        </td>
                      )}

                      {columns.includes("filed_date") && (
                        <td className={TABLE.cellText}>
                          {c.filed_date ? new Date(c.filed_date).toLocaleDateString() : "—"}
                        </td>
                      )}

                      {columns.includes("disposition") && (
                        <td className={`${TABLE.cellText} max-w-[200px]`}>
                          <span className="truncate block">{c.disposition || "—"}</span>
                        </td>
                      )}

                      {columns.includes("disposition_date") && (
                        <td className={TABLE.cellText}>
                          {c.disposition_date ? new Date(c.disposition_date).toLocaleDateString() : "—"}
                        </td>
                      )}

                      {columns.includes("balance_due") && (
                        <td className={`${TABLE.cell} text-[13px]`}>
                          {c.balance_due && parseFloat(c.balance_due) > 0
                            ? <span className="font-medium text-red-600">${parseFloat(c.balance_due).toLocaleString()}</span>
                            : <span className="text-gray-400">$0</span>}
                        </td>
                      )}

                      {columns.includes("fine_costs") && (
                        <td className={TABLE.cellText}>
                          {c.fine_costs ? `$${parseFloat(c.fine_costs).toLocaleString()}` : "—"}
                        </td>
                      )}

                      {columns.includes("total_paid") && (
                        <td className={TABLE.cellText}>
                          {c.total_paid_for_fine_costs ? `$${parseFloat(c.total_paid_for_fine_costs).toLocaleString()}` : "—"}
                        </td>
                      )}

                      {columns.includes("court_agency") && (
                        <td className={TABLE.cellText}>{c.court_agency || "—"}</td>
                      )}

                      {columns.includes("case_sub_type") && (
                        <td className={TABLE.cellText}>{c.case_sub_type || "—"}</td>
                      )}

                      {columns.includes("file_type") && (
                        <td className={TABLE.cellText}>{c.file_type || "—"}</td>
                      )}

                      {columns.includes("assigned_judge") && (
                        <td className={TABLE.cellText}>{c.assigned_judge || "—"}</td>
                      )}

                      {columns.includes("disposition_judge") && (
                        <td className={TABLE.cellText}>{c.disposition_judge || "—"}</td>
                      )}

                      {columns.includes("caption") && (
                        <td className={`${TABLE.cellText} max-w-[220px]`}>
                          <span className="truncate block">{c.caption || "—"}</span>
                        </td>
                      )}

                      {columns.includes("tax_map_number") && (
                        <td className={`${TABLE.cellText} font-mono`}>{c.tax_map_number || "—"}</td>
                      )}

                      {columns.includes("tax_map_agency") && (
                        <td className={TABLE.cellText}>{c.tax_map_agency || "—"}</td>
                      )}

                      {columns.includes("scraped_at") && (
                        <td className={TABLE.cellText}>
                          {c.scraped_at ? new Date(c.scraped_at).toLocaleDateString() : "—"}
                        </td>
                      )}

                      {columns.includes("county") && (
                        <td className={TABLE.cellText}>{c.county || "—"}</td>
                      )}

                      {columns.includes("case_type") && (
                        <td className={TABLE.cellText}>{c.case_type || "—"}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className={TABLE.pagination}>
              <p className={TABLE.paginationText}>Page {page} of {pages} &middot; {total.toLocaleString()} results</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>&larr; Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next &rarr;</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
