import { getTile } from './world.mjs';
import { isAtWar, mulberry32 } from './rules.mjs';

const combatValue = (catalog, unit, defending, tile, cityDefense = 0) => {
  const definition = catalog.UNITS[unit.typeId]; const terrain = catalog.TERRAIN[tile.terrainId];
  const base = defending ? definition.defense * (1 + terrain.defense + cityDefense + (unit.stance === 'fortified' ? 0.25 : 0)) : definition.attack;
  return Math.max(1, base * (0.7 + unit.hp / 30) * (1 + unit.experience * 0.04));
};
export const combatForecast = (state, catalog, attacker, defender) => {
  const tile = getTile(state.world, defender.x, defender.y); const city = state.cities.find((row) => row.ownerId === defender.ownerId && row.x === defender.x && row.y === defender.y);
  const cityDefense = city?.buildingIds.reduce((sum, id) => sum + (catalog.BUILDINGS[id].defense || 0), 0) || 0;
  const attack = combatValue(catalog, attacker, false, tile); const defense = combatValue(catalog, defender, true, tile, cityDefense); const chance = attack / (attack + defense);
  return { attack, defense, attackerWinChance: chance, estimatedAttackerDamage: Math.max(1, Math.round(5 * (defense / attack))), estimatedDefenderDamage: Math.max(1, Math.round(5 * (attack / defense))) };
};
export const resolveCombat = (state, catalog, attacker, defender) => {
  const forecast = combatForecast(state, catalog, attacker, defender); const roll = mulberry32(state.rng); const attackerWon = roll < forecast.attackerWinChance;
  const attackerDamage = attackerWon ? forecast.estimatedAttackerDamage : 10; const defenderDamage = attackerWon ? 10 : forecast.estimatedDefenderDamage;
  attacker.hp -= attackerDamage; defender.hp -= defenderDamage; if (attackerWon) attacker.experience += 1; else defender.experience += 1;
  if (attacker.hp <= 0) state.units.splice(state.units.indexOf(attacker), 1); if (defender.hp <= 0) state.units.splice(state.units.indexOf(defender), 1);
  return { ...forecast, roll, attackerWon, attackerDamage, defenderDamage, attackerDestroyed: attacker.hp <= 0, defenderDestroyed: defender.hp <= 0 };
};
export const canFight = (state, attacker, defender) => attacker.ownerId !== defender.ownerId && isAtWar(state, attacker.ownerId, defender.ownerId);
export const sinkCargo = (state, transportId) => { const cargo = state.units.filter((unit) => unit.transportedByUnitId === transportId); cargo.forEach((unit) => state.units.splice(state.units.indexOf(unit), 1)); return cargo.map((unit) => unit.id); };
