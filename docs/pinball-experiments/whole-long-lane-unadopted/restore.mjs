#!/usr/bin/env node
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';
const packet=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(packet,'packet-manifest.json'),'utf8'));
let variant='final',verifyOnly=false,output;const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){if(args[i]==='--verify-only')verifyOnly=true;else if(args[i]==='--variant'&&args[i+1])variant=args[++i];else if(args[i]==='--output'&&args[i+1])output=args[++i];else throw Error('Usage: restore.mjs [--variant final|d2|4c] [--verify-only] [--output artifacts/pinball/DIRECT_CHILD]');}
if(!Object.hasOwn(manifest.variants,variant))throw Error('Unknown variant');const selected=manifest.variants[variant];
if(path.resolve(execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim())!==path.resolve(root))throw Error('Run from repository root');
if(execFileSync('git',['rev-parse',manifest.base],{encoding:'utf8'}).trim()!==manifest.base)throw Error('Pinned base mismatch');
for(const[name,expected]of Object.entries(manifest.packetFiles)){if(hash(fs.readFileSync(path.join(packet,name)))!==expected)throw Error('Packet SHA256 mismatch: '+name);}
for(const[name,expected]of Object.entries(manifest.vendorFiles)){if(hash(fs.readFileSync(path.join(root,name)))!==expected)throw Error('Vendor SHA256 mismatch: '+name);}
const{captureBuild}=await import('./capture-build.mjs'),{captured,messages}=await captureBuild(packet,root,variant);
for(const[name,expected]of Object.entries(selected.generated)){if(!captured.has(name)||hash(captured.get(name))!==expected)throw Error('Reconstructed SHA256 mismatch: '+name);}
const records=new Map([...captured].map(([n,b])=>[n==='manifest.json'?'build-generated-manifest.json':n,b]));
for(const n of ['build.mjs','geometry.mjs','helper.mjs','loader.mjs','manifest.json'])records.set(n,fs.readFileSync(path.join(packet,'payload',variant,n)));
records.set('dependencies.json',fs.readFileSync(path.join(packet,'payload/common/dependencies.json')));
const result={status:'verified',adopted:false,variant,sourceSetSha256:selected.generated['sources.json'],originalBuildBytesUnchanged:true,originalArtifactWrites:0,generatedHashes:Object.fromEntries([...captured].map(([k,v])=>[k,hash(v)])),restoredHashes:Object.fromEntries([...records].map(([k,v])=>[k,hash(v)])),suppressedBuildMessages:messages};
if(verifyOnly){console.log(JSON.stringify(result,null,2));process.exit(0);}
const out=path.resolve(root,output??selected.defaultOutput),allowed=path.join(root,'artifacts/pinball'),original=path.join(allowed,'whole-long-lane-891ae62');
if(path.dirname(out)!==allowed)throw Error('Output must be a direct child of artifacts/pinball; loader relies on this depth');
if(out===original)throw Error('Refusing original frozen artifact directory');
const stat=p=>{try{return fs.lstatSync(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
for(let current=out;;current=path.dirname(current)){const st=stat(current);if(st?.isSymbolicLink())throw Error('Refusing symlink output ancestor: '+current);if(st&&!st.isDirectory())throw Error('Refusing nondirectory output ancestor: '+current);if(current===root)break;if(path.dirname(current)===current)throw Error('Output escaped repository');}
let reused=0;for(const[name,bytes]of records){const dest=path.join(out,name),st=stat(dest);if(st){if(!st.isFile()||st.isSymbolicLink())throw Error('Refusing nonregular existing output: '+dest);if(!fs.readFileSync(dest).equals(bytes))throw Error('Existing differing output; nothing written: '+dest);reused++;}}
fs.mkdirSync(out,{recursive:true});let written=0;
for(const[name,bytes]of records){const dest=path.join(out,name);try{fs.writeFileSync(dest,bytes,{flag:'wx'});written++;}catch(e){if(e.code!=='EEXIST'||stat(dest).isSymbolicLink()||!stat(dest).isFile()||!fs.readFileSync(dest).equals(bytes))throw e;}if(hash(fs.readFileSync(dest))!==hash(bytes))throw Error('Postwrite mismatch: '+dest);}
console.log(JSON.stringify({...result,status:'restored',output:path.relative(root,out),written,reused,fileCount:records.size},null,2));
