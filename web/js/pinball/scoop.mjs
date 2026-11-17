import * as T from '../vendor/three-0.180.0/three.module.min.js';

/** Shared installed dimensions. The open mouth faces the flippers (+Z). */
export const SCOOP = Object.freeze({
  x: -.90, z: .45, width: .64, depth: .65, floorY: .04,
  wall: .06, wallHeight: .48, holdSeconds: .8,
  mouthZ: .775, captureZ: .45, captureY: .175,
});

/** All exposed chamber panels are built from the same solids as contact. */
export function scoopContactBoxes() {
  const s=SCOOP;
  return [
    {name:'left-cheek',center:[s.x-.35,.28,s.z],size:[.06,.48,.71]},
    {name:'right-cheek',center:[s.x+.35,.28,s.z],size:[.06,.48,.71]},
    {name:'backstop',center:[s.x,.28,s.z-.355],size:[.76,.48,.06]},
    {name:'chamber-roof',center:[s.x,.5425,s.z],size:[.76,.045,.71]},
  ];
}

export class MechanicalScoop {
  constructor(assets) {
    this.a=assets;this.root=new T.Group();this.root.name='service-scoop';
    this.lamps=[];
    this.build();
  }
  build() {
    const a=this.a,g=this.root,s=SCOOP;
    for(const part of scoopContactBoxes()) {
      const mesh=a.box(g,...part.size,...part.center,'steel');
      mesh.name='scoop-'+part.name;
    }
    // The chamber remains genuinely open at the front, not a painted target.
    const liner=a.box(g,s.width,.004,s.depth,s.x,.047,s.z,'rubber');
    liner.name='scoop-dark-chamber-floor';
    // Folded external bonnet: shallow continuous arch with rolled leading lip.
    const hood=new T.Shape();
    hood.moveTo(-.38,.565);hood.quadraticCurveTo(0,.78,.38,.565);
    hood.lineTo(.38,.585);hood.quadraticCurveTo(0,.80,-.38,.585);hood.closePath();
    const shell=a.mesh(new T.ExtrudeGeometry(hood,{depth:.71,bevelEnabled:false,curveSegments:16,steps:1}),'chrome',g,s.x,0,s.z-.355);
    shell.name='scoop-formed-bonnet';
    for(const z of [s.z-.34,s.z+.34]) {
      const arc=[];for(let i=0;i<=16;i++){const t=i/16;arc.push([s.x-.38+.76*t,.585+.43*t*(1-t),z]);}
      const curve=new T.CatmullRomCurve3(arc.map(p=>new T.Vector3(...p)));
      a.mesh(new T.TubeGeometry(curve,24,.012,8,false),'brass',g).name='scoop-rolled-bonnet-lip';
    }
    // Mounts are outside the playable mouth and flush with the board.
    for(const side of [-1,1]) {
      a.box(g,.15,.025,.66,s.x+side*.415,.057,s.z,'chrome').name='scoop-mounting-flange';
      for(const dz of [-.24,.24])a.screw(g,s.x+side*.415,.076,s.z+dz);
    }
    a.text(g,'SERVICE',s.x,.80,s.z-.06,.56,.11,'#e8bf61');
    const arrow=new T.Shape();arrow.moveTo(0,-.20);arrow.lineTo(.12,-.02);arrow.lineTo(.055,-.02);arrow.lineTo(.055,.19);arrow.lineTo(-.055,.19);arrow.lineTo(-.055,-.02);arrow.lineTo(-.12,-.02);arrow.closePath();
    const arrowMesh=a.mesh(new T.ShapeGeometry(arrow),a.materials.insert.clone(),g,s.x,.052,s.mouthZ+.31);
    arrowMesh.rotation.x=Math.PI/2;arrowMesh.name='scoop-entry-arrow';this.arrow=arrowMesh;
    for(let i=0;i<3;i++) {
      const x=s.x+(i-1)*.14,z=s.mouthZ+.60;
      a.ring(g,.043,.009,x,.053,z,'chrome');
      const mat=a.materials.insert.clone();
      const lens=a.cylinder(g,.035,.006,x,.055,z,mat);
      lens.name='scoop-target-lamp-'+i;this.lamps.push(lens);
    }
    this.update({});
    a.batchStaticAssembly(g,new Set([this.arrow,...this.lamps]));
  }
  update(snapshot={}) {
    const targets=snapshot.targets??[];
    for(let i=0;i<3;i++) {
      const on=snapshot.lit||targets[i]===true;
      this.lamps[i].material.emissiveIntensity=on?1.2:.02;
      this.lamps[i].material.color.setHex(on?0xffd44e:0x594821);
    }
    this.arrow.material.emissiveIntensity=snapshot.lit?1.5:.02;
    this.arrow.material.color.setHex(snapshot.lit?0xffdb61:0x80632c);
  }
}
