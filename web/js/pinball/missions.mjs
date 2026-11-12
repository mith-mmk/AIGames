const MISSIONS = Object.freeze([
  { id: "charge", title: "動力をためる", description: "上部または左ポケットのバンパーに3回当てる", types: ["bumper"], target: 3, bonus: 500 },
  { id: "workshop", title: "サイドを点検", description: "左右のターゲット・バンクに合計4回当てる → 左アウトレーン救済1回", types: ["target", "bank"], target: 4, bonus: 750 },
  { id: "spin", title: "回転機を起動", description: "スピナーを2回通す", types: ["spinner"], target: 2, bonus: 1000 },
  { id: "lanes", title: "配線をつなぐ", description: "上部の3本のレーンをそれぞれ通す", types: ["rollover"], target: 3, bonus: 1250 },
  { id: "ramp", title: "最終試運転", description: "右ランプを入口から出口まで1回通す", types: ["ramp"], target: 1, bonus: 2000 },
]);

/** One bounded mission sequence per game. The game state validates/deduplicates events. */
export class PinballMissions {
  constructor() { this.restart(); }
  restart() { this.index = 0; this.progress = 0; this.lanes = new Set(); }
  get snapshot() {
    const mission = MISSIONS[this.index];
    if (!mission) return {
      id: "complete", title: "全ミッション達成", description: "引き続きハイスコアを狙おう",
      progress: MISSIONS.length, target: MISSIONS.length, bonus: 0,
      index: MISSIONS.length, total: MISSIONS.length, completed: MISSIONS.length, allComplete: true,
    };
    const { id, title, description, target, bonus } = mission;
    return { id, title, description, target, bonus, progress: this.progress,
      index: this.index + 1, total: MISSIONS.length, completed: this.index, allComplete: false };
  }
  onEvent(event) {
    const mission = MISSIONS[this.index];
    if (!mission || !mission.types.includes(event.type)) return null;
    if (mission.id === "lanes") {
      if (!Number.isInteger(event.lane) || event.lane < 0 || event.lane > 2 || this.lanes.has(event.lane)) return null;
      this.lanes.add(event.lane);
    }
    this.progress++;
    if (this.progress < mission.target) return null;
    this.index++; this.progress = 0; this.lanes.clear();
    return { id: mission.id, title: mission.title, bonus: mission.bonus };
  }
}
