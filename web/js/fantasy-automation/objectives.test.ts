import test from 'node:test';
import assert from 'node:assert/strict';
import { getObjective } from './objectives.ts';
import { Simulation } from './simulation.ts';
import { validateSave } from './storage.ts';
import type { GameState, TechId } from './types.ts';

function state(delivered = 0, unlocked: TechId[] = ['basic']): GameState {
  const value = new Simulation().snapshot();
  value.delivered = delivered;
  value.won = delivered >= 100;
  value.stats!.produced.ingot = delivered;
  value.stats!.delivered.ingot = delivered;
  value.research!.unlocked = unlocked;
  value.research!.tracked = null;
  return value;
}

function legacy(delivered: number): GameState {
  return { version: 1, seed: 662, tick: 2500, nextId: 1, terrain: Array(1024).fill('grass'),
    inventory: { wood: 5, ore: 4, ingot: 3 }, kits: {}, buildings: [], delivered, won: delivered >= 100 };
}

test('new factories show the actual automatic iron delivery goal', () => {
  assert.deepEqual(getObjective(state()), {
    title: '鉄の延べ棒を100本自動納品',
    detail: '採掘機→魔導炉→納品箱をつなぎ、自動生産した鉄の延べ棒を自動搬送してください。手で投入・回収した品は数えません。研究条件を達成すると次の目標へ進みます。',
    resource: 'ingot', current: 0, target: 100, action: 'guide', completed: false,
  });
});

test('research opportunities are surfaced at five produced ingots and ten delivered ingots', () => {
  const value = state();
  value.stats!.produced.ingot = 4;
  assert.equal(getObjective(value).action, 'guide');
  value.stats!.produced.ingot = 5;
  let goal = getObjective(value);
  assert.match(goal.title, /物流.*研究する/);
  assert.equal(goal.current, 5); assert.equal(goal.target, 5); assert.equal(goal.completed, false);
  assert.match(goal.detail, /収納箱/); assert.equal(goal.action, 'technology');
  value.research!.unlocked.push('logistics'); value.delivered = 9; value.stats!.produced.ingot = 9; value.stats!.delivered.ingot = 9;
  assert.equal(getObjective(value).target, 100);
  value.delivered = 10; value.stats!.produced.ingot = 10; value.stats!.delivered.ingot = 10;
  goal = getObjective(value);
  assert.match(goal.title, /結晶加工.*研究する/); assert.equal(goal.current, 10); assert.equal(goal.target, 10);
});

test('iron delivery 99, 100 and greater never freezes the goal once the iron quest is achieved', () => {
  const value = state(99, ['basic', 'logistics', 'crystals']);
  assert.equal(getObjective(value).target, 100);
  for (const delivered of [100, 101, 1000]) {
    value.delivered = delivered; value.stats!.produced.ingot = delivered; value.stats!.delivered.ingot = delivered;
    const goal = getObjective(value);
    assert.match(goal.title, /魔導剣の組立/); assert.equal(goal.resource, 'crystal');
    assert.equal(goal.current, 0); assert.equal(goal.target, 10); assert.equal(goal.action, 'technology');
    assert.doesNotMatch(goal.title, /100本/);
  }
});

test('tracked locked technologies direct the player to their missing prerequisites and do not bypass research', () => {
  const value = state(); value.research!.tracked = 'assembly';
  let goal = getObjective(value);
  assert.match(goal.title, /物流/); assert.equal(goal.current, 0); assert.equal(goal.target, 5);
  assert.match(goal.detail, /魔導剣の組立.*前提技術/);
  value.stats!.produced.ingot = 30; value.stats!.produced.crystal = 10;
  value.research!.unlocked.push('logistics');
  goal = getObjective(value); assert.match(goal.title, /結晶加工/); assert.equal(goal.target, 10);
  value.delivered = 10; value.stats!.delivered.ingot = 10; value.research!.unlocked.push('crystals');
  assert.match(getObjective(value).title, /魔導剣の組立を研究する/);
});

test('an explicit unfinished tracked goal can override the initial iron delivery objective', () => {
  const value = state(1, ['basic', 'logistics', 'crystals']); value.research!.tracked = 'assembly';
  const goal = getObjective(value);
  assert.match(goal.title, /魔導剣の組立/); assert.equal(goal.target, 30); assert.equal(goal.current, 1);
  assert.equal(goal.resource, 'ingot'); assert.match(goal.detail, /鉄の延べ棒を自動生産 1\/30.*精製魔晶を自動生産 0\/10/);
});

test('researching the tracked node advances to the next stage rather than showing a stale unlocked goal', () => {
  const value = state(100, ['basic', 'logistics']); value.research!.tracked = 'logistics';
  assert.match(getObjective(value).title, /結晶加工を研究する/);
  value.research!.unlocked.push('crystals'); value.research!.tracked = 'crystals';
  assert.match(getObjective(value).title, /魔導剣の組立/);
  value.stats!.produced.crystal = 10; value.research!.unlocked.push('assembly'); value.research!.tracked = 'assembly';
  assert.match(getObjective(value).title, /魔導剣の量産技術/);
});

test('mastery uses measured game-time production rate separately from cumulative deliveries', () => {
  const value = state(100, ['basic', 'logistics', 'crystals', 'assembly']);
  value.stats!.produced.sword = 1000; value.stats!.delivered.sword = 1000; value.stats!.peakSwordRate = 9;
  let goal = getObjective(value);
  assert.match(goal.title, /最高生産速度/); assert.equal(goal.current, 9); assert.equal(goal.target, 10);
  assert.match(goal.detail, /現在 0本\/ゲーム内分、最高 9本\/ゲーム内分/);
  value.stats!.peakSwordRate = 10; value.stats!.delivered.sword = 9;
  goal = getObjective(value); assert.match(goal.title, /魔導剣を自動納品/); assert.equal(goal.current, 9);
  value.stats!.delivered.sword = 10;
  assert.match(getObjective(value).title, /量産技術を研究する/);
  assert.equal(getObjective(value).completed, false, 'Eligible research is still an action to perform');
});

test('all researched technologies display completion and free expansion rather than iron delivery forever', () => {
  const value = state(100, ['basic', 'logistics', 'crystals', 'assembly', 'mastery', 'runecraft', 'golemcraft', 'sanctuary']);
  value.stats!.produced.sword = 12; value.stats!.delivered.sword = 12; value.stats!.peakSwordRate = 10;
  value.research!.tracked = 'sanctuary'; value.stats!.golemFuelTransfers = 20; value.stats!.golemTransfers = 20; value.stats!.produced.golem = 3;
  const goal = getObjective(value);
  assert.match(goal.title, /自由に拡張/); assert.equal(goal.completed, true); assert.equal(goal.action, null);
  assert.equal(goal.resource, 'wood'); assert.equal(goal.current, 20); assert.doesNotMatch(goal.title, /100本/);
});

test('version 1 completed saves and version 2 save reload preserve the next research objective', () => {
  const old = legacy(100);
  const before = structuredClone(old);
  assert.match(getObjective(old).title, /物流.*研究する/);
  const converted = validateSave(old);
  assert.deepEqual(getObjective(converted), getObjective(old));
  assert.deepEqual(getObjective(validateSave(JSON.parse(JSON.stringify(converted)))), getObjective(converted));
  assert.deepEqual(old, before, 'Objective inspection leaves the legacy save untouched');
  const progressed = state(120, ['basic', 'logistics', 'crystals']);
  progressed.research!.tracked = 'crystals'; progressed.stats!.produced.crystal = 3;
  assert.deepEqual(getObjective(validateSave(JSON.parse(JSON.stringify(progressed)))), getObjective(progressed));
});

test('objective display derives iron completion from deliveries without weakening save validation', () => {
  const complete = state(100, ['basic', 'logistics', 'crystals']); complete.won = false;
  assert.match(getObjective(complete).title, /魔導剣の組立/);
  assert.throws(() => validateSave(complete), /クリア状態/);
  const incomplete = state(2); incomplete.won = true;
  assert.equal(getObjective(incomplete).target, 100);
  assert.throws(() => validateSave(incomplete), /クリア状態/);
});

test('goal lookup neither mutates simulation state nor shares mutable display state', () => {
  const value = state(100, ['basic', 'logistics', 'crystals']); value.research!.tracked = 'assembly';
  const before = structuredClone(value), goal = getObjective(value);
  goal.title = '変えた表示'; goal.current = -1;
  assert.deepEqual(value, before);
  assert.match(getObjective(value).title, /魔導剣の組立/);
});


test('mastery advances into rune crafting, golem assembly and automated fuel support', () => {
  const value = state(100, ['basic', 'logistics', 'crystals', 'assembly', 'mastery']);
  let goal = getObjective(value);
  assert.match(goal.title, /ルーン.*研究する/); assert.match(goal.detail, /ルーン|刻印/); assert.equal(goal.completed, false);
  value.research!.unlocked.push('runecraft');
  goal = getObjective(value); assert.match(goal.title, /魔導核を自動生産/); assert.equal(goal.current, 0); assert.equal(goal.target, 3);
  value.stats!.produced.runeCore = 3;
  assert.match(getObjective(value).title, /鉄の躯体を自動生産/);
  value.stats!.produced.golemFrame = 3;
  assert.match(getObjective(value).title, /ゴーレム組立.*研究する/);
  value.research!.unlocked.push('golemcraft'); value.stats!.produced.golem = 3;
  goal = getObjective(value); assert.match(goal.title, /木材を魔力炉へ自動補給/); assert.equal(goal.resource, 'wood'); assert.equal(goal.target, 20);
  value.stats!.golemFuelTransfers = 19; value.stats!.golemTransfers = 100;
  assert.equal(getObjective(value).current, 19, 'Other material transfers do not complete the fuel goal');
  value.stats!.golemFuelTransfers = 20;
  assert.match(getObjective(value).title, /自動運営を研究する/);
});
