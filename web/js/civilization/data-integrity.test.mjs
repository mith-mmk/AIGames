import assert from 'node:assert/strict';
import { BUILDINGS, GOVERNMENTS, IMPROVEMENTS, PROJECTS, PRESETS, TECHS, UNITS } from './data.mjs';

const techIds = new Set(Object.keys(TECHS));
const techUsers = new Set();
const groups = [UNITS, BUILDINGS, IMPROVEMENTS, PROJECTS, GOVERNMENTS];
for (const group of groups) for (const item of Object.values(group)) {
  if (item.requires) { assert(techIds.has(item.requires), `unknown technology: ${item.requires}`); techUsers.add(item.requires); }
}
for (const [id, tech] of Object.entries(TECHS)) {
  for (const prerequisite of tech.requires) assert(techIds.has(prerequisite), `unknown prerequisite: ${id} -> ${prerequisite}`);
  const visiting = new Set();
  const visit = (node) => {
    assert(!visiting.has(node), `technology cycle at ${node}`);
    visiting.add(node);
    for (const prerequisite of TECHS[node].requires) visit(prerequisite);
    visiting.delete(node);
  };
  visit(id);
  if (tech.effects) assert(Object.values(tech.effects).some((value) => value !== 0), `empty effects: ${id}`);
}
for (const [id, tech] of Object.entries(TECHS)) {
  assert(techUsers.has(id) || Object.values(tech.effects || {}).some((value) => value !== 0), `technology has no effect or unlock: ${id}`);
}
for (const preset of Object.values(PRESETS)) assert(preset.width > 0 && preset.height > 0 && preset.civCount >= 2);
const deepFrozen = (value) => Object.isFrozen(value) && (!value || typeof value !== 'object' || Object.values(value).every(deepFrozen));
for (const group of [TECHS, UNITS, BUILDINGS, IMPROVEMENTS, PROJECTS, GOVERNMENTS, PRESETS]) assert(deepFrozen(group));
console.log(`data integrity ok: ${techIds.size} technologies have valid prerequisites and an effect or unlock`);
