import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyDetailClient } from "./PropertyDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;

  let property;
  try {
    property = await prisma.property.findUnique({
      where: { id: BigInt(id) },
      include: {
        notes: {
        orderBy: { created_at: "desc" },
        take: 100,
        include: { user: { select: { name: true } } },
      },
        personLinks: { include: { person: true } },
      },
    });
  } catch {
    notFound();
  }

  if (!property) notFound();

  const toStr = (v: unknown) => (v != null ? String(v) : null);
  const toISO = (v: Date | null | undefined) => v?.toISOString() ?? null;
  const toDate = (v: Date | null | undefined) => v?.toISOString()?.split("T")[0] ?? null;

  const serialized = {
    ...property,
    id: toStr(property.id)!,
    parent_id: toStr(property.parent_id),
    annual_revenue: toStr(property.annual_revenue),
    last_sale_amount: toStr(property.last_sale_amount),
    last_sale_price_per_sqft: toStr(property.last_sale_price_per_sqft),
    tax_assessed_value: toStr(property.tax_assessed_value),
    mortgage_amount: toStr(property.mortgage_amount),
    asking_price: toStr(property.asking_price),
    asking_price_per_sqft: toStr(property.asking_price_per_sqft),
    created_at: toISO(property.created_at),
    updated_at: toISO(property.updated_at),
    last_contacted: toISO(property.last_contacted),
    last_activity_date: toDate(property.last_activity_date),
    last_contact_date: toDate(property.last_contact_date),
    next_contact_date: toDate(property.next_contact_date),
    last_sale_date: toDate(property.last_sale_date),
    mortgage_start_date: toDate(property.mortgage_start_date),
    mortgage_expiration_date: toDate(property.mortgage_expiration_date),
    lease_start_date: toDate(property.lease_start_date),
    lease_expiration: toDate(property.lease_expiration),
    foreclosure_judgment_amount: toStr(property.foreclosure_judgment_amount),
    foreclosure_filed_date: toDate(property.foreclosure_filed_date),
    foreclosure_sale_date: toDate(property.foreclosure_sale_date),
    foreclosure_data_last_updated: toDate(property.foreclosure_data_last_updated),
    notes: property.notes.map((n) => ({
      ...n,
      id: toStr(n.id)!,
      property_id: toStr(n.property_id)!,
      created_at: toISO(n.created_at),
      updated_at: toISO(n.updated_at),
      user: n.user ?? null,
    })),
    personLinks: property.personLinks.map((pl) => ({
      ...pl,
      property_id: toStr(pl.property_id)!,
    })),
  };

  return <PropertyDetailClient property={serialized} />;
}
