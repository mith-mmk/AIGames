document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');

    // --- 設定 ---
    const WIDTH = 800;
    const HEIGHT = 600;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const HERBIVORE_COUNT = 50; // 草食動物の数
    const CARNIVORE_COUNT = 3;  // 肉食動物の数

    const CREATURE_RADIUS = 5;
    const HERBIVORE_COLOR = 'green';
    const CARNIVORE_COLOR = 'red';

    let creatures = [];

    // --- クリーチャーのクラス ---
    class Creature {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type; // 'herbivore' or 'carnivore'
            this.vx = Math.random() * 2 - 1;
            this.vy = Math.random() * 2 - 1;
            this.maxSpeed = type === 'herbivore' ? 2 : 2.5;
            this.perceptionRadius = type === 'herbivore' ? 50 : 150;
        }

        // 描画
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, CREATURE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'herbivore' ? HERBIVORE_COLOR : CARNIVORE_COLOR;
            ctx.fill();
        }

        // 更新
        update(others) {
            if (this.type === 'herbivore') {
                this.behaveAsHerbivore(others);
            } else {
                this.behaveAsCarnivore(others);
            }

            // 速度を制限
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > this.maxSpeed) {
                this.vx = (this.vx / speed) * this.maxSpeed;
                this.vy = (this.vy / speed) * this.maxSpeed;
            }

            this.x += this.vx;
            this.y += this.vy;

            // 壁との衝突判定
            if (this.x < CREATURE_RADIUS || this.x > WIDTH - CREATURE_RADIUS) this.vx *= -1;
            if (this.y < CREATURE_RADIUS || this.y > HEIGHT - CREATURE_RADIUS) this.vy *= -1;
        }

        // 草食動物の行動
        behaveAsHerbivore(others) {
            let alignment = { x: 0, y: 0 };
            let cohesion = { x: 0, y: 0 };
            let separation = { x: 0, y: 0 };
            let avoidance = { x: 0, y: 0 };
            let herbivoreCount = 0;

            for (const other of others) {
                const d = Math.hypot(this.x - other.x, this.y - other.y);
                if (other !== this && d < this.perceptionRadius) {
                    if (other.type === 'herbivore') {
                        alignment.x += other.vx;
                        alignment.y += other.vy;
                        cohesion.x += other.x;
                        cohesion.y += other.y;
                        if (d < CREATURE_RADIUS * 2) { // 密集しすぎないように
                            separation.x += this.x - other.x;
                            separation.y += this.y - other.y;
                        }
                        herbivoreCount++;
                    } else if (other.type === 'carnivore') {
                        // 肉食動物から逃げる
                        avoidance.x += this.x - other.x;
                        avoidance.y += this.y - other.y;
                    }
                }
            }

            if (herbivoreCount > 0) {
                // 整列 (Alignment)
                alignment.x /= herbivoreCount;
                alignment.y /= herbivoreCount;
                this.vx += (alignment.x - this.vx) * 0.05;
                this.vy += (alignment.y - this.vy) * 0.05;

                // 結合 (Cohesion)
                cohesion.x /= herbivoreCount;
                cohesion.y /= herbivoreCount;
                this.vx += (cohesion.x - this.x - this.vx) * 0.01;
                this.vy += (cohesion.y - this.y - this.vy) * 0.01;

                // 分離 (Separation)
                this.vx += separation.x * 0.1;
                this.vy += separation.y * 0.1;
            }

            // 回避 (Avoidance)
            this.vx += avoidance.x * 0.1;
            this.vy += avoidance.y * 0.1;
        }

        // 肉食動物の行動
        behaveAsCarnivore(others) {
            let closestHerbivore = null;
            let minDistance = Infinity;

            for (const other of others) {
                if (other.type === 'herbivore') {
                    const d = Math.hypot(this.x - other.x, this.y - other.y);
                    if (d < this.perceptionRadius && d < minDistance) {
                        minDistance = d;
                        closestHerbivore = other;
                    }
                }
            }

            if (closestHerbivore) {
                // 最も近い草食動物を追いかける
                this.vx += (closestHerbivore.x - this.x - this.vx) * 0.01;
                this.vy += (closestHerbivore.y - this.y - this.vy) * 0.01;
            } else {
                 // 周りにいなければランダムに動く
                 this.vx += (Math.random() - 0.5) * 0.1;
                 this.vy += (Math.random() - 0.5) * 0.1;
            }
        }
    }

    // --- シミュレーションの初期化 ---
    function init() {
        creatures = [];
        // 草食動物を生成
        for (let i = 0; i < HERBIVORE_COUNT; i++) {
            creatures.push(new Creature(Math.random() * WIDTH, Math.random() * HEIGHT, 'herbivore'));
        }
        // 肉食動物を生成
        for (let i = 0; i < CARNIVORE_COUNT; i++) {
            creatures.push(new Creature(Math.random() * WIDTH, Math.random() * HEIGHT, 'carnivore'));
        }
    }

    // --- アニメーションループ ---
    function animate() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        for (const creature of creatures) {
            creature.update(creatures);
            creature.draw();
        }

        requestAnimationFrame(animate);
    }

    // --- イベントリスナー ---
    document.getElementById('resetButton').addEventListener('click', init);

    // --- 開始 ---
    init();
    animate();
});
