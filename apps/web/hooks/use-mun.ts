"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  farmingRateMunPerDay,
  projectedFarmedMun,
  ZERO_ADDRESS,
  type OwnershipPeriod,
} from "@lunarlease/shared";
import { moonLandRegistryAbi } from "@/lib/abi/registry";
import { moonMarketplaceAbi } from "@/lib/abi/marketplace";
import {
  activeChainId,
  contractsConfigured,
  marketplaceAddress,
  registryAddress,
} from "@/lib/config";
import { useNow } from "./use-now";

export interface MunBalanceQuery {
  readonly balance: bigint | undefined;
  readonly isLoading: boolean;
}

export function useMunBalance(): MunBalanceQuery {
  const { address } = useAccount();

  const query = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "getMUNBalance",
    args: [address ?? ZERO_ADDRESS],
    chainId: activeChainId,
    query: { enabled: contractsConfigured && address !== undefined, staleTime: 10_000 },
  });

  return {
    balance: query.data,
    isLoading: contractsConfigured && address !== undefined && query.isPending,
  };
}

export interface OwnershipPeriodsQuery {
  readonly periods: readonly OwnershipPeriod[] | undefined;
  readonly isLoading: boolean;
}

export function useOwnershipPeriods(): OwnershipPeriodsQuery {
  const { address } = useAccount();

  const query = useReadContract({
    address: registryAddress,
    abi: moonLandRegistryAbi,
    functionName: "getOwnershipPeriods",
    args: [address ?? ZERO_ADDRESS],
    chainId: activeChainId,
    query: { enabled: contractsConfigured && address !== undefined, staleTime: 15_000 },
  });

  const periods = useMemo(
    () =>
      query.data?.map((period) => ({
        start: period.start,
        expiry: period.expiry,
      })),
    [query.data],
  );

  return {
    periods,
    isLoading: contractsConfigured && address !== undefined && query.isPending,
  };
}

export interface FarmingQuery {
  readonly settled: bigint | undefined;
  readonly projected: bigint | undefined;
  readonly ratePerDay: bigint | undefined;
  readonly checkpoint: bigint | undefined;
  readonly periods: readonly OwnershipPeriod[] | undefined;
  readonly isLoading: boolean;
}

export function useFarming(): FarmingQuery {
  const { address } = useAccount();
  const now = useNow(5_000);
  const enabled = contractsConfigured && address !== undefined;

  const farmed = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "farmedBalance",
    args: [address ?? ZERO_ADDRESS],
    chainId: activeChainId,
    query: { enabled, staleTime: 10_000 },
  });

  const checkpoint = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "farmCheckpoint",
    args: [address ?? ZERO_ADDRESS],
    chainId: activeChainId,
    query: { enabled, staleTime: 10_000 },
  });

  const { periods, isLoading: periodsLoading } = useOwnershipPeriods();

  const projected = useMemo(() => {
    if (periods === undefined || checkpoint.data === undefined) return undefined;
    return projectedFarmedMun(periods, checkpoint.data, now);
  }, [periods, checkpoint.data, now]);

  const ratePerDay = useMemo(() => {
    if (periods === undefined) return undefined;
    return farmingRateMunPerDay(periods, now);
  }, [periods, now]);

  return {
    settled: farmed.data,
    projected,
    ratePerDay,
    checkpoint: checkpoint.data,
    periods,
    isLoading: enabled && (farmed.isPending || checkpoint.isPending || periodsLoading),
  };
}
