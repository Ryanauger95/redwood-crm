import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  const num = typeof value === "bigint" ? Number(value) : value;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fitScoreColor(score: number | null | undefined): string {
  if (!score) return "bg-gray-100 text-gray-600";
  if (score >= 8) return "bg-green-100 text-green-700";
  if (score >= 5) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export function fitScoreBadgeColor(score: number | null | undefined): string {
  if (!score) return "border-gray-300 text-gray-500";
  if (score >= 8) return "border-green-400 text-green-700 bg-green-50";
  if (score >= 5) return "border-yellow-400 text-yellow-700 bg-yellow-50";
  return "border-red-400 text-red-700 bg-red-50";
}

export const PIPELINE_STAGES = [
  "Prospect",
  "Contacted",
  "Interested",
  "NDA Signed",
  "LOI",
  "Closed",
  "Pass",
] as const;

export type PipelineStageType = typeof PIPELINE_STAGES[number];

export const STAGE_COLORS: Record<string, string> = {
  Prospect: "bg-gray-100 text-gray-700",
  Contacted: "bg-blue-100 text-blue-700",
  Interested: "bg-purple-100 text-purple-700",
  "NDA Signed": "bg-indigo-100 text-indigo-700",
  LOI: "bg-orange-100 text-orange-700",
  Closed: "bg-green-100 text-green-700",
  Pass: "bg-red-100 text-red-700",
};

export const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "✉️",
  note: "📝",
  task: "✅",
  sms: "💬",
};

export const US_STATES = [
  { value: "AL", label: "AL – Alabama" }, { value: "AK", label: "AK – Alaska" },
  { value: "AZ", label: "AZ – Arizona" }, { value: "AR", label: "AR – Arkansas" },
  { value: "CA", label: "CA – California" }, { value: "CO", label: "CO – Colorado" },
  { value: "CT", label: "CT – Connecticut" }, { value: "DE", label: "DE – Delaware" },
  { value: "FL", label: "FL – Florida" }, { value: "GA", label: "GA – Georgia" },
  { value: "HI", label: "HI – Hawaii" }, { value: "ID", label: "ID – Idaho" },
  { value: "IL", label: "IL – Illinois" }, { value: "IN", label: "IN – Indiana" },
  { value: "IA", label: "IA – Iowa" }, { value: "KS", label: "KS – Kansas" },
  { value: "KY", label: "KY – Kentucky" }, { value: "LA", label: "LA – Louisiana" },
  { value: "ME", label: "ME – Maine" }, { value: "MD", label: "MD – Maryland" },
  { value: "MA", label: "MA – Massachusetts" }, { value: "MI", label: "MI – Michigan" },
  { value: "MN", label: "MN – Minnesota" }, { value: "MS", label: "MS – Mississippi" },
  { value: "MO", label: "MO – Missouri" }, { value: "MT", label: "MT – Montana" },
  { value: "NE", label: "NE – Nebraska" }, { value: "NV", label: "NV – Nevada" },
  { value: "NH", label: "NH – New Hampshire" }, { value: "NJ", label: "NJ – New Jersey" },
  { value: "NM", label: "NM – New Mexico" }, { value: "NY", label: "NY – New York" },
  { value: "NC", label: "NC – North Carolina" }, { value: "ND", label: "ND – North Dakota" },
  { value: "OH", label: "OH – Ohio" }, { value: "OK", label: "OK – Oklahoma" },
  { value: "OR", label: "OR – Oregon" }, { value: "PA", label: "PA – Pennsylvania" },
  { value: "RI", label: "RI – Rhode Island" }, { value: "SC", label: "SC – South Carolina" },
  { value: "SD", label: "SD – South Dakota" }, { value: "TN", label: "TN – Tennessee" },
  { value: "TX", label: "TX – Texas" }, { value: "UT", label: "UT – Utah" },
  { value: "VT", label: "VT – Vermont" }, { value: "VA", label: "VA – Virginia" },
  { value: "WA", label: "WA – Washington" }, { value: "WV", label: "WV – West Virginia" },
  { value: "WI", label: "WI – Wisconsin" }, { value: "WY", label: "WY – Wyoming" },
] as const;
