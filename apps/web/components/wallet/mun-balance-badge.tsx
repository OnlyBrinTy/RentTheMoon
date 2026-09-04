"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useMunBalance } from "@/hooks/use-mun";
import { contractsConfigured } from "@/lib/config";
import { formatMun } from "@/lib/format";

export function MunBalanceBadge() {
  const { isConnected } = useAccount();
  const { balance, isLoading } = useMunBalance();

  if (!isConnected || !contractsConfigured) return null;

  return (
    <Link
      href="/wallet"
      title="Manage your MUN balance"
      className="numeric hidden h-8 items-center gap-1.5 rounded-lg border border-white/12 bg-white/6 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-white/12 sm:inline-flex"
    >
      {isLoading || balance === undefined ? "…" : formatMun(balance, 2)}
    </Link>
  );
}
