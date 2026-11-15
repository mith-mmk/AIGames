import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const packet=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(packet,'../../..');
const args=process.argv.slice(2), allowed=new Set(['--variant','--output','--verify-only']);
for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw Error('Unknown option '+args[i]);if(args[i]!=='--verify-only'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing option value');i++;}}
const value=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const variants=JSON.parse(fs.readFileSync(path.join(packet,'variants.json'),'utf8'));
const name=value('--variant')||'v2',spec=variants[name];
if(!spec)throw Error('Unknown variant');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function payload(record){const p=path.resolve(packet,record.path);if(!p.startsWith(packet+path.sep))throw Error('Invalid packet path');const bytes=fs.readFileSync(p);if(hash(bytes)!==record.sha256)throw Error('Packet input mismatch '+record.path);return bytes;}
const files=execFileSync('git',['ls-tree','-r','--name-only',spec.base,'web/js/pinball'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(k=>k.endsWith('.mjs')&&!k.includes('.test.'));
const baseline=Object.fromEntries(files.map(k=>[k,execFileSync('git',['show',spec.base+':'+k],{cwd:root,encoding:'utf8'})]));
const candidate={...baseline};
for(const [key,record] of Object.entries(spec.modules)){
 const text=payload(record).toString('utf8');candidate[key]=text;

}
const output=new Map(Object.entries({'baseline-sources.json':Buffer.from(JSON.stringify(baseline)),'sources.json':Buffer.from(JSON.stringify(candidate))}));
for(const [file,expected] of Object.entries(spec.mapHashes))if(hash(output.get(file))!==expected)throw Error('Exact reconstructed source mismatch '+file);
for(const [file,record] of Object.entries(spec.files))output.set(file,payload(record));
const dependencies=JSON.parse(output.get('dependencies.json'));
for(const [file,expected] of Object.entries(dependencies))if(hash(fs.readFileSync(path.join(root,file)))!==expected)throw Error('Vendor mismatch '+file);
if(args.includes('--verify-only')){
 if(value('--output'))throw Error('verify-only cannot have output');
 console.log(JSON.stringify({status:'verified',adopted:false,variant:name,sourceSha256:spec.mapHashes['sources.json'],files:output.size,writes:0},null,2));
}else{
 const requested=value('--output')||'artifacts/pinball/left-lane-recovered-'+name;
 const destination=path.resolve(root,requested),relative=path.relative(root,destination).split(path.sep);
 if(relative.length!==3||relative[0]!=='artifacts'||relative[1]!=='pinball'||!relative[2]||relative.includes('..'))throw Error('Output must have artifacts/pinball/name depth');
 if(Object.values(variants).some(v=>relative[2]===v.originalDirectory))throw Error('Original frozen destination refused');
 let current=root;
 for(const bit of relative){current=path.join(current,bit);if(fs.existsSync(current)){const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Output path must be real directories');}}
 // Preflight every file before writing any; unknown files are left untouched.
 for(const [file,bytes] of output){const p=path.join(destination,file);if(fs.existsSync(p)){const s=fs.lstatSync(p);if(s.isSymbolicLink()||!s.isFile()||!fs.readFileSync(p).equals(bytes))throw Error('Refuse differing existing output '+file);}}
 fs.mkdirSync(destination,{recursive:true});let writes=0,reused=0;
 for(const [file,bytes] of output){const p=path.join(destination,file);if(fs.existsSync(p))reused++;else{fs.writeFileSync(p,bytes,{flag:'wx'});writes++;}}
 console.log(JSON.stringify({status:'restored',adopted:false,variant:name,sourceSha256:spec.mapHashes['sources.json'],files:output.size,writes,reused,output:requested},null,2));
}
