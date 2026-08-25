const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("web/js/kanbun-turing.js", "utf8"), context);
const Core = context.globalThis.KanbunMachineCore;
const catalog = JSON.parse(fs.readFileSync("web/assets/kanbun-turing/samples.json", "utf8"));
const schema = JSON.parse(fs.readFileSync("web/assets/kanbun-turing/samples.schema.json", "utf8"));
const styles = fs.readFileSync("web/css/kanbun-turing.css", "utf8");
const allowedRules = new Set(schema.properties.samples.items.properties.rules.items.enum);

assert.equal(catalog.schemaVersion, "1.0.0");
assert.equal(catalog.samples.length >= 15, true);
assert.equal(new Set(catalog.samples.map((sample) => sample.id)).size, catalog.samples.length);
assert.match(styles, /\.kunten-column\s*\{[^}]*flex-flow:\s*column wrap;[^}]*direction:\s*rtl;/u);
assert.match(styles, /\.kunten-token\s*\{[^}]*direction:\s*ltr;/u);
for (const sample of catalog.samples) {
    for (const key of schema.properties.samples.items.required) assert.equal(key === "rules" ? Array.isArray(sample[key]) : typeof sample[key] === "string", true, `${sample.id}: ${key}`);
    assert.equal(sample.rules.every((rule) => allowedRules.has(rule)), true);
    const selectedEditorSource = sample.editorNotation || sample.source;
    if (sample.editorNotation) {
        assert.equal(Core.convert(selectedEditorSource), sample.expectedKundoku, sample.id);
    } else {
        const referenceMachine = new Core();
        assert.equal(referenceMachine.start(selectedEditorSource), false, `${sample.id} must remain reference-only`);
        assert.equal(referenceMachine.getSnapshot().status, "white", sample.id);
    }
}
assert.equal(Core.convert("見［レ］る人を。"), "人を見る。");
assert.equal(Core.convert("濺ぎ［レ］涙を"), "涙を濺ぎ");
assert.equal(Core.convert("欲［レ］す不［レ］らんと勝［レ］へ簪に。"), "簪に勝へ不らんと欲す。");
assert.equal(Core.convert("愛２す書１を。"), "書を愛す。");
assert.equal(Core.convert("烽火連２なり三月１に。"), "烽火三月に連なり。");
assert.equal(Core.convert("暮に当［レ］に至２る馬陵１に。"), "暮に当に馬陵に至るべし。");
assert.equal(Core.convert("甲３乙２丙１。"), "丙乙甲。");
assert.equal(Core.convert("見［レ］ル人ヲ。"), "人ヲ見ル。");
assert.equal(Core.convert("贈［上］る友［中］に花［下］を。"), "花を友に贈る。");
assert.deepEqual(Array.from(Core.findRepeatedCharacters("未将当宜須猶更再復且"), (item) => item.character), ["未", "将", "当", "宜", "須", "猶", "更", "再", "復", "且"]);
assert.equal(Core.convert("見［レ］る人を。\n愛２す書１を。"), "人を見る。\n書を愛す。");
assert.equal(Core.convert("甲乙。\n暮に当［レ］に至２る馬陵１に。"), "甲乙。\n暮に当に馬陵に至るべし。");
assert.equal(Core.convert("故きを温ねて而［置］新しきを知る。"), "故きを温ねて新しきを知る。");
const shunbo = catalog.samples.find((sample) => sample.id === "shunbo");
assert.equal(Core.convert(shunbo.editorNotation), shunbo.expectedKundoku);
const samplesAfterShunbo = catalog.samples.slice(catalog.samples.indexOf(shunbo) + 1);
for (const sample of samplesAfterShunbo) {
    assert.match(sample.editorNotation, /［[レ上中下]］|[１２３]/u, `${sample.id}: 返点が必要です`);
    assert.match(sample.editorNotation, /[ぁ-ゖァ-ヺ]/u, `${sample.id}: 送り仮名が必要です`);
    const sampleMachine = new Core();
    assert.equal(sampleMachine.start(sample.editorNotation), true, `${sample.id}: 変換を開始できません`);
    while (sampleMachine.step()) { /* finish */ }
    assert.equal(sampleMachine.getSnapshot().status, "halted", `${sample.id}: 変換エラー`);
    assert.equal(sampleMachine.getSnapshot().output, sample.expectedKundoku, sample.id);
}
const xiangyu = catalog.samples.find((sample) => sample.id === "xiangyu-forces");
assert.equal(xiangyu.title, "項羽と劉邦");
assert.equal(Core.convert(xiangyu.editorNotation).split("\n").length, 3);
const onkoChishin = catalog.samples.find((sample) => sample.id === "onko-chishin");
assert.equal((onkoChishin.editorNotation.match(/［置］/gu) || []).length, 3);
assert.equal(Core.convert(onkoChishin.editorNotation), onkoChishin.expectedKundoku);
const automaton = new Core();
assert.equal(automaton.start("見［レ］る人を。"), true);
assert.deepEqual(Array.from(automaton.getSnapshot().tape), ["見る", "人を", "。"]);
assert.equal(automaton.getSnapshot().state, "scan");
assert.equal(automaton.getSnapshot().output, "");
automaton.step();
assert.deepEqual(Array.from(automaton.getSnapshot().tape), ["人を", "見る", "。"]);
assert.equal(automaton.getSnapshot().output, "");
while (automaton.getSnapshot().phase === "scan") automaton.step();
assert.equal(automaton.getSnapshot().state, "emit");
assert.equal(automaton.getSnapshot().progress, 50);
while (automaton.step()) { /* finish */ }
assert.equal(automaton.getSnapshot().output, "人を見る。");
const machine = new Core();
assert.equal(machine.start("甲乙。"), false);
assert.equal(machine.getSnapshot().status, "white");
assert.equal(machine.getSnapshot().output, "甲乙。");
assert.equal(machine.start("［レ］甲。"), false);
assert.equal(machine.getSnapshot().status, "error");
assert.equal(machine.start("甲３丙１。"), false);
assert.equal(machine.getSnapshot().status, "error");
assert.equal(machine.start("甲［中］乙［下］。"), false);
assert.equal(machine.getSnapshot().status, "error");
assert.equal(machine.start("見ル［レ］人ヲ。"), true);
while (machine.step()) { /* finish */ }
assert.equal(machine.getSnapshot().output, "人ヲ見ル。");
assert.equal(machine.start("見［レ］ル［レ］人ヲ。"), false);
assert.equal(machine.getSnapshot().status, "error");
machine.start("見［レ］る人を。");
machine.step();
assert.equal(machine.getSnapshot().head, 1);
machine.pause();
assert.equal(machine.getSnapshot().status, "paused");
machine.resume();
while (machine.step()) { /* finish */ }
assert.equal(machine.getSnapshot().status, "halted");
console.log("Kanbun Turing machine tests passed.");
