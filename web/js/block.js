const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let score = 0;
let lives = 3;
let highScore = 0;
let paused = false;
let gameOver = false;

// Paddle
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,
    width: 100,
    height: 10,
    color: '#fff',
    dx: 0
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 4,
    dx: 4,
    dy: -4,
    color: '#fff'
};

// Bricks
const brickInfo = {
    width: 75,
    height: 20,
    padding: 10,
    offsetX: 45,
    offsetY: 60,
    color: ['#f00', '#00f', '#0f0', '#ff0', '#f0f']
};

const bricks = [];
for (let r = 0; r < 5; r++) {
    bricks[r] = [];
    for (let c = 0; c < 10; c++) {
        bricks[r][c] = { x: 0, y: 0, status: 1, color: brickInfo.color[r] };
    }
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaddle();
    drawBall();
    drawBricks();
    drawScore();
    drawLives();
}

// Draw paddle
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    ctx.closePath();
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// Draw bricks
function drawBricks() {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) {
            if (bricks[r][c].status === 1) {
                const brickX = (c * (brickInfo.width + brickInfo.padding)) + brickInfo.offsetX;
                const brickY = (r * (brickInfo.height + brickInfo.padding)) + brickInfo.offsetY;
                bricks[r][c].x = brickX;
                bricks[r][c].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickInfo.width, brickInfo.height);
                ctx.fillStyle = bricks[r][c].color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// Draw score
function drawScore() {
    document.getElementById('score').innerText = score;
}

// Draw lives
function drawLives() {
    document.getElementById('lives').innerText = '❤'.repeat(lives);
}

// Update game objects
function update() {
    if (paused || gameOver) return;

    movePaddle();
    moveBall();

    // Wall collision (left/right)
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }

    // Wall collision (top)
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    }

    // Paddle collision
    if (ball.y + ball.dy > canvas.height - ball.radius - paddle.height) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
        }
    }

    // Brick collision
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) {
            const b = bricks[r][c];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + brickInfo.width && ball.y > b.y && ball.y < b.y + brickInfo.height) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score += 10 * (r + 1);
                }
            }
        }
    }

    // Bottom wall collision
    if (ball.y + ball.dy > canvas.height - ball.radius) {
        lives--;
        if (lives === 0) {
            gameOver = true;
            showGameOver();
        } else {
            resetBall();
        }
    }

    // Win condition
    if (score === 10 * (1 + 2 + 3 + 4 + 5) * 10) {
        gameOver = true;
        showGameOver();
    }

    draw();
    requestAnimationFrame(update);
}

// Move paddle
function movePaddle() {
    paddle.x += paddle.dx;

    // Wall detection
    if (paddle.x < 0) {
        paddle.x = 0;
    }

    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// Move ball
function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;
}

// Reset ball
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 4;
    ball.dy = -4;
    paddle.x = canvas.width / 2 - 50;
}

// Show game over screen
function showGameOver() {
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').innerText = score;
    if (score > highScore) {
        highScore = score;
        document.getElementById('highScore').innerText = highScore;
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') {
        paddle.dx = -5;
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
        paddle.dx = 5;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'd' || e.key === 'ArrowRight') {
        paddle.dx = 0;
    }
});

document.getElementById('startButton').addEventListener('click', () => {
    if (gameOver) {
        resetGame();
    }
    gameOver = false;
    paused = false;
    document.getElementById('gameOver').classList.add('hidden');
    update();
});

document.getElementById('pauseButton').addEventListener('click', () => {
    paused = !paused;
    if (!paused) {
        update();
    }
});

document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
    gameOver = false;
    paused = false;
    document.getElementById('gameOver').classList.add('hidden');
    update();
});

function resetGame() {
    score = 0;
    lives = 3;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) {
            bricks[r][c].status = 1;
        }
    }
    resetBall();
}

// Initial draw
draw();
