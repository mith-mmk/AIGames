import { BELT_SECONDS, DEFINITIONS, RECIPES, RESOURCE_NAMES } from './data.js';
import { techNodeStates, currentSwordRate, isKindUnlocked, isRecipeUnlocked } from './technology.js';
import type { GuideStep } from './onboarding.js';
import type { Direction, GameState, Kind, Resource, TechId, RecipeId, Building } from './types.js';

export interface UICallbacks {
  onBuild(kind: Kind): void; onSpeed(speed: 0 | 1 | 2): void;
  onSave(): void; onLoad(): void; onRotate(): void; onRemove(): void;
  onFeed(resource: Resource, amount: number): void; onCollect(resource?: Resource, amount?: number): void;
  onCancel(): void; onResetCamera(): void; onNew(): void;
  onGuideAction(): void; onGuideToggle(show?: boolean): void;
  onGatherWood(): void;
  onTechnologyToggle(show?: boolean): void; onResearch(id: TechId): void; onTrack(id: TechId | null): void; onRecipe(recipe: RecipeId): void;
}
export interface UIState {
  kind: Kind | null; direction: Direction; selectedId: number | null; speed: 0 | 1 | 2;
  power: { stored: number; capacity: number }; message: string; hover?: { x: number; z: number } | null; guide?: GuideStep | null; technologyOpen?: boolean;
}
const RESOURCE_LABELS = RESOURCE_NAMES;
const RESOURCES = Object.keys(RESOURCE_LABELS) as Resource[];
const TECH_IDS: TechId[] = ['basic', 'logistics', 'crystals', 'assembly', 'mastery'];
const TECH_LABELS: Record<TechId, string> = { basic: '基礎工房', logistics: '物流', crystals: '魔晶', assembly: '組立', mastery: '工房の達人' };
const DIRECTIONS = ['北 ↑', '東 →', '南 ↓', '西 ←'];
const BUILDINGS: Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery', 'splitter', 'storage', 'crystalMiner', 'crystalRefiner', 'assembler'];
const ICONS: Record<Kind, string> = { miner: '⚒', belt: '→', smelter: '♨', generator: '✦', wire: '⌁', lumber: '♣', delivery: '▣', splitter: '⑂', storage: '▤', crystalMiner: '◇', crystalRefiner: '◈', assembler: '⚔' };
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
};

export class GameUI {
  private readonly controller = new AbortController();
  private readonly buildButtons = new Map<Kind, HTMLButtonElement>();
  private readonly speedButtons = new Map<number, HTMLButtonElement>();
  private readonly resourceNodes = new Map<Resource, HTMLElement>();
  private tracked: TechId | null = null;
  private readonly technologyNodes = new Map<TechId, HTMLElement>();
  private readonly root: HTMLElement;
  private readonly callbacks: UICallbacks;
  private lastSelected: number | null = null;
  private guideLists = '';
  private lastMessage = '';

  constructor(root: HTMLElement, callbacks: UICallbacks) {
    this.root = root; this.callbacks = callbacks;
    root.innerHTML = `
      <header class="workshop-top">
        <a class="home-link" href="index.html" aria-label="AI Gamesへ戻る">‹ AI Games</a>
        <div class="workshop-title">魔導からくり工房<span><i class="ingot-icon" aria-hidden="true"></i> 鉄の延べ棒 自動納品 <b id="delivered-count">0</b> / 100 <small class="goal-condition">自動生産→自動搬送品のみ</small></span></div>
        <div class="resource-strip" aria-label="所持資源"><span title="所持 木材">木材 <b data-resource="wood">0</b></span><span title="所持 鉄鉱石">鉱石 <b data-resource="ore">0</b></span><span title="所持 鉄の延べ棒">延べ棒 <b data-resource="ingot">0</b></span><span title="所持 精製魔晶原石">原石 <b data-resource="rawCrystal">0</b></span><span title="所持 精製魔晶">魔晶 <b data-resource="crystal">0</b></span><span title="所持 魔導剣">魔導剣 <b data-resource="sword">0</b></span><span>魔力 <b id="power-count">0 / 0</b></span></div><button data-action="technology-open" class="technology-open">技術ツリー</button>
        <div class="time-controls" aria-label="時間速度"><button data-speed="0" aria-label="一時停止" title="一時停止（Space）">Ⅱ</button><button data-speed="1" aria-label="1倍速">1×</button><button data-speed="2" aria-label="2倍速">2×</button></div>
        <details class="game-menu"><summary aria-label="操作と保存メニュー">☰ <span>メニュー</span></summary><div class="menu-body"><button data-action="menu-close" class="menu-close">メニューを閉じる ×</button><div class="menu-actions"><button data-action="save">保存</button><button data-action="load">読込</button><button data-action="camera">視点を戻す</button><button data-action="new">新しい工房</button><button data-action="gather-wood" title="森林から木材1個を手採取。生産実績には算入しません。">木材を手採取</button><button data-action="guide-open">はじめての案内</button><button data-action="build-open">建設一覧を表示</button><button data-action="selection-open">設備詳細を表示</button><button data-action="help-close">操作説明を閉じる</button></div><details id="main-help"><summary>操作方法・つくり方</summary><div class="help-text"><p>鉱脈に採掘機 → ベルト → 魔導炉 → ベルト → 納品箱をつなごう。魔力炉と機械は魔力導線で接続。魔力炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 魔導炉 (14,16) → ベルト (15,16) → 納品箱 (16,16)。全て東向き。<br>魔力炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>左クリック: 配置 / 選択<br>ベルト選択中に左ドラッグ: 連続敷設<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去、Esc: 建設取消<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>納品箱は鉄の延べ棒と魔導剣を受け入れます。採掘から加工・搬送まで自動でつないだ品だけを実績へ数えます。手で取り出し・再投入した品は算入しません。魔力切れは木材の手動補給で復旧できます。木材が0なら、メニューの「木材を手採取」で1個ずつ採れます。保存はこのブラウザの1スロットです。</p><button data-action="help-close">操作説明を閉じる ×</button></div></details></div></details>
      </header>
      <button id="tracked-goal" class="tracked-goal" data-action="technology-open" hidden></button>
      <section id="technology-panel" class="technology-panel" hidden aria-label="技術ツリー">
        <div class="technology-heading"><div><h2>技術ツリー</h2><p>自動生産の実績で解放。研究に素材の支払いは不要です。</p></div><button data-action="technology-close">閉じる ×</button></div>
        <p class="technology-path">基礎工房 → 物流 ＋ 魔晶 → 組立 → 工房の達人</p><p id="sword-rate"></p>
        <div class="technology-map"></div><p class="future-tech">次の構想: ゴーレムの自律作業。今回は魔導剣の連続生産まで遊べます。</p>
      </section>
      <aside id="guide-card" class="guide-card" hidden aria-label="はじめての工房づくり">
        <div class="guide-heading"><span>鉄100本を自動納品しよう</span><button data-action="guide-close" aria-label="案内を閉じる">案内を閉じる</button></div>
        <div id="guide-progress" class="guide-progress"></div><h2 id="guide-title"></h2><button data-action="guide-action" class="guide-action">この設備を選ぶ</button><p id="guide-text"></p>
        <p id="guide-step-target" class="guide-target"></p><p id="guide-instruction"></p>
        <ul id="guide-blockers" class="guide-blockers"></ul><details id="guide-check-details"><summary id="guide-check-summary">組立チェック</summary><ul id="guide-checks" class="guide-checks"></ul></details><p id="guide-feedback" class="guide-feedback" role="status" aria-live="polite" hidden></p><small class="guide-next">条件を満たすと、次の案内へ進みます。</small>
      </aside>
      <div class="workshop-notices"><p id="game-message" role="status" aria-live="polite">鉱脈に採掘機を建て、工房を動かそう。</p><p id="victory-message" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>
      <aside id="selection-panel" class="selection-panel" hidden aria-label="設備の詳細">
        <button class="panel-close" data-action="close-panel" aria-label="設備詳細を閉じる">×</button><h2 id="selection-title"></h2><p id="selection-description"></p>
        <div id="delivery-summary" hidden></div><div id="recipe-controls" hidden><label>生産レシピ<select id="recipe-select"></select></label><p id="recipe-lock-reason"></p></div><div id="storage-controls" hidden><p id="storage-capacity"></p><ul id="storage-items"></ul><label>取り出す品<select id="collect-resource"></select></label><label>個数<input id="collect-amount" type="number" min="1" max="32" value="1" step="1"></label><button data-action="collect-count">選んだ品を取り出す</button><small>取り出した品は手動扱い。収納したまま自動搬送すれば由来を保ちます。</small></div><dl><div><dt>稼働状態</dt><dd id="selection-status"></dd></div><div><dt>入出力・方向</dt><dd id="selection-direction"></dd></div><div><dt>内部の資源</dt><dd id="selection-buffer"></dd></div><div><dt>作業進捗</dt><dd id="selection-progress"></dd></div><div><dt>蓄積魔力</dt><dd id="selection-power"></dd></div></dl>
        <div class="selection-actions"><button data-action="rotate">回転 R</button><button data-action="collect">資源を回収</button><button data-action="remove" class="danger">撤去</button></div>
        <form id="feed-form"><label>手動補給<select id="feed-resource"><option value="wood">木材</option><option value="ore">鉄鉱石</option><option value="ingot">鉄の延べ棒</option><option value="rawCrystal">魔晶原石</option><option value="crystal">精製魔晶</option><option value="sword">魔導剣</option></select></label><label>個数<input id="feed-amount" type="number" min="1" max="1000" step="1" value="1" inputmode="numeric"></label><button type="submit" data-action="feed">補給する</button><small>手動の鉱石・延べ棒・精製魔晶等は目標に含めません。木材燃料は手動補給できます。</small></form>
      </aside>
      <button id="build-reopen" class="build-reopen" data-action="build-open" hidden>建設一覧を表示</button><footer class="build-dock"><div class="build-context"><span id="build-context">設備を選んで建設</span><button data-action="rotate" aria-label="建設方向を回転">↻ R</button><button data-action="cancel">取消 Esc</button><button data-action="build-close" aria-label="建設一覧を閉じる">×</button></div><nav class="build-palette" aria-label="建設する設備"></nav></footer>`;
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
      button.append(icon, name, amount); palette.append(button); this.buildButtons.set(kind, button);
    }
    for (const resource of RESOURCES) this.resourceNodes.set(resource, this.node(`[data-resource="${resource}"]`));
    this.createTechnologyNodes();
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
    if (button.dataset.research) { this.callbacks.onResearch(button.dataset.research as TechId); return; }
    if (button.dataset.track) { this.callbacks.onTrack(button.dataset.track === this.tracked ? null : button.dataset.track as TechId); return; }
    if (button.dataset.build) { this.callbacks.onBuild(button.dataset.build as Kind); return; }
    if (button.dataset.speed) { this.callbacks.onSpeed(Number(button.dataset.speed) as 0 | 1 | 2); return; }
    const action = button.dataset.action;
    if (action === 'save') this.callbacks.onSave();
    else if (action === 'load') this.callbacks.onLoad();
    else if (action === 'new') this.callbacks.onNew();
    else if (action === 'technology-open' || action === 'technology-close') { this.callbacks.onTechnologyToggle(action === 'technology-open'); (this.node('.game-menu') as HTMLDetailsElement).open = false; }
    else if (action === 'gather-wood') this.callbacks.onGatherWood();
    else if (action === 'menu-close') (this.node('.game-menu') as HTMLDetailsElement).open = false;
    else if (action === 'help-close') (this.node('#main-help') as HTMLDetailsElement).open = false;
    else if (action === 'build-open' || action === 'build-close') { this.node('.build-dock').hidden = action === 'build-close'; this.node('#build-reopen').hidden = action === 'build-open'; if (action === 'build-close') this.callbacks.onCancel(); }
    else if (action === 'selection-open') { const panel = this.node('#selection-panel'); if (this.lastSelected !== null) { panel.hidden = false; panel.classList.remove('is-collapsed'); const close = this.node('[data-action="close-panel"]'); close.textContent = '×'; close.setAttribute('aria-label', '設備詳細を閉じる'); } }
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
      feed: '「設備の詳細を開く」→木材・個数1を選び「補給する」を押してください。',
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
    this.updateGuide(view.guide ?? null);
    this.updateTechnology(state, !!view.technologyOpen);
    const feedback = !!view.guide && /保存|読込|読み込|再開しました|WebGL|表示でき|できません|不正|素材を補給しました|手採取/.test(view.message);
    this.node('#guide-feedback').hidden = !feedback;
    if (feedback) this.text('#guide-feedback', view.message);
    for (const resource of RESOURCES) {
      const node = this.resourceNodes.get(resource)!; const value = String(state.inventory[resource] ?? 0);
      if (node.textContent !== value) node.textContent = value;
    }
    this.text('#power-count', `${Math.floor(view.power.stored)} / ${view.power.capacity}`);
    this.text('#delivered-count', String(state.delivered));
    this.node('#victory-message').hidden = !state.won;
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
        select.value = selected.kind === 'generator' ? 'wood' : selected.kind === 'smelter' ? 'ore' : selected.kind === 'crystalRefiner' ? 'rawCrystal' : 'ingot';
      }
      this.text('#selection-title', `${DEFINITIONS[selected.kind].label} (${selected.x}, ${selected.z})`);
      this.text('#selection-description', DESCRIPTIONS[selected.kind]);
      this.text('#selection-status', selected.status || (selected.working ? '稼働中' : '待機中'));
      this.text('#selection-direction', `${DIRECTIONS[selected.direction]}${selected.kind === 'splitter' ? ` / 右側 ${DIRECTIONS[(selected.direction + 1) % 4]}` : ''}${selected.kind === 'wire' || selected.kind === 'generator' ? ' · 隣接へ魔力接続' : ' · 入力は隣接から'}`);
      const counts = Object.fromEntries(RESOURCES.map(resource => [resource, 0])) as Record<Resource, number>;
      [...selected.input, ...selected.output, ...(selected.reserved ?? []), ...(selected.item ? [selected.item] : [])].forEach(item => counts[item.resource]++);
      this.text('#selection-buffer', Object.entries(counts).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]} ${amount}`).join('、') || 'なし');
      this.updateSelectedSystems(state, selected);
      this.text('#selection-progress', (selected.kind === 'belt' || selected.kind === 'splitter') ? `${Math.round(selected.beltProgress / BELT_SECONDS * 100)}%` : `${selected.progress.toFixed(1)}秒${DEFINITIONS[selected.kind].seconds ? ` / ${DEFINITIONS[selected.kind].seconds}秒` : ''}`);
      this.text('#selection-power', `${Math.floor(selected.energy)}${selected.pendingEnergy ? ` · 内部完成 ${selected.pendingEnergy}` : ''}`);
      this.node('#feed-form').hidden = !['generator', 'smelter', 'delivery', 'storage', 'splitter', 'belt', 'crystalRefiner', 'assembler'].includes(selected.kind);
    }
    this.lastSelected = view.selectedId;
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
      set('.tech-unlocks', `解放: ${[...technology.unlocks.kinds.map(kind => DEFINITIONS[kind].label), ...technology.unlocks.recipes.map(recipe => `${RECIPES[recipe].label}レシピ`)].join('・') || '魔導剣の連続生産達成'}`);
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
    this.node('#storage-controls').hidden = !storage;
    if (storage) {
      this.text('#storage-capacity', `収納 ${selected.input.length} / 32品（納品はしません）`);
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
  root.querySelector('#recipe-select')!.addEventListener('change', () => ui.recipeChange(), { signal });
  for (const type of ['pointerdown', 'wheel', 'contextmenu']) root.addEventListener(type, event => event.stopPropagation(), { signal });
  root.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) event.stopPropagation();
  }, { signal });
}
