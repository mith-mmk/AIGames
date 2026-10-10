import assert from "node:assert/strict";
import fs from "node:fs";

import { RomaTerrain } from "./rome-320-terrain.js";

const geo = JSON.parse(
  fs.readFileSync(new URL("../assets/rome-320/geo.json", import.meta.url), "utf8"),
);
const DEG = Math.PI / 180;
const ORIGIN = { lat: 41.8945, lon: 12.49 };
const WGS84_A = 6378137;
const WGS84_E2 = 0.00669437999014;
const phi0 = ORIGIN.lat * DEG;
const wgs84W = Math.sqrt(1 - WGS84_E2 * Math.sin(phi0) ** 2);
const metresEast = (WGS84_A / wgs84W) * Math.cos(phi0) * DEG;
const metresNorth = ((WGS84_A * (1 - WGS84_E2)) / wgs84W ** 3) * DEG;
const project = (lat, lon) => ({
  x: (lon - ORIGIN.lon) * metresEast,
  y: -(lat - ORIGIN.lat) * metresNorth,
});

const terrain = RomaTerrain.create(geo, project);
const sampleHeight = (lat, lon) => {
  const point = project(lat, lon);
  return terrain.landHeight(point.x, point.y);
};

assert.equal(geo.terrainModel.verticalScale, 1);
assert.ok(geo.landmarks.length >= 40, "landmark data should remain complete");
assert.equal(sampleHeight(41.8893064, 12.4871093), 51, "Palatine plateau");
assert.equal(sampleHeight(41.89238, 12.48535), 14, "Forum valley");
assert.equal(sampleHeight(41.8859299, 12.485711), 14, "Circus valley");
assert.equal(sampleHeight(41.892222, 12.481667), 48, "Capitoline summit");
assert.ok(
  sampleHeight(41.8893064, 12.4871093) > sampleHeight(41.89238, 12.48535),
  "the Palatine must stay above the Forum",
);

console.log("rome-320 terrain tests passed");
