import type { Building, Definition, Inventory, Kind, RecipeDefinition, RecipeId, Resource } from './types';
import definitions from './definitions.json';
import recipes from './recipes.json';

/** Construction and recipes are deliberately kept outside the simulator. */
export const DEFINITIONS = definitions as Record<Kind, Definition>;
export const RECIPES = recipes as Record<RecipeId, RecipeDefinition>;
export const RESOURCES: readonly Resource[] = ['wood', 'ore', 'ingot', 'rawCrystal', 'crystal', 'sword', 'runeCore', 'golemFrame', 'golem', 'essence', 'portalCore', 'worldSeed'];
export const RESOURCE_NAMES: Record<Resource, string> = { wood: '木材', ore: '鉄鉱石', ingot: '鉄の延べ棒', rawCrystal: '魔晶原石', crystal: '精製魔晶', sword: '魔導剣', runeCore: '魔導核', golemFrame: '鉄の躯体', golem: 'ゴーレム', essence: '錬金精髄', portalCore: '転送核', worldSeed: '世界樹の種' };
export const POWER_KINDS: readonly Kind[] = ['wire', 'generator', 'miner', 'smelter', 'crystalMiner', 'crystalRefiner', 'assembler', 'runeCarver', 'frameForge', 'golemForge', 'alchemyLab', 'portalForge', 'portalGate', 'seedLoom'];

/** Belts can always be relaid, including belts in historical saves. */
export function constructionRefund(kind: Kind): Partial<Inventory> {
  return Object.fromEntries(RESOURCES.map(resource => [resource, kind === 'belt' ? DEFINITIONS[kind].cost[resource] ?? 0 : Math.floor((DEFINITIONS[kind].cost[resource] ?? 0) / 2)]));
}

export function getRecipe(building: Pick<Building, 'kind' | 'recipe'>): RecipeDefinition | undefined {
  const id = building.recipe ?? DEFINITIONS[building.kind].recipes?.[0];
  return id ? RECIPES[id] : undefined;
}

export const INPUT_CAPACITY = 8;
export const OUTPUT_CAPACITY = 4;
export const STORAGE_CAPACITY = 32;
export const ENERGY_CAPACITY = 30;
export const BELT_SECONDS = DEFINITIONS.belt.seconds!;
export const GOAL = 100;
export const GOLEM_RANGE = 6;
export const GOLEM_INTERVAL = 20;
export const PORTAL_INTERVAL = 20;
export const PORTAL_ENERGY = 2;
export const TREE_INTERVAL = 20;
