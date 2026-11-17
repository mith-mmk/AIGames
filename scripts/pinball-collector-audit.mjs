// Legal launch and flipper inputs only. This is a deterministic bot audit, not human difficulty evidence.
import fs from 'node:fs';
import process from 'node:process';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
import {LOWER_LAYOUT} from '../web/js/pinball/layout.mjs';
const rows=[];
const mode=process.env.AUDIT_MODE||'pulse';
const powers=(process.env.AUDIT_POWERS||'.55,.75,.95,1').split(',').map(Number);
const offsets=(process.env.AUDIT_OFFSETS||'0,17,41').split(',').map(Number);
for(const power of powers)for(const offset of offsets){
 const g=await PinballPhysics.create({difficulty:'relaxed'}),events=[],targets=new Set();
 let stage='catch',settled=0,until=0,side='left',shots=0,launches=0;const hold={left:0,right:0};
 const onEvent=g.state.onEvent.bind(g.state);
 g.state.onEvent=e=>{const accepted=onEvent(e);if(accepted){
  if(e.targetId?.startsWith('right-side:'))targets.add(e.targetId);
  if(e.type==='scoop'||e.type==='skill-shot'||e.targetId?.startsWith('right-side:'))events.push({t:+g.time.toFixed(4),type:e.type,targetId:e.targetId,lit:g.state.scoop.lit,collections:g.state.scoop.collections,p:{...g.ballPosition}});
 }return accepted;};
 for(let tick=0;tick<120*180&&g.state.phase!=='gameover';tick++){
  if(g.state.phase==='ready'){g.launch(power);launches++;stage='catch';settled=0;hold.left=hold.right=0;}
  const p=g.ballPosition,v=g.ball.linvel();const t=tick+offset;let input={left:t%72<24,right:t%72<24};
  if(mode==='cradle'){
   const which=p.x<0?'left':'right',z=LOWER_LAYOUT.flipperPivot[2];
   if(stage==='catch'&&p.z>z-.70&&p.z<z+.25&&v.z>0&&Math.abs(p.x)>.10&&Math.abs(p.x)<1.4)hold[which]=tick+240;
   input={left:tick<hold.left,right:tick<hold.right};
   if(stage==='catch'){
    const cradle=p.z>z-.65&&p.z<z+.05&&Math.abs(p.x)>.65&&Math.abs(p.x)<1.4&&Math.hypot(v.x,v.z)<.03;
    settled=cradle?settled+1:0;if(settled>=48){side=which;until=tick+offset;stage='release';shots++;}
   }
   if(stage==='release'){input[side]=false;if(tick>=until){input[side]=true;hold[side]=tick+240;stage='refire';until=tick+36;}}
   else if(stage==='refire'&&tick>=until){stage='catch';settled=0;}
  }
  g.step(1/120,input);
 }
 const row={mode,power,offset,seconds:g.time,phase:g.state.phase,score:g.state.score,launches,shots,targets:[...targets],scoop:g.state.scoop,skills:g.state.skillShots,events};
 rows.push(row);console.log(JSON.stringify(row));g.dispose();
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({method:'180s max, relaxed 3-ball games, only legal launch/flipper input. pulse: both flippers (tick+offset)%72<24; cradle: catch 48 settled ticks then release offset ticks and fire for 240 ticks. No ball injection or score changes.',rows},null,2));
