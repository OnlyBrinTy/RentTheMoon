"use client";

import dynamic from "next/dynamic";
import {
  formatSectorCoordinates,
  TOTAL_SECTORS,
  type SectorChainState,
} from "@lunarlease/shared";
import { cn } from "@/lib/cn";
import { MoonLegend } from "./moon-legend";

const MoonScene = dynamic(
  () => import("./moon-scene").then((module) => module.MoonScene),
  {
    ssr: false,
    loading: () => <MoonSceneFallback />,
  },
);

function MoonSceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative size-48">
        <div className="absolute inset-0 animate-pulse-soft rounded-full bg-gradient-to-br from-slate-500/40 to-slate-800/60 blur-sm" />
        <div className="absolute inset-0 rounded-full border border-white/8" />
      </div>
    </div>
  );
}

interface MoonViewerProps {
  readonly sectors: readonly SectorChainState[] | undefined;
  readonly at: bigint;
  readonly hoveredSectorId: number | undefined;
  readonly selectedSectorId: number | undefined;
  readonly onHoverSector: (sectorId: number | undefined) => void;
  readonly onSelectSector: (sectorId: number) => void;
  readonly isLoading: boolean;
  readonly loadedChunks: number;
  readonly totalChunks: number;
  readonly className?: string;
}

export function MoonViewer({
  sectors,
  at,
  hoveredSectorId,
  selectedSectorId,
  onHoverSector,
  onSelectSector,
  isLoading,
  loadedChunks,
  totalChunks,
  className,
}: MoonViewerProps) {
  const claimedCount = sectors?.filter((sector) => sector.minted).length;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/8 bg-[#04060f]",
        hoveredSectorId === undefined ? "cursor-grab" : "cursor-pointer",
        className,
      )}
    >
      <MoonScene
        sectors={sectors}
        at={at}
        hoveredSectorId={hoveredSectorId}
        selectedSectorId={selectedSectorId}
        onHoverSector={onHoverSector}
        onSelectSector={onSelectSector}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <div className="panel-surface min-w-40 rounded-xl px-3 py-2">
          <p className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
            {hoveredSectorId === undefined ? "Hover a sector" : "Hovered"}
          </p>
          {hoveredSectorId === undefined ? (
            <p className="mt-1 text-[11px] text-white/45">
              Drag to rotate · scroll to zoom
            </p>
          ) : (
            <>
              <p className="numeric mt-0.5 text-sm font-semibold text-white/95">
                #{hoveredSectorId}
              </p>
              <p className="numeric text-[11px] text-white/45">
                {formatSectorCoordinates(hoveredSectorId)}
              </p>
            </>
          )}
        </div>

        <div className="panel-surface rounded-xl px-3 py-2 text-right">
          <p className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
            Grid
          </p>
          <p className="numeric mt-0.5 text-sm font-semibold text-white/95">
            {claimedCount ?? "—"}
            <span className="text-white/35"> / {TOTAL_SECTORS}</span>
          </p>
          <p className="text-[11px] text-white/40">
            {isLoading ? `loading ${loadedChunks}/${totalChunks}` : "claimed"}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3">
        <MoonLegend />
      </div>
    </div>
  );
}
