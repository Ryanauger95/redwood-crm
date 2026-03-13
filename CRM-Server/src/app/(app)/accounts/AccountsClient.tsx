"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { TABLE, HeaderCheckbox, RowCheckbox, TextCell, BoolCell, CurrencyCell, TruncCell, LinkCell, ColHeader, ColCell, PaginationBar, SortIcon } from "@/components/shared/TablePrimitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/StageBadge";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { InlineFieldEditor } from "@/components/shared/InlineFieldEditor";
import { AddEntityModal } from "@/components/shared/AddEntityModal";
import { PIPELINE_STAGES } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";
import { useRowSelection } from "@/hooks/useRowSelection";
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
  email: string | null;
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
  state_code: string | null;
  address: string | null;
  zip_code: string | null;
  website: string | null;
  primary_payor_mix: string | null;
  business_summary: string | null;
  service_area: string | null;
  accreditation: string | null;
  estimated_locations: number | null;
  services_nursing: boolean | null;
  services_pt: boolean | null;
  services_ot: boolean | null;
  services_speech: boolean | null;
  services_aide: boolean | null;
  license_number: string | null;
  ccn: string | null;
  cms_ownership_type: string | null;
  acquisition_signals: string | null;
  growth_signals: string | null;
  red_flags: string | null;
  recent_news: string | null;
  assigned_user: string | null;
}

function EnrichmentBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />Enriched
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />Pending
    </span>
  );
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

  // Users for bulk assign
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  // Add entity modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Views state
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort state
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_BUSINESS_COLUMNS);
  const [sortField, setSortField] = useState("acquisition_fit_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Row selection
  const visibleIds = businesses.map(b => b.business_id);
  const selection = useRowSelection(visibleIds, total, pages);

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

  const SI = ({ field }: { field: string }) => (
    <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
  );

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

  const patchCity = useCallback(async (businessId: number, city: string) => {
    const res = await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    if (res.ok) {
      setBusinesses((prev) => prev.map((b) => b.business_id === businessId ? { ...b, city } : b));
      showToast("Saved");
    }
  }, [showToast]);

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
  }, [showToast]);

  const handleColumnsChange = (c: string[]) => {
    setColumns(c);
  };

  // Bulk action handlers
  const handleBulkAssign = async (userId: number) => {
    await fetch("/api/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "businesses",
        ids: selection.allPagesSelected ? null : Array.from(selection.selectedIds),
        field: "assigned_user_id",
        value: String(userId),
      }),
    });
    selection.clearSelection();
    fetchBusinesses();
    showToast("Assigned");
  };

  const handleBulkFieldChange = async (field: string, value: string) => {
    await fetch("/api/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "businesses",
        ids: selection.allPagesSelected ? null : Array.from(selection.selectedIds),
        field,
        value,
      }),
    });
    selection.clearSelection();
    fetchBusinesses();
    showToast("Updated");
  };

  // Create business handler
  const handleCreateBusiness = async (data: Record<string, string>) => {
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create business");
    fetchBusinesses();
    showToast("Business created");
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
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Businesses</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
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

          <div className="ml-auto">
            <Button onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus size={15} />
              Add Business
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
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
              { key: "stage", label: "Stage", options: [...PIPELINE_STAGES] },
              { key: "city", label: "City" },
            ]}
          />
        )}

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={TABLE.thead}>
                  <HeaderCheckbox
                    allChecked={selection.allOnPageSelected}
                    indeterminate={selection.someOnPageSelected && !selection.allOnPageSelected}
                    onChange={selection.toggleAll}
                  />
                  {/* Name is always on */}
                  <th className={TABLE.thSort} onClick={() => toggleSort("le_name")}>
                    <span className="flex items-center">Name <SI field="le_name" /></span>
                  </th>
                  <ColHeader col="location" columns={columns} label="Location" />
                  <ColHeader col="license_type" columns={columns} label="Type" />
                  <ColHeader col="acquisition_fit_score" columns={columns} label="Score" sortable onSort={() => toggleSort("acquisition_fit_score")} sortField={sortField} sortDir={sortDir} />
                  <ColHeader col="estimated_annual_profit" columns={columns} label="Est. Profit" sortable onSort={() => toggleSort("estimated_annual_profit")} sortField={sortField} sortDir={sortDir} />
                  <ColHeader col="estimated_annual_revenue" columns={columns} label="Revenue" />
                  <ColHeader col="profit_margin_pct" columns={columns} label="Margin" />
                  <ColHeader col="estimated_employees" columns={columns} label="Employees" />
                  <ColHeader col="founded_year" columns={columns} label="Founded" />
                  <ColHeader col="cms_star_rating" columns={columns} label="Stars" />
                  <ColHeader col="medicare_certified" columns={columns} label="Medicare" />
                  <ColHeader col="pe_backed" columns={columns} label="PE" />
                  <ColHeader col="county" columns={columns} label="County" />
                  <ColHeader col="stage" columns={columns} label="Stage" />
                  <ColHeader col="enrichment_status" columns={columns} label="Status" />
                  <ColHeader col="state_code" columns={columns} label="State" />
                  <ColHeader col="address" columns={columns} label="Address" />
                  <ColHeader col="zip_code" columns={columns} label="Zip Code" />
                  <ColHeader col="phone" columns={columns} label="Phone" />
                  <ColHeader col="email" columns={columns} label="Email" />
                  <ColHeader col="website" columns={columns} label="Website" />
                  <ColHeader col="primary_payor_mix" columns={columns} label="Payor Mix" />
                  <ColHeader col="business_summary" columns={columns} label="Summary" />
                  <ColHeader col="service_area" columns={columns} label="Service Area" />
                  <ColHeader col="accreditation" columns={columns} label="Accreditation" />
                  <ColHeader col="estimated_locations" columns={columns} label="Locations" />
                  <ColHeader col="services_nursing" columns={columns} label="Nursing" />
                  <ColHeader col="services_pt" columns={columns} label="PT" />
                  <ColHeader col="services_ot" columns={columns} label="OT" />
                  <ColHeader col="services_speech" columns={columns} label="Speech" />
                  <ColHeader col="services_aide" columns={columns} label="Aide" />
                  <ColHeader col="license_number" columns={columns} label="License #" />
                  <ColHeader col="ccn" columns={columns} label="CCN" />
                  <ColHeader col="cms_ownership_type" columns={columns} label="Ownership" />
                  <ColHeader col="acquisition_signals" columns={columns} label="Acq. Signals" />
                  <ColHeader col="growth_signals" columns={columns} label="Growth Signals" />
                  <ColHeader col="red_flags" columns={columns} label="Red Flags" />
                  <ColHeader col="recent_news" columns={columns} label="Recent News" />
                  <ColHeader col="assigned_user" columns={columns} label="Assigned To" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {/* +1 for checkbox column, +1 for name column */}
                      {Array.from({ length: columns.length + 2 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + ((i * 13 + j * 7) % 50)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="text-center py-16 text-gray-400">
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
                    <tr key={b.business_id} className={TABLE.row}>
                      <RowCheckbox
                        checked={selection.isSelected(b.business_id)}
                        onChange={() => selection.toggleOne(b.business_id)}
                      />
                      {/* Name — always on */}
                      <td className={TABLE.cell}>
                        <Link href={`/accounts/${b.business_id}`} className="text-[13px] font-semibold text-gray-900 hover:text-gray-600 transition-colors">
                          {b.le_name || b.lf_name || "Unknown"}
                        </Link>
                      </td>
                      {columns.includes("location") && (
                        <td className={TABLE.cellText}>
                          <InlineFieldEditor
                            value={b.city}
                            label="City"
                            onSave={(val) => patchCity(b.business_id, val)}
                            renderDisplay={(v) => v ? <span>{v}</span> : <span className="text-gray-300">---</span>}
                          />
                        </td>
                      )}
                      {columns.includes("license_type") && (
                        <td className={TABLE.cell}>
                          {b.license_type ? (
                            <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{b.license_type}</span>
                          ) : <span className="text-gray-300">---</span>}
                        </td>
                      )}
                      {columns.includes("acquisition_fit_score") && (
                        <TextCell value={b.acquisition_fit_score} />
                      )}
                      {columns.includes("estimated_annual_profit") && (
                        <CurrencyCell value={b.estimated_annual_profit} />
                      )}
                      {columns.includes("estimated_annual_revenue") && (
                        <CurrencyCell value={b.estimated_annual_revenue} />
                      )}
                      {columns.includes("profit_margin_pct") && (
                        <TextCell value={b.profit_margin_pct ? `${b.profit_margin_pct}%` : null} />
                      )}
                      {columns.includes("estimated_employees") && (
                        <TextCell value={b.estimated_employees} />
                      )}
                      {columns.includes("founded_year") && (
                        <TextCell value={b.founded_year} />
                      )}
                      {columns.includes("cms_star_rating") && (
                        <TextCell value={b.cms_star_rating} />
                      )}
                      {columns.includes("medicare_certified") && (
                        <BoolCell value={b.medicare_certified} />
                      )}
                      {columns.includes("pe_backed") && (
                        <td className={TABLE.cellText}>
                          {b.pe_backed === null ? <span className="text-gray-300">---</span> : b.pe_backed ? "PE" : "Indep."}
                        </td>
                      )}
                      {columns.includes("county") && (
                        <TextCell value={b.county} />
                      )}
                      {columns.includes("stage") && (
                        <td className={TABLE.cell}>
                          <InlineFieldEditor
                            value={b.stage}
                            label="Stage"
                            options={[...PIPELINE_STAGES]}
                            onSave={(val) => patchStage(b.business_id, val)}
                            renderDisplay={(v) => v ? <StageBadge stage={v} /> : <span className="text-xs text-gray-300">Set stage</span>}
                          />
                        </td>
                      )}
                      {columns.includes("enrichment_status") && (
                        <td className={TABLE.cell}>
                          <EnrichmentBadge status={b.enrichment_status} />
                        </td>
                      )}
                      {columns.includes("state_code") && (
                        <TextCell value={b.state_code} />
                      )}
                      {columns.includes("address") && (
                        <TextCell value={b.address} />
                      )}
                      {columns.includes("zip_code") && (
                        <TextCell value={b.zip_code} />
                      )}
                      {columns.includes("phone") && (
                        <TextCell value={b.phone} />
                      )}
                      {columns.includes("email") && (
                        <TextCell value={b.email} />
                      )}
                      {columns.includes("website") && (
                        <LinkCell value={b.website} />
                      )}
                      {columns.includes("primary_payor_mix") && (
                        <TextCell value={b.primary_payor_mix} />
                      )}
                      {columns.includes("business_summary") && (
                        <TruncCell value={b.business_summary} />
                      )}
                      {columns.includes("service_area") && (
                        <TextCell value={b.service_area} />
                      )}
                      {columns.includes("accreditation") && (
                        <TextCell value={b.accreditation} />
                      )}
                      {columns.includes("estimated_locations") && (
                        <TextCell value={b.estimated_locations} />
                      )}
                      {columns.includes("services_nursing") && (
                        <BoolCell value={b.services_nursing} />
                      )}
                      {columns.includes("services_pt") && (
                        <BoolCell value={b.services_pt} />
                      )}
                      {columns.includes("services_ot") && (
                        <BoolCell value={b.services_ot} />
                      )}
                      {columns.includes("services_speech") && (
                        <BoolCell value={b.services_speech} />
                      )}
                      {columns.includes("services_aide") && (
                        <BoolCell value={b.services_aide} />
                      )}
                      {columns.includes("license_number") && (
                        <TextCell value={b.license_number} />
                      )}
                      {columns.includes("ccn") && (
                        <TextCell value={b.ccn} />
                      )}
                      {columns.includes("cms_ownership_type") && (
                        <TextCell value={b.cms_ownership_type} />
                      )}
                      {columns.includes("acquisition_signals") && (
                        <TruncCell value={b.acquisition_signals} />
                      )}
                      {columns.includes("growth_signals") && (
                        <TruncCell value={b.growth_signals} />
                      )}
                      {columns.includes("red_flags") && (
                        <TruncCell value={b.red_flags} />
                      )}
                      {columns.includes("recent_news") && (
                        <TruncCell value={b.recent_news} />
                      )}
                      {columns.includes("assigned_user") && (
                        <TextCell value={b.assigned_user} />
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            onPrev={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
            Button={Button}
          />
        </Card>
      </div>

      {/* Add Business Modal */}
      <AddEntityModal
        title="Add Business"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        fields={[
          { key: "name", label: "Business Name", required: true, placeholder: "Enter business name" },
          { key: "city", label: "City", placeholder: "City" },
          { key: "state_code", label: "State", placeholder: "SC" },
          { key: "license_type", label: "License Type", type: "select", options: ["HHA", "IHCP"] },
          { key: "phone", label: "Phone", placeholder: "(555) 555-5555" },
          { key: "email", label: "Email", placeholder: "email@example.com" },
        ]}
        onSubmit={handleCreateBusiness}
      />
    </div>
  );
}
