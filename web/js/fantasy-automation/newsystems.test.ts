import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation.ts';
import { BELT_SECONDS, DEFINITIONS, RECIPES, STORAGE_CAPACITY } from './data.ts';
import { canResearch, currentSwordRate } from './technology.ts';
import { validateSave } from './storage.ts';
import type { Building, GameState, Item, Kind, Resource } from './types.ts';
import { SIZE } from './types.ts';

function building(id: number, kind: Kind, x: number, z: number, extra: Partial<Building> = {}): Building {
  const recipe = DEFINITIONS[kind].recipes?.[0];
  return { id, kind, x, z, direction: 1, input: [], output: [], reserved: [], progress: 0, working: false,
    energy: 0, status: '', item: null, beltProgress: 0, ...(recipe ? { recipe } : {}), ...(kind === 'splitter' ? { splitCursor: 0 } : {}), ...extra };
}
function factory(buildings: Building[] = []): Simulation {
  const simulation = new Simulation();
  const state = simulation.snapshot();
  state.terrain = Array(SIZE * SIZE).fill('grass'); state.buildings = buildings;
  state.nextId = Math.max(0, ...buildings.map(value => value.id)) + 1;
  state.inventory = { ...state.inventory, wood: 1000, ore: 1000, ingot: 1000, rawCrystal: 1000, crystal: 1000, sword: 1000 };
  state.inventoryItems = []; state.kits = {};
  state.research = { unlocked: ['basic', 'logistics', 'crystals', 'assembly'], tracked: null };
  for (const value of buildings) {
    if (value.kind === 'miner') state.terrain[value.z * SIZE + value.x] = 'ore';
    if (value.kind === 'crystalMiner') state.terrain[value.z * SIZE + value.x] = 'crystal';
    if (value.kind === 'lumber') state.terrain[value.z * SIZE + value.x] = 'forest';
  }
  simulation.restore(state); return simulation;
}
function run(simulation: Simulation, seconds: number) { for (let tick = 0; tick < seconds * 20; tick += 1) simulation.step(); }
const auto = (resource: Resource): Item => ({ resource, automated: true });
function buffered(state: GameState): Item[] { return state.buildings.flatMap(value => [...value.input, ...value.output, ...(value.reserved ?? []), ...(value.item ? [value.item] : [])]); }

test('research and construction commands enforce locks atomically and expose both branches', () => {
  const simulation = factory(); simulation.state.research!.unlocked = ['basic'];
  for (const kind of ['storage', 'splitter', 'crystalMiner', 'crystalRefiner', 'assembler'] as const) {
    const before = simulation.snapshot();
    assert.equal(simulation.command({ type: 'build', kind, x: 4, z: 4, direction: 1 }).ok, false);
    assert.deepEqual(simulation.snapshot(), before);
  }
  assert.equal(simulation.command({ type: 'research', id: 'assembly' }).ok, false);
  simulation.state.stats!.produced.ingot = 5;
  assert(simulation.command({ type: 'research', id: 'logistics' }).ok);
  assert(simulation.command({ type: 'build', kind: 'storage', x: 4, z: 4, direction: 1 }).ok);
  simulation.state.stats!.delivered.ingot = 10; simulation.state.delivered = 10;
  assert(simulation.command({ type: 'research', id: 'crystals' }).ok);
  assert(simulation.command({ type: 'track', id: 'assembly' }).ok);
  assert.equal(simulation.state.research!.tracked, 'assembly');
  assert(simulation.command({ type: 'track', id: null }).ok);
  simulation.state.stats!.produced.ingot = 30; simulation.state.stats!.produced.crystal = 10;
  assert(simulation.command({ type: 'research', id: 'assembly' }).ok);
  assert(simulation.command({ type: 'build', kind: 'assembler', x: 5, z: 4, direction: 1 }).ok);
});

test('storage holds exactly 32 items, preserves FIFO/provenance and stalls upstream without duplication', () => {
  const queue = Array.from({ length: STORAGE_CAPACITY }, (_, index) => ({ resource: 'ore' as const, automated: index % 2 === 0, ...(index % 3 === 0 ? { handled: true } : {}) }));
  const simulation = factory([building(1, 'belt', 4, 4, { item: auto('ore'), beltProgress: BELT_SECONDS }), building(2, 'storage', 5, 4, { input: structuredClone(queue) })]);
  run(simulation, 2);
  assert.deepEqual(simulation.state.buildings[1].input, queue);
  assert.equal(buffered(simulation.state).length, 33);
  assert.equal(simulation.command({ type: 'feed', id: 2, resource: 'ore', amount: 1 }).ok, false);
  assert(simulation.command({ type: 'build', kind: 'belt', x: 6, z: 4, direction: 1 }).ok);
  simulation.step();
  assert.deepEqual(simulation.state.buildings[2].item, queue[0], 'First stored item leaves first with its original provenance');
  assert.equal(simulation.state.buildings[1].input.length, 31);
  simulation.step();
  assert.equal(simulation.state.buildings[1].input.length, 32);
  assert.equal(simulation.state.buildings[0].item, null);
  assert.equal(buffered(simulation.state).length, 33);
  assert.deepEqual(simulation.state.buildings[1].input.slice(0, 31), queue.slice(1));
});

test('taking stored automatic goods marks them handled, and refeeding cannot earn automatic delivery', () => {
  const simulation = factory([building(1, 'storage', 4, 4, { input: [auto('ingot'), auto('sword')] }), building(2, 'belt', 5, 4), building(3, 'delivery', 6, 4)]);
  const before = simulation.state.inventory.ingot;
  assert(simulation.command({ type: 'collect', id: 1, resource: 'ingot', amount: 1 }).ok);
  assert.equal(simulation.state.inventory.ingot, before + 1);
  assert.deepEqual(simulation.state.inventoryItems, [{ resource: 'ingot', automated: true, handled: true }]);
  assert(simulation.command({ type: 'feed', id: 2, resource: 'ingot', amount: 1 }).ok);
  assert.equal(simulation.state.inventoryItems!.length, 0);
  assert.equal(simulation.state.buildings[1].item!.handled, true);
  run(simulation, 1);
  assert.equal(simulation.state.delivered, 0);
  assert.equal(simulation.state.stats!.delivered.ingot ?? 0, 0);
  assert.equal(simulation.state.stats!.delivered.sword, 1, 'Unmodified storage output still counts as automatic sword delivery');
});

test('storage collection and removal recover each physical item once, including sparse inventory provenance', () => {
  const simulation = factory([building(1, 'storage', 4, 4, { input: [auto('ore'), auto('ingot'), auto('ingot')] })]);
  const before = { ...simulation.state.inventory };
  assert(simulation.command({ type: 'collect', id: 1, resource: 'ingot', amount: 1 }).ok);
  assert.equal(simulation.state.buildings[0].input.length, 2);
  const snapshot = simulation.snapshot();
  assert.equal(simulation.command({ type: 'collect', id: 1, resource: 'ingot', amount: 3 }).ok, false);
  assert.deepEqual(simulation.snapshot(), snapshot);
  assert(simulation.command({ type: 'remove', id: 1 }).ok);
  assert.equal(simulation.state.inventory.ore, before.ore + 1);
  assert.equal(simulation.state.inventory.ingot, before.ingot + 2 + Math.floor(DEFINITIONS.storage.cost.ingot! / 2));
  assert.equal(simulation.state.inventoryItems!.length, 3);
  assert(simulation.command({ type: 'build', kind: 'belt', x: 4, z: 4, direction: 1 }).ok);
  assert(simulation.state.inventoryItems!.filter(item => item.resource === 'ingot').length <= simulation.state.inventory.ingot);
});

test('splitter alternates clear ports fairly and falls back from a blocked ready conveyor', () => {
  const simulation = factory([building(1, 'splitter', 4, 4), building(2, 'storage', 5, 4), building(3, 'storage', 4, 5)]);
  for (let count = 0; count < 20; count += 1) {
    simulation.state.buildings[0].item = auto('ore'); simulation.state.buildings[0].beltProgress = BELT_SECONDS;
    simulation.step();
    assert.equal(buffered(simulation.state).length, count + 1);
  }
  assert.equal(simulation.state.buildings[1].input.length, 10);
  assert.equal(simulation.state.buildings[2].input.length, 10);
  const blocked = factory([building(1, 'splitter', 4, 4, { item: auto('ore'), beltProgress: BELT_SECONDS }),
    building(2, 'belt', 5, 4, { item: auto('ore'), beltProgress: BELT_SECONDS }), building(3, 'storage', 4, 5)]);
  blocked.step();
  assert.equal(blocked.state.buildings[0].item, null);
  assert.equal(blocked.state.buildings[1].item!.resource, 'ore');
  assert.equal(blocked.state.buildings[2].input.length, 1);
  assert.equal(buffered(blocked.state).length, 2);
});

test('splitter reservations prevent two sources filling a one-item belt or same-tick cascading', () => {
  const simulation = factory([building(1, 'splitter', 4, 4, { item: auto('ore'), beltProgress: BELT_SECONDS }),
    building(2, 'belt', 5, 3, { direction: 2, item: auto('ore'), beltProgress: BELT_SECONDS }),
    building(3, 'belt', 5, 4), building(4, 'belt', 6, 4), building(5, 'storage', 4, 5)]);
  simulation.step();
  assert.equal(simulation.state.buildings[2].item!.resource, 'ore');
  assert.equal(simulation.state.buildings[3].item, null);
  assert.equal(buffered(simulation.state).length, 2);
});

test('mixed recipe inputs are reserved by matching indices; working recipe cannot change and collect cannot duplicate inputs', () => {
  const simulation = factory([building(1, 'generator', 4, 5, { energy: 30 }), building(2, 'assembler', 4, 4,
    { input: [auto('crystal'), auto('ingot'), { resource: 'ingot', automated: true, handled: true }, auto('crystal')] })]);
  simulation.step();
  const assembler = simulation.state.buildings[1];
  assert.deepEqual(assembler.reserved!.map(item => item.resource), ['crystal', 'ingot', 'ingot']);
  assert.deepEqual(assembler.input.map(item => item.resource), ['crystal']);
  const before = simulation.snapshot();
  assert.equal(simulation.command({ type: 'recipe', id: 2, recipe: 'sword' }).ok, false);
  assert.deepEqual(simulation.snapshot(), before);
  assert(simulation.command({ type: 'collect', id: 2 }).ok);
  assert.equal(assembler.reserved!.length, 3);
  run(simulation, 4);
  assert.equal(assembler.output[0].resource, 'sword');
  assert.equal(assembler.output[0].handled, true);
  assert.equal(simulation.state.stats!.produced.sword ?? 0, 0);
});

test('a flood of one assembler ingredient leaves capacity for the other and production recovers', () => {
  const simulation = factory([building(1, 'storage', 3, 4, { input: Array.from({ length: 32 }, () => auto('ingot')) }),
    building(2, 'assembler', 4, 4), building(3, 'storage', 4, 3, { direction: 2, input: [auto('crystal')] }), building(4, 'generator', 4, 5, { energy: 30 })]);
  run(simulation, 5);
  assert.equal(simulation.state.stats!.produced.sword, 1);
  assert(simulation.state.buildings[1].input.length <= 8);
});

test('crystal and sword recipes remain locked even when a facility fixture contains them', () => {
  const simulation = factory([building(1, 'assembler', 4, 4), building(2, 'generator', 4, 5, { energy: 30 })]);
  simulation.state.research!.unlocked = ['basic'];
  assert.equal(simulation.command({ type: 'recipe', id: 1, recipe: 'sword' }).ok, false);
  simulation.state.buildings[0].input = [auto('ingot'), auto('ingot'), auto('crystal')];
  run(simulation, RECIPES.sword.seconds + 1);
  assert.equal(simulation.state.buildings[0].working, false);
  assert.equal(simulation.state.buildings[0].output.length, 0);
});

/** Actual mining/refining/assembly with stored fuel, no ready-made ingredients or per-tick energy injection. */
export function swordFactory(): Simulation {
  const buildings = [
    building(1, 'miner', 3, 4), building(2, 'smelter', 4, 4), building(3, 'belt', 5, 4, { direction: 2 }),
    building(4, 'miner', 3, 6), building(5, 'smelter', 4, 6), building(6, 'belt', 5, 6, { direction: 0 }),
    building(7, 'assembler', 5, 5), building(8, 'delivery', 6, 5),
    building(9, 'crystalMiner', 7, 4, { direction: 3 }), building(10, 'crystalRefiner', 6, 4, { direction: 3 }),
    building(11, 'wire', 3, 3), building(12, 'wire', 4, 3), building(13, 'wire', 5, 3), building(14, 'wire', 6, 3), building(15, 'wire', 7, 3),
    building(16, 'wire', 3, 5), building(17, 'wire', 4, 5),
  ];
  // Three generators provide 9 magic/sec, exceeding the full pipeline's 8.5/sec.
  for (let offset = 0; offset < 3; offset += 1) {
    buildings.push(building(18 + offset, 'generator', 3 + offset, 2, { input: Array.from({ length: 8 }, () => auto('wood')) }));
    buildings.push(building(23 + offset, 'storage', 3 + offset, 1, { direction: 2, input: Array.from({ length: 32 }, () => auto('wood')) }));
  }
  const simulation = factory(buildings);
  simulation.state.inventory = { ...simulation.state.inventory, wood: 0, ore: 0, ingot: 0, rawCrystal: 0, crystal: 0, sword: 0 };
  simulation.state.stats!.produced.wood = 120;
  return simulation;
}

test('real ore/crystal mining chain sustains at least 10 automatic swords in a measured 60 game second window', () => {
  const simulation = swordFactory();
  run(simulation, 120);
  const production = simulation.state.stats!.produced.sword ?? 0, tick = simulation.state.tick;
  run(simulation, 60);
  const producedDuringWindow = (simulation.state.stats!.produced.sword ?? 0) - production;
  assert.equal(simulation.state.tick - tick, 1200);
  assert(producedDuringWindow >= 10, `Measured ${producedDuringWindow} swords produced in 60 game seconds`);
  assert.equal(currentSwordRate(simulation.state), producedDuringWindow);
  assert(simulation.state.stats!.produced.ore! > 0 && simulation.state.stats!.produced.ingot! > 0);
  assert(simulation.state.stats!.produced.rawCrystal! > 0 && simulation.state.stats!.produced.crystal! > 0);
  assert(simulation.state.stats!.delivered.sword! >= 10);
  assert(canResearch(simulation.state, 'mastery').ok);
  assert(simulation.command({ type: 'research', id: 'mastery' }).ok);
  assert.deepEqual(validateSave(simulation.snapshot()), simulation.snapshot(), 'Running sword factory remains saveable with in-flight reservations');
});

test('manual wood gathering restores a zero-stock workshop without increasing production statistics', () => {
  const simulation = new Simulation();
  simulation.state.inventory.wood = 0;
  const produced = structuredClone(simulation.state.stats!.produced);
  assert(simulation.command({ type: 'gatherWood' }).ok);
  assert.equal(simulation.state.inventory.wood, 1);
  assert.deepEqual(simulation.state.stats!.produced, produced);
  assert.deepEqual(simulation.state.inventoryItems, [{ resource: 'wood', automated: false, handled: true }]);
});
