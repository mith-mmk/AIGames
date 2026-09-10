import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { TERRAIN } from './data.mjs';
import { adjacent, cityRadiusTiles } from './world.mjs';
import { chebyshevWrapped } from './rules.mjs';
import { validateSnapshot } from './state.mjs';
import * as catalog from './data.mjs';

for (const presetId of ['small', 'standard', 'large']) for (const mapType of ['continents', 'archipelago']) for (const civilizationCount of [2, 8]) {
  const config = { presetId, mapType, civilizationCount, speed: civilizationCount === 2 ? .6 : 1.5, maxRounds: civilizationCount === 2 ? 120 : 1000, seed: 0xffffffff };
  const a = new CivilizationEngine(); const b = new CivilizationEngine();
  assert.equal(a.init(config).ok, true); assert.equal(b.init(config).ok, true);
  const state = a.serialize(); assert.deepEqual(state, b.serialize()); assert.equal(validateSnapshot(state, catalog), true);
  const starts = state.units.filter((unit) => unit.typeId === 'settler');
  for (const start of starts) {
    assert.equal(TERRAIN[state.world.tiles[start.y * state.world.width + start.x].terrainId].water, false);
    assert.equal(cityRadiusTiles(state.world, start).length, 21);
    assert.ok(starts.filter((other) => other.id !== start.id).every((other) => chebyshevWrapped(state.world, start, other) >= 4));
  }
  for (const tile of state.world.tiles.filter((tile) => tile.terrainId === 'coast')) assert.ok(adjacent(state.world, tile).some((neighbor) => !TERRAIN[neighbor.terrainId].water));
  assert.ok(state.world.tiles.some((tile) => tile.terrainId === 'ocean'));
  assert.ok(state.world.tiles.some((tile) => tile.terrainId === 'grassland'));
}
console.log('12 map/size/count/speed/round endpoints: deterministic worlds, separated starts, coastal topology passed');
