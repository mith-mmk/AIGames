// Positioned incoming ball -> physical cradle -> release/repress only. Not human gameplay.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
const rows=[];
const sourceHashes=Object.fromEntries(['layout.mjs','physics.mjs','game-state.mjs','mechanical-contact.mjs','upper-shots.mjs'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(new URL('../web/js/pinball/'+name,import.meta.url))).digest('hex')]));
for(const difficulty of ['standard','relaxed']){
 const g=await PinballPhysics.create({difficulty});
 try{for(const side of ['left','right'])for(let release=0;release<=120;release+=2){
  g.restart();g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;g.state.ballSaveAvailable=false;g.state.easyOutSaveAvailable=false;
  g.ball.setTranslation({x:side==='left'?-1.81:1.81,y:.18,z:3.05},true);g.ball.setLinvel({x:0,y:0,z:2},true);
  const input={[side]:true};for(let i=0;i<550&&g.state.phase==='playing';i++)g.step(1/120,input);
  const cradle={...g.ballPosition},cradleSpeed=Math.hypot(g.ball.linvel().x,g.ball.linvel().z);
  const events=[];const original=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const accepted=original(e);if(accepted)events.push({type:e.type,lane:e.lane,target:e.targetId});return accepted;};
  for(let i=0;i<release&&g.state.phase==='playing';i++)g.step(1/120);
  const before={...g.ballPosition};let minZ=before.z,liveResets=0;
  const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return set(...args);};
  for(let i=0;i<1000&&g.state.phase==='playing';i++){g.step(1/120,input);minZ=Math.min(minZ,g.ballPosition.z);if(i>15&&g.ballPosition.z>3&&g.ball.linvel().z>0)break;}
  rows.push({difficulty,side,release,cradle,cradleSpeed,before,shot:g.lastFlipperShot,minZ,events,drive:g.state.upperShots.completions,loops:g.state.loopCompletions,ramps:g.rampTraversals,phase:g.state.phase,liveResets});
  g.ball.setTranslation=set;g.state.onEvent=original;
 }}finally{g.dispose();}
}
const path=process.argv[2]||'artifacts/pinball/upper-layout-20261118/bat-timing.json';
fs.writeFileSync(path,JSON.stringify({sourceHashes,method:'Positioned incoming-ball fixture to held cradle; 0..120 release ticks at 120Hz; re-press same flipper, no aim/speed selection after initial fixture. Not natural launch or human gameplay.',rows},null,2));
console.log(JSON.stringify(rows.filter(r=>r.drive||r.loops||r.ramps),null,2));
