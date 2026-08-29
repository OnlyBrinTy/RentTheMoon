import * as THREE from "three";
import {
  LATITUDE_BANDS,
  LONGITUDE_BANDS,
  TOTAL_SECTORS,
  deriveVisualState,
  type SectorChainState,
} from "@lunarlease/shared";
import { sectorVisualStyles } from "@/lib/sector-visuals";

export interface SectorStateTexture {
  readonly texture: THREE.DataTexture;
  readonly data: Uint8Array;
}

export function createSectorStateTexture(): SectorStateTexture {
  const data = new Uint8Array(LONGITUDE_BANDS * LATITUDE_BANDS * 4);
  const texture = new THREE.DataTexture(
    data,
    LONGITUDE_BANDS,
    LATITUDE_BANDS,
    THREE.RGBAFormat,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return { texture, data };
}

export function writeSectorStates(
  target: SectorStateTexture,
  sectors: readonly SectorChainState[] | undefined,
  at: bigint,
): void {
  const { data, texture } = target;
  const unclaimed = sectorVisualStyles.unclaimed;
  const unclaimedAlpha = Math.round(unclaimed.overlayAlpha * 255);

  for (let sectorId = 0; sectorId < TOTAL_SECTORS; sectorId += 1) {
    const offset = sectorId * 4;
    data[offset] = unclaimed.rgb[0];
    data[offset + 1] = unclaimed.rgb[1];
    data[offset + 2] = unclaimed.rgb[2];
    data[offset + 3] = unclaimedAlpha;
  }

  if (sectors !== undefined) {
    for (const sector of sectors) {
      if (sector.sectorId < 0 || sector.sectorId >= TOTAL_SECTORS) continue;
      const style = sectorVisualStyles[deriveVisualState(sector, { at })];
      const offset = sector.sectorId * 4;
      data[offset] = style.rgb[0];
      data[offset + 1] = style.rgb[1];
      data[offset + 2] = style.rgb[2];
      data[offset + 3] = Math.round(style.overlayAlpha * 255);
    }
  }

  texture.needsUpdate = true;
}
