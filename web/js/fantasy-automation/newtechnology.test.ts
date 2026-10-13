import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation.ts';
import { TECHNOLOGIES, canResearch, currentSwordRate, isKindUnlocked, isRecipeUnlocked, techNodeStates } from './technology.ts';
import type { GameState, Resource, TechId } from './types.ts';

function state(): GameState {
  const value = new Simulation().snapshot();
  value.stats = { produced: {}, delivered: {}, recentSwordTicks: [], peakSwordRate: 0 };
  value.research = { unlocked: ['basic'], tracked: null };
  return value;
}

test('technology graph has unique nodes, valid edges, no cycles and attainable prerequisites', () => {
  const ids = new Set(TECHNOLOGIES.map(node => node.id));
  assert.equal(ids.size, TECHNOLOGIES.length);
  const completed = new Set<TechId>();
  const visit = (id: TechId, pending = new Set<TechId>()) => {
    assert(!pending.has(id), `No dependency cycle through ${id}`);
    if (completed.has(id)) return;
    const node = TECHNOLOGIES.find(node => node.id === id)!;
    assert(node, `Declared technology ${id}`);
    const next = new Set(pending); next.add(id);
    for (const prerequisite of node.prerequisites) { assert(ids.has(prerequisite)); visit(prerequisite, next); }
    completed.add(id);
  };
  for (const id of ids) visit(id);
  const producers: Record<Resource, TechId> = { wood: 'basic', ore: 'basic', ingot: 'basic', rawCrystal: 'crystals', crystal: 'crystals', sword: 'assembly' };
  const ancestors = (id: TechId): Set<TechId> => {
    const result = new Set<TechId>();
    for (const parent of TECHNOLOGIES.find(node => node.id === id)!.prerequisites) { result.add(parent); for (const ancestor of ancestors(parent)) result.add(ancestor); }
    return result;
  };
  for (const node of TECHNOLOGIES) for (const requirement of node.requirements) {
    const producer = requirement.metric === 'peakSwordRate' ? 'assembly' : producers[requirement.resource!];
    assert(ancestors(node.id).has(producer), `${node.id} can produce its prerequisite ${requirement.label} before unlocking itself`);
  }
});

test('all old facilities are initially available and new facilities and recipes are locked', () => {
  const value = state();
  for (const kind of ['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery'] as const) assert(isKindUnlocked(value, kind));
  for (const kind of ['splitter', 'storage', 'crystalMiner', 'crystalRefiner', 'assembler'] as const) assert.equal(isKindUnlocked(value, kind), false);
  assert(isRecipeUnlocked(value, 'ingot'));
  assert.equal(isRecipeUnlocked(value, 'crystal'), false);
  assert.equal(isRecipeUnlocked(value, 'sword'), false);
});

test('each branch changes from locked to available to unlocked only at its exact thresholds', () => {
  const value = state();
  assert.equal(canResearch(value, 'logistics').ok, false);
  value.stats!.produced.ingot = 4;
  assert.equal(canResearch(value, 'logistics').ok, false);
  value.stats!.produced.ingot = 5;
  assert(canResearch(value, 'logistics').ok);
  value.research!.unlocked.push('logistics');
  assert.equal(canResearch(value, 'logistics').ok, false, 'Already researched technology cannot be researched twice');
  assert(isKindUnlocked(value, 'storage'));
  value.stats!.delivered.ingot = 9;
  assert.equal(canResearch(value, 'crystals').ok, false);
  value.stats!.delivered.ingot = 10;
  assert(canResearch(value, 'crystals').ok);
  value.stats!.produced.ingot = 30; value.stats!.produced.crystal = 10;
  assert.equal(canResearch(value, 'assembly').ok, false, 'Production alone does not bypass missing prerequisite research');
  value.research!.unlocked.push('crystals');
  assert(canResearch(value, 'assembly').ok);
  value.research!.unlocked.push('assembly');
  assert(isRecipeUnlocked(value, 'sword'));
  value.stats!.delivered.sword = 10; value.stats!.peakSwordRate = 9;
  assert.equal(canResearch(value, 'mastery').ok, false);
  value.stats!.peakSwordRate = 10;
  assert(canResearch(value, 'mastery').ok);
  value.research!.unlocked.push('mastery');
  assert(techNodeStates(value).every(node => node.status === 'unlocked'));
});

test('sword rate uses completed production ticks in a rolling 60 game second window', () => {
  const value = state(); value.tick = 2000;
  value.stats!.recentSwordTicks = [799, 800, 801, 1500, 2000, 2001];
  assert.equal(currentSwordRate(value), 3);
  value.stats!.produced.sword = 10000; value.stats!.delivered.sword = 9999;
  assert.equal(currentSwordRate(value), 3, 'Lifetime production/delivery cannot fake the current production rate');
  value.tick = 3201;
  assert.equal(currentSwordRate(value), 0);
});

test('technology inspection is pure and returned display arrays do not mutate the graph', () => {
  const value = state(), before = structuredClone(value);
  const nodes = techNodeStates(value);
  nodes[1].prerequisites.length = 0;
  nodes[0].unlocks.kinds.length = 0;
  nodes[1].requirements[0].target = 0;
  assert.deepEqual(value, before);
  assert.equal(techNodeStates(value)[1].prerequisites[0], 'basic');
  assert.equal(techNodeStates(value)[1].requirements[0].target, 5);
  assert(isKindUnlocked(value, 'miner'));
});
