import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="panel-surface flex flex-col items-center gap-3 rounded-2xl px-6 py-14 text-center">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/25 to-purple-500/15 blur-md" />
        <div className="relative size-12 rounded-full border border-white/10 bg-white/5" />
      </div>
      <h3 className="text-base font-semibold text-white/90">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-white/50">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
