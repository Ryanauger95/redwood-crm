"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { useToast } from "@/components/shared/Toast";
import { formatCurrency } from "@/lib/utils";
import { getLastViewId, setLastViewId } from "@/lib/viewPersistence";
import {
  SavedViewData,
  FilterCondition,
  PROPERTY_FILTER_FIELDS,
  PROPERTY_COLUMNS,
  DEFAULT_PROPERTY_COLUMNS,
  DEAL_STAGES,
} from "@/lib/views";

interface Property {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  asset_class: string | null;
  deal_stage: string | null;
  relationship_status: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  communication_status: string | null;
  asking_price: string | null;
  updated_at: string | null;
  sales_owner: string | null;
  annual_revenue: string | null;
  num_employees: number | null;
  territory: string | null;
}

type EditingCell = { id: string; field: string } | null;

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Inline text cell — click to edit, blur/Enter to save, Escape to cancel
function InlineText({
  value,
  field,
  rowId,
  editingCell,
  editValue,
  onStartEdit,
  onChangeValue,
  onCommit,
  onCancel,
  className = "",
}: {
  value: string | null;
  field: string;
  rowId: string;
  editingCell: EditingCell;
  editValue: string;
  onStartEdit: (id: string, field: string, current: string) => void;
  onChangeValue: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const isEditing = editingCell?.id === rowId && editingCell.field === field;
  if (isEditing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        className={`border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none w-full ${className}`}
      />
    );
  }
  return (
    <span
      className="cursor-text hover:bg-gray-100 rounded px-1.5 py-0.5 transition-colors block"
      onClick={() => onStartEdit(rowId, field, value || "")}
    >
      {value || <span className="text-gray-300">—</span>}
    </span>
  );
}

// Inline select cell — click to edit, onChange saves immediately
function InlineSelect({
  value,
  field,
  rowId,
  options,
  editingCell,
  editValue,
  onStartEdit,
  onCommit,
  onCancel,
  renderValue,
}: {
  value: string | null;
  field: string;
  rowId: string;
  options: string[];
  editingCell: EditingCell;
  editValue: string;
  onStartEdit: (id: string, field: string, current: string) => void;
  onCommit: (val: string) => void;
  onCancel: () => void;
  renderValue: (v: string | null) => React.ReactNode;
}) {
  const isEditing = editingCell?.id === rowId && editingCell.field === field;
  if (isEditing) {
    return (
      <select
        autoFocus
        value={editValue}
        onChange={(e) => onCommit(e.target.value)}
        onBlur={onCancel}
        className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none max-w-48"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <span
      className="cursor-pointer block"
      onClick={() => onStartEdit(rowId, field, value || options[0])}
    >
      {renderValue(value)}
    </span>
  );
}

function DealStageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <span className="text-gray-300 text-xs hover:bg-gray-100 rounded px-1.5 py-0.5 block cursor-pointer">—</span>;
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 cursor-pointer">
      {stage}
    </span>
  );
}

function RelStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs hover:bg-gray-100 rounded px-1.5 py-0.5 block cursor-pointer">—</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 cursor-pointer">{status}</span>;
}

export default function PropertiesClient() {
  const { showToast, toastElement } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Inline editing
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");

  // Views
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_PROPERTY_COLUMNS);
  const [sortField, setSortField] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const isDirty = activeView
    ? !conditionsEqual(conditions, (activeView.filters as FilterCondition[]) ?? []) ||
      JSON.stringify(columns) !== JSON.stringify(activeView.columns ?? DEFAULT_PROPERTY_COLUMNS) ||
      sortField !== (activeView.sort_field ?? "updated_at") ||
      sortDir !== (activeView.sort_dir ?? "desc")
    : false;

  useEffect(() => {
    fetch("/api/views?entity=properties")
      .then((r) => r.json())
      .then((data: SavedViewData[]) => {
        setViews(data);
        const lastId = getLastViewId("properties");
        const last = lastId ? data.find((v) => v.id === lastId) : null;
        const initial = last ?? data[0];
        if (initial) activateView(initial, false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activateView(view: SavedViewData, resetPage = true) {
    setActiveViewId(view.id);
    setConditions((view.filters as FilterCondition[]) ?? []);
    setColumns((view.columns as string[]) ?? DEFAULT_PROPERTY_COLUMNS);
    setSortField(view.sort_field ?? "updated_at");
    setSortDir((view.sort_dir as "asc" | "desc") ?? "desc");
    setLastViewId("properties", view.id);
    if (resetPage) setPage(1);
  }

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (conditions.length > 0) params.set("filters", JSON.stringify(conditions));
      params.set("page", String(page));
      params.set("sort", sortField);
      params.set("dir", sortDir);
      params.set("limit", "25");
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, conditions, page, sortField, sortDir]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-0.5 text-xs">↕</span>;
    return sortDir === "desc"
      ? <ChevronDown size={13} className="ml-0.5" />
      : <ChevronUp size={13} className="ml-0.5" />;
  };

  // Inline editing helpers
  const startEdit = (id: string, field: string, current: string) => {
    setEditingCell({ id, field });
    setEditValue(current);
  };
  const cancelEdit = () => setEditingCell(null);

  const patchProperty = useCallback(async (id: string, field: string, value: string) => {
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setProperties((prev) =>
        prev.map((p) => p.id === id ? { ...p, [field]: value || null } : p)
      );
      showToast("Saved");
    }
    setEditingCell(null);
  }, [showToast]);

  const commitTextEdit = useCallback(() => {
    if (!editingCell) return;
    patchProperty(editingCell.id, editingCell.field, editValue);
  }, [editingCell, editValue, patchProperty]);

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
      body: JSON.stringify({ name, entity: "properties", filters: conditions, columns, sort_field: sortField, sort_dir: sortDir }),
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

      <div className="p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} ${hasFilters ? "matching" : "total"} properties`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-64">
            <Input
              placeholder="Search name, city, county, owner..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search size={14} />}
            />
          </div>
          <FilterBuilder
            fields={PROPERTY_FILTER_FIELDS}
            conditions={conditions}
            onChange={(c) => { setConditions(c); setPage(1); }}
          />
          <ColumnPicker columnDefs={PROPERTY_COLUMNS} selected={columns} onChange={setColumns} />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="flex items-center">Name <SortIcon field="name" /></span>
                  </th>
                  {columns.includes("location") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  )}
                  {columns.includes("asset_class") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asset Class</th>
                  )}
                  {columns.includes("deal_stage") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deal Stage</th>
                  )}
                  {columns.includes("relationship_status") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Relationship</th>
                  )}
                  {columns.includes("owner") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                  )}
                  {columns.includes("asking_price") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asking Price</th>
                  )}
                  {columns.includes("communication_status") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comm. Status</th>
                  )}
                  {columns.includes("sales_owner") && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sales Owner</th>
                  )}
                  {columns.includes("updated_at") && (
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 transition-colors"
                      onClick={() => toggleSort("updated_at")}
                    >
                      <span className="flex items-center">Updated <SortIcon field="updated_at" /></span>
                    </th>
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
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-16 text-gray-400">
                      <MapPin size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No properties found</p>
                      {hasFilters && (
                        <button onClick={() => { setSearch(""); setConditions([]); setPage(1); }} className="text-xs text-blue-600 hover:underline mt-1">
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  properties.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm">
                          {p.name || "Unnamed Property"}
                        </Link>
                        {p.asking_price && !columns.includes("asking_price") && (
                          <div className="text-xs text-green-700 font-medium mt-0.5">
                            {formatCurrency(Number(p.asking_price))} asking
                          </div>
                        )}
                      </td>

                      {columns.includes("location") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{[p.city, p.state].filter(Boolean).join(", ") || "—"}</div>
                          {p.county && <div className="text-xs text-gray-400">{p.county} Co.</div>}
                        </td>
                      )}

                      {columns.includes("asset_class") && (
                        <td className="px-4 py-3">
                          {p.asset_class
                            ? <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.asset_class}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      )}

                      {columns.includes("deal_stage") && (
                        <td className="px-4 py-3">
                          <InlineSelect
                            value={p.deal_stage}
                            field="deal_stage"
                            rowId={p.id}
                            options={[...DEAL_STAGES]}
                            editingCell={editingCell}
                            editValue={editValue}
                            onStartEdit={startEdit}
                            onCommit={(val) => patchProperty(p.id, "deal_stage", val)}
                            onCancel={cancelEdit}
                            renderValue={(v) => <DealStageBadge stage={v} />}
                          />
                        </td>
                      )}

                      {columns.includes("relationship_status") && (
                        <td className="px-4 py-3">
                          <InlineSelect
                            value={p.relationship_status}
                            field="relationship_status"
                            rowId={p.id}
                            options={["", "Cold", "Warm", "Hot", "Not Interested"]}
                            editingCell={editingCell}
                            editValue={editValue}
                            onStartEdit={startEdit}
                            onCommit={(val) => patchProperty(p.id, "relationship_status", val)}
                            onCancel={cancelEdit}
                            renderValue={(v) => <RelStatusBadge status={v} />}
                          />
                        </td>
                      )}

                      {columns.includes("owner") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <InlineText
                            value={p.owner_name}
                            field="owner_name"
                            rowId={p.id}
                            editingCell={editingCell}
                            editValue={editValue}
                            onStartEdit={startEdit}
                            onChangeValue={setEditValue}
                            onCommit={commitTextEdit}
                            onCancel={cancelEdit}
                          />
                          {(editingCell?.id !== p.id || editingCell.field !== "owner_name") && (
                            <div
                              className="text-xs text-gray-400 cursor-text hover:bg-gray-100 rounded px-1.5 py-0.5 transition-colors mt-0.5"
                              onClick={() => startEdit(p.id, "owner_phone", p.owner_phone || "")}
                            >
                              {editingCell?.id === p.id && editingCell.field === "owner_phone" ? (
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitTextEdit}
                                  onKeyDown={(e) => { if (e.key === "Enter") commitTextEdit(); if (e.key === "Escape") cancelEdit(); }}
                                  className="border border-blue-400 rounded px-1.5 py-0.5 text-xs focus:outline-none w-full"
                                />
                              ) : (
                                p.owner_phone || <span className="text-gray-300">phone...</span>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {columns.includes("asking_price") && (
                        <td className="px-4 py-3 text-sm font-medium text-green-700">
                          {p.asking_price ? formatCurrency(Number(p.asking_price)) : <span className="text-gray-300 font-normal">—</span>}
                        </td>
                      )}

                      {columns.includes("communication_status") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <InlineText
                            value={p.communication_status}
                            field="communication_status"
                            rowId={p.id}
                            editingCell={editingCell}
                            editValue={editValue}
                            onStartEdit={startEdit}
                            onChangeValue={setEditValue}
                            onCommit={commitTextEdit}
                            onCancel={cancelEdit}
                          />
                        </td>
                      )}

                      {columns.includes("sales_owner") && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <InlineText
                            value={p.sales_owner}
                            field="sales_owner"
                            rowId={p.id}
                            editingCell={editingCell}
                            editValue={editValue}
                            onStartEdit={startEdit}
                            onChangeValue={setEditValue}
                            onCommit={commitTextEdit}
                            onCancel={cancelEdit}
                          />
                        </td>
                      )}

                      {columns.includes("updated_at") && (
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
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
