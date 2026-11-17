import test from "node:test";
import assert from "node:assert/strict";
import { PinballGameState } from "./game-state.mjs";

function fixture(difficulty = "standard") {
  const state = new PinballGameState({ difficulty }); state.launch();
  let id = 0;
  return { state, hit: (type, data = {}) => state.onEvent({ ...data, type, id: ++id }) };
}
function light(hit) {
  for (let i = 0; i < 3; i++) hit("bank", { targetId: `right-side:${i}` });
}

test("collector requires three distinct right targets, not repeated hits or other banks", () => {
  const { state, hit } = fixture();
  hit("bank", { targetId: "right-side:0" }); hit("bank", { targetId: "right-side:0" });
  for (const targetId of ["left-upper:1", "right-side:3", null, "right-side:01"]) hit("bank", { targetId });
  hit("bumper", { targetId: "right-side:1" });
  assert.equal(state.scoop.progress, 1); assert.equal(state.scoop.lit, false);
  hit("target", { targetId: "right-side:1" }); hit("bank", { targetId: "right-side:2" });
  assert.equal(state.scoop.lit, true); assert.match(state.lastEvent, /COLLECTOR READY/);
  const snapshot = state.scoop; snapshot.targets.fill(false); snapshot.progress = 0;
  assert.equal(state.scoop.progress, 3);
});

test("lit collection grants one left save and fixed bonus, then can be earned again", () => {
  const { state, hit } = fixture();
  light(hit); const before = state.score;
  hit("scoop"); assert.equal(state.score, before + 1000);
  assert.equal(state.scoop.captures, 1); assert.equal(state.scoop.collections, 1);
  assert.equal(state.scoop.progress, 0); assert.equal(state.sideSaveCharges, 1);
  hit("side-save"); assert.equal(state.sideSaveCharges, 0);
  const after = state.score; hit("scoop"); assert.equal(state.score, after + 150);
  assert.equal(state.sideSaveCharges, 0); assert.equal(state.scoop.collections, 1);
  light(hit); hit("scoop"); assert.equal(state.scoop.collections, 2);
  assert.equal(state.sideSaveCharges, 1); assert.equal(state.scoop.captures, 3);
});

test("collector rejects duplicate, paused, tilted and ready events", () => {
  const { state, hit } = fixture(); light(hit);
  state.setPaused(true); assert.equal(hit("scoop"), false);
  state.setPaused(false); state.tilted = true; assert.equal(hit("scoop"), false);
  state.tilted = false;
  assert.equal(state.onEvent({ id: "capture", type: "scoop" }), true);
  const score = state.score;
  assert.equal(state.onEvent({ id: "capture", type: "scoop" }), false);
  assert.equal(state.score, score); assert.equal(state.scoop.captures, 1);
  state.drain(); assert.equal(hit("scoop"), false);
});

test("collector progress persists across balls, but restart resets earned state", () => {
  const { state, hit } = fixture(); light(hit);
  state.drain(); state.launch(); assert.equal(state.scoop.lit, true);
  hit("scoop"); state.restart();
  assert.deepEqual(state.scoop.targets, [false, false, false]);
  assert.equal(state.scoop.captures, 0); assert.equal(state.scoop.collections, 0);
  assert.equal(state.sideSaveCharges, 0);
});

test("skill shot is a fixed bonus once per numbered ball, never multiplied", () => {
  const { state, hit } = fixture();
  for (let i = 0; i < 5; i++) hit("bumper");
  assert.equal(state.multiplier, 2);
  const score = state.score; assert.equal(hit("skill-shot"), true);
  assert.equal(state.score, score + 500); assert.equal(state.skillShots, 1);
  assert.equal(hit("skill-shot"), false);
  state.drain(); state.launch(); assert.equal(hit("skill-shot"), true);
  assert.equal(state.skillShots, 2); state.restart(); assert.equal(state.skillShots, 0);
});

test("saved drain and shooter return cannot reopen skill shot qualification", () => {
  const { state, hit } = fixture("relaxed");
  state.drain(); assert.equal(state.ballSaved, true); state.launch();
  assert.equal(hit("skill-shot"), false);
  state.drain(); state.launch(); assert.equal(state.ballNumber, 2);
  state.returnToShooter(); state.launch(); assert.equal(hit("skill-shot"), false);
});

test("skill shot cannot score during pause, ready or tilt", () => {
  const state = new PinballGameState();
  const event = { id: "skill", type: "skill-shot" };
  assert.equal(state.onEvent(event), false); state.launch(); state.setPaused(true);
  assert.equal(state.onEvent(event), false); state.setPaused(false); state.tilted = true;
  assert.equal(state.onEvent(event), false); assert.equal(state.skillShots, 0);
});
