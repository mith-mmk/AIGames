import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation.ts';
import { DEFINITIONS } from './data.ts';
import type { Building, GameState, Item, Kind } from './types.ts';
import { SIZE } from './types.ts';
import { FixedStepLoop } from './loop.mjs';
import { BELT_SECONDS, ENERGY_CAPACITY, GOAL } from './data.ts';

function building(id: number, kind: Kind, x: number, z: number, extra: Partial<Building> = {}): Building {
  return { id, kind, x, z, direction: 1, input: [], output: [], progress: 0, working: false,
    energy: 0, status: '', item: null, beltProgress: 0, ...extra };
}

function fixture(buildings: Building[] = []): Simulation {
  const simulation = new Simulation(662);
  const state = simulation.snapshot();
  state.terrain = Array(SIZE * SIZE).fill('grass');
  state.buildings = buildings;
  state.nextId = Math.max(0, ...buildings.map(value => value.id)) + 1;
  state.inventory = { wood: 1000, ore: 1000, ingot: 1000 };
  state.kits = {};
  // These original tests intentionally also exercise loading the previous schema.
  state.version = 1;
  delete state.stats; delete state.research; delete state.inventoryItems;
  state.delivered = 0;
  state.won = false;
  for (const value of buildings) {
    if (value.kind === 'miner') state.terrain[value.z * SIZE + value.x] = 'ore';
    if (value.kind === 'lumber') state.terrain[value.z * SIZE + value.x] = 'forest';
  }
  simulation.restore(state);
  return simulation;
}

function advance(simulation: Simulation, seconds: number) {
  for (let tick = 0; tick < Math.round(seconds * 20); tick += 1) stepAndShip(simulation);
}

function ironUnits(state: GameState): number {
  const itemUnits = (item: Item) => item.resource === 'ore' ? 1 : item.resource === 'ingot' ? Number(DEFINITIONS.smelter.input?.ore || 1) : 0;
  return state.inventory.ore + state.inventory.ingot * Number(DEFINITIONS.smelter.input?.ore || 1)
    + state.delivered * Number(DEFINITIONS.smelter.input?.ore || 1)
    + state.buildings.reduce((total, value) => total + [...value.input, ...value.output, ...(value.reserved ?? []), ...(value.item ? [value.item] : [])].reduce((sum, item) => sum + itemUnits(item), 0), 0);
}

test('seeded worlds and their progression are reproducible', () => {
  const first = new Simulation(662);
  const second = new Simulation(662);
  assert.deepEqual(first.snapshot(), second.snapshot());
  assert.equal(first.state.terrain.length, SIZE * SIZE);
  assert(first.state.terrain.includes('ore'));
  assert(first.state.terrain.includes('forest'));
  advance(first, 5);
  advance(second, 5);
  assert.deepEqual(first.snapshot(), second.snapshot());
});

test('out of bounds, terrain mismatch and occupied building commands are atomic', () => {
  const simulation = fixture();
  for (const [x, z] of [[-1, 0], [SIZE, 0], [0, SIZE], [0, -1]]) {
    const before = simulation.snapshot();
    assert.equal(simulation.command({ type: 'build', kind: 'belt', x, z, direction: 1 }).ok, false);
    assert.deepEqual(simulation.snapshot(), before);
  }
  assert.equal(simulation.command({ type: 'build', kind: 'miner', x: 4, z: 4, direction: 1 }).ok, false);
  assert.equal(simulation.command({ type: 'build', kind: 'belt', x: 4, z: 4, direction: 1 }).ok, true);
  const before = simulation.snapshot();
  assert.equal(simulation.command({ type: 'build', kind: 'belt', x: 4, z: 4, direction: 1 }).ok, false);
  assert.deepEqual(simulation.snapshot(), before);
  assert.equal(simulation.command({ type: 'remove', id: 999999 }).ok, false);
});

test('snapshot and restore preserve a running factory without sharing mutable state', () => {
  const simulation = fixture([building(1, 'belt', 4, 4, { item: { resource: 'ore', automated: true }, beltProgress: 0.3 }),
    building(2, 'smelter', 5, 4, { input: [{ resource: 'ore', automated: false }, { resource: 'ore', automated: true }], progress: 0.4, working: true }),
    building(3, 'generator', 5, 5, { energy: 3, input: [{ resource: 'wood', automated: false }] })]);
  const snapshot = simulation.snapshot();
  const restored = new Simulation(9);
  restored.restore(snapshot);
  assert.deepEqual(restored.snapshot(), simulation.snapshot());
  snapshot.inventory.wood = 0;
  snapshot.buildings[0].item!.automated = false;
  assert.equal(simulation.state.inventory.wood, 1000);
  assert.equal(restored.state.inventory.wood, 1000);
  assert.equal(restored.state.buildings[0].item!.automated, true);
  advance(simulation, 3);
  advance(restored, 3);
  assert.deepEqual(restored.snapshot(), simulation.snapshot());
});

test('20Hz simulation is independent of render FPS and speed multiplies simulation time', () => {
  const slow = fixture([building(1, 'belt', 4, 4, { item: { resource: 'ore', automated: true } }), building(2, 'belt', 5, 4)]);
  const fast = fixture(slow.snapshot().buildings);
  const doubleSpeed = fixture(slow.snapshot().buildings);
  const run = (simulation: Simulation, fps: number, speed: number) => {
    const loop = new FixedStepLoop({ step: () => simulation.step(), render: () => {} });
    for (let frame = 0; frame < fps * 2; frame += 1) loop.advance(speed / fps);
  };
  run(slow, 30, 1);
  run(fast, 144, 1);
  assert.deepEqual(slow.snapshot(), fast.snapshot());
  run(doubleSpeed, 60, 2);
  advance(fast, 2);
  assert.deepEqual(doubleSpeed.snapshot(), fast.snapshot());
});

test('construction charges its recipe and removal recovers contents plus half the building cost', () => {
  const simulation = fixture();
  const before = simulation.snapshot();
  assert(simulation.command({ type: 'build', kind: 'smelter', x: 4, z: 4, direction: 1 }).ok);
  const facility = simulation.state.buildings[0];
  assert.equal(simulation.state.inventory.ingot, before.inventory.ingot - DEFINITIONS.smelter.cost.ingot!);
  assert.equal(simulation.state.inventory.wood, before.inventory.wood - DEFINITIONS.smelter.cost.wood!);
  facility.input = [{ resource: 'ore', automated: true }, { resource: 'ore', automated: true }];
  facility.output = [{ resource: 'ingot', automated: true }];
  facility.progress = 2; facility.working = true;
  const paid = { ...simulation.state.inventory };
  assert(simulation.command({ type: 'remove', id: facility.id }).ok);
  assert.equal(simulation.state.buildings.length, 0);
  assert.equal(simulation.state.inventory.ore, paid.ore + 2);
  assert.equal(simulation.state.inventory.ingot, paid.ingot + 1 + Math.floor(DEFINITIONS.smelter.cost.ingot! / 2));
  assert.equal(simulation.state.inventory.wood, paid.wood + Math.floor(DEFINITIONS.smelter.cost.wood! / 2));
});

test('two-phase belt movement advances an item at most one cell per step', () => {
  const simulation = fixture([building(1, 'belt', 4, 4, { item: { resource: 'ore', automated: true }, beltProgress: BELT_SECONDS }),
    building(2, 'belt', 5, 4), building(3, 'belt', 6, 4)]);
  stepAndShip(simulation);
  assert.equal(simulation.state.buildings[0].item, null);
  assert.deepEqual(simulation.state.buildings[1].item, { resource: 'ore', automated: true });
  assert.equal(simulation.state.buildings[1].beltProgress, 0);
  assert.equal(simulation.state.buildings[2].item, null);
});

test('ready belt lines move simultaneously and deterministically in stable ID order', () => {
  const input = [building(1, 'belt', 4, 4, { item: { resource: 'ingot', automated: false }, beltProgress: BELT_SECONDS }),
    building(2, 'belt', 5, 4, { item: { resource: 'ingot', automated: true }, beltProgress: BELT_SECONDS }), building(3, 'delivery', 6, 4)];
  const first = fixture(input);
  const second = fixture([...input].reverse());
  first.step(); confirmShipments(first); second.step(); confirmShipments(second);
  assert.deepEqual(first.snapshot(), second.snapshot());
  assert.equal(first.state.delivered, 1);
  assert.equal(first.state.buildings[0].item, null);
  assert.equal(first.state.buildings[1].item!.automated, false);
});

test('an obstructed belt stalls without losing items and resumes after downstream collection', () => {
  const simulation = fixture([building(1, 'belt', 4, 4, { item: { resource: 'ore', automated: true }, beltProgress: BELT_SECONDS }),
    building(2, 'belt', 5, 4, { item: { resource: 'ore', automated: false }, beltProgress: BELT_SECONDS })]);
  const total = ironUnits(simulation.snapshot());
  advance(simulation, 5);
  assert.equal(simulation.state.buildings.filter(value => value.item).length, 2);
  assert.equal(ironUnits(simulation.snapshot()), total);
  assert(simulation.command({ type: 'collect', id: 2 }).ok);
  stepAndShip(simulation);
  assert.equal(simulation.state.buildings[0].item, null);
  assert.equal(simulation.state.buildings[1].item!.automated, true);
  assert.equal(ironUnits(simulation.snapshot()), total);
});

test('100 automatic ingots are conserved through a stalled three-belt line and recovery', () => {
  const simulation = fixture([building(1, 'smelter', 4, 4), building(2, 'belt', 5, 4),
    building(3, 'belt', 6, 4), building(4, 'belt', 7, 4)]);
  simulation.state.inventory = { wood: 100, ore: 0, ingot: 0 };
  let injected = 0;
  for (let tick = 0; tick < 2000 && simulation.state.delivered < 100; tick += 1) {
    const source = simulation.state.buildings[0];
    while (source.output.length < 4 && injected < 100) {
      source.output.push({ resource: 'ingot', automated: true }); injected += 1;
    }
    if (tick === 60) {
      assert.equal(simulation.state.delivered, 0);
      assert.equal(source.output.length, 4);
      assert.equal(simulation.state.buildings.filter(value => value.item).length, 3);
      assert(simulation.command({ type: 'build', kind: 'delivery', x: 8, z: 4, direction: 1 }).ok);
    }
    stepAndShip(simulation);
    const pending = simulation.state.buildings.reduce((total, value) => total + value.output.length + value.input.length + Number(!!value.item), 0);
    assert.equal(simulation.state.delivered + pending, injected, `No lost or duplicated ingots at transport tick ${tick}`);
    assert.equal(ironUnits(simulation.snapshot()), injected * Number(DEFINITIONS.smelter.input?.ore), `Material units conserved at tick ${tick}`);
  }
  assert.equal(injected, 100);
  assert.equal(simulation.state.delivered, 100);
  assert.equal(simulation.state.won, true);
  assert(simulation.state.buildings.every(value => value.input.length === 0 && value.output.length === 0 && value.item === null));
});

test('smelting conserves 100 units of ore through reservation, completion and collection', () => {
  const simulation = fixture([building(1, 'generator', 4, 5, { energy: ENERGY_CAPACITY }), building(2, 'smelter', 4, 4)]);
  simulation.state.inventory = { wood: 0, ore: 100, ingot: 0 };
  for (let batch = 0; batch < 50; batch += 1) {
    const generator = simulation.state.buildings.find(value => value.kind === 'generator')!;
    generator.energy = ENERGY_CAPACITY;
    assert(simulation.command({ type: 'feed', id: 2, resource: 'ore', amount: 2 }).ok);
    for (let tick = 0; tick < DEFINITIONS.smelter.seconds! * 20; tick += 1) {
      stepAndShip(simulation);
      assert.equal(ironUnits(simulation.snapshot()), 100, `Ore units retained at batch ${batch}, tick ${tick}`);
    }
    assert(simulation.command({ type: 'collect', id: 2 }).ok);
    assert.equal(ironUnits(simulation.snapshot()), 100);
  }
  assert.equal(simulation.state.inventory.ore, 0);
  assert.equal(simulation.state.inventory.ingot, 50);
});

test('cutting the power wire pauses a reserved job and reconnecting resumes it', () => {
  const simulation = fixture([building(1, 'generator', 4, 6, { energy: ENERGY_CAPACITY }), building(2, 'wire', 4, 5),
    building(3, 'smelter', 4, 4, { input: [{ resource: 'ore', automated: true }, { resource: 'ore', automated: true }] })]);
  advance(simulation, 1);
  const smelter = simulation.state.buildings.find(value => value.id === 3)!;
  const progress = smelter.progress;
  assert(smelter.working);
  assert(simulation.command({ type: 'remove', id: 2 }).ok);
  advance(simulation, 5);
  assert.equal(smelter.progress, progress);
  assert.equal(smelter.output.length, 0);
  assert(simulation.command({ type: 'build', kind: 'wire', x: 4, z: 5, direction: 0 }).ok);
  advance(simulation, 4);
  assert.deepEqual(smelter.output, [{ resource: 'ingot', automated: true }]);
});

test('collect cannot reclaim ore that is already reserved for a smelting job', () => {
  const simulation = fixture([building(1, 'generator', 4, 5, { energy: ENERGY_CAPACITY }), building(2, 'smelter', 4, 4)]);
  assert(simulation.command({ type: 'feed', id: 2, resource: 'ore', amount: 4 }).ok);
  stepAndShip(simulation);
  const before = ironUnits(simulation.snapshot());
  assert(simulation.command({ type: 'collect', id: 2 }).ok);
  assert.equal(simulation.state.buildings[1].reserved!.length, 2);
  advance(simulation, 4);
  assert.equal(ironUnits(simulation.snapshot()), before);
});

test('wood refill recovers a starved factory even if one unusable energy point remains', () => {
  const simulation = fixture([building(1, 'generator', 4, 5, { energy: 1 }), building(2, 'miner', 4, 4)]);
  advance(simulation, 5);
  assert.equal(simulation.state.buildings[1].output.length, 0);
  assert(simulation.command({ type: 'feed', id: 1, resource: 'wood', amount: 1 }).ok);
  advance(simulation, 15);
  assert(simulation.state.buildings[1].output.length > 0, 'Manual wood refill must resolve low-energy deadlock');
});

test('completed pending magic never refunds the already burned wood or duplicates it after save/restore', () => {
  const simulation = fixture([building(1, 'generator', 4, 4, { energy: 1, input: [{ resource: 'wood', automated: true }] })]);
  advance(simulation, 10);
  const generator = simulation.state.buildings[0];
  assert.equal(generator.energy, ENERGY_CAPACITY);
  assert.equal(generator.pendingEnergy, 1);
  assert.equal(generator.working, true);
  assert.equal(generator.reserved!.length, 1);
  const copy = new Simulation(); copy.restore(simulation.snapshot());
  advance(simulation, 3); advance(copy, 3);
  assert.deepEqual(copy.snapshot(), simulation.snapshot());
  const wood = simulation.state.inventory.wood;
  assert(simulation.command({ type: 'collect', id: 1 }).ok);
  assert.equal(simulation.state.inventory.wood, wood, 'Collect leaves burned reserved wood unavailable');
  assert(simulation.command({ type: 'remove', id: 1 }).ok);
  assert.equal(simulation.state.inventory.wood, wood + Math.floor(DEFINITIONS.generator.cost.wood! / 2), 'Removal only refunds the construction salvage');
});

test('manual items retain their provenance through belt input and never count toward victory', () => {
  const simulation = fixture([building(1, 'belt', 4, 4), building(2, 'delivery', 5, 4)]);
  assert(simulation.command({ type: 'feed', id: 1, resource: 'ingot', amount: 1 }).ok);
  advance(simulation, 2);
  assert.equal(simulation.state.buildings[0].input.length, 0, 'Manual belt input must actually move');
  assert.equal(simulation.state.buildings[0].item, null);
  assert.equal(simulation.state.delivered, 0);
  assert.equal(simulation.state.won, false);
  assert(simulation.command({ type: 'feed', id: 2, resource: 'ingot', amount: 1 }).ok);
  assert.equal(simulation.state.delivered, 0);
  assert.equal(simulation.state.won, false);
});

test('100 automatic ingots trigger victory, while manual smelting marks its output nonautomatic', () => {
  const simulation = fixture([building(1, 'belt', 4, 4), building(2, 'delivery', 5, 4)]);
  for (let count = 0; count < GOAL; count += 1) {
    simulation.state.buildings[0].item = { resource: 'ingot', automated: true };
    simulation.state.buildings[0].beltProgress = BELT_SECONDS;
    stepAndShip(simulation);
    assert.equal(simulation.state.delivered, count + 1);
    assert.equal(simulation.state.won, count + 1 >= GOAL);
  }
  const smelting = fixture([building(1, 'generator', 4, 5, { energy: ENERGY_CAPACITY }),
    building(2, 'smelter', 4, 4, { input: [{ resource: 'ore', automated: true }, { resource: 'ore', automated: false }] })]);
  advance(smelting, DEFINITIONS.smelter.seconds!);
  assert.equal(smelting.state.buildings[1].output[0].automated, false);
});

test('an autonomous production line with explicit manual shipping can complete the goal', () => {
  const simulation = fixture([
    building(1, 'miner', 12, 16), building(2, 'belt', 13, 16), building(3, 'smelter', 14, 16),
    building(4, 'belt', 15, 16), building(5, 'delivery', 16, 16), building(6, 'generator', 12, 18),
    building(7, 'wire', 12, 17), building(8, 'wire', 13, 17), building(9, 'wire', 14, 17),
    building(10, 'lumber', 9, 18), building(11, 'belt', 10, 18), building(12, 'belt', 11, 18),
  ]);
  for (let tick = 0; tick < 20 * 1200 && !simulation.state.won; tick += 1) stepAndShip(simulation);
  assert.equal(simulation.state.won, true);
  assert.equal(simulation.state.delivered, GOAL);
  assert(simulation.state.buildings.find(value => value.kind === 'generator')!.input.length > 0);
});

function confirmShipments(s: Simulation) {
  for (const b of s.state.buildings.filter(b => b.kind === 'delivery')) for (const resource of ['wood', 'ingot', 'sword'] as const) {
    const amount = b.input.filter(i => i.resource === resource).length;
    if (amount) assert(s.command({ type: 'dispatch', id: b.id, source: 'depot', resource, amount }).ok);
  }
}

function stepAndShip(s: Simulation) { s.step(); confirmShipments(s); }
