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
