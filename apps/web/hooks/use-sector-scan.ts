"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { allSectorIds, type SectorChainState } from "@lunarlease/shared";
import {
  isListedForSale,
  isOwnedBy,
  isRentable,
  isRentedBy,
  sortBySectorId,
} from "@/lib/sector-state";
import { useNow } from "./use-now";
import { useSectors, type ManySectorsQuery } from "./use-sector";

const ALL_SECTOR_IDS: readonly number[] = allSectorIds();

export function useAllSectors(options: { enabled?: boolean } = {}): ManySectorsQuery {
  return useSectors(ALL_SECTOR_IDS, {
    enabled: options.enabled ?? true,
    staleTime: 20_000,
  });
}

export interface SectorFilterResult extends Omit<ManySectorsQuery, "sectors"> {
  readonly sectors: readonly SectorChainState[] | undefined;
  readonly matches: readonly SectorChainState[] | undefined;
}

function useFilteredSectors(
  predicate: (sector: SectorChainState) => boolean,
  options: { enabled?: boolean } = {},
): SectorFilterResult {
  const query = useAllSectors(options);

  const matches = useMemo(() => {
    if (query.sectors === undefined) return undefined;
    return query.sectors.filter(predicate).sort(sortBySectorId);
  }, [query.sectors, predicate]);

  return { ...query, matches };
}

export function useOwnedSectors(): SectorFilterResult {
  const { address } = useAccount();
  const predicate = useMemo(
    () => (sector: SectorChainState) => isOwnedBy(sector, address),
    [address],
  );
  return useFilteredSectors(predicate, { enabled: address !== undefined });
}

export function useRentedByMeSectors(): SectorFilterResult {
  const { address } = useAccount();
  const now = useNow(15_000);
  const predicate = useMemo(
    () => (sector: SectorChainState) => isRentedBy(sector, address, now),
    [address, now],
  );
  return useFilteredSectors(predicate, { enabled: address !== undefined });
}

export function useForSaleSectors(): SectorFilterResult {
  const predicate = useMemo(() => (sector: SectorChainState) => isListedForSale(sector), []);
  return useFilteredSectors(predicate);
}

export function useRentableSectors(): SectorFilterResult {
  const now = useNow(15_000);
  const predicate = useMemo(
    () => (sector: SectorChainState) => isRentable(sector, now),
    [now],
  );
  return useFilteredSectors(predicate);
}
