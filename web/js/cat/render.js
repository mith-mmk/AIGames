(function () {
    "use strict";

    const { CANVAS, CAT, ITEM_TYPES, OBSTACLE_TYPES } = globalThis.BlackCatData;

    function roundRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    class BlackCatRenderer {
        constructor(canvas, assets) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.assets = assets || { cat: {}, items: {}, obstacles: {}, backgrounds: {} };
        }

        draw(game) {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
            this.drawBackground(game);
            this.drawEntities(game);
            this.drawCat(game);
            if (game.state === "paused") {
                this.drawPaused();
            }
        }

        cameraX(game) {
            return Math.max(0, game.cat.worldX - 270);
        }

        drawBackground(game) {
            const ctx = this.ctx;
            const stage = game.stage;
            const cameraX = this.cameraX(game);
            ctx.fillStyle = stage.theme.sky;
            ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
            this.drawParallaxImage(stage, "far", cameraX * 0.15, stage.theme.far, 92, 330);
            this.drawParallaxImage(stage, "mid", cameraX * 0.38, stage.theme.mid, 260, 350);
            ctx.fillStyle = stage.theme.ground;
            ctx.fillRect(0, CANVAS.groundY, CANVAS.width, CANVAS.height - CANVAS.groundY);
            this.drawParallaxImage(stage, "ground", cameraX, stage.theme.ground, CANVAS.groundY - 20, 160);
            this.drawParallaxImage(stage, "props", cameraX * 0.7, stage.theme.accent, 420, 160);
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, CANVAS.groundY);
            ctx.lineTo(CANVAS.width, CANVAS.groundY);
            ctx.stroke();
        }

        drawParallaxImage(stage, layer, offset, fallbackColor, y, height) {
            const ctx = this.ctx;
            const asset = this.assets.backgrounds[`${stage.id}:${layer}`];
            if (asset && asset.ok) {
                const image = asset.image;
                const width = CANVAS.width;
                const start = -((offset % width) + width) % width;
                for (let x = start - width; x < CANVAS.width + width; x += width) {
                    ctx.drawImage(image, x, layer === "ground" ? CANVAS.groundY - 20 : 0, width, layer === "ground" ? 256 : CANVAS.height);
                }
                return;
            }
            ctx.fillStyle = fallbackColor;
            if (layer === "far") {
                for (let x = -80 - (offset % 260); x < CANVAS.width + 240; x += 260) {
                    roundRect(ctx, x, y, 180, height, 16);
                    ctx.fill();
                }
            } else if (layer === "mid" || layer === "props") {
                for (let x = -120 - (offset % 180); x < CANVAS.width + 200; x += 180) {
                    ctx.beginPath();
                    ctx.arc(x + 70, y + 88, 52, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillRect(0, y, CANVAS.width, height);
            }
        }

        drawEntities(game) {
            const cameraX = this.cameraX(game);
            game.entities.forEach((entity) => {
                const screenX = entity.x - cameraX;
                if (screenX < -220 || screenX > CANVAS.width + 220) {
                    return;
                }
                if (entity.kind === "item") {
                    this.drawItem(entity, screenX);
                } else {
                    this.drawObstacle(entity, screenX);
                }
            });
        }

        drawItem(entity, screenX) {
            const asset = this.assets.items[entity.type];
            if (asset && asset.ok) {
                this.ctx.drawImage(asset.image, screenX, entity.y, entity.width, entity.height);
                return;
            }
            const ctx = this.ctx;
            const spec = ITEM_TYPES[entity.type];
            ctx.save();
            ctx.translate(screenX + entity.width / 2, entity.y + entity.height / 2);
            ctx.fillStyle = {
                fish: "#5aa9e6",
                yarn: "#d65f91",
                bell: "#e9c46a",
                catGrass: "#5fa85f",
                acorn: "#9c6a3b",
                sunsetShard: "#f77f00",
                mysteryButton: "#9b5de5",
                glove: "#f2cc8f",
            }[entity.type] || "#fff";
            if (entity.type === "fish") {
                ctx.beginPath();
                ctx.ellipse(0, 0, spec.width / 2, spec.height / 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-spec.width / 2, 0);
                ctx.lineTo(-spec.width / 2 - 14, -12);
                ctx.lineTo(-spec.width / 2 - 14, 12);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, Math.min(spec.width, spec.height) / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        drawObstacle(entity, screenX) {
            const asset = this.assets.obstacles[entity.type];
            if (asset && asset.ok) {
                this.ctx.drawImage(asset.image, screenX, entity.y, entity.width, entity.height);
                return;
            }
            const ctx = this.ctx;
            const spec = OBSTACLE_TYPES[entity.type];
            ctx.save();
            ctx.globalAlpha = entity.hit ? 0.48 : 1;
            ctx.fillStyle = {
                puddle: "#5aa9e6",
                cardboard: "#b9895d",
                vacuum: "#8d99ae",
                dog: "#8a5a44",
                bicycle: "#444",
                flowerpot: "#bc6c25",
                door: "#7f5539",
            }[entity.type] || "#333";
            if (entity.type === "puddle") {
                ctx.beginPath();
                ctx.ellipse(screenX + spec.width / 2, entity.y + spec.height / 2, spec.width / 2, spec.height / 2.7, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                roundRect(ctx, screenX, entity.y, entity.width, entity.height, 10);
                ctx.fill();
            }
            ctx.restore();
        }

        drawCat(game) {
            const ctx = this.ctx;
            const cameraX = this.cameraX(game);
            const screenX = game.cat.worldX - cameraX;
            const drawX = screenX - CAT.drawWidth / 2;
            const drawY = game.cat.y - CAT.drawHeight + CAT.footOffset;
            const animation = game.cat.animation;
            const asset = this.assets.cat[animation];
            if (asset && asset.ok) {
                const frame = Math.floor(game.cat.animationTime * 8) % asset.frames;
                ctx.save();
                if (game.cat.facing < 0) {
                    ctx.translate(screenX, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(asset.image, frame * 256, 0, 256, 256, -CAT.drawWidth / 2, drawY, CAT.drawWidth, CAT.drawHeight);
                } else {
                    ctx.drawImage(asset.image, frame * 256, 0, 256, 256, drawX, drawY, CAT.drawWidth, CAT.drawHeight);
                }
                ctx.restore();
                return;
            }
            this.drawFallbackCat(game, screenX, drawY);
        }

        drawFallbackCat(game, screenX, drawY) {
            const ctx = this.ctx;
            const save = game.save || {};
            const custom = save.customization || globalThis.BlackCatData.DEFAULT_CUSTOMIZATION;
            ctx.save();
            ctx.translate(screenX, drawY + 48);
            if (game.cat.facing < 0) {
                ctx.scale(-1, 1);
            }
            ctx.fillStyle = "#1f1f24";
            ctx.strokeStyle = "#0b0b0f";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, 16, game.cat.crouching ? 42 : 37, game.cat.crouching ? 24 : 31, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(24, -8, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(9, -27);
            ctx.lineTo(16, -55);
            ctx.lineTo(29, -30);
            ctx.moveTo(34, -28);
            ctx.lineTo(50, -50);
            ctx.lineTo(50, -22);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = "#1f1f24";
            ctx.lineWidth = 11;
            ctx.beginPath();
            ctx.arc(-37, 5, custom.tail === "curled" ? 28 : 36, -1.3, 1.1);
            ctx.stroke();
            ctx.fillStyle = custom.face === "sleepy" ? "#8ecae6" : "#e9c46a";
            ctx.beginPath();
            ctx.arc(19, -10, 4, 0, Math.PI * 2);
            ctx.arc(37, -10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = { red: "#c44536", blue: "#2d6cdf", green: "#4d908e", yellow: "#f4d35e" }[custom.collar] || "#c44536";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(5, 3);
            ctx.quadraticCurveTo(26, 13, 51, 1);
            ctx.stroke();
            if (custom.bell !== "none") {
                ctx.fillStyle = custom.bell === "silver" ? "#d8dee9" : "#e9c46a";
                ctx.beginPath();
                ctx.arc(30, 8, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        drawPaused() {
            const ctx = this.ctx;
            ctx.fillStyle = "rgba(25, 22, 20, 0.34)";
            ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
            ctx.fillStyle = "#fffaf0";
            ctx.font = "700 54px Segoe UI";
            ctx.textAlign = "center";
            ctx.fillText("一時停止", CANVAS.width / 2, CANVAS.height / 2);
        }
    }

    globalThis.BlackCatRenderer = BlackCatRenderer;
}());
