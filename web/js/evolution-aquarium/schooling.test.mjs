import assert from "node:assert/strict";
import { test } from "node:test";
import { AquariumSimulation, BOUNDS, floorY } from "./core.mjs";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const directionCosine = (a, b) => (a.vx * b.vx + a.vy * b.vy + a.vz * b.vz) /
    (Math.hypot(a.vx, a.vy, a.vz) * Math.hypot(b.vx, b.vy, b.vz));

function alignedGroups(fish) {
    const open = new Set(fish);
    const groups = [];
    for (const starter of open) {
        open.delete(starter);
        const group = [starter];
        for (const a of group) {
            for (const b of open) {
                if (distance(a, b) >= 3.45 || directionCosine(a, b) <= 0.6) continue;
                open.delete(b);
                group.push(b);
            }
        }
        if (group.length >= 3) groups.push(group);
    }
    return groups.sort((a, b) => b.length - a.length);
}

test("founders swim in the expanded footprint, not only inside the old 32×14 tank", () => {
    assert.deepEqual([BOUNDS.x * 2, BOUNDS.z * 2], [48, 24]);
    const sim = new AquariumSimulation(20261118);
    assert.ok(sim.fish.some(fish => Math.abs(fish.x) > 16));
    assert.ok(sim.fish.some(fish => Math.abs(fish.z) > 7));
    assert.ok(sim.food.some(food => Math.abs(food.x) > 16 && Math.abs(food.z) > 7));
    assert.ok(sim.fish.every(fish => fish.y >= floorY(fish.x)));
    assert.ok(new Set(sim.fish.map(fish => fish.traits.size)).size > 30, "Founders retain continuous size variation");
});

test("fixed seeds develop multiple moving groups without one permanent cluster", () => {
    for (const seed of [20261118, 1, 7]) {
        const sim = new AquariumSimulation(seed);
        const first = sim.fish.map(fish => ({ ...fish }));
        let sampleCount = 0, multiple = 0, dispersed = 0, walls = 0, observations = 0;
        const compositions = new Set();
        for (let i = 1; i <= 600; i += 1) {
            sim.step();
            if (i % 30 !== 0) continue;
            sampleCount += 1;
            const groups = alignedGroups(sim.fish);
            if (groups.length >= 2) multiple += 1;
            if ((groups[0]?.length ?? 0) < sim.fish.length * 0.75) dispersed += 1;
            if (groups[0]) compositions.add(groups[0].map(fish => fish.id).sort((a, b) => a - b).join(","));
            observations += sim.fish.length;
            walls += sim.fish.filter(fish => Math.abs(fish.x) > BOUNDS.x - 0.7 || Math.abs(fish.z) > BOUNDS.z - 0.7).length;
        }
        assert.ok(multiple > sampleCount * 0.75, `Seed ${seed}: several local clusters with aligned headings`);
        assert.ok(dispersed > sampleCount * 0.9 && compositions.size > sampleCount / 2, `Seed ${seed}: groups change composition`);
        assert.ok(walls < observations * 0.03, `Seed ${seed}: edge dwell is uncommon`);
        assert.ok(sim.fish.filter(fish => first.some(f => f.id === fish.id && distance(fish, f) > 8)).length > 5);
        assert.ok(sim.births > 20 && sim.generation >= 3);
    }
});

test("a fish swimming outwards at a corner turns back inside", () => {
    const sim = new AquariumSimulation(51, { foodRate: 0 });
    const [fish] = sim.fish;
    Object.assign(fish, { x: BOUNDS.x - 0.41, y: 6, z: BOUNDS.z - 0.41, vx: 3, vz: 3 });
    sim.fish = [fish];
    let left = false;
    for (let i = 0; i < 32; i += 1) {
        sim.step();
        assert.ok(Math.abs(fish.x) < BOUNDS.x && Math.abs(fish.z) < BOUNDS.z);
        if (fish.x < BOUNDS.x - 1.9 && fish.z < BOUNDS.z - 1.9) left = true;
    }
    assert.ok(left, "Boundary steering must move the fish away from both walls");
});
