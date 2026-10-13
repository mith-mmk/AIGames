import type { Building, Definition, Kind, RecipeDefinition, RecipeId, Resource } from './types';
import definitions from './definitions.json';
import recipes from './recipes.json';

/** Construction and recipes are deliberately kept outside the simulator. */
export const DEFINITIONS = definitions as Record<Kind, Definition>;
export const RECIPES = recipes as Record<RecipeId, RecipeDefinition>;
export const RESOURCES: readonly Resource[] = ['wood', 'ore', 'ingot', 'rawCrystal', 'crystal', 'sword'];
export const RESOURCE_NAMES: Record<Resource, string> = { wood: '木材', ore: '鉄鉱石', ingot: '鉄の延べ棒', rawCrystal: '魔晶原石', crystal: '精製魔晶', sword: '魔導剣' };
export const POWER_KINDS: readonly Kind[] = ['wire', 'generator', 'miner', 'smelter', 'crystalMiner', 'crystalRefiner', 'assembler'];

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
