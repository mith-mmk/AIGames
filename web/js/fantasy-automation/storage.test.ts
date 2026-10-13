import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSave, validateSave } from './storage.ts';
import { migrateGameState } from './migration.ts';
import type { GameState } from './types.ts';
import { SIZE } from './types.ts';

function savedFactory(): GameState {
  return {
    version: 1, seed: 662, tick: 144, nextId: 4, terrain: Array(SIZE * SIZE).fill('grass'),
    inventory: { wood: 11, ore: 12, ingot: 13 }, kits: { wire: 4 }, delivered: 99, won: false,
    buildings: [
      { id: 1, kind: 'belt', x: 4, z: 4, direction: 1, input: [], output: [], progress: 0,
        working: false, energy: 0, status: '搬送中', item: { resource: 'ore', automated: true }, beltProgress: 0.25 },
      { id: 2, kind: 'smelter', x: 5, z: 4, direction: 1, input: [{ resource: 'ore', automated: true }, { resource: 'ore', automated: false }],
        output: [{ resource: 'ingot', automated: true }], progress: 0.35, working: true, energy: 0,
        status: '精錬中', item: null, beltProgress: 0 },
      { id: 3, kind: 'generator', x: 5, z: 5, direction: 0, input: [{ resource: 'wood', automated: false }], output: [],
        progress: 10, working: true, energy: 15, pendingEnergy: 4, status: '完成魔力を保持中', item: null, beltProgress: 0 },
    ],
  };
}

test('save validation preserves transport provenance, reserved inputs and exact progress', () => {
  const original = savedFactory();
  const loaded = validateSave(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(loaded, migrateGameState(original));
  loaded.inventory.wood = 0;
  loaded.buildings[0].item!.automated = false;
  loaded.buildings[1].reserved![0].resource = 'wood';
  loaded.terrain[0] = 'ore';
  assert.equal(original.inventory.wood, 11);
  assert.equal(original.buildings[0].item!.automated, true);
  assert.equal(original.buildings[1].input[0].resource, 'ore');
  assert.equal(original.terrain[0], 'grass');
});

test('malformed save data is rejected rather than silently starting a new factory', () => {
  const invalid: Array<(state: any) => void> = [
    state => { state.version = 2; },
    state => { state.inventory.ore = -1; },
    state => { state.inventory.wood = NaN; },
    state => { state.tick = 1.2; },
    state => { state.terrain.pop(); },
    state => { state.terrain[0] = 'water'; },
    state => { state.buildings[0].id = 2; },
    state => { state.buildings[0].x = state.buildings[1].x; state.buildings[0].z = state.buildings[1].z; },
    state => { state.buildings[0].x = SIZE; },
    state => { state.buildings[0].direction = 4; },
    state => { state.buildings[0].item.automated = 1; },
    state => { state.buildings[0].item.resource = 'gold'; },
    state => { state.buildings[1].progress = Infinity; },
    state => { state.buildings[2].pendingEnergy = -1; },
    state => { state.buildings[2].pendingEnergy = 31; },
    state => { state.nextId = 3; },
    state => { state.delivered = 100; },
    state => { state.won = true; },
    state => { state.buildings[0].kind = 'miner'; },
    state => { state.kits.castle = 1; },
    state => { state.unrecognized = true; },
  ];
  for (const mutate of invalid) {
    const state = savedFactory();
    mutate(state);
    assert.throws(() => validateSave(state), Error);
  }
  for (const value of [null, [], {}, 'bad json']) assert.throws(() => validateSave(value), Error);
});

test('won save remains valid at the automatic delivery threshold', () => {
  const state = savedFactory();
  state.delivered = 100;
  state.won = true;
  assert.deepEqual(validateSave(state), migrateGameState(state));
});

test('unavailable storage fails clearly for save/load/clear', async () => {
  const store = new GameSave();
  await assert.rejects(store.save(savedFactory()), /保存/);
  await assert.rejects(store.load(), /保存/);
  await assert.rejects(store.clear(), /保存/);
});
