import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {TABLE} from './layout.mjs';
import {RAMP_DESCENT,RAMP_HANDOFF,descentPose,descentInfo,handoffLift} from './ramp-profile.mjs';
import {RAMP_POINTS,sampleRamp,rampWireRails,WIRE_HEIGHT_OFFSET} from './ramp-geometry.mjs';
import {PinballPhysics} from './physics.mjs';
const curve=()=>new T.CatmullRomCurve3(RAMP_POINTS.map(p=>new T.Vector3(...p)),false,'centripetal');

test('rear descent preserves endpoint C1 XZ and gravity-ratio datum',()=>{
 const c=curve(),info=descentInfo(c),ratio=63.765*Math.sin(TABLE.tilt)/(98.1*Math.cos(TABLE.tilt));
 assert.ok(Math.abs(ratio-RAMP_DESCENT.gravityRatio)<1e-8);
 assert.ok(info.m>.0378&&info.m<.0379);
 for(const u of [RAMP_DESCENT.start,RAMP_DESCENT.end]){
  assert.ok(descentPose(c,u).p.distanceTo(c.getPoint(u))<1e-12);
  const a=descentPose(c,u-1e-9),b=descentPose(c,u+1e-9);
  assert.ok(a.p.distanceTo(b.p)<1e-6);assert.ok(a.t.distanceTo(b.t)<1e-6);
 }
 let maxChange=0;
 for(let i=0;i<=2400;i++){
  const u=i/2400,a=c.getPoint(u),b=descentPose(c,u).p;
  assert.equal(a.x,b.x);assert.equal(a.z,b.z);
  if(u<=RAMP_DESCENT.start||u>=RAMP_DESCENT.end)assert.equal(a.y,b.y);
  maxChange=Math.max(maxChange,Math.abs(a.y-b.y));
 }
 assert.ok(maxChange>.0253&&maxChange<.0254);
});

test('real sheet handoff clears the allowed off-center paired-stock support envelope',()=>{
 const rows=sampleRamp(),rail=rampWireRails(rows.slice(124))[0],lift=handoffLift(124/240).height;
 assert.equal(lift,RAMP_HANDOFF.height);
 assert.ok(Math.abs(rows[124].p.y-(rail[0].y-WIRE_HEIGHT_OFFSET)-lift)<1e-12);
 const allowedOffset=(rows[124].left.distanceTo(rows[124].right)-2*TABLE.ballRadius)/2;
 const supportRise=WIRE_HEIGHT_OFFSET+Math.sqrt((TABLE.ballRadius+.018)**2-(.09-allowedOffset)**2)-TABLE.ballRadius;
 assert.ok(lift-supportRise>.002,'real material drop must exceed the off-center rise');
 assert.equal(handoffLift(RAMP_HANDOFF.start).height,0);
});

// Measured old support pockets, displaced to nonpenetrating near-surface starts
// on the new shared geometry. No launch timing or velocity fixture is changed.
const starts=[{"name": "sheet-0", "p": [1.7724353459021527, 1.0128972980757254, -2.710157120175091]}, {"name": "sheet-1", "p": [1.7990344738239152, 1.0100366496388096, -2.7661899131871164]}, {"name": "sheet-2", "p": [1.8233294193027259, 1.0070878838316457, -2.824961391826367]}, {"name": "sheet-3", "p": [0.8071989534953105, 0.7323796733216178, -4.549477477256626]}, {"name": "sheet-4", "p": [0.7796093045480335, 0.7307487504557687, -4.5593240964729045]}, {"name": "wire-original", "p": [0.1726116687, 0.6827936222836247, -4.6632771492]}, {"name": "handoff-edge", "p": [0.3841901, 0.707412163972946, -4.6399032]}];
test('seven legal former pocket starts exit without rescue under the unchanged solver',async()=>{
 for(const f of starts){const g=await PinballPhysics.create();try{
  g.launch(.925);g.state.kickbackCharges=g.state.sideSaveCharges=0;
  const p=new T.Vector3(...f.p);g.ball.setTranslation(p,true);g.ball.setLinvel({x:0,y:0,z:0},true);g.ball.setAngvel({x:0,y:0,z:0},true);g.world.propagateModifiedBodyPositionsToColliders();
  let gap=Infinity,rescues=0,maxDisplacement=0;const event=g.state.onEvent.bind(g.state);
  g.state.onEvent=e=>{const accepted=event(e);if(accepted&&['kickback','side-save'].includes(e.type))rescues++;return accepted;};
  g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const q=c.projectPoint(p,true).point;gap=Math.min(gap,p.distanceTo(new T.Vector3(q.x,q.y,q.z))-.135);});
  assert.ok(gap>.003,f.name+' initial gap '+gap);
  for(let tick=0;tick<2400&&g.state.phase==='playing';tick++){g.step(1/120,{});const q=g.ballPosition;maxDisplacement=Math.max(maxDisplacement,p.distanceTo(new T.Vector3(q.x,q.y,q.z)));}
  assert.ok(maxDisplacement>.5,f.name);assert.equal(g.state.phase,'ready',f.name);assert.equal(rescues,0,f.name);
 }finally{g.dispose();}}
});
