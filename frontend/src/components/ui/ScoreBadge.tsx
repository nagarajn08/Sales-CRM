import { cn } from "../../lib/utils";

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 40) return "Active";
  if (score >= 20) return "Cold";
  return "Low";
}

function scoreColors(score: number): string {
  if (score >= 80) return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800";
  if (score >= 40) return "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800";
  if (score >= 20) return "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800";
  return "bg-secondary text-muted-foreground border-border";
}

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  if (score === null || score === undefined) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold rounded-full border tabular-nums",
      size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1",
      scoreColors(score)
    )}>
      <span className={cn(
        "rounded-full",
        size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5",
        score >= 80 ? "bg-red-500" :
        score >= 60 ? "bg-amber-500" :
        score >= 40 ? "bg-blue-500" :
        score >= 20 ? "bg-sky-500" : "bg-muted-foreground"
      )} />
      {score}
      {size === "md" && <span className="font-normal opacity-70">— {scoreLabel(score)}</span>}
    </span>
  );
}
