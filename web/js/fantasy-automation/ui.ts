import { BELT_SECONDS, DEFINITIONS } from './data.js';
import type { GuideStep } from './onboarding.js';
import type { Direction, GameState, Kind, Resource } from './types.js';

export interface UICallbacks {
  onBuild(kind: Kind): void; onSpeed(speed: 0 | 1 | 2): void;
  onSave(): void; onLoad(): void; onRotate(): void; onRemove(): void;
  onFeed(resource: Resource, amount: number): void; onCollect(): void;
  onCancel(): void; onResetCamera(): void; onNew(): void;
  onGuideAction(): void; onGuideToggle(show?: boolean): void;
}
export interface UIState {
  kind: Kind | null; direction: Direction; selectedId: number | null; speed: 0 | 1 | 2;
  power: { stored: number; capacity: number }; message: string; hover?: { x: number; z: number } | null; guide?: GuideStep | null;
}
const RESOURCE_LABELS: Record<Resource, string> = { wood: '木材', ore: '鉄鉱石', ingot: '鉄延べ棒' };
const DIRECTIONS = ['北 ↑', '東 →', '南 ↓', '西 ←'];
const BUILDINGS: Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery'];
const ICONS: Record<Kind, string> = { miner: '⚒', belt: '→', smelter: '♨', generator: '✦', wire: '⌁', lumber: '♣', delivery: '▣' };
const DESCRIPTIONS: Record<Kind, string> = {
  miner: '鉱脈の上に設置。魔力2で鉄鉱石1を2秒で採掘。矢印へ排出。',
  belt: '矢印の先へ1個ずつ搬送。1区画0.5秒。ドラッグで連続配置。',
  smelter: '鉄鉱石2と魔力5で鉄延べ棒1を4秒で精錬。入力は隣接、出力は矢印。',
  generator: '木材1から魔力30を10秒で生成。蓄積上限30。隣接する導線へ供給。',
  wire: '隣り合う導線・魔力炉・採掘機・魔導炉を魔力網で接続。',
  lumber: '森林の上に設置。木材1を3秒で採取。矢印へ排出。',
  delivery: 'ベルトから鉄延べ棒を受け取り、自動生産100本でクリア。手動投入は数えない。',
};

export class GameUI {
  private readonly controller = new AbortController();
  private readonly buildButtons = new Map<Kind, HTMLButtonElement>();
  private readonly speedButtons = new Map<number, HTMLButtonElement>();
  private readonly resourceNodes = new Map<Resource, HTMLElement>();
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
        <div class="workshop-title">魔導からくり工房<span>自動納品 <b id="delivered-count">0</b> / 100</span></div>
        <div class="resource-strip" aria-label="所持資源"><span>木材 <b data-resource="wood">40</b></span><span>鉄鉱石 <b data-resource="ore">0</b></span><span>鉄 <b data-resource="ingot">20</b></span><span>魔力 <b id="power-count">0 / 0</b></span></div>
        <div class="time-controls" aria-label="時間速度"><button data-speed="0" aria-label="一時停止" title="一時停止（Space）">Ⅱ</button><button data-speed="1" aria-label="1倍速">1×</button><button data-speed="2" aria-label="2倍速">2×</button></div>
        <details class="game-menu"><summary aria-label="操作と保存メニュー">☰ <span>メニュー</span></summary><div class="menu-body"><div class="menu-actions"><button data-action="save">保存</button><button data-action="load">読込</button><button data-action="camera">視点を戻す</button><button data-action="new">新しい工房</button><button data-action="guide-open">はじめての案内</button></div><details><summary>操作方法・つくり方</summary><div class="help-text"><p>鉱脈に採掘機 → ベルト → 魔導炉 → ベルト → 納品箱をつなごう。魔力炉と機械は魔力導線で接続。魔力炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 魔導炉 (14,16) → ベルト (15,16) → 納品箱 (16,16)。全て東向き。<br>魔力炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>左クリック: 配置 / 選択<br>ベルト選択中に左ドラッグ: 連続敷設<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去、Esc: 建設取消<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>納品に数えるのは自動生産した鉄だけです。採掘機が生産した鉱石を使いましょう。魔力切れは木材の手動補給で復旧できます。保存はこのブラウザの1スロットです。</p></div></details></div></details>
      </header>
      <aside id="guide-card" class="guide-card" hidden aria-label="はじめての工房づくり">
        <div class="guide-heading"><span>鉄100本を自動納品しよう</span><button data-action="guide-close" aria-label="案内を閉じる">案内を閉じる</button></div>
        <div id="guide-progress" class="guide-progress"></div><h2 id="guide-title"></h2><button data-action="guide-action" class="guide-action">この設備を選ぶ</button><p id="guide-text"></p>
        <p id="guide-step-target" class="guide-target"></p><p id="guide-instruction"></p>
        <ul id="guide-blockers" class="guide-blockers"></ul><details id="guide-check-details"><summary id="guide-check-summary">組立チェック</summary><ul id="guide-checks" class="guide-checks"></ul></details><p id="guide-feedback" class="guide-feedback" role="status" aria-live="polite" hidden></p><small class="guide-next">条件を満たすと、次の案内へ進みます。</small>
      </aside>
      <div class="workshop-notices"><p id="game-message" role="status" aria-live="polite">鉱脈に採掘機を建て、工房を動かそう。</p><p id="victory-message" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>
      <aside id="selection-panel" class="selection-panel" hidden aria-label="設備の詳細">
        <button class="panel-close" data-action="close-panel" aria-label="設備詳細を閉じる">×</button><h2 id="selection-title"></h2><p id="selection-description"></p>
        <dl><div><dt>稼働状態</dt><dd id="selection-status"></dd></div><div><dt>入出力・方向</dt><dd id="selection-direction"></dd></div><div><dt>内部の資源</dt><dd id="selection-buffer"></dd></div><div><dt>作業進捗</dt><dd id="selection-progress"></dd></div><div><dt>蓄積魔力</dt><dd id="selection-power"></dd></div></dl>
        <div class="selection-actions"><button data-action="rotate">回転 R</button><button data-action="collect">資源を回収</button><button data-action="remove" class="danger">撤去</button></div>
        <form id="feed-form"><label>手動補給<select id="feed-resource"><option value="wood">木材</option><option value="ore">鉄鉱石</option><option value="ingot">鉄延べ棒</option></select></label><label>個数<input id="feed-amount" type="number" min="1" max="1000" step="1" value="1" inputmode="numeric"></label><button type="submit" data-action="feed">補給する</button><small>手動の鉱石・延べ棒は目標に含めません。木材燃料は手動補給できます。</small></form>
      </aside>
      <footer class="build-dock"><div class="build-context"><span id="build-context">設備を選んで建設</span><button data-action="rotate" aria-label="建設方向を回転">↻ R</button><button data-action="cancel">取消 Esc</button></div><nav class="build-palette" aria-label="建設する設備"></nav></footer>`;
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
    for (const resource of ['wood', 'ore', 'ingot'] as Resource[]) this.resourceNodes.set(resource, this.node(`[data-resource="${resource}"]`));
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
    if (button.dataset.build) { this.callbacks.onBuild(button.dataset.build as Kind); return; }
    if (button.dataset.speed) { this.callbacks.onSpeed(Number(button.dataset.speed) as 0 | 1 | 2); return; }
    const action = button.dataset.action;
    if (action === 'save') this.callbacks.onSave();
    else if (action === 'load') this.callbacks.onLoad();
    else if (action === 'new') this.callbacks.onNew();
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
    const feedback = !!view.guide && /保存|読込|読み込|再開しました|WebGL|表示でき|できません|不正|素材を補給しました/.test(view.message);
    this.node('#guide-feedback').hidden = !feedback;
    if (feedback) this.text('#guide-feedback', view.message);
    for (const resource of ['wood', 'ore', 'ingot'] as Resource[]) {
      const node = this.resourceNodes.get(resource)!; const value = String(state.inventory[resource]);
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
      const affordable = kits > 0 || Object.entries(DEFINITIONS[kind].cost).every(([resource, amount]) => state.inventory[resource as Resource] >= amount!);
      button.classList.toggle('unaffordable', !affordable);
      button.setAttribute('aria-label', `${DEFINITIONS[kind].label}、${label}${affordable ? '' : '、資源不足'}`);
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
        select.value = selected.kind === 'generator' ? 'wood' : selected.kind === 'smelter' ? 'ore' : 'ingot';
      }
      this.text('#selection-title', `${DEFINITIONS[selected.kind].label} (${selected.x}, ${selected.z})`);
      this.text('#selection-description', DESCRIPTIONS[selected.kind]);
      this.text('#selection-status', selected.status || (selected.working ? '稼働中' : '待機中'));
      this.text('#selection-direction', `${DIRECTIONS[selected.direction]}${selected.kind === 'wire' || selected.kind === 'generator' ? ' · 隣接へ魔力接続' : ' · 入力は隣接から'}`);
      const counts: Record<Resource, number> = { wood: 0, ore: 0, ingot: 0 };
      [...selected.input, ...selected.output, ...(selected.item ? [selected.item] : [])].forEach(item => counts[item.resource]++);
      this.text('#selection-buffer', Object.entries(counts).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]} ${amount}`).join('、') || 'なし');
      this.text('#selection-progress', selected.kind === 'belt' ? `${Math.round(selected.beltProgress / BELT_SECONDS * 100)}%` : `${selected.progress.toFixed(1)}秒${DEFINITIONS[selected.kind].seconds ? ` / ${DEFINITIONS[selected.kind].seconds}秒` : ''}`);
      this.text('#selection-power', `${Math.floor(selected.energy)}${selected.pendingEnergy ? ` · 内部完成 ${selected.pendingEnergy}` : ''}`);
      this.node('#feed-form').hidden = !['generator', 'smelter', 'delivery'].includes(selected.kind);
    }
    this.lastSelected = view.selectedId;
  }
  dispose(): void { this.controller.abort(); this.root.replaceChildren(); }
}

/** DOM listeners delegate to instance methods; no game state is exposed globally. */
function bindUIEvents(ui: GameUI, root: HTMLElement, signal: AbortSignal): void {
  root.addEventListener('click', event => ui.handleClick(event), { signal });
  root.querySelector('#feed-form')!.addEventListener('submit', event => ui.handleFeed(event), { signal });
  for (const type of ['pointerdown', 'wheel', 'contextmenu']) root.addEventListener(type, event => event.stopPropagation(), { signal });
  root.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) event.stopPropagation();
  }, { signal });
}
