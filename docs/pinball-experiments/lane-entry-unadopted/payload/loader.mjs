import {registerHooks} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const sources=JSON.parse(fs.readFileSync(new URL('./sources.json',import.meta.url),'utf8'));
registerHooks({
 resolve(specifier,context,next){
  if(context.parentURL?.startsWith('file:')&&specifier.startsWith('.')){
   const u=new URL(specifier,context.parentURL),key=path.relative(root,fileURLToPath(u)).split(path.sep).join('/');
   if(Object.hasOwn(sources,key))return {url:u.href,shortCircuit:true};
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.startsWith('file:')){
   const key=path.relative(root,fileURLToPath(url)).split(path.sep).join('/');
   if(Object.hasOwn(sources,key))return {format:'module',source:sources[key],shortCircuit:true};
  }
  return next(url,context);
 }
});
