import R from "../vendor/rapier3d-0.17.3/rapier.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { TABLE, BUMPERS, SLING_VERTICES, flipperAngle } from "./layout.mjs";
import { PinballGameState } from "./game-state.mjs";

export class PinballPhysics {
  static async create() { await R.init(); return new PinballPhysics(); }
  constructor() {
    this.state = new PinballGameState(); this.accumulator = 0; this.time = 0;
    this.world = new R.World({ x: 0, y: -98.1 * Math.cos(TABLE.tilt), z: 98.1 * Math.sin(TABLE.tilt) });
    this.world.timestep = 1 / 120;
    this.world.numSolverIterations = 8;
    this.queue = new R.EventQueue(true); this.hitObjects = new Map(); this.cooldowns = new Map();
    this.flippers = []; this.flipperAngles = [flipperAngle(false, false), flipperAngle(true, false)];
    this.build();
    this.ball = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(2.53, 0.2, 3.7).setCcdEnabled(true).setLinearDamping(0.12).setAngularDamping(0.15).setCanSleep(false));
    this.ballCollider = this.world.createCollider(R.ColliderDesc.ball(TABLE.ballRadius).setMass(0.08).setRestitution(0.22).setFriction(0.06).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), this.ball);
    this.resetBall();
  }
  get ballPosition() { return this.ball.translation(); }
  get ballRotation() { return this.ball.rotation(); }
  box(x, y, z, hx, hy, hz, restitution = 0.35) {
    return this.world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setRestitution(restitution).setFriction(0.08));
  }
  segment(a, b, radius, hit = null) {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), d = bv.clone().sub(av), mid = av.clone().add(bv).multiplyScalar(0.5);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    const c = this.world.createCollider(R.ColliderDesc.capsule(d.length() / 2, radius).setTranslation(mid.x, mid.y, mid.z).setRotation(q).setRestitution(hit ? 0.75 : 0.45).setFriction(0.05));
    if (hit) this.hitObjects.set(c.handle, hit); return c;
  }
  build() {
    // Floor ends before apron so misses naturally enter drain; shooter lane remains solid.
    this.box(0, -0.04, -0.55, 2.75, 0.08, 5.15);
    this.box(2.53, -0.04, 4.8, 0.22, 0.08, 0.9);
    for (const x of [-2.8, 2.8]) this.box(x, 0.45, 0, 0.07, 0.5, 5.85);
    this.box(0, 0.45, -5.8, 2.8, 0.5, 0.07);
    this.box(2.53, 0.3, 5.5, 0.27, 0.4, 0.08);
    // Shooter divider stops above the bumper area; curved roof feeds the ball left.
    this.segment([2.35, 0.23, 4.6], [2.35, 0.23, -3.9], 0.045);
    const roof = [[2.72, .23, -4.15], [2.4, .23, -5.2], [1.65, .23, -5.45], [0.5, .23, -4.4]];
    for (let i = 0; i < roof.length - 1; i++) this.segment(roof[i], roof[i + 1], 0.06);
    for (const [i, p] of BUMPERS.entries()) {
      const c = this.world.createCollider(R.ColliderDesc.cylinder(0.32, 0.40).setTranslation(p.x, 0.34, p.z).setRestitution(0.9));
      this.hitObjects.set(c.handle, { type: "bumper", x: p.x, z: p.z, points: 100, label: "ENERGY", key: "b" + i });
    }
    for (const side of [-1, 1]) {
      const outer = [[side * 2.2, .22, 1.9], [side * 2.1, .22, 3.1], [side * 1.4, .22, 4.15]];
      for (let i = 0; i < 2; i++) this.segment(outer[i], outer[i + 1], .04);
      const sling = new T.CatmullRomCurve3([...SLING_VERTICES, SLING_VERTICES[0]].map(([x, z]) => new T.Vector3(side * x, .22, z))).getPoints(16);
      for (let i = 0; i < sling.length - 1; i++) this.segment(sling[i].toArray(), sling[i + 1].toArray(), .07, { type: "sling", x: side * 1.35, z: 2.55, points: 25, label: "SLING", key: "s" + side });
      // Continuous sloped bank faces avoid ball-width pockets between standups.
      this.segment([side * .6, .22, -.45], [side * 1.8, .22, -.95], .07,
        { type: "target", points: 50, label: "TARGET", key: "t" + side });
      this.segment([side * .9, .22, -1.25], [side * 1.65, .22, -1.65], .07,
        { type: "target", points: 75, label: "BANK", key: "u" + side });
    }
    // Spinner is a sensor, so the low central shot remains passable.
    const spin = this.world.createCollider(R.ColliderDesc.cuboid(.35, .4, .05).setTranslation(0, .4, -1.35).setSensor(true));
    this.hitObjects.set(spin.handle, { type: "spinner", points: 150, label: "SPINNER", key: "spinner" });
    // Elevated decorative ramps are not collision surfaces: their low undersides
    // formed wedges against the floor. Keep the full floor-level orbit open.
    for (let i = 0; i < 2; i++) {
      const angle = this.flipperAngles[i];
      const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(i ? 1.05 : -1.05, .27, 3.75).setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }));
      this.world.createCollider(R.ColliderDesc.cuboid(.48, .09, .14).setTranslation(.40, 0, 0).setRestitution(.75).setFriction(.1), body);
      this.flippers.push(body);
    }
  }
  resetBall() {
    this.ball.setTranslation({ x: 2.53, y: .2, z: 3.7 }, true);
    this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true); this.ball.setAngvel({ x: 0, y: 0, z: 0 }, true); this.ball.setGravityScale(0, true);

  }
  launch(power = 1) {
    power = Number.isFinite(power) ? power : 1;
    if (!this.state.launch()) return false;
    this.ball.setGravityScale(1, true);
    this.ball.setLinvel({ x: 0, y: 0, z: -(18 + Math.max(0, Math.min(1, power)) * 5) }, true);
    return true;
  }
  restart() {
    this.state.restart(); this.accumulator = 0; this.cooldowns.clear(); this.resetBall();
    this.flipperAngles = [flipperAngle(false, false), flipperAngle(true, false)];
    for (let i = 0; i < 2; i++) this.flippers[i].setRotation({ x: 0, y: Math.sin(this.flipperAngles[i]/2), z: 0, w: Math.cos(this.flipperAngles[i]/2) }, true);
  }
  setPaused(value) { this.state.setPaused(value); this.accumulator = 0; }
  hit(other) {
    const h = this.hitObjects.get(other);
    if (!h || (this.cooldowns.get(h.key) ?? -99) > this.time) return;
    this.cooldowns.set(h.key, this.time + .16); this.state.award(h.points, h.label);
    if (h.type === "bumper" || h.type === "sling") {
      const p = this.ball.translation(), dx = p.x - h.x, dz = p.z - h.z, len = Math.hypot(dx, dz) || 1;
      const v = this.ball.linvel(), speed = h.type === "bumper" ? 13 : 10;
      this.ball.setLinvel({ x: dx / len * speed, y: Math.min(v.y, 1), z: dz / len * speed - (h.type === "sling" ? 3 : 0) }, true);
    }
  }
  step(dt, input = {}) {
    if (["paused", "gameover"].includes(this.state.phase)) return;
    this.accumulator += Math.min(Math.max(dt || 0, 0), .1);
    while (this.accumulator >= 1/120) {
      this.accumulator -= 1/120; this.time += 1/120;
      for (let i = 0; i < 2; i++) {
        const desired = flipperAngle(Boolean(i), Boolean(i ? input.right : input.left));
        const difference = desired - this.flipperAngles[i];
        this.flipperAngles[i] += Math.max(-.18, Math.min(.18, difference));
        const angle = this.flipperAngles[i];
        this.flippers[i].setNextKinematicRotation({ x: 0, y: Math.sin(angle/2), z: 0, w: Math.cos(angle/2) });
      }
      this.world.step(this.queue);
      this.queue.drainCollisionEvents((a, b, started) => {
        if (started && this.state.phase === "playing") {
          if (a === this.ballCollider.handle) this.hit(b); else if (b === this.ballCollider.handle) this.hit(a);
        }
      });
      if (this.state.phase === "ready") { this.resetBall(); continue; }
      const p = this.ball.translation(), v = this.ball.linvel();
      if (p.z > 4.65 || p.y < -1.0 || Math.abs(p.x) > 3.2 || p.z < -6.5) {
        this.state.drain(); this.resetBall(); continue;
      }
      if (Math.hypot(v.x, v.y, v.z) > 32) this.ball.setLinvel({ x: v.x * .85, y: v.y * .85, z: v.z * .85 }, true);
    }
  }
  dispose() { this.queue.free(); this.world.free(); }
}
