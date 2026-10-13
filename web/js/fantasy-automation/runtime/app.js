import * as e from "three";
//#endregion
//#region web/js/fantasy-automation/data.ts
var t = {
	miner: {
		label: "採掘機",
		cost: {
			wood: 4,
			ingot: 6
		},
		seconds: 2,
		output: { ore: 1 },
		energy: 2
	},
	belt: {
		label: "搬送ベルト",
		cost: {
			wood: 1,
			ingot: 1
		},
		seconds: .5
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
		energy: 5
	},
	generator: {
		label: "魔力炉",
		cost: {
			wood: 6,
			ingot: 6
		},
		seconds: 10,
		input: { wood: 1 },
		generatedEnergy: 30
	},
	wire: {
		label: "魔力導線",
		cost: { wood: 1 }
	},
	lumber: {
		label: "木材採取場",
		cost: {
			wood: 4,
			ingot: 4
		},
		seconds: 3,
		output: { wood: 1 }
	},
	delivery: {
		label: "納品箱",
		cost: { wood: 6 }
	}
}, n = t.belt.seconds, r = .05, i = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0]
], a = [
	"wire",
	"generator",
	"miner",
	"smelter"
], o = [
	"wood",
	"ore",
	"ingot"
], s = (e, t) => t * 32 + e, c = (e = "") => ({
	ok: !0,
	reason: e
}), l = (e) => ({
	ok: !1,
	reason: e
}), u = class {
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
			for (let e = -1; e <= 1; e++) for (let o = -1; o <= 1; o++) r() > .35 && (t[s(n + o, i + e)] = a);
		}
		for (let e = 13; e <= 21; e++) for (let n = 8; n <= 18; n++) t[s(n, e)] = "grass";
		t[s(12, 16)] = t[s(12, 15)] = "ore", t[s(9, 18)] = t[s(9, 19)] = "forest", this.state = {
			version: 1,
			seed: e,
			tick: 0,
			nextId: 1,
			terrain: t,
			inventory: {
				wood: 40,
				ore: 0,
				ingot: 20
			},
			kits: {
				miner: 1,
				smelter: 1,
				generator: 1
			},
			buildings: [],
			delivered: 0,
			won: !1
		};
	}
	snapshot() {
		return structuredClone(this.state);
	}
	restore(e) {
		if (e.version !== 1 || e.terrain.length !== 1024 || !Array.isArray(e.buildings)) throw Error("保存データの形式が正しくありません");
		this.state = structuredClone(e), this.state.buildings.sort((e, t) => e.id - t.id);
	}
	canBuild(e, n, r, i) {
		if (!Object.hasOwn(t, e)) return l("設備の種類が不正です");
		if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || n >= 32 || r >= 32) return l("地図の外には建設できません");
		if (!Number.isInteger(i) || i < 0 || i > 3) return l("方向が不正です");
		if (this.state.buildings.some((e) => e.x === n && e.z === r)) return l("この区画には設備があります");
		let a = this.state.terrain[s(n, r)];
		if (e === "miner" && a !== "ore") return l("採掘機は鉄鉱脈の上に配置してください");
		if (e === "lumber" && a !== "forest") return l("木材採取場は森林の上に配置してください");
		if ((this.state.kits[e] ?? 0) > 0) return c("所持設備を設置");
		for (let n of o) {
			let r = t[e].cost[n] ?? 0;
			if (this.state.inventory[n] < r) return l(`建設素材が不足しています（${n === "wood" ? "木材" : n === "ore" ? "鉄鉱石" : "鉄延べ棒"} ${r}）`);
		}
		return c();
	}
	command(e) {
		if (e.type === "build") {
			let n = this.canBuild(e.kind, e.x, e.z, e.direction);
			if (!n.ok) return n;
			if ((this.state.kits[e.kind] ?? 0) > 0) this.state.kits[e.kind]--;
			else for (let n of o) this.state.inventory[n] -= t[e.kind].cost[n] ?? 0;
			return this.state.buildings.push({
				id: this.state.nextId++,
				kind: e.kind,
				x: e.x,
				z: e.z,
				direction: e.direction,
				input: [],
				output: [],
				progress: 0,
				working: !1,
				energy: 0,
				status: "待機中",
				item: null,
				beltProgress: 0
			}), c(`${t[e.kind].label}を設置しました`);
		}
		let n = this.state.buildings.find((t) => t.id === e.id);
		if (!n) return l("設備が見つかりません");
		if (e.type === "remove") {
			let e = +(n.kind === "generator" && (n.pendingEnergy ?? 0) > 0);
			for (let t of [
				...n.input.slice(e),
				...n.output,
				...n.item ? [n.item] : []
			]) this.state.inventory[t.resource]++;
			for (let e of o) this.state.inventory[e] += Math.floor((t[n.kind].cost[e] ?? 0) / 2);
			return this.state.buildings = this.state.buildings.filter((e) => e.id !== n.id), c("設備を撤去しました。中身と建設素材の半分を回収");
		}
		if (e.type === "rotate") return n.direction = (n.direction + 1) % 4, c("出力方向を回転しました");
		if (e.type === "feed") {
			if (!o.includes(e.resource) || !Number.isSafeInteger(e.amount) || e.amount <= 0) return l("投入数が不正です");
			if (!this.accepts(n, e.resource)) return l("この設備ではその素材を使用できません");
			if (this.state.inventory[e.resource] < e.amount) return l("所持素材が不足しています");
			if (n.kind === "belt" && (n.item || e.amount !== 1)) return l("ベルトには空き区画へ1個ずつ投入してください");
			if (n.kind !== "delivery" && n.kind !== "belt" && n.input.length + e.amount > 8) return l("設備の入力庫が満杯です");
			if (this.state.inventory[e.resource] -= e.amount, n.kind === "delivery") n.status = "手動納品（目標には算入されません）";
			else if (n.kind === "belt") n.item = {
				resource: e.resource,
				automated: !1
			}, n.beltProgress = 0;
			else for (let t = 0; t < e.amount; t++) n.input.push({
				resource: e.resource,
				automated: !1
			});
			return c(n.kind === "delivery" ? "手動納品は目標の本数に算入されません" : "素材を補給しました");
		}
		if (e.type === "collect") {
			let e = n.working ? this.recipeAmount(n) : 0, t = [...n.input.splice(e), ...n.output.splice(0)];
			n.item && (t.push(n.item), n.item = null, n.beltProgress = 0);
			for (let e of t) this.state.inventory[e.resource]++;
			return c(`素材を${t.length}個回収しました${e ? "（稼働中の素材は予約済み）" : ""}`);
		}
		return l("操作が不正です");
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
		let e = [...this.state.buildings].sort((e, t) => e.id - t.id), t = new Map(e.map((e) => [s(e.x, e.z), e]));
		for (let t of e) t.kind === "belt" && t.item && (t.beltProgress = Math.min(n, t.beltProgress + r));
		this.transport(e, t);
		let i = this.networks();
		for (let t of e) t.kind === "belt" ? t.status = t.item ? t.beltProgress + 1e-9 >= n ? "搬送先が詰まっています" : "搬送中" : "搬送品を待っています" : t.kind === "wire" ? t.status = i.get(t.id)?.generators.length ? "魔力網に接続中" : "魔力炉に接続してください" : t.kind === "delivery" ? t.status.startsWith("手動") || (t.status = this.state.won ? "目標達成！" : "鉄延べ棒の自動納品を待っています") : this.produce(t, i.get(t.id));
		this.state.won = this.state.delivered >= 100;
	}
	recipeAmount(e) {
		return Object.values(t[e.kind].input ?? {}).reduce((e, t) => e + (t ?? 0), 0);
	}
	accepts(e, n) {
		return e.kind === "belt" || (t[e.kind].input?.[n] ?? 0) > 0 || e.kind === "delivery" && n === "ingot";
	}
	networks() {
		let e = this.state.buildings.filter((e) => a.includes(e.kind)).sort((e, t) => e.id - t.id), t = new Map(e.map((e) => [s(e.x, e.z), e])), n = /* @__PURE__ */ new Map();
		for (let r of e) {
			if (n.has(r.id)) continue;
			let e = { generators: [] }, a = [r];
			n.set(r.id, e);
			for (let r = 0; r < a.length; r++) {
				let o = a[r];
				o.kind === "generator" && e.generators.push(o);
				for (let [r, c] of i) {
					let i = o.x + r, l = o.z + c;
					if (i < 0 || i >= 32 || l < 0 || l >= 32) continue;
					let u = t.get(s(i, l));
					u && !n.has(u.id) && (n.set(u.id, e), a.push(u));
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
	produce(e, n) {
		let i = t[e.kind], a = i.seconds, s = e.kind === "miner" || e.kind === "smelter";
		if (s && !n?.generators.length) e.status = "魔力導線がつながっていません";
		else {
			if (!e.working) {
				let t = i.input ?? {};
				for (let n of o) if (e.input.filter((e) => e.resource === n).length < (t[n] ?? 0)) {
					e.status = e.kind === "generator" ? "木材が不足しています（手動補給できます）" : "鉄鉱石が不足しています";
					return;
				}
				if (e.kind !== "generator" && e.output.length >= 4) {
					e.status = "出力庫が満杯です";
					return;
				}
				if (s && !this.spend(n, i.energy ?? 0)) {
					e.status = "魔力が不足しています";
					return;
				}
				e.working = !0, e.progress = 0;
			}
			if (e.progress = Math.min(a, e.progress + r), e.status = "稼働中", !(e.progress + 1e-9 < a)) {
				if (e.kind === "generator") {
					(e.pendingEnergy === void 0 || e.pendingEnergy === 0) && (e.pendingEnergy = i.generatedEnergy);
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
					let t = Object.keys(i.output)[0], n = e.kind !== "smelter" || e.input.slice(0, this.recipeAmount(e)).every((e) => e.automated);
					e.output.push({
						resource: t,
						automated: n
					});
				}
				e.input.splice(0, this.recipeAmount(e)), e.progress = 0, e.working = !1, e.status = "生産完了";
			}
		}
	}
	transport(e, t) {
		let r = [], a = /* @__PURE__ */ new Map();
		for (let o of e) {
			let e = o.kind === "belt", c = e ? o.item : o.output[0];
			if (!c || e && o.beltProgress + 1e-9 < n) continue;
			let [l, u] = i[o.direction], d = o.x + l, f = o.z + u;
			if (d < 0 || d >= 32 || f < 0 || f >= 32) continue;
			let p = t.get(s(d, f));
			if (!p || !this.accepts(p, c.resource)) continue;
			let m = a.get(p.id) ?? 0;
			if (p.kind === "belt") {
				if (m > 0 || p.item && p.beltProgress + 1e-9 < n) continue;
			} else if (p.kind !== "delivery" && p.input.length + m >= 8) continue;
			r.push({
				source: o,
				target: p,
				item: c,
				fromBelt: e
			}), a.set(p.id, m + 1);
		}
		let o = r;
		for (;;) {
			let e = new Set(o.filter((e) => e.fromBelt).map((e) => e.source.id)), t = o.filter((t) => t.target.kind !== "belt" || !t.target.item || e.has(t.target.id));
			if (t.length === o.length) break;
			o = t;
		}
		for (let e of o) e.fromBelt ? (e.source.item = null, e.source.beltProgress = 0) : e.source.output.shift();
		for (let e of o) e.target.kind === "belt" ? (e.target.item = e.item, e.target.beltProgress = 0) : e.target.kind === "delivery" ? (e.item.automated && this.state.delivered++, e.target.status = e.item.automated ? "鉄延べ棒を自動納品しました" : "手動由来の品は目標に算入されません") : e.target.input.push(e.item);
	}
}, d = class {
	canvas;
	actions;
	abort = new AbortController();
	pointer = null;
	lastCell = "";
	keys = /* @__PURE__ */ new Set();
	constructor(e, t) {
		this.canvas = e, this.actions = t, e.tabIndex = 0, e.setAttribute("aria-label", "工房の地図。右ドラッグまたは WASD で移動、中ドラッグまたは QE で回転"), e.style.touchAction = "none";
		let n = { signal: this.abort.signal };
		e.addEventListener("pointerdown", (e) => this.pointerDown(e), n), e.addEventListener("pointermove", (e) => this.pointerMove(e), n), e.addEventListener("pointerup", (e) => this.pointerUp(e), n), e.addEventListener("pointercancel", (e) => this.pointerUp(e), n), e.addEventListener("lostpointercapture", () => {
			this.pointer = null, this.lastCell = "";
		}, n), e.addEventListener("contextmenu", (e) => e.preventDefault(), n), e.addEventListener("wheel", (e) => {
			e.preventDefault(), this.actions.zoom(Math.sign(e.deltaY) * .12);
		}, {
			...n,
			passive: !1
		}), e.addEventListener("keydown", (e) => this.keyDown(e), n), window.addEventListener("keyup", (e) => this.keys.delete(e.code), n), e.addEventListener("blur", () => this.keys.clear(), n), window.addEventListener("blur", () => {
			this.keys.clear(), this.pointer = null;
		}, n);
	}
	pointerDown(e) {
		this.pointer || e.button > 2 || (e.preventDefault(), this.canvas.focus({ preventScroll: !0 }), this.canvas.setPointerCapture(e.pointerId), this.pointer = {
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
		[
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyQ",
			"KeyE"
		].includes(e.code) && (e.preventDefault(), this.keys.add(e.code));
	}
	update(e) {
		let t = Math.min(.1, e), n = Number(this.keys.has("KeyA")) - Number(this.keys.has("KeyD")), r = Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
		(n || r) && this.actions.pan(n * t * 400, r * t * 400);
		let i = Number(this.keys.has("KeyQ")) - Number(this.keys.has("KeyE"));
		i && this.actions.rotate(i * t * 1.2);
	}
	dispose() {
		this.abort.abort(), this.keys.clear(), this.pointer = null;
	}
}, f = class {
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
	ghostPower = null;
	selection = new e.Group();
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
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)), this.renderer.outputColorSpace = e.SRGBColorSpace, this.renderer.setClearColor(13491158), t.append(this.renderer.domElement), this.renderer.domElement.addEventListener("pointerleave", () => {
			this.cursorOnMap = !1;
		}, { signal: this.abort.signal }), this.scene.background = new e.Color(13491158), this.scene.add(new e.HemisphereLight(16775389, 5466213, 2.5));
		let r = new e.DirectionalLight(16772560, 2.1);
		r.position.set(-12, 28, 8), this.scene.add(r, this.terrain, this.ghost, this.selection), this.createOutline(this.ghost, 8318383), this.ghostPort.position.set(0, .12, -.37), this.ghost.add(this.ghostPort), this.ghostPower = this.cylinder(this.ghost, 9759487, .085, .14, [
			.38,
			.22,
			.38
		], !0), this.createOutline(this.selection, 16768110), this.ghost.visible = this.selection.visible = !1, this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
			e.preventDefault(), this.contextLost = !0, n.onStatus("3D 表示が中断しました。復旧を待っています。進行は保存できます。");
		}, { signal: this.abort.signal }), this.renderer.domElement.addEventListener("webglcontextrestored", () => {
			this.contextLost = !1, this.lastTime = performance.now(), this.resize(), n.onStatus("3D 表示を復旧しました。");
		}, { signal: this.abort.signal }), this.input = new d(this.renderer.domElement, {
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
	rebuildTerrain(t) {
		for (let t of this.terrain.children) t instanceof e.InstancedMesh && t.dispose();
		this.terrain.clear();
		let n = new e.InstancedMesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(16777215), 1024), r = new e.Matrix4(), i = {
			grass: 7772289,
			forest: 6193768,
			ore: 9214356
		}, a = [], o = [], s = new Set(t.buildings.map((e) => e.z * 32 + e.x));
		if (t.terrain.forEach((t, c) => {
			let l = c % 32, u = Math.floor(c / 32);
			r.compose(new e.Vector3(l, -.105, u), new e.Quaternion(), new e.Vector3(.98, .16, .98)), n.setMatrixAt(c, r);
			let d = new e.Color(i[t]);
			d.multiplyScalar(.95 + (l * 31 + u * 13) % 7 / 100), n.setColorAt(c, d), t === "forest" && !s.has(c) && a.push(c), t === "ore" && !s.has(c) && o.push(c);
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
	}
	facility(t) {
		let n = new e.Group(), r = this.arrow();
		r.visible = ![
			"wire",
			"generator",
			"delivery"
		].includes(t);
		let a = [];
		if (r.position.y = t === "belt" ? .17 : .08, r.position.z = t === "belt" ? 0 : -.22, n.add(r), t === "belt") {
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
			for (let [e, t] of i) {
				let r = this.box(n, 8571090, [
					e ? .52 : .045,
					.045,
					t ? .52 : .045
				], [
					e * .25,
					.4,
					t * .25
				]);
				r.visible = !1, a.push(r);
			}
		} else if (this.box(n, 5531506, [
			.76,
			.13,
			.76
		], [
			0,
			.07,
			0
		]), t === "miner") this.box(n, 7970471, [
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
		]);
		else if (t === "smelter") this.cylinder(n, 10709593, .32, .58, [
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
		let o = new e.Mesh(this.geometry("cube", () => new e.BoxGeometry(1, 1, 1)), this.material(14730388));
		o.scale.set(.19, .14, .22), o.visible = !1, n.add(o);
		let s = new e.Mesh(this.geometry("rock", () => new e.DodecahedronGeometry(1, 0)), this.material(7635834));
		return s.scale.setScalar(.055), s.position.set(.25, t === "belt" ? .22 : .66, .22), s.visible = t !== "wire" && t !== "belt", n.add(s), {
			group: n,
			arrow: r,
			item: o,
			lamp: s,
			kind: t,
			wires: a
		};
	}
	itemColor(e) {
		return {
			wood: 11962194,
			ore: 8569558,
			ingot: 14080467
		}[e];
	}
	updateFacility(e, t) {
		e.group.position.set(t.x, 0, t.z), e.group.rotation.y = -t.direction * Math.PI / 2, e.lamp.material = this.material(t.working ? 9233064 : 13603442, t.working ? 2313259 : 0);
		let r = t.item ?? t.output[0];
		e.item.visible = !!r, r && (e.item.material = this.material(this.itemColor(r.resource)), e.item.position.set(0, t.kind === "belt" ? .27 : .2, t.kind === "belt" ? .34 - Math.min(1, t.beltProgress / n) * .68 : -.36));
	}
	render(t, n) {
		if (this.disposed) return;
		let r = performance.now();
		this.input.update((r - this.lastTime) / 1e3), this.lastTime = r;
		let a = t.buildings.map((e) => e.z * 32 + e.x).filter((e) => t.terrain[e] !== "grass").sort((e, t) => e - t).join(","), o = `${t.seed}:${t.terrain.join(",")}:${a}`;
		o !== this.terrainKey && (this.rebuildTerrain(t), this.terrainKey = o);
		let s = /* @__PURE__ */ new Set(), c = new Map(t.buildings.map((e) => [`${e.x},${e.z}`, e])), l = /* @__PURE__ */ new Set([
			"wire",
			"generator",
			"miner",
			"smelter"
		]), u = /* @__PURE__ */ new Set(), d = t.buildings.filter((e) => e.kind === "generator" && e.energy > 0);
		for (let e = 0; e < d.length; e++) {
			let t = d[e], n = `${t.x},${t.z}`;
			if (!u.has(n)) {
				u.add(n);
				for (let [e, n] of i) {
					let r = `${t.x + e},${t.z + n}`, i = c.get(r);
					i && l.has(i.kind) && !u.has(r) && d.push(i);
				}
			}
		}
		for (let e of t.buildings) {
			s.add(e.id);
			let t = this.facilities.get(e.id);
			if (t && t.kind !== e.kind && (this.scene.remove(t.group), this.facilities.delete(e.id), t = void 0), t || (t = this.facility(e.kind), this.facilities.set(e.id, t), this.scene.add(t.group)), this.updateFacility(t, e), e.kind === "wire") for (let n = 0; n < 4; n++) {
				let [r, a] = i[n], o = c.get(`${e.x + r},${e.z + a}`);
				t.wires[n].visible = !!o && [
					"wire",
					"generator",
					"miner",
					"smelter"
				].includes(o.kind);
			}
			e.kind === "wire" && (t.group.rotation.y = 0);
		}
		for (let [e, t] of this.facilities) s.has(e) || (this.scene.remove(t.group), this.facilities.delete(e));
		if (this.ghost.visible = !!n.kind && !!n.hover && this.cursorOnMap, this.ghost.visible && n.hover) {
			if (this.ghostPreview?.kind !== n.kind && (this.ghostPreview && this.ghost.remove(this.ghostPreview.group), this.ghostPreview = this.facility(n.kind), this.ghostPreview.item.visible = this.ghostPreview.lamp.visible = !1, this.ghost.add(this.ghostPreview.group)), this.ghost.position.set(n.hover.x, 0, n.hover.z), this.ghost.traverse((t) => {
				t instanceof e.Mesh && (t.material = this.material(n.valid ? 9437105 : 16742510, 0, t.parent !== this.ghost));
			}), this.ghost.rotation.y = -n.direction * Math.PI / 2, this.ghostPort.visible = !!n.kind && ![
				"wire",
				"generator",
				"delivery"
			].includes(n.kind), this.ghostPort.visible && n.kind) {
				let [t, r] = i[n.direction], a = n.hover.x + t, o = n.hover.z + r, s = a < 0 || a >= 32 || o < 0 || o >= 32, l = c.get(`${a},${o}`), u = n.kind === "miner" ? ["ore"] : n.kind === "smelter" ? ["ingot"] : n.kind === "lumber" ? ["wood"] : [
					"wood",
					"ore",
					"ingot"
				];
				if (n.kind === "belt") {
					let e = i.map(([e, t]) => c.get(`${n.hover.x + e},${n.hover.z + t}`)).filter((e) => !!e).filter((e) => {
						let [t, r] = i[e.direction];
						return e.x + t === n.hover.x && e.z + r === n.hover.z;
					}).flatMap((e) => e.item ? [e.item.resource] : e.output.length ? e.output.map((e) => e.resource) : e.kind === "miner" ? ["ore"] : e.kind === "smelter" ? ["ingot"] : e.kind === "lumber" ? ["wood"] : []);
					e.length && (u = e);
				}
				let d = l?.kind === "belt" ? [
					"wood",
					"ore",
					"ingot"
				] : l?.kind === "smelter" ? ["ore"] : l?.kind === "generator" ? ["wood"] : l?.kind === "delivery" ? ["ingot"] : [], f = u.some((e) => d.includes(e)), p = s || l && !f ? 16736857 : l ? 9437101 : 15971156;
				this.ghostPort.traverse((t) => {
					t instanceof e.Mesh && (t.material = this.material(p));
				}), this.ghostPreview?.arrow.traverse((t) => {
					t instanceof e.Mesh && (t.material = this.material(p));
				});
			}
			if (this.ghostPower) {
				let e = n.kind && [
					"miner",
					"smelter",
					"generator",
					"wire"
				].includes(n.kind);
				this.ghostPower.visible = !!e;
				let t = i.some(([e, t]) => {
					let r = c.get(`${n.hover.x + e},${n.hover.z + t}`);
					return r && [
						"wire",
						"generator",
						"miner",
						"smelter"
					].includes(r.kind);
				}), r = i.some(([e, t]) => u.has(`${n.hover.x + e},${n.hover.z + t}`));
				this.ghostPower.material = this.material(r ? 7005183 : t ? 12032737 : 15182441, 2111546);
			}
		}
		let f = n.selectedId == null ? null : this.facilities.get(n.selectedId);
		this.selection.visible = !!f, f && this.selection.position.copy(f.group.position), this.contextLost || this.renderer.render(this.scene, this.camera);
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
	dispose() {
		if (!this.disposed) {
			this.disposed = !0, this.input.dispose(), this.observer.disconnect(), this.abort.abort();
			for (let t of this.terrain.children) t instanceof e.InstancedMesh && t.dispose();
			for (let e of this.geometries.values()) e.dispose();
			for (let e of this.materials.values()) e.dispose();
			this.scene.clear(), this.facilities.clear(), this.renderer.dispose(), this.renderer.domElement.remove();
		}
	}
}, p = {
	wood: "木材",
	ore: "鉄鉱石",
	ingot: "鉄延べ棒"
}, m = [
	"北 ↑",
	"東 →",
	"南 ↓",
	"西 ←"
], h = [
	"miner",
	"belt",
	"smelter",
	"generator",
	"wire",
	"lumber",
	"delivery"
], g = {
	miner: "⚒",
	belt: "→",
	smelter: "♨",
	generator: "✦",
	wire: "⌁",
	lumber: "♣",
	delivery: "▣"
}, _ = {
	miner: "鉱脈の上に設置。魔力2で鉄鉱石1を2秒で採掘。矢印へ排出。",
	belt: "矢印の先へ1個ずつ搬送。1区画0.5秒。ドラッグで連続配置。",
	smelter: "鉄鉱石2と魔力5で鉄延べ棒1を4秒で精錬。入力は隣接、出力は矢印。",
	generator: "木材1から魔力30を10秒で生成。蓄積上限30。隣接する導線へ供給。",
	wire: "隣り合う導線・魔力炉・採掘機・魔導炉を魔力網で接続。",
	lumber: "森林の上に設置。木材1を3秒で採取。矢印へ排出。",
	delivery: "ベルトから鉄延べ棒を受け取り、自動生産100本でクリア。手動投入は数えない。"
}, v = class {
	controller = new AbortController();
	buildButtons = /* @__PURE__ */ new Map();
	speedButtons = /* @__PURE__ */ new Map();
	resourceNodes = /* @__PURE__ */ new Map();
	root;
	callbacks;
	lastSelected = null;
	lastMessage = "";
	constructor(e, n) {
		this.root = e, this.callbacks = n, e.innerHTML = "\n      <header class=\"workshop-top\">\n        <a class=\"home-link\" href=\"index.html\" aria-label=\"AI Gamesへ戻る\">‹ AI Games</a>\n        <div class=\"workshop-title\">魔導からくり工房<span>自動納品 <b id=\"delivered-count\">0</b> / 100</span></div>\n        <div class=\"resource-strip\" aria-label=\"所持資源\"><span>木材 <b data-resource=\"wood\">40</b></span><span>鉄鉱石 <b data-resource=\"ore\">0</b></span><span>鉄 <b data-resource=\"ingot\">20</b></span><span>魔力 <b id=\"power-count\">0 / 0</b></span></div>\n        <div class=\"time-controls\" aria-label=\"時間速度\"><button data-speed=\"0\" aria-label=\"一時停止\" title=\"一時停止（Space）\">Ⅱ</button><button data-speed=\"1\" aria-label=\"1倍速\">1×</button><button data-speed=\"2\" aria-label=\"2倍速\">2×</button></div>\n        <details class=\"game-menu\"><summary aria-label=\"操作と保存メニュー\">☰ <span>メニュー</span></summary><div class=\"menu-body\"><div class=\"menu-actions\"><button data-action=\"save\">保存</button><button data-action=\"load\">読込</button><button data-action=\"camera\">視点を戻す</button><button data-action=\"new\">新しい工房</button></div><details><summary>操作方法・つくり方</summary><div class=\"help-text\"><p>鉱脈に採掘機 → ベルト → 魔導炉 → ベルト → 納品箱をつなごう。魔力炉と機械は魔力導線で接続。魔力炉を選び木材を補給すると起動できます。</p><p>最初の配置例（座標 X, Z。地形を指すと座標が表示されます）:<br>採掘機 (12,16) → ベルト (13,16) → 魔導炉 (14,16) → ベルト (15,16) → 納品箱 (16,16)。全て東向き。<br>魔力炉 (12,18) と、導線 (12,17)・(13,17)・(14,17) を設置。魔力炉を選び木材1を補給。<br>木材採取場 (9,18) → ベルト (10,18)・(11,18) → 魔力炉 (12,18) と東向きにつなぐと燃料も自動化。</p><p>左クリック: 配置 / 選択<br>ベルト選択中に左ドラッグ: 連続敷設<br>右ドラッグ / WASD: 移動<br>中ドラッグ / Q・E: 視点回転<br>ホイール: ズーム<br>R: 設備回転、Shift＋クリック: 複製<br>X＋クリック: 撤去、Esc: 建設取消<br>Space: 一時停止 / 再開</p><p>配置プレビュー: 緑は建設可能、赤は建設不可。金の矢印が出力方向。結晶の青は魔力あり、紫は魔力網につながっているが蓄積なし、橙は魔力網に未接続。</p><p>納品に数えるのは自動生産した鉄だけです。採掘機が生産した鉱石を使いましょう。魔力切れは木材の手動補給で復旧できます。保存はこのブラウザの1スロットです。</p></div></details></div></details>\n      </header>\n      <div class=\"workshop-notices\"><p id=\"game-message\" role=\"status\" aria-live=\"polite\">鉱脈に採掘機を建て、工房を動かそう。</p><p id=\"victory-message\" hidden>工房完成！ 鉄延べ棒100本の自動納品を達成しました。続けて工房を拡張できます。</p></div>\n      <aside id=\"selection-panel\" class=\"selection-panel\" hidden aria-label=\"設備の詳細\">\n        <button class=\"panel-close\" data-action=\"close-panel\" aria-label=\"設備詳細を閉じる\">×</button><h2 id=\"selection-title\"></h2><p id=\"selection-description\"></p>\n        <dl><div><dt>稼働状態</dt><dd id=\"selection-status\"></dd></div><div><dt>入出力・方向</dt><dd id=\"selection-direction\"></dd></div><div><dt>内部の資源</dt><dd id=\"selection-buffer\"></dd></div><div><dt>作業進捗</dt><dd id=\"selection-progress\"></dd></div><div><dt>蓄積魔力</dt><dd id=\"selection-power\"></dd></div></dl>\n        <div class=\"selection-actions\"><button data-action=\"rotate\">回転 R</button><button data-action=\"collect\">資源を回収</button><button data-action=\"remove\" class=\"danger\">撤去</button></div>\n        <form id=\"feed-form\"><label>手動補給<select id=\"feed-resource\"><option value=\"wood\">木材</option><option value=\"ore\">鉄鉱石</option><option value=\"ingot\">鉄延べ棒</option></select></label><label>個数<input id=\"feed-amount\" type=\"number\" min=\"1\" max=\"1000\" step=\"1\" value=\"1\" inputmode=\"numeric\"></label><button type=\"submit\" data-action=\"feed\">補給する</button><small>手動補給した素材は自動納品に数えません。</small></form>\n      </aside>\n      <footer class=\"build-dock\"><div class=\"build-context\"><span id=\"build-context\">設備を選んで建設</span><button data-action=\"rotate\" aria-label=\"建設方向を回転\">↻ R</button><button data-action=\"cancel\">取消 Esc</button></div><nav class=\"build-palette\" aria-label=\"建設する設備\"></nav></footer>";
		let r = this.node(".build-palette");
		for (let e of h) {
			let n = t[e], i = document.createElement("button");
			i.type = "button", i.dataset.build = e, i.setAttribute("aria-pressed", "false");
			let a = this.costLabel(e);
			i.title = `${n.label} — ${_[e]} 建設費: ${a}`;
			let o = document.createElement("span");
			o.className = "build-icon", o.textContent = g[e], o.setAttribute("aria-hidden", "true");
			let s = document.createElement("span");
			s.className = "build-name", s.textContent = n.label;
			let c = document.createElement("small");
			c.className = "build-cost", c.textContent = a, i.append(o, s, c), r.append(i), this.buildButtons.set(e, i);
		}
		for (let e of [
			"wood",
			"ore",
			"ingot"
		]) this.resourceNodes.set(e, this.node(`[data-resource="${e}"]`));
		e.querySelectorAll("[data-speed]").forEach((e) => this.speedButtons.set(Number(e.dataset.speed), e)), e.addEventListener("click", (e) => this.handleClick(e), { signal: this.controller.signal }), this.node("#feed-form").addEventListener("submit", (e) => this.handleFeed(e), { signal: this.controller.signal });
		for (let t of [
			"pointerdown",
			"wheel",
			"contextmenu"
		]) e.addEventListener(t, (e) => e.stopPropagation(), { signal: this.controller.signal });
		e.addEventListener("keydown", (e) => {
			(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) && e.stopPropagation();
		}, { signal: this.controller.signal });
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
		let n = Object.entries(t[e].cost).map(([e, t]) => `${p[e]}${t}`);
		return n.length ? n.join("・") : "無料";
	}
	handleClick(e) {
		let t = e.target.closest("button");
		if (!t || !this.root.contains(t)) return;
		if (t.dataset.build) {
			this.callbacks.onBuild(t.dataset.build);
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
		else if (n === "camera") this.callbacks.onResetCamera();
		else if (n === "rotate") this.callbacks.onRotate();
		else if (n === "remove") this.callbacks.onRemove();
		else if (n === "collect") this.callbacks.onCollect();
		else if (n === "cancel") this.callbacks.onCancel();
		else if (n === "close-panel") {
			let e = this.node("#selection-panel").classList.toggle("is-collapsed");
			t.textContent = e ? "+" : "×", t.setAttribute("aria-label", e ? "設備詳細を開く" : "設備詳細を閉じる");
		}
	}
	handleFeed(e) {
		e.preventDefault();
		let t = this.node("#feed-resource").value, n = Number(this.node("#feed-amount").value);
		Number.isSafeInteger(n) && n > 0 && n <= 1e3 && this.callbacks.onFeed(t, n);
	}
	update(e, r) {
		for (let t of [
			"wood",
			"ore",
			"ingot"
		]) {
			let n = this.resourceNodes.get(t), r = String(e.inventory[t]);
			n.textContent !== r && (n.textContent = r);
		}
		this.text("#power-count", `${Math.floor(r.power.stored)} / ${r.power.capacity}`), this.text("#delivered-count", String(e.delivered)), this.node("#victory-message").hidden = !e.won, r.message && r.message !== this.lastMessage && (this.text("#game-message", r.message), this.lastMessage = r.message);
		for (let [e, t] of this.speedButtons) t.setAttribute("aria-pressed", String(e === r.speed));
		for (let [n, i] of this.buildButtons) {
			i.setAttribute("aria-pressed", String(n === r.kind));
			let a = e.kits[n] ?? 0, o = i.querySelector(".build-cost"), s = a > 0 ? `所持 ${a}台 / ${this.costLabel(n)}` : this.costLabel(n);
			o.textContent !== s && (o.textContent = s);
			let c = a > 0 || Object.entries(t[n].cost).every(([t, n]) => e.inventory[t] >= n);
			i.classList.toggle("unaffordable", !c), i.setAttribute("aria-label", `${t[n].label}、${s}${c ? "" : "、資源不足"}`);
		}
		this.text("#build-context", `${r.kind ? `${t[r.kind].label} · 出力 ${m[r.direction]}` : "設備を選んで建設"}${r.hover ? ` · (${r.hover.x}, ${r.hover.z})` : ""}`);
		let i = e.buildings.find((e) => e.id === r.selectedId), a = this.node("#selection-panel");
		if (!i) a.hidden = !0;
		else {
			if (r.selectedId !== this.lastSelected) {
				a.hidden = !1, a.classList.remove("is-collapsed");
				let e = this.node("[data-action=\"close-panel\"]");
				e.textContent = "×", e.setAttribute("aria-label", "設備詳細を閉じる");
				let t = this.node("#feed-resource");
				t.value = i.kind === "generator" ? "wood" : i.kind === "smelter" ? "ore" : "ingot";
			}
			this.text("#selection-title", `${t[i.kind].label} (${i.x}, ${i.z})`), this.text("#selection-description", _[i.kind]), this.text("#selection-status", i.status || (i.working ? "稼働中" : "待機中")), this.text("#selection-direction", `${m[i.direction]}${i.kind === "wire" || i.kind === "generator" ? " · 隣接へ魔力接続" : " · 入力は隣接から"}`);
			let e = {
				wood: 0,
				ore: 0,
				ingot: 0
			};
			[
				...i.input,
				...i.output,
				...i.item ? [i.item] : []
			].forEach((t) => e[t.resource]++), this.text("#selection-buffer", Object.entries(e).filter(([, e]) => e > 0).map(([e, t]) => `${p[e]} ${t}`).join("、") || "なし"), this.text("#selection-progress", i.kind === "belt" ? `${Math.round(i.beltProgress / n * 100)}%` : `${i.progress.toFixed(1)}秒${t[i.kind].seconds ? ` / ${t[i.kind].seconds}秒` : ""}`), this.text("#selection-power", `${Math.floor(i.energy)}${i.pendingEnergy ? ` · 内部完成 ${i.pendingEnergy}` : ""}`), this.node("#feed-form").hidden = ![
				"generator",
				"smelter",
				"delivery"
			].includes(i.kind);
		}
		this.lastSelected = r.selectedId;
	}
	dispose() {
		this.controller.abort(), this.root.replaceChildren();
	}
}, y = [
	"wood",
	"ore",
	"ingot"
], b = [
	"miner",
	"belt",
	"smelter",
	"generator",
	"wire",
	"lumber",
	"delivery"
], x = [
	"grass",
	"ore",
	"forest"
], S = "aigames-fantasy-automation", C = "saves", w = "workshop";
function T(e, t, n) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`${n}が正しくありません。`);
	let r = e;
	if (Object.keys(r).some((e) => !t.includes(e))) throw Error(`${n}に未対応の項目があります。`);
	return r;
}
function E(e, t, n = 2 ** 53 - 1, r = !0) {
	if (typeof e != "number" || !Number.isFinite(e) || e < 0 || e > n || r && !Number.isSafeInteger(e)) throw Error(`${t}の数値が正しくありません。`);
	return e;
}
function D(e, t) {
	if (typeof e != "boolean") throw Error(`${t}が正しくありません。`);
	return e;
}
function O(e) {
	let t = T(e, ["resource", "automated"], "搬送品");
	if (!y.includes(t.resource)) throw Error("保存された資源が未対応です。");
	return {
		resource: t.resource,
		automated: D(t.automated, "自動生産フラグ")
	};
}
function k(e, t) {
	if (!Array.isArray(e) || e.length > t) throw Error("設備バッファが正しくありません。");
	return e.map(O);
}
function A(e) {
	let r = T(e, [
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
	], "設備");
	if (!b.includes(r.kind)) throw Error("保存された設備が未対応です。");
	if (typeof r.status != "string" || r.status.length > 256) throw Error("設備の状態が正しくありません。");
	let i = E(r.id, "設備ID");
	if (i === 0) throw Error("設備IDが正しくありません。");
	let a = {
		id: i,
		kind: r.kind,
		x: E(r.x, "X座標", 31),
		z: E(r.z, "Z座標", 31),
		direction: E(r.direction, "方向", 3),
		input: k(r.input, 8),
		output: k(r.output, 4),
		progress: E(r.progress, "作業進捗", t[r.kind].seconds ?? 0, !1),
		working: D(r.working, "作業フラグ"),
		energy: E(r.energy, "魔力", 30, !1),
		status: r.status,
		item: r.item === null ? null : O(r.item),
		beltProgress: E(r.beltProgress, "搬送進捗", n, !1),
		...Object.hasOwn(r, "pendingEnergy") ? { pendingEnergy: E(r.pendingEnergy, "内部完成魔力", 30, !1) } : {}
	};
	return j(a), a;
}
function j(e) {
	let n = t[e.kind], r = n.input ?? {};
	if (e.kind === "belt") {
		if (e.input.length || e.output.length || e.progress || e.working || !e.item && e.beltProgress) throw Error("ベルトの搬送状態が正しくありません。");
	} else if (e.item !== null || e.beltProgress !== 0) throw Error("設備に未対応の搬送品があります。");
	if (e.kind !== "generator" && (e.energy !== 0 || e.pendingEnergy !== void 0)) throw Error("魔力を保持できない設備です。");
	if (!e.working && e.progress !== 0) throw Error("停止中の設備に作業進捗があります。");
	if (e.working && n.seconds === void 0) throw Error("この設備は生産作業できません。");
	if (e.input.some((e) => !Object.hasOwn(r, e.resource))) throw Error("設備の入力素材がレシピと一致しません。");
	let i = Object.keys(n.output ?? {});
	if (e.output.some((e) => !i.includes(e.resource))) throw Error("設備の完成品がレシピと一致しません。");
	if (e.working) {
		let t = Object.values(r).reduce((e, t) => e + (t ?? 0), 0), n = e.input.slice(0, t);
		for (let [e, t] of Object.entries(r)) if (n.filter((t) => t.resource === e).length !== t) throw Error("稼働中の設備に予約素材がありません。");
	}
	if ((e.pendingEnergy ?? 0) > 0 && (!e.working || e.progress !== n.seconds)) throw Error("完成魔力の待機状態が正しくありません。");
}
function M(e) {
	let t = T(e, [
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
	], "保存データ");
	if (t.version !== 1) throw Error("この保存形式には対応していません（対応: version 1）。");
	return t;
}
function N(e) {
	let t = M(e);
	if (!Array.isArray(t.terrain) || t.terrain.length !== 1024 || t.terrain.some((e) => !x.includes(e))) throw Error("保存された地形が正しくありません。");
	let n = T(t.inventory, y, "所持資源"), r = T(t.kits, b, "所持設備"), i = {};
	for (let e of b) Object.hasOwn(r, e) && (i[e] = E(r[e], "所持設備数"));
	if (!Array.isArray(t.buildings) || t.buildings.length > 1024) throw Error("設備一覧が正しくありません。");
	let a = t.buildings.map(A), o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
	for (let e of a) {
		let n = `${e.x},${e.z}`;
		if (o.has(e.id) || s.has(n)) throw Error("設備IDまたは配置が重複しています。");
		if (o.add(e.id), s.add(n), e.kind === "miner" && t.terrain[e.z * 32 + e.x] !== "ore" || e.kind === "lumber" && t.terrain[e.z * 32 + e.x] !== "forest") throw Error("設備と地形が一致していません。");
	}
	let c = E(t.nextId, "次の設備ID");
	if (c < 1 || a.some((e) => e.id >= c)) throw Error("次の設備IDが正しくありません。");
	let l = E(t.delivered, "自動納品数"), u = D(t.won, "クリアフラグ");
	if (u !== l >= 100) throw Error("納品数とクリア状態が一致していません。");
	return {
		version: 1,
		seed: E(t.seed, "地形シード"),
		tick: E(t.tick, "経過時間"),
		nextId: c,
		terrain: [...t.terrain],
		inventory: {
			wood: E(n.wood, "木材"),
			ore: E(n.ore, "鉄鉱石"),
			ingot: E(n.ingot, "鉄延べ棒")
		},
		kits: i,
		buildings: a,
		delivered: l,
		won: u
	};
}
var P = class {
	database = null;
	open() {
		return this.database ||= new Promise((e, t) => {
			if (typeof indexedDB > "u") {
				t(/* @__PURE__ */ Error("この環境では保存機能を利用できません。"));
				return;
			}
			let n = indexedDB.open(S, 1);
			n.onupgradeneeded = () => {
				n.result.objectStoreNames.contains(C) || n.result.createObjectStore(C);
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
			let a = n.transaction(C, e), o = t(a.objectStore(C)), s;
			o.onsuccess = () => {
				s = o.result;
			}, a.oncomplete = () => r(s), a.onerror = () => i(/* @__PURE__ */ Error("保存領域へのアクセスに失敗しました。")), a.onabort = () => i(/* @__PURE__ */ Error("保存処理が中断されました。"));
		});
	}
	async load() {
		let e = await this.transaction("readonly", (e) => e.get(w));
		return e === void 0 ? null : N(e);
	}
	async save(e) {
		let t = N(e);
		await this.transaction("readwrite", (e) => e.put(t, w));
	}
	async clear() {
		await this.transaction("readwrite", (e) => e.delete(w));
	}
}, F = class {
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
}, I = class {
	simulation = new u();
	save = new P();
	view = null;
	ui;
	loop;
	kind = null;
	direction = 1;
	selectedId = null;
	hover = null;
	speed = 1;
	previousSpeed = 1;
	message = "採掘機・魔導炉・魔力炉を設置し、ベルトと導線でつなぎましょう。";
	rendererMessage = "";
	removeMode = !1;
	last = 0;
	frame = 0;
	saveBusy = !1;
	uiTime = 0;
	constructor(e, t) {
		try {
			this.view = new f(e, {
				onPick: (e, t, n) => this.pick(e, t, n),
				onHover: (e, t) => {
					this.hover = {
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
		this.ui = new v(t, {
			onBuild: (e) => {
				this.kind = e, this.selectedId = null, this.removeMode = !1, this.message = "区画をクリックして建設。Rで向き変更、Escで取消。", this.sync();
			},
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
			onCollect: () => this.collect(),
			onCancel: () => this.cancel(),
			onResetCamera: () => this.view?.resetCamera(),
			onNew: () => {
				confirm("工房を最初から始めますか？ 保存枠は「保存」するまで残ります。") && this.init();
			}
		}), this.loop = new F({
			step: () => this.simulation.step(),
			render: () => this.render(),
			stepSeconds: .05,
			maxSteps: 40
		}), L(this), this.last = performance.now(), this.frame = requestAnimationFrame((e) => this.animate(e)), this.sync();
	}
	init() {
		this.simulation.init(), this.selectedId = null, this.kind = null, this.hover = null, this.direction = 1, this.removeMode = !1, this.xHeld = !1, this.previousSpeed = 1, this.speed = 1, this.loop.reset(), this.view?.resetCamera(), this.message = "新しい工房を開きました。初期設備は建設時にキットを使用します。", this.sync();
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
	collect() {
		this.selectedId !== null && (this.message = this.simulation.command({
			type: "collect",
			id: this.selectedId
		}).reason), this.sync();
	}
	pick(e, t, n) {
		if (n.type === "pointermove" && this.kind !== "belt" && !this.removeMode && !this.xHeld) return;
		let r = this.simulation.state.buildings.find((n) => n.x === e && n.z === t);
		(n.type !== "pointermove" || !r || this.removeMode || this.xHeld) && (n.shiftKey && r ? (this.kind = r.kind, this.direction = r.direction, this.selectedId = null, this.message = "同じ設備を選びました。空き区画へ建設できます。") : (this.removeMode || this.xHeld) && r ? (this.message = this.simulation.command({
			type: "remove",
			id: r.id
		}).reason, this.selectedId === r.id && (this.selectedId = null)) : this.kind && !r ? this.message = this.simulation.command({
			type: "build",
			kind: this.kind,
			x: e,
			z: t,
			direction: this.direction
		}).reason : (this.selectedId = r?.id ?? null, r && (this.kind = null)), this.sync());
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
				e ? (this.simulation.restore(e), this.loop.reset(), this.last = performance.now(), this.kind = null, this.selectedId = null, this.message = "保存した工房を再開しました。") : this.message = "保存データがありません。まず「保存」を押してください。";
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
		let e = !!this.kind && !!this.hover && this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction).ok;
		this.view?.render(this.simulation.state, {
			kind: this.kind,
			direction: this.direction,
			valid: e,
			hover: this.hover,
			selectedId: this.selectedId
		});
	}
	sync() {
		let e = [this.rendererMessage, this.message].filter(Boolean).join(" ");
		if (this.kind && this.hover) {
			let t = this.simulation.canBuild(this.kind, this.hover.x, this.hover.z, this.direction);
			if (!t.ok) e = t.reason;
			else {
				let [t, n] = i[this.direction], r = this.simulation.state.buildings.find((e) => e.x === this.hover.x + t && e.z === this.hover.z + n), a = this.hover.x + t >= 0 && this.hover.x + t < 32 && this.hover.z + n >= 0 && this.hover.z + n < 32;
				e += ` 出力 → ${a ? r ? "隣の設備" : "未接続（次にベルトを設置）" : "マップ外"}。`;
			}
		}
		this.ui.update(this.simulation.state, {
			kind: this.kind,
			direction: this.direction,
			selectedId: this.selectedId,
			speed: this.speed,
			power: this.simulation.powerSummary(),
			message: e,
			hover: this.hover
		});
	}
	key(e) {
		e.target instanceof Element && e.target.closest("input,select,textarea,button,[contenteditable=\"true\"]") || e.repeat && e.code !== "KeyX" || (e.code === "KeyX" && (this.xHeld = !0, this.message = "Xを押しながら施設をクリックして撤去。"), e.code === "KeyR" && this.rotate(), e.code === "Escape" && this.cancel(), e.code === "Space" && (e.preventDefault(), this.togglePause()));
	}
};
function L(e) {
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
var R = document.querySelector("#world"), z = document.querySelector("#game-ui");
R && z && new I(R, z);
//#endregion
