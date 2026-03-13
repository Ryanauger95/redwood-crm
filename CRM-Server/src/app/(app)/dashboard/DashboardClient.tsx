"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings, Building2, MapPin, CheckSquare, AlertTriangle,
  Phone, TrendingUp, Activity, Users, Zap, Eye, EyeOff,
  GripVertical, X,
} from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/utils";

interface WidgetData {
  id: number;
  widget_id: number;
  query_key: string;
  name: string;
  description: string | null;
  category: string;
  sort_order: number;
  is_visible: boolean;
  type: "stat" | "list" | "chart";
  data: unknown;
}

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  my_assigned_businesses: <Building2 size={17} className="text-blue-600" />,
  my_assigned_properties: <MapPin size={17} className="text-violet-600" />,
  my_open_tasks: <CheckSquare size={17} className="text-blue-600" />,
  overdue_tasks: <AlertTriangle size={17} className="text-red-500" />,
  contacted_this_week: <Phone size={17} className="text-emerald-600" />,
  pipeline_summary: <TrendingUp size={17} className="text-blue-600" />,
  recent_activities: <Activity size={17} className="text-gray-500" />,
  total_businesses: <Building2 size={17} className="text-blue-600" />,
  total_properties: <MapPin size={17} className="text-violet-600" />,
  total_contacts: <Users size={17} className="text-slate-500" />,
  enrichment_progress: <Zap size={17} className="text-emerald-500" />,
  full_pipeline_summary: <TrendingUp size={17} className="text-blue-600" />,
};

const WIDGET_BG: Record<string, string> = {
  my_assigned_businesses: "bg-blue-50",
  my_assigned_properties: "bg-violet-50",
  my_open_tasks: "bg-blue-50",
  overdue_tasks: "bg-red-50",
  contacted_this_week: "bg-emerald-50",
  total_businesses: "bg-blue-50",
  total_properties: "bg-violet-50",
  total_contacts: "bg-slate-50",
  enrichment_progress: "bg-emerald-50",
};

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const STAGE_BAR_COLORS: Record<string, string> = {
  Prospect: "#94a3b8",
  Contacted: "#3b82f6",
  Interested: "#a855f7",
  "NDA Signed": "#6366f1",
  LOI: "#f97316",
  Closed: "#22c55e",
  Pass: "#ef4444",
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Call", email: "Email", note: "Note", task: "Task", sms: "SMS",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardClient() {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [allWidgets, setAllWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/widgets");
    const data = await res.json();
    setWidgets(data);
    setAllWidgets(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWidgets(); }, [fetchWidgets]);

  const saveConfig = async (updatedWidgets: WidgetData[]) => {
    await fetch("/api/dashboard/widgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgets: updatedWidgets.map((w, i) => ({
          widget_id: w.widget_id,
          sort_order: i,
          is_visible: w.is_visible,
        })),
      }),
    });
    fetchWidgets();
  };

  const toggleWidget = (widgetId: number) => {
    const updated = allWidgets.map((w) =>
      w.widget_id === widgetId ? { ...w, is_visible: !w.is_visible } : w
    );
    setAllWidgets(updated);
    saveConfig(updated);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const statWidgets = widgets.filter((w) => w.type === "stat");
  const chartWidgets = widgets.filter((w) => w.type === "chart");
  const listWidgets = widgets.filter((w) => w.type === "list");

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{greet()}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => setConfiguring(!configuring)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            configuring ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          {configuring ? <><X size={14} /> Done</> : <><Settings size={14} /> Configure</>}
        </button>
      </div>

      {/* Configure panel */}
      {configuring && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Toggle Widgets</p>
            <div className="grid grid-cols-3 gap-2">
              {allWidgets.map((w) => (
                <button
                  key={w.widget_id}
                  onClick={() => toggleWidget(w.widget_id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                    w.is_visible
                      ? "border-blue-600/20 bg-blue-50 text-gray-900"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {w.is_visible ? <Eye size={14} className="text-blue-600" /> : <EyeOff size={14} />}
                  <span className="text-[13px]">{w.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="h-8 bg-gray-100 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stat widgets */}
          {statWidgets.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {statWidgets.map((w) => (
                <StatWidget key={w.query_key} widget={w} />
              ))}
            </div>
          )}

          {/* Charts + Lists */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
              {listWidgets.map((w) => (
                <ListWidget key={w.query_key} widget={w} />
              ))}
            </div>
            <div className="space-y-5">
              {chartWidgets.map((w) => (
                <ChartWidget key={w.query_key} widget={w} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatWidget({ widget }: { widget: WidgetData }) {
  const data = widget.data as { value: number; label: string } | null;
  if (!data) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3.5 py-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${WIDGET_BG[widget.query_key] ?? "bg-gray-50"}`}>
          {WIDGET_ICONS[widget.query_key] ?? <GripVertical size={17} className="text-gray-400" />}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 leading-none">{data.value.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{data.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartWidget({ widget }: { widget: WidgetData }) {
  const data = widget.data as { items: { stage?: string; status?: string; count: number }[]; label: string } | null;
  if (!data) return null;

  const isPipeline = widget.query_key.includes("pipeline");
  const isEnrichment = widget.query_key === "enrichment_progress";
  const maxVal = Math.max(...data.items.map((d) => d.count), 1);

  // For enrichment, show as progress bar
  if (isEnrichment) {
    const total = data.items.reduce((s, d) => s + d.count, 0);
    const completed = data.items.find((d) => d.status === "completed")?.count ?? 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {WIDGET_ICONS[widget.query_key]} {widget.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-gray-500 font-medium">{completed} of {total} enriched</span>
              <span className="text-[12px] font-bold text-gray-900">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {data.items.map((d) => (
              <div key={d.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${d.status === "completed" ? "bg-emerald-400" : d.status === "failed" ? "bg-red-400" : "bg-gray-300"}`} />
                  <span className="text-[12px] text-gray-600 capitalize">{d.status === "completed" ? "Enriched" : d.status}</span>
                </div>
                <span className="text-[12px] font-semibold text-gray-800 tabular-nums">{d.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pipeline bar chart
  const stages = isPipeline ? PIPELINE_STAGES : data.items.map((d) => d.stage ?? "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {WIDGET_ICONS[widget.query_key]} {widget.name}
        </CardTitle>
        <Link href="/pipeline" className="text-xs text-blue-600 hover:underline">Kanban →</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => {
          const count = data.items.find((d) => d.stage === stage)?.count ?? 0;
          return (
            <Link key={stage} href="/pipeline" className="block group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{stage}</span>
                <span className="text-[12px] font-bold text-gray-900 tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / maxVal) * 100}%`, background: STAGE_BAR_COLORS[stage] ?? "#9ca3af" }} />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ListWidget({ widget }: { widget: WidgetData }) {
  const data = widget.data as { items: { id: number; type: string; subject: string; status: string; created_at: string; business?: { business_id: number; le_name: string | null; lf_name: string | null } | null; person?: { person_id: number; full_name: string | null } | null }[]; label: string } | null;
  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {WIDGET_ICONS[widget.query_key]} {widget.name}
          </CardTitle>
          <Link href="/activities" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </CardHeader>
        <div className="px-5 py-8 text-center text-sm text-gray-400">No recent activities</div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {WIDGET_ICONS[widget.query_key]} {widget.name}
        </CardTitle>
        <Link href="/activities" className="text-xs text-blue-600 hover:underline">View all →</Link>
      </CardHeader>
      <div className="divide-y divide-gray-50">
        {data.items.map((a) => {
          const entityName = a.business?.le_name || a.business?.lf_name || a.person?.full_name || "—";
          const entityHref = a.business
            ? `/accounts/${a.business.business_id}`
            : a.person ? `/contacts/${a.person.person_id}` : "#";

          return (
            <div key={a.id} className="flex items-start gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-800 truncate leading-snug">{a.subject}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Link href={entityHref} className="text-xs text-blue-600 hover:underline truncate max-w-[180px]">
                    {entityName}
                  </Link>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                  {a.status === "completed" && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] font-medium text-emerald-600">Done</span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(a.created_at)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
