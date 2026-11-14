import {registerHooks} from 'node:module';
// Accepted upper route parameters are datums, independent of lower-route arc length.
const upper=[57,78,99,116,130,141,152,163,173,181,188,192,240];
registerHooks({load(u,c,next){const r=next(u,c);if(!u.endsWith('/ramp-geometry.mjs'))return r;const needle='  return stations.filter(i=>rows[i].p.y>=.46||rows[i].p.x<0).map(i=>{';let s=String(r.source);if(!s.includes(needle))throw Error('Support station hook missing');s=s.replace(needle,`  const pinnedUpper=${JSON.stringify(upper)}.map(i=>Math.round(i*(rows.length-1)/240));
  const lower=stations.filter(i=>i/(rows.length-1)<48/240);
  stations.splice(0,stations.length,...new Set([...lower,...pinnedUpper]));
`+needle);r.source=s;return r;}});
