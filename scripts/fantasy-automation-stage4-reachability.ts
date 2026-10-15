import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Command, Direction, Kind, TechId } from '../web/js/fantasy-automation/types.ts';

// Run from the repository root; this script has no environment-specific imports.
const projectRequire = createRequire(join(process.cwd(), 'package.json'));
const { Simulation } = projectRequire('./web/js/fantasy-automation/simulation.ts') as typeof import('../web/js/fantasy-automation/simulation.ts');
const { canResearch, currentSwordRate } = projectRequire('./web/js/fantasy-automation/technology.ts') as typeof import('../web/js/fantasy-automation/technology.ts');
const { validateSave } = projectRequire('./web/js/fantasy-automation/storage.ts') as typeof import('../web/js/fantasy-automation/storage.ts');

let autonomousMainFuel = false;
const simulation = new Simulation();
const commandCounts: Record<string, number> = {};
const commandResults: { tick: number; command: Command; result: { ok: boolean; reason: string } }[] = [];
const fixtureOption = process.argv.indexOf('--fixtures');
const noFixtures = process.argv.includes('--nofixtures') || process.argv.includes('--no-fixtures');
if (fixtureOption >= 0 && !process.argv[fixtureOption + 1]) throw new Error('--fixtures requires an output directory');
const fixtureDirectory = fixtureOption >= 0 && !noFixtures ? resolve(process.argv[fixtureOption + 1]) : null;
function writeFixture(name: string): void {
  if (!fixtureDirectory) return;
  const state = validateSave(simulation.snapshot());
  mkdirSync(fixtureDirectory, { recursive: true });
  writeFileSync(join(fixtureDirectory, `${name}.json`), JSON.stringify(state, null, 2) + '\n');
}
const milestones: unknown[] = [];
function command(value: Command): void {
  const result = simulation.command(value);
  assert(result.ok, `${JSON.stringify(value)}: ${result.reason}`);
  commandCounts[value.type] = (commandCounts[value.type] ?? 0) + 1;
  commandResults.push({ tick: simulation.state.tick, command: value, result });
}
function wood(amount: number): void {
  while (simulation.state.inventory.wood < amount) command({ type: 'gatherWood' });
}
function build(kind: Kind, x: number, z: number, direction: Direction = 1): number {
  wood(40);
  command({ type: 'build', kind, x, z, direction });
  return simulation.state.buildings.find(building => building.x === x && building.z === z)!.id;
}
function fuel(): void {
  for (const generator of simulation.state.buildings.filter(building => building.kind === 'generator')) {
    if (autonomousMainFuel && generator.z === 18 && generator.x >= 12 && generator.x <= 14) continue;
    if (generator.input.length <= 1) {
      wood(4);
      command({ type: 'feed', id: generator.id, resource: 'wood', amount: 4 });
    }
  }
}
function tick(): void {
  if (simulation.state.tick % 20 === 0) fuel();
  simulation.step();
}
function until(condition: () => boolean, limitSeconds = 1200): void {
  const deadline = simulation.state.tick + limitSeconds * 20;
  while (!condition() && simulation.state.tick < deadline) tick();
  assert(condition(), `Timed out at ${simulation.state.tick / 20}s: ${JSON.stringify(simulation.state.buildings.map(b => ({ id:b.id, kind:b.kind, x:b.x,z:b.z, status:b.status })))}`);
}
function milestone(label: string): void {
  milestones.push({ label, seconds: simulation.state.tick / 20, inventory: { ...simulation.state.inventory }, produced: { ...simulation.state.stats!.produced }, delivered: { ...simulation.state.stats!.delivered }, unlocked: [...simulation.state.research!.unlocked] });
}
function research(id: TechId): void {
  assert(canResearch(simulation.state, id).ok);
  command({ type: 'research', id });
  milestone(`research:${id}`);
}

// Default map and starting inventory/kits, with every placement made through commands.
build('miner',12,16); build('belt',13,16); build('smelter',14,16); build('belt',15,16);
build('delivery',16,16); const generator = build('generator',12,18);
build('wire',12,17); build('wire',13,17); build('wire',14,17);
build('lumber',9,18); build('belt',10,18); build('belt',11,18);
command({type:'feed',id:generator,resource:'wood',amount:1});
until(() => (simulation.state.stats!.produced.ingot ?? 0) >= 5);
research('logistics');
until(() => simulation.state.delivered >= 10);
research('crystals');

// Divert the next automatic iron into an honest, finite warehouse. Withdrawing it
// creates handled provenance, which is used only as construction stock.
const oldBelt = simulation.state.buildings.find(b=>b.x===15&&b.z===16)!;
command({type:'remove',id:oldBelt.id});
const ironStorage = build('storage',15,16,2);
const deliveryBeforeWithdrawal = simulation.state.delivered;
function collectIron(): void {
  const stored = simulation.state.buildings.find(b=>b.id===ironStorage)!;
  if (stored.input.length) command({type:'collect',id:ironStorage,resource:'ingot',amount:stored.input.length});
}
function iron(amount: number): void {
  until(() => {
    collectIron();
    return simulation.state.inventory.ingot >= amount;
  });
  assert.equal(simulation.state.delivered, deliveryBeforeWithdrawal, 'Manual withdrawals cannot masquerade as automatic deliveries');
}
iron(6); build('generator',13,18);
iron(6); build('generator',14,18);
for (let x=14;x<=20;x++) build('wire',x,19);
build('wire',20,18);
iron(8); build('crystalMiner',20,16,2);
iron(8); const refiner=build('crystalRefiner',20,17,1);
command({type:'recipe',id:refiner,recipe:'crystal'});
until(() => {
  collectIron();
  const building=simulation.state.buildings.find(b=>b.id===refiner)!;
  if (building.output.length) command({type:'collect',id:refiner,resource:'crystal',amount:building.output.length});
  return (simulation.state.stats!.produced.ingot??0)>=30 && (simulation.state.stats!.produced.crystal??0)>=10;
});
research('assembly');

// Two iron lines plus the crystal line all feed the assembler automatically.
iron(6); build('miner',12,15);
iron(1); build('belt',13,15);
iron(8); build('smelter',14,15);
iron(1); build('belt',15,15,2);
iron(12); const assembler=build('assembler',15,17,2);
command({type:'recipe',id:assembler,recipe:'sword'});
build('delivery',15,18);
command({type:'rotate',id:refiner}); command({type:'rotate',id:refiner});
for (let x=19;x>=16;x--) { iron(1); build('belt',x,17,3); }
milestone('full automatic sword layout');

// Stop all manual product collection: only wood fueling/gathering remains.
until(() => canResearch(simulation.state,'mastery').ok, 1200);
const before = simulation.state.stats!.produced.sword ?? 0;
for(let i=0;i<1200;i++) tick();
const producedDuringWindow=(simulation.state.stats!.produced.sword??0)-before;
assert(producedDuringWindow>=10, `Measured ${producedDuringWindow} automatic swords in 60 game seconds`);
assert.equal(currentSwordRate(simulation.state),producedDuringWindow);
assert((simulation.state.stats!.delivered.sword??0)>=10);
assert.deepEqual(validateSave(simulation.snapshot()),simulation.snapshot());
writeFixture('mastery');
research('mastery');
assert.deepEqual(simulation.state.research!.unlocked,['basic','logistics','crystals','assembly','mastery']);

// Stage 3: no direct state edits, no hand-fed production ingredients.
research('runecraft');
iron(100); // Actual warehouse iron funds every extension; this stock is handled.
const rune = build('runeCarver',17,13,3);
const frame = build('frameForge',15,13,1);
build('generator',15,12);
const temporaryWire=build('wire',16,12); build('wire',17,12);
// Fresh automatic timber, not the manually gathered construction/fuel stock.
build('lumber',9,19,3);
for(let z=19;z>=14;z--) build('belt',8,z,0);
build('belt',8,13,1);
for(let x=9;x<=14;x++) build('belt',x,13,1);
// Divert iron north and crystal around the east edge; original sword facilities remain.
command({type:'rotate',id:ironStorage}); command({type:'rotate',id:ironStorage});
const upperIronBelt=simulation.state.buildings.find(b=>b.kind==='belt'&&b.x===15&&b.z===15)!.id;
command({type:'rotate',id:upperIronBelt}); command({type:'rotate',id:upperIronBelt});
build('splitter',15,14,0); build('belt',16,14,1); build('belt',17,14,0);
command({type:'rotate',id:refiner}); command({type:'rotate',id:refiner});
for(let z=17;z>=15;z--) build('belt',21,z,0);
build('belt',21,14,3);
for(let x=20;x>=19;x--) build('belt',x,14,3);
build('belt',18,14,0); build('belt',18,13,3);
until(()=> (simulation.state.stats!.produced.runeCore??0)>=3 && (simulation.state.stats!.produced.golemFrame??0)>=3);
writeFixture('golemcraft-ready');
research('golemcraft');
const forge=build('golemForge',16,13,0);
command({type:'remove',id:temporaryWire});
const golemWarehouse=build('storage',16,12,0);
const relay=build('golemRelay',11,17,0);
const oldWoodBelt=simulation.state.buildings.find(b=>b.kind==='belt'&&b.x===10&&b.z===18)!.id;
command({type:'remove',id:oldWoodBelt});
build('splitter',10,18,0);
const fuelWarehouse=build('storage',10,17,0);
until(()=> (simulation.state.stats!.produced.golem??0)>=3 && simulation.state.buildings.find(b=>b.id===golemWarehouse)!.input.length>=1);
command({type:'collect',id:golemWarehouse,resource:'golem',amount:1});
command({type:'feed',id:relay,resource:'golem',amount:1});
command({type:'relayPolicy',id:relay,policy:'fuel'});
// Resume the untouched sword production facilities; main fuel now comes from the relay.
command({type:'rotate',id:ironStorage}); command({type:'rotate',id:ironStorage});
command({type:'rotate',id:upperIronBelt}); command({type:'rotate',id:upperIronBelt});
command({type:'rotate',id:refiner}); command({type:'rotate',id:refiner});
autonomousMainFuel=true;
const manualFuelCommands=commandCounts.feed;
const swordBeforeRelay=simulation.state.stats!.produced.sword??0;
const woodBeforeRelay=simulation.state.stats!.produced.wood??0;
const fuelBeforeRelay=simulation.state.stats!.golemFuelTransfers??0;
tick();
assert(simulation.state.buildings.find(b=>b.id===relay)!.golemWorker);
writeFixture('golem-active');
until(()=>canResearch(simulation.state,'sanctuary').ok,1800);
assert((simulation.state.stats!.golemFuelTransfers??0)-fuelBeforeRelay>=20);
assert((simulation.state.stats!.produced.sword??0)>swordBeforeRelay,'The original sword factory continues during relay fueling');
assert((simulation.state.stats!.produced.wood??0)>woodBeforeRelay,'Fuel comes from real timber production');
assert(simulation.state.buildings.find(b=>b.id===relay)!.golemWorker?.handled,'Initial manually deployed golem is allowed to carry automatic fuel');
assert.deepEqual(validateSave(simulation.snapshot()),simulation.snapshot());
writeFixture('sanctuary-ready');
research('sanctuary');
assert.deepEqual(simulation.state.research!.unlocked,['basic','logistics','crystals','assembly','mastery','runecraft','golemcraft','sanctuary']);

// Phase 4, entirely through the same successful player commands.
writeFixture('alchemy-ready');
research('alchemy');
iron(200);
const spareGolems=simulation.state.buildings.find(b=>b.id===golemWarehouse)!.input.filter(item=>item.resource==='golem').length;
assert(spareGolems>=3);
command({type:'collect',id:golemWarehouse,resource:'golem',amount:spareGolems});
function aim(id:number,direction:Direction):void {
  while(simulation.state.buildings.find(b=>b.id===id)!.direction!==direction) command({type:'rotate',id});
}
function cell(x:number,z:number):number { return simulation.state.buildings.find(b=>b.x===x&&b.z===z)!.id; }
// Keep iron, raw crystal and wood in separate physical warehouses to avoid mixed-stock deadlocks.
const rawWarehouse=build('storage',22,20,1);
const phase4IronWarehouse=build('storage',23,16,3);
const timberWarehouse=build('storage',24,17,1);
const refinedWarehouse=build('storage',24,20,0);
const essenceWarehouse=build('storage',23,22,0);
const coreWarehouse=build('storage',24,23,2);
const runeWarehouse=build('storage',25,24,1);
const destinationWarehouse=build('storage',28,26,2);
const phase4Refiner=build('crystalRefiner',23,20,1);
const laboratory=build('alchemyLab',23,21,2);
build('generator',23,19); build('generator',25,21); build('generator',26,21);
const temporarySeedWire=build('wire',25,22);
for(const [x,z] of [[26,22],[26,23],[26,24],[26,25],[25,25],[24,25],[21,19]] as const) build('wire',x,z);
for(const [x,z] of [[23,24],[24,18],[24,21]] as const) {
  const supply=build('golemRelay',x,z);
  command({type:'feed',id:supply,resource:'golem',amount:1});
  command({type:'relayPolicy',id:supply,policy:'materials'});
}
// Second guaranteed crystal vein feeds its own warehouse; no manually inserted ingredients.
build('crystalMiner',20,15,1);
for(const z of [15,16,17]) aim(cell(21,z),2);
build('belt',21,18,1); build('belt',22,18,2); build('belt',22,19,2);
// Existing two iron production lines branch to the eastern iron warehouse.
aim(ironStorage,0); aim(upperIronBelt,0); aim(cell(15,14),1);
for(const x of [16,17,18,19,20,21]) aim(cell(x,14),1);
build('belt',22,14,1); build('belt',23,14,2); build('belt',23,15,2);
// The second forest's untouched wood follows an independent route.
aim(cell(14,13),0); build('belt',14,12,0);
for(let x=14;x<=23;x++) build('belt',x,11,1);
for(let z=11;z<=16;z++) build('belt',24,z,2);
until(()=>canResearch(simulation.state,'portalcraft').ok,1800);
writeFixture('portalcraft-ready'); research('portalcraft');
const portalForge=build('portalForge',24,22,2);
until(()=>{
  const stored=simulation.state.buildings.find(b=>b.id===coreWarehouse)!;
  const count=stored.input.filter(item=>item.resource==='portalCore').length;
  if(count) command({type:'collect',id:coreWarehouse,resource:'portalCore',amount:count});
  return (simulation.state.inventory.portalCore??0)>=3;
},1800);
const sender=build('portalGate',21,20,1);
const receiver=build('portalGate',28,25,2);
command({type:'portalConfig',id:receiver,channel:1,role:'receive'});
aim(rawWarehouse,3);
writeFixture('portal-pair-active');
until(()=>canResearch(simulation.state,'worldGrafting').ok,1800);
writeFixture('world-grafting-ready'); research('worldGrafting');
// Keep manufactured cores out of the future seed route and recover unrelated transfer stock.
aim(rawWarehouse,1); aim(portalForge,0);
for(const id of [sender,receiver,destinationWarehouse,coreWarehouse]) command({type:'collect',id});
command({type:'remove',id:temporarySeedWire});
const loom=build('seedLoom',25,22,2);
const phase4Rune=build('runeCarver',24,24,1);
const tree=build('worldTree',28,27,0);
// Seeds flow automatically from the loom, through the sender and receiver, into the tree.
build('belt',25,23,3); aim(coreWarehouse,3);
build('belt',23,23,3); build('belt',22,23,0); build('belt',22,22,3); build('belt',21,22,0); build('belt',21,21,0);
until(()=> (simulation.state.stats!.produced.worldSeed??0)>=1,1800);
writeFixture('tree-growth-start');
until(()=>canResearch(simulation.state,'worldAwakened').ok,1800);
writeFixture('world-awakened-ready'); research('worldAwakened');
assert.equal(simulation.state.buildings.find(b=>b.id===tree)!.treeGrowth,10);
assert.equal(simulation.state.stats!.treeGrowth,10);
assert((simulation.state.stats!.portalTransfers??0)>=20);
assert.deepEqual(validateSave(simulation.snapshot()),simulation.snapshot());
assert.deepEqual(simulation.state.research!.unlocked,['basic','logistics','crystals','assembly','mastery','runecraft','golemcraft','sanctuary','alchemy','portalcraft','worldGrafting','worldAwakened']);
const summary={ok:true,seed:simulation.state.seed,gameSeconds:simulation.state.tick/20,
  produced:simulation.state.stats!.produced,delivered:simulation.state.stats!.delivered,
  portalTransfers:simulation.state.stats!.portalTransfers,treeGrowth:simulation.state.stats!.treeGrowth,
  golemFuelTransfers:simulation.state.stats!.golemFuelTransfers,golemTransfers:simulation.state.stats!.golemTransfers,
  commandCounts,commandResults,successfulCommands:commandResults.length,failedCommands:0,milestones,
  phase4:{sender,receiver,tree,loom,laboratory,portalForge,phase4Refiner,phase4Rune,rawWarehouse,phase4IronWarehouse,timberWarehouse,refinedWarehouse,essenceWarehouse,runeWarehouse,destinationWarehouse},
  layout:simulation.state.buildings.map(b=>({id:b.id,kind:b.kind,x:b.x,z:b.z,direction:b.direction,recipe:b.recipe}))};
if(fixtureDirectory) writeFileSync(join(fixtureDirectory,'reachability.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
