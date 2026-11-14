import * as T from '../vendor/three-0.180.0/three.module.min.js';

export function loft(rows, profile) {
  const positions = [], indices = [], size = profile(rows[0]).length;
  for (const row of rows) {
    const section = profile(row);
    const area = section.reduce((sum, p, i) => {
      const q = section[(i + 1) % section.length];
      return sum + p.dot(row.n) * q.y - q.dot(row.n) * p.y;
    }, 0);
    if (area > 0) section.reverse();
    for (const p of section) positions.push(...p.toArray());
  }
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < size; j++) {
    const a = i * size + j, b = i * size + (j + 1) % size;
    indices.push(a, b, a + size, b, b + size, a + size);
  }
  for (let j = 1; j < size - 1; j++) {
    indices.push(0, j + 1, j);
    const k = (rows.length - 1) * size; indices.push(k, k + j, k + j + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}
export const RAMP_HARDWARE_DIMENSIONS=Object.freeze({sheet:.018,lip:.025,boltRadius:.026,boltHeight:.018,strapThickness:.012});
export function rampBoltGeometry(){
 const d=RAMP_HARDWARE_DIMENSIONS;
 return new T.CylinderGeometry(d.boltRadius,d.boltRadius,d.boltHeight,6);
}
// The same closed meshes feed rendering and collision; no expanded proxy walls.
export function rampHardwareParts(input,wall) {
 const rows=input.map(r=>({...r,n:r.right.clone().sub(r.left).setY(0).normalize()}));
 const d=RAMP_HARDWARE_DIMENSIONS;
 const up=new T.Vector3(0,1,0);
 const at=(r,side,across,height)=>r[side].clone().addScaledVector(r.n,across).addScaledVector(up,height);
 const parts=[['left',-1],['right',1]].map(([side,sign])=>({
  name:side+'-outward-folded-lip',material:'chrome',group:'sheet',
  geometry:loft(rows,r=>[at(r,side,0,wall),at(r,side,sign*d.lip,wall),at(r,side,sign*d.lip,wall-d.sheet),at(r,side,0,wall-d.sheet)])
 }));
 for(const [side,sign] of [['left',-1],['right',1]])for(let i=16;i<rows.length-1;i+=32){
  parts.push({name:side+'-joint-strap-'+i,material:'brass',group:'hardware',
   geometry:loft(rows.slice(i,Math.min(rows.length,i+3)),r=>[at(r,side,sign*d.sheet,.025),at(r,side,sign*d.sheet,wall-.035),at(r,side,sign*(d.sheet+d.strapThickness),wall-.035),at(r,side,sign*(d.sheet+d.strapThickness),.025)])});
  parts.push({name:side+'-joint-bolt-'+i,material:'brass',group:'hardware',geometry:rampBoltGeometry(),position:at(rows[i],side,sign*.014,wall+.008)});
 }
 const end=rows.at(-1);
 for(const [side,sign] of [['left',-1],['right',1]])parts.push({
  name:'sheet-to-wire-'+side+'-fixing',material:'brass',group:'flaps',
  geometry:rampBoltGeometry(),position:at(end,side,sign*.015,.012)
 });
 return parts;
}

// Batch disconnected exact surfaces without adding a hull or filling gaps.
// One static collider avoids separate broadphase entries for decorative fasteners.
export function rampHardwareMesh(parts) {
 const vertices=[],indices=[],ranges=[];
 for(const part of parts){
  const vertexOffset=vertices.length/3,indexOffset=indices.length;
  const p=part.position||new T.Vector3(),a=part.geometry.attributes.position;
  for(let i=0;i<a.count;i++)vertices.push(a.getX(i)+p.x,a.getY(i)+p.y,a.getZ(i)+p.z);
  indices.push(...Array.from(part.geometry.index.array,i=>i+vertexOffset));
  ranges.push({name:part.name,vertexOffset,vertexCount:a.count,indexOffset,indexCount:part.geometry.index.count});
 }
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices),ranges};
}
