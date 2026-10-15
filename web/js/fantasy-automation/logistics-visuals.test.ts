import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptedResources, hasBufferRoom, logisticsPorts, outputDirections } from './logistics-visuals';
import type { Building, Kind, Resource } from './types';

function building(id: number, kind: Kind, x: number, z: number): Building {
  return { id, kind, x, z, direction: 1, input: [], output: [], reserved: [], progress: 0, working: false, energy: 0, status: '', item: null, beltProgress: 0 };
}
const map = (...buildings: Building[]) => new Map(buildings.map(value => [`${value.x},${value.z}`, value]));
const item = (resource: Resource) => ({ resource, automated: true });

test('four-side receivers and output directions follow actual kinds, including splitter clockwise port', () => {
  assert.deepEqual(outputDirections('splitter', 1), [1, 2]);
  for (const kind of ['wire', 'generator', 'delivery', 'golemRelay'] as Kind[]) assert.deepEqual(outputDirections(kind, 2), []);
  assert.deepEqual(acceptedResources(building(1, 'assembler', 1, 1)), ['ingot', 'crystal']);
  assert.deepEqual(acceptedResources(building(1, 'miner', 1, 1)), []);
});

test('relay has one worker socket and no fictitious belt output', () => {
  const relay = building(1, 'golemRelay', 1, 1);
  assert.deepEqual(acceptedResources(relay), ['golem']);
  assert.equal(hasBufferRoom(relay, 'wood'), false); assert.equal(hasBufferRoom(relay, 'golem'), true);
  relay.input.push(item('golem')); assert.equal(hasBufferRoom(relay, 'golem'), false);
  relay.input = []; relay.golemWorker = item('golem'); assert.equal(hasBufferRoom(relay, 'golem'), false);
});

test('portal roles expose actual inlet/output and sender finite capacity', () => {
  const gate = building(1, 'portalGate', 1, 1); gate.portalRole = 'send';
  assert.deepEqual(outputDirections(gate.kind, 1, gate.portalRole), []);
  assert(acceptedResources(gate).includes('worldSeed'));
  gate.input = Array.from({ length: 8 }, () => item('worldSeed')); assert.equal(hasBufferRoom(gate, 'worldSeed'), false);
  gate.portalRole = 'receive'; assert.deepEqual(acceptedResources(gate), []);
  assert.deepEqual(outputDirections(gate.kind, 1, gate.portalRole), [1]);
  assert.equal(hasBufferRoom(gate, 'worldSeed'), false);
});

test('tree keeps up to eight seeds and has no ordinary output, including mature stage', () => {
  const tree = building(1, 'worldTree', 1, 1); tree.treeGrowth = 10;
  assert.deepEqual(outputDirections(tree.kind, 2), []); assert.deepEqual(acceptedResources(tree), ['worldSeed']);
  assert.equal(hasBufferRoom(tree, 'wood'), false); assert.equal(hasBufferRoom(tree, 'worldSeed'), true);
  tree.input = Array.from({ length: 8 }, () => item('worldSeed')); assert.equal(hasBufferRoom(tree, 'worldSeed'), false);
});

test('missing, map edge and wrong material are distinct from linked and full buffers', () => {
  const source = building(1, 'belt', 1, 1); source.item = item('ore'); source.beltProgress = 0.5;
  assert.equal(logisticsPorts(source, map(source))[0].state, 'missing');
  source.x = 31; assert.equal(logisticsPorts(source, map(source))[0].state, 'edge'); source.x = 1;
  const target = building(2, 'generator', 2, 1);
  assert.equal(logisticsPorts(source, map(source, target))[0].state, 'incompatible');
  target.kind = 'smelter'; assert.equal(logisticsPorts(source, map(source, target))[0].state, 'connected');
  target.input = Array.from({ length: 8 }, () => item('ore'));
  assert.equal(logisticsPorts(source, map(source, target))[0].state, 'full');
});

test('assembler reserves space for the other ingredient, storage has exactly 32 slots', () => {
  const target = building(1, 'assembler', 1, 1); target.input = Array.from({ length: 7 }, () => item('ingot'));
  assert.equal(hasBufferRoom(target, 'ingot'), false); assert.equal(hasBufferRoom(target, 'crystal'), true);
  target.kind = 'storage'; target.input = Array.from({ length: 31 }, () => item('wood'));
  assert.equal(hasBufferRoom(target, 'sword'), true); target.input.push(item('wood'));
  assert.equal(hasBufferRoom(target, 'sword'), false);
});

test('three-ingredient factories reserve all missing ingredient slots together', () => {
  const lab = building(1, 'alchemyLab', 1, 1);
  lab.input = [...Array.from({ length: 6 }, () => item('crystal')), item('wood')];
  assert.equal(hasBufferRoom(lab, 'wood'), false, 'The last slot remains available for missing raw crystal');
  assert.equal(hasBufferRoom(lab, 'crystal'), false);
  assert.equal(hasBufferRoom(lab, 'rawCrystal'), true);
  const loom = building(2, 'seedLoom', 2, 1);
  loom.input = [...Array.from({ length: 5 }, () => item('wood')), item('essence')];
  assert.equal(hasBufferRoom(loom, 'wood'), false, 'Two remaining slots are reserved for essence and rune core');
  assert.equal(hasBufferRoom(loom, 'essence'), true);
  assert.equal(hasBufferRoom(loom, 'runeCore'), true);
});

test('occupied conveyor chain marks a dead end full but a ready closed cycle linked', () => {
  const a = building(1, 'belt', 1, 1), b = building(2, 'belt', 2, 1);
  a.item = b.item = item('ore'); a.beltProgress = b.beltProgress = 0.5;
  assert.equal(logisticsPorts(a, map(a, b))[0].state, 'full');
  b.direction = 3; assert.equal(logisticsPorts(a, map(a, b))[0].state, 'connected');
  b.beltProgress = 0.25; assert.equal(logisticsPorts(a, map(a, b))[0].state, 'full');
});
