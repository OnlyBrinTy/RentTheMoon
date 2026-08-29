import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "panel-surface rounded-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-32px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-white/5 px-5 py-4",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn("text-sm font-semibold tracking-wide text-white/90", className)}>
      {children}
    </h2>
  );
}

export function CardSubtitle({ children, className }: CardProps) {
  return <p className={cn("text-xs text-white/45", className)}>{children}</p>;
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
