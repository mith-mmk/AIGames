import {TABLE} from './layout.mjs';

// Play-facing solid backing and flush cap. Rendering and contact consume the
// same sections: no invisible wall and no raised lip along the elevated route.
export const CABINET_BOUNDARY = Object.freeze({bottom:-.05,top:.385,lowerTop:.75,lowerStartZ:1.2,thickness:.14,capThickness:.022,endOverhang:.10,sideOffset:.05,rearOffset:.05});
export function cabinetBoundaryTop(z) {
 return z>=CABINET_BOUNDARY.lowerStartZ?CABINET_BOUNDARY.lowerTop:CABINET_BOUNDARY.top;
}
export function cabinetBoundaryBoxes({width=TABLE.width,length=TABLE.length,centerZ=TABLE.centerZ}={}) {
 const d=CABINET_BOUNDARY,rear=centerZ-length/2-d.endOverhang,front=centerZ+length/2+d.endOverhang;
 // The lower guard contains the two observed airborne escapes. Upper walls
 // retain their original height, preserving access to the ramp's outer lips.
 const split=Math.max(rear,Math.min(front,d.lowerStartZ));
 return [
  ...[-1,1].flatMap(side=>[
   {name:(side<0?'left':'right')+'-upper',center:[side*(width/2+d.sideOffset),(d.bottom+d.top)/2,(rear+split)/2],size:[d.thickness,d.top-d.bottom,split-rear]},
   {name:(side<0?'left':'right')+'-lower',center:[side*(width/2+d.sideOffset),(d.bottom+d.lowerTop)/2,(split+front)/2],size:[d.thickness,d.lowerTop-d.bottom,front-split]},
  ]),
  {name:'rear',center:[0,(d.bottom+d.top)/2,centerZ-length/2-d.rearOffset],size:[width+2*d.sideOffset,d.top-d.bottom,d.thickness]}
 ];
}
export function cabinetBoundaryLayers(box) {
 const d=CABINET_BOUNDARY,top=box.center[1]+box.size[1]/2;
 return [
  {name:'backing',center:[box.center[0],box.center[1]-d.capThickness/2,box.center[2]],size:[box.size[0],box.size[1]-d.capThickness,box.size[2]]},
  {name:'cap',center:[box.center[0],top-d.capThickness/2,box.center[2]],size:[box.size[0],d.capThickness,box.size[2]]}
 ];
}
