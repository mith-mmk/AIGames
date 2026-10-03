export class Workshop {
  constructor() { this.init(); }
  init() {
    this.parts = [
      { id: 'small', name: '小歯車', x: -5, z: 3, angle: 0, radius: .6 },
      { id: 'large', name: '大歯車', x: -2, z: 3, angle: 0, radius: 1 },
      { id: 'belt', name: 'ベルト', x: 1, z: 3, angle: Math.PI / 2 },
      { id: 'rail', name: 'レール', x: 4, z: 3, angle: Math.PI / 2 }
    ];
    this.reset();
  }
  reset() { this.time = 0; this.lift = 0; this.travel = 0; this.state = 'edit'; this.message = '部品を組んで、ベルまでビー玉を届けよう。'; }
  move(id, x, z, snap = true) {
    if (this.state !== 'edit') return;
    const p = this.parts.find(p => p.id === id);
    p.x = Math.max(-6, Math.min(6, Math.round(x * 5) / 5));
    p.z = Math.max(-3.5, Math.min(3.5, Math.round(z * 5) / 5));
    const target = this.targets()[id];
    if (snap && Math.hypot(p.x - target.x, p.z - target.z) < .55) { p.x = target.x; p.z = target.z; }
  }
  rotate(id) { if (this.state === 'edit') this.parts.find(p => p.id === id).angle += Math.PI / 2; }
  targets() { return { small: { x: -3.4, z: 0 }, large: { x: -1.8, z: 0 }, belt: { x: -.1, z: 0 }, rail: { x: 2.8, z: 0 } }; }
  connections() {
    const [s, l, b, r] = this.parts;
    const near = (p, x, z, tolerance = .16) => Math.hypot(p.x - x, p.z - z) < tolerance;
    const aligned = p => Math.abs(Math.sin(p.angle)) < .01;
    const input = Math.abs(Math.hypot(s.x + 4.6, s.z) - 1.2) < .12;
    const mesh = Math.abs(Math.hypot(l.x - s.x, l.z - s.z) - 1.6) < .12;
    const belt = near(b, (l.x + 1.6) / 2, l.z / 2) && Math.abs(l.x + 1.8) < .16 && Math.abs(l.z) < .16 && aligned(b);
    return { input, mesh, belt, rail: near(r, 2.8, 0) && Math.cos(r.angle) > .99,
      speeds: { handle: 2, small: input ? -2 : 0, large: input && mesh ? 1.2 : 0, lift: input && mesh && belt ? 1.2 : 0 } };
  }
  start() { if (this.state !== 'edit') return; this.reset(); this.state = 'running'; this.message = '試運転中… 接続とビー玉の行方を観察しよう。'; }
  step(dt) {
    if (this.state !== 'running') return;
    this.time += Math.min(dt, .05);
    const c = this.connections();
    this.lift = c.speeds.lift ? Math.min(1, this.time / 3) : 0;
    if (this.time > 3 && this.lift === 1) this.travel = Math.min(1, (this.time - 3) / 3);
    if (this.time > 3.5 && !c.speeds.lift) { this.state = 'failed'; this.message = !c.input ? 'ハンドルの力が小歯車に届かない。歯が触れる距離に置こう。' : !c.mesh ? '大小の歯車が噛み合っていない。隙間を観察しよう。' : 'ベルトがリフトへ力を伝えていない。位置と向きを直そう。'; }
    if (this.travel === 1) { this.state = c.rail ? 'success' : 'failed'; this.message = c.rail ? '成功！ からくりがつながり、ベルが鳴った！' : 'ビー玉が机に落ちた。レールの入口と下り方向を直そう。'; }
  }
}
