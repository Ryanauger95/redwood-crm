import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STRING_FIELDS = [
  "owner_name", "owner_phone", "relationship_status", "communication_status",
  "motivation_level", "sale_timeline", "offer_made", "data_status", "deal_stage",
  "letter_status", "ownership_type", "direct_mail_address", "mail_bounced_back",
  "county_activity", "reonomy_id", "address", "city", "state", "zipcode", "county",
  "territory", "property_size_estimate", "industry_type", "business_type", "sales_owner",
  "asset_class", "deal_type",
  "website", "phone", "last_sale_buyer", "mortgagee_name", "listing_url",
  "broker_names", "broker_phone", "broker_company", "lease_rate", "lease_terms",
  "lease_notes", "space_size", "length_of_lease", "lease_data_type", "leasing_broker",
  "llc_url", "google_url", "skiptrace_url", "gis_url", "links_to_original_data",
  "amenities", "tags",
  // Foreclosure
  "foreclosure_case_number", "foreclosure_status", "foreclosure_plaintiff",
  "court_case_url", "tax_map_parcel_number", "owner_mailing_address", "owner_entity_type",
];

const BOOLEAN_FIELDS = ["in_foreclosure"];

const INT_FIELDS = ["num_employees", "last_sale_year"];

const DECIMAL_FIELDS = [
  "annual_revenue", "last_sale_amount", "last_sale_price_per_sqft",
  "tax_assessed_value", "mortgage_amount", "asking_price", "asking_price_per_sqft",
  "foreclosure_judgment_amount",
];

const DATE_FIELDS = [
  "last_contact_date", "next_contact_date", "last_sale_date",
  "mortgage_start_date", "mortgage_expiration_date", "lease_start_date", "lease_expiration",
  "foreclosure_filed_date", "foreclosure_sale_date", "foreclosure_data_last_updated",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(p: any) {
  const toStr = (v: unknown) => (v != null ? String(v) : null);
  const toISO = (v: Date | null | undefined) => v?.toISOString() ?? null;
  const toDate = (v: Date | null | undefined) => v?.toISOString()?.split("T")[0] ?? null;

  return {
    ...p,
    id: toStr(p.id),
    parent_id: toStr(p.parent_id),
    annual_revenue: toStr(p.annual_revenue),
    last_sale_amount: toStr(p.last_sale_amount),
    last_sale_price_per_sqft: toStr(p.last_sale_price_per_sqft),
    tax_assessed_value: toStr(p.tax_assessed_value),
    mortgage_amount: toStr(p.mortgage_amount),
    asking_price: toStr(p.asking_price),
    asking_price_per_sqft: toStr(p.asking_price_per_sqft),
    created_at: toISO(p.created_at),
    updated_at: toISO(p.updated_at),
    last_contacted: toISO(p.last_contacted),
    last_activity_date: toDate(p.last_activity_date),
    last_contact_date: toDate(p.last_contact_date),
    next_contact_date: toDate(p.next_contact_date),
    last_sale_date: toDate(p.last_sale_date),
    mortgage_start_date: toDate(p.mortgage_start_date),
    mortgage_expiration_date: toDate(p.mortgage_expiration_date),
    lease_start_date: toDate(p.lease_start_date),
    lease_expiration: toDate(p.lease_expiration),
    foreclosure_filed_date: toDate(p.foreclosure_filed_date),
    foreclosure_sale_date: toDate(p.foreclosure_sale_date),
    foreclosure_data_last_updated: toDate(p.foreclosure_data_last_updated),
    foreclosure_judgment_amount: toStr(p.foreclosure_judgment_amount),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes: (p.notes || []).map((n: any) => ({
      ...n,
      id: toStr(n.id),
      property_id: toStr(n.property_id),
      created_at: toISO(n.created_at),
      updated_at: toISO(n.updated_at),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personLinks: (p.personLinks || []).map((pl: any) => ({
      ...pl,
      property_id: toStr(pl.property_id),
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id: BigInt(id) },
    include: {
      notes: { orderBy: { created_at: "desc" }, take: 100 },
      personLinks: { include: { person: true } },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serialize(property));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in body) data[key] = body[key] || null;
  }
  for (const key of BOOLEAN_FIELDS) {
    if (key in body) data[key] = body[key] === true || body[key] === "true" ? true : body[key] === false || body[key] === "false" ? false : null;
  }
  for (const key of INT_FIELDS) {
    if (key in body) {
      const n = parseInt(body[key], 10);
      data[key] = isNaN(n) ? null : n;
    }
  }
  for (const key of DECIMAL_FIELDS) {
    if (key in body) {
      const n = parseFloat(body[key]);
      data[key] = isNaN(n) ? null : n;
    }
  }
  for (const key of DATE_FIELDS) {
    if (key in body) {
      data[key] = body[key] ? new Date(body[key]) : null;
    }
  }

  await prisma.property.update({
    where: { id: BigInt(id) },
    data: { ...data, updated_at: new Date() },
  });

  return NextResponse.json({ success: true });
}
