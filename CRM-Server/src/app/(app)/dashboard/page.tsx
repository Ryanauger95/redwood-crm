import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  Building2, Sparkles, ChevronRight, Star,
  TrendingUp, Users, Zap, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { formatCurrency, PIPELINE_STAGES } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greet(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];
  return `${g}, ${first}`;
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTIVITY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  call:  { bg: "bg-blue-50",   text: "text-blue-600" },
  email: { bg: "bg-violet-50", text: "text-violet-600" },
  note:  { bg: "bg-amber-50",  text: "text-amber-600" },
  task:  { bg: "bg-emerald-50",text: "text-emerald-600" },
  sms:   { bg: "bg-pink-50",   text: "text-pink-600" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Call", email: "Email", note: "Note", task: "Task", sms: "SMS",
};

async function getDashboardData() {
  const [
    totalBusinesses,
    enrichmentCounts,
    pipelineCounts,
    totalContacts,
    topTargets,
    recentActivities,
  ] = await Promise.all([
    prisma.business.count(),

    prisma.business.groupBy({
      by: ["enrichment_status"],
      _count: { enrichment_status: true },
    }),

    prisma.pipelineStage.groupBy({
      by: ["stage"],
      _count: { stage: true },
    }),

    prisma.person.count(),

    prisma.business.findMany({
      where: {
        acquisition_fit_score: { not: null },
        enrichment_status: "completed",
      },
      orderBy: [{ acquisition_fit_score: { sort: "desc", nulls: "last" } }],
      take: 6,
      select: {
        business_id: true, le_name: true, lf_name: true,
        city: true, state_code: true,
        acquisition_fit_score: true, estimated_annual_profit: true,
        cms_star_rating: true, pe_backed: true,
        pipelineStage: { select: { stage: true } },
      },
    }),

    prisma.activity.findMany({
      orderBy: { created_at: "desc" },
      take: 8,
      select: {
        id: true, type: true, subject: true, status: true,
        created_at: true, due_date: true,
        business: { select: { business_id: true, le_name: true, lf_name: true } },
        person:   { select: { person_id: true, full_name: true } },
      },
    }),
  ]);

  const enrichMap: Record<string, number> = {};
  for (const r of enrichmentCounts) enrichMap[r.enrichment_status] = r._count.enrichment_status;

  const pipelineMap: Record<string, number> = {};
  for (const r of pipelineCounts) pipelineMap[r.stage] = r._count.stage;

  const enriched  = enrichMap["completed"] ?? 0;
  const inPipeline = Object.values(pipelineMap).reduce((a, b) => a + b, 0);

  return { totalBusinesses, enriched, inPipeline, totalContacts, topTargets, recentActivities, pipelineMap, enrichMap };
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "User";

  const data = await getDashboardData();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const enrichTotal = data.totalBusinesses;
  const enrichPct   = enrichTotal > 0 ? Math.round((data.enriched / enrichTotal) * 100) : 0;
  const maxPipeline = Math.max(...Object.values(data.pipelineMap), 1);

  const STAGE_BAR_COLORS: Record<string, string> = {
    Prospect:    "#94a3b8",
    Contacted:   "#3b82f6",
    Interested:  "#a855f7",
    "NDA Signed":"#6366f1",
    LOI:         "#f97316",
    Closed:      "#22c55e",
    Pass:        "#ef4444",
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{greet(userName)}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <Link href="/accounts" className="text-[13px] text-blue-600 hover:underline flex items-center gap-1 font-medium">
          View all businesses <ChevronRight size={14} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3.5 py-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{data.totalBusinesses.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Total Businesses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3.5 py-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Zap size={17} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{data.enriched.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">AI Enriched</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3.5 py-4">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={17} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{data.inPipeline.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">In Pipeline</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3.5 py-4">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
              <Users size={17} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{data.totalContacts.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Contacts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Top Targets + Recent Activity */}
        <div className="col-span-2 space-y-5">
          {/* Top HHA Targets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star size={13} className="text-amber-400 fill-amber-400" /> Top HHA Targets
              </CardTitle>
              <Link href="/accounts" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </CardHeader>
            {data.topTargets.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Sparkles size={20} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No enriched businesses yet.</p>
                <p className="text-xs text-gray-400 mt-1">Run the AI enrichment script to populate targets.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.topTargets.map((b) => (
                  <Link
                    key={b.business_id}
                    href={`/accounts/${b.business_id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/80 transition-colors group"
                  >
                    <FitScoreBadge score={b.acquisition_fit_score} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {b.le_name || b.lf_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{b.city || "SC"}</span>
                        {b.cms_star_rating && (
                          <span className="text-xs text-amber-600 flex items-center gap-0.5">
                            <Star size={9} className="fill-amber-400 text-amber-400" />{String(b.cms_star_rating)}
                          </span>
                        )}
                        {b.pe_backed === false && (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-px rounded-full">Indep.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {b.estimated_annual_profit && (
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(Number(b.estimated_annual_profit))}
                        </span>
                      )}
                      <StageBadge stage={b.pipelineStage?.stage} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity size={13} className="text-gray-400" /> Recent Activity
              </CardTitle>
              <Link href="/activities" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </CardHeader>
            {data.recentActivities.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No activities yet. Log a call or add a note to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentActivities.map((a) => {
                  const typeStyle = ACTIVITY_TYPE_COLORS[a.type] ?? { bg: "bg-gray-50", text: "text-gray-500" };
                  const entityName = a.business?.le_name || a.business?.lf_name || a.person?.full_name || "—";
                  const entityHref = a.business
                    ? `/accounts/${a.business.business_id}`
                    : a.person ? `/contacts/${a.person.person_id}` : "#";

                  return (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${typeStyle.bg}`}>
                        <span className={`text-[10px] font-bold ${typeStyle.text}`}>
                          {(ACTIVITY_LABELS[a.type] ?? a.type).charAt(0)}
                        </span>
                      </div>
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
                      <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">
                        {timeAgo(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Pipeline + Enrichment */}
        <div className="space-y-5">
          {/* HHA Pipeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={13} className="text-blue-500" /> HHA Pipeline
              </CardTitle>
              <Link href="/pipeline" className="text-xs text-blue-600 hover:underline">Kanban →</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = data.pipelineMap[stage] ?? 0;
                return (
                  <Link key={stage} href="/pipeline" className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{stage}</span>
                      <span className="text-[12px] font-bold text-gray-900 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / maxPipeline) * 100}%`,
                          background: STAGE_BAR_COLORS[stage] ?? "#9ca3af",
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Enrichment Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={13} className="text-emerald-500" /> Enrichment Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-gray-500 font-medium">
                    {data.enriched} of {enrichTotal} enriched
                  </span>
                  <span className="text-[12px] font-bold text-gray-900">{enrichPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${enrichPct}%` }}
                  />
                </div>
              </div>

              {/* Status breakdown */}
              <div className="space-y-2">
                {[
                  { key: "completed", label: "Enriched",  color: "bg-emerald-400" },
                  { key: "pending",   label: "Pending",   color: "bg-gray-300" },
                  { key: "failed",    label: "Failed",    color: "bg-red-400" },
                ].map(({ key, label, color }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-[12px] text-gray-600">{label}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-800 tabular-nums">
                      {(data.enrichMap[key] ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/accounts?view=pending"
                className="block text-center text-[12px] text-blue-600 hover:underline font-medium pt-1"
              >
                View pending businesses →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
