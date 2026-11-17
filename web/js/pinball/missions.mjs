const MISSIONS = Object.freeze([
  { id: "charge", title: "動力をためる", description: "上部のポップバンパーに3回当てる", types: ["bumper"], target: 3, bonus: 500 },
  { id: "workshop", title: "サイドを点検", description: "左右のターゲット・バンクに合計4回当てる → 左アウトレーン救済1回", types: ["target", "bank"], target: 4, bonus: 750 },
  { id: "spin", title: "回転機を起動", description: "スピナーを2回通す", types: ["spinner"], target: 2, bonus: 1000 },
  { id: "lanes", title: "配線をつなぐ", description: "上部の3本のレーンをそれぞれ通す", types: ["rollover"], target: 3, bonus: 1250 },
  { id: "ramp", title: "最終試運転", description: "右ランプを入口から出口まで1回通す", types: ["ramp"], target: 1, bonus: 2000 },
]);

/** Selectable missions with per-game progress. The game state owns phase gating. */
export class PinballMissions {
  constructor() { this.restart(); }
  restart() {
    this.index = 0;
    this.records = MISSIONS.map(() => ({ progress: 0, completed: false, lanes: new Set() }));
  }
  get completed() { return this.records.filter(record => record.completed).length; }
  get options() {
    return MISSIONS.map(({ id, title, description, target, bonus }, index) => ({
      id, title, description, target, bonus, progress: this.records[index].progress,
      completed: this.records[index].completed, selected: index === this.index,
    }));
  }
  select(id) {
    const index = MISSIONS.findIndex(mission => mission.id === id);
    if (index < 0 || this.records[index].completed) return false;
    this.index = index;
    return true;
  }
  get snapshot() {
    const mission = MISSIONS[this.index];
    if (!mission) return {
      id: "complete", title: "全ミッション達成", description: "引き続きハイスコアを狙おう",
      progress: MISSIONS.length, target: MISSIONS.length, bonus: 0,
      index: MISSIONS.length, total: MISSIONS.length, completed: MISSIONS.length, allComplete: true,
    };
    const { id, title, description, target, bonus } = mission;
    return { id, title, description, target, bonus, progress: this.records[this.index].progress,
      index: this.index + 1, total: MISSIONS.length, completed: this.completed, allComplete: false };
  }
  onEvent(event) {
    const mission = MISSIONS[this.index];
    if (!mission || !mission.types.includes(event.type)) return null;
    const record = this.records[this.index];
    if (record.completed) return null;
    if (mission.id === "lanes") {
      if (!Number.isInteger(event.lane) || event.lane < 0 || event.lane > 2 || record.lanes.has(event.lane)) return null;
      record.lanes.add(event.lane);
    }
    record.progress++;
    if (record.progress < mission.target) return null;
    record.completed = true;
    const next = this.records.findIndex(item => !item.completed);
    this.index = next < 0 ? MISSIONS.length : next;
    return { id: mission.id, title: mission.title, bonus: mission.bonus };
  }
}

/** Two parallel-to-story challenges per ball: accessible hits, then varied shots. */
export class PinballMultiplierMission {
  constructor() { this.restart(); }
  restart() { this.multiplier = 1; this.hits = 0; this.mechanisms = new Set(); }
  get snapshot() {
    const allComplete = this.multiplier === 3;
    return {
      title: allComplete ? "倍率チャレンジ達成" : this.multiplier === 1 ? "バンパーで×2" : "多彩なショットで×3",
      description: allComplete ? "この球の接触得点は×3 · 落球・TILTで×1" : this.multiplier === 1 ? "バンパーに5回当てる → 次の接触から×2" : "バンパー・サイド・スピナー・ランプ・レーンのうち3種類に当てる → 次の接触から×3",
      progress: allComplete ? 3 : this.multiplier === 1 ? this.hits : this.mechanisms.size,
      target: this.multiplier === 1 ? 5 : 3, mechanisms: [...this.mechanisms],
      multiplier: this.multiplier, nextMultiplier: Math.min(3, this.multiplier + 1),
      maxMultiplier: 3, allComplete,
    };
  }
  onEvent(event) {
    if (this.multiplier === 3) return false;
    if (this.multiplier === 1) {
      if (event.type !== "bumper") return false;
      this.hits++;
      if (this.hits < 5) return false;
      this.multiplier = 2; return true;
    }
    const groups = { bumper: "bumper", bank: "side", target: "side", spinner: "spinner", ramp: "ramp", inlane: "lane", rollover: "lane" };
    if (!Object.hasOwn(groups, event.type)) return false;
    this.mechanisms.add(groups[event.type]);
    if (this.mechanisms.size < 3) return false;
    this.multiplier = 3; return true;
  }
}

/** A repeatable physical target bank arms the workshop collector. */
export class PinballScoopChallenge {
  constructor() { this.restart(); }
  restart() { this.targets = [false, false, false]; this.captures = 0; this.collections = 0; }
  get snapshot() {
    const progress = this.targets.filter(Boolean).length;
    return { targets: [...this.targets], progress, target: 3, lit: progress === 3,
      captures: this.captures, collections: this.collections, reward: 1000 };
  }
  onTarget(event) {
    if (!["bank", "target"].includes(event.type)) return false;
    const index = ["right-side:0", "right-side:1", "right-side:2"].indexOf(event.targetId);
    if (index < 0 || this.targets[index]) return false;
    this.targets[index] = true;
    return this.targets.every(Boolean);
  }
  capture() {
    this.captures++;
    const lit = this.targets.every(Boolean);
    if (lit) { this.collections++; this.targets.fill(false); }
    return { lit, points: lit ? 1000 : 150 };
  }
}
