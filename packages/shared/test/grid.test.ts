import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allSectorIds,
  formatSectorCoordinates,
  getSectorInfo,
  indicesFromLatLon,
  InvalidSectorError,
  isValidSectorId,
  latitudeIndexOf,
  LATITUDE_BANDS,
  latLonToVector3,
  longitudeIndexOf,
  LONGITUDE_BANDS,
  MAX_SECTOR_ID,
  normalizeLongitude,
  sectorBounds,
  sectorCenter,
  sectorIdFromIndices,
  sectorIdFromLatLon,
  sectorMetadata,
  TOTAL_SECTORS,
  vector3ToLatLon,
} from "../dist/index.js";

test("grid dimensions match the 5 degree specification", () => {
  assert.equal(LATITUDE_BANDS, 36);
  assert.equal(LONGITUDE_BANDS, 72);
  assert.equal(TOTAL_SECTORS, 2592);
  assert.equal(MAX_SECTOR_ID, 2591);
});

test("sectorId is latitudeIndex * 72 + longitudeIndex", () => {
  assert.equal(sectorIdFromIndices(0, 0), 0);
  assert.equal(sectorIdFromIndices(1, 0), 72);
  assert.equal(sectorIdFromIndices(25, 42), 25 * 72 + 42);
  assert.equal(sectorIdFromIndices(35, 71), 2591);
});

test("sector id decomposition round-trips for every sector", () => {
  for (const sectorId of allSectorIds()) {
    const latitudeIndex = latitudeIndexOf(sectorId);
    const longitudeIndex = longitudeIndexOf(sectorId);
    assert.equal(sectorIdFromIndices(latitudeIndex, longitudeIndex), sectorId);
  }
});

test("identical coordinates always resolve to the same sector", () => {
  const samples: Array<[number, number]> = [
    [0, 0],
    [17.5, 42.5],
    [-89.9, -179.9],
    [45, 90],
    [-33.3, 121.7],
  ];

  for (const [lat, lon] of samples) {
    const first = sectorIdFromLatLon(lat, lon);
    const second = sectorIdFromLatLon(lat, lon);
    assert.equal(first, second);
    assert.ok(isValidSectorId(first));
  }
});

test("a coordinate always falls inside its own sector bounds", () => {
  for (let lat = -89.5; lat < 90; lat += 7.3) {
    for (let lon = -179.5; lon < 180; lon += 11.7) {
      const bounds = sectorBounds(sectorIdFromLatLon(lat, lon));
      assert.ok(lat >= bounds.latMin && lat < bounds.latMax, `lat ${lat}`);
      assert.ok(lon >= bounds.lonMin && lon < bounds.lonMax, `lon ${lon}`);
    }
  }
});

test("poles and the antimeridian clamp into valid sectors", () => {
  assert.equal(indicesFromLatLon(90, 0).latitudeIndex, 35);
  assert.equal(indicesFromLatLon(-90, 0).latitudeIndex, 0);
  assert.ok(isValidSectorId(sectorIdFromLatLon(90, 180)));
  assert.ok(isValidSectorId(sectorIdFromLatLon(-90, -180)));
});

test("longitude wraps rather than overflowing", () => {
  assert.equal(normalizeLongitude(180), -180);
  assert.equal(normalizeLongitude(-181), 179);
  assert.equal(sectorIdFromLatLon(0, 190), sectorIdFromLatLon(0, -170));
});

test("invalid sector ids are rejected", () => {
  assert.equal(isValidSectorId(-1), false);
  assert.equal(isValidSectorId(2592), false);
  assert.equal(isValidSectorId(1.5), false);
  assert.throws(() => sectorBounds(2592), InvalidSectorError);
  assert.throws(() => sectorIdFromIndices(36, 0), InvalidSectorError);
  assert.throws(() => sectorIdFromIndices(0, 72), InvalidSectorError);
});

test("sector 1842 reports the expected geography", () => {
  const info = getSectorInfo(1842);
  assert.equal(info.latitudeIndex, 25);
  assert.equal(info.longitudeIndex, 42);
  assert.deepEqual(info.bounds, {
    latMin: 35,
    latMax: 40,
    lonMin: 30,
    lonMax: 35,
  });
  assert.deepEqual(sectorCenter(1842), { lat: 37.5, lon: 32.5 });
  assert.equal(formatSectorCoordinates(1842), "35°N – 40°N, 30°E – 35°E");
});

test("metadata carries immutable geography only", () => {
  const metadata = sectorMetadata(1842);
  assert.equal(metadata.name, "Lunar Sector #1842");
  const traits = metadata.attributes.map((attribute) => attribute.trait_type);
  assert.deepEqual(traits, [
    "Latitude",
    "Longitude",
    "Latitude Index",
    "Longitude Index",
  ]);
  const mutableTraits = ["Owner", "Renter", "Status", "Sale Price", "Rental Price"];
  for (const trait of mutableTraits) {
    assert.equal(traits.includes(trait), false, `metadata must not expose ${trait}`);
  }
});

test("lat/lon to vector conversion round-trips", () => {
  for (const [lat, lon] of [
    [0, 0],
    [37.5, 32.5],
    [-62.5, -147.5],
    [87.5, 177.5],
  ] as Array<[number, number]>) {
    const restored = vector3ToLatLon(latLonToVector3(lat, lon, 1));
    assert.ok(Math.abs(restored.lat - lat) < 1e-9, `lat ${lat} -> ${restored.lat}`);
    assert.ok(Math.abs(restored.lon - lon) < 1e-9, `lon ${lon} -> ${restored.lon}`);
  }
});

test("surface points map back to their own sector", () => {
  for (const sectorId of [0, 1, 71, 72, 1842, 2591]) {
    const center = sectorCenter(sectorId);
    const restored = vector3ToLatLon(latLonToVector3(center.lat, center.lon, 3));
    assert.equal(sectorIdFromLatLon(restored.lat, restored.lon), sectorId);
  }
});
