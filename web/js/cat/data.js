(function () {
    "use strict";

    const CANVAS = {
        width: 1280,
        height: 720,
        uiHeight: 80,
        groundY: 600,
        playTop: 80,
        playBottom: 620,
    };

    const CAT = {
        drawWidth: 96,
        drawHeight: 96,
        hitWidth: 56,
        hitHeight: 72,
        footOffset: 12,
        gravity: 2200,
        jumpVelocity: -820,
        baseSpeed: 205,
        leftSpeed: -120,
        rightSpeed: 305,
        crouchSpeed: 115,
    };

    const ITEM_TYPES = {
        fish: { label: "小魚", score: 10, collection: "拾った魚", width: 48, height: 48, rarity: 54 },
        yarn: { label: "毛糸玉", score: 25, collection: "見つけた毛糸玉", width: 48, height: 48, rarity: 26 },
        bell: { label: "鈴", score: 80, collection: "鈴", width: 40, height: 40, rarity: 8 },
        catGrass: { label: "ねこ草", score: 35, collection: "ねこ草", width: 48, height: 48, rarity: 18, heal: 20 },
        acorn: { label: "どんぐり", score: 15, collection: "どんぐり", width: 42, height: 42, rarity: 20 },
        sunsetShard: { label: "夕焼けのかけら", score: 120, collection: "夕焼けのかけら", width: 44, height: 44, rarity: 4 },
        mysteryButton: { label: "謎のボタン", score: 60, collection: "謎のボタン", width: 44, height: 44, rarity: 7, randomEvent: true },
        glove: { label: "誰かの手袋", score: 45, collection: "誰かの手袋", width: 50, height: 38, rarity: 12 },
    };

    const OBSTACLE_TYPES = {
        puddle: { label: "水たまり", surprise: 20, width: 120, height: 48, collection: "水たまり", kind: "ground" },
        cardboard: { label: "段ボール", surprise: 15, width: 96, height: 96, collection: "段ボール", slow: 0.55 },
        vacuum: { label: "掃除機", surprise: 40, width: 160, height: 96, collection: "掃除機", kind: "noise" },
        dog: { label: "わんこ", surprise: 60, width: 112, height: 112, collection: "わんこ", chase: true },
        bicycle: { label: "自転車", surprise: 35, width: 130, height: 84, collection: "自転車", speed: -120 },
        flowerpot: { label: "植木鉢", surprise: 28, width: 64, height: 64, collection: "植木鉢" },
        door: { label: "急に開くドア", surprise: 45, width: 86, height: 118, collection: "急に開くドア", timed: true },
    };

    const DEFAULT_CUSTOMIZATION = {
        collar: "red",
        bell: "gold",
        tail: "big",
        face: "bright",
    };

    const STAGE_MANIFEST = [
        "stage01-room.json",
        "stage02-garden.json",
        "stage03-wall.json",
        "stage04-shopping-street.json",
        "stage05-rooftop.json",
        "stage06-night-alley.json",
    ];

    const FALLBACK_STAGES = [
        {
            id: "room",
            name: "へや",
            theme: {
                sky: "#b9e4f5",
                far: "#f4ddbd",
                mid: "#e8cfa8",
                ground: "#b9895d",
                accent: "#8f6042",
                music: "room",
            },
            layers: { far: "room-far.png", mid: "room-mid.png", ground: "room-ground.png", props: "room-props.png" },
            spawnTables: {
                items: ["fish", "yarn", "bell", "catGrass", "glove"],
                obstacles: ["puddle", "cardboard", "vacuum", "door"],
            },
            unlocks: { distance: 0, collection: null },
        },
        {
            id: "garden",
            name: "にわ",
            theme: {
                sky: "#96d7ed",
                far: "#cfe9ad",
                mid: "#9ac878",
                ground: "#7d9a52",
                accent: "#57763e",
                music: "garden",
            },
            layers: { far: "garden-far.png", mid: "garden-mid.png", ground: "garden-ground.png", props: "garden-props.png" },
            spawnTables: {
                items: ["fish", "yarn", "catGrass", "acorn", "mysteryButton"],
                obstacles: ["puddle", "dog", "flowerpot", "bicycle"],
            },
            unlocks: { distance: 240, collection: null },
        },
        {
            id: "wall",
            name: "へいの上",
            theme: {
                sky: "#c9ecff",
                far: "#ddd3c4",
                mid: "#b8b0a2",
                ground: "#8c8173",
                accent: "#5d5852",
                music: "wall",
            },
            layers: { far: "wall-far.png", mid: "wall-mid.png", ground: "wall-ground.png", props: "wall-props.png" },
            spawnTables: {
                items: ["fish", "bell", "acorn", "sunsetShard", "glove"],
                obstacles: ["flowerpot", "bicycle", "dog", "door"],
            },
            unlocks: { distance: 520, collection: null },
        },
        {
            id: "shopping",
            name: "商店街",
            theme: {
                sky: "#ffd9a8",
                far: "#d5b588",
                mid: "#c68f63",
                ground: "#766152",
                accent: "#ad4f43",
                music: "town",
            },
            layers: { far: "shopping-far.png", mid: "shopping-mid.png", ground: "shopping-ground.png", props: "shopping-props.png" },
            spawnTables: {
                items: ["fish", "yarn", "bell", "mysteryButton", "glove"],
                obstacles: ["puddle", "dog", "bicycle", "door", "cardboard"],
            },
            unlocks: { distance: 860, collection: "鈴" },
        },
        {
            id: "rooftop",
            name: "屋根の上",
            theme: {
                sky: "#f0b27a",
                far: "#c47861",
                mid: "#915e5f",
                ground: "#5b5260",
                accent: "#e9c46a",
                music: "sunset",
            },
            layers: { far: "rooftop-far.png", mid: "rooftop-mid.png", ground: "rooftop-ground.png", props: "rooftop-props.png" },
            spawnTables: {
                items: ["fish", "bell", "sunsetShard", "acorn", "catGrass"],
                obstacles: ["flowerpot", "bicycle", "dog", "puddle"],
            },
            unlocks: { distance: 1240, collection: "夕焼けのかけら" },
        },
        {
            id: "night",
            name: "夜の路地",
            theme: {
                sky: "#25283d",
                far: "#3b3355",
                mid: "#4a3f63",
                ground: "#242733",
                accent: "#f6d365",
                music: "night",
            },
            layers: { far: "night-far.png", mid: "night-mid.png", ground: "night-ground.png", props: "night-props.png" },
            spawnTables: {
                items: ["fish", "yarn", "bell", "sunsetShard", "mysteryButton", "glove"],
                obstacles: ["puddle", "vacuum", "dog", "door", "bicycle"],
            },
            unlocks: { distance: 1700, collection: "謎のボタン" },
        },
    ];

    const ASSET_MANIFEST = {
        cat: {
            idle: { src: "cat-idle.png", frames: 4 },
            walk: { src: "cat-walk.png", frames: 6 },
            jump: { src: "cat-jump.png", frames: 2 },
            land: { src: "cat-land.png", frames: 2 },
            crouch: { src: "cat-crouch.png", frames: 2 },
            surprised: { src: "cat-surprised.png", frames: 2 },
            sleep: { src: "cat-sleep.png", frames: 4 },
        },
        items: {
            fish: "fish.png",
            yarn: "yarn.png",
            bell: "bell.png",
            catGrass: "cat-grass.png",
            acorn: "acorn.png",
            sunsetShard: "sunset-shard.png",
            mysteryButton: "mystery-button.png",
            glove: "glove.png",
        },
        obstacles: {
            puddle: "puddle.png",
            cardboard: "cardboard.png",
            vacuum: "vacuum.png",
            dog: "dog.png",
            bicycle: "bicycle.png",
            flowerpot: "flowerpot.png",
            door: "door.png",
        },
    };

    globalThis.BlackCatData = {
        CANVAS,
        CAT,
        ITEM_TYPES,
        OBSTACLE_TYPES,
        DEFAULT_CUSTOMIZATION,
        STAGE_MANIFEST,
        FALLBACK_STAGES,
        ASSET_MANIFEST,
    };
}());
