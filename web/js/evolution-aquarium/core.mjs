/* Deterministic aquarium model. Coordinates and traits are dimensionless unless stated. */
export const BOUNDS = Object.freeze({ x: 24, height: 10, z: 12 });
export const SHALLOW_EDGE = -BOUNDS.x * 0.3125;
export const STEP = 0.1;
export const MAX_FISH = 200;
export const HISTORY_INTERVAL = 2;
export const HISTORY_LIMIT = 150;
export const TRAIT_BINS = 10;
export const TRAITS = Object.freeze({
    size: "体の大きさ", speed: "遊泳力", vision: "索餌範囲", metabolism: "代謝の強さ",
    temp: "適温", depth: "好む水深", hue: "体色", pattern: "模様の強さ",
});
export const PRESETS = Object.freeze({
    balanced: Object.freeze({ temperature: 21, foodRate: 8, predators: 0, mutation: 0.10 }),
    cold: Object.freeze({ temperature: 13, foodRate: 5, predators: 0, mutation: 0.10 }),
    predators: Object.freeze({ temperature: 23, foodRate: 12, predators: 2, mutation: 0.10 }),
});
const SPEC = {
    temperature: [8, 32], foodRate: [0, 16], predators: [0, 4], mutation: [0, 0.30],
};
const FOUNDERS = 8;
const FOOD_MAX = 185;
const MATURITY = 19;
const MAX_AGE = 115;
const keys = Object.keys(TRAITS);
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const lerp = (a, b, t) => a + (b - a) * t;
const hueWrap = n => ((n % 1) + 1) % 1;
const hueDistance = (a, b) => Math.abs(hueWrap(a - b + 0.5) - 0.5);
export const preferredTemperature = trait => lerp(9, 31, trait);
export const zone = (x, y) => x < SHALLOW_EDGE ? 0 : y < 3.0 ? 2 : 1;

/* The sandy shelf in the west grades into a deep rocky bed in the east. */
export function floorY(x) {
    const t = clamp((x / BOUNDS.x + 0.625) / 0.8125);
    return lerp(3.45, -0.75, t * t * (3 - 2 * t)) + 0.15 * Math.sin(x * 0.7);
}

export function localTemperature(surface, x, y) {
    return surface - (BOUNDS.height - y) * (x < SHALLOW_EDGE ? 0.18 : 0.47);
}

export function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let word = Math.imul(state ^ state >>> 15, state | 1);
        word ^= word + Math.imul(word ^ word >>> 7, word | 61);
        return ((word ^ word >>> 14) >>> 0) / 4294967296;
    };
}

export function inherit(a, b, chance, random) {
    const genes = {};
    let mutations = 0;
    for (const key of keys) {
        const mix = 0.25 + random() * 0.5;
        const distance = key === "hue" ? hueWrap(b[key] - a[key] + 0.5) - 0.5 : b[key] - a[key];
        let value = a[key] + distance * mix;
        if (random() < chance) {
            value += (random() + random() - 1) * 0.32;
            mutations += 1;
        }
        genes[key] = key === "hue" ? hueWrap(value) : clamp(value);
    }
    return { genes, mutations };
}

export function traitBin(value) {
    return clamp(Math.floor(value * TRAIT_BINS), 0, TRAIT_BINS - 1);
}

export function traitHistograms(fish) {
    const histograms = Object.fromEntries(keys.map(key => [key, new Uint16Array(TRAIT_BINS)]));
    for (const { traits } of fish) {
        for (const key of keys) histograms[key][traitBin(traits[key])] += 1;
    }
    return histograms;
}

export function energyCost(fish, surface) {
    const { size, speed, metabolism, temp } = fish.traits;
    const ambient = localTemperature(surface, fish.x, fish.y);
    const mismatch = Math.abs(ambient - preferredTemperature(temp));
    return (0.73 + size * 0.29 + speed * 0.48 + metabolism * 0.33) *
        (1 + Math.max(0, ambient - 18) * 0.025 + mismatch * 0.069 + mismatch ** 2 * 0.024);
}

export function concealment(fish) {
    const habitat = zone(fish.x, fish.y);
    const background = [0.115, 0.49, 0.59][habitat];
    const patternTarget = [0.72, 0.17, 0.5][habitat];
    return clamp(1 - hueDistance(fish.traits.hue, background) * 1.5 -
        Math.abs(fish.traits.pattern - patternTarget) * 0.4);
}

const squaredDistance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

function unit(x, y, z) {
    const d = Math.max(0.01, Math.hypot(x, y, z));
    return { x: x / d, y: y / d, z: z / d };
}

/* Local, transient schools: align with nearby fish, draw toward their center and
 * give each other space. All fish read the same beginning-of-step positions. */
function schoolingDirection(fish, school, goal, food, hungry) {
    const radius = 5.9 + fish.traits.vision * 1.8;
    let weight = 0, neighbors = 0;
    let centerX = 0, centerY = 0, centerZ = 0, alignX = 0, alignY = 0, alignZ = 0;
    let spaceX = 0, spaceY = 0, spaceZ = 0;
    for (const other of school) {
        if (other.id === fish.id) continue;
        const dx = other.x - fish.x, dy = other.y - fish.y, dz = other.z - fish.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance > radius * radius || distance < 1e-6) continue;
        const d = Math.sqrt(distance);
        const near = 1 - d / radius;
        const influence = near * near;
        centerX += dx * influence; centerY += dy * influence; centerZ += dz * influence;
        alignX += other.vx * influence; alignY += other.vy * influence; alignZ += other.vz * influence;
        weight += influence;
        neighbors += 1;
        const gap = 1.07 + (fish.traits.size + other.size) * 0.63;
        if (d < gap) {
            const push = (gap - d) / (gap * d);
            spaceX -= dx * push; spaceY -= dy * push; spaceZ -= dz * push;
        }
    }
    const p = unit(goal.x - fish.x, goal.y - fish.y, goal.z - fish.z);
    const flow = unit(alignX, alignY, alignZ);
    const center = unit(centerX, centerY, centerZ);
    const cohesion = weight ? 0.74 * clamp(Math.hypot(centerX, centerY, centerZ) / (weight * 2.5)) : 0;
    const alignment = 1.33 * Math.min(1, neighbors / 3) * Math.min(1, weight * 1.8);
    const foodVector = food ? unit(food.x - fish.x, food.y - fish.y, food.z - fish.z) : { x: 0, y: 0, z: 0 };
    const forage = food ? lerp(0.52, 2.45, hungry) + (squaredDistance(fish, food) < 2.8 ? 1.12 : 0) : 0;
    return {
        x: p.x * 0.88 + flow.x * alignment + center.x * cohesion + spaceX * 2.8 + foodVector.x * forage,
        y: p.y * 0.88 + flow.y * alignment + center.y * cohesion + spaceY * 2.8 + foodVector.y * forage,
        z: p.z * 0.88 + flow.z * alignment + center.z * cohesion + spaceZ * 2.8 + foodVector.z * forage,
    };
}

function schoolTarget(fish, direction) {
    const margin = 3.5;
    const wall = (value, limit) => Math.sign(value) * clamp((Math.abs(value) - limit + margin) / margin) ** 2;
    const floor = Math.max(floorY(fish.x), floorY(fish.x + fish.vx * 0.55));
    const vertical = clamp((floor + 1.45 - fish.y) / 1.1) - clamp((fish.y - BOUNDS.height + 1.0) / 0.75);
    return {
        x: fish.x + 4 * (direction.x - 3.15 * wall(fish.x, BOUNDS.x)),
        y: fish.y + 4 * (direction.y + vertical * 2.55),
        z: fish.z + 4 * (direction.z - 3.15 * wall(fish.z, BOUNDS.z)),
    };
}

function swim(entity, target, speed, dt) {
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const dz = target.z - entity.z;
    const scale = speed / Math.max(1, Math.hypot(dx, dy, dz));
    const response = 1 - Math.exp(-dt * 3.3);
    entity.vx = lerp(entity.vx, dx * scale, response);
    entity.vy = lerp(entity.vy, dy * scale, response);
    entity.vz = lerp(entity.vz, dz * scale, response);
    entity.x = clamp(entity.x + entity.vx * dt, -BOUNDS.x + 0.4, BOUNDS.x - 0.4);
    entity.y = clamp(entity.y + entity.vy * dt, floorY(entity.x) + 0.45, BOUNDS.height - 0.35);
    entity.z = clamp(entity.z + entity.vz * dt, -BOUNDS.z + 0.4, BOUNDS.z - 0.4);
    if (Math.abs(entity.x) >= BOUNDS.x - 0.4 && entity.vx * entity.x > 0) entity.vx *= -0.35;
    if (Math.abs(entity.z) >= BOUNDS.z - 0.4 && entity.vz * entity.z > 0) entity.vz *= -0.35;
}

export class AquariumSimulation {
    constructor(seed, options = PRESETS.balanced) { this.init(seed, options); }

    init(seed, options = PRESETS.balanced) {
        this.seed = seed >>> 0;
        this.random = createRandom(this.seed);
        this.time = 0;
        this.ticks = 0;
        this.nextId = 1;
        this.foodDebt = 0;
        this.births = 0;
        this.deaths = { starvation: 0, oldAge: 0, predation: 0 };
        this.generation = 1;
        this.fish = [];
        this.food = [];
        this.predators = [];
        this.lineages = Array.from({ length: FOUNDERS }, (_, i) => ({
            id: i + 1, hue: (i * 0.618033989) % 1, births: 0, generation: 1,
        }));
        this.history = [];
        this.options = { ...PRESETS.balanced };
        for (let i = 0; i < FOUNDERS * 6; i += 1) {
            const lineage = this.lineages[i % FOUNDERS];
            const traits = Object.fromEntries(keys.map(key => [key, 0.12 + this.random() * 0.76]));
            traits.hue = hueWrap(lineage.hue + (this.random() - 0.5) * 0.12);
            traits.temp = clamp((i % FOUNDERS) / (FOUNDERS - 1) * 0.70 + 0.15 + (this.random() - 0.5) * 0.22);
            const fish = this.createFish(traits, lineage.id, 1, this.point());
            fish.age = 7 + this.random() * 37;
            fish.energy = 46 + this.random() * 32;
            fish.cooldown = this.random() * 11;
            this.fish.push(fish);
        }
        for (const [key, value] of Object.entries(options)) this.setOption(key, value);
        for (let i = 0; i < Math.round(this.options.foodRate * 7); i += 1) this.spawnFood();
        this.sample();
    }

    setOption(key, value) {
        if (!Object.hasOwn(SPEC, key) || !Number.isFinite(value)) return;
        this.options[key] = clamp(value, ...SPEC[key]);
        if (key === "predators") {
            this.options.predators = Math.round(this.options.predators);
            this.predators.length = Math.min(this.predators.length, this.options.predators);
            while (this.predators.length < this.options.predators) {
                this.predators.push({ id: this.nextId++, ...this.point(5), vx: 1, vy: 0, vz: 0, cooldown: 4 });
            }
        }
    }

    point(x = lerp(-BOUNDS.x + 1, BOUNDS.x - 1, this.random())) {
        return {
            x,
            y: lerp(floorY(x) + 0.65, BOUNDS.height - 0.5, this.random()),
            z: lerp(-BOUNDS.z + 0.8, BOUNDS.z - 0.8, this.random()),
        };
    }

    spawnFood() {
        const x = this.random() < 0.59 ? lerp(-BOUNDS.x + 1, SHALLOW_EDGE + 1.5, this.random()) :
            lerp(SHALLOW_EDGE + 1.5, BOUNDS.x - 1, this.random());
        this.food.push({ ...this.point(x), ttl: 28 + this.random() * 22, nutrition: 16 + 8 * this.random() });
    }

    createFish(traits, lineage, generation, position, parents = [], mutations = 0) {
        const angle = this.random() * Math.PI * 2;
        return {
            x: position.x, y: position.y, z: position.z, id: this.nextId++, lineage, generation,
            traits, parents, mutations, vx: 1.2 * Math.cos(angle), vy: 0, vz: 1.2 * Math.sin(angle),
            age: 0, energy: 36, cooldown: 0, phase: this.random() * 100, goal: { ...position },
        };
    }

    findFood(fish) {
        let index = -1;
        let best = (3.45 + fish.traits.vision * 7) ** 2;
        for (let i = 0; i < this.food.length; i += 1) {
            const food = this.food[i];
            const distance = squaredDistance(fish, food);
            if (distance < best) {
                index = i;
                best = distance;
            }
        }
        return { item: this.food[index], index, distance: best };
    }

    updateFish(fish, school) {
        const rng = this.random;
        fish.age += STEP;
        fish.cooldown = Math.max(0, fish.cooldown - STEP);
        fish.energy -= energyCost(fish, this.options.temperature) * STEP;
        if (fish.energy <= 0) return "starvation";
        if (fish.age >= MAX_AGE + (fish.phase % 25)) return "oldAge";
        const { vision, speed, size, depth, metabolism } = fish.traits;
        const { item, index, distance } = this.findFood(fish);
        if (item && distance < (0.58 + 0.30 * size) ** 2) {
            fish.energy = Math.min(112, fish.energy + item.nutrition * (0.89 + metabolism * 0.24));
            this.food[index] = this.food.at(-1);
            this.food.pop();
        }
        let threat;
        let threatD = (1.4 + vision * 4) ** 2;
        for (const p of this.predators) {
            const d = squaredDistance(fish, p);
            if (d < threatD) { threatD = d; threat = p; }
        }
        if (this.ticks % 54 === fish.id % 54 || squaredDistance(fish, fish.goal) < 2) {
            const x = clamp(lerp(fish.x, lerp(-BOUNDS.x * 0.82, BOUNDS.x * 0.75, depth), 0.33) +
                lerp(-10.5, 10.5, rng()), -BOUNDS.x + 1.6, BOUNDS.x - 1.6);
            fish.goal = {
                x, y: clamp(lerp(8.6, 1.0, depth) + lerp(-2.4, 2.4, rng()), floorY(x) + 0.65, BOUNDS.height - 0.8),
                z: lerp(-BOUNDS.z + 1.7, BOUNDS.z - 1.7, rng()),
            };
        }
        const direction = threat
            ? unit(fish.x - threat.x, fish.y - threat.y + 0.4, fish.z - threat.z)
            : schoolingDirection(fish, school, fish.goal, fish.energy < 104 ? item : null, clamp((95 - fish.energy) / 47));
        const target = schoolTarget(fish, direction);
        swim(fish, target, (1.20 + speed * 2.3 - size * 0.16) * (threat ? 1.45 : 1), STEP);
        return null;
    }

    updatePredator(p, dead) {
        p.cooldown = Math.max(0, p.cooldown - STEP);
        let target;
        let best = 55;
        for (const fish of this.fish) {
            if (dead.has(fish.id)) continue;
            const d = squaredDistance(fish, p);
            const score = d * (0.8 + concealment(fish) * 1.9) / (0.68 + fish.traits.size);
            if (score < best) { best = score; target = fish; }
        }
        const patrol = {
            x: Math.sin(this.time * 0.16 + p.id * 2.3) * BOUNDS.x * 0.79,
            y: 2.8 + Math.sin(this.time * 0.29 + p.id) * 1.7,
            z: Math.cos(this.time * 0.31 + p.id * 0.7) * BOUNDS.z * 0.8,
        };
        const hunting = target && p.cooldown < 1.5;
        swim(p, hunting ? target : patrol, hunting ? 4.7 : 2.6, STEP);
        if (target && p.cooldown === 0 && squaredDistance(target, p) < 1.05 ** 2) {
            const vulnerable = clamp(0.55 - concealment(target) * 0.24 - target.traits.speed * 0.16, 0.08, 0.49);
            if (this.random() < vulnerable * STEP * 3.6) {
                dead.set(target.id, "predation");
                p.cooldown = 12;
            }
        }
    }

    reproduce() {
        const fertile = this.fish.filter(fish => fish.age >= MATURITY && fish.energy > 64 && fish.cooldown <= 0);
        for (let i = 0; i < fertile.length && this.fish.length < MAX_FISH; i += 1) {
            const a = fertile[i];
            if (a.cooldown > 0) continue;
            let b;
            let best = 4.5 ** 2;
            for (let j = i + 1; j < fertile.length; j += 1) {
                const other = fertile[j];
                if (other.cooldown > 0) continue;
                const d = squaredDistance(a, other);
                if (d < best) { b = other; best = d; }
            }
            if (!b) continue;
            a.cooldown = b.cooldown = 15;
            a.energy -= 23;
            b.energy -= 23;
            const { genes, mutations } = inherit(a.traits, b.traits, this.options.mutation, this.random);
            const generation = Math.max(a.generation, b.generation) + 1;
            // The trackable study label follows one parental line; the genes come from both.
            const lineage = this.random() < 0.5 ? a.lineage : b.lineage;
            const stats = this.lineages[lineage - 1];
            stats.births += 1;
            stats.generation = Math.max(stats.generation, generation);
            this.fish.push(this.createFish(genes, lineage, generation, a, [a.id, b.id], mutations));
            this.births += 1;
            this.generation = Math.max(this.generation, generation);
        }
    }

    sample() {
        this.history.push({
            time: this.time, count: this.fish.length, generation: this.generation,
            histograms: traitHistograms(this.fish),
        });
        if (this.history.length > HISTORY_LIMIT) this.history.shift();
    }

    step() {
        if (!this.fish.length) return;
        this.ticks += 1;
        this.time = this.ticks * STEP;
        this.foodDebt = Math.min(this.options.foodRate * 2, this.foodDebt + this.options.foodRate * STEP);
        for (let i = this.food.length - 1; i >= 0; i -= 1) {
            if ((this.food[i].ttl -= STEP) <= 0) {
                this.food[i] = this.food.at(-1);
                this.food.pop();
            }
        }
        while (this.foodDebt >= 1 && this.food.length < FOOD_MAX) {
            this.spawnFood();
            this.foodDebt -= 1;
        }
        const dead = new Map();
        const school = this.fish.map(({ id, x, y, z, vx, vy, vz, traits }) => ({ id, x, y, z, vx, vy, vz, size: traits.size }));
        for (const fish of this.fish) {
            const cause = this.updateFish(fish, school);
            if (cause) dead.set(fish.id, cause);
        }
        for (const p of this.predators) this.updatePredator(p, dead);
        if (dead.size) {
            this.fish = this.fish.filter(fish => !dead.has(fish.id));
            for (const cause of dead.values()) this.deaths[cause] += 1;
        }
        if (this.ticks % 10 === 0) this.reproduce();
        if (this.ticks % Math.round(HISTORY_INTERVAL / STEP) === 0 || !this.fish.length) this.sample();
    }
}
