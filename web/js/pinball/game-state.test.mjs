import test from "node:test";
import assert from "node:assert/strict";
import { PinballGameState } from "./game-state.mjs";

function fixture() {
  const state = new PinballGameState(); state.launch();
  let id = 0;
  return { state, hit: (type, lane) => state.onEvent({ type, lane, id: ++id }) };
}
function startSpinner(hit) {
  for (let i = 0; i < 3; i++) hit("bumper");
  for (let i = 0; i < 4; i++) hit(i % 2 ? "bank" : "target");
}

test("five bounded missions award base points and each completion bonus exactly once", () => {
  const { state, hit } = fixture();
  assert.equal(state.mission.id, "charge");
  hit("spinner"); assert.equal(state.mission.progress, 0);
  startSpinner(hit);
  assert.equal(state.mission.id, "spin"); assert.equal(state.mission.completed, 2);
  hit("spinner"); hit("spinner");
  assert.equal(state.mission.id, "lanes");
  hit("rollover", 0); hit("rollover", 0); assert.equal(state.mission.progress, 1);
  hit("rollover", 2); hit("rollover", 1);
  assert.equal(state.mission.id, "ramp");
  hit("ramp");
  assert.equal(state.mission.allComplete, true); assert.equal(state.mission.completed, 5);
  // Base: spinner warmup 150, bumpers 300, sides 250, spinner 300, lanes 900, ramp 300.
  assert.equal(state.score, 2200 + 5500);
  const score = state.score;
  hit("ramp"); hit("bumper"); assert.equal(state.score, score + 400);
  assert.equal(state.mission.allComplete, true);
  const snapshot = state.mission; snapshot.progress = 99;
  assert.equal(state.mission.progress, 5, "HUD snapshot cannot mutate rules");
});

test("duplicate, invalid, paused and ready events cannot progress missions or score", () => {
  const state = new PinballGameState();
  assert.equal(state.onEvent({ id: "a", type: "bumper" }), false);
  state.launch(); state.onEvent({ id: "a", type: "bumper" });
  assert.equal(state.onEvent({ id: "a", type: "bumper" }), false);
  for (const event of [null, {}, { id: "b", type: "toString" }, { id: "c", type: "rollover", lane: 3 }]) {
    assert.equal(state.onEvent(event), false);
  }
  state.setPaused(true); assert.equal(state.onEvent({ id: "d", type: "bumper" }), false);
  state.setPaused(false); assert.equal(state.mission.progress, 1); assert.equal(state.score, 100);
});

test("mission progress and deduplication survive drains and shooter return; restart resets everything", () => {
  const { state, hit } = fixture(); hit("bumper");
  state.drain(); assert.equal(state.mission.progress, 1);
  state.launch(); assert.equal(state.onEvent({ id: 1, type: "bumper" }), false);
  state.returnToShooter(); assert.equal(state.mission.progress, 1); state.launch();
  hit("bumper"); hit("bumper"); assert.equal(state.mission.id, "workshop");
  state.drain(); state.launch(); state.drain();
  assert.equal(state.phase, "gameover"); assert.equal(state.onEvent({ id: 99, type: "target" }), false);
  state.restart(); assert.equal(state.mission.progress, 0); assert.equal(state.mission.completed, 0);
  assert.equal(state.mission.id, "charge"); assert.equal(state.score, 0); assert.equal(state.sideSaveCharges, 0);
  state.launch(); assert.equal(state.onEvent({ id: 1, type: "bumper" }), true);
});

test("lane mission counts new traversals even if a lane was lit before the mission", () => {
  const { state, hit } = fixture();
  hit("rollover", 1); startSpinner(hit); hit("spinner"); hit("spinner");
  const score = state.score;
  hit("rollover", 1); assert.equal(state.mission.progress, 1); assert.equal(state.score, score + 100);
  hit("rollover", 0); hit("rollover", 2); assert.equal(state.mission.id, "ramp");
  assert.equal(state.rolloverSets, 1); assert.equal(state.kickbackCharges, 1);
});

test("target mission grants exactly one left save independent of center save", () => {
  const { state, hit } = fixture();
  assert.equal(state.sideSaveCharges, 0); assert.equal(hit("side-save"), false);
  for (let i = 0; i < 3; i++) hit("bumper");
  assert.equal(state.sideSaveCharges, 0);
  for (let i = 0; i < 4; i++) hit("target");
  assert.equal(state.sideSaveCharges, 1); assert.match(state.lastEvent, /LEFT SAVE READY/);
  state.drain(); state.launch(); assert.equal(state.sideSaveCharges, 1);
  const score = state.score;
  assert.equal(state.onEvent({ id: "save", type: "side-save" }), true);
  assert.equal(state.onEvent({ id: "save", type: "side-save" }), false);
  assert.equal(hit("side-save"), false); assert.equal(state.sideSaveUses, 1);
  assert.equal(state.score, score); assert.equal(state.kickbackCharges, 1);
  hit("kickback"); assert.equal(state.kickbackUses, 1); assert.equal(state.sideSaveCharges, 0);
  state.restart(); assert.equal(state.sideSaveUses, 0); assert.equal(state.kickbackCharges, 1);
});

test("bumper challenge earns x2 after five hits; varied mechanisms earn x3 starting with the next hit", () => {
  const { state, hit } = fixture();
  hit("spinner"); hit("target"); hit("rollover", 0);
  assert.equal(state.multiplierMission.progress, 0);
  for (let i = 0; i < 5; i++) hit("bumper");
  assert.equal(state.multiplier, 2); assert.equal(state.lastContactAward.points, 100);
  assert.equal(state.multiplierMission.progress, 0, "earning bumper is not counted in next challenge");
  hit("bank"); assert.equal(state.lastContactAward.points, 150);
  hit("target"); assert.equal(state.multiplierMission.progress, 1, "bank and target share one group");
  hit("rollover", 1); hit("inlane");
  assert.equal(state.multiplierMission.progress, 2, "inlane and upper rollover share one group");
  hit("spinner"); assert.equal(state.lastContactAward.points, 300);
  assert.equal(state.multiplier, 3); assert.equal(state.multiplierMission.allComplete, true);
  hit("bumper"); assert.equal(state.lastContactAward.points, 300);
  hit("ramp"); assert.equal(state.lastContactAward.points, 900);
  for (let i = 0; i < 10; i++) hit("bumper");
  assert.equal(state.multiplier, 3); assert.equal(state.multiplierMission.progress, 3);
  const snapshot = state.multiplierMission; snapshot.mechanisms.push("fake");
  assert.equal(state.multiplierMission.mechanisms.includes("fake"), false);
});

test("multipliers never multiply mission or lane-set bonuses and saves do not progress challenges", () => {
  const { state, hit } = fixture();
  for (let i = 0; i < 5; i++) hit("bumper");
  const beforeTargets = state.score;
  for (let i = 0; i < 4; i++) hit("target");
  assert.equal(state.score - beforeTargets, 4 * 50 * 2 + 750);
  assert.equal(state.lastAward.points, 750); assert.equal(state.lastContactAward.points, 100);
  hit("kickback"); hit("side-save"); assert.equal(state.multiplierMission.progress, 1);
  hit("rollover", 0); hit("rollover", 1);
  const beforeSet = state.score;
  hit("rollover", 2); assert.equal(state.score - beforeSet, 100 * 2 + 500);
  assert.equal(state.multiplier, 2);
});

test("duplicate and paused events cannot advance multiplier and weak returns preserve both challenges", () => {
  const { state, hit } = fixture();
  for (let i = 0; i < 4; i++) hit("bumper");
  assert.equal(state.onEvent({ id: 4, type: "bumper" }), false);
  state.setPaused(true); hit("bumper"); state.setPaused(false);
  assert.equal(state.multiplier, 1); assert.equal(state.multiplierMission.progress, 4);
  state.returnToShooter(); hit("bumper"); state.launch();
  assert.equal(state.multiplierMission.progress, 4);
  hit("bumper"); hit("target");
  state.returnToShooter(); state.launch();
  assert.equal(state.multiplier, 2); assert.equal(state.multiplierMission.progress, 1);
  hit("sling"); assert.equal(state.lastContactAward.points, 50);
  assert.equal(state.multiplierMission.progress, 1, "sling is not an aimed mechanism group");
});

test("drain, TILT and restart reset multiplier while preserving story progress between balls", () => {
  const { state, hit } = fixture();
  for (let i = 0; i < 5; i++) hit("bumper");
  hit("target"); state.drain();
  assert.equal(state.multiplier, 1); assert.equal(state.multiplierMission.progress, 0);
  assert.equal(state.mission.id, "workshop"); assert.equal(state.mission.progress, 1);
  state.launch(); for (let i = 0; i < 5; i++) hit("bumper");
  const score = state.score;
  state.tilted = true;
  assert.equal(state.multiplier, 1); assert.equal(state.multiplierMission.progress, 0);
  assert.equal(hit("bumper"), false); state.awardContact(100, "blocked");
  assert.equal(state.score, score);
  state.drain(); state.tilted = false; state.launch();
  for (let i = 0; i < 5; i++) hit("bumper");
  state.restart(); assert.equal(state.multiplier, 1); assert.equal(state.multiplierMission.progress, 0);
  assert.equal(state.tilted, false); assert.equal(state.lastContactAward, null);
});
