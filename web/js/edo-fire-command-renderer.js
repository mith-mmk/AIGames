(function defineEdoFireRenderer(globalScope) {
    "use strict";

    const api = globalScope.EdoFireCommand;
    if (!api) throw new Error("EdoFireCommand core must be loaded first.");

    const TILE_SIZE = 80;
    const PALETTE = Object.freeze({
        ink: "#251b17",
        paper: "#d8c79b",
        road: "#cbbb91",
        grid: "rgba(54, 37, 29, 0.28)",
        fire: "#d94b2b",
        fireBright: "#f3b342",
        water: "#3e7183",
        forecast: "rgba(174, 42, 30, 0.32)",
        reachable: "rgba(47, 106, 100, 0.27)",
        selected: "#f0d36b",
    });

    class EdoFireRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            this.context.imageSmoothingEnabled = false;
        }

        tileFromPoint(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((clientX - rect.left) / rect.width * api.WIDTH);
            const y = Math.floor((clientY - rect.top) / rect.height * api.HEIGHT);
            return x >= 0 && y >= 0 && x < api.WIDTH && y < api.HEIGHT ? { x, y } : null;
        }

        render(snapshot, view = {}) {
            const context = this.context;
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.fillStyle = PALETTE.paper;
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            const reachable = new Set((view.reachable || []).map((tile) => `${tile.x},${tile.y}`));
            const forecast = new Map();
            (view.forecast || []).forEach((step, stepIndex) => {
                step.danger.forEach((tile) => {
                    const key = `${tile.x},${tile.y}`;
                    const existing = forecast.get(key);
                    if (!existing || tile.heat > existing.heat) forecast.set(key, { ...tile, step: stepIndex + 1 });
                });
            });
            for (const tile of snapshot.board) {
                this.drawTile(tile, reachable.has(`${tile.x},${tile.y}`), forecast.get(`${tile.x},${tile.y}`));
            }
            this.drawOrders(snapshot);
            for (const squad of snapshot.squads) this.drawSquad(squad, squad.id === view.selectedSquadId);
            if (view.cursor) this.drawCursor(view.cursor);
            this.drawWind(snapshot.wind);
        }

        drawTile(tile, reachable, forecast) {
            const context = this.context;
            const x = tile.x * TILE_SIZE;
            const y = tile.y * TILE_SIZE;
            const definition = api.TILE_TYPES[tile.type];
            context.fillStyle = definition.color || PALETTE.road;
            context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            if (tile.type === "road" || tile.type === "assembly") this.drawRoadTexture(x, y, tile);
            if (tile.type === "house" || tile.type === "landmark") this.drawBuilding(x, y, tile);
            if (tile.type === "well") this.drawWell(x, y);
            if (tile.type === "canal") this.drawCanal(x, y);
            if (tile.type === "rubble") this.drawRubble(x, y);
            if (tile.type === "assembly") this.drawAssembly(x, y);
            if (reachable) {
                context.fillStyle = PALETTE.reachable;
                context.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
            if (forecast && !tile.destroyed) this.drawForecast(x, y, forecast);
            if (tile.wet > 0) this.drawWet(x, y, tile.wet);
            if (tile.civilians > 0) this.drawCivilians(x, y, tile.civilians);
            if (tile.heat > 0) this.drawFire(x, y, tile.heat);
            context.strokeStyle = PALETTE.grid;
            context.lineWidth = 1;
            context.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }

        drawRoadTexture(x, y, tile) {
            const context = this.context;
            context.strokeStyle = "rgba(76, 56, 38, 0.13)";
            context.lineWidth = 2;
            const offset = (tile.x * 13 + tile.y * 7) % 24;
            context.beginPath();
            context.moveTo(x + 8, y + 20 + offset);
            context.lineTo(x + 72, y + 12 + offset);
            context.stroke();
        }

        drawBuilding(x, y, tile) {
            const context = this.context;
            const landmark = tile.type === "landmark";
            context.fillStyle = landmark ? "#3f2925" : "#704631";
            context.fillRect(x + 14, y + 27, 52, 40);
            context.fillStyle = landmark ? "#cfb06a" : "#3d2923";
            context.beginPath();
            context.moveTo(x + 8, y + 30);
            context.lineTo(x + 40, y + 9);
            context.lineTo(x + 72, y + 30);
            context.closePath();
            context.fill();
            context.strokeStyle = "rgba(239, 220, 165, 0.42)";
            context.strokeRect(x + 22, y + 38, 14, 20);
            context.strokeRect(x + 44, y + 38, 14, 20);
            if (landmark) {
                context.fillStyle = "#f0d36b";
                context.font = "700 14px 'Yu Gothic UI', sans-serif";
                context.textAlign = "center";
                context.fillText("守", x + 40, y + 55);
            }
        }

        drawWell(x, y) {
            const context = this.context;
            context.fillStyle = "#315d6c";
            context.beginPath();
            context.ellipse(x + 40, y + 44, 25, 16, 0, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = "#d4c493";
            context.lineWidth = 5;
            context.stroke();
            context.fillStyle = "#dce7df";
            context.font = "700 15px sans-serif";
            context.textAlign = "center";
            context.fillText("井", x + 40, y + 49);
        }

        drawCanal(x, y) {
            const context = this.context;
            context.strokeStyle = "rgba(226, 239, 223, 0.6)";
            context.lineWidth = 3;
            for (let row = 18; row < 72; row += 18) {
                context.beginPath();
                context.moveTo(x + 7, y + row);
                context.bezierCurveTo(x + 24, y + row - 8, x + 49, y + row + 8, x + 73, y + row);
                context.stroke();
            }
        }

        drawRubble(x, y) {
            const context = this.context;
            context.fillStyle = "#403b36";
            [[18, 48], [37, 25], [52, 54], [62, 31], [29, 62]].forEach(([dx, dy], index) => {
                context.save();
                context.translate(x + dx, y + dy);
                context.rotate(index * 0.7);
                context.fillRect(-9, -5, 18, 10);
                context.restore();
            });
        }

        drawAssembly(x, y) {
            const context = this.context;
            context.strokeStyle = "#7b3328";
            context.lineWidth = 4;
            context.strokeRect(x + 12, y + 12, 56, 56);
            context.fillStyle = "#7b3328";
            context.font = "800 18px 'Yu Gothic UI', sans-serif";
            context.textAlign = "center";
            context.fillText("避難", x + 40, y + 47);
        }

        drawForecast(x, y, forecast) {
            const context = this.context;
            context.save();
            context.fillStyle = forecast.destroyed ? "rgba(45, 34, 31, 0.48)" : PALETTE.forecast;
            context.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            context.setLineDash(forecast.step === 1 ? [8, 4] : [3, 5]);
            context.strokeStyle = forecast.heat >= 2 ? "#8e211c" : "#a8642a";
            context.lineWidth = 4;
            context.strokeRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
            context.restore();
        }

        drawWet(x, y, amount) {
            const context = this.context;
            context.fillStyle = "rgba(60, 132, 158, 0.74)";
            context.font = `700 ${14 + amount * 2}px sans-serif`;
            context.textAlign = "left";
            context.fillText("水", x + 7, y + 72);
        }

        drawCivilians(x, y, count) {
            const context = this.context;
            context.fillStyle = "#f6e7b8";
            context.strokeStyle = "#7b3328";
            context.lineWidth = 3;
            context.beginPath();
            context.arc(x + 62, y + 18, 13, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.fillStyle = "#7b3328";
            context.font = "800 13px sans-serif";
            context.textAlign = "center";
            context.fillText(`人${count}`, x + 62, y + 23);
        }

        drawFire(x, y, heat) {
            const context = this.context;
            const size = 16 + heat * 8;
            context.fillStyle = heat >= 2 ? PALETTE.fire : "#dc8039";
            context.beginPath();
            context.moveTo(x + 40, y + 70);
            context.quadraticCurveTo(x + 18, y + 51, x + 38, y + 70 - size);
            context.quadraticCurveTo(x + 46, y + 49, x + 54, y + 31);
            context.quadraticCurveTo(x + 72, y + 55, x + 40, y + 70);
            context.fill();
            context.fillStyle = PALETTE.fireBright;
            context.beginPath();
            context.moveTo(x + 40, y + 67);
            context.quadraticCurveTo(x + 31, y + 57, x + 42, y + 45);
            context.quadraticCurveTo(x + 54, y + 59, x + 40, y + 67);
            context.fill();
        }

        drawOrders(snapshot) {
            const context = this.context;
            context.save();
            context.strokeStyle = "#2f6a64";
            context.fillStyle = "#2f6a64";
            context.lineWidth = 5;
            context.setLineDash([10, 6]);
            for (const squad of snapshot.squads) {
                const order = snapshot.orders[squad.id];
                if (!order) continue;
                const startX = squad.x * TILE_SIZE + TILE_SIZE / 2;
                const startY = squad.y * TILE_SIZE + TILE_SIZE / 2;
                const move = order.move || squad;
                const endX = move.x * TILE_SIZE + TILE_SIZE / 2;
                const endY = move.y * TILE_SIZE + TILE_SIZE / 2;
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                context.stroke();
                if (order.action) {
                    context.setLineDash([]);
                    context.beginPath();
                    context.arc(order.action.x * TILE_SIZE + 40, order.action.y * TILE_SIZE + 40, 26, 0, Math.PI * 2);
                    context.stroke();
                    context.font = "800 15px sans-serif";
                    context.textAlign = "center";
                    context.fillText({ extinguish: "消", refill: "汲", rescue: "救", demolish: "壊" }[order.action.type], order.action.x * TILE_SIZE + 40, order.action.y * TILE_SIZE + 45);
                    context.setLineDash([10, 6]);
                }
            }
            context.restore();
        }

        drawSquad(squad, selected) {
            const context = this.context;
            const definition = api.SQUAD_TYPES[squad.type];
            const x = squad.x * TILE_SIZE + 40;
            const y = squad.y * TILE_SIZE + 40;
            context.fillStyle = squad.type === "water" ? "#285d6d" : squad.type === "ladder" ? "#8a5d2d" : "#75372e";
            context.strokeStyle = selected ? PALETTE.selected : "#f0dfb0";
            context.lineWidth = selected ? 6 : 3;
            context.beginPath();
            context.arc(x, y, selected ? 27 : 24, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.fillStyle = "#fff4cf";
            context.font = "800 18px 'Yu Gothic UI', sans-serif";
            context.textAlign = "center";
            context.fillText(definition.mark, x, y + 6);
        }

        drawCursor(cursor) {
            const context = this.context;
            context.save();
            context.strokeStyle = "#fff1a8";
            context.lineWidth = 4;
            context.setLineDash([6, 4]);
            context.strokeRect(cursor.x * TILE_SIZE + 5, cursor.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            context.restore();
        }

        drawWind(windId) {
            const context = this.context;
            const wind = api.WINDS[windId];
            context.fillStyle = "rgba(35, 27, 23, 0.82)";
            context.fillRect(12, 12, 128, 43);
            context.fillStyle = "#f5df9a";
            context.font = "800 20px 'Yu Gothic UI', sans-serif";
            context.textAlign = "left";
            context.fillText(`${wind.label} ${wind.arrow}`, 24, 41);
        }
    }

    globalScope.EdoFireRenderer = EdoFireRenderer;
})(globalThis);
