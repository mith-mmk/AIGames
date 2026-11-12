import test from "node:test";
import assert from "node:assert/strict";
import { PinballPhysics } from "./physics.mjs";
import { LOWER_LAYOUT, TABLE } from "./layout.mjs";
import { RAMP_POINTS } from "./ramp-geometry.mjs";
import { PinballGameState } from "./game-state.mjs";

function run(g, seconds, input = {}) { for (let i = 0; i < seconds * 120; i++) g.step(1 / 120, input); }

test("rules enforce three balls, pause and reset", () => {
  const s = new PinballGameState();
  s.award(100, "invalid"); assert.equal(s.score, 0);
  for (let i = 1; i <= 3; i++) {
    assert.equal(s.ballNumber, i); assert.equal(s.launch(), true); assert.equal(s.launch(), false);
    s.award(100, "bumper"); s.setPaused(true); assert.equal(s.phase, "paused"); s.setPaused(false);
    assert.equal(s.phase, "playing"); s.drain();
  }
  assert.equal(s.phase, "gameover"); assert.equal(s.score, 300);
  s.setPaused(true); assert.equal(s.phase, "gameover"); s.restart(); assert.equal(s.phase, "ready"); assert.equal(s.score, 0);
});

test("real launch feeds scoring objects, not a scripted path", async () => {
  const g = await PinballPhysics.create();
  try {
    assert.equal(g.launch(.7), true); run(g, 5);
    assert.ok(g.state.score > 0, `score=${g.state.score}`);
    assert.ok(g.ballPosition.x < 2.3); assert.ok(Number.isFinite(g.ballPosition.y));
  } finally { g.dispose(); }
});

test("physical drain serves next ball and ends after third", async () => {
  const g = await PinballPhysics.create();
  try {
    for (let i = 1; i <= 3; i++) {
      g.launch(); g.ball.setTranslation({ x: 0, y: .2, z: 4.9 }, true); run(g, .04);
      assert.equal(g.state.phase, i === 3 ? "gameover" : "ready");
    }
    g.restart(); assert.equal(g.state.ballNumber, 1); assert.equal(g.state.phase, "ready");
    assert.equal(g.state.score, 0);
  } finally { g.dispose(); }
});

test("both kinematic flippers physically drive ball upfield", async () => {
  for (const side of [-1, 1]) {
    const g = await PinballPhysics.create();
    try {
      g.launch(); g.ball.setTranslation({ x: side * .65, y: .2, z: 3.90 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
      run(g, .125, { left: side < 0, right: side > 0 });
      assert.ok(g.ball.linvel().z < -5, JSON.stringify(g.ball.linvel()));
    } finally { g.dispose(); }
  }
});

test("pause freezes simulation; resume and restart are deterministic", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); run(g, .2); g.setPaused(true); const p = { ...g.ballPosition };
    run(g, 1, { left: true }); assert.deepEqual({ ...g.ballPosition }, p);
    g.setPaused(false); run(g, .1); assert.notDeepEqual({ ...g.ballPosition }, p);
    g.restart(); run(g, 1); assert.equal(g.state.phase, "ready"); assert.ok(Math.abs(g.ballPosition.z - 3.7) < 1e-5);
  } finally { g.dispose(); }
});

test("former left ramp wedge clears naturally without ball search", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: -2.17, y: .175, z: -.18 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true); run(g, 8);
    assert.equal(g.state.phase, "ready"); assert.equal(g.state.ballNumber, 2);
    assert.notEqual(g.state.lastEvent, "BALL SEARCH");
  } finally { g.dispose(); }
});

test("ninety varied launches drain without stuck recovery or position jumps", async () => {
  for (let shot = 0; shot < 90; shot++) {
    const g = await PinballPhysics.create();
    try {
      g.launch(shot / 89);
      for (let tick = 0; tick < 7200 && g.state.phase === "playing"; tick++) {
        const p = { ...g.ballPosition };
        g.step(1 / 120, { left: shot % 3 ? tick % (47 + shot * 2) < 8 : false,
          right: shot % 3 ? tick % (61 + shot) < 11 : false });
        if (g.state.phase === "playing") {
          const q = g.ballPosition;
          assert.ok(Math.hypot(q.x-p.x, q.y-p.y, q.z-p.z) < .7, `shot ${shot}: position jump`);
        }
      }
      // New lane goals and charged saver can sustain legitimate rallies beyond 60s.
      // Release flippers: a free-running ball must still clear and drain naturally.
      for (let tick = 0; tick < 7200 && g.state.phase === "playing"; tick++) g.step(1 / 120);
      assert.equal(g.state.phase, "ready", `shot ${shot} stuck at ${JSON.stringify(g.ballPosition)}`);
      let shooterReturns = 0;
      while (g.state.returnedShooter && shooterReturns < 5) {
        assert.equal(g.state.ballNumber, 1, "shooter return must not consume a ball");
        assert.ok(g.ballPosition.x > 2.35, "returned ball must physically be inside shooter channel");
        g.launch(.7); shooterReturns++;
        for (let tick=0;tick<14400 && g.state.phase === "playing";tick++) g.step(1/120);
      }
      assert.equal(g.state.phase, "ready");
      assert.equal(g.state.returnedShooter, false, `shot ${shot}: repeated shooter returns never reached a real drain`);
      assert.equal(g.state.ballNumber, 2, "a real drain must consume exactly one ball");
    } finally { g.dispose(); }
  }
});

test("twelve full three-ball sessions end without rescue", async () => {
  for (let session = 0; session < 12; session++) {
    const g = await PinballPhysics.create();
    try {
      let launches = 0, servedBalls = 0, shooterReturns = 0;
      for (let tick = 0; tick < 120 * 180 && g.state.phase !== "gameover"; tick++) {
        if (g.state.phase === "ready") { if(g.state.returnedShooter) shooterReturns++; else servedBalls++; g.launch(((session * 7 + launches * 3) % 11) / 10); launches++; }
        g.step(1 / 120, { left: session % 2 ? tick % (51 + session) < 9 : false,
          right: session % 2 ? tick % (83 + session) < 15 : false });
      }
      assert.equal(g.state.phase, "gameover", `session ${session} stuck at ${JSON.stringify(g.ballPosition)}`);
      assert.equal(servedBalls, 3); assert.equal(launches, 3 + shooterReturns); assert.equal(g.state.ballNumber, 3);
    } finally { g.dispose(); }
  }
});

test("side-wall feeds reach the playable flipper area instead of side drains", async () => {
  for (const side of [-1, 1]) {
    const g = await PinballPhysics.create();
    try {
      g.launch(); g.ball.setTranslation({ x: side * 2.12, y: .18, z: .3 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true);
      let reached = false;
      for (let tick = 0; tick < 1200 && g.state.phase === "playing"; tick++) {
        g.step(1 / 120);
        if (g.ballPosition.z > 3.3) {
          assert.ok(Math.abs(g.ballPosition.x) < LOWER_LAYOUT.flipperPivot[0], JSON.stringify(g.ballPosition)); reached = true; break;
        }
      }
      assert.ok(reached, `side ${side} did not feed flippers`);
    } finally { g.dispose(); }
  }
});

test("beginner play duration remains controllable across thirty-one powers", async () => {
  const medians = [];
  for (const reactive of [false, true]) {
    const durations = [];
    for (let shot = 0; shot < 31; shot++) {
      const g = await PinballPhysics.create();
      try {
        g.launch(shot / 30); let tick = 0;
        for (; tick < 10800 && g.state.phase === "playing"; tick++) {
          const p = g.ballPosition, v = g.ball.linvel();
          g.step(1 / 120, { left: reactive && p.z > 3.35 && p.x < .3 && v.z > 0,
            right: reactive && p.z > 3.35 && p.x > -.3 && v.z > 0 });
        }
        durations.push(tick / 120);
        for (let release = 0; release < 7200 && g.state.phase === "playing"; release++) g.step(1 / 120);
        assert.equal(g.state.phase, "ready", `power ${shot}/30 did not clear after release`);
      } finally { g.dispose(); }
    }
    durations.sort((a, b) => a - b);
    assert.ok(durations[0] > 3, `instant drain: ${durations[0]}`);
    assert.ok(durations[15] > 6, `median too short: ${durations[15]}`);
    medians.push(durations[15]);
  }
  assert.ok(medians[1] > medians[0], `reactive flippers must help: ${medians}`);
});

test("rules deduplicate events, complete lanes, and refill one center save", () => {
  const s = new PinballGameState(); s.launch();
  assert.equal(s.onEvent({ type: "bumper", id: "b1" }), true);
  assert.equal(s.onEvent({ type: "bumper", id: "b1" }), false); assert.equal(s.score, 100);
  assert.equal(s.onEvent({ type: "kickback", id: "save1" }), true);
  assert.equal(s.onEvent({ type: "kickback", id: "save2" }), false);
  for (let lane = 0; lane < 3; lane++) {
    s.onEvent({ type: "rollover", lane, id: "lane" + lane });
    if (lane < 2) assert.equal(s.onEvent({ type: "rollover", lane, id: "repeat" + lane }), false);
  }
  assert.equal(s.score, 900); assert.equal(s.rolloverSets, 1);
  assert.equal(s.kickbackCharges, 1); assert.deepEqual(s.rollovers, [false, false, false]);
  assert.equal(s.onEvent({ type: "rollover", lane: 2, id: "lane2" }), false);
});

test("each physical top lane registers center and edge traversals only once", async () => {
  for (let lane = 0; lane < 3; lane++) for (const offset of [-.43, 0, .43]) {
    const g = await PinballPhysics.create();
    try {
      g.launch(); g.ball.setTranslation({ x: (lane - 1) * 1.25 + offset, y: .18, z: -4.9 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 3 }, true); run(g, .15);
      assert.equal(g.state.rollovers[lane], true, `lane ${lane} offset ${offset}`);
      assert.equal(g.state.score, 100); run(g, .03); assert.equal(g.state.score, 100);
    } finally { g.dispose(); }
  }
});

test("spinner traversal accelerates rotation once; rotation decays without score farming", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: 0, y: .18, z: -1.6 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true); run(g, .12);
    assert.equal(g.state.score, 150); assert.ok(g.spinnerSpeed > 0); assert.ok(g.spinnerAngle > 0);
    const speed = g.spinnerSpeed; run(g, .05); assert.ok(g.spinnerSpeed < speed); assert.equal(g.state.score, 150);
  } finally { g.dispose(); }
});

test("charged center saver applies impulse without teleport, then allows real drain", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: 0, y: .18, z: 4.53 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true); g.step(1 / 120);
    assert.equal(g.state.kickbackCharges, 0); assert.equal(g.state.kickbackUses, 1);
    assert.ok(g.ball.linvel().z < -7); assert.ok(g.ballPosition.z > 4.5);
    assert.equal(g.state.phase, "playing"); assert.equal(g.state.lastEvent, "CENTER SAVE");
    run(g, .3); assert.ok(g.ballPosition.z < 3.5);
    g.ball.setTranslation({ x: 0, y: .18, z: 4.53 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true); run(g, .3);
    assert.equal(g.state.phase, "ready"); assert.equal(g.state.ballNumber, 2);
    assert.equal(g.state.kickbackCharges, 0);
  } finally { g.dispose(); }
});

test("natural shooter launch traverses a top rollover lane", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(.7); run(g, 1.5);
    assert.equal(g.state.rollovers[2], true); assert.ok(g.state.score >= 100);
  } finally { g.dispose(); }
});

test("outlane widths below entrance exceed ball diameter with margin", () => {
  for (const x of LOWER_LAYOUT.guide.slice(0, 2).map(p => p[0])) {
    // The right boundary is the shooter's inside divider surface.
    assert.ok(2.35 - .045 - x - LOWER_LAYOUT.guideRadius > TABLE.ballRadius * 2 + .05);
  }
});

test("center save clears both held and returning flippers without a downstroke collision", async () => {
  for (const held of [false, true]) {
    const g = await PinballPhysics.create();
    try {
      g.launch(); run(g, .17, { left: true, right: true });
      g.ball.setTranslation({ x: 0, y: .18, z: 4.53 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true);
      run(g, .5, { left: held, right: held });
      assert.equal(g.state.phase, "playing"); assert.ok(g.ballPosition.z < 2);
      assert.equal(g.state.kickbackUses, 1); assert.deepEqual(g.flipperContacts, [0, 0]);
    } finally { g.dispose(); }
  }
});

test("held buttons cannot pinch the ball permanently", async () => {
  for (let power = 0; power <= 1; power += .1) {
    const g = await PinballPhysics.create();
    try {
      g.launch(power); run(g, 30, { left: true, right: true });
      for (let tick = 0; tick < 7200 && g.state.phase === "playing"; tick++) g.step(1 / 120);
      assert.equal(g.state.phase, "ready", `held power ${power}: ${JSON.stringify(g.ballPosition)}`);
    } finally { g.dispose(); }
  }
});

test("twenty seeded incoming balls measure physical contact and controlled return", async () => {
  const counts = [];
  for (const reactive of [false, true]) {
    let seed = 731, contacts = 0, returns = 0;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
    for (let sample = 0; sample < 20; sample++) {
      const g = await PinballPhysics.create();
      try {
        g.launch(); g.state.kickbackCharges = 0;
        g.ball.setTranslation({ x: (random() * 2 - 1) * .9, y: .18, z: 3.2 }, true);
        g.ball.setLinvel({ x: random() * 2 - 1, y: 0, z: 2 + random() * 3 }, true);
        for (let tick = 0; tick < 600 && g.state.phase === "playing"; tick++) {
          const p = g.ballPosition, v = g.ball.linvel();
          g.step(1 / 120, { left: reactive && p.z > 3.6 && p.x < .3 && v.z > 0,
            right: reactive && p.z > 3.6 && p.x > -.3 && v.z > 0 });
        }
        contacts += g.flipperContacts.some(Boolean); returns += g.upfieldReturns > 0;
      } finally { g.dispose(); }
    }
    assert.ok(contacts >= 16, `too few physical contacts: ${contacts}`); counts.push(returns);
  }
  assert.equal(counts[0], 0); assert.ok(counts[1] >= 14, `controlled returns: ${counts}`);
});

async function cradle(side) {
  const g = await PinballPhysics.create(); g.launch(); g.state.kickbackCharges = 0;
  const held = { left: side < 0, right: side > 0 };
  run(g, .25, held);
  // A controlled incoming fixture; all subsequent capture, hold and shots are physical.
  g.ball.setTranslation({ x: side * .85, y: .18, z: 3.15 }, true);
  g.ball.setLinvel({ x: 0, y: 0, z: 2 }, true);
  run(g, 3, held);
  return { g, held };
}

test("both flippers cradle passively without repeated coil fire and release naturally", async () => {
  for (const side of [-1, 1]) {
    const { g, held } = await cradle(side);
    try {
      const p = { ...g.ballPosition }, shots = [...g.coilImpulses];
      assert.equal(g.state.phase, "playing");
      assert.ok(Math.hypot(g.ball.linvel().x, g.ball.linvel().z) < .03);
      run(g, 3, held);
      assert.deepEqual(g.coilImpulses, shots);
      assert.ok(Math.hypot(g.ballPosition.x - p.x, g.ballPosition.z - p.z) < .02);
      run(g, 10); assert.equal(g.state.phase, "ready");
    } finally { g.dispose(); }
  }
});

test("release timing produces distinct aimed reflip shots on both sides", async () => {
  for (const side of [-1, 1]) {
    const crossings = [];
    for (const delay of [.5, .6]) {
      const { g, held } = await cradle(side);
      try {
        run(g, delay);
        let crossing;
        for (let tick = 0; tick < 120 && g.state.phase === "playing"; tick++) {
          g.step(1 / 120, held);
          if (g.ballPosition.z < 2.8 && g.ball.linvel().z < 0) { crossing = { x: g.ballPosition.x, vx: g.ball.linvel().x, vz: g.ball.linvel().z }; break; }
        }
        assert.ok(crossing, `side ${side}, delay ${delay}`);
        assert.ok(crossing.vx * side < 0, JSON.stringify(crossing));
        assert.ok(crossing.vz < -5, JSON.stringify(crossing));
        assert.equal(g.coilImpulses[side < 0 ? 0 : 1], 1);
        crossings.push(crossing);
      } finally { g.dispose(); }
    }
    assert.ok(Math.abs(crossings[0].vx - crossings[1].vx) > .25, JSON.stringify(crossings));
    assert.ok(Math.abs(crossings[0].x - crossings[1].x) > .05, JSON.stringify(crossings));
  }
});

test("curved sling and inlane have a full ball-width passage with margin", async () => {
  const T = await import("../vendor/three-0.180.0/three.module.min.js");
  const points = new T.CatmullRomCurve3([...LOWER_LAYOUT.slingVertices, LOWER_LAYOUT.slingVertices[0]]
    .map(([x, z]) => new T.Vector3(x, .22, z))).getPoints(128);
  let clearance = Infinity;
  for (const p of points) for (let i = 0; i < LOWER_LAYOUT.guide.length - 1; i++) {
    const a = new T.Vector3(...LOWER_LAYOUT.guide[i]), b = new T.Vector3(...LOWER_LAYOUT.guide[i + 1]);
    const d = b.sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(d) / d.lengthSq()));
    clearance = Math.min(clearance, p.distanceTo(a.addScaledVector(d, t)) - .07 - LOWER_LAYOUT.guideRadius);
  }
  assert.ok(clearance > TABLE.ballRadius * 2 + .05, `inlane clearance ${clearance}`);
});

test("rising shots gain energy toward the tip without exceeding the world limit", async () => {
  const shots = [];
  for (const delay of [.4, .75]) {
    const { g, held } = await cradle(-1);
    try {
      run(g, delay); g.step(1 / 120, held);
      assert.ok(g.lastFlipperShot); shots.push(g.lastFlipperShot);
      assert.ok(g.lastFlipperShot.angularSpeed > 0);
      assert.ok(Math.hypot(g.ball.linvel().x, g.ball.linvel().y, g.ball.linvel().z) <= 32.0001);
    } finally { g.dispose(); }
  }
  assert.ok(shots[1].along > shots[0].along);
  assert.ok(shots[1].speed > shots[0].speed + 4);
});

test("five real cradle-reflip timings traverse the S ramp, cradle again and re-fire", async () => {
  for (const releaseTicks of [82, 84, 86, 88, 90]) {
    const { g, held } = await cradle(-1);
    try {
      assert.ok(g.ramp, "ramp must be integrated, not injected at its entrance");
      const exit = RAMP_POINTS.at(-1);
      let positionResets = 0;
      const setTranslation = g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation = (...args) => { positionResets++; return setTranslation(...args); };
      for (let tick = 0; tick < releaseTicks; tick++) g.step(1 / 120);
      let crest = false, returnLane = false, floor = false;
      for (let tick = 0; tick < 1200 && g.state.phase === "playing"; tick++) {
        g.step(1 / 120, held);
        const p = g.ballPosition, v = g.ball.linvel();
        assert.ok(Math.hypot(v.x, v.y, v.z) <= 32.0001);
        if (p.z < -3.5 && p.y > 1) crest = true;
        if (crest && Math.abs(p.x - exit[0]) < .25 && p.z > exit[2] - .2 && p.y > exit[1]) returnLane = true;
        if (returnLane && p.y < .25) { floor = true; break; }
      }
      assert.ok(crest && returnLane && floor, `timing ${releaseTicks}: crest=${crest}, return=${returnLane}, floor=${floor}`);
      assert.ok(g.lastFlipperShot.speed <= 32);
      run(g, 5, held);
      assert.equal(g.state.phase, "playing"); assert.equal(g.state.ballNumber, 1);
      assert.ok(Math.abs(g.ballPosition.x + 1.01169) < .03);
      assert.ok(Math.abs(g.ballPosition.z - 3.49334) < .03);
      assert.ok(Math.hypot(g.ball.linvel().x, g.ball.linvel().z) < .03);
      assert.equal(g.coilImpulses[0], 1, "holding the returned ball must not fire");
      run(g, .5);
      let firedAgain = false;
      for (let tick = 0; tick < 120 && g.state.phase === "playing"; tick++) {
        g.step(1 / 120, held);
        if (g.ballPosition.z < 2.8 && g.ball.linvel().z < -5) { firedAgain = true; break; }
      }
      assert.ok(firedAgain, `return shot ${releaseTicks}`);
      assert.equal(g.coilImpulses[0], 2);
      assert.equal(positionResets, 0, "same ball must traverse, cradle and re-fire without position resets");
    } finally { g.dispose(); }
  }
});


test("both flippers reach center B through a broad real cradle release window", async () => {
  for (const side of [-1, 1]) for (let delay = 48; delay <= 62; delay += 2) {
    const {g, held} = await cradle(side);
    try {
      let centerHits = 0;
      const onEvent = g.state.onEvent.bind(g.state);
      g.state.onEvent = event => {
        if (event.type === "rollover" && event.lane === 1) centerHits++;
        return onEvent(event);
      };
      for (let i=0; i<delay; i++) g.step(1/120);
      for(let i=0;i<720 && !centerHits && g.state.phase === "playing";i++) g.step(1/120,held);
      assert.ok(centerHits > 0, `side ${side}, release ${delay}/120 seconds misses B`);
      assert.equal(g.coilImpulses[side < 0 ? 0 : 1], 1, "held paddle must not repeat fire");
      assert.equal(g.state.ballNumber, 1);
    } finally {g.dispose();}
  }
});

test("shooter corner backing cannot retain a ball outside the bend", async () => {
  const g=await PinballPhysics.create();
  try {
    g.launch(14/30);
    for(let i=0;i<10800 && g.state.phase === "playing";i++) {
      const p=g.ballPosition,v=g.ball.linvel();
      g.step(1/120,{left:p.z>3.35&&p.x<.3&&v.z>0,right:p.z>3.35&&p.x>-.3&&v.z>0});
    }
    run(g,60);
    assert.notEqual(g.state.phase,"playing",JSON.stringify(g.ballPosition));
  } finally {g.dispose();}
});
