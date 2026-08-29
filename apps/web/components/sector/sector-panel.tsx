"use client";

import Link from "next/link";
import { formatSectorCoordinates, isValidSectorId } from "@lunarlease/shared";
import { useSector } from "@/hooks/use-sector";
import { contractsConfigured } from "@/lib/config";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { ContractsNotConfigured } from "@/components/ui/contracts-not-configured";
import { SkeletonRows } from "@/components/ui/skeleton";
import { SectorActions } from "./sector-actions";
import { SectorStats } from "./sector-stats";

interface SectorPanelProps {
  readonly sectorId: number | undefined;
  readonly showDetailLink?: boolean;
}

export function SectorPanel({ sectorId, showDetailLink = true }: SectorPanelProps) {
  const { sector, isLoading, isError, error } = useSector(sectorId);

  if (sectorId === undefined || !isValidSectorId(sectorId)) {
    return (
      <Card>
        <CardBody className="py-10 text-center">
          <p className="text-sm font-semibold text-white/75">No sector selected</p>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/40">
            Rotate the Moon and click a sector to inspect its ownership, rental status
            and available actions.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Sector #{sectorId}</CardTitle>
          <CardSubtitle className="numeric mt-0.5">
            {formatSectorCoordinates(sectorId)}
          </CardSubtitle>
        </div>
        {showDetailLink ? (
          <Link
            href={`/sector/${sectorId}`}
            className="shrink-0 text-xs font-semibold text-sky-300 hover:text-sky-200"
          >
            Full detail →
          </Link>
        ) : null}
      </CardHeader>

      <CardBody className="space-y-4">
        {!contractsConfigured ? (
          <ContractsNotConfigured />
        ) : isLoading ? (
          <SkeletonRows rows={8} />
        ) : isError ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-400/8 px-3 py-2.5 text-xs text-rose-100/80">
            <p className="font-semibold">Could not read sector state</p>
            <p className="mt-1 opacity-75">{error?.message ?? "Unknown RPC error."}</p>
          </div>
        ) : sector !== undefined ? (
          <>
            <SectorStats sector={sector} />
            <SectorActions sector={sector} />
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
