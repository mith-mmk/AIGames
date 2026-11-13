// Short synthesized cabinet sounds. No samples, music, timers or autoplay.
const EFFECTS = {
  launch: [110, 38, .19, .65, 'triangle'],
  flipper: [180, 65, .065, .45, 'triangle'],
  bumper: [760, 310, .16, .55, 'sine'],
  sling: [310, 85, .10, .5, 'triangle'],
  target: [1300, 750, .105, .38, 'sine'],
  mission: [660, 1320, .40, .4, 'sine'],
  multiplier: [880, 1760, .28, .36, 'sine'],
  tilt: [110, 75, .32, .45, 'triangle'],
  drain: [250, 60, .25, .45, 'triangle'],
  gameover: [330, 82, .55, .4, 'sine'],
};
const GESTURES = new Set(['pointerdown', 'pointerup', 'keydown', 'click', 'touchend']);
const STORAGE_KEY = 'ai-games-pinball-muted';

export class PinballSound {
  constructor({ contextFactory, storage, maxVoices = 8 } = {}) {
    this.contextFactory = contextFactory ?? (() => {
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      return AudioContext ? new AudioContext() : null;
    });
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; }
    try { this.muted = this.storage?.getItem(STORAGE_KEY) === 'true'; } catch { this.muted = false; }
    this.paused = false;
    this.disposed = false;
    this.unlocked = false;
    this.context = null;
    this.master = null;
    this.voices = new Set();
    this.lastPlayed = new Map();
    this.maxVoices = Math.max(1, Math.min(12, Math.floor(maxVoices) || 8));
  }

  // Invoke synchronously from a browser input handler, not from an animation frame.
  async unlock(event) {
    if (this.disposed || !event?.isTrusted || !GESTURES.has(event.type) || this.muted || this.paused) return false;
    try {
      if (!this.context) {
        const context = this.contextFactory();
        if (!context) return false;
        this.context = context;
        this.master = context.createGain();
        this.master.gain.value = .13;
        this.master.connect(context.destination);
      }
      if (this.context.state !== 'running') await this.context.resume();
      // A pending resume may resolve after mute/pause/dispose.
      if (this.disposed || this.muted || this.paused) {
        if (!this.disposed) this.suspend();
        return false;
      }
      this.unlocked = this.context.state === 'running';
      return this.unlocked;
    } catch { return false; }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try { this.storage?.setItem(STORAGE_KEY, String(this.muted)); } catch { /* Private browsing/storage full. */ }
    if (this.muted) { this.unlocked = false; this.stop(); this.suspend(); }
    // Unmute deliberately needs a fresh gesture unlock, never auto-resume.
    return this.muted;
  }

  toggleMuted() { return this.setMuted(!this.muted); }

  setPaused(paused) {
    if(this.paused===Boolean(paused))return;
    this.paused = Boolean(paused);
    if (this.paused) { this.unlocked = false; this.stop(); this.suspend(); }
  }

  suspend() {
    try { Promise.resolve(this.context?.suspend()).catch(() => {}); } catch { /* Unsupported/closed context. */ }
  }

  play(name, intensity = 1) {
    const effect = EFFECTS[name];
    const context = this.context;
    if (!effect || this.disposed || !this.unlocked || this.muted || this.paused || context?.state !== 'running' || !this.master) return false;
    const now = context.currentTime;
    const interval = name === 'flipper' ? .045 : .07;
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < interval || this.voices.size >= this.maxVoices) return false;
    const [from, to, duration, volume, type] = effect;
    const strength = Number.isFinite(intensity) ? Math.max(.1, Math.min(1, intensity)) : 1;
    const voice = { source: null, gain: null };
    try {
      voice.source = context.createOscillator();
      voice.gain = context.createGain();
      voice.source.type = type;
      voice.source.frequency.setValueAtTime(from, now);
      voice.source.frequency.exponentialRampToValueAtTime(to, now + duration);
      voice.gain.gain.setValueAtTime(.0001, now);
      voice.gain.gain.linearRampToValueAtTime(volume * strength, now + .003);
      voice.gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      voice.source.connect(voice.gain);
      voice.gain.connect(this.master);
      voice.source.onended = () => this.release(voice);
      this.voices.add(voice);
      voice.source.start(now);
      voice.source.stop(now + duration + .01);
      this.lastPlayed.set(name, now);
      return true;
    } catch { this.release(voice, true); return false; }
  }

  release(voice, stop = false) {
    if (voice.source) {
      voice.source.onended = null;
      if (stop) { try { voice.source.stop(); } catch { /* Already stopped. */ } }
      try { voice.source.disconnect(); } catch { /* Already disconnected. */ }
    }
    try { voice.gain?.disconnect(); } catch { /* Already disconnected. */ }
    this.voices.delete(voice);
  }

  stop() {
    for (const voice of this.voices) this.release(voice, true);
    this.lastPlayed.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    try { this.master?.disconnect(); } catch { /* Already disconnected. */ }
    try { Promise.resolve(this.context?.close()).catch(() => {}); } catch { /* Unsupported/closed context. */ }
    this.master = null;
  }
}
