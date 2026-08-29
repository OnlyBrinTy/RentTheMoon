"use client";

import { cn } from "@/lib/cn";
import { explorerTxUrl } from "@/lib/config";
import type { TransactionFlow, TransactionPhase } from "@/hooks/use-write-lifecycle";
import { Spinner } from "./spinner";

const phaseLabels: Record<TransactionPhase, string> = {
  idle: "",
  preparing: "Simulating transaction…",
  blocked: "Cannot submit",
  ready: "",
  signing: "Waiting for wallet signature…",
  confirming: "Confirming on chain…",
  success: "Transaction confirmed",
  error: "Transaction failed",
};

const phaseTone: Record<TransactionPhase, string> = {
  idle: "",
  preparing: "border-white/10 bg-white/5 text-white/60",
  blocked: "border-amber-400/25 bg-amber-400/8 text-amber-100/80",
  ready: "",
  signing: "border-sky-400/25 bg-sky-400/8 text-sky-100/85",
  confirming: "border-sky-400/25 bg-sky-400/8 text-sky-100/85",
  success: "border-emerald-400/25 bg-emerald-400/8 text-emerald-100/85",
  error: "border-rose-400/25 bg-rose-400/8 text-rose-100/85",
};

export function TransactionStatus({
  flow,
  className,
}: {
  readonly flow: TransactionFlow;
  readonly className?: string;
}) {
  if (flow.phase === "idle" || flow.phase === "ready") return null;
  if (flow.phase === "preparing") return null;

  const detail =
    flow.phase === "blocked" ? flow.blockedReason : (flow.errorMessage ?? undefined);
  const explorerHref = flow.hash ? explorerTxUrl(flow.hash) : undefined;
  const isBusy = flow.phase === "signing" || flow.phase === "confirming";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-xs leading-relaxed",
        phaseTone[flow.phase],
        className,
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        {isBusy ? <Spinner /> : null}
        <span>{phaseLabels[flow.phase]}</span>
      </div>
      {detail ? <p className="mt-1 opacity-80">{detail}</p> : null}
      {explorerHref ? (
        <a
          href={explorerHref}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block font-semibold underline decoration-dotted underline-offset-2 opacity-80 hover:opacity-100"
        >
          View transaction
        </a>
      ) : null}
      {flow.hash && !explorerHref ? (
        <p className="numeric mt-1.5 truncate opacity-60">{flow.hash}</p>
      ) : null}
    </div>
  );
}
