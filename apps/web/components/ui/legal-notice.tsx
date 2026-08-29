import { cn } from "@/lib/cn";
import { LEGAL_NOTICE } from "@/lib/legal";

export function LegalNotice({ className }: { readonly className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-white/45", className)}>
      {LEGAL_NOTICE}
    </p>
  );
}

export function LegalNoticeCallout({ className }: { readonly className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5",
        className,
      )}
    >
      <p className="text-[11px] font-semibold tracking-wide text-amber-200/80 uppercase">
        Before you confirm
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-100/70">{LEGAL_NOTICE}</p>
    </div>
  );
}
