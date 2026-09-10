import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { allocateTrade, cityForecast } from './economy.mjs';
import * as catalog from './data.mjs';

// No trade disappears through separate truncations, including zero-rate categories.
for (let trade = 0; trade <= 30; trade++) for (let science = 0; science <= 100; science += 10) {
  for (let tax = 0; tax <= 100 - science; tax += 10) {
    const rates = { science, tax, luxury: 100 - science - tax };
    const allocation = allocateTrade(trade, rates);
    assert.equal(Object.values(allocation).reduce((sum, value) => sum + value, 0), trade);
    for (const key of Object.keys(rates)) {
      assert.ok(Number.isInteger(allocation[key]) && allocation[key] >= 0);
      assert.ok(Math.abs(allocation[key] - trade * rates[key] / 100) < 1);
      if (!rates[key]) assert.equal(allocation[key], 0);
    }
  }
}
assert.deepEqual(allocateTrade(2, { tax:40, science:40, luxury:20 }), { science:1, tax:1, luxury:0 });

const engine = new CivilizationEngine();
engine.init({presetId:'custom',width:64,height:40,civilizationCount:2,speed:1,maxRounds:400,mapType:'continents',seed:482731,humanCivId:'a',civilizationIds:['a','b']});
const settler = engine.getView('a').units.find(unit => unit.typeId === 'settler');
assert.ok(engine.dispatch({type:'unit.foundCity',civId:'a',unitId:settler.id,name:'初期都市'}).ok);
let view = engine.getView('a');
assert.deepEqual(view.self.rates, {tax:40,science:40,luxury:20});
assert.equal(view.cities[0].forecast.trade.gross, 2);
assert.equal(view.self.forecast.researchPerRound, 2, 'one base RP plus one allocated trade RP from the first city');
assert.deepEqual(view.self.forecast.researchSources, {base:1,trade:1,specialists:0,buildings:0,technology:0});
assert.ok(engine.dispatch({type:'civ.selectResearch',civId:'a',techId:'pottery'}).ok);
assert.ok(engine.dispatch({type:'civ.endTurn',civId:'a'}).ok);
view = engine.getView('a');
assert.equal(view.self.research.progressByTech.find(row => row.techId === 'pottery').points, 2, 'displayed income equals actual research settlement');

const snapshot = engine.serialize();
const civ = snapshot.civilizations.find(civ => civ.id === 'a');
const city = snapshot.cities.find(city => city.ownerId === 'a');
civ.rates = {tax:100,science:0,luxury:0};
assert.equal(cityForecast(snapshot,catalog,city).research, 1, 'city base research is independent of trade allocation');
civ.government.transitionRoundsLeft = 1; civ.government.pendingId = 'monarchy';
assert.equal(cityForecast(snapshot,catalog,city).research, 0, 'government transition also pauses base research');
civ.government.transitionRoundsLeft = 0; city.population = 20;
assert.equal(cityForecast(snapshot,catalog,city).research, 0, 'disorder also pauses base research');
console.log('initial science, trade conservation, actual settlement and research pauses passed');
