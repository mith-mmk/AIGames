import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next){const result=next(specifier,context);if(result.url.endsWith('/web/js/vendor/rapier3d-0.17.3/rapier.mjs'))return {url:new URL('../same-version-flavor-audit/package/rapier.es.js',import.meta.url).href,shortCircuit:true};return result;}});
