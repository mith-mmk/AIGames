import test from "node:test";
import assert from "node:assert/strict";
import { PinballGameState } from "./game-state.mjs";

function fixture(difficulty = "standard") {
  const state = new PinballGameState({ difficulty }); let id = 0;
  return { state, hit: (type, lane) => state.onEvent({ type, lane, id: ++id }) };
}

test("mission selection is initial-ready only, never mid-shot, paused, tilted or a shooter return", () => {
  const { state } = fixture();
  assert.equal(state.canSelectMission, true);
  assert.equal(state.selectMission("ramp"), true);
  assert.equal(state.mission.id, "ramp"); assert.equal(state.mission.index, 5);
  assert.equal(state.mission.completed, 0); assert.match(state.lastEvent, /MISSION SELECT/);
  assert.equal(state.selectMission("unknown"), false);
  state.launch(); assert.equal(state.canSelectMission, false);
  assert.equal(state.selectMission("spin"), false);
  state.setPaused(true); assert.equal(state.selectMission("spin"), false);
  state.setPaused(false); state.returnToShooter();
  assert.equal(state.phase, "ready"); assert.equal(state.selectMission("spin"), false);
  state.launch(); state.drain(); assert.equal(state.selectMission("spin"), true);
  state.tilted = true; assert.equal(state.canSelectMission, false);
  assert.equal(state.selectMission("charge"), false);
});

test("switching retains independent mission progress and unique rollover history", () => {
  const { state, hit } = fixture();
  state.selectMission("lanes"); state.launch(); hit("rollover", 0);
  state.drain(); state.selectMission("charge"); state.launch(); hit("bumper");
  assert.equal(state.mission.progress, 1);
  state.drain(); state.selectMission("lanes");
  assert.equal(state.mission.progress, 1);
  state.launch(); hit("rollover", 0); assert.equal(state.mission.progress, 1);
  hit("rollover", 1); hit("rollover", 2);
  assert.equal(state.mission.id, "charge", "completion chooses first unfinished catalog mission");
  assert.equal(state.mission.progress, 1); assert.equal(state.mission.completed, 1);
  assert.equal(state.missionOptions.find(x => x.id === "lanes").completed, true);
});

test("out-of-order completion awards every mission once and eventually completes all five", () => {
  const { state, hit } = fixture("relaxed");
  const completed=[]; const award=state.award.bind(state);
  state.award=(points,label)=>{if(label.startsWith("MISSION CLEAR"))completed.push({points,label});award(points,label);};
  const order=["ramp","lanes","spin","workshop","charge"];
  for(const [index,id] of order.entries()) {
    assert.equal(state.selectMission(id), true); state.launch();
    if(id==="ramp")hit("ramp");
    if(id==="lanes")for(const lane of [2,0,1])hit("rollover",lane);
    if(id==="spin")for(let i=0;i<2;i++)hit("spinner");
    if(id==="workshop")for(let i=0;i<4;i++)hit("target");
    if(id==="charge")for(let i=0;i<3;i++)hit("bumper");
    assert.equal(state.mission.completed,index+1);
    state.drain(); assert.equal(state.selectMission(id),false,"completed mission cannot be replayed");
  }
  assert.equal(state.mission.allComplete,true); assert.equal(state.canSelectMission,false);
  assert.equal(completed.length,5); assert.equal(completed.reduce((sum,x)=>sum+x.points,0),5500);
  assert.equal(state.missionOptions.every(option=>option.completed&&!option.selected),true);
});

test("selection is scoreless and does not reset ball, challenge or earned safety resources", () => {
  const { state, hit } = fixture("relaxed");
  state.launch(); for(let i=0;i<5;i++)hit("bumper");
  for(let i=0;i<4;i++)hit("target");
  state.drain(); assert.equal(state.ballSaved,true);
  const before={score:state.score,ball:state.ballNumber,save:state.sideSaveCharges,center:state.kickbackCharges,
    replay:state.ballSaveAvailable,time:state.ballSaveRemaining,skill:state.skillShotAvailable,multiplier:state.multiplier};
  assert.equal(state.selectMission("ramp"),true);
  assert.deepEqual({score:state.score,ball:state.ballNumber,save:state.sideSaveCharges,center:state.kickbackCharges,
    replay:state.ballSaveAvailable,time:state.ballSaveRemaining,skill:state.skillShotAvailable,multiplier:state.multiplier},before);
});

test("mission option snapshots cannot mutate records; restart restores default sequence", () => {
  const { state, hit } = fixture();
  state.selectMission("spin"); state.launch();hit("spinner");hit("spinner");
  const options=state.missionOptions;
  options[0].progress=99;options[0].completed=true;options[0].id="broken";
  assert.equal(state.mission.id,"charge");assert.equal(state.mission.progress,0);
  assert.equal(state.missionOptions[0].completed,false);
  state.restart();assert.equal(state.mission.id,"charge");assert.equal(state.mission.completed,0);
  assert.equal(state.missionOptions.every(x=>!x.completed&&x.progress===0),true);
  assert.equal(state.missionOptions.filter(x=>x.selected).length,1);
});
