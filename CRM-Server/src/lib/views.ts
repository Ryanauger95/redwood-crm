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

export type FieldType = "text" | "number" | "select" | "boolean";

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

export const BUSINESS_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "county", label: "County", type: "text", operators: TEXT_OPS },
  { key: "license_type", label: "License Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(LICENSE_TYPE_OPTIONS) },
  { key: "stage", label: "Stage", type: "select", operators: SELECT_OPS, options: toSelectOptions(PIPELINE_STAGE_OPTIONS) },
  {
    key: "enrichment_status",
    label: "Enrichment",
    type: "select",
    operators: SELECT_OPS,
    options: [
      { value: "completed", label: "Enriched" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
      { value: "rate_limit_exhausted", label: "Rate Limited" },
    ],
  },
  {
    key: "acquisition_fit_score",
    label: "Fit Score",
    type: "number",
    operators: NUM_OPS,
  },
  {
    key: "estimated_annual_profit",
    label: "Est. Profit",
    type: "number",
    operators: ["gte", "lte"],
  },
  {
    key: "medicare_certified",
    label: "Medicare Certified",
    type: "boolean",
    operators: BOOL_OPS,
  },
  {
    key: "pe_backed",
    label: "PE Backed",
    type: "boolean",
    operators: BOOL_OPS,
  },
  {
    key: "cms_star_rating",
    label: "CMS Stars",
    type: "number",
    operators: ["gte", "lte"],
  },
];

// Re-export from fieldOptions so legacy imports still work
export { PROPERTY_DEAL_STAGE_OPTIONS as DEAL_STAGES } from "./fieldOptions";

export const PROPERTY_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "state", label: "State", type: "text", operators: ["equals"] },
  { key: "county", label: "County", type: "text", operators: TEXT_OPS },
  { key: "asset_class", label: "Asset Class", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_ASSET_CLASS_OPTIONS) },
  { key: "deal_stage", label: "Deal Stage", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_DEAL_STAGE_OPTIONS) },
  { key: "deal_type", label: "Deal Type", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_DEAL_TYPE_OPTIONS) },
  { key: "relationship_status", label: "Relationship Status", type: "select", operators: SELECT_OPS, options: toSelectOptions(PROPERTY_RELATIONSHIP_STATUS_OPTIONS) },
  { key: "asking_price", label: "Asking Price", type: "number", operators: ["gte", "lte"] },
  { key: "sales_owner", label: "Sales Owner", type: "text", operators: TEXT_OPS },
];

export const CONTACT_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: TEXT_OPS },
  { key: "city", label: "City", type: "text", operators: TEXT_OPS },
  { key: "state_code", label: "State", type: "text", operators: ["equals"] },
  {
    key: "succession_signals",
    label: "Succession Signals",
    type: "text",
    operators: ["is_not_empty"],
  },
  {
    key: "top_fit_score",
    label: "Top Fit Score",
    type: "number",
    operators: ["gte", "lte"],
  },
];

// ─── Column Definitions ──────────────────────────────────────────────────────

export interface ColumnDef {
  key: string;
  label: string;
  defaultOn: boolean;
  alwaysOn?: boolean;
}

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
      // name maps to le_name / lf_name
      const nameFilter =
        operator === "contains"
          ? { contains: value, mode: "insensitive" as const }
          : { equals: value, mode: "insensitive" as const };
      // We need OR — accumulate into where.OR
      const orCondition = [{ le_name: nameFilter }, { lf_name: nameFilter }];
      if (where.AND) {
        (where.AND as Prisma.BusinessWhereInput[]).push({ OR: orCondition });
      } else {
        where.AND = [{ OR: orCondition }];
      }
      continue;
    }

    if (field === "city") {
      applyTextFilter(where, "city", operator, value);
      continue;
    }

    if (field === "county") {
      applyTextFilter(where, "county", operator, value);
      continue;
    }

    if (field === "license_type") {
      where.license_type =
        operator === "is" ? value : { not: value };
      continue;
    }

    if (field === "enrichment_status") {
      where.enrichment_status =
        operator === "is" ? value : { not: value };
      continue;
    }

    if (field === "stage") {
      where.pipelineStage =
        operator === "is"
          ? { stage: value }
          : { stage: { not: value } };
      continue;
    }

    if (field === "acquisition_fit_score") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) {
        applyNumericFilter(where, "acquisition_fit_score", operator, n);
      }
      continue;
    }

    if (field === "estimated_annual_profit") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) {
        applyNumericFilter(where, "estimated_annual_profit", operator, n);
      }
      continue;
    }

    if (field === "cms_star_rating") {
      const n = parseFloat(value);
      if (!isNaN(n)) {
        applyNumericFilter(where, "cms_star_rating", operator, n);
      }
      continue;
    }

    if (field === "medicare_certified") {
      where.medicare_certified = operator === "is_true";
      continue;
    }

    if (field === "pe_backed") {
      where.pe_backed = operator === "is_true";
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

    if (field === "city") {
      applyTextFilter(where, "city", operator, value);
      continue;
    }

    if (field === "state_code") {
      applyTextFilter(where, "state_code", operator, value);
      continue;
    }

    if (field === "succession_signals" && operator === "is_not_empty") {
      where.succession_signals = { not: null };
      continue;
    }

    if (field === "top_fit_score") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) {
        const numOp = prismaNumOp(operator, n);
        where.businessPeople = {
          some: {
            business: {
              acquisition_fit_score: numOp,
            },
          },
        };
      }
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

    if (field === "name") { applyTextFilter(where, "name", operator, value); continue; }
    if (field === "city") { applyTextFilter(where, "city", operator, value); continue; }
    if (field === "state") { applyTextFilter(where, "state", operator, value); continue; }
    if (field === "county") { applyTextFilter(where, "county", operator, value); continue; }
    if (field === "asset_class") {
      where.asset_class = operator === "is_not" ? { not: value } : value;
      continue;
    }

    if (field === "deal_type") {
      where.deal_type = operator === "is_not" ? { not: value } : value;
      continue;
    }

    if (field === "relationship_status") {
      where.relationship_status = operator === "is_not" ? { not: value } : value;
      continue;
    }

    if (field === "sales_owner") { applyTextFilter(where, "sales_owner", operator, value); continue; }

    if (field === "deal_stage") {
      where.deal_stage = operator === "is_not" ? { not: value } : value;
      continue;
    }

    if (field === "asking_price") {
      const n = parseFloat(value);
      if (!isNaN(n)) applyNumericFilter(where, "asking_price", operator, n);
      continue;
    }
  }

  return where;
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
    case "gte":
      return { gte: value };
    case "lte":
      return { lte: value };
    case "gt":
      return { gt: value };
    case "lt":
      return { lt: value };
    default:
      return { equals: value };
  }
}
