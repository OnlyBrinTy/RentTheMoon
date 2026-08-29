"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import {
  sectorIdFromLatLon,
  vector3ToLatLon,
  type SectorChainState,
} from "@lunarlease/shared";
import { OVERLAY_RADIUS } from "./moon-constants";
import { createSectorOverlayMaterial } from "./sector-overlay-material";
import { createSectorStateTexture, writeSectorStates } from "./sector-state-texture";

interface SectorOverlayProps {
  readonly sectors: readonly SectorChainState[] | undefined;
  readonly at: bigint;
  readonly hoveredSectorId: number | undefined;
  readonly selectedSectorId: number | undefined;
  readonly onHoverSector: (sectorId: number | undefined) => void;
  readonly onSelectSector: (sectorId: number) => void;
}

export function SectorOverlay({
  sectors,
  at,
  hoveredSectorId,
  selectedSectorId,
  onHoverSector,
  onSelectSector,
}: SectorOverlayProps) {
  const stateTexture = useMemo(() => createSectorStateTexture(), []);
  const overlay = useMemo(
    () => createSectorOverlayMaterial(stateTexture.texture),
    [stateTexture],
  );

  useEffect(() => {
    writeSectorStates(stateTexture, sectors, at);
  }, [stateTexture, sectors, at]);

  useEffect(() => {
    overlay.uniforms.uHoveredSector.value = hoveredSectorId ?? -1;
  }, [overlay, hoveredSectorId]);

  useEffect(() => {
    overlay.uniforms.uSelectedSector.value = selectedSectorId ?? -1;
  }, [overlay, selectedSectorId]);

  useEffect(
    () => () => {
      overlay.material.dispose();
      stateTexture.texture.dispose();
    },
    [overlay, stateTexture],
  );

  const sectorIdFromEvent = useCallback((event: ThreeEvent<PointerEvent>) => {
    const { lat, lon } = vector3ToLatLon(event.point);
    return sectorIdFromLatLon(lat, lon);
  }, []);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHoverSector(sectorIdFromEvent(event));
    },
    [onHoverSector, sectorIdFromEvent],
  );

  const handlePointerOut = useCallback(() => {
    onHoverSector(undefined);
  }, [onHoverSector]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const { lat, lon } = vector3ToLatLon(event.point);
      onSelectSector(sectorIdFromLatLon(lat, lon));
    },
    [onSelectSector],
  );

  return (
    <mesh
      renderOrder={2}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[OVERLAY_RADIUS, 192, 128]} />
      <primitive object={overlay.material} attach="material" />
    </mesh>
  );
}
