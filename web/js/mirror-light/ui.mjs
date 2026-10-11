const STATUS = {
  escaped: '光は庭の外へ。鏡の向きを考えてみましょう。',
  blocked: '光が石で止まっています。別の道へ曲げましょう。',
  loop: '光が同じ道を巡っています。鏡を回して抜け道を。',
  incomplete: 'ゴールには届きました。まだ通っていない青い通過点があります。',
  won: 'すべての条件を満たし、光がゴールに届きました。',
};
export class GardenUI {
  constructor(root) { this.root = root; this.targets = []; }
  get(id) { return this.root.querySelector(`#${id}`); }
  init(levels, level, progress) {
    this.get('chapter').textContent = level.id <= 3 ? '反射を知る' : level.id <= 6 ? '光を組み合わせる' : '庭を読み解く';
    this.get('stage-title').textContent = `${String(level.id).padStart(2, '0')} ${level.title}`;
    this.get('lesson').textContent = level.lesson;
    this.get('stage-list').replaceChildren(...levels.map(l => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.stage = l.id;
      button.textContent = `${progress.best[l.id] !== undefined ? '✓ ' : ''}${String(l.id).padStart(2, '0')} ${l.title}`;
      button.setAttribute('aria-current', String(l.id === level.id)); return button;
    }));
    this.targets = level.mirrors.map((m, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'mirror-target'; button.dataset.mirror = i;
      button.textContent = m.id; button.disabled = m.fixed; return button;
    });
    this.get('mirror-targets').replaceChildren(...this.targets);
    this.get('mirror-select').replaceChildren(...level.mirrors.filter(m => !m.fixed).map(m => {
      const option = document.createElement('option'); option.value = level.mirrors.indexOf(m); option.textContent = `鏡 ${m.id}`; return option;
    }));
    this.hideHint();
  }
  update(session, progress) {
    const level = session.level, trace = session.trace;
    this.get('moves').textContent = `${session.moves} 手`;
    this.get('moves').dataset.moves = session.moves;
    this.get('progress').textContent = `${Object.keys(progress.best).length} / 10 クリア`;
    this.get('stage-list').querySelectorAll('[data-stage]').forEach(button => {
      const cleared = progress.best[button.dataset.stage] !== undefined;
      button.textContent = button.textContent.replace(/^✓ /, '');
      if (cleared) button.textContent = `✓ ${button.textContent}`;
    });
    this.get('status').textContent = session.moves === 0 ? '鏡を押して、光の行き先を変えましょう。' : STATUS[trace.status];
    this.get('status').dataset.state = trace.status;
    this.get('checkpoint-count').textContent = level.checkpoints.length ? `通過点 ${trace.lit.length} / ${level.checkpoints.length}` : '';
    this.get('undo').disabled = session.moves === 0;
    this.get('rotate-selected').disabled = trace.won;
    this.get('hint').disabled = trace.won;
    this.targets.forEach((button, i) => {
      const m = level.mirrors[i], orientation = session.orientations[i] === 0 ? '/' : '\\';
      button.disabled = m.fixed || trace.won;
      button.setAttribute('aria-label', `鏡 ${m.id}、${orientation}、${m.fixed ? '固定' : trace.won ? 'クリア済み、回転停止' : '押して回転'}`);
      button.dataset.fixed = String(Boolean(m.fixed));
      button.dataset.orientation = session.orientations[i];
      button.title = `鏡 ${m.id} ${orientation}${m.fixed ? '（固定）' : ''}`;
    });
    this.get('mirror-description').textContent = level.mirrors.map((m, i) => `${m.id}：${session.orientations[i] === 0 ? '/' : '\\'}（左から${m.x + 1}、上から${m.y + 1}${m.fixed ? '・固定' : ''}）`).join('　');
    this.get('success').hidden = !trace.won;
    this.get('success-title').textContent = level.id === 10 ? '最後の庭に光が届きました' : '光が届きました';
    this.get('success-detail').textContent = `${session.moves} 手 · 自己ベスト ${progress.best[level.id] ?? session.moves} 手`;
    this.get('next').textContent = level.id === 10 ? '庭を選ぶ →' : '次の庭へ →';
  }
  layout(points) {
    // Keep adjacent labels individually tappable on narrow screens. Shift labels
    // only, never mirrors or cells; the physical mirror can also be raycast.
    const positions = points.map(p => ({ ...p }));
    for (let pass = 0; pass < 8; pass++) for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i], b = positions[j], dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) >= 34 || Math.abs(dy) >= 34) continue;
      if (Math.abs(dx) > Math.abs(dy)) { const shift = (34 - Math.abs(dx)) / 2 + .1; a.x -= Math.sign(dx || 1) * shift; b.x += Math.sign(dx || 1) * shift; }
      else { const shift = (34 - Math.abs(dy)) / 2 + .1; a.y -= Math.sign(dy || 1) * shift; b.y += Math.sign(dy || 1) * shift; }
    }
    positions.forEach((p, i) => { if (this.targets[i]) { this.targets[i].style.left = `${p.x}px`; this.targets[i].style.top = `${p.y}px`; } });
  }
  hint(result) {
    this.get('hint-text').textContent = result.text; this.get('hint-text').hidden = false;
    this.targets.forEach((button, i) => button.classList.toggle('hinted', i === result.index));
  }
  hideHint() { this.get('hint-text').hidden = true; this.targets.forEach(b => b.classList.remove('hinted')); }
  toggleStages(open = this.get('stage-panel').hidden) {
    this.get('stage-panel').hidden = !open; this.get('open-stages').setAttribute('aria-expanded', String(open));
  }
  renderMessage(text) { this.get('render-message').textContent = text; this.get('render-message').hidden = !text; }
}
