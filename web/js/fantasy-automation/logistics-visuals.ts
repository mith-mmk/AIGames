import { BELT_SECONDS, DEFINITIONS, INPUT_CAPACITY, RESOURCES, STORAGE_CAPACITY, getRecipe } from './data.js';
import { DIRECTIONS, SIZE, type Building, type Direction, type Kind, type Resource } from './types.js';

export type PortVisualState = 'connected' | 'missing' | 'incompatible' | 'full' | 'edge';
export type LogisticsSource = Pick<Building, 'kind' | 'x' | 'z' | 'direction' | 'recipe' | 'portalRole'> & Partial<Pick<Building, 'item' | 'input' | 'output' | 'beltProgress'>>;
export interface PortVisual { direction: Direction; state: PortVisualState; targetId: number | null; }
const conveyor = (kind: Kind) => kind === 'belt' || kind === 'splitter';

export function outputDirections(kind: Kind, direction: Direction, portalRole?: Building['portalRole']): Direction[] {
  if (kind === 'wire' || kind === 'generator' || kind === 'delivery' || kind === 'golemRelay' || kind === 'worldTree' || (kind === 'portalGate' && portalRole !== 'receive')) return [];
  return kind === 'splitter' ? [direction, ((direction + 1) % 4) as Direction] : [direction];
}

export function acceptedResources(building: Pick<Building, 'kind' | 'recipe' | 'portalRole'>): Resource[] {
  if (conveyor(building.kind) || building.kind === 'storage') return [...RESOURCES];
  if (building.kind === 'delivery') return ['wood', 'ingot', 'sword'];
  if (building.kind === 'golemRelay') return ['golem'];
  if (building.kind === 'portalGate') return building.portalRole === 'receive' ? [] : [...RESOURCES];
  if (building.kind === 'worldTree') return ['worldSeed'];
  return Object.keys(getRecipe(building)?.input ?? DEFINITIONS[building.kind].input ?? {}) as Resource[];
}

export function outputResources(source: LogisticsSource): Resource[] {
  if (source.kind === 'portalGate' && source.portalRole !== 'receive') return [];
  const held = conveyor(source.kind) ? source.item : source.kind === 'storage' ? source.input?.[0] : source.output?.[0];
  if (held) return [held.resource];
  if (conveyor(source.kind) || source.kind === 'storage' || source.kind === 'portalGate') return [...RESOURCES];
  return Object.keys(getRecipe(source)?.output ?? DEFINITIONS[source.kind].output ?? {}) as Resource[];
}

/** Current buffer room, including the simulator's reserved room for other recipe ingredients. */
export function hasBufferRoom(target: Building, resource: Resource): boolean {
  if (!acceptedResources(target).includes(resource)) return false;
  if (target.kind === 'golemRelay') return !target.golemWorker && target.input.length === 0;
  if (conveyor(target.kind)) return !target.item || target.beltProgress + 1e-9 >= BELT_SECONDS;
  const capacity = (target.kind === 'storage' || target.kind === 'delivery') ? STORAGE_CAPACITY : INPUT_CAPACITY;
  if (target.input.length >= capacity) return false;
  const recipe = getRecipe(target)?.input ?? DEFINITIONS[target.kind].input ?? {};
  const missingOthers = RESOURCES.reduce((sum, other) => sum + (other === resource ? 0 : Math.max(0, (recipe[other] ?? 0) - target.input.filter(item => item.resource === other).length)), 0);
  return target.input.length + 1 <= capacity - missingOthers;
}

/** Follow occupied, ready belts: a closed ready loop can move together, a dead end cannot. */
function canDepart(source: Building, cells: ReadonlyMap<string, Building>, visiting: Set<number>): boolean {
  if (!source.item || source.beltProgress + 1e-9 < BELT_SECONDS) return false;
  if (visiting.has(source.id)) return true;
  visiting.add(source.id);
  for (const direction of outputDirections(source.kind, source.direction, source.portalRole)) {
    const [dx, dz] = DIRECTIONS[direction];
    const target = cells.get(`${source.x + dx},${source.z + dz}`);
    if (!target || !hasBufferRoom(target, source.item.resource)) continue;
    if (!conveyor(target.kind) || !target.item || canDepart(target, cells, visiting)) { visiting.delete(source.id); return true; }
  }
  visiting.delete(source.id); return false;
}

/** A view of current connectivity, never a promise about competing sources next tick. */
export function logisticsPorts(source: LogisticsSource, cells: ReadonlyMap<string, Building>, resources = outputResources(source)): PortVisual[] {
  return outputDirections(source.kind, source.direction, source.portalRole).map(direction => {
    const [dx, dz] = DIRECTIONS[direction], x = source.x + dx, z = source.z + dz;
    if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) return { direction, state: 'edge', targetId: null };
    const target = cells.get(`${x},${z}`);
    if (!target) return { direction, state: 'missing', targetId: null };
    const compatible = resources.filter(resource => acceptedResources(target).includes(resource));
    if (!compatible.length) return { direction, state: 'incompatible', targetId: target.id };
    const room = compatible.some(resource => hasBufferRoom(target, resource));
    const departing = !conveyor(target.kind) || !target.item || canDepart(target, cells, new Set());
    return { direction, state: room && departing ? 'connected' : 'full', targetId: target.id };
  });
}
