import {
  LATITUDE_BANDS,
  LATITUDE_STEP_DEG,
  LONGITUDE_BANDS,
  LONGITUDE_STEP_DEG,
  MAX_SECTOR_ID,
  MIN_SECTOR_ID,
  TOTAL_SECTORS,
} from "../constants/index.js";
import type { SectorBounds, SectorInfo, SectorMetadata } from "../types/index.js";

export class InvalidSectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSectorError";
  }
}

export function isValidSectorId(sectorId: number): boolean {
  return (
    Number.isInteger(sectorId) &&
    sectorId >= MIN_SECTOR_ID &&
    sectorId <= MAX_SECTOR_ID
  );
}

export function assertValidSectorId(sectorId: number): void {
  if (!isValidSectorId(sectorId)) {
    throw new InvalidSectorError(
      `sectorId must be an integer in [${MIN_SECTOR_ID}, ${MAX_SECTOR_ID}], received ${sectorId}`,
    );
  }
}

export function sectorIdFromIndices(
  latitudeIndex: number,
  longitudeIndex: number,
): number {
  if (
    !Number.isInteger(latitudeIndex) ||
    latitudeIndex < 0 ||
    latitudeIndex >= LATITUDE_BANDS
  ) {
    throw new InvalidSectorError(
      `latitudeIndex must be an integer in [0, ${LATITUDE_BANDS - 1}], received ${latitudeIndex}`,
    );
  }
  if (
    !Number.isInteger(longitudeIndex) ||
    longitudeIndex < 0 ||
    longitudeIndex >= LONGITUDE_BANDS
  ) {
    throw new InvalidSectorError(
      `longitudeIndex must be an integer in [0, ${LONGITUDE_BANDS - 1}], received ${longitudeIndex}`,
    );
  }
  return latitudeIndex * LONGITUDE_BANDS + longitudeIndex;
}

export function latitudeIndexOf(sectorId: number): number {
  assertValidSectorId(sectorId);
  return Math.floor(sectorId / LONGITUDE_BANDS);
}

export function longitudeIndexOf(sectorId: number): number {
  assertValidSectorId(sectorId);
  return sectorId % LONGITUDE_BANDS;
}

export function normalizeLongitude(lon: number): number {
  if (!Number.isFinite(lon)) {
    throw new InvalidSectorError(`longitude must be finite, received ${lon}`);
  }
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return wrapped;
}

export function clampLatitude(lat: number): number {
  if (!Number.isFinite(lat)) {
    throw new InvalidSectorError(`latitude must be finite, received ${lat}`);
  }
  return Math.min(90, Math.max(-90, lat));
}

export function indicesFromLatLon(
  lat: number,
  lon: number,
): { latitudeIndex: number; longitudeIndex: number } {
  const clampedLat = clampLatitude(lat);
  const normalizedLon = normalizeLongitude(lon);

  const rawLatIndex = Math.floor((clampedLat + 90) / LATITUDE_STEP_DEG);
  const rawLonIndex = Math.floor((normalizedLon + 180) / LONGITUDE_STEP_DEG);

  return {
    latitudeIndex: Math.min(LATITUDE_BANDS - 1, Math.max(0, rawLatIndex)),
    longitudeIndex: Math.min(LONGITUDE_BANDS - 1, Math.max(0, rawLonIndex)),
  };
}

export function sectorIdFromLatLon(lat: number, lon: number): number {
  const { latitudeIndex, longitudeIndex } = indicesFromLatLon(lat, lon);
  return sectorIdFromIndices(latitudeIndex, longitudeIndex);
}

export function sectorBounds(sectorId: number): SectorBounds {
  const latitudeIndex = latitudeIndexOf(sectorId);
  const longitudeIndex = longitudeIndexOf(sectorId);

  const latMin = -90 + latitudeIndex * LATITUDE_STEP_DEG;
  const lonMin = -180 + longitudeIndex * LONGITUDE_STEP_DEG;

  return {
    latMin,
    latMax: latMin + LATITUDE_STEP_DEG,
    lonMin,
    lonMax: lonMin + LONGITUDE_STEP_DEG,
  };
}

export function sectorCenter(sectorId: number): { lat: number; lon: number } {
  const bounds = sectorBounds(sectorId);
  return {
    lat: (bounds.latMin + bounds.latMax) / 2,
    lon: (bounds.lonMin + bounds.lonMax) / 2,
  };
}

export function getSectorInfo(sectorId: number): SectorInfo {
  return {
    sectorId,
    latitudeIndex: latitudeIndexOf(sectorId),
    longitudeIndex: longitudeIndexOf(sectorId),
    bounds: sectorBounds(sectorId),
    center: sectorCenter(sectorId),
  };
}

export function allSectorIds(): number[] {
  return Array.from({ length: TOTAL_SECTORS }, (_, index) => index);
}

function formatDegree(value: number, positive: string, negative: string): string {
  if (value === 0) return "0°";
  const hemisphere = value > 0 ? positive : negative;
  return `${Math.abs(value)}°${hemisphere}`;
}

export function formatLatitudeRange(bounds: SectorBounds): string {
  return `${formatDegree(bounds.latMin, "N", "S")} – ${formatDegree(bounds.latMax, "N", "S")}`;
}

export function formatLongitudeRange(bounds: SectorBounds): string {
  return `${formatDegree(bounds.lonMin, "E", "W")} – ${formatDegree(bounds.lonMax, "E", "W")}`;
}

export function formatSectorCoordinates(sectorId: number): string {
  const bounds = sectorBounds(sectorId);
  return `${formatLatitudeRange(bounds)}, ${formatLongitudeRange(bounds)}`;
}

export function sectorMetadata(sectorId: number): SectorMetadata {
  const bounds = sectorBounds(sectorId);
  return {
    name: `Lunar Sector #${sectorId}`,
    description:
      "Virtual lunar sector in LunarLease. Represents virtual ownership within the LunarLease system only; it does not confer legally recognized ownership of physical lunar territory.",
    attributes: [
      { trait_type: "Latitude", value: formatLatitudeRange(bounds) },
      { trait_type: "Longitude", value: formatLongitudeRange(bounds) },
      { trait_type: "Latitude Index", value: latitudeIndexOf(sectorId) },
      { trait_type: "Longitude Index", value: longitudeIndexOf(sectorId) },
    ],
  };
}
