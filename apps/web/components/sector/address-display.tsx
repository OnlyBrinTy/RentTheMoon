"use client";

import { useAccount } from "wagmi";
import type { Address } from "@lunarlease/shared";
import { explorerAddressUrl } from "@/lib/config";
import { isZeroAddress, truncateAddress } from "@/lib/format";

export function AddressDisplay({
  address,
  size = 4,
}: {
  readonly address: Address | undefined;
  readonly size?: number;
}) {
  const { address: connected } = useAccount();

  if (isZeroAddress(address) || address === undefined) {
    return <span className="text-white/35">—</span>;
  }

  const isYou = connected?.toLowerCase() === address.toLowerCase();
  const href = explorerAddressUrl(address);
  const label = truncateAddress(address, size);

  return (
    <span className="inline-flex items-center gap-1.5">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="numeric text-white/85 underline decoration-dotted underline-offset-2 hover:text-sky-200"
        >
          {label}
        </a>
      ) : (
        <span className="numeric text-white/85">{label}</span>
      )}
      {isYou ? (
        <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1 py-px text-[10px] font-bold tracking-wide text-sky-200 uppercase">
          you
        </span>
      ) : null}
    </span>
  );
}
