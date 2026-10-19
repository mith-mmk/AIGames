import test from 'node:test';
import assert from 'node:assert/strict';
import { getGolemGuide } from './golem-guide.ts';
import { Simulation } from './simulation.ts';
import type { Building, GameState, TechId } from './types.ts';

const STAGE3: TechId[] = ['basic', 'logistics', 'crystals', 'assembly', 'mastery', 'runecraft', 'golemcraft'];
function state(unlocked: TechId[] = STAGE3): GameState {
  const value = new Simulation().snapshot(); value.research!.unlocked = [...unlocked]; return value;
}
function facility(id: number, kind: Building['kind'], x: number, z: number, extra: Partial<Building> = {}): Building {
  return { id, kind, x, z, direction: 1, input: [], output: [], reserved: [], item: null, beltProgress: 0,
    progress: 0, working: false, energy: 0, status: '', ...extra };
}
function deployed(): GameState {
  const value = state(); value.nextId = 4;
  value.buildings = [facility(1, 'golemRelay', 10, 10, { golemWorker: { resource: 'golem', automated: true }, golemPolicy: 'fuel', golemCooldown: 0 }),
    facility(2, 'storage', 16, 10, { input: [{ resource: 'wood', automated: true }] }),
    facility(3, 'generator', 10, 16)];
  return value;
}

test('golem guide explains prerequisite research and available rune research instead of unlocked building commands', () => {
  let value = state(['basic']); let guide = getGolemGuide(value);
  assert.equal(guide.step, 1); assert.equal(guide.total, 8); assert.equal(guide.status, 'locked');
  assert.equal(guide.action!.type, 'technology'); assert.match(guide.blockers.join(' '), /魔導剣/);
  value = state(['basic', 'logistics', 'crystals', 'assembly', 'mastery']); guide = getGolemGuide(value);
  assert.equal(guide.status, 'action'); assert.match(guide.title, /研究する/);
});

test('component guide follows actual recipes, running work and independent three-core/three-frame achievements', () => {
  const value = state(STAGE3.slice(0, -1));
  let guide = getGolemGuide(value); assert.equal(guide.step, 2); assert.equal(guide.action!.kind, 'runeCarver');
  value.buildings.push(facility(1, 'assembler', 3, 3, { recipe: 'runeCore', working: true, progress: 2 }));
  guide = getGolemGuide(value); assert.equal(guide.status, 'waiting'); assert.equal(guide.action!.type, 'run');
  assert.match(guide.detail, /作り直す必要はありません/);
  value.buildings[0].working = false; value.buildings[0].progress = 0;
  guide = getGolemGuide(value); assert.equal(guide.action!.type, 'inspect'); assert.match(guide.blockers.join(' '), /精製魔晶.*2/);
  value.stats!.produced.runeCore = 3;
  assert.equal(getGolemGuide(value).action!.kind, 'frameForge');
  value.stats!.produced.golemFrame = 3;
  guide = getGolemGuide(value); assert.equal(guide.step, 2); assert.equal(guide.action!.type, 'technology'); assert.match(guide.title, /物流補助を研究/);
});

test('guide creates a physical golem, then relay, then deploys existing inventory or queued items without rebuilding', () => {
  const value = state(); let guide = getGolemGuide(value);
  assert.equal(guide.step, 3); assert.equal(guide.action!.kind, 'golemForge');
  value.buildings.push(facility(1, 'golemForge', 2, 2, { output: [{ resource: 'golem', automated: true }] }));
  guide = getGolemGuide(value); assert.equal(guide.step, 4); assert.equal(guide.action!.kind, 'golemRelay');
  value.buildings.push(facility(2, 'golemRelay', 10, 10, { golemPolicy: 'fuel', golemCooldown: 0 }));
  guide = getGolemGuide(value); assert.equal(guide.step, 5); assert.equal(guide.action!.id, 2); assert.equal(guide.action!.type, 'inspect');
  value.buildings[1].input.push(value.buildings[0].output.shift()!);
  guide = getGolemGuide(value); assert.equal(guide.step, 5); assert.equal(guide.status, 'waiting'); assert.equal(guide.action!.type, 'run');
  value.buildings[1].golemWorker = value.buildings[1].input.shift();
  guide = getGolemGuide(value); assert.equal(guide.step, 6); assert.equal(guide.action!.kind, 'storage');
  assert.equal(guide.action!.type, 'build', 'A deployed worker never requires another forge or golem');
});

test('source and target range use Manhattan distance six, including exact boundaries', () => {
  const value = deployed(); let guide = getGolemGuide(value);
  assert.equal(guide.step, 8); assert.equal(guide.status, 'waiting'); assert.equal(guide.blockers.length, 0);
  value.buildings[1].z = 11;
  guide = getGolemGuide(value); assert.equal(guide.step, 6); assert.match(guide.blockers.join(' '), /収納箱.*範囲外/);
  value.buildings[1].z = 10; value.buildings[2].x = 11;
  guide = getGolemGuide(value); assert.equal(guide.step, 7); assert.match(guide.blockers.join(' '), /魔力発生炉.*範囲外/);
});

test('manual wood, empty storage, materials policy and full receiver explain distinct fixes', () => {
  const value = deployed();
  value.buildings[1].input[0].handled = true;
  let guide = getGolemGuide(value); assert.equal(guide.step, 6); assert.match(guide.blockers.join(' '), /手動由来/);
  value.buildings[1].input = [];
  guide = getGolemGuide(value); assert.match(guide.blockers.join(' '), /自動生産の木材がありません/);
  value.buildings[1].input = [{ resource: 'wood', automated: true }]; value.buildings[0].golemPolicy = 'materials';
  guide = getGolemGuide(value); assert.equal(guide.step, 7); assert.match(guide.title, /燃料/); assert.match(guide.detail, /素材.*製造設備/);
  value.buildings[0].golemPolicy = 'fuel'; value.buildings[2].input = Array.from({ length: 8 }, () => ({ resource: 'wood', automated: true }));
  guide = getGolemGuide(value); assert.equal(guide.step, 8); assert.equal(guide.status, 'waiting'); assert.match(guide.blockers.join(' '), /満杯/);
  assert.equal(guide.action!.type, 'inspect'); assert.match(guide.detail, /作り直す必要はありません/);
});

test('existing functioning workers skip all construction and wait for actual automatic fuel transfers', () => {
  const value = deployed(); value.stats!.golemTransfers = 100; value.stats!.golemFuelTransfers = 19;
  let guide = getGolemGuide(value); assert.equal(guide.step, 8); assert.equal(guide.status, 'waiting');
  assert.equal(guide.action!.type, 'run'); assert.match(guide.detail, /19\/20/);
  value.stats!.golemFuelTransfers = 20;
  guide = getGolemGuide(value); assert.equal(guide.status, 'done'); assert.equal(guide.action!.type, 'technology');
  assert.match(guide.detail, /ゴーレムを自動生産 0\/3/, 'Completing fuel alone does not claim all sanctuary research conditions were met');
});

test('guide prefers deployed workers and an existing nearby supply pair over an empty relay', () => {
  const value = deployed(); value.buildings.push(facility(4, 'golemRelay', 20, 20, { golemPolicy: 'fuel', golemCooldown: 0 }));
  const guide = getGolemGuide(value);
  assert.equal(guide.step, 8); assert.equal(guide.action!.id, 1);
});

test('guide safely inspects historical versions and remains pure across repeat calls', () => {
  for (const version of [1, 2, 3, 4] as const) {
    const value = state(); value.version = version;
    if (version === 1) { delete value.stats; delete value.research; }
    const before = structuredClone(value), first = getGolemGuide(value), second = getGolemGuide(value);
    assert.deepEqual(first, second); assert.deepEqual(value, before);
    first.blockers.push('表示だけの変更'); assert.notDeepEqual(first.blockers, getGolemGuide(value).blockers);
  }
});
