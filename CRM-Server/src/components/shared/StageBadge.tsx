import { cn } from "@/lib/utils";

interface StageBadgeProps {
  stage: string | null | undefined;
  className?: string;
}

const STAGE_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Prospect:    { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
  Contacted:   { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-400" },
  Interested:  { bg: "bg-violet-50",   text: "text-violet-700",  dot: "bg-violet-400" },
  "NDA Signed":{ bg: "bg-indigo-50",   text: "text-indigo-700",  dot: "bg-indigo-400" },
  LOI:         { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400" },
  Closed:      { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  Pass:        { bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-400" },
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  if (!stage) return null;
  const cfg = STAGE_CONFIG[stage] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        cfg.bg, cfg.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {stage}
    </span>
  );
}
