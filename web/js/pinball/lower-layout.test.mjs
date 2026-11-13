import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {LOWER_LAYOUT,TABLE,lowerLanePaths} from './layout.mjs';
import {PinballPhysics} from './physics.mjs';

test('sling rubber clears the root-to-center shot corridor on both sides',()=>{
  for(const side of [-1,1]) {
    const a=new T.Vector3(side*.9,.22,3.7),b=new T.Vector3(0,.22,-4.55),d=b.clone().sub(a);
    const outline=new T.CatmullRomCurve3([...LOWER_LAYOUT.slingVertices,LOWER_LAYOUT.slingVertices[0]].map(([x,z])=>new T.Vector3(side*x,.22,z))).getPoints(128);
    for(const p of outline) {
      const t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/d.lengthSq()));
      assert.ok(p.distanceTo(a.clone().addScaledVector(d,t))>TABLE.ballRadius+.07+.02);
    }
  }
});
test('both inlanes feed the flippers at three speeds rather than bypass their pivots',async()=>{
  for(const side of [-1,1])for(const x of [1.72,1.75])for(const speed of [1,3,6]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.state.kickbackCharges=0;
      g.ball.setTranslation({x:side*x,y:.18,z:2.1},true);g.ball.setLinvel({x:0,y:0,z:speed},true);
      for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:side<0,right:side>0});
      assert.ok(g.metrics.flipperContacts[side<0?0:1]>0,`side ${side}, x ${x}, speed ${speed}`);
    }finally{g.dispose();}
  }
});
test('genuine outside lanes still drain without a flipper or invisible rescue',async()=>{
  for(const side of [-1,1]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.state.kickbackCharges=0;
      g.ball.setTranslation({x:side*2.2,y:.18,z:2.6},true);g.ball.setLinvel({x:0,y:0,z:3},true);
      for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:true,right:true});
      assert.equal(g.state.phase,'ready');assert.deepEqual(g.metrics.flipperContacts,[0,0]);
    }finally{g.dispose();}
  }
});

test('inside heel approach cannot leak sideways past the root cheek',async()=>{
 for(const side of [-1,1]) {
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;
   g.ball.setTranslation({x:side*.7410067,y:.16575,z:3.1797516},true);
   g.ball.setLinvel({x:side*2.621058,y:-.167,z:7.381197},true);
   for(let tick=336;tick<936&&g.state.phase==='playing';tick++) {
    const p=g.ballPosition,on=(tick+11*3)%45<15&&p.z>3.2;
    g.step(1/120,{left:on&&p.x<0,right:on&&p.x>=0});
    const q=g.ballPosition;
    // End the heel approach once it has physically returned upfield. Later
    // legitimate shooter returns and outlanes are separate tested behaviors.
    if(g.metrics.upfieldReturns>0) break;
    if(g.state.phase==='playing'&&q.z>3.4&&q.z<4.3) assert.ok(Math.abs(q.x)<1.3,'escaped beside flipper heel '+JSON.stringify({tick,side,q,metrics:g.metrics}));
   }
   assert.ok(g.metrics.upfieldReturns>0,'must produce an actual return, not trap the ball');
  }finally{g.dispose();}
 }
});


test('restored lane mouths pass descending balls without live position rescue',async()=>{
 for(const side of [-1,1])for(const lane of ['in','out'])for(const speed of [1,3,6]) {
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   g.ball.setTranslation({x:side*(lane==='in'?1.75:2.12),y:.18,z:lane==='in'?2.10:1.35},true);
   g.ball.setLinvel({x:0,y:0,z:speed},true);
   let liveResets=0; const reset=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return reset(...args);};
   for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:side<0,right:side>0});
   assert.equal(liveResets,0,`${lane} lane uses only physical contacts`);
   if(lane==='in')assert.ok(g.metrics.flipperContacts[side<0?0:1]>0);
   else {assert.equal(g.state.phase,'ready');assert.deepEqual(g.metrics.flipperContacts,[0,0]);}
  }finally{g.dispose();}
 }
});

 test('actual outlane entrance has full ball clearance and mirrored shared paths',()=>{
  for(const side of [-1,1]) {
    const [divider,inner,outer]=lowerLanePaths(side);
    assert.equal(divider[0][2],outer[0][2]);
    assert.ok(Math.abs(outer[0][0]-divider[0][0])-2*LOWER_LAYOUT.guideRadius>2*TABLE.ballRadius+.03);
    for(const path of [divider,inner,outer])for(const p of path)assert.ok(p[0]*side>0);
    divider[0][0]=999;
    assert.notEqual(lowerLanePaths(side)[0][0][0],999);
  }
});
