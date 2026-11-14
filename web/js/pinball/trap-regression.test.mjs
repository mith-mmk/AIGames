import test from "node:test";
import assert from "node:assert/strict";
import { BUMPERS, TABLE, TARGET_BANKS } from "./layout.mjs";
import { PinballPhysics } from "./physics.mjs";
import { RAMP_WALL_HEIGHT, WIRE_START_FRACTION } from "./ramp-geometry.mjs";

test("right target bank leaves a full ball-width throat beside every main bumper", () => {
  const bank = TARGET_BANKS.find(bank => bank.key === "right-side");
  const [ax, , az] = bank.a, [bx, , bz] = bank.b;
  const dx = bx - ax, dz = bz - az;
  for (const bumper of BUMPERS) {
    const t = Math.max(0, Math.min(1,
      ((bumper.x - ax) * dx + (bumper.z - az) * dz) / (dx * dx + dz * dz)));
    // Match the .40 bumper cylinder and .07 target rubber in physics.mjs.
    const clearance = Math.hypot(bumper.x - ax - t * dx, bumper.z - az - t * dz) - .40 - .07;
    assert.ok(clearance >= TABLE.ballRadius * 2 + .05,
      `bumper (${bumper.x}, ${bumper.z}) leaves only ${clearance} clearance`);
  }
});

test("low-speed balls pass the screenshot throat without rescue or position changes", async () => {
  for (const x of [.58, .60, .62, .64]) {
    const g = await PinballPhysics.create();
    try {
      g.launch();
      // Non-overlapping incoming fixture, upstream of the narrowed passage.
      // Only its initial conditions are set; all subsequent motion is physical.
      g.ball.setTranslation({ x, y: .175, z: -2.5 }, true);
      g.ball.setLinvel({ x: 0, y: 0, z: 1 }, true);
      let resets = 0, passed = false;
      const setTranslation = g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation = (...args) => { resets++; return setTranslation(...args); };
      for (let tick = 0; tick < 120; tick++) {
        g.step(1 / 120);
        assert.equal(g.state.phase, "playing");
        assert.ok(Math.abs(g.ballPosition.x - x) < .025, "throat must not pinch or deflect the ball");
        if (g.ballPosition.z > -1.4) { passed = true; break; }
      }
      assert.ok(passed, `incoming x=${x} did not pass the throat`);
      assert.equal(resets, 0);
    } finally { g.dispose(); }
  }
});

test("twenty-one natural launches clear without target-bank stalls or position resets", async () => {
  for (let shot = 0; shot <= 20; shot++) {
    const g = await PinballPhysics.create();
    try {
      g.launch(shot / 20);
      let liveResets = 0;
      const setTranslation = g.ball.setTranslation.bind(g.ball);
      g.ball.setTranslation = (...args) => {
        if (g.state.phase === "playing") liveResets++;
        return setTranslation(...args);
      };
      for (let tick = 0; tick < 14400 && g.state.phase === "playing"; tick++) {
        const p = { ...g.ballPosition };
        g.step(1 / 120);
        if (g.state.phase === "playing") {
          const q = g.ballPosition;
          assert.ok(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) < .7, `shot ${shot}: position jump`);
        }
      }
      assert.equal(g.state.phase, "ready", `shot ${shot}: ${JSON.stringify(g.ballPosition)}`);
      assert.equal(liveResets, 0, `shot ${shot}: rescue position reset`);
    } finally { g.dispose(); }
  }
});

// Captured from session seven of the natural three-ball session sweep.
// The uncorrected trimesh holds this ball motionless on an internal edge.
test("ramp crest releases a resting ball without nudge or position rescue", async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch();
    const start = { x: 1.31982529, y: 1.18196535, z: -3.6223352 };
    g.ball.setTranslation(start, true);
    g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    g.ball.setAngvel({ x: 0, y: 0, z: 0 }, true);
    let liveResets = 0, cleared = false;
    const setTranslation = g.ball.setTranslation.bind(g.ball);
    g.ball.setTranslation = (...args) => {
      if (g.state.phase === "playing") liveResets++;
      return setTranslation(...args);
    };
    for (let tick = 0; tick < 1200 && g.state.phase === "playing"; tick++) {
      g.step(1 / 120);
      const p = g.ballPosition;
      if (g.state.phase === "playing" && Math.hypot(p.x - start.x, p.y - start.y, p.z - start.z) > .5) cleared = true;
    }
    assert.ok(cleared, `crest retained the ball at ${JSON.stringify(g.ballPosition)}`);
    assert.equal(liveResets, 0);
    assert.equal(g.state.phase, "ready");
  } finally { g.dispose(); }
});

test("continuous ramp collision meshes share every route row and triangle edge without gaps", async () => {
  const g = await PinballPhysics.create();
  try {
    const rows=g.ramp.rows.slice(0,Math.round((g.ramp.rows.length-1)*WIRE_START_FRACTION)+1);
    for(const [surface,kind] of ['deck','left','right'].entries()){
      const {vertices,indices}=g.ramp.colliders[surface].shape;
      assert.equal(vertices.length,kind==='deck'?(rows.length*4+26)*3:rows.length*6);
      assert.equal(indices.length,(rows.length-1)*6+(kind==='deck'?60:0));
      for(const [i,row] of rows.entries()){
        const a=kind==='deck'?row.left:row[kind];
        const b=kind==='deck'?row.right:row[kind].clone().add({x:0,y:RAMP_WALL_HEIGHT,z:0});
        const expected=[a.x,a.y,a.z,b.x,b.y,b.z];
        for(let k=0;k<6;k++)assert.ok(Math.abs(vertices[i*6+k]-expected[k])<1e-6,`${kind} row ${i} vertex ${k}`);
        if(i<rows.length-1&&kind!=='deck'){
          const topology=[[2*i,2*i+1,2*i+2],[2*i+1,2*i+3,2*i+2]];
          for(let triangle=0;triangle<2;triangle++){
            const actual=Array.from(indices.slice(i*6+triangle*3,i*6+triangle*3+3));
            if(kind==='deck')assert.deepEqual(actual,topology[triangle]);
            else assert.deepEqual([...actual].sort((a,b)=>a-b),topology[triangle].sort((a,b)=>a-b));
            if(kind!=='deck'){
              const point=index=>row.p.clone().set(...vertices.slice(index*3,index*3+3));
              const [a,b,c]=actual.map(point);
              const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
              const inward=row.p.clone().add(rows[i+1].p).multiplyScalar(.5).sub(a.clone().add(b).add(c).multiplyScalar(1/3));
              inward.y=0;
              assert.ok(normal.dot(inward)>0,`${kind} row ${i} triangle ${triangle} must face into the channel`);
            }
          }
        }
      }
      if(kind==='deck'){
        // A conforming bilinear patch adds triangles. Independently check every
        // edge: internal edges occur twice, and single edges lie on the actual
        // outer perimeter. This replaces the old uniform two-triangle premise.
        const point=index=>rows[0].p.clone().set(...vertices.slice(index*3,index*3+3));
        const edges=new Map();
        for(let k=0;k<indices.length;k+=3)for(let j=0;j<3;j++){
          const a=indices[k+j],b=indices[k+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');
          const edge=edges.get(key)||{a,b,count:0,balance:0};
          edge.count++;edge.balance+=a<b?1:-1;edges.set(key,edge);
        }
        const perimeter=[];
        for(let i=0;i<rows.length-1;i++)for(const side of ['left','right'])perimeter.push([rows[i][side],rows[i+1][side]]);
        perimeter.push([rows[0].left,rows[0].right],[rows.at(-1).left,rows.at(-1).right]);
        let boundary=0;
        for(const edge of edges.values()){
          if(edge.count===2){assert.equal(edge.balance,0);continue;}
          assert.equal(edge.count,1,'nonmanifold deck edge');boundary++;
          const a=point(edge.a),b=point(edge.b);
          const onSegment=(p,x,y)=>{
            const direction=y.clone().sub(x);
            const t=Math.max(0,Math.min(1,p.clone().sub(x).dot(direction)/direction.lengthSq()));
            return p.distanceTo(x.clone().addScaledVector(direction,t))<1e-6;
          };
          assert.ok(perimeter.some(([x,y])=>onSegment(a,x,y)&&onSegment(b,x,y)),'internal gap in deck');
        }
        assert.equal(boundary,2*rows.length+6,'three repaired strips subdivide both side edges');
      }
    }
  } finally { g.dispose(); }
});
