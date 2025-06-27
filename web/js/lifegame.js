document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('lifeCanvas');
            const ctx = canvas.getContext('2d');

            // --- 設定 ---
            const GRID_WIDTH = 80;  // グリッドの幅（セル数）
            const GRID_HEIGHT = 60; // グリッドの高さ（セル数）
            const CELL_SIZE = 10;   // 1セルのピクセルサイズ
            const ALIVE_COLOR = '#333333';
            const DEAD_COLOR = '#FFFFFF';
            const GRID_LINE_COLOR = '#E0E0E0';

            canvas.width = GRID_WIDTH * CELL_SIZE;
            canvas.height = GRID_HEIGHT * CELL_SIZE;

            let grid;
            let isRunning = false;
            let animationId = null;

            // グリッドを初期化する（すべて0で埋める）
            const createGrid = () => {
                return new Array(GRID_HEIGHT).fill(null)
                    .map(() => new Array(GRID_WIDTH).fill(0));
            };

            // グリッドをランダムな状態で埋める
            const randomizeGrid = () => {
                grid = createGrid();
                for (let y = 0; y < GRID_HEIGHT; y++) {
                    for (let x = 0; x < GRID_WIDTH; x++) {
                        grid[y][x] = Math.random() > 0.75 ? 1 : 0; // 25%の確率で生存
                    }
                }
            };

            // グリッドをCanvasに描画する
            const drawGrid = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (let y = 0; y < GRID_HEIGHT; y++) {
                    for (let x = 0; x < GRID_WIDTH; x++) {
                        ctx.fillStyle = grid[y][x] ? ALIVE_COLOR : DEAD_COLOR;
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        ctx.strokeStyle = GRID_LINE_COLOR;
                        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            };

            // 特定のセルの周囲の生存セルを数える（グリッドの端はループする）
            const countNeighbors = (x, y) => {
                let count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;

                        const nx = (x + dx + GRID_WIDTH) % GRID_WIDTH;
                        const ny = (y + dy + GRID_HEIGHT) % GRID_HEIGHT;

                        count += grid[ny][nx];
                    }
                }
                return count;
            };

            // グリッドの状態を次の世代に更新する
            const updateGrid = () => {
                const nextGrid = createGrid();

                for (let y = 0; y < GRID_HEIGHT; y++) {
                    for (let x = 0; x < GRID_WIDTH; x++) {
                        const neighbors = countNeighbors(x, y);
                        const cellState = grid[y][x];

                        // ライフゲームのルール
                        // 1. 生存セルは、隣接する生存セルが2つか3つなら次の世代でも生存する
                        // 2. 死滅セルは、隣接する生存セルがちょうど3つなら次の世代で誕生する
                        if (cellState === 1 && (neighbors === 2 || neighbors === 3)) {
                            nextGrid[y][x] = 1;
                        } else if (cellState === 0 && neighbors === 3) {
                            nextGrid[y][x] = 1;
                        } else {
                            nextGrid[y][x] = 0;
                        }
                    }
                }
                grid = nextGrid;
            };

            // ゲームループ
            const gameLoop = () => {
                if (!isRunning) return;
                updateGrid();
                drawGrid();
                animationId = requestAnimationFrame(gameLoop);
            };

            // --- コントロール ---
            const toggleButton = document.getElementById('toggleButton');
            const randomizeButton = document.getElementById('randomizeButton');

            const toggleSimulation = () => {
                isRunning = !isRunning;
                if (isRunning) {
                    toggleButton.textContent = '停止';
                    gameLoop();
                } else {
                    toggleButton.textContent = '開始';
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                    }
                }
            };

            toggleButton.addEventListener('click', toggleSimulation);

            randomizeButton.addEventListener('click', () => {
                if (isRunning) {
                    toggleSimulation(); // 一旦停止
                }
                randomizeGrid();
                drawGrid();
            });
            
            // マウスクリックでセルを反転させる機能
            canvas.addEventListener('click', (event) => {
                if (isRunning) return; // 実行中は編集不可

                const rect = canvas.getBoundingClientRect();
                const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
                const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);

                if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    grid[y][x] = grid[y][x] ? 0 : 1;
                    drawGrid();
                }
            });


            // --- 初期化 ---
            randomizeGrid();
            drawGrid();
        });