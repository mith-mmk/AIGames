(function initializeKanbunMachine(globalScope) {
    "use strict";
    const BRACKET_MARKS = new Set(["レ", "上", "中", "下"]);
    const NUMERIC_MARKS = new Set(["１", "２", "３"]);
    const PUNCTUATION = new Set(["。", "、", "，", "．", "！", "？"]);
    const KANA = /[ぁ-ゖゝゞァ-ヺヽヾー]/u;
    const REPEATED_CHARACTERS = Object.freeze({ "未": "いまだ〜ず", "将": "まさに〜んとす", "当": "まさに〜べし", "宜": "よろしく〜べし", "須": "すべからく〜べし", "猶": "なほ〜ごとし", "更": "さらに〜", "再": "ふたたび〜", "復": "また〜", "且": "まさに〜んとす" });

    function normalize(input) { return String(input ?? "").replace(/\r\n?/g, "\n").replace(/[ \t\u3000]+/g, "").trim(); }
    function readMark(chars, index) {
        if (NUMERIC_MARKS.has(chars[index])) return { value: chars[index], length: 1 };
        if (chars[index] === "［" && chars[index + 2] === "］" && BRACKET_MARKS.has(chars[index + 1])) return { value: chars[index + 1], length: 3 };
        return null;
    }
    function readOkiji(chars, index) { return chars[index] === "［" && chars[index + 1] === "置" && chars[index + 2] === "］" ? { length: 3 } : null; }
    function hasNotation(input) { const chars = Array.from(input); return chars.some((character, index) => readMark(chars, index) || readOkiji(chars, index)); }
    function tokenize(input) {
        const chars = Array.from(input); const tokens = [];
        for (let index = 0; index < chars.length;) {
            if (chars[index] === "\n") { tokens.push({ text: "\n", mark: "", punctuation: true, lineBreak: true }); index += 1; continue; }
            if (PUNCTUATION.has(chars[index])) { tokens.push({ text: chars[index], mark: "", punctuation: true }); index += 1; continue; }
            if (readMark(chars, index) || readOkiji(chars, index)) return { error: "訓点に対象字がありません。" };
            const token = { base: chars[index], okurigana: "", text: chars[index], mark: "", okiji: false, punctuation: false }; index += 1;
            const leadingMark = readMark(chars, index);
            const leadingOkiji = readOkiji(chars, index);
            if (leadingMark) { token.mark = leadingMark.value; index += leadingMark.length; }
            else if (leadingOkiji) { token.okiji = true; index += leadingOkiji.length; }
            while (KANA.test(chars[index] || "")) { token.okurigana += chars[index]; token.text += chars[index]; index += 1; }
            const trailingMark = readMark(chars, index);
            const trailingOkiji = readOkiji(chars, index);
            if (trailingMark || trailingOkiji) {
                if (token.mark || token.okiji) return { error: "一つの字に訓点を重ねて置けません。" };
                if (trailingMark) token.mark = trailingMark.value;
                else token.okiji = true;
                index += (trailingMark || trailingOkiji).length;
            }
            tokens.push(token);
        }
        return { tokens };
    }
    function reorderLine(tokens) {
        const result = [...tokens];
        let shouldAppendAtobeShi = false;
        for (let index = 0; index < result.length;) {
            if (result[index].mark !== "レ") { index += 1; continue; }
            if (result[index].base === "当") {
                result[index].mark = "";
                shouldAppendAtobeShi = true;
                index += 1;
                continue;
            }
            let end = index + 1;
            while (end < result.length && result[end].mark === "レ") end += 1;
            if (end >= result.length || result[end].punctuation) return { error: "返点「レ」の対応先がありません。" };
            result.splice(index, end - index + 1, ...result.slice(index, end + 1).reverse());
            index = end + 1;
        }
        for (let index = 0; index < result.length;) {
            const numeric = ["１", "２", "３"].includes(result[index].mark);
            const upper = ["上", "中", "下"].includes(result[index].mark);
            if (!numeric && !upper) { index += 1; continue; }
            const closingMark = numeric ? "１" : "下";
            let end = index + 1;
            while (end < result.length && !result[end].punctuation && result[end].mark !== closingMark) end += 1;
            if (end >= result.length || result[end].punctuation) return { error: `返点「${result[index].mark}」の対応先がありません。` };
            const segment = result.slice(index, end + 1);
            const marks = segment.filter((token) => token.mark).map((token) => token.mark);
            const expected = numeric ? (marks[0] === "３" ? ["３", "２", "１"] : ["２", "１"]) : (marks[0] === "上" && marks.length === 2 ? ["上", "下"] : ["上", "中", "下"]);
            if (marks.length !== expected.length || marks.some((mark, markIndex) => mark !== expected[markIndex])) return { error: "返点の順序または数が正しくありません。" };
            const markerIndexes = segment.map((token, tokenIndex) => token.mark ? tokenIndex : -1).filter((tokenIndex) => tokenIndex >= 0);
            const blocks = markerIndexes.map((markerIndex, markerOrder) => {
                const start = markerOrder === 0 ? 0 : markerIndexes[markerOrder - 1] + 1;
                return segment.slice(start, markerIndex + 1);
            });
            const ordered = blocks.reverse().flat();
            result.splice(index, end - index + 1, ...ordered);
            index = end + 1;
        }
        if (shouldAppendAtobeShi) {
            const punctuationIndex = result.findIndex((token) => token.punctuation);
            const insertionIndex = punctuationIndex < 0 ? result.length : punctuationIndex;
            result.splice(insertionIndex, 0, { base: "べ", okurigana: "し", text: "べし", mark: "", punctuation: false });
        }
        return { tokens: result };
    }
    function reorder(tokens) {
        const result = []; let line = [];
        for (const token of tokens) {
            if (!token.lineBreak) { line.push(token); continue; }
            const ordered = reorderLine(line); if (ordered.error) return ordered;
            result.push(...ordered.tokens, token); line = [];
        }
        const ordered = reorderLine(line); if (ordered.error) return ordered;
        result.push(...ordered.tokens);
        return { tokens: result };
    }
    class KanbunMachineCore {
        constructor() { this.init(""); }
        init(input = "") { this.input = normalize(input); this.tape = []; this.finalTape = []; this.head = 0; this.transformIndex = 0; this.outputHead = 0; this.phase = "idle"; this.output = ""; this.rule = "待機"; this.message = "入力してください。"; this.status = this.input ? "ready" : "empty"; return this.getSnapshot(); }
        start(input = this.input) {
            this.init(input); if (!this.input) return false;
            if (!hasNotation(this.input)) { this.output = this.input; this.status = "white"; this.message = "白文は変換しません。返点は［レ］・［上］・［中］・［下］、数点は１・２・３、置き字は［置］で入力してください。"; return false; }
            const parsed = tokenize(this.input); if (parsed.error) return this.fail(parsed.error);
            const sourceTokens = parsed.tokens.map((token, index) => ({ ...token, tokenId: `source-${index}` }));
            const ordered = reorder(sourceTokens.map((token) => ({ ...token }))); if (ordered.error) return this.fail(ordered.error);
            this.tape = sourceTokens;
            this.finalTape = ordered.tokens.map((token, index) => ({ ...token, tokenId: token.tokenId || `synthetic-${index}` }));
            this.phase = "scan"; this.status = "running"; this.message = "原文テープを配置しました。"; this.rule = "先頭から訓点を走査"; return true;
        }
        fail(message) { this.status = "error"; this.message = message; return false; }
        pause() { if (this.status === "running") { this.status = "paused"; this.message = "一時停止しました。"; } return this.status; }
        resume() { if (this.status === "paused") { this.status = "running"; this.message = "再開しました。"; } return this.status; }
        reset() { return this.init(this.input); }
        step() {
            if (this.status !== "running") return false;
            if (this.phase === "scan") {
                const target = this.finalTape[this.transformIndex];
                const currentIndex = this.tape.findIndex((token, index) => index >= this.transformIndex && token.tokenId === target.tokenId);
                if (currentIndex < 0) {
                    this.tape.splice(this.transformIndex, 0, { ...target });
                    this.rule = `再読文字の後読「${target.text}」を展開`;
                } else if (currentIndex === this.transformIndex) {
                    this.tape[this.transformIndex] = { ...target };
                    this.rule = `字句「${target.text === "\n" ? "改行" : target.text}」を走査`;
                } else {
                    const [moved] = this.tape.splice(currentIndex, 1);
                    this.tape.splice(this.transformIndex, 0, { ...target, tokenId: moved.tokenId });
                    this.rule = `返読順へ「${target.text}」を移動`;
                }
                this.transformIndex += 1;
                this.head = this.transformIndex;
                if (this.transformIndex >= this.finalTape.length) {
                    this.phase = "emit"; this.head = 0; this.message = "返読順が確定しました。書き下しを開始します。";
                }
                return true;
            }
            const token = this.tape[this.outputHead];
            if (token.okiji) { this.rule = `置き字「${token.base}」を省略`; }
            else { this.output += token.text; this.rule = token.mark ? `返り点「${token.mark}」を適用して出力` : "字句を出力"; }
            this.outputHead += 1; this.head = this.outputHead;
            if (this.outputHead >= this.tape.length) { this.status = "halted"; this.phase = "halted"; this.rule = "停止"; this.message = "変換が完了しました。"; }
            return true;
        }
        getSnapshot() {
            const total = this.finalTape.length * 2;
            const completed = this.transformIndex + this.outputHead;
            const state = this.status === "running" ? this.phase : this.status === "paused" ? `paused / ${this.phase}` : this.status;
            return { input: this.input, tape: this.tape.map((token) => token.text), head: this.head, output: this.output, status: this.status, state, phase: this.phase, rule: this.rule, message: this.message, progress: total ? Math.round(completed / total * 100) : 0 };
        }
        static convert(input) { const machine = new KanbunMachineCore(); machine.start(input); while (machine.step()) { /* run */ } return machine.output; }
        static findRepeatedCharacters(input) { return Array.from(normalize(input)).filter((character) => Object.hasOwn(REPEATED_CHARACTERS, character)).map((character) => ({ character, reading: REPEATED_CHARACTERS[character] })); }
    }
    class KanbunMachineUI {
        constructor(documentScope) { this.document = documentScope; this.machine = new KanbunMachineCore(); this.delay = 220; this.timer = null; this.samples = []; }
        init() { this.bindEvents(); this.render(this.machine.init(this.input().value)); this.renderPreview(); this.loadSamples(); }
        input() { return this.document.getElementById("kanbun-input"); }
        bindEvents() {
            this.input().addEventListener("input", () => this.renderPreview());
            this.document.getElementById("kanbun-start").addEventListener("click", () => this.begin());
            this.document.getElementById("kanbun-pause").addEventListener("click", () => this.togglePause());
            this.document.getElementById("kanbun-step").addEventListener("click", () => this.oneStep());
            this.document.getElementById("kanbun-reset").addEventListener("click", () => { this.stopTimer(); this.render(this.machine.init(this.input().value)); });
            this.document.getElementById("kanbun-speed").addEventListener("input", (event) => { this.delay = Number(event.target.value); this.document.getElementById("kanbun-speed-value").textContent = `${this.delay}ms`; });
            this.document.getElementById("kanbun-sample").addEventListener("change", (event) => { const sample = this.samples.find((item) => item.id === event.target.value); if (sample) this.selectSample(sample); });
        }
        selectSample(sample) { this.stopTimer(); this.activeSample = sample; const editorSource = sample.editorNotation || sample.source; this.input().value = editorSource; const status = this.document.getElementById("kanbun-sample-status"); status.textContent = `${sample.description} 返点と送り仮名をエディタへ反映しました。`; const notation = this.document.getElementById("kanbun-school-notation"); notation.hidden = true; notation.textContent = ""; this.renderPreview(); this.render(this.machine.init(editorSource)); }
        begin() { this.stopTimer(); if (!this.machine.start(this.input().value)) { this.render(this.machine.getSnapshot()); return; } this.runTimer(); this.render(this.machine.getSnapshot()); }
        togglePause() { if (this.machine.status === "running") { this.stopTimer(); this.machine.pause(); } else if (this.machine.status === "paused") { this.machine.resume(); this.runTimer(); } this.render(this.machine.getSnapshot()); }
        oneStep() { this.stopTimer(); if (this.machine.status === "ready") this.machine.start(this.input().value); if (this.machine.status === "paused") this.machine.resume(); this.machine.step(); if (this.machine.status === "running") this.machine.pause(); this.render(this.machine.getSnapshot()); }
        runTimer() { this.stopTimer(); this.timer = globalScope.setInterval(() => { this.machine.step(); this.render(this.machine.getSnapshot()); if (this.machine.status === "halted") this.stopTimer(); }, this.delay); }
        stopTimer() { if (this.timer !== null) globalScope.clearInterval(this.timer); this.timer = null; }
        renderPreview() { const preview = this.document.getElementById("kanbun-preview"); const normalized = normalize(this.input().value); const repeated = KanbunMachineCore.findRepeatedCharacters(normalized); this.document.getElementById("kanbun-repeated").textContent = repeated.length ? `再読文字: ${repeated.map((item) => `${item.character}（${item.reading}）`).join("、")}` : "再読文字: なし"; const sheet = this.document.createElement("div"); sheet.className = "kunten-sheet"; normalized.split("\n").forEach((line) => { const parsed = tokenize(line); const column = this.document.createElement("div"); column.className = "kunten-column"; if (parsed.error) { column.textContent = line; } (parsed.tokens || []).forEach((token) => { const item = this.document.createElement("span"); item.className = `kunten-token${token.punctuation ? " is-punctuation" : ""}${token.okiji ? " is-okiji" : ""}`; const mark = this.document.createElement("small"); mark.className = "kunten-mark"; mark.textContent = token.okiji ? "置" : (({ "１": "一", "２": "二", "３": "三" })[token.mark] || token.mark); const base = this.document.createElement("span"); base.className = "kunten-base"; base.textContent = token.base || token.text; const okuri = this.document.createElement("small"); okuri.className = "kunten-okuri"; Array.from(token.okurigana || "").forEach((character) => { const kana = this.document.createElement("span"); kana.textContent = character; okuri.appendChild(kana); }); item.append(mark, base, okuri); column.appendChild(item); }); sheet.appendChild(column); }); preview.replaceChildren(sheet); preview.scrollLeft = preview.scrollWidth; }
        async loadSamples() { const select = this.document.getElementById("kanbun-sample"); try { const response = await globalScope.fetch("./assets/kanbun-turing/samples.json"); if (!response.ok) throw new Error("unavailable"); const catalog = await response.json(); this.samples = catalog.samples; select.replaceChildren(...this.samples.map((sample) => { const option = this.document.createElement("option"); option.value = sample.id; option.textContent = sample.title; return option; })); if (this.samples.length) this.selectSample(this.samples[0]); } catch { select.disabled = true; select.replaceChildren(new Option("サンプルを読み込めません（手入力可）")); this.document.getElementById("kanbun-sample-status").textContent = "サンプルの読込に失敗しました。"; } }
        render(snapshot) { const tape = this.document.getElementById("kanbun-tape"); tape.replaceChildren(...snapshot.tape.map((text, index) => { const cell = this.document.createElement("span"); cell.className = `tape-cell${index === snapshot.head ? " is-head" : ""}${index < snapshot.head ? " is-read" : ""}`; cell.textContent = text === "\n" ? "↵" : text; return cell; })); this.document.getElementById("kanbun-output").textContent = snapshot.output || "（書き下し文はここに表示されます）"; this.document.getElementById("kanbun-state").textContent = snapshot.state; this.document.getElementById("kanbun-rule").textContent = snapshot.rule; this.document.getElementById("kanbun-message").textContent = snapshot.message; this.document.getElementById("kanbun-progress").value = snapshot.progress; const match = this.activeSample && snapshot.status === "halted" ? snapshot.output === this.activeSample.expectedKundoku : null; this.document.getElementById("kanbun-match").textContent = match === null ? "" : match ? "例題の期待結果と一致しました。" : "例題の期待結果と一致しません。"; }
    }
    globalScope.KanbunMachineCore = KanbunMachineCore;
    if (globalScope.document) globalScope.document.addEventListener("DOMContentLoaded", () => new KanbunMachineUI(globalScope.document).init());
}(typeof globalThis !== "undefined" ? globalThis : window));
