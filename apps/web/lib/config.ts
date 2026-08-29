import { defineChain, isAddress, getAddress, type Address, type Chain } from "viem";
import { hardhat, polygon, polygonAmoy } from "viem/chains";
import { CHAIN_IDS, ZERO_ADDRESS } from "@lunarlease/shared";

export const DEFAULT_CHAIN_ID = CHAIN_IDS.hardhat;
export const DEFAULT_LOCAL_RPC_URL = "http://127.0.0.1:8545";

const lunarHardhat = defineChain({
  ...hardhat,
  name: "Hardhat (LunarLease)",
  nativeCurrency: { name: "Polygon Ecosystem Token", symbol: "POL", decimals: 18 },
  rpcUrls: { default: { http: [DEFAULT_LOCAL_RPC_URL] } },
});

export const supportedChains = {
  [CHAIN_IDS.hardhat]: lunarHardhat,
  [CHAIN_IDS.polygonAmoy]: polygonAmoy,
  [CHAIN_IDS.polygon]: polygon,
} as const satisfies Record<number, Chain>;

export type SupportedChain = (typeof supportedChains)[keyof typeof supportedChains];

export const supportedChainList: readonly SupportedChain[] = [
  supportedChains[CHAIN_IDS.hardhat],
  supportedChains[CHAIN_IDS.polygonAmoy],
  supportedChains[CHAIN_IDS.polygon],
];

function parseChainId(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isInteger(parsed)) return DEFAULT_CHAIN_ID;
  return parsed;
}

function resolveChain(chainId: number): SupportedChain {
  if (chainId === CHAIN_IDS.polygon) return supportedChains[CHAIN_IDS.polygon];
  if (chainId === CHAIN_IDS.polygonAmoy) return supportedChains[CHAIN_IDS.polygonAmoy];
  return supportedChains[CHAIN_IDS.hardhat];
}

function parseOptionalAddress(raw: string | undefined): Address | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (!isAddress(trimmed)) return undefined;
  const checksummed = getAddress(trimmed);
  if (checksummed === ZERO_ADDRESS) return undefined;
  return checksummed;
}

const requestedChainId = parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID);

export const activeChain: SupportedChain = resolveChain(requestedChainId);
export const activeChainId = activeChain.id;
export const isChainIdSupported = activeChainId === requestedChainId;
export const nativeCurrencySymbol = activeChain.nativeCurrency.symbol;

export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
  activeChain.rpcUrls.default.http[0] ||
  DEFAULT_LOCAL_RPC_URL;

export const registryAddress = parseOptionalAddress(
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
);
export const marketplaceAddress = parseOptionalAddress(
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
);

export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || undefined;

export const contractsConfigured =
  registryAddress !== undefined && marketplaceAddress !== undefined;

export const missingContractEnvVars: readonly string[] = [
  registryAddress === undefined ? "NEXT_PUBLIC_REGISTRY_ADDRESS" : undefined,
  marketplaceAddress === undefined ? "NEXT_PUBLIC_MARKETPLACE_ADDRESS" : undefined,
].filter((name): name is string => name !== undefined);

export const blockExplorerUrl = activeChain.blockExplorers?.default.url;

export function explorerAddressUrl(address: Address): string | undefined {
  return blockExplorerUrl ? `${blockExplorerUrl}/address/${address}` : undefined;
}

export function explorerTxUrl(hash: string): string | undefined {
  return blockExplorerUrl ? `${blockExplorerUrl}/tx/${hash}` : undefined;
}
