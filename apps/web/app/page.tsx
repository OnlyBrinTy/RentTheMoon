"use client";

import { useCallback, useState } from "react";
import { TOTAL_SECTORS } from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import { useAllSectors } from "@/hooks/use-sector-scan";
import { contractsConfigured } from "@/lib/config";
import { MoonViewer } from "@/components/moon/moon-viewer";
import { SectorPanel } from "@/components/sector/sector-panel";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";

export default function HomePage() {
  const [selectedSectorId, setSelectedSectorId] = useState<number | undefined>(undefined);
  const [hoveredSectorId, setHoveredSectorId] = useState<number | undefined>(undefined);
  const now = useNow(15_000);
  const { sectors, isLoading, loadedChunks, totalChunks } = useAllSectors();

  const handleSelectSector = useCallback((sectorId: number) => {
    setSelectedSectorId(sectorId);
  }, []);

  const claimed = sectors?.filter((sector) => sector.minted).length ?? 0;
  const unclaimed = sectors === undefined ? undefined : TOTAL_SECTORS - claimed;

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white/95 sm:text-2xl">
            The lunar grid
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/45">
            {TOTAL_SECTORS.toLocaleString()} virtual sectors, 5° × 5° each. Rotate the
            Moon, pick a sector, and acquire or rent it on chain.
          </p>
        </div>

        <dl className="flex gap-6">
          <div>
            <dt className="text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">
              Claimed
            </dt>
            <dd className="numeric mt-0.5 text-lg font-semibold text-sky-200">
              {sectors === undefined ? "—" : claimed.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">
              Unclaimed
            </dt>
            <dd className="numeric mt-0.5 text-lg font-semibold text-white/80">
              {unclaimed === undefined ? "—" : unclaimed.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {!contractsConfigured ? <ContractsNotConfigured className="mb-4" /> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <MoonViewer
          sectors={sectors}
          at={now}
          hoveredSectorId={hoveredSectorId}
          selectedSectorId={selectedSectorId}
          onHoverSector={setHoveredSectorId}
          onSelectSector={handleSelectSector}
          isLoading={isLoading}
          loadedChunks={loadedChunks}
          totalChunks={totalChunks}
          className="h-[52vh] min-h-[380px] lg:h-[calc(100dvh-13rem)]"
        />

        <aside className="scrollbar-thin-dark flex flex-col gap-4 lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto lg:pr-1">
          <SectorPanel sectorId={selectedSectorId} />
        </aside>
      </div>
    </div>
  );
}
