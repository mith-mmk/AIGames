import { PinballMissions, PinballMultiplierMission } from "./missions.mjs";

/** Rules are independent of renderer and physics engine. */
export class PinballGameState {
  constructor() { this.restart(); }
  restart() {
    this.missions = new PinballMissions();
    this.multiplierChallenge = new PinballMultiplierMission(); this.lastContactAward = null;
    this.rollovers = [false, false, false]; this.rolloverSets = 0;
    this.kickbackCharges = 1; this.kickbackUses = 0; this.eventIds = new Set();
    this.sideSaveCharges = 0; this.sideSaveUses = 0;
    this.tilted=false;this.score = 0; this.lastAward = null; this.ballNumber = 1; this.phase = "ready"; this.returnedShooter = false;
    this.lastEvent = "発射してスタート"; this.resumePhase = "ready";
  }
  get mission() { return this.missions.snapshot; }
  get multiplier() { return this.multiplierChallenge.multiplier; }
  get multiplierMission() { return this.multiplierChallenge.snapshot; }
  get tilted() { return this._tilted; }
  set tilted(value) {
    this._tilted = Boolean(value);
    if (this._tilted) this.multiplierChallenge.restart();
  }
  awardContact(points, label) {
    if (this.phase !== "playing" || this.tilted) return;
    const multiplier = this.multiplier;
    this.award(points * multiplier, label);
    this.lastContactAward = { ...this.lastAward, basePoints: points, multiplier };
  }
  advanceChallenges(event) {
    this.advanceMission(event);
    if (this.multiplierChallenge.onEvent(event)) this.lastEvent += " · MULTIPLIER ×" + this.multiplier;
  }
  advanceMission(event) {
    const completed = this.missions.onEvent(event);
    if (completed) {
      if (completed.id === "workshop") this.sideSaveCharges = 1;
      this.award(completed.bonus, "MISSION CLEAR · " + completed.title + (completed.id === "workshop" ? " · LEFT SAVE READY" : ""));
    }
  }
  launch() {
    if (this.phase !== "ready") return false;
    this.returnedShooter = false; this.phase = "playing"; this.lastEvent = "BALL " + this.ballNumber; return true;
  }
  returnToShooter() {
    if (this.phase !== "playing") return false;
    this.returnedShooter = true; this.phase = "ready";
    this.lastEvent = "発射レーンへ戻りました · 同じ球を再発射"; return true;
  }
  award(points, label) {
    if (this.phase !== "playing" || this.tilted) return;
    this.score += points; this.lastEvent = label + " +" + points; this.lastAward={points,label,score:this.score};
  }
  /** Events are emitted once per physical contact/traversal, never per frame. */
  onEvent(event) {
    if (this.phase !== "playing" || this.tilted || !event || !event.id || this.eventIds.has(event.id)) return false;
    const points = { bumper: 100, sling: 25, target: 50, bank: 75, spinner: 150, ramp: 300, inlane: 100 };
    if (!Object.hasOwn(points, event.type) && !["rollover", "kickback", "side-save"].includes(event.type)) return false;
    if (event.type === "rollover" && (!Number.isInteger(event.lane) || event.lane < 0 || event.lane > 2)) return false;
    this.eventIds.add(event.id);
    if (event.type === "side-save") {
      if (!this.sideSaveCharges) return false;
      this.sideSaveCharges = 0; this.sideSaveUses++; this.lastEvent = "LEFT SAVE"; return true;
    }
    if (event.type === "kickback") {
      if (!this.kickbackCharges) return false;
      this.kickbackCharges = 0; this.kickbackUses++; this.lastEvent = "CENTER SAVE"; return true;
    }
    if (event.type === "rollover") {
      if (this.rollovers[event.lane]) { this.awardContact(100,"LANE " + (event.lane+1)); this.advanceChallenges(event); return true; }
      this.rollovers[event.lane] = true; this.awardContact(100, "LANE " + (event.lane + 1));
      if (this.rollovers.every(Boolean)) {
        this.rolloverSets++; this.kickbackCharges = 1; this.rollovers.fill(false);
        this.award(500, "LANES COMPLETE · CENTER SAVE READY");
      }
      this.advanceChallenges(event); return true;
    }
    this.awardContact(points[event.type], event.type.toUpperCase()); this.advanceChallenges(event); return true;
  }
  drain() {
    if (this.phase !== "playing") return false;
    this.multiplierChallenge.restart();
    this.returnedShooter = false;
    if (this.ballNumber >= 3) { this.phase = "gameover"; this.lastEvent = "GAME OVER"; }
    else { this.ballNumber++; this.phase = "ready"; this.lastEvent = "次の球を発射"; }
    return true;
  }
  setPaused(value) {
    if (value && ["ready", "playing"].includes(this.phase)) { this.resumePhase = this.phase; this.phase = "paused"; }
    else if (!value && this.phase === "paused") this.phase = this.resumePhase;
  }
}
