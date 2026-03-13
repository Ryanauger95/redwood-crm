"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { ColumnPicker } from "@/components/shared/ColumnPicker";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { useToast } from "@/components/shared/Toast";
import { formatCurrency } from "@/lib/utils";
import { getLastViewId, setLastViewId } from "@/lib/viewPersistence";
import { useRowSelection } from "@/hooks/useRowSelection";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { InlineFieldEditor } from "@/components/shared/InlineFieldEditor";
import { AddEntityModal } from "@/components/shared/AddEntityModal";
import { PROPERTY_ASSET_CLASS_OPTIONS } from "@/lib/fieldOptions";
import { TABLE, HeaderCheckbox, RowCheckbox, TextCell, BoolCell, CurrencyCell, DateCell, TruncCell, LinkCell, SortIcon as SharedSortIcon } from "@/components/shared/TablePrimitives";
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
  address: string | null;
  zipcode: string | null;
  deal_type: string | null;
  motivation_level: string | null;
  sale_timeline: string | null;
  ownership_type: string | null;
  letter_status: string | null;
  phone: string | null;
  website: string | null;
  data_status: string | null;
  offer_made: string | null;
  last_contact_date: string | null;
  next_contact_date: string | null;
  last_sale_amount: string | null;
  last_sale_date: string | null;
  last_sale_year: number | null;
  tax_assessed_value: string | null;
  mortgage_amount: string | null;
  listing_url: string | null;
  asking_price_per_sqft: string | null;
  property_size_estimate: string | null;
  broker_names: string | null;
  broker_phone: string | null;
  broker_company: string | null;
  industry_type: string | null;
  business_type: string | null;
  in_foreclosure: boolean | null;
  foreclosure_status: string | null;
  created_at: string | null;
}

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]) {
  return JSON.stringify(a) === JSON.stringify(b);
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

  // Views
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Filter / column / sort
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_PROPERTY_COLUMNS);
  const [sortField, setSortField] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Users for bulk assign
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  // Row selection
  const visibleIds = properties.map((p) => p.id);
  const selection = useRowSelection(visibleIds, total, pages);

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

  const SortIcon = ({ field }: { field: string }) => (
    <SharedSortIcon field={field} sortField={sortField} sortDir={sortDir} />
  );

  // Inline patch
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
  }, [showToast]);

  // Bulk handlers
  const handleBulkAssign = async (userId: number) => {
    await fetch("/api/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "properties", ids: Array.from(selection.selectedIds), field: "assigned_user_id", value: String(userId) }),
    });
    selection.clearSelection();
    fetchProperties();
    showToast("Assigned");
  };

  const handleBulkFieldChange = async (field: string, value: string) => {
    await fetch("/api/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "properties", ids: Array.from(selection.selectedIds), field, value }),
    });
    selection.clearSelection();
    fetchProperties();
    showToast("Updated");
  };

  // Create handler
  const handleCreateProperty = async (data: Record<string, string>) => {
    const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to create property");
    fetchProperties();
    showToast("Property created");
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
            { key: "deal_stage", label: "Deal Stage", options: [...DEAL_STAGES] },
            { key: "relationship_status", label: "Relationship Status", options: ["Cold", "Warm", "Hot", "Not Interested"] },
            { key: "sales_owner", label: "Sales Owner" },
          ]}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 ml-auto"
          >
            <Plus size={14} />
            Add Property
          </Button>
        </div>

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
                  <th
                    className={TABLE.thSort}
                    onClick={() => toggleSort("name")}
                  >
                    <span className="flex items-center">Name <SortIcon field="name" /></span>
                  </th>
                  {columns.includes("location") && (
                    <th className={TABLE.th}>Location</th>
                  )}
                  {columns.includes("address") && (
                    <th className={TABLE.th}>Address</th>
                  )}
                  {columns.includes("zipcode") && (
                    <th className={TABLE.th}>Zipcode</th>
                  )}
                  {columns.includes("territory") && (
                    <th className={TABLE.th}>Territory</th>
                  )}
                  {columns.includes("asset_class") && (
                    <th className={TABLE.th}>Asset Class</th>
                  )}
                  {columns.includes("deal_stage") && (
                    <th className={TABLE.th}>Deal Stage</th>
                  )}
                  {columns.includes("deal_type") && (
                    <th className={TABLE.th}>Deal Type</th>
                  )}
                  {columns.includes("relationship_status") && (
                    <th className={TABLE.th}>Relationship</th>
                  )}
                  {columns.includes("motivation_level") && (
                    <th className={TABLE.th}>Motivation</th>
                  )}
                  {columns.includes("sale_timeline") && (
                    <th className={TABLE.th}>Sale Timeline</th>
                  )}
                  {columns.includes("ownership_type") && (
                    <th className={TABLE.th}>Ownership Type</th>
                  )}
                  {columns.includes("owner") && (
                    <th className={TABLE.th}>Owner</th>
                  )}
                  {columns.includes("owner_phone") && (
                    <th className={TABLE.th}>Owner Phone</th>
                  )}
                  {columns.includes("asking_price") && (
                    <th className={TABLE.th}>Asking Price</th>
                  )}
                  {columns.includes("asking_price_per_sqft") && (
                    <th className={TABLE.th}>Price/SqFt</th>
                  )}
                  {columns.includes("communication_status") && (
                    <th className={TABLE.th}>Comm. Status</th>
                  )}
                  {columns.includes("letter_status") && (
                    <th className={TABLE.th}>Letter Status</th>
                  )}
                  {columns.includes("sales_owner") && (
                    <th className={TABLE.th}>Sales Owner</th>
                  )}
                  {columns.includes("phone") && (
                    <th className={TABLE.th}>Phone</th>
                  )}
                  {columns.includes("website") && (
                    <th className={TABLE.th}>Website</th>
                  )}
                  {columns.includes("annual_revenue") && (
                    <th className={TABLE.th}>Annual Revenue</th>
                  )}
                  {columns.includes("num_employees") && (
                    <th className={TABLE.th}>Employees</th>
                  )}
                  {columns.includes("data_status") && (
                    <th className={TABLE.th}>Data Status</th>
                  )}
                  {columns.includes("offer_made") && (
                    <th className={TABLE.th}>Offer Made</th>
                  )}
                  {columns.includes("last_contact_date") && (
                    <th className={TABLE.th}>Last Contact</th>
                  )}
                  {columns.includes("next_contact_date") && (
                    <th className={TABLE.th}>Next Contact</th>
                  )}
                  {columns.includes("last_sale_amount") && (
                    <th className={TABLE.th}>Last Sale Amt</th>
                  )}
                  {columns.includes("last_sale_date") && (
                    <th className={TABLE.th}>Last Sale Date</th>
                  )}
                  {columns.includes("last_sale_year") && (
                    <th className={TABLE.th}>Last Sale Year</th>
                  )}
                  {columns.includes("tax_assessed_value") && (
                    <th className={TABLE.th}>Tax Assessed</th>
                  )}
                  {columns.includes("mortgage_amount") && (
                    <th className={TABLE.th}>Mortgage</th>
                  )}
                  {columns.includes("listing_url") && (
                    <th className={TABLE.th}>Listing URL</th>
                  )}
                  {columns.includes("property_size_estimate") && (
                    <th className={TABLE.th}>Size Estimate</th>
                  )}
                  {columns.includes("broker_names") && (
                    <th className={TABLE.th}>Broker Names</th>
                  )}
                  {columns.includes("broker_phone") && (
                    <th className={TABLE.th}>Broker Phone</th>
                  )}
                  {columns.includes("broker_company") && (
                    <th className={TABLE.th}>Broker Company</th>
                  )}
                  {columns.includes("industry_type") && (
                    <th className={TABLE.th}>Industry Type</th>
                  )}
                  {columns.includes("business_type") && (
                    <th className={TABLE.th}>Business Type</th>
                  )}
                  {columns.includes("in_foreclosure") && (
                    <th className={TABLE.th}>In Foreclosure</th>
                  )}
                  {columns.includes("foreclosure_status") && (
                    <th className={TABLE.th}>Foreclosure Status</th>
                  )}
                  {columns.includes("updated_at") && (
                    <th
                      className={TABLE.thSort}
                      onClick={() => toggleSort("updated_at")}
                    >
                      <span className="flex items-center">Updated <SortIcon field="updated_at" /></span>
                    </th>
                  )}
                  {columns.includes("created_at") && (
                    <th
                      className={TABLE.thSort}
                      onClick={() => toggleSort("created_at")}
                    >
                      <span className="flex items-center">Created <SortIcon field="created_at" /></span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: columns.length + 2 }).map((_, j) => (
                        <td key={j} className={TABLE.cell}>
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + ((i * 13 + j * 7) % 50)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="text-center py-16 text-gray-400">
                      <MapPin size={24} className={TABLE.emptyIcon} />
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
                    <tr key={p.id} className={TABLE.row}>
                      <RowCheckbox
                        checked={selection.isSelected(p.id)}
                        onChange={() => selection.toggleOne(p.id)}
                      />
                      <td className={TABLE.cell}>
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
                        <td className={TABLE.cellText}>
                          <div>{[p.city, p.state].filter(Boolean).join(", ") || "\u2014"}</div>
                          {p.county && <div className="text-xs text-gray-400">{p.county} Co.</div>}
                        </td>
                      )}

                      {columns.includes("address") && (
                        <TextCell value={p.address} />
                      )}

                      {columns.includes("zipcode") && (
                        <TextCell value={p.zipcode} />
                      )}

                      {columns.includes("territory") && (
                        <TextCell value={p.territory} />
                      )}

                      {columns.includes("asset_class") && (
                        <td className={TABLE.cell}>
                          {p.asset_class
                            ? <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.asset_class}</span>
                            : <span className="text-gray-300 text-xs">&mdash;</span>}
                        </td>
                      )}

                      {columns.includes("deal_stage") && (
                        <td className={TABLE.cell}>
                          <InlineFieldEditor
                            value={p.deal_stage}
                            options={[...DEAL_STAGES]}
                            onSave={(val) => patchProperty(p.id, "deal_stage", val)}
                            renderDisplay={(v) => <DealStageBadge stage={v} />}
                          />
                        </td>
                      )}

                      {columns.includes("deal_type") && (
                        <TextCell value={p.deal_type} />
                      )}

                      {columns.includes("relationship_status") && (
                        <td className={TABLE.cell}>
                          <InlineFieldEditor
                            value={p.relationship_status}
                            options={["", "Cold", "Warm", "Hot", "Not Interested"]}
                            onSave={(val) => patchProperty(p.id, "relationship_status", val)}
                            renderDisplay={(v) => <RelStatusBadge status={v} />}
                          />
                        </td>
                      )}

                      {columns.includes("motivation_level") && (
                        <TextCell value={p.motivation_level} />
                      )}

                      {columns.includes("sale_timeline") && (
                        <TextCell value={p.sale_timeline} />
                      )}

                      {columns.includes("ownership_type") && (
                        <TextCell value={p.ownership_type} />
                      )}

                      {columns.includes("owner") && (
                        <td className={TABLE.cellText}>
                          <InlineFieldEditor
                            value={p.owner_name}
                            onSave={(val) => patchProperty(p.id, "owner_name", val)}
                            placeholder="\u2014"
                          />
                          <div className="mt-0.5">
                            <InlineFieldEditor
                              value={p.owner_phone}
                              onSave={(val) => patchProperty(p.id, "owner_phone", val)}
                              placeholder="phone..."
                            />
                          </div>
                        </td>
                      )}

                      {columns.includes("owner_phone") && (
                        <TextCell value={p.owner_phone} />
                      )}

                      {columns.includes("asking_price") && (
                        <CurrencyCell value={p.asking_price} />
                      )}

                      {columns.includes("asking_price_per_sqft") && (
                        <CurrencyCell value={p.asking_price_per_sqft} />
                      )}

                      {columns.includes("communication_status") && (
                        <td className={TABLE.cellText}>
                          <InlineFieldEditor
                            value={p.communication_status}
                            onSave={(val) => patchProperty(p.id, "communication_status", val)}
                            placeholder="\u2014"
                          />
                        </td>
                      )}

                      {columns.includes("letter_status") && (
                        <TextCell value={p.letter_status} />
                      )}

                      {columns.includes("sales_owner") && (
                        <td className={TABLE.cellText}>
                          <InlineFieldEditor
                            value={p.sales_owner}
                            onSave={(val) => patchProperty(p.id, "sales_owner", val)}
                            placeholder="\u2014"
                          />
                        </td>
                      )}

                      {columns.includes("phone") && (
                        <TextCell value={p.phone} />
                      )}

                      {columns.includes("website") && (
                        <LinkCell value={p.website} label="Visit" />
                      )}

                      {columns.includes("annual_revenue") && (
                        <CurrencyCell value={p.annual_revenue} />
                      )}

                      {columns.includes("num_employees") && (
                        <TextCell value={p.num_employees} />
                      )}

                      {columns.includes("data_status") && (
                        <TextCell value={p.data_status} />
                      )}

                      {columns.includes("offer_made") && (
                        <TextCell value={p.offer_made} />
                      )}

                      {columns.includes("last_contact_date") && (
                        <DateCell value={p.last_contact_date} />
                      )}

                      {columns.includes("next_contact_date") && (
                        <DateCell value={p.next_contact_date} />
                      )}

                      {columns.includes("last_sale_amount") && (
                        <CurrencyCell value={p.last_sale_amount} />
                      )}

                      {columns.includes("last_sale_date") && (
                        <DateCell value={p.last_sale_date} />
                      )}

                      {columns.includes("last_sale_year") && (
                        <TextCell value={p.last_sale_year} />
                      )}

                      {columns.includes("tax_assessed_value") && (
                        <CurrencyCell value={p.tax_assessed_value} />
                      )}

                      {columns.includes("mortgage_amount") && (
                        <CurrencyCell value={p.mortgage_amount} />
                      )}

                      {columns.includes("listing_url") && (
                        <LinkCell value={p.listing_url} label="Listing" />
                      )}

                      {columns.includes("property_size_estimate") && (
                        <TextCell value={p.property_size_estimate} />
                      )}

                      {columns.includes("broker_names") && (
                        <TextCell value={p.broker_names} />
                      )}

                      {columns.includes("broker_phone") && (
                        <TextCell value={p.broker_phone} />
                      )}

                      {columns.includes("broker_company") && (
                        <TextCell value={p.broker_company} />
                      )}

                      {columns.includes("industry_type") && (
                        <TextCell value={p.industry_type} />
                      )}

                      {columns.includes("business_type") && (
                        <TextCell value={p.business_type} />
                      )}

                      {columns.includes("in_foreclosure") && (
                        <BoolCell value={p.in_foreclosure} />
                      )}

                      {columns.includes("foreclosure_status") && (
                        <TextCell value={p.foreclosure_status} />
                      )}

                      {columns.includes("updated_at") && (
                        <DateCell value={p.updated_at} />
                      )}

                      {columns.includes("created_at") && (
                        <DateCell value={p.created_at} />
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

      <AddEntityModal
        title="Add Property"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateProperty}
        fields={[
          { key: "name", label: "Name", required: true, placeholder: "Property name" },
          { key: "city", label: "City", placeholder: "City" },
          { key: "state", label: "State", placeholder: "State" },
          { key: "county", label: "County", placeholder: "County" },
          { key: "asset_class", label: "Asset Class", type: "select", options: [...PROPERTY_ASSET_CLASS_OPTIONS] },
          { key: "deal_stage", label: "Deal Stage", type: "select", options: [...DEAL_STAGES] },
        ]}
      />
    </div>
  );
}
