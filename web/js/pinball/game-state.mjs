/** Rules are independent of renderer and physics engine. */
export class PinballGameState {
  constructor() { this.restart(); }
  restart() {
    this.rollovers = [false, false, false]; this.rolloverSets = 0;
    this.kickbackCharges = 1; this.kickbackUses = 0; this.eventIds = new Set();
    this.score = 0; this.ballNumber = 1; this.phase = "ready"; this.returnedShooter = false;
    this.lastEvent = "発射してスタート"; this.resumePhase = "ready";
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
    if (this.phase !== "playing") return;
    this.score += points; this.lastEvent = label + " +" + points;
  }
  /** Events are emitted once per physical contact/traversal, never per frame. */
  onEvent(event) {
    if (this.phase !== "playing" || !event || !event.id || this.eventIds.has(event.id)) return false;
    const points = { bumper: 100, sling: 25, target: 50, bank: 75, spinner: 150 };
    if (!(event.type in points) && !["rollover", "kickback"].includes(event.type)) return false;
    if (event.type === "rollover" && (!Number.isInteger(event.lane) || event.lane < 0 || event.lane > 2)) return false;
    this.eventIds.add(event.id);
    if (event.type === "kickback") {
      if (!this.kickbackCharges) return false;
      this.kickbackCharges = 0; this.kickbackUses++; this.lastEvent = "CENTER SAVE"; return true;
    }
    if (event.type === "rollover") {
      if (this.rollovers[event.lane]) return false;
      this.rollovers[event.lane] = true; this.award(100, "LANE " + (event.lane + 1));
      if (this.rollovers.every(Boolean)) {
        this.rolloverSets++; this.kickbackCharges = 1; this.rollovers.fill(false);
        this.award(500, "LANES COMPLETE · CENTER SAVE READY");
      }
      return true;
    }
    this.award(points[event.type], event.type.toUpperCase()); return true;
  }
  drain() {
    if (this.phase !== "playing") return false;
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
