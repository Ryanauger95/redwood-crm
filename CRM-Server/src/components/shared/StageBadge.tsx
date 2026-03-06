import { cn, STAGE_COLORS } from "@/lib/utils";

interface StageBadgeProps {
  stage: string | null | undefined;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  if (!stage) return null;
  const colorClass = STAGE_COLORS[stage] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className
      )}
    >
      {stage}
    </span>
  );
}
