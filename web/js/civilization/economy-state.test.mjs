import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import * as catalog from './data.mjs';
import { assignCitizens, cityForecast, civilizationUpkeep, settleCivilization } from './economy.mjs';
import { validateSnapshot } from './state.mjs';

const engine = new CivilizationEngine();
engine.init({ presetId: 'small', civilizationCount: 2, seed: 712 });
const settler = engine.getView('civ-1').units.find((unit) => unit.typeId === 'settler');
assert.equal(engine.dispatch({ type: 'unit.foundCity', civId: 'civ-1', unitId: settler.id, name: '試験都市' }).ok, true);
const base = engine.serialize();
assert.equal(validateSnapshot(base, catalog), true);

// Malformed snapshots must be rejected atomically, including nested omissions.
for (const corrupt of [
  (s) => { delete s.civilizations[0].research; },
  (s) => { s.civilizations[0].treasury = NaN; },
  (s) => { s.units[0].hp = -1; },
  (s) => { s.turn.activeCivIndex = 99; },
  (s) => { s.cities[0].foodStock = -1; },
  (s) => { s.intelligence[0].lastSeenCities = null; },
  (s) => { s.chronicle = null; },
  (s) => { s.units[0].order = { type: 'path', path: [{ x: -1, y: 2 }] }; }
]) {
  const snapshot = structuredClone(base); corrupt(snapshot);
  assert.equal(engine.load(snapshot).ok, false);
  assert.deepEqual(engine.serialize(), base);
}

// Preserve manual specialists, and settle exactly the forecast shown before end turn.
const manual = structuredClone(base); const city = manual.cities[0]; const civ = manual.civilizations[0];
city.workedTileIds = []; city.lockedTileIds = []; city.specialists = { scientist: 1, taxCollector: 0, entertainer: 0 };
assignCitizens(manual, catalog, city);
assert.equal(city.specialists.scientist, 1);
const forecast = cityForecast(manual, catalog, city);
const upkeep = civilizationUpkeep(manual, catalog, civ.id).total;
const goldBefore = civ.treasury;
settleCivilization(manual, catalog, civ.id, []);
assert.equal(civ.treasury, Math.max(0, goldBefore + forecast.gold - upkeep));
assert.equal(city.specialists.scientist, 1);
assert.equal(validateSnapshot(manual, catalog), true);

// Research completion banks overflow for the next chosen subject.
const research = structuredClone(base); const rc = research.civilizations[0];
rc.research.activeTechId = 'pottery';
rc.research.progressByTech = [{ techId: 'pottery', points: Math.round(catalog.TECHS.pottery.cost * research.config.speed) - 1 }];
research.cities[0].specialists = { scientist: 1, taxCollector: 0, entertainer: 0 }; research.cities[0].workedTileIds = [];
settleCivilization(research, catalog, rc.id, []);
assert.ok(rc.knownTechIds.includes('pottery')); assert.ok(rc.research.overflow > 0);
const overflow = rc.research.overflow;
rc.research.activeTechId = 'mining';
const nextScience = cityForecast(research, catalog, research.cities[0]).research;
settleCivilization(research, catalog, rc.id, []);
assert.equal(rc.research.progressByTech.find((row) => row.techId === 'mining').points, overflow + nextScience);

// A funded repeat queue can complete multiple items; population consumption stays valid.
const production = structuredClone(base); const pc = production.cities[0];
pc.population = 2; pc.specialists = { scientist: 0, taxCollector: 0, entertainer: 1 };
assignCitizens(production, catalog, pc);
pc.productionQueue = [{ id: 'queue-test', kind: 'unit', definitionId: 'settler', progress: 100, repeat: true }];
settleCivilization(production, catalog, pc.ownerId, []);
assert.equal(pc.population, 1);
assert.equal(pc.workedTileIds.length + Object.values(pc.specialists).reduce((a, b) => a + b, 0), 1);
assert.equal(validateSnapshot(production, catalog), true);
console.log('economy forecast, manual citizens, overflow and atomic snapshot checks passed');
