(function () {
    "use strict";

    const MELODIES = {
        room: [523, 659, 784, 659, 587, 659, 523, 0],
        garden: [587, 740, 880, 740, 659, 587, 494, 0],
        wall: [659, 784, 880, 988, 880, 784, 659, 0],
        town: [523, 587, 659, 784, 698, 659, 587, 0],
        sunset: [440, 523, 659, 784, 659, 523, 440, 0],
        night: [392, 494, 587, 494, 440, 392, 330, 0],
    };

    class BlackCatAudio {
        constructor() {
            this.context = null;
            this.timer = 0;
            this.enabled = true;
            this.music = "room";
            this.step = 0;
        }

        ensureContext() {
            if (!this.enabled || this.context) {
                return this.context;
            }
            const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
            if (!AudioContextClass) {
                this.enabled = false;
                return null;
            }
            this.context = new AudioContextClass();
            return this.context;
        }

        setMusic(name) {
            this.music = MELODIES[name] ? name : "room";
            this.step = 0;
        }

        playTone(frequency, duration = 0.08, type = "sine", volume = 0.035) {
            const context = this.ensureContext();
            if (!context || !frequency) {
                return;
            }
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + duration + 0.02);
        }

        tick(dt) {
            if (!this.enabled) {
                return;
            }
            this.timer -= dt;
            if (this.timer > 0) {
                return;
            }
            const melody = MELODIES[this.music] || MELODIES.room;
            this.playTone(melody[this.step % melody.length], 0.16, "triangle", 0.018);
            this.step += 1;
            this.timer = 0.34;
        }

        sfx(name) {
            const map = {
                start: [660, 0.1, "triangle"],
                jump: [880, 0.08, "sine"],
                item: [1046, 0.07, "triangle"],
                rare: [1318, 0.14, "triangle"],
                surprise: [220, 0.12, "sawtooth"],
                reset: [330, 0.18, "sine"],
            };
            const spec = map[name];
            if (spec) {
                this.playTone(spec[0], spec[1], spec[2], name === "surprise" ? 0.026 : 0.04);
            }
        }
    }

    globalThis.BlackCatAudio = BlackCatAudio;
}());
