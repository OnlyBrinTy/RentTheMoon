"use client";

import { useCallback } from "react";
import { useSimulateContract, useWriteContract } from "wagmi";
import { marketplaceBase, useConnectedAccount } from "./use-marketplace-contract";
import type { TransactionFlow } from "./use-write-lifecycle";
import { useWriteLifecycle } from "./use-write-lifecycle";

export function useAcquireSector(
  sectorId: number | undefined,
  price: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { account, ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && price !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "acquireSector",
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

export function useSetRentalPrice(
  sectorId: number | undefined,
  pricePerDay: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { account, ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && pricePerDay !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
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
  const { account, ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
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
  const { account, ready } = useConnectedAccount();
  const enabled =
    ready &&
    sectorId !== undefined &&
    numberOfDays !== undefined &&
    totalPrice !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "rentSector",
    args: [BigInt(sectorId ?? 0), numberOfDays ?? 1n],
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
  const { account, ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined && price !== undefined && price > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
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
  const { account, ready } = useConnectedAccount();
  const enabled = ready && sectorId !== undefined;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
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
  const { account, ready } = useConnectedAccount();
  const enabled =
    ready && sectorId !== undefined && salePrice !== undefined && salePrice > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "buyListedSector",
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
