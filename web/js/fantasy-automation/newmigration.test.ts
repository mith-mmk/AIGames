import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateGameState } from './migration.ts';
import { validateSave } from './storage.ts';
import type { Building, GameState, Item } from './types.ts';
import { SIZE } from './types.ts';
import { Simulation } from './simulation.ts';

function facility(id: number, kind: Building['kind'], x: number, z: number, extra: Partial<Building> = {}): Building {
  return { id, kind, x, z, direction: 1, input: [], output: [], item: null, beltProgress: 0,
    progress: 0, working: false, energy: 0, status: '保存時の状態', ...extra };
}

function legacy(): GameState {
  const terrain: GameState['terrain'] = Array(SIZE * SIZE).fill('grass');
  terrain[10 * SIZE + 10] = 'forest'; terrain[11 * SIZE + 10] = 'ore';
  return { version: 1, seed: 662, tick: 244, nextId: 5, terrain, inventory: { wood: 11, ore: 3, ingot: 2 }, kits: { wire: 2 }, delivered: 9, won: false,
    buildings: [facility(1, 'belt', 4, 4, { item: { resource: 'ore', automated: true }, beltProgress: 0.25 }),
      facility(2, 'smelter', 5, 4, { working: true, progress: 2, input: [{ resource: 'ore', automated: true }, { resource: 'ore', automated: false }, { resource: 'ore', automated: true }], output: [{ resource: 'ingot', automated: true }] }),
      facility(3, 'generator', 5, 5, { working: true, progress: 10, energy: 17, pendingEnergy: 4, input: [{ resource: 'wood', automated: false }] }),
      facility(4, 'wire', 20, 16)], };
}

function contents(value: GameState): Item[] {
  return value.buildings.flatMap(building => [...building.input, ...building.output, ...(building.reserved ?? []), ...(building.item ? [building.item] : [])]);
}

test('version 1 migration preserves every item, provenance, elapsed tick, work progress and stored power', () => {
  const original = legacy(), before = structuredClone(original), converted = migrateGameState(original);
  assert.equal(converted.version, 2);
  assert.deepEqual(original, before, 'Migration cannot mutate the source slot or caller state');
  assert.equal(converted.tick, original.tick); assert.equal(converted.seed, original.seed);
  assert.equal(converted.delivered, original.delivered); assert.equal(converted.nextId, original.nextId);
  assert.deepEqual(converted.kits, original.kits);
  assert.deepEqual(converted.inventory, { ...original.inventory, rawCrystal: 0, crystal: 0, sword: 0 });
  const sortItems = (items: Item[]) => items.map(item => JSON.stringify(item)).sort();
  assert.deepEqual(sortItems(contents(converted)), sortItems(contents(original)));
  for (let index = 0; index < original.buildings.length; index += 1) {
    const old = original.buildings[index], current = converted.buildings[index];
    for (const field of ['id', 'kind', 'x', 'z', 'direction', 'progress', 'working', 'energy', 'pendingEnergy', 'status', 'item', 'beltProgress'] as const) assert.deepEqual(current[field], old[field], field);
  }
  assert.deepEqual(converted.buildings[1].reserved, original.buildings[1].input.slice(0, 2));
  assert.deepEqual(converted.buildings[1].input, original.buildings[1].input.slice(2));
  assert.deepEqual(converted.buildings[2].reserved, original.buildings[2].input);
  assert.equal(converted.stats!.produced.ingot, 10);
  assert.equal(converted.stats!.produced.ore, 23);
  assert.equal(converted.stats!.delivered.ingot, 9);
  assert.equal(converted.stats!.produced.sword, 0);
  assert.deepEqual(converted.research!.unlocked, ['basic']);
  assert.deepEqual(validateSave(original), converted);
});

test('new deposits preserve existing resource tiles and every occupied tile', () => {
  const original = legacy(), converted = migrateGameState(original);
  assert.equal(converted.terrain[10 * SIZE + 10], 'forest');
  assert.equal(converted.terrain[11 * SIZE + 10], 'ore');
  assert.equal(converted.terrain[16 * SIZE + 20], original.terrain[16 * SIZE + 20], 'Occupied central wire terrain is unchanged');
  assert(converted.terrain.filter(tile => tile === 'crystal').length >= 2);
});

test('migration is idempotent and version 2 save retains metadata and exact reserved buffers', () => {
  const first = migrateGameState(legacy());
  first.research!.tracked = 'crystals';
  first.stats!.produced.sword = 11;
  first.stats!.peakSwordRate = 11;
  assert.deepEqual(migrateGameState(first), first);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(first))), first);
  const clone = migrateGameState(first); clone.buildings[1].reserved![0].automated = false;
  assert.equal(first.buildings[1].reserved![0].automated, true);
});

test('unsupported legacy facilities and missing reserved fuel reject instead of discarding data', () => {
  const unknown = legacy(); unknown.buildings[0].kind = 'storage';
  assert.throws(() => migrateGameState(unknown));
  const missing = legacy(); missing.buildings[2].input = [];
  assert.throws(() => migrateGameState(missing));
});

test('a fully occupied old map preserves terrain and can discover pending crystal deposits after removal', () => {
  const original = legacy();
  original.buildings = original.terrain.map((_, index) => facility(index + 1, 'wire', index % SIZE, Math.floor(index / SIZE)));
  original.nextId = original.buildings.length + 1;
  original.delivered = 10;
  original.inventory.ingot = 20;
  const converted = validateSave(original);
  assert.deepEqual(converted.terrain, original.terrain, 'Loading cannot repaint an occupied legacy map');
  assert.equal(converted.pendingCrystalCells!.length, 2);
  const cell = converted.pendingCrystalCells![0];
  const simulation = new Simulation(); simulation.restore(converted);
  assert(simulation.command({ type: 'remove', id: cell + 1 }).ok);
  assert.equal(simulation.state.terrain[cell], 'crystal');
  assert.equal(simulation.state.pendingCrystalCells!.includes(cell), false);
  assert(simulation.command({ type: 'research', id: 'crystals' }).ok);
  assert(simulation.command({ type: 'build', kind: 'crystalMiner', x: cell % SIZE, z: Math.floor(cell / SIZE), direction: 1 }).ok);
  assert.deepEqual(validateSave(simulation.snapshot()), simulation.snapshot());
});
