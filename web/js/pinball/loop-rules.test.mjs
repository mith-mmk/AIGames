import test from "node:test";
import assert from "node:assert/strict";
import { PinballGameState } from "./game-state.mjs";

function fixture() {
  const state = new PinballGameState();state.launch();let id=0;
  return {state,hit:type=>state.onEvent({type,id:++id})};
}

test("left loop is a repeatable 300-point contact with a distinct label",()=>{
  const {state,hit}=fixture();
  assert.equal(hit("loop"),true);assert.equal(state.score,300);
  assert.equal(state.lastAward.label,"LEFT LOOP");
  assert.equal(state.lastContactAward.basePoints,300);
  assert.equal(state.lastContactAward.multiplier,1);
  assert.equal(hit("loop"),true);assert.equal(state.score,600);
  assert.equal(state.mission.progress,0);
});

test("loop obeys duplicate, ready, pause, tilt and gameover scoring guards",()=>{
  const state=new PinballGameState(),event={type:"loop",id:"one-route"};
  assert.equal(state.onEvent(event),false);state.launch();
  assert.equal(state.onEvent(event),true);assert.equal(state.onEvent(event),false);
  state.setPaused(true);assert.equal(state.onEvent({type:"loop",id:"pause"}),false);
  state.setPaused(false);state.tilted=true;assert.equal(state.onEvent({type:"loop",id:"tilt"}),false);
  state.tilted=false;state.drain();state.launch();state.drain();state.launch();state.drain();
  assert.equal(state.phase,"gameover");assert.equal(state.onEvent({type:"loop",id:"end"}),false);
  assert.equal(state.score,300);
});

test("loop and ramp are independent varied shots and scoring uses pre-event multiplier",()=>{
  const {state,hit}=fixture();for(let i=0;i<5;i++)hit("bumper");
  assert.equal(state.multiplier,2);
  const before=state.score;hit("ramp");hit("loop");
  assert.equal(state.score,before+1800);
  assert.deepEqual(state.multiplierMission.mechanisms,["ramp","loop"]);
  hit("loop");assert.equal(state.multiplierMission.progress,2);
  hit("spinner");assert.equal(state.multiplier,3);
  const last=state.score;hit("loop");assert.equal(state.score,last+900);
  assert.equal(state.lastContactAward.label,"LEFT LOOP");
});

test("loop cannot satisfy ramp mission or expand the five-mission catalog",()=>{
  const state=new PinballGameState();assert.equal(state.selectMission("ramp"),true);state.launch();
  state.onEvent({type:"loop",id:"loop"});
  assert.equal(state.mission.id,"ramp");assert.equal(state.mission.progress,0);
  assert.equal(state.missionOptions.length,5);
  state.onEvent({type:"ramp",id:"ramp"});assert.equal(state.mission.completed,1);
});
