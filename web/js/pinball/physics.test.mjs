import test from "node:test";
import assert from "node:assert/strict";
import { PinballPhysics } from "./physics.mjs";
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
    assert.equal(g.launch(), true); run(g, 3);
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
      g.launch(); g.ball.setTranslation({ x: side * .55, y: .2, z: 3.65 }, true);
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
      assert.equal(g.state.ballNumber, 2);
    } finally { g.dispose(); }
  }
});

test("twelve full three-ball sessions end without rescue", async () => {
  for (let session = 0; session < 12; session++) {
    const g = await PinballPhysics.create();
    try {
      let launches = 0;
      for (let tick = 0; tick < 120 * 180 && g.state.phase !== "gameover"; tick++) {
        if (g.state.phase === "ready") { g.launch(((session * 7 + launches * 3) % 11) / 10); launches++; }
        g.step(1 / 120, { left: session % 2 ? tick % (51 + session) < 9 : false,
          right: session % 2 ? tick % (83 + session) < 15 : false });
      }
      assert.equal(g.state.phase, "gameover", `session ${session} stuck at ${JSON.stringify(g.ballPosition)}`);
      assert.equal(launches, 3); assert.equal(g.state.ballNumber, 3);
    } finally { g.dispose(); }
  }
});

test("side-wall feeds reach the playable flipper area instead of side drains", async () => {
  for (const side of [-1, 1]) {
    const g = await PinballPhysics.create();
    try {
      g.launch(); g.ball.setTranslation({ x: side * 2.12, y: .18, z: 1.3 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true);
      let reached = false;
      for (let tick = 0; tick < 1200 && g.state.phase === "playing"; tick++) {
        g.step(1 / 120);
        if (g.ballPosition.z > 3.3) {
          assert.ok(Math.abs(g.ballPosition.x) < .85, JSON.stringify(g.ballPosition)); reached = true; break;
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
        assert.equal(g.state.phase, "ready", `power ${shot}/30 did not finish`);
        durations.push(tick / 120);
      } finally { g.dispose(); }
    }
    durations.sort((a, b) => a - b);
    assert.ok(durations[0] > 3, `instant drain: ${durations[0]}`);
    assert.ok(durations[15] > 8, `median too short: ${durations[15]}`);
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
    g.launch(); g.ball.setTranslation({ x: 0, y: .18, z: -1.7 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true); run(g, .12);
    assert.equal(g.state.score, 150); assert.ok(g.spinnerSpeed > 0); assert.ok(g.spinnerAngle > 0);
    const speed = g.spinnerSpeed; run(g, .05); assert.ok(g.spinnerSpeed < speed); assert.equal(g.state.score, 150);
  } finally { g.dispose(); }
});

test("charged center saver applies impulse without teleport, then allows real drain", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: 0, y: .18, z: 4.12 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 4 }, true); g.step(1 / 120);
    assert.equal(g.state.kickbackCharges, 0); assert.equal(g.state.kickbackUses, 1);
    assert.ok(g.ball.linvel().z < -10); assert.ok(g.ballPosition.z > 4.1);
    assert.equal(g.state.phase, "playing"); assert.equal(g.state.lastEvent, "CENTER SAVE");
    run(g, .3); assert.ok(g.ballPosition.z < 3.5);
    g.ball.setTranslation({ x: 0, y: .18, z: 4.12 }, true);
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
