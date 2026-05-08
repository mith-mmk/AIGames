(function () {
    "use strict";

    function setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    class BlackCatUi {
        constructor(options) {
            this.game = options.game;
            this.renderer = options.renderer;
            this.saveStore = options.saveStore;
            this.elements = options.elements;
            this.lastTime = 0;
            this.running = false;
        }

        bind() {
            this.elements.startButton.addEventListener("click", () => this.start());
            this.elements.resumeButton.addEventListener("click", () => this.hideMessage());
            this.elements.pauseButton.addEventListener("click", () => this.game.pause());
            this.elements.resetButton.addEventListener("click", () => this.restart());
            this.elements.jumpButton.addEventListener("click", () => this.game.setAction("jump", true));
            this.elements.crouchButton.addEventListener("pointerdown", () => this.game.setAction("crouch", true));
            this.elements.crouchButton.addEventListener("pointerup", () => this.game.setAction("crouch", false));
            this.elements.crouchButton.addEventListener("pointercancel", () => this.game.setAction("crouch", false));
            this.elements.recordButton.addEventListener("click", () => this.elements.records.scrollIntoView({ behavior: "smooth" }));
            this.elements.stageSelect.addEventListener("change", () => {
                this.game.setStage(this.elements.stageSelect.value);
                this.showTitle();
                this.syncAll();
            });
            ["collar", "bell", "tail", "face"].forEach((key) => {
                this.elements[`${key}Select`].addEventListener("change", () => {
                    this.saveStore.setCustomization({
                        collar: this.elements.collarSelect.value,
                        bell: this.elements.bellSelect.value,
                        tail: this.elements.tailSelect.value,
                        face: this.elements.faceSelect.value,
                    });
                    this.game.save = this.saveStore.save;
                    this.syncAll();
                });
            });
            this.elements.exportButton.addEventListener("click", () => this.exportSave());
            this.elements.importInput.addEventListener("change", (event) => this.importSave(event));
        }

        start() {
            this.elements.titlePanel.hidden = true;
            this.elements.messagePanel.hidden = true;
            this.game.start();
            if (!this.running) {
                this.running = true;
                this.lastTime = performance.now();
                requestAnimationFrame((time) => this.frame(time));
            }
        }

        restart() {
            const stageId = this.game.stage.id;
            this.game.finishWalk();
            this.game.init(stageId);
            this.showTitle();
            this.syncAll();
        }

        showTitle() {
            this.elements.titlePanel.hidden = false;
            this.elements.messagePanel.hidden = true;
        }

        hideMessage() {
            this.elements.messagePanel.hidden = true;
        }

        frame(time) {
            const dt = (time - this.lastTime) / 1000;
            this.lastTime = time;
            this.game.update(dt);
            this.renderer.draw(this.game);
            this.syncHud();
            if (this.game.state === "recovering" && this.game.message) {
                setText(this.elements.message, this.game.message);
                this.elements.messagePanel.hidden = false;
            }
            if (this.running) {
                requestAnimationFrame((next) => this.frame(next));
            }
        }

        syncAll() {
            this.syncHud();
            this.syncStageSelect();
            this.syncCustomization();
            this.syncMissions();
            this.syncCollection();
            this.syncRecords();
            this.renderer.draw(this.game);
        }

        syncHud() {
            setText(this.elements.score, String(this.game.score));
            setText(this.elements.distance, `${this.game.distance}m`);
            setText(this.elements.stage, this.game.stage.name);
            this.elements.surprise.value = this.game.surprise;
            this.elements.surprise.textContent = `${this.game.surprise}/100`;
            this.syncMissions();
        }

        syncStageSelect() {
            this.elements.stageSelect.textContent = "";
            this.game.stages.forEach((stage) => {
                const option = document.createElement("option");
                option.value = stage.id;
                option.textContent = stage.name;
                option.disabled = !this.game.isStageUnlocked(stage);
                this.elements.stageSelect.appendChild(option);
            });
            this.elements.stageSelect.value = this.game.stage.id;
        }

        syncCustomization() {
            const custom = this.saveStore.save.customization;
            this.elements.collarSelect.value = custom.collar;
            this.elements.bellSelect.value = custom.bell;
            this.elements.tailSelect.value = custom.tail;
            this.elements.faceSelect.value = custom.face;
        }

        syncMissions() {
            this.elements.missions.textContent = "";
            this.game.missionProgress().forEach((mission) => {
                const item = document.createElement("li");
                item.textContent = `${mission.label}: ${mission.value}/${mission.target}`;
                this.elements.missions.appendChild(item);
            });
        }

        syncCollection() {
            const save = this.saveStore.save;
            this.elements.collection.textContent = "";
            this.appendDefinition(this.elements.collection, "みつけたもの", Object.keys(save.collection.items).length);
            this.appendDefinition(this.elements.collection, "出会ったもの", Object.keys(save.collection.encounters).length);
            this.appendDefinition(this.elements.collection, "通った場所", Object.keys(save.collection.places).length);
        }

        syncRecords() {
            const records = this.saveStore.save.records;
            this.elements.records.textContent = "";
            this.appendDefinition(this.elements.records, "最高距離", `${Math.floor(records.bestDistance)}m`);
            this.appendDefinition(this.elements.records, "合計距離", `${Math.floor(records.totalDistance)}m`);
            this.appendDefinition(this.elements.records, "合計スコア", Math.floor(records.totalScore));
            this.appendDefinition(this.elements.records, "さんぽ回数", Math.floor(records.walks));
        }

        appendDefinition(parent, label, value) {
            const term = document.createElement("dt");
            const detail = document.createElement("dd");
            term.textContent = label;
            detail.textContent = String(value);
            parent.appendChild(term);
            parent.appendChild(detail);
        }

        exportSave() {
            const blob = new Blob([this.saveStore.exportText()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "black-cat-walk-save.json";
            anchor.click();
            URL.revokeObjectURL(url);
            setText(this.elements.saveStatus, "exportしました。");
        }

        importSave(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            file.text().then((text) => {
                this.saveStore.importText(text);
                this.game.save = this.saveStore.save;
                this.syncAll();
                setText(this.elements.saveStatus, "importしました。");
            }).catch(() => {
                setText(this.elements.saveStatus, "importできませんでした。");
            }).finally(() => {
                event.target.value = "";
            });
        }
    }

    globalThis.BlackCatUi = BlackCatUi;
}());
