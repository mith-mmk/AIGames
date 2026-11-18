import { AquariumSimulation, BOUNDS, PRESETS, STEP, TRAITS, floorY, preferredTemperature, zone } from "./core.mjs";
import { AquariumRenderer } from "./renderer.mjs";

const DEFAULT_SEED = 20261118;
const byId = id => document.getElementById(id);
const pct = value => Math.round(value * 100) + "%";
const tone = hue => "hsl(" + Math.round(hue * 360) + " 75% 64%)";
const num = new Intl.NumberFormat("ja-JP");
const seeds = new Uint32Array(1);
const environment = [
    ["temperature", "temperature", 1, " ℃"],
    ["food-rate", "foodRate", 1, " 個/秒"],
    ["predator-count", "predators", 1, " 匹"],
    ["mutation", "mutation", 100, " %"],
];
const scenarios = {
    balanced: "標準水槽。まず個体を選んで、親子の形質を見比べてみよう。",
    cold: "冷水・少ない餌。適温の低い個体が残りやすくなるか観察しよう。",
    predators: "捕食者がいる水槽。遊泳力や、背景に対する見つかりやすさに注目。",
    custom: "環境を変更しました。変化は今いる個体の生存や、次の世代の形質に現れます。",
};
const ranges = {
    size: ["小型", "大型"], speed: ["低い", "高い"], vision: ["狭い", "広い"],
    metabolism: ["低い", "高い"], temp: ["9 ℃", "31 ℃"],
    depth: ["浅瀬寄り", "深場寄り"], hue: ["赤 → 黄 → 緑", "青 → 紫 → 赤"], pattern: ["弱い", "強い"],
};
const traitValue = (key, value) => key === "temp" ? preferredTemperature(value).toFixed(1) + " ℃" :
    key === "hue" ? Math.floor(value * 360) + "°" : pct(value);

function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
}

function sizeCanvas(canvas, ctx) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
}

/* A readable cross-section keeps the experiment usable without WebGL. */
class CrossSectionRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.targets = [];
    }

    draw(sim, selectedId) {
        const { width: w, height: h } = sizeCanvas(this.canvas, this.ctx);
        const ctx = this.ctx;
        const x = world => (world + BOUNDS.x + 1) / (BOUNDS.x * 2 + 2) * w;
        const y = world => h * (0.95 - 0.81 * (world + 0.9) / (BOUNDS.height + 1));
        const water = ctx.createLinearGradient(0, 0, 0, h);
        water.addColorStop(0, "#15485e");
        water.addColorStop(1, "#031524");
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#95edee27";
        for (let i = 1; i < 4; i += 1) {
            ctx.beginPath();
            ctx.moveTo(0, h * i / 5);
            ctx.lineTo(w, h * i / 5);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = -BOUNDS.x - 1; i <= BOUNDS.x + 1; i += 0.5) ctx.lineTo(x(i), y(floorY(i)));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = "#746b51";
        ctx.fill();
        ctx.strokeStyle = "#b4a87d";
        ctx.stroke();
        ctx.fillStyle = "#bde9a7";
        for (const food of sim.food) {
            ctx.beginPath();
            ctx.arc(x(food.x), y(food.y), 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
        const drawFish = (entity, scale, color, selected) => {
            const px = x(entity.x), py = y(entity.y), facing = entity.vx < 0 ? -1 : 1;
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(facing, 1);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(1, 0, scale, scale * 0.43, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-scale * 0.55, 0);
            ctx.lineTo(-scale * 1.65, -scale * 0.61);
            ctx.lineTo(-scale * 1.45, scale * 0.57);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#031724";
            ctx.beginPath();
            ctx.arc(scale * 0.58, -scale * 0.08, Math.max(1, scale * 0.12), 0, Math.PI * 2);
            ctx.fill();
            if (selected) {
                ctx.strokeStyle = "#ffffff";
                ctx.beginPath();
                ctx.ellipse(0, 0, scale + 7, scale * 0.58 + 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            return { id: entity.id, x: px, y: py, scale };
        };
        this.targets = [...sim.fish].sort((a, b) => a.z - b.z).map(fish =>
            drawFish(fish, (5.8 + fish.traits.size * 8) * (0.75 + (fish.z + BOUNDS.z) / 40), tone(fish.traits.hue), fish.id === selectedId));
        for (const predator of sim.predators) drawFish(predator, Math.min(25, w / 24), "#a2bcca", false);
    }

    pick(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        let best = 22 ** 2;
        let result = null;
        for (const t of this.targets) {
            const d = (x - rect.left - t.x) ** 2 + (y - rect.top - t.y) ** 2;
            if (d < best && d <= (t.scale + 7) ** 2) {
                best = d;
                result = t.id;
            }
        }
        return result;
    }
}

class AquariumApp {
    constructor() {
        this.ui = Object.fromEntries([
            "tank", "viewport", "fallback", "view-status", "pause", "step", "reset", "camera", "reroll",
            "speed", "scenario-note", "population", "generation", "elapsed", "births", "deaths", "lab-status",
            "seed", "fish-picker", "fish-detail", "population-chart", "distribution", "trait-chart", "lineages",
            "shallows-count", "midwater-count", "deep-count",
        ].map(id => [id, byId(id)]));
        this.seed = DEFAULT_SEED;
        this.paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.speed = 1;
        this.scenario = "balanced";
        this.selected = null;
        this.selectedSnapshot = null;
        this.lostSelection = false;
        this.accumulator = 0;
        this.lastFrame = null;
        this.lastUI = -Infinity;
        this.view = this.createView();
        this.chartContext = this.ui["population-chart"].getContext("2d");
        this.init();
    }

    createView() {
        try {
            const view = new AquariumRenderer(this.ui.tank);
            this.ui.tank.addEventListener("webglcontextlost", event => {
                event.preventDefault();
                view.dispose();
                this.view = this.createFallback();
            }, { once: true });
            return view;
        } catch {
            return this.createFallback();
        }
    }

    createFallback() {
        this.ui.tank.hidden = true;
        this.ui.fallback.hidden = false;
        this.ui.camera.disabled = true;
        this.ui["view-status"].hidden = false;
        this.ui["view-status"].textContent = "3D表示を利用できないため、断面図で観察しています。";
        return new CrossSectionRenderer(this.ui.fallback);
    }

    init(options = PRESETS.balanced) {
        this.sim = new AquariumSimulation(this.seed, options);
        this.baseline = this.sim.fish.map(fish => fish.traits);
        this.selected = null;
        this.selectedSnapshot = null;
        this.lostSelection = false;
        this.accumulator = 0;
        this.setScenarioLabel();
        this.updateEnvironment();
        this.update();
        this.view.draw(this.sim, this.selected, 0);
    }

    setScenarioLabel() {
        this.ui["scenario-note"].textContent = scenarios[this.scenario];
        for (const button of document.querySelectorAll("[data-preset]")) {
            button.setAttribute("aria-pressed", String(button.dataset.preset === this.scenario));
        }
    }

    setScenario(key) {
        if (!Object.hasOwn(PRESETS, key)) return;
        this.scenario = key;
        for (const [option, value] of Object.entries(PRESETS[key])) this.sim.setOption(option, value);
        this.setScenarioLabel();
        this.updateEnvironment();
        this.update();
    }

    setEnvironment(id, key, multiplier, value) {
        this.sim.setOption(key, Number(value) / multiplier);
        this.scenario = "custom";
        this.setScenarioLabel();
        this.updateEnvironment();
        if (id === "predator-count" && this.paused) this.view.draw(this.sim, this.selected, 0);
    }

    updateEnvironment() {
        for (const [id, key, multiplier, unit] of environment) {
            const value = Math.round(this.sim.options[key] * multiplier * 10) / 10;
            byId(id).value = value;
            byId(id + "-value").textContent = value + unit;
        }
    }

    reroll() {
        this.seed = crypto.getRandomValues(seeds)[0];
        this.init(this.sim.options);
    }

    togglePause() {
        this.paused = !this.paused;
        this.accumulator = 0;
        this.update();
    }

    stepSecond() {
        this.paused = true;
        this.accumulator = 0;
        for (let i = 0; i < Math.round(1 / STEP); i += 1) this.sim.step();
        this.update();
    }

    setChoice(id) {
        this.selected = id;
        this.selectedSnapshot = null;
        this.lostSelection = false;
        this.update();
    }

    pick(x, y) {
        const fish = this.view.pick(x, y);
        if (fish !== null && fish !== undefined) this.setChoice(fish);
    }

    frame(now) {
        const dt = this.lastFrame === null ? 0 : Math.min(0.10, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        if (!this.paused && this.sim.fish.length) {
            this.accumulator += dt * this.speed;
            while (this.accumulator + 1e-8 >= STEP) {
                this.sim.step();
                this.accumulator -= STEP;
            }
        }
        this.view.draw(this.sim, this.selected, this.paused ? 0 : dt);
        if (now - this.lastUI > 450) {
            this.update();
            this.lastUI = now;
        }
        requestAnimationFrame(t => this.frame(t));
    }

    update() {
        const { ui, sim } = this;
        ui.population.textContent = num.format(sim.fish.length);
        ui.generation.textContent = "G" + String(sim.generation).padStart(2, "0");
        ui.elapsed.textContent = Math.floor(sim.time / 60) + ":" + String(Math.floor(sim.time) % 60).padStart(2, "0");
        ui.births.textContent = num.format(sim.births);
        const { starvation, oldAge, predation } = sim.deaths;
        ui.deaths.textContent = num.format(starvation + oldAge + predation);
        ui.deaths.title = `飢餓 ${starvation} · 寿命 ${oldAge} · 捕食 ${predation}`;
        ui.pause.textContent = this.paused ? "再開" : "一時停止";
        const status = sim.fish.length === 0 ? "絶滅 · リセットで再試行" : this.paused ? "一時停止中" : "観測中";
        if (ui["lab-status"].textContent !== status) ui["lab-status"].textContent = status;
        ui["lab-status"].dataset.state = sim.fish.length === 0 ? "extinct" : this.paused ? "paused" : "active";
        ui.seed.textContent = String(this.seed);
        const counts = [0, 0, 0];
        for (const fish of sim.fish) counts[zone(fish.x, fish.y)] += 1;
        for (const [i, key] of ["shallows-count", "midwater-count", "deep-count"].entries()) ui[key].textContent = counts[i] + " 匹";
        this.renderInspector();
        this.renderLineages();
        this.renderPopulation();
        this.renderDistribution();
    }

    renderInspector() {
        const { sim, ui } = this;
        const fish = sim.fish.find(item => item.id === this.selected);
        if (fish) this.selectedSnapshot = fish;
        const selected = fish || this.selectedSnapshot;
        this.lostSelection = !!selected && !fish;
        const picker = ui["fish-picker"];
        const ids = sim.fish.map(f => f.id).join(",");
        if (picker.dataset.ids !== ids) {
            picker.replaceChildren(new Option("個体を選択…", ""), ...sim.fish.map(f =>
                new Option(`#${String(f.id).padStart(3, "0")} · 系統 ${f.lineage} · G${f.generation}`, f.id)));
            picker.dataset.ids = ids;
        }
        picker.value = fish ? String(fish.id) : "";
        const panel = ui["fish-detail"];
        if (!selected) {
            if (panel.dataset.fish !== "none") {
                panel.replaceChildren(el("p", "fish-empty", "水槽の魚をタップするか、一覧から選ぶと、親・系統・形質がわかります。"));
                panel.dataset.fish = "none";
            }
            return;
        }
        const stamp = [selected.id, this.lostSelection, Math.round(selected.energy), Math.floor(selected.age), zone(selected.x, selected.y)].join("|");
        if (panel.dataset.fish === stamp) return;
        panel.dataset.fish = stamp;
        const title = el("div", "fish-title");
        const swatch = el("i", "fish-swatch");
        swatch.style.background = tone(selected.traits.hue);
        title.append(swatch, el("strong", "", "個体 #" + String(selected.id).padStart(3, "0") + (this.lostSelection ? "（死亡）" : "")));
        const meta = el("div", "fish-meta");
        meta.append(el("p", "", `系統 ${selected.lineage} · 第${selected.generation}世代 · ${Math.floor(selected.age)} 秒齢`),
            el("p", "", selected.parents.length ? "親 #" + selected.parents.join(" / #") + " · 突然変異 " + selected.mutations + " 形質" : "初期集団 / 親データなし"));
        const traits = el("div", "fish-traits");
        for (const [key, value, label, display] of [
            ["energy", selected.energy / 112, "エネルギー", Math.max(0, Math.round(selected.energy)) + " / 112"],
            ...Object.entries(selected.traits).map(([key, value]) => [key, value, TRAITS[key], traitValue(key, value)]),
        ]) {
            const row = el("div", "fish-trait");
            const gauge = el("meter", "");
            gauge.min = 0;
            gauge.max = 1;
            gauge.value = value;
            gauge.setAttribute("aria-label", label);
            if (key === "hue") gauge.style.accentColor = tone(value);
            row.append(el("span", "", label), gauge, el("output", "", display));
            traits.append(row);
        }
        panel.replaceChildren(title, meta, traits);
    }

    renderLineages() {
        const container = this.ui.lineages;
        const fishCounts = new Map();
        for (const fish of this.sim.fish) fishCounts.set(fish.lineage, (fishCounts.get(fish.lineage) || 0) + 1);
        const fragment = document.createDocumentFragment();
        for (const lineage of this.sim.lineages) {
            const count = fishCounts.get(lineage.id) || 0;
            const share = this.sim.fish.length ? pct(count / this.sim.fish.length) : "0%";
            const row = el("div", "lineage-row");
            row.classList.toggle("is-extinct", !count);
            const label = el("span", "lineage-key");
            const swatch = el("i", "swatch");
            swatch.style.background = tone(lineage.hue);
            label.append(swatch, "L" + String(lineage.id).padStart(2, "0"));
            const track = el("span", "lineage-track");
            const bar = el("span");
            bar.style.width = share;
            bar.style.background = tone(lineage.hue);
            track.append(bar);
            row.append(label, track, el("strong", "", count + " 匹"), el("small", "", "G" + lineage.generation + " / 出生 " + lineage.births));
            fragment.append(row);
        }
        container.replaceChildren(fragment);
    }

    renderDistribution() {
        const key = this.ui["trait-chart"].value;
        if (!Object.hasOwn(TRAITS, key)) return;
        const current = Array(10).fill(0);
        const baseline = Array(10).fill(0);
        for (const fish of this.sim.fish) current[Math.min(9, Math.floor(fish.traits[key] * 10))] += 1;
        for (const traits of this.baseline) baseline[Math.min(9, Math.floor(traits[key] * 10))] += 1;
        const ratio = (count, total) => total ? count / total : 0;
        const chart = el("div", "histogram");
        chart.setAttribute("role", "img");
        chart.setAttribute("aria-label", TRAITS[key] + "の分布。左から現在の割合 " +
            current.map(n => pct(ratio(n, this.sim.fish.length))).join("、"));
        const peak = Math.max(0.25, ...current.map(n => ratio(n, this.sim.fish.length)), ...baseline.map(n => ratio(n, this.baseline.length)));
        for (let i = 0; i < 10; i += 1) {
            const bin = el("div", "hist-bin");
            bin.title = traitValue(key, i / 10) + " 〜 " + traitValue(key, (i + 1) / 10) +
                "：現在 " + current[i] + " 匹 / 初期 " + baseline[i] + " 匹";
            bin.style.setProperty("--current", pct(ratio(current[i], this.sim.fish.length) / peak));
            bin.style.setProperty("--initial", pct(ratio(baseline[i], this.baseline.length) / peak));
            bin.style.setProperty("--bar", key === "hue" ? tone((i + 0.5) / 10) : "#59e7cf");
            bin.append(el("span", "hist-current"), el("span", "hist-initial"));
            chart.append(bin);
        }
        const caption = el("div", "hist-caption");
        caption.append(el("span", "", ranges[key][0]), el("span", "", ranges[key][1]));
        this.ui.distribution.replaceChildren(chart, caption, el("p", "hist-key", "実線：現在　点線：開始時（各集団に占める割合）"));
    }

    renderPopulation() {
        const ctx = this.chartContext;
        if (!ctx) return;
        const canvas = this.ui["population-chart"];
        const { width, height } = sizeCanvas(canvas, ctx);
        const history = this.sim.history;
        const last = history.at(-1);
        const first = history[0];
        const span = Math.max(40, last.time - first.time);
        const ceiling = Math.max(50, Math.ceil(Math.max(...history.map(s => s.count)) / 25) * 25);
        const w = Math.max(1, width - 38), h = Math.max(1, height - 26);
        const x = t => 30 + (t - first.time) / span * w, y = n => 5 + (1 - n / ceiling) * h;
        ctx.clearRect(0, 0, width, height);
        ctx.font = "10px system-ui";
        ctx.textAlign = "right";
        for (const p of [0, 0.5, 1]) {
            const yy = y(p * ceiling);
            ctx.strokeStyle = "#9ac7ce38";
            ctx.beginPath();
            ctx.moveTo(29, yy);
            ctx.lineTo(width - 8, yy);
            ctx.stroke();
            ctx.fillStyle = "#a5c7d0";
            ctx.fillText(String(Math.round(p * ceiling)), 23, yy + 4);
        }
        ctx.beginPath();
        for (const s of history) ctx.lineTo(x(s.time), y(s.count));
        ctx.lineTo(x(last.time), y(0));
        ctx.lineTo(x(first.time), y(0));
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#61f9d24d");
        gradient.addColorStop(1, "#61f9d200");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        for (const s of history) ctx.lineTo(x(s.time), y(s.count));
        ctx.strokeStyle = "#72f4d3";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x(last.time), y(last.count), 3, 0, Math.PI * 2);
        ctx.fillStyle = "#72f4d3";
        ctx.fill();
        ctx.fillStyle = "#a5c7d0";
        ctx.textAlign = "left";
        ctx.fillText(Math.round(first.time) + " 秒", 30, height - 3);
        ctx.textAlign = "right";
        ctx.fillText(Math.round(first.time + span) + " 秒", width - 8, height - 3);
        canvas.setAttribute("aria-label", "個体数の推移、" + Math.round(last.time) + "秒時点で " + last.count + " 匹");
    }
}

function connect(app) {
    const { ui } = app;
    ui.pause.addEventListener("click", () => app.togglePause());
    ui.step.addEventListener("click", () => app.stepSecond());
    ui.reset.addEventListener("click", () => app.init(app.sim.options));
    ui.reroll.addEventListener("click", () => app.reroll());
    ui.camera.addEventListener("click", () => app.view.resetCamera?.());
    ui.speed.addEventListener("change", event => { app.speed = Number(event.target.value); });
    ui["fish-picker"].addEventListener("change", event => app.setChoice(Number(event.target.value) || null));
    ui["trait-chart"].addEventListener("change", () => app.renderDistribution());
    for (const button of document.querySelectorAll("[data-preset]")) {
        button.addEventListener("click", () => app.setScenario(button.dataset.preset));
    }
    for (const [id, key, multiplier] of environment) {
        byId(id).addEventListener("input", event => app.setEnvironment(id, key, multiplier, event.target.value));
    }
    let down = null;
    for (const canvas of [ui.tank, ui.fallback]) {
        canvas.addEventListener("pointerdown", event => {
            down = event.isPrimary && event.button === 0 ? [event.pointerId, event.clientX, event.clientY] : null;
        });
        canvas.addEventListener("pointerup", event => {
            if (down && event.pointerId === down[0] && Math.hypot(event.clientX - down[1], event.clientY - down[2]) < 8) {
                app.pick(event.clientX, event.clientY);
            }
            down = null;
        });
        canvas.addEventListener("pointercancel", () => { down = null; });
    }
    const resize = new ResizeObserver(() => {
        app.view.resize?.();
        app.renderPopulation();
    });
    resize.observe(ui.viewport);
    resize.observe(ui["population-chart"]);
    requestAnimationFrame(t => app.frame(t));
}
connect(new AquariumApp());
