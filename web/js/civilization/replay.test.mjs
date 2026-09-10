import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { CivilizationAI } from './ai.mjs';

const facade = (engine) => ({ getView: (id) => engine.getView(id), getPathPreview: (...args) => engine.getPathPreview(...args), getCombatPreview: (...args) => engine.getCombatPreview(...args), dispatch: (command) => engine.dispatch(command) });
const continuous = new CivilizationEngine(); continuous.init({ presetId: 'small', civilizationCount: 2, seed: 152 });
const ai = new CivilizationAI();
for (let i = 0; i < 6; i += 1) ai.runTurn(facade(continuous), continuous.serialize().turn.activeCivId);
const save = continuous.serialize(); const resumed = new CivilizationEngine();
assert.equal(resumed.load(JSON.parse(JSON.stringify(save))).ok, true);
assert.deepEqual(resumed.serialize(), save);
for (let i = 0; i < 8; i += 1) {
  const id = continuous.serialize().turn.activeCivId;
  const a = ai.runTurn(facade(continuous), id); const b = ai.runTurn(facade(resumed), id);
  assert.deepEqual(a, b); assert.deepEqual(resumed.serialize(), continuous.serialize());
}
console.log('save/reload reproduces all future actions, IDs, RNG, events and state');
