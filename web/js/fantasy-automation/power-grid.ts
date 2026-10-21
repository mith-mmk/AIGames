import { POWER_KINDS } from './data';
import { SIZE, type Building } from './types';

/** Grid distance is Manhattan: three cells in total horizontally and vertically. */
export const POWER_SUPPLY_RANGE = 3;
export const POWER_LINK_RANGE = 3;
export type PowerNode = Pick<Building, 'kind' | 'x' | 'z'>;
export interface PowerNetwork { generators: Building[]; members: number[]; }
export const powerDistance = (a: Pick<PowerNode, 'x' | 'z'>, b: Pick<PowerNode, 'x' | 'z'>): number => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export const isPowerNode = (node: PowerNode): boolean => POWER_KINDS.includes(node.kind);

/** Retain every legacy adjacent connection; poles extend both supply and the grid. */
export function powerConnected(a: PowerNode, b: PowerNode): boolean {
  if (!isPowerNode(a) || !isPowerNode(b)) return false;
  const distance = powerDistance(a, b);
  return distance > 0 && distance <= (a.kind === 'wire' || b.kind === 'wire' ? POWER_LINK_RANGE : 1);
}

export function powerCells(x: number, z: number): { x: number; z: number }[] {
  const cells = [];
  for (let dz = -POWER_SUPPLY_RANGE; dz <= POWER_SUPPLY_RANGE; dz++) for (let dx = -POWER_SUPPLY_RANGE; dx <= POWER_SUPPLY_RANGE; dx++) {
    if (Math.abs(dx) + Math.abs(dz) <= POWER_SUPPLY_RANGE && x + dx >= 0 && z + dz >= 0 && x + dx < SIZE && z + dz < SIZE) cells.push({ x: x + dx, z: z + dz });
  }
  return cells;
}

/** Pure derived topology, shared by production, previews and the first-workshop guide. */
export function powerNetworks(buildings: readonly Building[]): Map<number, PowerNetwork> {
  const powered = buildings.filter(isPowerNode).sort((a, b) => a.id - b.id);
  const occupants = new Map(powered.map(building => [building.z * SIZE + building.x, building]));
  const result = new Map<number, PowerNetwork>();
  for (const building of powered) {
    if (result.has(building.id)) continue;
    const network: PowerNetwork = { generators: [], members: [] }, queue = [building];
    result.set(building.id, network);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]; network.members.push(current.id);
      if (current.kind === 'generator') network.generators.push(current);
      for (const cell of powerCells(current.x, current.z)) {
        const adjacent = occupants.get(cell.z * SIZE + cell.x);
        if (adjacent && !result.has(adjacent.id) && powerConnected(current, adjacent)) { result.set(adjacent.id, network); queue.push(adjacent); }
      }
    }
    network.generators.sort((a, b) => a.id - b.id);
  }
  return result;
}

export function powerPreview(candidate: PowerNode, buildings: readonly Building[], networks = powerNetworks(buildings)) {
  const connections = buildings.filter(building => powerConnected(candidate, building)).sort((a, b) => a.id - b.id);
  const generators = new Map<number, Building>();
  for (const building of connections) for (const generator of networks.get(building.id)?.generators ?? []) generators.set(generator.id, generator);
  return { connections, hasGenerator: generators.size > 0, energized: [...generators.values()].some(generator => generator.energy > 0) };
}

