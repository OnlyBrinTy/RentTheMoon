import { sectorBounds, sectorCenter } from "./grid.js";

export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function latLonToVector3(
  lat: number,
  lon: number,
  radius = 1,
): Vector3Tuple {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lon + 180) * DEG2RAD;

  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function vector3ToLatLon(v: Vector3Tuple): { lat: number; lon: number } {
  const radius = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (radius === 0) return { lat: 0, lon: 0 };

  const phi = Math.acos(Math.min(1, Math.max(-1, v.y / radius)));
  const theta = Math.atan2(v.z, -v.x);

  const lat = 90 - phi * RAD2DEG;
  const lon = theta * RAD2DEG - 180;

  return { lat, lon: ((((lon + 180) % 360) + 360) % 360) - 180 };
}

export function sectorCenterVector(sectorId: number, radius = 1): Vector3Tuple {
  const center = sectorCenter(sectorId);
  return latLonToVector3(center.lat, center.lon, radius);
}

export function sectorOutlinePoints(
  sectorId: number,
  radius = 1,
  segmentsPerEdge = 6,
): Vector3Tuple[] {
  const { latMin, latMax, lonMin, lonMax } = sectorBounds(sectorId);
  const points: Vector3Tuple[] = [];

  const pushEdge = (
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ) => {
    for (let step = 0; step < segmentsPerEdge; step += 1) {
      const t = step / segmentsPerEdge;
      points.push(
        latLonToVector3(
          from.lat + (to.lat - from.lat) * t,
          from.lon + (to.lon - from.lon) * t,
          radius,
        ),
      );
    }
  };

  pushEdge({ lat: latMin, lon: lonMin }, { lat: latMin, lon: lonMax });
  pushEdge({ lat: latMin, lon: lonMax }, { lat: latMax, lon: lonMax });
  pushEdge({ lat: latMax, lon: lonMax }, { lat: latMax, lon: lonMin });
  pushEdge({ lat: latMax, lon: lonMin }, { lat: latMin, lon: lonMin });
  points.push(latLonToVector3(latMin, lonMin, radius));

  return points;
}

export function sectorSurfaceGrid(
  sectorId: number,
  radius = 1,
  subdivisions = 3,
): { positions: Float32Array; indices: Uint16Array } {
  const { latMin, latMax, lonMin, lonMax } = sectorBounds(sectorId);
  const rows = subdivisions + 1;
  const positions = new Float32Array(rows * rows * 3);
  const indices: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    const lat = latMin + ((latMax - latMin) * row) / subdivisions;
    for (let col = 0; col < rows; col += 1) {
      const lon = lonMin + ((lonMax - lonMin) * col) / subdivisions;
      const { x, y, z } = latLonToVector3(lat, lon, radius);
      const offset = (row * rows + col) * 3;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
    }
  }

  for (let row = 0; row < subdivisions; row += 1) {
    for (let col = 0; col < subdivisions; col += 1) {
      const a = row * rows + col;
      const b = a + 1;
      const c = a + rows;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return { positions, indices: new Uint16Array(indices) };
}
