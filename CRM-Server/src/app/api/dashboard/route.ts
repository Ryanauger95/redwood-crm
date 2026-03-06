import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalBusinesses,
    enrichedCount,
    pipelineStages,
    recentActivities,
    topTargets,
    todayTasks,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { enrichment_status: "completed" } }),
    prisma.pipelineStage.groupBy({
      by: ["stage"],
      _count: { stage: true },
    }),
    prisma.activity.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      include: {
        business: { select: { le_name: true, lf_name: true, business_id: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.business.findMany({
      where: {
        acquisition_fit_score: { not: null },
        enrichment_status: "completed",
      },
      orderBy: { acquisition_fit_score: "desc" },
      take: 5,
      select: {
        business_id: true,
        le_name: true,
        lf_name: true,
        city: true,
        acquisition_fit_score: true,
        estimated_annual_profit: true,
        cms_star_rating: true,
        pipelineStage: { select: { stage: true } },
      },
    }),
    prisma.activity.findMany({
      where: {
        type: "task",
        status: "open",
        due_date: {
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      include: {
        business: { select: { le_name: true, lf_name: true, business_id: true } },
      },
    }),
  ]);

  // Build pipeline summary
  const stageCounts: Record<string, number> = {};
  for (const ps of pipelineStages) {
    stageCounts[ps.stage] = ps._count.stage;
  }

  return NextResponse.json({
    totalBusinesses,
    enrichedCount,
    stageCounts,
    recentActivities,
    topTargets: topTargets.map((b) => ({
      ...b,
      estimated_annual_profit: b.estimated_annual_profit?.toString() ?? null,
      cms_star_rating: b.cms_star_rating?.toString() ?? null,
      stage: b.pipelineStage?.stage ?? "Prospect",
    })),
    todayTasks,
  });
}
