import fs from'node:fs';import crypto from'node:crypto';
const out='artifacts/pinball/upper-lane-joint-e283fc7',parent='artifacts/pinball/straight-shooter-roof-dfe19ba',sha=b=>crypto.createHash('sha256').update(b).digest('hex'),expected='5891d92eeed8fb333bfefc493a09d72a89c03a10d615beb9203b0d7b0f7edbfa',bytes=fs.readFileSync(parent+'/sources.json');if(sha(bytes)!==expected)throw Error('Frozen5891 mismatch');const baseline=JSON.parse(bytes),sources={...baseline},changes=[];
function edit(key,from,to){if(!sources[key]||sources[key].split(from).length!==2)throw Error('Expected unique edit in '+key+': '+from.slice(0,80));sources[key]=sources[key].replace(from,to);changes.push({key,from,to});}
const k=n=>'web/js/pinball/'+n; sources[k('upper-lane-geometry.mjs')]=fs.readFileSync(out+'/plan.mjs','utf8');changes.push({key:k('upper-lane-geometry.mjs'),added:true,content:sources[k('upper-lane-geometry.mjs')]});
edit(k('physics.mjs'),"import {installCMechanics", "import {UPPER_BARS,UPPER_LANES} from './upper-lane-geometry.mjs';\nimport {installCMechanics");
edit(k('physics.mjs'),`    for (const x of [-1.875, -.625, .625, 1.875]) this.segment([x, .23, -5.0], [x, .23, -4.1], .035);
    for (let lane = 0; lane < 3; lane++) {
      const c = this.world.createCollider(R.ColliderDesc.cuboid(.35, .16, .08)
        .setTranslation((lane - 1) * 1.25, .20, -4.55).setSensor(true));
      this.hitObjects.set(c.handle, { type: "rollover", lane, key: "lane" + lane });
    }`, `    // Shared physical bars and their existing visible mounts; no bar is removed.
    for(const bar of UPPER_BARS){
      this.segment(bar.a,bar.b,bar.radius);
      for(const end of [bar.a,bar.b])this.world.createCollider(R.ColliderDesc.cylinder(bar.mount.height/2,bar.mount.radius).setTranslation(end[0],bar.mount.y,end[2]).setRestitution(.45).setFriction(.05));
    }
    for(const lane of UPPER_LANES){
      const c=this.world.createCollider(R.ColliderDesc.cuboid(...lane.half).setTranslation(...lane.center).setRotation({x:0,y:Math.sin(lane.yaw/2),z:0,w:Math.cos(lane.yaw/2)}).setSensor(true));
      this.hitObjects.set(c.handle,{type:"rollover",lane:lane.id,key:"lane"+lane.id});
    }`);
edit(k('playfield-parts.mjs'),"import {drawCLanes", "import {UPPER_BARS,UPPER_LANES} from './upper-lane-geometry.mjs';\nimport {railCapsules,capsuleStockGeometry} from './wire-stock.mjs';\nimport {drawCLanes");
edit(k('playfield-parts.mjs'),`    for (const x of [-1.875,-.625,.625,1.875]) {
      a.tube(g,[[x,.23,-5.0],[x,.23,-4.1]],.035,"chrome");
      for(const z of [-5.0,-4.1]) a.cylinder(g,.055,.23,x,.12,z,"brass");
    }
    a.laneLamps=[];
    for (const [i,x] of [-1.25,0,1.25].entries()) {
      a.text(g,["A","B","C"][i],x,.08,-4.95,.48,.32);
      a.ring(g,.23,.018,x,.065,-4.4,"brass");
      a.laneLamps.push(a.cylinder(g,.14,.018,x,.055,-4.4,"jade"));
    }`, `    for(const bar of UPPER_BARS){
      const mesh=a.mesh(capsuleStockGeometry(railCapsules([bar.a,bar.b].map(p=>new T.Vector3(...p)),bar.radius)),"chrome",g);mesh.name="upper-bar-"+bar.id;
      for(const [i,end]of [bar.a,bar.b].entries()){const mount=a.cylinder(g,bar.mount.radius,bar.mount.height,end[0],bar.mount.y,end[2],"brass");mount.name="upper-bar-mount-"+bar.id+"-"+i;}
    }
    a.laneLamps=[];
    for(const lane of UPPER_LANES){
      const label=a.text(g,["A","B","C"][lane.id],...lane.label,.48,.32);label.name="upper-lane-label-"+lane.id;label.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),lane.yaw));
      a.ring(g,.23,.018,lane.lamp[0],.065,lane.lamp[2],"brass");
      const lamp=a.cylinder(g,.14,.018,...lane.lamp,"jade");lamp.name="upper-lane-lamp-"+lane.id;a.laneLamps.push(lamp);
    }`);
edit(k('assets.mjs'),`    const roof=UPPER_ROOF;
    for(let i=0;i<roof.length-1;i++) this.tube(g,[roof[i],roof[i+1]],.06,"chrome");`,`    const roof=UPPER_ROOF;
    const roofStock=this.mesh(capsuleStockGeometry(railCapsules(roof.map(p=>new T.Vector3(...p)),.06)),"chrome",g);roofStock.name="shared-upper-roof-stock";`);
const changed=Object.keys(sources).filter(k=>sources[k]!==baseline[k]),accepted=fs.readFileSync(parent+'/accepted-sources.json');
const manifest={status:'Frozen isolated joint upper lane proposal, NOT adopted',head:'e283fc7439c6d8d1395247462bd357987efb54d1',stable:'0b75d19770428cb6daf48f2cb7776ba109860d79',parentSourceSha256:expected,sourceSha256:sha(JSON.stringify(sources)),changedKeys:changed,unchangedKeys:Object.keys(sources).filter(k=>sources[k]===baseline[k]),scope:['Rightmost physical bar length.90/radius.035 rotated45deg; centerZ-4.55 to-4.45 to avoid roof/upper mount pinch','Other three bars same datum; all four remain with real eight existing visible mounts now matched by contact cylinders','C ground lane sensor yaw/midline and lamp/label derive from adjacent physical bars; Y.04..36 and IDs0..2 unchanged','Roof path/contact unchanged; visible roof and bars now shared inscribed capsule stock with closed ends','No force/keys/solver/rules/ramp/board/lower/longbat/upper shooter changes'],unqualified:['Installed openings/fullheight/support clearance','Local six-power/weak/ground-lane/high route falseaward checks','Reference/mobile/renderbudget/full206/natural54/denseaim'],files:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{sha256:sha(v),parentSha256:baseline[k]?sha(baseline[k]):null}]))};
const outputs={'sources.json':JSON.stringify(sources),'baseline-sources.json':bytes,'accepted-sources.json':accepted,'upper-lane-geometry.mjs':sources[k('upper-lane-geometry.mjs')],'manifest.json':JSON.stringify(manifest,null,2)+'\n','changes.json':JSON.stringify(changes,null,2)+'\n'};
for(const[n,v]of Object.entries(outputs))if(fs.existsSync(out+'/'+n)&&!fs.readFileSync(out+'/'+n).equals(Buffer.from(v)))throw Error('Refuse differing output '+n);
for(const[n,v]of Object.entries(outputs))if(!fs.existsSync(out+'/'+n))fs.writeFileSync(out+'/'+n,v,{flag:'wx'});
console.log(JSON.stringify({source:manifest.sourceSha256,parent:expected,changed,unchanged:manifest.unchangedKeys.length}));
