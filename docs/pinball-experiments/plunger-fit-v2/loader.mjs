import fs from 'node:fs';
const root=new URL('../../../',import.meta.url),map=JSON.parse(fs.readFileSync(new URL('./runtime-source-map.json',import.meta.url),'utf8'));
function key(url){return url.startsWith(root.href)?'/'+url.slice(root.href.length):null;}
export async function resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL).href;if(map[key(url)])return {url,shortCircuit:true};}return nextResolve(specifier,context);}
export async function load(url,context,nextLoad){if(map[key(url)])return {format:'module',source:map[key(url)],shortCircuit:true};return nextLoad(url,context);}
