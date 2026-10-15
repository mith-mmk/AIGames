import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation';
import { DEFINITIONS, PORTAL_INTERVAL, RECIPES, RESOURCES } from './data';
import { validateSave } from './storage';
import type { Building, Item, Kind, Resource } from './types';

const auto = (resource: Resource, throughPortal = false): Item => ({ resource, automated: true, ...(throughPortal ? { throughPortal: true } : {}) });
function building(id: number, kind: Kind, x: number, z: number, extra: Partial<Building> = {}): Building {
  const recipe = DEFINITIONS[kind].recipes?.[0];
  return { id, kind, x, z, direction: 1, input: [], output: [], reserved: [], progress: 0, working: false,
    energy: 0, status: '', item: null, beltProgress: 0, ...(recipe ? { recipe } : {}),
    ...(kind === 'portalGate' ? { portalChannel: 1, portalRole: 'send', portalCooldown: 0 } : {}),
    ...(kind === 'worldTree' ? { treeGrowth: 0 } : {}),
    ...(kind === 'golemRelay' ? { golemPolicy: 'materials', golemCooldown: 0 } : {}), ...extra };
}
function fixture(buildings: Building[]): Simulation {
  const simulation = new Simulation(); const state = simulation.snapshot();
  state.buildings = buildings; state.nextId = Math.max(0, ...buildings.map(value => value.id)) + 1;
  state.research!.unlocked = ['basic','logistics','crystals','assembly','mastery','runecraft','golemcraft','sanctuary','alchemy','portalcraft','worldGrafting'];
  for (const resource of RESOURCES) state.inventory[resource] = 100;
  state.stats!.treeGrowth = buildings.reduce((sum, value) => sum + (value.treeGrowth ?? 0), 0);
  simulation.restore(state); return simulation;
}
function steps(simulation: Simulation, ticks: number): void { for(let i=0;i<ticks;i++) simulation.step(); }
function physical(simulation: Simulation, resource: Resource): number {
  return simulation.state.buildings.reduce((sum, value) => sum + [...value.input, ...value.output, ...(value.reserved ?? []), ...(value.item ? [value.item] : [])].filter(item => item.resource === resource).length, 0);
}
function pair(items: Item[] = [auto('wood')]): Simulation {
  return fixture([building(1,'generator',4,5,{energy:30}),building(2,'portalGate',4,4,{input:items}),
    building(3,'portalGate',20,20,{portalRole:'receive'}),building(4,'belt',21,20)]);
}

test('all new recipes reserve their actual ingredients, finish at fixed time, and create a fresh portal marker', () => {
  for(const [kind,recipe] of [['alchemyLab','essence'],['portalForge','portalCore'],['seedLoom','worldSeed']] as const) {
    const inputs = Object.entries(RECIPES[recipe].input).flatMap(([resource,count]) => Array.from({length:count!},()=>auto(resource as Resource,true)));
    const simulation = fixture([building(1,'generator',4,5,{energy:30}),building(2,kind,4,4,{input:inputs})]);
    simulation.step(); assert.equal(simulation.state.buildings[1].reserved!.length,inputs.length);
    assert.equal(simulation.command({type:'recipe',id:2,recipe}).ok,false);
    steps(simulation,RECIPES[recipe].seconds*20-2); assert.equal(simulation.state.buildings[1].output.length,0);
    simulation.step(); assert.deepEqual(simulation.state.buildings[1].output,[auto(recipe)]);
    assert.equal(simulation.state.stats!.produced[recipe],1);
  }
});

test('three-ingredient alchemy jointly reserves room for both missing ingredients during a surplus flood', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'alchemyLab',4,4)]);
  assert(simulation.command({type:'feed',id:2,resource:'wood',amount:6}).ok);
  assert(simulation.command({type:'feed',id:2,resource:'crystal',amount:1}).ok);
  const before=simulation.snapshot();
  assert.equal(simulation.command({type:'feed',id:2,resource:'crystal',amount:1}).ok,false);
  assert.deepEqual(simulation.snapshot(),before);
  assert(simulation.command({type:'feed',id:2,resource:'rawCrystal',amount:1}).ok);
  steps(simulation,120); assert.equal(simulation.state.buildings[1].output[0].resource,'essence');
  assert.equal(simulation.state.buildings[1].input.length,5);
});

test('joint quota also preserves the unequal wood3 essence2 core1 requirements of seed production', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'seedLoom',4,4)]);
  assert(simulation.command({type:'feed',id:2,resource:'wood',amount:5}).ok);
  assert(simulation.command({type:'feed',id:2,resource:'essence',amount:2}).ok);
  assert.equal(simulation.command({type:'feed',id:2,resource:'essence',amount:1}).ok,false);
  assert(simulation.command({type:'feed',id:2,resource:'runeCore',amount:1}).ok);
  steps(simulation,160); assert.equal(simulation.state.buildings[1].output[0].resource,'worldSeed');
  assert.equal(simulation.state.buildings[1].input.length,2);
});

test('a sender consumes exactly 2 mana and receiver needs no power; new arrivals cannot leave in the same tick', () => {
  const simulation=pair(); simulation.step();
  assert.equal(simulation.state.buildings[0].energy,28);
  assert.deepEqual(simulation.state.buildings[2].output,[auto('wood',true)]);
  assert.equal(simulation.state.buildings[3].item,null);
  assert.equal(simulation.state.stats!.portalTransfers,1);
  simulation.step(); assert.deepEqual(simulation.state.buildings[3].item,auto('wood',true));
  assert.equal(physical(simulation,'wood'),1);
});

test('sender FIFO obeys the 20-tick interval and never emits ordinary belt output', () => {
  const simulation=pair([auto('wood'),auto('ingot'),auto('crystal')]);
  simulation.step(); steps(simulation,PORTAL_INTERVAL-1); assert.equal(simulation.state.stats!.portalTransfers,1);
  simulation.step(); assert.equal(simulation.state.stats!.portalTransfers,2);
  assert.equal(simulation.state.buildings[1].input[0].resource,'crystal'); assert.equal(simulation.state.buildings[0].energy,26);
  const isolated=fixture([building(1,'portalGate',4,4,{input:[auto('wood')]}),building(2,'belt',5,4)]);
  steps(isolated,40); assert.equal(isolated.state.buildings[1].item,null); assert.equal(physical(isolated,'wood'),1);
});

test('missing or ambiguous channel pairs hold every item and spend no mana', () => {
  for(const extras of [[],[building(3,'portalGate',20,20)], [building(3,'portalGate',20,20,{portalRole:'receive'}),building(4,'portalGate',22,20,{portalRole:'receive'})]]) {
    const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'portalGate',4,4,{input:[auto('wood')]}),...extras]);
    steps(simulation,40); assert.equal(simulation.state.buildings[0].energy,30); assert.equal(physical(simulation,'wood'),1);
    assert.match(simulation.state.buildings[1].status,/送信1基・受信1基/); assert.equal(simulation.state.stats!.portalTransfers,0);
  }
});

test('a full receiver or missing sender power stalls without spending or losing items and can recover', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'portalGate',4,4,{input:[auto('wood')]}),
    building(3,'portalGate',20,20,{portalRole:'receive',output:Array.from({length:4},()=>auto('ingot',true))})]);
  simulation.step(); assert.equal(simulation.state.buildings[0].energy,30); assert.match(simulation.state.buildings[1].status,/満杯/);
  assert(simulation.command({type:'collect',id:3}).ok); simulation.step(); assert.equal(simulation.state.stats!.portalTransfers,1);
  const noPower=fixture([building(1,'portalGate',4,4,{input:[auto('wood')]}),building(2,'portalGate',20,20,{portalRole:'receive'})]);
  noPower.step(); assert.match(noPower.state.buildings[0].status,/魔力が不足/); assert.equal(physical(noPower,'wood'),1);
});

test('manually handled or previously transferred items keep their tags and do not increment first-transfer statistics', () => {
  for(const item of [{resource:'wood' as const,automated:false},{resource:'wood' as const,automated:true,handled:true},auto('wood',true)]) {
    const simulation=pair([item]); simulation.step(); assert.equal(simulation.state.stats!.portalTransfers,0);
    assert.deepEqual(simulation.state.buildings[2].output,[{...item,throughPortal:true}]);
  }
});

test('an automatic item looping through the same gates stays physical and earns the transfer statistic only once', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'portalGate',4,4,{input:[auto('ingot')]}),
    building(3,'portalGate',8,4,{portalRole:'receive',direction:3}),building(4,'belt',7,4,{direction:3}),building(5,'belt',6,4,{direction:3}),building(6,'belt',5,4,{direction:3})]);
  steps(simulation,200); assert.equal(physical(simulation,'ingot'),1); assert.equal(simulation.state.stats!.portalTransfers,1);
  assert(simulation.state.buildings[0].energy<26,'The same physical item actually crossed more than twice');
});

test('configuration changes with buffered items are atomic and same config cannot reset cooldown', () => {
  const simulation=pair([auto('wood'),auto('wood')]); simulation.step(); const before=simulation.snapshot();
  assert.equal(simulation.command({type:'portalConfig',id:2,channel:2,role:'send'}).ok,false);
  assert.deepEqual(simulation.snapshot(),before);
  assert(simulation.command({type:'portalConfig',id:2,channel:1,role:'send'}).ok); assert.deepEqual(simulation.snapshot(),before);
  assert.equal(simulation.command({type:'portalConfig',id:1,channel:1,role:'send'}).ok,false);
  assert(simulation.command({type:'collect',id:2}).ok);
  assert(simulation.command({type:'portalConfig',id:2,channel:2,role:'send'}).ok); assert.equal(simulation.state.buildings[1].portalCooldown,19);
});

test('tree holds direct and manually handled seeds until recovery, then consumes an eligible portal seed without mana', () => {
  const simulation=fixture([building(1,'worldTree',20,20,{input:[auto('worldSeed'),auto('worldSeed',true)]})]);
  steps(simulation,20); assert.equal(simulation.state.stats!.treeGrowth,0); assert.match(simulation.state.buildings[0].status,/転送門を通っていません/);
  assert(simulation.command({type:'collect',id:1,resource:'worldSeed',amount:1}).ok);
  steps(simulation,20); assert.equal(simulation.state.stats!.treeGrowth,1); assert.equal(physical(simulation,'worldSeed'),0);
  assert(simulation.command({type:'feed',id:1,resource:'worldSeed',amount:1}).ok);
  steps(simulation,20); assert.equal(simulation.state.stats!.treeGrowth,1); assert.match(simulation.state.buildings[0].status,/手動/);
});

test('each tree stops at growth 10; removal returns only unconsumed seeds and preserves historical growth', () => {
  const simulation=fixture([building(1,'worldTree',20,20,{treeGrowth:9,input:[auto('worldSeed',true),auto('worldSeed',true),auto('worldSeed',true)]})]);
  const stock=simulation.state.inventory.worldSeed!;
  steps(simulation,100); assert.equal(simulation.state.buildings[0].treeGrowth,10); assert.equal(simulation.state.stats!.treeGrowth,10);
  assert.equal(simulation.state.buildings[0].input.length,2); assert.match(simulation.state.buildings[0].status,/余剰/);
  assert(simulation.command({type:'remove',id:1}).ok); assert.equal(simulation.state.inventory.worldSeed,stock+2); assert.equal(simulation.state.stats!.treeGrowth,10);
});

test('golem materials policy excludes portal and tree special inputs', () => {
  const simulation=fixture([building(1,'storage',4,4,{input:[auto('worldSeed')]}),building(2,'golemRelay',5,4,{golemWorker:auto('golem')}),
    building(3,'worldTree',6,4),building(4,'portalGate',5,5)]);
  steps(simulation,40); assert.equal(simulation.state.stats!.golemTransfers,0); assert.equal(simulation.state.buildings[0].input.length,1);
});

test('saving with active portal cooldowns, received seeds and tree growth resumes the exact same simulation', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'portalGate',4,4,{input:[auto('worldSeed'),auto('worldSeed'),auto('worldSeed')]}),
    building(3,'portalGate',20,20,{portalRole:'receive'}),building(4,'worldTree',21,20)]);
  steps(simulation,7); const restored=new Simulation(); restored.restore(validateSave(simulation.snapshot()));
  steps(simulation,150); steps(restored,150); assert.deepEqual(restored.snapshot(),simulation.snapshot());
  assert.equal(simulation.state.stats!.treeGrowth,3); assert.equal(simulation.state.stats!.portalTransfers,3);
});
