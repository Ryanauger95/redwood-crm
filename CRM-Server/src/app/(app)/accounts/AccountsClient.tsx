"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { formatCurrency, PIPELINE_STAGES } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";
import { getLastViewId, setLastViewId } from "@/lib/viewPersistence";
import {
  SavedViewData,
  FilterCondition,
  BUSINESS_FILTER_FIELDS,
  BUSINESS_COLUMNS,
  DEFAULT_BUSINESS_COLUMNS,
} from "@/lib/views";

interface Business {
  business_id: number;
  le_name: string | null;
  lf_name: string | null;
  city: string | null;
  county: string | null;
  phone: string | null;
  license_type: string | null;
  acquisition_fit_score: number | null;
  estimated_annual_profit: string | null;
  estimated_annual_revenue: string | null;
  profit_margin_pct: string | null;
  estimated_employees: number | null;
  founded_year: number | null;
  enrichment_status: string;
  cms_star_rating: string | null;
  pe_backed: boolean | null;
  medicare_certified: boolean;
  stage: string | null;
}

function EnrichmentBadge({ status }: { status: string }) {
  if (status === "completed")
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Enriched</span>;
  if (status === "failed")
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Failed</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
}

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function AccountsClient() {
  const { showToast, toastElement } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Inline editing
  const [editingStageId, setEditingStageId] = useState<number | null>(null);

  // Views state
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort state
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_BUSINESS_COLUMNS);
  const [sortField, setSortField] = useState("acquisition_fit_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const isDirty = activeView
    ? !conditionsEqual(conditions, (activeView.filters as FilterCondition[]) ?? []) ||
      JSON.stringify(columns) !== JSON.stringify(activeView.columns ?? DEFAULT_BUSINESS_COLUMNS) ||
      sortField !== (activeView.sort_field ?? "acquisition_fit_score") ||
      sortDir !== (activeView.sort_dir ?? "desc")
    : false;

  // Load views on mount — restore last visited view
  useEffect(() => {
    fetch("/api/views?entity=businesses")
      .then((r) => r.json())
      .then((data: SavedViewData[]) => {
        setViews(data);
        const lastId = getLastViewId("businesses");
        const last = lastId ? data.find((v) => v.id === lastId) : null;
        const initial = last ?? data[0];
        if (initial) activateView(initial, false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activateView(view: SavedViewData, resetPage = true) {
    setActiveViewId(view.id);
    setConditions((view.filters as FilterCondition[]) ?? []);
    setColumns((view.columns as string[]) ?? DEFAULT_BUSINESS_COLUMNS);
    setSortField(view.sort_field ?? "acquisition_fit_score");
    setSortDir((view.sort_dir as "asc" | "desc") ?? "desc");
    setLastViewId("businesses", view.id);
    if (resetPage) setPage(1);
  }

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (conditions.length > 0) params.set("filters", JSON.stringify(conditions));
      params.set("page", String(page));
      params.set("sort", sortField);
      params.set("dir", sortDir);
      params.set("limit", "25");
      const res = await fetch(`/api/businesses?${params}`);
      const data = await res.json();
      setBusinesses(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, conditions, page, sortField, sortDir]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir(field === "le_name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-0.5 text-xs">↕</span>;
    return sortDir === "desc" ? <ChevronDown size={13} className="ml-0.5" /> : <ChevronUp size={13} className="ml-0.5" />;
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
  };

  const handleSaveAsNew = async (name: string) => {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entity: "businesses", filters: conditions, columns, sort_field: sortField, sort_dir: sortDir }),
    });
    const created: SavedViewData = await res.json();
    setViews((vs) => [...vs, created]);
    activateView(created);
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
    // If we hid the active view, switch to first visible
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

  const handleDiscard = () => {
    if (activeView) activateView(activeView);
  };

  const handleConditionsChange = (c: FilterCondition[]) => {
    setConditions(c);
    setPage(1);
  };

  const patchStage = useCallback(async (businessId: number, stage: string) => {
    const res = await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      setBusinesses((prev) => prev.map((b) => b.business_id === businessId ? { ...b, stage } : b));
      showToast("Stage updated");
    }
    setEditingStageId(null);
  }, [showToast]);

  const handleColumnsChange = (c: string[]) => {
    setColumns(c);
  };

  const hasFilters = conditions.length > 0 || !!search;

  return (
    <div>
      {toastElement}
      {/* Views bar */}
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

      <div className="p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} ${hasFilters ? "matching" : "total"} businesses`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-64">
            <Input
              placeholder="Search name, city, county..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search size={14} />}
            />
          </div>

          <FilterBuilder
            fields={BUSINESS_FILTER_FIELDS}
            conditions={conditions}
            onChange={handleConditionsChange}
          />

          <ColumnPicker
            columnDefs={BUSINESS_COLUMNS}
            selected={columns}
            onChange={handleColumnsChange}
          />
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {/* Name is always on */}
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 transition-colors"
                    onClick={() => toggleSort("le_name")}
                  >
                    <span className="flex items-center">Name <SortIcon field="le_name" /></span>
                  </th>
                  {columns.includes("location") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  )}
                  {columns.includes("license_type") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  )}
                  {columns.includes("acquisition_fit_score") && (
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 transition-colors"
                      onClick={() => toggleSort("acquisition_fit_score")}
                    >
                      <span className="flex items-center">Fit Score <SortIcon field="acquisition_fit_score" /></span>
                    </th>
                  )}
                  {columns.includes("estimated_annual_profit") && (
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 transition-colors"
                      onClick={() => toggleSort("estimated_annual_profit")}
                    >
                      <span className="flex items-center">Est. Profit <SortIcon field="estimated_annual_profit" /></span>
                    </th>
                  )}
                  {columns.includes("estimated_annual_revenue") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Revenue</th>
                  )}
                  {columns.includes("profit_margin_pct") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
                  )}
                  {columns.includes("estimated_employees") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employees</th>
                  )}
                  {columns.includes("founded_year") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Founded</th>
                  )}
                  {columns.includes("cms_star_rating") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CMS Stars</th>
                  )}
                  {columns.includes("medicare_certified") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Medicare</th>
                  )}
                  {columns.includes("pe_backed") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PE</th>
                  )}
                  {columns.includes("county") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">County</th>
                  )}
                  {columns.includes("stage") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                  )}
                  {columns.includes("enrichment_status") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: columns.length + 1 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + ((i * 13 + j * 7) % 50)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-16 text-gray-400">
                      <p className="text-sm">No businesses found</p>
                      {hasFilters && (
                        <button onClick={() => { setSearch(""); handleConditionsChange([]); }} className="text-xs text-blue-600 hover:underline mt-1">
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  businesses.map((b) => (
                    <tr key={b.business_id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Name — always on */}
                      <td className="px-4 py-3">
                        <Link href={`/accounts/${b.business_id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm">
                          {b.le_name || b.lf_name || "Unknown"}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {b.medicare_certified && <span className="text-xs text-blue-600">Medicare</span>}
                          {b.pe_backed === false && <span className="text-xs text-green-600">Independent</span>}
                          {b.cms_star_rating && (
                            <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                              <Star size={10} className="fill-yellow-400 text-yellow-400" />{b.cms_star_rating}
                            </span>
                          )}
                        </div>
                      </td>
                      {columns.includes("location") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{b.city || "—"}</div>
                        </td>
                      )}
                      {columns.includes("license_type") && (
                        <td className="px-4 py-3">
                          {b.license_type ? (
                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{b.license_type}</span>
                          ) : "—"}
                        </td>
                      )}
                      {columns.includes("acquisition_fit_score") && (
                        <td className="px-4 py-3">
                          <FitScoreBadge score={b.acquisition_fit_score} size="sm" />
                        </td>
                      )}
                      {columns.includes("estimated_annual_profit") && (
                        <td className="px-4 py-3 text-sm font-semibold text-green-700">
                          {b.estimated_annual_profit
                            ? formatCurrency(Number(b.estimated_annual_profit))
                            : <span className="text-gray-300 font-normal">—</span>}
                        </td>
                      )}
                      {columns.includes("estimated_annual_revenue") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.estimated_annual_revenue
                            ? formatCurrency(Number(b.estimated_annual_revenue))
                            : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("profit_margin_pct") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.profit_margin_pct ? `${b.profit_margin_pct}%` : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("estimated_employees") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.estimated_employees ?? <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("founded_year") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.founded_year ?? <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("cms_star_rating") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.cms_star_rating ? (
                            <span className="flex items-center gap-0.5">
                              <Star size={11} className="fill-yellow-400 text-yellow-400" />{b.cms_star_rating}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("medicare_certified") && (
                        <td className="px-4 py-3 text-sm">
                          {b.medicare_certified
                            ? <span className="text-blue-600 text-xs font-medium">Yes</span>
                            : <span className="text-gray-300 text-xs">No</span>}
                        </td>
                      )}
                      {columns.includes("pe_backed") && (
                        <td className="px-4 py-3 text-sm">
                          {b.pe_backed === null
                            ? <span className="text-gray-300 text-xs">—</span>
                            : b.pe_backed
                            ? <span className="text-orange-500 text-xs font-medium">PE</span>
                            : <span className="text-green-600 text-xs font-medium">Indep.</span>}
                        </td>
                      )}
                      {columns.includes("county") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.county ?? <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {columns.includes("stage") && (
                        <td className="px-4 py-3">
                          {editingStageId === b.business_id ? (
                            <select
                              autoFocus
                              defaultValue={b.stage || "Prospect"}
                              onChange={(e) => patchStage(b.business_id, e.target.value)}
                              onBlur={() => setEditingStageId(null)}
                              className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                            >
                              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span
                              className="cursor-pointer"
                              onClick={() => setEditingStageId(b.business_id)}
                            >
                              {b.stage ? <StageBadge stage={b.stage} /> : <span className="text-xs text-gray-300 hover:text-gray-500">Set stage</span>}
                            </span>
                          )}
                        </td>
                      )}
                      {columns.includes("enrichment_status") && (
                        <td className="px-4 py-3">
                          <EnrichmentBadge status={b.enrichment_status} />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-500">Page {page} of {pages} &middot; {total.toLocaleString()} results</p>
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
