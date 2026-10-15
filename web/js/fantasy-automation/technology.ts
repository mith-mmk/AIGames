import definitions from './technologies.json';
import { STEP, type CommandResult, type GameState, type Kind, type RecipeId, type Resource, type TechId } from './types.js';

export interface TechRequirement {
  metric: 'produced' | 'delivered' | 'peakSwordRate' | 'golemFuelTransfers'; resource?: Resource; target: number; label: string;
}
export interface TechDefinition {
  id: TechId; label: string; description: string; prerequisites: TechId[]; requirements: TechRequirement[];
  unlocks: { kinds: Kind[]; recipes: RecipeId[] };
}
export interface TechNodeState extends TechDefinition {
  status: 'unlocked' | 'available' | 'locked';
  requirements: (TechRequirement & { current: number; met: boolean })[];
  reason: string;
}
export const TECHNOLOGIES = definitions as TechDefinition[];

/** Measured production during the last 60 game seconds, independent of drawing and playback speed. */
export function currentSwordRate(state: GameState): number {
  const cutoff = state.tick - Math.round(60 / STEP);
  return (state.stats?.recentSwordTicks ?? []).filter(tick => tick > cutoff && tick <= state.tick).length;
}
function current(state: GameState, requirement: TechRequirement): number {
  if (requirement.metric === 'peakSwordRate') return state.stats?.peakSwordRate ?? 0;
  if (requirement.metric === 'golemFuelTransfers') return state.stats?.golemFuelTransfers ?? 0;
  return state.stats?.[requirement.metric][requirement.resource!] ??
    (requirement.metric === 'delivered' && requirement.resource === 'ingot' ? state.delivered : 0);
}
export function techNodeStates(state: GameState): TechNodeState[] {
  const unlocked = new Set<TechId>(state.research?.unlocked ?? ['basic']);
  return TECHNOLOGIES.map(definition => {
    const requirements = definition.requirements.map(requirement => ({ ...requirement, current: current(state, requirement), met: current(state, requirement) >= requirement.target }));
    const missing = definition.prerequisites.filter(id => !unlocked.has(id));
    const available = missing.length === 0 && requirements.every(requirement => requirement.met);
    const status = unlocked.has(definition.id) ? 'unlocked' : available ? 'available' : 'locked';
    const reason = status === 'unlocked' ? '解放済み' : missing.length ? `前提技術: ${missing.map(id => TECHNOLOGIES.find(node => node.id === id)!.label).join('・')}` :
      available ? '実績条件を達成。研究して解放できます。' : requirements.filter(requirement => !requirement.met).map(requirement => `${requirement.label} ${requirement.current}/${requirement.target}`).join('・');
    return { ...definition, prerequisites: [...definition.prerequisites], unlocks: { kinds: [...definition.unlocks.kinds], recipes: [...definition.unlocks.recipes] }, requirements, status, reason };
  });
}
export function canResearch(state: GameState, id: TechId): CommandResult {
  const node = techNodeStates(state).find(node => node.id === id);
  if (!node) return { ok: false, reason: '未対応の技術です。' };
  return { ok: node.status === 'available', reason: node.status === 'available' ? `${node.label}を解放できます。` : node.reason };
}
export function isKindUnlocked(state: GameState, kind: Kind): boolean {
  return techNodeStates(state).some(node => node.status === 'unlocked' && node.unlocks.kinds.includes(kind));
}
export function isRecipeUnlocked(state: GameState, recipe: RecipeId): boolean {
  return techNodeStates(state).some(node => node.status === 'unlocked' && node.unlocks.recipes.includes(recipe));
}
