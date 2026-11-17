import fs from 'node:fs';import crypto from 'node:crypto';import{fileURLToPath}from'node:url';
const root=process.env.PINBALL_SOURCE_ROOT||fileURLToPath(new URL('../../../',import.meta.url)),output=process.argv[2]||'/tmp/loop-natural.json';
const{PinballPhysics}=await import(root+'/web/js/pinball/physics.mjs');
const source=Object.fromEntries(fs.readdirSync(root+'/web/js/pinball').filter(f=>f.endsWith('.mjs')&&!f.endsWith('.test.mjs')).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(root+'/web/js/pinball/'+f)).digest('hex')]));
const rows=[];
for(const power of(process.env.AUDIT_POWERS||'.55,.75,.95').split(',').map(Number))for(const offset of(process.env.AUDIT_OFFSETS||'0,17,41').split(',').map(Number)){
 const g=await PinballPhysics.create({difficulty:'relaxed'}),inputs=[],events=[],drains=[];const captureProof=[];let pendingCapture=null,lastCollections=0;let lastInput='',still=0,trap=null,litAt=null,nudgeAt=null;const nudgeDelay=Number(process.env.NUDGE_DELAY||0);
 const onEvent=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const before={lit:g.state.scoop.lit,score:g.state.score,collections:g.state.scoop.collections};const ok=onEvent(e);if(ok)events.push({tick:Math.round(g.time*120),event:e,before,after:{lit:g.state.scoop.lit,collections:g.state.scoop.collections,score:g.state.score},p:{...g.ballPosition}});return ok;};
 const drain=g.state.drain.bind(g.state);g.state.drain=info=>{drains.push({tick:Math.round(g.time*120),info,p:{...g.ballPosition}});return drain(info);};
 for(let tick=0;tick<21600&&g.state.phase!=='gameover';tick++){
  if(g.state.phase==='ready'){g.launch(power);inputs.push({tick,launch:power});}
  const held=(tick+offset)%72<24,input={left:held,right:held};if(String(held)!==lastInput){inputs.push({tick,...input});lastInput=String(held);}
  if(rows.length===8&&g.state.scoop.lit&&litAt===null)litAt=tick;
  if(rows.length===8&&litAt!==null&&nudgeAt===null&&tick>=litAt+Math.round(nudgeDelay*120)&&g.state.phase==='playing'){const before={p:{...g.ballPosition},v:{...g.ball.linvel()},tilted:g.state.tilted};const result=g.nudge();nudgeAt=tick;inputs.push({tick,nudge:true,result:result??null,before,after:{v:{...g.ball.linvel()},tilted:g.state.tilted}});}
  g.step(1/120,input);if(g.state.scoop.collections>lastCollections){pendingCapture={tick:tick+1,ball:g.state.ballNumber,held:g.scoopHeld,sideSaveCharges:g.state.sideSaveCharges,targets:[...g.state.scoop.targets],p:{...g.ballPosition}};captureProof.push(pendingCapture);lastCollections=g.state.scoop.collections;}else if(pendingCapture&&!g.scoopHeld){pendingCapture.ejection={tick:tick+1,ball:g.state.ballNumber,p:{...g.ballPosition},v:{...g.ball.linvel()}};pendingCapture=null;}const v=g.ball.linvel();still=g.state.phase==='playing'&&!g.scoopHeld&&Math.hypot(v.x,v.y,v.z)<.08?still+1:0;
  if(still>=600){trap={tick,p:{...g.ballPosition},v:{...v}};break;}
 }
 const row={world:rows.length+1,power,offset,litAt,nudgeAt,nudgeDelay,captureProof,seconds:g.time,phase:g.state.phase,position:{...g.ballPosition},velocity:{...g.ball.linvel()},scoop:g.state.scoop,trap,drains,inputs,events};rows.push(row);g.dispose();
 fs.writeFileSync(output,JSON.stringify({source,method:'Single legal N-key-equivalent g.nudge after last-world collector lighting plus NUDGE_DELAY seconds, at most one, no state or ball injection. Fresh process creates worlds in listed order; each relaxed game max180s. Only launch and both-flipper pulse. All launches and input transitions recorded, held until next transition. 120Hz. Stop on 5s stationary while playing outside scoop hold.',rows},null,2));console.log(JSON.stringify({world:row.world,power,offset,phase:row.phase,seconds:row.seconds,loops:events.filter(e=>e.event.type==='loop').length,collections:row.scoop.collections,trap}));
}
