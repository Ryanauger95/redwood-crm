import { cn } from "@/lib/utils";

interface FitScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

function scoreConfig(score: number | null | undefined) {
  if (score == null) return { bg: "bg-gray-100", text: "text-gray-400", ring: "ring-gray-200", bar: "bg-gray-300" };
  if (score >= 9) return { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", bar: "bg-emerald-500" };
  if (score >= 7) return { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200", bar: "bg-green-500" };
  if (score >= 5) return { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", bar: "bg-amber-400" };
  if (score >= 3) return { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", bar: "bg-orange-400" };
  return { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", bar: "bg-red-400" };
}

export function FitScoreBadge({ score, size = "md" }: FitScoreBadgeProps) {
  const cfg = scoreConfig(score);

  if (size === "lg") {
    return (
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center justify-center w-10 h-10 rounded-full ring-2 font-bold text-lg", cfg.bg, cfg.text, cfg.ring)}>
          {score ?? "—"}
        </span>
        <div className="text-xs text-gray-400">/ 10</div>
      </div>
    );
  }

  if (size === "md") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 text-sm font-semibold", cfg.bg, cfg.text, cfg.ring)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.bar)} />
        {score != null ? `${score}/10` : "N/A"}
      </span>
    );
  }

  // sm
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 text-xs font-semibold", cfg.bg, cfg.text, cfg.ring)}>
      {score != null ? score : "—"}
    </span>
  );
}
