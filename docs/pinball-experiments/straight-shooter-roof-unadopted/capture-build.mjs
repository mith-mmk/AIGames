import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{captureBuild as captureParent}from'../whole-long-lane-unadopted/capture-build.mjs';
export async function captureBuild(packet,root){
 const{captured:parent,messages:parentMessages}=await captureParent(path.resolve(packet,'../whole-long-lane-unadopted'),root,'final');
 const originalOut=path.join(root,'artifacts/pinball/straight-shooter-roof-dfe19ba'),parentOut=path.join(root,'artifacts/pinball/whole-long-lane-891ae62'),captured=new Map(),names=new Set(['sources.json','baseline-sources.json','accepted-sources.json','geometry.mjs','manifest.json','changes.json']);
 const originals={read:fs.readFileSync,write:fs.writeFileSync,exists:fs.existsSync,mkdir:fs.mkdirSync,log:console.log};let messages=0;
 try{
  fs.readFileSync=function(p,...rest){if(typeof p==='string'){const abs=path.resolve(p);if(abs===path.join(parentOut,'sources.json'))return Buffer.from(parent.get('sources.json'));if(abs===path.join(parentOut,'baseline-sources.json'))return Buffer.from(parent.get('baseline-sources.json'));if(abs===path.join(originalOut,'upper-definition.mjs.txt'))return originals.read.call(fs,path.join(packet,'payload/upper-definition.mjs.txt'),...rest);if(abs.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Unexpected artifact read: '+p);}return originals.read.call(fs,p,...rest);};
  fs.existsSync=function(p){if(typeof p==='string'&&path.dirname(path.resolve(p))===originalOut&&names.has(path.basename(p)))return false;return originals.exists.call(fs,p);};
  fs.writeFileSync=function(p,b,...rest){if(typeof p!=='string'||path.dirname(path.resolve(p))!==originalOut||!names.has(path.basename(p))||captured.has(path.basename(p)))throw Error('Unexpected archived output: '+p);captured.set(path.basename(p),Buffer.isBuffer(b)?Buffer.from(b):Buffer.from(b,typeof rest[0]==='string'?rest[0]:'utf8'));};
  fs.mkdirSync=function(){throw Error('Unexpected mkdir');};console.log=()=>{messages++;};
  await import(pathToFileURL(path.join(packet,'payload/build.mjs')).href);
 }finally{fs.readFileSync=originals.read;fs.writeFileSync=originals.write;fs.existsSync=originals.exists;fs.mkdirSync=originals.mkdir;console.log=originals.log;}
 if(captured.size!==6)throw Error('Unexpected output count');return{parent,captured,messages,parentMessages};
}
