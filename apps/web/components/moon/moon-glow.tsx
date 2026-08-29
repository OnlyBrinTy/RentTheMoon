"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLOW_RADIUS } from "./moon-constants";

const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDirection;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDirection = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uStrength;

varying vec3 vNormal;
varying vec3 vViewDirection;

void main() {
  float rim = 0.82 - dot(vNormal, vViewDirection);
  float intensity = pow(clamp(rim, 0.0, 1.0), 3.2) * uStrength;
  gl_FragColor = vec4(uColor, intensity);
}
`;

export function MoonGlow() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color("#7aa2ff") },
          uStrength: { value: 1.15 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[GLOW_RADIUS, 64, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
