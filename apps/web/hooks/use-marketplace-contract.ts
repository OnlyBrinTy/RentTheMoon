"use client";

import { useAccount } from "wagmi";
import { moonMarketplaceAbi } from "@/lib/abi/marketplace";
import { activeChainId, contractsConfigured, marketplaceAddress } from "@/lib/config";

export const marketplaceBase = {
  address: marketplaceAddress,
  abi: moonMarketplaceAbi,
  chainId: activeChainId,
} as const;

export function useConnectedAccount(): {
  account: `0x${string}` | undefined;
  ready: boolean;
} {
  const { address, status } = useAccount();
  const connected = status === "connected";
  return {
    account: connected ? address : undefined,
    ready: contractsConfigured && connected && address !== undefined,
  };
}
