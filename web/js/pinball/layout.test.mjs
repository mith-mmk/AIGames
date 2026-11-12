import test from "node:test";
import assert from "node:assert/strict";
import { TABLE, BUMPERS, RAMP, TablePreviewState, flipperAngle } from "./layout.mjs";
test("ramp stays inside table and above surface", () => {
  for (const [x, y, z] of RAMP) {
    assert.ok(Math.abs(x) < TABLE.width / 2);
    assert.ok(Math.abs(z) < TABLE.length / 2);
    assert.ok(y >= 0);
  }
});
test("bumpers have ball clearance from each other", () => {
  for (let i = 0; i < BUMPERS.length; i++)
    for (let j = i + 1; j < BUMPERS.length; j++)
      assert.ok(
        Math.hypot(BUMPERS[i].x - BUMPERS[j].x, BUMPERS[i].z - BUMPERS[j].z) >
          0.86 + TABLE.ballRadius * 2,
      );
});
test("preview initializes, clamps long frames and releases inputs", () => {
  const s = new TablePreviewState();
  s.tour = true;
  s.update(100);
  assert.equal(s.progress, 0.0075);
  s.setFlipper("left", true);
  s.release();
  assert.equal(s.left, false);
  s.init();
  assert.equal(s.tour, false);
});

test("both flippers rise toward negative-Z playfield when pressed", () => {
  for (const mirror of [false, true]) {
    const restZ = -Math.sin(flipperAngle(mirror, false));
    const activeZ = -Math.sin(flipperAngle(mirror, true));
    assert.ok(activeZ < restZ);
  }
});

// These are visual-layout guards, not collision/playability tests.
test("additional hardware preserves central corridor and ramp width", async () => {
  const { UPPER_RAMP, SLING_VERTICES } = await import("./layout.mjs");
  for (const [x, z] of SLING_VERTICES) {
    assert.ok(x >= 0.96 && x < 2.0);
    assert.ok(z < 3.1);
  }
  for (const [x, y, z] of UPPER_RAMP) {
    assert.ok(Math.abs(x) + 0.19 < TABLE.width / 2);
    assert.ok(Math.abs(z) < TABLE.length / 2 && y > 0);
  }
  assert.ok(0.38 - 2 * 0.024 > TABLE.ballRadius * 2);
  assert.ok(0.62 - 0.15 > TABLE.ballRadius * 2); // Spinner lower edge.
});

test("preview ball clears both slingshot rubber curves", async () => {
  const T = await import("../vendor/three-0.180.0/three.module.min.js");
  const { SLING_VERTICES } = await import("./layout.mjs");
  const ballCurve = new T.CatmullRomCurve3(RAMP.map(p => new T.Vector3(...p)));
  for (const side of [-1, 1]) {
    const points = [...SLING_VERTICES, SLING_VERTICES[0]].map(([x, z]) => new T.Vector3(side * x, 0.34, z));
    const rubber = new T.CatmullRomCurve3(points).getPoints(500);
    for (let i = 0; i <= 500; i++) {
      const center = ballCurve.getPoint(i / 500); center.y += TABLE.ballRadius;
      for (const p of rubber) assert.ok(center.distanceTo(p) > TABLE.ballRadius + 0.055 + 0.02);
    }
  }
});
