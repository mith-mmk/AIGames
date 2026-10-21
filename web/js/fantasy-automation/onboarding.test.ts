import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuide } from './onboarding';
import { Simulation } from './simulation';
import type { Building, Direction, Kind } from './types';

function place(simulation: Simulation, kind: Kind, x: number, z: number, direction: Direction = 1): Building {
  assert.equal(simulation.command({ type: 'build', kind, x, z, direction }).ok, true);
  return simulation.state.buildings.at(-1)!;
}

function starter(simulation: Simulation): void {
  place(simulation, 'miner', 12, 16);
  place(simulation, 'belt', 13, 16);
  place(simulation, 'smelter', 14, 16);
  place(simulation, 'belt', 15, 16);
  place(simulation, 'delivery', 16, 16);
  place(simulation, 'generator', 12, 18);
  place(simulation, 'wire', 12, 17);
  place(simulation, 'wire', 13, 17);
  place(simulation, 'wire', 14, 17);
}

test('guide supplies the workshop with one ranged pole, then completes construction, fuel and manual shipment', () => {
  const simulation = new Simulation();
  const ids: string[] = [];
  for (let index = 0; index < 7; index++) {
    const guide = evaluateGuide(simulation.state);
    assert.equal(guide.step, index + 1);
    assert.equal(guide.total, 14);
    assert.equal(guide.mode, 'build');
    ids.push(guide.id);
    place(simulation, guide.kind!, guide.target!.x, guide.target!.z, guide.direction ?? 1);
  }
  let guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'feed'); assert.equal(guide.step, 10); assert.equal(guide.mode, 'feed');
  assert.equal(simulation.command({ type: 'feed', id: guide.focusId!, resource: 'wood', amount: 1 }).ok, true);
  guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'run'); assert.equal(guide.step, 11);
  for (let tick = 0; tick < 1000 && simulation.state.delivered < 1; tick++) stepAndShip(simulation);
  assert(simulation.state.delivered >= 1);
  for (let index = 0; index < 3; index++) {
    guide = evaluateGuide(simulation.state);
    assert.equal(guide.step, 12 + index); assert.equal(guide.mode, 'build');
    place(simulation, guide.kind!, guide.target!.x, guide.target!.z, guide.direction ?? 1);
  }
  guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'done'); assert.equal(guide.mode, 'done'); assert.match(guide.text, /自由に建設/);
  assert.deepEqual(ids, ['miner', 'belt-ore', 'smelter', 'belt-ingot', 'delivery', 'generator', 'wire-miner']);
  for (let tick = 0; tick < 20000 && !simulation.state.won; tick++) stepAndShip(simulation);
  assert.equal(simulation.state.won, true, 'Following the guide creates a genuinely self-sufficient factory');
});

test('wrong port direction focuses the existing facility and specifies the rotation', () => {
  const simulation = new Simulation();
  const miner = place(simulation, 'miner', 12, 16, 3);
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'miner'); assert.equal(guide.mode, 'rotate'); assert.equal(guide.focusId, miner.id);
  assert.equal(guide.direction, 1); assert.match(guide.text, /Rを2回/); assert.match(guide.blockers.join(' '), /出力方向/);
  simulation.command({ type: 'rotate', id: miner.id }); simulation.command({ type: 'rotate', id: miner.id });
  assert.equal(evaluateGuide(simulation.state).id, 'belt-ore');
});

test('wrong building and resource shortages provide concrete fixes without mutating state', () => {
  const simulation = new Simulation();
  const wrong = place(simulation, 'wire', 12, 16);
  const before = simulation.snapshot();
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'miner'); assert.equal(guide.focusId, wrong.id); assert.match(guide.blockers.join(' '), /Xを押して/);
  assert.deepEqual(simulation.snapshot(), before);
  simulation.command({ type: 'remove', id: wrong.id }); place(simulation, 'miner', 12, 16);
  simulation.state.inventory.wood = 0; simulation.state.inventory.ingot = 0;
  const shortage = evaluateGuide(simulation.state);
  assert.match(shortage.blockers.join(' '), /木材があと1個/); assert.match(shortage.blockers.join(' '), /鉄の延べ棒があと1個/);
});

test('cut power returns to the missing wire and explains the stopped machines', () => {
  const simulation = new Simulation(); starter(simulation);
  const generator = simulation.state.buildings.find(building => building.kind === 'generator')!;
  simulation.command({ type: 'feed', id: generator.id, resource: 'wood', amount: 1 });
  for (const wire of simulation.state.buildings.filter(building => building.kind === 'wire')) simulation.command({ type: 'remove', id: wire.id });
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'wire-miner'); assert.deepEqual(guide.target, { x: 12, z: 17 }); assert.match(guide.blockers.join(' '), /停止/);
});

test('first delivery waiting diagnoses belt contamination and downstream buffers', () => {
  const simulation = new Simulation(); starter(simulation);
  const generator = simulation.state.buildings.find(building => building.kind === 'generator')!;
  simulation.command({ type: 'feed', id: generator.id, resource: 'wood', amount: 1 });
  const belt = simulation.state.buildings.find(building => building.kind === 'belt' && building.x === 13)!;
  belt.item = { resource: 'wood', automated: false }; belt.beltProgress = 0.5;
  const smelter = simulation.state.buildings.find(building => building.kind === 'smelter')!;
  smelter.input = Array.from({ length: 8 }, () => ({ resource: 'ore', automated: false }));
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'run'); assert.match(guide.blockers.join(' '), /滞留/); assert.match(guide.blockers.join(' '), /木材/);
  assert.match(guide.blockers.join(' '), /回収/); assert.match(guide.blockers.join(' '), /入力庫が満杯/);
});

test('existing custom factories skip the starter layout and recognize their own automatic fuel line', () => {
  const simulation = new Simulation(); simulation.state.delivered = 1;
  simulation.state.terrain[20 * 32 + 20] = 'forest';
  place(simulation, 'lumber', 20, 20); place(simulation, 'belt', 21, 20); place(simulation, 'generator', 22, 20);
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.mode, 'done'); assert.equal(guide.target, null);
  const belt = simulation.state.buildings.find(building => building.kind === 'belt')!;
  simulation.command({ type: 'remove', id: belt.id });
  const repair = evaluateGuide(simulation.state);
  assert.equal(repair.id, 'belt-wood-1'); assert.equal(repair.target, null); assert.match(repair.text, /配置場所は自由/);
});

test('existing working, stored or pending generator fuel skips manual feeding', () => {
  for (const fuel of [{ working: true }, { energy: 1 }, { pendingEnergy: 1 }]) {
    const simulation = new Simulation(); starter(simulation);
    Object.assign(simulation.state.buildings.find(building => building.kind === 'generator')!, fuel);
    assert.equal(evaluateGuide(simulation.state).id, 'run');
  }
});

test('removing a redundant pole does not invent an outage; a real disconnection still offers repair', () => {
  const simulation = new Simulation(); starter(simulation);
  const generator = simulation.state.buildings.find(building => building.kind === 'generator')!;
  simulation.command({ type: 'feed', id: generator.id, resource: 'wood', amount: 1 });
  for (let tick = 0; tick < 1000 && simulation.state.delivered < 1; tick++) stepAndShip(simulation);
  assert(simulation.state.delivered >= 1);
  const wire = simulation.state.buildings.find(building => building.kind === 'wire' && building.x === 13)!;
  simulation.command({ type: 'remove', id: wire.id });
  assert.equal(evaluateGuide(simulation.state).id, 'lumber');
  for (const remaining of simulation.state.buildings.filter(building => building.kind === 'wire')) simulation.command({ type: 'remove', id: remaining.id });
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'wire-miner'); assert.equal(guide.kind, 'wire'); assert.equal(guide.mode, 'build');
  assert.deepEqual(guide.target, { x: 12, z: 17 }); assert.match(guide.title, /復旧/); assert.match(guide.blockers.join(' '), /停止/);
  place(simulation, 'wire', 12, 17);
  assert.equal(evaluateGuide(simulation.state).id, 'lumber');
  place(simulation, 'lumber', 9, 18); place(simulation, 'belt', 10, 18); place(simulation, 'belt', 11, 18);
  assert.equal(evaluateGuide(simulation.state).mode, 'done');
});

test('central transport rotation or a missing output belt can be repaired after the first delivery', () => {
  const simulation = new Simulation(); starter(simulation); simulation.state.delivered = 1;
  const belt = simulation.state.buildings.find(building => building.kind === 'belt' && building.x === 15)!;
  simulation.command({ type: 'rotate', id: belt.id });
  let guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'belt-ingot'); assert.equal(guide.mode, 'rotate'); assert.equal(guide.focusId, belt.id);
  simulation.command({ type: 'remove', id: belt.id });
  guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'belt-ingot'); assert.equal(guide.mode, 'build'); assert.deepEqual(guide.target, { x: 15, z: 16 });
});

test('initial generation is explained as normal timed work rather than a power failure', () => {
  const simulation = new Simulation(); starter(simulation);
  const generator = simulation.state.buildings.find(building => building.kind === 'generator')!;
  simulation.command({ type: 'feed', id: generator.id, resource: 'wood', amount: 1 });
  for (let tick = 0; tick < 20; tick++) stepAndShip(simulation);
  const guide = evaluateGuide(simulation.state);
  assert.equal(guide.id, 'run'); assert.match(guide.checks.join(' '), /魔力生成まであと9秒/);
  assert.equal(guide.blockers.length, 0);
});

function confirmShipments(s: Simulation) {
  for (const b of s.state.buildings.filter(b => b.kind === 'delivery')) for (const resource of ['wood', 'ingot', 'sword'] as const) {
    const amount = b.input.filter(i => i.resource === resource).length;
    if (amount) assert(s.command({ type: 'dispatch', id: b.id, source: 'depot', resource, amount }).ok);
  }
}

function stepAndShip(s: Simulation) { s.step(); confirmShipments(s); }
