import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {RAMP_HARDWARE_DIMENSIONS} from './ramp-hardware.mjs';

// Parameters, not row numbers, locate the measured right-hand support pockets.
// Generic rows without route metadata keep their original diagonal faces.
export const RAMP_DECK_REPAIR = Object.freeze({start:77/240,end:80/240});

export function rampDeckGeometry(rows,mode='solid',open=0) {
  if(!['top','solid','contact'].includes(mode))throw new RangeError(`Unknown ramp deck mode: ${mode}`);
  const repairs=new Set(rows.flatMap((row,i)=> {
    const inside=i<rows.length-1 && Number.isFinite(row.parameter) &&
      row.parameter>=RAMP_DECK_REPAIR.start-1e-10 &&
      rows[i+1].parameter<=RAMP_DECK_REPAIR.end+1e-10;
    return inside?[i]:[];
  }));
  const points=rows.flatMap(row=>[row.left.clone(),row.right.clone()]);
  const mids=new Map();
  const mid=(i,j)=> {
    const key=[i,j].sort((a,b)=>a-b).join(',');
    if(!mids.has(key)) {
      mids.set(key,points.push(points[i].clone().add(points[j]).multiplyScalar(.5))-1);
    }
    return mids.get(key);
  };

  // A bilinear center replaces the original diagonal only inside the repair.
  // Shared boundary midpoints split neighboring triangles without moving planes.
  const grids=new Map();
  for(const i of repairs) {
    const a=i*2,b=a+2;
    grids.set(i,[
      [a,mid(a,a+1),a+1],
      [mid(a,b),points.push(points[a].clone().add(points[a+1]).add(points[b]).add(points[b+1]).multiplyScalar(.25))-1,mid(a+1,b+1)],
      [b,mid(b,b+1),b+1]
    ]);
  }
  const layerSize=points.length;
  const positions=points.flatMap(p=>p.toArray());
  for(const p of points)positions.push(p.x,p.y-RAMP_HARDWARE_DIMENSIONS.sheet,p.z);

  const faces=[];
  const add=(strip,...tri)=>faces.push({strip,tri});
  for(let i=0;i<rows.length-1;i++) {
    const k=i*2,j=k+2;
    if(repairs.has(i)) {
      const grid=grids.get(i);
      for(let t=0;t<2;t++)for(let u=0;u<2;u++) {
        const p=grid[t][u],q=grid[t][u+1],r=grid[t+1][u],s=grid[t+1][u+1];
        add(i,p,q,r);
        add(i,q,s,r);
      }
    } else {
      const front=mids.get([k,k+1].join(','));
      const rear=mids.get([j,j+1].join(','));
      if(front!==undefined) {
        add(i,k,front,j);
        add(i,front,k+1,j);
      } else add(i,k,k+1,j);
      if(rear!==undefined) {
        add(i,k+1,j+1,rear);
        add(i,k+1,rear,j);
      } else add(i,k+1,j+1,j);
    }
  }

  // All modes share the lower skin. Contact mode omits existing deck-top faces
  // and the sealed low-base interior rather than duplicating their contacts.
  const indices=[];
  for(const {strip,tri} of faces) {
    if(mode!=='contact')indices.push(...tri);
    if(mode==='solid'||(mode==='contact'&&strip>=open)) {
      indices.push(tri[0]+layerSize,tri[2]+layerSize,tri[1]+layerSize);
    }
  }
  const side=(p,q,isLeft)=> {
    const tri=isLeft?
      [p,q,p+layerSize,q,q+layerSize,p+layerSize]:
      [p,p+layerSize,q,q,p+layerSize,q+layerSize];
    indices.push(...tri);
  };
  if(mode!=='top') {
    for(let i=mode==='contact'?open:0;i<rows.length-1;i++) {
      const k=i*2,j=k+2;
      if(repairs.has(i)) {
        const left=grids.get(i)[1][0],right=grids.get(i)[1][2];
        side(k,left,true);
        side(left,j,true);
        side(k+1,right,false);
        side(right,j+1,false);
      } else {
        side(k,j,true);
        side(k+1,j+1,false);
      }
    }
    for(const i of mode==='solid'?[0,rows.length-1]:[rows.length-1]) {
      const k=i*2,l=k+1,m=mids.get([k,l].join(','));
      const spans=m===undefined?[[k,l]]:[[k,m],[m,l]];
      for(const [a,b] of spans) {
        const lo=a+layerSize,ro=b+layerSize;
        indices.push(...(i===0?[a,lo,b,b,lo,ro]:[a,b,lo,b,ro,lo]));
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData={firstOpenRow:open,repairStrips:[...repairs]};
  return geometry;
}
