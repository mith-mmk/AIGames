const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync("web/js/humanities-simulator.js", "utf8");
const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(code, context);

const HumanitiesSimulatorCore = context.globalThis.HumanitiesSimulatorCore;
const schools = context.globalThis.HUMANITIES_SCHOOLS;
const parameterDefinitions = context.globalThis.HUMANITIES_PARAMETERS;

function createCore(random = () => 0.13) {
    return new HumanitiesSimulatorCore({ random });
}

{
    const core = createCore();
    assert.equal(core.result.subject, "猫が机からコップを落とした");
    assert.equal(parameterDefinitions.length, 9);
    assert.equal(core.schoolId, "empirical");
    assert.equal(core.result.relay.length, 4);
    assert.equal(core.result.extremeLevel, 0);
}

{
    const core = createCore();
    const initial = { ...core.parameters };
    for (const [schoolId, school] of Object.entries(schools)) {
        assert.equal(core.setSchool(schoolId), true);
        assert.deepEqual(core.parameters, school.parameters);
        assert.notDeepEqual(core.parameters, initial);
        const result = core.generate("猫が机からコップを落とした");
        assert.equal(result.schoolLabel, school.label);
        assert.ok(result.relay[2].text.length > 0);
        assert.ok(school.concepts.some((concept) => result.relay[2].text.includes(concept)));
    }
}

{
    const core = createCore();
    const baseline = core.generate().metrics;
    for (const definition of parameterDefinitions) {
        core.setSchool("empirical");
        core.setParameter(definition.key, 100);
        const changed = core.generate().metrics;
        assert.notDeepEqual(changed, baseline, `${definition.key} should affect metrics`);
    }
}

{
    const core = createCore();
    core.setSchool("marxist");
    const marxistEssay = core.generate().essay;
    assert.match(marxistEssay, /家父長制/);
    assert.match(marxistEssay, /新自由主義/);
    core.setSchool("poststructuralist");
    const poststructuralistEssay = core.generate().essay;
    assert.match(poststructuralistEssay, /自己言及的な理論的旋回/);
}

{
    const core = createCore();
    core.setSchool("empirical");
    core.setSecondarySchool("poststructuralist");
    core.setMix(true, 50);
    const result = core.generate("猫が机からコップを落とした");
    assert.equal(result.mixEnabled, true);
    assert.equal(result.secondarySchoolLabel, schools.poststructuralist.label);
    assert.ok(result.relay[2].text.includes("言説") || result.relay[2].text.includes("構築"));
    assert.ok(result.relay[2].text.includes("史料") || result.relay[2].text.includes("事実確認"));
}

{
    const core = createCore();
    const normal = core.generate().essay;
    const levels = [core.extreme(), core.extreme(), core.extreme(), core.extreme()];
    assert.equal(core.extremeLevel, 3);
    assert.equal(levels[2].extremeLevel, 3);
    assert.equal(levels[3].extremeLevel, 3);
    assert.notEqual(levels[0].essay, normal);
    assert.notEqual(levels[1].essay, levels[0].essay);
    assert.notEqual(levels[2].essay, levels[1].essay);
    assert.doesNotMatch(levels[2].essay, /極端化レベル/);
    assert.notDeepEqual(levels[0].metrics, normal.metrics);
    assert.match(levels[0].essay, /確認できる範囲では/);
}

{
    const core = createCore();
    core.setSchool("poststructuralist");
    const customSubject = "駅前の時計が三分遅れていた";
    core.generate(customSubject);
    const extreme = core.extreme();
    assert.match(extreme.essay, new RegExp(customSubject));
    assert.doesNotMatch(extreme.essay, /猫が机からコップを落とした/);
    assert.doesNotMatch(extreme.relay[2].text, /極端化レベル/);
    assert.match(extreme.relay[1].text, /学派固有の前提/);
    assert.match(extreme.essay, /主体の安定性|出来事を語れないこと/);
}

{
    const core = createCore();
    const customSubject = "市役所がベンチを青く塗り替えた";
    core.setSchool("marxist");
    core.setSecondarySchool("psychoanalytic");
    core.setMix(true, 50);
    core.generate(customSubject);
    const mixedExtreme = core.extreme();
    assert.match(mixedExtreme.essay, new RegExp(customSubject));
    assert.match(mixedExtreme.essay, /階級関係|所有関係/);
    assert.match(mixedExtreme.essay, /母性的な代替物|無意識の証言/);
    assert.doesNotMatch(mixedExtreme.essay, /猫が机からコップを落とした/);
}

{
    const core = createCore();
    for (const schoolId of Object.keys(schools)) {
        core.setSchool(schoolId);
        const metrics = core.generate().metrics;
        for (const value of Object.values(metrics)) {
            assert.ok(value >= 0 && value <= 100, `${schoolId} metric out of range`);
        }
    }
}

{
    const core = createCore();
    core.setSchool("empirical");
    core.setParameter("conceptDensity", 10);
    core.setParameter("citationCount", 10);
    const restrained = core.generate().metrics.soundsMeaningful;
    core.setParameter("conceptDensity", 100);
    core.setParameter("citationCount", 100);
    core.setParameter("assertiveness", 100);
    const inflated = core.generate().metrics.soundsMeaningful;
    assert.ok(inflated > restrained);
}

console.log("Humanities simulator logic tests passed.");
