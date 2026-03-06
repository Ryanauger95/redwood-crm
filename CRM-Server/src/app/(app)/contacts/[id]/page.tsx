import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContactDetailClient } from "./ContactDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const personId = parseInt(id);

  const person = await prisma.person.findUnique({
    where: { person_id: personId },
    include: {
      businessPeople: {
        include: {
          business: {
            select: {
              business_id: true,
              le_name: true,
              lf_name: true,
              city: true,
              acquisition_fit_score: true,
              enrichment_status: true,
              pipelineStage: { select: { stage: true } },
            },
          },
        },
        orderBy: { ownership_pct: "desc" },
      },
      activities: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!person) notFound();

  const serialized = {
    ...person,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessPeople: person.businessPeople.map((bp: any) => ({
      ...bp,
      ownership_pct: bp.ownership_pct?.toString() ?? null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activities: person.activities.map((a: any) => ({
      ...a,
      created_at: a.created_at.toISOString(),
      due_date: a.due_date?.toISOString() ?? null,
      completed_at: a.completed_at?.toISOString() ?? null,
    })),
  };

  return <ContactDetailClient person={serialized} />;
}
