"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { SectorChainState } from "@lunarlease/shared";
import { sectorVisualStyles } from "@/lib/sector-visuals";
import { MoonGlow } from "./moon-glow";
import { MoonSurface } from "./moon-surface";
import { SectorOutline } from "./sector-outline";
import { SectorOverlay } from "./sector-overlay";
import { OUTLINE_INNER_RADIUS, OUTLINE_OUTER_RADIUS } from "./moon-constants";

export interface MoonSceneProps {
  readonly sectors: readonly SectorChainState[] | undefined;
  readonly at: bigint;
  readonly hoveredSectorId: number | undefined;
  readonly selectedSectorId: number | undefined;
  readonly onHoverSector: (sectorId: number | undefined) => void;
  readonly onSelectSector: (sectorId: number) => void;
}

export function MoonScene({
  sectors,
  at,
  hoveredSectorId,
  selectedSectorId,
  onHoverSector,
  onSelectSector,
}: MoonSceneProps) {
  return (
    <Canvas
      camera={{ position: [2.15, 1.05, 2.15], fov: 42, near: 0.05, far: 120 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#04060f"]} />
      <ambientLight intensity={0.14} />
      <directionalLight position={[4.5, 2.6, 3.4]} intensity={2.7} color="#fff4e3" />
      <directionalLight position={[-4, -1.4, -3]} intensity={0.42} color="#5c7cff" />

      <Stars radius={70} depth={45} count={3200} factor={3.4} saturation={0} fade speed={0.4} />

      <MoonGlow />
      <MoonSurface />

      <SectorOverlay
        sectors={sectors}
        at={at}
        hoveredSectorId={hoveredSectorId}
        selectedSectorId={selectedSectorId}
        onHoverSector={onHoverSector}
        onSelectSector={onSelectSector}
      />

      <SectorOutline
        sectorId={hoveredSectorId}
        color="#dbeafe"
        radius={OUTLINE_INNER_RADIUS}
        opacity={0.7}
      />
      <SectorOutline
        sectorId={selectedSectorId}
        color={sectorVisualStyles.selected.hex}
        radius={OUTLINE_INNER_RADIUS}
      />
      <SectorOutline
        sectorId={selectedSectorId}
        color={sectorVisualStyles.selected.hex}
        radius={OUTLINE_OUTER_RADIUS}
        opacity={0.45}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.35}
        maxDistance={4.6}
        rotateSpeed={0.42}
        zoomSpeed={0.65}
        autoRotate={hoveredSectorId === undefined}
        autoRotateSpeed={0.22}
      />
    </Canvas>
  );
}
