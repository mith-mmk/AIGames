import assert from "node:assert/strict";
import { test } from "node:test";
import { AquariumSimulation, BOUNDS, MAX_FISH, PRESETS, TRAITS, concealment, createRandom, energyCost, floorY, inherit, localTemperature, zone } from "./core.mjs";

function advance(sim, seconds) {
    for (let i = 0; i < seconds * 10; i += 1) sim.step();
    return sim;
}
const traits = Object.fromEntries(Object.keys(TRAITS).map(key => [key, 0.5]));
const mean = (sim, key) => sim.fish.reduce((total, fish) => total + fish.traits[key], 0) / sim.fish.length;

test("identical seeds, environmental controls, and step counts reproduce the experiment", () => {
    const a = new AquariumSimulation(20261118);
    const b = new AquariumSimulation(20261118);
    advance(a, 41).setOption("predators", 2);
    advance(b, 41).setOption("predators", 2);
    advance(a, 90);
    advance(b, 90);
    assert.deepEqual(a.fish, b.fish);
    assert.deepEqual(a.history, b.history);
    assert.deepEqual(a.lineages, b.lineages);
    assert.deepEqual(a.deaths, b.deaths);
    assert.notDeepEqual(new AquariumSimulation(1).fish, new AquariumSimulation(2).fish);
    assert.deepEqual(new AquariumSimulation(1).fish, new AquariumSimulation(1, PRESETS.predators).fish);
});

test("offspring combine both parents, and hue wraps across 360 degrees", () => {
    const a = { ...traits, size: 0.2, hue: 0.98 };
    const b = { ...traits, size: 0.8, hue: 0.02 };
    const cross = inherit(a, b, 0, () => 0.5);
    assert.equal(cross.mutations, 0);
    assert.equal(cross.genes.size, 0.5);
    assert.ok(cross.genes.hue < 0.05 || cross.genes.hue > 0.95);
    const mutant = inherit(a, b, 1, createRandom(8));
    assert.equal(mutant.mutations, Object.keys(TRAITS).length);
    assert.notDeepEqual(cross.genes, mutant.genes);
    assert.ok(Object.values(mutant.genes).every(n => n >= 0 && n <= 1));
});

test("food becomes usable energy, creates births, and drives starvation if absent", () => {
    const ample = advance(new AquariumSimulation(20261118), 90);
    const barren = advance(new AquariumSimulation(20261118, { ...PRESETS.balanced, foodRate: 0 }), 90);
    assert.ok(ample.births > 25);
    assert.ok(ample.generation >= 3);
    assert.equal(barren.fish.length, 0);
    assert.equal(barren.deaths.starvation, 48 + barren.births);
    assert.equal(ample.lineages.reduce((n, l) => n + l.births, 0), ample.births);
    assert.equal(ample.fish.length, 48 + ample.births - Object.values(ample.deaths).reduce((a, n) => a + n, 0));
    assert.ok(ample.fish.every(f => f.parents.length === (f.generation === 1 ? 0 : 2)));
});

test("the same founders evolve lower preferred temperatures after cooling", () => {
    const seed = 20261118;
    const normal = advance(new AquariumSimulation(seed), 180);
    const cold = advance(new AquariumSimulation(seed, { ...PRESETS.balanced, temperature: 13 }), 180);
    assert.ok(cold.fish.length > 5);
    assert.ok(mean(cold, "temp") < mean(normal, "temp") - 0.14);
    const warmAdapted = { x: 0, y: 7, traits: { ...traits, temp: 0.65 } };
    const coldAdapted = { ...warmAdapted, traits: { ...traits, temp: 0.18 } };
    assert.ok(energyCost(coldAdapted, 13) < energyCost(warmAdapted, 13));
    assert.ok(energyCost(coldAdapted, 28) > energyCost(warmAdapted, 28));
});

test("predators produce predation deaths; camouflage and depth are environmental", () => {
    const normal = advance(new AquariumSimulation(1), 120);
    const hunted = advance(new AquariumSimulation(1, { ...PRESETS.balanced, predators: 2 }), 120);
    assert.equal(normal.deaths.predation, 0);
    assert.ok(hunted.deaths.predation > 8);
    assert.ok(concealment({ x: -9, y: 5, traits: { ...traits, hue: 0.115, pattern: 0.72 } }) >
        concealment({ x: -9, y: 5, traits: { ...traits, hue: 0.6, pattern: 0.1 } }));
    assert.ok(floorY(-15) > floorY(10) + 3);
    assert.ok(localTemperature(21, -9, 5) > localTemperature(21, 9, 2));
    assert.deepEqual([zone(-9, 5), zone(9, 5), zone(9, 2)], [0, 1, 2]);
});

test("limits water bounds, population, history, and adjustable control values", () => {
    const sim = new AquariumSimulation(7, { foodRate: 100, predators: -5, temperature: 21 });
    assert.equal(sim.options.foodRate, 16);
    assert.equal(sim.options.predators, 0);
    advance(sim, 315);
    sim.setOption("temperature", NaN);
    sim.setOption("unknown", 45);
    assert.equal(sim.options.temperature, 21);
    assert.equal(sim.options.unknown, undefined);
    assert.ok(sim.fish.length <= MAX_FISH && sim.history.length <= 150);
    assert.ok(sim.fish.every(f => Math.abs(f.x) <= BOUNDS.x && Math.abs(f.z) <= BOUNDS.z &&
        f.y >= floorY(f.x) && f.y <= BOUNDS.height && f.energy > 0 && f.energy <= 112));
});
