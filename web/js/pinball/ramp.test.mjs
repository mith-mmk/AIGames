import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from './physics.mjs';
import {LOWER_LAYOUT} from './layout.mjs';
import {buildPhysicalRamp,sampleRamp,RAMP_WIDTH,RAMP_POINTS} from './ramp-geometry.mjs';
async function fixture(position,velocity) {
  await R.init();
  const world=new R.World({x:0,y:-97.47,z:7.22});world.timestep=1/120;
  world.createCollider(R.ColliderDesc.cuboid(3,.08,6).setTranslation(0,-.04,0).setFriction(.05));
  const ramp=buildPhysicalRamp({world});
  const ball=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...position).setCcdEnabled(true).setCanSleep(false));
  world.createCollider(R.ColliderDesc.ball(.135).setFriction(.04).setRestitution(.02).setMass(.08),ball);
  ball.setLinvel({x:velocity[0],y:velocity[1],z:velocity[2]},true);
  return {world,ball,ramp};
}
test('experimental ramp uses continuous finite mesh and adequate channel width',()=>{
  const rows=sampleRamp();assert.equal(rows.length,241);assert.ok(RAMP_WIDTH-.27>.15);
  for(const r of rows){assert.ok(r.p.toArray().every(Number.isFinite));assert.ok(r.p.y>=.03);assert.ok(Math.abs(r.p.x)<2.6);assert.ok(r.left.distanceTo(r.right)>=.319, "return channel must retain full ball-width clearance");}
});
test('floor ball passes below rear elevated deck without being lifted',async()=>{
  const {world,ball}=await fixture([0,.18,-4.8],[0,0,2]);
  try{for(let i=0;i<90;i++){world.step();assert.ok(ball.translation().y<.23);}assert.ok(ball.translation().z> -4.1);}finally{world.free();}
});
test('low ramp skirt blocks lateral entry instead of admitting ball under deck',async()=>{
  const {world,ball}=await fixture([1.15,.18,-.35],[4,0,0]);
  try{let reversed=false;for(let i=0;i<45;i++){world.step();if(ball.linvel().x<.2)reversed=true;assert.ok(ball.translation().y>-.1);}assert.ok(reversed);}finally{world.free();}
});
test('elevated exit releases ball into left lower lane without teleport',async()=>{
  const rows=sampleRamp(),r=rows.at(-7);
  const {world,ball}=await fixture([r.p.x,r.p.y+.14,r.p.z],[r.t.x*3,r.t.y*3,r.t.z*3]);
  try{let previous={...ball.translation()},released=false;for(let i=0;i<100;i++){world.step();const p=ball.translation();assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.3);if(p.z>3.4&&p.y<.4)released=true;previous={...p};}assert.ok(released);}finally{world.free();}
});
test('28-speed tangent approaches all complete with lateral tolerance',async()=>{
 for(const offset of [-.08,0,.08]){
  const g=await PinballPhysics.create();try{
   g.launch();const r=sampleRamp()[0],exit=RAMP_POINTS.at(-1);
   g.ball.setTranslation({x:r.p.x+offset,y:r.p.y+.14,z:r.p.z},true);
   g.ball.setLinvel({x:r.t.x*28,y:r.t.y*28,z:r.t.z*28},true);
   let rear=false,completed=false;
   for(let tick=0;tick<1200;tick++){
    g.world.step();const p=g.ballPosition;if(p.z< -3.5)rear=true;
    if(rear&&Math.abs(p.x-exit[0])<.25&&p.z>exit[2]-.1&&p.y>exit[1]){completed=true;break;}
    assert.ok(p.y>-.5,'strong shot cannot drain or escape before completing');
   }
   assert.ok(completed,`28-speed offset ${offset} must complete`);
  }finally{g.dispose();}
 }
});
// A marginal shot may complete OR physically return through the entrance.
// No stalled, sideways-escaping or falsely-scoring third outcome is accepted.
test('26-speed boundary shots complete honestly or roll back and relaunch normally',async()=>{
 for(const offset of [-.08,0,.08]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;const r=sampleRamp()[0],exit=RAMP_POINTS.at(-1),sameBall=g.ball;
   g.ball.setTranslation({x:r.p.x+offset,y:r.p.y+.14,z:r.p.z},true);
   g.ball.setLinvel({x:r.t.x*26,y:r.t.y*26,z:r.t.z*26},true);
   let entry=false,rear=false,rollback=false,completed=false,normalDrain=false,rescues=0;
   const set=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')rescues++;return set(...args);};
   for(let tick=0;tick<1800&&g.state.phase==='playing';tick++){
    const before={...g.ballPosition};g.step(1/120);const p=g.ballPosition,v=g.ball.linvel();
    if(g.rampStage===1)entry=true;if(g.rampStage===2)rear=true;
    if(tick>20&&p.x>0&&p.z>r.p.z+.05&&p.y<.3&&v.z>0)rollback=true;
    if(g.rampTraversals){assert.ok(entry&&rear&&Math.abs(p.x-exit[0])<.3&&p.z>exit[2]);completed=true;break;}
    if(g.state.phase==='ready'){normalDrain=before.z>4.6;break;}
   }
   assert.equal(rescues,0,'no rescue or position reset during play');
   if(completed){
    assert.equal(g.rampTraversals,1);for(let i=0;i<30;i++)g.step(1/120);
    assert.equal(g.rampTraversals,1,'one ordered traversal, no duplicate award');
   }else{
    assert.ok(rollback&&normalDrain&&!rear,'weak shot must return through entrance and drain normally, never stall/escape');
    assert.equal(g.rampTraversals,0,'rollback cannot award a ramp traversal');
    assert.equal(g.state.phase,'ready');assert.equal(g.state.ballNumber,2);
    g.launch();g.step(1/120);assert.equal(g.state.phase,'playing');assert.equal(g.ball,sameBall);
    assert.ok(g.ball.linvel().z< -1,'ordinary next-ball launch works');
   }
   console.log('ramp-boundary',JSON.stringify({speed:26,offset,outcome:completed?'complete':'normal-rollback-relaunch'}));
  }finally{g.dispose();}
 }
});
// Real aimed shot, recapture and re-fire acceptance lives in physics.test.mjs.
test('six unassisted launch powers leave the ramp base without permanent stalls',async()=>{
  for(const power of [0,.2,.4,.6,.8,1]) {
    const g=await PinballPhysics.create();
    try {
      g.launch(power);
      for(let i=0;i<120*30&&g.state.phase==='playing';i++)g.step(1/120,{});
      assert.notEqual(g.state.phase,'playing',`power ${power} stuck at ${JSON.stringify(g.ballPosition)}`);
    }finally{g.dispose();}
  }
});
test('ground balls approaching low base from high deck side deflect without wedging',async()=>{
  for(const x of [1.5,1.8,2.15]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.ball.setTranslation({x,y:.18,z:-2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
      for(let i=0;i<120*10&&g.state.phase==='playing';i++)g.step(1/120,{});
      assert.notEqual(g.state.phase,'playing',`underside approach ${x} stuck`);
    }finally{g.dispose();}
  }
});


test('five adjacent real flipper timings traverse the forward S and award once without teleport', async()=>{
  for(const releaseTicks of [80,81,82,83,84]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.state.kickbackCharges=0;const held={left:true};
      for(let i=0;i<30;i++)g.step(1/120,held);
      // Redesigned IN entrance replaces the former x-.55/z3.15 fixture.
      // Every movement after the settled cradle is real; window measured at 80–84.
      g.ball.setTranslation({x:-(LOWER_LAYOUT.inlaneInner[0][0]+.25),y:.18,z:LOWER_LAYOUT.inlaneInner[0][2]+.05},true);
      g.ball.setLinvel({x:0,y:0,z:2},true);
      for(let i=0;i<500;i++)g.step(1/120,held);
      assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.03);
      let resets=0;const set=g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation=(...args)=>{resets++;return set(...args);};
      for(let i=0;i<releaseTicks;i++)g.step(1/120);
      let completed=false;
      for(let i=0;i<1200&&g.state.phase==='playing';i++){
        g.step(1/120,held);
        if(g.rampTraversals){completed=true;break;}
      }
      assert.ok(completed,`natural release ${releaseTicks} did not traverse`);
      assert.equal(g.rampTraversals,1);assert.equal(g.state.ballNumber,1);
      assert.equal(resets,0,'no position reset, search, or replacement ball');
    } finally {g.dispose();}
  }
});


test('measured ground-level flipper approaches at 28/30 traverse with lateral tolerance',async()=>{
  // Independent fixture derived from real release 78–82 crossings, not a
  // velocity aligned artificially to the rising deck tangent.
  for(const speed of [28,30])for(const offset of [-.05,0,.05]){
    const g=await PinballPhysics.create();
    try {
      g.launch();const mouth=RAMP_POINTS[0],exit=RAMP_POINTS.at(-1);
      g.ball.setTranslation({x:mouth[0]-.15+offset,y:mouth[1]+.135,z:mouth[2]},true);
      g.ball.setLinvel({x:.55*speed,y:0,z:-Math.sqrt(1-.55*.55)*speed},true);
      let rear=false,completed=false;
      for(let i=0;i<1600;i++){
        g.world.step();const p=g.ballPosition;
        if(p.z< -3.5)rear=true;
        if(rear&&Math.abs(p.x-exit[0])<.25&&p.z>exit[2]-.1&&p.y>exit[1]){completed=true;break;}
        assert.ok(p.y>-.5,`measured approach ${speed}/${offset} escaped before return`);
      }
      assert.ok(completed,`speed ${speed}, offset ${offset}`);
    }finally{g.dispose();}
  }
});
