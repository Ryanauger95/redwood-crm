// ─── Single source of truth for all enum/dropdown fields ────────────────────
// Every field listed here has a matching DB CHECK constraint.
// Import from here when building any select/dropdown in the UI.

// ── Business ──────────────────────────────────────────────────────────────────

export const LICENSE_TYPE_OPTIONS = ["HHA", "IHCP"] as const;

export const PRIMARY_PAYOR_MIX_OPTIONS = [
  "Medicare",
  "Medicaid",
  "Private Pay",
  "Medicaid/Private Pay",
  "Medicare/Medicaid",
  "VA/Government",
  "Unknown",
] as const;

export const ENRICHMENT_STATUS_OPTIONS = [
  "pending",
  "completed",
  "failed",
  "rate_limit_exhausted",
] as const;

// ── Pipeline (HHA businesses) ─────────────────────────────────────────────────

export const PIPELINE_STAGE_OPTIONS = [
  "Prospect",
  "Contacted",
  "Interested",
  "NDA Signed",
  "LOI",
  "Closed",
  "Pass",
] as const;

// ── Activity ──────────────────────────────────────────────────────────────────

export const ACTIVITY_TYPE_OPTIONS = [
  "call",
  "email",
  "note",
  "task",
  "sms",
] as const;

export const ACTIVITY_STATUS_OPTIONS = ["open", "completed"] as const;

// ── Person (contacts) ─────────────────────────────────────────────────────────

export const CONTACT_TYPE_OPTIONS = ["Owner", "Broker"] as const;

export const CONTACT_STATUS_OPTIONS = ["New", "Contacted"] as const;

// ── Property ──────────────────────────────────────────────────────────────────

export const PROPERTY_ASSET_CLASS_OPTIONS = [
  "Industrial",
  "Self Storage",
  "Industrial - Single Tenant",
  "Industrial - Multi Tenant",
  "Vacant Land",
  "Office - Zoned Industrial",
  "Retail",
  "Land - Zoned Industrial",
  "Office",
  "Industrial - Lease Data",
  "Industrial - Outdoor Storage",
  "Land",
  "Storage - Land",
] as const;

export const PROPERTY_DEAL_STAGE_OPTIONS = [
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
  "Not Interested",
  "Not Interested - Unlikely Seller",
  "Not Interested - Private Equity / Large Corporation",
  "Not Interested - Too Small",
  "Not Interested - Sold Elsewhere",
  "Not Interested - Too Class-C",
  "Not Interested - Sophisticated",
  "Not Interested - Priced too High",
  "Not Interested - Boat / RV Rural",
  "Not Interested - Too Rural",
  "Not Interested - Office",
  "Not Interested - Too Nice",
  "Not Interested - Retail",
  'Not Interested - "Do Not Call" List',
  "Not Interested - Too Complex",
  "Not Interested - Redevelopment",
  "Not Interested - Industrial - Not functional",
  "Not Interested - 2020 Build",
  "Not Interested - 2021 Build",
  "Not Interested - Sports Facility",
  "Not Interested - Bad Area",
  "Not Interested - Too Urban",
  "Not really interested - maybe later",
] as const;

export const PROPERTY_DEAL_TYPE_OPTIONS = [
  "On Market - For Sale",
  "On Market - For Lease",
  "Off Market",
] as const;

export const PROPERTY_RELATIONSHIP_STATUS_OPTIONS = [
  "No Relationship",
  "Positive Relationship",
  "Great Relationship",
] as const;

export const PROPERTY_MOTIVATION_LEVEL_OPTIONS = [
  "Unknown",
  "Timing is Not Right",
  "Motivated",
  "Moderate Interest",
  "Pass to Kids",
  "Retiree Living on Site",
] as const;

export const PROPERTY_SALE_TIMELINE_OPTIONS = [
  "Unknown",
  "Not Interested Now - Maybe Next Year",
  "Not Interested Now - Maybe in a Few Years",
  "Not Interested Ever - Growth Mode / Private Equity",
  "Pass to Kids - Obituary Notice Set",
] as const;

export const PROPERTY_OWNERSHIP_TYPE_OPTIONS = [
  "Individual",
  "Corporation - Unclassified",
] as const;

export const PROPERTY_LETTER_STATUS_OPTIONS = [
  "Intro Letter Sent",
  "Needs Intro Letter Sent",
  "Custom Letter Sent",
  "Needs Intro Letter Prepared",
  "Custom Letter Needs Preparation",
] as const;

export const PROPERTY_COMMUNICATION_STATUS_OPTIONS = [
  "Spoke Briefly Over Phone",
  "Cannot Contact",
] as const;

export const PROPERTY_LEASE_DATA_TYPE_OPTIONS = [
  "Achieved Lease",
  "Asking Lease",
] as const;

// ── CRM Users ─────────────────────────────────────────────────────────────────

export const CRM_USER_ROLE_OPTIONS = ["admin", "agent", "viewer"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
// Convert a readonly string array to { value, label }[] for <select> options

export function toSelectOptions<T extends string>(
  arr: readonly T[]
): { value: T; label: T }[] {
  return arr.map((v) => ({ value: v, label: v }));
}
