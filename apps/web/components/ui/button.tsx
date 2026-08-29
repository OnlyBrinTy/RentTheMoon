"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isLoading?: boolean;
  readonly children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-500 text-slate-950 hover:bg-sky-400 focus-visible:outline-sky-300 disabled:bg-sky-500/30 disabled:text-slate-950/50",
  secondary:
    "bg-white/8 text-white/90 ring-1 ring-inset ring-white/12 hover:bg-white/14 focus-visible:outline-white/40 disabled:text-white/35",
  ghost:
    "bg-transparent text-white/70 hover:bg-white/8 hover:text-white focus-visible:outline-white/30 disabled:text-white/30",
  danger:
    "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30 hover:bg-rose-500/25 focus-visible:outline-rose-300 disabled:text-rose-200/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}
