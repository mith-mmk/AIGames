import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateGameState } from './migration.ts';
import { GameSave, validateSave } from './storage.ts';
import { canResearch, techNodeStates } from './technology.ts';
import type { Building, GameState } from './types.ts';

function building(id: number, kind: Building['kind'], extra: Partial<Building> = {}): Building {
  return { id, kind, x: id, z: 3, direction: 1, input: [], output: [], reserved: [], item: null, beltProgress: 0,
    progress: 0, working: false, energy: 0, status: '旧進行を保持', ...extra };
}
function historical(): GameState {
  return { version: 2, seed: 12, tick: 5000, nextId: 5, terrain: Array(1024).fill('grass'),
    inventory: { wood: 9, ore: 8, ingot: 7, rawCrystal: 6, crystal: 5, sword: 4 }, kits: { storage: 1 },
    delivered: 100, won: true, research: { unlocked: ['basic', 'logistics', 'crystals', 'assembly', 'mastery'], tracked: 'mastery' },
    stats: { produced: { ingot: 105, crystal: 12, sword: 12 }, delivered: { ingot: 100, sword: 10 }, recentSwordTicks: [4900, 4950], peakSwordRate: 10 },
    inventoryItems: [{ resource: 'crystal', automated: true, handled: true }],
    buildings: [building(1, 'belt', { item: { resource: 'sword', automated: true }, beltProgress: 0.3 }),
      building(2, 'storage', { input: [{ resource: 'ingot', automated: true }, { resource: 'crystal', automated: true, handled: true }] }),
      building(3, 'assembler', { recipe: 'sword', working: true, progress: 2.4, reserved: [{ resource: 'ingot', automated: true }, { resource: 'ingot', automated: true }, { resource: 'crystal', automated: true }] }),
      building(4, 'generator', { input: [], reserved: [{ resource: 'wood', automated: false }], working: true, progress: 10, energy: 25, pendingEnergy: 20 })] };
}

test('version 2 migrates to version 3 without changing old items, provenance, work, power or research', () => {
  const old = historical(), before = structuredClone(old), converted = validateSave(old);
  assert.deepEqual(old, before); assert.equal(converted.version, 3);
  assert.deepEqual(converted.buildings, old.buildings); assert.deepEqual(converted.terrain, old.terrain);
  assert.deepEqual(converted.inventory, { ...old.inventory, runeCore: 0, golemFrame: 0, golem: 0 });
  assert.deepEqual(converted.inventoryItems, old.inventoryItems); assert.deepEqual(converted.kits, old.kits);
  assert.deepEqual(converted.research, old.research); assert.equal(converted.tick, old.tick);
  assert.deepEqual(converted.stats, { ...old.stats, golemFuelTransfers: 0, golemTransfers: 0 });
  assert.equal(canResearch(converted, 'runecraft').ok, true);
  assert.equal(canResearch(converted, 'golemcraft').ok, false);
  assert.deepEqual(migrateGameState(converted), converted); assert.deepEqual(validateSave(converted), converted);
});

test('historical version 2 schema rejects third-stage fields instead of silently adopting or stripping them', () => {
  const modifications: Array<(state: any) => void> = [
    state => { state.inventory.golem = 0; }, state => { state.inventoryItems.push({ resource: 'runeCore', automated: true, handled: true }); },
    state => { state.buildings[0].item.resource = 'golem'; }, state => { state.buildings[0].golemCooldown = 0; },
    state => { state.buildings[0].kind = 'golemRelay'; }, state => { state.kits.runeCarver = 1; },
    state => { state.research.unlocked.push('runecraft'); }, state => { state.research.tracked = 'runecraft'; },
    state => { state.stats.produced.golem = 1; }, state => { state.stats.golemFuelTransfers = 0; },
    state => { state.buildings[2].recipe = 'golem'; },
  ];
  for (const change of modifications) { const value = historical(); change(value); assert.throws(() => validateSave(value)); }
});

function relaySave(): GameState {
  const state = validateSave(historical());
  state.nextId = 6;
  state.research!.unlocked.push('runecraft', 'golemcraft');
  state.stats!.produced.runeCore = 3; state.stats!.produced.golemFrame = 3;
  state.stats!.produced.golem = 3; state.stats!.golemTransfers = 21; state.stats!.golemFuelTransfers = 20;
  state.buildings.push(building(5, 'golemRelay', { golemWorker: { resource: 'golem', automated: true },
    golemPolicy: 'fuel', golemCooldown: 19, golemRoute: { sourceId: 2, targetId: 4, resource: 'wood', tick: 5000 } }));
  return state;
}

test('version 3 retains relay worker provenance, policy, cooldown and historical route exactly', () => {
  const state = relaySave();
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(state))), state);
  const loaded = validateSave(state); loaded.buildings[4].golemWorker!.handled = true;
  assert.equal(state.buildings[4].golemWorker!.handled, undefined);
  state.buildings.splice(1, 1); // A previously valid source can later be removed; the visual route remains historical.
  assert.deepEqual(validateSave(state), state);
});

test('version 3 validates relay-only state, counters, routes, workers and cooldown strictly', () => {
  const changes: Array<(state: any) => void> = [
    state => { state.buildings[4].golemWorker.resource = 'wood'; },
    state => { state.buildings[4].golemWorker.automated = 1; },
    state => { state.buildings[4].golemPolicy = 'anything'; },
    state => { state.buildings[4].golemCooldown = 20; }, state => { state.buildings[4].golemCooldown = 1.5; },
    state => { delete state.buildings[4].golemPolicy; }, state => { delete state.buildings[4].golemCooldown; },
    state => { state.buildings[4].working = true; }, state => { state.buildings[4].input.push({ resource: 'golem', automated: true }); },
    state => { delete state.buildings[4].golemWorker; state.buildings[4].input.push({ resource: 'wood', automated: true }); },
    state => { state.buildings[4].output.push({ resource: 'golem', automated: true }); },
    state => { state.buildings[0].golemCooldown = 0; }, state => { state.stats.golemFuelTransfers = 22; },
    state => { state.stats.golemTransfers = -1; }, state => { state.buildings[4].golemRoute.tick = 5001; },
    state => { state.buildings[4].golemRoute.sourceId = 0; }, state => { state.buildings[4].golemRoute.sourceId = 6; },
    state => { state.buildings[4].golemRoute.targetId = 2; }, state => { state.buildings[4].golemRoute.resource = 'unknown'; },
    state => { state.research.unlocked = ['basic', 'golemcraft']; }, state => { state.version = 99; },
  ];
  for (const change of changes) { const value = relaySave(); change(value); assert.throws(() => validateSave(value)); }
});

test('third-stage research uses produced components and actual automatic fuel transfers', () => {
  const state = validateSave(historical());
  assert.equal(canResearch(state, 'runecraft').ok, true);
  state.research!.unlocked.push('runecraft');
  state.stats!.produced.runeCore = 3; state.stats!.produced.golemFrame = 2;
  assert.equal(canResearch(state, 'golemcraft').ok, false);
  state.stats!.produced.golemFrame = 3; assert.equal(canResearch(state, 'golemcraft').ok, true);
  state.research!.unlocked.push('golemcraft'); state.stats!.produced.golem = 3;
  state.stats!.golemTransfers = 200; state.stats!.golemFuelTransfers = 19;
  assert.equal(canResearch(state, 'sanctuary').ok, false);
  state.stats!.golemFuelTransfers = 20; assert.equal(canResearch(state, 'sanctuary').ok, true);
  const node = techNodeStates(state).find(node => node.id === 'sanctuary')!;
  assert.equal(node.requirements[1].current, 20); assert.equal(node.requirements[1].target, 20);
  state.research!.unlocked.push('sanctuary');
  assert.equal(techNodeStates(state).every(node => node.status === 'unlocked'), true);
});


test('loading an old IndexedDB slot migrates in memory without opening a write transaction', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const slot = historical(), before = structuredClone(slot), modes: string[] = [];
  let writes = 0;
  const database = {
    onversionchange: null,
    transaction(_store: string, mode: string) {
      modes.push(mode);
      const tx: any = { objectStore: () => ({
        get() {
          const request: any = { result: structuredClone(slot) };
          queueMicrotask(() => { request.onsuccess?.(); tx.oncomplete?.(); });
          return request;
        },
        put() { writes++; throw new Error('Loading must not write'); },
        delete() { writes++; throw new Error('Loading must not delete'); },
      }) };
      return tx;
    },
    close() {},
  };
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: {
    open() { const request: any = { result: database }; queueMicrotask(() => request.onsuccess?.()); return request; },
  } });
  try {
    const loaded = await new GameSave().load();
    assert.equal(loaded!.version, 3); assert.deepEqual(slot, before);
    assert.deepEqual(modes, ['readonly']); assert.equal(writes, 0);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor);
    else delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  }
});
