import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  MapPin, AlertCircle, CalendarClock, ShieldAlert,
  TrendingUp, Phone, CheckSquare, ChevronRight, Building2, Star, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { formatCurrency, PIPELINE_STAGES, STAGE_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatShortDate(d: Date | string | null) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysDiff(d: Date | string | null): number {
  if (!d) return 0;
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

async function getDashboardData(userName: string) {
  const mine = { sales_owner: userName };
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const in7days = new Date(todayStart); in7days.setDate(in7days.getDate() + 7);

  const COLD_STAGES = ["Not Interested", "Not Interested - Too Small", "Not Interested - Sold Elsewhere",
    "Not Interested - Private Equity / Large Corporation", "Acquired"];

  const [
    myCount,
    overdueCount,
    foreclosureCount,
    needsAttention,
    upcomingContacts,
    activeForeclosures,
    stageCounts,
    topTargets,
    pipelineStages,
  ] = await Promise.all([
    // Total my properties
    prisma.property.count({ where: mine }),

    // Overdue next_contact_date (excluding dead deals)
    prisma.property.count({
      where: {
        ...mine,
        next_contact_date: { lt: todayStart },
        deal_stage: { notIn: COLD_STAGES },
      },
    }),

    // Active foreclosures in my portfolio
    prisma.property.count({ where: { ...mine, in_foreclosure: true } }),

    // Properties needing attention (overdue contact) — show list
    prisma.property.findMany({
      where: {
        ...mine,
        next_contact_date: { lt: todayStart },
        deal_stage: { notIn: COLD_STAGES },
      },
      orderBy: { next_contact_date: "asc" },
      take: 8,
      select: {
        id: true, name: true, city: true, state: true,
        deal_stage: true, next_contact_date: true,
        owner_name: true, owner_phone: true,
      },
    }),

    // Upcoming contacts (next 7 days)
    prisma.property.findMany({
      where: {
        ...mine,
        next_contact_date: { gte: todayStart, lte: in7days },
      },
      orderBy: { next_contact_date: "asc" },
      take: 8,
      select: {
        id: true, name: true, city: true, state: true,
        deal_stage: true, next_contact_date: true,
        owner_name: true, owner_phone: true,
      },
    }),

    // Active foreclosures list
    prisma.property.findMany({
      where: { ...mine, in_foreclosure: true },
      orderBy: { foreclosure_filed_date: "asc" },
      take: 5,
      select: {
        id: true, name: true, city: true, state: true,
        deal_stage: true, foreclosure_status: true,
        foreclosure_case_number: true, foreclosure_judgment_amount: true,
      },
    }),

    // Deal stage breakdown for my properties
    prisma.property.groupBy({
      by: ["deal_stage"],
      where: { ...mine, deal_stage: { not: null } },
      _count: { deal_stage: true },
      orderBy: { _count: { deal_stage: "desc" } },
    }),

    // Top HHA acquisition targets (global — not user-filtered)
    prisma.business.findMany({
      where: { acquisition_fit_score: { not: null }, enrichment_status: "completed" },
      orderBy: [{ acquisition_fit_score: { sort: "desc", nulls: "last" } }],
      take: 5,
      select: {
        business_id: true, le_name: true, lf_name: true, city: true,
        acquisition_fit_score: true, estimated_annual_profit: true,
        cms_star_rating: true, pe_backed: true,
        pipelineStage: { select: { stage: true } },
      },
    }),

    // HHA pipeline stage counts
    prisma.pipelineStage.groupBy({ by: ["stage"], _count: { stage: true } }),
  ]);

  const stageMap: Record<string, number> = {};
  for (const row of stageCounts) {
    if (row.deal_stage) stageMap[row.deal_stage] = row._count.deal_stage;
  }

  const hhaStageCounts: Record<string, number> = {};
  for (const ps of pipelineStages) hhaStageCounts[ps.stage] = ps._count.stage;

  return {
    myCount, overdueCount, foreclosureCount,
    needsAttention, upcomingContacts, activeForeclosures,
    stageMap, topTargets, hhaStageCounts,
  };
}

function greet(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];
  return `${g}, ${first}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "";

  const data = await getDashboardData(userName);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const maxStageCount = Math.max(...Object.values(data.stageMap), 1);

  return (
    <div className="p-8 space-y-7 max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greet(userName)}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <Link href="/properties" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          View all properties <ChevronRight size={14} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.myCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">My Properties</p>
            </div>
          </CardContent>
        </Card>

        <Card className={data.overdueCount > 0 ? "border-orange-200 bg-orange-50/30" : ""}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${data.overdueCount > 0 ? "bg-orange-100" : "bg-gray-50"}`}>
              <AlertCircle size={20} className={data.overdueCount > 0 ? "text-orange-500" : "text-gray-400"} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.overdueCount}</p>
              <p className="text-xs text-gray-500">Overdue Contact</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.upcomingContacts.length}</p>
              <p className="text-xs text-gray-500">Contacts Next 7 Days</p>
            </div>
          </CardContent>
        </Card>

        <Card className={data.foreclosureCount > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${data.foreclosureCount > 0 ? "bg-red-100" : "bg-gray-50"}`}>
              <ShieldAlert size={20} className={data.foreclosureCount > 0 ? "text-red-500" : "text-gray-400"} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.foreclosureCount}</p>
              <p className="text-xs text-gray-500">Active Foreclosures</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Needs Attention + Deal Stage Breakdown */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* Needs Attention */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={15} className="text-orange-500" /> Needs Attention
              </CardTitle>
              <span className="text-xs text-gray-400">Next contact date overdue</span>
            </CardHeader>
            {data.needsAttention.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                You&apos;re all caught up — no overdue contacts.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.needsAttention.map((p) => {
                  const diff = daysDiff(p.next_contact_date as unknown as string);
                  return (
                    <Link key={p.id.toString()} href={`/properties/${p.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {p.name || "Unnamed"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.city && <span className="text-xs text-gray-400">{p.city}, {p.state}</span>}
                          {p.owner_name && <span className="text-xs text-gray-500">{p.owner_name}</span>}
                          {p.owner_phone && (
                            <a href={`tel:${p.owner_phone}`} onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline">
                              <Phone size={10} /> {p.owner_phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {Math.abs(diff)}d overdue
                        </span>
                        {p.deal_stage && (
                          <span className="text-xs text-gray-500 max-w-32 truncate">{p.deal_stage}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Upcoming Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock size={15} className="text-purple-500" /> Upcoming Contacts
              </CardTitle>
              <span className="text-xs text-gray-400">Next 7 days</span>
            </CardHeader>
            {data.upcomingContacts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                No contacts scheduled in the next 7 days.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.upcomingContacts.map((p) => {
                  const diff = daysDiff(p.next_contact_date as unknown as string);
                  return (
                    <Link key={p.id.toString()} href={`/properties/${p.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {p.name || "Unnamed"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.city && <span className="text-xs text-gray-400">{p.city}, {p.state}</span>}
                          {p.owner_name && <span className="text-xs text-gray-500">{p.owner_name}</span>}
                          {p.owner_phone && (
                            <a href={`tel:${p.owner_phone}`} onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline">
                              <Phone size={10} /> {p.owner_phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          diff === 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {diff === 0 ? "Today" : `in ${diff}d`}
                        </span>
                        {p.next_contact_date && (
                          <span className="text-xs text-gray-400">{formatShortDate(p.next_contact_date as unknown as string)}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Active Foreclosures */}
          {data.activeForeclosures.length > 0 && (
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-500" /> Active Foreclosures
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-gray-50">
                {data.activeForeclosures.map((p) => (
                  <Link key={p.id.toString()} href={`/properties/${p.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {p.name || "Unnamed"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.city && <span className="text-xs text-gray-400">{p.city}, {p.state}</span>}
                        {p.foreclosure_case_number && (
                          <span className="text-xs text-gray-500">#{p.foreclosure_case_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.foreclosure_status && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          {p.foreclosure_status}
                        </span>
                      )}
                      {p.foreclosure_judgment_amount && (
                        <span className="text-xs text-gray-600 font-medium">
                          {formatCurrency(Number(p.foreclosure_judgment_amount))}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* My Deal Stage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-500" /> My Deal Stages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {Object.keys(data.stageMap).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No properties assigned yet.</p>
              ) : (
                Object.entries(data.stageMap)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([stage, count]) => (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 truncate max-w-[160px]" title={stage}>{stage}</span>
                        <span className="text-xs font-bold text-gray-900 ml-2">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${(count / maxStageCount) * 100}%` }} />
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* HHA Pipeline (secondary) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-500" /> HHA Pipeline
              </CardTitle>
              <Link href="/pipeline" className="text-xs text-blue-600 hover:underline">Kanban →</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {PIPELINE_STAGES.map((stage) => {
                const count = data.hhaStageCounts[stage] || 0;
                const maxCount = Math.max(...Object.values(data.hhaStageCounts), 1);
                return (
                  <Link key={stage} href="/pipeline" className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{stage}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          background: stage === "Closed" ? "#22c55e" : stage === "Pass" ? "#ef4444"
                            : stage === "LOI" ? "#f97316" : stage === "NDA Signed" ? "#6366f1"
                            : stage === "Interested" ? "#a855f7" : stage === "Contacted" ? "#3b82f6" : "#9ca3af",
                        }} />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Top HHA Targets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star size={14} className="text-amber-500" /> Top HHA Acquisition Targets
          </CardTitle>
          <Link href="/accounts" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </CardHeader>
        {data.topTargets.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Sparkles size={24} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No enriched businesses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {data.topTargets.map((b) => (
              <Link key={b.business_id} href={`/accounts/${b.business_id}`}
                className="px-5 py-4 hover:bg-gray-50 transition-colors group">
                <FitScoreBadge score={b.acquisition_fit_score} size="sm" />
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors mt-2 leading-snug line-clamp-2">
                  {b.le_name || b.lf_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{b.city || "SC"}</p>
                <p className="text-sm font-semibold text-green-700 mt-1.5">
                  {formatCurrency(b.estimated_annual_profit ? Number(b.estimated_annual_profit) : null)}
                </p>
                <div className="mt-1.5">
                  <StageBadge stage={b.pipelineStage?.stage} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
