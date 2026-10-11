import * as THREE from '../vendor/three-0.180.0/three.module.min.js';

function disposeGroup(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
  });
  group.clear();
}

// Only view objects live here. Optical rules and orientation state live in core.mjs.
export class GardenRenderer {
  constructor(container, onLayout, onContext) {
    this.container = container; this.onLayout = onLayout; this.onContext = onContext;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x182930);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 100);
    this.camera.position.set(2.6, 11, 8); this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xe2f4f1, 0x324552, 2.6));
    const sun = new THREE.DirectionalLight(0xffedc9, 3.3); sun.position.set(-5, 9, 3); this.scene.add(sun);
    this.board = new THREE.Group(); this.beams = new THREE.Group();
    this.scene.add(this.board, this.beams); this.mirrors = []; this.level = null; this.lost = false;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.contextLost = event => { event.preventDefault(); this.lost = true; this.onContext(false); };
    this.contextRestored = () => { this.lost = false; this.onContext(true); this.render(); };
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.contextRestored);
    this.resize();
  }
  init(level) {
    disposeGroup(this.board); disposeGroup(this.beams); this.level = level; this.mirrors = [];
    const w = level.width, h = level.height;
    const base = this.mesh(new THREE.BoxGeometry(w + .55, .28, h + .55), 0x263b40);
    base.position.y = -.28; this.board.add(base);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const tile = this.mesh(new THREE.BoxGeometry(.95, .12, .95), (x + y) % 2 ? 0x31474b : 0x354d50);
      tile.position.copy(this.position({ x, y }, -.08)); this.board.add(tile);
    }
    level.walls.forEach(cell => {
      const stone = this.mesh(new THREE.BoxGeometry(.72, .55, .72), 0x14232a);
      stone.position.copy(this.position(cell, .22)); this.board.add(stone);
      const cap = this.mesh(new THREE.BoxGeometry(.6, .03, .6), 0x334148);
      cap.position.copy(this.position(cell, .51)); this.board.add(cap);
    });
    level.mirrors.forEach(m => {
      const group = new THREE.Group(); group.position.copy(this.position(m, 0));
      const foot = this.mesh(new THREE.CylinderGeometry(.32, .37, .14, 24), m.fixed ? 0x77633f : 0x405a60);
      foot.position.y = .05; group.add(foot);
      const pivot = new THREE.Group(); group.add(pivot);
      const glass = this.mesh(new THREE.BoxGeometry(.86, .53, .055), m.fixed ? 0xd9b976 : 0xb8dce0, .5);
      glass.position.y = .4; pivot.add(glass);
      const top = this.mesh(new THREE.BoxGeometry(.9, .045, .075), m.fixed ? 0xf1ce85 : 0xddf7f1);
      top.position.y = .68; pivot.add(top);
      const rail = this.mesh(new THREE.BoxGeometry(.9, .04, .075), m.fixed ? 0xb28b4d : 0x739a9e);
      rail.position.y = .13; pivot.add(rail);
      group.traverse(object => { object.userData.mirrorIndex = this.mirrors.length; });
      this.board.add(group); this.mirrors.push(pivot);
    });
    const emitter = this.mesh(new THREE.BoxGeometry(.52, .52, .52), 0x536455, .2);
    emitter.position.copy(this.position(level.source, .24)); this.board.add(emitter);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8f6b5 }));
    lens.position.copy(this.position(level.source, .46)); lens.position.x += .27; this.board.add(lens);
    this.goalRing = this.ring(level.goal, .32, 0xe6dcc5, .7);
    const goalBase = this.mesh(new THREE.CylinderGeometry(.29, .35, .3, 8), 0x776c58, .2);
    goalBase.position.copy(this.position(level.goal, .1)); this.board.add(goalBase);
    this.checkpointRings = level.checkpoints.map(c => this.ring(c, .22, 0x659aab, .12));
    this.resize();
  }
  mesh(geometry, color, metalness = .08) {
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, metalness, roughness: .45 }));
  }
  ring(cell, radius, color, height) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .045, 8, 32), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2; ring.position.copy(this.position(cell, height)); this.board.add(ring); return ring;
  }
  position(cell, height = .48) { return new THREE.Vector3(cell.x - (this.level.width - 1) / 2, height, cell.y - (this.level.height - 1) / 2); }
  update(orientations, trace) {
    this.mirrors.forEach((pivot, i) => { pivot.rotation.y = orientations[i] === 0 ? Math.PI / 4 : -Math.PI / 4; });
    this.goalRing.material.color.setHex(trace.won ? 0xebffc5 : 0xe6dcc5);
    this.checkpointRings.forEach((ring, i) => { ring.material.color.setHex(trace.lit.includes(i) ? 0xc5ffff : 0x659aab); });
    disposeGroup(this.beams);
    const points = trace.points.filter((p, i, a) => i === 0 || i === a.length - 1 || p.direction !== a[i + 1].direction);
    for (let i = 1; i < points.length; i++) this.beam(this.position(points[i - 1]), this.position(points[i]));
    this.render();
  }
  beam(start, end) {
    const direction = end.clone().sub(start), length = direction.length();
    if (!length) return;
    for (const [radius, opacity] of [[.019, 1], [.055, .13]]) {
      const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), new THREE.MeshBasicMaterial({ color: 0xe5efb1, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
      object.position.copy(start.clone().add(end).multiplyScalar(.5));
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      this.beams.add(object);
    }
  }
  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    // Fit the actual projected board corners, including the highest mirror labels.
    this.camera.updateMatrixWorld();
    const w = (this.level?.width ?? 5) / 2 + .45, h = (this.level?.height ?? 5) / 2 + .45;
    const corners = [-w, w].flatMap(x => [-h, h].flatMap(z => [0, .95].map(y => new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse))));
    const halfX = Math.max(...corners.map(p => Math.abs(p.x))), halfY = Math.max(...corners.map(p => Math.abs(p.y)));
    const halfHeight = Math.max(halfY / .84, halfX / (aspect * .9));
    this.camera.left = -halfHeight * aspect; this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight; this.camera.bottom = -halfHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false); this.render();
  }
  layout() {
    if (!this.level) return [];
    const { width, height } = this.container.getBoundingClientRect();
    return this.level.mirrors.map(m => {
      const p = this.position(m, .99).project(this.camera);
      return { x: (p.x + 1) / 2 * width, y: (1 - p.y) / 2 * height };
    });
  }
  pick(clientX, clientY) {
    if (this.lost) return null;
    const rect = this.container.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.board.children, true)[0];
    return hit?.object.userData.mirrorIndex ?? null;
  }
  render() {
    if (this.lost) return;
    this.renderer.render(this.scene, this.camera); this.onLayout(this.layout());
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.contextRestored);
    disposeGroup(this.board); disposeGroup(this.beams); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
