(function () {
    "use strict";

    function collectElements() {
        return {
            canvas: document.getElementById("cat-canvas"),
            score: document.getElementById("cat-score"),
            distance: document.getElementById("cat-distance"),
            surprise: document.getElementById("cat-surprise"),
            stage: document.getElementById("cat-stage"),
            titlePanel: document.getElementById("cat-title-panel"),
            messagePanel: document.getElementById("cat-message-panel"),
            message: document.getElementById("cat-message"),
            startButton: document.getElementById("cat-start-button"),
            recordButton: document.getElementById("cat-record-button"),
            resumeButton: document.getElementById("cat-resume-button"),
            jumpButton: document.getElementById("cat-jump-button"),
            crouchButton: document.getElementById("cat-crouch-button"),
            pauseButton: document.getElementById("cat-pause-button"),
            resetButton: document.getElementById("cat-reset-button"),
            missions: document.getElementById("cat-missions"),
            stageSelect: document.getElementById("cat-stage-select"),
            collarSelect: document.getElementById("cat-collar-select"),
            bellSelect: document.getElementById("cat-bell-select"),
            tailSelect: document.getElementById("cat-tail-select"),
            faceSelect: document.getElementById("cat-face-select"),
            collection: document.getElementById("cat-collection"),
            records: document.getElementById("cat-records"),
            exportButton: document.getElementById("cat-export-button"),
            importInput: document.getElementById("cat-import-input"),
            saveStatus: document.getElementById("cat-save-status"),
        };
    }

    async function boot() {
        const elements = collectElements();
        const stageLoader = new globalThis.BlackCatStageLoader();
        const stages = await stageLoader.loadAll();
        const saveStore = new globalThis.BlackCatSaveStore(globalThis.localStorage);
        saveStore.load();
        const audio = new globalThis.BlackCatAudio();
        const game = new globalThis.BlackCatGame({ stages, saveStore, audio });
        const assetLoader = new globalThis.BlackCatAssetLoader();
        const assets = await assetLoader.loadAll(stages);
        const renderer = new globalThis.BlackCatRenderer(elements.canvas, assets);
        const input = new globalThis.BlackCatInput(game, elements.canvas);
        const ui = new globalThis.BlackCatUi({ game, renderer, saveStore, elements });
        input.bind();
        ui.bind();
        ui.syncAll();
        globalThis.blackCatWalk = { game, renderer, ui };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
}());
