import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {LOWER_LAYOUT} from './layout.mjs';

export const SHOOTER_OUTER_RAIL=Object.freeze({x:2.72,y:.23,radius:.06,frontZ:4.55+LOWER_LAYOUT.downstreamOffset,rearZ:-4.15,sides:8});
export function shooterOuterRailGeometry() {
 const d=SHOOTER_OUTER_RAIL;
 const curve=new T.CatmullRomCurve3([new T.Vector3(d.x,d.y,d.frontZ),new T.Vector3(d.x,d.y,d.rearZ)]);
 const geometry=new T.TubeGeometry(curve,1,d.radius,d.sides,false);
 const positions=Array.from(geometry.attributes.position.array),normals=Array.from(geometry.attributes.normal.array),uv=Array.from(geometry.attributes.uv.array),indices=Array.from(geometry.index.array);
 geometry.userData.sideVertexCount=geometry.attributes.position.count;
 // Preserve every existing octagonal side vertex/index. Duplicate ring vertices
 // only for flat cap normals: this is solid stock, not a hollow pipe proxy.
 for(const [ring,normalZ] of [[0,1],[1,-1]]) {
  const first=positions.length/3;
  for(let i=0;i<d.sides;i++){
   const source=(ring*(d.sides+1)+i)*3;
   positions.push(...positions.slice(source,source+3));normals.push(0,0,normalZ);uv.push(0,0);
  }
  for(let i=1;i<d.sides-1;i++){
   const a=first,b=first+i,c=first+i+1;
   const p=new T.Vector3().fromArray(positions,a*3),q=new T.Vector3().fromArray(positions,b*3),r=new T.Vector3().fromArray(positions,c*3);
   if(q.sub(p).cross(r.sub(p)).z*normalZ>0)indices.push(a,b,c);else indices.push(a,c,b);
  }
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
 return geometry;
}
export function shooterOuterRailContactVertices(geometry) {
 // Cap duplicates add no new extrema; retain tested hull input ordering.
 return geometry.attributes.position.array.slice(0,geometry.userData.sideVertexCount*3);
}
