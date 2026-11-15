import * as T from '../vendor/three-0.180.0/three.module.min.js';

/** Flat top-face ink; no vertices, normals, indices, relief or emissive light added. */
export function slingCoverPrint(geometry,points,material) {
  const centroid=points.reduce((s,p)=>[s[0]+p[0]/3,s[1]+p[1]/3],[0,0]);
  const inset=points.map(p=>p.map((v,j)=>centroid[j]+.78*(v-centroid[j])));
  const lengths=inset.map((_,i)=>Math.hypot(...inset[(i+1)%3].map((v,j)=>v-inset[(i+2)%3][j]))),perimeter=lengths.reduce((a,b)=>a+b,0);
  const center=[0,1].map(j=>inset.reduce((sum,p,i)=>sum+p[j]*lengths[i],0)/perimeter);
  const area=Math.abs(inset.reduce((s,p,i)=>s+p[0]*inset[(i+1)%3][1]-p[1]*inset[(i+1)%3][0],0))/2;
  const radius=Math.min(.17,.8*2*area/perimeter);
  geometry.computeBoundingBox();const box=geometry.boundingBox,minX=box.min.x-.02,minZ=box.min.z-.02,span=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)+.04,size=512;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Sling cover print requires a 2D canvas');
  const navy='#'+material.color.getHexString();ctx.fillStyle=navy;ctx.fillRect(0,0,size,size);
  const px=(center[0]-minX)/span*size,py=(center[1]-minZ)/span*size,pr=radius/span*size;
  ctx.fillStyle='#f4c531';ctx.beginPath();
  for(let k=0;k<32;k++){const angle=(k+.5)*Math.PI/16,r=pr*([.78,1,1,.78][k%4]),x=px+Math.cos(angle)*r,y=py+Math.sin(angle)*r;if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
  ctx.fillStyle=navy;ctx.beginPath();ctx.arc(px,py,pr*.43,0,Math.PI*2);ctx.fill();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const printed=material.clone();printed.color.set(0xffffff);printed.map=texture;
  const uv=geometry.attributes.uv,pos=geometry.attributes.position,norm=geometry.attributes.normal;
  for(let i=0;i<uv.count;i++)if(norm.getY(i)>.999)uv.setXY(i,(pos.getX(i)-minX)/span,1-(pos.getZ(i)-minZ)/span);else uv.setXY(i,0,0);
  uv.needsUpdate=true;
  return {material:printed,texture,registration:{center,radius,minX,minZ,span,canvasSize:size,topNormalMin:.999}};
}
