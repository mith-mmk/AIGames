#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SEED_IDS = new Set(["300075", "300610"]);
const MAX_PEOPLE = 160;
const DATE_WINDOW = Object.freeze({ start: "1600-01-01", end: "1660-12-31" });
const REQUIRED_COLUMNS = Object.freeze([
    "EMLO Letter ID Number",
    "Year date",
    "Month date",
    "Day date",
    "Standard gregorian date",
    "Date is range (0=No; 1=Yes)",
    "Year 2nd date (range)",
    "Month 2nd date (range)",
    "Day 2nd date (range)",
    "Date as marked on letter",
    "Date approximate (0=No; 1=Yes)",
    "Date inferred (0=No; 1=Yes)",
    "Author",
    "Author EMLO ID",
    "Recipient",
    "Recipient EMLO ID",
    "Original Catalogue name",
    "Source",
    "Matching letter(s) in alternative EMLO catalogue(s) (self reference also)",
    "UUID",
    "EMLO URL",
]);

function fail(message) {
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
}

function usage() {
    process.stderr.write("Usage: node web/js/natural-philosophy-network-data-build.mjs <emlo-snapshot.csv> [output-data.js]\n");
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quoted) {
            if (character === "\"") {
                if (text[index + 1] === "\"") {
                    field += "\"";
                    index += 1;
                } else {
                    quoted = false;
                }
            } else {
                field += character;
            }
        } else if (character === "\"") {
            quoted = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
        } else if (character === "\n") {
            row.push(field.replace(/\r$/, ""));
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    if (quoted) throw new Error("CSV ended inside a quoted field");
    if (field || row.length) {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
    }
    return rows;
}

function values(value) {
    return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function listItem(items, index) {
    return items[index] || items[0] || "";
}

function dateInfo(record) {
    const standard = record["Standard gregorian date"];
    const year = record["Year date"];
    const month = record["Month date"];
    const day = record["Day date"];
    const secondYear = record["Year 2nd date (range)"];
    const secondMonth = record["Month 2nd date (range)"];
    const secondDay = record["Day 2nd date (range)"];
    const pad = (number) => String(number).padStart(2, "0");
    const dateStart = standard || (year ? `${year}-${pad(month || 1)}-${pad(day || 1)}` : "");
    const dateEnd = secondYear ? `${secondYear}-${pad(secondMonth || 12)}-${pad(secondDay || 31)}` : dateStart;
    const isRange = record["Date is range (0=No; 1=Yes)"] === "1";
    let datePrecision = "exact";

    if (isRange) datePrecision = "range";
    else if (!month) datePrecision = "year";
    else if (!day) datePrecision = "month";
    else if (record["Date approximate (0=No; 1=Yes)"] === "1") datePrecision = "approximate";

    return {
        dateOriginal: record["Date as marked on letter"] || standard || year || "",
        dateStart,
        dateEnd: isRange ? dateEnd : dateStart,
        datePrecision,
        dateBasis: record["Date inferred (0=No; 1=Yes)"] === "1" ? "inferred" : "editorial",
    };
}

function intersectsDateWindow(date) {
    return date.dateStart && date.dateEnd && date.dateStart <= DATE_WINDOW.end && date.dateEnd >= DATE_WINDOW.start;
}

function sourceRecord(record) {
    return {
        recordId: `emlo:${record["EMLO Letter ID Number"]}`,
        catalogue: record["Original Catalogue name"] || null,
        source: record.Source || null,
        uuid: record.UUID || null,
        sourceUrl: record["EMLO URL"] || null,
        alternativeRecordIds: values(record["Matching letter(s) in alternative EMLO catalogue(s) (self reference also)"]).map((id) => `emlo:${id}`),
    };
}

function familyId(record) {
    const alternatives = values(record["Matching letter(s) in alternative EMLO catalogue(s) (self reference also)"]);
    const familyMembers = alternatives.length ? alternatives : [record["EMLO Letter ID Number"]];
    const numbers = familyMembers.map(Number);
    if (numbers.some((number) => !Number.isFinite(number))) {
        throw new Error(`Invalid EMLO family identifier for record ${record["EMLO Letter ID Number"]}`);
    }
    return `emlo-family:${numbers.sort((left, right) => left - right)[0]}`;
}

function readRecords(inputPath) {
    const bytes = fs.readFileSync(inputPath);
    const rows = parseCsv(bytes.toString("utf8"));
    const headers = rows.shift();
    if (!headers || headers.length === 0) throw new Error("CSV has no header row");

    const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
    if (missing.length) throw new Error(`CSV is not the expected EMLO snapshot; missing column(s): ${missing.join(", ")}`);

    return {
        bytes,
        records: rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))),
    };
}

function createData(inputPath) {
    const { bytes, records } = readRecords(inputPath);
    const names = new Map();
    const observations = [];
    const exclusions = {
        outsideDateWindow: 0,
        unresolvedParticipants: 0,
        notIncidentToSeed: 0,
        selfPairs: 0,
        excludedAfterPeopleCap: 0,
    };

    for (const record of records) {
        const date = dateInfo(record);
        if (!intersectsDateWindow(date)) {
            exclusions.outsideDateWindow += 1;
            continue;
        }

        const authorIds = values(record["Author EMLO ID"]);
        const recipientIds = values(record["Recipient EMLO ID"]);
        if (!authorIds.length || !recipientIds.length) {
            exclusions.unresolvedParticipants += 1;
            continue;
        }
        if (![...authorIds, ...recipientIds].some((id) => SEED_IDS.has(id))) {
            exclusions.notIncidentToSeed += 1;
            continue;
        }

        const authorNames = values(record.Author);
        const recipientNames = values(record.Recipient);
        authorIds.forEach((id, index) => names.set(id, names.get(id) || listItem(authorNames, index)));
        recipientIds.forEach((id, index) => names.set(id, names.get(id) || listItem(recipientNames, index)));

        for (let authorIndex = 0; authorIndex < authorIds.length; authorIndex += 1) {
            for (let recipientIndex = 0; recipientIndex < recipientIds.length; recipientIndex += 1) {
                const senderId = authorIds[authorIndex];
                const recipientId = recipientIds[recipientIndex];
                if (senderId === recipientId) {
                    exclusions.selfPairs += 1;
                    continue;
                }
                observations.push({
                    id: `emlo:${record["EMLO Letter ID Number"]}${authorIds.length > 1 || recipientIds.length > 1 ? `:${authorIndex}-${recipientIndex}` : ""}`,
                    letterFamilyId: familyId(record),
                    senderId,
                    recipientId,
                    ...date,
                    sourceRecords: [sourceRecord(record)],
                });
            }
        }
    }

    const contactFamilies = new Map();
    for (const letter of observations) {
        for (const seedId of SEED_IDS) {
            if (letter.senderId !== seedId && letter.recipientId !== seedId) continue;
            const otherId = letter.senderId === seedId ? letter.recipientId : letter.senderId;
            if (SEED_IDS.has(otherId)) continue;
            if (!contactFamilies.has(otherId)) contactFamilies.set(otherId, new Set());
            contactFamilies.get(otherId).add(letter.letterFamilyId);
        }
    }

    const rankedContacts = [...contactFamilies.entries()]
        .sort((left, right) => right[1].size - left[1].size || String(names.get(left[0])).localeCompare(String(names.get(right[0]))) || left[0].localeCompare(right[0]));
    const selectedIds = new Set(SEED_IDS);
    rankedContacts.slice(0, MAX_PEOPLE - selectedIds.size).forEach(([id]) => selectedIds.add(id));
    const letters = observations.filter((letter) => selectedIds.has(letter.senderId) && selectedIds.has(letter.recipientId));
    exclusions.excludedAfterPeopleCap = observations.length - letters.length;

    const specialRoles = {
        "300075": ["philosopher", "mathematician", "EMLO correspondent"],
        "300610": ["Minim friar", "natural philosopher", "EMLO correspondent"],
    };
    const people = [...selectedIds]
        .map((id) => ({
            id,
            preferredName: names.get(id) || `EMLO person ${id}`,
            names: [names.get(id) || `EMLO person ${id}`],
            birthYear: null,
            deathYear: null,
            roles: specialRoles[id] || ["EMLO correspondent"],
            authorityUrls: [`https://emlo.bodleian.ox.ac.uk/profile/person/${id}`],
            selectionReason: SEED_IDS.has(id) ? "seed" : "ranked_direct_correspondence",
        }))
        .sort((left, right) => left.preferredName.localeCompare(right.preferredName) || left.id.localeCompare(right.id));

    const audit = {
        generatedAt: new Date().toISOString(),
        extraction: {
            sourceRows: records.length,
            dateWindow: DATE_WINDOW,
            seeds: [...SEED_IDS],
            peopleCap: MAX_PEOPLE,
            selection: "Count unique EMLO letterFamilyId values incident to either seed; descending count, then preferred name, then EMLO id. Retain seed nodes and the top 158 other people. Keep only observed correspondence whose two endpoints are selected.",
            dateCondition: "Keep a record when its normalized Gregorian [dateStart, dateEnd] intersects the inclusive 1600-01-01 through 1660-12-31 window.",
            participantCondition: "Require resolved EMLO author and recipient IDs and at least one seed ID before expansion.",
            multiPartyHandling: "Semicolon-separated EMLO author and recipient values are expanded to author-recipient pairs. The source record is retained unchanged on each expanded observation.",
            duplicateHandling: "letterFamilyId is the numerically lowest EMLO ID in the source row's EMLO alternative-match list, or its own EMLO ID when no match list is supplied. Raw catalogue records are retained; analyses should count one family only once.",
        },
        counts: {
            selectedPeople: people.length,
            observedLetterRecords: letters.length,
            uniqueLetterFamilies: new Set(letters.map((letter) => letter.letterFamilyId)).size,
            evidenceEvents: 0,
            topics: 0,
        },
        exclusions,
        limitations: [
            "This release contains observed correspondence metadata only. It does not infer mentions, transmissions, themes, meetings, or intellectual influence from graph structure.",
            "Birth/death years are deliberately null unless separately authority-verified; this build does not use name-string matching to merge people.",
            "The 160-person cap is a reproducible display-oriented extraction, not a claim that excluded correspondents were historically unimportant.",
        ],
    };

    return {
        manifest: {
            title: "Natural Philosophy Network: EMLO correspondence core",
            schemaVersion: "1.0.0",
            dataClass: "observed_correspondence_metadata",
            source: "Early Modern Letters Online (EMLO) snapshot extracted 31 January 2019",
            sourceUrl: "https://ora.ox.ac.uk/objects/uuid:98641e69-0e46-4abf-8083-c60be61959e5",
            sourceFile: path.basename(inputPath),
            doi: "10.5287/ora-rj092721d",
            license: "CC BY-NC-SA 4.0",
            sourceSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
            generatedFrom: "Official EMLO CSV; no synthetic links or inferred events included.",
        },
        people,
        letters,
        evidenceEvents: [],
        topics: [],
        audit,
    };
}

function outputSource(data) {
    return `/* Generated from the official EMLO snapshot. See web/assets/natural-philosophy-network/DATA_README.md. */\n(function attachNaturalPhilosophyNetworkData(globalScope) {\n    "use strict";\n\n    globalScope.NaturalPhilosophyNetworkData = Object.freeze(${JSON.stringify(data, null, 4)});\n}(globalThis));\n`;
}

function main() {
    const inputPath = process.argv[2];
    const defaultOutput = path.join(path.dirname(fileURLToPath(import.meta.url)), "natural-philosophy-network-data.js");
    const outputPath = process.argv[3] || defaultOutput;
    if (!inputPath || process.argv.length > 4) {
        usage();
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
        fail(`input CSV is not a readable file: ${inputPath}`);
        return;
    }

    const data = createData(inputPath);
    fs.writeFileSync(outputPath, outputSource(data), "utf8");
    process.stdout.write(`${JSON.stringify({ output: path.basename(outputPath), ...data.audit.counts, exclusions: data.audit.exclusions })}\n`);
}

try {
    main();
} catch (error) {
    fail(error instanceof Error ? error.message : String(error));
}
