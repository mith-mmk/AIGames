import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Simulation } from './simulation';
import { validateSave } from './storage';
import { BUILDABLE_KINDS, DEFINITIONS, LEGACY_DEFINITIONS, RECIPES, RESOURCES, commonKind, constructionRefund } from './data';
import { TECHNOLOGIES } from './technology';
import { MARKET, shipmentQuote } from './market';
import type { Building, Kind, RecipeId, Resource } from './types';

function workshop() {
  const s = new Simulation(); s.state.research!.unlocked = TECHNOLOGIES.map(t => t.id);
  for (const r of RESOURCES) s.state.inventory[r] = 1000;
  s.state.kits = {}; return s;
}
function place(s: Simulation, kind: Kind, x = 17, z = 19, recipe?: RecipeId): Building {
  const result = s.command({ type: 'build', kind, x, z, direction: 1, ...(recipe ? { recipe } : {}) }); assert(result.ok, result.reason);
  return s.state.buildings.find(b => b.x === x && b.z === z)!;
}
const old = () => JSON.parse(fs.readFileSync('artifacts/fantasy-automation/phase4/fixtures/world-awakened-ready.json', 'utf8'));

test('15 canonical building choices expose all 9 recipes on three existing machines', () => {
  assert.equal(BUILDABLE_KINDS.length, 15);
  assert.deepEqual(DEFINITIONS.smelter.recipes, ['ingot', 'crystal']);
  assert.deepEqual(DEFINITIONS.assembler.recipes, ['sword', 'runeCore', 'golemFrame', 'golem', 'portalCore']);
  assert.deepEqual(DEFINITIONS.alchemyLab.recipes, ['essence', 'worldSeed']);
});

test('all nine recipes keep exact inputs, reservation, duration, output and mana', () => {
  for (const kind of ['smelter', 'assembler', 'alchemyLab'] as const) for (const recipe of DEFINITIONS[kind].recipes!) {
    const s = workshop(), machine = place(s, kind, 17, 19, recipe), gen = place(s, 'generator', 17, 20);
    gen.energy = 30;
    machine.input = Object.entries(RECIPES[recipe].input).flatMap(([resource,n]) => Array.from({ length: n! }, () => ({ resource: resource as Resource, automated: true })));
    const n = machine.input.length; s.step(); assert.equal(machine.reserved!.length, n); assert.equal(gen.energy, 30 - RECIPES[recipe].energy);
    const running = s.snapshot(); assert.equal(s.command({ type: 'recipe', id: machine.id, recipe }).ok, false); assert.deepEqual(s.snapshot(), running);
    for (let i = 1; i < RECIPES[recipe].seconds * 20 - 1; i++) s.step(); assert.equal(machine.output.length, 0);
    s.step(); assert.equal(machine.output[0].resource, recipe); assert.equal(s.state.stats!.produced[recipe], 1);
    assert.deepEqual(validateSave(s.snapshot()), s.snapshot());
  }
});

test('genuine v4 saves migrate every machine in place with original work, stock, research and refunds', () => {
  const original = old(), untouched = structuredClone(original), migrated = validateSave(original);
  assert.equal(migrated.version, 5); assert.deepEqual(original, untouched); assert.deepEqual(migrated.market, { coins: 0, sold: {} });
  for (const field of ['inventory', 'inventoryItems', 'stats', 'research', 'terrain', 'kits', 'tick', 'nextId'] as const) assert.deepEqual(migrated[field], original[field]);
  for (const previous of original.buildings) {
    const current = migrated.buildings.find(b => b.id === previous.id)!;
    assert.deepEqual(current, { ...previous, kind: commonKind(previous.kind), ...(LEGACY_DEFINITIONS[previous.kind as Kind].recipes ? { recipe: previous.recipe ?? LEGACY_DEFINITIONS[previous.kind as Kind].recipes![0] } : {}), constructionCost: LEGACY_DEFINITIONS[previous.kind as Kind].cost });
  }
  const s = new Simulation(); s.restore(migrated);
  for (const b of [...s.state.buildings]) {
    const before = { ...s.state.inventory }, contents = [...b.input, ...b.output, ...(b.kind === 'generator' && (b.pendingEnergy ?? 0) > 0 ? [] : b.reserved ?? []), ...(b.item ? [b.item] : []), ...(b.golemWorker ? [b.golemWorker] : [])];
    const refund = constructionRefund(b.kind, b.constructionCost);
    assert(s.command({ type: 'remove', id: b.id }).ok);
    for (const r of RESOURCES) assert.equal(s.state.inventory[r], (before[r] ?? 0) + (refund[r] ?? 0) + contents.filter(i => i.resource === r).length);
  }
});

test('recipe switching retains construction refund, rejects incompatible stock, and never returns free materials', () => {
  const s = workshop(), b = place(s, 'assembler'); const price = structuredClone(b.constructionCost);
  const before = { ...s.state.inventory }; assert(s.command({ type: 'recipe', id: b.id, recipe: 'golem' }).ok);
  assert.deepEqual(s.state.inventory, before); assert.deepEqual(b.constructionCost, price);
  b.input.push({ resource: 'golemFrame', automated: true }); const snapshot = s.snapshot();
  assert.equal(s.command({ type: 'recipe', id: b.id, recipe: 'sword' }).ok, false); assert.deepEqual(s.snapshot(), snapshot);
});

test('legacy kit vouchers remain usable and undo returns the same voucher with its old refund value', () => {
  const original = old(); original.kits = { runeCarver: 2, seedLoom: 1 };
  const s = new Simulation(); s.restore(validateSave(original));
  const cell = Array.from({ length: 1024 }, (_, n) => ({ x: n % 32, z: Math.floor(n / 32) })).find(c => !s.state.buildings.some(b => b.x === c.x && b.z === c.z))!;
  const before = { ...s.state.inventory }, a = place(s, 'assembler', cell.x, cell.z, 'runeCore');
  assert.equal(s.state.kits.runeCarver, 1); assert.deepEqual(s.state.inventory, before); assert.deepEqual(a.constructionCost, LEGACY_DEFINITIONS.runeCarver.cost);
  assert(s.command({ type: 'undoBuild' }).ok); assert.equal(s.state.kits.runeCarver, 2); assert.deepEqual(s.state.inventory, before);
  const b = place(s, 'assembler', cell.x, cell.z, 'golem'); assert(s.command({ type: 'remove', id: b.id }).ok);
  assert.equal(s.state.inventory.wood, before.wood + 3); assert.equal(s.state.inventory.ingot, before.ingot + 4);
  assert.deepEqual(validateSave(s.snapshot()), s.snapshot());
});

test('newly unlocked recipes use existing machines without granting access to later research', () => {
  const s = new Simulation(), b = place(s, 'smelter');
  assert.equal(s.command({ type: 'recipe', id: b.id, recipe: 'crystal' }).ok, false);
  s.state.research!.unlocked.push('crystals'); assert(s.command({ type: 'recipe', id: b.id, recipe: 'crystal' }).ok);
});

test('manual dispatch allocates only the missing request quantity, sells surplus once, and keeps research explicit', () => {
  const s = new Simulation(), depot = place(s, 'delivery'); s.state.stats!.produced.ingot = 12;
  depot.input = Array.from({ length: 12 }, () => ({ resource: 'ingot', automated: true }));
  assert.deepEqual(shipmentQuote(s.state, depot.input), { assigned: 10, sold: 2, coins: 20, automatic: 12 });
  assert(s.command({ type: 'dispatch', id: depot.id, source: 'depot', resource: 'ingot', amount: 12 }).ok);
  assert.equal(s.state.delivered, 12); assert.equal(s.state.market!.coins, 20); assert.equal(depot.input.length, 0);
  assert.deepEqual(s.state.research!.unlocked, ['basic']);
  const before = s.snapshot(); assert.equal(s.command({ type: 'dispatch', id: depot.id, source: 'depot', resource: 'ingot', amount: 12 }).ok, false); assert.deepEqual(s.snapshot(), before);
  assert(s.command({ type: 'research', id: 'crystals' }).ok); assert.deepEqual(validateSave(s.snapshot()), s.snapshot());
});

test('collected automatic output remains eligible for manual shipping across save/load, initial and bought goods do not', () => {
  const s = new Simulation(), depot = place(s, 'delivery'), smelter = place(s, 'smelter', 18, 19);
  smelter.output = [{ resource: 'ingot', automated: true }]; s.state.stats!.produced.ingot = 1;
  assert(s.command({ type: 'collect', id: smelter.id }).ok); assert(s.state.inventoryItems!.some(i => i.shipEligible));
  s.restore(validateSave(s.snapshot())); assert(s.command({ type: 'dispatch', id: depot.id, source: 'inventory', resource: 'ingot', amount: 1 }).ok); assert.equal(s.state.delivered, 1);
  assert(s.command({ type: 'dispatch', id: depot.id, source: 'inventory', resource: 'ingot', amount: 3 }).ok); assert.equal(s.state.delivered, 1); assert.equal(s.state.market!.coins, 30);
  assert(s.command({ type: 'buyIron', id: depot.id, amount: 1 }).ok); assert.equal(s.state.market!.coins, 0);
  assert(s.command({ type: 'dispatch', id: depot.id, source: 'inventory', resource: 'ingot', amount: 1 }).ok); assert.equal(s.state.delivered, 1); assert.equal(s.state.market!.coins, 10);
});

test('belt arrivals wait in a bounded shipping depot and are recoverable until explicit dispatch', () => {
  const s = workshop(), belt = place(s, 'belt', 17, 19), depot = place(s, 'delivery', 18, 19);
  belt.item = { resource: 'ingot', automated: true }; belt.beltProgress = .5; s.state.stats!.produced.ingot = 1;
  s.step(); assert.equal(depot.input.length, 1); assert.equal(s.state.delivered, 0); assert.equal(s.state.market!.coins, 0);
  assert(s.command({ type: 'collect', id: depot.id }).ok); assert.equal(depot.input.length, 0); assert(s.state.inventoryItems!.some(i => i.shipEligible));
  depot.input = Array.from({ length: 32 }, () => ({ resource: 'wood', automated: false })); belt.item = { resource: 'wood', automated: false }; s.step();
  assert.equal(depot.input.length, 32); assert(belt.item);
});

test('zero funds and zero iron recover through wood gathering and sale; buy/resell and assembly purchase loops lose money', () => {
  const s = new Simulation(), depot = place(s, 'delivery'); s.state.inventory.ingot = 0; s.state.inventory.wood = 0;
  for (let i = 0; i < MARKET.buy.ingot; i++) assert(s.command({ type: 'gatherWood' }).ok);
  assert(s.command({ type: 'dispatch', id: depot.id, source: 'inventory', resource: 'wood', amount: MARKET.buy.ingot }).ok);
  assert(s.command({ type: 'buyIron', id: depot.id, amount: 1 }).ok); assert.equal(s.state.inventory.ingot, 1);
  assert(s.command({ type: 'dispatch', id: depot.id, source: 'inventory', resource: 'ingot', amount: 1 }).ok); assert.equal(s.state.market!.coins, MARKET.sell.ingot);
  assert(MARKET.buy.ingot > MARKET.sell.ingot); assert(MARKET.buy.ingot * RECIPES.sword.input.ingot! > MARKET.sell.sword);
  for (const amount of [-1, 0, NaN, 1.5, Infinity, 1001]) { const before = s.snapshot(); assert.equal(s.command({ type: 'buyIron', id: depot.id, amount }).ok, false); assert.deepEqual(s.snapshot(), before); }
});

test('strict v5 codec rejects unknown kinds, corrupted accounting, prices and fabricated shipping origin', () => {
  const s = workshop(), b = place(s, 'assembler'), valid = s.snapshot();
  for (const mutate of [(v: typeof valid) => { v.market!.coins = -1; }, (v: typeof valid) => { v.buildings[0].kind = 'runeCarver'; }, (v: typeof valid) => { v.buildings[0].constructionCost = { ingot: 999 }; }, (v: typeof valid) => { v.inventoryItems!.push({ resource: 'ingot', automated: false, handled: true, shipEligible: true }); }]) {
    const value = structuredClone(valid); mutate(value); assert.throws(() => validateSave(value));
  }
  assert.equal(b.recipe, 'sword');
});
