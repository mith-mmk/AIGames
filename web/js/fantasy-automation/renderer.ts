import * as THREE from 'three';
import { WorldInput } from './input.js';
import { BELT_SECONDS, DEFINITIONS } from './data.js';
import { DIRECTIONS, SIZE, type Building, type Direction, type GameState, type Kind, type Resource } from './types.js';

export interface ViewOptions {
  kind: Kind | null;
  direction: Direction;
  valid: boolean;
  hover: { x: number; z: number } | null;
  selectedId: number | null;
  guideTarget?: { x: number; z: number; direction: number | null; kind: Kind | null } | null;
}
export interface ViewCallbacks {
  onPick(x: number, z: number, event: PointerEvent): void;
  onHover(x: number, z: number): void;
  onStatus(message: string): void;
}
type FacilityView = { group: THREE.Group; arrow: THREE.Group; item: THREE.Mesh; lamp: THREE.Mesh; kind: Kind; wires: THREE.Mesh[] };

/** Scene graph is a view of the simulation, never its owner. */
export class WorldView {
  private host: HTMLElement;
  private callbacks: ViewCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 150);
  private target = new THREE.Vector3(13, 0, 16);
  private bearing = Math.PI / 4;
  private extent = 11;
  private input: WorldInput;
  private observer: ResizeObserver;
  private abort = new AbortController();
  private terrain = new THREE.Group();
  private terrainKey = '';
  private facilities = new Map<number, FacilityView>();
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private ghost = new THREE.Group();
  private ghostPreview: FacilityView | null = null;
  private ghostPort = this.arrow();
  private ghostPower: THREE.Mesh | null = null;
  private selection = new THREE.Group();
  private guideMarker = new THREE.Group();
  private guideDirection = this.arrow(0xffee82);
  private guideLabel: HTMLDivElement;
  private guideLabelKey = '';
  private guideProjection = new THREE.Vector3();
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private pointerPosition = new THREE.Vector2();
  private intersection = new THREE.Vector3();
  private lastTime = performance.now();
  private disposed = false;
  private contextLost = false;
  private cursorOnMap = false;

  constructor(host: HTMLElement, callbacks: ViewCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (error) {
      callbacks.onStatus('3D 表示を開始できません。WebGL 対応ブラウザで開き直してください。');
      throw error;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xcddbd6);
    host.append(this.renderer.domElement);
    this.guideLabel = document.createElement('div');
    this.guideLabel.id = 'guide-target';
    this.guideLabel.hidden = true;
    Object.assign(this.guideLabel.style, {
      position: 'absolute', pointerEvents: 'none', zIndex: '1',
      padding: '5px 10px', border: '2px solid #ebcb6d', borderRadius: '8px',
      background: '#fff5daed', color: '#25483c', font: 'bold 12px/1.5 sans-serif',
      textAlign: 'center', whiteSpace: 'pre', transform: 'translate(-50%, -100%)',
      boxShadow: '0 3px 10px #17372d35',
    });
    host.append(this.guideLabel);
    this.renderer.domElement.addEventListener('pointerleave', () => { this.cursorOnMap = false; }, { signal: this.abort.signal });
    this.scene.background = new THREE.Color(0xcddbd6);
    this.scene.add(new THREE.HemisphereLight(0xfff8dd, 0x536865, 2.5));
    const sun = new THREE.DirectionalLight(0xffedd0, 2.1);
    sun.position.set(-12, 28, 8);
    this.scene.add(sun, this.terrain, this.ghost, this.selection, this.guideMarker);
    this.createOutline(this.ghost, 0x7eedaf);
    this.ghostPort.position.set(0, 0.12, -0.37);
    this.ghost.add(this.ghostPort);
    this.ghostPower = this.cylinder(this.ghost, 0x94eaff, 0.085, 0.14, [0.38, 0.22, 0.38], true);
    this.createOutline(this.selection, 0xffdc6e);
    this.createOutline(this.guideMarker, 0xffee82);
    this.guideDirection.position.set(0, 0.25, 0);
    this.guideMarker.add(this.guideDirection);
    const downArrow = this.cylinder(this.guideMarker, 0xffee82, 0.14, 0.35, [0, 1.36, 0], true);
    downArrow.rotation.z = Math.PI;
    this.guideMarker.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = this.material(0xffee82, 0x4e390c);
        (child.material as THREE.MeshStandardMaterial).depthTest = false;
        child.renderOrder = 20;
      }
    });
    this.guideMarker.visible = false;
    this.ghost.visible = this.selection.visible = false;
    this.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.contextLost = true;
      callbacks.onStatus('3D 表示が中断しました。復旧を待っています。進行は保存できます。');
    }, { signal: this.abort.signal });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.lastTime = performance.now();
      this.resize();
      callbacks.onStatus('3D 表示を復旧しました。');
    }, { signal: this.abort.signal });
    this.input = new WorldInput(this.renderer.domElement, {
      pick: event => this.pick(event), onPick: callbacks.onPick, onHover: callbacks.onHover,
      pan: (dx, dy) => this.pan(dx, dy), rotate: delta => this.rotate(delta), zoom: delta => this.zoom(delta),
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  private geometry(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = create(); this.geometries.set(key, geometry); }
    return geometry;
  }

  private material(color: number, emissive = 0, transparent = false): THREE.MeshStandardMaterial {
    const key = `${color}/${emissive}/${transparent}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, emissive, transparent, opacity: transparent ? 0.5 : 1 });
      this.materials.set(key, material);
    }
    return material;
  }

  private box(group: THREE.Group, color: number, size: [number, number, number], position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(color));
    mesh.scale.set(...size); mesh.position.set(...position); group.add(mesh); return mesh;
  }

  private cylinder(group: THREE.Group, color: number, radius: number, height: number, position: [number, number, number], cone = false): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(cone ? 'cone' : 'cylinder', () => cone ? new THREE.ConeGeometry(1, 1, 6) : new THREE.CylinderGeometry(1, 1, 1, 8)), this.material(color));
    mesh.scale.set(radius, height, radius); mesh.position.set(...position); group.add(mesh); return mesh;
  }

  private arrow(color = 0xf3d178): THREE.Group {
    const group = new THREE.Group();
    this.box(group, color, [0.055, 0.025, 0.28], [0, 0, -0.04]);
    const head = this.cylinder(group, color, 0.105, 0.16, [0, 0, -0.24], true);
    head.rotation.x = -Math.PI / 2;
    return group;
  }

  private createOutline(group: THREE.Group, color: number): void {
    this.box(group, color, [1.03, 0.04, 0.045], [0, 0.05, -0.51]);
    this.box(group, color, [1.03, 0.04, 0.045], [0, 0.05, 0.51]);
    this.box(group, color, [0.045, 0.04, 1.03], [-0.51, 0.05, 0]);
    this.box(group, color, [0.045, 0.04, 1.03], [0.51, 0.05, 0]);
  }

  private rebuildTerrain(state: GameState): void {
    // Instancing makes the 1,024 map tiles and repeated scenery cheap to draw.
    for (const child of this.terrain.children) if (child instanceof THREE.InstancedMesh) child.dispose();
    this.terrain.clear();
    const tiles = new THREE.InstancedMesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(0xffffff), SIZE * SIZE);
    const matrix = new THREE.Matrix4();
    const tileColors = { grass: 0x769881, forest: 0x5e8268, ore: 0x8c9994 };
    const trees: number[] = [], rocks: number[] = [];
    const occupied = new Set(state.buildings.map(building => building.z * SIZE + building.x));
    state.terrain.forEach((type, index) => {
      const x = index % SIZE, z = Math.floor(index / SIZE);
      matrix.compose(new THREE.Vector3(x, -0.105, z), new THREE.Quaternion(), new THREE.Vector3(0.98, 0.16, 0.98));
      tiles.setMatrixAt(index, matrix);
      const color = new THREE.Color(tileColors[type]);
      color.multiplyScalar(0.95 + (((x * 31 + z * 13) % 7) / 100));
      tiles.setColorAt(index, color);
      // Resource-colored ground remains, but scenery must not hide a placed facility.
      if (type === 'forest' && !occupied.has(index)) trees.push(index);
      if (type === 'ore' && !occupied.has(index)) rocks.push(index);
    });
    this.terrain.add(tiles);
    if (trees.length) {
      const trunks = new THREE.InstancedMesh(this.geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 8)), this.material(0x735c46), trees.length);
      const crowns = new THREE.InstancedMesh(this.geometry('cone', () => new THREE.ConeGeometry(1, 1, 6)), this.material(0x2e635a), trees.length);
      trees.forEach((index, i) => {
        const x = index % SIZE + 0.23, z = Math.floor(index / SIZE) + 0.23;
        matrix.compose(new THREE.Vector3(x, 0.23, z), new THREE.Quaternion(), new THREE.Vector3(0.065, 0.48, 0.065)); trunks.setMatrixAt(i, matrix);
        matrix.compose(new THREE.Vector3(x, 0.67, z), new THREE.Quaternion(), new THREE.Vector3(0.26, 0.72, 0.26)); crowns.setMatrixAt(i, matrix);
      });
      this.terrain.add(trunks, crowns);
    }
    if (rocks.length) {
      const stones = new THREE.InstancedMesh(this.geometry('rock', () => new THREE.DodecahedronGeometry(1, 0)), this.material(0x87bed0), rocks.length);
      rocks.forEach((index, i) => {
        matrix.compose(new THREE.Vector3(index % SIZE + 0.25, 0.18, Math.floor(index / SIZE) + 0.22), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), index), new THREE.Vector3(0.22, 0.28, 0.2));
        stones.setMatrixAt(i, matrix);
      });
      this.terrain.add(stones);
    }
  }

  private facility(kind: Kind): FacilityView {
    const group = new THREE.Group();
    const arrow = this.arrow();
    arrow.visible = !['wire', 'generator', 'delivery'].includes(kind);
    const wires: THREE.Mesh[] = [];
    arrow.position.y = kind === 'belt' ? 0.17 : 0.08;
    arrow.position.z = kind === 'belt' ? 0 : -0.22;
    group.add(arrow);
    if (kind === 'belt') {
      this.box(group, 0x424e52, [0.7, 0.13, 0.9], [0, 0.07, 0]);
      for (const x of [-0.31, 0.31]) this.box(group, 0xb79657, [0.06, 0.15, 0.9], [x, 0.15, 0]);
    } else if (kind === 'wire') {
      this.cylinder(group, 0x596b77, 0.065, 0.55, [0, 0.28, 0]);
      const orb = this.cylinder(group, 0x89d5dc, 0.12, 0.15, [0, 0.61, 0], true); orb.rotation.z = Math.PI;
      arrow.visible = false;
      for (const [dx, dz] of DIRECTIONS) {
        const wire = this.box(group, 0x82c8d2, [dx ? 0.52 : 0.045, 0.045, dz ? 0.52 : 0.045], [dx * 0.25, 0.4, dz * 0.25]);
        wire.visible = false; wires.push(wire);
      }
    } else {
      this.box(group, 0x546772, [0.76, 0.13, 0.76], [0, 0.07, 0]);
      if (kind === 'miner') {
        this.box(group, 0x799ea7, [0.59, 0.38, 0.55], [0, 0.33, 0]);
        this.cylinder(group, 0xe2b969, 0.14, 0.39, [0, 0.61, -0.04], true).rotation.z = Math.PI;
        this.box(group, 0xe2b969, [0.5, 0.07, 0.07], [0, 0.75, 0]);
      } else if (kind === 'smelter') {
        this.cylinder(group, 0xa36a59, 0.32, 0.58, [0, 0.41, 0]);
        this.cylinder(group, 0xeacb9a, 0.2, 0.16, [0, 0.77, 0], true);
        this.box(group, 0x544e50, [0.17, 0.6, 0.17], [0.23, 0.86, 0.2]);
        this.box(group, 0xffbd66, [0.23, 0.17, 0.035], [0, 0.35, 0.33]);
      } else if (kind === 'generator') {
        this.cylinder(group, 0x736ba0, 0.34, 0.55, [0, 0.39, 0]);
        this.cylinder(group, 0xadcbd8, 0.24, 0.3, [0, 0.82, 0], true);
        this.box(group, 0xc7a66f, [0.65, 0.08, 0.65], [0, 0.63, 0]);
      } else if (kind === 'lumber') {
        this.box(group, 0xa4845f, [0.56, 0.44, 0.52], [0, 0.35, 0]);
        const roof = this.cylinder(group, 0x64807a, 0.43, 0.34, [0, 0.7, 0], true); roof.rotation.y = Math.PI / 6;
        this.box(group, 0xe1bf87, [0.11, 0.13, 0.43], [-0.24, 0.29, -0.1]);
      } else {
        this.box(group, 0xbca071, [0.62, 0.41, 0.62], [0, 0.35, 0]);
        this.box(group, 0x675a50, [0.66, 0.07, 0.66], [0, 0.59, 0]);
        this.box(group, 0xedd594, [0.09, 0.48, 0.66], [0, 0.35, 0]);
      }
    }
    const item = new THREE.Mesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(0xe0c494));
    item.scale.set(0.19, 0.14, 0.22); item.visible = false; group.add(item);
    const lamp = new THREE.Mesh(this.geometry('rock', () => new THREE.DodecahedronGeometry(1, 0)), this.material(0x74837a));
    lamp.scale.setScalar(0.055); lamp.position.set(0.25, kind === 'belt' ? 0.22 : 0.66, 0.22);
    lamp.visible = kind !== 'wire' && kind !== 'belt'; group.add(lamp);
    return { group, arrow, item, lamp, kind, wires };
  }

  private itemColor(resource: Resource): number {
    return { wood: 0xb68752, ore: 0x82c2d6, ingot: 0xd6d9d3 }[resource];
  }

  private updateFacility(view: FacilityView, building: Building): void {
    view.group.position.set(building.x, 0, building.z);
    view.group.rotation.y = -building.direction * Math.PI / 2;
    view.lamp.material = this.material(building.working ? 0x8ce2a8 : 0xcf9272, building.working ? 0x234c2b : 0);
    const item = building.item ?? building.output[0];
    view.item.visible = !!item;
    if (item) {
      view.item.material = this.material(this.itemColor(item.resource));
      view.item.position.set(0, building.kind === 'belt' ? 0.27 : 0.2, building.kind === 'belt' ? 0.34 - Math.min(1, building.beltProgress / BELT_SECONDS) * 0.68 : -0.36);
    }
  }

  render(state: GameState, options: ViewOptions): void {
    if (this.disposed) return;
    const now = performance.now();
    this.input.update((now - this.lastTime) / 1000); this.lastTime = now;
    const resourceOccupancy = state.buildings.map(building => building.z * SIZE + building.x)
      .filter(index => state.terrain[index] !== 'grass').sort((a, b) => a - b).join(',');
    const key = `${state.seed}:${state.terrain.join(',')}:${resourceOccupancy}`;
    if (key !== this.terrainKey) { this.rebuildTerrain(state); this.terrainKey = key; }
    const ids = new Set<number>();
    const cells = new Map(state.buildings.map(building => [`${building.x},${building.z}`, building]));
    const powerKinds = new Set<Kind>(['wire', 'generator', 'miner', 'smelter']);
    const energized = new Set<string>();
    const frontier = state.buildings.filter(building => building.kind === 'generator' && building.energy > 0);
    for (let index = 0; index < frontier.length; index++) {
      const building = frontier[index], cellKey = `${building.x},${building.z}`;
      if (energized.has(cellKey)) continue;
      energized.add(cellKey);
      for (const [dx, dz] of DIRECTIONS) {
        const neighborKey = `${building.x + dx},${building.z + dz}`, neighbor = cells.get(neighborKey);
        if (neighbor && powerKinds.has(neighbor.kind) && !energized.has(neighborKey)) frontier.push(neighbor);
      }
    }
    for (const building of state.buildings) {
      ids.add(building.id);
      let view = this.facilities.get(building.id);
      if (view && view.kind !== building.kind) { this.scene.remove(view.group); this.facilities.delete(building.id); view = undefined; }
      if (!view) { view = this.facility(building.kind); this.facilities.set(building.id, view); this.scene.add(view.group); }
      this.updateFacility(view, building);
      if (building.kind === 'wire') for (let index = 0; index < 4; index++) {
        const [dx, dz] = DIRECTIONS[index];
        const neighbor = cells.get(`${building.x + dx},${building.z + dz}`);
        // Wire shape is world aligned; compensate building rotation for the local arms.
        view.wires[index].visible = !!neighbor && ['wire', 'generator', 'miner', 'smelter'].includes(neighbor.kind);
      }
      if (building.kind === 'wire') view.group.rotation.y = 0;
    }
    for (const [id, view] of this.facilities) if (!ids.has(id)) { this.scene.remove(view.group); this.facilities.delete(id); }
    this.ghost.visible = !!options.kind && !!options.hover && this.cursorOnMap;
    if (this.ghost.visible && options.hover) {
      if (this.ghostPreview?.kind !== options.kind) {
        if (this.ghostPreview) this.ghost.remove(this.ghostPreview.group);
        this.ghostPreview = this.facility(options.kind!);
        this.ghostPreview.item.visible = this.ghostPreview.lamp.visible = false;
        this.ghost.add(this.ghostPreview.group);
      }
      this.ghost.position.set(options.hover.x, 0, options.hover.z);
      // Reuse the outline. Green/red communicates feasibility without hiding the tile.
      this.ghost.traverse(child => {
        if (child instanceof THREE.Mesh) child.material = this.material(options.valid ? 0x8fffb1 : 0xff786e, 0, child.parent !== this.ghost);
      });
      this.ghost.rotation.y = -options.direction * Math.PI / 2;
      this.ghostPort.visible = !!options.kind && !['wire', 'generator', 'delivery'].includes(options.kind);
      if (this.ghostPort.visible && options.kind) {
        const [dx, dz] = DIRECTIONS[options.direction];
        const outX = options.hover.x + dx, outZ = options.hover.z + dz;
        const outOfMap = outX < 0 || outX >= SIZE || outZ < 0 || outZ >= SIZE;
        const receiver = cells.get(`${outX},${outZ}`);
        let outputs: Resource[] = options.kind === 'miner' ? ['ore'] : options.kind === 'smelter' ? ['ingot'] : options.kind === 'lumber' ? ['wood'] : ['wood', 'ore', 'ingot'];
        if (options.kind === 'belt') {
          // A neighboring source can make a prospective belt's resource known.
          const incoming = DIRECTIONS.map(([sx, sz]) => cells.get(`${options.hover!.x + sx},${options.hover!.z + sz}`))
            .filter((building): building is Building => !!building)
            .filter(building => {
              const [sx, sz] = DIRECTIONS[building.direction];
              return building.x + sx === options.hover!.x && building.z + sz === options.hover!.z;
            });
          const known = incoming.flatMap(building => building.item ? [building.item.resource] : building.output.length ? building.output.map(item => item.resource) : building.kind === 'miner' ? ['ore' as Resource] : building.kind === 'smelter' ? ['ingot' as Resource] : building.kind === 'lumber' ? ['wood' as Resource] : []);
          if (known.length) outputs = known;
        }
        const accepted: Resource[] = receiver?.kind === 'belt' ? ['wood', 'ore', 'ingot'] : receiver?.kind === 'smelter' ? ['ore'] : receiver?.kind === 'generator' ? ['wood'] : receiver?.kind === 'delivery' ? ['ingot'] : [];
        const compatible = outputs.some(resource => accepted.includes(resource));
        const portColor = outOfMap || (receiver && !compatible) ? 0xff6259 : receiver ? 0x8fffad : 0xf3b354;
        this.ghostPort.traverse(child => { if (child instanceof THREE.Mesh) child.material = this.material(portColor); });
        // Preserve the preview's own arrow as well as the external port glyph.
        this.ghostPreview?.arrow.traverse(child => { if (child instanceof THREE.Mesh) child.material = this.material(portColor); });
      }
      if (this.ghostPower) {
        const powerKind = options.kind && ['miner', 'smelter', 'generator', 'wire'].includes(options.kind);
        this.ghostPower.visible = !!powerKind;
        const connected = DIRECTIONS.some(([dx, dz]) => {
          const neighbor = cells.get(`${options.hover!.x + dx},${options.hover!.z + dz}`);
          return neighbor && ['wire', 'generator', 'miner', 'smelter'].includes(neighbor.kind);
        });
        const powered = DIRECTIONS.some(([dx, dz]) => energized.has(`${options.hover!.x + dx},${options.hover!.z + dz}`));
        this.ghostPower.material = this.material(powered ? 0x6ae3ff : connected ? 0xb79ae1 : 0xe7aa69, 0x20383a);
      }
    }
    const selected = options.selectedId == null ? null : this.facilities.get(options.selectedId);
    this.selection.visible = !!selected;
    if (selected) this.selection.position.copy(selected.group.position);
    this.updateGuide(options.guideTarget ?? null, now);
    if (!this.contextLost) this.renderer.render(this.scene, this.camera);
  }

  private updateGuide(target: ViewOptions['guideTarget'], now: number): void {
    const visible = !!target && target.x >= 0 && target.x < SIZE && target.z >= 0 && target.z < SIZE;
    this.guideMarker.visible = visible;
    this.guideLabel.hidden = !visible;
    if (!visible || !target) return;
    this.guideMarker.position.set(target.x, 0.09, target.z);
    const pulse = this.reducedMotion.matches ? 1.08 : 1.08 + Math.sin(now / 350) * 0.025;
    this.guideMarker.scale.set(pulse, 1, pulse);
    this.guideDirection.visible = target.direction !== null;
    if (target.direction !== null) this.guideDirection.rotation.y = -target.direction * Math.PI / 2;
    const key = `${target.x},${target.z},${target.kind},${target.direction}`;
    if (key !== this.guideLabelKey) {
      this.guideLabelKey = key;
      const kind = target.kind ? DEFINITIONS[target.kind].label : 'この区画';
      const direction = target.direction === null ? '' : ` · ${['北', '東', '南', '西'][target.direction]}向き`;
      this.guideLabel.textContent = `${kind} (${target.x}, ${target.z})${direction}\n↓ 光る区画をクリック`;
      this.guideLabel.dataset.x = String(target.x);
      this.guideLabel.dataset.z = String(target.z);
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.guideProjection.set(target.x, 0, target.z).project(this.camera);
    const screenX = rect.left + (this.guideProjection.x + 1) * rect.width / 2;
    const screenY = rect.top + (1 - this.guideProjection.y) * rect.height / 2;
    // Test/user pick coordinates identify the actual ground cell, not its floating label.
    const projectedX = screenX.toFixed(2), projectedY = screenY.toFixed(2);
    if (this.guideLabel.dataset.screenX !== projectedX) this.guideLabel.dataset.screenX = projectedX;
    if (this.guideLabel.dataset.screenY !== projectedY) this.guideLabel.dataset.screenY = projectedY;
    const hostRect = this.host.getBoundingClientRect();
    const labelX = Math.max(110, Math.min(hostRect.width - 110, screenX - hostRect.left));
    const labelY = Math.max(135, Math.min(hostRect.height - 170, screenY - hostRect.top - 50));
    const labelLeft = `${labelX}px`, labelTop = `${labelY}px`;
    if (this.guideLabel.style.left !== labelLeft) this.guideLabel.style.left = labelLeft;
    if (this.guideLabel.style.top !== labelTop) this.guideLabel.style.top = labelTop;
    const offscreen = Math.abs(this.guideProjection.x) > 1 || Math.abs(this.guideProjection.y) > 1;
    this.guideLabel.hidden = offscreen;
  }

  private pick(event: PointerEvent): { x: number; z: number } | null {
    this.cursorOnMap = false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    this.pointerPosition.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointerPosition, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.intersection)) return null;
    const x = Math.floor(this.intersection.x + 0.5), z = Math.floor(this.intersection.z + 0.5);
    this.cursorOnMap = x >= 0 && x < SIZE && z >= 0 && z < SIZE;
    return this.cursorOnMap ? { x, z } : null;
  }

  private updateCamera(): void {
    this.camera.position.set(this.target.x + Math.sin(this.bearing) * 25, 29, this.target.z + Math.cos(this.bearing) * 25);
    this.camera.lookAt(this.target); this.camera.updateMatrixWorld();
  }

  private pan(dx: number, dy: number): void {
    const scale = this.extent * 2 / Math.max(1, this.host.clientHeight);
    this.target.x += (-dx * Math.cos(this.bearing) - dy * Math.sin(this.bearing)) * scale;
    this.target.z += (dx * Math.sin(this.bearing) - dy * Math.cos(this.bearing)) * scale;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -5, SIZE + 4);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -5, SIZE + 4);
    this.updateCamera();
  }

  private rotate(delta: number): void { this.bearing += delta; this.updateCamera(); }
  private zoom(delta: number): void { this.extent = THREE.MathUtils.clamp(this.extent * Math.exp(delta), 3.5, 25); this.resize(); }

  resize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    const aspect = width / height;
    this.camera.left = -this.extent * aspect; this.camera.right = this.extent * aspect;
    this.camera.top = this.extent; this.camera.bottom = -this.extent;
    this.camera.updateProjectionMatrix(); this.updateCamera();
    this.renderer.setSize(width, height);
  }

  resetCamera(): void { this.target.set(13, 0, 16); this.bearing = Math.PI / 4; this.extent = 11; this.resize(); }

  /** Bring an edge/offscreen guide cell into reach without disturbing a visible view. */
  revealTile(x: number, z: number): void {
    if (this.disposed || x < 0 || x >= SIZE || z < 0 || z >= SIZE) return;
    this.guideProjection.set(x, 0, z).project(this.camera);
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    const pixelX = (this.guideProjection.x + 1) * width / 2;
    const pixelY = (1 - this.guideProjection.y) * height / 2;
    if (pixelX >= 32 && pixelX <= width - 32 && pixelY >= 32 && pixelY <= height - 32) return;
    this.target.set(x, 0, z);
    this.updateCamera();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.input.dispose(); this.observer.disconnect(); this.abort.abort();
    for (const child of this.terrain.children) if (child instanceof THREE.InstancedMesh) child.dispose();
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.scene.clear(); this.facilities.clear(); this.renderer.dispose(); this.renderer.domElement.remove();
    this.guideLabel.remove();
  }
}
