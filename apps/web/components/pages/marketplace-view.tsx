"use client";

import { useForSaleSectors, useRentableSectors } from "@/hooks/use-sector-scan";
import { contractsConfigured } from "@/lib/config";
import { PageShell } from "@/components/layout/page-shell";
import { SectorCardGrid } from "@/components/sector/sector-card";
import { RecentActivityPlaceholder } from "@/components/sector/sector-history-placeholder";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCardGrid } from "@/components/ui/skeleton";
import { ScanNotice } from "./scan-notice";

function MarketSection({
  title,
  description,
  count,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly count: number | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/6 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white/90">{title}</h2>
          <p className="mt-0.5 text-xs text-white/40">{description}</p>
        </div>
        <span className="numeric rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
          {count ?? "—"}
        </span>
      </div>
      {children}
    </section>
  );
}

export function MarketplaceView() {
  const forSale = useForSaleSectors();
  const rentable = useRentableSectors();

  if (!contractsConfigured) {
    return (
      <PageShell
        title="Marketplace"
        description="Sectors listed for sale and sectors available to rent, derived from live contract state."
      >
        <ContractsNotConfigured />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Marketplace"
      description="Sectors listed for sale and sectors available to rent, derived from live contract state."
      actions={<ScanNotice />}
    >
      <div className="space-y-10">
        <MarketSection
          title="For sale"
          description="Listed on the secondary market. Purchases settle instantly on chain."
          count={forSale.matches?.length}
        >
          {forSale.isLoading ? (
            <SkeletonCardGrid count={3} />
          ) : forSale.isError ? (
            <EmptyState
              title="Could not scan listings"
              description={forSale.error?.message ?? "The RPC endpoint did not respond."}
            />
          ) : forSale.matches !== undefined && forSale.matches.length > 0 ? (
            <SectorCardGrid sectors={forSale.matches} />
          ) : (
            <EmptyState
              title="No sectors listed for sale"
              description="Nothing is on the secondary market right now. Owners can list their sectors from the sector detail page."
            />
          )}
        </MarketSection>

        <MarketSection
          title="Available to rent"
          description="Renting grants ERC-4907 usage rights without transferring ownership."
          count={rentable.matches?.length}
        >
          {rentable.isLoading ? (
            <SkeletonCardGrid count={3} />
          ) : rentable.isError ? (
            <EmptyState
              title="Could not scan rentals"
              description={rentable.error?.message ?? "The RPC endpoint did not respond."}
            />
          ) : rentable.matches !== undefined && rentable.matches.length > 0 ? (
            <SectorCardGrid sectors={rentable.matches} />
          ) : (
            <EmptyState
              title="No sectors available to rent"
              description="No owner has enabled renting with a non-zero daily price yet."
            />
          )}
        </MarketSection>

        <RecentActivityPlaceholder />
      </div>
    </PageShell>
  );
}
