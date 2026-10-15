import { BELT_SECONDS, DEFINITIONS, RECIPES, RESOURCE_NAMES } from './data.js';
import { techNodeStates, currentSwordRate, TECHNOLOGIES, isKindUnlocked, isRecipeUnlocked } from './technology.js';
import { resourceIcon } from './icons.js';
import { getObjective } from './objectives.js';
import { hasBufferRoom } from './logistics-visuals.js';
import type { GuideStep } from './onboarding.js';
import type { Direction, GameState, Kind, Resource, TechId, RecipeId, Building } from './types.js';

export interface UICallbacks {
  onBuild(kind: Kind): void; onSpeed(speed: 0 | 1 | 2): void;
  onSave(): void; onLoad(): void; onRotate(): void; onRemove(): void;
  onFeed(resource: Resource, amount: number): void; onCollect(resource?: Resource, amount?: number): void;
  onCancel(): void; onResetCamera(): void; onNew(): void;
  onGuideAction(): void; onGuideToggle(show?: boolean): void;
  onGatherWood(): void; onRelayPolicy(policy: 'fuel' | 'materials'): void;
  onTechnologyToggle(show?: boolean): void; onResearch(id: TechId): void; onTrack(id: TechId | null): void; onRecipe(recipe: RecipeId): void;
}
export interface UIState {
  kind: Kind | null; direction: Direction; selectedId: number | null; speed: 0 | 1 | 2;
  power: { stored: number; capacity: number }; message: string; hover?: { x: number; z: number } | null; guide?: GuideStep | null; technologyOpen?: boolean;
}
const RESOURCE_LABELS = RESOURCE_NAMES;
const RESOURCES = Object.keys(RESOURCE_LABELS) as Resource[];
const TECH_IDS: TechId[] = TECHNOLOGIES.map(node => node.id);
const TECH_LABELS = Object.fromEntries(TECHNOLOGIES.map(node => [node.id, node.label])) as Record<TechId, string>;
const DIRECTIONS = ['北 ↑', '東 →', '南 ↓', '西 ←'];
const BUILDINGS = Object.keys(DEFINITIONS) as Kind[];
const ICONS: Record<Kind, string> = { miner: '⚒', belt: '→', smelter: '♨', generator: '✦', wire: '⌁', lumber: '♣', delivery: '▣', splitter: '⑂', storage: '▤', crystalMiner: '◇', crystalRefiner: '◈', assembler: '⚔', runeCarver: '✧', frameForge: '□', golemForge: '♟', golemRelay: '⇄' };
const DESCRIPTIONS: Record<Kind, string> = {
  miner: '鉱脈の上に設置。魔力2で鉄鉱石1を2秒で採掘。矢印へ排出。',
  belt: '矢印の先へ1個ずつ搬送。1区画0.5秒。ドラッグで連続配置。',
  smelter: '鉄鉱石2と魔力5で鉄延べ棒1を4秒で精錬。入力は隣接、出力は矢印。',
  generator: '木材1から魔力30を10秒で生成。蓄積上限30。隣接する導線へ供給。',
  wire: '隣り合う導線・魔力炉・採掘機・魔導炉を魔力網で接続。',
  lumber: '森林の上に設置。木材1を3秒で採取。矢印へ排出。',
  delivery: '鉄の延べ棒・魔導剣を受け取る納品専用の箱。自動生産し自動搬送された品だけ目標に加算。収納・取り出しはできません。',
  splitter: '前方と右側（時計回り90°）の2つの出力口へ交互に分岐。片方が詰まると空いた口へ送ります。',
  storage: '32品まで保管する収納箱。納品はしません。受け取った品を前方へ順に排出。取り出した品は手動扱いとなり自動納品に数えません。',
  crystalMiner: '結晶鉱脈の上に設置。魔力2で魔晶原石1を2秒で採掘。',
  crystalRefiner: '魔晶原石を精製魔晶へ精製。魔力導線で供給し、レシピの素材を隣接設備から入力します。',
  assembler: '鉄の延べ棒と精製魔晶を魔導剣へ組み立てる設備。入力は隣接、完成品は矢印へ出力。',
  runeCarver: '素材に魔導の印を刻み、魔導核を生産します。魔力導線でつなぎ、レシピを確認してください。',
  frameForge: '鉄の延べ棒から鉄の躯体を組み上げます。素材と魔力を供給してください。',
  golemForge: '鉄の躯体と魔導核からゴーレムを覚醒させます。完成したゴーレムを補給所へ搬送してください。',
  golemRelay: 'ゴーレムを配置すると、半径6区画の収納箱から設備へ補給します。燃料補給か材料補給を選べます。',
};

const CATEGORIES: Record<string, { label: string; kinds: Kind[] }> = {
  extraction: { label: '採取', kinds: ['miner', 'lumber', 'crystalMiner'] },
  logistics: { label: '物流', kinds: ['belt', 'splitter', 'storage', 'delivery', 'golemRelay'] },
  magic: { label: '魔力', kinds: ['generator', 'wire'] },
  production: { label: '製造', kinds: ['smelter', 'crystalRefiner', 'assembler', 'runeCarver', 'frameForge', 'golemForge'] },
};
const PREFS_KEY = 'aigames-workshop-ui-v1';

export class GameUI {
  private quickSlots: Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'storage'];
  private category = 'extraction';
  private registerSlot = 0;
  private transferMode: 'one' | 'all' = 'one';
  private currentState: GameState | null = null;
  private currentSelected: Building | null = null;
  private readonly transferButtons = new Map<string, HTMLButtonElement>();
  private readonly controller = new AbortController();
  private readonly buildButtons = new Map<Kind, HTMLButtonElement>();
  private readonly speedButtons = new Map<number, HTMLButtonElement>();
  private readonly resourceNodes = new Map<Resource, HTMLElement>();
  private tracked: TechId | null = null;
  private readonly technologyNodes = new Map<TechId, HTMLElement>();
  private readonly root: HTMLElement;
  private readonly callbacks: UICallbacks;
  private lastSelected: number | null = null;
  private previousGuideMode: GuideStep['mode'] | null = null;
  private guideLists = '';
  private lastMessage = '';

  constructor(root: HTMLElement, callbacks: UICallbacks) {
    this.root = root; this.callbacks = callbacks; this.loadPreferences();
    root.innerHTML = `
      <header class="workshop-top">
        <a class="home-link" href="index.html" aria-label="AI Gamesへ戻る">‹ AI Games</a>
        <div class="workshop-title">魔導からくり工房<span id="objective-summary"><b id="objective-title"></b> <b id="objective-count"></b></span><span class="legacy-goal" title="鉄の延べ棒の累積自動納品"><i class="ingot-icon" aria-hidden="true"></i> 鉄の延べ棒 自動納品 <b id="delivered-count">0</b> / 100 <small class="goal-condition">自動生産→自動搬送品のみ</small></span></div>
        <div class="resource-strip" aria-label="所持資源"><span title="所持 木材">木材 <b data-resource="wood">0</b></span><span title="所持 鉄鉱石">鉱石 <b data-resource="ore">0</b></span><span title="所持 鉄の延べ棒">延べ棒 <b data-resource="ingot">0</b></span><span title="所持 精製魔晶原石">原石 <b data-resource="rawCrystal">0</b></span><span title="所持 精製魔晶">魔晶 <b data-resource="crystal">0</b></span><span title="所持 魔導剣">魔導剣 <b data-resource="sword">0</b></span><span>魔力 <b id="power-count">0 / 0</b></span></div><button data-action="technology-open" class="technology-open">技術ツリー</button>
        <div class="time-controls" aria-label="時間速度"><button data-speed="0" aria-label="一時停止" title="一時停止（Space）">Ⅱ</button><button data-speed="1" aria-label="1倍速">1×</button><button data-speed="2" aria-label="2倍速">2×</button></div>
        <details class="game-menu"><summary aria-label="操作と保存メニュー">☰ <span>メニュー</span></summary><div class="menu-body"><button data-action="menu-close" class="menu-close">メニューを閉じる ×</button><div class="menu-actions"><button data-action="save">保存</button><button data-action="load">読込</button><button data-action="camera">視点を戻す</button><button data-action="new">新しい工房</button><button data-action="gather-wood" title="森林から木材1個を手採取。生産実績には算入しません。">木材を手採取</button><button data-action="guide-open">はじめての案内</button><button data-action="build-open">建設一覧を表示</button><button data-action="selection-open">設備詳細を表示</button><button data-action="help-close">操作説明を閉じる</button></div><details id="main-help"><summary>操作方法・つくり方</summary><div class="help-text"><p>鉱脈に採掘機 → ベルト → 魔導炉 → ベルト → 納品箱をつなごう。魔力炉と機械は魔力導線で接続。魔力炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 魔導炉 (14,16) → ベルト (15,16) → 納品箱 (16,16)。全て東向き。<br>魔力炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>左クリック: 配置 / 選択<br>ベルト選択中に左ドラッグ: 連続敷設<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去、Esc: 建設取消<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>納品箱は鉄の延べ棒と魔導剣を受け入れます。採掘から加工・搬送まで自動でつないだ品だけを実績へ数えます。手で取り出し・再投入した品は算入しません。魔力切れは木材の手動補給で復旧できます。木材が0なら、メニューの「木材を手採取」で1個ずつ採れます。保存はこのブラウザの1スロットです。</p><button data-action="help-close">操作説明を閉じる ×</button></div></details></div></details>
      </header>
      <button id="tracked-goal" class="tracked-goal" data-action="technology-open" hidden></button>
      <section id="technology-panel" class="technology-panel" hidden aria-label="技術ツリー">
        <div class="technology-heading"><div><h2>技術ツリー</h2><p>自動生産の実績で解放。研究に素材の支払いは不要です。</p></div><button data-action="technology-close">閉じる ×</button></div>
        <p class="technology-path">基礎工房 → 物流 ＋ 魔晶 → 組立 → 工房の達人 → 刻印 → ゴーレム → 自律工房</p><p id="sword-rate"></p>
        <div class="technology-map"></div><p class="future-tech">自律工房: ゴーレムが収納箱から木材を取り、魔力炉へ20回自動補給します。</p>
      </section>
      <aside id="guide-card" class="guide-card" hidden aria-label="はじめての工房づくり">
        <div class="guide-heading"><span id="guide-objective">鉄100本を自動納品しよう</span><button data-action="guide-close" aria-label="案内を閉じる">案内を閉じる</button></div>
        <div id="guide-progress" class="guide-progress"></div><h2 id="guide-title"></h2><button data-action="guide-action" class="guide-action">この設備を選ぶ</button><p id="guide-text"></p>
        <p id="guide-step-target" class="guide-target"></p><p id="guide-instruction"></p>
        <ul id="guide-blockers" class="guide-blockers"></ul><details id="guide-check-details"><summary id="guide-check-summary">組立チェック</summary><ul id="guide-checks" class="guide-checks"></ul></details><p id="guide-feedback" class="guide-feedback" role="status" aria-live="polite" hidden></p><small class="guide-next">条件を満たすと、次の案内へ進みます。</small>
      </aside>
      <div class="workshop-notices"><p id="game-message" role="status" aria-live="polite">鉱脈に採掘機を建て、工房を動かそう。</p><p id="victory-message" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>
      <aside id="selection-panel" class="selection-panel" hidden aria-label="設備の詳細">
        <button class="panel-close" data-action="close-panel" aria-label="設備詳細を閉じる">×</button><h2 id="selection-title"></h2><p id="selection-description"></p>
        <div id="facility-feed-slots" class="facility-feed-slots"></div><div id="relay-controls" hidden><p id="relay-worker"></p><div class="relay-policies"><button data-relay-policy="fuel">♣ 燃料補給</button><button data-relay-policy="materials">◇ 材料補給</button></div><p id="relay-transfers"></p><small>収納箱と補給先は半径6区画。燃料補給20回で自律工房の実績を達成。</small></div><div id="delivery-summary" hidden></div><div id="recipe-controls" hidden><label>生産レシピ<select id="recipe-select"></select></label><p id="recipe-lock-reason"></p></div><div id="storage-controls" hidden><p id="storage-capacity"></p><div class="transfer-toolbar"><span>移動する個数</span><button data-transfer-mode="one" aria-pressed="true">1個</button><button data-transfer-mode="all" aria-pressed="false">全量</button></div><div class="chest-transfer"><section><h3>手持ち <span>→</span></h3><div id="inventory-slots" class="item-slots"></div><button data-action="deposit-all">まとめて預ける</button></section><section><h3>収納箱 <span>←</span></h3><div id="chest-slots" class="item-slots"></div><button data-action="withdraw-all">まとめて取り出す</button></section></div><p class="transfer-hint">クリックで1個、Shift＋クリックで全量。キーボードのEnterでも移動できます。取り出した品は手動扱いになります。</p><details id="advanced-collect"><summary>品目と個数を指定</summary><ul id="storage-items"></ul><label>取り出す品<select id="collect-resource"></select></label><label>個数<input id="collect-amount" type="number" min="1" max="32" value="1" step="1"></label><button data-action="collect-count">選んだ品を取り出す</button></details></div><dl><div><dt>稼働状態</dt><dd id="selection-status"></dd></div><div><dt>入出力・方向</dt><dd id="selection-direction"></dd></div><div><dt>内部の資源</dt><dd id="selection-buffer"></dd></div><div><dt>作業進捗</dt><dd id="selection-progress"></dd></div><div><dt>蓄積魔力</dt><dd id="selection-power"></dd></div></dl>
        <div class="selection-actions"><button data-action="rotate">回転 R</button><button data-action="collect">資源を回収</button><button data-action="remove" class="danger">撤去</button></div>
        <details id="advanced-feed"><summary>個数を指定して補給</summary><form id="feed-form"><label>手動補給<select id="feed-resource"><option value="wood">木材</option><option value="ore">鉄鉱石</option><option value="ingot">鉄の延べ棒</option><option value="rawCrystal">魔晶原石</option><option value="crystal">精製魔晶</option><option value="sword">魔導剣</option></select></label><label>個数<input id="feed-amount" type="number" min="1" max="1000" step="1" value="1" inputmode="numeric"></label><button type="submit" data-action="feed">補給する</button><small>手動の鉱石・延べ棒・精製魔晶等は目標に含めません。木材燃料は手動補給できます。</small></form></details>
      </aside>
      <nav id="quickbar" class="quickbar" aria-label="登録した建設設備"><button id="build-reopen" data-action="build-open">建設一覧</button><div id="quick-slots"></div><button data-action="rotate" aria-label="建設方向を回転">↻</button><button data-action="cancel" aria-label="建設を取り消す">×</button></nav>
      <footer class="build-dock" hidden><div class="build-context"><span id="build-context">建設する設備を選ぶ</span><button data-action="rotate" aria-label="建設方向を回転">↻ R</button><button data-action="cancel">取消 Esc</button><button data-action="build-close" aria-label="建設一覧を閉じる">閉じる ×</button></div><nav id="build-categories" aria-label="設備のカテゴリー"></nav><p class="registration-hint">☆で選んだ番号に登録 <select id="registration-slot" aria-label="登録先クイックスロット"></select> · キー1〜6で選択</p><nav class="build-palette" aria-label="建設する設備"></nav></footer>`;
    const palette = this.node('.build-palette');
    for (const kind of BUILDINGS) {
      const definition = DEFINITIONS[kind];
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.build = kind; button.setAttribute('aria-pressed', 'false');
      const cost = this.costLabel(kind);
      button.title = `${definition.label} — ${DESCRIPTIONS[kind]} 建設費: ${cost}`;
      const icon = document.createElement('span'); icon.className = 'build-icon'; icon.textContent = ICONS[kind]; icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'build-name'; name.textContent = definition.label;
      const amount = document.createElement('small'); amount.className = 'build-cost'; amount.textContent = cost;
      button.append(icon, name, amount);
      const tile = document.createElement('div'); tile.className = 'build-tile'; tile.dataset.buildTile = kind;
      const star = document.createElement('button'); star.type = 'button'; star.className = 'register-build'; star.dataset.register = kind; star.textContent = '☆'; star.setAttribute('aria-label', `${definition.label}をクイックスロットへ登録`);
      tile.append(button, star); palette.append(tile); this.buildButtons.set(kind, button);
    }
    const resourceStrip = this.node('.resource-strip');
    const powerLabel = this.node('#power-count').parentElement!; resourceStrip.replaceChildren();
    for (const resource of RESOURCES) {
      const label = document.createElement('span'); label.title = `所持 ${RESOURCE_LABELS[resource]}`;
      const short = resource === 'ingot' ? '延べ棒' : resource === 'rawCrystal' ? '原石' : resource === 'crystal' ? '魔晶' : RESOURCE_LABELS[resource];
      label.append(document.createTextNode(short + ' ')); const count = document.createElement('b'); count.dataset.resource = resource; count.textContent = '0'; label.append(count); resourceStrip.append(label);
    }
    resourceStrip.append(powerLabel);
    for (const resource of RESOURCES) this.resourceNodes.set(resource, this.node(`[data-resource="${resource}"]`));
    this.createTechnologyNodes(); this.createPresentationControls();
    this.node('#feed-resource').replaceChildren();
    for (const resource of RESOURCES) { const option = document.createElement('option'); option.value = resource; option.textContent = RESOURCE_LABELS[resource]; this.node('#feed-resource').append(option); }
    for (const resource of RESOURCES) {
      const option = document.createElement('option'); option.value = resource; option.textContent = RESOURCE_LABELS[resource]; this.node('#collect-resource').append(option);
    }
    root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => this.speedButtons.set(Number(button.dataset.speed), button));
    bindUIEvents(this, root, this.controller.signal);
  }

  private node(selector: string): HTMLElement {
    const node = this.root.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`UI要素がありません: ${selector}`);
    return node;
  }
  private text(selector: string, value: string): void {
    const node = this.node(selector); if (node.textContent !== value) node.textContent = value;
  }
  private costLabel(kind: Kind): string {
    const parts = Object.entries(DEFINITIONS[kind].cost).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]}${amount}`);
    return parts.length ? parts.join('・') : '無料';
  }
  handleClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || !this.root.contains(button)) return;
    if (button.dataset.quick) { this.chooseQuickSlot(Number(button.dataset.quick)); return; }
    if (button.dataset.register) { this.quickSlots[this.registerSlot] = button.dataset.register as Kind; this.savePreferences(); this.refreshQuickSlots(); return; }
    if (button.dataset.category) { this.category = button.dataset.category; this.savePreferences(); this.filterPalette(); return; }
    if (button.dataset.transferMode) { this.transferMode = button.dataset.transferMode as 'one' | 'all'; this.savePreferences(); this.refreshTransferMode(); return; }
    if (button.dataset.transfer) { this.transferItem(button.dataset.resource as Resource, button.dataset.transfer === 'deposit', event instanceof MouseEvent && event.shiftKey); return; }
    if (button.dataset.feedResource) { this.feedOne(button.dataset.feedResource as Resource); return; }
    if (button.dataset.relayPolicy) { this.callbacks.onRelayPolicy(button.dataset.relayPolicy as 'fuel' | 'materials'); return; }
    if (button.dataset.research) { this.callbacks.onResearch(button.dataset.research as TechId); return; }
    if (button.dataset.track) { this.callbacks.onTrack(button.dataset.track === this.tracked ? null : button.dataset.track as TechId); return; }
    if (button.dataset.build) { this.node('.build-dock').hidden = true; this.callbacks.onBuild(button.dataset.build as Kind); return; }
    if (button.dataset.speed) { this.callbacks.onSpeed(Number(button.dataset.speed) as 0 | 1 | 2); return; }
    const action = button.dataset.action;
    if (action === 'save') this.callbacks.onSave();
    else if (action === 'load') this.callbacks.onLoad();
    else if (action === 'new') this.callbacks.onNew();
    else if (action === 'technology-open' || action === 'technology-close') { this.callbacks.onTechnologyToggle(action === 'technology-open'); (this.node('.game-menu') as HTMLDetailsElement).open = false; }
    else if (action === 'gather-wood') this.callbacks.onGatherWood();
    else if (action === 'menu-close') (this.node('.game-menu') as HTMLDetailsElement).open = false;
    else if (action === 'help-close') (this.node('#main-help') as HTMLDetailsElement).open = false;
    else if (action === 'build-open' || action === 'build-close') { this.node('.build-dock').hidden = action === 'build-close'; this.node('#build-reopen').setAttribute('aria-expanded', String(action === 'build-open')); if (action === 'build-close') this.callbacks.onCancel(); }
    else if (action === 'selection-open') { const panel = this.node('#selection-panel'); if (this.lastSelected !== null) { panel.hidden = false; panel.classList.remove('is-collapsed'); const close = this.node('[data-action="close-panel"]'); close.textContent = '×'; close.setAttribute('aria-label', '設備詳細を閉じる'); } }
    else if (action === 'deposit-all') this.depositAll();
    else if (action === 'withdraw-all') this.callbacks.onCollect();
    else if (action === 'collect-count') { const resource = (this.node('#collect-resource') as HTMLSelectElement).value as Resource; const amount = Number((this.node('#collect-amount') as HTMLInputElement).value); if (Number.isSafeInteger(amount) && amount > 0 && amount <= 32) this.callbacks.onCollect(resource, amount); }
    else if (action === 'camera') this.callbacks.onResetCamera();
    else if (action === 'rotate') this.callbacks.onRotate();
    else if (action === 'remove') this.callbacks.onRemove();
    else if (action === 'collect') this.callbacks.onCollect();
    else if (action === 'cancel') this.callbacks.onCancel();
    else if (action === 'guide-action') {
      const mode = this.node('#guide-card').dataset.guideMode;
      if (mode === 'rotate' || mode === 'feed') {
        this.node('#selection-panel').classList.remove('is-collapsed');
        const close = this.node('[data-action="close-panel"]'); close.textContent = '×'; close.setAttribute('aria-label', '設備詳細を閉じる');
      }
      this.callbacks.onGuideAction();
    }
    else if (action === 'guide-open' || action === 'guide-close') {
      this.callbacks.onGuideToggle(action === 'guide-open');
      if (action === 'guide-open') (this.node('.game-menu') as HTMLDetailsElement).open = false;
    }
    else if (action === 'close-panel') {
      const collapsed = this.node('#selection-panel').classList.toggle('is-collapsed');
      button.textContent = collapsed ? '+' : '×';
      button.setAttribute('aria-label', collapsed ? '設備詳細を開く' : '設備詳細を閉じる');
      this.root.classList.toggle('expanded-selection', !collapsed);
    }
  }
  handleFeed(event: Event): void {
    event.preventDefault();
    const resource = (this.node('#feed-resource') as HTMLSelectElement).value as Resource;
    const amount = Number((this.node('#feed-amount') as HTMLInputElement).value);
    if (Number.isSafeInteger(amount) && amount > 0 && amount <= 1000) this.callbacks.onFeed(resource, amount);
  }

  private updateGuide(guide: GuideStep | null): void {
    const card = this.node('#guide-card'); card.hidden = !guide;
    this.root.classList.toggle('guide-open', !!guide);
    this.node('#game-message').hidden = !!guide;
    if (!guide) return;
    card.dataset.guideId = guide.id; card.dataset.guideMode = guide.mode;
    this.text('#guide-progress', `${guide.step} / ${guide.total} · はじめての工房づくり`);
    this.text('#guide-title', guide.title); this.text('#guide-text', guide.text);
    const target = [guide.kind ? DEFINITIONS[guide.kind].label : '', guide.direction !== null ? `出力 ${DIRECTIONS[guide.direction]}` : '', guide.target ? `目印 (${guide.target.x}, ${guide.target.z})` : ''].filter(Boolean).join(' · ');
    this.text('#guide-step-target', target); this.node('#guide-step-target').hidden = !target;
    const labels = { build: 'この設備を選ぶ', rotate: '設備の詳細を開く', feed: '設備の詳細を開く', run: '1×で動かす', done: '自由建設へ' };
    this.text('[data-action="guide-action"]', labels[guide.mode]);
    const instructions = {
      build: guide.target ? '「この設備を選ぶ」を押し、地図の光る目印をクリック。設備は自分で置きます。' : '「この設備を選ぶ」を押し、つなぎたい区画をクリックしてください。',
      rotate: '「設備の詳細を開く」→「回転 R」で向きを変更してください。',
      feed: '「設備の詳細を開く」→木材のアイコン「木材 ×1」を押すと、燃料を1個補給できます。',
      run: '「1×で動かす」を押して、採掘・搬送・精錬が進むのを見てみましょう。',
      done: '「自由建設へ」で案内を閉じられます。メニューからいつでも再表示できます。',
    };
    this.text('#guide-instruction', instructions[guide.mode]);
    this.node('#guide-check-details').hidden = !guide.checks.length;
    this.text('#guide-check-summary', `済 ${guide.checks.length}段階 · 直近の組立チェック`);
    this.node('.guide-next').hidden = guide.mode === 'done';
    const lists = JSON.stringify([guide.blockers, guide.checks]);
    if (lists !== this.guideLists) {
      for (const [selector, values, prefix] of [['#guide-blockers', guide.blockers, '確認: '], ['#guide-checks', guide.checks.slice(-2), '✓ ']] as const) {
        const node = this.node(selector); node.replaceChildren(); node.hidden = !values.length;
        for (const value of values) { const li = document.createElement('li'); li.textContent = prefix + value; node.append(li); }
      }
      this.guideLists = lists;
    }
  }

  update(state: GameState, view: UIState): void {
    this.currentState = state; this.currentSelected = state.buildings.find(building => building.id === view.selectedId) ?? null;
    const objective = getObjective(state);
    this.text('#objective-title', objective.title); this.text('#objective-count', `${objective.current} / ${objective.target}`); this.text('#guide-objective', objective.title);
    this.node('#objective-summary').title = objective.detail;
    this.updateQuickSlots(state, view.kind);
    this.updateGuide(view.guide ?? null);
    this.updateTechnology(state, !!view.technologyOpen);
    const feedback = !!view.guide && /保存|読込|読み込|再開しました|WebGL|表示でき|できません|不正|素材を補給しました|手採取/.test(view.message);
    this.node('#guide-feedback').hidden = !feedback;
    if (feedback) this.text('#guide-feedback', view.message);
    for (const resource of RESOURCES) {
      const node = this.resourceNodes.get(resource)!; const value = String(state.inventory[resource] ?? 0);
      if (node.textContent !== value) node.textContent = value;
      node.parentElement!.hidden = !(state.inventory[resource] ?? 0) && !['wood', 'ore', 'ingot'].includes(resource);
    }
    this.text('#power-count', `${Math.floor(view.power.stored)} / ${view.power.capacity}`);
    this.text('#delivered-count', String(state.delivered));
    this.node('#victory-message').hidden = !objective.completed;
    if (objective.completed) this.text('#victory-message', `${objective.title} — ${objective.detail}`);
    if (view.message && view.message !== this.lastMessage) { this.text('#game-message', view.message); this.lastMessage = view.message; }
    for (const [speed, button] of this.speedButtons) button.setAttribute('aria-pressed', String(speed === view.speed));
    for (const [kind, button] of this.buildButtons) {
      button.setAttribute('aria-pressed', String(kind === view.kind));
      const kits = state.kits[kind] ?? 0;
      const cost = button.querySelector('.build-cost')!; const label = kits > 0 ? `所持 ${kits}台 / ${this.costLabel(kind)}` : this.costLabel(kind);
      if (cost.textContent !== label) cost.textContent = label;
      const affordable = kits > 0 || Object.entries(DEFINITIONS[kind].cost).every(([resource, amount]) => (state.inventory[resource as Resource] ?? 0) >= amount!);
      const unlocked = isKindUnlocked(state, kind);
      button.classList.toggle('unaffordable', !affordable); button.classList.toggle('tech-locked', !unlocked);
      const requirement = DEFINITIONS[kind].technology;
      button.title = `${DESCRIPTIONS[kind]} 建設費: ${this.costLabel(kind)}${!unlocked && requirement ? ` · 未解放: ${TECH_LABELS[requirement]}の研究が必要。技術ツリーで条件を確認。` : ''}`;
      if (!unlocked && requirement) cost.textContent = `未解放 · ${TECH_LABELS[requirement]}`;
      button.setAttribute('aria-label', `${DEFINITIONS[kind].label}、${label}${unlocked ? '' : '、技術未解放'}${affordable ? '' : '、資源不足'}`);
    }
    this.text('#build-context', `${view.kind ? `${DEFINITIONS[view.kind].label} · 出力 ${DIRECTIONS[view.direction]}` : '設備を選んで建設'}${view.hover ? ` · (${view.hover.x}, ${view.hover.z})` : ''}`);
    const selected = state.buildings.find(building => building.id === view.selectedId);
    const panel = this.node('#selection-panel');
    this.root.classList.toggle('has-selection', !!selected);
    if (!selected) panel.hidden = true;
    else {
      if (view.selectedId !== this.lastSelected) {
        panel.hidden = false; panel.classList.remove('is-collapsed');
        const close = this.node('[data-action="close-panel"]'); close.textContent = '×'; close.setAttribute('aria-label', '設備詳細を閉じる');
        const select = this.node('#feed-resource') as HTMLSelectElement;
        (this.node('#advanced-feed') as HTMLDetailsElement).open = selected.kind === 'generator';
        select.value = selected.kind === 'generator' ? 'wood' : selected.kind === 'smelter' ? 'ore' : selected.kind === 'crystalRefiner' ? 'rawCrystal' : selected.kind === 'golemRelay' ? 'golem' : 'ingot';
      }
      this.text('#selection-title', `${DEFINITIONS[selected.kind].label} (${selected.x}, ${selected.z})`);
      this.text('#selection-description', DESCRIPTIONS[selected.kind]);
      this.text('#selection-status', selected.status || (selected.working ? '稼働中' : '待機中'));
      this.text('#selection-direction', selected.kind === 'generator' ? '木材は隣接から · 魔力は導線網' : selected.kind === 'wire' ? '直交接続（方向なし）' : selected.kind === 'golemRelay' ? '半径6区画（方向なし）' : selected.kind === 'delivery' ? '全隣接から受け入れ（出力なし）' : `${DIRECTIONS[selected.direction]}${selected.kind === 'splitter' ? ` / 右側 ${DIRECTIONS[(selected.direction + 1) % 4]}` : ''} · 入力は隣接から`);
      const counts = Object.fromEntries(RESOURCES.map(resource => [resource, 0])) as Record<Resource, number>;
      [...selected.input, ...selected.output, ...(selected.reserved ?? []), ...(selected.item ? [selected.item] : [])].forEach(item => counts[item.resource]++);
      this.text('#selection-buffer', Object.entries(counts).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]} ${amount}`).join('、') || 'なし');
      this.updateSelectedSystems(state, selected);
      this.text('#selection-progress', (selected.kind === 'belt' || selected.kind === 'splitter') ? `${Math.round(selected.beltProgress / BELT_SECONDS * 100)}%` : `${selected.progress.toFixed(1)}秒${DEFINITIONS[selected.kind].seconds ? ` / ${DEFINITIONS[selected.kind].seconds}秒` : ''}`);
      this.text('#selection-power', `${Math.floor(selected.energy)}${selected.pendingEnergy ? ` · 内部完成 ${selected.pendingEnergy}` : ''}`);
      this.node('#advanced-feed').hidden = !['generator', 'smelter', 'delivery', 'storage', 'splitter', 'belt', 'crystalRefiner', 'assembler', 'runeCarver', 'frameForge', 'golemForge', 'golemRelay'].includes(selected.kind);
    }
    if (selected && view.guide && (this.previousGuideMode === 'feed' || this.previousGuideMode === 'rotate') && view.guide.mode !== 'feed' && view.guide.mode !== 'rotate') {
      panel.classList.add('is-collapsed'); const close = this.node('[data-action="close-panel"]'); close.textContent = '+'; close.setAttribute('aria-label', '設備詳細を開く');
    }
    this.root.classList.toggle('expanded-selection', !!selected && !panel.hidden && !panel.classList.contains('is-collapsed'));
    this.previousGuideMode = view.guide?.mode ?? null;
    this.lastSelected = view.selectedId;
  }
  private loadPreferences(): void {
    try {
      const value = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      if (!value || value.version !== 1) return;
      if (Array.isArray(value.quickSlots) && value.quickSlots.length === 6 && value.quickSlots.every((kind: unknown) => BUILDINGS.includes(kind as Kind))) this.quickSlots = [...value.quickSlots];
      if (typeof value.category === 'string' && Object.hasOwn(CATEGORIES, value.category)) this.category = value.category;
      if (value.transferMode === 'one' || value.transferMode === 'all') this.transferMode = value.transferMode;
    } catch { /* Preferences are optional and independent of the game save. */ }
  }
  private savePreferences(): void {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ version: 1, quickSlots: this.quickSlots, category: this.category, transferMode: this.transferMode })); } catch { /* Browsers may disable preference storage. */ }
  }
  private createPresentationControls(): void {
    for (const [id, category] of Object.entries(CATEGORIES)) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.category = id; button.textContent = category.label;
      this.node('#build-categories').append(button);
    }
    for (let index = 0; index < 6; index++) { const option = document.createElement('option'); option.value = String(index); option.textContent = String(index + 1); this.node('#registration-slot').append(option); }
    this.refreshQuickSlots(); this.filterPalette(); this.refreshTransferMode();
    for (const resource of RESOURCES) {
      const feed = document.createElement('button'); feed.type = 'button'; feed.dataset.feedResource = resource; feed.innerHTML = `${resourceIcon(resource)}<span></span>`; feed.querySelector('span')!.textContent = `${RESOURCE_LABELS[resource]} ×1`; this.node('#facility-feed-slots').append(feed);
      const icon = document.createElement('span'); icon.className = 'hud-resource-icon'; icon.innerHTML = resourceIcon(resource);
      const label = this.resourceNodes.get(resource)!.parentElement!; label.prepend(icon);
      for (const side of ['deposit', 'withdraw']) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'item-slot'; button.dataset.transfer = side; button.dataset.resource = resource;
        button.innerHTML = `${resourceIcon(resource)}<span class="slot-name"></span><b class="slot-count">0</b><small class="slot-origin"></small>`;
        button.querySelector('.slot-name')!.textContent = RESOURCE_LABELS[resource];
        this.node(side === 'deposit' ? '#inventory-slots' : '#chest-slots').append(button); this.transferButtons.set(`${side}:${resource}`, button);
      }
    }
  }
  private refreshQuickSlots(): void {
    const host = this.node('#quick-slots');
    // Only registration changes this DOM; simulation ticks keep buttons and focus intact.
    host.replaceChildren();
    this.quickSlots.forEach((kind, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.quick = String(index); button.className = 'quick-slot';
      button.innerHTML = `<small>${index + 1}</small><span class="quick-icon" aria-hidden="true">${ICONS[kind]}</span><span class="quick-name"></span><span class="quick-lock" hidden>🔒</span><span class="quick-cost"></span>`;
      button.querySelector('.quick-name')!.textContent = DEFINITIONS[kind].label; button.setAttribute('aria-label', `${index + 1}: ${DEFINITIONS[kind].label}`); host.append(button);
    });
  }
  private updateQuickSlots(state: GameState, selected: Kind | null): void {
    this.node('#quick-slots').querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const kind = this.quickSlots[Number(button.dataset.quick)]; const unlocked = isKindUnlocked(state, kind);
      (button.querySelector('.quick-lock') as HTMLElement).hidden = unlocked;
      button.querySelector('.quick-cost')!.textContent = (state.kits[kind] ?? 0) > 0 ? `所持 ${state.kits[kind]}` : this.costLabel(kind);
      const affordable = (state.kits[kind] ?? 0) > 0 || Object.entries(DEFINITIONS[kind].cost).every(([resource, amount]) => (state.inventory[resource as Resource] ?? 0) >= amount!);
      button.classList.toggle('unaffordable', !affordable);
      button.classList.toggle('tech-locked', !unlocked); button.setAttribute('aria-pressed', String(kind === selected));
      button.title = `${DEFINITIONS[kind].label} · ${this.costLabel(kind)}${unlocked ? '' : ` · 未解放: ${TECH_LABELS[DEFINITIONS[kind].technology!]}`}`;
    });
  }
  private filterPalette(): void {
    this.node('#build-categories').querySelectorAll<HTMLButtonElement>('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === this.category)));
    this.node('.build-palette').querySelectorAll<HTMLElement>('[data-build-tile]').forEach(tile => { tile.hidden = !CATEGORIES[this.category].kinds.includes(tile.dataset.buildTile as Kind); });
  }
  registrationChange(): void { this.registerSlot = Number((this.node('#registration-slot') as HTMLSelectElement).value); }
  chooseQuickSlot(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.quickSlots.length) return;
    this.node('.build-dock').hidden = true;
    if (!this.node('#technology-panel').hidden) this.callbacks.onTechnologyToggle(false);
    this.callbacks.onBuild(this.quickSlots[index]);
  }
  isWorldInputBlocked(): boolean { return !this.node('.build-dock').hidden || !this.node('#technology-panel').hidden; }
  closeOverlay(): boolean {
    if (!this.node('#technology-panel').hidden) { this.callbacks.onTechnologyToggle(false); return true; }
    if (!this.node('.build-dock').hidden) { this.node('.build-dock').hidden = true; this.callbacks.onCancel(); return true; }
    const selected = this.node('#selection-panel');
    if (!selected.hidden && !selected.classList.contains('is-collapsed')) {
      selected.classList.add('is-collapsed'); this.root.classList.remove('expanded-selection'); const close = this.node('[data-action="close-panel"]'); close.textContent = '+'; close.setAttribute('aria-label', '設備詳細を開く'); return true;
    }
    return false;
  }
  private refreshTransferMode(): void {
    this.node('#storage-controls').querySelectorAll<HTMLButtonElement>('[data-transfer-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.transferMode === this.transferMode)));
  }
  private transferItem(resource: Resource, deposit: boolean, shift: boolean): void {
    const selected = this.currentSelected; const state = this.currentState;
    if (!state || !selected || selected.kind !== 'storage') return;
    const available = deposit ? state.inventory[resource] ?? 0 : selected.input.filter(item => item.resource === resource).length;
    const capacity = deposit ? Math.max(0, 32 - selected.input.length) : available;
    const amount = Math.min(available, capacity, shift || this.transferMode === 'all' ? available : 1);
    if (amount <= 0) return;
    if (deposit) this.callbacks.onFeed(resource, amount); else this.callbacks.onCollect(resource, amount);
  }
  private feedOne(resource: Resource): void {
    const selected = this.currentSelected; const state = this.currentState;
    if (!selected || !state || (state.inventory[resource] ?? 0) < 1) return;
    this.callbacks.onFeed(resource, 1);
  }
  private depositAll(): void {
    for (const resource of RESOURCES) this.transferItem(resource, true, true);
  }
  private updateChestSlots(state: GameState, selected: Building): void {
    for (const resource of RESOURCES) {
      const items = selected.input.filter(item => item.resource === resource);
      const automatic = items.filter(item => item.automated && !item.handled).length;
      for (const side of ['deposit', 'withdraw']) {
        const button = this.transferButtons.get(`${side}:${resource}`)!;
        const count = side === 'deposit' ? state.inventory[resource] ?? 0 : items.length;
        const label = side === 'deposit' ? '収納箱へ預ける' : '手持ちへ取り出す';
        const countNode = button.querySelector('.slot-count')!; if (countNode.textContent !== String(count)) countNode.textContent = String(count);
        const origin = side === 'withdraw' ? `自動${automatic} / 手動${items.length - automatic}` : '手持ち';
        const originNode = button.querySelector('.slot-origin')!; if (originNode.textContent !== origin) originNode.textContent = origin;
        button.disabled = count === 0 || (side === 'deposit' && selected.input.length >= 32);
        button.title = `${RESOURCE_LABELS[resource]} ${count}個 · ${label} · ${origin}。Shiftで全量。取り出した品は手動扱いとなり自動納品に算入しません。`;
        button.setAttribute('aria-label', `${RESOURCE_LABELS[resource]} ${count}個を${label}。${origin}`);
      }
    }
    (this.node('[data-action="deposit-all"]') as HTMLButtonElement).disabled = selected.input.length >= 32 || RESOURCES.every(resource => !(state.inventory[resource] ?? 0));
    (this.node('[data-action="withdraw-all"]') as HTMLButtonElement).disabled = selected.input.length === 0;
  }
  private createTechnologyNodes(): void {
    for (const id of TECH_IDS) {
      const node = document.createElement('article'); node.className = 'technology-node'; node.dataset.tech = id;
      node.innerHTML = `<div class="tech-node-heading"><h3></h3><span class="tech-status"></span></div><p class="tech-description"></p><p class="tech-prerequisites"></p><ul class="tech-requirements"></ul><p class="tech-unlocks"></p><p class="tech-reason"></p><div class="tech-actions"><button data-research="${id}">研究する</button><button data-track="${id}">追跡する</button></div>`;
      this.node('.technology-map').append(node); this.technologyNodes.set(id, node);
    }
  }
  private updateTechnology(state: GameState, open: boolean): void {
    this.node('#technology-panel').hidden = !open; this.root.classList.toggle('technology-open', open);
    this.tracked = state.research?.tracked ?? null;
    const nodes = techNodeStates(state);
    const available = nodes.filter(node => node.status === 'available').length;
    this.text('[data-action="technology-open"].technology-open', `技術ツリー${available ? ` (${available})` : ''}`);
    const labels = { unlocked: '解放済み', available: '研究可能', locked: '未解放' };
    for (const technology of nodes) {
      const node = this.technologyNodes.get(technology.id)!; node.dataset.techStatus = technology.status;
      const set = (selector: string, text: string) => { const element = node.querySelector<HTMLElement>(selector)!; if (element.textContent !== text) element.textContent = text; };
      set('h3', technology.label); set('.tech-status', labels[technology.status]); set('.tech-description', technology.description);
      set('.tech-prerequisites', `前提: ${technology.prerequisites.map(id => nodes.find(other => other.id === id)?.label ?? TECH_LABELS[id]).join(' ＋ ') || 'なし（最初から利用可）'}`);
      set('.tech-unlocks', `解放: ${[...technology.unlocks.kinds.map(kind => DEFINITIONS[kind].label), ...technology.unlocks.recipes.map(recipe => `${RECIPES[recipe].label}レシピ`)].join('・') || (technology.id === 'sanctuary' ? 'ゴーレム工房の自動運営を達成' : '魔導剣の連続生産達成・ゴーレム製造へ')}`);
      set('.tech-reason', technology.reason);
      const requirements = node.querySelector<HTMLElement>('.tech-requirements')!;
      const text = technology.requirements.map(requirement => `${requirement.met ? '✓' : '○'} ${requirement.label} ${requirement.current} / ${requirement.target}`).join('\n');
      if (requirements.dataset.value !== text) {
        requirements.dataset.value = text; requirements.replaceChildren();
        for (const line of text.split('\n').filter(Boolean)) { const item = document.createElement('li'); item.textContent = line; requirements.append(item); }
      }
      const research = node.querySelector<HTMLButtonElement>('[data-research]')!;
      research.disabled = technology.status !== 'available'; research.title = technology.reason;
      research.textContent = technology.status === 'unlocked' ? '解放済み' : technology.status === 'available' ? '研究する（実績のみ）' : '条件未達成';
      const track = node.querySelector<HTMLButtonElement>('[data-track]')!;
      track.disabled = technology.status === 'unlocked' && this.tracked !== technology.id; track.setAttribute('aria-pressed', String(this.tracked === technology.id));
      track.textContent = this.tracked === technology.id ? '追跡を解除' : '追跡する';
    }
    this.text('#sword-rate', `魔導剣の自動生産: 現在 ${currentSwordRate(state)}本 / 分 · 最高 ${state.stats?.peakSwordRate ?? 0}本 / 分（ゲーム内の直近60秒）`);
    const tracked = nodes.find(node => node.id === this.tracked);
    const chip = this.node('#tracked-goal'); chip.hidden = !tracked;
    if (tracked) this.text('#tracked-goal', `追跡: ${tracked.label} · ${tracked.reason} ›`);
  }
  private updateSelectedSystems(state: GameState, selected: Building): void {
    const storage = selected.kind === 'storage';
    const recipeId = selected.recipe ?? DEFINITIONS[selected.kind].recipes?.[0];
    const feedResources = selected.kind === 'golemRelay' ? ['golem'] : selected.kind === 'delivery' ? ['ingot', 'sword'] : Object.keys(recipeId ? RECIPES[recipeId].input : DEFINITIONS[selected.kind].input ?? {});
    this.node('#facility-feed-slots').hidden = storage || !feedResources.length;
    this.node('#facility-feed-slots').querySelectorAll<HTMLButtonElement>('[data-feed-resource]').forEach(button => {
      const resource = button.dataset.feedResource as Resource; button.hidden = !feedResources.includes(resource);
      button.disabled = !(state.inventory[resource] ?? 0) || !hasBufferRoom(selected, resource);
      button.title = `${RESOURCE_LABELS[resource]}を1個補給 · 所持 ${state.inventory[resource] ?? 0}`;
    });
    this.node('#storage-controls').hidden = !storage;
    this.node('#selection-panel').classList.toggle('chest-selected', storage);
    if (storage) {
      this.updateChestSlots(state, selected);
      this.text('#storage-capacity', `収納 ${selected.input.length} / 32品 · 空き ${32 - selected.input.length}個（納品はしません）`);
      const list = this.node('#storage-items'); const values = selected.input.map(item => `${item.resource}:${item.automated}:${!!item.handled}`).join('|');
      if (list.dataset.value !== values) {
        list.dataset.value = values; list.replaceChildren();
        for (const resource of RESOURCES) {
          const items = selected.input.filter(item => item.resource === resource); if (!items.length) continue;
          const automatic = items.filter(item => item.automated && !item.handled).length;
          const row = document.createElement('li'); row.textContent = `${RESOURCE_LABELS[resource]} ${items.length} · 自動 ${automatic} / 手動扱い ${items.length - automatic}`;
          row.title = '自動: 自動生産され、手で取り出されていない品。手動扱い: 手動投入または手動で取り出した品。取り出すと全品が手動扱いになります。'; list.append(row);
        }
      }
    }
    this.node('#relay-controls').hidden = selected.kind !== 'golemRelay';
    if (selected.kind === 'golemRelay') {
      this.text('#relay-worker', selected.golemWorker ? '♟ ゴーレム配置済み' : '♟ ゴーレムの搬入を待っています');
      this.text('#relay-transfers', `工房全体の補給 ${state.stats?.golemTransfers ?? 0}回 · 木材 ${state.stats?.golemFuelTransfers ?? 0} / 20回`);
      this.node('#relay-controls').querySelectorAll<HTMLButtonElement>('[data-relay-policy]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.relayPolicy === (selected.golemPolicy ?? 'fuel'))));
    }
    this.node('#delivery-summary').hidden = selected.kind !== 'delivery';
    if (selected.kind === 'delivery') this.text('#delivery-summary', `自動納品（工房全体）: 鉄の延べ棒 ${state.stats?.delivered.ingot ?? state.delivered} / 100本 · 魔導剣 ${state.stats?.delivered.sword ?? 0}本。自動生産・自動搬送し、手で取り出していない品だけ加算します。`);
    const recipes = DEFINITIONS[selected.kind].recipes ?? [];
    this.node('#recipe-controls').hidden = !recipes.length;
    if (recipes.length) {
      const select = this.node('#recipe-select') as HTMLSelectElement;
      const signature = `${selected.kind}:${state.research?.unlocked.join(',') ?? 'basic'}`;
      if (select.dataset.value !== signature) {
        select.dataset.value = signature; select.replaceChildren();
        for (const recipe of recipes) {
          const option = document.createElement('option'); option.value = recipe;
          const unlocked = isRecipeUnlocked(state, recipe); option.textContent = `${RECIPES[recipe].label}${unlocked ? '' : '（未解放）'}`;
          option.title = unlocked ? '生産レシピを選択' : `${TECH_LABELS[RECIPES[recipe].technology]}の研究が必要`; select.append(option);
        }
      }
      select.value = selected.recipe ?? recipes[0];
      const current = RECIPES[(selected.recipe ?? recipes[0])];
      const locked = recipes.filter(recipe => !isRecipeUnlocked(state, recipe));
      this.text('#recipe-lock-reason', `${Object.entries(current.input).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]}${amount}`).join('＋')} → ${current.label} / ${current.seconds}秒・魔力${current.energy}${locked.length ? `。未解放: ${locked.map(recipe => `${RECIPES[recipe].label}は${TECH_LABELS[RECIPES[recipe].technology]}の研究が必要`).join('・')}` : ''}。稼働中・互換性のない在庫がある時は変更できません。`);
    }
  }
  recipeChange(): void { this.callbacks.onRecipe((this.node('#recipe-select') as HTMLSelectElement).value as RecipeId); }
  dispose(): void { this.controller.abort(); this.root.replaceChildren(); }
}

/** DOM listeners delegate to instance methods; no game state is exposed globally. */
function bindUIEvents(ui: GameUI, root: HTMLElement, signal: AbortSignal): void {
  root.addEventListener('click', event => ui.handleClick(event), { signal });
  root.querySelector('#feed-form')!.addEventListener('submit', event => ui.handleFeed(event), { signal });
  root.querySelector('#registration-slot')!.addEventListener('change', () => ui.registrationChange(), { signal });
  root.querySelector('#recipe-select')!.addEventListener('change', () => ui.recipeChange(), { signal });
  for (const type of ['pointerdown', 'wheel', 'contextmenu']) root.addEventListener(type, event => event.stopPropagation(), { signal });
  root.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) event.stopPropagation();
  }, { signal });
}
