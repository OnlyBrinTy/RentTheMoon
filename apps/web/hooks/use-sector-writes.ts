"use client";

import { useCallback } from "react";
import { useAccount, useSimulateContract, useWriteContract } from "wagmi";
import { moonMarketplaceAbi } from "@/lib/abi/marketplace";
import { activeChainId, contractsConfigured, marketplaceAddress } from "@/lib/config";
import type { TransactionFlow } from "./use-write-lifecycle";
import { useWriteLifecycle } from "./use-write-lifecycle";

const marketplaceBase = {
  address: marketplaceAddress,
  abi: moonMarketplaceAbi,
  chainId: activeChainId,
} as const;

function useConnectedAccount(): { account: `0x${string}` | undefined; ready: boolean } {
  const { address, isConnected } = useAccount();
  return {
    account: address,
    ready: contractsConfigured && isConnected && address !== undefined,
  };
}

export function useAcquireSector(
  sectorId: number | undefined,
  price: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && price !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "acquireSector",
    args: [BigInt(sectorId ?? 0)],
    value: price ?? 0n,
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useSetRentalPrice(
  sectorId: number | undefined,
  pricePerDay: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && pricePerDay !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "setRentalPrice",
    args: [BigInt(sectorId ?? 0), pricePerDay ?? 0n],
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useSetRentEnabled(
  sectorId: number | undefined,
  enabledFlag: boolean,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "setRentEnabled",
    args: [BigInt(sectorId ?? 0), enabledFlag],
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useRentSector(
  sectorId: number | undefined,
  numberOfDays: bigint | undefined,
  totalPrice: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled =
    ready &&
    sectorId !== undefined &&
    numberOfDays !== undefined &&
    totalPrice !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "rentSector",
    args: [BigInt(sectorId ?? 0), numberOfDays ?? 1n],
    value: totalPrice ?? 0n,
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useListForSale(
  sectorId: number | undefined,
  price: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && price !== undefined && price > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "listForSale",
    args: [BigInt(sectorId ?? 0), price ?? 0n],
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useCancelListing(
  sectorId: number | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "cancelListing",
    args: [BigInt(sectorId ?? 0)],
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useBuyListedSector(
  sectorId: number | undefined,
  salePrice: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled =
    ready && sectorId !== undefined && salePrice !== undefined && salePrice > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "buyListedSector",
    args: [BigInt(sectorId ?? 0)],
    value: salePrice ?? 0n,
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}

export function useWithdrawRentalIncome(
  claimable: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { ready } = useConnectedAccount();
  const enabled = ready && claimable !== undefined && claimable > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    functionName: "withdrawRentalIncome",
    query: { enabled },
  });

  const write = useWriteContract();
  const lifecycle = useWriteLifecycle({
    enabled,
    isSimulating: simulation.isFetching,
    simulateError: simulation.error,
    hasRequest: simulation.data !== undefined,
    isSigning: write.isPending,
    writeError: write.error,
    hash: write.data,
    onConfirmed,
  });

  const submit = useCallback(() => {
    if (simulation.data === undefined) return;
    write.writeContract(simulation.data.request);
  }, [simulation.data, write]);

  return { ...lifecycle, hash: write.data, submit, reset: write.reset };
}
