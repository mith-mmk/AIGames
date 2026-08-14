const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("web/js/natural-philosophy-network.js", "utf8"), context);

const Core = context.globalThis.NaturalPhilosophyNetworkCore;
const tools = context.globalThis.NaturalPhilosophyNetworkTools;

function source(id) {
    return [{ id: `source-${id}`, citation: `Test source ${id}`, url: `https://example.test/${id}` }];
}

function letter(id, senderId, recipientId, start, end = start, precision = "exact", family = id) {
    return {
        id,
        letterFamilyId: family,
        senderId,
        recipientId,
        dateOriginal: start,
        dateStart: start,
        dateEnd: end,
        datePrecision: precision,
        dateBasis: "document",
        sourceRecords: source(id),
    };
}

function fixture() {
    const people = ["a", "m", "b", "c", "z"].map((id) => ({
        id,
        preferredName: id.toUpperCase(),
        names: [id],
        roles: ["test"],
        authorityUrls: [`https://example.test/person/${id}`],
        selectionReason: id === "m" ? "seed" : "test",
    }));
    return {
        manifest: { title: "Test network" },
        people,
        letters: [
            letter("l1", "a", "m", "1630-01-01"),
            letter("l2", "a", "m", "1631-01-01"),
            letter("l2-copy", "a", "m", "1631-01-01", "1631-01-01", "exact", "l2"),
            letter("l3", "m", "b", "1632-01-01"),
            letter("l4", "m", "c", "1633-01-01"),
            letter("l5", "z", "z", "1634-01-01"),
        ],
        evidenceEvents: [
            {
                id: "mention-1", type: "mention", participants: ["a", "m"],
                dateStart: "1630-01-01", dateEnd: "1630-01-01", datePrecision: "exact",
                confidence: "high", sourceCitation: "Test edition", sourceUrl: "https://example.test/evidence/1", evidenceLocator: "p. 1",
            },
            {
                id: "relay-1", type: "transmission", participants: ["a", "m", "b"], route: ["a", "m", "b"],
                dateStart: "1631-01-01", dateEnd: "1631-12-31", datePrecision: "year",
                confidence: "high", sourceCitation: "Test edition", sourceUrl: "https://example.test/evidence/2", evidenceLocator: "p. 2",
            },
            {
                id: "meeting-1", type: "meeting", participants: ["a", "b"],
                dateStart: "1650-01-01", dateEnd: "1650-12-31", datePrecision: "year",
                confidence: "medium", sourceCitation: "Test edition", sourceUrl: "https://example.test/evidence/3", evidenceLocator: "p. 3",
            },
        ],
        topics: [],
        audit: {},
    };
}

assert.equal(tools.overlapsPeriod({ dateStart: "1629-12-20", dateEnd: "1630-01-10" }, 1630, 1640), true);
assert.equal(tools.overlapsPeriod({ dateStart: "1641-01-01", dateEnd: "1642-01-01" }, 1630, 1640), false);
assert.equal(tools.overlapsPeriod({ dateStart: null, dateEnd: null }, 1630, 1640), false);

{
    const result = tools.validateDataset(fixture());
    assert.equal(result.valid, true);
    assert.equal(result.stats.people, 5);
    assert.equal(result.stats.duplicateFamilies, 1);
}

{
    const core = new Core(fixture(), { minYear: 1600, maxYear: 1660, maxDisplayedEdges: 2 });
    core.setPeriod(1630, 1640);
    const graph = core.buildGraph();
    assert.equal(graph.letterCount, 4, "duplicate families and self-addressed letters must not count");
    assert.equal(graph.edges.length, 3);
    assert.equal(graph.displayedEdges.length, 2);
    assert.equal(graph.metrics.get("m").degree, 3);
    assert.ok(graph.metrics.get("m").betweenness > graph.metrics.get("a").betweenness);
    assert.equal(graph.metrics.get("z").degree, 0);

    const am = graph.edges.find((edge) => edge.key === "a::m");
    assert.equal(am.counts.letters, 2);
    assert.equal(am.counts.mentions, 1);
    assert.equal(am.counts.transmissions, 1);
    assert.equal(am.counts.meetings, 0);
    assert.equal(am.normalized.letters, 1);
    assert.equal(am.contributions.letters, 1);
    assert.equal(am.uncertain, true);

    core.setShowWeakEdges(true);
    assert.equal(core.buildGraph().displayedEdges.length, 3);
}

{
    const core = new Core(fixture());
    core.setPeriod(1650, 1650);
    const graph = core.buildGraph();
    assert.equal(graph.letterCount, 0);
    assert.equal(graph.edges.length, 1);
    assert.equal(graph.edges[0].counts.meetings, 1);
}

{
    const core = new Core(fixture());
    core.getLayerDefinitions().forEach((layer) => core.setCoefficient(layer.key, 0));
    const graph = core.buildGraph();
    assert.equal(graph.edges.length, 0);
    assert.equal(graph.components.length, 5);
}

{
    const core = new Core(fixture());
    core.setPeriod(1630, 1640);
    const analysis = core.analyzeRemoval("m");
    assert.equal(analysis.newlyIsolated.length, 3);
    assert.ok(analysis.reachablePairLoss > 0);
    assert.ok(analysis.reachablePairLossRatio > 0);
    core.setRemovedNode("m");
    const removed = core.buildGraph();
    assert.equal(removed.nodes.some((person) => person.id === "m"), false);
}

{
    const dataContext = { console, globalThis: {} };
    vm.createContext(dataContext);
    vm.runInContext(fs.readFileSync("web/js/natural-philosophy-network-data.js", "utf8"), dataContext);
    vm.runInContext(fs.readFileSync("web/js/natural-philosophy-network-evidence.js", "utf8"), dataContext);
    const data = dataContext.globalThis.NaturalPhilosophyNetworkData;
    assert.equal(data.people.length, 160);
    assert.equal(data.letters.length, 1879);
    assert.ok(data.evidenceEvents.length >= 15 && data.evidenceEvents.length <= 30);
    assert.equal(data.audit.counts.evidenceEvents, data.evidenceEvents.length);
    assert.deepEqual([...new Set(data.evidenceEvents.map((event) => event.type))].sort(), ["mention", "theme", "transmission"]);
    assert.equal(new Set(data.people.map((person) => person.id)).size, 160);
    assert.ok(data.people.some((person) => person.id === "300075"));
    assert.ok(data.people.some((person) => person.id === "300610"));
    assert.equal(new Set(data.letters.map((item) => item.letterFamilyId)).size, 1873);
    const validation = tools.validateDataset(data);
    assert.equal(validation.valid, true, validation.errors.join("\n"));
    assert.equal(validation.stats.unresolvedLetters, 0);
    assert.equal(validation.stats.invalidDates, 0);
    assert.equal(validation.stats.missingSources, 0);
    assert.ok(data.letters.every((item) => item.sourceRecords.every((record) => /^https?:\/\//.test(record.sourceUrl))));
    assert.ok(data.evidenceEvents.every((event) => event.participants.every((id) => data.people.some((person) => person.id === id))));
    assert.ok(data.evidenceEvents.filter((event) => event.type === "transmission" && event.participants.length === 3)
        .every((event) => event.route.length === 3 && new Set(event.route).size === 3));

    const core = new Core(data);
    const graph = core.buildGraph();
    assert.equal(graph.nodes.length, 160);
    assert.equal(graph.letterCount, 1873);
    assert.ok(graph.edges.length > 100);
    assert.ok(graph.edges.some((edge) => edge.counts.transmissions > 0));
    assert.ok(graph.edges.some((edge) => edge.counts.mentions > 0));
    assert.ok(graph.edges.some((edge) => edge.counts.themes > 0));
    assert.equal(graph.edges.some((edge) => edge.counts.meetings > 0), false);
    assert.ok(core.getRanking("betweenness", 5, graph).some((entry) => entry.person.id === "300610"));
}

{
    const builder = "web/js/natural-philosophy-network-data-build.mjs";
    assert.equal(fs.existsSync(builder), true);
    const missingArgument = childProcess.spawnSync(process.execPath, [builder], { encoding: "utf8" });
    assert.notEqual(missingArgument.status, 0);
    assert.match(missingArgument.stderr, /Usage:/);
    const missingInput = childProcess.spawnSync(process.execPath, [builder, ".test-missing-emlo.csv"], { encoding: "utf8" });
    assert.notEqual(missingInput.status, 0);
    assert.match(missingInput.stderr, /not a readable file/);
}

console.log("Natural philosophy network logic and data QA tests passed.");
