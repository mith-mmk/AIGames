import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { refreshIntelligence } from './view.mjs';

const engine = new CivilizationEngine(); engine.init({ presetId: 'small', civilizationCount: 2, seed: 83 });
const base = engine.serialize(); const own = base.units.find((unit) => unit.ownerId === 'civ-1');
const enemy = base.units.find((unit) => unit.ownerId === 'civ-2');
enemy.x = (own.x + 1) % base.world.width; enemy.y = own.y;
refreshIntelligence(base, 'civ-1'); assert.equal(engine.load(base).ok, true);
const snapshot = engine.serialize(); const visible = engine.getView('civ-1');
assert.ok(visible.units.some((unit) => unit.id === enemy.id));
assert.equal(visible.civilizations.find((civ) => civ.id === 'civ-2').treasury, undefined);
assert.equal(visible.civilizations.find((civ) => civ.id === 'civ-2').knownTechIds, undefined);
assert.deepEqual(engine.serialize(), snapshot);
visible.units[0].hp = 0; visible.world.tiles[0].terrainId = 'ocean';
assert.deepEqual(engine.serialize(), snapshot);

const hidden = structuredClone(snapshot); const hiddenEnemy = hidden.units.find((unit) => unit.id === enemy.id);
hiddenEnemy.x = (own.x + 20) % hidden.world.width; hiddenEnemy.y = Math.min(hidden.world.height - 1, own.y + 10);
assert.equal(engine.load(hidden).ok, true);
assert.equal(engine.getView('civ-1').units.some((unit) => unit.id === enemy.id), false);
assert.equal(engine.getCombatPreview('civ-1', own.id, enemy.id).reason, 'NOT_VISIBLE');
const unloaded = engine.serialize();
for (let index = 0; index < 5; index += 1) { engine.getView('civ-1'); engine.getPathPreview('civ-1', own.id, { x: own.x, y: own.y }); }
assert.deepEqual(engine.serialize(), unloaded);
console.log('views and previews are pure, detached, and hide enemy units and private economy');
