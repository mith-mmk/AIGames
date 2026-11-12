/** Rules are independent of renderer and physics engine. */
export class PinballGameState {
  constructor() { this.restart(); }
  restart() {
    this.score = 0; this.ballNumber = 1; this.phase = "ready";
    this.lastEvent = "発射してスタート"; this.resumePhase = "ready";
  }
  launch() {
    if (this.phase !== "ready") return false;
    this.phase = "playing"; this.lastEvent = "BALL " + this.ballNumber; return true;
  }
  award(points, label) {
    if (this.phase !== "playing") return;
    this.score += points; this.lastEvent = label + " +" + points;
  }
  drain() {
    if (this.phase !== "playing") return false;
    if (this.ballNumber >= 3) { this.phase = "gameover"; this.lastEvent = "GAME OVER"; }
    else { this.ballNumber++; this.phase = "ready"; this.lastEvent = "次の球を発射"; }
    return true;
  }
  setPaused(value) {
    if (value && ["ready", "playing"].includes(this.phase)) { this.resumePhase = this.phase; this.phase = "paused"; }
    else if (!value && this.phase === "paused") this.phase = this.resumePhase;
  }
}
