import { BELT_SECONDS, DEFINITIONS, INPUT_CAPACITY, OUTPUT_CAPACITY, RESOURCE_NAMES } from './data';
import { DIRECTIONS, type Building, type Direction, type GameState, type Kind, type Resource } from './types';
import { getObjective } from './objectives';
import { powerNetworks } from './power-grid';

export interface GuideStep {
  id: string; step: number; total: number; title: string; text: string;
  kind: Kind | null; target: { x: number; z: number } | null;
  direction: Direction | null; focusId: number | null;
  mode: 'build' | 'rotate' | 'feed' | 'run' | 'done' | 'ship' | 'recipe';
  blockers: string[]; checks: string[];
}

interface Placement {
  id: string; kind: Kind; x: number; z: number; direction: Direction | null; text: string;
}

const TOTAL = 14;
const FIRST_LINE: readonly Placement[] = [
  { id: 'miner', kind: 'miner', x: 12, z: 16, direction: 1, text: 'まずは見本の配置で工房を作ります。鉄鉱脈の光る区画に採掘機を置き、東→の向き（目印の矢印と同じ）へ出力します。' },
  { id: 'belt-ore', kind: 'belt', x: 13, z: 16, direction: 1, text: '採掘機の東隣にベルトを置き、鉄鉱石を次の区画へ運びます。矢印は東へ。' },
  { id: 'smelter', kind: 'smelter', x: 14, z: 16, direction: 1, text: 'ベルトの東隣に製錬炉を置きます。鉱石2個から延べ棒1本を作ります。出力は東へ。' },
  { id: 'belt-ingot', kind: 'belt', x: 15, z: 16, direction: 1, text: '製錬炉の東隣にベルトを置きます。完成した延べ棒を東へ運びます。' },
  { id: 'delivery', kind: 'delivery', x: 16, z: 16, direction: null, text: 'ベルトの東隣に出荷所を置きます。届いた品を保持し、詳細で確認して手動出荷します。' },
  { id: 'generator', kind: 'generator', x: 12, z: 18, direction: null, text: '採掘機から南へ2区画の場所に魔力発生炉を置きます。木材を燃料に魔力を作ります。' },
  { id: 'wire-miner', kind: 'wire', x: 12, z: 17, direction: null, text: '魔力発生炉と採掘機の間に電柱（魔力導線）を置きます。周囲3マス（ひし形）へ供給。電柱同士も3マス以内で網を延ばせます。向きは関係ありません。' },
  { id: 'wire-link', kind: 'wire', x: 13, z: 17, direction: null, text: '電柱を3マス以内でつなぐと魔力網を延長できます。採掘機と製錬炉が供給範囲内なら追加の電柱は省略できます。' },
  { id: 'wire-smelter', kind: 'wire', x: 14, z: 17, direction: null, text: '製錬炉の南隣にも導線を置きます。採掘機と製錬炉の両方に魔力が届く形です。' },
];
const FUEL_LINE: readonly Placement[] = [
  { id: 'lumber', kind: 'lumber', x: 9, z: 18, direction: 1, text: '森林に木材採取場を置き、矢印を東へ。3秒ごとに木材を作り、燃料補給を自動化します。' },
  { id: 'belt-wood-1', kind: 'belt', x: 10, z: 18, direction: 1, text: '木材採取場の東隣にベルトを置きます。木材を魔力発生炉へ向けて東へ運びます。' },
  { id: 'belt-wood-2', kind: 'belt', x: 11, z: 18, direction: 1, text: 'もう1区画、東向きのベルトを置きます。木材採取場から魔力発生炉まで連結すれば手動補給が不要になります。' },
];

const at = (state: GameState, x: number, z: number): Building | undefined => state.buildings.find(building => building.x === x && building.z === z);
const location = (x: number, z: number): string => `（${x}, ${z}）`;

function result(step: number, id: string, title: string, text: string, checks: string[], extra: Partial<GuideStep> = {}): GuideStep {
  return { id, step, total: TOTAL, title, text, kind: null, target: null, direction: null,
    focusId: null, mode: 'run', blockers: [], checks: [...checks], ...extra };
}

function placement(state: GameState, wanted: Placement, step: number, checks: string[]): GuideStep | null {
  const existing = at(state, wanted.x, wanted.z);
  if (wanted.kind === 'wire') {
    const miner = at(state, 12, 16), smelter = at(state, 14, 16);
    if (miner && smelter && hasGeneratorConnection(state, miner) && hasGeneratorConnection(state, smelter)) return null;
  }
  const label = DEFINITIONS[wanted.kind].label;
  if (existing?.kind === 'smelter' && wanted.kind === 'smelter' && existing.recipe !== 'ingot') return result(step, wanted.id, '製錬炉を鉄の延べ棒レシピへ戻す', '詳細で鉄の延べ棒を選択してください。稼働中・互換性のない在庫がある時は終了と排出を待ちます。', checks, { focusId: existing.id, kind: 'smelter', mode: 'recipe' });
  if (existing?.kind === wanted.kind && (wanted.direction === null || existing.direction === wanted.direction)) return null;
  const target = { x: wanted.x, z: wanted.z };
  if (existing?.kind === wanted.kind) {
    const turns = (wanted.direction! - existing.direction + 4) % 4;
    return result(step, wanted.id, `${label}の出力を東へ向ける`,
      `${location(wanted.x, wanted.z)}の${label}を選択し、右下の大きな回転ボタンか向きの選択で東→へ。Rを${turns}回押しても変更できます。`, checks,
      { kind: wanted.kind, target, direction: wanted.direction, focusId: existing.id, mode: 'rotate', blockers: ['出力方向が違うため、次の設備へ搬送できません。'] });
  }
  const blockers: string[] = [];
  if (existing) blockers.push(`${location(wanted.x, wanted.z)}には${DEFINITIONS[existing.kind].label}があります。Xを押してこの区画をクリックし、撤去してから建ててください。`);
  if (!(state.kits[wanted.kind] ?? 0)) {
    for (const resource of Object.keys(DEFINITIONS[wanted.kind].cost) as Resource[]) {
      const needed = DEFINITIONS[wanted.kind].cost[resource]! - (state.inventory[resource] ?? 0);
      if (needed > 0) blockers.push(`${RESOURCE_NAMES[resource]}があと${needed}個必要です。設備を選択して中身を回収するか、稼働中の工房から素材を集めてください。`);
    }
  }
  if (wanted.kind === 'wire') blockers.push('供給範囲外の設備は停止します。3マス以内に電柱をつなぎ、範囲を確認してください。');
  return result(step, wanted.id, `${label}を${location(wanted.x, wanted.z)}に置く`, wanted.text, checks,
    { kind: wanted.kind, target, direction: wanted.direction, focusId: existing?.id ?? null, mode: 'build', blockers });
}

/** Follow output ports, without advancing or mutating the simulation. */
function automaticFuelConnected(state: GameState): boolean {
  return state.buildings.filter(building => building.kind === 'lumber').some(lumber => {
    const visited = new Set<number>();
    let current: Building | undefined = lumber;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const [dx, dz] = DIRECTIONS[current.direction];
      current = at(state, current.x + dx, current.z + dz);
      if (current?.kind === 'generator') return true;
      if (current?.kind !== 'belt') return false;
    }
    return false;
  });
}

function hasGeneratorConnection(state: GameState, start: Building): boolean {
  return !!powerNetworks(state.buildings).get(start.id)?.generators.length;
}

function runningBlockers(state: GameState): string[] {
  const blockers: string[] = [];
  for (const wanted of FIRST_LINE) {
    const building = at(state, wanted.x, wanted.z);
    if (!building || building.kind !== wanted.kind) continue;
    const label = `${DEFINITIONS[building.kind].label}${location(building.x, building.z)}`;
    if ((building.kind === 'miner' || building.kind === 'smelter') && !hasGeneratorConnection(state, building)) blockers.push(`${label}に魔力が届きません。導線の切れ目をつなぎ直してください。`);
    if (building.kind === 'belt' && building.item && building.beltProgress + 1e-9 >= BELT_SECONDS) blockers.push(`${label}の品が滞留しています。先の設備の向き・入力庫・詰まりを確認し、不要な品は「回収」で取り出してください。`);
    const expectedResource = wanted.id === 'belt-ore' ? 'ore' : wanted.id === 'belt-ingot' ? 'ingot' : null;
    if (expectedResource && building.item && building.item.resource !== expectedResource) blockers.push(`${label}には${RESOURCE_NAMES[building.item.resource]}があります。この経路で運ぶ${RESOURCE_NAMES[expectedResource]}と違うため、「回収」で取り出してください。`);
    if (building.output.length >= OUTPUT_CAPACITY) blockers.push(`${label}の出力庫が満杯です。東向きのベルトと搬送先の詰まりを確認してください。`);
    if (building.kind === 'smelter' && building.input.length >= INPUT_CAPACITY) blockers.push(`${label}の入力庫が満杯です。魔力と出力先を確認してください。`);
  }
  return blockers;
}

/** Stateless guide: derived exclusively from the saveable game state. */
export function evaluateGuide(state: GameState): GuideStep {
  const checks: string[] = [];
  if (state.delivered >= 100 || state.research?.unlocked.includes('crystals')) {
    const objective = getObjective(state);
    return result(TOTAL, 'done', '初回案内を完了：次の工房づくりへ',
      `ここからは自由に建設できます。次の目標：${objective.title}。${objective.detail}`, checks, { mode: 'done' });
  }
  const centralWorkshop = at(state, 12, 16)?.kind === 'miner' && at(state, 14, 16)?.kind === 'smelter' && at(state, 12, 18)?.kind === 'generator';
  if (state.delivered >= 1 && centralWorkshop) {
    for (let index = 0; index < FIRST_LINE.length; index++) {
      const next = placement(state, FIRST_LINE[index], index + 1, checks);
      if (next) return { ...next, title: `工房を復旧：${next.title}`, text: `見本の工房の経路が変わっています。自動納品を続けるため、この区画を直しましょう。${next.text}` };
    }
    checks.push('見本の採掘・精錬・納品経路と導線を確認');
  }
  if (state.delivered < 1) {
    for (let index = 0; index < FIRST_LINE.length; index++) {
      const wanted = FIRST_LINE[index];
      const next = placement(state, wanted, index + 1, checks);
      if (next) return next;
      checks.push(wanted.kind === 'wire' && !at(state, wanted.x, wanted.z) ? '採掘機・製錬炉は供給範囲内。追加の電柱は省略' : `${DEFINITIONS[wanted.kind].label}${location(wanted.x, wanted.z)}を配置済み`);
    }
    const depot = at(state, 16, 16)!;
    if (depot.input.some(item => item.resource === 'ingot')) return result(11, 'ship', '出荷所で最初の延べ棒を出荷する', '設備の詳細を開き、搬入庫・鉄の延べ棒を選んで「確認して出荷」を押してください。依頼10本で結晶加工を研究可能になります。余剰は売上になります。', checks, { kind: 'delivery', focusId: depot.id, target: { x: 16, z: 16 }, mode: 'ship' });
    const generator = at(state, 12, 18)!;
    const fueled = generator.working || generator.input.some(item => item.resource === 'wood') || generator.energy > 0 || (generator.pendingEnergy ?? 0) > 0;
    if (!fueled) return result(10, 'feed', '魔力発生炉へ木材を1個補給する',
      '魔力発生炉を選択し「設備の詳細を開く」へ。所持品の木材スロットを押すと1個を補給できます。木材は10秒で魔力になります。このあと燃料も自動化します。', checks,
      { kind: 'generator', target: { x: 12, z: 18 }, focusId: generator.id, mode: 'feed', blockers: state.inventory.wood < 1 ? ['木材が1個必要です。メニューの「木材を手採取」で補充してください。'] : [] });
    checks.push('魔力発生炉に燃料、稼働中の仕事、または蓄積魔力があります');
    if (generator.working && !(generator.pendingEnergy ?? 0)) {
      const remaining = Math.max(0, Math.ceil(DEFINITIONS.generator.seconds! - generator.progress));
      checks.push(`魔力発生炉は稼働中：魔力生成まであと${remaining}秒（正常な待ち時間）`);
    }
    return result(11, 'run', '最初の延べ棒が届くのを待つ',
      '1×または2×で動かしてください。初回は燃料の10秒、採掘、精錬、搬送の順で進みます。出荷所へ届いたら、詳細で確認して手動出荷します。購入品・初期資材は依頼に数えません。', checks,
      { kind: 'delivery', target: { x: 16, z: 16 }, focusId: at(state, 16, 16)!.id, mode: 'run', blockers: runningBlockers(state) });
  }
  checks.push(`最初の自動納品を確認（${state.delivered}本）`);
  if (automaticFuelConnected(state)) return result(TOTAL, 'done', '案内完了：工房が自動で動きます',
    `木材採取から魔力発生炉への補給がつながりました。ここからは自由に建設してください。次の目標：${getObjective(state).title}。`, checks,
    { mode: 'done', checks: [...checks, '木材採取場→ベルト→魔力発生炉が接続済み'] });
  // A player who already produced an ingot elsewhere keeps their chosen layout.
  if (at(state, 12, 18)?.kind !== 'generator') {
    const lumber = state.buildings.find(building => building.kind === 'lumber');
    return result(lumber ? 13 : 12, lumber ? 'belt-wood-1' : 'lumber', '今の工房へ燃料を自動補給する',
      lumber ? '今の木材採取場から、使用中の魔力発生炉へベルトをつなげてください。配置場所は自由です。最初の工房を見本の位置へ作り直す必要はありません。'
        : '好きな森林へ木材採取場を置き、使用中の魔力発生炉へベルトをつなげましょう。配置場所は自由です。', checks,
      { kind: lumber ? 'belt' : 'lumber', direction: null, focusId: lumber?.id ?? null, mode: 'build' });
  }
  for (let index = 0; index < FUEL_LINE.length; index++) {
    const wanted = FUEL_LINE[index];
    const next = placement(state, wanted, 12 + index, checks);
    if (next) return next;
    checks.push(`${DEFINITIONS[wanted.kind].label}${location(wanted.x, wanted.z)}を配置済み`);
  }
  return result(TOTAL, 'done', '案内完了：ここからは自由に建設',
    `燃料補給の経路も完成しました。ここからは自由に建設してください。次の目標：${getObjective(state).title}。`, checks, { mode: 'done' });
}
