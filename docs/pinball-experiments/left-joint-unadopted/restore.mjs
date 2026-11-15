import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{gunzipSync}from'node:zlib';import{fileURLToPath}from'node:url';
const packet=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(packet,'../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),args=process.argv.slice(2);
if(!((args.length===1&&args[0]==='--verify-only')||(args.length===2&&args[0]==='--output')))throw Error('Use --verify-only or --output artifacts/pinball/new-name');
const spec=JSON.parse(fs.readFileSync(path.join(packet,'spec.json'))),manifest=JSON.parse(fs.readFileSync(path.join(packet,'packet-manifest.json')));
for(const [name,record]of Object.entries(manifest.files)){const f=path.resolve(packet,name);if(!f.startsWith(packet+path.sep)||hash(fs.readFileSync(f))!==record.sha256)throw Error('Packet mismatch '+name);}
for(const[file,expected]of Object.entries(JSON.parse(fs.readFileSync(path.join(packet,'dependencies.json')))))if(hash(fs.readFileSync(path.join(root,file)))!==expected)throw Error('Vendor mismatch '+file);
const source=gunzipSync(fs.readFileSync(path.join(packet,'payload/sources.json.gz'))),baseline=gunzipSync(fs.readFileSync(path.join(packet,'payload/baseline-sources.json.gz')));
if(hash(source)!==spec.sourceSHA256||hash(baseline)!==spec.baselineSHA256)throw Error('Frozen source mismatch');
if(args[0]==='--verify-only'){console.log(JSON.stringify({status:'verified',sourceSHA256:hash(source),baselineSHA256:hash(baseline),packetFiles:Object.keys(manifest.files).length,writes:0}));}else{
 const relative=args[1];if(!/^artifacts\/pinball\/[A-Za-z0-9_-]+$/.test(relative)||spec.originalDirectories.includes(relative.split('/').at(-1)))throw Error('Only new artifacts/pinball/name destinations allowed');
 const target=path.join(root,relative);let current=root;for(const bit of relative.split('/')){current=path.join(current,bit);if(fs.existsSync(current)&&(fs.lstatSync(current).isSymbolicLink()||!fs.lstatSync(current).isDirectory()))throw Error('Real directories required');}
 if(fs.existsSync(target))throw Error('Destination must not exist; no overwrite or retry reuse');
 const output=new Map([['sources.json',source],['baseline-sources.json',baseline]]);
 for(const name of ['loader.mjs','baseline-loader.mjs','definition.mjs'])output.set(name,fs.readFileSync(path.join(packet,'payload',name)));
 for(const name of fs.readdirSync(path.join(packet,'scripts'))){let text=fs.readFileSync(path.join(packet,'scripts',name),'utf8');text=text.replaceAll('artifacts/pinball/left-joint-qa-89f477e',relative).replaceAll('artifacts/pinball/left-lane-joint-89f477e',relative).replaceAll('artifacts/pinball/left-joint-regression-89f477e',relative).replaceAll('../left-lane-joint-89f477e/sources.json','./sources.json');if(name==='natural54.mjs')text=text.replaceAll("'../web/","'../../../web/");output.set(name,Buffer.from(text));}
 fs.mkdirSync(target);for(const[name,bytes]of output)fs.writeFileSync(path.join(target,name),bytes,{flag:'wx'});
 console.log(JSON.stringify({status:'restored',sourceSHA256:hash(source),baselineSHA256:hash(baseline),files:output.size,output:relative,note:'Scripts are archived originals with output/source path rebasing only; no scripts executed.'}));
}
