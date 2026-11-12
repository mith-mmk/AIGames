import { TABLE } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Scenic dressing only: never register these meshes as playfield colliders. */
export class WorkshopRoom {
  constructor(assets) {
    this.a = assets;
    this.root = new T.Group();
    this.root.name = "workshop-scenery";
  }
  build() {
    const a = this.a, g = this.root;
    const wood = new T.MeshStandardMaterial({ color: 0x29271f, roughness: 0.88 });
    const plaster = new T.MeshStandardMaterial({ color: 0x273e41, roughness: 0.96 });
    // Feet meet the horizontal floor even though the playfield is tilted.
    for (const x of [-2.1, 2.1]) for (const z of [-4.7, 4.7]) {
      const top = -0.58 * Math.cos(TABLE.tilt) - z * Math.sin(TABLE.tilt);
      const worldZ = z * Math.cos(TABLE.tilt) - 0.58 * Math.sin(TABLE.tilt);
      const bottom = -2.32;
      a.box(g, 0.16, top - bottom, 0.2, x, (top + bottom) / 2, worldZ, "chrome");
      a.cylinder(g, 0.17, 0.09, x, -2.36, worldZ, "rubber");
    }
    // Floorboard seams provide scale without competing with the ball.
    for (let x = -18; x < 18; x += 1.5)
      a.box(g, 1.47, 0.08, 36, x, -2.43, 0, wood);
    a.box(g, 36, 13, 0.25, 0, 4, -9, plaster);
    for (let x = -16; x <= 16; x += 4) {
      a.box(g, 0.17, 8, 0.18, x, 1.7, -8.8, wood);
      a.box(g, 3.85, 0.07, 0.12, x + 2, -0.6, -8.8, wood);
    }
    // Luminous frosted workshop window; no external image or texture required.
    a.box(g, 5, 4.3, 0.16, -5.7, 2.5, -8.65, "dark");
    const glass = new T.MeshStandardMaterial({ color: 0x79b6c0, emissive: 0x426a76, emissiveIntensity: 0.6, roughness: 0.55 });
    a.box(g, 4.65, 3.95, 0.06, -5.7, 2.5, -8.53, glass);
    for (const x of [-7.95, -5.7, -3.45]) a.box(g, 0.09, 4, 0.12, x, 2.5, -8.45, "brass");
    a.box(g, 4.65, 0.09, 0.12, -5.7, 2.5, -8.45, "brass");
    // Bench, drawers, parts jars and a hanging tool board, outside the table silhouette.
    a.box(g, 5, 0.22, 1.8, 5.5, -0.25, -7.5, wood);
    for (const x of [3.3, 7.7]) a.box(g, 0.22, 2.1, 1.5, x, -1.35, -7.5, "dark");
    a.box(g, 4.7, 2.4, 0.1, 5.5, 1.7, -8.6, wood);
    for (let i = 0; i < 7; i++) {
      const x = 3.65 + i * 0.62;
      a.box(g, 0.06, 0.7 + (i % 3) * 0.13, 0.08, x, 1.6, -8.4, "chrome");
      a.box(g, 0.14, 0.32, 0.12, x, 1.15, -8.4, i % 2 ? "jade" : "red");
      a.ring(g, 0.11, 0.035, x, 2.08, -8.4, "brass").rotation.x = 0;
    }
    for (let i = 0; i < 5; i++) {
      a.cylinder(g, 0.18, 0.45, 4 + i * 0.6, 0.08, -7.5, i % 2 ? "jade" : "cream");
      a.cylinder(g, 0.2, 0.06, 4 + i * 0.6, 0.34, -7.5, "brass");
    }
    a.box(g, 5.3, 0.14, 0.8, 5.5, 3.25, -8.3, wood);
    for (let i = 0; i < 6; i++) a.box(g, 0.35, 0.5 + (i % 3) * 0.18, 0.45, 3.5 + i * 0.62, 3.6, -8.3, i % 2 ? "jade" : "dark");
    // Warm practical light and its visible shade.
    a.tube(g, [[-4.1, -2.3, -3], [-4.1, 3.4, -3], [-2.8, 3.8, -3]], 0.055, "dark");
    a.cylinder(g, 0.58, 0.12, -4.1, -2.29, -3, "dark");
    a.mesh(new T.ConeGeometry(0.48, 0.48, 32, 1, true), new T.MeshStandardMaterial({ color: 0xd0ae67, side: T.DoubleSide, metalness: 0.6, roughness: 0.35 }), g, -2.8, 3.55, -3);
    a.cylinder(g, 0.27, 0.025, -2.8, 3.32, -3, "light");
    const lamp = new T.PointLight(0xffc783, 12, 8, 2);
    lamp.position.set(-2.8, 3.1, -3);
    g.add(lamp);
    return g;
  }
}
