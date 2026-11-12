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
    assert.ok(g.state.score >= 100, `score=${g.state.score}`);
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

test("stalled ball recovery does not award points", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: -2.17, y: .17, z: -.18 }, true); g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 960 && !g.rescueCount; i++) g.step(1 / 120);
    assert.ok(g.rescueCount > 0); assert.ok(g.ballPosition.x > -1); assert.equal(g.state.score, 0);
  } finally { g.dispose(); }
});

test("upper collector awards once and returns ball to lower lane", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({ x: 2.08, y: 2.8, z: -4.2 }, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true); g.step(1 / 120);
    assert.equal(g.state.score, 500); assert.ok(g.ballPosition.z > 1);
    g.step(1 / 120); assert.equal(g.state.score, 500);
  } finally { g.dispose(); }
});
