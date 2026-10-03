import { contactPose, clearsLift, MECHANISM as G } from './karakuri-contact.mjs';
import { STAGES } from './karakuri-levels.mjs';

export class Workshop {
  constructor(index = 0) { this.completed = new Set(); this.init(index); }
  init(index = this.stageIndex ?? 0) {
    this.stageIndex = Math.max(0, Math.min(STAGES.length - 1, Math.trunc(index) || 0));
    this.stage = STAGES[this.stageIndex]; this.beltMode = 'open'; this.delay = 0;
    this.parts = [
      { id: 'small', name: '小歯車', x: -5, z: 3, angle: 0, radius: .6 },
      { id: 'large', name: '大歯車', x: -2, z: 3, angle: 0, radius: 1 },
      { id: 'belt', name: 'ベルト', x: 1, z: 3, angle: Math.PI / 2 },
      { id: 'rail', name: 'レール', x: 4, z: 3, angle: Math.PI / 2 }
    ];
    if (this.stage.idler) this.parts.push({ id: 'idler', name: '中継歯車', x: -5, z: 2.4, angle: 0, radius: .4, enabled: false });
    if (this.stage.initial !== 'tray') {
      for (const p of this.parts.filter(p => ['small', 'large', 'belt'].includes(p.id))) Object.assign(p, this.targets()[p.id], { angle: 0 });
      if (this.stage.initial === 'assembled') Object.assign(this.part('rail'), this.targets().rail, { angle: 0 });
    }
    this.reset();
  }
  part(id) { return this.parts.find(p => p.id === id); }
  get handleX() { return this.stage.idler ? -5.4 : -4.6; }
  reset() {
    this.time = 0; this.lift = 0; this.travel = 0; this.gatePassed = false; this.gateBlocked = false; this.arrival = null;
    this.state = 'edit'; this.message = this.stage.goal;
  }
  move(id, x, z, snap = true) {
    if (this.state !== 'edit') return;
    const p = this.part(id); if (!p || p.enabled === false) return;
    const candidate = { ...p, x: Math.max(-6, Math.min(6, Math.round(x * 5) / 5)), z: Math.max(-3.5, Math.min(3.5, Math.round(z * 5) / 5)) };
    const target = this.targets()[id];
    if (snap && Math.hypot(candidate.x - target.x, candidate.z - target.z) < .55) Object.assign(candidate, target);
    if (!clearsLift(candidate)) { this.message = 'リフト台の通り道がふさがります。部品を少し離して置こう。'; return; }
    Object.assign(p, candidate); this.message = this.stage.goal;
  }
  rotate(id) {
    if (this.state !== 'edit') return;
    const p = this.part(id); if (!p || p.enabled === false) return;
    const candidate = { ...p, angle: p.angle + Math.PI / 2 };
    if (clearsLift(candidate)) { p.angle = candidate.angle; this.message = this.stage.goal; }
    else this.message = 'リフト台の通り道がふさがります。部品を少し離して回そう。';
  }
  configure(key, value) {
    if (this.state !== 'edit') return false;
    if (key === 'radius' && this.stage.radii.includes(value)) Object.assign(this.part('large'), { radius: value, name: value === .6 ? '小型の出力歯車' : value === 1.4 ? '特大の出力歯車' : '大歯車' });
    else if (key === 'beltMode' && this.stage.beltModes.includes(value)) this.beltMode = value;
    else if (key === 'delay' && this.stage.delays.includes(value)) this.delay = value;
    else if (key === 'idler' && this.stage.idler && typeof value === 'boolean') this.part('idler').enabled = value;
    else return false;
    this.message = this.stage.goal; return true;
  }
  targets() {
    const round = x => Math.round(x * 1000) / 1000;
    const small = { x: round(this.handleX + 1.2), z: 0 };
    const idler = { x: round(small.x + 1), z: 0 };
    const large = { x: round(small.x + .6 + this.part('large').radius + (this.part('idler')?.enabled ? .8 : 0)), z: 0 };
    return { small, large, idler, belt: { x: round((large.x + 1.6) / 2), z: 0 }, rail: { x: 2.8, z: 0 } };
  }
  connections() {
    const nodes = [{ id: 'handle', x: this.handleX, z: 0, radius: .6 }, ...this.parts.filter(p => p.radius && p.enabled !== false)];
    const speeds = { handle: 2, small: 0, large: 0, idler: 0, lift: 0 };
    const seen = new Set(['handle']), queue = [nodes[0]]; let jam = false;
    while (queue.length) {
      const a = queue.shift();
      for (const b of nodes) {
        if (a.id === b.id || Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius) >= .12) continue;
        const speed = -speeds[a.id] * a.radius / b.radius;
        if (seen.has(b.id)) { if (Math.abs(speeds[b.id] - speed) > .001) jam = true; }
        else { seen.add(b.id); speeds[b.id] = speed; queue.push(b); }
      }
    }
    if (jam) for (const id of seen) speeds[id] = 0;
    const near = (p, q) => Math.hypot(p.x - q.x, p.z - q.z) < .16;
    const b = this.part('belt'), r = this.part('rail'), targets = this.targets();
    const belt = near(b, targets.belt) && near(this.part('large'), targets.large) && Math.abs(Math.sin(b.angle)) < .01;
    speeds.lift = belt ? speeds.large * (this.beltMode === 'cross' ? -1 : 1) : 0;
    return { input: !!speeds.small, mesh: !!speeds.large, belt, rail: near(r, targets.rail) && Math.cos(r.angle) > .99, jam, speeds };
  }
  get gateFraction() { return (G.gateX - G.gateThickness / 2 - G.radius - G.clearance - G.liftX) / (G.bellX - G.liftX); }
  gateOpen(time = this.time) { return !this.gateBlocked && (this.gatePassed || !this.stage.window || (time >= this.stage.window[0] && time <= this.stage.window[1])); }
  start() { if (this.state !== 'edit') return; this.reset(); this.state = 'running'; this.message = '試運転中… 回転の向き・上昇の速さ・門の時刻を観察しよう。'; }
  pose() { return contactPose(this.lift, this.travel, this.part('rail'), this.connections().rail); }
  next() { if (this.state !== 'success' || this.stageIndex === STAGES.length - 1) return false; this.init(this.stageIndex + 1); return true; }
  step(dt) {
    if (this.state !== 'running' || !Number.isFinite(dt) || dt < 0) return;
    this.time += Math.min(dt, .05);
    const c = this.connections(), up = c.speeds.lift * this.stage.screwDirection > 0;
    const duration = up ? 3.6 / Math.abs(c.speeds.lift) : Infinity;
    this.lift = up ? Math.min(1, this.time / duration) : 0;
    const releaseAt = duration + this.delay;
    if (this.time > releaseAt) this.travel = Math.min(1, (this.time - releaseAt) / 3);
    if (this.time > 3.5 && !up) {
      this.state = 'failed';
      const reverseHint = this.stage.beltModes.length > 1 ? 'ベルトの交差で回転方向を変えよう。' : '中継歯車を一枚加えて回転方向を変えよう。';
      this.message = c.jam ? '歯車が輪になって回転が衝突した。一枚外すか離そう。' : !c.input ? 'ハンドルの力が小歯車に届かない。歯が触れる距離に置こう。' : !c.mesh ? '歯車が噛み合っていない。中継や軸の隙間を観察しよう。' : !c.belt ? 'ベルトがリフトへ力を伝えていない。位置と向きを直そう。' : `ねじが逆向きに回っている。${reverseHint}`;
      return;
    }
    if (c.rail && this.stage.window && !this.gatePassed && this.travel >= this.gateFraction) {
      this.arrival = releaseAt + this.gateFraction * 3;
      if (this.gateOpen(this.arrival)) this.gatePassed = true;
      else {
        this.gateBlocked = true; this.travel = this.gateFraction; this.state = 'failed';
        const timingHint = this.stage.delays.length === 1 ? '出力歯車の大きさを直そう。' : this.stage.radii.length === 1 ? '玉止めの待ち時間を直そう。' : '歯車の速さと玉止めを直そう。';
        this.message = `門に着いたのは ${this.arrival.toFixed(2)}秒。門は ${this.stage.window[0].toFixed(2)}〜${this.stage.window[1].toFixed(2)}秒に開く。${timingHint}`;
        return;
      }
    }
    if (this.travel === 1) {
      this.state = c.rail ? 'success' : 'failed';
      if (c.rail) { this.completed.add(this.stageIndex); this.message = this.stageIndex === 9 && this.completed.size === STAGES.length ? '全10面クリア！ からくり職人の工房が完成した！' : this.stageIndex === 9 ? '最終工房クリア！ まだの工房も仕上げよう。' : '成功！ ベルが鳴った。次の工房にも挑戦しよう！'; }
      else this.message = 'ビー玉が机に落ちた。レールの入口と下り方向を直そう。';
    }
  }
}
