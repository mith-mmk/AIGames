import * as T from '../vendor/three-0.180.0/three.module.min.js';

/** Shared installed dimensions. The open mouth faces the flippers (+Z). */
const scoopZ=.19;
export const SCOOP = Object.freeze({
  x: -.81, z: scoopZ, width: .48, depth: .44, floorY: .04,
  wall: .06, wallHeight: .36, roofThickness: .035, holdSeconds: .8,
  // Leave the full ball clearance between the upstream rear and yellow targets.
  mouthZ: scoopZ+.25, captureZ: scoopZ+.05, captureY: .175,
});

/** All exposed chamber panels are built from the same solids as contact. */
export function scoopContactBoxes() {
  const s=SCOOP;
  const outerWidth=s.width+2*s.wall, outerDepth=s.depth+s.wall;
  const wallY=s.floorY+s.wallHeight/2;
  return [
    {name:'left-cheek',center:[s.x-(s.width+s.wall)/2,wallY,s.z],size:[s.wall,s.wallHeight,outerDepth]},
    {name:'right-cheek',center:[s.x+(s.width+s.wall)/2,wallY,s.z],size:[s.wall,s.wallHeight,outerDepth]},
    {name:'chamber-roof',center:[s.x,s.floorY+s.wallHeight+s.roofThickness/2,s.z],size:[outerWidth,s.roofThickness,outerDepth]},
  ];
}

/** Solid sloping upstream rear sheds downhill balls right, away from the loop.
 * The same eight vertices build the visible prism and its convex contact hull. */
export function scoopRearGeometry() {
  const s=SCOOP,h=(s.width+2*s.wall)/2;
  const plan=[[s.x-h,s.z-.43],[s.x+h,s.z-.25],[s.x+h,s.z-.19],[s.x-h,s.z-.19]];
  const positions=[];
  for(const y of [s.floorY,s.floorY+s.wallHeight])for(const [x,z] of plan)positions.push(x,y,z);
  const indices=[0,2,1,0,3,2,4,5,6,4,6,7];
  for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,j+4,i,j+4,i+4);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
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
    a.mesh(scoopRearGeometry(),'steel',g).name='scoop-sloping-rear-deflector';
    // The chamber remains genuinely open at the front, not a painted target.
    const liner=a.box(g,s.width,.004,s.depth,s.x,.047,s.z,'rubber');
    liner.name='scoop-dark-chamber-floor';
    // Folded external bonnet: shallow continuous arch with rolled leading lip.
    const hood=new T.Shape();
    hood.moveTo(-.30,.435);hood.quadraticCurveTo(0,.60,.30,.435);
    hood.lineTo(.30,.45);hood.quadraticCurveTo(0,.615,-.30,.45);hood.closePath();
    const shell=a.mesh(new T.ExtrudeGeometry(hood,{depth:.50,bevelEnabled:false,curveSegments:16,steps:1}),'chrome',g,s.x,0,s.z-.25);
    shell.name='scoop-formed-bonnet';
    for(const z of [s.z-.24,s.z+.24]) {
      const arc=[];for(let i=0;i<=16;i++){const t=i/16;arc.push([s.x-.30+.60*t,.45+.33*t*(1-t),z]);}
      const curve=new T.CatmullRomCurve3(arc.map(p=>new T.Vector3(...p)));
      a.mesh(new T.TubeGeometry(curve,24,.012,8,false),'brass',g).name='scoop-rolled-bonnet-lip';
    }
    // Mounts are outside the playable mouth and flush with the board.
    for(const side of [-1,1]) {
      a.box(g,.10,.025,.46,s.x+side*.32,.057,s.z,'chrome').name='scoop-mounting-flange';
      for(const dz of [-.18,.18])a.screw(g,s.x+side*.32,.076,s.z+dz);
    }
    a.text(g,'SERVICE',s.x,.54,s.z-.06,.44,.09,'#e8bf61');
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
