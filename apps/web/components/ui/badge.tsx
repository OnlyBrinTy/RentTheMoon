import type { ReactNode } from "react";
import type { SectorVisualState } from "@lunarlease/shared";
import { cn } from "@/lib/cn";
import { sectorVisualStyles } from "@/lib/sector-visuals";

export function Badge({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectorStateBadge({ state }: { readonly state: SectorVisualState }) {
  const style = sectorVisualStyles[state];
  return (
    <Badge className={style.badgeClassName}>
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: style.hex }}
      />
      {style.label}
    </Badge>
  );
}
