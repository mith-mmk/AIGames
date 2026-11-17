import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkshopAssets} from './assets.mjs';
import {MechanicalLoop} from './loop.mjs';

test('return A uses a full square bold-letter texture and asset teardown disposes it',()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'document'),calls=[];
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>{
  const canvas={width:0,height:0};
  const context=new Proxy({fillText(label){calls.push({label,font:this.font,width:canvas.width,height:canvas.height});}}, {get:(o,k)=>k in o?o[k]:k==='measureText'?()=>({width:10}):()=>{}});
  canvas.getContext=()=>context;return canvas;
 }}});
 const a=new WorkshopAssets();let disposed=false;
 try{
  const loop=new MechanicalLoop(a);a.root.add(loop.root);
  const letter=loop.root.getObjectByName('loop-A-return-large-letter');
  assert.ok(letter);assert.equal(letter.geometry.parameters.width,.8);
  assert.deepEqual(calls.find(c=>c.label==='A'),{label:'A',font:'900 116px sans-serif',width:128,height:128});
  assert.equal(letter.position.x,-1.50);assert.equal(letter.position.z,-3.20);
  let count=0;letter.material.map.addEventListener('dispose',()=>count++);
  a.dispose();disposed=true;assert.equal(count,1);
 }finally{if(!disposed)a.dispose();if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;}
});
