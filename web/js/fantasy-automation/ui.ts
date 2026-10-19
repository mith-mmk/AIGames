import { BELT_SECONDS, BUILDABLE_KINDS, commonKind, DEFINITIONS, RECIPES, RESOURCE_NAMES, constructionRefund } from './data.js';
import { techNodeStates, currentSwordRate, TECHNOLOGIES, isKindUnlocked, isRecipeUnlocked } from './technology.js';
import { MARKET, SALE_RESOURCES, shipmentQuote } from './market.js';
import { resourceIcon, furnaceIcon } from './icons.js';
import { getGolemGuide } from './golem-guide.js';
import { getObjective } from './objectives.js';
import { hasBufferRoom } from './logistics-visuals.js';
import type { GuideStep } from './onboarding.js';
import type { Direction, GameState, Kind, Resource, TechId, RecipeId, Building } from './types.js';

export interface UICallbacks {
  onBuild(kind: Kind): void; onSpeed(speed: 0 | 1 | 2): void;
  onSave(): void; onLoad(): void; onRotate(): void; onRemove(): void;
  onUndoBuild(): void;
  onDispatch(source: 'inventory' | 'depot', resource: Resource, amount: number): void; onBuyIron(): void;
  onFeed(resource: Resource, amount: number): void; onCollect(resource?: Resource, amount?: number): void;
  onCancel(): void; onResetCamera(): void; onNew(): void;
  onGuideAction(): void; onGuideToggle(show?: boolean): void;
  onGolemGuideToggle(show?: boolean): void; onGolemGuideAction(action: NonNullable<ReturnType<typeof getGolemGuide>['action']>): void;
  onInspect?(id: number): void; onConfirmRemove(id: number): void; onCancelRemove(): void;
  onPortalConfig(channel: 1 | 2 | 3, role: 'send' | 'receive'): void;
  onGatherWood(): void; onRelayPolicy(policy: 'fuel' | 'materials'): void;
  onTechnologyToggle(show?: boolean): void; onResearch(id: TechId): void; onTrack(id: TechId | null): void; onRecipe(recipe: RecipeId): void;
}
export interface UIState {
  kind: Kind | null; recipe?: RecipeId; direction: Direction; selectedId: number | null; speed: 0 | 1 | 2; undoLabel?: string | null;
  power: { stored: number; capacity: number }; message: string; hover?: { x: number; z: number } | null; guide?: GuideStep | null; technologyOpen?: boolean; golemGuideOpen?: boolean; demolition?: Building | null;
}
const RESOURCE_LABELS = RESOURCE_NAMES;
const RESOURCES = Object.keys(RESOURCE_LABELS) as Resource[];
const TECH_IDS: TechId[] = TECHNOLOGIES.map(node => node.id);
const TECH_LABELS = Object.fromEntries(TECHNOLOGIES.map(node => [node.id, node.label])) as Record<TechId, string>;
const DIRECTIONS = ['北 ↑', '東 →', '南 ↓', '西 ←'];
const BUILDINGS = BUILDABLE_KINDS;
const ICONS: Record<Kind, string> = { miner: '⚒', belt: '→', smelter: '▰', generator: 'ϟ', wire: '⌁', lumber: '♣', delivery: '▣', splitter: '⑂', storage: '▤', crystalMiner: '◇', crystalRefiner: '◈', assembler: '⚔', runeCarver: '✧', frameForge: '□', golemForge: '♟', golemRelay: '⇄', alchemyLab: '⚗', portalForge: '◉', portalGate: '◎', seedLoom: '❋', worldTree: '♧' };
const DESCRIPTIONS: Record<Kind, string> = {
  miner: '鉱脈の上に設置。魔力2で鉄鉱石1を2秒で採掘。矢印へ排出。',
  belt: '矢印の先へ1個ずつ搬送。1区画0.5秒。ドラッグで連続配置。',
  smelter: '鉱石・魔晶原石を精製。製品レシピで鉄の延べ棒／精製魔晶を選択。素材は隣接から、製品は矢印へ。',
  generator: '浮いた結晶と支柱。木材1 → 魔力30（10秒、蓄積30）。魔力は導線へ供給し、ベルトへの完成品出力はありません。',
  wire: '隣り合う導線・魔力発生炉・採掘機・製錬炉を魔力網で接続。',
  lumber: '森林の上に設置。木材1を3秒で採取。矢印へ排出。',
  delivery: '搬入品を32個保持。詳細から確認して手動出荷。対象品を依頼へ優先し、余剰・手動資材は売却。資金で建設用の鉄を購入できます。',
  splitter: '前方と右側（時計回り90°）の2つの出力口へ交互に分岐。片方が詰まると空いた口へ送ります。',
  storage: '32品まで保管する収納箱。納品はしません。受け取った品を前方へ順に排出。回収後も出荷対象の由来を保持した品は、手持ちから手動出荷できます。',
  crystalMiner: '結晶鉱脈の上に設置。魔力2で魔晶原石1を2秒で採掘。',
  crystalRefiner: '魔晶原石を精製魔晶へ精製。魔力導線で供給し、レシピの素材を隣接設備から入力します。',
  assembler: '製品レシピで魔導剣・魔導核・鉄の躯体・ゴーレム・転送核を選択。各レシピは研究で解放。',
  runeCarver: '素材に魔導の印を刻み、魔導核を生産します。魔力導線でつなぎ、レシピを確認してください。',
  frameForge: '鉄の延べ棒から鉄の躯体を組み上げます。素材と魔力を供給してください。',
  golemForge: '鉄の躯体と魔導核からゴーレムを覚醒させます。完成したゴーレムを補給所へ搬送してください。',
  alchemyLab: '錬金精髄／世界樹の種を選択して合成。材料・加工時間・魔力はレシピごとに異なります。',
  portalForge: '錬金精髄などから転送核を作る工房です。転送核を使って転送門と世界樹への道を開きます。',
  portalGate: '同じ番号で送信門・受信門の2台を接続。送信は全隣接から入力し、1個につき魔力2を消費。受信門の魔力は不要です。',
  seedLoom: '世界樹の種を育てる工房。自動生産した種を転送門経由で世界樹へ届けましょう。',
  worldTree: '転送門を通った自動生産の世界樹の種だけが成長に使えます。10個を届けて世界樹を目覚めさせましょう。',
  golemRelay: 'ゴーレムを配置すると、半径6区画の収納箱から設備へ補給します。燃料補給か材料補給を選べます。',
};

const CATEGORIES: Record<string, { label: string; kinds: Kind[] }> = {
  all: { label: 'すべて', kinds: BUILDINGS },
  extraction: { label: '採取', kinds: ['miner', 'lumber', 'crystalMiner'] },
  logistics: { label: '物流', kinds: ['belt', 'splitter', 'storage', 'delivery', 'golemRelay', 'portalGate'] },
  magic: { label: '魔力', kinds: ['generator', 'wire'] },
  production: { label: '製造', kinds: ['smelter', 'assembler', 'alchemyLab', 'worldTree'] },
};
const PREFS_KEY = 'aigames-workshop-ui-v1';

export class GameUI {
  private quickSlots: Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'storage'];
  private category = 'all';
  private search = '';
  private golemAction: NonNullable<ReturnType<typeof getGolemGuide>['action']> | null = null;
  private demolitionId: number | null = null;
  private demolitionSubmitted = false;
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
        <div class="workshop-title">魔導からくり工房 <span id="wallet-count"></span><span id="objective-summary"><b id="objective-title"></b> <b id="objective-count"></b></span><span class="legacy-goal" title="鉄の延べ棒の累積自動納品"><i class="ingot-icon" aria-hidden="true"></i> 鉄の延べ棒 自動納品 <b id="delivered-count">0</b> / 100 <small class="goal-condition">自動生産品の出荷・100本は記念実績</small></span></div>
        <div class="resource-strip" aria-label="所持資源"><span title="所持 木材">木材 <b data-resource="wood">0</b></span><span title="所持 鉄鉱石">鉱石 <b data-resource="ore">0</b></span><span title="所持 鉄の延べ棒">延べ棒 <b data-resource="ingot">0</b></span><span title="所持 精製魔晶原石">原石 <b data-resource="rawCrystal">0</b></span><span title="所持 精製魔晶">魔晶 <b data-resource="crystal">0</b></span><span title="所持 魔導剣">魔導剣 <b data-resource="sword">0</b></span><span>魔力 <b id="power-count">0 / 0</b></span></div><button data-action="technology-open" class="technology-open">技術ツリー</button>
        <div class="time-controls" aria-label="時間速度"><button data-speed="0" aria-label="一時停止" title="一時停止（Space）">Ⅱ</button><button data-speed="1" aria-label="1倍速">1×</button><button data-speed="2" aria-label="2倍速">2×</button></div>
        <details class="game-menu"><summary aria-label="操作と保存メニュー">☰ <span>メニュー</span></summary><div class="menu-body"><button data-action="menu-close" class="menu-close">メニューを閉じる ×</button><div class="menu-actions"><button data-action="save">保存</button><button data-action="load">読込</button><button data-action="camera">視点を戻す</button><button data-action="new">新しい工房</button><button data-action="golem-guide-open">ゴーレムの使い方</button><button data-action="gather-wood" title="森林から木材1個を手採取。生産実績には算入しません。">木材を手採取</button><button data-action="guide-open">はじめての案内</button><button data-action="build-open">建設一覧を表示</button><button data-action="selection-open">設備詳細を表示</button><button data-action="help-close">操作説明を閉じる</button></div><details id="main-help"><summary>操作方法・つくり方</summary><div class="help-text"><p>鉱脈に採掘機 → ベルト → 製錬炉 → ベルト → 出荷所をつなごう。魔力発生炉と機械は魔力導線で接続。魔力発生炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 製錬炉 (14,16) → ベルト (15,16) → 出荷所 (16,16)。全て東向き。<br>魔力発生炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力発生炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力発生炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>1本指タップ（離した時）: 配置 / 選択<br>2本指: 地図移動・ピンチ拡縮<br>1本指ドラッグは配置しません。マウス左ドラッグ: ベルト連続敷設<br>↶ 配置取消 / Ctrl・⌘ Z: 未稼働の配置を全額取消<br>既存ベルトも撤去で木材1・鉄1を全額回収<br>左クリック: 配置 / 選択<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去確認、Delete: 選択設備の撤去確認<br>Esc: 建設取消・撤去のキャンセル<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>出荷所は木材・鉄の延べ棒・魔導剣を32個まで保持します。詳細で出荷元・品物・個数を選び、見積もりを確認して手動出荷します。自動生産品は依頼へ優先、余剰は売却。購入品・初期資材は売却のみです。自動生産品を回収した後も、対象の由来が残る品は手持ちから出荷できます。魔力切れは木材の手動補給で復旧できます。木材が0なら、メニューの「木材を手採取」で1個ずつ採れます。保存はこのブラウザの1スロットです。</p><button data-action="help-close">操作説明を閉じる ×</button></div></details></div></details>
      </header>
      <button id="tracked-goal" class="tracked-goal" data-action="technology-open" hidden></button>
      <aside id="golem-guide" class="golem-guide" hidden aria-label="ゴーレムの使い方"><div class="golem-guide-heading"><h2>ゴーレムの使い方</h2><button data-action="golem-guide-close">閉じる ×</button></div><p id="golem-guide-progress"></p><h3 id="golem-guide-title"></h3><p id="golem-guide-detail"></p><button data-action="golem-guide-action">次の操作へ</button><ul id="golem-guide-blockers"></ul></aside>
      <dialog id="demolition-dialog" aria-labelledby="demolition-title" aria-describedby="demolition-summary"><h2 id="demolition-title">設備を撤去しますか？</h2><p id="demolition-target"></p><p id="demolition-summary"></p><small>回収した中身は手動扱いになります。消費済みの燃料・魔力・世界樹の成長は戻りません。</small><div class="demolition-actions"><button data-action="remove-cancel" autofocus>キャンセル</button><button data-action="remove-confirm" class="danger">撤去する</button></div></dialog>
      <section id="technology-panel" class="technology-panel" hidden aria-label="技術ツリー">
        <div class="technology-heading"><div><h2>技術ツリー</h2><p>自動生産の実績で解放。研究に素材の支払いは不要です。</p></div><button data-action="technology-close">閉じる ×</button></div>
        <p class="technology-path">基礎 → 物流 ＋ 魔晶 → 組立 → ゴーレム → 錬金 → 転送 → 世界樹</p><p id="sword-rate"></p>
        <div class="technology-map"></div><p class="future-tech">世界樹: 自動生産した世界樹の種を転送門経由で10個届けます。途中の技術を研究しながら工房を拡張しましょう。</p>
      </section>
      <aside id="guide-card" class="guide-card" hidden aria-label="はじめての工房づくり">
        <div class="guide-heading"><span id="guide-objective">鉄10本を出荷して結晶加工へ</span><button data-action="guide-close" aria-label="案内を閉じる">案内を閉じる</button></div>
        <div id="guide-progress" class="guide-progress"></div><h2 id="guide-title"></h2><button data-action="guide-action" class="guide-action">この設備を選ぶ</button><p id="guide-text"></p>
        <p id="guide-step-target" class="guide-target"></p><p id="guide-instruction"></p>
        <ul id="guide-blockers" class="guide-blockers"></ul><details id="guide-check-details"><summary id="guide-check-summary">組立チェック</summary><ul id="guide-checks" class="guide-checks"></ul></details><p id="guide-feedback" class="guide-feedback" role="status" aria-live="polite" hidden></p><small class="guide-next">条件を満たすと、次の案内へ進みます。</small>
      </aside>
      <div class="workshop-notices"><p id="game-message" role="status" aria-live="polite">鉱脈に採掘機を建て、工房を動かそう。</p><p id="victory-message" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>
      <aside id="selection-panel" class="selection-panel" hidden aria-label="設備の詳細">
        <div class="selection-heading"><button class="panel-close" data-action="close-panel" aria-label="設備詳細を閉じる">×</button><h2 id="selection-title"></h2></div><p id="selection-description"></p><div id="furnace-role" class="furnace-role" hidden></div>
        <div id="facility-feed-slots" class="facility-feed-slots"></div><div id="portal-controls" hidden><div class="portal-channels" aria-label="転送門の接続番号"><button data-portal-channel="1">接続1</button><button data-portal-channel="2">接続2</button><button data-portal-channel="3">接続3</button></div><div class="portal-roles"><button data-portal-role="send">送信門</button><button data-portal-role="receive">受信門</button></div><p id="portal-pair"></p><p id="portal-state"></p></div><div id="tree-controls" hidden><label>世界樹の成長 <progress id="tree-growth" max="10" value="0"></progress></label><p id="tree-growth-text"></p><small>自動生産し、手で回収せず、転送門を通して届いた世界樹の種が対象です。</small></div><div id="relay-controls" hidden><p id="relay-worker"></p><div class="relay-policies"><button data-relay-policy="fuel">♣ 燃料補給</button><button data-relay-policy="materials">◇ 材料補給</button></div><p id="relay-transfers"></p><p id="relay-route"></p><div id="relay-inspections"><button data-action="relay-source">収納箱を見る</button><button data-action="relay-target">補給先を見る</button></div><button data-action="golem-guide-open">運用の案内を見る</button><small>収納箱と補給先は半径6区画。燃料補給20回で自律工房の実績を達成。</small></div><section id="shipping-controls" hidden><h3>手動出荷</h3><p>搬入だけでは消費しません。対象品は依頼へ優先、余剰は売却します。</p><p id="shipping-quests"></p><button data-action="technology-open">研究条件・解放内容を見る</button><p id="shipping-stock"></p><div class="shipping-fields"><label>出荷元<select id="shipping-source"><option value="depot">搬入庫</option><option value="inventory">手持ち</option></select></label><label>品物<select id="shipping-resource"><option value="ingot">鉄の延べ棒</option><option value="wood">木材</option><option value="sword">魔導剣</option></select></label><label>個数<input id="shipping-amount" type="number" min="1" max="1000" value="1"></label></div><p id="shipping-quote" role="status"></p><button data-action="dispatch">確認して出荷</button><button data-action="dispatch-all">この品をまとめて出荷</button><p id="shipping-wallet"></p><button data-action="buy-iron">建設用の延べ棒を1個購入</button><button data-action="gather-wood">木材を手採取（無料）</button><small>初期・購入品は売却のみ。木材を手採取→売却で、資金0から鉄を買えます。出荷・売却後は品を消費します。</small></section><div id="delivery-summary" hidden></div><div id="recipe-controls" hidden><label>生産レシピ<select id="recipe-select"></select></label><p id="recipe-lock-reason"></p></div><div id="storage-controls" hidden><p id="storage-capacity"></p><div class="transfer-toolbar"><span>移動する個数</span><button data-transfer-mode="one" aria-pressed="true">1個</button><button data-transfer-mode="all" aria-pressed="false">全量</button></div><div class="chest-transfer"><section><h3>手持ち <span>→</span></h3><div id="inventory-slots" class="item-slots"></div><button data-action="deposit-all">まとめて預ける</button></section><section><h3>収納箱 <span>←</span></h3><div id="chest-slots" class="item-slots"></div><button data-action="withdraw-all">まとめて取り出す</button></section></div><p class="transfer-hint">クリックで1個、Shift＋クリックで全量。キーボードのEnterでも移動できます。取り出した品は手動扱いになります。</p><details id="advanced-collect"><summary>品目と個数を指定</summary><ul id="storage-items"></ul><label>取り出す品<select id="collect-resource"></select></label><label>個数<input id="collect-amount" type="number" min="1" max="32" value="1" step="1"></label><button data-action="collect-count">選んだ品を取り出す</button></details></div><dl><div><dt>稼働状態</dt><dd id="selection-status"></dd></div><div><dt>入出力・方向</dt><dd id="selection-direction"></dd></div><div><dt>内部の資源</dt><dd id="selection-buffer"></dd></div><div><dt>作業進捗</dt><dd id="selection-progress"></dd></div><div><dt>蓄積魔力</dt><dd id="selection-power"></dd></div></dl>
        <div class="selection-actions"><button data-action="rotate">回転 R</button><button data-action="collect">資源を回収</button><button data-action="remove" class="danger">撤去</button></div>
        <details id="advanced-feed"><summary>個数を指定して補給</summary><form id="feed-form"><label>手動補給<select id="feed-resource"><option value="wood">木材</option><option value="ore">鉄鉱石</option><option value="ingot">鉄の延べ棒</option><option value="rawCrystal">魔晶原石</option><option value="crystal">精製魔晶</option><option value="sword">魔導剣</option></select></label><label>個数<input id="feed-amount" type="number" min="1" max="1000" step="1" value="1" inputmode="numeric"></label><button type="submit" data-action="feed">補給する</button><small>手動の鉱石・延べ棒・精製魔晶等は目標に含めません。木材燃料は手動補給できます。</small></form></details>
      </aside>
      <nav id="quickbar" class="quickbar" aria-label="登録した建設設備"><button id="build-reopen" data-action="build-open">建設一覧</button><div id="quick-slots"></div><label id="build-recipe-control" hidden>製品<select id="build-recipe-select" aria-label="配置する機械の製品レシピ"></select></label><button data-action="undo-build" class="undo-build" disabled>↶<span>配置取消</span></button><button data-action="golem-guide-open" class="quick-golem-guide" aria-label="ゴーレムの使い方">♟？</button><button data-action="rotate" aria-label="建設方向を回転">↻</button><button data-action="cancel" aria-label="建設を取り消す">×</button></nav>
      <footer class="build-dock" hidden><div class="build-context"><span id="build-context">建設する設備を選ぶ</span><button data-action="rotate" aria-label="建設方向を回転">↻ R</button><button data-action="cancel">取消 Esc</button><button data-action="build-close" aria-label="建設一覧を閉じる">閉じる ×</button></div><label class="catalog-search">設備を探す<input id="build-search" type="search" placeholder="名前・素材・用途で検索" autocomplete="off"></label><p id="catalog-suggestion"></p><nav id="build-categories" aria-label="設備のカテゴリー"></nav><div class="registration-hint"><span id="registration-label">登録先 1</span><div id="registration-buttons" aria-label="クイックスロット登録先"></div><details class="registration-advanced"><summary>番号指定</summary><select id="registration-slot" aria-label="登録先クイックスロット"></select></details><small>番号を選び、設備の☆で登録 · キー1〜6で選択</small></div><nav class="build-palette" aria-label="建設する設備"></nav></footer>`;
    const palette = this.node('.build-palette');
    for (const kind of BUILDINGS) {
      const definition = DEFINITIONS[kind];
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.build = kind; button.setAttribute('aria-pressed', 'false');
      const cost = this.costLabel(kind);
      button.title = `${definition.label} — ${DESCRIPTIONS[kind]} 建設費: ${cost}`;
      const icon = document.createElement('span'); icon.className = 'build-icon'; icon.innerHTML = furnaceIcon(kind) || ICONS[kind]; icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'build-name'; name.textContent = definition.label;
      const lock = document.createElement('small'); lock.className = 'build-lock-reason';
      const amount = document.createElement('small'); amount.className = 'build-cost'; amount.textContent = cost;
      button.append(icon, name, amount, lock);
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
    if (button.dataset.register) { this.quickSlots[this.registerSlot] = button.dataset.register as Kind; this.savePreferences(); this.refreshQuickSlots(); this.refreshRegistration(); return; }
    if (button.dataset.registerSlot !== undefined) { this.registerSlot = Number(button.dataset.registerSlot); this.refreshRegistration(); return; }
    if (button.dataset.portalChannel) { const selected = this.currentSelected; if (selected) this.callbacks.onPortalConfig(Number(button.dataset.portalChannel) as 1|2|3, selected.portalRole ?? 'send'); return; }
    if (button.dataset.portalRole) { const selected = this.currentSelected; if (selected) this.callbacks.onPortalConfig(selected.portalChannel ?? 1, button.dataset.portalRole as 'send'|'receive'); return; }
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
    if (action === 'dispatch' || action === 'dispatch-all') { const values = this.shippingValues(); this.callbacks.onDispatch(values.source, values.resource, action === 'dispatch-all' ? Math.min(1000, values.available) : values.amount); return; }
    if (action === 'buy-iron') { this.callbacks.onBuyIron(); return; }
    if (action === 'save') this.callbacks.onSave();
    else if (action === 'load') this.callbacks.onLoad();
    else if (action === 'new') this.callbacks.onNew();
    else if (action === 'technology-open' || action === 'technology-close') { this.callbacks.onTechnologyToggle(action === 'technology-open'); (this.node('.game-menu') as HTMLDetailsElement).open = false; }
    else if (action === 'gather-wood') this.callbacks.onGatherWood();
    else if (action === 'golem-guide-open' || action === 'golem-guide-close') this.callbacks.onGolemGuideToggle(action === 'golem-guide-open');
    else if (action === 'golem-guide-action' && this.golemAction) this.callbacks.onGolemGuideAction(this.golemAction);
    else if (action === 'relay-source' && this.currentSelected?.golemRoute) this.callbacks.onInspect?.(this.currentSelected.golemRoute.sourceId);
    else if (action === 'relay-target' && this.currentSelected?.golemRoute) this.callbacks.onInspect?.(this.currentSelected.golemRoute.targetId);
    else if (action === 'remove-cancel') this.callbacks.onCancelRemove();
    else if (action === 'remove-confirm' && this.demolitionId !== null && !this.demolitionSubmitted) { this.demolitionSubmitted = true; button.disabled = true; this.callbacks.onConfirmRemove(this.demolitionId); }
    else if (action === 'menu-close') (this.node('.game-menu') as HTMLDetailsElement).open = false;
    else if (action === 'help-close') (this.node('#main-help') as HTMLDetailsElement).open = false;
    else if (action === 'build-open' || action === 'build-close') { if (action === 'build-open') { this.category = 'all'; this.search = ''; (this.node('#build-search') as HTMLInputElement).value = ''; this.filterPalette(); } this.node('.build-dock').hidden = action === 'build-close'; this.node('#build-reopen').setAttribute('aria-expanded', String(action === 'build-open')); if (action === 'build-close') this.callbacks.onCancel(); }
    else if (action === 'selection-open') { const panel = this.node('#selection-panel'); if (this.lastSelected !== null) { panel.hidden = false; panel.classList.remove('is-collapsed'); const close = this.node('[data-action="close-panel"]'); close.textContent = '×'; close.setAttribute('aria-label', '設備詳細を閉じる'); } }
    else if (action === 'deposit-all') this.depositAll();
    else if (action === 'withdraw-all') this.callbacks.onCollect();
    else if (action === 'collect-count') { const resource = (this.node('#collect-resource') as HTMLSelectElement).value as Resource; const amount = Number((this.node('#collect-amount') as HTMLInputElement).value); if (Number.isSafeInteger(amount) && amount > 0 && amount <= 32) this.callbacks.onCollect(resource, amount); }
    else if (action === 'camera') this.callbacks.onResetCamera();
    else if (action === 'rotate') this.callbacks.onRotate();
    else if (action === 'remove') this.callbacks.onRemove();
    else if (action === 'undo-build') this.callbacks.onUndoBuild();
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
    const labels = { ship: '出荷所の詳細を開く', recipe: '鉄のレシピへ切替', build: 'この設備を選ぶ', rotate: '設備の詳細を開く', feed: '設備の詳細を開く', run: '1×で動かす', done: '自由建設へ' };
    this.text('[data-action="guide-action"]', labels[guide.mode]);
    const instructions = {
      ship: '出荷所の詳細で搬入庫・鉄の延べ棒を選び、確認して出荷してください。',
      recipe: '稼働中・互換性のない在庫がある時は終了と排出を待って、鉄の延べ棒に切り替えます。',
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
    this.text('#wallet-count', `◉ ${state.market?.coins ?? 0}`);
    this.updateBuildRecipes(state, view);
    const undo = this.node('[data-action="undo-build"]') as HTMLButtonElement;
    undo.disabled = !view.undoLabel || this.isWorldInputBlocked();
    undo.title = view.undoLabel ? `${view.undoLabel}の未稼働の配置を全額取消（Ctrl / ⌘ Z）。使用後・読込後は対象外` : '取り消せる未稼働の配置なし。既存ベルトは確認付き撤去で木材・鉄を全額回収できます';
    undo.setAttribute('aria-label', view.undoLabel ? `${view.undoLabel}の配置を取り消す（全額返却）` : '未稼働の配置を取り消す');
    this.updateGuide(view.guide ?? null);
    this.updateTechnology(state, !!view.technologyOpen);
    this.updateGolemGuide(state, !!view.golemGuideOpen); this.updateDemolition(view.demolition ?? null);
    const feedback = !!view.guide && /保存|読込|読み込|再開しました|WebGL|表示でき|できません|不正|素材を補給しました|手採取|取り消|返却|未稼働|出荷|購入|解放|資金/.test(view.message);
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
      const kits = Object.entries(state.kits).reduce((sum, [key, value]) => sum + (commonKind(key as Kind) === kind ? value ?? 0 : 0), 0);
      const cost = button.querySelector('.build-cost')!; const label = kits > 0 ? `所持 ${kits}台 / ${this.costLabel(kind)}` : this.costLabel(kind);
      if (cost.textContent !== label) cost.textContent = label;
      const affordable = kits > 0 || Object.entries(DEFINITIONS[kind].cost).every(([resource, amount]) => (state.inventory[resource as Resource] ?? 0) >= amount!);
      const unlocked = isKindUnlocked(state, kind);
      button.classList.toggle('unaffordable', !affordable); button.classList.toggle('tech-locked', !unlocked);
      const requirement = DEFINITIONS[kind].technology;
      button.title = `${DESCRIPTIONS[kind]} 建設費: ${this.costLabel(kind)}${!unlocked && requirement ? ` · 未解放: ${TECH_LABELS[requirement]}の研究が必要。技術ツリーで条件を確認。` : ''}`;
      button.querySelector('.build-lock-reason')!.textContent = !unlocked && requirement ? `未解放 · ${TECH_LABELS[requirement]}` : (affordable ? '建設可能' : '素材不足');
      button.setAttribute('aria-label', `${DEFINITIONS[kind].label}、${label}${unlocked ? '' : '、技術未解放'}${affordable ? '' : '、資源不足'}`);
    }
    this.updateCatalogRecommendations(state); this.filterPalette();
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
        select.value = selected.kind === 'generator' ? 'wood' : selected.kind === 'golemRelay' ? 'golem' : selected.recipe ? Object.keys(RECIPES[selected.recipe].input)[0] : 'ingot';
      }
      this.text('#selection-title', `${DEFINITIONS[selected.kind].label}${selected.recipe ? ` · ${RECIPES[selected.recipe].label}` : ''} (${selected.x}, ${selected.z})`);
      this.text('#selection-description', DESCRIPTIONS[selected.kind]);
      const role = this.node('#furnace-role'); role.hidden = selected.kind !== 'smelter' && selected.kind !== 'generator';
      if (!role.hidden && role.dataset.kind !== `${selected.kind}:${selected.recipe ?? ''}`) {
        role.dataset.kind = `${selected.kind}:${selected.recipe ?? ''}`;
        role.innerHTML = selected.kind === 'smelter' ? `${furnaceIcon('smelter')}<span>${Object.entries(RECIPES[selected.recipe ?? 'ingot'].input).map(([r,n]) => `${resourceIcon(r as Resource)} ${RESOURCE_LABELS[r as Resource]}${n}`).join('＋')} ＋ 魔力${RECIPES[selected.recipe ?? 'ingot'].energy}<br>↓ ${RECIPES[selected.recipe ?? 'ingot'].label}1 → ベルト</span>` : `${furnaceIcon('generator')}<span>${resourceIcon('wood')} 木材1<br>↓ ϟ 魔力30 → 導線<br><small>ベルトへの物品出力なし</small></span>`;
      }

      this.text('#selection-status', (selected.status || (selected.working ? '稼働中' : '待機中')).replaceAll('魔導炉', '製錬炉').replaceAll('魔力炉', '魔力発生炉'));
      this.text('#selection-direction', selected.kind === 'generator' ? '木材は隣接から · 魔力は導線網' : selected.kind === 'wire' ? '直交接続（方向なし）' : selected.kind === 'golemRelay' ? '半径6区画（方向なし）' : selected.kind === 'worldTree' ? '種を隣接から受け入れ（出力なし）' : selected.kind === 'portalGate' ? (selected.portalRole === 'receive' ? `受信門 · 出力 ${DIRECTIONS[selected.direction]}` : '送信門 · 全隣接から入力（通常出力なし）') : selected.kind === 'delivery' ? '全隣接から受け入れ（出力なし）' : `${DIRECTIONS[selected.direction]}${selected.kind === 'splitter' ? ` / 右側 ${DIRECTIONS[(selected.direction + 1) % 4]}` : ''} · 入力は隣接から`);
      const counts = Object.fromEntries(RESOURCES.map(resource => [resource, 0])) as Record<Resource, number>;
      [...selected.input, ...selected.output, ...(selected.reserved ?? []), ...(selected.item ? [selected.item] : [])].forEach(item => counts[item.resource]++);
      this.text('#selection-buffer', Object.entries(counts).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]} ${amount}`).join('、') || 'なし');
      this.updateSelectedSystems(state, selected);
      const duration = selected.recipe ? RECIPES[selected.recipe].seconds : DEFINITIONS[selected.kind].seconds;
      this.text('#selection-progress', (selected.kind === 'belt' || selected.kind === 'splitter') ? `${Math.round(selected.beltProgress / BELT_SECONDS * 100)}%` : `${selected.progress.toFixed(1)}秒${duration ? ` / ${duration}秒` : ''}`);
      this.text('#selection-power', `${Math.floor(selected.energy)}${selected.pendingEnergy ? ` · 内部完成 ${selected.pendingEnergy}` : ''}`);
      this.node('#advanced-feed').hidden = selected.kind === 'delivery' || !['generator', 'smelter', 'delivery', 'storage', 'splitter', 'belt', 'crystalRefiner', 'assembler', 'runeCarver', 'frameForge', 'golemForge', 'golemRelay', 'alchemyLab', 'portalForge', 'portalGate', 'seedLoom', 'worldTree'].includes(selected.kind);
    }
    if (selected && view.guide && ['feed', 'rotate', 'ship', 'recipe'].includes(this.previousGuideMode ?? '') && !['feed', 'rotate', 'ship', 'recipe'].includes(view.guide.mode)) {
      panel.classList.add('is-collapsed'); const close = this.node('[data-action="close-panel"]'); close.textContent = '+'; close.setAttribute('aria-label', '設備詳細を開く');
    }
    this.root.classList.toggle('expanded-selection', !!selected && !panel.hidden && !panel.classList.contains('is-collapsed'));
    this.previousGuideMode = view.guide?.mode ?? null;
    this.lastSelected = view.selectedId;
  }
  searchCatalog(): void { this.search = (this.node('#build-search') as HTMLInputElement).value.trim().toLocaleLowerCase(); if (this.search) this.category = 'all'; this.filterPalette(); }
  private refreshRegistration(): void {
    this.text('#registration-label', `登録先 ${this.registerSlot + 1}`);
    (this.node('#registration-slot') as HTMLSelectElement).value = String(this.registerSlot);
    this.node('#registration-buttons').querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const index = Number(button.dataset.registerSlot); button.setAttribute('aria-pressed', String(index === this.registerSlot));
      button.title = `${index + 1}: ${DEFINITIONS[this.quickSlots[index]].label} · この枠へ☆で登録`;
      button.setAttribute('aria-label', `登録先 ${index + 1}: ${DEFINITIONS[this.quickSlots[index]].label}`);
    });
  }
  private updateCatalogRecommendations(state: GameState): void {
    const objective = getObjective(state);
    const next = techNodeStates(state).find(node => node.status !== 'unlocked');
    const needed = new Set<Kind>(next?.unlocks.kinds ?? []);
    for (const kind of BUILDINGS) if (objective.resource && ((DEFINITIONS[kind].output?.[objective.resource] ?? 0) > 0 || DEFINITIONS[kind].recipes?.some(recipe => (RECIPES[recipe].output[objective.resource!] ?? 0) > 0))) needed.add(kind);
    this.text('#catalog-suggestion', `次の目標: ${objective.title} · おすすめの設備に◆印`);
    for (const kind of BUILDINGS) {
      const tile = this.node(`[data-build-tile="${kind}"]`); const recommended = needed.has(kind);
      tile.classList.toggle('recommended', recommended); tile.style.order = String(recommended ? 0 : isKindUnlocked(state, kind) ? 1 : 2);
      tile.dataset.recommended = String(recommended);
    }
  }
  private updateGolemGuide(state: GameState, open: boolean): void {
    this.node('#golem-guide').hidden = !open;
    const guide = getGolemGuide(state); this.golemAction = guide.action;
    this.text('#golem-guide-progress', `${guide.step} / ${guide.total}`); this.text('#golem-guide-title', guide.title); this.text('#golem-guide-detail', guide.detail);
    const button = this.node('[data-action="golem-guide-action"]') as HTMLButtonElement;
    button.hidden = !guide.action; button.disabled = !guide.action;
    button.textContent = guide.action?.type === 'technology' ? '技術ツリーを開く' : guide.action?.type === 'build' ? `${DEFINITIONS[guide.action.kind!].label}を選ぶ` : guide.action?.type === 'inspect' ? '対象の設備を確認' : '1×で動かす';
    const list = this.node('#golem-guide-blockers'); const text = guide.blockers.slice(0, 3).join('\n');
    if (list.dataset.value !== text) { list.dataset.value = text; list.replaceChildren(); for (const blocker of guide.blockers.slice(0, 3)) { const li = document.createElement('li'); li.textContent = blocker; list.append(li); } }
  }
  private updateDemolition(building: Building | null): void {
    const dialog = this.node('#demolition-dialog') as HTMLDialogElement;
    if (!building) { this.demolitionId = null; this.demolitionSubmitted = false; if (dialog.open) dialog.close(); return; }
    const changed = this.demolitionId !== building.id;
    if (changed) { this.demolitionId = building.id; this.demolitionSubmitted = false; }
    const reserved = building.kind === 'generator' && (building.pendingEnergy ?? 0) > 0 ? [] : building.reserved ?? [];
    const contents = [...building.input, ...building.output, ...reserved, ...(building.item ? [building.item] : []), ...(building.golemWorker ? [building.golemWorker] : [])];
    const refund = constructionRefund(building.kind, building.constructionCost);
    const resources = Object.fromEntries(RESOURCES.map(resource => [resource, refund[resource] ?? 0])) as Record<Resource, number>;
    for (const item of contents) resources[item.resource]++;
    const summary = RESOURCES.filter(resource => resources[resource]).map(resource => `${RESOURCE_LABELS[resource]} ${resources[resource]}`).join('、') || '回収できる資源はありません';
    this.text('#demolition-target', `${ICONS[building.kind]} ${DEFINITIONS[building.kind].label} (${building.x}, ${building.z})`);
    this.text('#demolition-summary', `撤去すると${building.kind === 'belt' ? 'ベルトの建設素材は全額' : '建設素材の半分（切り捨て）'}と現在の中身を回収します。回収予定: ${summary}。${building.golemWorker ? '配置中のゴーレムも回収します。' : ''}`);
    (this.node('[data-action="remove-confirm"]') as HTMLButtonElement).disabled = this.demolitionSubmitted;
    if (!dialog.open) { dialog.showModal(); this.node('[data-action="remove-cancel"]').focus(); }
  }
  cancelDemolition(event: Event): void { event.preventDefault(); this.callbacks.onCancelRemove(); }
  private loadPreferences(): void {
    try {
      const value = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      if (!value || value.version !== 1) return;
      if (Array.isArray(value.quickSlots) && value.quickSlots.length === 6 && value.quickSlots.every((kind: unknown) => typeof kind === 'string' && Object.hasOwn(DEFINITIONS, kind))) this.quickSlots = value.quickSlots.map(commonKind);
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
    for (let index = 0; index < 6; index++) { const button = document.createElement('button'); button.type = 'button'; button.dataset.registerSlot = String(index); button.textContent = String(index + 1); this.node('#registration-buttons').append(button); }
    this.refreshQuickSlots(); this.refreshRegistration(); this.filterPalette(); this.refreshTransferMode();
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
    this.quickSlots = this.quickSlots.map(commonKind);
    const host = this.node('#quick-slots');
    // Only registration changes this DOM; simulation ticks keep buttons and focus intact.
    host.replaceChildren();
    this.quickSlots.forEach((kind, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.quick = String(index); button.className = 'quick-slot';
      button.innerHTML = `<small>${index + 1}</small><span class="quick-icon" aria-hidden="true">${furnaceIcon(kind) || ICONS[kind]}</span><span class="quick-name"></span><span class="quick-lock" hidden>🔒</span><span class="quick-cost"></span>`;
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
    this.node('.build-palette').querySelectorAll<HTMLElement>('[data-build-tile]').forEach(tile => {
      const kind = tile.dataset.buildTile as Kind; const alias = kind === 'smelter' ? '魔導炉' : kind === 'generator' ? '魔力炉' : '';
      const text = `${DEFINITIONS[kind].label} ${alias} ${DESCRIPTIONS[kind]} ${this.costLabel(kind)} ${TECH_LABELS[DEFINITIONS[kind].technology ?? 'basic']}`.toLocaleLowerCase();
      tile.hidden = !CATEGORIES[this.category].kinds.includes(kind) || !text.includes(this.search);
    });
  }
  registrationChange(): void { this.registerSlot = Number((this.node('#registration-slot') as HTMLSelectElement).value); this.refreshRegistration(); }
  chooseQuickSlot(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.quickSlots.length) return;
    this.node('.build-dock').hidden = true;
    if (!this.node('#technology-panel').hidden) this.callbacks.onTechnologyToggle(false);
    this.callbacks.onBuild(this.quickSlots[index]);
  }
  isWorldInputBlocked(): boolean { return (this.node('#demolition-dialog') as HTMLDialogElement).open || !this.node('.build-dock').hidden || !this.node('#technology-panel').hidden || !this.node('#golem-guide').hidden; }
  openSelection(): void { this.node('#selection-panel').hidden = false; this.node('#selection-panel').classList.remove('is-collapsed'); const button = this.node('[data-action="close-panel"]'); button.textContent = '×'; button.setAttribute('aria-label', '設備詳細を閉じる'); }
  closeOverlay(): boolean {
    if ((this.node('#demolition-dialog') as HTMLDialogElement).open) { this.callbacks.onCancelRemove(); return true; }
    if (!this.node('#golem-guide').hidden) { this.callbacks.onGolemGuideToggle(false); return true; }
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
        button.title = `${RESOURCE_LABELS[resource]} ${count}個 · ${label} · ${origin}。Shiftで全量。回収した対象品は手持ちから出荷できます。材料として再投入すると自動生産実績の対象外になります。`;
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
    const feedResources = selected.kind === 'golemRelay' ? ['golem'] : selected.kind === 'delivery' ? [] : Object.keys(recipeId ? RECIPES[recipeId].input : DEFINITIONS[selected.kind].input ?? {});
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
      const route = selected.golemRoute;
      const source = route ? state.buildings.find(building => building.id === route.sourceId) : null; const target = route ? state.buildings.find(building => building.id === route.targetId) : null;
      this.node('#relay-inspections').hidden = !route;
      this.text('#relay-route', `${selected.status} · 次の作業 ${(Math.max(0, selected.golemCooldown ?? 0) * 0.05).toFixed(1)}秒${route ? ` · 前回 ${RESOURCE_LABELS[route.resource]}: ${source ? `収納箱(${source.x},${source.z})` : '#'+route.sourceId} → ${target ? `${DEFINITIONS[target.kind].label}(${target.x},${target.z})` : '#'+route.targetId}` : ' · まだ補給していません'}`);
      this.text('#relay-transfers', `工房全体の補給 ${state.stats?.golemTransfers ?? 0}回 · 木材 ${state.stats?.golemFuelTransfers ?? 0} / 20回`);
      this.node('#relay-controls').querySelectorAll<HTMLButtonElement>('[data-relay-policy]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.relayPolicy === (selected.golemPolicy ?? 'fuel'))));
    }
    this.node('#portal-controls').hidden = selected.kind !== 'portalGate';
    if (selected.kind === 'portalGate') {
      const channel = selected.portalChannel ?? 1, role = selected.portalRole ?? 'send';
      this.node('#portal-controls').querySelectorAll<HTMLButtonElement>('[data-portal-channel]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.portalChannel) === channel)));
      this.node('#portal-controls').querySelectorAll<HTMLButtonElement>('[data-portal-role]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.portalRole === role)));
      const peers = state.buildings.filter(building => building.kind === 'portalGate' && building.id !== selected.id && (building.portalChannel ?? 1) === channel && (building.portalRole ?? 'send') !== role).sort((a,b) => a.id-b.id);
      this.text('#portal-pair', peers.length ? `接続${channel}の相手: ${peers.map(building => `(${building.x}, ${building.z})`).join('・')}` : `接続${channel}の${role === 'send' ? '受信門' : '送信門'}がありません`);
      this.text('#portal-state', `${selected.status} · 入力 ${selected.input.length} / 出力 ${selected.output.length} · 次の転送 ${(Math.max(0, selected.portalCooldown ?? 0)*0.05).toFixed(1)}秒。魔力は導線で供給。`);
    }
    this.node('#tree-controls').hidden = selected.kind !== 'worldTree';
    if (selected.kind === 'worldTree') {
      const growth = selected.treeGrowth ?? 0; (this.node('#tree-growth') as HTMLProgressElement).value = growth;
      const eligible = selected.input.filter(item => item.resource === 'worldSeed' && item.automated && !item.handled && item.throughPortal).length;
      this.text('#tree-growth-text', growth >= 10 ? `成長完了 10 / 10 · 余剰の種 ${selected.input.length}個は回収できます。` : `成長 ${growth} / 10 · 対象の種 ${eligible}個 · ${selected.status}`);
    }
    this.updateShipping(state, selected);
    this.node('#delivery-summary').hidden = selected.kind !== 'delivery';
    if (selected.kind === 'delivery') this.text('#delivery-summary', `自動生産品の累計出荷: 鉄 ${state.delivered}本 · 剣 ${state.stats?.delivered.sword ?? 0}本。鉄100本は記念実績です。`);
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
      select.disabled = selected.working || !!selected.reserved?.length;
      const current = RECIPES[(selected.recipe ?? recipes[0])];
      const locked = recipes.filter(recipe => !isRecipeUnlocked(state, recipe));
      this.text('#recipe-lock-reason', `${Object.entries(current.input).map(([resource, amount]) => `${RESOURCE_LABELS[resource as Resource]}${amount}`).join('＋')} → ${current.label} / ${current.seconds}秒・魔力${current.energy}${locked.length ? `。未解放: ${locked.map(recipe => `${RECIPES[recipe].label}は${TECH_LABELS[RECIPES[recipe].technology]}の研究が必要`).join('・')}` : ''}。稼働中・互換性のない在庫がある時は変更できません。`);
    }
  }
  researchReward(id: TechId): string {
    const tech = TECHNOLOGIES.find(node => node.id === id)!;
    return [...tech.unlocks.kinds.map(kind => DEFINITIONS[kind].label), ...tech.unlocks.recipes.map(recipe => `${RECIPES[recipe].label}レシピ`)].join('・') || '次の研究へ進めます';
  }
  private updateBuildRecipes(state: GameState, view: UIState): void {
    const recipes = view.kind ? DEFINITIONS[view.kind].recipes ?? [] : [];
    this.node('#build-recipe-control').hidden = !recipes.length;
    const select = this.node('#build-recipe-select') as HTMLSelectElement;
    const key = `${view.kind}:${state.research?.unlocked.join(',')}`;
    if (select.dataset.key !== key) {
      select.dataset.key = key; select.replaceChildren();
      for (const recipe of recipes) { const option = document.createElement('option'); option.value = recipe; option.disabled = !isRecipeUnlocked(state, recipe); option.textContent = `${RECIPES[recipe].label}${option.disabled ? '（未解放）' : ''}`; select.append(option); }
    }
    if (view.recipe) select.value = view.recipe;
  }
  private shippingValues() {
    const source = (this.node('#shipping-source') as HTMLSelectElement).value as 'inventory' | 'depot';
    const resource = (this.node('#shipping-resource') as HTMLSelectElement).value as Resource;
    const amount = Number((this.node('#shipping-amount') as HTMLInputElement).value);
    const items = source === 'depot' ? this.currentSelected?.input.filter(item => item.resource === resource) ?? [] : this.currentState?.inventoryItems?.filter(item => item.resource === resource) ?? [];
    const available = source === 'depot' ? items.length : this.currentState?.inventory[resource] ?? 0;
    return { source, resource, amount, items, available };
  }
  refreshShipping(): void { if (this.currentState && this.currentSelected) this.updateShipping(this.currentState, this.currentSelected); }
  private updateShipping(state: GameState, selected: Building): void {
    this.node('#shipping-controls').hidden = selected.kind !== 'delivery';
    if (selected.kind !== 'delivery') return;
    const coins = state.market?.coins ?? 0;
    const values = this.shippingValues(), valid = Number.isSafeInteger(values.amount) && values.amount > 0 && values.amount <= 1000 && values.available >= values.amount;
    const items = values.items.slice(0, valid ? values.amount : 0);
    if (valid) while (items.length < values.amount) items.push({ resource: values.resource, automated: false, handled: true });
    const quote = shipmentQuote(state, items);
    this.text('#shipping-quote', valid ? `依頼へ ${quote.assigned}個・売却 ${quote.sold}個 → ＋${quote.coins}コイン。出荷後に品を消費します。` : '出荷元・品物・所持数と個数を確認してください。');
    (this.node('[data-action="dispatch"]') as HTMLButtonElement).disabled = !valid;
    (this.node('[data-action="dispatch-all"]') as HTMLButtonElement).disabled = !values.available;
    (this.node('[data-action="buy-iron"]') as HTMLButtonElement).disabled = coins < MARKET.buy.ingot;
    this.text('[data-action="buy-iron"]', `建設用の延べ棒1個を購入（${MARKET.buy.ingot}コイン）`);
    this.text('#shipping-wallet', `所持金 ${coins}コイン · 売却単価: ${SALE_RESOURCES.map(r => `${RESOURCE_LABELS[r]}${MARKET.sell[r]}`).join('／')}`);
    this.text('#shipping-stock', `搬入庫 ${selected.input.length}/32個 · ${SALE_RESOURCES.map(r => `${RESOURCE_LABELS[r]}: 庫内${selected.input.filter(i => i.resource === r).length}／手持ち${state.inventory[r] ?? 0}`).join('・')}`);
    const crystal = techNodeStates(state).find(node => node.id === 'crystals')!, mastery = techNodeStates(state).find(node => node.id === 'mastery')!;
    this.text('#shipping-quests', `鉄 ${Math.min(state.delivered, MARKET.deliveryTargets.ingot)}/${MARKET.deliveryTargets.ingot} → 結晶加工（魔晶採掘機・精製魔晶レシピ）: ${crystal.status === 'unlocked' ? '研究済み' : crystal.status === 'available' ? '研究可能' : '出荷条件が未達'}。剣 ${Math.min(state.stats?.delivered.sword ?? 0, MARKET.deliveryTargets.sword)}/${MARKET.deliveryTargets.sword} ＋ 最高生産速度10本/分 → 量産技術: ${mastery.status === 'unlocked' ? '研究済み' : mastery.status === 'available' ? '研究可能' : '納品数・生産速度・前提研究を確認'}。購入品・初期品は依頼に入りません。`);
  }
  callbacksBuildRecipe(recipe: RecipeId): void { this.callbacks.onRecipe(recipe); }
  recipeChange(): void { this.callbacks.onRecipe((this.node('#recipe-select') as HTMLSelectElement).value as RecipeId); }
  dispose(): void { this.controller.abort(); this.root.replaceChildren(); }
}

/** DOM listeners delegate to instance methods; no game state is exposed globally. */
function bindUIEvents(ui: GameUI, root: HTMLElement, signal: AbortSignal): void {
  root.addEventListener('click', event => ui.handleClick(event), { signal });
  root.querySelector('#feed-form')!.addEventListener('submit', event => ui.handleFeed(event), { signal });
  root.querySelector('#build-search')!.addEventListener('input', () => ui.searchCatalog(), { signal });
  root.querySelector('#demolition-dialog')!.addEventListener('cancel', event => ui.cancelDemolition(event), { signal });
  root.querySelector('#registration-slot')!.addEventListener('change', () => ui.registrationChange(), { signal });
  root.querySelector('#build-recipe-select')!.addEventListener('change', event => ui.callbacksBuildRecipe((event.target as HTMLSelectElement).value as RecipeId), { signal });
  for (const id of ['shipping-source', 'shipping-resource', 'shipping-amount']) root.querySelector('#' + id)!.addEventListener('input', () => ui.refreshShipping(), { signal });
  root.querySelector('#recipe-select')!.addEventListener('change', () => ui.recipeChange(), { signal });
  for (const type of ['pointerdown', 'wheel', 'contextmenu']) root.addEventListener(type, event => event.stopPropagation(), { signal });
  root.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) event.stopPropagation();
  }, { signal });
}
