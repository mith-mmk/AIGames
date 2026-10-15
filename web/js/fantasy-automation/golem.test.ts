import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from './simulation';
import { DEFINITIONS, GOLEM_INTERVAL, RECIPES } from './data';
import { validateSave } from './storage';
import type { Building, Item, Kind, Resource } from './types';

const auto = (resource: Resource): Item => ({ resource, automated: true });
function building(id: number, kind: Kind, x: number, z: number, extra: Partial<Building> = {}): Building {
  const recipe = DEFINITIONS[kind].recipes?.[0];
  return { id, kind, x, z, direction: 0, input: [], output: [], reserved: [], progress: 0,
    working: false, energy: 0, status: '', item: null, beltProgress: 0,
    ...(recipe ? { recipe } : {}), ...(kind === 'golemRelay' ? { golemPolicy: 'fuel', golemCooldown: 0 } : {}), ...extra };
}
function fixture(buildings: Building[]): Simulation {
  const simulation = new Simulation();
  const state = simulation.snapshot();
  state.buildings = buildings; state.nextId = Math.max(0, ...buildings.map(value => value.id)) + 1;
  state.research!.unlocked = ['basic','logistics','crystals','assembly','mastery','runecraft','golemcraft'];
  simulation.restore(state); return simulation;
}
function steps(simulation: Simulation, ticks: number): void { for (let tick=0;tick<ticks;tick++) simulation.step(); }
function physical(simulation: Simulation, resource: Resource): number {
  return simulation.state.buildings.reduce((sum, value) => sum + [...value.input, ...value.output, ...(value.reserved ?? []), ...(value.item ? [value.item] : []), ...(value.golemWorker ? [value.golemWorker] : [])].filter(item => item.resource === resource).length, 0);
}

test('stage 3 construction and recipes remain locked until their actual technology is researched', () => {
  const simulation=new Simulation(), before=simulation.snapshot();
  assert.equal(simulation.command({type:'build',kind:'runeCarver',x:1,z:1,direction:1}).ok,false);
  assert.equal(simulation.command({type:'research',id:'runecraft'}).ok,false);
  assert.deepEqual(simulation.snapshot(),before);
  assert.deepEqual(RECIPES.golem.input,{runeCore:1,golemFrame:1});
});

test('each stage 3 recipe reserves mixed inputs once and completes at its fixed-step duration', () => {
  for (const [kind,recipe] of [['runeCarver','runeCore'],['frameForge','golemFrame'],['golemForge','golem']] as const) {
    const inputs=Object.entries(RECIPES[recipe].input).flatMap(([resource,amount])=>Array.from({length:amount!},()=>auto(resource as Resource)));
    const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,kind,4,4,{input:inputs})]);
    simulation.step();
    const producer=simulation.state.buildings[1];
    assert.equal(producer.input.length,0); assert.equal(producer.reserved!.length,inputs.length);
    assert.equal(simulation.command({type:'recipe',id:2,recipe}).ok,false);
    assert(simulation.command({type:'collect',id:2}).ok); assert.equal(producer.reserved!.length,inputs.length);
    steps(simulation,RECIPES[recipe].seconds*20-2); assert.equal(producer.output.length,0);
    simulation.step();
    assert.deepEqual(producer.output,[auto(recipe)]); assert.equal(producer.reserved!.length,0);
    assert.equal(simulation.state.stats!.produced[recipe],1);
  }
});

test('handled stage 3 ingredients preserve provenance and do not earn automatic production', () => {
  const simulation=fixture([building(1,'generator',4,5,{energy:30}),building(2,'golemForge',4,4,
    {input:[auto('runeCore'),{resource:'golemFrame',automated:true,handled:true}]})]);
  steps(simulation,160);
  assert.deepEqual(simulation.state.buildings[1].output,[{resource:'golem',automated:true,handled:true}]);
  assert.equal(simulation.state.stats!.produced.golem??0,0);
});

test('a manual deployed golem carries actual automatic wood without mana at exactly 20-tick intervals', () => {
  const simulation=fixture([building(1,'storage',4,4,{input:Array.from({length:6},()=>auto('wood'))}),
    building(2,'golemRelay',5,4,{input:[{resource:'golem',automated:false,handled:true}]}),building(3,'generator',6,4)]);
  simulation.step();
  assert.equal(simulation.state.stats!.golemFuelTransfers,1); assert.equal(simulation.state.stats!.golemTransfers,1);
  assert.equal(simulation.state.buildings[1].input.length,0); assert(simulation.state.buildings[1].golemWorker);
  assert.equal(simulation.state.buildings[2].energy,0,'Carrying itself consumes no magic');
  assert.equal(physical(simulation,'wood'),6);
  steps(simulation,GOLEM_INTERVAL-1); assert.equal(simulation.state.stats!.golemTransfers,1);
  simulation.step(); assert.equal(simulation.state.stats!.golemTransfers,2); assert.equal(physical(simulation,'wood'),6);
});

test('handled or manual fuel moves physically but never counts toward the automatic fuel goal', () => {
  for (const item of [{resource:'wood' as const,automated:true,handled:true},{resource:'wood' as const,automated:false}]) {
    const simulation=fixture([building(1,'storage',4,4,{input:[item]}),building(2,'golemRelay',5,4,{golemWorker:auto('golem')}),building(3,'generator',6,4)]);
    simulation.step(); assert.equal(simulation.state.stats!.golemTransfers,1); assert.equal(simulation.state.stats!.golemFuelTransfers,0);
    assert.equal(physical(simulation,'wood'),1);
  }
});

test('fuel priority accounts for reserved wood, then stored energy, then stable target IDs', () => {
  const simulation=fixture([building(1,'storage',8,10,{input:[auto('wood')]}),building(2,'golemRelay',10,10,{golemWorker:auto('golem')}),
    building(3,'generator',10,8,{input:[],working:true,reserved:[auto('wood')],progress:1}),
    building(4,'generator',10,12,{energy:20}),building(5,'generator',12,10,{energy:0})]);
  simulation.step(); assert.equal(simulation.state.buildings[1].golemRoute!.targetId,5);
});

test('both source and target use Manhattan range independently and report missing worker, source, and target', () => {
  const valid=fixture([building(1,'storage',4,10,{input:[auto('wood')]}),building(2,'golemRelay',10,10,{golemWorker:auto('golem')}),building(3,'generator',16,10)]);
  valid.step(); assert.equal(valid.state.stats!.golemTransfers,1);
  const tooFar=fixture([building(1,'storage',4,10,{input:[auto('wood')]}),building(2,'golemRelay',10,10,{golemWorker:auto('golem')}),building(3,'generator',17,10)]);
  tooFar.step(); assert.match(tooFar.state.buildings[1].status,/範囲6.*魔力炉/); assert.equal(tooFar.state.stats!.golemTransfers,0);
  const empty=fixture([building(1,'golemRelay',10,10)]); empty.step(); assert.match(empty.state.buildings[0].status,/1体投入/);
  empty.state.buildings[0].golemWorker=auto('golem'); empty.step(); assert.match(empty.state.buildings[0].status,/範囲6.*収納箱/);
});

test('materials policy reads real recipe needs, preserves ingredient quota and excludes fuel/miner targets', () => {
  const simulation=fixture([building(1,'storage',4,4,{input:[auto('wood'),auto('ingot'),auto('crystal')]}),
    building(2,'golemRelay',5,4,{golemWorker:auto('golem'),golemPolicy:'materials'}),
    building(3,'assembler',6,4,{input:Array.from({length:7},()=>auto('ingot'))}),building(4,'generator',6,5)]);
  simulation.step();
  assert.equal(simulation.state.buildings[1].golemRoute!.resource,'crystal'); assert.equal(simulation.state.buildings[1].golemRoute!.targetId,3);
  assert.deepEqual(simulation.state.buildings[0].input.map(item=>item.resource),['wood','ingot']);
  assert.equal(simulation.state.buildings[3].input.length,0); assert.equal(simulation.state.stats!.golemFuelTransfers,0);
});

test('two golems and a belt cannot withdraw the same physical storage item twice', () => {
  const simulation=fixture([building(1,'storage',4,4,{direction:1,input:[auto('wood')]}),building(2,'golemRelay',4,5,{golemWorker:auto('golem')}),
    building(3,'golemRelay',5,5,{golemWorker:auto('golem')}),building(4,'generator',6,5),building(5,'belt',5,4)]);
  simulation.step(); assert.equal(simulation.state.stats!.golemTransfers,1); assert.equal(physical(simulation,'wood'),1);
  assert.equal(simulation.state.buildings[4].item,null); assert.equal(simulation.state.buildings[2].golemRoute,undefined);
});

test('a belt arrival cannot cascade through a relay in the same tick', () => {
  const simulation=fixture([building(1,'belt',3,4,{direction:1,item:auto('wood'),beltProgress:0.5}),building(2,'storage',4,4),
    building(3,'golemRelay',5,4,{golemWorker:auto('golem')}),building(4,'generator',6,4)]);
  simulation.step(); assert.equal(simulation.state.stats!.golemTransfers,0); assert.equal(simulation.state.buildings[1].input.length,1);
  steps(simulation,20); assert.equal(simulation.state.stats!.golemTransfers,1); assert.equal(physical(simulation,'wood'),1);
});

test('deployed worker persists through collect and is recovered exactly once on removal', () => {
  const simulation=fixture([building(1,'golemRelay',5,4,{input:[auto('golem')]})]);
  simulation.step(); assert.equal(physical(simulation,'golem'),1);
  assert.equal(simulation.command({type:'feed',id:1,resource:'golem',amount:1}).ok,false);
  assert(simulation.command({type:'collect',id:1}).ok); assert.equal(simulation.state.inventory.golem,0);
  assert(simulation.command({type:'remove',id:1}).ok); assert.equal(simulation.state.inventory.golem,1);
  assert.deepEqual(simulation.state.inventoryItems!.find(item=>item.resource==='golem'),{resource:'golem',automated:true,handled:true});
  assert.equal(simulation.command({type:'remove',id:1}).ok,false); assert.equal(simulation.state.inventory.golem,1);
});

test('policy changes are guarded and cannot accelerate the cooldown; save/load preserves exact continuation', () => {
  const simulation=fixture([building(1,'storage',4,4,{input:[auto('wood'),auto('wood')]}),building(2,'golemRelay',5,4,{golemWorker:auto('golem')}),building(3,'generator',6,4)]);
  simulation.step(); const cooldown=simulation.state.buildings[1].golemCooldown;
  assert(simulation.command({type:'relayPolicy',id:2,policy:'materials'}).ok);
  assert.equal(simulation.state.buildings[1].golemCooldown,cooldown);
  assert.equal(simulation.command({type:'relayPolicy',id:3,policy:'fuel'}).ok,false);
  assert(simulation.command({type:'relayPolicy',id:2,policy:'fuel'}).ok);
  const checked=validateSave(simulation.snapshot()); const resumed=new Simulation(); resumed.restore(checked);
  steps(simulation,60); steps(resumed,60); assert.deepEqual(resumed.snapshot(),simulation.snapshot());
});
