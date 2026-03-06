import { cn, fitScoreBadgeColor } from "@/lib/utils";

interface FitScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export function FitScoreBadge({ score, size = "md" }: FitScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5 font-bold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold",
        fitScoreBadgeColor(score),
        sizeClasses[size]
      )}
    >
      {score !== null && score !== undefined ? `${score}/10` : "N/A"}
    </span>
  );
}
