from pathlib import Path
import hashlib,json
archive=Path(__file__).resolve().parent
root=archive.parents[2]
out=root/"artifacts/pinball/plunger-fit-replay"
out.mkdir(parents=True,exist_ok=True)
p=archive/"baseline-original.txt"
assert hashlib.sha256(p.read_bytes()).hexdigest()=="a6172825ea28300500d1bf08b3b10c134999a639ef813b83298b9e96bcba1f54", "Baseline hash mismatch"
s=p.read_text()
s=s.replace('"../layout.mjs"','"../../../web/js/pinball/layout.mjs"').replace('"../../vendor/three-0.180.0/three.module.min.js"','"../../../web/js/vendor/three-0.180.0/three.module.min.js"')
a=s.index('    this.sleeve("mounting-boss"')
b=s.index('    this.knob =',a)
s=s[:a]+'''    // Prototype only. Every fixed solid below supplies its own surface triangles.
    // Do not convexify the annuli: doing so would obstruct the shaft bore.
    this.sleeve("mounting-boss", .125, .074, .085, "brass", this.fixed, p.springRear + .065);
    const foot = new T.Shape();
    foot.moveTo(-.175, -.14);foot.lineTo(.175,-.14);foot.lineTo(.175,.14);foot.lineTo(-.175,.14);foot.closePath();
    for(const x of [-.135,.135])for(const z of [-.085,.085]){
      const hole=new T.Path();hole.absarc(x,z,.014,0,Math.PI*2,true);foot.holes.push(hole);
    }
    const plate=new T.ExtrudeGeometry(foot,{depth:.032,bevelEnabled:false,curveSegments:12});
    plate.rotateX(-Math.PI/2);
    this.mesh("bored-mount-foot",plate,"dark",this.fixed,p.springRear+.10,0,-.131);
    for(const side of [-1,1]) {
      this.mesh("bearing-cradle-web",new T.BoxGeometry(.025,.142,.085),"brass",this.fixed,p.springRear+.1075,side*.105,-.028);
      for(const dz of [-.085,.085]) {
        const x=side*.135,z=p.springRear+.10+dz;
        const washer=this.sleeve("mount-washer",.025,.014,.006,"chrome",this.fixed,0);
        washer.rotation.x=-Math.PI/2;washer.position.set(x,-.099,z);
        this.mesh("mount-fastener-shank",new T.CylinderGeometry(.012,.012,.18,12),"chrome",this.fixed,z,x,-.177);
        const head=this.mesh("mount-fastener-head",new T.CylinderGeometry(.022,.022,.012,6),"chrome",this.fixed,z,x,-.087);
        this.mesh("fastener-slot",new T.BoxGeometry(.025,.001,.004),"dark",head,0,0,.0065);
      }
    }
''' + s[b:]
a=s.index('    this.turned("knob-waist-and-domed-cap"')
b=s.index('    this.spring =',a)
s=s[:a]+'''    this.turned("knob-waist-and-domed-cap", [[0,-.055],[.057,-.055],[.068,-.039],
      [.07,-.005],[.092,.022],[.108,.045],[.114,.060],[.115,.075],
      [.108,.094],[.082,.108],[.040,.118],[0,.120]],"brass",this.knob);
    this.sleeve("knob-grip-band",.1155,.108,.024,"dark",this.knob,.063);
    for(let i=0;i<40;i++) {
      const angle=i*Math.PI/20;
      const tooth=this.mesh("knob-knurl",new T.BoxGeometry(.004,.005,.020),"brass",this.knob,
        .075,Math.cos(angle)*.116,Math.sin(angle)*.116);
      tooth.rotation.z=angle-Math.PI/2;
    }
''' + s[b:]
s+='''\n// Surface-exact static contact payload, in installed world coordinates.
// Intended for FIXED trimesh colliders. Never use convex hulls for bored parts.
export function fixedContactSurfaces(part) {
  part.root.updateMatrixWorld(true);const surfaces=[];
  part.fixed.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    surfaces.push({name:o.name,vertices:Array.from(g.attributes.position.array),indices:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),shape:"trimesh"});g.dispose();});
  return surfaces;
}
'''
(out/'plunger-prototype.mjs').write_text(s)
(out/'source-map.json').write_text(json.dumps({'status':'isolated prototype, not production','source':'web/js/pinball/components/plunger.mjs','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'replacedSourceLines':{'mount':[135,146],'knob':[149,158]},'unchanged':['tip','rod','spring geometry and motion','pull .32','knob front seat -.055','release duration','production controls and force'],'contactChange':'All fixed prototype surfaces exported as exact triangle meshes. These add new contacts; gameplay not invariant or verified.'},indent=2)+'\n')
