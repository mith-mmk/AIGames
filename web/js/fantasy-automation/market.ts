import prices from './market.json';
import type { GameState, Item, Resource } from './types.js';

export const MARKET = prices;
export const SALE_RESOURCES = Object.keys(MARKET.sell) as ('wood' | 'ingot' | 'sword')[];
export const eligibleShipment = (item: Item): boolean => item.automated && (!item.handled || item.shipEligible === true);
export function shipmentTarget(state: GameState, resource: Resource): number {
  const unlocked = state.research?.unlocked ?? ['basic'];
  if (resource === 'ingot' && !unlocked.includes('crystals')) return MARKET.deliveryTargets.ingot;
  if (resource === 'sword' && unlocked.includes('assembly') && !unlocked.includes('mastery')) return MARKET.deliveryTargets.sword;
  return 0;
}
export function shipmentQuote(state: GameState, items: readonly Item[]): { assigned: number; sold: number; coins: number; automatic: number } {
  const counts = { ...state.stats?.delivered };
  let assigned = 0, sold = 0, coins = 0, automatic = 0;
  for (const item of items) {
    const eligible = (item.resource === 'ingot' || item.resource === 'sword') && eligibleShipment(item);
    const previous = counts[item.resource] ?? 0;
    if (eligible) { counts[item.resource] = previous + 1; automatic++; }
    if (eligible && previous < shipmentTarget(state, item.resource)) assigned++;
    else { sold++; coins += MARKET.sell[item.resource as keyof typeof MARKET.sell] ?? 0; }
  }
  return { assigned, sold, coins, automatic };
}
