import * as THREE from "three";

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;
const CRATER_COUNT = 340;
const DEG2RAD = Math.PI / 180;

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function createNoiseLayer(
  width: number,
  height: number,
  random: () => number,
): (u: number, v: number) => number {
  const values = new Float32Array(width * height);
  for (let index = 0; index < values.length; index += 1) values[index] = random();

  return (u, v) => {
    const x = u * width;
    const y = v * height;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smoothstep(x - x0);
    const ty = smoothstep(y - y0);

    const xi0 = ((x0 % width) + width) % width;
    const xi1 = (xi0 + 1) % width;
    const yi0 = Math.min(height - 1, Math.max(0, y0));
    const yi1 = Math.min(height - 1, yi0 + 1);

    const v00 = values[yi0 * width + xi0] ?? 0;
    const v10 = values[yi0 * width + xi1] ?? 0;
    const v01 = values[yi1 * width + xi0] ?? 0;
    const v11 = values[yi1 * width + xi1] ?? 0;

    const top = v00 + (v10 - v00) * tx;
    const bottom = v01 + (v11 - v01) * tx;
    return top + (bottom - top) * ty;
  };
}

function buildHeightField(seed: number): Float32Array {
  const random = createRandom(seed);
  const heights = new Float32Array(TEXTURE_WIDTH * TEXTURE_HEIGHT);

  const layers: { sample: (u: number, v: number) => number; amplitude: number }[] = [
    { sample: createNoiseLayer(8, 4, random), amplitude: 0.42 },
    { sample: createNoiseLayer(16, 8, random), amplitude: 0.24 },
    { sample: createNoiseLayer(32, 16, random), amplitude: 0.16 },
    { sample: createNoiseLayer(64, 32, random), amplitude: 0.1 },
    { sample: createNoiseLayer(160, 80, random), amplitude: 0.08 },
  ];

  const mariaLayer = createNoiseLayer(6, 3, random);

  for (let y = 0; y < TEXTURE_HEIGHT; y += 1) {
    const v = y / (TEXTURE_HEIGHT - 1);
    for (let x = 0; x < TEXTURE_WIDTH; x += 1) {
      const u = x / TEXTURE_WIDTH;

      let height = 0;
      for (const layer of layers) height += layer.sample(u, v) * layer.amplitude;

      const maria = mariaLayer(u, v);
      if (maria > 0.62) {
        height -= (maria - 0.62) * 1.35;
      }

      heights[y * TEXTURE_WIDTH + x] = height;
    }
  }

  stampCraters(heights, random);
  return normalize(heights);
}

function stampCraters(heights: Float32Array, random: () => number): void {
  for (let crater = 0; crater < CRATER_COUNT; crater += 1) {
    const centerX = random() * TEXTURE_WIDTH;
    const centerY = random() * TEXTURE_HEIGHT;
    const latitude = (centerY / (TEXTURE_HEIGHT - 1)) * 180 - 90;
    const stretch = 1 / Math.max(0.16, Math.cos(latitude * DEG2RAD));

    const sizeRoll = random();
    const radiusY = 3 + sizeRoll * sizeRoll * 46;
    const radiusX = radiusY * stretch;
    const depth = 0.1 + random() * 0.3;

    const minX = Math.floor(centerX - radiusX * 1.25);
    const maxX = Math.ceil(centerX + radiusX * 1.25);
    const minY = Math.max(0, Math.floor(centerY - radiusY * 1.25));
    const maxY = Math.min(TEXTURE_HEIGHT - 1, Math.ceil(centerY + radiusY * 1.25));

    for (let y = minY; y <= maxY; y += 1) {
      const dy = (y - centerY) / radiusY;
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x - centerX) / radiusX;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1.22) continue;

        const wrappedX = ((x % TEXTURE_WIDTH) + TEXTURE_WIDTH) % TEXTURE_WIDTH;
        const index = y * TEXTURE_WIDTH + wrappedX;
        const current = heights[index] ?? 0;

        if (distance < 0.82) {
          const floorFalloff = 1 - (distance / 0.82) ** 2;
          heights[index] = current - depth * floorFalloff;
        } else {
          const rimPosition = (distance - 0.82) / 0.4;
          const rim = Math.sin(rimPosition * Math.PI);
          heights[index] = current + depth * 0.7 * rim;
        }
      }
    }
  }
}

function normalize(heights: Float32Array): Float32Array {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < heights.length; index += 1) {
    const value = heights[index] ?? 0;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const range = max - min || 1;
  for (let index = 0; index < heights.length; index += 1) {
    heights[index] = ((heights[index] ?? 0) - min) / range;
  }

  return heights;
}

function configureTexture(texture: THREE.DataTexture): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

export interface MoonSurfaceTextures {
  readonly colorMap: THREE.DataTexture;
  readonly bumpMap: THREE.DataTexture;
  readonly dispose: () => void;
}

export function createMoonSurfaceTextures(seed = 20_260_828): MoonSurfaceTextures {
  const heights = buildHeightField(seed);

  const colorData = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
  const bumpData = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);

  for (let index = 0; index < heights.length; index += 1) {
    const height = heights[index] ?? 0;
    const shade = 0.44 + height * 0.62;
    const offset = index * 4;

    colorData[offset] = Math.min(255, Math.round(198 * shade));
    colorData[offset + 1] = Math.min(255, Math.round(193 * shade));
    colorData[offset + 2] = Math.min(255, Math.round(186 * shade));
    colorData[offset + 3] = 255;

    const bump = Math.round(height * 255);
    bumpData[offset] = bump;
    bumpData[offset + 1] = bump;
    bumpData[offset + 2] = bump;
    bumpData[offset + 3] = 255;
  }

  const colorMap = new THREE.DataTexture(
    colorData,
    TEXTURE_WIDTH,
    TEXTURE_HEIGHT,
    THREE.RGBAFormat,
  );
  colorMap.colorSpace = THREE.SRGBColorSpace;
  configureTexture(colorMap);

  const bumpMap = new THREE.DataTexture(
    bumpData,
    TEXTURE_WIDTH,
    TEXTURE_HEIGHT,
    THREE.RGBAFormat,
  );
  configureTexture(bumpMap);

  return {
    colorMap,
    bumpMap,
    dispose: () => {
      colorMap.dispose();
      bumpMap.dispose();
    },
  };
}
