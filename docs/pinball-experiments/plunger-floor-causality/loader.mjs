import fs from 'node:fs';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const map=JSON.parse(fs.readFileSync(new URL('../plunger-fit-v2-71245b2/runtime-source-map.json',import.meta.url)));
export async function load(url,ctx,next){
 const key=url.startsWith(root.href)?'/'+url.slice(root.href.length):null;
 if(key==='/web/js/pinball/physics.mjs'||key==='/web/js/pinball/ramp.test.mjs'||(process.env.VARIANT==='candidate'&&map[key])){
  let source=process.env.VARIANT==='candidate'&&map[key]?map[key]:fs.readFileSync(new URL(url),'utf8');
  if(key.endsWith('/physics.mjs')&&process.env.FLOOR==='trim'){
   const old='this.box(SHOOTER_LAYOUT.x, -.04, 4.8+LOWER_LAYOUT.downstreamOffset, .22, .08, .9);';
   if(!source.includes(old))throw Error('floor pattern missing');
   source=source.replace(old,'this.box(SHOOTER_LAYOUT.x, -.04, 5.55, .22, .08, .55);');
  }
  if(key.endsWith('/ramp.test.mjs')&&process.env.CONTINUE83==='1')source=source.replace('assert.ok(completed,`natural release ${releaseTicks} did not traverse`);','if(releaseTicks===83&&!completed){console.log("OBSERVED FAILURE83, CONTINUING84");continue;}assert.ok(completed,`natural release ${releaseTicks} did not traverse`);');
  if(key.endsWith('/ramp.test.mjs'))source=source.replace(/import test from ["']node:test["'];/,`import {observedTest as test} from '${new URL('observe.mjs',dir).href}';`);
  return {format:'module',source,shortCircuit:true};
 }
 return next(url,ctx);
}
export async function resolve(specifier,context,next){if(process.env.VARIANT==='candidate'&&specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL).href,key=url.startsWith(root.href)?'/'+url.slice(root.href.length):null;if(map[key])return {url,shortCircuit:true};}return next(specifier,context);}
