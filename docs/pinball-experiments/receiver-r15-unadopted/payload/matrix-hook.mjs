import {registerHooks} from 'node:module';
registerHooks({load(u,c,next){const r=next(u,c);if(!u.endsWith('/pinball/lower-layout.test.mjs'))return r;let s=String(r.source),a=s.indexOf("test('five adjacent redesigned bat shots"),b=s.indexOf('\n});',a)+5;const body=`test('predeclared sixty through one hundred same-ball aiming matrix',async()=>{
 const delays=Array.from({length:41},(_,i)=>60+i);if(process.env.ORDER==='descending')delays.reverse();const results=[];
 for(const release of delays){const g=await PinballPhysics.create();let stage='setup',resets=0,rescueEvents=0;const row={release,success:false};try{
  g.launch();g.state.kickbackCharges=0;const onEvent=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const accepted=onEvent(e);if(accepted&&['kickback','side-save'].includes(e.type))rescueEvents++;return accepted;};
  g.ball.setTranslation({x:-1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...a)=>{if(g.state.phase==='playing')resets++;return set(...a);};
  for(let i=0;i<500;i++)g.step(1/120,{left:true});row.cradle={p:{...g.ballPosition},v:{...g.ball.linvel()},w:{...g.ball.angvel()}};
  for(let i=0;i<release;i++)g.step(1/120);let minZ=Infinity,maxStage=0;
  for(let i=0;i<1200&&g.state.phase==='playing';i++){g.step(1/120,{left:true});minZ=Math.min(minZ,g.ballPosition.z);maxStage=Math.max(maxStage,g.rampStage);}
  row.first={ramps:g.rampTraversals,phase:g.state.phase,minZ,maxStage,p:{...g.ballPosition},speed:Math.hypot(g.ball.linvel().x,g.ball.linvel().z)};
  stage='ramp';assert.equal(g.rampTraversals,1);stage='live-after-ramp';assert.equal(g.state.phase,'playing');stage='capture';assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.05);
  const count=g.metrics.coilImpulses[0];for(let i=0;i<45;i++)g.step(1/120);let z=9;
  for(let i=0;i<300&&g.state.phase==='playing';i++){g.step(1/120,{left:true});z=Math.min(z,g.ballPosition.z);}
  row.refire={minZ:z,coilDelta:g.metrics.coilImpulses[0]-count,phase:g.state.phase};stage='refire-coil';assert.ok(g.metrics.coilImpulses[0]>count);stage='refire-route';assert.ok(z<-1);stage='reset';assert.equal(resets,0);stage='rescue';assert.equal(rescueEvents,0);stage='same-ball';assert.equal(g.state.ballNumber,1);stage='live-after-refire';assert.equal(g.state.phase,'playing');row.success=true;stage='complete';
 }catch(error){row.error=error.message;}finally{row.stage=stage;row.resets=resets;row.rescueEvents=rescueEvents;results.push(row);g.dispose();fs.writeFileSync(process.env.MATRIX_OUT,JSON.stringify({order:process.env.ORDER,results},null,2));}}
});`;
r.source='import fs from "node:fs";\n'+s.slice(0,a)+body+s.slice(b);return r;}});
