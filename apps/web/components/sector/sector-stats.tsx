"use client";

import {
  deriveVisualState,
  formatLatitudeRange,
  formatLongitudeRange,
  getSectorInfo,
  isRentalActive,
  type SectorChainState,
} from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import { formatMun } from "@/lib/format";
import { DataList, DataRow } from "@/components/ui/data-row";
import { SectorStateBadge } from "@/components/ui/badge";
import { AddressDisplay } from "./address-display";
import { ExpiryCountdown } from "./expiry-countdown";

export function SectorStats({ sector }: { readonly sector: SectorChainState }) {
  const now = useNow(5_000);
  const info = getSectorInfo(sector.sectorId);
  const visualState = deriveVisualState(sector, { at: now });
  const rentalActive = isRentalActive(sector.userExpires, now);

  return (
    <DataList>
      <DataRow label="Sector">
        <span className="numeric">#{sector.sectorId}</span>
      </DataRow>
      <DataRow label="Status">
        <SectorStateBadge state={visualState} />
      </DataRow>
      <DataRow label="Latitude">
        <span className="numeric">{formatLatitudeRange(info.bounds)}</span>
      </DataRow>
      <DataRow label="Longitude">
        <span className="numeric">{formatLongitudeRange(info.bounds)}</span>
      </DataRow>
      <DataRow label="Grid index">
        <span className="numeric text-white/55">
          lat {info.latitudeIndex} · lon {info.longitudeIndex}
        </span>
      </DataRow>
      <DataRow label="Owner">
        {sector.minted ? (
          <AddressDisplay address={sector.owner} />
        ) : (
          <span className="text-white/35">unclaimed</span>
        )}
      </DataRow>
      <DataRow label="Rental price">
        {sector.pricePerDay > 0n ? (
          <span className="numeric">{formatMun(sector.pricePerDay)} / day</span>
        ) : (
          <span className="text-white/35">not set</span>
        )}
      </DataRow>
      <DataRow label="Renting enabled">
        <span className={sector.rentEnabled ? "text-emerald-300" : "text-white/40"}>
          {sector.rentEnabled ? "yes" : "no"}
        </span>
      </DataRow>
      <DataRow label="Current renter">
        {rentalActive ? (
          <AddressDisplay address={sector.user} />
        ) : (
          <span className="text-white/35">none</span>
        )}
      </DataRow>
      <DataRow label="Rental expires">
        {rentalActive ? (
          <ExpiryCountdown expiresAt={sector.userExpires} showAbsolute />
        ) : (
          <span className="text-white/35">—</span>
        )}
      </DataRow>
      <DataRow label="Sale price">
        {sector.saleEnabled && sector.salePrice > 0n ? (
          <span className="numeric text-amber-200">{formatMun(sector.salePrice)}</span>
        ) : (
          <span className="text-white/35">not listed</span>
        )}
      </DataRow>
    </DataList>
  );
}
