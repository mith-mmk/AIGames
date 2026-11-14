import * as T from '../vendor/three-0.180.0/three.module.min.js';

// Analytic physical capsule stock, rendered with an explicitly inscribed mesh.
// Merge per rail: rounded joins must not become hundreds of extra draw calls.
export const WIRE_STOCK_MESH = Object.freeze({radialSegments:12,capSegments:4});
export function railCapsules(points,radius) {
  return points.slice(1).map((b,i)=> {
    const a=points[i],delta=b.clone().sub(a),center=a.clone().add(b).multiplyScalar(.5);
    return {
      radius,halfHeight:delta.length()/2,center,
      rotation:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize())
    };
  });
}

export function capsuleStockGeometry(parts) {
  const positions=[],normals=[],indices=[],ranges=[];
  for(const part of parts) {
    const g=new T.CapsuleGeometry(part.radius,part.halfHeight*2,WIRE_STOCK_MESH.capSegments,WIRE_STOCK_MESH.radialSegments);
    g.applyQuaternion(part.rotation);
    g.translate(part.center.x,part.center.y,part.center.z);
    const start=positions.length/3,indexStart=indices.length;
    positions.push(...g.attributes.position.array);
    normals.push(...g.attributes.normal.array);
    // Only known pole faces may be omitted. Float32 transforms can also
    // collapse ordinary faces; preserve those and distinct pole samples.
    const p=g.attributes.position,ix=g.index.array,radial=WIRE_STOCK_MESH.radialSegments,faces=ix.length/3;
    const equal=(a,b)=>p.getX(a)===p.getX(b)&&p.getY(a)===p.getY(b)&&p.getZ(a)===p.getZ(b);
    for(let face=0;face<faces;face++){
      const k=face*3,a=ix[k],b=ix[k+1],c=ix[k+2];
      const pole=(face<radial*2&&face%2===0)||(face>=faces-radial*2&&face%2===1);
      if(pole&&(equal(a,b)||equal(b,c)||equal(a,c)))continue;
      indices.push(a+start,b+start,c+start);
    }
    ranges.push({vertexStart:start,vertexCount:p.count,indexStart,indexCount:indices.length-indexStart});
    g.dispose();
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  geometry.userData={primitiveRanges:ranges,...WIRE_STOCK_MESH};
  return geometry;
}
