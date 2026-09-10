import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';

const config = (count = 2) => ({ presetId: 'custom', width: 48, height: 32, civilizationCount: count, speed: 1, maxRounds: 120, mapType: 'continents', seed: 42, humanCivId: 'civ-1', civilizationIds: Array.from({ length: count }, (_, index) => `civ-${index + 1}`) });
for (let count = 2; count <= 8; count += 1) {
  const engine = new CivilizationEngine(); assert.equal(engine.init(config(count)).ok, true); const state = engine.serialize(); assert.equal(state.units.length, count * 3); assert.equal(new Set(state.units.filter((unit) => unit.typeId === 'settler').map((unit) => `${unit.x},${unit.y}`)).size, count);
}
const engine = new CivilizationEngine(); engine.init(config()); const beforeInvalid = engine.serialize(); assert.equal(engine.dispatch({ type: 'unit.move', civId: 'civ-2', unitId: 'unit-1', to: { x: 0, y: 0 } }).ok, false); assert.deepEqual(engine.serialize(), beforeInvalid);
const beforeView = engine.serialize(); const view = engine.getView('civ-1'); assert.equal(view.config.seed, 42); assert.deepEqual(engine.serialize(), beforeView);
const settler = engine.serialize().units.find((unit) => unit.ownerId === 'civ-1' && unit.typeId === 'settler'); assert.equal(engine.dispatch({ type: 'unit.foundCity', civId: 'civ-1', unitId: settler.id, name: '起点' }).ok, true); const city = engine.serialize().cities[0]; assert.equal(city.focus, 'balanced'); assert.equal(city.workedTileIds.length + city.specialists.scientist + city.specialists.taxCollector + city.specialists.entertainer, city.population);
assert.equal(engine.getPathPreview('civ-1', 'missing-unit', { x: 0, y: 0 }).ok, false);
const valid = engine.serialize(); valid.rulesVersion = 999; assert.equal(engine.load(valid).ok, false); assert.equal(engine.serialize().rulesVersion, 1);
console.log('civilization engine smoke passed');
