import { PinballMissions, PinballMultiplierMission, PinballScoopChallenge } from "./missions.mjs";

/** Rules are independent of renderer and physics engine. */
export class PinballGameState {
  constructor({ difficulty = "standard" } = {}) {
    if (!["standard", "relaxed"].includes(difficulty)) throw new TypeError("Unknown pinball difficulty");
    this.difficulty = difficulty;
    this.restart();
  }
  restart() {
    this.missions = new PinballMissions();
    this.scoopChallenge = new PinballScoopChallenge(); this.skillShots = 0;
    this.multiplierChallenge = new PinballMultiplierMission(); this.lastContactAward = null;
    this.rollovers = [false, false, false]; this.rolloverSets = 0;
    this.kickbackCharges = 1; this.kickbackUses = 0; this.eventIds = new Set();
    this.sideSaveCharges = 0; this.sideSaveUses = 0;
    this.tilted=false;this.score = 0; this.lastAward = null; this.ballNumber = 1; this.phase = "ready"; this.returnedShooter = false;
    this.lastEvent = "発射してスタート"; this.resumePhase = "ready";
    this.ballSaveUses = 0;
    this.prepareNumberedBall();
  }
  prepareNumberedBall() {
    this.ballLaunched = false; this.ballSaved = false;
    this.skillShotAvailable = true;
    this.ballSaveRemaining = 0;
    this.ballSaveAvailable = this.difficulty === "relaxed";
    if (this.difficulty === "relaxed") this.kickbackCharges = 1;
  }
  get ballSaveActive() {
    return this.phase === "playing" && !this.tilted && this.ballSaveAvailable && this.ballSaveRemaining > 1e-9;
  }
  advanceTime(dt) {
    if (this.difficulty === "relaxed" && this.phase === "playing" && Number.isFinite(dt) && dt > 0) {
      this.ballSaveRemaining = Math.max(0, this.ballSaveRemaining - dt);
      if (this.ballSaveRemaining < 1e-9) this.ballSaveRemaining = 0;
    }
  }
  get scoop() { return this.scoopChallenge.snapshot; }
  get mission() { return this.missions.snapshot; }
  get missionOptions() { return this.missions.options; }
  get canSelectMission() {
    return this.phase === "ready" && !this.returnedShooter && !this.tilted && !this.mission.allComplete;
  }
  selectMission(id) {
    if (!this.canSelectMission || !this.missions.select(id)) return false;
    this.lastEvent = "MISSION SELECT · " + this.mission.title;
    return true;
  }
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
    this.ballSaved = false;
    if (!this.ballLaunched) {
      this.ballLaunched = true;
      this.ballSaveRemaining = this.difficulty === "relaxed" ? 10 : 0;
    }
    this.returnedShooter = false; this.phase = "playing"; this.lastEvent = "BALL " + this.ballNumber; return true;
  }
  returnToShooter() {
    if (this.phase !== "playing") return false;
    this.skillShotAvailable = false;
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
    const points = { bumper: 100, sling: 25, target: 50, bank: 75, spinner: 150, ramp: 300, loop: 300, inlane: 100 };
    if (!Object.hasOwn(points, event.type) && !["rollover", "kickback", "side-save", "scoop", "skill-shot"].includes(event.type)) return false;
    if (event.type === "rollover" && (!Number.isInteger(event.lane) || event.lane < 0 || event.lane > 2)) return false;
    if (event.type === "skill-shot" && !this.skillShotAvailable) return false;
    this.eventIds.add(event.id);
    if (event.type === "skill-shot") {
      this.skillShotAvailable = false; this.skillShots++;
      this.award(500, "SKILL SHOT"); return true;
    }
    if (event.type === "scoop") {
      const result = this.scoopChallenge.capture();
      if (result.lit) this.sideSaveCharges = 1;
      this.award(result.points, result.lit ? "COLLECTOR CLEAR · LEFT SAVE READY" : "COLLECTOR");
      return true;
    }
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
    this.awardContact(points[event.type], event.type === "loop" ? "LEFT LOOP" : event.type.toUpperCase()); this.advanceChallenges(event);
    if (this.scoopChallenge.onTarget(event)) this.lastEvent += " · COLLECTOR READY";
    return true;
  }
  drain({ reason = "normal" } = {}) {
    if (this.phase !== "playing") return false;
    this.ballSaved = false; this.skillShotAvailable = false;
    // A saved drain still ends the multiplier run; scores and missions remain.
    this.multiplierChallenge.restart();
    this.returnedShooter = false;
    if (reason === "normal" && this.ballSaveActive) {
      this.ballSaveAvailable = false; this.ballSaveRemaining = 0; this.ballSaveUses++; this.ballSaved = true;
      this.phase = "ready"; this.lastEvent = "BALL SAVE · 同じ球を再発射（倍率リセット）";
      return true;
    }
    if (this.ballNumber >= 3) { this.phase = "gameover"; this.lastEvent = "GAME OVER"; }
    else { this.ballNumber++; this.prepareNumberedBall(); this.phase = "ready"; this.lastEvent = "次の球を発射"; }
    return true;
  }
  setPaused(value) {
    if (value && ["ready", "playing"].includes(this.phase)) { this.resumePhase = this.phase; this.phase = "paused"; }
    else if (!value && this.phase === "paused") this.phase = this.resumePhase;
  }
}
