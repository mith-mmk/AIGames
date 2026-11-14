import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'artifacts/pinball/receiver-release-8849609'),base='884960985a413986d57aff0c2280e59a7be79dcf',key=n=>'web/js/pinball/'+n,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources={},changes=[];
for(const k of execFileSync('git',['ls-tree','-r','--name-only',base,'web/js/pinball'],{encoding:'utf8'}).trim().split('\n').filter(k=>k.endsWith('.mjs')&&!k.endsWith('.test.mjs')))sources[k]=execFileSync('git',['show',base+':'+k],{encoding:'utf8'});
const baseline={...sources};
const getModule=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const accepted=await getModule(sources[key('layout.mjs')]);
function edit(k,from,to){if(!sources[k].includes(from))throw Error('Missing source substitution '+k+': '+from);sources[k]=sources[k].replace(from,to);changes.push({key:k,from,to});}
const prior=JSON.parse(fs.readFileSync(path.join(out,'prior-c-changes.json'),'utf8'));
for(const c of prior)edit(c.key,c.from,c.to);
sources[key('lower-c-study.mjs')]=fs.readFileSync(path.join(out,'prior-c-helper.mjs'),'utf8');
const C=await getModule(sources[key('layout.mjs')]);
const terminal=accepted.lowerLanePaths(1)[0].filter(p=>p[2]>=4.02838).map(([x,y,z])=>[x+.15,y,z]);
const f=C.lowerCFrame(.5),start=f.p,end=terminal[0],delta=terminal[1].map((v,i)=>v-end[i]),length=Math.hypot(...delta),t=delta.map(v=>v/length);
const outerStart=[start[0]+.43*f.n[0],.22,start[2]+.43*f.n[2]];
const plan={chordTolerance:.0005,connector:[start,[start[0]+.20*f.t[0],.22,start[2]+.20*f.t[2]],[end[0]-.21*t[0],.22,end[2]-.21*t[2]],end],outerConnector:[outerStart,[outerStart[0]+.16*f.t[0],.22,outerStart[2]+.16*f.t[2]],[1.865,.22,4.15],[1.865,.22,4.35]],terminal,mounts:[[1.9,.22,3],[start[0],.22,start[2]],[1.435,.22,4.65],[1.35,.22,2.75],[1.35,.22,3.10],[2.33,.22,1.35],[2.33,.22,3],[outerStart[0],.22,outerStart[2]],[1.865,.22,4.65]]};
const templ=fs.readFileSync(path.join(out,'receiver-functions.mjs.txt'),'utf8').replace('__RECEIVER_LAYOUT__',JSON.stringify(plan));
const a=sources[key('layout.mjs')].indexOf('export function lowerLanePaths(side)'),b=sources[key('layout.mjs')].indexOf('// Solid backing closes');
edit(key('layout.mjs'),sources[key('layout.mjs')].slice(a,b),templ+'\n');
edit(key('layout.mjs'),'// Endpoint datums only; actual paths come from lowerCFrame below.\n  guide: [[1.90,.22,3.00],[1.485,.22,4.10],[1.485,.22,4.85]],','// Endpoint datums only; authoritative sampled paths are receiverRightPaths.\n  guide: [[1.90,.22,3.00],'+JSON.stringify(end)+',[1.435,.22,4.85]],');
edit(key('layout.mjs'),'outlaneOuter: [[2.33,.22,1.35],[2.33,.22,3.00],[1.915,.22,4.10],[1.915,.22,4.85]]','outlaneOuter: [[2.33,.22,1.35],[2.33,.22,3.00],[1.865,.22,4.35],[1.865,.22,4.85]]');
edit(key('lower-c-study.mjs'),'lowerCFrame,lowerLanePaths','lowerCFrame,receiverDividerFrame,lowerLanePaths');
edit(key('lower-c-study.mjs'),'const f=lowerCFrame(i/40);','const f=receiverDividerFrame(i/40);');
const encoded=JSON.stringify(sources),manifest={status:'One assembled receiver-release candidate; not adopted',base,priorCFrozenSources:'f956dcc144691d8cb8a35c676ead2795f7dd04dc173a143b6ad043f80b6ccdc3',sourceSha256:hash(encoded),fullSuiteBaseline:202,changedKeys:Object.keys(sources).filter(k=>sources[k]!==baseline[k]),unchangedSourceKeys:Object.keys(baseline).filter(k=>sources[k]===baseline[k]),files:Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,{sha256:hash(s),baselineSha256:baseline[k]?hash(baseline[k]):null}])),dimensions:plan,fixed:['Board/shooter/upper/ramp/nose/wire/slings','Bat profile/length/angles; C pivot X+/-1.40/Z4.45','Keys, force formulas, masses, solver, existing physics materials','C fixed save mesh/contact/frame/impulse/conditions; no moving actuation added','Accepted 8849609 wire-stock rendering'],changedFromC:['Divider connector and translated accepted receiver','OUT tail connector','Lower mount stations: 9 per side','Noncolliding route ribbon follows the actual changed divider'],limits:['Arrival/capture/release/aim not yet tested','Receiver support span and all-height clearance remain gates','Static save and incomplete coil bracket remain unfinished','Geometry source uses full-precision accepted samples rather than rounded concept diagram','No full202 suite, natural54 or continuous aiming qualification performed on this source']};
const outputs={'sources.json':encoded,'baseline-sources.json':JSON.stringify(baseline),'changes.json':JSON.stringify(changes,null,2),'manifest.json':JSON.stringify(manifest,null,2)};
// Do not silently overwrite a source freeze, including on a repeated build.
for(const [name,bytes]of Object.entries(outputs)){const p=path.join(out,name);if(fs.existsSync(p)&&fs.readFileSync(p,'utf8')!==bytes)throw Error('Refusing differing existing output: '+name);}
for(const [name,bytes]of Object.entries(outputs)){const p=path.join(out,name);if(!fs.existsSync(p))fs.writeFileSync(p,bytes,{flag:'wx'});}
console.log(JSON.stringify({sourceSha256:manifest.sourceSha256,changedKeys:manifest.changedKeys,unchanged:manifest.unchangedSourceKeys.length},null,2));
