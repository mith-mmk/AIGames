import { DEFINITIONS, GOLEM_RANGE, INPUT_CAPACITY, RECIPES, RESOURCE_NAMES } from './data.js';
import { techNodeStates } from './technology.js';
import type { Building, GameState, Kind, Resource } from './types.js';

export interface GolemGuide {
  step: number; total: number; title: string; detail: string;
  status: 'locked' | 'action' | 'waiting' | 'done';
  action: { type: 'technology' | 'build' | 'inspect' | 'run'; kind?: Kind; id?: number } | null;
  blockers: string[];
}
const TOTAL = 8;
const automatic = (item: { automated: boolean; handled?: boolean }): boolean => item.automated && !item.handled;
const near = (relay: Building, building: Building): boolean => Math.abs(relay.x - building.x) + Math.abs(relay.z - building.z) <= GOLEM_RANGE;
const inspect = (building: Building): GolemGuide['action'] => ({ type: 'inspect', kind: building.kind, id: building.id });
function guide(step: number, title: string, detail: string, status: GolemGuide['status'], action: GolemGuide['action'], blockers: string[] = []): GolemGuide {
  return { step, total: TOTAL, title, detail, status, action, blockers };
}
function production(state: GameState, kind: Kind, step: number, detail: string): GolemGuide {
  const facility = state.buildings.find(building => building.kind === kind);
  if (!facility) return guide(step, `${DEFINITIONS[kind].label}を建てる`, detail, 'action', { type: 'build', kind });
  const recipe = RECIPES[facility.recipe ?? DEFINITIONS[kind].recipes![0]];
  const missing = Object.entries(recipe.input).flatMap(([resource, count]) => {
    const stored = [...facility.input, ...(facility.reserved ?? [])].filter(item => item.resource === resource).length;
    return stored < count! ? [`${RESOURCE_NAMES[resource as Resource]} あと${count! - stored}個`] : [];
  });
  if (facility.working) return guide(step, `${DEFINITIONS[kind].label}の生産を待つ`, `${detail} 現在は生産中です。作り直す必要はありません。1×または2×で進めてください。`, 'waiting', { type: 'run', id: facility.id, kind });
  const blockers = [...missing, ...(facility.status ? [facility.status] : [])];
  return guide(step, `${DEFINITIONS[kind].label}へ素材と魔力をつなぐ`, `${detail} ${Object.entries(recipe.input).map(([resource, amount]) => `${RESOURCE_NAMES[resource as Resource]}${amount}個`).join('＋')}と魔力${recipe.energy}が必要です。出力庫が満杯なら搬送先を用意してください。`, 'action', inspect(facility), blockers);
}

/** Diagnose the player's existing workshop without modifying save data or requiring the sample layout. */
export function getGolemGuide(state: GameState): GolemGuide {
  const nodes = techNodeStates(state);
  const runes = nodes.find(node => node.id === 'runecraft')!;
  const golems = nodes.find(node => node.id === 'golemcraft')!;
  const completed = state.stats?.golemFuelTransfers ?? 0;
  if (completed >= 20 || state.research?.unlocked.includes('sanctuary')) {
    const sanctuary = nodes.find(node => node.id === 'sanctuary')!;
    const remaining = sanctuary.requirements.filter(requirement => !requirement.met).map(requirement => `${requirement.label} ${requirement.current}/${requirement.target}`).join('・');
    return guide(8, 'ゴーレムの自動補給を確認しました',
      `木材の自動補給 ${completed}/20個。ゴーレムは収納箱にある品を運び、品を新しく作りません。${remaining ? `「ゴーレム工房の自動運営」の残り条件: ${remaining}。` : '技術ツリーの「ゴーレム工房の自動運営」を研究すると、錬金術へ進めます。'}`, 'done', { type: 'technology' });
  }
  if (runes.status !== 'unlocked') return guide(1, runes.status === 'available' ? 'ルーン加工と機体製作を研究する' : '魔導剣の量産技術を解放する',
    '技術ツリーで前提技術と実績を確認してください。ルーン加工の研究で刻印台と躯体工房が使えます。', runes.status === 'available' ? 'action' : 'locked', { type: 'technology' }, runes.status === 'available' ? [] : [runes.reason]);
  if (golems.status !== 'unlocked') {
    if (golems.status === 'available') return guide(2, 'ゴーレム組立と物流補助を研究する', '魔導核3個と鉄の躯体3個の自動生産を確認しました。技術ツリーで研究し、覚醒炉とゴーレム補給所を解放してください。', 'action', { type: 'technology' });
    if ((state.stats?.produced.runeCore ?? 0) < 3) return production(state, 'runeCarver', 2, `魔導核を自動生産 ${state.stats?.produced.runeCore ?? 0}/3個。精製魔晶と鉄の延べ棒を自動搬送してください。`);
    return production(state, 'frameForge', 2, `鉄の躯体を自動生産 ${state.stats?.produced.golemFrame ?? 0}/3個。鉄の延べ棒と木材を自動搬送してください。`);
  }
  const relays = state.buildings.filter(building => building.kind === 'golemRelay');
  const score = (relay: Building): number => (relay.golemWorker ? 100 : relay.input.some(item => item.resource === 'golem') ? 50 : 0) +
    state.buildings.filter(building => near(relay, building) && (building.kind === 'storage' || building.kind === 'generator')).length;
  const relay = [...relays].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
  const deployed = relay?.golemWorker || relay?.input.some(item => item.resource === 'golem');
  const physicalGolem = (state.inventory.golem ?? 0) > 0 || state.buildings.some(building => [...building.input, ...building.output, ...(building.item ? [building.item] : [])].some(item => item.resource === 'golem'));
  if (!deployed && !physicalGolem) return production(state, 'golemForge', 3, '覚醒炉で魔導核1個＋鉄の躯体1個からゴーレムを作ります。完成したゴーレム1体を補給所で働かせます。');
  if (!relay) return guide(4, 'ゴーレム補給所を建てる', '収納箱と魔力炉の両方からマンハッタン距離6区画以内になる位置へ建ててください。横と縦の距離の合計で判定し、導線は不要です。', 'action', { type: 'build', kind: 'golemRelay' });
  if (!relay.golemWorker) {
    if (relay.input.some(item => item.resource === 'golem')) return guide(5, '投入したゴーレムの配属を待つ', 'ゴーレムは補給所の入力庫に到着しています。1×または2×にすると作業員へ配属されます。再投入は不要です。', 'waiting', { type: 'run', id: relay.id, kind: relay.kind });
    return guide(5, '補給所へゴーレムを1体投入する', '覚醒炉の出力からベルトで補給所へ運ぶか、ゴーレムを回収して所持品に入れ、補給所の詳細にあるゴーレムの投入操作を使ってください。手動配置した作業員も既存の品を運べます。', 'action', inspect(relay));
  }
  const storages = state.buildings.filter(building => building.kind === 'storage');
  const sources = storages.filter(building => near(relay, building));
  if (!sources.length) return guide(6, '補給所の近くに収納箱を置く', '補給所は収納箱から品を取り出します。収納箱を補給所からマンハッタン距離6区画以内へ置き、木材採取場から木材をベルトで入れてください。', 'action', { type: 'build', kind: 'storage' }, [storages.length ? '収納箱が補給所の範囲外です。横＋縦の距離を6以内にしてください。' : '収納箱がありません。納品箱からは取り出せません。']);
  if (relay.golemPolicy === 'materials') return guide(7, '補給所の方針を「燃料」にする', '補給所の詳細で方針を「燃料」にします。「素材」は製造設備への材料搬送用です。今回の木材20個補給実績には、燃料方針で魔力炉へ運んだ自動生産の木材が必要です。', 'action', inspect(relay), ['現在は素材方針のため、燃料の補給実績が増えません。']);
  const generators = state.buildings.filter(building => building.kind === 'generator');
  const targets = generators.filter(building => near(relay, building));
  if (!targets.length) return guide(7, '燃料の届け先を範囲6以内に用意する', '魔力炉と収納箱の両方を補給所から横＋縦6区画以内に置きます。方針は「燃料」にしてください。', 'action', { type: 'build', kind: 'generator' }, [generators.length ? '魔力炉が補給所の範囲外です。' : '補給先の魔力炉がありません。']);
  if (!sources.some(source => source.input.some(item => item.resource === 'wood' && automatic(item)))) {
    const manualWood = sources.some(source => source.input.some(item => item.resource === 'wood'));
    return guide(6, '収納箱へ自動生産の木材を入れる', '木材採取場→ベルト→収納箱をつなぎます。補給所が取り出せるのは収納箱の入力庫です。手採取・回収・手動投入した木材は運べますが、自動補給実績に数えません。', 'action', inspect(sources[0]), [manualWood ? '木材はありますが、手動由来のため実績に加算されません。木材採取場から直接運んでください。' : '収納箱に自動生産の木材がありません。']);
  }
  if (targets.every(target => target.input.length >= INPUT_CAPACITY)) return guide(8, '魔力炉の燃料消費を待つ', '魔力炉の入力庫が満杯です。工房を稼働して燃料を消費すると補給が再開します。補給所・ゴーレム・収納箱を作り直す必要はありません。', 'waiting', inspect(targets[0]), ['搬送先の入力庫が満杯です。魔力を使う設備と導線も確認してください。']);
  return guide(8, 'ゴーレムの木材自動補給を確認する', `接続と作業員を確認しました。1×または2×で稼働してください。補給はゲーム内1秒に最大1個、現在 ${completed}/20個です。魔力は運びません。`, 'waiting', { type: 'run', id: relay.id, kind: relay.kind });
}
