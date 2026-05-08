(function () {
    "use strict";

    class BlackCatInput {
        constructor(game, canvas) {
            this.game = game;
            this.canvas = canvas;
            this.pressTimer = null;
            this.longPressActive = false;
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onKeyUp = this.onKeyUp.bind(this);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);
        }

        bind() {
            globalThis.addEventListener("keydown", this.onKeyDown);
            globalThis.addEventListener("keyup", this.onKeyUp);
            this.canvas.addEventListener("pointerdown", this.onPointerDown);
            this.canvas.addEventListener("pointerup", this.onPointerUp);
            this.canvas.addEventListener("pointercancel", this.onPointerUp);
            this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
        }

        onKeyDown(event) {
            if (event.repeat) {
                return;
            }
            if (event.key === "ArrowLeft") {
                this.game.setAction("left", true);
                event.preventDefault();
            } else if (event.key === "ArrowRight") {
                this.game.setAction("right", true);
                event.preventDefault();
            } else if (event.key === " " || event.code === "Space") {
                this.game.setAction("jump", true);
                event.preventDefault();
            } else if (event.key === "ArrowDown") {
                this.game.setAction("crouch", true);
                event.preventDefault();
            } else if (event.key.toLowerCase() === "p") {
                this.game.pause();
            }
        }

        onKeyUp(event) {
            if (event.key === "ArrowLeft") {
                this.game.setAction("left", false);
            } else if (event.key === "ArrowRight") {
                this.game.setAction("right", false);
            } else if (event.key === "ArrowDown") {
                this.game.setAction("crouch", false);
            }
        }

        onPointerDown(event) {
            event.preventDefault();
            this.longPressActive = false;
            clearTimeout(this.pressTimer);
            this.pressTimer = globalThis.setTimeout(() => {
                this.longPressActive = true;
                this.game.setAction("crouch", true);
            }, 280);
        }

        onPointerUp(event) {
            event.preventDefault();
            clearTimeout(this.pressTimer);
            if (this.longPressActive) {
                this.game.setAction("crouch", false);
            } else {
                this.game.setAction("jump", true);
            }
            this.longPressActive = false;
        }
    }

    globalThis.BlackCatInput = BlackCatInput;
}());
