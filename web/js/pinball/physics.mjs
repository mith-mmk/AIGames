import { buildPhysicalRamp } from "./ramp-geometry.mjs";
import R from "../vendor/rapier3d-0.17.3/rapier.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { TABLE, BUMPERS, LOWER_LAYOUT, TARGET_BANKS, SHOOTER_BACKING, flipperAngle } from "./layout.mjs";
import { PinballGameState } from "./game-state.mjs";

export class PinballPhysics {
  static async create() { await R.init(); return new PinballPhysics(); }
  constructor() {
    this.state = new PinballGameState(); this.accumulator = 0; this.time = 0; this.eventSequence = 0; this.spinnerAngle = 0; this.spinnerSpeed = 0;
    // Reduced downhill acceleration approximates rolling inertia for beginner play.
    this.world = new R.World({ x: 0, y: -98.1 * Math.cos(TABLE.tilt), z: 63.765 * Math.sin(TABLE.tilt) });
    this.world.timestep = 1 / 120;
    this.world.numSolverIterations = 8;
    this.queue = new R.EventQueue(true); this.hitObjects = new Map(); this.cooldowns = new Map();
    this.flipperAngularSpeeds = [0, 0]; this.flipperRising = [false, false]; this.coilImpulses = [0, 0];
    this.flipperCoilCooldown = [0, 0];
    this.upfieldReturns = 0; this.lastActiveContactTime = -99; this.returnPending = false;
    this.flipperContacts = [0, 0]; this.flipperHandles = new Map(); this.activeFlipperContacts = [0, 0];
    this.flippers = []; this.flipperAngles = [flipperAngle(false, false), flipperAngle(true, false)];
    this.build();
    this.ball = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(2.53, 0.2, 3.7).setCcdEnabled(true).setLinearDamping(0.12).setAngularDamping(0.15).setCanSleep(false));
    this.ballCollider = this.world.createCollider(R.ColliderDesc.ball(TABLE.ballRadius).setMass(0.08).setRestitution(0.22).setFriction(0.06).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), this.ball);
    this.resetBall();
  }
  get ballPosition() { return this.ball.translation(); }
  get metrics() { return { flipperContacts: [...this.flipperContacts], activeFlipperContacts: [...this.activeFlipperContacts], coilImpulses: [...this.coilImpulses], upfieldReturns: this.upfieldReturns }; }
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
    this.segment([2.35, 0.23, 5.5], [2.35, 0.23, -3.9], 0.045);
    const roof = [[2.72, .23, -4.15], [2.4, .23, -5.2], [1.25, .23, -5.55], [.95, .23, -5.3]];
    for (let i = 0; i < roof.length - 1; i++) this.segment(roof[i], roof[i + 1], 0.06);
    // Triangulate the concave backing; one convex hull would intrude into
    // the curved shooter path and the adjacent elevated return route.
    for (let i=0; i<SHOOTER_BACKING.length-2; i++) {
      const triangle=[SHOOTER_BACKING.at(-1),SHOOTER_BACKING[i],SHOOTER_BACKING[i+1]];
      const vertices=new Float32Array([-.04,.55].flatMap(y=>triangle.flatMap(([x,z])=>[x,y,z])));
      this.world.createCollider(R.ColliderDesc.convexHull(vertices).setRestitution(.35).setFriction(.05));
    }
    for (const [i, p] of BUMPERS.entries()) {
      const c = this.world.createCollider(R.ColliderDesc.cylinder(0.32, 0.40).setTranslation(p.x, 0.34, p.z).setRestitution(0.9));
      this.hitObjects.set(c.handle, { type: "bumper", x: p.x, z: p.z, points: 100, label: "ENERGY", key: "b" + i });
    }
    for (const side of [-1, 1]) {
      // Open inlane rail: outside this rail remains a genuine outlane.
      const guide = LOWER_LAYOUT.guide.map(([x, y, z]) => [side * x, y, z]);
      const entry = LOWER_LAYOUT.guideEntry[side < 0 ? "left" : "right"];
      guide.unshift([side * entry[0], entry[1], entry[2]]);
      for (let k = 0; k < guide.length - 1; k++) this.segment(guide[k], guide[k + 1], LOWER_LAYOUT.guideRadius);
      const sling = new T.CatmullRomCurve3([...LOWER_LAYOUT.slingVertices, LOWER_LAYOUT.slingVertices[0]].map(([x, z]) => new T.Vector3(side * x, .22, z))).getPoints(16);
      for (let i = 0; i < sling.length - 1; i++) this.segment(sling[i].toArray(), sling[i + 1].toArray(), .07, { type: "sling", x: side * LOWER_LAYOUT.slingCenter[0], z: LOWER_LAYOUT.slingCenter[1], points: 25, label: "SLING", key: "s" + side });
    }
    for(const bank of TARGET_BANKS) this.segment(bank.a,bank.b,.07,
      {type:bank.type,points:bank.type==="bank"?75:50,label:"TARGET",key:bank.key});
    for (const x of [-1.875, -.625, .625, 1.875]) this.segment([x, .23, -5.0], [x, .23, -4.1], .035);
    for (let lane = 0; lane < 3; lane++) {
      const c = this.world.createCollider(R.ColliderDesc.cuboid(.35, .30, .08)
        .setTranslation((lane - 1) * 1.25, .30, -4.55).setSensor(true));
      this.hitObjects.set(c.handle, { type: "rollover", lane, key: "lane" + lane });
    }
    // Spinner is a sensor, so the low central shot remains passable.
    const spin = this.world.createCollider(R.ColliderDesc.cuboid(.35, .4, .05).setTranslation(0, .4, -1.35).setSensor(true));
    this.hitObjects.set(spin.handle, { type: "spinner", points: 150, label: "SPINNER", key: "spinner" });
    this.ramp = buildPhysicalRamp(this);
    for (let i = 0; i < 2; i++) {
      const angle = this.flipperAngles[i];
      const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation((i ? 1 : -1) * LOWER_LAYOUT.flipperPivot[0], LOWER_LAYOUT.flipperPivot[1], LOWER_LAYOUT.flipperPivot[2]).setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }));
      const blade = this.world.createCollider(R.ColliderDesc.cuboid(LOWER_LAYOUT.flipperHalfLength, .27, LOWER_LAYOUT.flipperHalfWidth).setTranslation(LOWER_LAYOUT.flipperCenter, 0, 0).setRestitution(.1).setFriction(.35), body);
      this.flipperHandles.set(blade.handle, i);
      this.flippers.push(body);
    }
  }
  resetBall() {
    this.state.returnedShooter = false;
    this.ball.setTranslation({ x: 2.53, y: .2, z: 3.7 }, true);
    this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true); this.ball.setAngvel({ x: 0, y: 0, z: 0 }, true); this.ball.setGravityScale(0, true);

  }
  launch(power = 1) {
    power = Number.isFinite(power) ? power : 1;
    if (!this.state.launch()) return false;
    this.ball.setGravityScale(1, true);
    this.ball.setLinvel({ x: 0, y: 0, z: -(3 + Math.max(0, Math.min(1, power)) * 20) }, true);
    return true;
  }
  restart() {
    this.lastFlipperShot = null;
    this.flipperCoilCooldown.fill(0); this.coilImpulses.fill(0); this.flipperRising.fill(false);
    this.flipperContacts.fill(0); this.activeFlipperContacts.fill(0); this.upfieldReturns = 0; this.returnPending = false;
    this.state.restart(); this.spinnerAngle = 0; this.spinnerSpeed = 0; this.accumulator = 0; this.cooldowns.clear(); this.resetBall();
    this.flipperAngles = [flipperAngle(false, false), flipperAngle(true, false)];
    for (let i = 0; i < 2; i++) this.flippers[i].setRotation({ x: 0, y: Math.sin(this.flipperAngles[i]/2), z: 0, w: Math.cos(this.flipperAngles[i]/2) }, true);
  }
  setPaused(value) { this.state.setPaused(value); this.accumulator = 0; }
  strikeFlipper(side) {
    if (!this.flipperRising[side] || this.time < this.flipperCoilCooldown[side]) return;
    const v = this.ball.linvel();
    if (v.z <= -8) return;
    this.flipperCoilCooldown[side] = this.time + .18; this.coilImpulses[side]++;
    this.activeFlipperContacts[side]++; this.lastActiveContactTime = this.time; this.returnPending = true;
    const along = Math.max(0, Math.min(1, (LOWER_LAYOUT.flipperPivot[0] - Math.abs(this.ball.translation().x)) / (LOWER_LAYOUT.flipperCenter + LOWER_LAYOUT.flipperHalfLength)));
    const faceAngle = side ? Math.PI - this.flipperAngles[side] : this.flipperAngles[side];
    // Position-dependent shot spread is a pinball approximation for the box paddle.
    // A heel-to-mid stroke can aim around the bumper flanks; later tip shots retain
    // the cross-table ramp angle. This contact-local curve never selects a
    // target or changes the ball position, and passive cradles stay passive.
    const aimAngle = along < .4
      ? .08 - Math.max(0, along - .30) * 2
      : faceAngle - along * .7;
    const angularSpeed = this.flipperAngularSpeeds[side];
    const speed = Math.min(32, 8 + (12 + along * 24) * Math.min(1, angularSpeed / 12));
    const lateral = (side ? 1 : -1) * Math.sin(aimAngle) * speed;
    const forward = -Math.cos(aimAngle) * speed;
    this.lastFlipperShot = { side, along, faceAngle, aimAngle, angularSpeed, speed, p: { ...this.ball.translation() }, vx: lateral, vz: forward };
    this.ball.applyImpulse({ x: (lateral - v.x) * this.ball.mass(), y: 0, z: (forward - v.z) * this.ball.mass() }, true);
  }
  hit(other) {
    if (this.flipperHandles.has(other)) {
      const side = this.flipperHandles.get(other); this.flipperContacts[side]++;
      this.strikeFlipper(side);
    }

    const h = this.hitObjects.get(other);
    if (!h || (this.cooldowns.get(h.key) ?? -99) > this.time) return;
    this.cooldowns.set(h.key, this.time + .16); const accepted = this.state.onEvent({ type: h.type, lane: h.lane, id: "contact-" + this.eventSequence++ });
    if (h.type === "spinner" && accepted) this.spinnerSpeed = Math.min(50, this.spinnerSpeed + Math.max(8, Math.abs(this.ball.linvel().z) * 2));
    if (h.type === "bumper" || h.type === "sling") {
      const p = this.ball.translation(), dx = p.x - h.x, dz = p.z - h.z, len = Math.hypot(dx, dz) || 1;
      const v = this.ball.linvel();
      if (h.type === "sling") this.ball.applyImpulse({ x: dx / len * .06, y: 0, z: dz / len * .06 }, true);
      else {
        const outward = (v.x * dx + v.z * dz) / len;
        const impulse = Math.max(0, 6 - outward) * this.ball.mass();
        this.ball.applyImpulse({ x: dx / len * impulse, y: 0, z: dz / len * impulse }, true);
      }
    }
  }
  step(dt, input = {}) {
    if (["paused", "gameover"].includes(this.state.phase)) return;
    this.currentInput = input;
    this.accumulator += Math.min(Math.max(dt || 0, 0), .1);
    while (this.accumulator >= 1/120) {
      this.accumulator -= 1/120; this.time += 1/120;
      for (let i = 0; i < 2; i++) {
        const desired = flipperAngle(Boolean(i), Boolean(i ? input.right : input.left));
        const difference = desired - this.flipperAngles[i];
        this.flipperRising[i] = Boolean(i ? input.right : input.left) && Math.abs(difference) > .001;
        const rate = (i ? input.right : input.left) ? .10 : .035;
        const angularStep = Math.max(-rate, Math.min(rate, difference));
        this.flipperAngularSpeeds[i] = Math.abs(angularStep) * 120;
        this.flipperAngles[i] += angularStep;
        const angle = this.flipperAngles[i];
        this.flippers[i].setNextKinematicRotation({ x: 0, y: Math.sin(angle/2), z: 0, w: Math.cos(angle/2) });
      }
      this.spinnerAngle = (this.spinnerAngle + this.spinnerSpeed / 120) % (Math.PI * 2);
      this.spinnerSpeed *= Math.exp(-2 / 120);
      this.world.step(this.queue);
      this.queue.drainCollisionEvents((a, b, started) => {
        if (started && this.state.phase === "playing") {
          if (a === this.ballCollider.handle) this.hit(b); else if (b === this.ballCollider.handle) this.hit(a);
        }
      });
      for (const [handle, side] of this.flipperHandles) {
        if (this.flipperRising[side]) this.world.contactPair(this.ballCollider, this.world.getCollider(handle), manifold => {
          if (manifold.numSolverContacts() > 0) this.strikeFlipper(side);
        });
      }
      if (this.state.phase === "ready") {
        if (!this.state.returnedShooter) { this.resetBall(); continue; }
        const resting = this.ball.translation();
        // Returned balls still simulate: never leave a lost ball stranded in ready.
        if (resting.y < -1 || Math.abs(resting.x) > 3.2 || resting.z > 5.85 || resting.z < -6.5) {
          this.state.launch(); this.state.drain(); this.resetBall();
        }
        continue;
      }
      const p = this.ball.translation(), v = this.ball.linvel();
      if (this.returnPending && p.z < 3.2 && v.z < 0 && this.time - this.lastActiveContactTime < .8) {
        this.upfieldReturns++; this.returnPending = false;
      }
      // A charged, visible center saver launches the descending ball physically.
      if (Math.abs(p.x) < .6 && p.z > LOWER_LAYOUT.centerSaveZ[0] && p.z < LOWER_LAYOUT.centerSaveZ[1] && v.z > 0 &&
          this.state.kickbackCharges && this.state.onEvent({ type: "kickback", id: "save-" + this.eventSequence++ })) {
        this.returnPending = false;
        this.ball.applyImpulse({ x: -p.x * .3, y: .88, z: (-8 - v.z) * this.ball.mass() }, true);
      }
      // A returning ball inside the physical shooter channel is not an outlane
      // drain. Keep its position, velocity and ball number; gravity rolls it to
      // the plunger end, and launch() fires from wherever it actually rests.
      const inShooter = p.x > 2.45 && p.x < 2.70 && p.y > -.1 && p.y < .5;
      if (inShooter && p.z > 4.65 && p.z < 5.5 && v.z >= 0) {
        this.state.returnToShooter(); continue;
      }
      if ((!inShooter && p.z > 4.65) || p.y < -1.0 || Math.abs(p.x) > 3.2 || p.z < -6.5) {
        this.state.drain(); this.resetBall(); continue;
      }
      const currentVelocity = this.ball.linvel();
      const ballSpeed = Math.hypot(currentVelocity.x, currentVelocity.y, currentVelocity.z);
      if (ballSpeed > 32) this.ball.setLinvel({ x: currentVelocity.x * 32 / ballSpeed, y: currentVelocity.y * 32 / ballSpeed, z: currentVelocity.z * 32 / ballSpeed }, true);
    }
  }
  dispose() { this.queue.free(); this.world.free(); }
}
