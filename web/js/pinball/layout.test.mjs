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
