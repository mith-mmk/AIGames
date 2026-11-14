import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {TABLE,SHOOTER_LAYOUT} from './layout.mjs';
const rest={x:SHOOTER_LAYOUT.x,y:.175,z:SHOOTER_LAYOUT.ballZ};
function atRest(g,tolerance=.015) {
  const p=g.ballPosition;
  for(const key of ['x','y','z']) assert.ok(Math.abs(p[key]-rest[key])<tolerance,`${key}: ${p[key]} vs ${rest[key]}`);
  assert.ok(Math.abs(p.z+TABLE.ballRadius-SHOOTER_LAYOUT.returnMaxZ)<tolerance,'ball must touch the head front, not overlap the spring/rod');
}
test('initial serve and restart use the visible head contact point',async()=>{
 const g=await PinballPhysics.create();
 try {atRest(g,.001);for(let i=0;i<120;i++)g.step(1/120);atRest(g,.001);
 g.launch();g.step(.05);g.restart();atRest(g,.001);assert.equal(g.state.ballNumber,1);
 }finally{g.dispose();}
});
test('returning ball settles on visible stop without teleport or consuming a ball',async()=>{
 const g=await PinballPhysics.create();
 try {g.launch();g.ball.setTranslation({x:SHOOTER_LAYOUT.x,y:.175,z:SHOOTER_LAYOUT.ballZ-.225},true);g.ball.setLinvel({x:0,y:0,z:2},true);
 let last={...g.ballPosition};
 for(let i=0;i<600;i++){g.step(1/120);const p=g.ballPosition;assert.ok(Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)<.08);assert.ok(p.z<SHOOTER_LAYOUT.ballZ+.035,'ball penetrated the head');last={...p};}
 atRest(g);assert.equal(g.state.phase,'ready');assert.equal(g.state.returnedShooter,true);assert.equal(g.state.ballNumber,1);
 }finally{g.dispose();}
});
test('weak shot naturally returns to the same stop and full relaunch preserves speed',async()=>{
 const g=await PinballPhysics.create();
 try {g.launch(.1);let minZ=g.ballPosition.z;
 for(let i=0;i<2400;i++){g.step(1/120);minZ=Math.min(minZ,g.ballPosition.z);}
 assert.ok(SHOOTER_LAYOUT.ballZ-minZ>1.025);atRest(g);assert.equal(g.state.phase,'ready');assert.equal(g.state.ballNumber,1);
 const p={...g.ballPosition};assert.equal(g.launch(1),true);assert.deepEqual({...g.ballPosition},p);
 assert.equal(g.ball.linvel().z,-23);assert.equal(g.state.ballNumber,1);
 }finally{g.dispose();}
});
