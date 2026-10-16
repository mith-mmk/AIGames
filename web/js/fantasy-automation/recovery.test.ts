import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation';
import { validateSave } from './storage';
import type { Building, Kind } from './types';
const place = (s: Simulation, kind: Kind, x: number, z: number, direction: 0 | 1 | 2 | 3 = 1): Building => {
  assert(s.command({ type: 'build', kind, x, z, direction }).ok);
  return s.state.buildings.find(b => b.x === x && b.z === z)!;
};

test('unused placement undo returns exactly paid materials and sparse provenance, once', () => {
  const s = new Simulation(), original = structuredClone(s.state.inventory);
  s.state.inventoryItems = [{ resource: 'ingot', automated: true, handled: true, throughPortal: true }];
  place(s, 'belt', 17, 19); assert.equal(s.state.inventory.ingot, original.ingot - 1);
  assert(s.command({ type: 'undoBuild' }).ok); assert.deepEqual(s.state.inventory, original);
  assert.deepEqual(s.state.inventoryItems, [{ resource: 'ingot', automated: true, handled: true, throughPortal: true }]);
  assert.equal(s.command({ type: 'undoBuild' }).ok, false); assert.deepEqual(s.state.inventory, original);
  assert.deepEqual(validateSave(s.snapshot()), s.snapshot());
});

test('kit undo returns the actual kit and never mints its construction price', () => {
  const s = new Simulation(), original = s.snapshot();
  const first = place(s, 'miner', 12, 16); assert.equal(s.state.kits.miner, 0);
  assert(s.command({ type: 'undoBuild' }).ok); assert.equal(s.state.kits.miner, 1); assert.deepEqual(s.state.inventory, original.inventory);
  const second = place(s, 'miner', 12, 16); assert(second.id > first.id, 'Undo never reuses equipment IDs');
  s.command({ type: 'undoBuild' }); assert.equal(s.state.kits.miner, 1);
});

test('an idle placement remains undoable over time and rotation but not after save/load', () => {
  const s = new Simulation(), b = place(s, 'belt', 17, 19);
  for (let n = 0; n < 100; n++) s.step();
  s.command({ type: 'rotate', id: b.id }); assert.equal(s.undoPlacement()?.id, b.id);
  const saved = validateSave(s.snapshot()); s.restore(saved); assert.equal(s.undoPlacement(), null);
  assert.equal(s.command({ type: 'undoBuild' }).ok, false); assert.deepEqual(s.snapshot(), saved);
});

test('legacy or newly used belts refund wood and iron fully only after explicit removal', () => {
  const s = new Simulation(), b = place(s, 'belt', 17, 19); s.state.inventory = { ...s.state.inventory, wood: 0, ingot: 0 };
  const old = s.snapshot(); s.restore(old); assert.deepEqual(s.state.inventory, old.inventory, 'Loading never gifts recovery resources');
  assert(s.command({ type: 'remove', id: b.id }).ok); assert.equal(s.state.inventory.wood, 1); assert.equal(s.state.inventory.ingot, 1);
  assert.equal(s.command({ type: 'remove', id: b.id }).ok, false); assert.equal(s.state.inventory.ingot, 1);
  place(s, 'belt', 17, 19); assert.equal(s.state.inventory.ingot, 0);
  assert(s.command({ type: 'undoBuild' }).ok); assert.equal(s.state.inventory.ingot, 1);
});

test('repeated belt build/remove cycles conserve funds and all automatic achievement counters', () => {
  const s = new Simulation(), before = s.snapshot();
  for (let n = 0; n < 100; n++) { const b = place(s, 'belt', 17, 19); s.command({ type: 'remove', id: b.id }); }
  assert.deepEqual(s.state.inventory, before.inventory); assert.deepEqual(s.state.inventoryItems, before.inventoryItems); assert.deepEqual(s.state.stats, before.stats);
});

test('feeding then collecting invalidates full undo even when the facility becomes empty', () => {
  const s = new Simulation(), b = place(s, 'generator', 17, 19);
  s.command({ type: 'feed', id: b.id, resource: 'wood', amount: 1 }); s.command({ type: 'collect', id: b.id });
  assert.equal(s.undoPlacement(), null); assert.equal(s.command({ type: 'undoBuild' }).ok, false);
});

test('a conveyor that has carried an item cannot later qualify as an unused placement', () => {
  const s = new Simulation(); s.state.research!.unlocked.push('logistics');
  const source = place(s, 'storage', 17, 19); const belt = place(s, 'belt', 18, 19); const target = place(s, 'storage', 19, 19);
  s.command({ type: 'feed', id: source.id, resource: 'wood', amount: 1 });
  for (let n = 0; n < 40; n++) s.step();
  assert.equal(belt.item, null); assert.equal(target.input.length, 1); assert.equal(s.undoPlacement(), null);
  const before = s.state.inventory.wood; s.command({ type: 'remove', id: belt.id }); assert.equal(s.state.inventory.wood, before + 1);
});

test('a wire that supplied real production cannot be undone for full price after power is spent', () => {
  const s = new Simulation(); const generator = place(s, 'generator', 10, 16); const wire = place(s, 'wire', 11, 16); place(s, 'miner', 12, 16);
  s.command({ type: 'feed', id: generator.id, resource: 'wood', amount: 1 });
  for (let n = 0; n < 260; n++) s.step();
  assert.equal(s.undoPlacement(), null); assert.equal(s.command({ type: 'undoBuild' }).ok, false);
  assert(s.state.buildings.some(b => b.id === wire.id));
});

test('undo stack supports correcting several unused placements while preserving quantities', () => {
  const s = new Simulation(), before = s.snapshot(); const a = place(s, 'belt', 17, 19); place(s, 'belt', 18, 19);
  assert(s.command({ type: 'undoBuild' }).ok); assert.equal(s.undoPlacement()?.id, a.id);
  assert(s.command({ type: 'undoBuild' }).ok); assert.deepEqual(s.state.inventory, before.inventory);
  assert.deepEqual(s.state.inventoryItems, before.inventoryItems); assert.equal(s.state.buildings.length, 0);
});
