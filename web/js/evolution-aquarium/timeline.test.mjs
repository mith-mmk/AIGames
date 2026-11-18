import assert from "node:assert/strict";
import { test } from "node:test";
import { AquariumSimulation, HISTORY_INTERVAL, HISTORY_LIMIT, MAX_FISH, PRESETS, TRAITS, TRAIT_BINS, traitBin, traitHistograms } from "./core.mjs";
import { TraitTimeline, densityColor, nearestSample } from "./timeline.mjs";

const total = row => Array.from(row).reduce((sum, n) => sum + n, 0);
const withSize = value => ({ traits: Object.fromEntries(Object.keys(TRAITS).map(key => [key, key === "size" ? value : 0.5])) });
const snapshot = (time, fish) => ({ time, count: fish.length, generation: 1, histograms: traitHistograms(fish) });

test("two peaks survive aggregation and rendering, even with the same average and different populations", () => {
    const bimodal = snapshot(0, [withSize(0.25), withSize(0.75)]);
    const center = snapshot(2, [withSize(0.5), withSize(0.5)]);
    const doubled = snapshot(4, [withSize(0.25), withSize(0.75), withSize(0.25), withSize(0.75)]);
    const extinct = snapshot(4.1, []);
    const hist = bimodal.histograms.size;
    assert.equal(traitBin(0), 0);
    assert.equal(traitBin(1), TRAIT_BINS - 1);
    assert.equal(hist[2], 1);
    assert.equal(hist[7], 1);
    assert.equal(hist[5], 0);
    assert.equal(center.histograms.size[5], 2);
    assert.equal(doubled.histograms.size[2], 2);

    const rectangles = [];
    const ctx = {
        fillRect(x, y, w, h) { rectangles.push({ x, y, w, h, fill: this.fillStyle }); },
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, strokeRect() {},
    };
    TraitTimeline.prototype.drawPlot.call({
        ctx, canvas: {}, history: [bimodal, center, doubled, extinct], last: extinct, key: "size",
        sizeCanvas: () => ({ width: 476, height: 220 }),
    }, 0);
    const at = x => rectangles.filter(r => r.x === x).map(r => r.fill);
    // In this plot, the columns at 0/2/4 s start at x = 44/86/128.
    assert.deepEqual(at(44).slice(1), at(128), "Same relative distribution must render the same despite different totals");
    assert.equal(at(44).filter(color => color === densityColor(0.5)).length, 2);
    assert.equal(at(86).filter(color => color === densityColor(1)).length, 1);
    assert.deepEqual(at(130), ["#343d4a"], "An extinct sample is visually distinct from bins with 0%");
});

test("recording retains bounded snapshots for every trait and resets with the simulation", () => {
    const sim = new AquariumSimulation(20261118, { ...PRESETS.balanced, foodRate: 16 });
    for (let i = 0; i < 3200; i += 1) sim.step();
    assert.equal(sim.history.length, HISTORY_LIMIT);
    assert.equal(sim.history.at(-1).time, 320);
    assert.equal(sim.history[0].time, 320 - (HISTORY_LIMIT - 1) * HISTORY_INTERVAL);
    assert.ok(sim.history.every(s => Object.values(s.histograms).every(row =>
        row.length === TRAIT_BINS && total(row) === s.count && total(row) <= MAX_FISH)));
    assert.notEqual(sim.history[0].histograms.temp, sim.history[1].histograms.temp);
    sim.init(20261118);
    assert.equal(sim.history.length, 1);
    assert.equal(sim.history[0].time, 0);
    assert.equal(total(sim.history[0].histograms.temp), 48);
});

test("extinction records the exact time between sampling ticks, once", () => {
    const sim = new AquariumSimulation(1);
    sim.fish = [sim.fish[0]];
    sim.fish[0].energy = 0;
    sim.step();
    assert.equal(sim.history.at(-1).time, 0.1);
    assert.equal(sim.history.at(-1).count, 0);
    assert.ok(Object.values(sim.history.at(-1).histograms).every(row => total(row) === 0));
    for (let i = 0; i < 100; i += 1) sim.step();
    assert.equal(sim.time, 0.1);
    assert.equal(sim.history.length, 2);
});

test("time selection handles sparse samples, window rollovers and ties", () => {
    const times = [10, 12, 14, 15.1].map(time => ({ time }));
    assert.equal(nearestSample([], 1), -1);
    assert.equal(nearestSample(times, 0), 0);
    assert.equal(nearestSample(times, 13), 2);
    assert.equal(nearestSample(times, 15), 3);
    assert.equal(nearestSample(times, 100), 3);
});
