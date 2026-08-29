"use client";

import { useAccount } from "wagmi";
import type { SectorChainState } from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import { contractsConfigured } from "@/lib/config";
import { isListedForSale, isOwnedBy, isRentable } from "@/lib/sector-state";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { ConnectButton } from "@/components/wallet/connect-button";
import { AcquireAction } from "./acquire-action";
import { ActionShell } from "./action-shell";
import { BuyAction } from "./buy-action";
import { OwnerControls } from "./owner-controls";
import { RentAction } from "./rent-action";

export function SectorActions({ sector }: { readonly sector: SectorChainState }) {
  const { address, isConnected } = useAccount();
  const now = useNow(10_000);

  if (!contractsConfigured) return <ContractsNotConfigured />;

  if (!isConnected) {
    return (
      <ActionShell
        title="Connect your wallet"
        description="Connect a wallet to acquire, rent, or manage lunar sectors."
      >
        <ConnectButton />
      </ActionShell>
    );
  }

  if (!sector.minted) return <AcquireAction sectorId={sector.sectorId} />;

  if (isOwnedBy(sector, address)) return <OwnerControls sector={sector} />;

  const rentable = isRentable(sector, now);
  const listed = isListedForSale(sector);

  if (!rentable && !listed) {
    return (
      <ActionShell
        title="No actions available"
        description="This sector is claimed and its owner has not enabled renting or listed it for sale."
      >
        <p className="text-xs text-white/40">
          Check back later, or explore unclaimed sectors on the map.
        </p>
      </ActionShell>
    );
  }

  return (
    <div className="space-y-3">
      {rentable ? <RentAction sector={sector} /> : null}
      {listed ? <BuyAction sector={sector} /> : null}
    </div>
  );
}
