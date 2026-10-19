import { commonKind, LEGACY_DEFINITIONS } from './data';
import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateGameState } from './migration.ts';
import { validateSave } from './storage.ts';
import { canResearch, techNodeStates } from './technology.ts';
import { getObjective } from './objectives.ts';
import type { Building, GameState } from './types.ts';

function facility(id: number, kind: Building['kind'], extra: Partial<Building> = {}): Building {
  return { id, kind, x: id, z: 4, direction: 1, input: [], output: [], reserved: [], item: null, beltProgress: 0,
    progress: 0, working: false, energy: 0, status: '保存中の工房', ...extra };
}
function historical(): GameState {
  return { version: 3, seed: 662, tick: 5000, nextId: 6, terrain: Array(1024).fill('grass'),
    inventory: { wood: 9, ore: 8, ingot: 7, rawCrystal: 6, crystal: 5, sword: 4, runeCore: 3, golemFrame: 2, golem: 1 }, kits: { storage: 1 }, delivered: 10, won: false,
    research: { unlocked: ['basic', 'logistics', 'crystals', 'assembly', 'mastery', 'runecraft', 'golemcraft', 'sanctuary'], tracked: 'sanctuary' },
    stats: { produced: { ingot: 105, crystal: 12, sword: 12, runeCore: 5, golemFrame: 5, golem: 3 }, delivered: { ingot: 10, sword: 10 }, recentSwordTicks: [4900, 4950], peakSwordRate: 10, golemTransfers: 21, golemFuelTransfers: 20 },
    inventoryItems: [{ resource: 'golem', automated: true, handled: true }],
    buildings: [facility(1, 'belt', { item: { resource: 'sword', automated: true }, beltProgress: 0.3 }),
      facility(2, 'storage', { input: [{ resource: 'ingot', automated: true }, { resource: 'crystal', automated: true, handled: true }] }),
      facility(3, 'golemRelay', { golemWorker: { resource: 'golem', automated: true }, golemPolicy: 'fuel', golemCooldown: 17, golemRoute: { sourceId: 2, targetId: 4, resource: 'wood', tick: 4999 } }),
      facility(4, 'generator', { input: [], reserved: [{ resource: 'wood', automated: false }], working: true, progress: 10, energy: 25, pendingEnergy: 20 }),
      facility(5, 'golemForge', { recipe: 'golem', working: true, progress: 4, reserved: [{ resource: 'runeCore', automated: true }, { resource: 'golemFrame', automated: true }] })] };
}

test('version 3 migrates to version 5 preserving all old material, work, power and golem activity without gifting portal provenance', () => {
  const old = historical(), before = structuredClone(old), converted = validateSave(old);
  assert.deepEqual(old, before); assert.equal(converted.version, 5);
  assert.deepEqual(converted.buildings, old.buildings.map(b => ({ ...b, kind: commonKind(b.kind), ...(LEGACY_DEFINITIONS[b.kind].recipes ? { recipe: b.recipe ?? LEGACY_DEFINITIONS[b.kind].recipes![0] } : {}), constructionCost: LEGACY_DEFINITIONS[b.kind].cost }))); assert.deepEqual(converted.inventoryItems, old.inventoryItems);
  assert.deepEqual(converted.terrain, old.terrain); assert.deepEqual(converted.research, old.research);
  assert.deepEqual(converted.inventory, { ...old.inventory, essence: 0, portalCore: 0, worldSeed: 0 });
  assert.deepEqual(converted.stats, { ...old.stats, portalTransfers: 0, treeGrowth: 0 });
  assert.equal(converted.buildings[0].item!.throughPortal, undefined);
  assert.equal(converted.buildings[2].golemWorker!.throughPortal, undefined);
  assert.equal(canResearch(converted, 'alchemy').ok, true);
  assert.equal(canResearch(converted, 'portalcraft').ok, false);
  assert.deepEqual(migrateGameState(converted), converted);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(converted))), converted);
});

test('historical version 3 rejects future resources, kinds, techniques, fields and even false portal flags', () => {
  const invalid: Array<(state: any) => void> = [
    state => { state.inventory.essence = 0; }, state => { state.inventoryItems[0].throughPortal = true; },
    state => { state.buildings[0].item.throughPortal = false; }, state => { state.buildings[2].golemWorker.throughPortal = true; },
    state => { state.buildings[0].kind = 'portalGate'; }, state => { state.kits.worldTree = 1; },
    state => { state.stats.portalTransfers = 0; }, state => { state.stats.treeGrowth = 0; },
    state => { state.research.unlocked.push('alchemy'); }, state => { state.research.tracked = 'worldAwakened'; },
    state => { state.buildings[4].recipe = 'worldSeed'; }, state => { state.buildings[1].treeGrowth = 0; },
    state => { state.buildings[1].portalRole = 'send'; },
    ...['essence', 'portalCore', 'worldSeed'].map(resource => (state: any) => { state.buildings[2].golemRoute.resource = resource; }),
  ];
  for (const change of invalid) { const value = historical(); change(value); assert.throws(() => validateSave(value)); }
});

function portalSave(): GameState {
  const state = validateSave(historical()); state.nextId = 9;
  state.research!.unlocked.push('alchemy', 'portalcraft', 'worldGrafting');
  state.stats!.produced.essence = 5; state.stats!.produced.portalCore = 2; state.stats!.produced.worldSeed = 5;
  state.stats!.portalTransfers = 10; state.stats!.treeGrowth = 2;
  state.buildings.push(facility(6, 'portalGate', { portalChannel: 2, portalRole: 'send', portalCooldown: 19,
    input: [{ resource: 'worldSeed', automated: true, throughPortal: false }], portalRoute: { targetId: 7, resource: 'ingot', tick: 4999 } }),
  facility(7, 'portalGate', { portalChannel: 2, portalRole: 'receive', portalCooldown: 0,
    output: [{ resource: 'worldSeed', automated: true, throughPortal: true }] }),
  facility(8, 'worldTree', { treeGrowth: 2, input: [{ resource: 'worldSeed', automated: true, throughPortal: true }] }));
  return state;
}

test('version 4 roundtrips both gate roles, channel, cooldown, route, growth and per-item portal provenance', () => {
  const state = portalSave();
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(state))), state);
  const loaded = validateSave(state); loaded.buildings[6].output[0].throughPortal = false;
  assert.equal(state.buildings[6].output[0].throughPortal, true);
  state.buildings.splice(6, 1); // Historical portal visual route may point to a subsequently removed receiver.
  assert.deepEqual(validateSave(state), state);
});

test('version 4 retains all three new resources in historical golem route records', () => {
  for (const resource of ['essence', 'portalCore', 'worldSeed'] as const) {
    const state = portalSave(); state.buildings[2].golemRoute!.resource = resource;
    assert.deepEqual(validateSave(state), state);
  }
});

test('version 4 strictly rejects malformed gates, tree state and nonboolean item provenance', () => {
  const invalid: Array<(state: any) => void> = [
    state => { state.buildings[5].portalChannel = 0; }, state => { state.buildings[5].portalChannel = 4; },
    state => { state.buildings[5].portalRole = 'other'; }, state => { state.buildings[5].portalCooldown = 20; },
    state => { state.buildings[5].portalCooldown = 0.5; }, state => { delete state.buildings[5].portalRole; },
    state => { delete state.buildings[5].portalChannel; }, state => { delete state.buildings[5].portalCooldown; },
    state => { state.buildings[5].output.push({ resource: 'wood', automated: true }); },
    state => { state.buildings[6].input.push({ resource: 'wood', automated: true }); },
    state => { state.buildings[5].energy = 1; }, state => { state.buildings[5].working = true; },
    state => { state.buildings[5].golemPolicy = 'fuel'; }, state => { state.buildings[5].portalRoute.targetId = 6; },
    state => { state.buildings[5].portalRoute.targetId = 9; }, state => { state.buildings[5].portalRoute.tick = 5001; },
    state => { state.buildings[5].input[0].throughPortal = 1; }, state => { state.buildings[7].treeGrowth = 11; },
    state => { state.buildings[7].treeGrowth = 1.1; }, state => { delete state.buildings[7].treeGrowth; },
    state => { state.buildings[7].input[0].resource = 'wood'; }, state => { state.buildings[7].output.push({ resource: 'worldSeed', automated: true }); },
    state => { state.buildings[0].portalCooldown = 0; }, state => { state.buildings[2].treeGrowth = 0; },
    state => { state.stats.portalTransfers = -1; }, state => { state.stats.treeGrowth = 0.5; },
    state => { delete state.stats.portalTransfers; }, state => { state.version = 6; },
  ];
  for (const change of invalid) { const value = portalSave(); change(value); assert.throws(() => validateSave(value)); }
});

test('fourth-stage goals follow actual automatic production, first portal passes and tree growth at iron delivery ten', () => {
  const state = validateSave(historical());
  assert.match(getObjective(state).title, /錬金術を研究する/);
  state.research!.unlocked.push('alchemy');
  assert.equal(canResearch(state, 'portalcraft').ok, false);
  state.stats!.produced.essence = 5;
  assert.equal(canResearch(state, 'portalcraft').ok, true);
  state.research!.unlocked.push('portalcraft');
  assert.match(getObjective(state).title, /初回転送/);
  state.stats!.portalTransfers = 9; assert.equal(canResearch(state, 'worldGrafting').ok, false);
  state.stats!.portalTransfers = 10; assert.equal(canResearch(state, 'worldGrafting').ok, true);
  state.research!.unlocked.push('worldGrafting');
  state.stats!.produced.worldSeed = 10000; state.stats!.treeGrowth = 9;
  assert.equal(canResearch(state, 'worldAwakened').ok, false, 'Lifetime seed production cannot substitute for tree growth');
  assert.equal(getObjective(state).resource, 'worldSeed'); assert.equal(getObjective(state).current, 9);
  state.stats!.treeGrowth = 10; assert.equal(canResearch(state, 'worldAwakened').ok, true);
  state.research!.unlocked.push('worldAwakened');
  assert.equal(techNodeStates(state).every(node => node.status === 'unlocked'), true);
  assert.match(getObjective(state).title, /世界樹の覚醒.*自由に拡張/);
  assert.equal(getObjective(state).completed, true);
});
