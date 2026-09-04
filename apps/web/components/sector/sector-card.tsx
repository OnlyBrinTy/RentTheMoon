"use client";

import Link from "next/link";
import {
  deriveVisualState,
  formatSectorCoordinates,
  isRentalActive,
  type SectorChainState,
} from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import { formatMun } from "@/lib/format";
import { sectorVisualStyles } from "@/lib/sector-visuals";
import { SectorStateBadge } from "@/components/ui/badge";
import { ExpiryCountdown } from "./expiry-countdown";

export function SectorCard({ sector }: { readonly sector: SectorChainState }) {
  const now = useNow(5_000);
  const visualState = deriveVisualState(sector, { at: now });
  const style = sectorVisualStyles[visualState];
  const rentalActive = isRentalActive(sector.userExpires, now);

  return (
    <Link
      href={`/sector/${sector.sectorId}`}
      className="group panel-surface relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 transition-colors hover:border-white/20"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${style.hex}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="numeric text-lg font-semibold text-white/95">
            #{sector.sectorId}
          </p>
          <p className="numeric mt-0.5 text-[11px] text-white/40">
            {formatSectorCoordinates(sector.sectorId)}
          </p>
        </div>
        <SectorStateBadge state={visualState} />
      </div>

      <dl className="space-y-1.5 text-xs">
        {sector.pricePerDay > 0n ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/40">Rent</dt>
            <dd className="numeric text-white/80">
              {formatMun(sector.pricePerDay)} / day
            </dd>
          </div>
        ) : null}
        {sector.saleEnabled && sector.salePrice > 0n ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/40">Sale</dt>
            <dd className="numeric text-amber-200">{formatMun(sector.salePrice)}</dd>
          </div>
        ) : null}
        {rentalActive ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/40">Expires in</dt>
            <dd>
              <ExpiryCountdown expiresAt={sector.userExpires} />
            </dd>
          </div>
        ) : null}
      </dl>

      <span className="mt-auto text-[11px] font-semibold text-sky-300/70 transition-colors group-hover:text-sky-200">
        View sector →
      </span>
    </Link>
  );
}

export function SectorCardGrid({
  sectors,
}: {
  readonly sectors: readonly SectorChainState[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sectors.map((sector) => (
        <SectorCard key={sector.sectorId} sector={sector} />
      ))}
    </div>
  );
}
