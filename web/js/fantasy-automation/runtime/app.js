import * as e from "three";
var t = {
	miner: {
		label: "採掘機",
		cost: {
			wood: 4,
			ingot: 6
		},
		seconds: 2,
		output: { ore: 1 },
		energy: 2,
		technology: "basic"
	},
	belt: {
		label: "搬送ベルト",
		cost: {
			wood: 1,
			ingot: 1
		},
		seconds: .5,
		technology: "basic"
	},
	smelter: {
		label: "魔導炉",
		cost: {
			wood: 4,
			ingot: 8
		},
		seconds: 4,
		input: { ore: 2 },
		output: { ingot: 1 },
		energy: 5,
		technology: "basic",
		recipes: ["ingot"]
	},
	generator: {
		label: "魔力炉",
		cost: {
			wood: 6,
			ingot: 6
		},
		seconds: 10,
		input: { wood: 1 },
		generatedEnergy: 30,
		technology: "basic"
	},
	wire: {
		label: "魔力導線",
		cost: { wood: 1 },
		technology: "basic"
	},
	lumber: {
		label: "木材採取場",
		cost: {
			wood: 4,
			ingot: 4
		},
		seconds: 3,
		output: { wood: 1 },
		technology: "basic"
	},
	delivery: {
		label: "納品箱",
		cost: { wood: 6 },
		technology: "basic"
	},
	splitter: {
		label: "分岐器",
		cost: {
			wood: 2,
			ingot: 2
		},
		seconds: .5,
		technology: "logistics"
	},
	storage: {
		label: "収納箱",
		cost: {
			wood: 6,
			ingot: 2
		},
		technology: "logistics"
	},
	crystalMiner: {
		label: "魔晶採掘機",
		cost: {
			wood: 4,
			ingot: 8
		},
		seconds: 2,
		output: { rawCrystal: 1 },
		energy: 2,
		technology: "crystals"
	},
	crystalRefiner: {
		label: "魔晶精製炉",
		cost: {
			wood: 4,
			ingot: 8
		},
		seconds: 3,
		input: { rawCrystal: 1 },
		output: { crystal: 1 },
		energy: 3,
		technology: "crystals",
		recipes: ["crystal"]
	},
	assembler: {
		label: "魔導組立機",
		cost: {
			wood: 6,
			ingot: 12
		},
		seconds: 4,
		input: {
			ingot: 2,
			crystal: 1
		},
		output: { sword: 1 },
		energy: 8,
		technology: "assembly",
		recipes: ["sword"]
	},
	runeCarver: {
		label: "刻印台",
		cost: {
			wood: 6,
			ingot: 8
		},
		seconds: 6,
		input: {
			crystal: 2,
			ingot: 1
		},
		output: { runeCore: 1 },
		energy: 8,
		technology: "runecraft",
		recipes: ["runeCore"]
	},
	frameForge: {
		label: "躯体工房",
		cost: {
			wood: 8,
			ingot: 10
		},
		seconds: 6,
		input: {
			ingot: 3,
			wood: 2
		},
		output: { golemFrame: 1 },
		energy: 6,
		technology: "runecraft",
		recipes: ["golemFrame"]
	},
	golemForge: {
		label: "覚醒炉",
		cost: {
			wood: 8,
			ingot: 12
		},
		seconds: 8,
		input: {
			runeCore: 1,
			golemFrame: 1
		},
		output: { golem: 1 },
		energy: 12,
		technology: "golemcraft",
		recipes: ["golem"]
	},
	golemRelay: {
		label: "ゴーレム補給所",
		cost: {
			wood: 8,
			ingot: 6
		},
		technology: "golemcraft"
	}
}, n = {
	ingot: {
		label: "鉄の延べ棒",
		seconds: 4,
		input: { ore: 2 },
		output: { ingot: 1 },
		energy: 5,
		technology: "basic"
	},
	crystal: {
		label: "精製魔晶",
		seconds: 3,
		input: { rawCrystal: 1 },
		output: { crystal: 1 },
		energy: 3,
		technology: "crystals"
	},
	sword: {
		label: "魔導剣",
		seconds: 4,
		input: {
			ingot: 2,
			crystal: 1
		},
		output: { sword: 1 },
		energy: 8,
		technology: "assembly"
	},
	runeCore: {
		label: "魔導核",
		seconds: 6,
		input: {
			crystal: 2,
			ingot: 1
		},
		output: { runeCore: 1 },
		energy: 8,
		technology: "runecraft"
	},
	golemFrame: {
		label: "鉄の躯体",
		seconds: 6,
		input: {
			ingot: 3,
			wood: 2
		},
		output: { golemFrame: 1 },
		energy: 6,
		technology: "runecraft"
	},
	golem: {
		label: "ゴーレム",
		seconds: 8,
		input: {
			runeCore: 1,
			golemFrame: 1
		},
		output: { golem: 1 },
		energy: 12,
		technology: "golemcraft"
	}
}, r = t, i = n, a = [
	"wood",
	"ore",
	"ingot",
	"rawCrystal",
	"crystal",
	"sword",
	"runeCore",
	"golemFrame",
	"golem"
], o = {
	wood: "木材",
	ore: "鉄鉱石",
	ingot: "鉄の延べ棒",
	rawCrystal: "魔晶原石",
	crystal: "精製魔晶",
	sword: "魔導剣",
	runeCore: "魔導核",
	golemFrame: "鉄の躯体",
	golem: "ゴーレム"
}, s = [
	"wire",
	"generator",
	"miner",
	"smelter",
	"crystalMiner",
	"crystalRefiner",
	"assembler",
	"runeCarver",
	"frameForge",
	"golemForge"
];
function c(e) {
	let t = e.recipe ?? r[e.kind].recipes?.[0];
	return t ? i[t] : void 0;
}
var l = r.belt.seconds, u = .05, d = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0]
], f = /* @__PURE__ */ new Set([
	"miner",
	"belt",
	"smelter",
	"generator",
	"wire",
	"lumber",
	"delivery"
]), p = {
	smelter: { ore: 2 },
	generator: { wood: 1 }
}, m = [
	"wood",
	"ore",
	"ingot",
	"rawCrystal",
	"crystal",
	"sword"
];
function h(e, t) {
	return e.filter((e) => e.resource === t && e.automated && !e.handled).length;
}
function g(e) {
	if (e.version !== 1 && e.version !== 2 && e.version !== 3) throw Error("この保存形式には対応していません（対応: version 1・2・3）。");
	let t = structuredClone(e);
	if (t.version === 3) return t;
	if (t.version === 2) return _(t);
	for (let e of t.buildings) {
		if (!f.has(e.kind)) throw Error("旧保存形式に未対応の設備があります。");
		if (e.reserved?.length) throw Error("旧保存形式に未対応の予約素材があります。");
		if (e.reserved = [], e.kind === "smelter" && (e.recipe = "ingot"), e.working) for (let [t, n] of Object.entries(p[e.kind] ?? {})) for (let r = 0; r < (n ?? 0); r++) {
			let n = e.input.findIndex((e) => e.resource === t);
			if (n < 0) throw Error("旧保存データの稼働中設備に予約素材がありません。");
			e.reserved.push(e.input.splice(n, 1)[0]);
		}
	}
	let n = t.buildings.flatMap((e) => [
		...e.input,
		...e.output,
		...e.reserved ?? [],
		...e.item ? [e.item] : []
	]), r = t.delivered + h(n, "ingot");
	t.stats = {
		produced: {
			wood: h(n, "wood"),
			ore: 2 * r + h(n, "ore"),
			ingot: r,
			rawCrystal: 0,
			crystal: 0,
			sword: 0
		},
		delivered: {
			ingot: t.delivered,
			sword: 0
		},
		recentSwordTicks: [],
		peakSwordRate: 0
	}, t.research = {
		unlocked: ["basic"],
		tracked: "logistics"
	}, t.inventoryItems = [];
	for (let e of m) t.inventory[e] === void 0 && (t.inventory[e] = 0);
	let i = new Set(t.buildings.map((e) => e.z * 32 + e.x)), a = t.terrain.filter((e) => e === "crystal").length, o = [
		532,
		500,
		...t.terrain.map((e, t) => t)
	];
	for (let e of o) {
		if (a >= 2) break;
		!i.has(e) && t.terrain[e] === "grass" && (t.terrain[e] = "crystal", a++);
	}
	let s = [];
	for (let e of o) {
		if (a + s.length >= 2) break;
		i.has(e) && t.terrain[e] === "grass" && !s.includes(e) && s.push(e);
	}
	return s.length && (t.pendingCrystalCells = s), t.version = 2, _(t);
}
function _(e) {
	for (let t of [
		"runeCore",
		"golemFrame",
		"golem"
	]) e.inventory[t] = 0;
	if (!e.stats || !e.research || !e.inventoryItems) throw Error("旧保存データの進行情報がありません。");
	return e.stats.golemFuelTransfers = 0, e.stats.golemTransfers = 0, e.version = 3, e;
}
//#endregion
//#region web/js/fantasy-automation/technology.ts
var v = [
	{
		id: "basic",
		label: "採掘と精錬",
		description: "鉄鉱石を鉄の延べ棒へ加工し、自動納品の工房を築く。",
		prerequisites: [],
		requirements: [],
		unlocks: {
			kinds: [
				"miner",
				"belt",
				"smelter",
				"generator",
				"wire",
				"lumber",
				"delivery"
			],
			recipes: ["ingot"]
		}
	},
	{
		id: "logistics",
		label: "物流の分岐と収納",
		description: "自動生産の経験から、分岐器と有限の収納箱を解放する。",
		prerequisites: ["basic"],
		requirements: [{
			metric: "produced",
			resource: "ingot",
			target: 5,
			label: "鉄の延べ棒を自動生産"
		}],
		unlocks: {
			kinds: ["splitter", "storage"],
			recipes: []
		}
	},
	{
		id: "crystals",
		label: "結晶加工",
		description: "自動納品で得た知識を使い、結晶鉱脈の採掘と加工を始める。",
		prerequisites: ["basic"],
		requirements: [{
			metric: "delivered",
			resource: "ingot",
			target: 10,
			label: "鉄の延べ棒を自動納品"
		}],
		unlocks: {
			kinds: ["crystalMiner", "crystalRefiner"],
			recipes: ["crystal"]
		}
	},
	{
		id: "assembly",
		label: "魔導剣の組立",
		description: "鉄の延べ棒と精製魔晶を組み合わせ、魔導剣を連続生産する。",
		prerequisites: ["logistics", "crystals"],
		requirements: [{
			metric: "produced",
			resource: "ingot",
			target: 30,
			label: "鉄の延べ棒を自動生産"
		}, {
			metric: "produced",
			resource: "crystal",
			target: 10,
			label: "精製魔晶を自動生産"
		}],
		unlocks: {
			kinds: ["assembler"],
			recipes: ["sword"]
		}
	},
	{
		id: "mastery",
		label: "魔導剣の量産技術",
		description: "ゲーム内の連続60秒で魔導剣10本を自動生産し、10本を自動納品する。次はルーン加工とゴーレム工房へ進む。",
		prerequisites: ["assembly"],
		requirements: [{
			metric: "peakSwordRate",
			target: 10,
			label: "魔導剣の最高生産速度（本/ゲーム内分）"
		}, {
			metric: "delivered",
			resource: "sword",
			target: 10,
			label: "魔導剣を自動納品"
		}],
		unlocks: {
			kinds: [],
			recipes: []
		}
	},
	{
		id: "runecraft",
		label: "ルーン加工と機体製作",
		description: "精製魔晶と鉄を使って魔導核と鉄の躯体を生産する。",
		prerequisites: ["mastery"],
		requirements: [],
		unlocks: {
			kinds: ["runeCarver", "frameForge"],
			recipes: ["runeCore", "golemFrame"]
		}
	},
	{
		id: "golemcraft",
		label: "ゴーレム組立と物流補助",
		description: "魔導核と機体を組み立て、ゴーレムの物流補助を解放する。",
		prerequisites: ["runecraft"],
		requirements: [{
			metric: "produced",
			resource: "runeCore",
			target: 3,
			label: "魔導核を自動生産"
		}, {
			metric: "produced",
			resource: "golemFrame",
			target: 3,
			label: "鉄の躯体を自動生産"
		}],
		unlocks: {
			kinds: ["golemForge", "golemRelay"],
			recipes: ["golem"]
		}
	},
	{
		id: "sanctuary",
		label: "ゴーレム工房の自動運営",
		description: "ゴーレム3体を自動生産し、補助拠点から魔力炉へ木材を20個自動補給する。",
		prerequisites: ["golemcraft"],
		requirements: [{
			metric: "produced",
			resource: "golem",
			target: 3,
			label: "ゴーレムを自動生産"
		}, {
			metric: "golemFuelTransfers",
			target: 20,
			label: "ゴーレムで木材を魔力炉へ自動補給"
		}],
		unlocks: {
			kinds: [],
			recipes: []
		}
	}
];
function y(e) {
	let t = e.tick - Math.round(60 / u);
	return (e.stats?.recentSwordTicks ?? []).filter((n) => n > t && n <= e.tick).length;
}
function ee(e, t) {
	return t.metric === "peakSwordRate" ? e.stats?.peakSwordRate ?? 0 : t.metric === "golemFuelTransfers" ? e.stats?.golemFuelTransfers ?? 0 : e.stats?.[t.metric][t.resource] ?? (t.metric === "delivered" && t.resource === "ingot" ? e.delivered : 0);
}
function b(e) {
	let t = new Set(e.research?.unlocked ?? ["basic"]);
	return v.map((n) => {
		let r = n.requirements.map((t) => ({
			...t,
			current: ee(e, t),
			met: ee(e, t) >= t.target
		})), i = n.prerequisites.filter((e) => !t.has(e)), a = i.length === 0 && r.every((e) => e.met), o = t.has(n.id) ? "unlocked" : a ? "available" : "locked", s = o === "unlocked" ? "解放済み" : i.length ? `前提技術: ${i.map((e) => v.find((t) => t.id === e).label).join("・")}` : a ? "実績条件を達成。研究して解放できます。" : r.filter((e) => !e.met).map((e) => `${e.label} ${e.current}/${e.target}`).join("・");
		return {
			...n,
			prerequisites: [...n.prerequisites],
			unlocks: {
				kinds: [...n.unlocks.kinds],
				recipes: [...n.unlocks.recipes]
			},
			requirements: r,
			status: o,
			reason: s
		};
	});
}
function te(e, t) {
	let n = b(e).find((e) => e.id === t);
	return n ? {
		ok: n.status === "available",
		reason: n.status === "available" ? `${n.label}を解放できます。` : n.reason
	} : {
		ok: !1,
		reason: "未対応の技術です。"
	};
}
function x(e, t) {
	return b(e).some((e) => e.status === "unlocked" && e.unlocks.kinds.includes(t));
}
function S(e, t) {
	return b(e).some((e) => e.status === "unlocked" && e.unlocks.recipes.includes(t));
}
//#endregion
//#region web/js/fantasy-automation/simulation.ts
var ne = [
	"basic",
	"logistics",
	"crystals",
	"assembly",
	"mastery",
	"runecraft",
	"golemcraft",
	"sanctuary"
], C = (e, t) => t * 32 + e, w = (e = "") => ({
	ok: !0,
	reason: e
}), T = (e) => ({
	ok: !1,
	reason: e
}), E = (e) => e.automated && !e.handled, D = (e) => e.kind === "belt" || e.kind === "splitter", re = class {
	state;
	constructor(e = 662) {
		this.init(e);
	}
	init(e = this.state?.seed ?? 662) {
		let t = Array(1024).fill("grass"), n = e >>> 0, r = () => {
			n += 1831565813;
			let e = n;
			return e = Math.imul(e ^ e >>> 15, e | 1), e ^= e + Math.imul(e ^ e >>> 7, e | 61), ((e ^ e >>> 14) >>> 0) / 4294967296;
		};
		for (let e = 0; e < 26; e++) {
			let n = 2 + Math.floor(r() * 28), i = 2 + Math.floor(r() * 28), a = e % 3 == 0 ? "ore" : "forest";
			for (let e = -1; e <= 1; e++) for (let o = -1; o <= 1; o++) r() > .35 && (t[C(n + o, i + e)] = a);
		}
		for (let e = 13; e <= 21; e++) for (let n = 8; n <= 18; n++) t[C(n, e)] = "grass";
		t[C(12, 16)] = t[C(12, 15)] = "ore", t[C(9, 18)] = t[C(9, 19)] = "forest", t[C(20, 16)] = t[C(20, 15)] = "crystal", this.state = {
			version: 3,
			seed: e,
			tick: 0,
			nextId: 1,
			terrain: t,
			inventory: {
				wood: 40,
				ore: 0,
				ingot: 20,
				rawCrystal: 0,
				crystal: 0,
				sword: 0,
				runeCore: 0,
				golemFrame: 0,
				golem: 0
			},
			kits: {
				miner: 1,
				smelter: 1,
				generator: 1
			},
			buildings: [],
			delivered: 0,
			won: !1,
			stats: {
				produced: {},
				delivered: {},
				recentSwordTicks: [],
				peakSwordRate: 0,
				golemTransfers: 0,
				golemFuelTransfers: 0
			},
			research: {
				unlocked: ["basic"],
				tracked: null
			},
			inventoryItems: []
		};
	}
	snapshot() {
		return structuredClone(this.state);
	}
	restore(e) {
		if (!Array.isArray(e.terrain) || e.terrain.length !== 1024 || !Array.isArray(e.buildings)) throw Error("保存データの形式が正しくありません");
		this.state = g(structuredClone(e)), this.state.buildings.sort((e, t) => e.id - t.id);
	}
	canBuild(e, t, n, i) {
		if (!Object.hasOwn(r, e)) return T("設備の種類が不正です");
		if (!x(this.state, e)) return T(`${r[e].label}は技術ツリーで研究すると解放されます`);
		if (!Number.isInteger(t) || !Number.isInteger(n) || t < 0 || n < 0 || t >= 32 || n >= 32) return T("地図の外には建設できません");
		if (!Number.isInteger(i) || i < 0 || i > 3) return T("方向が不正です");
		if (this.state.buildings.some((e) => e.x === t && e.z === n)) return T("この区画には設備があります");
		let s = this.state.terrain[C(t, n)];
		if (e === "miner" && s !== "ore") return T("採掘機は鉄鉱脈の上に配置してください");
		if (e === "crystalMiner" && s !== "crystal") return T("魔晶採掘機は魔晶鉱脈の上に配置してください");
		if (e === "lumber" && s !== "forest") return T("木材採取場は森林の上に配置してください");
		if ((this.state.kits[e] ?? 0) > 0) return w("所持設備を設置");
		for (let t of a) {
			let n = r[e].cost[t] ?? 0;
			if ((this.state.inventory[t] ?? 0) < n) return T(`建設素材が不足しています（${o[t]} ${n}）`);
		}
		return w();
	}
	command(e) {
		if (e.type === "gatherWood") return this.state.terrain.includes("forest") ? (this.putInventory([{
			resource: "wood",
			automated: !1,
			handled: !0
		}]), w("森林で木材を1個手採取しました（自動生産の実績には算入されません）")) : T("この地図には手採取できる森林がありません");
		if (e.type === "research") {
			let t = te(this.state, e.id);
			return t.ok ? (this.state.research.unlocked.push(e.id), w("研究が完了しました。設備とレシピが解放されました")) : t;
		}
		if (e.type === "track") return e.id !== null && !ne.includes(e.id) ? T("技術の種類が不正です") : (this.state.research.tracked = e.id, w(e.id === null ? "追跡を解除しました" : "次の研究目標を追跡します"));
		if (e.type === "build") {
			let t = this.canBuild(e.kind, e.x, e.z, e.direction);
			if (!t.ok) return t;
			if ((this.state.kits[e.kind] ?? 0) > 0) this.state.kits[e.kind]--;
			else for (let t of a) this.takeInventory(t, r[e.kind].cost[t] ?? 0);
			let n = r[e.kind].recipes?.[0];
			return this.state.buildings.push({
				id: this.state.nextId++,
				kind: e.kind,
				x: e.x,
				z: e.z,
				direction: e.direction,
				input: [],
				output: [],
				reserved: [],
				progress: 0,
				working: !1,
				energy: 0,
				status: "待機中",
				item: null,
				beltProgress: 0,
				...n ? { recipe: n } : {},
				...e.kind === "splitter" ? { splitCursor: 0 } : {},
				...e.kind === "golemRelay" ? {
					golemPolicy: "fuel",
					golemCooldown: 0
				} : {}
			}), w(`${r[e.kind].label}を設置しました`);
		}
		let t = this.state.buildings.find((t) => t.id === e.id);
		if (!t) return T("設備が見つかりません");
		if (e.type === "remove") {
			let e = t.kind === "generator" && (t.pendingEnergy ?? 0) > 0 ? [] : t.reserved ?? [];
			this.putInventory([
				...t.input,
				...t.output,
				...e,
				...t.item ? [t.item] : [],
				...t.golemWorker ? [t.golemWorker] : []
			]);
			for (let e of a) this.state.inventory[e] = (this.state.inventory[e] ?? 0) + Math.floor((r[t.kind].cost[e] ?? 0) / 2);
			this.state.buildings = this.state.buildings.filter((e) => e.id !== t.id);
			let n = C(t.x, t.z);
			return this.state.pendingCrystalCells?.includes(n) && (this.state.terrain[n] = "crystal", this.state.pendingCrystalCells = this.state.pendingCrystalCells.filter((e) => e !== n)), w("設備を撤去しました。中身と建設素材の半分を回収");
		}
		if (e.type === "rotate") return t.direction = (t.direction + 1) % 4, w("出力方向を回転しました");
		if (e.type === "relayPolicy") return t.kind === "golemRelay" ? e.policy !== "fuel" && e.policy !== "materials" ? T("運搬方針が不正です") : (t.golemPolicy = e.policy, t.status = e.policy === "fuel" ? "燃料補給を優先します" : "レシピ素材の運搬を優先します", w(t.status)) : T("運搬方針はゴーレム補給所で設定してください");
		if (e.type === "recipe") {
			if (!Object.hasOwn(i, e.recipe) || !S(this.state, e.recipe)) return T("このレシピは技術ツリーで研究すると解放されます");
			if (!r[t.kind].recipes?.includes(e.recipe)) return T("この設備ではそのレシピを使用できません");
			if (t.working || (t.reserved?.length ?? 0) > 0) return T("稼働中はレシピを変更できません");
			let n = i[e.recipe];
			return t.input.some((e) => !(n.input[e.resource] ?? 0)) || t.output.some((e) => !(n.output[e.resource] ?? 0)) ? T("庫内に互換性のない素材があります。先に回収してください") : (t.recipe = e.recipe, t.progress = 0, w("レシピを変更しました"));
		}
		if (e.type === "feed") {
			if (!a.includes(e.resource) || !Number.isSafeInteger(e.amount) || e.amount <= 0) return T("投入数が不正です");
			if (!this.accepts(t, e.resource)) return T("この設備ではその素材を使用できません");
			if ((this.state.inventory[e.resource] ?? 0) < e.amount) return T("所持素材が不足しています");
			if (D(t) && (t.item || e.amount !== 1)) return T("搬送設備には空き区画へ1個ずつ投入してください");
			if (!D(t) && t.kind !== "delivery" && !this.canReceive(t, e.resource, e.amount)) return T("入力庫が満杯、または他のレシピ素材用の空きが必要です");
			let n = this.takeInventory(e.resource, e.amount).map((e) => ({
				...e,
				handled: !0
			}));
			return t.kind === "delivery" ? t.status = "手動納品（目標には算入されません）" : D(t) ? (t.item = n[0], t.beltProgress = 0) : t.input.push(...n), w(t.kind === "delivery" ? "手動納品は目標の本数・生産実績に算入されません" : "素材を補給しました");
		}
		if (e.type === "collect") {
			if (e.resource !== void 0 && !a.includes(e.resource)) return T("素材の種類が不正です");
			if (e.amount !== void 0 && (!Number.isSafeInteger(e.amount) || e.amount <= 0)) return T("回収数が不正です");
			let n = [
				...t.input,
				...t.output,
				...t.item ? [t.item] : []
			].filter((t) => e.resource === void 0 || t.resource === e.resource).length;
			if (e.amount !== void 0 && e.amount > n) return T(`回収できる品は${n}個です（稼働中の素材は予約済み）`);
			let r = e.amount ?? n, i = [], o = (t) => t.filter((t) => r > 0 && (e.resource === void 0 || t.resource === e.resource) ? (i.push(t), r--, !1) : !0);
			return t.input = o(t.input), t.output = o(t.output), t.item && r > 0 && (e.resource === void 0 || t.item.resource === e.resource) && (i.push(t.item), t.item = null, t.beltProgress = 0), this.putInventory(i), w(`素材を${i.length}個回収しました${t.working ? "（稼働中の素材は予約済み）" : ""}`);
		}
		return T("操作が不正です");
	}
	powerSummary() {
		let e = this.state.buildings.filter((e) => e.kind === "generator");
		return {
			stored: e.reduce((e, t) => e + t.energy, 0),
			capacity: e.length * 30
		};
	}
	hasPowerAt(e, t) {
		let n = this.networks();
		return this.state.buildings.some((r) => Math.abs(r.x - e) + Math.abs(r.z - t) <= 1 && (n.get(r.id)?.generators.some((e) => e.energy > 0) ?? !1));
	}
	step() {
		this.state.tick++;
		let e = this.state.stats;
		e.recentSwordTicks = e.recentSwordTicks.filter((e) => e > this.state.tick - 1200);
		let t = [...this.state.buildings].sort((e, t) => e.id - t.id), n = new Map(t.map((e) => [C(e.x, e.z), e]));
		this.supplyGolems(t);
		for (let e of t) D(e) && e.item && (e.beltProgress = Math.min(l, e.beltProgress + u));
		this.transport(t, n);
		let r = this.networks();
		for (let e of t) e.kind !== "golemRelay" && (D(e) ? e.status = e.item ? e.beltProgress + 1e-9 >= l ? "搬送先が詰まっています" : "搬送中" : "搬送品を待っています" : e.kind === "storage" ? e.status = e.input.length >= 32 ? "収納庫が満杯です（32個）" : `収納中 ${e.input.length}/32個` : e.kind === "wire" ? e.status = r.get(e.id)?.generators.length ? "魔力網に接続中" : "魔力炉に接続してください" : e.kind === "delivery" ? e.status.startsWith("手動") || (e.status = this.state.won ? "鉄の延べ棒の目標達成！" : "鉄の延べ棒・魔導剣の自動納品を待っています") : this.produce(e, r.get(e.id)));
		this.state.won = this.state.delivered >= 100, e.peakSwordRate = Math.max(e.peakSwordRate, y(this.state));
	}
	takeInventory(e, t) {
		if (t === 0) return [];
		let n = [], r = t;
		this.state.inventoryItems = this.state.inventoryItems.filter((t) => r > 0 && t.resource === e ? (n.push(t), r--, !1) : !0);
		for (let t = 0; t < r; t++) n.push({
			resource: e,
			automated: !1,
			handled: !0
		});
		return this.state.inventory[e] = (this.state.inventory[e] ?? 0) - t, n;
	}
	putInventory(e) {
		for (let t of e) this.state.inventory[t.resource] = (this.state.inventory[t.resource] ?? 0) + 1, this.state.inventoryItems.push({
			...t,
			handled: !0
		});
	}
	recipeInput(e) {
		return c(e)?.input ?? r[e.kind].input ?? {};
	}
	accepts(e, t) {
		return D(e) || e.kind === "storage" || e.kind === "golemRelay" && t === "golem" || (this.recipeInput(e)[t] ?? 0) > 0 || e.kind === "delivery" && (t === "ingot" || t === "sword");
	}
	canReceive(e, t, n, r = 0, i = 0) {
		if (!this.accepts(e, t)) return !1;
		if (e.kind === "delivery") return !0;
		if (e.kind === "golemRelay") return n === 1 && !e.golemWorker && e.input.length + r === 0;
		if (D(e)) return n === 1 && r === 0 && (!e.item || e.beltProgress + 1e-9 >= l);
		let o = e.kind === "storage" ? 32 : 8;
		if (e.input.length + r + n > o) return !1;
		let s = this.recipeInput(e), c = a.reduce((e, n) => e + (n === t ? 0 : s[n] ?? 0), 0);
		return e.input.filter((e) => e.resource === t).length + i + n <= o - c;
	}
	supplyGolems(e) {
		let t = e.filter((e) => e.kind === "storage"), n = new Map(t.map((e) => [e.id, [...e.input]]));
		for (let i of e.filter((e) => e.kind === "golemRelay")) {
			if (!x(this.state, i.kind)) {
				i.status = "ゴーレム補給所を技術ツリーで研究してください";
				continue;
			}
			if (!i.golemWorker && i.input[0]?.resource === "golem" && (i.golemWorker = i.input.shift()), !i.golemWorker) {
				i.status = "ゴーレムを1体投入してください";
				continue;
			}
			if ((i.golemCooldown ?? 0) > 0) {
				i.golemCooldown--;
				continue;
			}
			i.golemCooldown = 19;
			let s = (e) => Math.abs(e.x - i.x) + Math.abs(e.z - i.z) <= 6, c = t.filter(s);
			if (c.length === 0) {
				i.status = "範囲6区画以内に収納箱がありません";
				continue;
			}
			let l = i.golemPolicy !== "materials", u = e.filter((e) => s(e) && x(this.state, e.kind) && (l ? e.kind === "generator" : e.kind !== "generator" && e.kind !== "miner" && e.kind !== "crystalMiner" && e.kind !== "golemRelay" && Object.keys(this.recipeInput(e)).length > 0));
			if (u.length === 0) {
				i.status = l ? "範囲6区画以内に魔力炉がありません" : "範囲6区画以内に素材を使う製造設備がありません";
				continue;
			}
			let d = [];
			for (let e of u) {
				let t = this.recipeInput(e);
				for (let n of l ? ["wood"] : a) {
					let r = l ? 1 : t[n] ?? 0;
					if (r === 0) continue;
					let i = [...e.input, ...e.reserved ?? []].filter((e) => e.resource === n).length;
					d.push({
						target: e,
						resource: n,
						fill: i / r,
						energy: l ? e.energy : 0
					});
				}
			}
			d.sort((e, t) => e.fill - t.fill || e.energy - t.energy || e.target.id - t.target.id || a.indexOf(e.resource) - a.indexOf(t.resource));
			let f = d.filter((e) => this.canReceive(e.target, e.resource, 1));
			if (f.length === 0) {
				i.status = "搬送先の入力庫が満杯です（他の素材用の空きを含む）";
				continue;
			}
			let p = !1;
			for (let e of f) {
				for (let t of c) {
					let a = n.get(t.id).find((n) => n.resource === e.resource && t.input.includes(n));
					if (a) {
						t.input.splice(t.input.indexOf(a), 1), e.target.input.push(a), i.golemRoute = {
							sourceId: t.id,
							targetId: e.target.id,
							resource: a.resource,
							tick: this.state.tick
						}, this.state.stats.golemTransfers = (this.state.stats.golemTransfers ?? 0) + 1, l && a.resource === "wood" && E(a) && (this.state.stats.golemFuelTransfers = (this.state.stats.golemFuelTransfers ?? 0) + 1), i.status = `${o[a.resource]}を${r[e.target.kind].label}へ運びました`, p = !0;
						break;
					}
				}
				if (p) break;
			}
			p || (i.status = l ? "収納箱に木材がありません（手動品は自動補給実績に算入されません）" : "収納箱にレシピに合う素材がありません");
		}
	}
	networks() {
		let e = this.state.buildings.filter((e) => s.includes(e.kind)).sort((e, t) => e.id - t.id), t = new Map(e.map((e) => [C(e.x, e.z), e])), n = /* @__PURE__ */ new Map();
		for (let r of e) {
			if (n.has(r.id)) continue;
			let e = { generators: [] }, i = [r];
			n.set(r.id, e);
			for (let r = 0; r < i.length; r++) {
				let a = i[r];
				a.kind === "generator" && e.generators.push(a);
				for (let [r, o] of d) {
					let s = a.x + r, c = a.z + o;
					if (s < 0 || s >= 32 || c < 0 || c >= 32) continue;
					let l = t.get(C(s, c));
					l && !n.has(l.id) && (n.set(l.id, e), i.push(l));
				}
			}
			e.generators.sort((e, t) => e.id - t.id);
		}
		return n;
	}
	spend(e, t) {
		if (!e || e.generators.reduce((e, t) => e + t.energy, 0) < t) return !1;
		let n = t;
		for (let t of e.generators) {
			let e = Math.min(n, t.energy);
			if (t.energy -= e, n -= e, n === 0) break;
		}
		return !0;
	}
	produce(e, t) {
		let n = r[e.kind];
		if (!x(this.state, e.kind)) {
			e.status = "設備を技術ツリーで研究してください";
			return;
		}
		let i = e.recipe ?? n.recipes?.[0];
		if (i && !S(this.state, i)) {
			e.status = "レシピを技術ツリーで研究してください";
			return;
		}
		let s = c(e), l = s?.seconds ?? n.seconds, d = s?.energy ?? n.energy ?? 0;
		if (d > 0 && !t?.generators.length) e.status = "魔力導線がつながっていません";
		else {
			if (!e.working) {
				let r = s?.input ?? n.input ?? {};
				for (let t of a) {
					let n = r[t] ?? 0, i = e.input.filter((e) => e.resource === t).length;
					if (i < n) {
						e.status = `${o[t]}が不足しています（あと${n - i}個）${e.kind === "generator" ? "・手動補給できます" : ""}`;
						return;
					}
				}
				if (e.kind !== "generator" && e.output.length >= 4) {
					e.status = "出力庫が満杯です";
					return;
				}
				if (d > 0 && !this.spend(t, d)) {
					e.status = `魔力が不足しています（開始時に${d}単位必要）`;
					return;
				}
				let i = { ...r }, c = [];
				e.input = e.input.filter((e) => (i[e.resource] ?? 0) > 0 ? (c.push(e), i[e.resource]--, !1) : !0), e.reserved = c, e.working = !0, e.progress = 0;
			}
			if (e.progress = Math.min(l, e.progress + u), e.status = "稼働中", !(e.progress + 1e-9 < l)) {
				if (e.kind === "generator") {
					(e.pendingEnergy === void 0 || e.pendingEnergy === 0) && (e.pendingEnergy = n.generatedEnergy);
					let t = Math.min(30 - e.energy, e.pendingEnergy);
					if (e.energy += t, e.pendingEnergy -= t, e.pendingEnergy > 0) {
						e.status = "完成した魔力を保持中（蓄積庫が満杯）";
						return;
					}
				} else {
					if (e.output.length >= 4) {
						e.status = "完成品を保持中（出力庫が満杯）";
						return;
					}
					let t = Object.keys(s?.output ?? n.output)[0], r = e.reserved ?? [], i = {
						resource: t,
						automated: r.every((e) => e.automated),
						...r.some((e) => e.handled) ? { handled: !0 } : {}
					};
					e.output.push(i), E(i) && (this.state.stats.produced[t] = (this.state.stats.produced[t] ?? 0) + 1, t === "sword" && this.state.stats.recentSwordTicks.push(this.state.tick));
				}
				e.reserved = [], e.progress = 0, e.working = !1, e.status = "生産完了";
			}
		}
	}
	transport(e, t) {
		let n = /* @__PURE__ */ new Map();
		for (let r of e) {
			let e = D(r) ? "item" : r.kind === "storage" ? "input" : "output", i = e === "item" ? r.item : r[e][0];
			if (!i || e === "item" && r.beltProgress + 1e-9 < l) continue;
			let a = r.kind === "splitter" ? r.splitCursor === 1 ? [1, 0] : [0, 1] : [0], o = [];
			for (let n of a) {
				let [a, s] = d[(r.direction + n) % 4], c = r.x + a, l = r.z + s;
				if (c < 0 || c >= 32 || l < 0 || l >= 32) continue;
				let u = t.get(C(c, l));
				u && this.canReceive(u, i.resource, 1) && o.push({
					source: r,
					target: u,
					item: i,
					sourceSlot: e,
					port: n
				});
			}
			o.length > 0 && n.set(r.id, o);
		}
		let r = /* @__PURE__ */ new Set(), i = [];
		for (;;) {
			let t = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
			i = [];
			for (let o of e) for (let e of n.get(o.id) ?? []) {
				if (r.has(`${o.id}:${e.target.id}`)) continue;
				let n = `${e.target.id}:${e.item.resource}`, s = t.get(e.target.id) ?? 0;
				if (this.canReceive(e.target, e.item.resource, 1, s, a.get(n) ?? 0)) {
					i.push(e), t.set(e.target.id, s + 1), a.set(n, (a.get(n) ?? 0) + 1);
					break;
				}
			}
			let o = new Set(i.filter((e) => e.sourceSlot === "item").map((e) => e.source.id)), s = i.filter((e) => D(e.target) && e.target.item && !o.has(e.target.id));
			if (s.length === 0) break;
			for (let e of s) r.add(`${e.source.id}:${e.target.id}`);
		}
		for (let e of i) e.sourceSlot === "item" ? (e.source.item = null, e.source.beltProgress = 0) : e.source[e.sourceSlot].shift(), e.source.kind === "splitter" && (e.source.splitCursor = +(e.port === 0));
		for (let e of i) if (D(e.target)) e.target.item = e.item, e.target.beltProgress = 0;
		else if (e.target.kind === "delivery") {
			if (E(e.item)) {
				let t = e.item.resource;
				this.state.stats.delivered[t] = (this.state.stats.delivered[t] ?? 0) + 1, t === "ingot" && this.state.delivered++;
			}
			e.target.status = E(e.item) ? `${o[e.item.resource]}を自動納品しました` : "手動で取り出し・投入した品は目標に算入されません";
		} else e.target.input.push(e.item);
	}
}, ie = class {
	canvas;
	actions;
	abort = new AbortController();
	pointer = null;
	lastCell = "";
	keys = /* @__PURE__ */ new Set();
	blocked = !1;
	constructor(e, t) {
		this.canvas = e, this.actions = t, e.tabIndex = 0, e.setAttribute("aria-label", "工房の地図。右ドラッグまたは WASD で移動、中ドラッグまたは QE で回転"), e.style.touchAction = "none";
		let n = { signal: this.abort.signal };
		e.addEventListener("pointerdown", (e) => this.pointerDown(e), n), e.addEventListener("pointermove", (e) => this.pointerMove(e), n), e.addEventListener("pointerup", (e) => this.pointerUp(e), n), e.addEventListener("pointercancel", (e) => this.pointerUp(e), n), e.addEventListener("lostpointercapture", () => {
			this.pointer = null, this.lastCell = "";
		}, n), e.addEventListener("contextmenu", (e) => e.preventDefault(), n), e.addEventListener("wheel", (e) => {
			e.preventDefault(), !this.blocked && this.actions.zoom(Math.sign(e.deltaY) * .12);
		}, {
			...n,
			passive: !1
		}), e.addEventListener("keydown", (e) => this.keyDown(e), n), window.addEventListener("keyup", (e) => this.keys.delete(e.code), n), e.addEventListener("blur", () => this.keys.clear(), n), window.addEventListener("blur", () => {
			this.keys.clear(), this.pointer = null;
		}, n);
	}
	pointerDown(e) {
		this.blocked || this.pointer || e.button > 2 || (e.preventDefault(), this.canvas.focus({ preventScroll: !0 }), this.canvas.setPointerCapture(e.pointerId), this.pointer = {
			id: e.pointerId,
			button: e.button,
			x: e.clientX,
			y: e.clientY
		}, this.lastCell = "", e.button === 0 && this.pickCell(e));
	}
	pickCell(e) {
		let t = this.actions.pick(e);
		if (!t) return;
		let n = `${t.x},${t.z}`;
		if (n === this.lastCell) return;
		let r = this.lastCell.split(",").map(Number);
		if (this.lastCell = n, e.type === "pointermove" && r.length === 2) {
			let [n, i] = r;
			for (; n !== t.x;) n += Math.sign(t.x - n), this.actions.onPick(n, i, e);
			for (; i !== t.z;) i += Math.sign(t.z - i), this.actions.onPick(n, i, e);
		} else this.actions.onPick(t.x, t.z, e);
	}
	pointerMove(e) {
		if (this.blocked) return;
		if (this.pointer?.id === e.pointerId) {
			let t = e.clientX - this.pointer.x, n = e.clientY - this.pointer.y;
			this.pointer.x = e.clientX, this.pointer.y = e.clientY, this.pointer.button === 2 ? this.actions.pan(t, n) : this.pointer.button === 1 ? this.actions.rotate(-t * .009) : this.pickCell(e);
		}
		let t = this.actions.pick(e);
		t && this.actions.onHover(t.x, t.z);
	}
	pointerUp(e) {
		this.pointer?.id === e.pointerId && (this.pointer = null, this.lastCell = "", this.canvas.hasPointerCapture(e.pointerId) && this.canvas.releasePointerCapture(e.pointerId));
	}
	keyDown(e) {
		this.blocked || [
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyQ",
			"KeyE"
		].includes(e.code) && (e.preventDefault(), this.keys.add(e.code));
	}
	update(e) {
		if (this.blocked) return;
		let t = Math.min(.1, e), n = Number(this.keys.has("KeyA")) - Number(this.keys.has("KeyD")), r = Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
		(n || r) && this.actions.pan(n * t * 400, r * t * 400);
		let i = Number(this.keys.has("KeyQ")) - Number(this.keys.has("KeyE"));
		i && this.actions.rotate(i * t * 1.2);
	}
	setBlocked(e) {
		this.blocked = e, e && (this.keys.clear(), this.pointer && this.canvas.hasPointerCapture(this.pointer.id) && this.canvas.releasePointerCapture(this.pointer.id), this.pointer = null, this.lastCell = "");
	}
	dispose() {
		this.abort.abort(), this.keys.clear(), this.pointer = null;
	}
}, O = (e) => e === "belt" || e === "splitter";
function k(e, t) {
	return e === "wire" || e === "generator" || e === "delivery" || e === "golemRelay" ? [] : e === "splitter" ? [t, (t + 1) % 4] : [t];
}
function ae(e) {
	return O(e.kind) || e.kind === "storage" ? [...a] : e.kind === "delivery" ? ["ingot", "sword"] : e.kind === "golemRelay" ? ["golem"] : Object.keys(c(e)?.input ?? r[e.kind].input ?? {});
}
function oe(e) {
	let t = O(e.kind) ? e.item : e.kind === "storage" ? e.input?.[0] : e.output?.[0];
	return t ? [t.resource] : O(e.kind) || e.kind === "storage" ? [...a] : Object.keys(c(e)?.output ?? r[e.kind].output ?? {});
}
function A(e, t) {
	if (!ae(e).includes(t)) return !1;
	if (e.kind === "delivery") return !0;
	if (e.kind === "golemRelay") return !e.golemWorker && e.input.length === 0;
	if (O(e.kind)) return !e.item || e.beltProgress + 1e-9 >= l;
	let n = e.kind === "storage" ? 32 : 8;
	if (e.input.length >= n) return !1;
	let i = c(e)?.input ?? r[e.kind].input ?? {}, o = a.reduce((e, n) => e + (n === t ? 0 : i[n] ?? 0), 0);
	return e.input.filter((e) => e.resource === t).length + 1 <= n - o;
}
function se(e, t, n) {
	if (!e.item || e.beltProgress + 1e-9 < l) return !1;
	if (n.has(e.id)) return !0;
	n.add(e.id);
	for (let r of k(e.kind, e.direction)) {
		let [i, a] = d[r], o = t.get(`${e.x + i},${e.z + a}`);
		if (o && A(o, e.item.resource) && (!O(o.kind) || !o.item || se(o, t, n))) return n.delete(e.id), !0;
	}
	return n.delete(e.id), !1;
}
function j(e, t, n = oe(e)) {
	return k(e.kind, e.direction).map((r) => {
		let [i, a] = d[r], o = e.x + i, s = e.z + a;
		if (o < 0 || o >= 32 || s < 0 || s >= 32) return {
			direction: r,
			state: "edge",
			targetId: null
		};
		let c = t.get(`${o},${s}`);
		if (!c) return {
			direction: r,
			state: "missing",
			targetId: null
		};
		let l = n.filter((e) => ae(c).includes(e));
		if (!l.length) return {
			direction: r,
			state: "incompatible",
			targetId: c.id
		};
		let u = l.some((e) => A(c, e)), f = !O(c.kind) || !c.item || se(c, t, /* @__PURE__ */ new Set());
		return {
			direction: r,
			state: u && f ? "connected" : "full",
			targetId: c.id
		};
	});
}
//#endregion
//#region web/js/fantasy-automation/renderer.ts
var ce = {
	wood: 11962194,
	ore: 8569558,
	ingot: 14080467,
	rawCrystal: 13216992,
	crystal: 9986783,
	sword: 15454606,
	runeCore: 16760432,
	golemFrame: 9153454,
	golem: 9233092
}, le = class {
	host;
	callbacks;
	renderer;
	scene = new e.Scene();
	camera = new e.OrthographicCamera(-12, 12, 12, -12, .1, 150);
	target = new e.Vector3(13, 0, 16);
	bearing = Math.PI / 4;
	extent = 11;
	input;
	observer;
	abort = new AbortController();
	terrain = new e.Group();
	terrainKey = "";
	facilities = /* @__PURE__ */ new Map();
	geometries = /* @__PURE__ */ new Map();
	materials = /* @__PURE__ */ new Map();
	ghost = new e.Group();
	ghostPreview = null;
	ghostPort = this.arrow();
	ghostSidePort = this.arrow();
	ghostPower = null;
	ghostFeasibility = new e.Group();
	ghostCheck = new e.Group();
	ghostCross = new e.Group();
	selection = new e.Group();
	selectedDirection = this.arrow(16771988);
	selectedSideDirection = this.arrow(16771988);
	flowMatrix = new e.Matrix4();
	flowPosition = new e.Vector3();
	flowRotation = new e.Quaternion();
	flowScale = new e.Vector3(1, 1, 1);
	routeStart = new e.Vector3();
	routeEnd = new e.Vector3();
	relayLineMaterial = new e.LineBasicMaterial({
		color: 10283988,
		transparent: !0,
		opacity: .7
	});
	selectedRelayRange = new e.LineLoop(this.geometry("relay-range", () => new e.BufferGeometry().setFromPoints([
		new e.Vector3(6, .08, 0),
		new e.Vector3(0, .08, 6),
		new e.Vector3(-6, .08, 0),
		new e.Vector3(0, .08, -6)
	])), this.relayLineMaterial);
	guideMarker = new e.Group();
	guideDirection = this.arrow(16772738);
	guideLabel;
	guideLabelKey = "";
	guideProjection = new e.Vector3();
	reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	raycaster = new e.Raycaster();
	groundPlane = new e.Plane(new e.Vector3(0, 1, 0), 0);
	pointerPosition = new e.Vector2();
	intersection = new e.Vector3();
	lastTime = performance.now();
	disposed = !1;
	contextLost = !1;
	cursorOnMap = !1;
	constructor(t, n) {
		this.host = t, this.callbacks = n;
		try {
			this.renderer = new e.WebGLRenderer({
				antialias: !0,
				alpha: !1,
				powerPreference: "high-performance"
			});
		} catch (e) {
			throw n.onStatus("3D 表示を開始できません。WebGL 対応ブラウザで開き直してください。"), e;
		}
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)), this.renderer.outputColorSpace = e.SRGBColorSpace, this.renderer.setClearColor(13491158), t.append(this.renderer.domElement), this.guideLabel = document.createElement("div"), this.guideLabel.id = "guide-target", this.guideLabel.hidden = !0, Object.assign(this.guideLabel.style, {
			position: "absolute",
			pointerEvents: "none",
			zIndex: "1",
			padding: "5px 10px",
			border: "2px solid #ebcb6d",
			borderRadius: "8px",
			background: "#fff5daed",
			color: "#25483c",
			font: "bold 12px/1.5 sans-serif",
			textAlign: "center",
			whiteSpace: "pre",
			transform: "translate(-50%, -100%)",
			boxShadow: "0 3px 10px #17372d35"
		}), t.append(this.guideLabel), this.renderer.domElement.addEventListener("pointerleave", () => {
			this.cursorOnMap = !1;
		}, { signal: this.abort.signal }), this.scene.background = new e.Color(13491158), this.scene.add(new e.HemisphereLight(16775389, 5466213, 2.5));
		let r = new e.DirectionalLight(16772560, 2.1);
		r.position.set(-12, 28, 8), this.scene.add(r, this.terrain, this.ghost, this.selection, this.guideMarker, this.selectedRelayRange), this.selectedRelayRange.visible = !1, this.createOutline(this.ghost, 8318383), this.ghostPort.position.set(0, .42, -.37), this.ghost.add(this.ghostPort), this.ghostSidePort.position.set(.37, .42, 0), this.ghostSidePort.rotation.y = -Math.PI / 2, this.ghostSidePort.visible = !1, this.ghost.add(this.ghostSidePort), this.ghostPower = this.cylinder(this.ghost, 9759487, .085, .14, [
			.38,
			.22,
			.38
		], !0), this.ghostFeasibility.position.set(.38, 1.05, .38), this.box(this.ghostFeasibility, 3425345, [
			.34,
			.025,
			.34
		], [
			0,
			0,
			0
		]).userData.visualBackdrop = !0, this.box(this.ghostCheck, 13107163, [
			.13,
			.045,
			.05
		], [
			-.065,
			.035,
			.02
		]).rotation.y = -Math.PI / 4, this.box(this.ghostCheck, 13107163, [
			.23,
			.045,
			.05
		], [
			.04,
			.035,
			-.025
		]).rotation.y = Math.PI / 4;
		for (let e of [-Math.PI / 4, Math.PI / 4]) this.box(this.ghostCross, 16765638, [
			.28,
			.045,
			.05
		], [
			0,
			.035,
			0
		]).rotation.y = e;
		this.ghostFeasibility.add(this.ghostCheck, this.ghostCross), this.ghost.add(this.ghostFeasibility), this.createOutline(this.selection, 16768110), this.selectedDirection.position.set(0, 1.45, -.18), this.selectedDirection.scale.setScalar(1.9), this.selectedSideDirection.position.set(.18, 1.45, 0), this.selectedSideDirection.rotation.y = -Math.PI / 2, this.selectedSideDirection.scale.setScalar(1.9), this.selection.add(this.selectedDirection, this.selectedSideDirection), this.createOutline(this.guideMarker, 16772738), this.guideDirection.position.set(0, .25, 0), this.guideMarker.add(this.guideDirection);
		let i = this.cylinder(this.guideMarker, 16772738, .14, .35, [
			0,
			1.36,
			0
		], !0);
		i.rotation.z = Math.PI, this.guideMarker.traverse((t) => {
			t instanceof e.Mesh && (t.material = this.material(16772738, 5126412), t.material.depthTest = !1, t.renderOrder = 20);
		}), this.guideMarker.visible = !1, this.ghost.visible = this.selection.visible = !1, this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
			e.preventDefault(), this.contextLost = !0, n.onStatus("3D 表示が中断しました。復旧を待っています。進行は保存できます。");
		}, { signal: this.abort.signal }), this.renderer.domElement.addEventListener("webglcontextrestored", () => {
			this.contextLost = !1, this.lastTime = performance.now(), this.resize(), n.onStatus("3D 表示を復旧しました。");
		}, { signal: this.abort.signal }), this.input = new ie(this.renderer.domElement, {
			pick: (e) => this.pick(e),
			onPick: n.onPick,
			onHover: n.onHover,
			pan: (e, t) => this.pan(e, t),
			rotate: (e) => this.rotate(e),
			zoom: (e) => this.zoom(e)
		}), this.observer = new ResizeObserver(() => this.resize()), this.observer.observe(t), this.resize();
	}
	geometry(e, t) {
		let n = this.geometries.get(e);
		return n || (n = t(), this.geometries.set(e, n)), n;
	}
	material(t, n = 0, r = !1) {
		let i = `${t}/${n}/${r}`, a = this.materials.get(i);
		return a || (a = new e.MeshStandardMaterial({
			color: t,
			roughness: .85,
			flatShading: !0,
			emissive: n,
			transparent: r,
			opacity: r ? .5 : 1
		}), this.materials.set(i, a)), a;
	}
	box(t, n, r, i) {
		let a = new e.Mesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(n));
		return a.scale.set(...r), a.position.set(...i), t.add(a), a;
	}
	cylinder(t, n, r, i, a, o = !1) {
		let s = new e.Mesh(this.geometry(o ? "cone" : "cylinder", () => o ? new e.ConeGeometry(1, 1, 6) : new e.CylinderGeometry(1, 1, 1, 8)), this.material(n));
		return s.scale.set(r, i, r), s.position.set(...a), t.add(s), s;
	}
	arrow(t = 15978872) {
		let n = new e.Group();
		this.box(n, t, [
			.055,
			.025,
			.28
		], [
			0,
			0,
			-.04
		]);
		let r = this.cylinder(n, t, .105, .16, [
			0,
			0,
			-.24
		], !0);
		return r.rotation.x = -Math.PI / 2, n;
	}
	createOutline(e, t) {
		this.box(e, t, [
			1.03,
			.04,
			.045
		], [
			0,
			.05,
			-.51
		]), this.box(e, t, [
			1.03,
			.04,
			.045
		], [
			0,
			.05,
			.51
		]), this.box(e, t, [
			.045,
			.04,
			1.03
		], [
			-.51,
			.05,
			0
		]), this.box(e, t, [
			.045,
			.04,
			1.03
		], [
			.51,
			.05,
			0
		]);
	}
	portGlyph() {
		let t = new e.Group(), n = new e.Group(), r = new e.Group(), i = new e.Group(), a = new e.Group();
		this.box(i, 3425345, [
			.29,
			.02,
			.29
		], [
			0,
			-.035,
			0
		]).userData.visualBackdrop = !0, this.box(a, 3425345, [
			.31,
			.02,
			.29
		], [
			0,
			-.035,
			0
		]).userData.visualBackdrop = !0;
		for (let t of [-.055, .055]) {
			let a = new e.Mesh(this.geometry("link", () => new e.TorusGeometry(.078, .023, 4, 8)), this.material(9695200));
			a.position.x = t, a.rotation.x = Math.PI / 2, n.add(a), this.box(r, 15846011, [
				.075,
				.035,
				.055
			], [
				t * 1.5,
				0,
				0
			]), this.box(i, 16757862, [
				.055,
				.055,
				.25
			], [
				t,
				0,
				0
			]);
		}
		for (let e of [-Math.PI / 4, Math.PI / 4]) this.box(a, 16745078, [
			.28,
			.055,
			.05
		], [
			0,
			0,
			0
		]).rotation.y = e;
		return t.add(n, r, i, a), {
			group: t,
			linked: n,
			missing: r,
			stop: i,
			invalid: a
		};
	}
	paintPort(t, n) {
		t.linked.visible = n === "connected", t.missing.visible = n === "missing", t.stop.visible = n === "full", t.invalid.visible = n === "incompatible" || n === "edge";
		let r = {
			linked: 9695200,
			missing: 15846011,
			stop: 16757862,
			invalid: 16745078
		};
		for (let n of [
			"linked",
			"missing",
			"stop",
			"invalid"
		]) t[n].traverse((t) => {
			t instanceof e.Mesh && (t.material = this.material(t.userData.visualBackdrop ? 3425345 : r[n]));
		});
	}
	rebuildTerrain(t) {
		for (let t of this.terrain.children) t instanceof e.InstancedMesh && t.dispose();
		this.terrain.clear();
		let n = new e.InstancedMesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(16777215), 1024), r = new e.Matrix4(), i = {
			grass: 7772289,
			forest: 6193768,
			ore: 9214356,
			crystal: 9601453
		}, a = [], o = [], s = [], c = new Set(t.buildings.map((e) => e.z * 32 + e.x));
		if (t.terrain.forEach((t, l) => {
			let u = l % 32, d = Math.floor(l / 32);
			r.compose(new e.Vector3(u, -.105, d), new e.Quaternion(), new e.Vector3(.98, .16, .98)), n.setMatrixAt(l, r);
			let f = new e.Color(i[t]);
			f.multiplyScalar(.95 + (u * 31 + d * 13) % 7 / 100), n.setColorAt(l, f), t === "forest" && !c.has(l) && a.push(l), t === "ore" && !c.has(l) && o.push(l), t === "crystal" && !c.has(l) && s.push(l);
		}), this.terrain.add(n), a.length) {
			let t = new e.InstancedMesh(this.geometry("cylinder", () => new e.CylinderGeometry(1, 1, 1, 8)), this.material(7560262), a.length), n = new e.InstancedMesh(this.geometry("cone", () => new e.ConeGeometry(1, 1, 6)), this.material(3040090), a.length);
			a.forEach((i, a) => {
				let o = i % 32 + .23, s = Math.floor(i / 32) + .23;
				r.compose(new e.Vector3(o, .23, s), new e.Quaternion(), new e.Vector3(.065, .48, .065)), t.setMatrixAt(a, r), r.compose(new e.Vector3(o, .67, s), new e.Quaternion(), new e.Vector3(.26, .72, .26)), n.setMatrixAt(a, r);
			}), this.terrain.add(t, n);
		}
		if (o.length) {
			let t = new e.InstancedMesh(this.geometry("rock", () => new e.DodecahedronGeometry(1, 0)), this.material(8896208), o.length);
			o.forEach((n, i) => {
				r.compose(new e.Vector3(n % 32 + .25, .18, Math.floor(n / 32) + .22), new e.Quaternion().setFromAxisAngle(new e.Vector3(0, 1, 0), n), new e.Vector3(.22, .28, .2)), t.setMatrixAt(i, r);
			}), this.terrain.add(t);
		}
		if (s.length) {
			let t = new e.InstancedMesh(this.geometry("gem", () => new e.OctahedronGeometry(1, 0)), this.material(11835363, 2167087), s.length * 2);
			s.forEach((n, i) => {
				let a = n % 32, o = Math.floor(n / 32);
				r.compose(new e.Vector3(a + .19, .32, o + .2), new e.Quaternion(), new e.Vector3(.2, .48, .2)), t.setMatrixAt(i * 2, r), r.compose(new e.Vector3(a - .19, .17, o - .08), new e.Quaternion().setFromAxisAngle(new e.Vector3(0, 0, 1), .2), new e.Vector3(.14, .25, .14)), t.setMatrixAt(i * 2 + 1, r);
			}), this.terrain.add(t);
		}
	}
	facility(t) {
		let n = new e.Group(), r = this.arrow(), i = null, a = null, o = null, s = null, c = null, l = null, u = [], f = [];
		r.visible = k(t, 0).length > 0;
		let p = [];
		if (r.position.y = t === "belt" || t === "splitter" ? .245 : .36, r.position.z = -.29, r.scale.setScalar(1.3), n.add(r), t === "belt" || t === "splitter") {
			this.box(n, 4345426, [
				.7,
				.13,
				.9
			], [
				0,
				.07,
				0
			]);
			for (let e of [-.31, .31]) this.box(n, 12031575, [
				.06,
				.15,
				.9
			], [
				e,
				.15,
				0
			]);
			o = new e.InstancedMesh(this.geometry("chevron", () => {
				let t = new e.Shape();
				t.moveTo(-.19, -.04);
				for (let [e, n] of [
					[-.14, -.1],
					[0, .015],
					[.14, -.1],
					[.19, -.04],
					[0, .12]
				]) t.lineTo(e, n);
				t.closePath();
				let n = new e.ExtrudeGeometry(t, {
					depth: .018,
					bevelEnabled: !1
				});
				return n.rotateX(-Math.PI / 2), n;
			}), this.material(15326120), 3), o.frustumCulled = !1, n.add(o), t === "splitter" && (this.box(n, 4345426, [
				.43,
				.13,
				.38
			], [
				.25,
				.07,
				0
			]), this.cylinder(n, 7518643, .2, .16, [
				0,
				.21,
				0
			]), i = this.arrow(), i.rotation.y = -Math.PI / 2, i.position.set(.29, .245, 0), i.scale.setScalar(1.3), n.add(i));
		} else if (t === "wire") {
			this.cylinder(n, 5860215, .065, .55, [
				0,
				.28,
				0
			]);
			let e = this.cylinder(n, 9033180, .12, .15, [
				0,
				.61,
				0
			], !0);
			e.rotation.z = Math.PI, r.visible = !1;
			for (let [e, t] of d) {
				let r = this.box(n, 8571090, [
					e ? .52 : .045,
					.045,
					t ? .52 : .045
				], [
					e * .25,
					.4,
					t * .25
				]);
				r.visible = !1, p.push(r);
			}
		} else if (this.box(n, 5531506, [
			.76,
			.13,
			.76
		], [
			0,
			.07,
			0
		]), t === "miner" || t === "crystalMiner") {
			if (this.box(n, t === "crystalMiner" ? 10256565 : 7970471, [
				.59,
				.38,
				.55
			], [
				0,
				.33,
				0
			]), this.cylinder(n, 14858601, .14, .39, [
				0,
				.61,
				-.04
			], !0).rotation.z = Math.PI, this.box(n, 14858601, [
				.5,
				.07,
				.07
			], [
				0,
				.75,
				0
			]), t === "crystalMiner") {
				let t = new e.Mesh(this.geometry("gem", () => new e.OctahedronGeometry(1, 0)), this.material(13017845));
				t.scale.set(.16, .26, .16), t.position.set(.23, .77, .15), n.add(t);
			}
		} else if (t === "smelter") this.cylinder(n, 10709593, .32, .58, [
			0,
			.41,
			0
		]), this.cylinder(n, 15387546, .2, .16, [
			0,
			.77,
			0
		], !0), this.box(n, 5525072, [
			.17,
			.6,
			.17
		], [
			.23,
			.86,
			.2
		]), this.box(n, 16760166, [
			.23,
			.17,
			.035
		], [
			0,
			.35,
			.33
		]);
		else if (t === "generator") this.cylinder(n, 7564192, .34, .55, [
			0,
			.39,
			0
		]), this.cylinder(n, 11389912, .24, .3, [
			0,
			.82,
			0
		], !0), this.box(n, 13084271, [
			.65,
			.08,
			.65
		], [
			0,
			.63,
			0
		]);
		else if (t === "lumber") {
			this.box(n, 10781791, [
				.56,
				.44,
				.52
			], [
				0,
				.35,
				0
			]);
			let e = this.cylinder(n, 6586490, .43, .34, [
				0,
				.7,
				0
			], !0);
			e.rotation.y = Math.PI / 6, this.box(n, 14794631, [
				.11,
				.13,
				.43
			], [
				-.24,
				.29,
				-.1
			]);
		} else if (t === "crystalRefiner") {
			this.cylinder(n, 7955088, .33, .39, [
				0,
				.34,
				0
			]);
			for (let e of [-.25, .25]) this.cylinder(n, 12757878, .045, .62, [
				e,
				.68,
				0
			]);
			this.box(n, 13875315, [
				.62,
				.07,
				.1
			], [
				0,
				1,
				0
			]);
			let t = new e.Mesh(this.geometry("gem", () => new e.OctahedronGeometry(1, 0)), this.material(12225269, 2560067));
			t.scale.set(.2, .3, .2), t.position.set(0, .74, 0), n.add(t);
		} else if (t === "assembler") {
			this.box(n, 4615543, [
				.69,
				.28,
				.61
			], [
				0,
				.31,
				0
			]), this.box(n, 12821879, [
				.75,
				.09,
				.65
			], [
				0,
				.51,
				0
			]), this.box(n, 7108480, [
				.35,
				.22,
				.22
			], [
				0,
				.65,
				0
			]), this.box(n, 13875069, [
				.07,
				.43,
				.07
			], [
				-.27,
				.75,
				.18
			]);
			let e = this.box(n, 10005425, [
				.22,
				.13,
				.15
			], [
				-.25,
				.96,
				.18
			]);
			e.rotation.z = .2;
		} else if (t === "runeCarver") {
			this.box(n, 8544629, [
				.62,
				.34,
				.53
			], [
				0,
				.33,
				0
			]), this.box(n, 13151349, [
				.72,
				.07,
				.63
			], [
				0,
				.54,
				0
			]);
			let t = new e.Mesh(this.geometry("rune-ring", () => new e.TorusGeometry(.22, .035, 4, 10)), this.material(16763779, 3745556));
			t.rotation.x = Math.PI / 2, t.position.y = .61, n.add(t);
			for (let e of [
				0,
				Math.PI / 3,
				-Math.PI / 3
			]) this.box(n, 15324846, [
				.35,
				.025,
				.035
			], [
				0,
				.6,
				0
			]).rotation.y = e;
			this.box(n, 10398914, [
				.065,
				.4,
				.065
			], [
				.25,
				.79,
				.2
			]).rotation.z = .2;
		} else if (t === "frameForge") {
			this.box(n, 6649724, [
				.7,
				.24,
				.61
			], [
				0,
				.3,
				0
			]), this.box(n, 11773572, [
				.75,
				.085,
				.68
			], [
				0,
				.47,
				0
			]), this.box(n, 8560552, [
				.25,
				.25,
				.16
			], [
				0,
				.76,
				0
			]), this.box(n, 12176336, [
				.16,
				.16,
				.16
			], [
				0,
				.98,
				0
			]);
			for (let e of [-.2, .2]) this.box(n, 9679030, [
				.15,
				.11,
				.15
			], [
				e,
				.81,
				0
			]);
			for (let e of [-.09, .09]) this.box(n, 9679030, [
				.09,
				.21,
				.13
			], [
				e,
				.57,
				0
			]);
		} else if (t === "golemForge") {
			this.cylinder(n, 7430538, .34, .33, [
				0,
				.31,
				0
			]);
			for (let e of [-.29, .29]) this.box(n, 12953716, [
				.09,
				.8,
				.12
			], [
				e,
				.65,
				0
			]);
			let t = new e.Mesh(this.geometry("awakening-halo", () => new e.TorusGeometry(.3, .055, 4, 10)), this.material(16176283, 3418389));
			t.position.set(0, .9, 0), n.add(t), this.cylinder(n, 9233092, .13, .34, [
				0,
				.62,
				0
			]), this.box(n, 12054739, [
				.18,
				.18,
				.17
			], [
				0,
				.91,
				0
			]);
		} else if (t === "golemRelay") {
			this.cylinder(n, 5603193, .37, .17, [
				0,
				.23,
				0
			]);
			for (let e of [-.28, .28]) for (let t of [-.28, .28]) this.box(n, 12036227, [
				.08,
				.28,
				.08
			], [
				e,
				.36,
				t
			]);
			s = new e.Group(), s.position.y = .3, this.box(s, 8893870, [
				.19,
				.23,
				.15
			], [
				0,
				.27,
				0
			]), this.box(s, 12117202, [
				.16,
				.16,
				.16
			], [
				0,
				.5,
				0
			]), this.box(s, 2378049, [
				.095,
				.035,
				.02
			], [
				0,
				.51,
				-.09
			]);
			for (let e of [-.15, .15]) this.box(s, 9881531, [
				.085,
				.21,
				.11
			], [
				e,
				.27,
				0
			]);
			for (let e of [-.055, .055]) this.box(s, 7577242, [
				.085,
				.16,
				.13
			], [
				e,
				.09,
				0
			]);
			s.visible = !1, n.add(s);
			let t = new e.BufferGeometry();
			t.setAttribute("position", new e.BufferAttribute(/* @__PURE__ */ new Float32Array(6), 3)), c = new e.Line(t, this.relayLineMaterial), c.visible = !1, c.frustumCulled = !1, n.add(c), l = new e.Mesh(this.geometry("gem", () => new e.OctahedronGeometry(1, 0)), this.material(14799521)), l.scale.setScalar(.13), l.visible = !1, n.add(l);
		} else if (t === "storage") {
			this.box(n, 4616056, [
				.74,
				.12,
				.74
			], [
				0,
				.22,
				0
			]);
			for (let e of [-.36, .36]) this.box(n, 8762544, [
				.76,
				.22,
				.055
			], [
				0,
				.37,
				e
			]);
			for (let e of [-.36, .36]) this.box(n, 8762544, [
				.055,
				.22,
				.76
			], [
				e,
				.37,
				0
			]);
			a = new e.InstancedMesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(16777215), 32);
			let t = new e.Matrix4();
			for (let n = 0; n < 32; n++) t.compose(new e.Vector3((n % 4 - 1.5) * .15, .32 + Math.floor(n / 16) * .12, (Math.floor(n / 4) % 4 - 1.5) * .15), new e.Quaternion(), new e.Vector3(.12, .1, .12)), a.setMatrixAt(n, t), a.setColorAt(n, new e.Color(16777215));
			a.computeBoundingSphere(), a.count = 0, n.add(a);
		} else this.box(n, 12361841, [
			.62,
			.41,
			.62
		], [
			0,
			.35,
			0
		]), this.box(n, 6773328, [
			.66,
			.07,
			.66
		], [
			0,
			.59,
			0
		]), this.box(n, 15586708, [
			.09,
			.48,
			.66
		], [
			0,
			.35,
			0
		]);
		if (ae({ kind: t }).length) for (let r = 0; r < 4; r++) {
			let [i, a] = d[r], o = t === "belt" || t === "splitter" ? .055 : .09, s = new e.Mesh(this.geometry(`socket-${o}`, () => new e.TorusGeometry(o, .023, 4, 8)), this.material(9886190));
			s.rotation.x = Math.PI / 2, s.position.set(i * .43, .18, a * .43), n.add(s), u.push(s);
		}
		for (let r = 0; r < k(t, 0).length; r++) {
			let t = new e.Group();
			t.rotation.y = -r * Math.PI / 2, this.box(t, 13280870, [
				.3,
				.1,
				.23
			], [
				0,
				.18,
				-.43
			]), this.box(t, 3227456, [
				.18,
				.065,
				.025
			], [
				0,
				.2,
				-.552
			]);
			let i = this.portGlyph();
			i.group.position.set(0, .3, -.61), t.add(i.group), this.paintPort(i, "missing"), n.add(t), f.push(i);
		}
		let m = new e.Mesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(14730388));
		m.scale.set(.19, .14, .22), m.visible = !1, n.add(m);
		let h = new e.Mesh(this.geometry("rock", () => new e.DodecahedronGeometry(1, 0)), this.material(7635834));
		return h.scale.setScalar(.055), h.position.set(.25, t === "belt" ? .22 : .66, .22), h.visible = ![
			"wire",
			"belt",
			"splitter",
			"storage"
		].includes(t), n.add(h), {
			group: n,
			arrow: r,
			sideArrow: i,
			item: m,
			lamp: h,
			kind: t,
			wires: p,
			sockets: u,
			ports: f,
			chevrons: o,
			flowKey: "",
			contents: a,
			contentsKey: "",
			worker: s,
			route: c,
			bead: l
		};
	}
	itemColor(e) {
		return ce[e];
	}
	setItemShape(t, n) {
		t.rotation.set(0, 0, 0), n === "wood" ? (t.geometry = this.geometry("cylinder", () => new e.CylinderGeometry(1, 1, 1, 8)), t.scale.set(.075, .25, .075), t.rotation.x = Math.PI / 2) : n === "ore" || n === "rawCrystal" ? (t.geometry = this.geometry("rock", () => new e.DodecahedronGeometry(1, 0)), t.scale.set(.13, n === "rawCrystal" ? .16 : .12, .13)) : n === "crystal" ? (t.geometry = this.geometry("gem", () => new e.OctahedronGeometry(1, 0)), t.scale.set(.105, .2, .105)) : n === "runeCore" ? (t.geometry = this.geometry("rune-ring", () => new e.TorusGeometry(.22, .035, 4, 10)), t.scale.setScalar(.65), t.rotation.x = Math.PI / 2) : n === "golemFrame" || n === "golem" ? (t.geometry = this.geometry(`item-${n}`, () => {
			let t = new e.Shape();
			t.moveTo(-.2, -.4);
			for (let [e, n] of [
				[-.03, -.4],
				[-.03, -.16],
				[.03, -.16],
				[.03, -.4],
				[.2, -.4],
				[.2, .02],
				[.36, .02],
				[.36, .18],
				[.2, .18],
				[.2, .32],
				[.14, .32],
				[.14, .53],
				[-.14, .53],
				[-.14, .32],
				[-.2, .32],
				[-.2, .18],
				[-.36, .18],
				[-.36, .02],
				[-.2, .02]
			]) t.lineTo(e, n);
			if (t.closePath(), n === "golemFrame") {
				let n = new e.Path();
				n.moveTo(-.105, -.02), n.lineTo(-.105, .23), n.lineTo(.105, .23), n.lineTo(.105, -.02), n.closePath(), t.holes.push(n);
			}
			let r = new e.ExtrudeGeometry(t, {
				depth: n === "golem" ? .13 : .065,
				bevelEnabled: !1
			});
			return r.rotateX(-Math.PI / 2), r;
		}), t.scale.setScalar(.39)) : n === "sword" ? (t.geometry = this.geometry("sword", () => {
			let t = new e.Shape();
			t.moveTo(-.065, -.4);
			for (let [e, n] of [
				[.065, -.4],
				[.065, -.16],
				[.28, -.16],
				[.28, -.07],
				[.09, -.07],
				[.09, .38],
				[0, .56],
				[-.09, .38],
				[-.09, -.07],
				[-.28, -.07],
				[-.28, -.16],
				[-.065, -.16]
			]) t.lineTo(e, n);
			t.closePath();
			let n = new e.ExtrudeGeometry(t, {
				depth: .055,
				bevelEnabled: !1
			});
			return n.rotateX(-Math.PI / 2), n;
		}), t.scale.setScalar(.4)) : (t.geometry = this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), t.scale.set(.23, .09, .14));
	}
	outputResources(e, t) {
		return oe({
			kind: e,
			recipe: t,
			x: 0,
			z: 0,
			direction: 0
		});
	}
	disposeFacility(e) {
		e.contents?.dispose(), e.chevrons?.dispose(), e.route?.geometry.dispose();
	}
	updateFlow(e, t, n, r) {
		if (r.forEach((t, n) => this.paintPort(e.ports[n], t.state)), !e.chevrons) return;
		let i = !!t.item && t.beltProgress + 1e-9 >= l && r.every((e) => e.state !== "connected"), a = i || this.reducedMotion.matches ? 0 : t.item ? Math.min(1, t.beltProgress / l) : n / 10 % 1, o = `${a}:${i}`;
		if (e.flowKey !== o) {
			e.flowKey = o;
			for (let t = 0; t < 3; t++) {
				let n = .36 - (t / 3 + a / 3) % 1 * .72;
				this.flowPosition.set(0, .18, n), this.flowMatrix.compose(this.flowPosition, this.flowRotation, this.flowScale), e.chevrons.setMatrixAt(t, this.flowMatrix);
			}
			e.chevrons.instanceMatrix.needsUpdate = !0;
		}
	}
	updateRelay(e, t, n, r) {
		if (!e.worker || !e.route || !e.bead) return;
		e.worker.visible = !!t.golemWorker, e.lamp.material = this.material(t.golemWorker ? 9167036 : 13474169);
		let i = t.golemRoute, a = i ? r.get(i.sourceId) : null, o = i ? r.get(i.targetId) : null, s = i ? n - i.tick : 20, c = !!t.golemWorker && !!i && !!a && !!o && s >= 0 && s < 20;
		if (e.route.visible = e.bead.visible = c, !c || !a || !o || !i) return;
		e.group.updateMatrixWorld(!0), this.routeStart.set(a.x, .86, a.z), e.group.worldToLocal(this.routeStart), this.routeEnd.set(o.x, .86, o.z), e.group.worldToLocal(this.routeEnd);
		let l = e.route.geometry.getAttribute("position");
		l.setXYZ(0, this.routeStart.x, this.routeStart.y, this.routeStart.z), l.setXYZ(1, this.routeEnd.x, this.routeEnd.y, this.routeEnd.z), l.needsUpdate = !0, e.bead.position.copy(this.routeStart).lerp(this.routeEnd, s / 20), e.bead.material = this.material(this.itemColor(i.resource)), this.setItemShape(e.bead, i.resource);
	}
	updateFacility(t, n) {
		t.group.position.set(n.x, 0, n.z), t.group.rotation.y = -n.direction * Math.PI / 2, t.lamp.material = this.material(n.working ? 9233064 : 13603442, n.working ? 2313259 : 0);
		let r = n.item ?? n.output[0];
		if (t.item.visible = !!r && n.kind !== "storage", r) {
			t.item.material = this.material(this.itemColor(r.resource)), this.setItemShape(t.item, r.resource);
			let e = n.kind === "belt" || n.kind === "splitter", i = e ? Math.min(1, n.beltProgress / l) : 0, a = n.kind === "splitter" && n.splitCursor === 1;
			t.item.position.set(a ? i * .34 : 0, e ? .29 : .22, e ? a ? .34 * (1 - i) : .34 - i * .68 : -.36);
		}
		if (t.contents) {
			let r = n.input, i = r.map((e) => e.resource).join(",");
			if (t.contentsKey !== i) {
				t.contentsKey = i, t.contents.count = Math.min(32, r.length);
				for (let n = 0; n < t.contents.count; n++) t.contents.setColorAt(n, new e.Color(this.itemColor(r[n].resource)));
				t.contents.instanceColor && (t.contents.instanceColor.needsUpdate = !0);
			}
		}
	}
	render(t, n) {
		if (this.disposed) return;
		let r = performance.now();
		this.input.update((r - this.lastTime) / 1e3), this.lastTime = r;
		let i = t.buildings.map((e) => e.z * 32 + e.x).filter((e) => t.terrain[e] !== "grass").sort((e, t) => e - t).join(","), a = `${t.seed}:${t.terrain.join(",")}:${i}`;
		a !== this.terrainKey && (this.rebuildTerrain(t), this.terrainKey = a);
		let o = /* @__PURE__ */ new Set(), c = new Map(t.buildings.map((e) => [e.id, e])), l = new Map(t.buildings.map((e) => [`${e.x},${e.z}`, e])), u = new Set(s), f = /* @__PURE__ */ new Set(), p = t.buildings.filter((e) => e.kind === "generator" && e.energy > 0);
		for (let e = 0; e < p.length; e++) {
			let t = p[e], n = `${t.x},${t.z}`;
			if (!f.has(n)) {
				f.add(n);
				for (let [e, n] of d) {
					let r = `${t.x + e},${t.z + n}`, i = l.get(r);
					i && u.has(i.kind) && !f.has(r) && p.push(i);
				}
			}
		}
		for (let e of t.buildings) {
			o.add(e.id);
			let r = this.facilities.get(e.id);
			r && r.kind !== e.kind && (this.scene.remove(r.group), this.disposeFacility(r), this.facilities.delete(e.id), r = void 0), r || (r = this.facility(e.kind), this.facilities.set(e.id, r), this.scene.add(r.group)), this.updateFacility(r, e), this.updateRelay(r, e, t.tick, c);
			let i = j(e, l);
			if (this.updateFlow(r, e, t.tick, i), e.id === n.selectedId && (this.renderer.domElement.dataset.selectedDirection = String(e.direction), this.renderer.domElement.dataset.selectedPorts = i.map((e) => `${e.direction}:${e.state}`).join(","), this.renderer.domElement.dataset.selectedFlowProgress = String(e.beltProgress)), e.kind === "wire") for (let t = 0; t < 4; t++) {
				let [n, i] = d[t], a = l.get(`${e.x + n},${e.z + i}`);
				r.wires[t].visible = !!a && u.has(a.kind);
			}
			e.kind === "wire" && (r.group.rotation.y = 0);
		}
		for (let [e, t] of this.facilities) o.has(e) || (this.scene.remove(t.group), this.disposeFacility(t), this.facilities.delete(e));
		if (this.ghost.visible = !!n.kind && !!n.hover && this.cursorOnMap, this.ghost.visible ? this.renderer.domElement.dataset.ghostValid = String(n.valid) : delete this.renderer.domElement.dataset.ghostValid, this.ghost.visible && n.hover) {
			if (this.ghostPreview?.kind !== n.kind && (this.ghostPreview && (this.ghost.remove(this.ghostPreview.group), this.disposeFacility(this.ghostPreview)), this.ghostPreview = this.facility(n.kind), this.ghostPreview.item.visible = this.ghostPreview.lamp.visible = !1, this.ghost.add(this.ghostPreview.group)), this.ghost.position.set(n.hover.x, 0, n.hover.z), this.ghost.traverse((t) => {
				t instanceof e.Mesh && (t.material = this.material(n.valid ? 9437105 : 16742510, 0, t.parent !== this.ghost));
			}), this.ghost.rotation.y = -n.direction * Math.PI / 2, this.ghostPort.visible = !!n.kind && k(n.kind, n.direction).length > 0, this.ghostSidePort.visible = n.kind === "splitter", this.ghostPort.visible && n.kind) {
				let t = this.outputResources(n.kind);
				if ([
					"belt",
					"splitter",
					"storage"
				].includes(n.kind)) {
					let e = d.map(([e, t]) => l.get(`${n.hover.x + e},${n.hover.z + t}`)).filter((e) => !!e).filter((e) => (e.kind === "splitter" ? [e.direction, (e.direction + 1) % 4] : [e.direction]).some((t) => {
						let [r, i] = d[t];
						return e.x + r === n.hover.x && e.z + i === n.hover.z;
					})).flatMap((e) => e.item ? [e.item.resource] : e.output.length ? e.output.map((e) => e.resource) : e.kind === "storage" && e.input.length ? e.input.map((e) => e.resource) : [
						"belt",
						"splitter",
						"storage"
					].includes(e.kind) ? [] : this.outputResources(e.kind, e.recipe));
					e.length && (t = e);
				}
				let r = j({
					kind: n.kind,
					x: n.hover.x,
					z: n.hover.z,
					direction: n.direction
				}, l, t);
				this.renderer.domElement.dataset.ghostDirection = String(n.direction), this.renderer.domElement.dataset.ghostPorts = r.map((e) => `${e.direction}:${e.state}`).join(",");
				for (let t = 0; t < r.length; t++) {
					let n = r[t], i = n.state === "edge" || n.state === "incompatible" ? 16736857 : n.state === "connected" ? 9437101 : 15971156, a = t === 0 ? this.ghostPort : this.ghostSidePort, o = t === 0 ? this.ghostPreview?.arrow : this.ghostPreview?.sideArrow;
					a.traverse((t) => {
						t instanceof e.Mesh && (t.material = this.material(i));
					}), o?.traverse((t) => {
						t instanceof e.Mesh && (t.material = this.material(i));
					}), this.ghostPreview && this.paintPort(this.ghostPreview.ports[t], n.state);
				}
			}
			for (let e of this.ghostPreview?.sockets ?? []) e.material = this.material(9886190, 0, !0);
			if (this.ghostCheck.visible = n.valid, this.ghostCross.visible = !n.valid, this.ghostFeasibility.traverse((t) => {
				t instanceof e.Mesh && (t.material = this.material(t.userData.visualBackdrop ? 3425345 : n.valid ? 13107163 : 16765638));
			}), this.ghostPower) {
				let e = n.kind && u.has(n.kind);
				this.ghostPower.visible = !!e;
				let t = d.some(([e, t]) => {
					let r = l.get(`${n.hover.x + e},${n.hover.z + t}`);
					return r && u.has(r.kind);
				}), r = d.some(([e, t]) => f.has(`${n.hover.x + e},${n.hover.z + t}`));
				this.ghostPower.material = this.material(r ? 7005183 : t ? 12032737 : 15182441, 2111546);
			}
		}
		let m = n.selectedId == null ? null : this.facilities.get(n.selectedId);
		this.selection.visible = !!m, this.selectedRelayRange.visible = m?.kind === "golemRelay", this.selectedRelayRange.visible && m && this.selectedRelayRange.position.copy(m.group.position), m ? (this.selection.position.copy(m.group.position), this.selection.rotation.y = m.group.rotation.y, this.selectedDirection.visible = k(m.kind, 0).length > 0, this.selectedSideDirection.visible = m.kind === "splitter") : (delete this.renderer.domElement.dataset.selectedDirection, delete this.renderer.domElement.dataset.selectedPorts, delete this.renderer.domElement.dataset.selectedFlowProgress), this.updateGuide(n.guideTarget ?? null, r), this.contextLost || this.renderer.render(this.scene, this.camera);
	}
	updateGuide(e, t) {
		let n = !!e && e.x >= 0 && e.x < 32 && e.z >= 0 && e.z < 32;
		if (this.guideMarker.visible = n, this.guideLabel.hidden = !n, !n || !e) return;
		this.guideMarker.position.set(e.x, .09, e.z);
		let i = this.reducedMotion.matches ? 1.08 : 1.08 + Math.sin(t / 350) * .025;
		this.guideMarker.scale.set(i, 1, i), this.guideDirection.visible = e.direction !== null, e.direction !== null && (this.guideDirection.rotation.y = -e.direction * Math.PI / 2);
		let a = `${e.x},${e.z},${e.kind},${e.direction}`;
		if (a !== this.guideLabelKey) {
			this.guideLabelKey = a;
			let t = e.kind ? r[e.kind].label : "この区画", n = e.direction === null ? "" : ` · ${[
				"北",
				"東",
				"南",
				"西"
			][e.direction]}向き`;
			this.guideLabel.textContent = `${t} (${e.x}, ${e.z})${n}\n↓ 光る区画をクリック`, this.guideLabel.dataset.x = String(e.x), this.guideLabel.dataset.z = String(e.z);
		}
		let o = this.renderer.domElement.getBoundingClientRect();
		this.guideProjection.set(e.x, 0, e.z).project(this.camera);
		let s = o.left + (this.guideProjection.x + 1) * o.width / 2, c = o.top + (1 - this.guideProjection.y) * o.height / 2, l = s.toFixed(2), u = c.toFixed(2);
		this.guideLabel.dataset.screenX !== l && (this.guideLabel.dataset.screenX = l), this.guideLabel.dataset.screenY !== u && (this.guideLabel.dataset.screenY = u);
		let d = this.host.getBoundingClientRect(), f = Math.max(110, Math.min(d.width - 110, s - d.left)), p = Math.max(135, Math.min(d.height - 170, c - d.top - 50)), m = `${f}px`, h = `${p}px`;
		this.guideLabel.style.left !== m && (this.guideLabel.style.left = m), this.guideLabel.style.top !== h && (this.guideLabel.style.top = h);
		let g = Math.abs(this.guideProjection.x) > 1 || Math.abs(this.guideProjection.y) > 1;
		this.guideLabel.hidden = g;
	}
	pick(e) {
		this.cursorOnMap = !1;
		let t = this.renderer.domElement.getBoundingClientRect();
		if (!t.width || !t.height || e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom || (this.pointerPosition.set((e.clientX - t.left) / t.width * 2 - 1, -(e.clientY - t.top) / t.height * 2 + 1), this.raycaster.setFromCamera(this.pointerPosition, this.camera), !this.raycaster.ray.intersectPlane(this.groundPlane, this.intersection))) return null;
		let n = Math.floor(this.intersection.x + .5), r = Math.floor(this.intersection.z + .5);
		return this.cursorOnMap = n >= 0 && n < 32 && r >= 0 && r < 32, this.cursorOnMap ? {
			x: n,
			z: r
		} : null;
	}
	updateCamera() {
		this.camera.position.set(this.target.x + Math.sin(this.bearing) * 25, 29, this.target.z + Math.cos(this.bearing) * 25), this.camera.lookAt(this.target), this.camera.updateMatrixWorld();
	}
	pan(t, n) {
		let r = this.extent * 2 / Math.max(1, this.host.clientHeight);
		this.target.x += (-t * Math.cos(this.bearing) - n * Math.sin(this.bearing)) * r, this.target.z += (t * Math.sin(this.bearing) - n * Math.cos(this.bearing)) * r, this.target.x = e.MathUtils.clamp(this.target.x, -5, 36), this.target.z = e.MathUtils.clamp(this.target.z, -5, 36), this.updateCamera();
	}
	rotate(e) {
		this.bearing += e, this.updateCamera();
	}
	zoom(t) {
		this.extent = e.MathUtils.clamp(this.extent * Math.exp(t), 3.5, 25), this.resize();
	}
	resize() {
		if (this.disposed) return;
		let e = Math.max(1, this.host.clientWidth), t = Math.max(1, this.host.clientHeight), n = e / t;
		this.camera.left = -this.extent * n, this.camera.right = this.extent * n, this.camera.top = this.extent, this.camera.bottom = -this.extent, this.camera.updateProjectionMatrix(), this.updateCamera(), this.renderer.setSize(e, t);
	}
	resetCamera() {
		this.target.set(13, 0, 16), this.bearing = Math.PI / 4, this.extent = 11, this.resize();
	}
	setInputBlocked(e) {
		this.input.setBlocked(e);
	}
	revealTile(e, t) {
		if (this.disposed || e < 0 || e >= 32 || t < 0 || t >= 32) return;
		this.guideProjection.set(e, 0, t).project(this.camera);
		let n = Math.max(1, this.host.clientWidth), r = Math.max(1, this.host.clientHeight), i = (this.guideProjection.x + 1) * n / 2, a = (1 - this.guideProjection.y) * r / 2;
		i >= 32 && i <= n - 32 && a >= 32 && a <= r - 32 || (this.target.set(e, 0, t), this.updateCamera());
	}
	dispose() {
		if (!this.disposed) {
			this.disposed = !0, this.input.dispose(), this.observer.disconnect(), this.abort.abort();
			for (let t of this.terrain.children) t instanceof e.InstancedMesh && t.dispose();
			for (let e of this.facilities.values()) this.disposeFacility(e);
			this.ghostPreview && this.disposeFacility(this.ghostPreview);
			for (let e of this.geometries.values()) e.dispose();
			for (let e of this.materials.values()) e.dispose();
			this.relayLineMaterial.dispose(), this.scene.clear(), this.facilities.clear(), this.renderer.dispose(), this.renderer.domElement.remove(), this.guideLabel.remove();
		}
	}
};
//#endregion
//#region web/js/fantasy-automation/icons.ts
function M(e) {
	return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" class="resource-icon resource-${e}">${{
		wood: "<path d=\"M5 8 21 4 27 11 11 16Z\"/><path d=\"M11 16 27 11 27 23 11 28 5 21 5 8\"/><path d=\"m11 16 0 12M8 12l15-4\"/>",
		ore: "<path d=\"m5 22 3-13 11-5 9 9-4 13-13 2Z\"/><path d=\"m8 9 9 8 11-4M17 17l-6 11m6-11 7 9\"/>",
		ingot: "<path d=\"m7 8 18-2 5 12-5 7-21 1-2-8Z\"/><path d=\"m7 8 2 12 21-2M9 20l-5 6\"/>",
		rawCrystal: "<path d=\"m7 13 7-10 7 3 6 14-7 9-12-4Z\"/><path d=\"m14 3 2 14 5-11m-5 11 4 12m-4-12-9-4m9 4 11 3\"/>",
		crystal: "<path d=\"m16 2 10 12-3 13-7 4-7-4-3-13Z\"/><path d=\"m16 2 0 29M6 14l10 4 10-4m-17 13 7-9 7 9\"/>",
		runeCore: "<circle cx=\"16\" cy=\"16\" r=\"11\"/><path d=\"m16 5 0 22M5 16h22m-19-8 16 16M8 24 24 8\"/>",
		golemFrame: "<path d=\"m11 3 10 0 2 8-7 5-7-5Z M5 14h7v11H5Zm15 0h7v11h-7ZM11 20h10v10H11Z\"/>",
		golem: "<path d=\"M10 3h12v10H10Zm-3 11h18v10H7ZM3 14h4v13H3Zm22 0h4v13h-4ZM9 24h6v7H9Zm8 0h6v7h-6Z\"/><path d=\"M12 8h3m2 0h3\"/>",
		sword: "<path d=\"m23 2 6 3-13 18-5-4Z\"/><path d=\"m8 16 12 9-2 3-12-9Z\"/><path d=\"m11 23-5 7-4-3 5-7Z\"/>"
	}[e]}</svg>`;
}
//#endregion
//#region web/js/fantasy-automation/objectives.ts
function ue(e) {
	if (e.version !== 1 || e.stats) return e;
	let t = e.buildings.flatMap((e) => [
		...e.input,
		...e.output,
		...e.reserved ?? [],
		...e.item ? [e.item] : []
	]), n = e.delivered + t.filter((e) => e.resource === "ingot" && e.automated && !e.handled).length;
	return {
		...e,
		stats: {
			produced: { ingot: n },
			delivered: { ingot: e.delivered },
			recentSwordTicks: [],
			peakSwordRate: 0
		}
	};
}
function de(e) {
	let t = e.unlocks.kinds.map((e) => r[e].label), n = e.unlocks.recipes.map((e) => i[e].label);
	return [...t, ...n.map((e) => `${e}レシピ`)].join("・");
}
function N(e, t, n) {
	let r = t.requirements.find((e) => !e.met) ?? t.requirements[0], i = t.status === "available", a = t.requirements.map((e) => `${e.label} ${e.current}/${e.target}`).join("・"), o = de(t), s = n && n.id !== t.id ? `追跡中「${n.label}」の前提技術です。` : "", c = t.id === "mastery" ? `現在 ${y(e)}本/ゲーム内分、最高 ${e.stats?.peakSwordRate ?? 0}本/ゲーム内分。納品累計とは別の実測速度です。` : "", l = i ? "条件達成。技術ツリーを開き「研究する（実績のみ）」を押してください。" : "自動生産・自動納品の実績を増やし、技術ツリーで条件を確認してください。";
	return {
		title: i ? `${t.label}を研究する` : `${t.label}：${r?.label ?? "前提技術を解放"}`,
		detail: `${s}${l}${a ? ` ${a}。` : ""}${o ? ` 解放: ${o}。` : ""}${c ? ` ${c}` : ""}`,
		...r ? { resource: r.resource ?? (r.metric === "peakSwordRate" ? "sword" : r.metric === "golemFuelTransfers" ? "wood" : void 0) } : {},
		current: r?.current ?? 0,
		target: r?.target ?? 1,
		action: "technology",
		completed: !1
	};
}
function P(e) {
	let t = ue(e), n = b(t), r = n.find((e) => e.id === t.research?.tracked && e.status !== "unlocked"), i = (e) => {
		let t = n.find((t) => e.prerequisites.includes(t.id) && t.status !== "unlocked");
		return t ? i(t) : e;
	}, a = r ? i(r) : n.find((e) => e.status === "available");
	if (a) return N(t, a, r);
	if (n.every((e) => e.status === "unlocked")) return {
		title: `${n[n.length - 1].label}を達成：工房を自由に拡張`,
		detail: `全技術を解放しました。ゴーレムの自動生産 ${t.stats?.produced.golem ?? 0}体、木材の自動補給 ${t.stats?.golemFuelTransfers ?? 0}個。収納や分岐、ゴーレムを使って工房を広げられます。`,
		resource: "wood",
		current: t.stats?.golemFuelTransfers ?? 0,
		target: 20,
		action: null,
		completed: !0
	};
	let o = n.find((e) => e.status !== "unlocked");
	return n.some((e) => e.status === "unlocked" && e.id !== "basic" && e.id !== "logistics") ? N(t, i(o)) : t.delivered < 100 ? {
		title: "鉄の延べ棒を100本自動納品",
		detail: "採掘機→魔導炉→納品箱をつなぎ、自動生産した鉄の延べ棒を自動搬送してください。手で投入・回収した品は数えません。研究条件を達成すると次の目標へ進みます。",
		resource: "ingot",
		current: t.delivered,
		target: 100,
		action: "guide",
		completed: !1
	} : N(t, i(o));
}
//#endregion
//#region web/js/fantasy-automation/ui.ts
var F = o, I = Object.keys(F), fe = v.map((e) => e.id), L = Object.fromEntries(v.map((e) => [e.id, e.label])), R = [
	"北 ↑",
	"東 →",
	"南 ↓",
	"西 ←"
], pe = Object.keys(r), me = {
	miner: "⚒",
	belt: "→",
	smelter: "♨",
	generator: "✦",
	wire: "⌁",
	lumber: "♣",
	delivery: "▣",
	splitter: "⑂",
	storage: "▤",
	crystalMiner: "◇",
	crystalRefiner: "◈",
	assembler: "⚔",
	runeCarver: "✧",
	frameForge: "□",
	golemForge: "♟",
	golemRelay: "⇄"
}, z = {
	miner: "鉱脈の上に設置。魔力2で鉄鉱石1を2秒で採掘。矢印へ排出。",
	belt: "矢印の先へ1個ずつ搬送。1区画0.5秒。ドラッグで連続配置。",
	smelter: "鉄鉱石2と魔力5で鉄延べ棒1を4秒で精錬。入力は隣接、出力は矢印。",
	generator: "木材1から魔力30を10秒で生成。蓄積上限30。隣接する導線へ供給。",
	wire: "隣り合う導線・魔力炉・採掘機・魔導炉を魔力網で接続。",
	lumber: "森林の上に設置。木材1を3秒で採取。矢印へ排出。",
	delivery: "鉄の延べ棒・魔導剣を受け取る納品専用の箱。自動生産し自動搬送された品だけ目標に加算。収納・取り出しはできません。",
	splitter: "前方と右側（時計回り90°）の2つの出力口へ交互に分岐。片方が詰まると空いた口へ送ります。",
	storage: "32品まで保管する収納箱。納品はしません。受け取った品を前方へ順に排出。取り出した品は手動扱いとなり自動納品に数えません。",
	crystalMiner: "結晶鉱脈の上に設置。魔力2で魔晶原石1を2秒で採掘。",
	crystalRefiner: "魔晶原石を精製魔晶へ精製。魔力導線で供給し、レシピの素材を隣接設備から入力します。",
	assembler: "鉄の延べ棒と精製魔晶を魔導剣へ組み立てる設備。入力は隣接、完成品は矢印へ出力。",
	runeCarver: "素材に魔導の印を刻み、魔導核を生産します。魔力導線でつなぎ、レシピを確認してください。",
	frameForge: "鉄の延べ棒から鉄の躯体を組み上げます。素材と魔力を供給してください。",
	golemForge: "鉄の躯体と魔導核からゴーレムを覚醒させます。完成したゴーレムを補給所へ搬送してください。",
	golemRelay: "ゴーレムを配置すると、半径6区画の収納箱から設備へ補給します。燃料補給か材料補給を選べます。"
}, B = {
	extraction: {
		label: "採取",
		kinds: [
			"miner",
			"lumber",
			"crystalMiner"
		]
	},
	logistics: {
		label: "物流",
		kinds: [
			"belt",
			"splitter",
			"storage",
			"delivery",
			"golemRelay"
		]
	},
	magic: {
		label: "魔力",
		kinds: ["generator", "wire"]
	},
	production: {
		label: "製造",
		kinds: [
			"smelter",
			"crystalRefiner",
			"assembler",
			"runeCarver",
			"frameForge",
			"golemForge"
		]
	}
}, he = "aigames-workshop-ui-v1", ge = class {
	quickSlots = [
		"miner",
		"belt",
		"smelter",
		"generator",
		"wire",
		"storage"
	];
	category = "extraction";
	registerSlot = 0;
	transferMode = "one";
	currentState = null;
	currentSelected = null;
	transferButtons = /* @__PURE__ */ new Map();
	controller = new AbortController();
	buildButtons = /* @__PURE__ */ new Map();
	speedButtons = /* @__PURE__ */ new Map();
	resourceNodes = /* @__PURE__ */ new Map();
	tracked = null;
	technologyNodes = /* @__PURE__ */ new Map();
	root;
	callbacks;
	lastSelected = null;
	previousGuideMode = null;
	guideLists = "";
	lastMessage = "";
	constructor(e, t) {
		this.root = e, this.callbacks = t, this.loadPreferences(), e.innerHTML = "\n      <header class=\"workshop-top\">\n        <a class=\"home-link\" href=\"index.html\" aria-label=\"AI Gamesへ戻る\">‹ AI Games</a>\n        <div class=\"workshop-title\">魔導からくり工房<span id=\"objective-summary\"><b id=\"objective-title\"></b> <b id=\"objective-count\"></b></span><span class=\"legacy-goal\" title=\"鉄の延べ棒の累積自動納品\"><i class=\"ingot-icon\" aria-hidden=\"true\"></i> 鉄の延べ棒 自動納品 <b id=\"delivered-count\">0</b> / 100 <small class=\"goal-condition\">自動生産→自動搬送品のみ</small></span></div>\n        <div class=\"resource-strip\" aria-label=\"所持資源\"><span title=\"所持 木材\">木材 <b data-resource=\"wood\">0</b></span><span title=\"所持 鉄鉱石\">鉱石 <b data-resource=\"ore\">0</b></span><span title=\"所持 鉄の延べ棒\">延べ棒 <b data-resource=\"ingot\">0</b></span><span title=\"所持 精製魔晶原石\">原石 <b data-resource=\"rawCrystal\">0</b></span><span title=\"所持 精製魔晶\">魔晶 <b data-resource=\"crystal\">0</b></span><span title=\"所持 魔導剣\">魔導剣 <b data-resource=\"sword\">0</b></span><span>魔力 <b id=\"power-count\">0 / 0</b></span></div><button data-action=\"technology-open\" class=\"technology-open\">技術ツリー</button>\n        <div class=\"time-controls\" aria-label=\"時間速度\"><button data-speed=\"0\" aria-label=\"一時停止\" title=\"一時停止（Space）\">Ⅱ</button><button data-speed=\"1\" aria-label=\"1倍速\">1×</button><button data-speed=\"2\" aria-label=\"2倍速\">2×</button></div>\n        <details class=\"game-menu\"><summary aria-label=\"操作と保存メニュー\">☰ <span>メニュー</span></summary><div class=\"menu-body\"><button data-action=\"menu-close\" class=\"menu-close\">メニューを閉じる ×</button><div class=\"menu-actions\"><button data-action=\"save\">保存</button><button data-action=\"load\">読込</button><button data-action=\"camera\">視点を戻す</button><button data-action=\"new\">新しい工房</button><button data-action=\"gather-wood\" title=\"森林から木材1個を手採取。生産実績には算入しません。\">木材を手採取</button><button data-action=\"guide-open\">はじめての案内</button><button data-action=\"build-open\">建設一覧を表示</button><button data-action=\"selection-open\">設備詳細を表示</button><button data-action=\"help-close\">操作説明を閉じる</button></div><details id=\"main-help\"><summary>操作方法・つくり方</summary><div class=\"help-text\"><p>鉱脈に採掘機 → ベルト → 魔導炉 → ベルト → 納品箱をつなごう。魔力炉と機械は魔力導線で接続。魔力炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 魔導炉 (14,16) → ベルト (15,16) → 納品箱 (16,16)。全て東向き。<br>魔力炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>左クリック: 配置 / 選択<br>ベルト選択中に左ドラッグ: 連続敷設<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去、Esc: 建設取消<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>納品箱は鉄の延べ棒と魔導剣を受け入れます。採掘から加工・搬送まで自動でつないだ品だけを実績へ数えます。手で取り出し・再投入した品は算入しません。魔力切れは木材の手動補給で復旧できます。木材が0なら、メニューの「木材を手採取」で1個ずつ採れます。保存はこのブラウザの1スロットです。</p><button data-action=\"help-close\">操作説明を閉じる ×</button></div></details></div></details>\n      </header>\n      <button id=\"tracked-goal\" class=\"tracked-goal\" data-action=\"technology-open\" hidden></button>\n      <section id=\"technology-panel\" class=\"technology-panel\" hidden aria-label=\"技術ツリー\">\n        <div class=\"technology-heading\"><div><h2>技術ツリー</h2><p>自動生産の実績で解放。研究に素材の支払いは不要です。</p></div><button data-action=\"technology-close\">閉じる ×</button></div>\n        <p class=\"technology-path\">基礎工房 → 物流 ＋ 魔晶 → 組立 → 工房の達人 → 刻印 → ゴーレム → 自律工房</p><p id=\"sword-rate\"></p>\n        <div class=\"technology-map\"></div><p class=\"future-tech\">自律工房: ゴーレムが収納箱から木材を取り、魔力炉へ20回自動補給します。</p>\n      </section>\n      <aside id=\"guide-card\" class=\"guide-card\" hidden aria-label=\"はじめての工房づくり\">\n        <div class=\"guide-heading\"><span id=\"guide-objective\">鉄100本を自動納品しよう</span><button data-action=\"guide-close\" aria-label=\"案内を閉じる\">案内を閉じる</button></div>\n        <div id=\"guide-progress\" class=\"guide-progress\"></div><h2 id=\"guide-title\"></h2><button data-action=\"guide-action\" class=\"guide-action\">この設備を選ぶ</button><p id=\"guide-text\"></p>\n        <p id=\"guide-step-target\" class=\"guide-target\"></p><p id=\"guide-instruction\"></p>\n        <ul id=\"guide-blockers\" class=\"guide-blockers\"></ul><details id=\"guide-check-details\"><summary id=\"guide-check-summary\">組立チェック</summary><ul id=\"guide-checks\" class=\"guide-checks\"></ul></details><p id=\"guide-feedback\" class=\"guide-feedback\" role=\"status\" aria-live=\"polite\" hidden></p><small class=\"guide-next\">条件を満たすと、次の案内へ進みます。</small>\n      </aside>\n      <div class=\"workshop-notices\"><p id=\"game-message\" role=\"status\" aria-live=\"polite\">鉱脈に採掘機を建て、工房を動かそう。</p><p id=\"victory-message\" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>\n      <aside id=\"selection-panel\" class=\"selection-panel\" hidden aria-label=\"設備の詳細\">\n        <button class=\"panel-close\" data-action=\"close-panel\" aria-label=\"設備詳細を閉じる\">×</button><h2 id=\"selection-title\"></h2><p id=\"selection-description\"></p>\n        <div id=\"facility-feed-slots\" class=\"facility-feed-slots\"></div><div id=\"relay-controls\" hidden><p id=\"relay-worker\"></p><div class=\"relay-policies\"><button data-relay-policy=\"fuel\">♣ 燃料補給</button><button data-relay-policy=\"materials\">◇ 材料補給</button></div><p id=\"relay-transfers\"></p><small>収納箱と補給先は半径6区画。燃料補給20回で自律工房の実績を達成。</small></div><div id=\"delivery-summary\" hidden></div><div id=\"recipe-controls\" hidden><label>生産レシピ<select id=\"recipe-select\"></select></label><p id=\"recipe-lock-reason\"></p></div><div id=\"storage-controls\" hidden><p id=\"storage-capacity\"></p><div class=\"transfer-toolbar\"><span>移動する個数</span><button data-transfer-mode=\"one\" aria-pressed=\"true\">1個</button><button data-transfer-mode=\"all\" aria-pressed=\"false\">全量</button></div><div class=\"chest-transfer\"><section><h3>手持ち <span>→</span></h3><div id=\"inventory-slots\" class=\"item-slots\"></div><button data-action=\"deposit-all\">まとめて預ける</button></section><section><h3>収納箱 <span>←</span></h3><div id=\"chest-slots\" class=\"item-slots\"></div><button data-action=\"withdraw-all\">まとめて取り出す</button></section></div><p class=\"transfer-hint\">クリックで1個、Shift＋クリックで全量。キーボードのEnterでも移動できます。取り出した品は手動扱いになります。</p><details id=\"advanced-collect\"><summary>品目と個数を指定</summary><ul id=\"storage-items\"></ul><label>取り出す品<select id=\"collect-resource\"></select></label><label>個数<input id=\"collect-amount\" type=\"number\" min=\"1\" max=\"32\" value=\"1\" step=\"1\"></label><button data-action=\"collect-count\">選んだ品を取り出す</button></details></div><dl><div><dt>稼働状態</dt><dd id=\"selection-status\"></dd></div><div><dt>入出力・方向</dt><dd id=\"selection-direction\"></dd></div><div><dt>内部の資源</dt><dd id=\"selection-buffer\"></dd></div><div><dt>作業進捗</dt><dd id=\"selection-progress\"></dd></div><div><dt>蓄積魔力</dt><dd id=\"selection-power\"></dd></div></dl>\n        <div class=\"selection-actions\"><button data-action=\"rotate\">回転 R</button><button data-action=\"collect\">資源を回収</button><button data-action=\"remove\" class=\"danger\">撤去</button></div>\n        <details id=\"advanced-feed\"><summary>個数を指定して補給</summary><form id=\"feed-form\"><label>手動補給<select id=\"feed-resource\"><option value=\"wood\">木材</option><option value=\"ore\">鉄鉱石</option><option value=\"ingot\">鉄の延べ棒</option><option value=\"rawCrystal\">魔晶原石</option><option value=\"crystal\">精製魔晶</option><option value=\"sword\">魔導剣</option></select></label><label>個数<input id=\"feed-amount\" type=\"number\" min=\"1\" max=\"1000\" step=\"1\" value=\"1\" inputmode=\"numeric\"></label><button type=\"submit\" data-action=\"feed\">補給する</button><small>手動の鉱石・延べ棒・精製魔晶等は目標に含めません。木材燃料は手動補給できます。</small></form></details>\n      </aside>\n      <nav id=\"quickbar\" class=\"quickbar\" aria-label=\"登録した建設設備\"><button id=\"build-reopen\" data-action=\"build-open\">建設一覧</button><div id=\"quick-slots\"></div><button data-action=\"rotate\" aria-label=\"建設方向を回転\">↻</button><button data-action=\"cancel\" aria-label=\"建設を取り消す\">×</button></nav>\n      <footer class=\"build-dock\" hidden><div class=\"build-context\"><span id=\"build-context\">建設する設備を選ぶ</span><button data-action=\"rotate\" aria-label=\"建設方向を回転\">↻ R</button><button data-action=\"cancel\">取消 Esc</button><button data-action=\"build-close\" aria-label=\"建設一覧を閉じる\">閉じる ×</button></div><nav id=\"build-categories\" aria-label=\"設備のカテゴリー\"></nav><p class=\"registration-hint\">☆で選んだ番号に登録 <select id=\"registration-slot\" aria-label=\"登録先クイックスロット\"></select> · キー1〜6で選択</p><nav class=\"build-palette\" aria-label=\"建設する設備\"></nav></footer>";
		let n = this.node(".build-palette");
		for (let e of pe) {
			let t = r[e], i = document.createElement("button");
			i.type = "button", i.dataset.build = e, i.setAttribute("aria-pressed", "false");
			let a = this.costLabel(e);
			i.title = `${t.label} — ${z[e]} 建設費: ${a}`;
			let o = document.createElement("span");
			o.className = "build-icon", o.textContent = me[e], o.setAttribute("aria-hidden", "true");
			let s = document.createElement("span");
			s.className = "build-name", s.textContent = t.label;
			let c = document.createElement("small");
			c.className = "build-cost", c.textContent = a, i.append(o, s, c);
			let l = document.createElement("div");
			l.className = "build-tile", l.dataset.buildTile = e;
			let u = document.createElement("button");
			u.type = "button", u.className = "register-build", u.dataset.register = e, u.textContent = "☆", u.setAttribute("aria-label", `${t.label}をクイックスロットへ登録`), l.append(i, u), n.append(l), this.buildButtons.set(e, i);
		}
		let i = this.node(".resource-strip"), a = this.node("#power-count").parentElement;
		i.replaceChildren();
		for (let e of I) {
			let t = document.createElement("span");
			t.title = `所持 ${F[e]}`;
			let n = e === "ingot" ? "延べ棒" : e === "rawCrystal" ? "原石" : e === "crystal" ? "魔晶" : F[e];
			t.append(document.createTextNode(n + " "));
			let r = document.createElement("b");
			r.dataset.resource = e, r.textContent = "0", t.append(r), i.append(t);
		}
		i.append(a);
		for (let e of I) this.resourceNodes.set(e, this.node(`[data-resource="${e}"]`));
		this.createTechnologyNodes(), this.createPresentationControls(), this.node("#feed-resource").replaceChildren();
		for (let e of I) {
			let t = document.createElement("option");
			t.value = e, t.textContent = F[e], this.node("#feed-resource").append(t);
		}
		for (let e of I) {
			let t = document.createElement("option");
			t.value = e, t.textContent = F[e], this.node("#collect-resource").append(t);
		}
		e.querySelectorAll("[data-speed]").forEach((e) => this.speedButtons.set(Number(e.dataset.speed), e)), _e(this, e, this.controller.signal);
	}
	node(e) {
		let t = this.root.querySelector(e);
		if (!t) throw Error(`UI要素がありません: ${e}`);
		return t;
	}
	text(e, t) {
		let n = this.node(e);
		n.textContent !== t && (n.textContent = t);
	}
	costLabel(e) {
		let t = Object.entries(r[e].cost).map(([e, t]) => `${F[e]}${t}`);
		return t.length ? t.join("・") : "無料";
	}
	handleClick(e) {
		let t = e.target.closest("button");
		if (!t || !this.root.contains(t)) return;
		if (t.dataset.quick) {
			this.chooseQuickSlot(Number(t.dataset.quick));
			return;
		}
		if (t.dataset.register) {
			this.quickSlots[this.registerSlot] = t.dataset.register, this.savePreferences(), this.refreshQuickSlots();
			return;
		}
		if (t.dataset.category) {
			this.category = t.dataset.category, this.savePreferences(), this.filterPalette();
			return;
		}
		if (t.dataset.transferMode) {
			this.transferMode = t.dataset.transferMode, this.savePreferences(), this.refreshTransferMode();
			return;
		}
		if (t.dataset.transfer) {
			this.transferItem(t.dataset.resource, t.dataset.transfer === "deposit", e instanceof MouseEvent && e.shiftKey);
			return;
		}
		if (t.dataset.feedResource) {
			this.feedOne(t.dataset.feedResource);
			return;
		}
		if (t.dataset.relayPolicy) {
			this.callbacks.onRelayPolicy(t.dataset.relayPolicy);
			return;
		}
		if (t.dataset.research) {
			this.callbacks.onResearch(t.dataset.research);
			return;
		}
		if (t.dataset.track) {
			this.callbacks.onTrack(t.dataset.track === this.tracked ? null : t.dataset.track);
			return;
		}
		if (t.dataset.build) {
			this.node(".build-dock").hidden = !0, this.callbacks.onBuild(t.dataset.build);
			return;
		}
		if (t.dataset.speed) {
			this.callbacks.onSpeed(Number(t.dataset.speed));
			return;
		}
		let n = t.dataset.action;
		if (n === "save") this.callbacks.onSave();
		else if (n === "load") this.callbacks.onLoad();
		else if (n === "new") this.callbacks.onNew();
		else if (n === "technology-open" || n === "technology-close") this.callbacks.onTechnologyToggle(n === "technology-open"), this.node(".game-menu").open = !1;
		else if (n === "gather-wood") this.callbacks.onGatherWood();
		else if (n === "menu-close") this.node(".game-menu").open = !1;
		else if (n === "help-close") this.node("#main-help").open = !1;
		else if (n === "build-open" || n === "build-close") this.node(".build-dock").hidden = n === "build-close", this.node("#build-reopen").setAttribute("aria-expanded", String(n === "build-open")), n === "build-close" && this.callbacks.onCancel();
		else if (n === "selection-open") {
			let e = this.node("#selection-panel");
			if (this.lastSelected !== null) {
				e.hidden = !1, e.classList.remove("is-collapsed");
				let t = this.node("[data-action=\"close-panel\"]");
				t.textContent = "×", t.setAttribute("aria-label", "設備詳細を閉じる");
			}
		} else if (n === "deposit-all") this.depositAll();
		else if (n === "withdraw-all") this.callbacks.onCollect();
		else if (n === "collect-count") {
			let e = this.node("#collect-resource").value, t = Number(this.node("#collect-amount").value);
			Number.isSafeInteger(t) && t > 0 && t <= 32 && this.callbacks.onCollect(e, t);
		} else if (n === "camera") this.callbacks.onResetCamera();
		else if (n === "rotate") this.callbacks.onRotate();
		else if (n === "remove") this.callbacks.onRemove();
		else if (n === "collect") this.callbacks.onCollect();
		else if (n === "cancel") this.callbacks.onCancel();
		else if (n === "guide-action") {
			let e = this.node("#guide-card").dataset.guideMode;
			if (e === "rotate" || e === "feed") {
				this.node("#selection-panel").classList.remove("is-collapsed");
				let e = this.node("[data-action=\"close-panel\"]");
				e.textContent = "×", e.setAttribute("aria-label", "設備詳細を閉じる");
			}
			this.callbacks.onGuideAction();
		} else if (n === "guide-open" || n === "guide-close") this.callbacks.onGuideToggle(n === "guide-open"), n === "guide-open" && (this.node(".game-menu").open = !1);
		else if (n === "close-panel") {
			let e = this.node("#selection-panel").classList.toggle("is-collapsed");
			t.textContent = e ? "+" : "×", t.setAttribute("aria-label", e ? "設備詳細を開く" : "設備詳細を閉じる"), this.root.classList.toggle("expanded-selection", !e);
		}
	}
	handleFeed(e) {
		e.preventDefault();
		let t = this.node("#feed-resource").value, n = Number(this.node("#feed-amount").value);
		Number.isSafeInteger(n) && n > 0 && n <= 1e3 && this.callbacks.onFeed(t, n);
	}
	updateGuide(e) {
		let t = this.node("#guide-card");
		if (t.hidden = !e, this.root.classList.toggle("guide-open", !!e), this.node("#game-message").hidden = !!e, !e) return;
		t.dataset.guideId = e.id, t.dataset.guideMode = e.mode, this.text("#guide-progress", `${e.step} / ${e.total} · はじめての工房づくり`), this.text("#guide-title", e.title), this.text("#guide-text", e.text);
		let n = [
			e.kind ? r[e.kind].label : "",
			e.direction === null ? "" : `出力 ${R[e.direction]}`,
			e.target ? `目印 (${e.target.x}, ${e.target.z})` : ""
		].filter(Boolean).join(" · ");
		this.text("#guide-step-target", n), this.node("#guide-step-target").hidden = !n, this.text("[data-action=\"guide-action\"]", {
			build: "この設備を選ぶ",
			rotate: "設備の詳細を開く",
			feed: "設備の詳細を開く",
			run: "1×で動かす",
			done: "自由建設へ"
		}[e.mode]);
		let i = {
			build: e.target ? "「この設備を選ぶ」を押し、地図の光る目印をクリック。設備は自分で置きます。" : "「この設備を選ぶ」を押し、つなぎたい区画をクリックしてください。",
			rotate: "「設備の詳細を開く」→「回転 R」で向きを変更してください。",
			feed: "「設備の詳細を開く」→木材のアイコン「木材 ×1」を押すと、燃料を1個補給できます。",
			run: "「1×で動かす」を押して、採掘・搬送・精錬が進むのを見てみましょう。",
			done: "「自由建設へ」で案内を閉じられます。メニューからいつでも再表示できます。"
		};
		this.text("#guide-instruction", i[e.mode]), this.node("#guide-check-details").hidden = !e.checks.length, this.text("#guide-check-summary", `済 ${e.checks.length}段階 · 直近の組立チェック`), this.node(".guide-next").hidden = e.mode === "done";
		let a = JSON.stringify([e.blockers, e.checks]);
		if (a !== this.guideLists) {
			for (let [t, n, r] of [[
				"#guide-blockers",
				e.blockers,
				"確認: "
			], [
				"#guide-checks",
				e.checks.slice(-2),
				"✓ "
			]]) {
				let e = this.node(t);
				e.replaceChildren(), e.hidden = !n.length;
				for (let t of n) {
					let n = document.createElement("li");
					n.textContent = r + t, e.append(n);
				}
			}
			this.guideLists = a;
		}
	}
	update(e, t) {
		this.currentState = e, this.currentSelected = e.buildings.find((e) => e.id === t.selectedId) ?? null;
		let n = P(e);
		this.text("#objective-title", n.title), this.text("#objective-count", `${n.current} / ${n.target}`), this.text("#guide-objective", n.title), this.node("#objective-summary").title = n.detail, this.updateQuickSlots(e, t.kind), this.updateGuide(t.guide ?? null), this.updateTechnology(e, !!t.technologyOpen);
		let i = !!t.guide && /保存|読込|読み込|再開しました|WebGL|表示でき|できません|不正|素材を補給しました|手採取/.test(t.message);
		this.node("#guide-feedback").hidden = !i, i && this.text("#guide-feedback", t.message);
		for (let t of I) {
			let n = this.resourceNodes.get(t), r = String(e.inventory[t] ?? 0);
			n.textContent !== r && (n.textContent = r), n.parentElement.hidden = !(e.inventory[t] ?? 0) && ![
				"wood",
				"ore",
				"ingot"
			].includes(t);
		}
		this.text("#power-count", `${Math.floor(t.power.stored)} / ${t.power.capacity}`), this.text("#delivered-count", String(e.delivered)), this.node("#victory-message").hidden = !n.completed, n.completed && this.text("#victory-message", `${n.title} — ${n.detail}`), t.message && t.message !== this.lastMessage && (this.text("#game-message", t.message), this.lastMessage = t.message);
		for (let [e, n] of this.speedButtons) n.setAttribute("aria-pressed", String(e === t.speed));
		for (let [n, i] of this.buildButtons) {
			i.setAttribute("aria-pressed", String(n === t.kind));
			let a = e.kits[n] ?? 0, o = i.querySelector(".build-cost"), s = a > 0 ? `所持 ${a}台 / ${this.costLabel(n)}` : this.costLabel(n);
			o.textContent !== s && (o.textContent = s);
			let c = a > 0 || Object.entries(r[n].cost).every(([t, n]) => (e.inventory[t] ?? 0) >= n), l = x(e, n);
			i.classList.toggle("unaffordable", !c), i.classList.toggle("tech-locked", !l);
			let u = r[n].technology;
			i.title = `${z[n]} 建設費: ${this.costLabel(n)}${!l && u ? ` · 未解放: ${L[u]}の研究が必要。技術ツリーで条件を確認。` : ""}`, !l && u && (o.textContent = `未解放 · ${L[u]}`), i.setAttribute("aria-label", `${r[n].label}、${s}${l ? "" : "、技術未解放"}${c ? "" : "、資源不足"}`);
		}
		this.text("#build-context", `${t.kind ? `${r[t.kind].label} · 出力 ${R[t.direction]}` : "設備を選んで建設"}${t.hover ? ` · (${t.hover.x}, ${t.hover.z})` : ""}`);
		let a = e.buildings.find((e) => e.id === t.selectedId), o = this.node("#selection-panel");
		if (this.root.classList.toggle("has-selection", !!a), !a) o.hidden = !0;
		else {
			if (t.selectedId !== this.lastSelected) {
				o.hidden = !1, o.classList.remove("is-collapsed");
				let e = this.node("[data-action=\"close-panel\"]");
				e.textContent = "×", e.setAttribute("aria-label", "設備詳細を閉じる");
				let t = this.node("#feed-resource");
				this.node("#advanced-feed").open = a.kind === "generator", t.value = a.kind === "generator" ? "wood" : a.kind === "smelter" ? "ore" : a.kind === "crystalRefiner" ? "rawCrystal" : a.kind === "golemRelay" ? "golem" : "ingot";
			}
			this.text("#selection-title", `${r[a.kind].label} (${a.x}, ${a.z})`), this.text("#selection-description", z[a.kind]), this.text("#selection-status", a.status || (a.working ? "稼働中" : "待機中")), this.text("#selection-direction", a.kind === "generator" ? "木材は隣接から · 魔力は導線網" : a.kind === "wire" ? "直交接続（方向なし）" : a.kind === "golemRelay" ? "半径6区画（方向なし）" : a.kind === "delivery" ? "全隣接から受け入れ（出力なし）" : `${R[a.direction]}${a.kind === "splitter" ? ` / 右側 ${R[(a.direction + 1) % 4]}` : ""} · 入力は隣接から`);
			let n = Object.fromEntries(I.map((e) => [e, 0]));
			[
				...a.input,
				...a.output,
				...a.reserved ?? [],
				...a.item ? [a.item] : []
			].forEach((e) => n[e.resource]++), this.text("#selection-buffer", Object.entries(n).filter(([, e]) => e > 0).map(([e, t]) => `${F[e]} ${t}`).join("、") || "なし"), this.updateSelectedSystems(e, a), this.text("#selection-progress", a.kind === "belt" || a.kind === "splitter" ? `${Math.round(a.beltProgress / l * 100)}%` : `${a.progress.toFixed(1)}秒${r[a.kind].seconds ? ` / ${r[a.kind].seconds}秒` : ""}`), this.text("#selection-power", `${Math.floor(a.energy)}${a.pendingEnergy ? ` · 内部完成 ${a.pendingEnergy}` : ""}`), this.node("#advanced-feed").hidden = ![
				"generator",
				"smelter",
				"delivery",
				"storage",
				"splitter",
				"belt",
				"crystalRefiner",
				"assembler",
				"runeCarver",
				"frameForge",
				"golemForge",
				"golemRelay"
			].includes(a.kind);
		}
		if (a && t.guide && (this.previousGuideMode === "feed" || this.previousGuideMode === "rotate") && t.guide.mode !== "feed" && t.guide.mode !== "rotate") {
			o.classList.add("is-collapsed");
			let e = this.node("[data-action=\"close-panel\"]");
			e.textContent = "+", e.setAttribute("aria-label", "設備詳細を開く");
		}
		this.root.classList.toggle("expanded-selection", !!a && !o.hidden && !o.classList.contains("is-collapsed")), this.previousGuideMode = t.guide?.mode ?? null, this.lastSelected = t.selectedId;
	}
	loadPreferences() {
		try {
			let e = JSON.parse(localStorage.getItem(he) ?? "null");
			if (!e || e.version !== 1) return;
			Array.isArray(e.quickSlots) && e.quickSlots.length === 6 && e.quickSlots.every((e) => pe.includes(e)) && (this.quickSlots = [...e.quickSlots]), typeof e.category == "string" && Object.hasOwn(B, e.category) && (this.category = e.category), (e.transferMode === "one" || e.transferMode === "all") && (this.transferMode = e.transferMode);
		} catch {}
	}
	savePreferences() {
		try {
			localStorage.setItem(he, JSON.stringify({
				version: 1,
				quickSlots: this.quickSlots,
				category: this.category,
				transferMode: this.transferMode
			}));
		} catch {}
	}
	createPresentationControls() {
		for (let [e, t] of Object.entries(B)) {
			let n = document.createElement("button");
			n.type = "button", n.dataset.category = e, n.textContent = t.label, this.node("#build-categories").append(n);
		}
		for (let e = 0; e < 6; e++) {
			let t = document.createElement("option");
			t.value = String(e), t.textContent = String(e + 1), this.node("#registration-slot").append(t);
		}
		this.refreshQuickSlots(), this.filterPalette(), this.refreshTransferMode();
		for (let e of I) {
			let t = document.createElement("button");
			t.type = "button", t.dataset.feedResource = e, t.innerHTML = `${M(e)}<span></span>`, t.querySelector("span").textContent = `${F[e]} ×1`, this.node("#facility-feed-slots").append(t);
			let n = document.createElement("span");
			n.className = "hud-resource-icon", n.innerHTML = M(e), this.resourceNodes.get(e).parentElement.prepend(n);
			for (let t of ["deposit", "withdraw"]) {
				let n = document.createElement("button");
				n.type = "button", n.className = "item-slot", n.dataset.transfer = t, n.dataset.resource = e, n.innerHTML = `${M(e)}<span class="slot-name"></span><b class="slot-count">0</b><small class="slot-origin"></small>`, n.querySelector(".slot-name").textContent = F[e], this.node(t === "deposit" ? "#inventory-slots" : "#chest-slots").append(n), this.transferButtons.set(`${t}:${e}`, n);
			}
		}
	}
	refreshQuickSlots() {
		let e = this.node("#quick-slots");
		e.replaceChildren(), this.quickSlots.forEach((t, n) => {
			let i = document.createElement("button");
			i.type = "button", i.dataset.quick = String(n), i.className = "quick-slot", i.innerHTML = `<small>${n + 1}</small><span class="quick-icon" aria-hidden="true">${me[t]}</span><span class="quick-name"></span><span class="quick-lock" hidden>🔒</span><span class="quick-cost"></span>`, i.querySelector(".quick-name").textContent = r[t].label, i.setAttribute("aria-label", `${n + 1}: ${r[t].label}`), e.append(i);
		});
	}
	updateQuickSlots(e, t) {
		this.node("#quick-slots").querySelectorAll("button").forEach((n) => {
			let i = this.quickSlots[Number(n.dataset.quick)], a = x(e, i);
			n.querySelector(".quick-lock").hidden = a, n.querySelector(".quick-cost").textContent = (e.kits[i] ?? 0) > 0 ? `所持 ${e.kits[i]}` : this.costLabel(i);
			let o = (e.kits[i] ?? 0) > 0 || Object.entries(r[i].cost).every(([t, n]) => (e.inventory[t] ?? 0) >= n);
			n.classList.toggle("unaffordable", !o), n.classList.toggle("tech-locked", !a), n.setAttribute("aria-pressed", String(i === t)), n.title = `${r[i].label} · ${this.costLabel(i)}${a ? "" : ` · 未解放: ${L[r[i].technology]}`}`;
		});
	}
	filterPalette() {
		this.node("#build-categories").querySelectorAll("button").forEach((e) => e.setAttribute("aria-pressed", String(e.dataset.category === this.category))), this.node(".build-palette").querySelectorAll("[data-build-tile]").forEach((e) => {
			e.hidden = !B[this.category].kinds.includes(e.dataset.buildTile);
		});
	}
	registrationChange() {
		this.registerSlot = Number(this.node("#registration-slot").value);
	}
	chooseQuickSlot(e) {
		!Number.isInteger(e) || e < 0 || e >= this.quickSlots.length || (this.node(".build-dock").hidden = !0, this.node("#technology-panel").hidden || this.callbacks.onTechnologyToggle(!1), this.callbacks.onBuild(this.quickSlots[e]));
	}
	isWorldInputBlocked() {
		return !this.node(".build-dock").hidden || !this.node("#technology-panel").hidden;
	}
	closeOverlay() {
		if (!this.node("#technology-panel").hidden) return this.callbacks.onTechnologyToggle(!1), !0;
		if (!this.node(".build-dock").hidden) return this.node(".build-dock").hidden = !0, this.callbacks.onCancel(), !0;
		let e = this.node("#selection-panel");
		if (!e.hidden && !e.classList.contains("is-collapsed")) {
			e.classList.add("is-collapsed"), this.root.classList.remove("expanded-selection");
			let t = this.node("[data-action=\"close-panel\"]");
			return t.textContent = "+", t.setAttribute("aria-label", "設備詳細を開く"), !0;
		}
		return !1;
	}
	refreshTransferMode() {
		this.node("#storage-controls").querySelectorAll("[data-transfer-mode]").forEach((e) => e.setAttribute("aria-pressed", String(e.dataset.transferMode === this.transferMode)));
	}
	transferItem(e, t, n) {
		let r = this.currentSelected, i = this.currentState;
		if (!i || !r || r.kind !== "storage") return;
		let a = t ? i.inventory[e] ?? 0 : r.input.filter((t) => t.resource === e).length, o = t ? Math.max(0, 32 - r.input.length) : a, s = Math.min(a, o, n || this.transferMode === "all" ? a : 1);
		s <= 0 || (t ? this.callbacks.onFeed(e, s) : this.callbacks.onCollect(e, s));
	}
	feedOne(e) {
		let t = this.currentSelected, n = this.currentState;
		!t || !n || (n.inventory[e] ?? 0) < 1 || this.callbacks.onFeed(e, 1);
	}
	depositAll() {
		for (let e of I) this.transferItem(e, !0, !0);
	}
	updateChestSlots(e, t) {
		for (let n of I) {
			let r = t.input.filter((e) => e.resource === n), i = r.filter((e) => e.automated && !e.handled).length;
			for (let a of ["deposit", "withdraw"]) {
				let o = this.transferButtons.get(`${a}:${n}`), s = a === "deposit" ? e.inventory[n] ?? 0 : r.length, c = a === "deposit" ? "収納箱へ預ける" : "手持ちへ取り出す", l = o.querySelector(".slot-count");
				l.textContent !== String(s) && (l.textContent = String(s));
				let u = a === "withdraw" ? `自動${i} / 手動${r.length - i}` : "手持ち", d = o.querySelector(".slot-origin");
				d.textContent !== u && (d.textContent = u), o.disabled = s === 0 || a === "deposit" && t.input.length >= 32, o.title = `${F[n]} ${s}個 · ${c} · ${u}。Shiftで全量。取り出した品は手動扱いとなり自動納品に算入しません。`, o.setAttribute("aria-label", `${F[n]} ${s}個を${c}。${u}`);
			}
		}
		this.node("[data-action=\"deposit-all\"]").disabled = t.input.length >= 32 || I.every((t) => !(e.inventory[t] ?? 0)), this.node("[data-action=\"withdraw-all\"]").disabled = t.input.length === 0;
	}
	createTechnologyNodes() {
		for (let e of fe) {
			let t = document.createElement("article");
			t.className = "technology-node", t.dataset.tech = e, t.innerHTML = `<div class="tech-node-heading"><h3></h3><span class="tech-status"></span></div><p class="tech-description"></p><p class="tech-prerequisites"></p><ul class="tech-requirements"></ul><p class="tech-unlocks"></p><p class="tech-reason"></p><div class="tech-actions"><button data-research="${e}">研究する</button><button data-track="${e}">追跡する</button></div>`, this.node(".technology-map").append(t), this.technologyNodes.set(e, t);
		}
	}
	updateTechnology(e, t) {
		this.node("#technology-panel").hidden = !t, this.root.classList.toggle("technology-open", t), this.tracked = e.research?.tracked ?? null;
		let n = b(e), a = n.filter((e) => e.status === "available").length;
		this.text("[data-action=\"technology-open\"].technology-open", `技術ツリー${a ? ` (${a})` : ""}`);
		let o = {
			unlocked: "解放済み",
			available: "研究可能",
			locked: "未解放"
		};
		for (let e of n) {
			let t = this.technologyNodes.get(e.id);
			t.dataset.techStatus = e.status;
			let a = (e, n) => {
				let r = t.querySelector(e);
				r.textContent !== n && (r.textContent = n);
			};
			a("h3", e.label), a(".tech-status", o[e.status]), a(".tech-description", e.description), a(".tech-prerequisites", `前提: ${e.prerequisites.map((e) => n.find((t) => t.id === e)?.label ?? L[e]).join(" ＋ ") || "なし（最初から利用可）"}`), a(".tech-unlocks", `解放: ${[...e.unlocks.kinds.map((e) => r[e].label), ...e.unlocks.recipes.map((e) => `${i[e].label}レシピ`)].join("・") || (e.id === "sanctuary" ? "ゴーレム工房の自動運営を達成" : "魔導剣の連続生産達成・ゴーレム製造へ")}`), a(".tech-reason", e.reason);
			let s = t.querySelector(".tech-requirements"), c = e.requirements.map((e) => `${e.met ? "✓" : "○"} ${e.label} ${e.current} / ${e.target}`).join("\n");
			if (s.dataset.value !== c) {
				s.dataset.value = c, s.replaceChildren();
				for (let e of c.split("\n").filter(Boolean)) {
					let t = document.createElement("li");
					t.textContent = e, s.append(t);
				}
			}
			let l = t.querySelector("[data-research]");
			l.disabled = e.status !== "available", l.title = e.reason, l.textContent = e.status === "unlocked" ? "解放済み" : e.status === "available" ? "研究する（実績のみ）" : "条件未達成";
			let u = t.querySelector("[data-track]");
			u.disabled = e.status === "unlocked" && this.tracked !== e.id, u.setAttribute("aria-pressed", String(this.tracked === e.id)), u.textContent = this.tracked === e.id ? "追跡を解除" : "追跡する";
		}
		this.text("#sword-rate", `魔導剣の自動生産: 現在 ${y(e)}本 / 分 · 最高 ${e.stats?.peakSwordRate ?? 0}本 / 分（ゲーム内の直近60秒）`);
		let s = n.find((e) => e.id === this.tracked), c = this.node("#tracked-goal");
		c.hidden = !s, s && this.text("#tracked-goal", `追跡: ${s.label} · ${s.reason} ›`);
	}
	updateSelectedSystems(e, t) {
		let n = t.kind === "storage", a = t.recipe ?? r[t.kind].recipes?.[0], o = t.kind === "golemRelay" ? ["golem"] : t.kind === "delivery" ? ["ingot", "sword"] : Object.keys(a ? i[a].input : r[t.kind].input ?? {});
		if (this.node("#facility-feed-slots").hidden = n || !o.length, this.node("#facility-feed-slots").querySelectorAll("[data-feed-resource]").forEach((n) => {
			let r = n.dataset.feedResource;
			n.hidden = !o.includes(r), n.disabled = !(e.inventory[r] ?? 0) || !A(t, r), n.title = `${F[r]}を1個補給 · 所持 ${e.inventory[r] ?? 0}`;
		}), this.node("#storage-controls").hidden = !n, this.node("#selection-panel").classList.toggle("chest-selected", n), n) {
			this.updateChestSlots(e, t), this.text("#storage-capacity", `収納 ${t.input.length} / 32品 · 空き ${32 - t.input.length}個（納品はしません）`);
			let n = this.node("#storage-items"), r = t.input.map((e) => `${e.resource}:${e.automated}:${!!e.handled}`).join("|");
			if (n.dataset.value !== r) {
				n.dataset.value = r, n.replaceChildren();
				for (let e of I) {
					let r = t.input.filter((t) => t.resource === e);
					if (!r.length) continue;
					let i = r.filter((e) => e.automated && !e.handled).length, a = document.createElement("li");
					a.textContent = `${F[e]} ${r.length} · 自動 ${i} / 手動扱い ${r.length - i}`, a.title = "自動: 自動生産され、手で取り出されていない品。手動扱い: 手動投入または手動で取り出した品。取り出すと全品が手動扱いになります。", n.append(a);
				}
			}
		}
		this.node("#relay-controls").hidden = t.kind !== "golemRelay", t.kind === "golemRelay" && (this.text("#relay-worker", t.golemWorker ? "♟ ゴーレム配置済み" : "♟ ゴーレムの搬入を待っています"), this.text("#relay-transfers", `工房全体の補給 ${e.stats?.golemTransfers ?? 0}回 · 木材 ${e.stats?.golemFuelTransfers ?? 0} / 20回`), this.node("#relay-controls").querySelectorAll("[data-relay-policy]").forEach((e) => e.setAttribute("aria-pressed", String(e.dataset.relayPolicy === (t.golemPolicy ?? "fuel"))))), this.node("#delivery-summary").hidden = t.kind !== "delivery", t.kind === "delivery" && this.text("#delivery-summary", `自動納品（工房全体）: 鉄の延べ棒 ${e.stats?.delivered.ingot ?? e.delivered} / 100本 · 魔導剣 ${e.stats?.delivered.sword ?? 0}本。自動生産・自動搬送し、手で取り出していない品だけ加算します。`);
		let s = r[t.kind].recipes ?? [];
		if (this.node("#recipe-controls").hidden = !s.length, s.length) {
			let n = this.node("#recipe-select"), r = `${t.kind}:${e.research?.unlocked.join(",") ?? "basic"}`;
			if (n.dataset.value !== r) {
				n.dataset.value = r, n.replaceChildren();
				for (let t of s) {
					let r = document.createElement("option");
					r.value = t;
					let a = S(e, t);
					r.textContent = `${i[t].label}${a ? "" : "（未解放）"}`, r.title = a ? "生産レシピを選択" : `${L[i[t].technology]}の研究が必要`, n.append(r);
				}
			}
			n.value = t.recipe ?? s[0];
			let a = i[t.recipe ?? s[0]], o = s.filter((t) => !S(e, t));
			this.text("#recipe-lock-reason", `${Object.entries(a.input).map(([e, t]) => `${F[e]}${t}`).join("＋")} → ${a.label} / ${a.seconds}秒・魔力${a.energy}${o.length ? `。未解放: ${o.map((e) => `${i[e].label}は${L[i[e].technology]}の研究が必要`).join("・")}` : ""}。稼働中・互換性のない在庫がある時は変更できません。`);
		}
	}
	recipeChange() {
		this.callbacks.onRecipe(this.node("#recipe-select").value);
	}
	dispose() {
		this.controller.abort(), this.root.replaceChildren();
	}
};
function _e(e, t, n) {
	t.addEventListener("click", (t) => e.handleClick(t), { signal: n }), t.querySelector("#feed-form").addEventListener("submit", (t) => e.handleFeed(t), { signal: n }), t.querySelector("#registration-slot").addEventListener("change", () => e.registrationChange(), { signal: n }), t.querySelector("#recipe-select").addEventListener("change", () => e.recipeChange(), { signal: n });
	for (let e of [
		"pointerdown",
		"wheel",
		"contextmenu"
	]) t.addEventListener(e, (e) => e.stopPropagation(), { signal: n });
	t.addEventListener("keydown", (e) => {
		(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) && e.stopPropagation();
	}, { signal: n });
}
//#endregion
//#region web/js/fantasy-automation/storage.ts
var ve = Object.keys(r), ye = [
	"wood",
	"ore",
	"ingot"
], be = [
	"miner",
	"belt",
	"smelter",
	"generator",
	"wire",
	"lumber",
	"delivery"
], xe = [
	...ye,
	"rawCrystal",
	"crystal",
	"sword"
], Se = [
	...be,
	"splitter",
	"storage",
	"crystalMiner",
	"crystalRefiner",
	"assembler"
], Ce = [
	"basic",
	"logistics",
	"crystals",
	"assembly",
	"mastery"
], V = (e) => e === 1 ? ye : e === 2 ? xe : a, we = (e) => e === 1 ? be : e === 2 ? Se : ve, Te = [
	"grass",
	"ore",
	"forest",
	"crystal"
], Ee = "aigames-fantasy-automation", H = "saves", U = "workshop", De = [
	"version",
	"seed",
	"tick",
	"nextId",
	"terrain",
	"inventory",
	"kits",
	"buildings",
	"delivered",
	"won"
], Oe = [
	"id",
	"kind",
	"x",
	"z",
	"direction",
	"input",
	"output",
	"progress",
	"working",
	"energy",
	"status",
	"item",
	"beltProgress",
	"pendingEnergy"
];
function W(e, t, n) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`${n}が正しくありません。`);
	let r = e;
	if (Object.keys(r).some((e) => !t.includes(e))) throw Error(`${n}に未対応の項目があります。`);
	return r;
}
function G(e, t, n = 2 ** 53 - 1, r = !0) {
	if (typeof e != "number" || !Number.isFinite(e) || e < 0 || e > n || r && !Number.isSafeInteger(e)) throw Error(`${t}の数値が正しくありません。`);
	return e;
}
function K(e, t) {
	if (typeof e != "boolean") throw Error(`${t}が正しくありません。`);
	return e;
}
function q(e, t = 3) {
	let n = W(e, t === 1 ? ["resource", "automated"] : [
		"resource",
		"automated",
		"handled"
	], "搬送品");
	if (!V(t).includes(n.resource)) throw Error("保存された資源が未対応です。");
	return {
		resource: n.resource,
		automated: K(n.automated, "自動生産フラグ"),
		...Object.hasOwn(n, "handled") ? { handled: K(n.handled, "手動操作フラグ") } : {}
	};
}
function J(e, t, n = 3) {
	if (!Array.isArray(e) || e.length > t) throw Error("設備バッファが正しくありません。");
	return e.map((e) => q(e, n));
}
function ke(e) {
	return e.recipe ? i[e.recipe] : r[e.kind];
}
function Ae(e, t) {
	let n = t === 1, o = W(e, n ? Oe : [
		...Oe,
		"reserved",
		"recipe",
		"splitCursor",
		...t === 3 ? [
			"golemWorker",
			"golemPolicy",
			"golemCooldown",
			"golemRoute"
		] : []
	], "設備");
	if (!we(t).includes(o.kind)) throw Error("保存された設備が未対応です。");
	if (typeof o.status != "string" || o.status.length > 256) throw Error("設備の状態が正しくありません。");
	let s = G(o.id, "設備ID");
	if (s === 0) throw Error("設備IDが正しくありません。");
	let c = o.kind, u = Object.hasOwn(o, "recipe") ? o.recipe : void 0;
	if (u !== void 0 && (!Object.hasOwn(i, u) || !r[c].recipes?.includes(u) || t === 2 && ![
		"ingot",
		"crystal",
		"sword"
	].includes(u))) throw Error("設備のレシピが正しくありません。");
	let d = u ? i[u] : r[c], f = {
		id: s,
		kind: c,
		x: G(o.x, "X座標", 31),
		z: G(o.z, "Z座標", 31),
		direction: G(o.direction, "方向", 3),
		input: J(o.input, c === "storage" ? 32 : 8, t),
		output: J(o.output, 4, t),
		progress: G(o.progress, "作業進捗", d.seconds ?? 0, !1),
		working: K(o.working, "作業フラグ"),
		energy: G(o.energy, "魔力", 30, !1),
		status: o.status,
		item: o.item === null ? null : q(o.item, t),
		beltProgress: G(o.beltProgress, "搬送進捗", l, !1),
		...Object.hasOwn(o, "pendingEnergy") ? { pendingEnergy: G(o.pendingEnergy, "内部完成魔力", 30, !1) } : {},
		...u ? { recipe: u } : {},
		...n ? {} : { reserved: J(o.reserved, 8, t) },
		...Object.hasOwn(o, "splitCursor") ? { splitCursor: G(o.splitCursor, "分配方向", 1) } : {}
	};
	if (Object.hasOwn(o, "golemWorker") && (f.golemWorker = q(o.golemWorker, t)), Object.hasOwn(o, "golemPolicy")) {
		if (o.golemPolicy !== "fuel" && o.golemPolicy !== "materials") throw Error("ゴーレムの補助方針が正しくありません。");
		f.golemPolicy = o.golemPolicy;
	}
	if (Object.hasOwn(o, "golemCooldown") && (f.golemCooldown = G(o.golemCooldown, "ゴーレムの待機時間", 19)), Object.hasOwn(o, "golemRoute")) {
		let e = W(o.golemRoute, [
			"sourceId",
			"targetId",
			"resource",
			"tick"
		], "ゴーレムの搬送記録");
		if (!a.includes(e.resource)) throw Error("ゴーレムの搬送資源が未対応です。");
		let t = G(e.sourceId, "搬送元ID"), n = G(e.targetId, "搬送先ID");
		if (!t || !n || t === n) throw Error("ゴーレムの搬送先が正しくありません。");
		f.golemRoute = {
			sourceId: t,
			targetId: n,
			resource: e.resource,
			tick: G(e.tick, "搬送時刻")
		};
	}
	return je(f, n), f;
}
function je(e, t) {
	let n = ke(e), r = n.input ?? {}, i = e.reserved ?? [];
	if (e.kind === "belt" || e.kind === "splitter") {
		if (e.input.length || e.output.length || i.length || e.progress || e.working || !e.item && e.beltProgress) throw Error("ベルトの搬送状態が正しくありません。");
	} else if (e.item !== null || e.beltProgress !== 0) throw Error("設備に未対応の搬送品があります。");
	if (e.kind !== "splitter" && e.splitCursor !== void 0) throw Error("分配器以外に分配方向があります。");
	if (e.kind === "splitter" && e.splitCursor === void 0) throw Error("分配器に分配方向がありません。");
	if (e.kind !== "generator" && (e.energy !== 0 || e.pendingEnergy !== void 0)) throw Error("魔力を保持できない設備です。");
	if (!e.working && (e.progress !== 0 || i.length)) throw Error("停止中の設備に作業進捗・予約素材があります。");
	if (e.working && (n.seconds === void 0 || ["belt", "splitter"].includes(e.kind))) throw Error("この設備は生産作業できません。");
	if (e.kind !== "golemRelay" && (e.golemWorker !== void 0 || e.golemPolicy !== void 0 || e.golemCooldown !== void 0 || e.golemRoute !== void 0)) throw Error("ゴーレム補助拠点以外に補助状態があります。");
	if (e.kind === "golemRelay") {
		if (e.working || e.progress || i.length || e.output.length || e.input.length > 1 || e.input.some((e) => e.resource !== "golem") || e.golemWorker && e.golemWorker.resource !== "golem" || e.golemPolicy === void 0 || e.golemCooldown === void 0) throw Error("ゴーレム補助拠点の状態が正しくありません。");
		if (e.golemWorker && e.input.length) throw Error("ゴーレムが重複しています。");
		return;
	}
	if (e.kind === "storage") {
		if (e.output.length) throw Error("収納箱の出力バッファが正しくありません。");
		return;
	}
	if (e.input.some((e) => !Object.hasOwn(r, e.resource))) throw Error("設備の入力素材がレシピと一致しません。");
	let a = Object.keys(n.output ?? {});
	if (e.output.some((e) => !a.includes(e.resource))) throw Error("設備の完成品がレシピと一致しません。");
	if (e.working) {
		let n = Object.values(r).reduce((e, t) => e + (t ?? 0), 0), a = t ? e.input.slice(0, n) : i;
		if (a.length !== n) throw Error("稼働中の設備に予約素材がありません。");
		for (let [e, t] of Object.entries(r)) if (a.filter((t) => t.resource === e).length !== t) throw Error("稼働中の設備に予約素材がありません。");
	}
	if ((e.pendingEnergy ?? 0) > 0 && (!e.working || e.progress !== n.seconds)) throw Error("完成魔力の待機状態が正しくありません。");
}
function Me(e, t, n) {
	let r = W(e, V(n), t), i = {};
	for (let e of V(n)) Object.hasOwn(r, e) && (i[e] = G(r[e], t));
	return i;
}
function Ne(e, t, n, r) {
	let i = W(e, [
		"produced",
		"delivered",
		"recentSwordTicks",
		"peakSwordRate",
		...r === 3 ? ["golemFuelTransfers", "golemTransfers"] : []
	], "生産実績"), o = Me(i.produced, "生産数", r), s = Me(i.delivered, "納品数", r);
	if ((s.ingot ?? 0) !== n) throw Error("鉄の延べ棒の納品実績が一致しません。");
	if (a.some((e) => (s[e] ?? 0) > (o[e] ?? 0))) throw Error("納品実績が生産実績を超えています。");
	if (!Array.isArray(i.recentSwordTicks)) throw Error("生産速度の記録が正しくありません。");
	let c = i.recentSwordTicks.map((e) => G(e, "生産時刻", t));
	if (c.some((e, t) => t > 0 && e < c[t - 1]) || c.length > (o.sword ?? 0)) throw Error("生産速度の記録が正しくありません。");
	let l = G(i.peakSwordRate, "最高生産速度");
	if (l > (o.sword ?? 0) || l < c.filter((e) => e > t - 1200).length) throw Error("最高生産速度が正しくありません。");
	let u = {
		produced: o,
		delivered: s,
		recentSwordTicks: c,
		peakSwordRate: l
	};
	if (r === 3 && (u.golemFuelTransfers = G(i.golemFuelTransfers, "木材自動補給数"), u.golemTransfers = G(i.golemTransfers, "ゴーレム搬送数"), u.golemFuelTransfers > u.golemTransfers)) throw Error("木材補給数が総搬送数を超えています。");
	return u;
}
function Pe(e, t) {
	let n = W(e, ["unlocked", "tracked"], "研究状態"), r = t === 2 ? Ce : v.map((e) => e.id);
	if (!Array.isArray(n.unlocked) || n.unlocked.some((e) => !r.includes(e)) || new Set(n.unlocked).size !== n.unlocked.length || !n.unlocked.includes("basic")) throw Error("解放技術が正しくありません。");
	let i = [...n.unlocked];
	if (v.some((e) => i.includes(e.id) && e.prerequisites.some((e) => !i.includes(e)))) throw Error("解放技術の前提が一致しません。");
	if (n.tracked !== null && !r.includes(n.tracked)) throw Error("追跡技術が正しくありません。");
	return {
		unlocked: i,
		tracked: n.tracked
	};
}
function Fe(e, t) {
	let n = t === 1, r = W(e, n ? De : [
		...De,
		"stats",
		"research",
		"inventoryItems",
		"pendingCrystalCells"
	], "保存データ");
	if (r.version !== t) throw Error("この保存形式には対応していません（対応: version 1・2・3）。");
	let i = n ? Te.slice(0, 3) : Te;
	if (!Array.isArray(r.terrain) || r.terrain.length !== 1024 || r.terrain.some((e) => !i.includes(e))) throw Error("保存された地形が正しくありません。");
	let o = V(t), s = W(r.inventory, o, "所持資源"), c = {};
	for (let e of o) c[e] = G(s[e], "所持資源");
	let l = we(t), u = W(r.kits, l, "所持設備"), d = {};
	for (let e of l) Object.hasOwn(u, e) && (d[e] = G(u[e], "所持設備数"));
	if (!Array.isArray(r.buildings) || r.buildings.length > 1024) throw Error("設備一覧が正しくありません。");
	let f = r.buildings.map((e) => Ae(e, t)), p = /* @__PURE__ */ new Set(), m = /* @__PURE__ */ new Set();
	for (let e of f) {
		let t = `${e.x},${e.z}`;
		if (p.has(e.id) || m.has(t)) throw Error("設備IDまたは配置が重複しています。");
		p.add(e.id), m.add(t);
		let n = r.terrain[e.z * 32 + e.x];
		if (e.kind === "miner" && n !== "ore" || e.kind === "lumber" && n !== "forest" || e.kind === "crystalMiner" && n !== "crystal") throw Error("設備と地形が一致していません。");
	}
	let h = G(r.nextId, "次の設備ID");
	if (h < 1 || f.some((e) => e.id >= h)) throw Error("次の設備IDが正しくありません。");
	let g = G(r.delivered, "自動納品数"), _ = K(r.won, "クリアフラグ");
	if (_ !== g >= 100) throw Error("納品数とクリア状態が一致していません。");
	let v = G(r.tick, "経過時間"), y = {
		version: t,
		seed: G(r.seed, "地形シード"),
		tick: v,
		nextId: h,
		terrain: [...r.terrain],
		inventory: c,
		kits: d,
		buildings: f,
		delivered: g,
		won: _
	};
	if (!n) {
		if (Object.hasOwn(r, "pendingCrystalCells")) {
			if (!Array.isArray(r.pendingCrystalCells) || r.pendingCrystalCells.length > 2) throw Error("未発見の結晶鉱脈が正しくありません。");
			let e = r.pendingCrystalCells.map((e) => G(e, "未発見鉱脈の座標", 1023));
			if (new Set(e).size !== e.length || e.some((e) => y.terrain[e] !== "grass" || !m.has(`${e % 32},${Math.floor(e / 32)}`))) throw Error("未発見の結晶鉱脈と設備配置が一致しません。");
			y.pendingCrystalCells = e;
		}
		for (let e of f) if (e.golemRoute && (e.golemRoute.sourceId >= h || e.golemRoute.targetId >= h || e.golemRoute.tick > v)) throw Error("ゴーレムの搬送記録と経過時間が一致しません。");
		if (y.stats = Ne(r.stats, v, g, t), y.research = Pe(r.research, t), y.inventoryItems = J(r.inventoryItems, a.reduce((e, t) => Math.min(2 ** 53 - 1, e + (c[t] ?? 0)), 0), t), y.inventoryItems.some((e) => !e.handled)) throw Error("所持品の手動操作状態が正しくありません。");
		for (let e of a) if (y.inventoryItems.filter((t) => t.resource === e).length > (c[e] ?? 0)) throw Error("所持品と資源数が一致していません。");
		for (let e of f) if (!x(y, e.kind) || e.recipe && !S(y, e.recipe)) throw Error("未解放の設備・レシピが保存されています。");
		for (let e of l) if ((d[e] ?? 0) > 0 && !x(y, e)) throw Error("未解放の所持設備が保存されています。");
	}
	return y;
}
function Ie(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error("保存データが正しくありません。");
	let t = e.version;
	if (t === 1 || t === 2) return Fe(g(Fe(e, t)), 3);
	if (t === 3) return Fe(e, 3);
	throw Error("この保存形式には対応していません（対応: version 1・2・3）。");
}
var Le = class {
	database = null;
	open() {
		return this.database ||= new Promise((e, t) => {
			if (typeof indexedDB > "u") {
				t(/* @__PURE__ */ Error("この環境では保存機能を利用できません。"));
				return;
			}
			let n = indexedDB.open(Ee, 1);
			n.onupgradeneeded = () => {
				n.result.objectStoreNames.contains(H) || n.result.createObjectStore(H);
			}, n.onerror = () => t(/* @__PURE__ */ Error("保存領域を開けませんでした。")), n.onblocked = () => t(/* @__PURE__ */ Error("別のタブを閉じてから保存してください。")), n.onsuccess = () => {
				let t = n.result;
				t.onversionchange = () => {
					t.close(), this.database = null;
				}, e(t);
			};
		}).catch((e) => {
			throw this.database = null, e;
		}), this.database;
	}
	async transaction(e, t) {
		let n = await this.open();
		return new Promise((r, i) => {
			let a = n.transaction(H, e), o = t(a.objectStore(H)), s;
			o.onsuccess = () => {
				s = o.result;
			}, a.oncomplete = () => r(s), a.onerror = () => i(/* @__PURE__ */ Error("保存領域へのアクセスに失敗しました。")), a.onabort = () => i(/* @__PURE__ */ Error("保存処理が中断されました。"));
		});
	}
	async load() {
		let e = await this.transaction("readonly", (e) => e.get(U));
		return e === void 0 ? null : Ie(e);
	}
	async save(e) {
		let t = Ie(e);
		await this.transaction("readwrite", (e) => e.put(t, U));
	}
	async clear() {
		await this.transaction("readwrite", (e) => e.delete(U));
	}
}, Re = class {
	constructor({ step: e, render: t, stepSeconds: n = 1 / 20, maxSteps: r = 8 }) {
		if (typeof e != "function" || typeof t != "function") throw TypeError("step and render must be functions");
		if (!Number.isFinite(n) || n <= 0) throw RangeError("stepSeconds must be finite and positive");
		if (!Number.isSafeInteger(r) || r <= 0 || !Number.isFinite(n * r)) throw RangeError("maxSteps must be a positive safe integer with a finite time budget");
		this.step = e, this.render = t, this.stepSeconds = n, this.maxSteps = r, this.accumulator = 0;
	}
	advance(e) {
		let t = Number.isFinite(e) && e > 0 ? Math.min(e, this.stepSeconds * this.maxSteps) : 0;
		this.accumulator += t;
		let n = Math.min(this.maxSteps, Math.floor(this.accumulator / this.stepSeconds + 1e-9));
		for (let e = 0; e < n; e += 1) this.step(this.stepSeconds);
		this.accumulator = Math.max(0, this.accumulator - n * this.stepSeconds);
		let r = this.accumulator / this.stepSeconds;
		return this.render(r), {
			steps: n,
			alpha: r
		};
	}
	reset() {
		this.accumulator = 0;
	}
}, Y = 14, ze = [
	"generator",
	"wire",
	"miner",
	"smelter"
], X = [
	{
		id: "miner",
		kind: "miner",
		x: 12,
		z: 16,
		direction: 1,
		text: "まずは見本の配置で工房を作ります。鉄鉱脈の光る区画に採掘機を置き、東→の向き（目印の矢印と同じ）へ出力します。"
	},
	{
		id: "belt-ore",
		kind: "belt",
		x: 13,
		z: 16,
		direction: 1,
		text: "採掘機の東隣にベルトを置き、鉄鉱石を次の区画へ運びます。矢印は東へ。"
	},
	{
		id: "smelter",
		kind: "smelter",
		x: 14,
		z: 16,
		direction: 1,
		text: "ベルトの東隣に魔導炉を置きます。鉱石2個から延べ棒1本を作ります。出力は東へ。"
	},
	{
		id: "belt-ingot",
		kind: "belt",
		x: 15,
		z: 16,
		direction: 1,
		text: "魔導炉の東隣にベルトを置きます。完成した延べ棒を東へ運びます。"
	},
	{
		id: "delivery",
		kind: "delivery",
		x: 16,
		z: 16,
		direction: null,
		text: "ベルトの東隣に納品箱を置きます。ここへ届いた自動生産の延べ棒が目標に加算されます。"
	},
	{
		id: "generator",
		kind: "generator",
		x: 12,
		z: 18,
		direction: null,
		text: "採掘機から南へ2区画の場所に魔力炉を置きます。木材を燃料に魔力を作ります。"
	},
	{
		id: "wire-miner",
		kind: "wire",
		x: 12,
		z: 17,
		direction: null,
		text: "魔力炉と採掘機の間に導線を置き、魔力をつなぎます。導線の向きは関係ありません。"
	},
	{
		id: "wire-link",
		kind: "wire",
		x: 13,
		z: 17,
		direction: null,
		text: "導線を東へ延ばします。隣り合う導線と設備が1つの魔力網になります。"
	},
	{
		id: "wire-smelter",
		kind: "wire",
		x: 14,
		z: 17,
		direction: null,
		text: "魔導炉の南隣にも導線を置きます。採掘機と魔導炉の両方に魔力が届く形です。"
	}
], Be = [
	{
		id: "lumber",
		kind: "lumber",
		x: 9,
		z: 18,
		direction: 1,
		text: "森林に木材採取場を置き、矢印を東へ。3秒ごとに木材を作り、燃料補給を自動化します。"
	},
	{
		id: "belt-wood-1",
		kind: "belt",
		x: 10,
		z: 18,
		direction: 1,
		text: "木材採取場の東隣にベルトを置きます。木材を魔力炉へ向けて東へ運びます。"
	},
	{
		id: "belt-wood-2",
		kind: "belt",
		x: 11,
		z: 18,
		direction: 1,
		text: "もう1区画、東向きのベルトを置きます。木材採取場から魔力炉まで連結すれば手動補給が不要になります。"
	}
], Z = (e, t, n) => e.buildings.find((e) => e.x === t && e.z === n), Q = (e, t) => `（${e}, ${t}）`;
function $(e, t, n, r, i, a = {}) {
	return {
		id: t,
		step: e,
		total: Y,
		title: n,
		text: r,
		kind: null,
		target: null,
		direction: null,
		focusId: null,
		mode: "run",
		blockers: [],
		checks: [...i],
		...a
	};
}
function Ve(e, t, n, i) {
	let a = Z(e, t.x, t.z), s = r[t.kind].label;
	if (a?.kind === t.kind && (t.direction === null || a.direction === t.direction)) return null;
	let c = {
		x: t.x,
		z: t.z
	};
	if (a?.kind === t.kind) {
		let e = (t.direction - a.direction + 4) % 4;
		return $(n, t.id, `${s}の出力を東へ向ける`, `${Q(t.x, t.z)}の${s}を選択し、Rを${e}回押してください。東→の向き（目印の矢印と同じ）へ合わせます。`, i, {
			kind: t.kind,
			target: c,
			direction: t.direction,
			focusId: a.id,
			mode: "rotate",
			blockers: ["出力方向が違うため、次の設備へ搬送できません。"]
		});
	}
	let l = [];
	if (a && l.push(`${Q(t.x, t.z)}には${r[a.kind].label}があります。Xを押してこの区画をクリックし、撤去してから建ててください。`), !(e.kits[t.kind] ?? 0)) for (let n of Object.keys(r[t.kind].cost)) {
		let i = r[t.kind].cost[n] - (e.inventory[n] ?? 0);
		i > 0 && l.push(`${o[n]}があと${i}個必要です。設備を選択して中身を回収するか、稼働中の工房から素材を集めてください。`);
	}
	return t.kind === "wire" && l.push("ここが途切れると採掘機・魔導炉が停止します。隣接する区画へ導線をつないでください。"), $(n, t.id, `${s}を${Q(t.x, t.z)}に置く`, t.text, i, {
		kind: t.kind,
		target: c,
		direction: t.direction,
		focusId: a?.id ?? null,
		mode: "build",
		blockers: l
	});
}
function He(e) {
	return e.buildings.filter((e) => e.kind === "lumber").some((t) => {
		let n = /* @__PURE__ */ new Set(), r = t;
		for (; r && !n.has(r.id);) {
			n.add(r.id);
			let [t, i] = d[r.direction];
			if (r = Z(e, r.x + t, r.z + i), r?.kind === "generator") return !0;
			if (r?.kind !== "belt") return !1;
		}
		return !1;
	});
}
function Ue(e, t) {
	let n = /* @__PURE__ */ new Set([t.id]), r = [t];
	for (let t = 0; t < r.length; t++) {
		let i = r[t];
		if (i.kind === "generator") return !0;
		for (let [t, a] of d) {
			let o = Z(e, i.x + t, i.z + a);
			o && ze.includes(o.kind) && !n.has(o.id) && (n.add(o.id), r.push(o));
		}
	}
	return !1;
}
function We(e) {
	let t = [];
	for (let n of X) {
		let i = Z(e, n.x, n.z);
		if (!i || i.kind !== n.kind) continue;
		let a = `${r[i.kind].label}${Q(i.x, i.z)}`;
		(i.kind === "miner" || i.kind === "smelter") && !Ue(e, i) && t.push(`${a}に魔力が届きません。導線の切れ目をつなぎ直してください。`), i.kind === "belt" && i.item && i.beltProgress + 1e-9 >= l && t.push(`${a}の品が滞留しています。先の設備の向き・入力庫・詰まりを確認し、不要な品は「回収」で取り出してください。`);
		let s = n.id === "belt-ore" ? "ore" : n.id === "belt-ingot" ? "ingot" : null;
		s && i.item && i.item.resource !== s && t.push(`${a}には${o[i.item.resource]}があります。この経路で運ぶ${o[s]}と違うため、「回収」で取り出してください。`), i.output.length >= 4 && t.push(`${a}の出力庫が満杯です。東向きのベルトと搬送先の詰まりを確認してください。`), i.kind === "smelter" && i.input.length >= 8 && t.push(`${a}の入力庫が満杯です。魔力と出力先を確認してください。`);
	}
	return t;
}
function Ge(e) {
	let t = [];
	if (e.delivered >= 100 || e.research?.unlocked.includes("crystals")) {
		let n = P(e);
		return $(Y, "done", "初回案内を完了：次の工房づくりへ", `ここからは自由に建設できます。次の目標：${n.title}。${n.detail}`, t, { mode: "done" });
	}
	let n = Z(e, 12, 16)?.kind === "miner" && Z(e, 14, 16)?.kind === "smelter" && Z(e, 12, 18)?.kind === "generator";
	if (e.delivered >= 1 && n) {
		for (let n = 0; n < X.length; n++) {
			let r = Ve(e, X[n], n + 1, t);
			if (r) return {
				...r,
				title: `工房を復旧：${r.title}`,
				text: `見本の工房の経路が変わっています。自動納品を続けるため、この区画を直しましょう。${r.text}`
			};
		}
		t.push("見本の採掘・精錬・納品経路と導線を確認");
	}
	if (e.delivered < 1) {
		for (let n = 0; n < X.length; n++) {
			let i = X[n], a = Ve(e, i, n + 1, t);
			if (a) return a;
			t.push(`${r[i.kind].label}${Q(i.x, i.z)}を配置済み`);
		}
		let n = Z(e, 12, 18);
		if (!(n.working || n.input.some((e) => e.resource === "wood") || n.energy > 0 || (n.pendingEnergy ?? 0) > 0)) return $(10, "feed", "魔力炉へ木材を1個補給する", "魔力炉を選択し「設備の詳細を開く」へ。所持品の木材スロットを押すと1個を補給できます。木材は10秒で魔力になります。このあと燃料も自動化します。", t, {
			kind: "generator",
			target: {
				x: 12,
				z: 18
			},
			focusId: n.id,
			mode: "feed",
			blockers: e.inventory.wood < 1 ? ["木材が1個必要です。メニューの「木材を手採取」で補充してください。"] : []
		});
		if (t.push("魔力炉に燃料、稼働中の仕事、または蓄積魔力があります"), n.working && !(n.pendingEnergy ?? 0)) {
			let e = Math.max(0, Math.ceil(r.generator.seconds - n.progress));
			t.push(`魔力炉は稼働中：魔力生成まであと${e}秒（正常な待ち時間）`);
		}
		return $(11, "run", "最初の延べ棒が届くのを待つ", "1×または2×で動かしてください。初回は燃料の10秒、採掘、精錬、搬送の順で進みます。自動納品が1本になると次へ進みます。手動納品は数えません。", t, {
			kind: "delivery",
			target: {
				x: 16,
				z: 16
			},
			focusId: Z(e, 16, 16).id,
			mode: "run",
			blockers: We(e)
		});
	}
	if (t.push(`最初の自動納品を確認（${e.delivered}本）`), He(e)) return $(Y, "done", "案内完了：工房が自動で動きます", `木材採取から魔力炉への補給がつながりました。ここからは自由に建設してください。次の目標：${P(e).title}。`, t, {
		mode: "done",
		checks: [...t, "木材採取場→ベルト→魔力炉が接続済み"]
	});
	if (Z(e, 12, 18)?.kind !== "generator") {
		let n = e.buildings.find((e) => e.kind === "lumber");
		return $(n ? 13 : 12, n ? "belt-wood-1" : "lumber", "今の工房へ燃料を自動補給する", n ? "今の木材採取場から、使用中の魔力炉へベルトをつなげてください。配置場所は自由です。最初の工房を見本の位置へ作り直す必要はありません。" : "好きな森林へ木材採取場を置き、使用中の魔力炉へベルトをつなげましょう。配置場所は自由です。", t, {
			kind: n ? "belt" : "lumber",
			direction: null,
			focusId: n?.id ?? null,
			mode: "build"
		});
	}
	for (let n = 0; n < Be.length; n++) {
		let i = Be[n], a = Ve(e, i, 12 + n, t);
		if (a) return a;
		t.push(`${r[i.kind].label}${Q(i.x, i.z)}を配置済み`);
	}
	return $(Y, "done", "案内完了：ここからは自由に建設", `燃料補給の経路も完成しました。ここからは自由に建設してください。次の目標：${P(e).title}。`, t, { mode: "done" });
}
//#endregion
//#region web/js/fantasy-automation/app.ts
var Ke = class {
	simulation = new re();
	save = new Le();
	view = null;
	ui;
	loop;
	kind = null;
	direction = 1;
	selectedId = null;
	hover = null;
	placedAt = null;
	speed = 1;
	previousSpeed = 1;
	message = "採掘機・魔導炉・魔力炉を設置し、ベルトと導線でつなぎましょう。";
	rendererMessage = "";
	removeMode = !1;
	last = 0;
	frame = 0;
	saveBusy = !1;
	uiTime = 0;
	technologyOpen = !1;
	guideEnabled = !0;
	guideStep = null;
	constructor(e, t) {
		try {
			this.view = new le(e, {
				onPick: (e, t, n) => this.pick(e, t, n),
				onHover: (e, t) => {
					this.placedAt && (this.placedAt.x !== e || this.placedAt.z !== t) && (this.placedAt = null), this.hover = {
						x: e,
						z: t
					};
				},
				onStatus: (e) => {
					this.rendererMessage = e.includes("復旧しました") ? "" : e;
				}
			});
		} catch {
			this.rendererMessage = "3D表示を開始できません。WebGL対応ブラウザで開いてください。保存・読込は利用できます。";
		}
		this.ui = new ge(t, {
			onBuild: (e) => this.chooseBuild(e),
			onSpeed: (e) => this.setSpeed(e),
			onSave: () => {
				this.persist();
			},
			onLoad: () => {
				this.resume();
			},
			onRotate: () => this.rotate(),
			onRemove: () => this.remove(),
			onFeed: (e, t) => this.feed(e, t),
			onCollect: (e, t) => this.collect(e, t),
			onTechnologyToggle: (e) => this.toggleTechnology(e),
			onResearch: (e) => this.research(e),
			onTrack: (e) => this.track(e),
			onRecipe: (e) => this.chooseRecipe(e),
			onRelayPolicy: (e) => {
				this.selectedId !== null && (this.message = this.simulation.command({
					type: "relayPolicy",
					id: this.selectedId,
					policy: e
				}).reason), this.sync();
			},
			onGatherWood: () => {
				this.message = this.simulation.command({ type: "gatherWood" }).reason, this.sync();
			},
			onCancel: () => this.cancel(),
			onResetCamera: () => this.view?.resetCamera(),
			onGuideAction: () => this.guideAction(),
			onGuideToggle: (e) => this.toggleGuide(e),
			onNew: () => {
				confirm("工房を最初から始めますか？ 保存枠は「保存」するまで残ります。") && this.init();
			}
		}), this.loop = new Re({
			step: () => this.simulation.step(),
			render: () => this.render(),
			stepSeconds: .05,
			maxSteps: 40
		}), qe(this), this.last = performance.now(), this.frame = requestAnimationFrame((e) => this.animate(e)), this.sync();
	}
	init() {
		this.simulation.init(), this.placedAt = null, this.selectedId = null, this.kind = null, this.hover = null, this.direction = 1, this.removeMode = !1, this.xHeld = !1, this.previousSpeed = 1, this.speed = 1, this.guideEnabled = !0, this.loop.reset(), this.view?.resetCamera(), this.message = "新しい工房を開きました。初期設備は建設時にキットを使用します。", this.sync();
	}
	chooseBuild(e) {
		if (!x(this.simulation.state, e)) this.message = "この設備は未解放です。技術ツリーで前提と実績条件を確認してください。", this.toggleTechnology(!0);
		else {
			if (this.placedAt = null, this.kind = e, this.selectedId = null, this.removeMode = !1, this.message = "区画をクリックして建設。Rで向き変更、Escで取消。", e === "crystalMiner") {
				let e = this.simulation.state, t = e.terrain.findIndex((t, n) => t === "crystal" && !e.buildings.some((e) => e.z * 32 + e.x === n));
				t < 0 && (t = e.pendingCrystalCells?.[0] ?? -1), t >= 0 && (this.hover = {
					x: t % 32,
					z: Math.floor(t / 32)
				}, this.view?.revealTile(this.hover.x, this.hover.z), this.message = e.terrain[t] === "crystal" ? "紫の魔晶鉱脈に魔晶採掘機を配置します。導線で魔力を供給してください。" : "この区画の設備を撤去すると、旧工房の下に隠れていた晶脈を利用できます。");
			}
			this.sync(), document.querySelector("#world canvas")?.focus({ preventScroll: !0 });
		}
	}
	toggleTechnology(e = !this.technologyOpen) {
		this.technologyOpen = e, this.sync();
	}
	research(e) {
		this.message = this.simulation.command({
			type: "research",
			id: e
		}).reason, this.sync();
	}
	track(e) {
		this.message = this.simulation.command({
			type: "track",
			id: e
		}).reason, this.sync();
	}
	chooseRecipe(e) {
		this.selectedId !== null && (this.message = this.simulation.command({
			type: "recipe",
			id: this.selectedId,
			recipe: e
		}).reason), this.sync();
	}
	toggleGuide(e = !this.guideEnabled) {
		this.guideEnabled = e, this.sync();
	}
	guideAction() {
		let e = Ge(this.simulation.state);
		this.placedAt = null, this.removeMode = !1, this.xHeld = !1, e.target && (this.hover = { ...e.target }, e.mode === "build" && this.view?.revealTile(e.target.x, e.target.z)), e.mode === "done" ? this.toggleGuide(!1) : e.mode === "run" ? (this.kind = null, this.selectedId = null, this.setSpeed(1)) : (e.mode === "rotate" || e.mode === "feed" ? (this.kind = null, this.selectedId = e.focusId, this.message = e.mode === "feed" ? "所持品の木材スロットを押すと1個を補給できます。木材から魔力を作ります。" : "設備の詳細にある「回転 R」で目印と同じ向きにします。") : (this.kind = e.kind, this.direction = e.direction ?? 1, this.selectedId = null, this.message = "設備を選びました。地図の光る目印を左クリックして建設してください。"), this.sync(), e.mode === "build" && document.querySelector("#world canvas")?.focus({ preventScroll: !0 }));
	}
	setSpeed(e) {
		this.speed = e, e && (this.previousSpeed = e), this.loop.reset(), this.last = performance.now(), this.sync();
	}
	togglePause() {
		this.setSpeed(this.speed ? 0 : this.previousSpeed);
	}
	cancel() {
		this.kind = null, this.removeMode = !1, this.message = "選択モード。施設をクリックして稼働状況を確認できます。", this.sync();
	}
	rotate() {
		this.kind ? this.direction = (this.direction + 1) % 4 : this.selectedId !== null && (this.message = this.simulation.command({
			type: "rotate",
			id: this.selectedId
		}).reason), this.sync();
	}
	remove() {
		this.selectedId === null ? (this.kind = null, this.removeMode = !this.removeMode, this.message = this.removeMode ? "撤去する施設をクリック。Escで取消。" : "撤去モードを解除しました。") : (this.message = this.simulation.command({
			type: "remove",
			id: this.selectedId
		}).reason, this.selectedId = null), this.sync();
	}
	feed(e, t) {
		this.selectedId !== null && (this.message = this.simulation.command({
			type: "feed",
			id: this.selectedId,
			resource: e,
			amount: t
		}).reason), this.sync();
	}
	collect(e, t) {
		this.selectedId !== null && (this.message = this.simulation.command({
			type: "collect",
			id: this.selectedId,
			...e === void 0 ? {} : { resource: e },
			...t === void 0 ? {} : { amount: t }
		}).reason), this.sync();
	}
	pick(e, t, n) {
		if (this.ui.isWorldInputBlocked() || n.type === "pointermove" && this.kind !== "belt" && !this.removeMode && !this.xHeld) return;
		let r = this.simulation.state.buildings.find((n) => n.x === e && n.z === t);
		if (n.type !== "pointermove" || !r || this.removeMode || this.xHeld) {
			if (n.shiftKey && r) this.kind = r.kind, this.direction = r.direction, this.selectedId = null, this.message = "同じ設備を選びました。空き区画へ建設できます。";
			else if ((this.removeMode || this.xHeld) && r) this.message = this.simulation.command({
				type: "remove",
				id: r.id
			}).reason, this.selectedId === r.id && (this.selectedId = null);
			else if (this.kind && !r) {
				let n = this.simulation.command({
					type: "build",
					kind: this.kind,
					x: e,
					z: t,
					direction: this.direction
				});
				this.message = n.reason, this.placedAt = n.ok ? {
					x: e,
					z: t
				} : null;
			} else this.selectedId = r?.id ?? null, r && (this.kind = null);
			this.sync();
		}
	}
	xHeld = !1;
	async persist() {
		if (!this.saveBusy) {
			this.saveBusy = !0;
			try {
				await this.save.save(this.simulation.snapshot()), this.message = "この工房を保存しました。";
			} catch (e) {
				this.message = `保存できません: ${e instanceof Error ? e.message : String(e)}`;
			} finally {
				this.saveBusy = !1, this.sync();
			}
		}
	}
	async resume() {
		if (!this.saveBusy) {
			this.saveBusy = !0;
			try {
				let e = await this.save.load();
				e ? (this.simulation.restore(e), this.placedAt = null, this.loop.reset(), this.last = performance.now(), this.kind = null, this.selectedId = null, this.message = "保存した工房を再開しました。") : this.message = "保存データがありません。まず「保存」を押してください。";
			} catch (e) {
				this.message = `読込できません: ${e instanceof Error ? e.message : String(e)}`;
			} finally {
				this.saveBusy = !1, this.sync();
			}
		}
	}
	animate(e) {
		let t = Math.min((e - this.last) / 1e3, 1);
		this.last = e, document.hidden ? this.loop.reset() : this.loop.advance(t * this.speed), e - this.uiTime > 150 && (this.sync(), this.uiTime = e), this.frame = requestAnimationFrame((e) => this.animate(e));
	}
	render() {
		this.view?.setInputBlocked(this.ui.isWorldInputBlocked());
		let e = !!this.kind && !!this.hover && this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction).ok;
		this.view?.render(this.simulation.state, {
			kind: this.kind,
			direction: this.direction,
			valid: e,
			hover: this.hover,
			selectedId: this.selectedId,
			guideTarget: this.guideStep?.target ? {
				...this.guideStep.target,
				kind: this.guideStep.kind,
				direction: this.guideStep.direction
			} : null
		});
	}
	sync() {
		this.guideStep = this.guideEnabled && !this.technologyOpen ? Ge(this.simulation.state) : null;
		let e = [this.rendererMessage, this.message].filter(Boolean).join(" ");
		if (this.kind && this.hover) {
			let t = this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction);
			if (!t.ok && (this.placedAt?.x !== this.hover.x || this.placedAt?.z !== this.hover.z) && !e.includes(t.reason)) e += ` 配置予定: ${t.reason}`;
			else if (t.ok) {
				let t = new Map(this.simulation.state.buildings.map((e) => [`${e.x},${e.z}`, e])), n = j({
					kind: this.kind,
					...this.hover,
					direction: this.direction
				}, t), r = {
					connected: "接続",
					missing: "未接続",
					incompatible: "素材不一致",
					full: "詰まり",
					edge: "マップ外"
				};
				n.length && (e += ` 出口 ${n.map((e) => `${[
					"北 ↑",
					"東 →",
					"南 ↓",
					"西 ←"
				][e.direction]} ${r[e.state]}`).join(" / ")}。`);
			}
		}
		this.ui.update(this.simulation.state, {
			kind: this.kind,
			direction: this.direction,
			selectedId: this.selectedId,
			speed: this.speed,
			power: this.simulation.powerSummary(),
			message: e,
			hover: this.hover,
			guide: this.guideStep,
			technologyOpen: this.technologyOpen
		}), this.view?.setInputBlocked(this.ui.isWorldInputBlocked());
	}
	key(e) {
		this.technologyOpen && e.code === "Escape" ? this.toggleTechnology(!1) : e.code === "Escape" && this.ui.closeOverlay() || this.ui.isWorldInputBlocked() || e.target instanceof Element && e.target.closest("#technology-panel") || e.target instanceof Element && (e.target.closest("#game-ui") || e.target.closest("input,select,textarea,[contenteditable=\"true\"]") || e.target.closest("button") && !["KeyR", "Escape"].includes(e.code)) || e.repeat && e.code !== "KeyX" || (/^Digit[1-6]$/.test(e.code) ? (e.preventDefault(), this.ui.chooseQuickSlot(Number(e.code.slice(-1)) - 1)) : (e.code === "KeyX" && (this.xHeld = !0, this.message = "Xを押しながら施設をクリックして撤去。"), e.code === "KeyR" && this.rotate(), e.code === "Escape" && this.cancel(), e.code === "Space" && (e.preventDefault(), this.togglePause())));
	}
};
function qe(e) {
	document.addEventListener("keydown", (t) => e.key(t)), document.addEventListener("keyup", (t) => {
		t.code === "KeyX" && (e.xHeld = !1);
	}), window.addEventListener("blur", () => {
		e.xHeld = !1, e.loop.reset();
	}), document.addEventListener("visibilitychange", () => {
		e.last = performance.now(), e.loop.reset();
	}), window.addEventListener("pagehide", () => {
		cancelAnimationFrame(e.frame), e.ui.dispose(), e.view?.dispose();
	}, { once: !0 });
}
var Je = document.querySelector("#world"), Ye = document.querySelector("#game-ui");
Je && Ye && new Ke(Je, Ye);
//#endregion
