"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/utils";
import {
  ACTIVE_PROPERTY_DEAL_STAGES,
  DEFAULT_VISIBLE_PROPERTY_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  PIPELINE_PROPERTY_FILTER_FIELDS,
  PIPELINE_BUSINESS_FILTER_FIELDS,
} from "@/lib/pipelineConfig";
import { ViewsBar } from "@/components/shared/ViewsBar";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { FilterCondition, SavedViewData } from "@/lib/views";
import {
  Search, X, ChevronDown, Building2, Landmark, SlidersHorizontal,
  Phone, Mail, MapPin, DollarSign, Check, GripVertical,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyCard {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  deal_stage: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  asking_price: string | null;
  relationship_status: string | null;
  sales_owner: string | null;
  updated_at: string | null;
}

interface BusinessCard {
  business_id: number;
  le_name: string | null;
  lf_name: string | null;
  city: string | null;
  acquisition_fit_score: number | null;
  estimated_annual_profit: string | null;
  phone: string | null;
  email: string | null;
  cms_star_rating: string | null;
  stage: string;
}

type PropertyStageData = {
  cards: PropertyCard[];
  total: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function conditionsEqual(a: FilterCondition[], b: FilterCondition[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((c, i) => c.field === b[i].field && c.operator === b[i].operator && c.value === b[i].value);
}

// ─── Stage Selector Popover ───────────────────────────────────────────────────

function StageSelector({
  visibleStages,
  onChange,
}: {
  visibleStages: string[];
  onChange: (stages: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (stage: string) => {
    onChange(
      visibleStages.includes(stage)
        ? visibleStages.filter((s) => s !== stage)
        : [...visibleStages, stage]
    );
  };

  const allOn = visibleStages.length === ACTIVE_PROPERTY_DEAL_STAGES.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
          open ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <SlidersHorizontal size={13} />
        Stages
        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
          {visibleStages.length}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-72 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Visible columns
            </span>
            <button
              onClick={() =>
                onChange(allOn ? [] : [...ACTIVE_PROPERTY_DEAL_STAGES])
              }
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {allOn ? "Hide all" : "Show all"}
            </button>
          </div>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {ACTIVE_PROPERTY_DEAL_STAGES.map((stage) => {
              const on = visibleStages.includes(stage);
              const colorClass = DEAL_STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-700";
              return (
                <div
                  key={stage}
                  onClick={() => toggle(stage)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 group"
                >
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      on ? "bg-blue-600 border-blue-600" : "border-gray-300 group-hover:border-blue-300"
                    }`}
                  >
                    {on && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                    {DEAL_STAGE_LABELS[stage] ?? stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyKanbanCard({
  card,
  onDragStart,
}: {
  card: PropertyCard;
  onDragStart: (e: React.DragEvent, id: string, fromStage: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, card.deal_stage ?? "")}
      className="bg-white rounded-xl border border-gray-200/80 p-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.05)] cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.08)] hover:border-gray-300 transition-all"
    >
      <Link href={`/properties/${card.id}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-[12px] font-semibold text-gray-900 leading-tight hover:text-blue-600 transition-colors line-clamp-2">
          {card.name || "Unnamed Property"}
        </p>
      </Link>

      {(card.city || card.state) && (
        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-0.5">
          <MapPin size={9} />
          {[card.city, card.state].filter(Boolean).join(", ")}
        </p>
      )}

      {card.owner_name && (
        <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">{card.owner_name}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        {card.asking_price ? (
          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5">
            <DollarSign size={9} />
            {formatCurrency(Number(card.asking_price))}
          </span>
        ) : (
          <span />
        )}
        {card.relationship_status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            card.relationship_status === "Great Relationship"
              ? "bg-green-100 text-green-700"
              : card.relationship_status === "Positive Relationship"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {card.relationship_status === "Great Relationship"
              ? "Great"
              : card.relationship_status === "Positive Relationship"
              ? "Positive"
              : "None"}
          </span>
        )}
      </div>

      {card.owner_phone && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <a
            href={`tel:${card.owner_phone}`}
            className="text-gray-300 hover:text-blue-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Business Card ────────────────────────────────────────────────────────────

function BusinessKanbanCard({
  card,
  onDragStart,
}: {
  card: BusinessCard;
  onDragStart: (e: React.DragEvent, id: number, fromStage: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.business_id, card.stage)}
      className="bg-white rounded-xl border border-gray-200/80 p-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.05)] cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.08)] hover:border-gray-300 transition-all"
    >
      <Link href={`/accounts/${card.business_id}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-[12px] font-semibold text-gray-900 leading-tight hover:text-blue-600 transition-colors line-clamp-2">
          {card.le_name || card.lf_name || "Unknown"}
        </p>
      </Link>
      {card.city && <p className="text-[11px] text-gray-400 mt-0.5">{card.city}</p>}
      {card.estimated_annual_profit && (
        <p className="text-[11px] font-semibold text-emerald-700 mt-1.5">
          {formatCurrency(Number(card.estimated_annual_profit))}
        </p>
      )}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
        {card.phone && (
          <a href={`tel:${card.phone}`} className="text-gray-300 hover:text-blue-500 transition-colors" onClick={(e) => e.stopPropagation()}>
            <Phone size={12} />
          </a>
        )}
        {card.email && (
          <a href={`mailto:${card.email}`} className="text-gray-300 hover:text-blue-500 transition-colors" onClick={(e) => e.stopPropagation()}>
            <Mail size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [entity, setEntity] = useState<"properties" | "businesses">("properties");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [colDragOver, setColDragOver] = useState<string | null>(null);
  const dragTypeRef = useRef<"card" | "column" | null>(null);

  // Properties state
  const [propStages, setPropStages] = useState<Record<string, PropertyStageData>>({});
  const [notInterestedCount, setNotInterestedCount] = useState(0);
  const [visibleStages, setVisibleStages] = useState<string[]>(DEFAULT_VISIBLE_PROPERTY_STAGES);

  // Businesses state
  const [bizStages, setBizStages] = useState<Record<string, BusinessCard[]>>({});

  // ── Views state ────────────────────────────────────────────────────────────
  const [views, setViews] = useState<SavedViewData[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const activeView = views.find((v) => v.id === activeViewId) ?? null;
  const viewEntity = entity === "properties" ? "pipeline_properties" : "pipeline_businesses";

  // ── Load views when entity changes ─────────────────────────────────────────
  const loadViews = useCallback(async (ent: string) => {
    const res = await fetch(`/api/views?entity=${ent}`);
    const data: SavedViewData[] = await res.json();
    setViews(data);
    const defaultView = data.find((v) => v.is_default) ?? data[0] ?? null;
    if (defaultView) {
      setActiveViewId(defaultView.id);
      setConditions(defaultView.filters as FilterCondition[]);
      setVisibleStages(
        (defaultView.columns as string[]).length > 0
          ? (defaultView.columns as string[])
          : DEFAULT_VISIBLE_PROPERTY_STAGES
      );
    } else {
      setActiveViewId(null);
      setConditions([]);
      setVisibleStages(DEFAULT_VISIBLE_PROPERTY_STAGES);
    }
    setIsDirty(false);
  }, []);

  useEffect(() => {
    loadViews(viewEntity);
  }, [viewEntity, loadViews]);

  // ── Activate a view ────────────────────────────────────────────────────────
  const activateView = useCallback((view: SavedViewData) => {
    setActiveViewId(view.id);
    setConditions(view.filters as FilterCondition[]);
    if ((view.columns as string[]).length > 0) {
      setVisibleStages(view.columns as string[]);
    }
    setIsDirty(false);
  }, []);

  // ── Dirty detection ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeView) return;
    const viewStages = (activeView.columns as string[]);
    const stagesDirty =
      viewStages.length !== visibleStages.length ||
      !visibleStages.every((s, i) => s === viewStages[i]);
    const filtersDirty = !conditionsEqual(conditions, activeView.filters as FilterCondition[]);
    setIsDirty(stagesDirty || filtersDirty);
  }, [conditions, visibleStages, activeView]);

  // ── Save current view ──────────────────────────────────────────────────────
  const handleSaveCurrent = async () => {
    if (!activeView || activeView.is_default) return;
    await fetch(`/api/views/${activeView.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: conditions, columns: visibleStages }),
    });
    await loadViews(viewEntity);
  };

  const handleSaveAsNew = async (name: string) => {
    await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        entity: viewEntity,
        filters: conditions,
        columns: visibleStages,
        sort_field: null,
        sort_dir: null,
      }),
    });
    await loadViews(viewEntity);
  };

  const handleRenameView = async (id: number, name: string) => {
    await fetch(`/api/views/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  };

  const handleDeleteView = async (id: number) => {
    await fetch(`/api/views/${id}`, { method: "DELETE" });
    await loadViews(viewEntity);
  };

  const handleToggleHide = async (id: number, hidden: boolean) => {
    await fetch(`/api/views/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: hidden }),
    });
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, is_hidden: hidden } : v)));
  };

  const handleDiscard = () => {
    if (activeView) activateView(activeView);
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (entity === "properties") {
        const stagesParam = visibleStages.join("|");
        const params = new URLSearchParams({ entity: "properties", stages: stagesParam });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (conditions.length > 0) params.set("filters", JSON.stringify(conditions));
        const res = await fetch(`/api/pipeline?${params}`);
        const data = await res.json();
        setPropStages(data.stages || {});
        setNotInterestedCount(data.notInterestedCount || 0);
      } else {
        const params = new URLSearchParams({ entity: "businesses" });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const res = await fetch(`/api/pipeline?${params}`);
        const data = await res.json();
        setBizStages(data.stages || {});
      }
    } finally {
      setLoading(false);
    }
  }, [entity, visibleStages, debouncedSearch, conditions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Property drag ──────────────────────────────────────────────────────────

  const handlePropDragStart = (e: React.DragEvent, id: string, fromStage: string) => {
    dragTypeRef.current = "card";
    e.dataTransfer.setData("propId", id);
    e.dataTransfer.setData("fromStage", fromStage);
    e.stopPropagation();
  };

  const handlePropDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    const propId = e.dataTransfer.getData("propId");
    const fromStage = e.dataTransfer.getData("fromStage");
    dragTypeRef.current = null;
    if (!propId || fromStage === toStage) { setDragOver(null); return; }

    // Optimistic update
    setPropStages((prev) => {
      const next = { ...prev };
      const card = next[fromStage]?.cards.find((c) => c.id === propId);
      if (!card) return prev;
      next[fromStage] = {
        cards: next[fromStage].cards.filter((c) => c.id !== propId),
        total: Math.max(0, next[fromStage].total - 1),
      };
      if (!next[toStage]) next[toStage] = { cards: [], total: 0 };
      next[toStage] = {
        cards: [{ ...card, deal_stage: toStage }, ...next[toStage].cards],
        total: next[toStage].total + 1,
      };
      return next;
    });
    setDragOver(null);

    await fetch(`/api/properties/${propId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_stage: toStage }),
    });
  };

  // ── Business drag ──────────────────────────────────────────────────────────

  const handleBizDragStart = (e: React.DragEvent, id: number, fromStage: string) => {
    dragTypeRef.current = "card";
    e.dataTransfer.setData("bizId", String(id));
    e.dataTransfer.setData("fromStage", fromStage);
  };

  const handleBizDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    const bizId = parseInt(e.dataTransfer.getData("bizId"));
    const fromStage = e.dataTransfer.getData("fromStage");
    dragTypeRef.current = null;
    if (!bizId || fromStage === toStage) { setDragOver(null); return; }

    setBizStages((prev) => {
      const next = { ...prev };
      const card = next[fromStage]?.find((b) => b.business_id === bizId);
      if (!card) return prev;
      next[fromStage] = next[fromStage].filter((b) => b.business_id !== bizId);
      next[toStage] = [...(next[toStage] || []), { ...card, stage: toStage }];
      return next;
    });
    setDragOver(null);

    await fetch(`/api/pipeline/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
  };

  // ── Column reorder ─────────────────────────────────────────────────────────

  const handleColDragStart = (e: React.DragEvent, stage: string) => {
    dragTypeRef.current = "column";
    e.dataTransfer.setData("colStage", stage);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragEnd = () => {
    dragTypeRef.current = null;
    setColDragOver(null);
  };

  const handleColDrop = (e: React.DragEvent, toStage: string) => {
    const fromStage = e.dataTransfer.getData("colStage");
    if (!fromStage || fromStage === toStage) { setColDragOver(null); return; }
    setVisibleStages((prev) => {
      const next = prev.filter((s) => s !== fromStage);
      const toIdx = next.indexOf(toStage);
      next.splice(toIdx, 0, fromStage);
      return next;
    });
    setColDragOver(null);
    dragTypeRef.current = null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalProps = Object.values(propStages).reduce((s, d) => s + d.total, 0);
  const totalBiz = Object.values(bizStages).reduce((s, cards) => s + cards.length, 0);

  const stages = entity === "properties" ? visibleStages : [...PIPELINE_STAGES];
  const filterFields = entity === "properties" ? PIPELINE_PROPERTY_FILTER_FIELDS : PIPELINE_BUSINESS_FILTER_FIELDS;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-8 pt-6 pb-3 bg-white border-b border-gray-100">
        {/* Row 1: Title */}
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">Pipeline</h1>

        {/* Row 2: Entity tabs + controls */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {/* Entity toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setEntity("properties"); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                entity === "properties"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Landmark size={14} />
              Properties
            </button>
            <button
              onClick={() => { setEntity("businesses"); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                entity === "businesses"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building2 size={14} />
              Businesses
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoComplete="nope"
              className="pl-7 pr-7 py-2 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* FilterBuilder */}
          <FilterBuilder
            fields={filterFields}
            conditions={conditions}
            onChange={(c) => {
              setConditions(c);
            }}
          />

          {/* Stage selector (properties only) */}
          {entity === "properties" && (
            <StageSelector visibleStages={visibleStages} onChange={setVisibleStages} />
          )}

          {/* Summary pills */}
          {entity === "properties" && !loading && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">
                {totalProps.toLocaleString()} in pipeline
              </span>
              {notInterestedCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-400 rounded-full">
                  {notInterestedCount.toLocaleString()} not interested
                </span>
              )}
            </div>
          )}
          {entity === "businesses" && !loading && (
            <span className="text-xs text-gray-400">{totalBiz} businesses</span>
          )}
        </div>

        {/* Views bar */}
        {views.length > 0 && (
          <ViewsBar
            views={views}
            activeViewId={activeViewId}
            isDirty={isDirty}
            onSelectView={activateView}
            onRenameView={handleRenameView}
            onDeleteView={handleDeleteView}
            onToggleHide={handleToggleHide}
            onSaveCurrent={handleSaveCurrent}
            onSaveAsNew={handleSaveAsNew}
            onDiscard={handleDiscard}
            activeView={activeView}
          />
        )}
      </div>

      {/* ── Kanban board ── */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto px-8 pt-4 pb-6 flex-1">
          {(entity === "properties" ? visibleStages : [...PIPELINE_STAGES]).map((stage) => (
            <div key={stage} className="flex-shrink-0 w-56">
              <div className="h-8 bg-gray-200 rounded-lg mb-3 animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    <div className="h-4 w-10 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto px-8 pt-4 pb-6 flex-1">
          {stages.map((stage) => {
            const isProperty = entity === "properties";
            const stageData = isProperty ? propStages[stage] : null;
            const bizCards = !isProperty ? (bizStages[stage] || []) : [];
            const cards = isProperty ? (stageData?.cards || []) : bizCards;
            const total = isProperty ? (stageData?.total ?? 0) : bizCards.length;
            const colorClass = isProperty
              ? (DEAL_STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-700")
              : (STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-700");
            const label = isProperty ? (DEAL_STAGE_LABELS[stage] ?? stage) : stage;

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-56 transition-opacity ${colDragOver === stage ? "border-l-2 border-blue-400 pl-1.5 -ml-2" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragTypeRef.current === "column") setColDragOver(stage);
                  else setDragOver(stage);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOver(null);
                    setColDragOver(null);
                  }
                }}
                onDrop={(e) => {
                  if (dragTypeRef.current === "column") {
                    handleColDrop(e, stage);
                  } else if (isProperty) {
                    handlePropDrop(e, stage);
                  } else {
                    handleBizDrop(e, stage);
                  }
                }}
              >
                {/* Column header — draggable for reordering (properties only) */}
                <div
                  className={`px-2 py-2 rounded-lg mb-2.5 flex items-center justify-between ${colorClass} ${isProperty ? "cursor-grab active:cursor-grabbing" : ""}`}
                  draggable={isProperty}
                  onDragStart={isProperty ? (e) => handleColDragStart(e, stage) : undefined}
                  onDragEnd={isProperty ? handleColDragEnd : undefined}
                >
                  {isProperty && (
                    <GripVertical size={12} className="flex-shrink-0 opacity-40 mr-1 -ml-1" />
                  )}
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide truncate flex-1 mr-1"
                    title={stage}
                  >
                    {label}
                  </span>
                  <span className="text-[11px] font-bold bg-white/50 px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                    {total > cards.length ? `${cards.length}+` : total}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  className={`min-h-20 rounded-xl transition-colors space-y-2 ${
                    dragOver === stage ? "bg-blue-50 ring-2 ring-blue-300 ring-inset" : ""
                  }`}
                >
                  {isProperty
                    ? (cards as PropertyCard[]).map((card) => (
                        <PropertyKanbanCard
                          key={card.id}
                          card={card}
                          onDragStart={handlePropDragStart}
                        />
                      ))
                    : (cards as BusinessCard[]).map((card) => (
                        <BusinessKanbanCard
                          key={card.business_id}
                          card={card}
                          onDragStart={handleBizDragStart}
                        />
                      ))
                  }

                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-14 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                      Drop here
                    </div>
                  )}

                  {/* "See all" link when there are more */}
                  {isProperty && total > cards.length && (
                    <Link
                      href={`/properties?deal_stage=${encodeURIComponent(stage)}`}
                      className="block text-center text-xs text-blue-500 hover:text-blue-700 py-1.5 hover:underline"
                    >
                      +{total - cards.length} more →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {stages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <SlidersHorizontal size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No stages selected</p>
                <p className="text-xs mt-1">Use the Stages button to show columns</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
