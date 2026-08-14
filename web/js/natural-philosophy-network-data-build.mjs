#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SEED_IDS = new Set(["300075", "300610"]);
const MAX_PEOPLE = 160;
const DATE_WINDOW = Object.freeze({ start: "1600-01-01", end: "1660-12-31" });
const DISPLAY_NAMES_JA = Object.freeze({
    "399": "シクスティヌス・アママ", "200139": "トビアス・アンドレアエ", "905394": "アンヌ・ダルシー", "902763": "アントワーヌ・アルノー", "903276": "アドリアン・オズー", "906102": "ジョヴァンニ・バッティスタ・バリアーニ", "903678": "ジャン＝ルイ・ゲーズ・ド・バルザック", "903680": "ヤン・アルベルト・バン",
    "1280": "アントニオ・バルベリーニ", "905371": "ジャン・ボーグラン", "903681": "フロリモン・ド・ボーヌ", "903506": "イサーク・ベークマン", "2265": "ヨハン・ファン・ベーフェルウェイク", "906215": "フランソワ・ボノー・デュ・ヴェルデュ", "906104": "ボネル", "905278": "ジャン＝ジャック・ブシャール",
    "900430": "イスマエル・ブリオー", "902731": "ピエール・ブルダン", "903683": "ジャン・ブラセ", "905357": "クロード・ブルドー", "906017": "ピエール・ブリュラール", "906016": "ジャン・ブラン", "903299": "ヘンリク・ブルーノ", "900189": "ヨハネス・ブクストルフ",
    "900093": "ピエール・ド・カルカヴィ", "905975": "ボナヴェントゥラ・カヴァリエーリ", "300302": "チャールズ・キャヴェンディッシュ", "4454": "ウィリアム・キャヴェンディッシュ", "903316": "ピエール＝エクトル・シャニュ", "903684": "エティエンヌ・シャルレ", "905379": "ジャン・シャトリエ", "4876": "クリスティナ",
    "902393": "ヨハネス・シールマンス", "903685": "クロード・クレルスリエ", "906188": "ジャン・コロンビ", "903686": "シャルル・ド・コンドラン", "905389": "ロベール・コルニエ", "905980": "コルニュ", "906189": "ジル・コサール", "902216": "カッシアーノ・ダル・ポッツォ",
    "903688": "ジャン・デリエンヌ", "903689": "ジラール・デザルグ", "903690": "ジョアシャン・デカルト", "903691": "ジョアシャン・デカルト", "903692": "ピエール・デカルト", "300075": "ルネ・デカルト", "905986": "テオドール・デシャン", "906261": "ピエール・デヌワイエ",
    "6711": "ケネルム・ディグビー", "300339": "ラインホルト・ディルガー", "903693": "ジャック・ディネ", "7015": "ジョヴァンニ・バッティスタ・ドーニ", "906218": "ジャン・デュレル", "300355": "ローレンツ・アイヒシュテット", "903445": "エリーザベト・フォン・デア・プファルツ", "600355": "オノレ・ファブリ",
    "905388": "フォール", "600027": "ピエール・ド・フェルマー", "903695": "ジャン・フェリエ", "903696": "ニコラ・ド・フレセル", "905377": "フルーリー", "903698": "フランソワ・フルネ", "906111": "ジャン・フランソワ", "905359": "ジャン・ルネ・フランソワ",
    "600033": "ベルナール・フレニクル・ド・ベシー", "5264": "ヤコブス・フリス", "900171": "リベール・フロワモン", "902035": "ジャック・ガファレル", "906065": "エメ・ド・ゲニエール", "600482": "ガリレオ・ガリレイ", "900042": "ピエール・ガッサンディ", "906248": "ゴデ",
    "906018": "ジャン＝バティスト・ジョフロワ", "903699": "ギヨーム・ジビウフ", "8954": "ヤコブ・ファン・ホール", "900019": "フーゴー・グロティウス", "300095": "テオドール・ハーク", "903701": "ジェルマン・アベール・ド・セリジー", "903377": "アンリ＝ルイ・アベール・ド・モンモール", "903627": "ゴドフリドゥス・ファン・ハーストレヒト",
    "905370": "ジャック・アレ", "906251": "ラウル・ド・アレ", "300096": "クロード・アルディ", "300446": "サミュエル・ハートリブ", "900096": "ヤン・バプティスト・ファン・ヘルモント", "200168": "エドワード・ハーバート", "300472": "ヨハネス・ヘヴェリウス", "11119": "トマス・ホッブズ",
    "903704": "コルネリス・ファン・ホーヘランデ", "23036": "ルカス・ホルステニウス", "11763": "クリスティアーン・ホイヘンス", "11527": "コンスタンティン・ホイヘンス", "903705": "アンドレ・ジュモー", "300115": "アタナシウス・キルヒャー", "200001": "ヤン・アモス・コメニウス", "905361": "ガブリエル・ド・ラ・シャルロニー",
    "906211": "ラコンブ", "903706": "ジャン・ド・ローノワ", "905353": "ピエール・ル・ロワイエ", "907166": "ライデン大学", "903403": "ダヴィド・ル・ド・ヴィレム", "903412": "エマニュエル・メニャン", "906223": "トマ・ド・マルテル", "906015": "ジェームズ・マーティン",
    "906216": "ジャン＝バティスト・マゾワイエ", "906239": "ニコラ・メリャン", "300610": "マラン・メルセンヌ", "906173": "ド・メル", "903708": "ドニ・メラン", "903428": "ローラン・メーム", "903709": "ラザール・メソニエ", "300645": "ヨハン・モヒンガー",
    "907652": "アレクサンダー・モア", "14890": "ヘンリー・モア", "902522": "ジャン・モラン", "903710": "ジャン＝バティスト・モラン", "906178": "ピエール・ムニエ", "906272": "トマス・ムニョス・デ・エスピノサ", "900356": "クロード・ミドルジュ", "902531": "ジャン＝フランソワ・ニセロン",
    "905384": "フランソワ・ド・ラ・ヌエ", "906213": "アントワーヌ・パラン", "901892": "ジャン・ペケ", "16232": "ニコラ＝クロード・ファブリ・ド・ペイレスク", "300521": "ジョン・ペル", "906271": "ピエール・ペリエ", "906256": "ジャン・フィリポー", "903713": "クロード・ピコ",
    "16609": "フォピスクス・フォルトゥナトゥス・プレムピウス", "903714": "アルフォンス・ド・ポロ", "906214": "ジャック・ピュジョ", "905364": "アンリ・ド・レフュージュ", "903715": "ヘンリクス・レギウス", "903716": "ヘンリクス・レネリ", "905372": "ジャン・レイ", "903461": "ミケランジェロ・リッチ",
    "906182": "クロード・リシャール", "17572": "アンドレ・リヴェ", "903462": "ジル・ペルソヌ・ド・ロベルヴァル", "906229": "ロモレス", "300718": "マルティン・ルアール", "902568": "グレゴワール・ド・サン＝ヴァンサン", "18043": "クロード・ド・ソメーズ", "600017": "フランス・ファン・スホーテン",
    "913654": "ゾフィー・フォン・ハノーファー", "13180": "サミュエル・ソルビエール", "906185": "ジャック＝アレクサンドル・ル・トヌール", "906186": "ガブリエル・ティボー", "905373": "ジャン・ティトルーズ", "901899": "エヴァンジェリスタ・トリチェリ", "903934": "不明", "6854": "氏名不詳の男性",
    "905369": "ジャック・ド・ヴァロワ", "905996": "ルイ＝エマニュエル・ド・ヴァロワ", "300655": "アントワーヌ・ヴァティエ", "300792": "フィリップ・エルンスト・フェーへリン・ファン・クラールベルヘン", "903723": "エティエンヌ・ド・ヴィルブルシュー", "905391": "クリストフ・ド・ヴィリエ", "21225": "ギスベルト・フート", "903719": "アントニス・ストゥドレル・ファン・ズュルク",
});
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

function displayNameJa(id) {
    const displayName = DISPLAY_NAMES_JA[id];
    if (!displayName) throw new Error(`No Japanese display name is defined for selected EMLO person ${id}`);
    return displayName;
}

function normalizedObservationKey(letter) {
    return JSON.stringify({
        letterFamilyId: letter.letterFamilyId,
        senderId: letter.senderId,
        recipientId: letter.recipientId,
        dateOriginal: letter.dateOriginal,
        dateStart: letter.dateStart,
        dateEnd: letter.dateEnd,
        datePrecision: letter.datePrecision,
        dateBasis: letter.dateBasis,
    });
}

function deduplicateNormalizedObservations(observations) {
    const uniqueByKey = new Map();
    for (const observation of [...observations].sort((left, right) => left.id.localeCompare(right.id))) {
        const key = normalizedObservationKey(observation);
        const existing = uniqueByKey.get(key);
        if (!existing) {
            uniqueByKey.set(key, { ...observation, sourceRecords: [...observation.sourceRecords] });
            continue;
        }
        existing.sourceRecords.push(...observation.sourceRecords);
    }
    return [...uniqueByKey.values()].map((observation) => ({
        ...observation,
        sourceRecords: [...new Map(observation.sourceRecords.map((source) => [`${source.recordId}\u0000${source.sourceUrl || ""}`, source])).values()].sort((left, right) => left.recordId.localeCompare(right.recordId) || String(left.sourceUrl).localeCompare(String(right.sourceUrl))),
    }));
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
        notSeedForRanking: 0,
        selfPairs: 0,
        excludedAfterPeopleCap: 0,
        duplicateNormalizedObservations: 0,
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
        const isSeedIncident = [...authorIds, ...recipientIds].some((id) => SEED_IDS.has(id));
        if (!isSeedIncident) exclusions.notSeedForRanking += 1;

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
    const rankingObservations = observations.filter((letter) => SEED_IDS.has(letter.senderId) || SEED_IDS.has(letter.recipientId));
    for (const letter of rankingObservations) {
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
    const selectedObservations = observations.filter((letter) => selectedIds.has(letter.senderId) && selectedIds.has(letter.recipientId));
    exclusions.excludedAfterPeopleCap = observations.length - selectedObservations.length;
    const letters = deduplicateNormalizedObservations(selectedObservations);
    exclusions.duplicateNormalizedObservations = selectedObservations.length - letters.length;

    const specialRoles = {
        "300075": ["philosopher", "mathematician", "EMLO correspondent"],
        "300610": ["Minim friar", "natural philosopher", "EMLO correspondent"],
    };
    const people = [...selectedIds]
        .map((id) => ({
            id,
            preferredName: names.get(id) || `EMLO person ${id}`,
            displayNameJa: displayNameJa(id),
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
            selection: "Rank non-seed people by unique EMLO letterFamilyId values incident to either seed, descending count, then preferred name, then EMLO id. Retain seed nodes and the top 158 other people. Then retain every normalized observation whose two endpoints are selected.",
            dateCondition: "Keep a record when its normalized Gregorian [dateStart, dateEnd] intersects the inclusive 1600-01-01 through 1660-12-31 window.",
            participantCondition: "Require resolved EMLO author and recipient IDs before expansion.",
            rankingCondition: "Use only observations incident to René Descartes (300075) or Marin Mersenne (300610) when ranking the 158 non-seed people.",
            multiPartyHandling: "Semicolon-separated EMLO author and recipient values are expanded to author-recipient pairs. The source record is retained unchanged on each expanded observation.",
            duplicateHandling: "letterFamilyId is the numerically lowest EMLO ID in the source row's EMLO alternative-match list, or its own EMLO ID when no match list is supplied. Raw catalogue records are retained; analyses should count one family only once.",
            normalizedObservationDeduplication: "After endpoint selection, records with identical family, sender, recipient, original/normalized date fields, precision, and date basis are merged deterministically. sourceRecords are de-duplicated by record id plus source URL, while distinct alternative-catalogue source records remain attached to the merged observation.",
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
