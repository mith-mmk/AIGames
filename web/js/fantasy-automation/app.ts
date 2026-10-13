import { Simulation } from './simulation';
import { WorldView } from './renderer';
import { GameUI } from './ui';
import { GameSave } from './storage';
import { FixedStepLoop } from './loop.mjs';
import type { Direction, Kind, Resource } from './types';
import { DIRECTIONS, SIZE } from './types';

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
  speed: 0 | 1 | 2 = 1;
  previousSpeed: 1 | 2 = 1;
  message = '採掘機・魔導炉・魔力炉を設置し、ベルトと導線でつなぎましょう。';
  rendererMessage = '';
  removeMode = false;
  last = 0;
  frame = 0;
  saveBusy = false;
  uiTime = 0;
  constructor(host: HTMLElement, root: HTMLElement) {
    try { this.view = new WorldView(host, {
      onPick: (x, z, event) => this.pick(x, z, event),
      onHover: (x, z) => { this.hover = { x, z }; },
      onStatus: message => { this.rendererMessage = message.includes('復旧しました') ? '' : message; },
    }); } catch { this.rendererMessage = '3D表示を開始できません。WebGL対応ブラウザで開いてください。保存・読込は利用できます。'; }
    this.ui = new GameUI(root, {
      onBuild: kind => { this.kind = kind; this.selectedId = null; this.removeMode = false; this.message = '区画をクリックして建設。Rで向き変更、Escで取消。'; this.sync(); },
      onSpeed: speed => this.setSpeed(speed),
      onSave: () => { void this.persist(); },
      onLoad: () => { void this.resume(); },
      onRotate: () => this.rotate(),
      onRemove: () => this.remove(),
      onFeed: (resource, amount) => this.feed(resource, amount),
      onCollect: () => this.collect(),
      onCancel: () => this.cancel(),
      onResetCamera: () => this.view?.resetCamera(),
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
    this.simulation.init(); this.selectedId = null; this.kind = null; this.hover = null;
    this.speed = 1; this.loop.reset(); this.view?.resetCamera();
    this.message = '新しい工房を開きました。初期設備は建設時にキットを使用します。'; this.sync();
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
  remove() {
    if (this.selectedId !== null) {
      this.message = this.simulation.command({ type: 'remove', id: this.selectedId }).reason;
      this.selectedId = null;
    } else { this.kind = null; this.removeMode = !this.removeMode; this.message = this.removeMode ? '撤去する施設をクリック。Escで取消。' : '撤去モードを解除しました。'; }
    this.sync();
  }
  feed(resource: Resource, amount: number) {
    if (this.selectedId !== null) this.message = this.simulation.command({ type: 'feed', id: this.selectedId, resource, amount }).reason;
    this.sync();
  }
  collect() {
    if (this.selectedId !== null) this.message = this.simulation.command({ type: 'collect', id: this.selectedId }).reason;
    this.sync();
  }
  pick(x: number, z: number, event: PointerEvent) {
    if (event.type === 'pointermove' && this.kind !== 'belt' && !this.removeMode && !this.xHeld) return;
    const building = this.simulation.state.buildings.find(b => b.x === x && b.z === z);
    if (event.type === 'pointermove' && building && !this.removeMode && !this.xHeld) return;
    if (event.shiftKey && building) {
      this.kind = building.kind; this.direction = building.direction; this.selectedId = null;
      this.message = '同じ設備を選びました。空き区画へ建設できます。';
    } else if ((this.removeMode || this.xHeld) && building) {
      this.message = this.simulation.command({ type: 'remove', id: building.id }).reason;
      if (this.selectedId === building.id) this.selectedId = null;
    } else if (this.kind && !building) {
      this.message = this.simulation.command({ type: 'build', kind: this.kind, x, z, direction: this.direction }).reason;
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
      if (state) { this.simulation.restore(state); this.loop.reset(); this.last = performance.now(); this.kind = null; this.selectedId = null; this.message = '保存した工房を再開しました。'; }
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
    const valid = !!this.kind && !!this.hover && this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction).ok;
    this.view?.render(this.simulation.state, { kind: this.kind, direction: this.direction, valid, hover: this.hover, selectedId: this.selectedId });
  }
  sync() {
    let message = [this.rendererMessage, this.message].filter(Boolean).join(' ');
    if (this.kind && this.hover) {
      const checked = this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction);
      if (!checked.ok) message = checked.reason;
      else {
        const [dx, dz] = DIRECTIONS[this.direction];
        const next = this.simulation.state.buildings.find(b => b.x === this.hover!.x + dx && b.z === this.hover!.z + dz);
        const inMap = this.hover.x + dx >= 0 && this.hover.x + dx < SIZE && this.hover.z + dz >= 0 && this.hover.z + dz < SIZE;
        message += ` 出力 → ${!inMap ? 'マップ外' : next ? '隣の設備' : '未接続（次にベルトを設置）'}。`;
      }
    }
    this.ui.update(this.simulation.state, { kind: this.kind, direction: this.direction, selectedId: this.selectedId, speed: this.speed, power: this.simulation.powerSummary(), message, hover: this.hover });
  }
  key(event: KeyboardEvent) {
    if (event.target instanceof Element && event.target.closest('input,select,textarea,button,[contenteditable="true"]')) return;
    if (event.repeat && event.code !== 'KeyX') return;
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
