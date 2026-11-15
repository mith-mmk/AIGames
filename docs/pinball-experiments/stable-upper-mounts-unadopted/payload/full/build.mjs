import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='artifacts/pinball/stable-upper-mounts-527764b',base='79d7b91a8a71f6c010722ab65a6200459253c902';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=execFileSync('git',['ls-tree','-r','--name-only',base,'web/js/pinball'],{encoding:'utf8'}).trim().split('\n').filter(k=>k.endsWith('.mjs')&&!k.endsWith('.test.mjs'));
const baseline=Object.fromEntries(files.map(k=>[k,execFileSync('git',['show',base+':'+k],{encoding:'utf8'})]));
for(const[k,v]of Object.entries(baseline))if(fs.readFileSync(k,'utf8')!==v)throw Error('Current runtime differs from pinned stable: '+k);
const control={...baseline},changes=[];
const key=n=>'web/js/pinball/'+n;
function edit(map,k,from,to){if(map[k].split(from).length!==2)throw Error('Not a unique exact edit: '+k);map[k]=map[k].replace(from,to);changes.push({key:k,from,to});}
control[key('upper-bar-definition.mjs')]=fs.readFileSync(out+'/upper-bar-definition.mjs','utf8');
edit(control,key('playfield-parts.mjs'),'import {targetCarrierParts',"import {UPPER_ROLLOVER_BARS} from './upper-bar-definition.mjs';\nimport {railCapsules,capsuleStockGeometry} from './wire-stock.mjs';\nimport {targetCarrierParts");
edit(control,key('playfield-parts.mjs'),`    for (const x of [-1.875,-.625,.625,1.875]) {
      a.tube(g,[[x,.23,-5.0],[x,.23,-4.1]],.035,"chrome");
      for(const z of [-5.0,-4.1]) a.cylinder(g,.055,.23,x,.12,z,"brass");
    }`,`    for(const bar of UPPER_ROLLOVER_BARS) {
      const stock=a.mesh(capsuleStockGeometry(railCapsules([bar.a,bar.b].map(p=>new T.Vector3(...p)),bar.radius)),"chrome",g);
      stock.name="upper-rollover-bar-"+bar.id;
      for(const [i,end]of [bar.a,bar.b].entries()) {
        const mount=a.cylinder(g,bar.mount.radius,bar.mount.height,end[0],bar.mount.y,end[2],"brass");
        mount.name="upper-rollover-mount-"+bar.id+"-"+i;
      }
    }`);
const candidate={...control};
edit(candidate,key('physics.mjs'),'import {appendBoardEdgeFasteners}',"import {UPPER_ROLLOVER_BARS} from './upper-bar-definition.mjs';\nimport {appendBoardEdgeFasteners}");
edit(candidate,key('physics.mjs'),'    this.boardFastenerContacts=appendBoardEdgeFasteners(this.world,R);',`    this.boardFastenerContacts=appendBoardEdgeFasteners(this.world,R);
    // Match the existing eight visible supports, after all existing handles.
    this.upperBarMountContacts=UPPER_ROLLOVER_BARS.flatMap(bar=>[bar.a,bar.b].map(end=>
      this.world.createCollider(R.ColliderDesc.cylinder(bar.mount.height/2,bar.mount.radius)
        .setTranslation(end[0],bar.mount.y,end[2]).setRestitution(.45).setFriction(.05))));`);
edit(candidate,key('physics.mjs'),'    for (const x of [-1.875, -.625, .625, 1.875]) this.segment([x, .23, -5.0], [x, .23, -4.1], .035);','    for(const bar of UPPER_ROLLOVER_BARS) this.segment(bar.a,bar.b,bar.radius);');
const controlKeys=Object.keys(control).filter(k=>control[k]!==baseline[k]),candidateKeys=Object.keys(candidate).filter(k=>candidate[k]!==baseline[k]);
const manifest={status:'Frozen isolated stable-only trial; NOT adopted',base,headAtBuild:'527764b7df493cc8b817a98ec77f6a9dc64ba939',baselineSha256:sha(JSON.stringify(baseline)),renderControlSha256:sha(JSON.stringify(control)),candidateSha256:sha(JSON.stringify(candidate)),changedKeys:{renderControl:controlKeys,candidate:candidateKeys},unchangedKeys:files.filter(k=>candidate[k]===baseline[k]),fileHashes:Object.fromEntries(Object.entries(candidate).map(([k,v])=>[k,{candidate:sha(v),baseline:baseline[k]?sha(baseline[k]):null,renderControl:sha(control[k])}])),scope:['Original four bar axes/length/radius and eight visible cylinder dimensions retained','Render-only control changes one renderer plus adds shared definition; physics byte-identical','Candidate changes two existing modules plus shared definition; eight contacts appended after every stable collider','Roof/shooter/board/lower/ramp/sensors/lamps/labels/rules/force/keys/solver unchanged','Mount restitution.45/friction.05 match existing passive bar convention; these new surfaces have no established old coefficients'],notQualified:['Natural routes and stop/regression impact of added contacts','All207 original tests,31power/ramp-wire/entry120','Reference likeness and installed budget/phone/human play']};
const outputs={'baseline-sources.json':JSON.stringify(baseline),'render-sources.json':JSON.stringify(control),'sources.json':JSON.stringify(candidate),'manifest.json':JSON.stringify(manifest,null,2)+'\n','changes.json':JSON.stringify(changes,null,2)+'\n'};
for(const[n,b]of Object.entries(outputs))if(fs.existsSync(out+'/'+n)&&!fs.readFileSync(out+'/'+n).equals(Buffer.from(b)))throw Error('Refuse differing frozen output '+n);
for(const[n,b]of Object.entries(outputs))if(!fs.existsSync(out+'/'+n))fs.writeFileSync(out+'/'+n,b,{flag:'wx'});
console.log(JSON.stringify({baseline:manifest.baselineSha256,renderControl:manifest.renderControlSha256,candidate:manifest.candidateSha256,changed:candidateKeys,unchanged:manifest.unchangedKeys.length}));
