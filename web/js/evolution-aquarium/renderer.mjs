import * as THREE from '../vendor/three-0.180.0/three.module.min.js';
import { OrbitControls } from '../vendor/three-0.180.0/controls/OrbitControls.js';
import { BOUNDS, floorY } from './core.mjs';

/** Three.js is an adapter only: all ecology and movement come from AquariumSimulation. */
export class AquariumRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.7));
    this.renderer.setClearColor(0x031d30);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x083c50, 0.012);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 160;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.enablePan = false;
    this.fish = new Map();
    this.predators = new Map();
    this.elapsed = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.forward = new THREE.Vector3(1, 0, 0);
    this.direction = new THREE.Vector3();
    this.dummy = new THREE.Object3D();
    this.geometries = {
      body: new THREE.SphereGeometry(1, 16, 10),
      eye: new THREE.SphereGeometry(1, 8, 6),
      fin: this.makeFin(),
    };
    this.eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x061722, roughness: 0.3 });
    this.eyeWhite = new THREE.MeshStandardMaterial({ color: 0xdbf4df, roughness: 0.4 });
    this.scene.add(new THREE.HemisphereLight(0x9eeeff, 0x284638, 2.5));
    const sun = new THREE.DirectionalLight(0xf6fff2, 3.2);
    sun.position.set(-8, 20, 6);
    this.scene.add(sun);
    const rim = new THREE.PointLight(0x40caff, 65, 50, 1.3);
    rim.position.set(10, 8, -8);
    this.scene.add(rim);
    this.buildHabitat();
    this.foodMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 0), new THREE.MeshBasicMaterial({ color: 0xe4ef8a }), 1200);
    this.foodMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.foodMesh.frustumCulled = false;
    this.foodMesh.count = 0;
    this.scene.add(this.foodMesh);
    this.selection = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: 0xc6ffeb, transparent: true, opacity: 0.9, depthTest: false }));
    this.selection.renderOrder = 8;
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.resetCamera();
    this.resize();
  }

  makeFin() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.8, 0.65, 0, -0.7, -0.65, 0], 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  buildHabitat() {
    const sand = new THREE.PlaneGeometry(BOUNDS.x * 2 + 4, BOUNDS.z * 2 + 4, 96, 24);
    sand.rotateX(-Math.PI / 2);
    const positions = sand.attributes.position;
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const ripple = Math.sin(x * 2.4 + z * 1.6) * 0.06 + Math.sin(z * 4) * 0.025;
      positions.setY(i, floorY(x) - 0.15 + ripple);
      const c = new THREE.Color().setHSL(0.12, 0.18, 0.40 + 0.10 * Math.sin(x * 0.1 + 2) + ripple);
      colors.push(c.r, c.g, c.b);
    }
    sand.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    sand.computeVertexNormals();
    this.scene.add(new THREE.Mesh(sand, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x34575a, roughness: 1, flatShading: true });
    for (let i = 0; i < 22; i++) {
      const x = Math.sin(i * 12.54) * (BOUNDS.x - 2), z = -BOUNDS.z * 0.72 + Math.cos(i * 6.1) * 2.2;
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const size = 0.6 + ((i * 17) % 11) * 0.17;
      rock.position.set(x, floorY(x) - size * 0.18, z);
      rock.scale.set(size * 1.6, size * 0.85, size);
      rock.rotation.set(i, i * 0.7, i * 0.4);
      this.scene.add(rock);
    }
    this.grasses = [];
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x267a68, roughness: 0.75, side: THREE.DoubleSide });
    for (let i = 0; i < 80; i++) {
      const x = Math.sin(i * 15.21) * (BOUNDS.x - 1), z = Math.cos(i * 12.62) * (BOUNDS.z - 1);
      const h = 0.7 + (i % 9) * 0.2;
      const g = new THREE.PlaneGeometry(0.16 + i % 3 * 0.06, h, 1, 6);
      g.translate(0, h / 2, 0);
      const p = g.attributes.position;
      for (let n = 0; n < p.count; n++) p.setX(n, p.getX(n) + Math.sin(p.getY(n) * 1.4) * h * 0.15);
      g.computeVertexNormals();
      const blade = new THREE.Mesh(g, grassMaterial);
      blade.position.set(x, floorY(x), z);
      blade.rotation.y = i * 1.2;
      this.scene.add(blade);
      this.grasses.push(blade);
    }
    // Soft, static light shafts and sparse drifting particles give depth without heavy postprocessing.
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x79e1de, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.4, 16, 16, 1, true), beamMaterial);
      beam.position.set(-BOUNDS.x * 0.8 + i * BOUNDS.x * 0.4, 7, -BOUNDS.z * 0.8);
      beam.rotation.z = -0.23;
      this.scene.add(beam);
    }
    const dustPositions = [];
    for (let i = 0; i < 180; i++) dustPositions.push(Math.sin(i * 42.3) * (BOUNDS.x + 1), (i * 0.347) % (BOUNDS.height + 1), Math.cos(i * 27.1) * (BOUNDS.z + 1));
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x83d9cf, size: 0.04, transparent: true, opacity: 0.38, depthWrite: false }));
    this.scene.add(this.dust);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x * 2 + 2, BOUNDS.z * 2 + 2), new THREE.MeshBasicMaterial({ color: 0x4ce5db, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = BOUNDS.height + 1.2;
    this.scene.add(water);
    const tank = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOUNDS.x * 2 + 2, BOUNDS.height + 2, BOUNDS.z * 2 + 2)), new THREE.LineBasicMaterial({ color: 0x60b0b6, transparent: true, opacity: 0.14 }));
    tank.position.y = BOUNDS.height / 2 + 0.2;
    this.scene.add(tank);
  }

  makeFish(entity, predator = false) {
    const group = new THREE.Group();
    const t = entity.traits || {};
    const hue = t.hue ?? 0.55;
    const material = new THREE.MeshStandardMaterial({ color: predator ? 0x597f8c : new THREE.Color().setHSL(hue, 0.66, 0.56), roughness: 0.48, metalness: 0.09 });
    const finMaterial = new THREE.MeshStandardMaterial({ color: predator ? 0x385d6b : new THREE.Color().setHSL((hue + 0.03) % 1, 0.65, 0.41), roughness: 0.7, side: THREE.DoubleSide });
    const size = predator ? 1.15 : 0.34 + (t.size ?? 0.5) * 0.52;
    const body = new THREE.Mesh(this.geometries.body, material);
    body.scale.set(1, predator ? 0.30 : 0.35 + (t.metabolism ?? 0.5) * 0.22, predator ? 0.29 : 0.25);
    group.add(body);
    const tail = new THREE.Mesh(this.geometries.fin, finMaterial);
    tail.position.x = -0.86;
    tail.scale.setScalar(predator ? 1.1 : 0.8 + (t.speed ?? 0.5) * 0.6);
    group.add(tail);
    const dorsal = new THREE.Mesh(this.geometries.fin, finMaterial);
    dorsal.position.set(0.05, 0.30, 0);
    dorsal.rotation.z = -0.45;
    dorsal.scale.set(0.66, 0.65, 1);
    group.add(dorsal);
    const fins = [];
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(this.geometries.fin, finMaterial);
      fin.position.set(0.2, -0.16, side * 0.22);
      fin.rotation.x = side * 1.1;
      fin.scale.set(0.6, 0.4, 1);
      group.add(fin); fins.push(fin);
      const white = new THREE.Mesh(this.geometries.eye, this.eyeWhite);
      white.position.set(0.64, 0.10, side * 0.21);
      white.scale.setScalar(0.105);
      group.add(white);
      const eye = new THREE.Mesh(this.geometries.eye, this.eyeMaterial);
      eye.position.set(0.68, 0.105, side * 0.285);
      eye.scale.setScalar(0.064);
      group.add(eye);
    }
    // The inherited pattern locus controls visible flank spots rather than a random decoration.
    if (!predator && (t.pattern ?? 0) > 0.35) {
      for (let i = 0; i < 3; i++) {
        for (const side of [-1, 1]) {
          const mark = new THREE.Mesh(this.geometries.eye, finMaterial);
          mark.position.set(0.3 - i * 0.33, 0.05, side * 0.245);
          mark.scale.set(0.06 + t.pattern * 0.035, 0.15 + t.pattern * 0.07, 0.022);
          group.add(mark);
        }
      }
    }
    group.scale.setScalar(size);
    group.userData = { id: entity.id, tail, fins, size, traits: entity.traits, ownedMaterials: [material, finMaterial] };
    for (const child of group.children) child.userData.fishId = predator ? null : entity.id;
    this.scene.add(group);
    return group;
  }

  syncEntities(entities, map, predator = false) {
    const live = new Set();
    entities.forEach((entity, index) => {
      const key = entity.id ?? index;
      live.add(key);
      let mesh = map.get(key);
      if (mesh && mesh.userData.traits !== entity.traits) {
        this.scene.remove(mesh);
        mesh.userData.ownedMaterials.forEach(material => material.dispose());
        mesh = null;
      }
      if (!mesh) { mesh = this.makeFish(entity, predator); map.set(key, mesh); }
      mesh.position.set(entity.x, entity.y, entity.z);
      this.direction.set(entity.vx || 0.01, entity.vy || 0, entity.vz || 0).normalize();
      mesh.quaternion.setFromUnitVectors(this.forward, this.direction);
      const swim = Math.sin(this.elapsed * (predator ? 5 : 7 + (entity.traits?.speed ?? 0.5) * 5) + index * 1.7);
      mesh.userData.tail.rotation.y = swim * 0.45;
      mesh.userData.fins.forEach((fin, n) => { fin.rotation.y = swim * 0.17 * (n ? 1 : -1); });
    });
    for (const [id, mesh] of map) {
      if (live.has(id)) continue;
      this.scene.remove(mesh);
      mesh.userData.ownedMaterials.forEach(m => m.dispose());
      map.delete(id);
    }
  }

  draw(sim, selectedId, frameDelta = 1 / 60) {
    this.elapsed += Math.min(frameDelta, 0.1);
    this.syncEntities(sim.fish, this.fish);
    this.syncEntities(sim.predators || [], this.predators, true);
    const food = sim.food || [];
    this.foodMesh.count = Math.min(food.length, this.foodMesh.instanceMatrix.count);
    for (let i = 0; i < this.foodMesh.count; i++) {
      this.dummy.position.set(food[i].x, food[i].y, food[i].z);
      this.dummy.updateMatrix();
      this.foodMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.foodMesh.instanceMatrix.needsUpdate = true;
    this.grasses.forEach((blade, i) => { blade.rotation.z = Math.sin(this.elapsed * 0.7 + i) * 0.065; });
    this.dust.position.y = Math.sin(this.elapsed * 0.05) * 0.2;
    const selected = this.fish.get(selectedId);
    this.selection.visible = Boolean(selected);
    if (selected) {
      this.selection.position.copy(selected.position);
      this.selection.quaternion.copy(this.camera.quaternion);
      this.selection.scale.setScalar(selected.userData.size * 1.5);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.fish.values()], true);
    return hits.length ? hits[0].object.userData.fishId ?? null : null;
  }

  // Fit the actual habitat prism rather than hard-coded distances. Fish geometry
  // keeps its world size; a wider volume does not make the animals larger.
  framedDistance() {
    const direction = new THREE.Vector3(0.07, 0.29, 1).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tanX = tanY * this.camera.aspect;
    let distance = 20;
    for (const x of [-BOUNDS.x - 1, BOUNDS.x + 1]) {
      for (const y of [-1, BOUNDS.height + 1]) {
        for (const z of [-BOUNDS.z - 1, BOUNDS.z + 1]) {
          const corner = new THREE.Vector3(x, y - BOUNDS.height * 0.47, z);
          distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / tanX, Math.abs(corner.dot(up)) / tanY) * 1.04);
        }
      }
    }
    return distance;
  }

  resetCamera() {
    const rect = this.canvas.getBoundingClientRect();
    this.camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    this.camera.fov = rect.width < 650 ? 58 : 42;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0, BOUNDS.height * 0.47, 0);
    this.fitDistance = this.framedDistance();
    this.camera.position.set(0.07, 0.29, 1).normalize().multiplyScalar(this.fitDistance).add(this.controls.target);
    this.controls.update();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 650 ? 58 : 42;
    this.camera.updateProjectionMatrix();
    const nextFit = this.framedDistance();
    if (this.fitDistance) {
      this.camera.position.sub(this.controls.target).multiplyScalar(nextFit / this.fitDistance).add(this.controls.target);
    }
    this.fitDistance = nextFit;
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    this.renderer.dispose();
    this.fish.clear();
    this.predators.clear();
  }
}
