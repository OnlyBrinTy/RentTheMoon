"use client";

import { useAccount } from "wagmi";
import { useOwnedSectors } from "@/hooks/use-sector-scan";
import { contractsConfigured } from "@/lib/config";
import { PageShell } from "@/components/layout/page-shell";
import { SectorCardGrid } from "@/components/sector/sector-card";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCardGrid } from "@/components/ui/skeleton";
import { ConnectButton } from "@/components/wallet/connect-button";
import { ScanNotice } from "./scan-notice";

export function MyLandView() {
  const { isConnected } = useAccount();
  const { matches, isLoading, isError, error } = useOwnedSectors();

  return (
    <PageShell
      title="My land"
      description="Every lunar sector whose ERC-721 token is currently held by your connected wallet."
      actions={<ScanNotice />}
    >
      {!contractsConfigured ? (
        <ContractsNotConfigured />
      ) : !isConnected ? (
        <EmptyState
          title="Wallet not connected"
          description="Connect a wallet to see the lunar sectors you own."
          action={<ConnectButton />}
        />
      ) : isLoading ? (
        <SkeletonCardGrid count={6} />
      ) : isError ? (
        <EmptyState
          title="Could not scan sector state"
          description={error?.message ?? "The RPC endpoint did not respond."}
        />
      ) : matches !== undefined && matches.length > 0 ? (
        <div className="space-y-6">
          <SectorCardGrid sectors={matches} />
        </div>
      ) : (
        <EmptyState
          title="You do not own any sectors yet"
          description="Head to the Moon, pick an unclaimed sector, and acquire it to start earning rental income."
        />
      )}
    </PageShell>
  );
}
