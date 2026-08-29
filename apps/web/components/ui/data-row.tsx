import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DataRowProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function DataRow({ label, children, className }: DataRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/5 py-2.5 last:border-b-0",
        className,
      )}
    >
      <dt className="shrink-0 text-xs text-white/40">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-white/85">{children}</dd>
    </div>
  );
}

export function DataList({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <dl className={cn("flex flex-col", className)}>{children}</dl>;
}
