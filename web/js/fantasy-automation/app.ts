import { Simulation } from './simulation';
import { WorldView } from './renderer';
import { GameUI } from './ui';
import { GameSave } from './storage';
import { FixedStepLoop } from './loop.mjs';
import { evaluateGuide, type GuideStep } from './onboarding';
import { isKindUnlocked } from './technology';
import type { Direction, Kind, Resource, RecipeId, TechId } from './types';
import { SIZE } from './types';
import { logisticsPorts } from './logistics-visuals';
import type { GolemGuide } from './golem-guide';
import { DEFINITIONS } from './data';

class WorkshopApp {
  simulation = new Simulation();
  save = new GameSave();
  view: WorldView | null = null;
  ui: GameUI;
  loop: FixedStepLoop;
  kind: Kind | null = null;
  direction: Direction = 1;
  selectedId: number | null = null;
  hover: { x: number; z: number } | null = null;
  placedAt: { x: number; z: number } | null = null;
  speed: 0 | 1 | 2 = 1;
  previousSpeed: 1 | 2 = 1;
  message = '採掘機・製錬炉・魔力発生炉を設置し、ベルトと導線でつなぎましょう。';
  rendererMessage = '';
  removeMode = false;
  last = 0;
  frame = 0;
  saveBusy = false;
  uiTime = 0;
  technologyOpen = false;
  golemGuideOpen = false;
  pendingDemolitionId: number | null = null;
  demolitionSpeed: 0 | 1 | 2 = 0;
  guideEnabled = true;
  guideStep: GuideStep | null = null;
  constructor(host: HTMLElement, root: HTMLElement) {
    try { this.view = new WorldView(host, {
      onPick: (x, z, event) => this.pick(x, z, event),
      onHover: (x, z) => { if (this.placedAt && (this.placedAt.x !== x || this.placedAt.z !== z)) this.placedAt = null; this.hover = { x, z }; },
      onStatus: message => { this.rendererMessage = message.includes('復旧しました') ? '' : message; },
    }); } catch { this.rendererMessage = '3D表示を開始できません。WebGL対応ブラウザで開いてください。保存・読込は利用できます。'; }
    this.ui = new GameUI(root, {
      onBuild: kind => this.chooseBuild(kind),
      onSpeed: speed => this.setSpeed(speed),
      onSave: () => { void this.persist(); },
      onLoad: () => { void this.resume(); },
      onRotate: () => this.rotate(),
      onRemove: () => this.remove(),
      onUndoBuild: () => this.undoBuild(),
      onConfirmRemove: id => this.confirmRemove(id),
      onCancelRemove: () => this.cancelRemove(),
      onGolemGuideToggle: show => { this.golemGuideOpen = show ?? !this.golemGuideOpen; this.sync(); },
      onGolemGuideAction: action => this.golemGuideAction(action),
      onInspect: id => this.inspect(id),
      onPortalConfig: (channel, role) => {
        if (this.selectedId !== null) this.message = this.simulation.command({ type: 'portalConfig', id: this.selectedId, channel, role }).reason;
        this.sync();
      },
      onFeed: (resource, amount) => this.feed(resource, amount),
      onCollect: (resource, amount) => this.collect(resource, amount),
      onTechnologyToggle: show => this.toggleTechnology(show),
      onResearch: id => this.research(id),
      onTrack: id => this.track(id),
      onRecipe: recipe => this.chooseRecipe(recipe),
      onRelayPolicy: policy => {
        if (this.selectedId !== null) this.message = this.simulation.command({ type: 'relayPolicy', id: this.selectedId, policy }).reason;
        this.sync();
      },
      onGatherWood: () => { this.message = this.simulation.command({ type: 'gatherWood' }).reason; this.sync(); },
      onCancel: () => this.cancel(),
      onResetCamera: () => this.view?.resetCamera(),
      onGuideAction: () => this.guideAction(),
      onGuideToggle: show => this.toggleGuide(show),
      onNew: () => { if (confirm('工房を最初から始めますか？ 保存枠は「保存」するまで残ります。')) this.init(); },
    });
    this.loop = new FixedStepLoop({
      step: () => this.simulation.step(),
      render: () => this.render(),
      stepSeconds: 0.05,
      maxSteps: 40,
    });
    bindAppEvents(this);
    this.last = performance.now();
    this.frame = requestAnimationFrame(time => this.animate(time));
    this.sync();
  }
  init() {
    this.pendingDemolitionId = null; this.golemGuideOpen = false; this.technologyOpen = false;
    this.simulation.init(); this.placedAt = null; this.selectedId = null; this.kind = null; this.hover = null;
    this.direction = 1; this.removeMode = false; this.xHeld = false; this.previousSpeed = 1;
    this.speed = 1; this.guideEnabled = true; this.loop.reset(); this.view?.resetCamera();
    this.message = '新しい工房を開きました。初期設備は建設時にキットを使用します。'; this.sync();
  }
  chooseBuild(kind: Kind) {
    if (!isKindUnlocked(this.simulation.state, kind)) {
      this.message = 'この設備は未解放です。技術ツリーで前提と実績条件を確認してください。';
      this.toggleTechnology(true); return;
    }
    this.placedAt = null; this.kind = kind; this.selectedId = null; this.removeMode = false;
    this.message = '区画をクリックして建設。Rで向き変更、Escで取消。';
    if (kind === 'crystalMiner') {
      const state = this.simulation.state;
      let index = state.terrain.findIndex((tile, cell) => tile === 'crystal' && !state.buildings.some(b => b.z * SIZE + b.x === cell));
      if (index < 0) index = state.pendingCrystalCells?.[0] ?? -1;
      if (index >= 0) {
        this.hover = { x: index % SIZE, z: Math.floor(index / SIZE) };
        this.view?.revealTile(this.hover.x, this.hover.z);
        this.message = state.terrain[index] === 'crystal' ? '紫の魔晶鉱脈に魔晶採掘機を配置します。導線で魔力を供給してください。' : 'この区画の設備を撤去すると、旧工房の下に隠れていた晶脈を利用できます。';
      }
    }
    this.sync();
    document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({ preventScroll: true });
  }
  toggleTechnology(show = !this.technologyOpen) {
    this.technologyOpen = show; if (show) this.golemGuideOpen = false; this.sync();
  }
  inspect(id: number) {
    const building = this.simulation.state.buildings.find(candidate => candidate.id === id);
    if (!building) return;
    this.golemGuideOpen = false; this.technologyOpen = false; this.kind = null; this.removeMode = false; this.xHeld = false;
    this.selectedId = id; this.hover = { x: building.x, z: building.z };
    this.view?.revealTile(building.x, building.z); this.ui.openSelection(); this.sync();
  }
  golemGuideAction(action: NonNullable<GolemGuide['action']>) {
    if (action.type === 'technology') { this.toggleTechnology(true); return; }
    if (action.type === 'build' && action.kind) { this.golemGuideOpen = false; this.chooseBuild(action.kind); return; }
    if (action.type === 'inspect' && action.id !== undefined) { this.inspect(action.id); return; }
    if (action.type === 'run') { this.golemGuideOpen = false; this.setSpeed(1); }
  }
  research(id: TechId) {
    this.message = this.simulation.command({ type: 'research', id }).reason; this.sync();
  }
  track(id: TechId | null) {
    this.message = this.simulation.command({ type: 'track', id }).reason; this.sync();
  }
  chooseRecipe(recipe: RecipeId) {
    if (this.selectedId !== null) this.message = this.simulation.command({ type: 'recipe', id: this.selectedId, recipe }).reason;
    this.sync();
  }
  toggleGuide(show = !this.guideEnabled) {
    this.guideEnabled = show; this.sync();
  }
  guideAction() {
    const guide = evaluateGuide(this.simulation.state);
    this.placedAt = null; this.removeMode = false; this.xHeld = false;
    if (guide.target) { this.hover = { ...guide.target }; if (guide.mode === 'build') this.view?.revealTile(guide.target.x, guide.target.z); }
    if (guide.mode === 'done') { this.toggleGuide(false); return; }
    if (guide.mode === 'run') { this.kind = null; this.selectedId = null; this.setSpeed(1); return; }
    if (guide.mode === 'rotate' || guide.mode === 'feed') {
      this.kind = null; this.selectedId = guide.focusId;
      this.message = guide.mode === 'feed' ? '所持品の木材スロットを押すと1個を補給できます。木材から魔力を作ります。' : '設備の詳細にある「回転 R」で目印と同じ向きにします。';
    } else {
      this.kind = guide.kind; this.direction = guide.direction ?? 1; this.selectedId = null;
      this.message = '設備を選びました。地図の光る目印を左クリックして建設してください。';
    }
    this.sync();
    if (guide.mode === 'build') document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({ preventScroll: true });
  }
  setSpeed(speed: 0 | 1 | 2) {
    this.speed = speed; if (speed) this.previousSpeed = speed;
    this.loop.reset(); this.last = performance.now(); this.sync();
  }
  togglePause() { this.setSpeed(this.speed ? 0 : this.previousSpeed); }
  cancel() { this.kind = null; this.removeMode = false; this.message = '選択モード。施設をクリックして稼働状況を確認できます。'; this.sync(); }
  rotate() {
    if (this.kind) this.direction = ((this.direction + 1) % 4) as Direction;
    else if (this.selectedId !== null) this.message = this.simulation.command({ type: 'rotate', id: this.selectedId }).reason;
    this.sync();
  }
  undoBuild() {
    if (this.ui.isWorldInputBlocked()) return;
    const target = this.simulation.undoPlacement();
    const result = this.simulation.command({ type: 'undoBuild' });
    this.message = result.reason;
    if (result.ok) { if (this.selectedId === target?.id) this.selectedId = null; this.placedAt = null; }
    this.sync();
  }
  remove() {
    if (this.pendingDemolitionId !== null) return;
    if (this.selectedId !== null) {
      if (!this.simulation.state.buildings.some(building => building.id === this.selectedId)) return;
      this.pendingDemolitionId = this.selectedId; this.demolitionSpeed = this.speed;
      this.removeMode = false; this.xHeld = false; this.kind = null;
      this.setSpeed(0);
    } else { this.kind = null; this.removeMode = !this.removeMode; this.message = this.removeMode ? '撤去対象をタップ／クリックし、確認画面で確定します。Escで取消。' : '撤去モードを解除しました。'; }
    this.sync();
  }
  confirmRemove(id: number) {
    if (this.pendingDemolitionId !== id) return;
    this.pendingDemolitionId = null;
    this.message = this.simulation.command({ type: 'remove', id }).reason;
    if (this.selectedId === id) this.selectedId = null;
    this.setSpeed(this.demolitionSpeed);
    document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({ preventScroll: true });
  }
  cancelRemove() {
    if (this.pendingDemolitionId === null) return;
    this.pendingDemolitionId = null;
    this.message = '解体を取り消しました。設備と保管品はそのままです。';
    this.setSpeed(this.demolitionSpeed);
    document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({ preventScroll: true });
  }
  feed(resource: Resource, amount: number) {
    if (this.selectedId !== null) this.message = this.simulation.command({ type: 'feed', id: this.selectedId, resource, amount }).reason;
    this.sync();
  }
  collect(resource?: Resource, amount?: number) {
    if (this.selectedId !== null) this.message = this.simulation.command({ type: 'collect', id: this.selectedId, ...(resource !== undefined ? { resource } : {}), ...(amount !== undefined ? { amount } : {}) }).reason;
    this.sync();
  }
  pick(x: number, z: number, event: PointerEvent) {
    if (this.ui.isWorldInputBlocked()) return;
    if (event.type === 'pointermove' && (this.removeMode || this.xHeld)) return;
    if (event.type === 'pointermove' && this.kind !== 'belt' && !this.removeMode && !this.xHeld) return;
    const building = this.simulation.state.buildings.find(b => b.x === x && b.z === z);
    if (event.type === 'pointermove' && building && !this.removeMode && !this.xHeld) return;
    if (event.shiftKey && building) {
      this.kind = building.kind; this.direction = building.direction; this.selectedId = null;
      this.message = '同じ設備を選びました。空き区画へ建設できます。';
    } else if ((this.removeMode || this.xHeld) && building) {
      this.selectedId = building.id; this.remove(); return;
    } else if (this.kind && !building) {
      const result = this.simulation.command({ type: 'build', kind: this.kind, x, z, direction: this.direction });
      this.message = result.reason; this.placedAt = result.ok ? { x, z } : null;
    } else { this.selectedId = building?.id ?? null; if (building) this.kind = null; }
    this.sync();
  }
  xHeld = false;
  async persist() {
    if (this.saveBusy) return; this.saveBusy = true;
    try { await this.save.save(this.simulation.snapshot()); this.message = 'この工房を保存しました。'; }
    catch (error) { this.message = `保存できません: ${error instanceof Error ? error.message : String(error)}`; }
    finally { this.saveBusy = false; this.sync(); }
  }
  async resume() {
    if (this.saveBusy) return; this.saveBusy = true;
    try {
      const state = await this.save.load();
      if (state) { this.simulation.restore(state); this.placedAt = null; this.loop.reset(); this.last = performance.now(); this.kind = null; this.selectedId = null; this.message = '保存した工房を再開しました。'; }
      else this.message = '保存データがありません。まず「保存」を押してください。';
    } catch (error) { this.message = `読込できません: ${error instanceof Error ? error.message : String(error)}`; }
    finally { this.saveBusy = false; this.sync(); }
  }
  animate(time: number) {
    const delta = Math.min((time - this.last) / 1000, 1); this.last = time;
    if (!document.hidden) this.loop.advance(delta * this.speed); else this.loop.reset();
    if (time - this.uiTime > 150) { this.sync(); this.uiTime = time; }
    this.frame = requestAnimationFrame(next => this.animate(next));
  }
  render() {
    this.view?.setInputBlocked(this.ui.isWorldInputBlocked());
    const valid = !!this.kind && !!this.hover && this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction).ok;
    this.view?.render(this.simulation.state, { kind: this.kind, direction: this.direction, valid, hover: this.hover, selectedId: this.selectedId, guideTarget: this.guideStep?.target ? { ...this.guideStep.target, kind: this.guideStep.kind, direction: this.guideStep.direction } : null });
  }
  sync() {
    this.guideStep = this.guideEnabled && !this.technologyOpen && !this.golemGuideOpen && this.pendingDemolitionId === null ? evaluateGuide(this.simulation.state) : null;
    let message = [this.rendererMessage, this.message].filter(Boolean).join(' ');
    if (this.kind && this.hover) {
      const checked = this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction);
      if (!checked.ok && !(this.placedAt?.x === this.hover.x && this.placedAt?.z === this.hover.z) && !message.includes(checked.reason)) message += ` 配置予定: ${checked.reason}`;
      else if (checked.ok) {
        const cells = new Map(this.simulation.state.buildings.map(building => [`${building.x},${building.z}`, building]));
        const ports = logisticsPorts({ kind: this.kind, ...this.hover, direction: this.direction }, cells);
        const labels = { connected: '接続', missing: '未接続', incompatible: '素材不一致', full: '詰まり', edge: 'マップ外' };
        if (ports.length) message += ` 出口 ${ports.map(port => `${['北 ↑', '東 →', '南 ↓', '西 ←'][port.direction]} ${labels[port.state]}`).join(' / ')}。`;
      }
    }
    const undo = this.simulation.undoPlacement();
    this.ui.update(this.simulation.state, { kind: this.kind, direction: this.direction, selectedId: this.selectedId, speed: this.speed, power: this.simulation.powerSummary(), message, hover: this.hover, guide: this.guideStep, technologyOpen: this.technologyOpen, golemGuideOpen: this.golemGuideOpen, undoLabel: undo ? `${DEFINITIONS[undo.kind].label} (${undo.x}, ${undo.z})` : null, demolition: this.simulation.state.buildings.find(building => building.id === this.pendingDemolitionId) ?? null });
    this.view?.setInputBlocked(this.ui.isWorldInputBlocked());
  }
  key(event: KeyboardEvent) {
    if (this.pendingDemolitionId !== null) {
      if (event.code === 'Escape') { event.preventDefault(); this.cancelRemove(); }
      return;
    }
    if (this.technologyOpen && event.code === 'Escape') { this.toggleTechnology(false); return; }
    if (event.code === 'Escape' && this.ui.closeOverlay()) return;
    if (this.ui.isWorldInputBlocked()) return;
    if (event.target instanceof Element && event.target.closest('#technology-panel')) return;
    if (event.target instanceof Element) {
      if (event.target.closest('#game-ui')) return;
      if (event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
      if (event.target.closest('button') && !['KeyR', 'Escape'].includes(event.code)) return;
    }
    if (event.repeat && event.code !== 'KeyX') return;
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) { event.preventDefault(); this.undoBuild(); return; }
    if (event.code === 'Delete' && this.selectedId !== null) { event.preventDefault(); this.remove(); return; }
    if (/^Digit[1-6]$/.test(event.code)) { event.preventDefault(); this.ui.chooseQuickSlot(Number(event.code.slice(-1)) - 1); return; }
    if (event.code === 'KeyX') { this.xHeld = true; this.message = 'Xを押しながら施設をクリックして撤去。'; }
    if (event.code === 'KeyR') this.rotate();
    if (event.code === 'Escape') this.cancel();
    if (event.code === 'Space') { event.preventDefault(); this.togglePause(); }
  }
}
function bindAppEvents(app: WorkshopApp) {
  document.addEventListener('keydown', event => app.key(event));
  document.addEventListener('keyup', event => { if (event.code === 'KeyX') app.xHeld = false; });
  window.addEventListener('blur', () => { app.xHeld = false; app.loop.reset(); });
  document.addEventListener('visibilitychange', () => { app.last = performance.now(); app.loop.reset(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(app.frame); app.ui.dispose(); app.view?.dispose(); }, { once: true });
}
const host = document.querySelector<HTMLElement>('#world');
const root = document.querySelector<HTMLElement>('#game-ui');
if (host && root) new WorkshopApp(host, root);
