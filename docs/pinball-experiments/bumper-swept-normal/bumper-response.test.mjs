import test from 'node:test';
import assert from 'node:assert/strict';
import {bumperContactDirection as rawDirection, bumperOutwardTarget as target} from './bumper-response.mjs';
const direction=(...args)=>{const n=rawDirection(...args);return {x:n.dx/n.length,z:n.dz/n.length};};
const c={x:0,y:.34,z:0}, end={x:.2,y:.17,z:.3};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const fallback=()=>({x:end.x/Math.hypot(end.x,end.z),z:end.z/Math.hypot(end.x,end.z)});
test('observed side entry uses first expanded-cylinder chord intersection',()=>{
 const start={x:0,y:.17,z:1};const n=direction(start,end,c,.4,.32,.135);
 const a=.2*.2+.7*.7,b=-1.4,cc=1-.535*.535,t=(-b-Math.sqrt(b*b-4*a*cc))/(2*a);
 near(n.x,.2*t/.535);near(n.z,(1-.7*t)/.535);near(Math.hypot(n.x,n.z),1);
 assert.notDeepEqual(n,fallback());assert.deepEqual(start,{x:0,y:.17,z:1});assert.deepEqual(end,{x:.2,y:.17,z:.3});
});
test('prior overlap and stationary chord retain endpoint direction',()=>{
 for(const p of [end,{x:.3,y:.17,z:.3}])assert.deepEqual(direction(p,end,c,.4,.32,.135),fallback());
});
test('missing prior sample and cap-height entry retain endpoint direction',()=>{
 assert.deepEqual(direction(null,end,c,.4,.32,.135),fallback());
 const high={...end,y:2};assert.deepEqual(direction({x:0,y:2,z:1},high,c,.4,.32,.135),fallback());
});
test('unentered and tangent paths do not invent an impact direction',()=>{
 const out={x:.8,y:.17,z:.6};assert.deepEqual(direction({x:1,y:.17,z:1},out,c,.4,.32,.135),{x:.8,z:.6});
 const tangent={x:.535,y:.17,z:0};assert.deepEqual(direction({x:.535,y:.17,z:1},tangent,c,.4,.32,.135),{x:1,z:0});
});
test('zero radial fallback is finite without inventing a direction',()=>assert.deepEqual(direction(null,c,c,.4,.32,.135),{x:0,z:0}));
test('powered minimum and high-speed passive reflection remain distinct',()=>{
 near(target(-6,6,.56),6);near(target(-12,6,.56),6.72);near(target(-24,6,.56),13.44);
 near(Math.max(0,target(9,6,.56)-9),0);near(target(-24,6,.485),11.64);
});
