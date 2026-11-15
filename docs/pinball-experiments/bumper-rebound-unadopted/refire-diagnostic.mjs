import fs from 'node:fs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const results=[];
for(const release of [80,81,82,83,84]) {
 const g=await PinballPhysics.create();g.launch();g.state.kickbackCharges=0;
 const events=[];const hit=g.hit.bind(g);g.hit=h=>{const o=g.hitObjects.get(h);const pre={...g.ball.linvel()};hit(h);if(o?.type==='bumper')events.push({t:g.time,key:o.key,pre,post:{...g.ball.linvel()}});};
 g.ball.setTranslation({x:-1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
 for(let i=0;i<500;i++)g.step(1/120,{left:true});
 for(let i=0;i<release;i++)g.step(1/120);
 for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:true});
 const capture={ball:g.state.ballNumber,phase:g.state.phase,ramps:g.rampTraversals,speed:Math.hypot(g.ball.linvel().x,g.ball.linvel().z)};
 for(let i=0;i<45;i++)g.step(1/120);
 for(let i=0;i<300&&g.state.phase==='playing';i++)g.step(1/120,{left:true});
 results.push({release,capture,final:{ball:g.state.ballNumber,phase:g.state.phase,score:g.state.score,p:{...g.ballPosition}},events});g.dispose();
}
fs.writeFileSync(new URL(process.env.DIAG_OUT||'refire-candidate.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({release,capture,final})=>({release,capture,final}))));
