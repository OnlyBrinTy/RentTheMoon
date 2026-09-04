"use client";

import { useAccount } from "wagmi";
import { contractsConfigured, nativeCurrencySymbol } from "@/lib/config";
import { PageShell } from "@/components/layout/page-shell";
import { FarmingCard } from "@/components/mun/farming-card";
import { MunBalanceCard } from "@/components/mun/mun-balance-card";
import { SendMunCard } from "@/components/mun/send-mun-card";
import { TopUpCard } from "@/components/mun/top-up-card";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectButton } from "@/components/wallet/connect-button";

export function WalletView() {
  const { isConnected } = useAccount();

  return (
    <PageShell
      title="MUN wallet"
      description={`MUN is the currency every sector acquisition, rental and purchase is settled in. Top it up with ${nativeCurrencySymbol}, send it on, and claim what your holdings farm.`}
    >
      {!contractsConfigured ? (
        <ContractsNotConfigured />
      ) : !isConnected ? (
        <EmptyState
          title="Wallet not connected"
          description="Connect a wallet to see your MUN balance, top it up and claim farmed MUN."
          action={<ConnectButton />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <MunBalanceCard />
            <TopUpCard />
          </div>
          <div className="space-y-4">
            <FarmingCard />
            <SendMunCard />
          </div>
        </div>
      )}
    </PageShell>
  );
}
