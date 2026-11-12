import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from './physics.mjs';
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
test('ramp traversal at speeds 26 and 28 with three lateral offsets in actual table world',async()=>{
  for(const speed of [26,28])for(const offset of [-.08,0,.08]) {
    const g=await PinballPhysics.create();if(!g.ramp)g.ramp=buildPhysicalRamp(g);
    try {
      g.launch();const r=sampleRamp()[0];
      g.ball.setTranslation({x:r.p.x+offset,y:r.p.y+.14,z:r.p.z},true);
      g.ball.setLinvel({x:r.t.x*speed,y:r.t.y*speed,z:r.t.z*speed},true);
      let rear=false,completed=false; const exit=RAMP_POINTS.at(-1);
      for(let tick=0;tick<1200;tick++) {
        g.world.step();const p=g.ballPosition;
        if(p.z< -3.5)rear=true;
        if(rear&&Math.abs(p.x-exit[0])<.25&&p.z>exit[2]-.1&&p.y>exit[1]){completed=true;break;}
        assert.ok(p.y>-.5,'escaped ramp/table before exit');
      }
      assert.ok(completed,`speed ${speed}, offset ${offset}`);
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
