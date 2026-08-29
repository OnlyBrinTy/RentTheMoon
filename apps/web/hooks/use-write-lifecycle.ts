"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt } from "wagmi";
import type { Hex } from "@lunarlease/shared";
import { describeTransactionError } from "@/lib/errors";
import { invalidateContractReads } from "@/lib/query-keys";
import { activeChainId } from "@/lib/config";

export type TransactionPhase =
  | "idle"
  | "preparing"
  | "blocked"
  | "ready"
  | "signing"
  | "confirming"
  | "success"
  | "error";

export interface TransactionFlow {
  readonly phase: TransactionPhase;
  readonly isBusy: boolean;
  readonly canSubmit: boolean;
  readonly hash: Hex | undefined;
  readonly errorMessage: string | undefined;
  readonly blockedReason: string | undefined;
  readonly submit: () => void;
  readonly reset: () => void;
}

export interface WriteLifecycleInput {
  readonly enabled: boolean;
  readonly isSimulating: boolean;
  readonly simulateError: Error | null;
  readonly hasRequest: boolean;
  readonly isSigning: boolean;
  readonly writeError: Error | null;
  readonly hash: Hex | undefined;
  readonly onConfirmed?: () => void;
}

export interface WriteLifecycleResult {
  readonly phase: TransactionPhase;
  readonly isBusy: boolean;
  readonly canSubmit: boolean;
  readonly errorMessage: string | undefined;
  readonly blockedReason: string | undefined;
  readonly isConfirmed: boolean;
}

export function useWriteLifecycle(input: WriteLifecycleInput): WriteLifecycleResult {
  const queryClient = useQueryClient();
  const receipt = useWaitForTransactionReceipt({
    hash: input.hash,
    chainId: activeChainId,
    query: { enabled: input.hash !== undefined },
  });

  const notifiedHash = useRef<Hex | undefined>(undefined);
  const isConfirmed = receipt.isSuccess;

  useEffect(() => {
    if (!isConfirmed || input.hash === undefined) return;
    if (notifiedHash.current === input.hash) return;
    notifiedHash.current = input.hash;
    invalidateContractReads(queryClient);
    input.onConfirmed?.();
  }, [isConfirmed, input.hash, input.onConfirmed, queryClient]);

  const simulateMessage = input.simulateError
    ? describeTransactionError(input.simulateError)
    : undefined;
  const writeMessage = input.writeError
    ? describeTransactionError(input.writeError)
    : undefined;
  const receiptMessage = receipt.error
    ? describeTransactionError(receipt.error)
    : undefined;

  const phase: TransactionPhase = (() => {
    if (writeMessage !== undefined || receiptMessage !== undefined) return "error";
    if (receipt.isSuccess) return "success";
    if (input.hash !== undefined) return "confirming";
    if (input.isSigning) return "signing";
    if (!input.enabled) return "idle";
    if (input.isSimulating) return "preparing";
    if (simulateMessage !== undefined) return "blocked";
    return input.hasRequest ? "ready" : "preparing";
  })();

  return {
    phase,
    isBusy: phase === "signing" || phase === "confirming",
    canSubmit: phase === "ready",
    errorMessage: writeMessage ?? receiptMessage,
    blockedReason: simulateMessage,
    isConfirmed,
  };
}
