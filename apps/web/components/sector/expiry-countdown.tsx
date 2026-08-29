"use client";

import { useNow } from "@/hooks/use-now";
import { formatSecondsRemaining, formatUnixTimestamp } from "@/lib/format";

export function ExpiryCountdown({
  expiresAt,
  showAbsolute = false,
}: {
  readonly expiresAt: bigint;
  readonly showAbsolute?: boolean;
}) {
  const now = useNow();
  const remaining = expiresAt > now ? expiresAt - now : 0n;

  if (expiresAt === 0n) return <span className="text-white/40">—</span>;

  return (
    <span className="inline-flex flex-col items-end">
      <span className={remaining > 0n ? "numeric text-purple-200" : "text-white/40"}>
        {formatSecondsRemaining(remaining)}
      </span>
      {showAbsolute ? (
        <span className="text-[11px] text-white/35">{formatUnixTimestamp(expiresAt)}</span>
      ) : null}
    </span>
  );
}
