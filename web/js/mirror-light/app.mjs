import { LEVELS } from './levels.mjs';
import { MirrorSession } from './core.mjs';
import { GardenRenderer } from './renderer.mjs';
import { GardenUI } from './ui.mjs';
import { GardenProgress } from './storage.mjs';
import { bindInput } from './input.mjs';

class MirrorGarden {
  constructor(root) {
    this.ui = new GardenUI(root); this.session = new MirrorSession(LEVELS[0]); this.renderer = null;
    let storage;
    try { storage = window.localStorage; } catch { storage = { getItem() { return null; }, setItem() { throw new Error('Storage disabled'); } }; }
    this.progress = new GardenProgress(storage);
    try {
      this.renderer = new GardenRenderer(this.ui.get('viewport'), points => this.ui.layout(points), available => {
        this.ui.renderMessage(available ? '' : '3D表示を復旧しています。状態は保持されます。下の「押しやすい操作」も使えます。');
      });
    } catch {
      this.ui.renderMessage('3D表示を開始できませんでした。「遊び方・押しやすい操作」から鏡を回せます。');
      this.ui.get('mirror-targets').hidden = true;
      this.ui.root.querySelector('.help').open = true;
    }
  }
  init() { this.selectStage(1); this.unbind = bindInput(this, this.ui); }
  selectStage(id) {
    const level = LEVELS.find(l => l.id === id); if (!level) return;
    this.session.init(level); this.ui.init(LEVELS, level, this.progress); this.ui.toggleStages(false);
    this.renderer?.init(level); this.update();
  }
  rotate(index) { if (this.session.rotate(index)) { this.ui.hideHint(); this.update(); } }
  point(clientX, clientY) { const index = this.renderer?.pick(clientX, clientY); if (index !== null && index !== undefined) this.rotate(index); }
  action(action) {
    if (action === 'hint') { this.ui.hint(this.session.hint()); return; }
    if (action === 'next') {
      if (!this.session.trace.won) return;
      if (this.session.level.id === 10) { this.ui.toggleStages(true); this.ui.get('open-stages').focus(); }
      else this.selectStage(this.session.level.id + 1);
      return;
    }
    if (action === 'undo') this.session.undo();
    else if (action === 'reset') this.session.reset();
    this.ui.hideHint(); this.update();
  }
  update() {
    const trace = this.session.trace;
    if (trace.won) this.progress.record(this.session.level.id, this.session.moves);
    this.ui.update(this.session, this.progress); this.renderer?.update(this.session.orientations, trace);
    if (!this.progress.available) this.ui.get('progress').textContent += '（保存不可）';
  }
  dispose() { this.unbind?.(); this.renderer?.dispose(); }
}

const app = new MirrorGarden(document.querySelector('.garden'));
app.init();
window.addEventListener('pagehide', event => { if (!event.persisted) app.dispose(); });
