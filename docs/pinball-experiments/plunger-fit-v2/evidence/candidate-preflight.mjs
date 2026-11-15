import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../plunger-fit-v2-71245b2/runtime-source-map.json',import.meta.url))).digest('hex'),'022605fdccd86d5514c6d34820e3edda1d3d1980c577ae0f05eccff85cb92690');
assert.match(PinballPhysics.toString(),/this\.plungerFitContacts/);
const create=PinballPhysics.create.bind(PinballPhysics);
PinballPhysics.create=async(...args)=>{const game=await create(...args);assert.equal(game.plungerFitContacts.length,26);return game;};
// No extra world: existing creation history remains unchanged.
