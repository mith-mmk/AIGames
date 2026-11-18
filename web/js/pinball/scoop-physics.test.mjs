import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {SCOOP} from './scoop.mjs';
async function fixture(t,x=SCOOP.x,z=SCOOP.z+.55,y=.175,vz=-4) {
 const g=await PinballPhysics.create();t.after(()=>g.dispose());g.launch();
 g.ball.setTranslation({x,y,z},true);g.ball.setLinvel({x:0,y:0,z:vz},true);return g;
}
test('scoop captures a physical mouth traversal, holds, pauses, ejects and can be played again',async t=>{
 const g=await fixture(t);
 for(let i=0;i<60&&!g.scoopHeld;i++)g.step(1/120);
 assert.equal(g.scoopHeld,true);assert.equal(g.state.scoop.captures,1);
 const held={...g.ballPosition};g.setPaused(true);g.step(2);assert.deepEqual({...g.ballPosition},held);
 g.setPaused(false);for(let i=0;i<110;i++)g.step(1/120);
 assert.equal(g.scoopHeld,false);assert.ok(g.ballPosition.z>SCOOP.z+.3);assert.equal(g.state.scoop.captures,1);
 assert.equal(g.state.phase,'playing');
});
test('scoop side hit does not capture',async t=>{
 const g=await fixture(t,SCOOP.x+.65,SCOOP.z,.175,0);g.ball.setLinvel({x:-4,y:0,z:0},true);
 for(let i=0;i<40;i++)g.step(1/120);
 assert.equal(g.state.scoop.captures,0);
});
test('restart while held clears capture and launches normal dynamic ball',async t=>{
 const g=await fixture(t);for(let i=0;i<60&&!g.scoopHeld;i++)g.step(1/120);assert.equal(g.scoopHeld,true);
 g.restart();assert.equal(g.scoopHeld,false);assert.equal(g.state.scoop.captures,0);g.launch();
 g.step(.1);assert.ok(g.ball.linvel().z<0);
});
test('natural launch power sweep still reaches the shifted skill lane without injected events',async()=>{
 let qualified=0;
 for (const power of [.5,.8,.85,.9,.94,.98,1]) {
  const g=await PinballPhysics.create();try{
   g.launch(power);for(let i=0;i<240&&g.state.phase==='playing';i++)g.step(1/120);
   if(power===.5)assert.equal(g.state.skillShots,0,'weak shooter launch does not reach the skill lane');
   else qualified+=g.state.skillShots;
  }finally{g.dispose();}
 }
 assert.ok(qualified>0,'at least one actual strong launch crosses C during the skill window');
});

// Incoming physical fixtures, not a claim of natural player aimability.
test('compact scoop captures and clears both cheeks on straight ejection at three lateral offsets',async t=>{
 for(const offset of [-.065,0,.065]) {
  const g=await fixture(t,SCOOP.x+offset,SCOOP.mouthZ+.40);
  for(let i=0;i<90&&!g.scoopHeld;i++)g.step(1/120);
  assert.equal(g.scoopHeld,true,`mouth offset ${offset}`);
  const captures=g.state.scoop.captures;
  let clear=false;
  for(let i=0;i<150;i++) {
   g.step(1/120);
   if(g.scoopHeld)continue;
   const p=g.ballPosition;
   for(const collider of g.scoopContacts) {
    const q=collider.projectPoint(p,true).point;
    assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)>=.135-.008,`no deep scoop penetration at ${offset}`);
   }
   if(p.z>SCOOP.mouthZ+.20){clear=true;break;}
  }
  assert.ok(clear,`ejection clears physical mouth ${offset}`);
  assert.equal(g.state.scoop.captures,captures,'ejection does not recapture');
 }
});

test('downhill balls approaching compact scoop rear leave instead of resting on a flat backstop',async t=>{
 for(const offset of [-.10,0,.10]) {
  const g=await fixture(t,SCOOP.x+offset,SCOOP.z-.8,.175,2);
  let still=0,maxStill=0;
  for(let i=0;i<960&&g.state.phase==='playing';i++) {
   g.step(1/120);
   const p=g.ballPosition,v=g.ball.linvel();
   const rear=p.z<SCOOP.z&&p.z>SCOOP.z-.65&&Math.abs(p.x-SCOOP.x)<.55;
   still=rear&&!g.scoopHeld&&Math.hypot(v.x,v.z)<.025?still+1:0;maxStill=Math.max(still,maxStill);
  }
  assert.ok(maxStill<120,`rear offset ${offset} cannot rest for 1s; ${JSON.stringify(g.ballPosition)}`);
 }
});

test('natural standard .75 launch and both 24/72 pulses do not stop behind the compact scoop',async t=>{
 const g=await PinballPhysics.create({difficulty:'standard'});t.after(()=>g.dispose());g.launch(.75);
 let still=0,maxStill=0,resets=0;
 const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return set(...args);};
 for(let tick=0;tick<120*45&&g.state.phase==='playing';tick++) {
  const on=tick%72<24;g.step(1/120,{left:on,right:on});
  const p=g.ballPosition,v=g.ball.linvel();
  const near=p.x> -1.5&&p.x<-.25&&p.z>-.85&&p.z<.3;
  still=near&&!g.scoopHeld&&Math.hypot(v.x,v.z)<.025?still+1:0;maxStill=Math.max(still,maxStill);
 }
 assert.ok(maxStill<120,`natural scoop-area dwell ${maxStill}/120 seconds`);
 assert.equal(resets,0,'no live-position rescue');
});
