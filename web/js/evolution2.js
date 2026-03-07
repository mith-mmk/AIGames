document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const historyCanvas = document.getElementById('historyCanvas');
    const historyCtx = historyCanvas.getContext('2d');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const CREATURE_RADIUS = 4.5;
    const PLANT_MAX = 320;
    const INITIAL_PLANTS = 180;
    const INITIAL_HERBIVORES = 45;
    const INITIAL_CARNIVORES = 8;

    const startPauseButton = document.getElementById('startPauseButton');
    const resetButton = document.getElementById('resetButton');
    const mutationRateSlider = document.getElementById('mutationRate');
    const mutationRateValue = document.getElementById('mutationRateValue');
    const plantGrowthSlider = document.getElementById('plantGrowth');
    const plantGrowthValue = document.getElementById('plantGrowthValue');
    const predatorFeedGainSlider = document.getElementById('predatorFeedGain');
    const predatorFeedGainValue = document.getElementById('predatorFeedGainValue');
    const predatorReproduceEnergySlider = document.getElementById('predatorReproduceEnergy');
    const predatorReproduceEnergyValue = document.getElementById('predatorReproduceEnergyValue');
    const predatorStarveLimitSlider = document.getElementById('predatorStarveLimit');
    const predatorStarveLimitValue = document.getElementById('predatorStarveLimitValue');

    const generationValue = document.getElementById('generationValue');
    const herbivoreValue = document.getElementById('herbivoreValue');
    const carnivoreValue = document.getElementById('carnivoreValue');
    const plantValue = document.getElementById('plantValue');
    const avgSpeedHerbivore = document.getElementById('avgSpeedHerbivore');
    const avgSenseHerbivore = document.getElementById('avgSenseHerbivore');
    const avgSpeedCarnivore = document.getElementById('avgSpeedCarnivore');

    let mutationRate = Number(mutationRateSlider.value);
    let plantGrowthRate = Number(plantGrowthSlider.value);
    let predatorFeedGain = Number(predatorFeedGainSlider.value);
    let predatorReproduceEnergy = Number(predatorReproduceEnergySlider.value);
    let predatorStarveLimit = Number(predatorStarveLimitSlider.value);

    let creatures = [];
    let plants = [];
    let paused = false;
    let generation = 0;
    let frame = 0;
    const HISTORY_LIMIT = 220;
    let history = [];

    class Creature {
        constructor(type, x, y, genes = null) {
            this.type = type;
            this.x = x;
            this.y = y;
            this.age = 0;
            this.vx = Math.random() * 2 - 1;
            this.vy = Math.random() * 2 - 1;
            this.genes = genes || this.randomGenes(type);

            this.energy = type === 'herbivore' ? 90 : 130;
            this.maxAge = type === 'herbivore' ? 1800 : 2200;
            this.hunger = 0;
            this.starveLimit = type === 'herbivore' ? 700 : 520;
        }

        randomGenes(type) {
            if (type === 'herbivore') {
                return {
                    speed: 1.2 + Math.random() * 1.4,
                    sense: 45 + Math.random() * 75,
                    metabolism: 0.07 + Math.random() * 0.08
                };
            }
            return {
                speed: 1.4 + Math.random() * 1.7,
                sense: 80 + Math.random() * 120,
                metabolism: 0.1 + Math.random() * 0.1
            };
        }

        update() {
            this.age += 1;
            this.energy -= this.genes.metabolism;
            this.hunger += 1;

            if (this.type === 'herbivore') {
                this.seekPlant();
            } else {
                this.seekPrey();
            }

            const speed = Math.hypot(this.vx, this.vy) || 1;
            const maxSpeed = this.genes.speed;
            this.vx = (this.vx / speed) * Math.min(speed, maxSpeed);
            this.vy = (this.vy / speed) * Math.min(speed, maxSpeed);

            this.x += this.vx;
            this.y += this.vy;
            this.wallBounce();
        }

        wallBounce() {
            if (this.x < CREATURE_RADIUS) {
                this.x = CREATURE_RADIUS;
                this.vx *= -1;
            } else if (this.x > WIDTH - CREATURE_RADIUS) {
                this.x = WIDTH - CREATURE_RADIUS;
                this.vx *= -1;
            }

            if (this.y < CREATURE_RADIUS) {
                this.y = CREATURE_RADIUS;
                this.vy *= -1;
            } else if (this.y > HEIGHT - CREATURE_RADIUS) {
                this.y = HEIGHT - CREATURE_RADIUS;
                this.vy *= -1;
            }
        }

        seekPlant() {
            let target = null;
            let minDistance = Infinity;
            for (let i = 0; i < plants.length; i += 1) {
                const p = plants[i];
                const d = Math.hypot(this.x - p.x, this.y - p.y);
                if (d < this.genes.sense && d < minDistance) {
                    minDistance = d;
                    target = { plant: p, index: i };
                }
            }

            if (target) {
                const dx = target.plant.x - this.x;
                const dy = target.plant.y - this.y;
                this.vx += dx * 0.0032;
                this.vy += dy * 0.0032;

                if (minDistance < CREATURE_RADIUS + 2.5) {
                    this.energy += target.plant.energy;
                    this.hunger = 0;
                    plants.splice(target.index, 1);
                }
            } else {
                this.vx += (Math.random() - 0.5) * 0.15;
                this.vy += (Math.random() - 0.5) * 0.15;
            }

            // 肉食から逃げる
            for (const other of creatures) {
                if (other.type !== 'carnivore') {
                    continue;
                }
                const d = Math.hypot(this.x - other.x, this.y - other.y);
                if (d < this.genes.sense * 0.9) {
                    this.vx += (this.x - other.x) * 0.008;
                    this.vy += (this.y - other.y) * 0.008;
                }
            }
        }

        seekPrey() {
            let target = null;
            let minDistance = Infinity;
            for (const other of creatures) {
                if (other.type !== 'herbivore') {
                    continue;
                }
                const d = Math.hypot(this.x - other.x, this.y - other.y);
                if (d < this.genes.sense && d < minDistance) {
                    minDistance = d;
                    target = other;
                }
            }

            if (target) {
                this.vx += (target.x - this.x) * 0.0036;
                this.vy += (target.y - this.y) * 0.0036;
                if (minDistance < CREATURE_RADIUS * 1.7) {
                    target.energy = -999;
                    this.energy += predatorFeedGain;
                    this.hunger = 0;
                }
            } else {
                this.vx += (Math.random() - 0.5) * 0.18;
                this.vy += (Math.random() - 0.5) * 0.18;
            }
        }

        canReproduce() {
            if (this.type === 'herbivore') {
                return this.energy > 150 && this.hunger < 180;
            }
            return this.energy > predatorReproduceEnergy && this.hunger < 120;
        }

        reproduce() {
            this.energy *= 0.58;
            const childGenes = mutateGenes(this.genes, this.type, mutationRate);
            const child = new Creature(
                this.type,
                this.x + (Math.random() - 0.5) * 10,
                this.y + (Math.random() - 0.5) * 10,
                childGenes
            );
            child.energy = this.type === 'herbivore' ? 70 : 95;
            return child;
        }

        isDead() {
            this.starveLimit = this.type === 'herbivore' ? 700 : predatorStarveLimit;
            if (this.hunger > this.starveLimit) {
                return true;
            }
            // 長時間獲物を得られない肉食は急速に消耗する
            if (this.type === 'carnivore' && this.hunger > 220) {
                this.energy -= 0.28;
            }
            return this.energy <= 0 || this.age >= this.maxAge;
        }

        draw() {
            const isHerbivore = this.type === 'herbivore';
            const hue = isHerbivore ? 110 : 8;
            const sat = Math.min(95, Math.floor(55 + this.genes.sense * 0.3));
            const light = Math.min(70, Math.floor(35 + this.genes.speed * 10));

            ctx.beginPath();
            ctx.arc(this.x, this.y, CREATURE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
            ctx.fill();
        }
    }

    function mutateGenes(genes, type, rate) {
        const next = { ...genes };
        const keys = Object.keys(next);
        for (const key of keys) {
            if (Math.random() < rate) {
                const ratio = 1 + (Math.random() * 0.28 - 0.14);
                next[key] *= ratio;
            }
        }

        if (type === 'herbivore') {
            next.speed = clamp(next.speed, 0.8, 3.4);
            next.sense = clamp(next.sense, 25, 170);
            next.metabolism = clamp(next.metabolism, 0.045, 0.2);
        } else {
            next.speed = clamp(next.speed, 1.0, 4.0);
            next.sense = clamp(next.sense, 45, 230);
            next.metabolism = clamp(next.metabolism, 0.06, 0.24);
        }
        return next;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function randomPosition() {
        return {
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT
        };
    }

    function spawnPlant(count) {
        for (let i = 0; i < count; i += 1) {
            if (plants.length >= PLANT_MAX) {
                return;
            }
            const pos = randomPosition();
            plants.push({
                x: pos.x,
                y: pos.y,
                energy: 24 + Math.random() * 15
            });
        }
    }

    function computeAverages() {
        const herbivores = creatures.filter((c) => c.type === 'herbivore');
        const carnivores = creatures.filter((c) => c.type === 'carnivore');

        const hSpeed = herbivores.length
            ? herbivores.reduce((s, c) => s + c.genes.speed, 0) / herbivores.length
            : 0;
        const hSense = herbivores.length
            ? herbivores.reduce((s, c) => s + c.genes.sense, 0) / herbivores.length
            : 0;
        const cSpeed = carnivores.length
            ? carnivores.reduce((s, c) => s + c.genes.speed, 0) / carnivores.length
            : 0;

        return {
            herbivores,
            carnivores,
            hSpeed,
            hSense,
            cSpeed
        };
    }

    function pushHistorySnapshot() {
        const avg = computeAverages();
        history.push({
            generation,
            herbivores: avg.herbivores.length,
            carnivores: avg.carnivores.length,
            plants: plants.length,
            herbivoreSpeed: avg.hSpeed,
            carnivoreSpeed: avg.cSpeed
        });
        if (history.length > HISTORY_LIMIT) {
            history = history.slice(history.length - HISTORY_LIMIT);
        }
    }

    function drawHistoryGraph() {
        const w = historyCanvas.width;
        const h = historyCanvas.height;
        const padLeft = 42;
        const padRight = 12;
        const padTop = 16;
        const padBottom = 24;
        const graphW = w - padLeft - padRight;
        const graphH = h - padTop - padBottom;

        historyCtx.clearRect(0, 0, w, h);
        historyCtx.fillStyle = '#fbfcff';
        historyCtx.fillRect(0, 0, w, h);

        historyCtx.strokeStyle = '#d8dce8';
        historyCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i += 1) {
            const y = padTop + (graphH / 4) * i;
            historyCtx.beginPath();
            historyCtx.moveTo(padLeft, y);
            historyCtx.lineTo(w - padRight, y);
            historyCtx.stroke();
        }

        if (history.length < 2) {
            return;
        }

        const maxCount = Math.max(
            10,
            ...history.map((p) => Math.max(p.herbivores, p.carnivores, p.plants))
        );
        const maxSpeed = Math.max(
            1,
            ...history.map((p) => Math.max(p.herbivoreSpeed, p.carnivoreSpeed))
        );

        function xAt(index) {
            return padLeft + (index / (history.length - 1)) * graphW;
        }

        function yCount(v) {
            return padTop + (1 - v / maxCount) * graphH;
        }

        function ySpeed(v) {
            return padTop + (1 - v / maxSpeed) * graphH;
        }

        function drawLine(getY, color) {
            historyCtx.beginPath();
            historyCtx.lineWidth = 2;
            historyCtx.strokeStyle = color;
            for (let i = 0; i < history.length; i += 1) {
                const x = xAt(i);
                const y = getY(history[i]);
                if (i === 0) {
                    historyCtx.moveTo(x, y);
                } else {
                    historyCtx.lineTo(x, y);
                }
            }
            historyCtx.stroke();
        }

        drawLine((p) => yCount(p.herbivores), '#23a647');
        drawLine((p) => yCount(p.carnivores), '#d44949');
        drawLine((p) => yCount(p.plants), '#1f7f7f');
        drawLine((p) => ySpeed(p.herbivoreSpeed), '#6a58cc');
        drawLine((p) => ySpeed(p.carnivoreSpeed), '#d99625');

        historyCtx.fillStyle = '#4a4a4a';
        historyCtx.font = '12px Segoe UI, sans-serif';
        historyCtx.fillText('個体/植物', 6, padTop + 2);
        historyCtx.fillText(`0`, 20, padTop + graphH + 4);
        historyCtx.fillText(`${maxCount}`, 10, padTop + 10);
        historyCtx.fillText(`速度 max ${maxSpeed.toFixed(1)}`, w - 106, padTop + 12);
        historyCtx.fillText(`世代 ${history[0].generation} - ${history[history.length - 1].generation}`, padLeft, h - 6);
    }

    function init() {
        creatures = [];
        plants = [];
        generation = 0;
        frame = 0;
        history = [];
        paused = false;
        startPauseButton.textContent = '一時停止';

        for (let i = 0; i < INITIAL_HERBIVORES; i += 1) {
            const pos = randomPosition();
            creatures.push(new Creature('herbivore', pos.x, pos.y));
        }
        for (let i = 0; i < INITIAL_CARNIVORES; i += 1) {
            const pos = randomPosition();
            creatures.push(new Creature('carnivore', pos.x, pos.y));
        }
        spawnPlant(INITIAL_PLANTS);
        pushHistorySnapshot();
        drawHistoryGraph();
    }

    function update() {
        frame += 1;
        if (frame % 120 === 0) {
            generation += 1;
            pushHistorySnapshot();
        }

        const newborns = [];
        for (const creature of creatures) {
            creature.update();
            if (creature.canReproduce() && Math.random() < 0.022) {
                newborns.push(creature.reproduce());
            }
        }
        creatures = creatures.filter((c) => !c.isDead());
        creatures.push(...newborns);

        const growth = Math.max(0, Math.floor(1 + Math.random() * 3 * plantGrowthRate));
        spawnPlant(growth);

        const herbivores = creatures.filter((c) => c.type === 'herbivore').length;
        const carnivores = creatures.filter((c) => c.type === 'carnivore').length;

        // 絶滅時に最低限の母集団を再投入して継続可能にする
        if (herbivores === 0) {
            for (let i = 0; i < 8; i += 1) {
                const pos = randomPosition();
                creatures.push(new Creature('herbivore', pos.x, pos.y));
            }
            spawnPlant(40);
        }
        if (carnivores === 0 && generation > 3) {
            for (let i = 0; i < 2; i += 1) {
                const pos = randomPosition();
                creatures.push(new Creature('carnivore', pos.x, pos.y));
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        for (const p of plants) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = '#2f8f2f';
            ctx.fill();
        }

        for (const creature of creatures) {
            creature.draw();
        }
    }

    function updateStats() {
        const avg = computeAverages();

        generationValue.textContent = String(generation);
        herbivoreValue.textContent = String(avg.herbivores.length);
        carnivoreValue.textContent = String(avg.carnivores.length);
        plantValue.textContent = String(plants.length);
        avgSpeedHerbivore.textContent = avg.hSpeed.toFixed(2);
        avgSenseHerbivore.textContent = avg.hSense.toFixed(1);
        avgSpeedCarnivore.textContent = avg.cSpeed.toFixed(2);
        drawHistoryGraph();
    }

    function animate() {
        if (!paused) {
            update();
            draw();
            updateStats();
        }
        requestAnimationFrame(animate);
    }

    startPauseButton.addEventListener('click', () => {
        paused = !paused;
        startPauseButton.textContent = paused ? '再開' : '一時停止';
    });

    resetButton.addEventListener('click', init);

    mutationRateSlider.addEventListener('input', () => {
        mutationRate = Number(mutationRateSlider.value);
        mutationRateValue.textContent = mutationRate.toFixed(2);
    });

    plantGrowthSlider.addEventListener('input', () => {
        plantGrowthRate = Number(plantGrowthSlider.value);
        plantGrowthValue.textContent = plantGrowthRate.toFixed(1);
    });

    predatorFeedGainSlider.addEventListener('input', () => {
        predatorFeedGain = Number(predatorFeedGainSlider.value);
        predatorFeedGainValue.textContent = String(predatorFeedGain);
    });

    predatorReproduceEnergySlider.addEventListener('input', () => {
        predatorReproduceEnergy = Number(predatorReproduceEnergySlider.value);
        predatorReproduceEnergyValue.textContent = String(predatorReproduceEnergy);
    });

    predatorStarveLimitSlider.addEventListener('input', () => {
        predatorStarveLimit = Number(predatorStarveLimitSlider.value);
        predatorStarveLimitValue.textContent = String(predatorStarveLimit);
    });

    init();
    animate();
});
