import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url))),dir='artifacts/pinball/receiver-r15-generic-contract-f7e4d30/';
const original=JSON.parse(fs.readFileSync(dir+'capture-original.json')),revision=JSON.parse(fs.readFileSync(dir+'capture-revision.json'));
for(const [key,value] of Object.entries(manifest.expected_normal_capture)){assert.equal(original[key],value,'original '+key);assert.equal(revision[key],value,'revision '+key);}
console.log('Normal original/revision capture counts and hashes match the frozen manifest. This is geometry/API equivalence, not gameplay acceptance.');
