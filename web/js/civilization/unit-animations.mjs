import { UNITS } from './data.mjs';

const clamp = value => Math.max(0, Math.min(1, value));
const isVisible = (view, point) => view?.world?.tiles[point.y * view.world.width + point.x]?.visibility === 'visible';
const onMap = unit => unit && !unit.transportedByUnitId;
const point = unit => ({ x: unit.x, y: unit.y });
const distance = (a, b, width) => Math.max(Math.min(Math.abs(a.x - b.x), width - Math.abs(a.x - b.x)), Math.abs(a.y - b.y));

/** Only filtered player views are accepted. Raw events are never kept in a clip. */
export function buildUnitClips(before, after, events = []) {
  if (!before || !after) return [];
  const oldUnits = new Map(before.units.filter(onMap).map(unit => [unit.id, unit]));
  const newUnits = new Map(after.units.filter(onMap).map(unit => [unit.id, unit]));
  const cursors = new Map([...oldUnits].map(([id, unit]) => [id, point(unit)]));
  const clips = [];
  for (const event of events) {
    if (event.type === 'combat.resolved') {
      const a = oldUnits.get(event.data?.attackerId);
      const d = oldUnits.get(event.data?.defenderId);
      // An unobserved attacker/defender must not become an effect or a ghost.
      if (!a || !d || !isVisible(before, a) || !isVisible(before, d)) continue;
      const attacker = { ...a, ...cursors.get(a.id) };
      const defender = { ...d };
      if (!isVisible(before, attacker) && !isVisible(after, attacker)) continue;
      const damage = (value, unit) => Math.max(0, Math.min(UNITS[unit.typeId]?.hp || 10, Number.isFinite(value) ? value : 0));
      clips.push({ kind: 'combat', duration: 300, view: before,
        attacker, defender,
        attackerDamage: damage(event.data.attackerDamage, a), defenderDamage: damage(event.data.defenderDamage, d),
        attackerDestroyed: Boolean(event.data.attackerDestroyed), defenderDestroyed: Boolean(event.data.defenderDestroyed),
        ranged: ['ranged', 'siege', 'naval'].includes(UNITS[a.typeId]?.role),
      });
    } else if (event.type === 'unit.moved') {
      const old = oldUnits.get(event.entityId);
      const current = newUnits.get(event.entityId);
      const from = cursors.get(event.entityId);
      const to = event.data?.to;
      if (!old || !current || !from || !Number.isInteger(to?.x) || !Number.isInteger(to?.y)) continue;
      cursors.set(event.entityId, { x: to.x, y: to.y });
      const seen = value => isVisible(before, value) || isVisible(after, value);
      if (!seen(from) || !seen(to) || distance(from, to, after.world.width) !== 1) continue;
      clips.push({ kind: 'move', duration: 180, view: after,
        unit: { ...current }, from: { ...from }, to: { x: to.x, y: to.y }, width: after.world.width });
    }
  }
  return clips;
}

/** Pure sampling keeps animation timing out of the engine, RNG, and saves. */
export function sampleUnitClip(clip, progress) {
  const t = clamp(progress);
  if (clip.kind === 'move') {
    let dx = clip.to.x - clip.from.x;
    if (dx > clip.width / 2) dx -= clip.width;
    if (dx < -clip.width / 2) dx += clip.width;
    const ease = t * t * (3 - 2 * t);
    return { view: clip.view, actors: [{ unit: clip.unit,
      x: clip.from.x + dx * ease, y: clip.from.y + (clip.to.y - clip.from.y) * ease,
      lift: Math.sin(t * Math.PI) * 2, alpha: 1, flash: 0 }], effects: [] };
  }
  const impact = t >= 0.35;
  const deathAlpha = destroyed => destroyed && impact ? Math.max(0, 1 - (t - .45) / .55) : 1;
  const lunge = clip.ranged ? 0 : Math.sin(t * Math.PI) * .18;
  let dx = clip.defender.x - clip.attacker.x;
  const width = clip.view.world.width;
  if (dx > width / 2) dx -= width;
  if (dx < -width / 2) dx += width;
  const dy = clip.defender.y - clip.attacker.y;
  const actors = [
    { unit: clip.attacker, x: clip.attacker.x + dx * lunge, y: clip.attacker.y + dy * lunge,
      alpha: deathAlpha(clip.attackerDestroyed), flash: impact && t < .65 ? .5 : 0 },
    { unit: clip.defender, ...point(clip.defender), alpha: deathAlpha(clip.defenderDestroyed),
      flash: impact && t < .65 ? .8 : 0 },
  ];
  const effects = impact ? [
    { kind: 'damage', ...point(clip.attacker), text: `−${clip.attackerDamage}`, rise: (t - .35) * 22 },
    { kind: 'damage', ...point(clip.defender), text: `−${clip.defenderDamage}`, rise: (t - .35) * 22 },
  ] : [];
  if (clip.ranged && t < .5) effects.push({ kind: 'shot', from: point(clip.attacker),
    to: { x: clip.attacker.x + dx, y: clip.defender.y }, progress: t * 2 });
  return { view: clip.view, actors, effects };
}

export class UnitAnimations {
  constructor({ onFrame = () => {}, onIdle = () => {},
    now = () => performance.now(), requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = id => cancelAnimationFrame(id), enabled = true } = {}) {
    Object.assign(this, { onFrame, onIdle, now, requestFrame, cancelFrame, enabled });
    this.clips = []; this.started = 0; this.frameId = null; this.pulse = null; this.done = null;
  }

  get playing() { return this.clips.length > 0; }
  get active() { return this.playing || Boolean(this.pulse); }

  play(clips, budget = 1200) {
    this.cancel();
    if (!this.enabled || !clips.length) return Promise.resolve();
    let duration = 0;
    for (const clip of clips) {
      if (duration + clip.duration > budget) break;
      this.clips.push(clip); duration += clip.duration;
    }
    if (!this.clips.length) return Promise.resolve();
    this.started = this.now();
    const promise = new Promise(resolve => { this.done = resolve; });
    this.onFrame(); this.schedule();
    return promise;
  }

  select(id) {
    if (!this.enabled || !id) return;
    this.pulse = { id, started: this.now() }; this.schedule();
  }

  sample() {
    const time = this.now();
    const result = this.clips.length ? sampleUnitClip(this.clips[0], (time - this.started) / this.clips[0].duration)
      : { actors: [], effects: [] };
    const pulse = this.pulse && clamp(1 - (time - this.pulse.started) / 360);
    return { ...result, pulse: pulse ? { id: this.pulse.id, strength: pulse } : null };
  }

  schedule() {
    if (this.frameId !== null || !this.active) return;
    this.frameId = this.requestFrame(() => {
      this.frameId = null;
      const time = this.now();
      while (this.clips.length && time - this.started >= this.clips[0].duration) {
        this.started += this.clips.shift().duration;
      }
      if (this.pulse && time - this.pulse.started >= 360) this.pulse = null;
      this.onFrame();
      if (!this.playing && this.done) { const resolve = this.done; this.done = null; resolve(); this.onIdle(); }
      this.schedule();
    });
  }

  setEnabled(enabled) { this.enabled = Boolean(enabled); if (!this.enabled) this.cancel(); this.onFrame(); }

  cancel() {
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null; this.clips = []; this.pulse = null;
    if (this.done) { this.done(); this.done = null; }
  }

  dispose() { this.cancel(); this.onFrame = () => {}; this.onIdle = () => {}; }
}
