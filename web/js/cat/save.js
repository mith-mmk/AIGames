(function () {
    "use strict";

    const STORAGE_KEY = "blackCatWalkSaveV1";

    function todayKey(date = new Date()) {
        return date.toISOString().slice(0, 10);
    }

    function emptySave() {
        return {
            version: 1,
            collection: {
                items: {},
                encounters: {},
                places: {},
            },
            records: {
                bestDistance: 0,
                totalDistance: 0,
                totalScore: 0,
                walks: 0,
                escapes: 0,
                today: {},
            },
            customization: { ...globalThis.BlackCatData.DEFAULT_CUSTOMIZATION },
            unlockedStages: ["room"],
        };
    }

    function objectOrEmpty(value) {
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }

    function numberOrZero(value) {
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function sanitizeSave(value) {
        const source = objectOrEmpty(value);
        const base = emptySave();
        const collection = objectOrEmpty(source.collection);
        const records = objectOrEmpty(source.records);
        const customization = objectOrEmpty(source.customization);
        const unlockedStages = Array.isArray(source.unlockedStages) ? source.unlockedStages : base.unlockedStages;

        return {
            version: 1,
            collection: {
                items: objectOrEmpty(collection.items),
                encounters: objectOrEmpty(collection.encounters),
                places: objectOrEmpty(collection.places),
            },
            records: {
                bestDistance: numberOrZero(records.bestDistance),
                totalDistance: numberOrZero(records.totalDistance),
                totalScore: numberOrZero(records.totalScore),
                walks: numberOrZero(records.walks),
                escapes: numberOrZero(records.escapes),
                today: objectOrEmpty(records.today),
            },
            customization: {
                ...base.customization,
                ...customization,
            },
            unlockedStages: unlockedStages.filter((id) => typeof id === "string"),
        };
    }

    class BlackCatSaveStore {
        constructor(storage) {
            this.storage = storage || null;
            this.key = STORAGE_KEY;
            this.save = emptySave();
        }

        load() {
            if (!this.storage) {
                this.save = emptySave();
                return this.save;
            }
            try {
                const raw = this.storage.getItem(this.key);
                this.save = raw ? sanitizeSave(JSON.parse(raw)) : emptySave();
            } catch {
                this.save = emptySave();
            }
            return this.save;
        }

        write(save = this.save) {
            this.save = sanitizeSave(save);
            if (this.storage) {
                this.storage.setItem(this.key, JSON.stringify(this.save));
            }
            return this.save;
        }

        recordWalk(result) {
            const save = sanitizeSave(this.save);
            const distance = numberOrZero(result.distance);
            const score = numberOrZero(result.score);
            const date = todayKey();
            const today = objectOrEmpty(save.records.today[date]);
            today.walks = numberOrZero(today.walks) + 1;
            today.distance = numberOrZero(today.distance) + distance;
            today.score = numberOrZero(today.score) + score;
            today.bestDistance = Math.max(numberOrZero(today.bestDistance), distance);
            save.records.today[date] = today;
            save.records.walks += 1;
            save.records.totalDistance += distance;
            save.records.totalScore += score;
            save.records.bestDistance = Math.max(save.records.bestDistance, distance);
            if (result.escaped) {
                save.records.escapes += 1;
            }
            this.write(save);
            return this.save;
        }

        registerCollection(kind, label, count = 1) {
            const save = sanitizeSave(this.save);
            const bucket = save.collection[kind] || {};
            bucket[label] = numberOrZero(bucket[label]) + count;
            save.collection[kind] = bucket;
            this.write(save);
            return this.save;
        }

        unlockStage(stageId) {
            const save = sanitizeSave(this.save);
            if (!save.unlockedStages.includes(stageId)) {
                save.unlockedStages.push(stageId);
            }
            this.write(save);
            return this.save;
        }

        setCustomization(customization) {
            const save = sanitizeSave(this.save);
            save.customization = {
                ...save.customization,
                ...customization,
            };
            this.write(save);
            return this.save;
        }

        exportText() {
            return JSON.stringify(sanitizeSave(this.save), null, 2);
        }

        importText(text) {
            const parsed = JSON.parse(text);
            return this.write(parsed);
        }
    }

    globalThis.BlackCatSaveStore = BlackCatSaveStore;
    globalThis.BlackCatSaveTools = { emptySave, sanitizeSave, todayKey, STORAGE_KEY };
}());
