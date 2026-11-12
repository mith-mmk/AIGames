import test from "node:test";
import assert from "node:assert/strict";
import { BUMPERS, TABLE, TARGET_BANKS } from "./layout.mjs";
import { PinballPhysics } from "./physics.mjs";

test("right target bank leaves a full ball-width throat beside every main bumper", () => {
  const bank = TARGET_BANKS.find(bank => bank.key === "right-side");
  const [ax, , az] = bank.a, [bx, , bz] = bank.b;
  const dx = bx - ax, dz = bz - az;
  for (const bumper of BUMPERS) {
    const t = Math.max(0, Math.min(1,
      ((bumper.x - ax) * dx + (bumper.z - az) * dz) / (dx * dx + dz * dz)));
    // Match the .40 bumper cylinder and .07 target rubber in physics.mjs.
    const clearance = Math.hypot(bumper.x - ax - t * dx, bumper.z - az - t * dz) - .40 - .07;
    assert.ok(clearance >= TABLE.ballRadius * 2 + .05,
      `bumper (${bumper.x}, ${bumper.z}) leaves only ${clearance} clearance`);
  }
});

test("low-speed balls pass the screenshot throat without rescue or position changes", async () => {
  for (const x of [.58, .60, .62, .64]) {
    const g = await PinballPhysics.create();
    try {
      g.launch();
      // Non-overlapping incoming fixture, upstream of the narrowed passage.
      // Only its initial conditions are set; all subsequent motion is physical.
      g.ball.setTranslation({ x, y: .175, z: -2.5 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 1 }, true);
      let resets = 0, passed = false;
      const setTranslation = g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation = (...args) => { resets++; return setTranslation(...args); };
      for (let tick = 0; tick < 120; tick++) {
        g.step(1 / 120);
        assert.equal(g.state.phase, "playing");
        assert.ok(Math.abs(g.ballPosition.x - x) < .025, "throat must not pinch or deflect the ball");
        if (g.ballPosition.z > -1.4) { passed = true; break; }
      }
      assert.ok(passed, `incoming x=${x} did not pass the throat`);
      assert.equal(resets, 0);
    } finally { g.dispose(); }
  }
});

test("twenty-one natural launches clear without target-bank stalls or position resets", async () => {
  for (let shot = 0; shot <= 20; shot++) {
    const g = await PinballPhysics.create();
    try {
      g.launch(shot / 20);
      let liveResets = 0;
      const setTranslation = g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation = (...args) => {
        if (g.state.phase === "playing") liveResets++;
        return setTranslation(...args);
      };
      for (let tick = 0; tick < 14400 && g.state.phase === "playing"; tick++) {
        const p = { ...g.ballPosition };
        g.step(1 / 120);
        if (g.state.phase === "playing") {
          const q = g.ballPosition;
          assert.ok(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) < .7, `shot ${shot}: position jump`);
        }
      }
      assert.equal(g.state.phase, "ready", `shot ${shot}: ${JSON.stringify(g.ballPosition)}`);
      assert.equal(liveResets, 0, `shot ${shot}: rescue position reset`);
    } finally { g.dispose(); }
  }
});

// Captured from session seven of the natural three-ball session sweep.
// The uncorrected trimesh holds this ball motionless on an internal edge.
test("ramp crest releases a resting ball without nudge or position rescue", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch();
    const start = { x: 1.31982529, y: 1.18196535, z: -3.6223352 };
    g.ball.setTranslation(start, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    g.ball.setAngvel({ x: 0, y: 0, z: 0 }, true);
    let liveResets = 0, cleared = false;
    const setTranslation = g.ball.setTranslation.bind(g.ball);
    g.ball.setTranslation = (...args) => {
      if (g.state.phase === "playing") liveResets++;
      return setTranslation(...args);
    };
    for (let tick = 0; tick < 1200 && g.state.phase === "playing"; tick++) {
      g.step(1 / 120);
      const p = g.ballPosition;
      if (g.state.phase === "playing" && Math.hypot(p.x - start.x, p.y - start.y, p.z - start.z) > .5) cleared = true;
    }
    assert.ok(cleared, `crest retained the ball at ${JSON.stringify(g.ballPosition)}`);
    assert.equal(liveResets, 0);
    assert.equal(g.state.phase, "ready");
  } finally { g.dispose(); }
});

test("crest collision sections share identical boundary vertices without gaps", async () => {
  const g = await PinballPhysics.create();
  try {
    // Deck and both walls each have approach, corrected crest, and return meshes.
    for (let surface = 0; surface < 3; surface++) {
      const sections = g.ramp.colliders.slice(surface * 3, surface * 3 + 3);
      for (let edge = 0; edge < 2; edge++) {
        const before = sections[edge].shape.vertices;
        const after = sections[edge + 1].shape.vertices;
        assert.deepEqual(Array.from(before.slice(-6)), Array.from(after.slice(0, 6)),
          `surface ${surface}, section boundary ${edge} has a gap`);
      }
    }
  } finally { g.dispose(); }
});
