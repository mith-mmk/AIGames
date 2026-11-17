// Read-only simulation controller: legal launch/flipper inputs, never injected state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const source=process.env.PINBALL_SOURCE_ROOT
 ? pathToFileURL(process.env.PINBALL_SOURCE_ROOT+'/web/js/pinball/physics.mjs')
 : new URL('../../../web/js/pinball/physics.mjs',import.meta.url);
const {PinballPhysics}=await import(source.href);
const rows=[];
async function play(power,offset,delay=null){
 const g=await PinballPhysics.create({difficulty:'relaxed'}),events=[],inputs=[];let previousInput='';
 let nextLaunchTick=null;let launches=0,litAt=null;
 const original=g.state.onEvent.bind(g.state);
 g.state.onEvent=e=>{const score=g.state.score,accepted=original(e);if(accepted&&(e.type==='scoop'||e.targetId?.startsWith('right-side:'))){events.push({tick:Math.round(g.time*120),t:g.time,type:e.type,targetId:e.targetId,ball:g.state.ballNumber,lit:g.state.scoop.lit,collections:g.state.scoop.collections,score:g.state.score,award:g.state.score-score,save:g.state.sideSaveCharges,p:{...g.ballPosition}});if(litAt===null&&g.state.scoop.lit)litAt=g.time;}return accepted;};
 try{
  for(let tick=0;tick<120*180&&g.state.phase!=='gameover'&&!g.state.scoop.collections;tick++){
   if(g.state.phase==='ready'){if(litAt!==null&&delay!==null)nextLaunchTick=tick;const launchPower=nextLaunchTick!==null?.55:power;g.launch(launchPower);inputs.push({tick,launchPower});launches++;}
   let input={left:(tick+offset)%72<24,right:(tick+offset)%72<24};
   if(nextLaunchTick!==null)input={left:(tick-nextLaunchTick+delay)%72<24,right:(tick-nextLaunchTick+delay)%72<24};
   const bits=Number(input.left)+2*Number(input.right);if(bits!==previousInput){inputs.push({tick,left:input.left,right:input.right});previousInput=bits;}
   g.step(1/120,input);
  }
  let postReward=null;
  if(g.state.scoop.collections){
   const capturedBall=g.state.ballNumber,held=g.scoopHeld;
   const rewardEvent=events.at(-1);assert.equal(rewardEvent.type,'scoop');assert.equal(rewardEvent.award,1000);assert.equal(rewardEvent.save,1);
   assert.deepEqual(g.state.scoop.targets,[false,false,false]);assert.equal(held,true);
   for(let i=0;i<120;i++)g.step(1/120,{left:false,right:false});
   assert.equal(g.scoopHeld,false);assert.equal(g.state.ballNumber,capturedBall);
   postReward={steps:120,input:{left:false,right:false},heldBefore:held,heldAfter:g.scoopHeld,ball:g.state.ballNumber,phase:g.state.phase,p:{...g.ballPosition},v:{...g.ball.linvel()}};
  }
  const row={inputs,postReward,power,offset,delay,seconds:g.time,phase:g.state.phase,launches,litAt,scoop:g.state.scoop,events};rows.push(row);console.log(JSON.stringify(row));return row;
 }finally{g.dispose();}
}
// Reproduce the archived audit's preceding allocation and natural-play sequence.
for(const [p,o] of [[.55,0],[.55,17],[.55,41],[.75,0],[.75,17]])await play(p,o);
await play(.75,41,8);
assert.equal(rows.at(-1).scoop.collections,1,'same-game target lighting and physical collection must complete');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({expectedRuntime:'0dfa50e (v24); run against this fixed source snapshot',method:'Only legal launch and flipper controls; baseline pulse until all three right targets light, then power .55 next launch and launch-relative pulse phase 8. Input transition records plus 120 Hz step contract fully specify all six games. A final one-second neutral-input segment verifies same-ball release. Initial five games reproduce previous audit ordering. No ball or state injection.',rows},null,2)+'\n');
