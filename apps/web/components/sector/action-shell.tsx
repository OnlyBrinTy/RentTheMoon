import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ActionShellProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function ActionShell({
  title,
  description,
  children,
  className,
}: ActionShellProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/8 bg-white/[0.025] p-4",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
      ) : null}
      <div className="mt-3.5 space-y-3">{children}</div>
    </div>
  );
}
