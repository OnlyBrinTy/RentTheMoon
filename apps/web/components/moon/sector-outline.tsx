"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { sectorOutlinePoints } from "@lunarlease/shared";

interface SectorOutlineProps {
  readonly sectorId: number | undefined;
  readonly color: string;
  readonly radius: number;
  readonly opacity?: number;
}

export function SectorOutline({
  sectorId,
  color,
  radius,
  opacity = 0.95,
}: SectorOutlineProps) {
  const outline = useMemo(() => {
    if (sectorId === undefined) return undefined;

    const points = sectorOutlinePoints(sectorId, radius, 10).map(
      (point) => new THREE.Vector3(point.x, point.y, point.z),
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 4;

    return { line, geometry, material };
  }, [sectorId, color, radius, opacity]);

  useEffect(() => {
    if (outline === undefined) return;
    return () => {
      outline.geometry.dispose();
      outline.material.dispose();
    };
  }, [outline]);

  if (outline === undefined) return null;

  return <primitive object={outline.line} />;
}
