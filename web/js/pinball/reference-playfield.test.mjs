import test from 'node:test';
import assert from 'node:assert/strict';
import {drawReferencePlayfield,REFERENCE_ART_LANDMARKS} from './reference-playfield.mjs';
function context() {
  const calls=[], gradients=[];
  const ctx=new Proxy({}, {get(target,key){
    if(key in target)return target[key];
    if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{const stops=[];gradients.push({key,args,stops});return {addColorStop:(...a)=>stops.push(a)};};
    return (...args)=>calls.push([key,...args]);
  },set(target,key,value){target[key]=value;return true;}});
  return {ctx,calls,gradients};
}
test('reference ink registers to board, preserves context and draws reference landmarks',()=>{
  const {ctx,calls}=context();const result=drawReferencePlayfield(ctx);
  assert.equal(result,REFERENCE_ART_LANDMARKS);
  assert.deepEqual(calls[0],['save']);assert.deepEqual(calls[1],['scale',1024/5.5,2048/11.5]);
  assert.deepEqual(calls[2],['translate',2.75,5.75]);assert.deepEqual(calls.at(-1),['restore']);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
  for(const label of ['HACK','UPGRADE','BUILD','R-07','MAIN','MISSION','M1','M5'])assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]===label),label);
  assert.ok(calls.some(c=>c[0]==='bezierCurveTo'),'curved heart icon');
});
test('reference ink is deterministic and validates canvas dimensions',()=>{
  const a=context(),b=context();drawReferencePlayfield(a.ctx,{width:512,height:1024});drawReferencePlayfield(b.ctx,{width:512,height:1024});
  assert.deepEqual(a.calls,b.calls);assert.deepEqual(a.gradients,b.gradients);
  assert.throws(()=>drawReferencePlayfield(null),TypeError);
  assert.throws(()=>drawReferencePlayfield(a.ctx,{width:0}),RangeError);
});
