import fs from 'node:fs';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const map=JSON.parse(fs.readFileSync(new URL(`${process.env.VARIANT}-sources.json`,dir)));
export async function resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL).href,key=url.startsWith(root.href)?'/'+url.slice(root.href.length):null;if(map[key])return {url,shortCircuit:true};}return next(specifier,context);}
export async function load(url,ctx,next){const key=url.startsWith(root.href)?'/'+url.slice(root.href.length):null;if(map[key]){let source=map[key];if(key.endsWith('/ramp.test.mjs'))source=source.replace(/import test from ["']node:test["'];/,`import {observedTest as test} from '${new URL('observe.mjs',dir).href}';`);return {format:'module',source,shortCircuit:true};}return next(url,ctx);}
