"use client";

import { useEffect, useMemo } from "react";
import { createMoonSurfaceTextures } from "./moon-surface-texture";
import { MOON_RADIUS } from "./moon-constants";

export function MoonSurface() {
  const textures = useMemo(() => createMoonSurfaceTextures(), []);

  useEffect(() => () => textures.dispose(), [textures]);

  return (
    <mesh receiveShadow>
      <sphereGeometry args={[MOON_RADIUS, 128, 96]} />
      <meshStandardMaterial
        map={textures.colorMap}
        bumpMap={textures.bumpMap}
        bumpScale={2.4}
        roughness={0.94}
        metalness={0.02}
      />
    </mesh>
  );
}
