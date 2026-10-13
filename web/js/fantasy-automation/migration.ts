import { SIZE, type Building, type GameState, type Inventory, type Item, type Resource } from './types.js';

const BASE_KINDS = new Set(['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery']);
const LEGACY_INPUTS: Partial<Record<Building['kind'], Partial<Inventory>>> = { smelter: { ore: 2 }, generator: { wood: 1 } };
const RESOURCES: Resource[] = ['wood', 'ore', 'ingot', 'rawCrystal', 'crystal', 'sword'];
function automatic(items: Item[], resource: Resource): number { return items.filter(item => item.resource === resource && item.automated && !item.handled).length; }

/** Pure migration. Loading never writes the IndexedDB slot; only an explicit save does. */
export function migrateGameState(value: GameState): GameState {
  if (value.version !== 1 && value.version !== 2) throw new Error('この保存形式には対応していません（対応: version 1・2）。');
  const state: GameState = structuredClone(value);
  if (state.version === 2) return state;
  for (const building of state.buildings) {
    if (!BASE_KINDS.has(building.kind)) throw new Error('旧保存形式に未対応の設備があります。');
    if (building.reserved?.length) throw new Error('旧保存形式に未対応の予約素材があります。');
    building.reserved = [];
    if (building.kind === 'smelter') building.recipe = 'ingot';
    if (building.working) {
      for (const [resource, amount] of Object.entries(LEGACY_INPUTS[building.kind] ?? {})) {
        for (let index = 0; index < (amount ?? 0); index++) {
          const at = building.input.findIndex(item => item.resource === resource);
          if (at < 0) throw new Error('旧保存データの稼働中設備に予約素材がありません。');
          building.reserved.push(building.input.splice(at, 1)[0]);
        }
      }
    }
  }
  const buffered = state.buildings.flatMap(building => [...building.input, ...building.output, ...(building.reserved ?? []), ...(building.item ? [building.item] : [])]);
  const ingot = state.delivered + automatic(buffered, 'ingot');
  state.stats = { produced: { wood: automatic(buffered, 'wood'), ore: 2 * ingot + automatic(buffered, 'ore'), ingot, rawCrystal: 0, crystal: 0, sword: 0 }, delivered: { ingot: state.delivered, sword: 0 }, recentSwordTicks: [], peakSwordRate: 0 };
  state.research = { unlocked: ['basic'], tracked: 'logistics' };
  state.inventoryItems = [];
  for (const resource of RESOURCES) if (state.inventory[resource] === undefined) state.inventory[resource] = 0;
  const occupied = new Set(state.buildings.map(building => building.z * SIZE + building.x));
  // Preserve every old resource tile and occupied cell. Prefer a visible central pair.
  let deposits = state.terrain.filter(tile => tile === 'crystal').length;
  const preferred = [16 * SIZE + 20, 15 * SIZE + 20];
  const candidates = [...preferred, ...state.terrain.map((_, index) => index)];
  for (const index of candidates) {
    if (deposits >= 2) break;
    if (!occupied.has(index) && state.terrain[index] === 'grass') { state.terrain[index] = 'crystal'; deposits++; }
  }
  // A fully built workshop keeps its terrain intact until the player removes a selected building.
  const pending: number[] = [];
  for (const index of candidates) {
    if (deposits + pending.length >= 2) break;
    if (occupied.has(index) && state.terrain[index] === 'grass' && !pending.includes(index)) pending.push(index);
  }
  if (pending.length) state.pendingCrystalCells = pending;
  state.version = 2;
  return state;
}
