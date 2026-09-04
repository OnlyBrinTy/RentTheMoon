"use client";

import { useCallback } from "react";
import { useSimulateContract, useWriteContract } from "wagmi";
import type { Address } from "@lunarlease/shared";
import { ZERO_ADDRESS } from "@lunarlease/shared";
import { marketplaceBase, useConnectedAccount } from "./use-marketplace-contract";
import type { TransactionFlow } from "./use-write-lifecycle";
import { useWriteLifecycle } from "./use-write-lifecycle";

export function useTopUpBalance(
  nativeValue: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { account, ready } = useConnectedAccount();
  const enabled = ready && nativeValue !== undefined && nativeValue > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "popUpBalance",
    args: [account ?? ZERO_ADDRESS],
    value: nativeValue ?? 0n,
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

export function useSendMun(
  to: Address | undefined,
  amountMun: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { account, ready } = useConnectedAccount();
  const enabled = ready && to !== undefined && amountMun !== undefined && amountMun > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "sendMUN",
    args: [to ?? ZERO_ADDRESS, amountMun ?? 0n],
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

export function useClaimFarmedBalance(
  farmed: bigint | undefined,
  onConfirmed?: () => void,
): TransactionFlow {
  const { account, ready } = useConnectedAccount();
  const enabled = ready && farmed !== undefined && farmed > 0n;

  const simulation = useSimulateContract({
    ...marketplaceBase,
    account,
    functionName: "claimFarmedBalance",
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
