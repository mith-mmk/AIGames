// Diagnose every required ground entry without aborting at the first failure.
// This supplements, never relaxes, ramp.test.mjs's six-completion gate.
import fs from 'node:fs';
import process from 'node:process';
import crypto from 'node:crypto';
import { PinballPhysics } from '../web/js/pinball/physics.mjs';
import { RAMP_POINTS } from '../web/js/pinball/ramp-geometry.mjs';
const repeats = Number(process.argv[2] || 3);
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('repeats must be 1–20');
const results = [];
for (let run = 0; run < repeats; run++) for (const speed of [28, 30]) for (const offset of [-.05, 0, .05]) {
  const g = await PinballPhysics.create();
  try {
    g.launch();
    const mouth = RAMP_POINTS[0], exit = RAMP_POINTS.at(-1);
    g.ball.setTranslation({ x: mouth[0] - .15 + offset, y: mouth[1] + .135, z: mouth[2] }, true);
    g.ball.setLinvel({ x: .55 * speed, y: 0, z: -Math.sqrt(1 - .55 * .55) * speed }, true);
    let rear = false, climbed = false, rollback = false, outcome = 'timeout', minZ = Infinity, maxY = -Infinity;
    const frames = [];
    for (let tick = 0; tick < 1600; tick++) {
      // Match the independent required test: no game-state processing or rescue.
      g.world.step();
      const p = { ...g.ballPosition }, v = { ...g.ball.linvel() };
      minZ = Math.min(minZ, p.z); maxY = Math.max(maxY, p.y);
      rear ||= p.z < -3.5; climbed ||= p.z < mouth[2] - .5 && p.y > .3;
      rollback ||= climbed && p.z > mouth[2] + .05 && p.y < .3 && v.z > 0;
      if (tick % 10 === 0) frames.push({ tick, p, v });
      if (rear && Math.abs(p.x - exit[0]) < .25 && p.z > exit[2] - .1 && p.y > exit[1]) {
        outcome = 'complete'; break;
      }
      if (p.y < -.5) {
        outcome = rollback && !rear && p.z > 4.6 ? 'rollback-then-drain' : 'escape-before-return';
        frames.push({ tick, p, v }); break;
      }
    }
    results.push({ run, speed, offset, outcome, rear, rollback, minZ, maxY, frames });
  } finally { g.dispose(); }
}
const sourceHashes = Object.fromEntries(['physics.mjs', 'ramp-geometry.mjs', 'layout.mjs'].map(name => [name,
  crypto.createHash('sha256').update(fs.readFileSync(`web/js/pinball/${name}`)).digest('hex')]));
const summary = results.map(({ frames, ...r }) => ({ ...r, sampledFrames: frames.length }));
const report = { method: 'Independent positioned ground-entry fixtures; not natural launches or human gameplay. Rollback is diagnostic only and still fails the required strong-shot completion gate.', sourceHashes, allRequiredEntriesComplete: results.every(r => r.outcome === 'complete'), summary, results };
fs.mkdirSync('artifacts/pinball', { recursive: true });
fs.writeFileSync('artifacts/pinball/ramp-entry-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ sourceHashes, allRequiredEntriesComplete: report.allRequiredEntriesComplete, summary }, null, 2));
if (!report.allRequiredEntriesComplete) process.exitCode = 1;
