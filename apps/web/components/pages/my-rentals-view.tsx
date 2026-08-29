"use client";

import { useAccount } from "wagmi";
import { useRentedByMeSectors } from "@/hooks/use-sector-scan";
import { contractsConfigured } from "@/lib/config";
import { PageShell } from "@/components/layout/page-shell";
import { SectorCardGrid } from "@/components/sector/sector-card";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCardGrid } from "@/components/ui/skeleton";
import { ConnectButton } from "@/components/wallet/connect-button";
import { ScanNotice } from "./scan-notice";

export function MyRentalsView() {
  const { isConnected } = useAccount();
  const { matches, isLoading, isError, error } = useRentedByMeSectors();

  return (
    <PageShell
      title="My rentals"
      description="Sectors where your wallet holds active ERC-4907 usage rights, with live expiry countdowns."
      actions={<ScanNotice />}
    >
      {!contractsConfigured ? (
        <ContractsNotConfigured />
      ) : !isConnected ? (
        <EmptyState
          title="Wallet not connected"
          description="Connect a wallet to see the lunar sectors you are currently renting."
          action={<ConnectButton />}
        />
      ) : isLoading ? (
        <SkeletonCardGrid count={3} />
      ) : isError ? (
        <EmptyState
          title="Could not scan sector state"
          description={error?.message ?? "The RPC endpoint did not respond."}
        />
      ) : matches !== undefined && matches.length > 0 ? (
        <SectorCardGrid sectors={matches} />
      ) : (
        <EmptyState
          title="No active rentals"
          description="You are not currently renting any lunar sectors. Browse rentable sectors in the marketplace."
        />
      )}
    </PageShell>
  );
}
