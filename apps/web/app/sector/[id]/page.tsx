import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatSectorCoordinates, isValidSectorId } from "@lunarlease/shared";
import { SectorDetailView } from "@/components/sector/sector-detail-view";

interface SectorPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

function parseSectorId(raw: string): number | undefined {
  if (!/^\d+$/.test(raw)) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return isValidSectorId(parsed) ? parsed : undefined;
}

export async function generateMetadata({ params }: SectorPageProps): Promise<Metadata> {
  const { id } = await params;
  const sectorId = parseSectorId(id);

  if (sectorId === undefined) return { title: "Unknown sector" };

  return {
    title: `Sector #${sectorId}`,
    description: `Lunar sector #${sectorId} — ${formatSectorCoordinates(sectorId)}.`,
  };
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { id } = await params;
  const sectorId = parseSectorId(id);

  if (sectorId === undefined) notFound();

  return <SectorDetailView sectorId={sectorId} />;
}
