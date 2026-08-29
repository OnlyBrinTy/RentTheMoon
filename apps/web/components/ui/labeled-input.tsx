"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LabeledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  readonly suffix?: ReactNode;
  readonly hint?: ReactNode;
  readonly invalid?: boolean;
}

export function LabeledInput({
  label,
  suffix,
  hint,
  invalid = false,
  className,
  ...rest
}: LabeledInputProps) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">
        {label}
      </span>
      <span
        className={cn(
          "mt-1.5 flex items-center gap-2 rounded-lg border bg-black/30 px-3 transition-colors focus-within:border-sky-400/50",
          invalid ? "border-rose-400/50" : "border-white/12",
        )}
      >
        <input
          {...rest}
          className={cn(
            "numeric h-9 w-full min-w-0 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/25",
            className,
          )}
        />
        {suffix ? (
          <span className="shrink-0 text-xs font-semibold text-white/40">{suffix}</span>
        ) : null}
      </span>
      {hint ? <span className="mt-1 block text-[11px] text-white/40">{hint}</span> : null}
    </label>
  );
}
