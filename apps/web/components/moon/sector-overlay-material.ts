import * as THREE from "three";
import { LATITUDE_BANDS, LONGITUDE_BANDS } from "@lunarlease/shared";
import { sectorVisualStyles } from "@/lib/sector-visuals";

const vertexShader = /* glsl */ `
varying vec2 vSectorUv;

void main() {
  vSectorUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uStateMap;
uniform vec2 uGridSize;
uniform vec3 uGridColor;
uniform vec3 uHoverColor;
uniform vec3 uSelectColor;
uniform float uGridOpacity;
uniform float uOverlayOpacity;
uniform float uHoveredSector;
uniform float uSelectedSector;

varying vec2 vSectorUv;

void main() {
  vec4 cellState = texture2D(uStateMap, vSectorUv);
  vec2 gridPosition = vSectorUv * uGridSize;
  float sectorId = floor(gridPosition.y) * uGridSize.x + floor(gridPosition.x);

  vec3 color = cellState.rgb;
  float alpha = cellState.a * uOverlayOpacity;

  if (uSelectedSector >= 0.0 && abs(sectorId - uSelectedSector) < 0.5) {
    color = mix(color, uSelectColor, 0.85);
    alpha = max(alpha, 0.6);
  } else if (uHoveredSector >= 0.0 && abs(sectorId - uHoveredSector) < 0.5) {
    color = mix(color, uHoverColor, 0.7);
    alpha = max(alpha, 0.38);
  }

  vec2 distanceToEdge =
    (0.5 - abs(fract(gridPosition) - 0.5)) / max(fwidth(gridPosition), vec2(1e-5));
  float lineDistance = min(distanceToEdge.x, distanceToEdge.y);
  float gridStrength = (1.0 - smoothstep(0.0, 1.15, lineDistance)) * uGridOpacity;

  color = mix(color, uGridColor, gridStrength);
  alpha = max(alpha, gridStrength);

  if (alpha < 0.003) discard;

  gl_FragColor = vec4(color, alpha);
}
`;

export type SectorOverlayUniforms = {
  uStateMap: THREE.IUniform<THREE.Texture>;
  uGridSize: THREE.IUniform<THREE.Vector2>;
  uGridColor: THREE.IUniform<THREE.Color>;
  uHoverColor: THREE.IUniform<THREE.Color>;
  uSelectColor: THREE.IUniform<THREE.Color>;
  uGridOpacity: THREE.IUniform<number>;
  uOverlayOpacity: THREE.IUniform<number>;
  uHoveredSector: THREE.IUniform<number>;
  uSelectedSector: THREE.IUniform<number>;
};

export interface SectorOverlayMaterial {
  readonly material: THREE.ShaderMaterial;
  readonly uniforms: SectorOverlayUniforms;
}

export function createSectorOverlayMaterial(
  stateMap: THREE.Texture,
): SectorOverlayMaterial {
  const uniforms: SectorOverlayUniforms = {
    uStateMap: { value: stateMap },
    uGridSize: { value: new THREE.Vector2(LONGITUDE_BANDS, LATITUDE_BANDS) },
    uGridColor: { value: new THREE.Color("#8fb4ff") },
    uHoverColor: { value: new THREE.Color("#cfe4ff") },
    uSelectColor: { value: new THREE.Color(sectorVisualStyles.selected.hex) },
    uGridOpacity: { value: 0.22 },
    uOverlayOpacity: { value: 1 },
    uHoveredSector: { value: -1 },
    uSelectedSector: { value: -1 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  return { material, uniforms };
}
