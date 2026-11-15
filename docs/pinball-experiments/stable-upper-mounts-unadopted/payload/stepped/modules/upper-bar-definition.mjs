// Stable bar datums, with a real stepped support instead of a fat full-height post.
const mountParts=Object.freeze([
  {name:'flange',radius:.055,bottomY:.005,topY:.060},
  {name:'stem',radius:.020,bottomY:.060,topY:.235}
].map(p=>Object.freeze({...p,height:p.topY-p.bottomY,y:(p.topY+p.bottomY)/2})));
export const UPPER_ROLLOVER_BARS=Object.freeze([-1.875,-.625,.625,1.875].map((x,id)=>Object.freeze({
  id,a:Object.freeze([x,.23,-5.0]),b:Object.freeze([x,.23,-4.1]),radius:.035,mountParts
})));
