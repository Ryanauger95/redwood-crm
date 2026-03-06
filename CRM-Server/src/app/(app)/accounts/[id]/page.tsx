import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AccountDetailClient } from "./AccountDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const businessId = parseInt(id);

  const business = await prisma.business.findUnique({
    where: { business_id: businessId },
    include: {
      businessPeople: {
        include: { person: true },
        orderBy: { ownership_pct: "desc" },
      },
      pipelineStage: true,
      tags: true,
      activities: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!business) notFound();

  // Serialize BigInt and Decimal values
  const serialized = {
    ...business,
    estimated_annual_profit: business.estimated_annual_profit?.toString() ?? null,
    estimated_annual_revenue: business.estimated_annual_revenue?.toString() ?? null,
    cms_star_rating: business.cms_star_rating?.toString() ?? null,
    profit_margin_pct: business.profit_margin_pct?.toString() ?? null,
    stage: business.pipelineStage?.stage ?? "Prospect",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessPeople: business.businessPeople.map((bp: any) => ({
      ...bp,
      ownership_pct: bp.ownership_pct?.toString() ?? null,
      association_date: bp.association_date?.toISOString() ?? null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activities: business.activities.map((a: any) => ({
      ...a,
      created_at: a.created_at.toISOString(),
      due_date: a.due_date?.toISOString() ?? null,
      completed_at: a.completed_at?.toISOString() ?? null,
    })),
    license_expires: business.license_expires?.toISOString() ?? null,
    cms_certification_date: business.cms_certification_date?.toISOString() ?? null,
    enrichment_date: business.enrichment_date?.toISOString() ?? null,
    created_at: business.created_at.toISOString(),
    updated_at: business.updated_at.toISOString(),
    enrichment_raw_json: null, // Don't send raw JSON to client
  };

  return <AccountDetailClient business={serialized} />;
}
