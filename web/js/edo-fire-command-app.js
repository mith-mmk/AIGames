(function initializeEdoFireCommand(globalScope) {
    "use strict";

    const api = globalScope.EdoFireCommand;
    const Renderer = globalScope.EdoFireRenderer;
    if (!api || !Renderer) throw new Error("Edo Fire Command dependencies are missing.");

    const RANK_LABELS = Object.freeze({ gold: "金", silver: "銀", bronze: "銅" });
    const ERROR_MESSAGES = Object.freeze({
        "not-running": "今は命令できません。",
        unreachable: "その場所へは今刻では届きません。",
        "out-of-range": "行動対象は移動予定地の隣にしてください。",
        "no-water": "水がありません。井戸か水路で補給してください。",
        "no-fire": "そこに消すべき火はありません。",
        "no-water-source": "井戸か水路を選んでください。",
        "no-civilians": "救助を待つ住民はいません。",
        "wrong-squad": "その組にはできない指図です。",
        "no-authority": "破壊消防の許可札を使い切りました。",
        landmark: "重要施設は壊せません。",
        "invalid-building": "破壊できる町家ではありません。",
        occupied: "住民が残っています。先に救助してください。",
    });

    class EdoFireGame {
        constructor(documentRef) {
            this.document = documentRef;
            this.elements = this.collectElements();
            this.core = new api.EdoFireCore();
            this.renderer = new Renderer(this.elements.canvas);
            this.store = new api.ProgressStore(globalScope.localStorage);
            this.progress = this.store.load();
            this.selectedSquadId = null;
            this.commandMode = "move";
            this.cursor = { x: 0, y: 0 };
            this.populateScenarioSelect();
            this.applySettings();
            this.showMenu();
        }

        collectElements() {
            const byId = (id) => {
                const element = this.document.getElementById(id);
                if (!element) throw new Error(`Missing element #${id}`);
                return element;
            };
            return {
                canvas: byId("edo-fire-canvas"),
                startOverlay: byId("edo-start-overlay"),
                resultOverlay: byId("edo-result-overlay"),
                scenarioSelect: byId("edo-scenario-select"),
                startButton: byId("edo-start-button"),
                retryButton: byId("edo-retry-button"),
                menuButton: byId("edo-menu-button"),
                helpButton: byId("edo-help-button"),
                helpDialog: byId("edo-help-dialog"),
                helpClose: byId("edo-help-close"),
                reducedMotion: byId("edo-reduced-motion"),
                stageName: byId("edo-stage-name"),
                stageBrief: byId("edo-stage-brief"),
                turn: byId("edo-turn"),
                wind: byId("edo-wind"),
                fireCount: byId("edo-fire-count"),
                civilians: byId("edo-civilians"),
                casualties: byId("edo-casualties"),
                demolitions: byId("edo-demolitions"),
                score: byId("edo-score"),
                message: byId("edo-message"),
                squads: byId("edo-squad-list"),
                selectedName: byId("edo-selected-name"),
                selectedDetail: byId("edo-selected-detail"),
                actionButtons: [...this.document.querySelectorAll("[data-edo-action]")],
                endTurn: byId("edo-end-turn"),
                clearOrder: byId("edo-clear-order"),
                forecastOne: byId("edo-forecast-one"),
                forecastTwo: byId("edo-forecast-two"),
                hint: byId("edo-hint"),
                resultKicker: byId("edo-result-kicker"),
                resultTitle: byId("edo-result-title"),
                resultText: byId("edo-result-text"),
                resultScore: byId("edo-result-score"),
            };
        }

        populateScenarioSelect() {
            this.elements.scenarioSelect.replaceChildren();
            for (const scenario of api.SCENARIOS) {
                const option = this.document.createElement("option");
                option.value = scenario.number;
                const unlocked = scenario.number <= this.progress.unlocked;
                const rank = this.progress.bestRanks[scenario.id];
                option.disabled = !unlocked;
                option.textContent = unlocked
                    ? `第${scenario.number}夜 ${scenario.title}${rank ? `【${RANK_LABELS[rank]}】` : ""}`
                    : `第${scenario.number}夜 未解禁`;
                this.elements.scenarioSelect.append(option);
            }
        }

        applySettings() {
            this.elements.reducedMotion.checked = this.progress.settings.reducedMotion;
            this.document.documentElement.classList.toggle("reduced-motion", this.progress.settings.reducedMotion);
        }

        showMenu() {
            this.populateScenarioSelect();
            this.elements.startOverlay.hidden = false;
            this.elements.resultOverlay.hidden = true;
            this.previewScenario();
        }

        previewScenario() {
            const number = Number(this.elements.scenarioSelect.value) || 1;
            const scenario = api.SCENARIOS.find((item) => item.number === number) || api.SCENARIOS[0];
            this.core.startScenario(scenario.number);
            this.selectedSquadId = this.core.squads[0].id;
            this.cursor = { x: this.core.squads[0].x, y: this.core.squads[0].y };
            this.elements.startOverlay.querySelector("h2").textContent = scenario.title;
            this.elements.startOverlay.querySelector("[data-scenario-description]").textContent = scenario.subtitle;
            this.sync();
        }

        startSelectedScenario() {
            const number = Number(this.elements.scenarioSelect.value) || 1;
            if (number > this.progress.unlocked) return;
            this.core.startScenario(number);
            this.selectedSquadId = this.core.squads[0].id;
            this.cursor = { x: this.core.squads[0].x, y: this.core.squads[0].y };
            this.commandMode = "move";
            this.elements.startOverlay.hidden = true;
            this.elements.resultOverlay.hidden = true;
            this.sync();
        }

        retry() {
            if (!this.core.scenario) return;
            this.core.startScenario(this.core.scenario.number);
            this.selectedSquadId = this.core.squads[0].id;
            this.elements.resultOverlay.hidden = true;
            this.sync();
        }

        selectSquad(id) {
            if (!this.core.getSquad(id)) return;
            this.selectedSquadId = id;
            const squad = this.core.getSquad(id);
            this.cursor = { x: squad.x, y: squad.y };
            this.commandMode = "move";
            this.sync();
        }

        setCommandMode(mode) {
            this.commandMode = mode;
            this.sync();
        }

        handleTile(x, y) {
            if (this.core.status !== "running") return;
            this.cursor = { x, y };
            const squadAtTile = this.core.squads.find((squad) => squad.x === x && squad.y === y);
            if (squadAtTile && this.commandMode === "move") {
                this.selectSquad(squadAtTile.id);
                return;
            }
            if (!this.selectedSquadId) return;
            const result = this.commandMode === "move"
                ? this.core.queueMove(this.selectedSquadId, x, y)
                : this.core.queueAction(this.selectedSquadId, this.commandMode, x, y);
            if (!result.ok) this.core.lastMessage = ERROR_MESSAGES[result.reason] || "その指図は実行できません。";
            this.sync();
        }

        clearSelectedOrder() {
            if (this.selectedSquadId) this.core.clearOrder(this.selectedSquadId);
            this.commandMode = "move";
            this.sync();
        }

        endTurn() {
            const result = this.core.endTurn();
            if (!result.ok) return;
            if (this.core.status === "won") {
                this.progress = this.store.record(this.progress, this.core.scenario, this.core.result.rank);
            }
            this.sync();
            if (this.core.status !== "running") this.showResult();
        }

        showResult() {
            const result = this.core.result;
            const won = result.status === "won";
            this.elements.resultKicker.textContent = won ? "鎮火完了" : "指図及ばず";
            this.elements.resultTitle.textContent = won ? `${RANK_LABELS[result.rank]}評価` : "夜明けの火煙";
            this.elements.resultText.textContent = result.reason;
            this.elements.resultScore.textContent = `${result.score} 点`;
            this.elements.resultOverlay.hidden = false;
        }

        moveCursor(dx, dy) {
            this.cursor.x = Math.max(0, Math.min(api.WIDTH - 1, this.cursor.x + dx));
            this.cursor.y = Math.max(0, Math.min(api.HEIGHT - 1, this.cursor.y + dy));
            this.syncCanvas();
        }

        toggleReducedMotion() {
            this.progress.settings.reducedMotion = this.elements.reducedMotion.checked;
            this.store.save(this.progress);
            this.applySettings();
        }

        syncCanvas() {
            const snapshot = this.core.getSnapshot();
            const reachable = this.selectedSquadId ? this.core.getReachable(this.selectedSquadId) : [];
            this.renderer.render(snapshot, {
                reachable: this.commandMode === "move" ? reachable : [],
                forecast: this.core.getForecast(2),
                selectedSquadId: this.selectedSquadId,
                cursor: this.cursor,
            });
        }

        sync() {
            const snapshot = this.core.getSnapshot();
            const scenario = snapshot.scenario;
            if (!scenario) return;
            const wind = api.WINDS[snapshot.wind];
            this.elements.stageName.textContent = `第${scenario.number}夜 ${scenario.title}`;
            this.elements.stageBrief.textContent = scenario.subtitle;
            this.elements.turn.textContent = `${snapshot.turn} / ${scenario.maxTurns}`;
            this.elements.wind.textContent = `${wind.label} ${wind.arrow}`;
            this.elements.fireCount.textContent = snapshot.activeFires;
            this.elements.civilians.textContent = snapshot.civilians;
            this.elements.casualties.textContent = `${snapshot.casualties} / ${scenario.casualtyLimit}`;
            this.elements.demolitions.textContent = `${scenario.demolitionLimit - snapshot.demolitionsUsed} 枚`;
            this.elements.score.textContent = snapshot.score;
            this.elements.message.textContent = snapshot.lastMessage;
            this.elements.hint.textContent = scenario.hints[snapshot.turn % scenario.hints.length];
            this.renderSquads(snapshot);
            this.renderSelected(snapshot);
            this.renderForecast();
            this.syncCanvas();
            this.elements.endTurn.disabled = snapshot.status !== "running";
        }

        renderSquads(snapshot) {
            this.elements.squads.replaceChildren();
            for (const squad of snapshot.squads) {
                const definition = api.SQUAD_TYPES[squad.type];
                const button = this.document.createElement("button");
                button.type = "button";
                button.className = "squad-button";
                button.classList.toggle("selected", squad.id === this.selectedSquadId);
                button.dataset.squadId = squad.id;
                const water = squad.type === "water" ? ` 水${squad.water}/${definition.waterMax}` : "";
                const ordered = snapshot.orders[squad.id] ? "・命令済" : "";
                button.innerHTML = `<b>${definition.mark}</b><span><strong>${definition.label}</strong><small>${water}${ordered}</small></span>`;
                this.elements.squads.append(button);
            }
        }

        renderSelected(snapshot) {
            const squad = snapshot.squads.find((item) => item.id === this.selectedSquadId);
            const definition = squad ? api.SQUAD_TYPES[squad.type] : null;
            this.elements.selectedName.textContent = definition ? definition.label : "組を選択";
            this.elements.selectedDetail.textContent = definition ? definition.description : "盤上の組を選んでください。";
            for (const button of this.elements.actionButtons) {
                const action = button.dataset.edoAction;
                const allowed = action === "move" || (definition && (definition.action === action || (definition.action === "extinguish" && action === "refill")));
                button.hidden = !allowed;
                button.classList.toggle("active", action === this.commandMode);
                button.disabled = !definition || snapshot.status !== "running";
            }
        }

        renderForecast() {
            const forecast = this.core.getForecast(2);
            [this.elements.forecastOne, this.elements.forecastTwo].forEach((element, index) => {
                const step = forecast[index];
                if (!step) {
                    element.textContent = "鎮火見込";
                    return;
                }
                const burning = step.danger.filter((tile) => tile.heat >= 2).length;
                const wind = api.WINDS[step.wind];
                element.innerHTML = `<b>第${step.turn}刻</b><span>${wind.label} ${wind.arrow}</span><small>危険 ${burning}区画</small>`;
            });
        }
    }

    function setupEdoFireEventHandlers(game) {
        const elements = game.elements;
        elements.startButton.addEventListener("click", () => game.startSelectedScenario());
        elements.retryButton.addEventListener("click", () => game.retry());
        elements.menuButton.addEventListener("click", () => game.showMenu());
        elements.scenarioSelect.addEventListener("change", () => game.previewScenario());
        elements.endTurn.addEventListener("click", () => game.endTurn());
        elements.clearOrder.addEventListener("click", () => game.clearSelectedOrder());
        elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
        elements.helpClose.addEventListener("click", () => elements.helpDialog.close());
        elements.reducedMotion.addEventListener("change", () => game.toggleReducedMotion());
        elements.squads.addEventListener("click", (event) => {
            const button = event.target.closest("[data-squad-id]");
            if (button) game.selectSquad(button.dataset.squadId);
        });
        for (const button of elements.actionButtons) {
            button.addEventListener("click", () => game.setCommandMode(button.dataset.edoAction));
        }
        elements.canvas.addEventListener("pointerdown", (event) => {
            const tile = game.renderer.tileFromPoint(event.clientX, event.clientY);
            if (tile) game.handleTile(tile.x, tile.y);
        });
        game.document.addEventListener("keydown", (event) => {
            if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
            const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (movement) {
                event.preventDefault();
                game.moveCursor(...movement);
                return;
            }
            const actions = { m: "move", x: "extinguish", r: "rescue", d: "demolish", f: "refill" };
            if (actions[event.key.toLowerCase()]) game.setCommandMode(actions[event.key.toLowerCase()]);
            if (event.key === "Enter") game.handleTile(game.cursor.x, game.cursor.y);
            if (event.key === "Escape") game.clearSelectedOrder();
        });
    }

    globalScope.EdoFireGame = EdoFireGame;
    globalScope.setupEdoFireEventHandlers = setupEdoFireEventHandlers;

    if (globalScope.document) {
        globalScope.document.addEventListener("DOMContentLoaded", () => {
            try {
                const game = new EdoFireGame(globalScope.document);
                setupEdoFireEventHandlers(game);
            } catch (error) {
                console.error("江戸火消し指図を開始できませんでした。", error);
                const message = globalScope.document.getElementById("edo-message");
                if (message) message.textContent = "初期化に失敗しました。ページを再読み込みしてください。";
            }
        });
    }
})(globalThis);
