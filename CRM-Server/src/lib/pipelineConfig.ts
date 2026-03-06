// ─── Property deal stage pipeline config ─────────────────────────────────────

import { FilterField } from "@/lib/views";
import {
  PROPERTY_ASSET_CLASS_OPTIONS,
  PROPERTY_DEAL_TYPE_OPTIONS,
  PROPERTY_RELATIONSHIP_STATUS_OPTIONS,
  toSelectOptions,
} from "@/lib/fieldOptions";

// Pipeline-specific filter fields (excludes deal_stage — those are the columns)
export const PIPELINE_PROPERTY_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: ["contains", "equals"] },
  { key: "city", label: "City", type: "text", operators: ["contains", "equals"] },
  { key: "state", label: "State", type: "text", operators: ["equals"] },
  { key: "county", label: "County", type: "text", operators: ["contains", "equals"] },
  { key: "asset_class", label: "Asset Class", type: "select", operators: ["is", "is_not"], options: toSelectOptions(PROPERTY_ASSET_CLASS_OPTIONS) },
  { key: "deal_type", label: "Deal Type", type: "select", operators: ["is", "is_not"], options: toSelectOptions(PROPERTY_DEAL_TYPE_OPTIONS) },
  { key: "relationship_status", label: "Relationship", type: "select", operators: ["is", "is_not"], options: toSelectOptions(PROPERTY_RELATIONSHIP_STATUS_OPTIONS) },
  { key: "asking_price", label: "Asking Price", type: "number", operators: ["gte", "lte"] },
  { key: "sales_owner", label: "Sales Owner", type: "text", operators: ["contains", "equals"] },
];

// Pipeline-specific filter fields for businesses (excludes stage — those are the columns)
export const PIPELINE_BUSINESS_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", type: "text", operators: ["contains", "equals"] },
  { key: "city", label: "City", type: "text", operators: ["contains", "equals"] },
  { key: "county", label: "County", type: "text", operators: ["contains", "equals"] },
  { key: "acquisition_fit_score", label: "Fit Score", type: "number", operators: ["gte", "lte", "gt", "lt", "equals"] },
  { key: "estimated_annual_profit", label: "Est. Profit", type: "number", operators: ["gte", "lte"] },
  { key: "medicare_certified", label: "Medicare Certified", type: "boolean", operators: ["is_true", "is_false"] },
  { key: "pe_backed", label: "PE Backed", type: "boolean", operators: ["is_true", "is_false"] },
  { key: "cms_star_rating", label: "CMS Stars", type: "number", operators: ["gte", "lte"] },
];

export const ACTIVE_PROPERTY_DEAL_STAGES = [
  "Not Contacted",
  "Attempting to Contact",
  "Needs Contact Enrichment",
  "Marketed Listing - Not Contacted",
  "Pursuing Owner Via Another Property",
  "Information Gathering",
  "Following Up - No Relationship",
  "Following Up - Warm Relationship",
  "Needs Underwriting",
  "Underwriting",
  "Needs Offer - No Info / Cold Offer",
  "Needs Offer",
  "Negotiating",
  "Negotiating - Long Process / Strong Relationship",
  "Need to Visit - Post Offer",
  "Under Contract",
  "Broker Disclosed - Check Notes",
  "Acquired",
] as const;

// Stages shown by default in the pipeline kanban (more actionable ones)
export const DEFAULT_VISIBLE_PROPERTY_STAGES: string[] = [
  "Not Contacted",
  "Attempting to Contact",
  "Needs Contact Enrichment",
  "Marketed Listing - Not Contacted",
  "Pursuing Owner Via Another Property",
  "Information Gathering",
  "Following Up - No Relationship",
  "Following Up - Warm Relationship",
  "Needs Underwriting",
  "Underwriting",
  "Needs Offer - No Info / Cold Offer",
  "Needs Offer",
  "Negotiating",
  "Negotiating - Long Process / Strong Relationship",
  "Need to Visit - Post Offer",
  "Under Contract",
  "Broker Disclosed - Check Notes",
  "Acquired",
];

// Short display names for column headers
export const DEAL_STAGE_LABELS: Record<string, string> = {
  "Not Contacted": "Not Contacted",
  "Attempting to Contact": "Attempting Contact",
  "Needs Contact Enrichment": "Needs Enrichment",
  "Marketed Listing - Not Contacted": "Listed (No Contact)",
  "Pursuing Owner Via Another Property": "Via Other Property",
  "Information Gathering": "Info Gathering",
  "Following Up - No Relationship": "Following Up (Cold)",
  "Following Up - Warm Relationship": "Following Up (Warm)",
  "Needs Underwriting": "Needs Underwriting",
  "Underwriting": "Underwriting",
  "Needs Offer - No Info / Cold Offer": "Cold Offer Needed",
  "Needs Offer": "Needs Offer",
  "Negotiating": "Negotiating",
  "Negotiating - Long Process / Strong Relationship": "Negotiating (Long)",
  "Need to Visit - Post Offer": "Visit Needed",
  "Under Contract": "Under Contract",
  "Broker Disclosed - Check Notes": "Broker Disclosed",
  "Acquired": "Acquired",
};

// Column header colors
export const DEAL_STAGE_COLORS: Record<string, string> = {
  "Not Contacted": "bg-gray-100 text-gray-600",
  "Attempting to Contact": "bg-slate-100 text-slate-700",
  "Needs Contact Enrichment": "bg-slate-100 text-slate-700",
  "Marketed Listing - Not Contacted": "bg-slate-100 text-slate-700",
  "Pursuing Owner Via Another Property": "bg-slate-100 text-slate-700",
  "Information Gathering": "bg-blue-100 text-blue-700",
  "Following Up - No Relationship": "bg-indigo-100 text-indigo-700",
  "Following Up - Warm Relationship": "bg-violet-100 text-violet-700",
  "Needs Underwriting": "bg-amber-100 text-amber-700",
  "Underwriting": "bg-amber-100 text-amber-700",
  "Needs Offer - No Info / Cold Offer": "bg-orange-100 text-orange-700",
  "Needs Offer": "bg-orange-100 text-orange-700",
  "Negotiating": "bg-rose-100 text-rose-700",
  "Negotiating - Long Process / Strong Relationship": "bg-rose-100 text-rose-700",
  "Need to Visit - Post Offer": "bg-pink-100 text-pink-700",
  "Under Contract": "bg-emerald-100 text-emerald-700",
  "Broker Disclosed - Check Notes": "bg-teal-100 text-teal-700",
  "Acquired": "bg-green-200 text-green-800",
};
