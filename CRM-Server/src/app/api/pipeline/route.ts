import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all businesses in pipeline stages
  const pipelineStages = await prisma.pipelineStage.findMany({
    include: {
      business: {
        select: {
          business_id: true,
          le_name: true,
          lf_name: true,
          city: true,
          acquisition_fit_score: true,
          estimated_annual_profit: true,
          phone: true,
          email: true,
          cms_star_rating: true,
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  // Get all businesses NOT in pipeline (they're "Prospect" by default)
  const businessesInPipeline = pipelineStages.map((ps) => ps.business_id);

  // Build result grouped by stage
  const grouped: Record<string, unknown[]> = {};
  for (const stage of PIPELINE_STAGES) {
    grouped[stage] = [];
  }

  for (const ps of pipelineStages) {
    const stage = ps.stage as string;
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push({
      ...ps.business,
      stage: ps.stage,
      pipeline_id: ps.id,
      assigned_to: ps.assigned_to,
      estimated_annual_profit: ps.business.estimated_annual_profit?.toString() ?? null,
      cms_star_rating: ps.business.cms_star_rating?.toString() ?? null,
    });
  }

  return NextResponse.json({ stages: grouped, inPipeline: businessesInPipeline.length });
}
