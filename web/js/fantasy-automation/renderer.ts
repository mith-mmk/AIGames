import * as THREE from 'three';
import { WorldInput } from './input.js';
import { BELT_SECONDS, RECIPES, DEFINITIONS, POWER_KINDS, STORAGE_CAPACITY, PORTAL_INTERVAL } from './data.js';
import { DIRECTIONS, SIZE, type Building, type Direction, type GameState, type Kind, type RecipeId, type Resource } from './types.js';
import { acceptedResources, logisticsPorts, outputDirections, outputResources as sourceResources, type PortVisual, type PortVisualState } from './logistics-visuals.js';

const RESOURCE_COLORS: Record<Resource, number> = {
  wood: 0xb68752, ore: 0x82c2d6, ingot: 0xd6d9d3,
  rawCrystal: 0xc9ace0, crystal: 0x9862df, sword: 0xebd18e,
  runeCore: 0xffbe70, golemFrame: 0x8babae, golem: 0x8ce2c4,
  essence: 0x7edfd5, portalCore: 0xba98ed, worldSeed: 0xdeecac,
};

export interface ViewOptions {
  recipe?: RecipeId;
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
type PortGlyph = { group: THREE.Group; linked: THREE.Group; missing: THREE.Group; stop: THREE.Group; invalid: THREE.Group };
type FacilityView = { group: THREE.Group; arrow: THREE.Group; sideArrow: THREE.Group | null; item: THREE.Mesh; itemBrand: THREE.Mesh; lamp: THREE.Mesh; kind: Kind; wires: THREE.Mesh[]; sockets: THREE.Mesh[]; ports: PortGlyph[]; chevrons: THREE.InstancedMesh | null; flowKey: string; contents: THREE.InstancedMesh | null; contentsBrands: THREE.InstancedMesh | null; contentsKey: string; worker: THREE.Group | null; route: THREE.Line | null; bead: THREE.Mesh | null; tree: THREE.Group | null; portalRole?: Building['portalRole']; portalLabel: HTMLDivElement | null; channelMarks: THREE.Mesh[] };

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
  private ghostSidePort = this.arrow();
  private ghostPower: THREE.Mesh | null = null;
  private ghostFeasibility = new THREE.Group();
  private ghostCheck = new THREE.Group();
  private ghostCross = new THREE.Group();
  private selection = new THREE.Group();
  private selectedDirection = this.arrow(0xffeb94);
  private selectedSideDirection = this.arrow(0xffeb94);
  private flowMatrix = new THREE.Matrix4();
  private flowPosition = new THREE.Vector3();
  private flowRotation = new THREE.Quaternion();
  private flowScale = new THREE.Vector3(1, 1, 1);
  private routeStart = new THREE.Vector3();
  private routeEnd = new THREE.Vector3();
  private relayLineMaterial = new THREE.LineBasicMaterial({ color: 0x9cebd4, transparent: true, opacity: 0.7 });
  private portalLineMaterial = new THREE.LineBasicMaterial({ color: 0xc9b2f4, transparent: true, opacity: 0.65 });
  private selectedRelayRange = new THREE.LineLoop(this.geometry('relay-range', () => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(6, 0.08, 0), new THREE.Vector3(0, 0.08, 6), new THREE.Vector3(-6, 0.08, 0), new THREE.Vector3(0, 0.08, -6),
  ])), this.relayLineMaterial);
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
    this.scene.add(sun, this.terrain, this.ghost, this.selection, this.guideMarker, this.selectedRelayRange);
    this.selectedRelayRange.visible = false;
    this.createOutline(this.ghost, 0x7eedaf);
    this.ghostPort.position.set(0, 0.42, -0.37);
    this.ghost.add(this.ghostPort);
    this.ghostSidePort.position.set(0.37, 0.42, 0);
    this.ghostSidePort.rotation.y = -Math.PI / 2;
    this.ghostSidePort.visible = false;
    this.ghost.add(this.ghostSidePort);
    this.ghostPower = this.cylinder(this.ghost, 0x94eaff, 0.085, 0.14, [0.38, 0.22, 0.38], true);
    this.ghostFeasibility.position.set(0.38, 1.05, 0.38);
    this.box(this.ghostFeasibility, 0x344441, [0.34, 0.025, 0.34], [0, 0, 0]).userData.visualBackdrop = true;
    this.box(this.ghostCheck, 0xc7ffdb, [0.13, 0.045, 0.05], [-0.065, 0.035, 0.02]).rotation.y = -Math.PI / 4;
    this.box(this.ghostCheck, 0xc7ffdb, [0.23, 0.045, 0.05], [0.04, 0.035, -0.025]).rotation.y = Math.PI / 4;
    for (const angle of [-Math.PI / 4, Math.PI / 4]) this.box(this.ghostCross, 0xffd2c6, [0.28, 0.045, 0.05], [0, 0.035, 0]).rotation.y = angle;
    this.ghostFeasibility.add(this.ghostCheck, this.ghostCross); this.ghost.add(this.ghostFeasibility);
    this.createOutline(this.selection, 0xffdc6e);
    this.selectedDirection.position.set(0, 1.45, -0.18);
    this.selectedDirection.scale.setScalar(1.9);
    this.selectedSideDirection.position.set(0.18, 1.45, 0);
    this.selectedSideDirection.rotation.y = -Math.PI / 2;
    this.selectedSideDirection.scale.setScalar(1.9);
    this.selection.add(this.selectedDirection, this.selectedSideDirection);
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

  private portGlyph(): PortGlyph {
    const group = new THREE.Group(), linked = new THREE.Group(), missing = new THREE.Group(), stop = new THREE.Group(), invalid = new THREE.Group();
    this.box(stop, 0x344441, [0.29, 0.02, 0.29], [0, -0.035, 0]).userData.visualBackdrop = true;
    this.box(invalid, 0x344441, [0.31, 0.02, 0.29], [0, -0.035, 0]).userData.visualBackdrop = true;
    for (const x of [-0.055, 0.055]) {
      const link = new THREE.Mesh(this.geometry('link', () => new THREE.TorusGeometry(0.078, 0.023, 4, 8)), this.material(0x93efe0));
      link.position.x = x; link.rotation.x = Math.PI / 2; linked.add(link);
      this.box(missing, 0xf1ca7b, [0.075, 0.035, 0.055], [x * 1.5, 0, 0]);
      this.box(stop, 0xffb466, [0.055, 0.055, 0.25], [x, 0, 0]);
    }
    for (const angle of [-Math.PI / 4, Math.PI / 4]) this.box(invalid, 0xff8276, [0.28, 0.055, 0.05], [0, 0, 0]).rotation.y = angle;
    group.add(linked, missing, stop, invalid);
    return { group, linked, missing, stop, invalid };
  }

  private paintPort(glyph: PortGlyph, state: PortVisualState): void {
    glyph.linked.visible = state === 'connected'; glyph.missing.visible = state === 'missing';
    glyph.stop.visible = state === 'full'; glyph.invalid.visible = state === 'incompatible' || state === 'edge';
    const colors = { linked: 0x93efe0, missing: 0xf1ca7b, stop: 0xffb466, invalid: 0xff8276 };
    for (const name of ['linked', 'missing', 'stop', 'invalid'] as const) glyph[name].traverse(child => {
      if (child instanceof THREE.Mesh) child.material = this.material(child.userData.visualBackdrop ? 0x344441 : colors[name]);
    });
  }

  private rebuildTerrain(state: GameState): void {
    // Instancing makes the 1,024 map tiles and repeated scenery cheap to draw.
    for (const child of this.terrain.children) if (child instanceof THREE.InstancedMesh) child.dispose();
    this.terrain.clear();
    const tiles = new THREE.InstancedMesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(0xffffff), SIZE * SIZE);
    const matrix = new THREE.Matrix4();
    const tileColors: Record<GameState['terrain'][number], number> = { grass: 0x769881, forest: 0x5e8268, ore: 0x8c9994, crystal: 0x9281ad };
    const trees: number[] = [], rocks: number[] = [], crystals: number[] = [];
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
      if (type === 'crystal' && !occupied.has(index)) crystals.push(index);
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
    if (crystals.length) {
      const gems = new THREE.InstancedMesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xb497e3, 0x21112f), crystals.length * 2);
      crystals.forEach((index, i) => {
        const x = index % SIZE, z = Math.floor(index / SIZE);
        matrix.compose(new THREE.Vector3(x + 0.19, 0.32, z + 0.2), new THREE.Quaternion(), new THREE.Vector3(0.2, 0.48, 0.2));
        gems.setMatrixAt(i * 2, matrix);
        matrix.compose(new THREE.Vector3(x - 0.19, 0.17, z - 0.08), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.2), new THREE.Vector3(0.14, 0.25, 0.14));
        gems.setMatrixAt(i * 2 + 1, matrix);
      });
      this.terrain.add(gems);
    }
  }

  private facility(kind: Kind, portalRole: Building['portalRole'] = 'send'): FacilityView {
    const group = new THREE.Group();
    const arrow = this.arrow();
    let sideArrow: THREE.Group | null = null;
    let contents: THREE.InstancedMesh | null = null;
    let contentsBrands: THREE.InstancedMesh | null = null;
    let chevrons: THREE.InstancedMesh | null = null;
    let worker: THREE.Group | null = null;
    let route: THREE.Line | null = null;
    let bead: THREE.Mesh | null = null;
    let tree: THREE.Group | null = null;
    let portalLabel: HTMLDivElement | null = null;
    const channelMarks: THREE.Mesh[] = [];
    const sockets: THREE.Mesh[] = [], ports: PortGlyph[] = [];
    arrow.visible = outputDirections(kind, 0, portalRole).length > 0;
    const wires: THREE.Mesh[] = [];
    arrow.position.y = kind === 'belt' || kind === 'splitter' ? 0.245 : 0.36;
    arrow.position.z = -0.29;
    arrow.scale.setScalar(1.3);
    group.add(arrow);
    if (kind === 'belt' || kind === 'splitter') {
      this.box(group, 0x424e52, [0.7, 0.13, 0.9], [0, 0.07, 0]);
      for (const x of [-0.31, 0.31]) this.box(group, 0xb79657, [0.06, 0.15, 0.9], [x, 0.15, 0]);
      chevrons = new THREE.InstancedMesh(this.geometry('chevron', () => {
        const shape = new THREE.Shape(); shape.moveTo(-0.19, -0.04);
        for (const [x, y] of [[-0.14,-0.10],[0,0.015],[0.14,-0.10],[0.19,-0.04],[0,0.12]]) shape.lineTo(x, y);
        shape.closePath(); const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2); return geometry;
      }), this.material(0xe9dba8), 3);
      chevrons.frustumCulled = false; group.add(chevrons);
      if (kind === 'splitter') {
        this.box(group, 0x424e52, [0.43, 0.13, 0.38], [0.25, 0.07, 0]);
        this.cylinder(group, 0x72b9b3, 0.2, 0.16, [0, 0.21, 0]);
        sideArrow = this.arrow(); sideArrow.rotation.y = -Math.PI / 2;
        sideArrow.position.set(0.29, 0.245, 0); sideArrow.scale.setScalar(1.3); group.add(sideArrow);
      }
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
      if (kind === 'miner' || kind === 'crystalMiner') {
        this.box(group, kind === 'crystalMiner' ? 0x9c80b5 : 0x799ea7, [0.59, 0.38, 0.55], [0, 0.33, 0]);
        this.cylinder(group, 0xe2b969, 0.14, 0.39, [0, 0.61, -0.04], true).rotation.z = Math.PI;
        this.box(group, 0xe2b969, [0.5, 0.07, 0.07], [0, 0.75, 0]);
        if (kind === 'crystalMiner') {
          const gem = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xc6a2f5));
          gem.scale.set(0.16, 0.26, 0.16); gem.position.set(0.23, 0.77, 0.15); group.add(gem);
        }
      } else if (kind === 'smelter') {
        this.box(group, 0xa66a48, [0.65, 0.53, 0.59], [0, 0.39, 0]);
        this.box(group, 0xe4ba80, [0.73, 0.08, 0.65], [0, 0.69, 0]);
        this.box(group, 0x423f40, [0.2, 0.7, 0.2], [0.23, 0.99, 0.17]);
        this.box(group, 0x292b2c, [0.36, 0.26, 0.025], [0, 0.34, 0.31]);
        this.box(group, 0xffac4b, [0.25, 0.14, 0.03], [0, 0.29, 0.33]);
        this.box(group, 0x414d55, [0.46, 0.08, 0.25], [-0.12, 0.22, -0.36]);
        for (const x of [-0.2, -0.04]) this.box(group, 0xd0d9d8, [0.12, 0.07, 0.17], [x, 0.29, -0.35]);
      } else if (kind === 'generator') {
        this.cylinder(group, 0x5e5687, 0.39, 0.19, [0, 0.22, 0]);
        for (const x of [-0.29, 0.29]) for (const z of [-0.23, 0.23]) this.box(group, 0xd0ad67, [0.055, 0.64, 0.055], [x, 0.57, z]);
        const crystal = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0x83cce7, 0x184065));
        crystal.scale.set(0.23, 0.4, 0.23); crystal.position.set(0, 0.93, 0); group.add(crystal);
        const ring = new THREE.Mesh(this.geometry('generator-ring', () => new THREE.TorusGeometry(0.29, 0.035, 4, 10)), this.material(0xe1c17b));
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.56; group.add(ring);
        for (const [dx, dz] of DIRECTIONS) this.box(group, 0x7fcddd, [dx ? 0.21 : 0.055, 0.055, dz ? 0.21 : 0.055], [dx * 0.35, 0.25, dz * 0.35]);
        this.cylinder(group, 0xa17c4e, 0.055, 0.35, [0, 0.36, 0.22]).rotation.z = Math.PI / 2;
      } else if (kind === 'lumber') {
        this.box(group, 0xa4845f, [0.56, 0.44, 0.52], [0, 0.35, 0]);
        const roof = this.cylinder(group, 0x64807a, 0.43, 0.34, [0, 0.7, 0], true); roof.rotation.y = Math.PI / 6;
        this.box(group, 0xe1bf87, [0.11, 0.13, 0.43], [-0.24, 0.29, -0.1]);
      } else if (kind === 'crystalRefiner') {
        this.cylinder(group, 0x796290, 0.33, 0.39, [0, 0.34, 0]);
        for (const x of [-0.25, 0.25]) this.cylinder(group, 0xc2ab76, 0.045, 0.62, [x, 0.68, 0]);
        this.box(group, 0xd3b873, [0.62, 0.07, 0.1], [0, 1, 0]);
        const gem = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xba8af5, 0x271043));
        gem.scale.set(0.2, 0.3, 0.2); gem.position.set(0, 0.74, 0); group.add(gem);
      } else if (kind === 'assembler') {
        this.box(group, 0x466d77, [0.69, 0.28, 0.61], [0, 0.31, 0]);
        this.box(group, 0xc3a577, [0.75, 0.09, 0.65], [0, 0.51, 0]);
        this.box(group, 0x6c7780, [0.35, 0.22, 0.22], [0, 0.65, 0]);
        this.box(group, 0xd3b77d, [0.07, 0.43, 0.07], [-0.27, 0.75, 0.18]);
        const hammer = this.box(group, 0x98abb1, [0.22, 0.13, 0.15], [-0.25, 0.96, 0.18]);
        hammer.rotation.z = 0.2;
      } else if (kind === 'runeCarver') {
        this.box(group, 0x826175, [0.62, 0.34, 0.53], [0, 0.33, 0]);
        this.box(group, 0xc8ac75, [0.72, 0.07, 0.63], [0, 0.54, 0]);
        const ring = new THREE.Mesh(this.geometry('rune-ring', () => new THREE.TorusGeometry(0.22, 0.035, 4, 10)), this.material(0xffcb83, 0x392714));
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.61; group.add(ring);
        for (const angle of [0, Math.PI / 3, -Math.PI / 3]) this.box(group, 0xe9d6ae, [0.35, 0.025, 0.035], [0, 0.60, 0]).rotation.y = angle;
        this.box(group, 0x9eacc2, [0.065, 0.4, 0.065], [0.25, 0.79, 0.20]).rotation.z = 0.2;
      } else if (kind === 'frameForge') {
        this.box(group, 0x65777c, [0.7, 0.24, 0.61], [0, 0.30, 0]);
        this.box(group, 0xb3a684, [0.75, 0.085, 0.68], [0, 0.47, 0]);
        this.box(group, 0x829fa8, [0.25, 0.25, 0.16], [0, 0.76, 0]);
        this.box(group, 0xb9cbd0, [0.16, 0.16, 0.16], [0, 0.98, 0]);
        for (const x of [-0.2, 0.2]) this.box(group, 0x93b0b6, [0.15, 0.11, 0.15], [x, 0.81, 0]);
        for (const x of [-0.09, 0.09]) this.box(group, 0x93b0b6, [0.09, 0.21, 0.13], [x, 0.57, 0]);
      } else if (kind === 'golemForge') {
        this.cylinder(group, 0x71618a, 0.34, 0.33, [0, 0.31, 0]);
        for (const x of [-0.29, 0.29]) this.box(group, 0xc5a874, [0.09, 0.8, 0.12], [x, 0.65, 0]);
        const halo = new THREE.Mesh(this.geometry('awakening-halo', () => new THREE.TorusGeometry(0.3, 0.055, 4, 10)), this.material(0xf6d49b, 0x342915));
        halo.position.set(0, 0.9, 0); group.add(halo);
        this.cylinder(group, 0x8ce2c4, 0.13, 0.34, [0, 0.62, 0]);
        this.box(group, 0xb7f0d3, [0.18, 0.18, 0.17], [0, 0.91, 0]);
      } else if (kind === 'golemRelay') {
        this.cylinder(group, 0x557f79, 0.37, 0.17, [0, 0.23, 0]);
        for (const x of [-0.28, 0.28]) for (const z of [-0.28, 0.28]) this.box(group, 0xb7a883, [0.08, 0.28, 0.08], [x, 0.36, z]);
        worker = new THREE.Group(); worker.position.y = 0.3;
        this.box(worker, 0x87b5ae, [0.19, 0.23, 0.15], [0, 0.27, 0]);
        this.box(worker, 0xb8e4d2, [0.16, 0.16, 0.16], [0, 0.5, 0]);
        this.box(worker, 0x244941, [0.095, 0.035, 0.02], [0, 0.51, -0.09]);
        for (const x of [-0.15, 0.15]) this.box(worker, 0x96c7bb, [0.085, 0.21, 0.11], [x, 0.27, 0]);
        for (const x of [-0.055, 0.055]) this.box(worker, 0x739e9a, [0.085, 0.16, 0.13], [x, 0.09, 0]);
        worker.visible = false; group.add(worker);
        const routeGeometry = new THREE.BufferGeometry(); routeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        route = new THREE.Line(routeGeometry, this.relayLineMaterial); route.visible = false; route.frustumCulled = false; group.add(route);
        bead = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xe1d2a1));
        bead.scale.setScalar(0.13); bead.visible = false; group.add(bead);
      } else if (kind === 'alchemyLab') {
        this.box(group, 0x7e7664, [0.68, 0.36, 0.59], [0, 0.34, 0]);
        this.box(group, 0xc6b986, [0.75, 0.07, 0.67], [0, 0.56, 0]);
        this.cylinder(group, 0x80cbb9, 0.2, 0.34, [-0.13, 0.78, 0.04]);
        this.cylinder(group, 0xe3ce9c, 0.09, 0.19, [-0.13, 1.03, 0.04]);
        this.cylinder(group, 0x4d7275, 0.08, 0.42, [0.23, 0.82, 0.08]);
        this.box(group, 0xcbb57c, [0.35, 0.065, 0.065], [0.07, 1.05, 0.08]);
      } else if (kind === 'portalForge') {
        this.cylinder(group, 0x695880, 0.34, 0.35, [0, 0.32, 0]);
        for (const x of [-0.25, 0.25]) this.box(group, 0xb4a77f, [0.075, 0.49, 0.1], [x, 0.71, 0]);
        const ring = new THREE.Mesh(this.geometry('portal-crown', () => new THREE.TorusGeometry(0.24, 0.055, 5, 12)), this.material(0xc6a4f2, 0x281737));
        ring.position.y = 0.86; group.add(ring);
        this.box(group, 0xedcf91, [0.65, 0.065, 0.44], [0, 0.55, 0]);
      } else if (kind === 'portalGate') {
        this.box(group, 0x66637a, [0.76, 0.15, 0.68], [0, 0.18, 0]);
        const ring = new THREE.Mesh(this.geometry('portal-gate', () => new THREE.TorusGeometry(0.35, 0.065, 5, 16)), this.material(0xad8bd4, 0x22112f));
        ring.position.y = 0.68; group.add(ring);
        for (const x of [-0.32, 0.32]) this.box(group, 0xc4b387, [0.09, 0.67, 0.12], [x, 0.57, 0]);
        for (let index = 0; index < 3; index++) {
          const mark = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xffdda3));
          mark.scale.setScalar(0.045); mark.position.set((index - 1) * 0.115, 1.1, 0); mark.visible = index === 0; group.add(mark); channelMarks.push(mark);
        }
        portalLabel = document.createElement('div'); portalLabel.className = 'portal-world-label'; portalLabel.hidden = true;
        Object.assign(portalLabel.style, { position: 'absolute', pointerEvents: 'none', zIndex: '1', padding: '1px 5px', borderRadius: '5px', border: '1px solid #b9a47b', background: '#303a36ed', color: '#ffedcc', font: 'bold 11px/1.5 sans-serif', whiteSpace: 'nowrap', transform: 'translate(-50%,-100%)' });
        this.host.append(portalLabel);
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        route = new THREE.Line(geometry, this.portalLineMaterial); route.visible = false; route.frustumCulled = false; group.add(route);
        bead = new THREE.Mesh(this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0)), this.material(0xdbc0f0));
        bead.visible = false; group.add(bead);
      } else if (kind === 'seedLoom') {
        this.box(group, 0x6e8671, [0.7, 0.31, 0.62], [0, 0.31, 0]);
        for (const x of [-0.27, 0.27]) this.box(group, 0xc0a974, [0.07, 0.75, 0.09], [x, 0.67, 0]);
        this.box(group, 0xe0c78f, [0.64, 0.07, 0.1], [0, 1.06, 0]);
        for (const x of [-0.15, 0, 0.15]) this.box(group, 0xa6d4bf, [0.025, 0.56, 0.025], [x, 0.75, 0]);
        const seed = new THREE.Mesh(this.geometry('seed', () => new THREE.IcosahedronGeometry(1, 0)), this.material(0xd9eaa6));
        seed.scale.set(0.14, 0.2, 0.14); seed.position.set(0, 0.75, -0.04); group.add(seed);
      } else if (kind === 'worldTree') {
        this.cylinder(group, 0xa6a57e, 0.42, 0.16, [0, 0.18, 0]);
        tree = new THREE.Group(); tree.position.y = 0.25; tree.scale.setScalar(0.15); group.add(tree);
        this.cylinder(tree, 0x8b7454, 0.14, 1.65, [0, 0.825, 0]);
        for (const [x, y, z, radius] of [[0,2.05,0,0.71],[-0.48,1.65,0.14,0.55],[0.44,1.65,-0.15,0.55],[0.08,1.45,0.45,0.5]]) {
          const leaves = new THREE.Mesh(this.geometry('tree-crown', () => new THREE.IcosahedronGeometry(1, 0)), this.material(0x86bd93));
          leaves.position.set(x, y, z); leaves.scale.set(radius, radius * 0.8, radius); tree.add(leaves);
        }
        for (const x of [-0.42, 0.42]) this.cylinder(tree, 0xd8dfab, 0.075, 0.14, [x, 1.85, 0.1], true);
      } else if (kind === 'storage') {
        this.box(group, 0x466f78, [0.74, 0.12, 0.74], [0, 0.22, 0]);
        for (const z of [-0.36, 0.36]) this.box(group, 0x85b4b0, [0.76, 0.22, 0.055], [0, 0.37, z]);
        for (const x of [-0.36, 0.36]) this.box(group, 0x85b4b0, [0.055, 0.22, 0.76], [x, 0.37, 0]);
        contents = new THREE.InstancedMesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(0xffffff), STORAGE_CAPACITY);
        const matrix = new THREE.Matrix4();
        for (let index = 0; index < STORAGE_CAPACITY; index++) {
          matrix.compose(new THREE.Vector3((index % 4 - 1.5) * 0.15, 0.32 + Math.floor(index / 16) * 0.12, (Math.floor(index / 4) % 4 - 1.5) * 0.15), new THREE.Quaternion(), new THREE.Vector3(0.12, 0.1, 0.12));
          contents.setMatrixAt(index, matrix); contents.setColorAt(index, new THREE.Color(0xffffff));
        }
        contents.computeBoundingSphere(); contents.count = 0; group.add(contents);
        contentsBrands = new THREE.InstancedMesh(this.geometry('stored-portal-brand', () => {
          const geometry = new THREE.TorusGeometry(0.07, 0.013, 3, 8); geometry.rotateX(-Math.PI / 2); return geometry;
        }), this.material(0xe3c6ff, 0x22142e), STORAGE_CAPACITY);
        contentsBrands.count = 0; contentsBrands.frustumCulled = false; group.add(contentsBrands);
      } else if (kind === 'delivery') {
        this.box(group, 0x8e714e, [0.74, 0.28, 0.7], [0, 0.28, 0]);
        this.box(group, 0xe9c886, [0.75, 0.06, 0.73], [0, 0.45, 0]);
        this.cylinder(group, 0x6b5945, 0.035, 1.05, [0.31, 0.72, 0.23]);
        this.box(group, 0xc9af71, [0.38, 0.26, 0.035], [0.12, 1.1, 0.23]);
      } else {
        this.box(group, 0xbca071, [0.62, 0.41, 0.62], [0, 0.35, 0]);
        this.box(group, 0x675a50, [0.66, 0.07, 0.66], [0, 0.59, 0]);
        this.box(group, 0xedd594, [0.09, 0.48, 0.66], [0, 0.35, 0]);
      }
    }
    // Round sockets denote accepted items on every side; mechanics impose no dedicated inlet.
    if (acceptedResources({ kind, portalRole }).length) for (let direction = 0; direction < 4; direction++) {
      const [dx, dz] = DIRECTIONS[direction];
      const radius = kind === 'belt' || kind === 'splitter' ? 0.055 : 0.09;
      const socket = new THREE.Mesh(this.geometry(`socket-${radius}`, () => new THREE.TorusGeometry(radius, 0.023, 4, 8)), this.material(0x96d9ee));
      socket.rotation.x = Math.PI / 2; socket.position.set(dx * 0.43, 0.18, dz * 0.43); group.add(socket); sockets.push(socket);
    }
    for (let index = 0; index < outputDirections(kind, 0, portalRole).length; index++) {
      const outlet = new THREE.Group(); outlet.rotation.y = -index * Math.PI / 2;
      this.box(outlet, 0xcaa666, [0.3, 0.10, 0.23], [0, 0.18, -0.43]);
      this.box(outlet, 0x313f40, [0.18, 0.065, 0.025], [0, 0.20, -0.552]);
      const glyph = this.portGlyph(); glyph.group.position.set(0, 0.30, -0.61); outlet.add(glyph.group);
      this.paintPort(glyph, 'missing'); group.add(outlet); ports.push(glyph);
    }
    const item = new THREE.Mesh(this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1)), this.material(0xe0c494));
    item.scale.set(0.19, 0.14, 0.22); item.visible = false; group.add(item);
    const itemBrand = new THREE.Mesh(this.geometry('item-portal-brand', () => new THREE.TorusGeometry(0.19, 0.022, 4, 12)), this.material(0xe3c6ff, 0x22142e));
    itemBrand.rotation.x = -Math.PI / 2; itemBrand.visible = false; group.add(itemBrand);
    const lamp = new THREE.Mesh(this.geometry('rock', () => new THREE.DodecahedronGeometry(1, 0)), this.material(0x74837a));
    lamp.scale.setScalar(0.055); lamp.position.set(0.25, kind === 'belt' ? 0.22 : 0.66, 0.22);
    lamp.visible = !['wire', 'belt', 'splitter', 'storage'].includes(kind); group.add(lamp);
    return { group, arrow, sideArrow, item, itemBrand, lamp, kind, wires, sockets, ports, chevrons, flowKey: '', contents, contentsBrands, contentsKey: '', worker, route, bead, tree, portalRole: kind === 'portalGate' ? portalRole : undefined, portalLabel, channelMarks };
  }

  private itemColor(resource: Resource): number {
    return RESOURCE_COLORS[resource];
  }

  private setItemShape(item: THREE.Mesh, resource: Resource): void {
    item.rotation.set(0, 0, 0);
    if (resource === 'wood') {
      item.geometry = this.geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 8));
      item.scale.set(0.075, 0.25, 0.075); item.rotation.x = Math.PI / 2;
    } else if (resource === 'ore' || resource === 'rawCrystal') {
      item.geometry = this.geometry('rock', () => new THREE.DodecahedronGeometry(1, 0));
      item.scale.set(0.13, resource === 'rawCrystal' ? 0.16 : 0.12, 0.13);
    } else if (resource === 'crystal') {
      item.geometry = this.geometry('gem', () => new THREE.OctahedronGeometry(1, 0));
      item.scale.set(0.105, 0.2, 0.105);
    } else if (resource === 'runeCore') {
      item.geometry = this.geometry('rune-ring', () => new THREE.TorusGeometry(0.22, 0.035, 4, 10));
      item.scale.setScalar(0.65); item.rotation.x = Math.PI / 2;
    } else if (resource === 'essence') {
      item.geometry = this.geometry('essence', () => new THREE.SphereGeometry(1, 8, 6));
      item.scale.setScalar(0.14);
    } else if (resource === 'portalCore') {
      item.geometry = this.geometry('portal-core-item', () => new THREE.TorusGeometry(1, 0.28, 5, 12));
      item.scale.setScalar(0.135); item.rotation.x = -Math.PI / 2;
    } else if (resource === 'worldSeed') {
      item.geometry = this.geometry('seed', () => new THREE.IcosahedronGeometry(1, 0));
      item.scale.set(0.13, 0.19, 0.13);
    } else if (resource === 'golemFrame' || resource === 'golem') {
      item.geometry = this.geometry(`item-${resource}`, () => {
        const silhouette = new THREE.Shape(); silhouette.moveTo(-0.2, -0.4);
        for (const [x, y] of [[-0.03,-0.4],[-0.03,-0.16],[0.03,-0.16],[0.03,-0.4],[0.2,-0.4],[0.2,0.02],[0.36,0.02],[0.36,0.18],[0.2,0.18],[0.2,0.32],[0.14,0.32],[0.14,0.53],[-0.14,0.53],[-0.14,0.32],[-0.2,0.32],[-0.2,0.18],[-0.36,0.18],[-0.36,0.02],[-0.2,0.02]]) silhouette.lineTo(x, y);
        silhouette.closePath();
        if (resource === 'golemFrame') {
          const hole = new THREE.Path(); hole.moveTo(-0.105, -0.02); hole.lineTo(-0.105, 0.23); hole.lineTo(0.105, 0.23); hole.lineTo(0.105, -0.02); hole.closePath(); silhouette.holes.push(hole);
        }
        const geometry = new THREE.ExtrudeGeometry(silhouette, { depth: resource === 'golem' ? 0.13 : 0.065, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2); return geometry;
      });
      item.scale.setScalar(0.39);
    } else if (resource === 'sword') {
      item.geometry = this.geometry('sword', () => {
        const silhouette = new THREE.Shape();
        silhouette.moveTo(-0.065, -0.4);
        for (const [x, y] of [[0.065,-0.4],[0.065,-0.16],[0.28,-0.16],[0.28,-0.07],[0.09,-0.07],[0.09,0.38],[0,0.56],[-0.09,0.38],[-0.09,-0.07],[-0.28,-0.07],[-0.28,-0.16],[-0.065,-0.16]]) silhouette.lineTo(x, y);
        silhouette.closePath();
        const shape = new THREE.ExtrudeGeometry(silhouette, { depth: 0.055, bevelEnabled: false });
        shape.rotateX(-Math.PI / 2); return shape;
      });
      item.scale.setScalar(0.4);
    } else {
      item.geometry = this.geometry('cube', () => new THREE.BoxGeometry(1, 1, 1));
      item.scale.set(0.23, 0.09, 0.14);
    }
  }

  private outputResources(kind: Kind, recipe?: RecipeId): Resource[] {
    return sourceResources({ kind, recipe, x: 0, z: 0, direction: 0 });
  }

  private disposeFacility(view: FacilityView): void { view.contents?.dispose(); view.contentsBrands?.dispose(); view.chevrons?.dispose(); view.route?.geometry.dispose(); view.portalLabel?.remove(); }

  private updateFlow(view: FacilityView, building: Building, tick: number, ports: PortVisual[]): void {
    ports.forEach((port, index) => this.paintPort(view.ports[index], port.state));
    if (!view.chevrons) return;
    const stalled = !!building.item && building.beltProgress + 1e-9 >= BELT_SECONDS && ports.every(port => port.state !== 'connected');
    const phase = stalled || this.reducedMotion.matches ? 0 : building.item ? Math.min(1, building.beltProgress / BELT_SECONDS) : (tick / 10) % 1;
    const key = `${phase}:${stalled}`;
    if (view.flowKey === key) return; view.flowKey = key;
    for (let index = 0; index < 3; index++) {
      const z = 0.36 - ((index / 3 + phase / 3) % 1) * 0.72;
      this.flowPosition.set(0, 0.18, z); this.flowMatrix.compose(this.flowPosition, this.flowRotation, this.flowScale);
      view.chevrons.setMatrixAt(index, this.flowMatrix);
    }
    view.chevrons.instanceMatrix.needsUpdate = true;
  }

  private updateRelay(view: FacilityView, building: Building, tick: number, buildings: ReadonlyMap<number, Building>): void {
    if (!view.worker || !view.route || !view.bead) return;
    view.worker.visible = !!building.golemWorker;
    view.lamp.material = this.material(building.golemWorker ? 0x8be0bc : 0xcd9979);
    const route = building.golemRoute, source = route ? buildings.get(route.sourceId) : null, target = route ? buildings.get(route.targetId) : null;
    const age = route ? tick - route.tick : 20;
    const active = !!building.golemWorker && !!route && !!source && !!target && age >= 0 && age < 20;
    view.route.visible = view.bead.visible = active;
    if (!active || !source || !target || !route) return;
    view.group.updateMatrixWorld(true);
    this.routeStart.set(source.x, 0.86, source.z); view.group.worldToLocal(this.routeStart);
    this.routeEnd.set(target.x, 0.86, target.z); view.group.worldToLocal(this.routeEnd);
    const vertices = view.route.geometry.getAttribute('position') as THREE.BufferAttribute;
    vertices.setXYZ(0, this.routeStart.x, this.routeStart.y, this.routeStart.z);
    vertices.setXYZ(1, this.routeEnd.x, this.routeEnd.y, this.routeEnd.z); vertices.needsUpdate = true;
    view.bead.position.copy(this.routeStart).lerp(this.routeEnd, age / 20);
    view.bead.material = this.material(this.itemColor(route.resource)); this.setItemShape(view.bead, route.resource);
  }

  private updatePortal(view: FacilityView, building: Building, tick: number, buildings: ReadonlyMap<number, Building>, selected: boolean): void {
    if (building.kind !== 'portalGate' || !view.portalLabel || !view.route || !view.bead) return;
    const role = building.portalRole ?? 'send', channel = building.portalChannel ?? 1;
    const label = `${role === 'send' ? '送→' : '→受'} ${channel}${selected ? ` · ${role === 'send' ? building.input.length : building.output.length}/${role === 'send' ? 8 : 4}` : ''}`;
    if (view.portalLabel.textContent !== label) view.portalLabel.textContent = label;
    view.portalLabel.dataset.buildingId = String(building.id); view.portalLabel.dataset.channel = String(channel); view.portalLabel.dataset.role = role;
    for (let index = 0; index < view.channelMarks.length; index++) view.channelMarks[index].visible = index < channel;
    const rect = this.renderer.domElement.getBoundingClientRect(), hostRect = this.host.getBoundingClientRect();
    this.guideProjection.set(building.x, 1.24, building.z).project(this.camera);
    view.portalLabel.hidden = Math.abs(this.guideProjection.x) > 1 || Math.abs(this.guideProjection.y) > 1;
    const left = `${rect.left - hostRect.left + (this.guideProjection.x + 1) * rect.width / 2}px`;
    const top = `${rect.top - hostRect.top + (1 - this.guideProjection.y) * rect.height / 2}px`;
    if (view.portalLabel.style.left !== left) view.portalLabel.style.left = left;
    if (view.portalLabel.style.top !== top) view.portalLabel.style.top = top;
    let partner: Building | null = null, count = 0, senders = 0, receivers = 0;
    for (const candidate of buildings.values()) if (candidate.kind === 'portalGate' && (candidate.portalChannel ?? 1) === channel) {
      count++; if (candidate.portalRole === 'receive') receivers++; else senders++;
      if (candidate.id !== building.id) partner = candidate;
    }
    if (count !== 2 || senders !== 1 || receivers !== 1) partner = null;
    const route = building.portalRoute, age = route ? tick - route.tick : PORTAL_INTERVAL;
    const active = role === 'send' && !!partner && !!route && route.targetId === partner.id && age >= 0 && age < PORTAL_INTERVAL;
    view.route.visible = !!partner && (selected || active); view.bead.visible = active;
    view.lamp.material = this.material(active ? 0x9ce5c7 : partner ? 0xc7a4ec : 0xc89a7f);
    if (!partner || !view.route.visible) return;
    view.group.updateMatrixWorld(true);
    this.routeStart.set(building.x, 0.9, building.z); view.group.worldToLocal(this.routeStart);
    this.routeEnd.set(partner.x, 0.9, partner.z); view.group.worldToLocal(this.routeEnd);
    const vertices = view.route.geometry.getAttribute('position') as THREE.BufferAttribute;
    vertices.setXYZ(0, this.routeStart.x, this.routeStart.y, this.routeStart.z);
    vertices.setXYZ(1, this.routeEnd.x, this.routeEnd.y, this.routeEnd.z); vertices.needsUpdate = true;
    if (active && route) {
      view.bead.position.copy(this.routeStart).lerp(this.routeEnd, age / PORTAL_INTERVAL);
      view.bead.material = this.material(this.itemColor(route.resource)); this.setItemShape(view.bead, route.resource);
    }
  }

  private updateFacility(view: FacilityView, building: Building): void {
    view.group.position.set(building.x, 0, building.z);
    view.group.rotation.y = -building.direction * Math.PI / 2;
    view.lamp.material = this.material(building.working ? 0x8ce2a8 : 0xcf9272, building.working ? 0x234c2b : 0);
    const item = building.item ?? building.output[0];
    view.item.visible = !!item && building.kind !== 'storage';
    view.itemBrand.visible = view.item.visible && item?.resource === 'worldSeed' && !!item.throughPortal;
    if (item) {
      view.item.material = this.material(this.itemColor(item.resource));
      this.setItemShape(view.item, item.resource);
      const transport = building.kind === 'belt' || building.kind === 'splitter';
      const progress = transport ? Math.min(1, building.beltProgress / BELT_SECONDS) : 0;
      const side = building.kind === 'splitter' && building.splitCursor === 1;
      view.item.position.set(side ? progress * 0.34 : 0, transport ? 0.29 : 0.22, transport ? side ? 0.34 * (1 - progress) : 0.34 - progress * 0.68 : -0.36);
      view.itemBrand.position.copy(view.item.position); view.itemBrand.position.y += 0.035;
    }
    if (view.tree) {
      const growth = THREE.MathUtils.clamp(building.treeGrowth ?? 0, 0, 10);
      const scale = 0.15 + growth * 0.085;
      view.tree.scale.setScalar(scale);
      view.lamp.material = this.material(growth === 10 ? 0xf1df99 : 0xa9d3aa);
    }
    if (view.contents) {
      const stored = building.input;
      const key = stored.map(held => `${held.resource}:${held.throughPortal ? 1 : 0}`).join(',');
      if (view.contentsKey !== key) {
        view.contentsKey = key;
        view.contents.count = Math.min(STORAGE_CAPACITY, stored.length);
        for (let index = 0; index < view.contents.count; index++) view.contents.setColorAt(index, new THREE.Color(this.itemColor(stored[index].resource)));
        if (view.contents.instanceColor) view.contents.instanceColor.needsUpdate = true;
        if (view.contentsBrands) {
          let count = 0;
          for (let index = 0; index < view.contents.count; index++) if (stored[index].resource === 'worldSeed' && stored[index].throughPortal) {
            this.flowMatrix.makeTranslation((index % 4 - 1.5) * 0.15, 0.39 + Math.floor(index / 16) * 0.12, (Math.floor(index / 4) % 4 - 1.5) * 0.15);
            view.contentsBrands.setMatrixAt(count++, this.flowMatrix);
          }
          view.contentsBrands.count = count; view.contentsBrands.instanceMatrix.needsUpdate = true;
        }
      }
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
    const buildingsById = new Map(state.buildings.map(building => [building.id, building]));
    const cells = new Map(state.buildings.map(building => [`${building.x},${building.z}`, building]));
    const powerKinds = new Set<Kind>(POWER_KINDS);
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
      if (view && (view.kind !== building.kind || (building.kind === 'portalGate' && view.portalRole !== (building.portalRole ?? 'send')))) { this.scene.remove(view.group); this.disposeFacility(view); this.facilities.delete(building.id); view = undefined; }
      if (!view) { view = this.facility(building.kind, building.portalRole); this.facilities.set(building.id, view); this.scene.add(view.group); }
      this.updateFacility(view, building);
      this.updateRelay(view, building, state.tick, buildingsById);
      this.updatePortal(view, building, state.tick, buildingsById, building.id === options.selectedId);
      const ports = logisticsPorts(building, cells);
      this.updateFlow(view, building, state.tick, ports);
      if (building.id === options.selectedId) {
        this.renderer.domElement.dataset.selectedDirection = String(building.direction);
        this.renderer.domElement.dataset.selectedPorts = ports.map(port => `${port.direction}:${port.state}`).join(',');
        this.renderer.domElement.dataset.selectedFlowProgress = String(building.beltProgress);
      }
      if (building.kind === 'wire') for (let index = 0; index < 4; index++) {
        const [dx, dz] = DIRECTIONS[index];
        const neighbor = cells.get(`${building.x + dx},${building.z + dz}`);
        // Wire shape is world aligned; compensate building rotation for the local arms.
        view.wires[index].visible = !!neighbor && powerKinds.has(neighbor.kind);
      }
      if (building.kind === 'wire') view.group.rotation.y = 0;
    }
    for (const [id, view] of this.facilities) if (!ids.has(id)) { this.scene.remove(view.group); this.disposeFacility(view); this.facilities.delete(id); }
    this.ghost.visible = !!options.kind && !!options.hover && this.cursorOnMap;
    if (this.ghost.visible) this.renderer.domElement.dataset.ghostValid = String(options.valid);
    else delete this.renderer.domElement.dataset.ghostValid;
    if (this.ghost.visible && options.hover) {
      if (this.ghostPreview?.kind !== options.kind) {
        if (this.ghostPreview) { this.ghost.remove(this.ghostPreview.group); this.disposeFacility(this.ghostPreview); }
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
      this.ghostPort.visible = !!options.kind && outputDirections(options.kind, options.direction).length > 0;
      this.ghostSidePort.visible = options.kind === 'splitter';
      if (this.ghostPort.visible && options.kind) {
        let outputs = options.recipe ? Object.keys(RECIPES[options.recipe].output) as Resource[] : this.outputResources(options.kind);
        if (['belt', 'splitter', 'storage'].includes(options.kind)) {
          // A neighboring source can make a prospective belt's resource known.
          const incoming = DIRECTIONS.map(([sx, sz]) => cells.get(`${options.hover!.x + sx},${options.hover!.z + sz}`))
            .filter((building): building is Building => !!building)
            .filter(building => {
              const directions = outputDirections(building.kind, building.direction, building.portalRole);
              return directions.some(direction => {
                const [sx, sz] = DIRECTIONS[direction];
                return building.x + sx === options.hover!.x && building.z + sz === options.hover!.z;
              });
            });
          const known = incoming.flatMap(building => building.item ? [building.item.resource] : building.output.length ? building.output.map(item => item.resource) : building.kind === 'storage' && building.input.length ? building.input.map(item => item.resource) : ['belt', 'splitter', 'storage'].includes(building.kind) ? [] : sourceResources(building));
          if (known.length) outputs = known;
        }
        const ghostPorts = logisticsPorts({ kind: options.kind, recipe: options.recipe, x: options.hover.x, z: options.hover.z, direction: options.direction }, cells, outputs);
        this.renderer.domElement.dataset.ghostDirection = String(options.direction);
        this.renderer.domElement.dataset.ghostPorts = ghostPorts.map(port => `${port.direction}:${port.state}`).join(',');
        for (let index = 0; index < ghostPorts.length; index++) {
          const port = ghostPorts[index];
          const portColor = port.state === 'edge' || port.state === 'incompatible' ? 0xff6259 : port.state === 'connected' ? 0x8fffad : 0xf3b354;
          const outer = index === 0 ? this.ghostPort : this.ghostSidePort;
          const preview = index === 0 ? this.ghostPreview?.arrow : this.ghostPreview?.sideArrow;
          outer.traverse(child => { if (child instanceof THREE.Mesh) child.material = this.material(portColor); });
          preview?.traverse(child => { if (child instanceof THREE.Mesh) child.material = this.material(portColor); });
          if (this.ghostPreview) this.paintPort(this.ghostPreview.ports[index], port.state);
        }
      }
      for (const socket of this.ghostPreview?.sockets ?? []) socket.material = this.material(0x96d9ee, 0, true);
      this.ghostCheck.visible = options.valid; this.ghostCross.visible = !options.valid;
      this.ghostFeasibility.traverse(child => {
        if (child instanceof THREE.Mesh) child.material = this.material(child.userData.visualBackdrop ? 0x344441 : options.valid ? 0xc7ffdb : 0xffd2c6);
      });
      if (this.ghostPower) {
        const powerKind = options.kind && powerKinds.has(options.kind);
        this.ghostPower.visible = !!powerKind;
        const connected = DIRECTIONS.some(([dx, dz]) => {
          const neighbor = cells.get(`${options.hover!.x + dx},${options.hover!.z + dz}`);
          return neighbor && powerKinds.has(neighbor.kind);
        });
        const powered = DIRECTIONS.some(([dx, dz]) => energized.has(`${options.hover!.x + dx},${options.hover!.z + dz}`));
        this.ghostPower.material = this.material(powered ? 0x6ae3ff : connected ? 0xb79ae1 : 0xe7aa69, 0x20383a);
      }
    }
    const selected = options.selectedId == null ? null : this.facilities.get(options.selectedId);
    this.selection.visible = !!selected;
    this.selectedRelayRange.visible = selected?.kind === 'golemRelay';
    if (this.selectedRelayRange.visible && selected) this.selectedRelayRange.position.copy(selected.group.position);
    if (selected) {
      this.selection.position.copy(selected.group.position);
      this.selection.rotation.y = selected.group.rotation.y;
      this.selectedDirection.visible = outputDirections(selected.kind, 0, selected.portalRole).length > 0;
      this.selectedSideDirection.visible = selected.kind === 'splitter';
    } else {
      delete this.renderer.domElement.dataset.selectedDirection;
      delete this.renderer.domElement.dataset.selectedPorts;
      delete this.renderer.domElement.dataset.selectedFlowProgress;
    }
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
    this.renderer.domElement.dataset.cameraExtent = String(this.extent);
    this.renderer.domElement.dataset.cameraTarget = `${this.target.x},${this.target.z}`;
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

  setInputBlocked(blocked: boolean): void { this.input.setBlocked(blocked); }

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
    for (const view of this.facilities.values()) this.disposeFacility(view);
    if (this.ghostPreview) this.disposeFacility(this.ghostPreview);
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.relayLineMaterial.dispose();
    this.portalLineMaterial.dispose();
    this.scene.clear(); this.facilities.clear(); this.renderer.dispose(); this.renderer.domElement.remove();
    this.guideLabel.remove();
  }
}
