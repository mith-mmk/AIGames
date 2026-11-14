#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const packet=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd();
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(packet,'packet-manifest.json'),'utf8'));
const args=process.argv.slice(2);let verifyOnly=false,output='artifacts/pinball/lane-entry-recovered-a4d4ad7';
for(let i=0;i<args.length;i++){
 if(args[i]==='--verify-only')verifyOnly=true;
 else if(args[i]==='--output'&&args[i+1])output=args[++i];
 else throw new Error('Usage: node restore.mjs [--verify-only] [--output artifacts/pinball/DIRECT_CHILD]');
}
const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
if(path.resolve(gitRoot)!==path.resolve(root))throw new Error('Run from repository root.');
if(execFileSync('git',['rev-parse',manifest.base],{encoding:'utf8'}).trim()!==manifest.baseFull)throw new Error('Pinned base commit mismatch.');
for(const [name,expected] of Object.entries(manifest.payload)){
 const got=digest(fs.readFileSync(path.join(packet,name)));
 if(got!==expected)throw new Error('Payload SHA256 mismatch: '+name);
}
const dependencies=JSON.parse(fs.readFileSync(path.join(packet,'payload/dependencies.json'),'utf8'));
for(const [name,expected] of Object.entries(dependencies.vendor)){
 if(digest(fs.readFileSync(path.join(root,name)))!==expected)throw new Error('Vendor SHA256 mismatch: '+name);
}
// Execute the archived build BYTES unchanged. Its known synchronous output methods
// are intercepted into memory; original artifact paths are never written.
// The exact build hash is checked above before it is imported.
const originalOut=path.join(root,manifest.originalArtifactDirectory),captured=new Map();
const originals={read:fs.readFileSync,write:fs.writeFileSync,mkdir:fs.mkdirSync,log:console.log};
let buildMessages=0;
try{
 fs.readFileSync=function(p,...rest){
  if(typeof p==='string'&&path.resolve(p)===path.join(originalOut,'study-helper.mjs'))return originals.read.call(fs,path.join(packet,'payload/study-helper.mjs'),...rest);
  return originals.read.call(fs,p,...rest);
 };
 fs.writeFileSync=function(p,data,...rest){
  if(typeof p!=='string')throw new Error('Unexpected archived-build output type');
  const resolved=path.resolve(p),name=path.basename(resolved);
  if(path.dirname(resolved)!==originalOut||!Object.hasOwn(manifest.generated,name))throw new Error('Unexpected archived-build write: '+p);
  if(captured.has(name))throw new Error('Repeated archived-build write: '+name);
  captured.set(name,Buffer.isBuffer(data)?Buffer.from(data):Buffer.from(data,typeof rest[0]==='string'?rest[0]:'utf8'));
 };
 fs.mkdirSync=function(p,...rest){if(path.resolve(String(p))!==originalOut)throw new Error('Unexpected archived-build mkdir: '+p);return undefined;};
 console.log=()=>{buildMessages++;};
 await import(pathToFileURL(path.join(packet,'payload/build.mjs')).href);
}finally{
 fs.readFileSync=originals.read;fs.writeFileSync=originals.write;fs.mkdirSync=originals.mkdir;console.log=originals.log;
}
for(const [name,expected] of Object.entries(manifest.generated)){
 const content=captured.get(name);
 if(!content||digest(content)!==expected)throw new Error('Reconstructed SHA256 mismatch: '+name);
}
if(captured.size!==Object.keys(manifest.generated).length)throw new Error('Unexpected reconstructed output count');
const records=new Map(captured);
for(const name of ['build.mjs','study-helper.mjs','loader.mjs','dependencies.json'])records.set(name,fs.readFileSync(path.join(packet,'payload',name)));
const result={status:'verified',adopted:false,originalBuildBytesUnchanged:true,originalArtifactWrites:0,sourceSetSha256:manifest.generated['sources.json'],generatedHashes:Object.fromEntries([...captured].map(([k,v])=>[k,digest(v)])),vendorFiles:Object.keys(dependencies.vendor).length,suppressedOriginalBuildMessages:buildMessages};
if(verifyOnly){console.log(JSON.stringify(result,null,2));process.exit(0);}
const out=path.resolve(root,output),allowedParent=path.join(root,'artifacts/pinball');
if(path.dirname(out)!==allowedParent||out===allowedParent)throw new Error('Output must be a direct child of repository artifacts/pinball; the archived loader relies on this depth.');
// Reject symlinks in every existing output ancestor or target.
for(let current=out;;current=path.dirname(current)){
 if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('Refusing symlink output ancestor: '+current);
 if(current===root)break;
 if(path.dirname(current)===current)throw new Error('Output escaped repository.');
}
// Preflight ALL files before any mkdir/write. Differing bytes are never overwritten.
let reused=0;
for(const [name,content] of records){
 const dest=path.join(out,name);
 if(fs.existsSync(dest)){
  if(!fs.lstatSync(dest).isFile()||fs.lstatSync(dest).isSymbolicLink())throw new Error('Refusing nonregular existing output: '+dest);
  if(!fs.readFileSync(dest).equals(content))throw new Error('Existing differing output; nothing written: '+dest);
  reused++;
 }
}
fs.mkdirSync(out,{recursive:true});
let written=0;
for(const [name,content] of records){
 const dest=path.join(out,name);
 try{fs.writeFileSync(dest,content,{flag:'wx'});written++;}
 catch(error){
  // A concurrent creator may have appeared since preflight. Never replace it.
  if(error.code!=='EEXIST'||fs.lstatSync(dest).isSymbolicLink()||!fs.lstatSync(dest).isFile()||!fs.readFileSync(dest).equals(content))throw error;
 }
 if(digest(fs.readFileSync(dest))!==digest(content))throw new Error('Postwrite hash mismatch: '+dest);
}
console.log(JSON.stringify({...result,status:'restored',output:path.relative(root,out),written,reused,fileCount:records.size},null,2));
