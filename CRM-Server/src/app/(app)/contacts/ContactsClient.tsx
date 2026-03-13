"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, User, Plus } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { InlineFieldEditor } from "@/components/shared/InlineFieldEditor";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { AddEntityModal } from "@/components/shared/AddEntityModal";
import { TABLE } from "@/components/shared/TablePrimitives";
import { useRowSelection } from "@/hooks/useRowSelection";
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
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company_name: string | null;
  contact_type: string | null;
  contact_status: string | null;
  lead_score: number | null;
  lifecycle_stage: string | null;
  asset_class: string | null;
  market_focus: string | null;
  relationship_status: string | null;
  source: string | null;
  address: string | null;
  zip_code: string | null;
  owner_background: string | null;
  other_businesses: string | null;
  in_active_foreclosure: boolean | null;
  associated_case_number: string | null;
  skiptrace_url: string | null;
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
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Users for bulk assign dropdown
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

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

  // Row selection
  const visibleIds = people.map((p) => p.person_id);
  const selection = useRowSelection(visibleIds, total, pages);

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

  // Load users for bulk assign
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => setUsers(data))
      .catch(() => {});
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
  }, [showToast]);

  // Bulk action handlers
  const handleBulkAssign = async (userId: number) => {
    // Contacts don't have assignment - just clear selection
    selection.clearSelection();
  };

  const handleBulkFieldChange = async (field: string, value: string) => {
    await fetch("/api/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "contacts", ids: Array.from(selection.selectedIds), field, value }),
    });
    selection.clearSelection();
    fetchPeople();
    showToast("Updated");
  };

  // Create contact handler
  const handleCreateContact = async (data: Record<string, string>) => {
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to create contact");
    fetchPeople();
    showToast("Contact created");
  };

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

      {/* Bulk action bar */}
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
            { key: "city", label: "City" },
          ]}
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
          <div className="ml-auto">
            <Button onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus size={15} />
              Add Contact
            </Button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={TABLE.thead}>
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selection.allOnPageSelected && visibleIds.length > 0}
                      ref={(el) => {
                        if (el) el.indeterminate = selection.someOnPageSelected && !selection.allOnPageSelected;
                      }}
                      onChange={selection.toggleAll}
                      className={TABLE.checkbox}
                    />
                  </th>
                  <th className={TABLE.th}>Name</th>
                  {columns.includes("location") && (
                    <th className={TABLE.th}>Location</th>
                  )}
                  {columns.includes("businesses") && (
                    <th className={TABLE.th}>Businesses</th>
                  )}
                  {columns.includes("top_fit_score") && (
                    <th className={TABLE.th}>Fit Score</th>
                  )}
                  {columns.includes("activities") && (
                    <th className={TABLE.th}>Activities</th>
                  )}
                  {columns.includes("estimated_age") && (
                    <th className={TABLE.th}>Age</th>
                  )}
                  {columns.includes("succession_signals") && (
                    <th className={TABLE.th}>Succession Signals</th>
                  )}
                  {columns.includes("linkedin_url") && (
                    <th className={TABLE.th}>LinkedIn</th>
                  )}
                  {columns.includes("email") && (
                    <th className={TABLE.th}>Email</th>
                  )}
                  {columns.includes("phone") && (
                    <th className={TABLE.th}>Phone</th>
                  )}
                  {columns.includes("job_title") && (
                    <th className={TABLE.th}>Job Title</th>
                  )}
                  {columns.includes("company_name") && (
                    <th className={TABLE.th}>Company</th>
                  )}
                  {columns.includes("contact_type") && (
                    <th className={TABLE.th}>Contact Type</th>
                  )}
                  {columns.includes("contact_status") && (
                    <th className={TABLE.th}>Status</th>
                  )}
                  {columns.includes("lead_score") && (
                    <th className={TABLE.th}>Lead Score</th>
                  )}
                  {columns.includes("lifecycle_stage") && (
                    <th className={TABLE.th}>Lifecycle Stage</th>
                  )}
                  {columns.includes("asset_class") && (
                    <th className={TABLE.th}>Asset Class</th>
                  )}
                  {columns.includes("market_focus") && (
                    <th className={TABLE.th}>Market Focus</th>
                  )}
                  {columns.includes("relationship_status") && (
                    <th className={TABLE.th}>Relationship</th>
                  )}
                  {columns.includes("source") && (
                    <th className={TABLE.th}>Source</th>
                  )}
                  {columns.includes("address") && (
                    <th className={TABLE.th}>Address</th>
                  )}
                  {columns.includes("zip_code") && (
                    <th className={TABLE.th}>Zip Code</th>
                  )}
                  {columns.includes("owner_background") && (
                    <th className={TABLE.th}>Owner Background</th>
                  )}
                  {columns.includes("other_businesses") && (
                    <th className={TABLE.th}>Other Businesses</th>
                  )}
                  {columns.includes("in_active_foreclosure") && (
                    <th className={TABLE.th}>Active Foreclosure</th>
                  )}
                  {columns.includes("associated_case_number") && (
                    <th className={TABLE.th}>Case Number</th>
                  )}
                  {columns.includes("skiptrace_url") && (
                    <th className={TABLE.th}>Skiptrace</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: columns.length + 2 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + ((i * 11 + j * 9) % 55)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : people.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="text-center py-16 text-gray-400">
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
                      <tr key={p.person_id} className={`${TABLE.row} group`}>
                        <td className="w-10 px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selection.isSelected(p.person_id)}
                            onChange={() => selection.toggleOne(p.person_id)}
                            className={TABLE.checkbox}
                          />
                        </td>
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
                            <InlineFieldEditor
                              value={p.city}
                              onSave={(val) => patchContact(p.person_id, "city", val)}
                              renderDisplay={(v) => (
                                <span className="text-[13px] text-gray-600">
                                  {v ? `${v}, ${p.state_code || "SC"}` : <span className="text-gray-300">—</span>}
                                </span>
                              )}
                            />
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
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">
                            {topScore || <span className="text-gray-300">—</span>}
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
                        {columns.includes("email") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.email || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("phone") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.phone || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("job_title") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.job_title || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("company_name") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.company_name || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("contact_type") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.contact_type || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("contact_status") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.contact_status || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("lead_score") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.lead_score ?? <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("lifecycle_stage") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.lifecycle_stage || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("asset_class") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.asset_class || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("market_focus") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.market_focus || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("relationship_status") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.relationship_status || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("source") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.source || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("address") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.address || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("zip_code") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.zip_code || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("owner_background") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600 max-w-xs">
                            <span className="truncate block">{p.owner_background || <span className="text-gray-300">—</span>}</span>
                          </td>
                        )}
                        {columns.includes("other_businesses") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600 max-w-xs">
                            <span className="truncate block">{p.other_businesses || <span className="text-gray-300">—</span>}</span>
                          </td>
                        )}
                        {columns.includes("in_active_foreclosure") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.in_active_foreclosure ? "Yes" : "No"}</td>
                        )}
                        {columns.includes("associated_case_number") && (
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{p.associated_case_number || <span className="text-gray-300">—</span>}</td>
                        )}
                        {columns.includes("skiptrace_url") && (
                          <td className="px-4 py-2.5 text-[13px]">
                            {p.skiptrace_url ? <a href={p.skiptrace_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Link</a> : <span className="text-gray-300">—</span>}
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
            <div className={TABLE.pagination}>
              <p className={TABLE.paginationText}>Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add Contact Modal */}
      <AddEntityModal
        title="Add Contact"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        fields={[
          { key: "first_name", label: "First Name", required: true },
          { key: "last_name", label: "Last Name", required: true },
          { key: "city", label: "City" },
          { key: "state_code", label: "State", placeholder: "SC" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
        ]}
        onSubmit={handleCreateContact}
      />
    </div>
  );
}
