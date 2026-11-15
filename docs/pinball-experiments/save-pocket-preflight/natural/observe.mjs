import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PinballPhysics} from '../../../../web/js/pinball/physics.mjs';
const create=PinballPhysics.create.bind(PinballPhysics),cases=[];let ordinal=0;
PinballPhysics.create=async(...args)=>{
 const g=await create(...args),index=ordinal++,events=[],ring=[],windows=[];let tick=0;
 const snapshot=()=>({p:{...g.ball.translation()},v:{...g.ball.linvel()},w:{...g.ball.angvel()},ball:g.state.ballNumber,charge:g.state.sideSaveCharges,phase:g.state.phase,ramps:g.rampTraversals});
 const onEvent=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{
  const before=e.type==='side-save'?snapshot():null,result=onEvent(e);
  if(result&&e.type==='side-save'){events.push({tick,event:{...e},before});windows.push({event:events.length-1,rows:[...ring],remaining:120});}
  return result;
 };
 const step=g.step.bind(g);g.step=(dt,input)=>{
  const before=snapshot(),value=step(dt,input),row={tick:tick++,input:{...input},before,after:snapshot()};
  ring.push(row);if(ring.length>120)ring.shift();for(const w of windows)if(w.remaining>0){w.rows.push(row);w.remaining--;}
  return value;
 };
 const dispose=g.dispose.bind(g);g.dispose=()=>{if(events.length)cases.push({ordinal:index,power:[.55,.65,.75,.85,.925,1][Math.floor(index/9)],delay:[44,49,60,66,68,69,80,82,84][index%9],events,windows});return dispose();};return g;
};
await import('../../../../scripts/pinball-playability-audit.mjs');
const directory=process.env.PINBALL_SAVE_OBSERVE_OUT||'artifacts/pinball/natural-save-replay';
fs.mkdirSync(directory,{recursive:true});
const path=directory+'/observations.json';
fs.writeFileSync(path,JSON.stringify({scope:'Observation-only wrappers around unchanged 54-case controller. Side-save before snapshot is before original impulse. Windows include 120 prior and120 subsequent steps; no source, force or fixture edits.',runtimeCommit:'71245b26bbc4d72c364d395b21b58b933bba4675',physicsSHA256:createHash('sha256').update(fs.readFileSync(new URL('../../../../web/js/pinball/physics.mjs',import.meta.url))).digest('hex'),cases},null,2));
console.log('saved',cases.length,'natural save cases');
