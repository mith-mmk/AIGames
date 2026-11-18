/** Two real attacks: spinner/front-pop UPGRADE, or a bat-driven deep B run. */
export class UpperShotChallenge {
  constructor() { this.time = 0; this.completions = 0; this.resetRun(); }
  resetRun() { this.spinnerAt = -Infinity; this.batAt = -Infinity; }
  armBat() { this.resetRun(); this.batAt = this.time; }
  advanceTime(dt) { this.time += dt; }
  onEvent(event) {
    if (event.type === 'spinner') {
      if (!event.forward) this.resetRun();
      else this.spinnerAt = this.time;
      return false;
    }
    const spinnerAge = this.time - this.spinnerAt;
    if (event.type === 'bumper') {
      this.spinnerAt = -Infinity;
      if (event.part === 'b2' && event.front && event.forward && spinnerAge >= 1/120-1e-9 && spinnerAge <= 1.6) {
        this.resetRun(); this.completions++; return 'upgrade';
      }
      // A real deep shot may rebound through the pop nest. No boosts or
      // synthetic lane events: only the eventual forward B switch can pay.
      return false;
    }
    if (event.type === 'rollover') {
      this.spinnerAt = -Infinity;
      if (!event.forward) { this.resetRun(); return false; }
      if (event.lane !== 1) return false;
      const age=this.time-this.batAt; this.resetRun();
      if (age < 1/120-1e-9 || age > 3) return false;
      this.completions++; return 'drive';
    }
    if (['bank','target','sling','ramp','loop','scoop','inlane','kickback','side-save','easy-out-save'].includes(event.type)) this.resetRun();
    return false;
  }
}
