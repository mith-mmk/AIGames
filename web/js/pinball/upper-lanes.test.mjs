import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {LOWER_LAYOUT} from './layout.mjs';

function rollovers(g) {
  const events=[],onEvent=g.state.onEvent.bind(g.state);
  g.state.onEvent=event=>{
    const before=g.state.score,accepted=onEvent(event);
    if(accepted&&event.type==='rollover')events.push({lane:event.lane,position:{...g.ballPosition},award:g.state.score-before});
    return accepted;
  };
  return events;
}
test('upper rollover volumes stay in the ground lane below the elevated route',async()=>{
  const g=await PinballPhysics.create();
  try {
    const lanes=[...g.hitObjects].filter(([,h])=>h.type==='rollover');
    assert.equal(lanes.length,3);
    for(const [handle,h] of lanes){
      const c=g.world.getCollider(handle),p=c.translation(),half=c.halfExtents();
      assert.ok(Math.abs(p.y-half.y-.04)<1e-7);
      assert.ok(Math.abs(p.y+half.y-.36)<1e-7);
      assert.equal(p.x,(h.lane-1)*1.25);
      assert.ok(Math.abs(p.z+4.55)<1e-6);
      assert.ok(Math.abs(half.x-.35)<1e-7);
      assert.ok(Math.abs(half.z-.08)<1e-7);
    }
  }finally{g.dispose();}
});
test('legal ground upper-lane center and edge passes award once at low and high speeds',async()=>{
  for(let lane=0;lane<3;lane++)for(const offset of[-.43,0,.43])for(const speed of[1,3,6]){
    const g=await PinballPhysics.create();
    try{
      g.launch();const p={x:(lane-1)*1.25+offset,y:.18,z:-4.9};
      g.world.forEachCollider(c=>{
        if(c.handle===g.ballCollider.handle||c.isSensor())return;
        const q=c.projectPoint(p,true).point;
        assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)>=.135-1e-6,'ground fixture must not overlap a solid');
      });
      g.ball.setTranslation(p,true);g.ball.setLinvel({x:0,y:0,z:speed},true);
      const events=rollovers(g);
      for(let tick=0;tick<Math.ceil(.65/speed*120);tick++)g.step(1/120);
      assert.equal(events.length,1,JSON.stringify({lane,offset,speed,events}));
      assert.equal(events[0].lane,lane);assert.equal(events[0].award,100);
      assert.equal(g.state.rollovers[lane],true);
    }finally{g.dispose();}
  }
});
test('five natural elevated ramp and wire traversals do not complete ground rollovers or charge a save',async()=>{
  for(const release of[80,81,82,83,84]){
    const g=await PinballPhysics.create();
    try{
      g.launch();g.state.kickbackCharges=0;const held={left:true},events=rollovers(g);
      for(let i=0;i<30;i++)g.step(1/120,held);
      g.ball.setTranslation({x:-(LOWER_LAYOUT.inlaneInner[0][0]+.25),y:.18,z:LOWER_LAYOUT.inlaneInner[0][2]+.05},true);
      g.ball.setLinvel({x:0,y:0,z:2},true);
      for(let i=0;i<500;i++)g.step(1/120,held);
      assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.03);
      let resets=0;const set=g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation=(...args)=>{resets++;return set(...args);};
      for(let i=0;i<release;i++)g.step(1/120);
      for(let i=0;i<1200&&g.state.phase==='playing'&&!g.rampTraversals;i++)g.step(1/120,held);
      assert.equal(g.rampTraversals,1,'same real ramp traversal remains required at release '+release);
      assert.equal(g.state.ballNumber,1);assert.equal(resets,0);
      assert.deepEqual(events,[],'high route cannot collect the ground lanes');
      assert.equal(g.state.rolloverSets,0);assert.deepEqual(g.state.rollovers,[false,false,false]);
      assert.equal(g.state.kickbackCharges,0,'high route must not recharge center save');
    }finally{g.dispose();}
  }
});
