import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        // Base
        "relative inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none select-none",

        // Default — primary gradient
        variant === "default" && [
          "bg-primary text-primary-foreground shadow-btn btn-shine overflow-hidden",
          "hover:shadow-btn-hover hover:-translate-y-px active:translate-y-0 active:shadow-btn",
        ],

        // Secondary
        variant === "secondary" && [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 active:bg-secondary/90",
        ],

        // Destructive
        variant === "destructive" && [
          "bg-destructive text-white shadow-btn btn-shine overflow-hidden",
          "hover:shadow-btn-hover hover:-translate-y-px active:translate-y-0",
        ],

        // Ghost
        variant === "ghost" && [
          "hover:bg-secondary text-foreground",
        ],

        // Outline
        variant === "outline" && [
          "border border-border bg-card text-foreground",
          "hover:bg-secondary hover:border-border/80 active:bg-secondary/80",
        ],

        // Sizes
        size === "sm"   && "px-3 py-1.5 text-xs h-8",
        size === "md"   && "px-4 py-2 text-sm h-9",
        size === "lg"   && "px-6 py-2.5 text-sm h-10",
        size === "icon" && "h-9 w-9 p-0",

        className
      )}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
