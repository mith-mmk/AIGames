import { DEFINITIONS, GOAL, RECIPES } from './data.js';
import { currentSwordRate, techNodeStates, type TechNodeState } from './technology.js';
import type { GameState, Kind, Resource } from './types.js';

export interface Objective {
  title: string;
  detail: string;
  resource?: Resource;
  current: number;
  target: number;
  action: 'technology' | 'guide' | null;
  completed: boolean;
}

/** Legacy states lack lifetime production counters. Infer only achievements witnessed by their items and deliveries. */
function objectiveState(state: GameState): GameState {
  if (state.version !== 1 || state.stats) return state;
  const buffered = state.buildings.flatMap(building => [
    ...building.input, ...building.output, ...(building.reserved ?? []), ...(building.item ? [building.item] : []),
  ]);
  const witnessedIngots = state.delivered + buffered.filter(item => item.resource === 'ingot' && item.automated && !item.handled).length;
  return { ...state, stats: { produced: { ingot: witnessedIngots }, delivered: { ingot: state.delivered }, recentSwordTicks: [], peakSwordRate: 0 } };
}

function unlockedContents(node: TechNodeState): string {
  const buildings = node.unlocks.kinds.map((kind: Kind) => DEFINITIONS[kind].label);
  const recipes = node.unlocks.recipes.map(recipe => RECIPES[recipe].label);
  return [...buildings, ...recipes.map(recipe => `${recipe}レシピ`)].join('・');
}

function technologyObjective(state: GameState, node: TechNodeState, tracking?: TechNodeState): Objective {
  const requirement = node.requirements.find(requirement => !requirement.met) ?? node.requirements[0];
  const available = node.status === 'available';
  const requirements = node.requirements.map(requirement => `${requirement.label} ${requirement.current}/${requirement.target}`).join('・');
  const unlocks = unlockedContents(node);
  const prefix = tracking && tracking.id !== node.id ? `追跡中「${tracking.label}」の前提技術です。` : '';
  const rate = node.id === 'mastery' ? `現在 ${currentSwordRate(state)}本/ゲーム内分、最高 ${state.stats?.peakSwordRate ?? 0}本/ゲーム内分。納品累計とは別の実測速度です。` : '';
  const instruction = available ? '条件達成。技術ツリーを開き「研究する（実績のみ）」を押してください。' : '自動生産・自動納品の実績を増やし、技術ツリーで条件を確認してください。';
  return {
    title: available ? `${node.label}を研究する` : `${node.label}：${requirement?.label ?? '前提技術を解放'}`,
    detail: `${prefix}${instruction}${requirements ? ` ${requirements}。` : ''}${unlocks ? ` 解放: ${unlocks}。` : ''}${rate ? ` ${rate}` : ''}`,
    ...(requirement ? { resource: requirement.resource ?? (requirement.metric === 'peakSwordRate' ? 'sword' as Resource : requirement.metric === 'golemFuelTransfers' ? 'wood' as Resource : undefined) } : {}),
    current: requirement?.current ?? 0,
    target: requirement?.target ?? 1,
    action: 'technology', completed: false,
  };
}

/** Saveable game state selects the next actionable goal; renderer state and the old iron victory flag are irrelevant. */
export function getObjective(original: GameState): Objective {
  const state = objectiveState(original);
  const nodes = techNodeStates(state);
  const tracked = nodes.find(node => node.id === state.research?.tracked && node.status !== 'unlocked');
  const prerequisiteGoal = (node: TechNodeState): TechNodeState => {
    const missing = nodes.find(candidate => node.prerequisites.includes(candidate.id) && candidate.status !== 'unlocked');
    return missing ? prerequisiteGoal(missing) : node;
  };
  const next = tracked ? prerequisiteGoal(tracked) : nodes.find(node => node.status === 'available');
  if (next) return technologyObjective(state, next, tracked);
  // Once the whole tree is researched, an old tracked id or iron quest must not reappear.
  if (nodes.every(node => node.status === 'unlocked')) return {
    title: `${nodes[nodes.length - 1].label}を達成：工房を自由に拡張`,
    detail: `全技術を解放しました。ゴーレムの自動生産 ${state.stats?.produced.golem ?? 0}体、木材の自動補給 ${state.stats?.golemFuelTransfers ?? 0}個。収納や分岐、ゴーレムを使って工房を広げられます。`,
    resource: 'wood', current: state.stats?.golemFuelTransfers ?? 0, target: 20, action: null, completed: true,
  };
  const remaining = nodes.find(node => node.status !== 'unlocked')!;
  // Research beyond basic logistics establishes a new production stage even before the optional iron quota is met.
  if (nodes.some(node => node.status === 'unlocked' && node.id !== 'basic' && node.id !== 'logistics')) return technologyObjective(state, prerequisiteGoal(remaining));
  if (state.delivered < GOAL) return {
    title: '鉄の延べ棒を100本自動納品',
    detail: '採掘機→魔導炉→納品箱をつなぎ、自動生産した鉄の延べ棒を自動搬送してください。手で投入・回収した品は数えません。研究条件を達成すると次の目標へ進みます。',
    resource: 'ingot', current: state.delivered, target: GOAL, action: 'guide', completed: false,
  };
  return technologyObjective(state, prerequisiteGoal(remaining));
}
