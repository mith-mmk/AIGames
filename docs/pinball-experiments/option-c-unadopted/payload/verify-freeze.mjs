import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=fileURLToPath(new URL('./',import.meta.url)),root=path.resolve(dir,'../../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const d=JSON.parse(fs.readFileSync(path.join(dir,'dependencies.json')));
let checked=0;
for(const [relative,want] of Object.entries(d.files)){
 const b=fs.readFileSync(path.join(root,relative));
 if(b.length!==want.bytes||hash(b)!==want.sha256)throw Error('Frozen dependency mismatch: '+relative);
 checked++;
}
const sources=JSON.parse(fs.readFileSync(path.join(dir,'sources.json'))),base=JSON.parse(fs.readFileSync(path.join(dir,'baseline-sources.json'))),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
if(hash(fs.readFileSync(path.join(dir,'sources.json')))!==manifest.sourceSha256)throw Error('Source map mismatch');
let unchanged=0;
for(const [key,source] of Object.entries(base)){
 const actual=execFileSync('git',['show','c1f7aeb:'+key],{cwd:root,encoding:'utf8'});
 if(actual!==source)throw Error('Baseline blob mismatch '+key);
 if(sources[key]===actual)unchanged++;
 const entry=manifest.files[key];
 if(entry.baselineSha256!==hash(actual)||entry.sha256!==hash(sources[key]))throw Error('Module hash mismatch '+key);
}
if(unchanged!==33)throw Error('Expected 33 unchanged modules, found '+unchanged);
const actualChanged=Object.keys(sources).filter(k=>sources[k]!==base[k]);
if(JSON.stringify(actualChanged)!==JSON.stringify(manifest.changedKeys))throw Error('Changed source keys mismatch');
const virtual='web/js/pinball/lower-c-study.mjs';
if(hash(sources[virtual])!==manifest.files[virtual].sha256)throw Error('Helper hash mismatch');
console.log(JSON.stringify({status:'Frozen bytes verified; no geometry or natural-play qualification implied',dependenciesChecked:checked,sourceSha256:manifest.sourceSha256,unchangedOriginalModules:unchanged,changedKeys:actualChanged},null,2));
