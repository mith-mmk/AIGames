import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {TABLE} from './layout.mjs';

// Table-local art estimates, not manufacturer hardware dimensions. Keep the
// torus opening and the six-sided head; a solid disc is not an equivalent part.
export function cabinetScrewParts(name,x,y,z,shankLength=.10) {
 return [
  {name:`${name}-washer`,geometry:new T.TorusGeometry(.040,.008,6,16),material:'brass',position:[x,y,z],rotationX:Math.PI/2,contact:'trimesh'},
  {name:`${name}-hex-head`,geometry:new T.CylinderGeometry(.026,.026,.022,6),material:'metal',position:[x,y+.012,z],rotationX:0,contact:'convex'},
  // The neck beneath the head has only .005 clearance above the board skin.
  // A .135-radius ball cannot access it; the remaining shaft is in the board.
  {name:`${name}-shank`,geometry:new T.CylinderGeometry(.014,.014,shankLength,12),material:'metal',position:[x,y-shankLength/2+.012,z],rotationX:0,contact:null}
 ];
}
export function boardEdgeFasteners({width=TABLE.width,length=TABLE.length,centerZ=TABLE.centerZ,boardTop=.04,boardThickness=.18}={}) {
 const W=width/2,L=length/2;
 return [-1,1].flatMap(side=>[-L+.40,-L/2,0,L/2,L-.40].map(z=>({
  name:`board-edge-${side}-${z}`,position:[side*(W-.09),boardTop+.008,z+centerZ],shankLength:boardThickness+.08
 })));
}
// Append after existing contacts, preserving their allocation order. R is the
// already initialized Rapier module. No rendered cabinet/materials are built.
export function appendBoardEdgeFasteners(world,R,options) {
 const contacts=[];
 for(const fastener of boardEdgeFasteners(options)) {
  for(const part of cabinetScrewParts(fastener.name,...fastener.position,fastener.shankLength)) {
   try {
    if(!part.contact)continue;
    const matrix=new T.Matrix4().compose(new T.Vector3(...part.position),
     new T.Quaternion().setFromEuler(new T.Euler(part.rotationX,0,0)),new T.Vector3(1,1,1));
    part.geometry.applyMatrix4(matrix);
    const vertices=new Float32Array(part.geometry.attributes.position.array);
    const desc=part.contact==='trimesh'
     ?R.ColliderDesc.trimesh(vertices,new Uint32Array(part.geometry.index.array))
     :R.ColliderDesc.convexHull(vertices);
    if(!desc)throw new Error(`Cannot create cabinet fastener contact: ${part.name}`);
    const collider=world.createCollider(desc.setRestitution(.35).setFriction(.08));
    contacts.push({name:part.name,collider});
   }finally{part.geometry.dispose();}
  }
 }
 return contacts;
}
