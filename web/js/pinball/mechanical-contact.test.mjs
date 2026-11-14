import test from "node:test";
import assert from "node:assert/strict";
import { flipperProfile, flipperContactVertices, targetContactId, PLUNGER_CONTACT } from "./mechanical-contact.mjs";
import { PinballPhysics } from "./physics.mjs";
import { TARGET_BANKS, LOWER_LAYOUT, SHOOTER_LAYOUT } from "./layout.mjs";

test("tapered contact hull matches rubber height and rounded profile", () => {
  const points=flipperProfile(), vertices=flipperContactVertices();
  assert.equal(vertices.length,points.length*6);
  // The installed bat grew from the old 1.04 maximum to the shared layout length.
  const length=LOWER_LAYOUT.flipperCenter+LOWER_LAYOUT.flipperHalfLength;
  const tip=Math.max(...points.map(p=>p[0]));
  assert.ok(tip<length && tip>length-.003);
  assert.ok(Math.min(...points.map(p=>p[0]))>-.061);
  assert.ok(Math.max(...points.filter(p=>p[0]>length-.09).map(p=>Math.abs(p[1])))<.09);
  const ys=Array.from(vertices).filter((_,i)=>i%3===1);
  assert.ok(Math.abs(Math.min(...ys)+.109)<1e-7);
  assert.ok(Math.abs(Math.max(...ys)-.034)<1e-7);
  assert.throws(()=>flipperContactVertices({height:0}),RangeError);
});
test("accepted sling and target hits fan out once without duplicate score", async () => {
  const g=await PinballPhysics.create();
  try {
    g.launch();
    for (const type of ["sling","bank"]) {
      const [handle,h]=[...g.hitObjects].find(([,h])=>h.type===type);
      g.hit(handle); const score=g.state.score;
      const hits=g.takeVisualHits(); assert.equal(hits.length,1); assert.equal(hits[0].type,type);
      if(type==="bank")assert.match(hits[0].targetId,new RegExp(`^${h.key}:\\d$`));
      g.hit(handle); assert.equal(g.state.score,score); assert.deepEqual(g.takeVisualHits(),[]);
    }
    for(const bank of TARGET_BANKS)for(let i=0;i<bank.count;i++) {
      const t=i/(bank.count-1);
      assert.equal(targetContactId(bank,{x:bank.a[0]+(bank.b[0]-bank.a[0])*t,z:bank.a[2]+(bank.b[2]-bank.a[2])*t}),`${bank.key}:${i}`);
    }
  } finally {g.dispose();}
});
test("pull retracts actual stop and ball follows gravity without position resets", async () => {
  const g=await PinballPhysics.create();
  try {
    let resets=0; const set=g.ball.setTranslation.bind(g.ball);
    g.ball.setTranslation=(...args)=>{resets++;return set(...args);};
    g.setPlungerPull(1);
    for(let i=0;i<240;i++)g.step(1/120);
    assert.ok(Math.abs(g.plungerStop.translation().z-PLUNGER_CONTACT.restZ-.32)<1e-6);
    assert.equal(g.state.phase,"ready");assert.ok(g.ballPosition.z>SHOOTER_LAYOUT.ballZ+.275&&g.ballPosition.z<SHOOTER_LAYOUT.ballZ+.375);
    assert.equal(resets,0);const before=g.ballPosition.z;
    g.launch(.8);assert.equal(g.ballPosition.z,before);
    for(let i=0;i<120;i++)g.step(1/120);
    assert.equal(g.plungerPull,0);assert.equal(resets,0);
  } finally {g.dispose();}
});

test("cancelled full pull cannot strand the ball behind the stop", async () => {
  const g=await PinballPhysics.create();
  try {
    g.setPlungerPull(1); for(let i=0;i<240;i++)g.step(1/120);
    g.setPlungerPull(0); for(let i=0;i<480;i++)g.step(1/120);
    assert.equal(g.state.phase,"ready"); assert.equal(g.state.ballNumber,1);
    assert.ok(g.ballPosition.z>SHOOTER_LAYOUT.ballZ-.075&&g.ballPosition.z<SHOOTER_LAYOUT.ballZ+.015);
  } finally {g.dispose();}
});
