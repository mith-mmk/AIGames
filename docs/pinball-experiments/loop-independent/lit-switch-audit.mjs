import fs from 'node:fs';import crypto from 'node:crypto';import{fileURLToPath}from'node:url';
const root=process.env.PINBALL_SOURCE_ROOT||fileURLToPath(new URL('../../../',import.meta.url)),output=process.argv[2]||'/tmp/loop-natural.json';
const{PinballPhysics}=await import(root+'/web/js/pinball/physics.mjs');
const source=Object.fromEntries(fs.readdirSync(root+'/web/js/pinball').filter(f=>f.endsWith('.mjs')&&!f.endsWith('.test.mjs')).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(root+'/web/js/pinball/'+f)).digest('hex')]));
const rows=[];
for(const [power,offset] of[[.55,0],[.55,17],[.55,41],[.75,0]]){
 const g=await PinballPhysics.create({difficulty:'relaxed'}),inputs=[],events=[],drains=[];let lastInput='',still=0,trap=null,litAt=null;const switchOffset=Number(process.env.LIT_OFFSET||8);
 const onEvent=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const before={lit:g.state.scoop.lit,score:g.state.score,collections:g.state.scoop.collections};const ok=onEvent(e);if(ok)events.push({tick:Math.round(g.time*120),event:e,before,after:{lit:g.state.scoop.lit,collections:g.state.scoop.collections,score:g.state.score},p:{...g.ballPosition}});return ok;};
 const drain=g.state.drain.bind(g.state);g.state.drain=info=>{drains.push({tick:Math.round(g.time*120),info,p:{...g.ballPosition}});return drain(info);};
 for(let tick=0;tick<21600&&g.state.phase!=='gameover';tick++){
  if(g.state.phase==='ready'){g.launch(power);inputs.push({tick,launch:power});}
  if(rows.length===3&&g.state.scoop.lit&&litAt===null)litAt=tick;
  const phase=litAt===null?tick+offset:tick-litAt+switchOffset;const held=phase%72<24,input={left:held,right:held};if(String(held)!==lastInput){inputs.push({tick,...input});lastInput=String(held);}
  g.step(1/120,input);const v=g.ball.linvel();still=g.state.phase==='playing'&&!g.scoopHeld&&Math.hypot(v.x,v.y,v.z)<.08?still+1:0;
  if(still>=600){trap={tick,p:{...g.ballPosition},v:{...v}};break;}
 }
 const row={world:rows.length+1,power,offset,litAt,switchOffset,seconds:g.time,phase:g.state.phase,position:{...g.ballPosition},velocity:{...g.ball.linvel()},scoop:g.state.scoop,trap,drains,inputs,events};rows.push(row);g.dispose();
 fs.writeFileSync(output,JSON.stringify({source,method:'Experimental lit switch: first3 baseline warmup worlds, final .75/0; immediately after legitimate target lighting switch both flippers to (tick-litTick+LIT_OFFSET)%72<24. Fresh process creates worlds in listed order; each relaxed game max180s. Only launch and both-flipper pulse. All launches and input transitions recorded, held until next transition. 120Hz. Stop on 5s stationary while playing outside scoop hold.',rows},null,2));console.log(JSON.stringify({world:row.world,power,offset,phase:row.phase,seconds:row.seconds,loops:events.filter(e=>e.event.type==='loop').length,collections:row.scoop.collections,trap}));
}
