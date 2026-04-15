import { cn } from "../../lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  dot?: boolean;
}

export function Badge({ children, className, variant = "default", dot }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide",
      variant === "default"     && "bg-primary/[0.12] text-primary",
      variant === "secondary"   && "bg-secondary text-secondary-foreground",
      variant === "destructive" && "bg-destructive/[0.12] text-destructive",
      variant === "outline"     && "border border-border text-foreground bg-transparent",
      className
    )}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-80" />
      )}
      {children}
    </span>
  );
}
