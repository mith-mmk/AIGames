import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url))),e=manifest.engine;
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim(),target=path.join(root,e.restore_to);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync(target)){if(hash(fs.readFileSync(target))!==e.esm_sha256)throw Error('Existing engine differs; refusing overwrite');console.log('Existing official engine verified');process.exit(0);}
const response=await fetch(e.url);if(!response.ok)throw Error('Download HTTP '+response.status);
const archive=Buffer.from(await response.arrayBuffer()),integrity='sha512-'+crypto.createHash('sha512').update(archive).digest('base64');
if(integrity!==e.integrity)throw Error('Official package integrity mismatch');
// Read exactly one verified archive member; no archive-wide path extraction or temporary files.
const esm=execFileSync('tar',['-xzOf','-','package/rapier.es.js'],{input:archive,maxBuffer:16*1024*1024});
if(hash(esm)!==e.esm_sha256)throw Error('ESM hash mismatch');
fs.mkdirSync(path.dirname(target),{recursive:true});
const packageFile=path.join(path.dirname(target),'package.json');
if(fs.existsSync(packageFile)&&JSON.parse(fs.readFileSync(packageFile)).type!=='module')throw Error('Existing package scope is not ESM');
if(!fs.existsSync(packageFile))fs.writeFileSync(packageFile,JSON.stringify({name:e.name,version:e.version,type:'module',license:e.license},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(target,esm,{flag:'wx'});console.log('Verified official engine restored; package.json and production vendor unchanged.');
