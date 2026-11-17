import assert from 'node:assert/strict';import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const baseline=read('natural.json'),original=read('nudge-delay-1.json'),replay=read('nudge1-replay.json');
assert.deepEqual(original.source,replay.source,'same runtime required');assert.deepEqual(baseline.source,replay.source);
for(let i=0;i<8;i++){assert.deepEqual(replay.rows[i].inputs,baseline.rows[i].inputs);assert.deepEqual(replay.rows[i].events,baseline.rows[i].events);}
for(let i=0;i<9;i++){assert.deepEqual(replay.rows[i].inputs,original.rows[i].inputs);assert.deepEqual(replay.rows[i].events,original.rows[i].events);assert.deepEqual(replay.rows[i].position,original.rows[i].position);}
const row=replay.rows[8],nudges=row.inputs.filter(i=>i.nudge),proof=row.captureProof[0];assert.equal(nudges.length,1);assert.equal(nudges[0].result,true);assert.equal(nudges[0].before.tilted,false);assert.equal(nudges[0].after.tilted,false);
const capture=row.events.find(e=>e.event.type==='scoop'&&e.before.lit);assert.ok(capture);assert.equal(capture.after.score-capture.before.score,1000);assert.equal(capture.after.collections,1);assert.equal(capture.after.lit,false);
assert.equal(proof.held,true);assert.equal(proof.sideSaveCharges,1);assert.deepEqual(proof.targets,[false,false,false]);assert.ok(proof.ejection);assert.equal(proof.ejection.ball,proof.ball);assert.ok(proof.ejection.tick>proof.tick);assert.equal(row.phase,'gameover');assert.ok(row.drains.every(d=>d.info.reason==='normal'));assert.equal(row.trap,null);
console.log(JSON.stringify({verified:true,lightTick:row.litAt,nudgeTick:row.nudgeAt,collectionTick:capture.tick,hold:proof,source:replay.source['physics.mjs']}));
