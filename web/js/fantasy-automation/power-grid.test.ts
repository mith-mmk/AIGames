import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Simulation } from './simulation';
import { powerCells, powerConnected, powerNetworks, powerPreview } from './power-grid';
import { SIZE, type Building, type Kind } from './types';
import { validateSave } from './storage';

const node = (id: number, kind: Kind, x: number, z: number, extra: Partial<Building> = {}): Building => ({ id, kind, x, z, direction: 1, input: [], output: [], reserved: [], progress: 0, working: false, energy: 0, status: '', item: null, beltProgress: 0, ...extra });
function factory(buildings: Building[]) {
  const simulation = new Simulation(), state = simulation.snapshot();
  state.buildings = buildings; state.nextId = Math.max(...buildings.map(b => b.id)) + 1; state.kits = {};
  state.inventory.wood = state.inventory.ingot = 100;
  for (const b of buildings) if (b.kind === 'miner') state.terrain[b.z * SIZE + b.x] = 'ore';
  simulation.restore(state); return simulation;
}

test('pole supply and links include exactly three grid steps and preserve legacy adjacent connections', () => {
  const pole = node(1, 'wire', 10, 10);
  for (const kind of ['wire', 'generator', 'miner', 'smelter'] as Kind[]) {
    assert(powerConnected(pole, node(2, kind, 13, 10)));
    assert(powerConnected(pole, node(2, kind, 12, 11)));
    assert(!powerConnected(pole, node(2, kind, 14, 10)));
    assert(!powerConnected(pole, node(2, kind, 12, 12)));
  }
  assert(powerConnected(node(1, 'generator', 0, 0), node(2, 'smelter', 0, 1)));
  assert(!powerConnected(node(1, 'generator', 0, 0), node(2, 'smelter', 0, 2)));
  assert(!powerConnected(pole, node(2, 'belt', 11, 10)));
  const cells = powerCells(10, 10); assert.equal(cells.length, 25);
  assert(cells.some(c => c.x === 13 && c.z === 10)); assert(!cells.some(c => c.x === 12 && c.z === 12));
  assert(powerCells(0, 0).every(c => c.x >= 0 && c.z >= 0));
});

test('three-step pole chains power a distant machine and cutting the bridge pauses reserved work', () => {
  const s = factory([node(1, 'generator', 8, 16, { energy: 30 }), node(2, 'wire', 11, 16), node(3, 'wire', 14, 16), node(4, 'miner', 17, 16)]);
  s.step(); const miner = s.state.buildings.find(b => b.id === 4)!;
  assert(miner.working); assert.equal(s.state.buildings[0].energy, 28);
  assert(s.command({ type: 'remove', id: 2 }).ok);
  const progress = miner.progress, items = structuredClone(miner.reserved);
  for (let i = 0; i < 80; i++) s.step();
  assert.equal(miner.progress, progress); assert.deepEqual(miner.reserved, items); assert.equal(miner.output.length, 0);
  assert(!powerNetworks(s.state.buildings).get(4)?.generators.length);
  assert(s.command({ type: 'build', kind: 'wire', x: 11, z: 16, direction: 0 }).ok);
  for (let i = 0; i < 45; i++) s.step();
  assert(miner.output.some(item => item.resource === 'ore')); assert(s.state.buildings[0].energy < 28);
});

test('overlapping and cyclic pole links never duplicate generators or available energy', () => {
  const buildings = [node(9, 'generator', 8, 16, { energy: 1 }), node(2, 'wire', 9, 16), node(3, 'wire', 10, 16), node(4, 'wire', 11, 16), node(5, 'miner', 12, 16)];
  const grid = powerNetworks(buildings); assert.deepEqual(grid.get(5)?.generators.map(b => b.id), [9]);
  assert.deepEqual([...new Set(grid.get(5)?.members)].sort(), [...grid.get(5)!.members].sort());
  const s = factory(buildings); s.step(); assert(!s.state.buildings.find(b => b.id === 5)!.working);
  assert.equal(s.state.buildings.find(b => b.id === 9)!.energy, 1);
  assert.equal(powerPreview(node(0, 'wire', 12, 17), buildings).energized, true);
});

test('range previews are pure, match the actual connected component, and distinguish empty from disconnected', () => {
  const buildings = [node(1, 'generator', 8, 16), node(2, 'wire', 11, 16)];
  const original = structuredClone(buildings), preview = powerPreview(node(3, 'wire', 14, 16), buildings);
  assert(preview.hasGenerator); assert(!preview.energized); assert.deepEqual(preview.connections.map(b => b.id), [2]);
  const placed = powerNetworks([...buildings, node(3, 'wire', 14, 16)]);
  assert.deepEqual(placed.get(3)?.generators.map(b => b.id), [1]); assert.deepEqual(buildings, original);
  assert(!powerPreview(node(3, 'wire', 15, 16), buildings).hasGenerator);
});

test('existing version-5 factories retain exact save fields and reconstruct the extended network on resume', () => {
  const s = factory([node(1, 'generator', 8, 16, { energy: 30 }), node(2, 'wire', 11, 16), node(3, 'wire', 14, 16), node(4, 'miner', 17, 16)]);
  s.step(); const snapshot = s.snapshot(), resumed = new Simulation(); resumed.restore(validateSave(JSON.parse(JSON.stringify(snapshot))));
  assert.deepEqual(resumed.snapshot(), snapshot);
  for (let i = 0; i < 50; i++) { s.step(); resumed.step(); }
  assert.deepEqual(resumed.snapshot(), s.snapshot());
  const historical = JSON.parse(fs.readFileSync('artifacts/fantasy-automation/phase4/fixtures/world-awakened-ready.json', 'utf8'));
  const copy = structuredClone(historical); resumed.restore(historical); const migrated = resumed.snapshot();
  assert.equal(migrated.version, 5); assert.deepEqual(historical, copy); assert.deepEqual(migrated.inventory, historical.inventory);
  for (const old of historical.buildings) { const current = migrated.buildings.find(b => b.id === old.id)!; for (const key of ['x', 'z', 'direction', 'input', 'output', 'reserved', 'progress', 'energy'] as const) assert.deepEqual(current[key], old[key]); }
});
