"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useMunBalance } from "@/hooks/use-mun";
import { formatMun } from "@/lib/format";

export function MunBalanceNotice({ required }: { readonly required: bigint | undefined }) {
  const { isConnected } = useAccount();
  const { balance, isLoading } = useMunBalance();

  if (!isConnected) return null;

  const shortfall =
    required !== undefined && balance !== undefined && balance < required
      ? required - balance
      : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-white/45">Your MUN balance</span>
        <span className="numeric text-sm font-semibold text-white/80">
          {isLoading || balance === undefined ? "…" : formatMun(balance, 6)}
        </span>
      </div>
      {shortfall !== undefined ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/75">
          You need {formatMun(shortfall, 6)} more.{" "}
          <Link href="/wallet" className="font-semibold underline underline-offset-2">
            Top up your balance
          </Link>{" "}
          before continuing.
        </p>
      ) : null}
    </div>
  );
}
