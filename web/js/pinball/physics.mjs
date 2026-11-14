import { targetCarrierParts, targetFaceAngle, targetDimensions, targetContactBoxes, flipperContactVertices, PLUNGER_CONTACT, targetContactId, slingContactPoints, plungerContactVertices } from "./mechanical-contact.mjs";
import {NudgeMeter} from "./nudge.mjs";
import { buildPhysicalRamp, rampSensorGates } from "./ramp-geometry.mjs";
import R from "../vendor/rapier3d-0.17.3/rapier.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { TABLE, SHOOTER_LAYOUT, BUMPERS, MINI_BUMPERS, LOWER_LAYOUT, TARGET_BANKS, SHOOTER_BACKING, lowerLanePaths, flipperAngle } from "./layout.mjs";
import { PinballGameState } from "./game-state.mjs";

export class PinballPhysics {
  static async create() { await R.init(); return new PinballPhysics(); }
  constructor() {
    this.nudgeMeter=new NudgeMeter(); this.state = new PinballGameState(); this.visualHits=[]; this.accumulator = 0; this.time = 0; this.eventSequence = 0; this.spinnerAngle = 0; this.spinnerSpeed = 0; this.rampStage = 0; this.rampTraversals=0;
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
    this.ball = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(SHOOTER_LAYOUT.x, .175, SHOOTER_LAYOUT.ballZ).setCcdEnabled(true).setLinearDamping(0.12).setAngularDamping(0.15).setCanSleep(false));
    this.ballCollider = this.world.createCollider(R.ColliderDesc.ball(TABLE.ballRadius).setMass(0.08).setRestitution(0.22).setFriction(0.06).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), this.ball);
    this.resetBall();
  }
  nudge() {
    if(this.state.phase!=="playing") return false;
    const result=this.nudgeMeter.push();if(result==="ignored")return false;
    if(result==="tilt") {this.state.tilted=true;this.tiltUntil=this.time+1.5;this.state.lastEvent="TILT · この球を終了";return true;}
    const p=this.ballPosition;
    this.ball.applyImpulse({x:p.x>0?-.13:.13,y:0,z:-.11},true);
    this.state.lastEvent=result==="warning"?"注意 · 連続ナッジでTILT":"NUDGE";return true;
  }
  takeVisualHits() { const hits=this.visualHits;this.visualHits=[];return hits; }
  get ballPosition() { return this.ball.translation(); }
  get metrics() { return { rampTraversals:this.rampTraversals, flipperContacts: [...this.flipperContacts], activeFlipperContacts: [...this.activeFlipperContacts], coilImpulses: [...this.coilImpulses], upfieldReturns: this.upfieldReturns }; }
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
    this.box(0, -0.04, -.55+LOWER_LAYOUT.downstreamOffset/2, TABLE.width/2, .08, 5.15+LOWER_LAYOUT.downstreamOffset/2);
    this.box(SHOOTER_LAYOUT.x, -.04, 4.8+LOWER_LAYOUT.downstreamOffset, .22, .08, .9);
    for (const x of [-2.8, 2.8]) this.box(x, .45, TABLE.centerZ, .07, .5, TABLE.length/2+.10);
    this.box(0, 0.45, -5.8, 2.8, 0.5, 0.07);
    this.box(SHOOTER_LAYOUT.x, .3, SHOOTER_LAYOUT.frontZ, .27, .4, .08);
    this.plungerPull = 0; this.plungerTargetPull = 0; this.readyPullActive = false;
    this.plungerBody=this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(SHOOTER_LAYOUT.x,.175,PLUNGER_CONTACT.restZ));
    this.plungerStop = this.world.createCollider(R.ColliderDesc.convexHull(plungerContactVertices())
      .setRestitution(.02).setFriction(.08),this.plungerBody);
    // Shooter divider stops above the bumper area; curved roof feeds the ball left.
    this.segment([2.35, .23, SHOOTER_LAYOUT.frontZ], [2.35, 0.23, -3.9], 0.045);
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
    for (const [i,p] of MINI_BUMPERS.entries()) {
      const c=this.world.createCollider(R.ColliderDesc.cylinder(.14,.16).setTranslation(p.x,.18,p.z).setRestitution(.75));
      this.hitObjects.set(c.handle,{type:"bumper",x:p.x,z:p.z,key:"mini"+i,strength:6});
    }
    for (const side of [-1, 1]) {
      // Open inlane rail: outside this rail remains a genuine outlane.
      for (const path of lowerLanePaths(side)) {
        for (let k=0;k<path.length-1;k++) this.segment(path[k],path[k+1],LOWER_LAYOUT.guideRadius);
      }
      const sling = slingContactPoints(LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x,z]));
      for (let i = 0; i < sling.length - 1; i++) this.segment(sling[i], sling[i + 1], .025, { type: "sling", x: side * LOWER_LAYOUT.slingCenter[0], z: LOWER_LAYOUT.slingCenter[1], points: 25, label: "SLING", key: "s" + side });
    }
    for(const bank of TARGET_BANKS) {
      const dx=bank.b[0]-bank.a[0], dz=bank.b[2]-bank.a[2];
      const angle=targetFaceAngle(bank), dimensions=targetDimensions(bank);
      const mount=-Math.atan2(dz,dx);
      for(const p of targetCarrierParts(bank)) {
        const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),mount);
        const center=new T.Vector3((bank.a[0]+bank.b[0])/2,0,(bank.a[2]+bank.b[2])/2);
        let desc;
        if(p.contact?.type==='capsule'){
          // The displayed CapsuleGeometry represents one smooth formed rail.
          // A triangle soup at its rounded end made multiple competing contact
          // normals wedge a floor ball; use that same analytic capsule instead.
          const c=p.contact,pos=new T.Vector3(0,c.y,c.z).applyQuaternion(rotation).add(center);
          const q=rotation.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2));
          desc=R.ColliderDesc.capsule(c.halfHeight,c.radius).setTranslation(pos.x,pos.y,pos.z).setRotation(q);
        }else{
          const position=p.geometry.getAttribute('position'),vertices=new Float32Array(position.array);
          const indices=p.geometry.index?new Uint32Array(p.geometry.index.array):Uint32Array.from({length:position.count},(_,i)=>i);
          desc=R.ColliderDesc.trimesh(vertices,indices).setTranslation(center.x,center.y,center.z).setRotation(rotation);
        }
        this.world.createCollider(desc.setRestitution(.35).setFriction(.05));p.geometry.dispose();
      }


      for(let i=0;i<bank.count;i++) {
        const t=(i+.5)/bank.count, x=bank.a[0]+dx*t,z=bank.a[2]+dz*t;
        // Thick molded standup and raised strike plate, not an invisible bank
        // capsule bridging the real gaps. Bounds include the visible bevel.
        for(const [hx,hy,hz,cy,cz] of targetContactBoxes(dimensions)) {
          const c=this.world.createCollider(R.ColliderDesc.cuboid(hx,hy,hz)
            .setTranslation(x+Math.sin(angle)*cz,cy,z+Math.cos(angle)*cz)
            .setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)})
            .setRestitution(.75).setFriction(.05));
          this.hitObjects.set(c.handle,{type:bank.type,points:bank.type==="bank"?75:50,
            label:"TARGET",key:bank.key,targetId:`${bank.key}:${i}`});
        }
      }
    }
    for (const x of [-1.875, -.625, .625, 1.875]) this.segment([x, .23, -5.0], [x, .23, -4.1], .035);
    for (let lane = 0; lane < 3; lane++) {
      const c = this.world.createCollider(R.ColliderDesc.cuboid(.35, .30, .08)
        .setTranslation((lane - 1) * 1.25, .30, -4.55).setSensor(true));
      this.hitObjects.set(c.handle, { type: "rollover", lane, key: "lane" + lane });
    }
    for(const side of [-1,1]) {
      const c=this.world.createCollider(R.ColliderDesc.cuboid(.125,.20,.04).setTranslation(side*LOWER_LAYOUT.inlaneSensor[0],LOWER_LAYOUT.inlaneSensor[1],LOWER_LAYOUT.inlaneSensor[2]).setSensor(true));
      this.hitObjects.set(c.handle,{type:"inlane",key:"inlane"+side});
    }
    // Spinner is a sensor, so the low central shot remains passable.
    const spin = this.world.createCollider(R.ColliderDesc.cuboid(.35, .4, .05).setTranslation(0, .4, -1.35).setSensor(true));
    this.hitObjects.set(spin.handle, { type: "spinner", points: 150, label: "SPINNER", key: "spinner" });
    this.ramp = buildPhysicalRamp(this);
    // Ordered elevated gates count a completed ramp, never a ground shot below it.
    for (const [index,gate] of rampSensorGates(this.ramp.rows).entries()) {
      const {position:p,direction:t,halfWidth,halfHeight,halfDepth}=gate;
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),t);
      const c=this.world.createCollider(R.ColliderDesc.cuboid(halfWidth,halfHeight,halfDepth).setTranslation(p.x,p.y,p.z).setRotation(q).setSensor(true));
      this.hitObjects.set(c.handle,{type:"ramp-gate",index,direction:t,key:"ramp-gate-"+index});
    }
    for (let i = 0; i < 2; i++) {
      const angle = this.flipperAngles[i];
      const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation((i ? 1 : -1) * LOWER_LAYOUT.flipperPivot[0], LOWER_LAYOUT.flipperPivot[1], LOWER_LAYOUT.flipperPivot[2]).setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }));
      const blade = this.world.createCollider(R.ColliderDesc.convexHull(flipperContactVertices()).setRestitution(.1).setFriction(.35), body);
      this.flipperHandles.set(blade.handle, i);
      this.flippers.push(body);
    }
  }
  setPlungerPull(power) {
    if (!Number.isFinite(power)) throw new TypeError("Plunger pull must be finite");
    if (this.state.phase !== "ready") return this.plungerPull;
    this.plungerTargetPull = Math.max(0, Math.min(1, power));
    if (this.plungerTargetPull > 0) { this.readyPullActive = true; this.ball.setGravityScale(1, true); }
    return this.plungerPull;
  }
  resetBall() {
    this.plungerPull=0; this.plungerTargetPull=0; this.readyPullActive=false;
    this.plungerBody.setTranslation({x:SHOOTER_LAYOUT.x,y:.175,z:PLUNGER_CONTACT.restZ},true);
    this.plungerBody.setNextKinematicTranslation({x:SHOOTER_LAYOUT.x,y:.175,z:PLUNGER_CONTACT.restZ});
    this.nudgeMeter.reset();this.state.tilted=false;this.state.returnedShooter = false; this.rampStage = 0;
    this.ball.setTranslation({ x: SHOOTER_LAYOUT.x, y: .175, z: SHOOTER_LAYOUT.ballZ }, true);
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
    this.visualHits.length=0; this.lastFlipperShot = null; this.rampTraversals=0;
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
    // Continuous contact-local spread for the current tapered bat. Heel-to-tip
    // timing smoothly changes direction; no discontinuous branch at mid-bat,
    // destination selection, or post-contact correction is involved.
    const aimAngle = .18 - 1.6 * along + .2 * (faceAngle + .5);
    const angularSpeed = this.flipperAngularSpeeds[side];
    const speed = Math.min(32, 8 + (12 + along * 24) * Math.min(1, angularSpeed / 12));
    const lateral = (side ? 1 : -1) * Math.sin(aimAngle) * speed;
    const forward = -Math.cos(aimAngle) * speed;
    this.lastFlipperShot = { side, along, faceAngle, aimAngle, angularSpeed, speed, p: { ...this.ball.translation() }, vx: lateral, vz: forward };
    this.ball.applyImpulse({ x: (lateral - v.x) * this.ball.mass(), y: 0, z: (forward - v.z) * this.ball.mass() }, true);
  }
  hit(other) {
    if(this.state.tilted)return;
    if (this.flipperHandles.has(other)) {
      const side = this.flipperHandles.get(other); this.flipperContacts[side]++;
      this.strikeFlipper(side);
    }

    const h = this.hitObjects.get(other);
    if (!h || (this.cooldowns.get(h.key) ?? -99) > this.time) return;
    if (h.type === "ramp-gate") {
      this.cooldowns.set(h.key,this.time+.16);
      const velocity=this.ball.linvel(),forward=velocity.x*h.direction.x+velocity.z*h.direction.z>0;
      if(h.index===0 && forward) {this.rampStage=1;this.rampStarted=this.time;}
      else if(h.index===1 && forward && this.rampStage===1 && this.time-this.rampStarted<30) this.rampStage=2;
      else if(h.index===2 && this.rampStage===2 && this.time-this.rampStarted<30 && forward) {
        if(this.state.onEvent({type:"ramp",id:"ramp-"+this.eventSequence++})) this.rampTraversals++;this.rampStage=0;
      }
      return;
    }
    this.cooldowns.set(h.key, this.time + .16); const accepted = this.state.onEvent({ type: h.type, lane: h.lane, id: "contact-" + this.eventSequence++ });
    if (["bumper", "sling", "bank", "target"].includes(h.type) && accepted) {
      const bank=TARGET_BANKS.find(bank=>bank.key===h.key);
      const targetId=h.targetId ?? (bank ? targetContactId(bank,this.ball.translation()) : undefined);
      this.visualHits.push(h.type === "bumper"
        ? {key:h.key,points:this.state.lastContactAward?.points??100}
        : {type:h.type,key:h.key,targetId,points:this.state.lastContactAward?.points??h.points??0});if(this.visualHits.length>12)this.visualHits.shift();
    }
    if (h.type === "spinner" && accepted) this.spinnerSpeed = Math.min(50, this.spinnerSpeed + Math.max(8, Math.abs(this.ball.linvel().z) * 2));
    if (h.type === "bumper" || h.type === "sling") {
      const p = this.ball.translation(), dx = p.x - h.x, dz = p.z - h.z, len = Math.hypot(dx, dz) || 1;
      const v = this.ball.linvel();
      if (h.type === "sling") this.ball.applyImpulse({ x: dx / len * .18, y: 0, z: dz / len * .18 }, true);
      else {
        const outward = (v.x * dx + v.z * dz) / len;
        const impulse = Math.max(0, (h.strength??6) - outward) * this.ball.mass();
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
      this.nudgeMeter.step(1/120);
      if(this.state.tilted && this.time>=this.tiltUntil){this.state.drain();this.resetBall();continue;}
      for (let i = 0; i < 2; i++) {
        const active=!this.state.tilted && Boolean(i ? input.right : input.left);
        const desired = flipperAngle(Boolean(i), active);
        const difference = desired - this.flipperAngles[i];
        this.flipperRising[i] = active && Math.abs(difference) > .001;
        const rate = active ? .10 : .035;
        const angularStep = Math.max(-rate, Math.min(rate, difference));
        this.flipperAngularSpeeds[i] = Math.abs(angularStep) * 120;
        this.flipperAngles[i] += angularStep;
        const angle = this.flipperAngles[i];
        this.flippers[i].setNextKinematicRotation({ x: 0, y: Math.sin(angle/2), z: 0, w: Math.cos(angle/2) });
      }
      this.spinnerAngle = (this.spinnerAngle + this.spinnerSpeed / 120) % (Math.PI * 2);
      this.spinnerSpeed *= Math.exp(-2 / 120);
      // Pull/cancel is a real moving kinematic stop. A cancelled pull cannot
      // teleport the head ahead of a resting ball and strand it behind the tip.
      if (this.state.phase === "ready") {
        const delta=this.plungerTargetPull-this.plungerPull;
        this.plungerPull+=Math.max(-1/38.4,Math.min(1/14,delta));
        this.plungerBody.setNextKinematicTranslation({x:SHOOTER_LAYOUT.x,y:.175,z:PLUNGER_CONTACT.restZ+PLUNGER_CONTACT.pullTravel*this.plungerPull});
      }
      // Do not teleport the released stop through the ball. Once the ball has
      // cleared its rest face, return the tip without adding a second launch.
      if (this.state.phase === "playing" && this.plungerPull > 0 &&
          this.ball.translation().z + TABLE.ballRadius < PLUNGER_CONTACT.restZ - .04) {
        this.plungerPull=Math.max(0,this.plungerPull-1/(120*.115));
        this.plungerBody.setNextKinematicTranslation({x:SHOOTER_LAYOUT.x,y:.175,z:PLUNGER_CONTACT.restZ+PLUNGER_CONTACT.pullTravel*this.plungerPull});
      }
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
        if (!this.state.returnedShooter && !this.readyPullActive) { this.resetBall(); continue; }
        const resting = this.ball.translation();
        // Returned balls still simulate: never leave a lost ball stranded in ready.
        if (resting.y < -1 || Math.abs(resting.x) > 3.2 || resting.z > TABLE.frontZ+.10 || resting.z < -6.5) {
          this.state.launch(); this.state.drain(); this.resetBall();
        }
        continue;
      }
      const p = this.ball.translation(), v = this.ball.linvel();
      // An ordered elevated run ends on the playfield or after its timeout.
      // Do not use old fixed x/z limits: entrance and exit belong to the route.
      if(this.rampStage && (this.time-this.rampStarted>30 || p.y<.28)) this.rampStage=0;
      if (this.returnPending && p.z < 3.2 && v.z < 0 && this.time - this.lastActiveContactTime < .8) {
        this.upfieldReturns++; this.returnPending = false;
      }
      // A target-earned left outlane kickback remains a real, single-use return.
      if(p.x < -2.08 && p.x > -2.62 && p.z>3.45 && p.z<3.72 && p.y<.5 && v.z>0 &&
          !this.state.tilted && this.state.sideSaveCharges && this.state.onEvent({type:"side-save",id:"side-save-"+this.eventSequence++})) {
        // The plunger fires along the OUT lane, not sideways into its divider.
        this.ball.applyImpulse({x:-v.x*this.ball.mass(),y:0,z:(-12-v.z)*this.ball.mass()},true);
      }
      // A charged, visible center saver launches the descending ball physically.
      if (Math.abs(p.x) < .6 && p.z > LOWER_LAYOUT.centerSaveZ[0] && p.z < LOWER_LAYOUT.centerSaveZ[1] && v.z > 0 &&
          !this.state.tilted && this.state.kickbackCharges && this.state.onEvent({ type: "kickback", id: "save-" + this.eventSequence++ })) {
        this.returnPending = false;
        this.ball.applyImpulse({ x: -p.x * .3, y: .88, z: (-8 - v.z) * this.ball.mass() }, true);
      }
      // A returning ball inside the physical shooter channel is not an outlane
      // drain. Keep its position, velocity and ball number; gravity rolls it to
      // the plunger end, and launch() fires from wherever it actually rests.
      const inShooter = p.x > 2.45 && p.x < 2.70 && p.y > -.1 && p.y < .5;
      if (!this.state.tilted && inShooter && p.z > SHOOTER_LAYOUT.returnMinZ && p.z < SHOOTER_LAYOUT.returnMaxZ && v.z >= 0) {
        this.state.returnToShooter(); continue;
      }
      if ((!inShooter && p.z > LOWER_LAYOUT.drainZ) || p.y < -1.0 || Math.abs(p.x) > 3.2 || p.z < -6.5) {
        this.state.drain(); this.resetBall(); continue;
      }
      const currentVelocity = this.ball.linvel();
      const ballSpeed = Math.hypot(currentVelocity.x, currentVelocity.y, currentVelocity.z);
      if (ballSpeed > 32) this.ball.setLinvel({ x: currentVelocity.x * 32 / ballSpeed, y: currentVelocity.y * 32 / ballSpeed, z: currentVelocity.z * 32 / ballSpeed }, true);
    }
  }
  dispose() { this.queue.free(); this.world.free(); }
}
