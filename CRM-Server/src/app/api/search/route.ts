import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ businesses: [], people: [] });

  const [businesses, people] = await Promise.all([
    prisma.business.findMany({
      where: {
        OR: [
          { le_name: { contains: q, mode: "insensitive" } },
          { lf_name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { county: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: [{ acquisition_fit_score: { sort: "desc", nulls: "last" } }],
      select: {
        business_id: true,
        le_name: true,
        lf_name: true,
        city: true,
        county: true,
        enrichment_status: true,
        acquisition_fit_score: true,
        pipelineStage: { select: { stage: true } },
      },
    }),
    prisma.person.findMany({
      where: {
        OR: [
          { full_name: { contains: q, mode: "insensitive" } },
          { first_name: { contains: q, mode: "insensitive" } },
          { last_name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        person_id: true,
        full_name: true,
        first_name: true,
        last_name: true,
        city: true,
        state_code: true,
        businessPeople: {
          take: 1,
          select: {
            business: { select: { le_name: true, lf_name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ businesses, people });
}
