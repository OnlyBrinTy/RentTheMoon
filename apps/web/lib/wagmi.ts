import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";
import type { CreateConnectorFn } from "wagmi";
import { CHAIN_IDS } from "@lunarlease/shared";
import {
  activeChain,
  activeChainId,
  rpcUrl,
  supportedChainList,
  type SupportedChain,
} from "./config";

function buildConnectors(): CreateConnectorFn[] {
  return [injected({ shimDisconnect: true })];
}

function orderedChains(): readonly [SupportedChain, ...SupportedChain[]] {
  const others = supportedChainList.filter((chain) => chain.id !== activeChainId);
  return [activeChain, ...others];
}

function transportFor(chainId: number) {
  return chainId === activeChainId ? http(rpcUrl, { batch: true }) : http();
}

function buildWagmiConfig() {
  return createConfig({
    chains: orderedChains(),
    connectors: buildConnectors(),
    transports: {
      [CHAIN_IDS.hardhat]: transportFor(CHAIN_IDS.hardhat),
      [CHAIN_IDS.polygonAmoy]: transportFor(CHAIN_IDS.polygonAmoy),
      [CHAIN_IDS.polygon]: transportFor(CHAIN_IDS.polygon),
    },
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
  });
}

let cachedConfig: ReturnType<typeof buildWagmiConfig> | undefined;

export function getWagmiConfig() {
  cachedConfig ??= buildWagmiConfig();
  return cachedConfig;
}

export const wagmiConfig = getWagmiConfig();

export type LunarLeaseWagmiConfig = ReturnType<typeof getWagmiConfig>;
