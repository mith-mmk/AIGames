// Execute a pinned archived generator unchanged; all its known output writes stay in memory.
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';
export async function captureBuild(packet,root,variant){
 const originalOut=path.join(root,'artifacts/pinball/whole-long-lane-891ae62');
 const inputs=new Map([
  [path.join(originalOut,'geometry.mjs'),path.join(packet,'payload',variant,'geometry.mjs')],
  [path.join(originalOut,'helper.mjs'),path.join(packet,'payload',variant,'helper.mjs')],
  [path.join(root,'artifacts/pinball/curved-receiver-eaf9be3/prior-c-changes.json'),path.join(packet,'payload/common/prior-c-changes.json')],
  [path.join(root,'artifacts/pinball/lane-entry-integrated-a4d4ad7/changes.json'),path.join(packet,'payload/common/width-changes.json')]
 ]),names=new Set(['sources.json','baseline-sources.json','changes.json','manifest.json']),captured=new Map();
 const originals={read:fs.readFileSync,write:fs.writeFileSync,mkdir:fs.mkdirSync,log:console.log};let messages=0;
 try{
  fs.readFileSync=function(p,...rest){
   if(typeof p==='string'){
    const absolute=path.resolve(p);if(inputs.has(absolute))return originals.read.call(fs,inputs.get(absolute),...rest);
    if(absolute.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Unexpected artifact read by archived build: '+p);
   }
   return originals.read.call(fs,p,...rest);
  };
  fs.writeFileSync=function(p,data,...rest){
   if(typeof p!=='string')throw Error('Unexpected archived output type');const absolute=path.resolve(p),name=path.basename(absolute);
   if(path.dirname(absolute)!==originalOut||!names.has(name)||captured.has(name))throw Error('Unexpected archived output: '+p);
   captured.set(name,Buffer.isBuffer(data)?Buffer.from(data):Buffer.from(data,typeof rest[0]==='string'?rest[0]:'utf8'));
  };
  fs.mkdirSync=function(){throw Error('Unexpected archived mkdir');};console.log=()=>{messages++;};
  await import(pathToFileURL(path.join(packet,'payload',variant,'build.mjs')).href);
 }finally{fs.readFileSync=originals.read;fs.writeFileSync=originals.write;fs.mkdirSync=originals.mkdir;console.log=originals.log;}
 if(captured.size!==4)throw Error('Archived output count mismatch');
 return{captured,messages};
}
