import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {BUMPERS, MINI_BUMPERS} from './layout.mjs';
/** Six reusable local effects, driven only by accepted physical bumper contacts. */
export class BumperEffects {
  constructor(root) {
    this.entries=new Map(); this.hits=0;
    this.textures=new Map();
    for(const points of [100,200,300]) {
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
      const c=canvas.getContext('2d');c.font='bold 40px sans-serif';c.textAlign='center';c.textBaseline='middle';c.strokeStyle='#09172c';c.lineWidth=7;c.strokeText('+'+points,64,32);c.fillStyle='#fff1ad';c.fillText('+'+points,64,32);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;this.textures.set(points,texture);
    }
    root.userData.ownedTextures=[...(root.userData.ownedTextures??[]),...this.textures.values()];
    const texture=this.textures.get(100);
    for(const [prefix,parts,radius,height] of [['b',BUMPERS,.48,.64],['mini',MINI_BUMPERS,.22,.40]])for(const [i,p] of parts.entries()) {
      const ring=new T.Mesh(new T.RingGeometry(radius,radius+.055,40),new T.MeshBasicMaterial({color:0xffe36b,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
      ring.rotation.x=-Math.PI/2;ring.position.set(p.x,height,p.z);root.add(ring);
      const label=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));label.scale.set(.60,.30,1);label.position.set(p.x+.24,height+.20,p.z-.20);root.add(label);
      ring.visible=false;label.visible=false;
      this.entries.set(prefix+i,{ring,label,age:1,x:p.x,z:p.z,height});
    }
  }
  reset(){for(const e of this.entries.values()){e.age=1;e.ring.visible=false;e.label.visible=false;}this.hits=0;}
  update(dt,events=[],reduced=false) {
    for(const e of this.entries.values())e.age+=Math.max(0,dt||0);
    for(const event of events){const e=this.entries.get(event.key);if(e){e.age=0;e.label.material.map=this.textures.get(event.points)||this.textures.get(100);this.hits++;}}
    for(const e of this.entries.values()){
      const duration=reduced?.20:.48,t=e.age/duration,on=t<1;
      e.ring.visible=on;e.label.visible=on;
      e.ring.material.opacity=on?(1-t)*.85:0;e.label.material.opacity=on?Math.min(1,(1-t)*2):0;
      e.ring.scale.setScalar(reduced?1:1+t*.24);
      e.label.position.y=e.height+.20+(reduced?0:t*.20);
    }
  }
}
