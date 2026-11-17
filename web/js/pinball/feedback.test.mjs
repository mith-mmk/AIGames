import test from 'node:test';import assert from 'node:assert/strict';
import {PinballFeedback} from './feedback.mjs';import {PinballGameState} from './game-state.mjs';
test('feedback reads accepted events once without changing scores',()=>{const f=new PinballFeedback(),s=new PinballGameState();assert.deepEqual(f.update(s),[]);s.launch();assert.deepEqual(f.update(s),['launch']);s.onEvent({id:'one',type:'bumper'});const score=s.score;assert.deepEqual(f.update(s,{},[{key:'b0',points:100}]),['bumper']);assert.deepEqual(f.update(s),[]);assert.equal(s.score,score);s.setPaused(true);assert.deepEqual(f.update(s),[]);s.setPaused(false);assert.deepEqual(f.update(s),[]);s.tilted=true;assert.deepEqual(f.update(s),['tilt']);s.drain();assert.deepEqual(f.update(s),['drain']);f.reset();assert.deepEqual(f.update(s),[]);});
test('feedback milestone and held flipper edges are bounded',()=>{const f=new PinballFeedback(),s=new PinballGameState();f.update(s);s.launch();f.update(s);assert.deepEqual(f.update(s,{left:true}),['flipper']);assert.deepEqual(f.update(s,{left:true}),[]);for(let i=0;i<5;i++)s.onEvent({id:String(i),type:'bumper'});assert.deepEqual(f.update(s),['bumper','mission','multiplier']);assert.deepEqual(f.update(s),[]);});

test('scoop and skill-shot awards sound once and collection replaces capture tone',()=>{
  const feedback=new PinballFeedback(),state=new PinballGameState();
  feedback.update(state);state.launch();feedback.update(state);
  state.onEvent({id:'capture-1',type:'scoop'});
  assert.deepEqual(feedback.update(state),['scoop']);
  assert.deepEqual(feedback.update(state),[]);
  for(let i=0;i<3;i++)state.onEvent({id:'target-'+i,type:'bank',targetId:'right-side:'+i});
  feedback.update(state);
  state.onEvent({id:'capture-2',type:'scoop'});
  const score=state.score;
  assert.deepEqual(feedback.update(state),['scoop-reward']);
  assert.deepEqual(feedback.update(state),[]);
  assert.equal(state.score,score);
  state.onEvent({id:'skill',type:'skill-shot'});
  assert.deepEqual(feedback.update(state),['skill-shot']);
  assert.deepEqual(feedback.update(state),[]);
});

test('award feedback remains silent across pause, reset and tilt',()=>{
  const feedback=new PinballFeedback(),state=new PinballGameState();
  feedback.update(state);state.launch();feedback.update(state);
  state.onEvent({id:'capture',type:'scoop'});state.setPaused(true);
  assert.deepEqual(feedback.update(state),[]);
  state.setPaused(false);assert.deepEqual(feedback.update(state),[]);
  feedback.reset();assert.deepEqual(feedback.update(state),[]);
  state.tilted=true;feedback.update(state);
  state.onEvent({id:'blocked',type:'scoop'});
  assert.deepEqual(feedback.update(state),[]);
  state.restart();feedback.reset();assert.deepEqual(feedback.update(state),[]);
});


test('loop completion has a single distinct presentation edge',()=>{
  const feedback=new PinballFeedback(),state=new PinballGameState();
  feedback.update(state);state.launch();feedback.update(state);
  state.onEvent({id:'left-loop-1',type:'loop'});
  const score=state.score;
  assert.deepEqual(feedback.update(state),['loop']);
  assert.deepEqual(feedback.update(state),[]);
  assert.equal(state.score,score);
});
