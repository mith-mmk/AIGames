import {SHOOTER_LAYOUT} from "../layout.mjs";
import * as T from "../../vendor/three-0.180.0/three.module.min.js";

/** Authored visual estimates, in table units, NOT manufacturer dimensions.
 * Local origin = resting head centre; +Z points toward the player.
 * Installation uses SHOOTER_LAYOUT, with no rotation.
 */
export const PLUNGER_PARAMETERS = Object.freeze({
  pullTravel: .32,
  rodRadius: .034,
  springRadius: .071,
  wireRadius: .008,
  springTurns: 12,
  springFront: .12,
  springRear: .79,
  guideLength: .18,
  knobZ: 1.10,
  releaseDuration: .115,
});

class HelicalSpring extends T.Curve {
  constructor(front, rear, radius, turns) {
    super(); Object.assign(this, { front, rear, radius, turns });
  }
  getPoint(t, target = new T.Vector3()) {
    // Half-turn seated ends blend into the active coils without separate rings.
    const angle = t * this.turns * Math.PI * 2;
    const end = .5 / this.turns;
    const u = Math.max(0, Math.min(1, (t - end) / (1 - 2 * end)));
    return target.set(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius,
      this.front + (this.rear - this.front) * u);
  }
}

/** Standalone moving mechanism. Does NOT create or move a collider.
 * The game integrates its kinematic tip at the shared SHOOTER_LAYOUT datum.
 * Standalone previews do not simulate contact or launch force.
 */
export class MechanicalPlunger {
  constructor({ materials = {}, parameters = {} } = {}) {
    if (!materials || typeof materials !== "object" || Array.isArray(materials))
      throw new TypeError("Plunger materials must be a material map");
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters))
      throw new TypeError("Plunger parameters must be an object");
    for (const name of Object.keys(parameters)) {
      if (!(name in PLUNGER_PARAMETERS)) throw new RangeError(`Unknown plunger parameter ${name}`);
    }
    for (const name of ["chrome", "brass", "dark", "rubber"]) {
      if (materials[name] !== undefined && materials[name]?.isMaterial !== true)
        throw new TypeError(`Plunger ${name} must be a Three.js Material`);
    }
    this.parameters = Object.freeze({ ...PLUNGER_PARAMETERS, ...parameters });
    const p = this.parameters;
    for (const [name, value] of Object.entries(p)) {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Invalid plunger ${name}`);
    }
    if (p.springFront + p.pullTravel + p.springTurns * p.wireRadius * 2 >= p.springRear)
      throw new RangeError("Plunger spring would reach coil bind");
    if (p.springRadius - p.wireRadius <= p.rodRadius)
      throw new RangeError("Plunger spring must clear its rod");
    // Seats, tip ferrule, mount and short spring have authored fixed profiles.
    // Reject incompatible overrides instead of silently intersecting them.
    if (p.rodRadius > .04 || p.springRadius + p.wireRadius > .09 || p.springFront < .115)
      throw new RangeError("Plunger dimensions exceed the fixed seats or tip clearances");
    if (!Number.isInteger(p.springTurns) || p.springTurns < 3 || p.springTurns > 64)
      throw new RangeError("Plunger springTurns must be an integer from 3 to 64");
    if (p.guideLength < .13)
      throw new RangeError("Plunger guide must extend through the mounting boss");
    const returnGap = p.knobZ - .055 - (p.springRear + .024 + p.guideLength);
    if (returnGap <= .028 || returnGap > .085)
      throw new RangeError("Plunger knob must leave .028 to .085 units for the short return spring");
    this.disposed = false;
    this.ownedMaterials = [];
    const mat = (name, properties) => {
      if (materials[name]) return materials[name];
      const material = new T.MeshStandardMaterial(properties);
      this.ownedMaterials.push(material); return material;
    };
    this.materials = {
      chrome: mat("chrome", { color: 0xc4cbd0, metalness: .94, roughness: .21 }),
      brass: mat("brass", { color: 0xc69d50, metalness: .8, roughness: .3 }),
      dark: mat("dark", { color: 0x152329, metalness: .65, roughness: .4 }),
      rubber: mat("rubber", { color: 0x252324, roughness: .86 }),
    };
    this.root = new T.Group(); this.root.name = "mechanical-plunger";
    this.root.userData.contract = {
      origin: [SHOOTER_LAYOUT.x, .175, SHOOTER_LAYOUT.restZ], axis: "+Z toward player", restContactZ: -.04,
      contactMotion: "restContactZ + pullTravel * pull; visual only",
      integration: "game kinematic contact follows the shared installed datum",
      dimensions: "Authored proportions, not measured manufacturer dimensions",
      mechanismReference: "Stern JAWS LE/Premium manual p46, 500-2604-07: long spring, washers, rod, short spring, retaining ring, rubber tip",
    };
    this.fixed = new T.Group(); this.fixed.name = "plunger-fixed-housing";
    this.moving = new T.Group(); this.moving.name = "plunger-moving-shaft";
    this.root.add(this.fixed, this.moving);
    this.pull = 0; this.releasing = false; this.releaseElapsed = 0;
    this.build(); this.setPull(0);
  }

  mesh(name, geometry, material, parent, z = 0, x = 0, y = 0) {
    this.assertAlive();
    const mesh = new T.Mesh(geometry, this.materials[material]);
    mesh.name = name; mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  turned(name, profile, material, parent, z = 0) {
    this.assertAlive();
    const geometry = new T.LatheGeometry(profile.map(([radius, depth]) => new T.Vector2(radius, depth)), 48);
    geometry.rotateX(Math.PI / 2);
    return this.mesh(name, geometry, material, parent, z);
  }

  sleeve(name, outer, inner, length, material, parent, z) {
    return this.turned(name, [[inner, 0], [outer, 0], [outer, length],
      [inner, length], [inner, 0]], material, parent, z);
  }

  build() {
    this.assertAlive();
    const p = this.parameters;
    this.head = this.turned("moving-rubber-contact-tip", [[0, -.04], [.081, -.04],
      [.101, -.031], [.108, -.015], [.108, .026], [.09, .04], [0, .04]], "rubber", this.moving);
    this.turned("tip-steel-ferrule", [[0, .03], [.09, .03], [.095, .045],
      [.095, .067], [.047, .082], [0, .082]], "chrome", this.moving);
    this.rod = this.turned("polished-continuous-shaft", [[0, .04], [p.rodRadius, .04],
      [p.rodRadius, p.knobZ + .09], [0, p.knobZ + .09]], "chrome", this.moving);
    this.sleeve("moving-spring-seat", .092, p.rodRadius, .025, "brass", this.moving, p.springFront - .025);
    const retainingRing = new T.TorusGeometry(p.rodRadius + .004, .004, 8, 40, Math.PI * 1.70);
    this.mesh("shaft-retaining-c-clip", retainingRing, "dark", this.moving, p.springFront - .03);
    this.sleeve("fixed-spring-seat", .101, p.rodRadius + .003, .024, "brass", this.fixed, p.springRear);
    // A real annular bearing bore, not a solid cylinder intersecting the shaft.
    this.sleeve("hollow-guide-tube", .074, p.rodRadius + .003, p.guideLength,
      "chrome", this.fixed, p.springRear + .024);
    this.sleeve("mounting-boss", .125, .075, .085, "brass", this.fixed, p.springRear + .065);
    // Open U bracket anchors the bearing without hiding the coils from above.
    this.mesh("mount-foot", new T.BoxGeometry(.35, .032, .28), "dark", this.fixed, p.springRear + .10, 0, -.147);
    for (const side of [-1, 1]) {
      this.mesh("mount-upright", new T.BoxGeometry(.035, .19, .09), "brass", this.fixed,
        p.springRear + .105, side * .135, -.052);
      for (const dz of [-.085, .085]) {
        const screw = this.mesh("mount-fastener", new T.CylinderGeometry(.022, .022, .012, 6),
          "chrome", this.fixed, p.springRear + .10 + dz, side * .135, -.125);
        this.mesh("fastener-slot", new T.BoxGeometry(.025, .001, .004), "dark", screw, 0, 0, .0065);
      }
    }
    this.knob = new T.Group(); this.knob.name = "sculpted-pull-knob";
    this.knob.position.z = p.knobZ; this.moving.add(this.knob);
    this.turned("knob-waist-and-domed-cap", [[0, -.055], [.057, -.055], [.068, -.039],
      [.07, -.005], [.092, .022], [.14, .047], [.156, .071], [.16, .10],
      [.154, .129], [.135, .151], [.095, .166], [.047, .177], [0, .18]], "brass", this.knob);
    this.sleeve("knob-grip-band", .1605, .15, .032, "dark", this.knob, .084);
    for (let i = 0; i < 40; i++) {
      const angle = i * Math.PI / 20;
      const tooth = this.mesh("knob-knurl", new T.BoxGeometry(.005, .006, .024), "brass", this.knob,
        .10, Math.cos(angle) * .161, Math.sin(angle) * .161);
      tooth.rotation.z = angle - Math.PI / 2;
    }
    this.spring = this.mesh("continuous-compression-helix", this.springGeometry(0), "chrome", this.root);
    // Short outer spring cushions the knob against the guide on recovery.
    // When pulled away it reaches free length and leaves the housing; it does
    // not stretch all the way across the new gap like an extension spring.
    this.returnSpring = this.mesh("short-recovery-spring", this.returnSpringGeometry(0), "chrome", this.root);
    this.springPull = 0;
  }

  returnSpringGeometry(pull) {
    this.assertAlive();
    const p = this.parameters;
    const rear = p.knobZ - .055 + pull * p.pullTravel;
    const housingEnd = p.springRear + .024 + p.guideLength;
    const front = Math.max(housingEnd, rear - .085);
    return new T.TubeGeometry(new HelicalSpring(front, rear, .049, 3), 96, .004, 8, false);
  }

  springGeometry(pull) {
    this.assertAlive();
    const p = this.parameters;
    return new T.TubeGeometry(new HelicalSpring(p.springFront + pull * p.pullTravel,
      p.springRear, p.springRadius, p.springTurns), Math.ceil(p.springTurns * 32), p.wireRadius, 8, false);
  }

  pose(pull) {
    if (this.disposed) return;
    this.pull = pull; this.moving.position.z = pull * this.parameters.pullTravel;
    if (Math.abs(pull - this.springPull) > 1e-6) {
      const previous = this.spring.geometry;
      this.spring.geometry = this.springGeometry(pull); previous.dispose(); this.springPull = pull;
      const previousReturn = this.returnSpring.geometry;
      this.returnSpring.geometry = this.returnSpringGeometry(pull); previousReturn.dispose();
    }
    this.root.userData.pull = pull;
    this.root.userData.contactZ = -.04 + this.moving.position.z;
  }

  setPull(power) {
    if (this.disposed) return this;
    if (!Number.isFinite(power)) throw new TypeError("Plunger pull must be finite");
    this.releasing = false; this.pose(T.MathUtils.clamp(power, 0, 1)); return this;
  }

  release() {
    if (this.disposed) return 0;
    this.releaseFrom = this.pull; this.releaseElapsed = 0; this.releasing = this.pull > 0;
    return this.releaseFrom;
  }

  update(dt) {
    if (this.disposed) return;
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError("Plunger dt must be finite nonnegative seconds");
    if (!this.releasing) return;
    this.releaseElapsed += dt;
    const t = Math.min(1, this.releaseElapsed / this.parameters.releaseDuration);
    // Spring acceleration from a held state, finishing at the mechanical stop.
    this.pose(this.releaseFrom * Math.cos(t * Math.PI / 2));
    if (t === 1) { this.pose(0); this.releasing = false; }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.releasing = false;
    this.root.removeFromParent();
    this.root.traverse(object => object.geometry?.dispose());
    for (const material of this.ownedMaterials) material.dispose();
    this.fixed.clear(); this.moving.clear(); this.knob.clear(); this.root.clear();
    this.ownedMaterials.length = 0;
  }

  assertAlive() {
    if (this.disposed) throw new Error("MechanicalPlunger has been disposed");
  }
}
