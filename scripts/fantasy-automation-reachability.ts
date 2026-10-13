import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Command, Direction, Kind, TechId } from '../web/js/fantasy-automation/types.ts';

// Run from the repository root; this script has no environment-specific imports.
const projectRequire = createRequire(join(process.cwd(), 'package.json'));
const { Simulation } = projectRequire('./web/js/fantasy-automation/simulation.ts') as typeof import('../web/js/fantasy-automation/simulation.ts');
const { canResearch, currentSwordRate } = projectRequire('./web/js/fantasy-automation/technology.ts') as typeof import('../web/js/fantasy-automation/technology.ts');
const { validateSave } = projectRequire('./web/js/fantasy-automation/storage.ts') as typeof import('../web/js/fantasy-automation/storage.ts');

const simulation = new Simulation();
const commandCounts: Record<string, number> = {};
const milestones: unknown[] = [];
function command(value: Command): void {
  const result = simulation.command(value);
  assert(result.ok, `${JSON.stringify(value)}: ${result.reason}`);
  commandCounts[value.type] = (commandCounts[value.type] ?? 0) + 1;
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
research('mastery');
assert.deepEqual(simulation.state.research!.unlocked,['basic','logistics','crystals','assembly','mastery']);
console.log(JSON.stringify({ ok:true, seed:simulation.state.seed, gameSeconds:simulation.state.tick/20, producedDuring60Seconds:producedDuringWindow, currentSwordRate:currentSwordRate(simulation.state), peakSwordRate:simulation.state.stats!.peakSwordRate, autoSwordDelivered:simulation.state.stats!.delivered.sword, ironDelivered:simulation.state.delivered, commandCounts, milestones, layout:simulation.state.buildings.map(b=>({kind:b.kind,x:b.x,z:b.z,direction:b.direction,recipe:b.recipe})) },null,2));
