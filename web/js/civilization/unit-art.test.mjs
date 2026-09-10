import assert from 'node:assert/strict';
import { UNIT_ART, UnitArtStore, representativeUnit, nextStackUnit, unitStateLabel } from './unit-art.mjs';
import { UNITS } from './data.mjs';
import { readFile } from 'node:fs/promises';

assert.deepEqual(Object.keys(UNIT_ART), Object.keys(UNITS));
const settler = { id: 'civilian', typeId: 'settler', movementLeft: 2, stance: 'active' };
const warrior = { id: 'army', typeId: 'warrior', movementLeft: 1, stance: 'active' };
const scout = { id: 'scout', typeId: 'scout', movementLeft: 0, stance: 'active' };
const cargo = { ...scout, id: 'cargo', transportedByUnitId: 'ship' };
const stack = [settler, warrior, scout, cargo];
assert.equal(representativeUnit(stack).id, 'army');
assert.equal(representativeUnit(stack, 'civilian').id, 'civilian');
assert.equal(nextStackUnit(stack, 'scout').id, 'civilian');
assert.equal(nextStackUnit(stack).id, 'army');
assert.equal(unitStateLabel(scout), '行動済み');
assert.equal(unitStateLabel(cargo), '積載中');

let attempts = 0; let failOne = true;
const store = new UnitArtStore(() => ({ set src(value) {
  attempts++;
  queueMicrotask(() => { if (failOne && value.endsWith('/settler.png')) this.onerror(); else this.onload(); });
} }));
await assert.rejects(store.load(), /開拓者 \(settler.png\)/);
assert.equal(store.ready, false); assert.equal(store.images.size, 21);
failOne = false; await store.load();
assert.equal(attempts, 23, 'retry only requests the failed asset');
assert.equal(store.ready, true); await store.load(); assert.equal(attempts, 23, 'successful preload is reused');

for (const [id, art] of Object.entries(UNIT_ART)) {
  const png = await readFile(new URL(art.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${id} is a real PNG`);
  assert.equal(png[25], 6, `${id} must have an RGBA channel, not a painted checkerboard background`);
}

console.log('22 dedicated RGBA unit assets, representative selection, state labels and preload retry passed');
