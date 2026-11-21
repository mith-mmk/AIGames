(function defineEdoFireCommandData(globalScope) {
    "use strict";

    const WIDTH = 12;
    const HEIGHT = 9;

    const TILE_TYPES = Object.freeze({
        road: Object.freeze({ label: "道", passable: true, fuel: 0, color: "#c9b98f" }),
        assembly: Object.freeze({ label: "避難所", passable: true, fuel: 0, color: "#d8c37a" }),
        well: Object.freeze({ label: "井戸", passable: true, fuel: 0, color: "#7194a0" }),
        canal: Object.freeze({ label: "水路", passable: false, fuel: 0, color: "#527f8c" }),
        house: Object.freeze({ label: "町家", passable: false, fuel: 3, color: "#7f5138" }),
        landmark: Object.freeze({ label: "重要施設", passable: false, fuel: 4, color: "#4f342b" }),
        rubble: Object.freeze({ label: "瓦礫", passable: true, fuel: 0, color: "#686158" }),
    });

    const MAP_SYMBOLS = Object.freeze({
        ".": "road",
        "A": "assembly",
        "W": "well",
        "~": "canal",
        "H": "house",
        "L": "landmark",
    });

    const SQUAD_TYPES = Object.freeze({
        water: Object.freeze({ label: "水組", mark: "水", move: 3, waterMax: 4, action: "extinguish", description: "隣接する火を弱め、井戸や水路で補給する" }),
        ladder: Object.freeze({ label: "梯子組", mark: "梯", move: 4, waterMax: 0, action: "rescue", description: "隣接する町家から住民を救い出す" }),
        tobi: Object.freeze({ label: "鳶組", mark: "鳶", move: 3, waterMax: 0, action: "demolish", description: "無人の町家を壊して延焼を断つ" }),
    });

    const WINDS = Object.freeze({
        N: Object.freeze({ label: "北風", arrow: "↓", dx: 0, dy: 1 }),
        E: Object.freeze({ label: "東風", arrow: "←", dx: -1, dy: 0 }),
        S: Object.freeze({ label: "南風", arrow: "↑", dx: 0, dy: -1 }),
        W: Object.freeze({ label: "西風", arrow: "→", dx: 1, dy: 0 }),
    });

    const BASE_MAP = Object.freeze([
        "............",
        ".HH.HH.HH...",
        ".H..H..H....",
        "...W........",
        ".HH.HL.HH...",
        "............",
        ".H..H..H.A..",
        ".HH.HH.HH...",
        "............",
    ]);

    const CANAL_MAP = Object.freeze([
        "............",
        ".HH.HH.HH...",
        ".H..H..H....",
        "...W....~...",
        ".HH.HL.H~...",
        "........~...",
        ".H..H..H.A..",
        ".HH.HH.HH...",
        "............",
    ]);

    const BRIDGE_MAP = Object.freeze([
        ".....~......",
        ".HH..~.HHH..",
        ".H...~...H..",
        "..W..~......",
        ".HH.LL.HH...",
        ".....~......",
        ".H...~.H..A.",
        ".HH..~.HHH..",
        "............",
    ]);

    const SCENARIOS = Object.freeze([
        Object.freeze({
            id: "small-fire",
            number: 1,
            title: "桶町の小火",
            subtitle: "水組・梯子組・鳶組を動かし、町家と住民を守れ。",
            maxTurns: 8,
            casualtyLimit: 0,
            destructionLimit: 5,
            demolitionLimit: 1,
            seed: 1107,
            map: BASE_MAP,
            initialWind: "W",
            emberChance: 0,
            squads: Object.freeze([
                Object.freeze({ id: "water-1", type: "water", x: 2, y: 3 }),
                Object.freeze({ id: "ladder-1", type: "ladder", x: 7, y: 5 }),
                Object.freeze({ id: "tobi-1", type: "tobi", x: 9, y: 7 }),
            ]),
            fires: Object.freeze([{ x: 4, y: 2 }, { x: 8, y: 4 }]),
            civilians: Object.freeze([{ x: 7, y: 4, count: 1 }]),
            events: Object.freeze([]),
            hints: Object.freeze(["水組は消火、梯子組は救助、鳶組は破壊消防を担当します。", "まず移動先を定め、次に組ごとの行動対象を選びます。"]),
        }),
        Object.freeze({
            id: "row-house-rescue",
            number: 2,
            title: "長屋裏の取り残し",
            subtitle: "梯子組で住民を救い、火を長屋から離せ。",
            maxTurns: 10,
            casualtyLimit: 1,
            destructionLimit: 7,
            demolitionLimit: 1,
            seed: 2219,
            map: BASE_MAP,
            initialWind: "N",
            emberChance: 0,
            squads: Object.freeze([
                Object.freeze({ id: "water-1", type: "water", x: 3, y: 3 }),
                Object.freeze({ id: "ladder-1", type: "ladder", x: 5, y: 5 }),
                Object.freeze({ id: "tobi-1", type: "tobi", x: 9, y: 5 }),
            ]),
            fires: Object.freeze([{ x: 4, y: 1 }]),
            civilians: Object.freeze([{ x: 5, y: 1, count: 1 }, { x: 4, y: 4, count: 1 }]),
            events: Object.freeze([]),
            hints: Object.freeze(["人の印がある町家は、梯子組が救助するまで破壊できません。", "鳶組の破壊は評価を下げますが、確実な防火帯になります。"]),
        }),
        Object.freeze({
            id: "bridge-wind",
            number: 3,
            title: "橋詰の風回り",
            subtitle: "二手先の風を読み、橋詰の番屋を守れ。",
            maxTurns: 11,
            casualtyLimit: 1,
            destructionLimit: 8,
            demolitionLimit: 2,
            seed: 3371,
            map: BRIDGE_MAP,
            initialWind: "W",
            emberChance: 0,
            squads: Object.freeze([
                Object.freeze({ id: "water-1", type: "water", x: 2, y: 3 }),
                Object.freeze({ id: "water-2", type: "water", x: 7, y: 3 }),
                Object.freeze({ id: "ladder-1", type: "ladder", x: 9, y: 6 }),
                Object.freeze({ id: "tobi-1", type: "tobi", x: 4, y: 5 }),
            ]),
            fires: Object.freeze([{ x: 2, y: 4 }, { x: 8, y: 1 }]),
            civilians: Object.freeze([{ x: 9, y: 1, count: 1 }]),
            events: Object.freeze([
                Object.freeze({ turn: 4, type: "wind", wind: "S", message: "風が南へ回った。火の粉は北へ走る。" }),
                Object.freeze({ turn: 7, type: "wind", wind: "E", message: "東風。橋詰の西側に注意。" }),
            ]),
            hints: Object.freeze(["風向きは矢印が火の流れる方向を示します。", "予報は何も命令しなかった場合の正確な二手先です。"]),
        }),
        Object.freeze({
            id: "warehouse-embers",
            number: 4,
            title: "蔵通りの飛び火",
            subtitle: "水路を越える火の粉を読み、蔵を焼かせるな。",
            maxTurns: 12,
            casualtyLimit: 1,
            destructionLimit: 9,
            demolitionLimit: 3,
            seed: 4409,
            map: CANAL_MAP,
            initialWind: "W",
            emberChance: 0.32,
            squads: Object.freeze([
                Object.freeze({ id: "water-1", type: "water", x: 3, y: 3 }),
                Object.freeze({ id: "water-2", type: "water", x: 9, y: 3 }),
                Object.freeze({ id: "ladder-1", type: "ladder", x: 9, y: 6 }),
                Object.freeze({ id: "tobi-1", type: "tobi", x: 5, y: 5 }),
            ]),
            fires: Object.freeze([{ x: 2, y: 4 }, { x: 8, y: 1 }]),
            civilians: Object.freeze([{ x: 7, y: 6, count: 1 }]),
            events: Object.freeze([
                Object.freeze({ turn: 5, type: "ignite", x: 4, y: 7, message: "南の長屋に火の粉が落ちた。" }),
            ]),
            hints: Object.freeze(["強い火は二マス風下へ火の粉を飛ばすことがあります。", "飛び火も二手予報に含まれます。"]),
        }),
        Object.freeze({
            id: "river-conflagration",
            number: 5,
            title: "大川端大火",
            subtitle: "全組を束ね、二つの火元と風の変化を制圧せよ。",
            maxTurns: 14,
            casualtyLimit: 2,
            destructionLimit: 11,
            demolitionLimit: 4,
            seed: 5531,
            map: CANAL_MAP,
            initialWind: "N",
            emberChance: 0.38,
            squads: Object.freeze([
                Object.freeze({ id: "water-1", type: "water", x: 3, y: 3 }),
                Object.freeze({ id: "water-2", type: "water", x: 9, y: 5 }),
                Object.freeze({ id: "water-3", type: "water", x: 1, y: 5 }),
                Object.freeze({ id: "ladder-1", type: "ladder", x: 10, y: 6 }),
                Object.freeze({ id: "tobi-1", type: "tobi", x: 6, y: 5 }),
            ]),
            fires: Object.freeze([{ x: 1, y: 1 }, { x: 8, y: 4 }]),
            civilians: Object.freeze([{ x: 2, y: 1, count: 1 }, { x: 7, y: 6, count: 1 }, { x: 5, y: 7, count: 1 }]),
            events: Object.freeze([
                Object.freeze({ turn: 4, type: "wind", wind: "W", message: "北風が止み、西から強く吹き始めた。" }),
                Object.freeze({ turn: 6, type: "ignite", x: 5, y: 7, message: "避難中の南長屋から出火。" }),
                Object.freeze({ turn: 9, type: "wind", wind: "S", message: "風が南へ回る。北側を固めよ。" }),
            ]),
            hints: Object.freeze(["救助、補給、防火帯を同時に進めます。", "番屋を失うか、犠牲者と焼失数が限界を超えると敗北です。"]),
        }),
    ]);

    for (const scenario of SCENARIOS) {
        if (scenario.map.length !== HEIGHT || scenario.map.some((row) => row.length !== WIDTH)) {
            throw new Error(`Invalid map size: ${scenario.id}`);
        }
    }

    globalScope.EdoFireCommandData = Object.freeze({ WIDTH, HEIGHT, TILE_TYPES, MAP_SYMBOLS, SQUAD_TYPES, WINDS, SCENARIOS });
})(globalThis);
