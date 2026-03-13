import { Prisma } from "@prisma/client";
import {
  LICENSE_TYPE_OPTIONS,
  PIPELINE_STAGE_OPTIONS,
  ENRICHMENT_STATUS_OPTIONS,
  PRIMARY_PAYOR_MIX_OPTIONS,
  PROPERTY_DEAL_STAGE_OPTIONS,
  PROPERTY_ASSET_CLASS_OPTIONS,
  PROPERTY_DEAL_TYPE_OPTIONS,
  PROPERTY_RELATIONSHIP_STATUS_OPTIONS,
  PROPERTY_MOTIVATION_LEVEL_OPTIONS,
  PROPERTY_SALE_TIMELINE_OPTIONS,
  PROPERTY_OWNERSHIP_TYPE_OPTIONS,
  PROPERTY_LETTER_STATUS_OPTIONS,
  PROPERTY_COMMUNICATION_STATUS_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  toSelectOptions,
} from "./fieldOptions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterOperator =
  | "contains"
  | "equals"
  | "is"
  | "is_not"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "is_true"
  | "is_false"
  | "is_not_empty";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string; // always string; coerce to correct type when building where
}

export interface SavedViewData {
  id: number;
  name: string;
  entity: string;
  filters: FilterCondition[];
  columns: string[];
  sort_field: string | null;
  sort_dir: string | null;
  is_default: boolean;
  is_hidden: boolean;
  sort_order: number;
  created_at: string;
}

// ─── Field Definitions ───────────────────────────────────────────────────────

export type FieldType = "text" | "number" | "select" | "boolean" | "date";

export interface FilterField {
  key: string;
  label: string;
  type: FieldType;
  operators: FilterOperator[];
  options?: { value: string; label: string }[];
}

const TEXT_OPS: FilterOperator[] = ["contains", "equals"];
const NUM_OPS: FilterOperator[] = ["gte", "lte", "gt", "lt", "equals"];
const SELECT_OPS: FilterOperator[] = ["is", "is_not"];
const BOOL_OPS: FilterOperator[] = ["is_true", "is_false"];
const DATE_OPS: FilterOperator[] = ["gte", "lte"];

// ─── BUSINESS ────────────────────────────────────────────────────────────────

export const BUSINESS_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "state_code", label: "State", type: "text", operators: ["equals"] },
  { key: "county", label: "County", type: "text", operators: TEXT_OPS },
  { key: "zip_code", label: "Zip Code", type: "text", operators: ["equals", "contains"] },
  { key: "address", label: "Address", type: "text", operators: TEXT_OPS },
  { key: "phone", label: "Phone", type: "text", operators: TEXT_OPS },
  { key: "email", label: "Email", type: "text", operators: TEXT_OPS },
  { key: "website", label: "Website", type: "text", operators: TEXT_OPS },
  { key: "license_type", label: "License Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(LICENSE_TYPE_OPTIONS) },
  { key: "stage", label: "Stage", type: "select", operators: SELECT_OPS, options: toSelectOptions(PIPELINE_STAGE_OPTIONS) },
  { key: "enrichment_status", label: "Enrichment", type: "select", operators: SELECT_OPS, options: [
    { value: "completed", label: "Enriched" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
    { value: "rate_limit_exhausted", label: "Rate Limited" },
  ]},
  { key: "primary_payor_mix", label: "Payor Mix", type: "select", operators: SELECT_OPS, options: toSelectOptions(PRIMARY_PAYOR_MIX_OPTIONS) },
  { key: "acquisition_fit_score", label: "Fit Score", type: "number", operators: NUM_OPS },
  { key: "estimated_annual_profit", label: "Est. Profit", type: "number", operators: ["gte", "lte"] },
  { key: "estimated_annual_revenue", label: "Est. Revenue", type: "number", operators: ["gte", "lte"] },
  { key: "profit_margin_pct", label: "Profit Margin %", type: "number", operators: ["gte", "lte"] },
  { key: "estimated_employees", label: "Employees", type: "number", operators: NUM_OPS },
  { key: "founded_year", label: "Founded Year", type: "number", operators: NUM_OPS },
  { key: "cms_star_rating", label: "CMS Stars", type: "number", operators: ["gte", "lte"] },
  { key: "medicare_certified", label: "Medicare Certified", type: "boolean", operators: BOOL_OPS },
  { key: "pe_backed", label: "PE Backed", type: "boolean", operators: BOOL_OPS },
  { key: "services_nursing", label: "Nursing Services", type: "boolean", operators: BOOL_OPS },
  { key: "services_pt", label: "PT Services", type: "boolean", operators: BOOL_OPS },
  { key: "services_ot", label: "OT Services", type: "boolean", operators: BOOL_OPS },
  { key: "services_speech", label: "Speech Services", type: "boolean", operators: BOOL_OPS },
  { key: "services_aide", label: "Aide Services", type: "boolean", operators: BOOL_OPS },
  { key: "accreditation", label: "Accreditation", type: "text", operators: TEXT_OPS },
  { key: "service_area", label: "Service Area", type: "text", operators: TEXT_OPS },
  { key: "business_summary", label: "Summary", type: "text", operators: ["is_not_empty", "contains"] },
  { key: "assigned_user_id", label: "Assigned To", type: "number", operators: ["equals"] },
];

export const BUSINESS_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", defaultOn: true, alwaysOn: true },
  { key: "location", label: "Location", defaultOn: true },
  { key: "license_type", label: "Type", defaultOn: true },
  { key: "acquisition_fit_score", label: "Fit Score", defaultOn: true },
  { key: "estimated_annual_profit", label: "Est. Profit", defaultOn: true },
  { key: "stage", label: "Stage", defaultOn: true },
  { key: "enrichment_status", label: "Status", defaultOn: true },
  { key: "estimated_annual_revenue", label: "Est. Revenue", defaultOn: false },
  { key: "profit_margin_pct", label: "Profit Margin", defaultOn: false },
  { key: "estimated_employees", label: "Employees", defaultOn: false },
  { key: "founded_year", label: "Founded", defaultOn: false },
  { key: "cms_star_rating", label: "CMS Stars", defaultOn: false },
  { key: "medicare_certified", label: "Medicare", defaultOn: false },
  { key: "pe_backed", label: "PE Backed", defaultOn: false },
  { key: "county", label: "County", defaultOn: false },
  { key: "assigned_user", label: "Assigned To", defaultOn: false },
  // New columns
  { key: "state_code", label: "State", defaultOn: false },
  { key: "address", label: "Address", defaultOn: false },
  { key: "zip_code", label: "Zip Code", defaultOn: false },
  { key: "phone", label: "Phone", defaultOn: false },
  { key: "email", label: "Email", defaultOn: false },
  { key: "website", label: "Website", defaultOn: false },
  { key: "primary_payor_mix", label: "Payor Mix", defaultOn: false },
  { key: "business_summary", label: "Summary", defaultOn: false },
  { key: "service_area", label: "Service Area", defaultOn: false },
  { key: "accreditation", label: "Accreditation", defaultOn: false },
  { key: "estimated_locations", label: "Locations", defaultOn: false },
  { key: "services_nursing", label: "Nursing", defaultOn: false },
  { key: "services_pt", label: "PT", defaultOn: false },
  { key: "services_ot", label: "OT", defaultOn: false },
  { key: "services_speech", label: "Speech", defaultOn: false },
  { key: "services_aide", label: "Aide", defaultOn: false },
  { key: "license_number", label: "License #", defaultOn: false },
  { key: "ccn", label: "CCN", defaultOn: false },
  { key: "cms_ownership_type", label: "CMS Ownership", defaultOn: false },
  { key: "acquisition_signals", label: "Acq. Signals", defaultOn: false },
  { key: "growth_signals", label: "Growth Signals", defaultOn: false },
  { key: "red_flags", label: "Red Flags", defaultOn: false },
  { key: "recent_news", label: "Recent News", defaultOn: false },
];

// ─── CONTACTS ────────────────────────────────────────────────────────────────

export const CONTACT_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "state_code", label: "State", type: "text", operators: ["equals"] },
  { key: "email", label: "Email", type: "text", operators: TEXT_OPS },
  { key: "phone", label: "Phone", type: "text", operators: TEXT_OPS },
  { key: "job_title", label: "Job Title", type: "text", operators: TEXT_OPS },
  { key: "company_name", label: "Company", type: "text", operators: TEXT_OPS },
  { key: "contact_type", label: "Contact Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(CONTACT_TYPE_OPTIONS) },
  { key: "contact_status", label: "Contact Status", type: "select", operators: SELECT_OPS, options: toSelectOptions(CONTACT_STATUS_OPTIONS) },
  { key: "estimated_age", label: "Age", type: "number", operators: NUM_OPS },
  { key: "lead_score", label: "Lead Score", type: "number", operators: NUM_OPS },
  { key: "succession_signals", label: "Succession Signals", type: "text", operators: ["is_not_empty", "contains"] },
  { key: "linkedin_url", label: "LinkedIn", type: "text", operators: ["is_not_empty"] },
  { key: "top_fit_score", label: "Top Fit Score", type: "number", operators: ["gte", "lte"] },
  { key: "lifecycle_stage", label: "Lifecycle Stage", type: "text", operators: TEXT_OPS },
  { key: "asset_class", label: "Asset Class", type: "text", operators: TEXT_OPS },
  { key: "market_focus", label: "Market Focus", type: "text", operators: TEXT_OPS },
  { key: "relationship_status", label: "Relationship", type: "text", operators: TEXT_OPS },
  { key: "source", label: "Source", type: "text", operators: TEXT_OPS },
  { key: "in_active_foreclosure", label: "In Foreclosure", type: "boolean", operators: BOOL_OPS },
];

export const CONTACT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", defaultOn: true, alwaysOn: true },
  { key: "location", label: "Location", defaultOn: true },
  { key: "businesses", label: "Businesses", defaultOn: true },
  { key: "top_fit_score", label: "Top Fit Score", defaultOn: true },
  { key: "activities", label: "Activities", defaultOn: true },
  { key: "estimated_age", label: "Age", defaultOn: false },
  { key: "succession_signals", label: "Succession Signals", defaultOn: false },
  { key: "linkedin_url", label: "LinkedIn", defaultOn: false },
  // New columns
  { key: "email", label: "Email", defaultOn: false },
  { key: "phone", label: "Phone", defaultOn: false },
  { key: "job_title", label: "Job Title", defaultOn: false },
  { key: "company_name", label: "Company", defaultOn: false },
  { key: "contact_type", label: "Type", defaultOn: false },
  { key: "contact_status", label: "Status", defaultOn: false },
  { key: "lead_score", label: "Lead Score", defaultOn: false },
  { key: "lifecycle_stage", label: "Lifecycle", defaultOn: false },
  { key: "asset_class", label: "Asset Class", defaultOn: false },
  { key: "market_focus", label: "Market Focus", defaultOn: false },
  { key: "relationship_status", label: "Relationship", defaultOn: false },
  { key: "source", label: "Source", defaultOn: false },
  { key: "address", label: "Address", defaultOn: false },
  { key: "zip_code", label: "Zip Code", defaultOn: false },
  { key: "owner_background", label: "Background", defaultOn: false },
  { key: "other_businesses", label: "Other Businesses", defaultOn: false },
  { key: "in_active_foreclosure", label: "In Foreclosure", defaultOn: false },
  { key: "associated_case_number", label: "Case #", defaultOn: false },
  { key: "skiptrace_url", label: "Skiptrace", defaultOn: false },
];

// ─── FORECLOSURES ────────────────────────────────────────────────────────────

export const FORECLOSURE_FILTER_FIELDS: FilterField[] = [
  { key: "case_number", label: "Case #", type: "text", operators: TEXT_OPS },
  { key: "status", label: "Status", type: "select", operators: SELECT_OPS, options: [
    { value: "Pending",              label: "Pending"              },
    { value: "Dismissed",            label: "Dismissed"            },
    { value: "Disposed",             label: "Disposed"             },
    { value: "Judgment",             label: "Judgment"             },
    { value: "Referred To Master",   label: "Referred To Master"   },
    { value: "Settled",              label: "Settled"              },
    { value: "Stayed for Intervention", label: "Stayed for Intervention" },
    { value: "Satisfied",            label: "Satisfied"            },
    { value: "Stayed",               label: "Stayed"               },
    { value: "Bankruptcy",           label: "Bankruptcy"           },
    { value: "Cancelled",            label: "Cancelled"            },
    { value: "Change Of Venue",      label: "Change Of Venue"      },
    { value: "Transferred",          label: "Transferred"          },
  ]},
  { key: "court_agency", label: "Court", type: "select", operators: SELECT_OPS, options: [
    { value: "Common Pleas",                    label: "Common Pleas"                    },
    { value: "Greenville County Common Pleas",  label: "Greenville County Common Pleas"  },
    { value: "Master In Equity",                label: "Master In Equity"                },
    { value: "Greenville County Master in Equity", label: "Greenville County Master in Equity" },
  ]},
  { key: "file_type", label: "File Type", type: "select", operators: SELECT_OPS, options: [
    { value: "Non-Jury", label: "Non-Jury" },
    { value: "Jury",     label: "Jury"     },
  ]},
  { key: "caption",             label: "Caption",         type: "text",    operators: TEXT_OPS },
  { key: "tax_map_description", label: "Address",         type: "text",    operators: TEXT_OPS },
  { key: "tax_map_number",      label: "Parcel #",        type: "text",    operators: TEXT_OPS },
  { key: "tax_map_agency",      label: "Tax Map Agency",  type: "text",    operators: TEXT_OPS },
  { key: "plaintiff",           label: "Plaintiff",       type: "text",    operators: TEXT_OPS },
  { key: "assigned_judge",      label: "Assigned Judge",  type: "text",    operators: TEXT_OPS },
  { key: "disposition_judge",   label: "Disp. Judge",     type: "text",    operators: TEXT_OPS },
  { key: "disposition",         label: "Disposition",     type: "text",    operators: TEXT_OPS },
  { key: "case_sub_type",       label: "Case Sub-Type",   type: "text",    operators: TEXT_OPS },
  { key: "balance_due",         label: "Balance Due",     type: "number",  operators: ["gte", "lte", "equals"] },
  { key: "fine_costs",          label: "Fine / Costs",    type: "number",  operators: ["gte", "lte", "equals"] },
  { key: "total_paid",          label: "Total Paid",      type: "number",  operators: ["gte", "lte", "equals"] },
  { key: "filed_date",          label: "Filed Date",      type: "date",    operators: DATE_OPS },
  { key: "disposition_date",    label: "Disposition Date", type: "date",   operators: DATE_OPS },
  { key: "scraped_at",          label: "Scraped At",       type: "date",   operators: DATE_OPS },
  { key: "has_balance",         label: "Has Balance Due", type: "boolean", operators: ["is_true", "is_false"] },
  { key: "county",              label: "County",          type: "text",    operators: TEXT_OPS },
];

export const FORECLOSURE_COLUMNS: ColumnDef[] = [
  { key: "case_number",         label: "Case #",           defaultOn: true,  alwaysOn: true },
  { key: "address",             label: "Address",          defaultOn: true  },
  { key: "plaintiff",           label: "Plaintiff",        defaultOn: true  },
  { key: "status",              label: "Status",           defaultOn: true  },
  { key: "filed_date",          label: "Filed",            defaultOn: true  },
  { key: "disposition",         label: "Disposition",      defaultOn: true  },
  { key: "disposition_date",    label: "Disposition Date", defaultOn: false },
  { key: "balance_due",         label: "Balance Due",      defaultOn: true  },
  { key: "fine_costs",          label: "Fine / Costs",     defaultOn: false },
  { key: "total_paid",          label: "Total Paid",       defaultOn: false },
  { key: "court_agency",        label: "Court",            defaultOn: false },
  { key: "case_sub_type",       label: "Case Type",        defaultOn: false },
  { key: "file_type",           label: "File Type",        defaultOn: false },
  { key: "assigned_judge",      label: "Assigned Judge",   defaultOn: false },
  { key: "disposition_judge",   label: "Disposition Judge", defaultOn: false },
  { key: "caption",             label: "Caption",          defaultOn: false },
  { key: "tax_map_number",      label: "Parcel #",         defaultOn: false },
  { key: "tax_map_agency",      label: "Tax Map Agency",   defaultOn: false },
  { key: "scraped_at",          label: "Scraped At",       defaultOn: false },
  // New columns
  { key: "county",              label: "County",           defaultOn: false },
  { key: "case_type",           label: "Case Type (Main)", defaultOn: false },
];

export const DEFAULT_FORECLOSURE_COLUMNS = FORECLOSURE_COLUMNS.filter(
  (c) => c.defaultOn
).map((c) => c.key);

// ─── PROPERTIES ──────────────────────────────────────────────────────────────

// Re-export from fieldOptions so legacy imports still work
export { PROPERTY_DEAL_STAGE_OPTIONS as DEAL_STAGES } from "./fieldOptions";

export const PROPERTY_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "address", label: "Address", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "state", label: "State", type: "text", operators: ["equals"] },
  { key: "county", label: "County", type: "text", operators: TEXT_OPS },
  { key: "zipcode", label: "Zip Code", type: "text", operators: ["equals", "contains"] },
  { key: "territory", label: "Territory", type: "text", operators: TEXT_OPS },
  { key: "asset_class", label: "Asset Class", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_ASSET_CLASS_OPTIONS) },
  { key: "deal_stage", label: "Deal Stage", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_DEAL_STAGE_OPTIONS) },
  { key: "deal_type", label: "Deal Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_DEAL_TYPE_OPTIONS) },
  { key: "relationship_status", label: "Relationship Status", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_RELATIONSHIP_STATUS_OPTIONS) },
  { key: "motivation_level", label: "Motivation Level", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_MOTIVATION_LEVEL_OPTIONS) },
  { key: "sale_timeline", label: "Sale Timeline", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_SALE_TIMELINE_OPTIONS) },
  { key: "ownership_type", label: "Ownership Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_OWNERSHIP_TYPE_OPTIONS) },
  { key: "letter_status", label: "Letter Status", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_LETTER_STATUS_OPTIONS) },
  { key: "communication_status", label: "Comm. Status", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_COMMUNICATION_STATUS_OPTIONS) },
  { key: "owner_name", label: "Owner Name", type: "text", operators: TEXT_OPS },
  { key: "owner_phone", label: "Owner Phone", type: "text", operators: TEXT_OPS },
  { key: "sales_owner", label: "Sales Owner", type: "text", operators: TEXT_OPS },
  { key: "broker_names", label: "Broker Names", type: "text", operators: TEXT_OPS },
  { key: "asking_price", label: "Asking Price", type: "number", operators: ["gte", "lte"] },
  { key: "annual_revenue", label: "Annual Revenue", type: "number", operators: ["gte", "lte"] },
  { key: "num_employees", label: "Employees", type: "number", operators: NUM_OPS },
  { key: "last_sale_amount", label: "Last Sale Amount", type: "number", operators: ["gte", "lte"] },
  { key: "tax_assessed_value", label: "Tax Assessed Value", type: "number", operators: ["gte", "lte"] },
  { key: "mortgage_amount", label: "Mortgage Amount", type: "number", operators: ["gte", "lte"] },
  { key: "in_foreclosure", label: "In Foreclosure", type: "boolean", operators: BOOL_OPS },
  { key: "last_contact_date", label: "Last Contact Date", type: "date", operators: DATE_OPS },
  { key: "next_contact_date", label: "Next Contact Date", type: "date", operators: DATE_OPS },
  { key: "last_sale_date", label: "Last Sale Date", type: "date", operators: DATE_OPS },
  { key: "data_status", label: "Data Status", type: "text", operators: TEXT_OPS },
  { key: "offer_made", label: "Offer Made", type: "text", operators: TEXT_OPS },
  { key: "industry_type", label: "Industry Type", type: "text", operators: TEXT_OPS },
  { key: "business_type", label: "Business Type", type: "text", operators: TEXT_OPS },
];

export const PROPERTY_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", defaultOn: true, alwaysOn: true },
  { key: "location", label: "Location", defaultOn: true },
  { key: "asset_class", label: "Asset Class", defaultOn: true },
  { key: "deal_stage", label: "Deal Stage", defaultOn: true },
  { key: "relationship_status", label: "Relationship", defaultOn: true },
  { key: "owner", label: "Owner", defaultOn: true },
  { key: "updated_at", label: "Updated", defaultOn: true },
  { key: "asking_price", label: "Asking Price", defaultOn: false },
  { key: "communication_status", label: "Comm. Status", defaultOn: false },
  { key: "sales_owner", label: "Sales Owner", defaultOn: false },
  // New columns
  { key: "address", label: "Address", defaultOn: false },
  { key: "zipcode", label: "Zip Code", defaultOn: false },
  { key: "territory", label: "Territory", defaultOn: false },
  { key: "deal_type", label: "Deal Type", defaultOn: false },
  { key: "motivation_level", label: "Motivation", defaultOn: false },
  { key: "sale_timeline", label: "Sale Timeline", defaultOn: false },
  { key: "ownership_type", label: "Ownership Type", defaultOn: false },
  { key: "letter_status", label: "Letter Status", defaultOn: false },
  { key: "phone", label: "Phone", defaultOn: false },
  { key: "website", label: "Website", defaultOn: false },
  { key: "annual_revenue", label: "Revenue", defaultOn: false },
  { key: "num_employees", label: "Employees", defaultOn: false },
  { key: "owner_phone", label: "Owner Phone", defaultOn: false },
  { key: "data_status", label: "Data Status", defaultOn: false },
  { key: "offer_made", label: "Offer Made", defaultOn: false },
  { key: "last_contact_date", label: "Last Contact", defaultOn: false },
  { key: "next_contact_date", label: "Next Contact", defaultOn: false },
  { key: "last_sale_amount", label: "Last Sale Amt", defaultOn: false },
  { key: "last_sale_date", label: "Last Sale Date", defaultOn: false },
  { key: "last_sale_year", label: "Last Sale Year", defaultOn: false },
  { key: "tax_assessed_value", label: "Tax Value", defaultOn: false },
  { key: "mortgage_amount", label: "Mortgage Amt", defaultOn: false },
  { key: "listing_url", label: "Listing URL", defaultOn: false },
  { key: "asking_price_per_sqft", label: "Price/SqFt", defaultOn: false },
  { key: "property_size_estimate", label: "Size Estimate", defaultOn: false },
  { key: "broker_names", label: "Broker", defaultOn: false },
  { key: "broker_phone", label: "Broker Phone", defaultOn: false },
  { key: "broker_company", label: "Broker Co.", defaultOn: false },
  { key: "industry_type", label: "Industry", defaultOn: false },
  { key: "business_type", label: "Business Type", defaultOn: false },
  { key: "in_foreclosure", label: "In Foreclosure", defaultOn: false },
  { key: "foreclosure_status", label: "Foreclosure Status", defaultOn: false },
  { key: "created_at", label: "Created", defaultOn: false },
];

export const DEFAULT_PROPERTY_COLUMNS = PROPERTY_COLUMNS.filter(
  (c) => c.defaultOn
).map((c) => c.key);

export const DEFAULT_BUSINESS_COLUMNS = BUSINESS_COLUMNS.filter(
  (c) => c.defaultOn
).map((c) => c.key);

export const DEFAULT_CONTACT_COLUMNS = CONTACT_COLUMNS.filter(
  (c) => c.defaultOn
).map((c) => c.key);

// ─── Column Definition type ─────────────────────────────────────────────────

export interface ColumnDef {
  key: string;
  label: string;
  defaultOn: boolean;
  alwaysOn?: boolean;
}

// ─── Operator labels ─────────────────────────────────────────────────────────

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  equals: "equals",
  is: "is",
  is_not: "is not",
  gte: "≥",
  lte: "≤",
  gt: ">",
  lt: "<",
  is_true: "is true",
  is_false: "is false",
  is_not_empty: "is not empty",
};

// ─── buildWhere helpers ──────────────────────────────────────────────────────

export function buildBusinessWhere(
  conditions: FilterCondition[]
): Prisma.BusinessWhereInput {
  const where: Prisma.BusinessWhereInput = {};

  for (const c of conditions) {
    const { field, operator, value } = c;

    if (field === "name") {
      const nameFilter =
        operator === "contains"
          ? { contains: value, mode: "insensitive" as const }
          : { equals: value, mode: "insensitive" as const };
      const orCondition = [{ le_name: nameFilter }, { lf_name: nameFilter }];
      if (where.AND) {
        (where.AND as Prisma.BusinessWhereInput[]).push({ OR: orCondition });
      } else {
        where.AND = [{ OR: orCondition }];
      }
      continue;
    }

    // Simple text fields
    const TEXT_FIELDS = ["city", "county", "state_code", "zip_code", "address", "phone", "email", "website", "accreditation", "service_area"];
    if (TEXT_FIELDS.includes(field)) {
      if (operator === "is_not_empty") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (where as any)[field] = { not: null };
      } else {
        applyTextFilter(where, field, operator, value);
      }
      continue;
    }

    if (field === "business_summary") {
      if (operator === "is_not_empty") {
        where.business_summary = { not: null };
      } else {
        applyTextFilter(where, "business_summary", operator, value);
      }
      continue;
    }

    // Select fields
    if (field === "license_type") { where.license_type = operator === "is" ? value : { not: value }; continue; }
    if (field === "enrichment_status") { where.enrichment_status = operator === "is" ? value : { not: value }; continue; }
    if (field === "primary_payor_mix") { where.primary_payor_mix = operator === "is" ? value : { not: value }; continue; }

    if (field === "stage") {
      where.pipelineStage = operator === "is" ? { stage: value } : { stage: { not: value } };
      continue;
    }

    // Numeric fields
    const NUM_FIELDS = ["acquisition_fit_score", "estimated_annual_profit", "estimated_annual_revenue", "profit_margin_pct", "estimated_employees", "founded_year", "cms_star_rating"];
    if (NUM_FIELDS.includes(field)) {
      const n = parseFloat(value);
      if (!isNaN(n)) applyNumericFilter(where, field, operator, n);
      continue;
    }

    // Boolean fields
    const BOOL_FIELDS = ["medicare_certified", "pe_backed", "services_nursing", "services_pt", "services_ot", "services_speech", "services_aide"];
    if (BOOL_FIELDS.includes(field)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any)[field] = operator === "is_true";
      continue;
    }

    if (field === "assigned_user_id") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) where.assigned_user_id = n;
      continue;
    }
  }

  return where;
}

export function buildContactWhere(
  conditions: FilterCondition[]
): Prisma.PersonWhereInput {
  const where: Prisma.PersonWhereInput = {};

  for (const c of conditions) {
    const { field, operator, value } = c;

    if (field === "name") {
      const nameFilter =
        operator === "contains"
          ? { contains: value, mode: "insensitive" as const }
          : { equals: value, mode: "insensitive" as const };
      const orCondition = [
        { full_name: nameFilter },
        { first_name: nameFilter },
        { last_name: nameFilter },
      ];
      if (where.AND) {
        (where.AND as Prisma.PersonWhereInput[]).push({ OR: orCondition });
      } else {
        where.AND = [{ OR: orCondition }];
      }
      continue;
    }

    // Simple text fields
    const TEXT_FIELDS = ["city", "state_code", "email", "phone", "job_title", "company_name", "lifecycle_stage", "asset_class", "market_focus", "relationship_status", "source"];
    if (TEXT_FIELDS.includes(field)) {
      applyTextFilter(where, field, operator, value);
      continue;
    }

    // Select fields
    if (field === "contact_type") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any).contact_type = operator === "is" ? value : { not: value };
      continue;
    }
    if (field === "contact_status") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any).contact_status = operator === "is" ? value : { not: value };
      continue;
    }

    if (field === "succession_signals") {
      if (operator === "is_not_empty") {
        where.succession_signals = { not: null };
      } else if (operator === "contains") {
        applyTextFilter(where, "succession_signals", operator, value);
      }
      continue;
    }

    if (field === "linkedin_url" && operator === "is_not_empty") {
      where.linkedin_url = { not: null };
      continue;
    }

    // Numeric fields
    if (field === "estimated_age") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) applyNumericFilter(where, "estimated_age", operator, n);
      continue;
    }
    if (field === "lead_score") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) applyNumericFilter(where, "lead_score", operator, n);
      continue;
    }

    if (field === "top_fit_score") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) {
        const numOp = prismaNumOp(operator, n);
        where.businessPeople = {
          some: { business: { acquisition_fit_score: numOp } },
        };
      }
      continue;
    }

    if (field === "in_active_foreclosure") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any).in_active_foreclosure = operator === "is_true";
      continue;
    }
  }

  return where;
}

export function buildPropertyWhere(
  conditions: FilterCondition[]
): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  for (const c of conditions) {
    const { field, operator, value } = c;

    // Text fields
    const TEXT_FIELDS = ["name", "city", "state", "county", "zipcode", "address", "territory", "sales_owner", "owner_name", "owner_phone", "broker_names", "data_status", "offer_made", "industry_type", "business_type"];
    if (TEXT_FIELDS.includes(field)) {
      applyTextFilter(where, field, operator, value);
      continue;
    }

    // Select fields
    const SELECT_FIELDS = ["asset_class", "deal_type", "relationship_status", "deal_stage", "motivation_level", "sale_timeline", "ownership_type", "letter_status", "communication_status"];
    if (SELECT_FIELDS.includes(field)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any)[field] = operator === "is_not" ? { not: value } : value;
      continue;
    }

    // Numeric fields
    const NUM_FIELDS = ["asking_price", "annual_revenue", "num_employees", "last_sale_amount", "tax_assessed_value", "mortgage_amount"];
    if (NUM_FIELDS.includes(field)) {
      const n = parseFloat(value);
      if (!isNaN(n)) applyNumericFilter(where, field, operator, n);
      continue;
    }

    // Date fields
    const DATE_FIELDS = ["last_contact_date", "next_contact_date", "last_sale_date"];
    if (DATE_FIELDS.includes(field)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any)[field] = operator === "gte" ? { gte: new Date(value) } : { lte: new Date(value) };
      continue;
    }

    // Boolean fields
    if (field === "in_foreclosure") {
      where.in_foreclosure = operator === "is_true";
      continue;
    }
  }

  return where;
}

// ─── Foreclosure SQL builder ─────────────────────────────────────────────────

/** Builds a SQL WHERE clause from FilterConditions for the foreclosure_cases table. */
export function buildForeclosureSqlConditions(
  conditions: FilterCondition[],
  startIdx = 1
): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = startIdx;

  const textClause = (col: string, operator: string, value: string) => {
    if (operator === "contains") { clauses.push(`${col} ILIKE $${idx}`); params.push(`%${value}%`); }
    else if (operator === "equals") { clauses.push(`${col} = $${idx}`); params.push(value); }
    else if (operator === "is_not_empty") { clauses.push(`${col} IS NOT NULL AND ${col} != ''`); return; }
    idx++;
  };

  const selectClause = (col: string, operator: string, value: string) => {
    clauses.push(operator === "is" ? `${col} = $${idx}` : `${col} != $${idx}`);
    params.push(value); idx++;
  };

  const numClause = (col: string, operator: string, value: string) => {
    const n = parseFloat(value);
    if (isNaN(n)) return;
    const op = operator === "gte" ? ">=" : operator === "lte" ? "<=" : "=";
    clauses.push(`${col} ${op} $${idx}`);
    params.push(n); idx++;
  };

  const dateClause = (col: string, operator: string, value: string) => {
    const op = operator === "gte" ? ">=" : "<=";
    clauses.push(`${col} ${op} $${idx}`);
    params.push(value); idx++;
  };

  for (const { field, operator, value } of conditions) {
    switch (field) {
      case "case_number":        textClause("fc.case_number", operator, value); break;
      case "status":             selectClause("fc.status", operator, value); break;
      case "court_agency":       selectClause("fc.court_agency", operator, value); break;
      case "file_type":          selectClause("fc.file_type", operator, value); break;
      case "caption":            textClause("fc.caption", operator, value); break;
      case "tax_map_description": textClause("fc.tax_map_description", operator, value); break;
      case "tax_map_number":     textClause("fc.tax_map_number", operator, value); break;
      case "tax_map_agency":     textClause("fc.tax_map_agency", operator, value); break;
      case "assigned_judge":     textClause("fc.assigned_judge", operator, value); break;
      case "disposition_judge":  textClause("fc.disposition_judge", operator, value); break;
      case "disposition":        textClause("fc.disposition", operator, value); break;
      case "case_sub_type":      textClause("fc.case_sub_type", operator, value); break;
      case "county":             textClause("fc.county", operator, value); break;
      case "plaintiff":
        if (operator === "contains") {
          clauses.push(`EXISTS (SELECT 1 FROM foreclosure_parties fp WHERE fp.case_id = fc.id AND fp.party_type = 'Plaintiff' AND fp.name ILIKE $${idx})`);
          params.push(`%${value}%`); idx++;
        } else if (operator === "equals") {
          clauses.push(`EXISTS (SELECT 1 FROM foreclosure_parties fp WHERE fp.case_id = fc.id AND fp.party_type = 'Plaintiff' AND fp.name = $${idx})`);
          params.push(value); idx++;
        }
        break;
      case "balance_due":        numClause("fc.balance_due", operator, value); break;
      case "fine_costs":         numClause("fc.fine_costs", operator, value); break;
      case "total_paid":         numClause("fc.total_paid_for_fine_costs", operator, value); break;
      case "filed_date":         dateClause("fc.filed_date", operator, value); break;
      case "disposition_date":   dateClause("fc.disposition_date", operator, value); break;
      case "scraped_at":         dateClause("fc.scraped_at", operator, value); break;
      case "has_balance":
        clauses.push(operator === "is_true"
          ? "fc.balance_due > 0"
          : "(fc.balance_due IS NULL OR fc.balance_due = 0)");
        break;
    }
  }

  return { clauses, params };
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function applyTextFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: Record<string, any>,
  field: string,
  operator: FilterOperator,
  value: string
) {
  if (operator === "contains") {
    where[field] = { contains: value, mode: "insensitive" };
  } else if (operator === "is_not_empty") {
    where[field] = { not: null };
  } else {
    where[field] = { equals: value, mode: "insensitive" };
  }
}

function applyNumericFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: Record<string, any>,
  field: string,
  operator: FilterOperator,
  value: number
) {
  where[field] = prismaNumOp(operator, value);
}

function prismaNumOp(operator: FilterOperator, value: number) {
  switch (operator) {
    case "gte": return { gte: value };
    case "lte": return { lte: value };
    case "gt":  return { gt: value };
    case "lt":  return { lt: value };
    default:    return { equals: value };
  }
}
