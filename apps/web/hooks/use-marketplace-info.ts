"use client";

import { useReadContract } from "wagmi";
import { INITIAL_SECTOR_PRICE_WEI, PLATFORM_FEE_BPS } from "@lunarlease/shared";
import { moonMarketplaceAbi } from "@/lib/abi/marketplace";
import { activeChainId, contractsConfigured, marketplaceAddress } from "@/lib/config";

export function useInitialSectorPrice(): { price: bigint; isLoading: boolean } {
  const query = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "initialSectorPrice",
    chainId: activeChainId,
    query: { enabled: contractsConfigured, staleTime: 300_000 },
  });

  return {
    price: query.data ?? INITIAL_SECTOR_PRICE_WEI,
    isLoading: contractsConfigured && query.isPending,
  };
}

export function usePlatformFeeBps(): { feeBps: number; isLoading: boolean } {
  const query = useReadContract({
    address: marketplaceAddress,
    abi: moonMarketplaceAbi,
    functionName: "platformFeeBps",
    chainId: activeChainId,
    query: { enabled: contractsConfigured, staleTime: 300_000 },
  });

  return {
    feeBps: query.data ?? PLATFORM_FEE_BPS,
    isLoading: contractsConfigured && query.isPending,
  };
}
