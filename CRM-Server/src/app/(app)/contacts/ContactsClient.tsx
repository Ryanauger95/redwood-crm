"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { getLastViewId, setLastViewId } from "@/lib/viewPersistence";
import {
  SavedViewData,
  FilterCondition,
  CONTACT_FILTER_FIELDS,
  CONTACT_COLUMNS,
  DEFAULT_CONTACT_COLUMNS,
} from "@/lib/views";

interface Person {
  person_id: number;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state_code: string | null;
  estimated_age: number | null;
  linkedin_url: string | null;
  succession_signals: string | null;
  businessPeople: {
    business: {
      business_id: number;
      le_name: string | null;
      lf_name: string | null;
      acquisition_fit_score: number | null;
    };
  }[];
  _count: { businessPeople: number; activities: number };
}

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ContactsClient() {
  const { showToast, toastElement } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Views state
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort state
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_CONTACT_COLUMNS);
  const [sortField] = useState("full_name");
  const [sortDir] = useState<"asc" | "desc">("asc");

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  const isDirty = activeView
    ? !conditionsEqual(conditions, (activeView.filters as FilterCondition[]) ?? []) ||
      JSON.stringify(columns) !== JSON.stringify(activeView.columns ?? DEFAULT_CONTACT_COLUMNS)
    : false;

  // Load views on mount — restore last visited view
  useEffect(() => {
    fetch("/api/views?entity=contacts")
      .then((r) => r.json())
      .then((data: SavedViewData[]) => {
        setViews(data);
        const lastId = getLastViewId("contacts");
        const last = lastId ? data.find((v) => v.id === lastId) : null;
        const initial = last ?? data[0];
        if (initial) activateView(initial, false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activateView(view: SavedViewData, resetPage = true) {
    setActiveViewId(view.id);
    setConditions((view.filters as FilterCondition[]) ?? []);
    setColumns((view.columns as string[]) ?? DEFAULT_CONTACT_COLUMNS);
    setLastViewId("contacts", view.id);
    if (resetPage) setPage(1);
  }

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (conditions.length > 0) params.set("filters", JSON.stringify(conditions));
      params.set("page", String(page));
      params.set("sort", sortField);
      params.set("dir", sortDir);
      params.set("limit", "25");
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setPeople(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, conditions, page, sortField, sortDir]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // View CRUD
  const handleSaveCurrent = async (): Promise<void> => {
    if (!activeView || activeView.is_default) return;
    const res = await fetch(`/api/views/${activeView.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: conditions, columns }),
    });
    const updated: SavedViewData = await res.json();
    setViews((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
    activateView(updated, false);
  };

  const handleSaveAsNew = async (name: string) => {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entity: "contacts", filters: conditions, columns }),
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

  const handleDiscard = () => {
    if (activeView) activateView(activeView);
  };

  const handleConditionsChange = (c: FilterCondition[]) => {
    setConditions(c);
    setPage(1);
  };

  const patchContact = useCallback(async (personId: number, field: string, value: string) => {
    const res = await fetch(`/api/contacts/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setPeople((prev) => prev.map((p) => p.person_id === personId ? { ...p, [field]: value || null } : p));
      showToast("Saved");
    }
    setEditingCell(null);
  }, [showToast]);

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

      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} business owners`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-72">
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search size={14} />}
            />
          </div>
          <FilterBuilder
            fields={CONTACT_FILTER_FIELDS}
            conditions={conditions}
            onChange={handleConditionsChange}
          />
          <ColumnPicker
            columnDefs={CONTACT_COLUMNS}
            selected={columns}
            onChange={setColumns}
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f8fafc]">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  {columns.includes("location") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                  )}
                  {columns.includes("businesses") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Businesses</th>
                  )}
                  {columns.includes("top_fit_score") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Fit Score</th>
                  )}
                  {columns.includes("activities") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Activities</th>
                  )}
                  {columns.includes("estimated_age") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Age</th>
                  )}
                  {columns.includes("succession_signals") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Succession Signals</th>
                  )}
                  {columns.includes("linkedin_url") && (
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">LinkedIn</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: columns.length + 1 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + ((i * 11 + j * 9) % 55)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : people.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-16 text-gray-400">
                      <User size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No contacts found</p>
                    </td>
                  </tr>
                ) : (
                  people.map((p) => {
                    const topScore = p.businessPeople.reduce(
                      (max, bp) => Math.max(max, bp.business.acquisition_fit_score ?? 0),
                      0
                    );
                    const name = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
                    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const avatarColors = ["from-blue-400 to-indigo-500", "from-violet-400 to-purple-500", "from-emerald-400 to-teal-500", "from-amber-400 to-orange-500", "from-rose-400 to-pink-500"];
                    const colorIdx = name.charCodeAt(0) % avatarColors.length;
                    return (
                      <tr key={p.person_id} className="hover:bg-blue-50 transition-colors group">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/contacts/${p.person_id}`}
                            className="flex items-center gap-2.5 group/link"
                          >
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <span className="text-[10px] font-bold text-white">{initials}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-gray-900 group-hover/link:text-blue-600 transition-colors">{name}</span>
                          </Link>
                        </td>
                        {columns.includes("location") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">
                            {editingCell?.id === p.person_id && editingCell.field === "city" ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => patchContact(p.person_id, "city", editValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") patchContact(p.person_id, "city", editValue);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none w-28"
                              />
                            ) : (
                              <span
                                className="cursor-text hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                                onClick={() => { setEditingCell({ id: p.person_id, field: "city" }); setEditValue(p.city || ""); }}
                              >
                                {p.city ? `${p.city}, ${p.state_code || "SC"}` : <span className="text-gray-300">—</span>}
                              </span>
                            )}
                          </td>
                        )}
                        {columns.includes("businesses") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">
                            <span className="font-medium text-gray-900">{p._count.businessPeople}</span>
                            {p.businessPeople.length > 0 && (
                              <p className="text-xs text-gray-400 truncate max-w-40">
                                {p.businessPeople[0]?.business.le_name || p.businessPeople[0]?.business.lf_name}
                              </p>
                            )}
                          </td>
                        )}
                        {columns.includes("top_fit_score") && (
                          <td className="px-4 py-2.5">
                            <FitScoreBadge score={topScore || null} size="sm" />
                          </td>
                        )}
                        {columns.includes("activities") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p._count.activities}</td>
                        )}
                        {columns.includes("estimated_age") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">
                            {p.estimated_age ?? <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        {columns.includes("succession_signals") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600 max-w-xs">
                            {p.succession_signals
                              ? <span className="truncate block text-xs">{p.succession_signals}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        {columns.includes("linkedin_url") && (
                          <td className="px-4 py-2.5 text-[13px]">
                            {p.linkedin_url
                              ? <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">LinkedIn</a>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-[#f8fafc]">
              <p className="text-[13px] text-gray-400">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
