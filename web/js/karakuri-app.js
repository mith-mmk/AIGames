import * as THREE from 'three';
import { Workshop } from './karakuri-core.mjs';
import { MECHANISM as G } from './karakuri-contact.mjs';
import { STAGES } from './karakuri-levels.mjs';

class WorkshopView {
  constructor() {
    this.model = new Workshop(); this.host = document.querySelector('#view');
    try { const saved = JSON.parse(localStorage.getItem('karakuri-progress') || '[]'); if (Array.isArray(saved)) this.model.completed = new Set(saved.filter(n => Number.isInteger(n) && n >= 0 && n < STAGES.length)); } catch { /* Private mode still permits play. */ }
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.shadowMap.enabled = true;
    this.host.append(this.renderer.domElement); this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d9ceba'); this.scene.fog = new THREE.Fog('#d9ceba', 23, 45);
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
    this.yaw = .18; this.pitch = .85; this.distance = 18; this.selected = 'small'; this.slow = false;
    this.ray = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.5);
    this.scene.add(new THREE.HemisphereLight(0xfff6dc, 0x6c6854, 2.3));
    const sun = new THREE.DirectionalLight(0xffedc9, 3); sun.position.set(-5, 12, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8 }); this.scene.add(sun);
    this.materials = Object.fromEntries(Object.entries({ wood: '#aa7846', brass: '#bf9341', dark: '#4c5c59', ivory: '#efdfbd', teal: '#3b9d94', rubber: '#393b34' }).map(([k, v]) => [k, new THREE.MeshStandardMaterial({ color: v, roughness: k === 'brass' ? .3 : .7, metalness: k === 'brass' ? .7 : .15 })]));
    this.meshes = {}; this.init(); this.last = performance.now(); this.resize();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.host);
  }
  mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, this.materials[mat]); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  box(parent, x, y, z, w, h, d, mat) { return this.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z); }
  cylinder(parent, x, y, z, r, h, mat) { return this.mesh(new THREE.CylinderGeometry(r, r, h, 40), mat, parent, x, y, z); }
  gear(radius, parent) {
    const rotor = new THREE.Group(); parent.add(rotor); this.cylinder(rotor, 0, .6, 0, radius - .09, .18, 'brass');
    for (let i = 0; i < radius * 20; i++) { const a = i / (radius * 20) * Math.PI * 2; const tooth = this.box(rotor, Math.sin(a) * radius, .6, Math.cos(a) * radius, .16, .18, .2, 'brass'); tooth.rotation.y = a; }
    this.cylinder(rotor, 0, .76, 0, .15, .22, 'dark');
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; this.cylinder(rotor, Math.sin(a) * radius * .55, .705, Math.cos(a) * radius * .55, radius * .16, .02, 'dark'); }
    return rotor;
  }
  init() {
    if (this.stageRoot) { this.scene.remove(this.stageRoot); this.stageRoot.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    this.stageRoot = new THREE.Group(); this.scene.add(this.stageRoot); this.meshes = {};
    this.box(this.stageRoot, 0, -.25, 0, 14, .5, 9, 'wood');
    for (let i = -4; i <= 4; i++) this.box(this.stageRoot, 0, .006, i, 14, .012, .02, 'dark');
    for (const x of [-6.5, 6.5]) for (const z of [-4, 4]) this.cylinder(this.stageRoot, x, .02, z, .07, .03, 'brass');
    for (const [id, t] of Object.entries(this.model.targets())) { if (id === 'idler' && !this.model.part('idler')?.enabled) continue; const mark = this.mesh(new THREE.RingGeometry(.2, .27, 32), 'ivory', this.stageRoot, t.x, .03, t.z); mark.rotation.x = -Math.PI / 2; }
    this.handle = new THREE.Group(); this.handle.position.x = this.model.handleX; this.stageRoot.add(this.handle); this.handleRotor = this.gear(.6, this.handle);
    this.box(this.handleRotor, 0, .86, .55, .15, .15, 1.1, 'dark'); this.cylinder(this.handleRotor, 0, 1.15, 1.05, .15, .55, 'wood');
    for (const p of this.model.parts) {
      const group = new THREE.Group(); group.userData.id = p.id; this.stageRoot.add(group); this.meshes[p.id] = group;
      const selection = this.mesh(new THREE.RingGeometry((p.radius || .5) + .13, (p.radius || .5) + .18, 48), 'teal', group, 0, .025, 0);
      selection.rotation.x = -Math.PI / 2; group.userData.selection = selection;
      if (p.radius) group.userData.rotor = this.gear(p.radius, group);
      if (p.id === 'belt') {
        const length = 1.6 - this.model.targets().large.x;
        for (const x of [-length / 2, length / 2]) this.cylinder(group, x, G.beltY, 0, .23, .12, 'dark');
        if (this.model.beltMode === 'open') for (const z of [-.22, .22]) this.box(group, 0, G.beltY, z, length, .08, .07, 'rubber');
        else for (const sign of [-1, 1]) { const ribbon = this.box(group, 0, G.beltY + sign * .025, 0, Math.hypot(length, .44), .03, .07, 'rubber'); ribbon.rotation.y = sign * Math.atan2(.44, length); }
        group.userData.marker = this.box(group, 0, G.beltY + .06, -.22, .2, .06, .12, 'brass');
      }
      if (p.id === 'rail') {
        const slope = new THREE.Group(); slope.position.y = G.railY; slope.rotation.z = -G.railTilt; group.add(slope);
        this.box(slope, 0, 0, 0, G.railLength, G.railThickness, G.railWidth, 'ivory').name = 'rail-floor';
        for (const z of [-.33, .33]) this.box(slope, 0, .13, z, G.railLength - .24, .22, .07, 'brass').name = 'rail-guard';
        this.box(slope, -G.railLength / 2 + .09, G.railThickness / 2 + .0005, 0, .16, .001, .6, 'teal').name = 'rail-marker';
        for (const x of [-.8, .8]) this.box(group, x, .75, 0, .12, 1.5, .12, 'dark');
      }
    }
    this.cylinder(this.stageRoot, 1.6, G.beltY, 0, .23, .15, 'brass').name = 'lift-drive';
    this.cylinder(this.stageRoot, G.guideX, 1.3, -G.guideZ, .065, 2.6, 'brass').name = 'lift-screw';
    for (let y = .2; y < 2.6; y += .13) this.cylinder(this.stageRoot, G.guideX, y, -G.guideZ, G.screwRadius, .045, 'brass');
    for (const z of [-G.guideZ, G.guideZ]) this.box(this.stageRoot, G.guideX, 1.3, z, .1, 2.6, .1, 'dark').name = 'lift-guide';
    this.box(this.stageRoot, 1.12, G.beltY, -.6, .95, .06, .06, 'brass');
    this.platform = new THREE.Group(); this.stageRoot.add(this.platform); this.box(this.platform, 0, 0, 0, G.plateWidth, G.plateThickness, G.plateDepth, 'teal').name = 'lift-platform';
    this.latch = this.box(this.platform, G.plateWidth / 2 - .025, G.plateThickness / 2 + .16, 0, .07, .24, .7, 'brass'); this.latch.name = 'marble-latch';
    this.marble = this.mesh(new THREE.SphereGeometry(G.radius, 24, 16), 'teal', this.stageRoot); this.marble.name = 'marble';
    this.box(this.stageRoot, 4.65, .15, 0, 1, .3, 1.2, 'dark');
    this.bell = this.mesh(new THREE.CylinderGeometry(.16, .45, .65, 32), 'brass', this.stageRoot, 4.65, .72, 0);
    this.cylinder(this.stageRoot, 4.65, 1.12, 0, .1, .15, 'brass');
    this.gate = null;
    if (this.model.stage.window) {
      for (const z of [-.7, .7]) this.box(this.stageRoot, G.gateX, 1.7, z, .09, 3.4, .09, 'dark');
      this.box(this.stageRoot, G.gateX, 3.4, 0, .12, .12, 1.5, 'dark');
      this.gate = this.box(this.stageRoot, G.gateX, G.gateClosedY, 0, G.gateThickness, G.gateHeight, 1.15, 'brass'); this.gate.name = 'timed-gate';
    }
    bindPartButtons(this); this.sync();
  }
  sync() { for (const p of this.model.parts) { const g = this.meshes[p.id]; g.position.set(p.x, 0, p.z); g.rotation.y = -p.angle; g.visible = p.enabled !== false; } this.ui(); }
  loadStage(index) { this.model.init(index); this.selected = 'small'; this.drag = null; this.init(); }
  cycle(key) {
    const options = key === 'radius' ? this.model.stage.radii : key === 'beltMode' ? this.model.stage.beltModes : this.model.stage.delays;
    const current = key === 'radius' ? this.model.part('large').radius : this.model[key];
    if (this.model.configure(key, options[(options.indexOf(current) + 1) % options.length])) this.init();
  }
  toggleIdler() { if (this.model.configure('idler', !this.model.part('idler').enabled)) { this.selected = this.model.part('idler').enabled ? 'idler' : 'small'; this.init(); } }
  ui() {
    const state = this.model.state; const status = document.querySelector('#status'); status.textContent = this.model.message; status.dataset.state = state;
    const selected = this.model.parts.find(p => p.id === this.selected);
    document.querySelector('#selection').textContent = `選択：${selected.name}（${selected.x.toFixed(1)}, ${selected.z.toFixed(1)}） · 向き ${Math.round(selected.angle / Math.PI * 180) % 360}°`;
    document.querySelector('#run').disabled = state !== 'edit';
    document.querySelector('#rotate').disabled = state !== 'edit';
    document.querySelectorAll('[data-move]').forEach(b => b.disabled = state !== 'edit');
    document.querySelectorAll('[data-part]').forEach(b => b.classList.toggle('active', b.dataset.part === this.selected));
    for (const [id, group] of Object.entries(this.meshes)) group.userData.selection.visible = id === this.selected && state === 'edit';
    const stage = this.model.stage;
    document.querySelector('#stage-title').textContent = `工房 ${this.model.stageIndex + 1} / 10 · ${stage.name}`;
    document.querySelector('#goal').textContent = stage.goal; document.querySelector('#hint').textContent = stage.hint;
    document.querySelector('#mechanics').textContent = `${stage.screwDirection === 1 ? '右ねじ：正回転で上昇' : '左ねじ：逆回転で上昇'}${stage.window ? ` ／ 門 ${stage.window[0].toFixed(2)}〜${stage.window[1].toFixed(2)}秒` : ''}`;
    document.querySelector('#stage').value = String(this.model.stageIndex);
    document.querySelectorAll('#stage option').forEach((o, i) => o.textContent = `${this.model.completed.has(i) ? '✓ ' : ''}${i + 1}. ${STAGES[i].name}`);
    document.querySelector('#progress').value = this.model.completed.size; document.querySelector('#progress-label').textContent = `${this.model.completed.size} / 10 面クリア`;
    document.querySelector('#next').hidden = state !== 'success' || this.model.stageIndex === STAGES.length - 1;
    const settings = [ ['ratio', stage.radii.length > 1, `出力歯車：${selectedGearName(this.model.part('large').radius)}`, this.model.part('large').radius], ['belt-mode', stage.beltModes.length > 1, `ベルト：${this.model.beltMode === 'cross' ? '交差' : '平行'}`, this.model.beltMode], ['idler-toggle', stage.idler, `中継歯車：${this.model.part('idler')?.enabled ? '使用中' : '未使用'}`, this.model.part('idler')?.enabled], ['delay', stage.delays.length > 1, `玉止め：上で ${this.model.delay}秒待つ`, this.model.delay] ];
    for (const [id, visible, label, value] of settings) { const b = document.getElementById(id); b.hidden = !visible; b.disabled = state !== 'edit'; b.textContent = label; b.dataset.value = String(value); }
    for (const p of this.model.parts) { const b = document.querySelector(`[data-part="${p.id}"]`); if (b) b.disabled = p.enabled === false; }
  }
  resize() { const r = this.host.getBoundingClientRect(); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.renderer.setSize(r.width, r.height, false); }
  locate(event) { const r = this.host.getBoundingClientRect(); this.pointer.set((event.clientX - r.left) / r.width * 2 - 1, 1 - (event.clientY - r.top) / r.height * 2); this.ray.setFromCamera(this.pointer, this.camera); }
  down(e) {
    if (e.button !== 0) return; this.locate(e);
    const hits = this.ray.intersectObjects(Object.values(this.meshes).filter(g => g.visible), true);
    let obj = hits[0]?.object; while (obj && !obj.userData.id) obj = obj.parent;
    this.drag = { x: e.clientX, y: e.clientY, id: this.model.state === 'edit' ? obj?.userData.id : null };
    if (this.drag.id) { this.selected = this.drag.id; const point = new THREE.Vector3(); this.ray.ray.intersectPlane(this.plane, point); const p = this.model.parts.find(p => p.id === this.selected); this.drag.offset = { x: p.x - point.x, z: p.z - point.z }; this.ui(); }
    this.renderer.domElement.setPointerCapture(e.pointerId);
  }
  move(e) {
    if (!this.drag) return;
    if (this.drag.id) { this.locate(e); const point = new THREE.Vector3(); if (this.ray.ray.intersectPlane(this.plane, point)) this.model.move(this.drag.id, point.x + this.drag.offset.x, point.z + this.drag.offset.z); this.sync(); }
    else { this.yaw -= (e.clientX - this.drag.x) * .007; this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - this.drag.y) * .005, .3, 1.45); }
    this.drag.x = e.clientX; this.drag.y = e.clientY;
  }
  nudge(dx, dz) { const p = this.model.parts.find(p => p.id === this.selected); this.model.move(p.id, p.x + dx * .2, p.z + dz * .2, false); this.sync(); }
  reset(fresh = false) { if (fresh) { this.model.init(); this.selected = 'small'; this.init(); } else this.model.reset(); this.drag = null; this.sync(); }
  frame(now) {
    this.model.step((now - this.last) / 1000 * (this.slow ? .25 : 1)); this.last = now;
    const framedDistance = this.distance * Math.max(1, 1.25 / this.camera.aspect);
    this.camera.position.set(Math.sin(this.yaw) * Math.cos(this.pitch) * framedDistance, Math.sin(this.pitch) * framedDistance, Math.cos(this.yaw) * Math.cos(this.pitch) * framedDistance); this.camera.lookAt(0, .4, 0);
    const c = this.model.connections(); this.handleRotor.rotation.y = this.model.time * c.speeds.handle;
    for (const p of this.model.parts) if (p.radius) this.meshes[p.id].userData.rotor.rotation.y = this.model.time * c.speeds[p.id];
    this.meshes.belt.userData.marker.position.x = c.speeds.lift ? Math.sin(this.model.time * 3) * ((1.6 - this.model.targets().large.x) / 2 - .1) : 0;
    this.meshes.belt.userData.marker.position.z = this.model.beltMode === 'cross' ? -this.meshes.belt.userData.marker.position.x * .44 / (1.6 - this.model.targets().large.x) : -.22;
    const pose = this.model.pose();
    this.platform.position.copy(pose.platform); this.marble.position.copy(pose.marble);
    this.latch.position.z = this.model.travel > 0 ? .85 : 0;
    if (this.gate) this.gate.position.y = this.model.gateOpen() ? G.gateOpenY : G.gateClosedY;
    this.marble.rotation.z = -this.model.travel * 16;
    document.querySelector('#clock').textContent = `時計 ${this.model.time.toFixed(2)}秒 · リフト ${c.speeds.lift < 0 ? '逆' : '正'}回転 ×${(Math.abs(c.speeds.lift) / 1.2).toFixed(2)}${this.gate ? ` · 門 ${this.model.gateOpen() ? '開' : '閉'}` : ''}`;
    this.bell.rotation.z = this.model.state === 'success' ? Math.sin(now / 80) * .07 : 0;
    if (this.previousState !== this.model.state) { if (this.model.state === 'success') { this.chime(); try { localStorage.setItem('karakuri-progress', JSON.stringify([...this.model.completed])); } catch { /* Optional persistence. */ } } this.previousState = this.model.state; this.ui(); }
    this.renderer.render(this.scene, this.camera); requestAnimationFrame(n => this.frame(n));
  }
  chime() { try { const context = this.audio; if (!context) return; const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 1108; gain.gain.setValueAtTime(.2, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + 1.2); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 1.2); } catch { /* Audio is optional. */ } }
  start() { try { this.audio ||= new AudioContext(); this.audio.resume(); } catch { /* Silent play remains available. */ } this.drag = null; this.model.start(); this.ui(); }
}

function selectedGearName(radius) { return radius === .6 ? '小（速い）' : radius === 1.4 ? '特大（遅い）' : '大（標準）'; }
function bindPartButtons(game) {
  document.querySelector('#parts').replaceChildren();
  for (const p of game.model.parts) { const button = document.createElement('button'); button.textContent = p.name; button.dataset.part = p.id; button.addEventListener('click', () => { game.selected = p.id; game.ui(); }); document.querySelector('#parts').append(button); }
}
function bind(game) {
  const canvas = game.renderer.domElement;
  canvas.addEventListener('pointerdown', e => game.down(e)); canvas.addEventListener('pointermove', e => game.move(e));
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => game.drag = null);
  canvas.addEventListener('wheel', e => { e.preventDefault(); game.distance = THREE.MathUtils.clamp(game.distance + e.deltaY * .01, 11, 28); }, { passive: false });
  window.addEventListener('resize', () => game.resize());
  document.querySelector('#zoom-in').addEventListener('click', () => game.distance = Math.max(11, game.distance - 2));
  document.querySelector('#zoom-out').addEventListener('click', () => game.distance = Math.min(28, game.distance + 2));
  document.querySelector('#run').addEventListener('click', () => game.start());
  document.querySelector('#reset').addEventListener('click', () => game.reset());
  document.querySelector('#fresh').addEventListener('click', () => game.reset(true));
  STAGES.forEach((s, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `${i + 1}. ${s.name}`; document.querySelector('#stage').append(option); });
  document.querySelector('#stage').addEventListener('change', e => game.loadStage(Number(e.target.value)));
  document.querySelector('#next').addEventListener('click', () => { if (game.model.next()) { game.selected = 'small'; game.drag = null; game.init(); } });
  document.querySelector('#ratio').addEventListener('click', () => game.cycle('radius'));
  document.querySelector('#belt-mode').addEventListener('click', () => game.cycle('beltMode'));
  document.querySelector('#delay').addEventListener('click', () => game.cycle('delay'));
  document.querySelector('#idler-toggle').addEventListener('click', () => game.toggleIdler());
  document.querySelector('#rotate').addEventListener('click', () => { game.model.rotate(game.selected); game.sync(); });
  document.querySelector('#slow').addEventListener('click', e => { game.slow = !game.slow; e.currentTarget.setAttribute('aria-pressed', String(game.slow)); e.currentTarget.classList.toggle('active', game.slow); });
  bindPartButtons(game);
  document.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => game.nudge(...b.dataset.move.split(',').map(Number))));
  window.addEventListener('keydown', e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return; const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; if (moves[e.key]) { e.preventDefault(); game.nudge(...moves[e.key]); } if (e.key.toLowerCase() === 'r') { game.model.rotate(game.selected); game.sync(); } });
  game.ui(); requestAnimationFrame(n => game.frame(n));
}
try { bind(new WorkshopView()); } catch (error) { document.querySelector('#status').textContent = `3D表示を開始できません。WebGL対応ブラウザとネット接続を確認してください。${error.message}`; }
