import {TABLE} from './layout.mjs';

// Play-facing side/rear containment, not a collider model of exterior timber.
// Solid backing plus a flush cap replace the former hollow channel. Their
// union is exactly the box used by physics; no invisible upper wall remains.
export const CABINET_BOUNDARY = Object.freeze({bottom:-.05,top:.385,thickness:.14,capThickness:.022,endOverhang:.10,sideOffset:.05,rearOffset:.05});
export function cabinetBoundaryBoxes({width=TABLE.width,length=TABLE.length,centerZ=TABLE.centerZ}={}) {
 const d=CABINET_BOUNDARY,y=(d.bottom+d.top)/2,h=d.top-d.bottom;
 return [
  ...[-1,1].map(side=>({name:side<0?'left':'right',center:[side*(width/2+d.sideOffset),y,centerZ],size:[d.thickness,h,length+2*d.endOverhang]})),
  {name:'rear',center:[0,y,centerZ-length/2-d.rearOffset],size:[width+2*d.sideOffset,h,d.thickness]}
 ];
}
export function cabinetBoundaryLayers(box) {
 const d=CABINET_BOUNDARY;
 return [
  {name:'backing',center:[box.center[0],(d.bottom+d.top-d.capThickness)/2,box.center[2]],size:[box.size[0],box.size[1]-d.capThickness,box.size[2]]},
  {name:'cap',center:[box.center[0],d.top-d.capThickness/2,box.center[2]],size:[box.size[0],d.capThickness,box.size[2]]}
 ];
}
