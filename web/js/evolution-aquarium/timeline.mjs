import { HISTORY_INTERVAL, TRAIT_BINS, TRAITS, preferredTemperature } from "./core.mjs";

const PALETTE = [[16, 42, 55], [29, 101, 106], [39, 161, 154], [92, 214, 176], [213, 255, 183]];
const MISSING = "#343d4a";
const clock = time => Number.isInteger(time) ? String(time) : time.toFixed(1);
const share = (count, total) => total ? Math.round(count * 1000 / total) / 10 + "%" : "—";
const axisHint = {
    size: "小型 → 大型", speed: "弱い → 強い", vision: "狭い → 広い", metabolism: "弱い → 強い",
    temp: "個体ごとの適温（℃）。設定水温そのものではありません。",
    depth: "浅瀬寄り → 深場寄り", hue: "色相（°）。0°と360°はともに赤で、輪の上では隣り合います。",
    pattern: "薄い → 濃い",
};

export function densityColor(fraction) {
    const pos = Math.min(1, Math.max(0, fraction)) * (PALETTE.length - 1);
    const from = Math.min(PALETTE.length - 2, Math.floor(pos));
    const mix = pos - from;
    const channels = PALETTE[from].map((color, i) => Math.round(color + (PALETTE[from + 1][i] - color) * mix));
    return "rgb(" + channels.join(",") + ")";
}

function traitTick(key, value, withUnit = false) {
    if (key === "temp") {
        return Number(preferredTemperature(value).toFixed(1)) + (withUnit ? "℃" : "");
    }
    if (key === "hue") return Math.round(value * 360) + "°";
    return Math.round(value * 100) + "%";
}

export function nearestSample(history, time) {
    if (history.length === 0) return -1;
    let lo = 0;
    let hi = history.length - 1;
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (history[mid].time < time) lo = mid + 1;
        else hi = mid;
    }
    if (lo > 0 && time - history[lo - 1].time < history[lo].time - time) return lo - 1;
    return lo;
}

/* Distribution history uses immutable snapshots; camera/render speed do not affect sampling. */
export class TraitTimeline {
    constructor(elements) {
        Object.assign(this, elements);
        this.ctx = this.canvas.getContext("2d");
        this.reset();
        this.scrub.addEventListener("input", () => this.select(Number(this.scrub.value)));
        this.latest.addEventListener("click", () => {
            this.focusTime = null;
            this.redraw();
        });
        this.canvas.addEventListener("click", event => {
            if (!this.plot) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const { left, width, height, top, first, span, end } = this.plot;
            const time = first + (x - left) / width * span;
            if (y < top || y > top + height || x < left || time > end) return;
            // The color fills from its sample up to the next recorded observation.
            const index = nearestSample(this.history, time);
            this.select(this.history[index].time > time && index > 0 ? index - 1 : index);
        });
    }

    reset() {
        this.history = null;
        this.key = null;
        this.last = null;
        this.focusTime = null;
        this.plot = null;
        this.selection = null;
    }

    select(index) {
        const sample = this.history?.[index];
        if (!sample) return;
        this.focusTime = sample.time === this.history.at(-1).time ? null : sample.time;
        this.redraw();
    }

    render(history, key) {
        if (!history.length || !Object.hasOwn(TRAITS, key)) return;
        const last = history.at(-1);
        if (last === this.last && key === this.key) return;
        this.history = history;
        this.key = key;
        this.last = last;
        this.redraw();
    }

    redraw() {
        if (!this.history?.length) return;
        const { history, key } = this;
        const first = history[0].time;
        if (this.focusTime !== null && this.focusTime < first) this.focusTime = first;
        const selected = this.focusTime === null ? history.length - 1 : nearestSample(history, this.focusTime);
        const sample = history[selected];
        this.scrub.max = String(history.length - 1);
        this.scrub.value = String(selected);
        this.scrub.disabled = history.length < 2;
        this.latest.disabled = this.focusTime === null;
        this.scrub.setAttribute("aria-valuetext", clock(sample.time) + " 秒");
        this.axis.textContent = "縦軸：" + TRAITS[key] + " · " + axisHint[key];
        this.canvas.setAttribute("aria-label", `${TRAITS[key]}の分布、${clock(first)}秒から${clock(this.last.time)}秒まで。時点を選ぶと割合を数値でも確認できます。`);
        // Resize and follow-latest redraw the plot without rebuilding unchanged detail DOM.
        if (this.selection?.sample !== sample || this.selection?.key !== key) {
            this.selection = { sample, key };
            this.showSample(sample, key);
        }
        if (this.ctx) this.drawPlot(selected);
    }

    showSample(sample, key) {
        const counts = sample.histograms[key];
        let peak = 0;
        for (let i = 1; i < TRAIT_BINS; i += 1) if (counts[i] > counts[peak]) peak = i;
        const label = `${clock(sample.time)} 秒 · ${sample.count} 匹 · G${String(sample.generation).padStart(2, "0")}`;
        const range = i => traitTick(key, i / TRAIT_BINS, true) + "〜" + traitTick(key, (i + 1) / TRAIT_BINS, true);
        this.detail.textContent = sample.count ? label + " · 最も多い区間 " + range(peak) + "（" + share(counts[peak], sample.count) + "）" :
            label + " · 個体がいないため割合はありません。";
        this.values.replaceChildren(...Array.from(counts, (count, i) => {
            const item = document.createElement("li");
            item.textContent = range(i) + "：" + count + " 匹（" + share(count, sample.count) + "）";
            return item;
        }));
    }

    drawPlot(selected) {
        const { ctx, canvas, history, key, last } = this;
        const { width: cw, height: ch } = this.sizeCanvas(canvas, ctx);
        if (cw < 100 || ch < 80) return;
        const left = 44, top = 10, width = cw - left - 12, height = ch - top - 38;
        const start = history[0].time;
        const end = last.time + HISTORY_INTERVAL;
        const span = Math.max(20, end - start);
        const plot = this.plot = { left, top, width, height, first: start, span, end };
        const x = seconds => plot.left + (seconds - start) / span * plot.width;
        const y = value => plot.top + (1 - value) * plot.height;
        const rowHeight = height / TRAIT_BINS;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "#0b202b";
        ctx.fillRect(left, top, width, height);
        for (let i = 0; i < history.length; i += 1) {
            const sample = history[i], counts = sample.histograms[key];
            const l = Math.round(x(sample.time)), r = Math.round(x(history[i + 1]?.time ?? end));
            if (!sample.count) {
                ctx.fillStyle = MISSING;
                ctx.fillRect(l, top, Math.max(1, r - l), height);
                continue;
            }
            for (let bin = 0; bin < TRAIT_BINS; bin += 1) {
                ctx.fillStyle = densityColor(counts[bin] / sample.count);
                ctx.fillRect(l, y((bin + 1) / TRAIT_BINS), Math.max(1, r - l), rowHeight + 0.2);
            }
        }
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#b9d0d8";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (const value of [0, 0.25, 0.5, 0.75, 1]) {
            const yy = y(value);
            ctx.strokeStyle = "#d9f5ff2c";
            ctx.beginPath();
            ctx.moveTo(left, yy);
            ctx.lineTo(left + width, yy);
            ctx.stroke();
            ctx.fillText(traitTick(key, value), left - 6, yy);
        }
        const slices = cw < 420 ? 3 : 5;
        ctx.textBaseline = "top";
        for (let i = 0; i <= slices; i += 1) {
            const xx = left + (i / slices) * width;
            ctx.textAlign = i === 0 ? "left" : i === slices ? "right" : "center";
            ctx.fillText(clock(Math.round(start + span * (i / slices))), xx, top + height + 5);
        }
        ctx.textAlign = "center";
        ctx.fillText("シミュレーション時間（秒）", left + width / 2, ch - 15);
        const sampleLeft = x(history[selected].time);
        const sampleRight = x(history[selected + 1]?.time ?? end);
        ctx.strokeStyle = "#effced";
        ctx.lineWidth = 1;
        ctx.strokeRect(sampleLeft + 0.5, top + 0.5, Math.max(1, sampleRight - sampleLeft - 1), height - 1);
    }
}
