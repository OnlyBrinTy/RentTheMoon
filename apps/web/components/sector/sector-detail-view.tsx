"use client";

import Link from "next/link";
import { formatSectorCoordinates, getSectorInfo } from "@lunarlease/shared";
import { useSector } from "@/hooks/use-sector";
import { contractsConfigured } from "@/lib/config";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { describeContractReadError } from "@/lib/errors";
import { SkeletonRows } from "@/components/ui/skeleton";
import { SectorActions } from "./sector-actions";
import { SectorHistoryPlaceholder } from "./sector-history-placeholder";
import { SectorMiniMap } from "./sector-mini-map";
import { SectorStats } from "./sector-stats";

export function SectorDetailView({ sectorId }: { readonly sectorId: number }) {
  const { sector, isLoading, isError, error } = useSector(sectorId);
  const info = getSectorInfo(sectorId);

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-2 pb-5 text-xs text-white/40">
        <Link href="/" className="hover:text-white/70">
          Moon
        </Link>
        <span aria-hidden>/</span>
        <span className="numeric text-white/70">Sector #{sectorId}</span>
      </nav>

      <header className="pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white/95">
          Lunar Sector <span className="numeric">#{sectorId}</span>
        </h1>
        <p className="numeric mt-2 text-sm text-white/45">
          {formatSectorCoordinates(sectorId)} · lat band {info.latitudeIndex} · lon band{" "}
          {info.longitudeIndex}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>On-chain state</CardTitle>
                <CardSubtitle>
                  Read directly from MoonMarketplace.getSector
                </CardSubtitle>
              </div>
            </CardHeader>
            <CardBody>
              {!contractsConfigured ? (
                <ContractsNotConfigured />
              ) : isLoading ? (
                <SkeletonRows rows={10} />
              ) : isError ? (
                <div className="rounded-lg border border-rose-400/25 bg-rose-400/8 px-3 py-2.5 text-xs text-rose-100/80">
                  <p className="font-semibold">Could not read sector state</p>
                  <p className="mt-1 opacity-75">
                    {error !== null ? describeContractReadError(error) : "Unknown RPC error."}
                  </p>
                </div>
              ) : sector !== undefined ? (
                <SectorStats sector={sector} />
              ) : null}
            </CardBody>
          </Card>

          <SectorHistoryPlaceholder sectorId={sectorId} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Position</CardTitle>
                <CardSubtitle>Equirectangular projection of the lunar grid</CardSubtitle>
              </div>
            </CardHeader>
            <CardBody>
              <SectorMiniMap sectorId={sectorId} />
            </CardBody>
          </Card>

          {contractsConfigured && sector !== undefined ? (
            <SectorActions sector={sector} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
