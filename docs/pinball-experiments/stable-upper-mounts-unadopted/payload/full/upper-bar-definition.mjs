// Existing stable upper rollover hardware. No lane, axis or scoring changes.
export const UPPER_ROLLOVER_BARS = Object.freeze([-1.875,-.625,.625,1.875].map((x,id)=>Object.freeze({
  id, a:Object.freeze([x,.23,-5.0]), b:Object.freeze([x,.23,-4.1]), radius:.035,
  mount:Object.freeze({radius:.055,height:.23,y:.12})
})));
