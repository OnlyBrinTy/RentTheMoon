"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { isValidSectorId, type SectorChainState } from "@lunarlease/shared";
import { moonMarketplaceAbi } from "@/lib/abi/marketplace";
import { activeChainId, contractsConfigured, marketplaceAddress } from "@/lib/config";
import { toSectorChainState, type SectorViewResult } from "@/lib/sector-state";

export const SECTOR_READ_CHUNK_SIZE = 216;

export function chunkSectorIds(
  sectorIds: readonly number[],
  size: number = SECTOR_READ_CHUNK_SIZE,
): number[][] {
  const chunks: number[][] = [];
  for (let index = 0; index < sectorIds.length; index += size) {
    chunks.push(sectorIds.slice(index, index + size));
  }
  return chunks;
}

export interface SingleSectorQuery {
  readonly sector: SectorChainState | undefined;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

export function useSector(sectorId: number | undefined): SingleSectorQuery {
  const isValid = sectorId !== undefined && isValidSectorId(sectorId);
  const enabled = contractsConfigured && isValid;

  const query = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "getSector",
    args: [BigInt(sectorId ?? 0)],
    chainId: activeChainId,
    query: { enabled, staleTime: 8_000 },
  });

  const sector = useMemo(
    () => (query.data === undefined ? undefined : toSectorChainState(query.data)),
    [query.data],
  );

  return {
    sector,
    isLoading: enabled && query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface ManySectorsQuery {
  readonly sectors: readonly SectorChainState[] | undefined;
  readonly sectorsById: ReadonlyMap<number, SectorChainState> | undefined;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly loadedChunks: number;
  readonly totalChunks: number;
  readonly refetch: () => void;
}

function readSectorViews(result: unknown): SectorViewResult[] {
  if (!Array.isArray(result)) return [];
  return result as SectorViewResult[];
}

export function useSectors(
  sectorIds: readonly number[],
  options: { enabled?: boolean; staleTime?: number } = {},
): ManySectorsQuery {
  const chunks = useMemo(() => chunkSectorIds(sectorIds), [sectorIds]);

  const contracts = useMemo(
    () =>
      chunks.map((chunk) => ({
        address: marketplaceAddress,
        abi: moonMarketplaceAbi,
        functionName: "getSectors" as const,
        args: [chunk.map((id) => BigInt(id))] as const,
        chainId: activeChainId,
      })),
    [chunks],
  );

  const enabled =
    contractsConfigured && contracts.length > 0 && (options.enabled ?? true);

  const query = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled,
      staleTime: options.staleTime ?? 15_000,
      gcTime: 120_000,
    },
  });

  const { sectors, sectorsById, loadedChunks } = useMemo(() => {
    if (query.data === undefined) {
      return { sectors: undefined, sectorsById: undefined, loadedChunks: 0 };
    }

    const collected: SectorChainState[] = [];
    let succeeded = 0;

    for (const entry of query.data) {
      if (entry.status !== "success") continue;
      succeeded += 1;
      for (const view of readSectorViews(entry.result)) {
        collected.push(toSectorChainState(view));
      }
    }

    const byId = new Map<number, SectorChainState>();
    for (const sector of collected) byId.set(sector.sectorId, sector);

    return { sectors: collected, sectorsById: byId, loadedChunks: succeeded };
  }, [query.data]);

  return {
    sectors,
    sectorsById,
    isLoading: enabled && query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    loadedChunks,
    totalChunks: contracts.length,
    refetch: () => {
      void query.refetch();
    },
  };
}
