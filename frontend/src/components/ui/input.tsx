import React, { useState } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({ label, error, helpText, type, className, ...props }: InputProps) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {label}{props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={isPass ? (show ? "text" : "password") : type}
          className={cn(
            "w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-destructive/60 focus:ring-destructive/30" : "border-input hover:border-muted-foreground/30",
            isPass && "pr-10",
            className
          )}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? (
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            )}
          </button>
        )}
      </div>
      {helpText && !error && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</label>}
      <select
        {...props}
        className={cn(
          "w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/60",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-destructive/60" : "border-input hover:border-muted-foreground/30",
          className
        )}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, helpText, className, ...props }: InputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</label>}
      <textarea
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        className={cn(
          "w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/60",
          "disabled:opacity-50 min-h-[60px] resize-y",
          error ? "border-destructive/60" : "border-input hover:border-muted-foreground/30",
          className
        )}
      />
      {helpText && !error && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
