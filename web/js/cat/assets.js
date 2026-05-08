(function () {
    "use strict";

    const ASSET_ROOT = "./assets/cat/images/";
    const STAGE_ROOT = "./assets/cat/stages/";

    function loadImage(src) {
        return new Promise((resolve) => {
            const image = new Image();
            image.addEventListener("load", () => resolve({ image, ok: true }));
            image.addEventListener("error", () => resolve({ image: null, ok: false }));
            image.src = src;
        });
    }

    async function loadStageFile(fileName) {
        const response = await fetch(`${STAGE_ROOT}${fileName}`, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`stage load failed: ${fileName}`);
        }
        return response.json();
    }

    function validateStage(stage) {
        return Boolean(Boolean(stage)
            && typeof stage.id === "string"
            && typeof stage.name === "string"
            && stage.theme
            && stage.layers
            && stage.spawnTables
            && stage.unlocks);
    }

    class BlackCatAssetLoader {
        constructor(manifest = globalThis.BlackCatData.ASSET_MANIFEST) {
            this.manifest = manifest;
            this.images = {
                cat: {},
                items: {},
                obstacles: {},
                backgrounds: {},
            };
        }

        async loadAll(stages) {
            const tasks = [];
            Object.entries(this.manifest.cat).forEach(([key, spec]) => {
                tasks.push(loadImage(`${ASSET_ROOT}${spec.src}`).then((result) => {
                    this.images.cat[key] = { ...spec, image: result.image, ok: result.ok };
                }));
            });
            Object.entries(this.manifest.items).forEach(([key, src]) => {
                tasks.push(loadImage(`${ASSET_ROOT}${src}`).then((result) => {
                    this.images.items[key] = { image: result.image, ok: result.ok };
                }));
            });
            Object.entries(this.manifest.obstacles).forEach(([key, src]) => {
                tasks.push(loadImage(`${ASSET_ROOT}${src}`).then((result) => {
                    this.images.obstacles[key] = { image: result.image, ok: result.ok };
                }));
            });
            stages.forEach((stage) => {
                Object.entries(stage.layers || {}).forEach(([key, src]) => {
                    const imageKey = `${stage.id}:${key}`;
                    tasks.push(loadImage(`${ASSET_ROOT}${src}`).then((result) => {
                        this.images.backgrounds[imageKey] = { image: result.image, ok: result.ok };
                    }));
                });
            });
            await Promise.all(tasks);
            return this.images;
        }
    }

    class BlackCatStageLoader {
        constructor(files = globalThis.BlackCatData.STAGE_MANIFEST) {
            this.files = files;
        }

        async loadAll() {
            if (typeof fetch !== "function") {
                return globalThis.BlackCatData.FALLBACK_STAGES;
            }
            try {
                const stages = await Promise.all(this.files.map((fileName) => loadStageFile(fileName)));
                if (stages.every(validateStage)) {
                    return stages;
                }
            } catch {
                return globalThis.BlackCatData.FALLBACK_STAGES;
            }
            return globalThis.BlackCatData.FALLBACK_STAGES;
        }
    }

    globalThis.BlackCatAssetLoader = BlackCatAssetLoader;
    globalThis.BlackCatStageLoader = BlackCatStageLoader;
    globalThis.BlackCatAssetTools = { validateStage, ASSET_ROOT, STAGE_ROOT };
}());
