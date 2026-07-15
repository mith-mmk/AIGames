(function () {
    "use strict";

    const SUITS = ["spades", "hearts", "diamonds", "clubs"];
    const SUIT_LABEL = { spades: "スペード", hearts: "ハート", diamonds: "ダイヤ", clubs: "クラブ" };
    const RED_SUITS = new Set(["hearts", "diamonds"]);
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const ASSET_PATH = "./assets/cards/";

    function cloneState(state) {
        return JSON.parse(JSON.stringify(state));
    }

    function seededRandom(seed) {
        let value = seed >>> 0;
        return function next() {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    function makeCard(rank, suit) {
        const value = RANKS.indexOf(rank) + 1;
        const color = RED_SUITS.has(suit) ? "red" : "black";
        return {
            id: `${rank}_${suit}`,
            suit,
            rank,
            color,
            value,
            image: `${rank.toLowerCase()}_${suit}.png`,
            faceUp: false,
        };
    }

    class SolitaireCore {
        constructor(options = {}) {
            this.drawCount = options.drawCount || 1;
            this.stuckRounds = options.stuckRounds || 2;
            this.seed = options.seed || Date.now();
            this.history = [];
            this.stockCycles = 0;
            this.movesSinceCycle = 0;
            this.completed = false;
            this.deal(this.seed);
        }

        static buildDeck() {
            const deck = [];
            SUITS.forEach((suit) => {
                RANKS.forEach((rank) => deck.push(makeCard(rank, suit)));
            });
            return deck;
        }

        deal(seed = Date.now()) {
            this.seed = seed;
            const deck = SolitaireCore.buildDeck();
            const random = seededRandom(seed);
            for (let i = deck.length - 1; i > 0; i -= 1) {
                const j = Math.floor(random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }

            this.state = {
                stock: [],
                waste: [],
                foundations: { spades: [], hearts: [], diamonds: [], clubs: [] },
                tableau: [[], [], [], [], [], [], []],
            };
            let offset = 0;
            for (let col = 0; col < 7; col += 1) {
                for (let row = 0; row <= col; row += 1) {
                    const card = deck[offset];
                    card.faceUp = row === col;
                    this.state.tableau[col].push(card);
                    offset += 1;
                }
            }
            this.state.stock = deck.slice(offset).map((card) => ({ ...card, faceUp: false }));
            this.history = [];
            this.stockCycles = 0;
            this.movesSinceCycle = 0;
            this.completed = false;
        }

        retry() {
            this.deal(this.seed);
        }

        restart() {
            this.deal(Date.now());
        }

        setDrawCount(count) {
            this.drawCount = count;
        }

        setStuckRounds(count) {
            this.stuckRounds = count;
        }

        snapshot() {
            return {
                state: cloneState(this.state),
                stockCycles: this.stockCycles,
                movesSinceCycle: this.movesSinceCycle,
                completed: this.completed,
            };
        }

        restore(snapshot) {
            this.state = cloneState(snapshot.state);
            this.stockCycles = snapshot.stockCycles;
            this.movesSinceCycle = snapshot.movesSinceCycle;
            this.completed = snapshot.completed;
        }

        remember() {
            this.history.push(this.snapshot());
            if (this.history.length > 120) {
                this.history.shift();
            }
        }

        undo() {
            const snapshot = this.history.pop();
            if (!snapshot) {
                return false;
            }
            this.restore(snapshot);
            this.syncComplete();
            return true;
        }

        topFoundation(suit) {
            const pile = this.state.foundations[suit];
            return pile[pile.length - 1] || null;
        }

        canMoveToFoundation(card) {
            if (!card || !card.faceUp) {
                return false;
            }
            const top = this.topFoundation(card.suit);
            return (!top && card.value === 1) || (top && top.value + 1 === card.value);
        }

        canMoveToTableau(card, columnIndex) {
            if (!card || !card.faceUp) {
                return false;
            }
            const column = this.state.tableau[columnIndex];
            const top = column[column.length - 1];
            if (!top) {
                return card.value === 13;
            }
            return top.faceUp && top.color !== card.color && top.value === card.value + 1;
        }

        validTableauRun(columnIndex, startIndex) {
            const run = this.state.tableau[columnIndex].slice(startIndex);
            if (!run.length || run.some((card) => !card.faceUp)) {
                return false;
            }
            for (let i = 1; i < run.length; i += 1) {
                const upper = run[i - 1];
                const lower = run[i];
                if (upper.color === lower.color || upper.value !== lower.value + 1) {
                    return false;
                }
            }
            return true;
        }

        flipExposed(columnIndex) {
            const column = this.state.tableau[columnIndex];
            const top = column[column.length - 1];
            if (top && !top.faceUp) {
                top.faceUp = true;
                return true;
            }
            return false;
        }

        noteProgress() {
            this.movesSinceCycle += 1;
            this.syncComplete();
        }

        isComplete() {
            return SUITS.every((suit) => this.state.foundations[suit].length === 13)
                && this.state.stock.length === 0
                && this.state.waste.length === 0
                && this.state.tableau.every((column) => column.length === 0);
        }

        syncComplete() {
            this.completed = this.isComplete();
            return this.completed;
        }

        drawStock() {
            if (this.state.stock.length === 0) {
                if (this.state.waste.length === 0) {
                    return false;
                }
                this.remember();
                this.state.stock = this.state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
                this.state.waste = [];
                this.stockCycles += 1;
                this.movesSinceCycle = 0;
                return true;
            }
            this.remember();
            const count = Math.min(this.drawCount, this.state.stock.length);
            for (let i = 0; i < count; i += 1) {
                const card = this.state.stock.pop();
                card.faceUp = true;
                this.state.waste.push(card);
            }
            return true;
        }

        moveWasteToFoundation() {
            const card = this.state.waste[this.state.waste.length - 1];
            if (!this.canMoveToFoundation(card)) {
                return false;
            }
            this.remember();
            this.state.foundations[card.suit].push(this.state.waste.pop());
            this.noteProgress();
            return true;
        }

        moveWasteToTableau(columnIndex) {
            const card = this.state.waste[this.state.waste.length - 1];
            if (!this.canMoveToTableau(card, columnIndex)) {
                return false;
            }
            this.remember();
            this.state.tableau[columnIndex].push(this.state.waste.pop());
            this.noteProgress();
            return true;
        }

        moveTableauToFoundation(columnIndex) {
            const column = this.state.tableau[columnIndex];
            const card = column[column.length - 1];
            if (!this.canMoveToFoundation(card)) {
                return false;
            }
            this.remember();
            this.state.foundations[card.suit].push(column.pop());
            this.flipExposed(columnIndex);
            this.noteProgress();
            return true;
        }

        moveFoundationToTableau(suit, columnIndex) {
            const pile = this.state.foundations[suit];
            const card = pile[pile.length - 1];
            if (!this.canMoveToTableau(card, columnIndex)) {
                return false;
            }
            this.remember();
            this.state.tableau[columnIndex].push(pile.pop());
            this.noteProgress();
            return true;
        }

        moveTableauToTableau(fromColumn, startIndex, toColumn) {
            if (fromColumn === toColumn || !this.validTableauRun(fromColumn, startIndex)) {
                return false;
            }
            const moving = this.state.tableau[fromColumn].slice(startIndex);
            if (!this.canMoveToTableau(moving[0], toColumn)) {
                return false;
            }
            this.remember();
            this.state.tableau[fromColumn].splice(startIndex);
            this.state.tableau[toColumn].push(...moving);
            this.flipExposed(fromColumn);
            this.noteProgress();
            return true;
        }

        isStuckCandidate() {
            return this.stockCycles >= this.stuckRounds && this.movesSinceCycle === 0 && this.findAutoMove() === null;
        }

        findAutoMove() {
            const waste = this.state.waste[this.state.waste.length - 1];
            if (this.canMoveToFoundation(waste)) {
                return { type: "waste-foundation" };
            }
            for (let col = 0; col < 7; col += 1) {
                if (this.canMoveToFoundation(this.state.tableau[col][this.state.tableau[col].length - 1])) {
                    return { type: "tableau-foundation", col };
                }
            }
            for (let from = 0; from < 7; from += 1) {
                const column = this.state.tableau[from];
                for (let start = 0; start < column.length; start += 1) {
                    if (!column[start].faceUp || column.slice(start).length === column.length) {
                        continue;
                    }
                    for (let to = 0; to < 7; to += 1) {
                        if (this.canMoveToTableau(column[start], to)) {
                            return { type: "tableau-tableau", from, start, to };
                        }
                    }
                }
            }
            for (let from = 0; from < 7; from += 1) {
                const column = this.state.tableau[from];
                for (let start = 0; start < column.length; start += 1) {
                    if (!column[start].faceUp) {
                        continue;
                    }
                    for (let to = 0; to < 7; to += 1) {
                        if (this.canMoveToTableau(column[start], to)) {
                            return { type: "tableau-tableau", from, start, to };
                        }
                    }
                }
            }
            if (this.state.stock.length || this.state.waste.length) {
                return { type: "draw" };
            }
            return null;
        }

        runAutoStep() {
            const move = this.findAutoMove();
            if (!move) {
                return false;
            }
            if (move.type === "waste-foundation") {
                return this.moveWasteToFoundation();
            }
            if (move.type === "tableau-foundation") {
                return this.moveTableauToFoundation(move.col);
            }
            if (move.type === "tableau-tableau") {
                return this.moveTableauToTableau(move.from, move.start, move.to);
            }
            return this.drawStock();
        }
    }

    class SolitaireUi {
        constructor() {
            this.core = new SolitaireCore();
            this.backImage = "back00.png";
            this.selected = null;
            this.autoTimer = null;
            this.startedAt = Date.now();
            this.effects = null;
            this.drag = null;
            this.completionShown = false;
            this.completionBanner = this.createCompletionBanner();
            this.elements = {
                menuButton: document.getElementById("menu-button"),
                menuPanel: document.getElementById("menu-panel"),
                timeDisplay: document.getElementById("time-display"),
                retryButton: document.getElementById("retry-button"),
                restartButton: document.getElementById("restart-button"),
                autoButton: document.getElementById("auto-button"),
                undoButton: document.getElementById("undo-button"),
                statusText: document.getElementById("status-text"),
                drawCount: document.getElementById("draw-count-select"),
                stuckRounds: document.getElementById("stuck-rounds-select"),
                backSelect: document.getElementById("back-select"),
                stock: document.getElementById("stock-pile"),
                waste: document.getElementById("waste-pile"),
                tableau: document.getElementById("tableau"),
                foundations: Array.from(document.querySelectorAll(".foundation-pile")),
            };
            this.bind();
            this.render();
            this.startClock();
            this.initEffects();
        }

        createCompletionBanner() {
            const banner = document.createElement("div");
            banner.className = "completion-banner";
            banner.setAttribute("aria-hidden", "true");
            banner.textContent = "CLEAR";
            document.body.appendChild(banner);
            return banner;
        }

        bind() {
            this.elements.menuButton.addEventListener("click", () => {
                const hidden = this.elements.menuPanel.hidden;
                this.elements.menuPanel.hidden = !hidden;
                this.elements.menuButton.setAttribute("aria-expanded", String(hidden));
            });
            this.elements.retryButton.addEventListener("click", () => this.resetGame("retry"));
            this.elements.restartButton.addEventListener("click", () => this.resetGame("restart"));
            this.elements.undoButton.addEventListener("click", () => {
                this.stopAuto();
                this.setStatus(this.core.undo() ? "1手戻しました。" : "戻せる手がありません。");
                this.selected = null;
                this.render();
            });
            this.elements.autoButton.addEventListener("click", () => this.toggleAuto());
            this.elements.drawCount.addEventListener("change", (event) => {
                this.core.setDrawCount(Number(event.target.value));
            });
            this.elements.stuckRounds.addEventListener("change", (event) => {
                this.core.setStuckRounds(Number(event.target.value));
                this.render();
            });
            this.elements.backSelect.addEventListener("change", (event) => {
                this.backImage = event.target.value;
                this.render();
            });
            this.elements.stock.addEventListener("click", () => {
                this.stopAuto();
                this.selected = null;
                this.setStatus(this.core.drawStock() ? "山札をめくりました。" : "山札は空です。");
                this.render();
            });
            this.elements.waste.addEventListener("click", () => this.selectWaste());
            this.elements.foundations.forEach((pile) => {
                pile.addEventListener("click", () => this.handleFoundationClick(pile.dataset.foundation));
            });
        }

        startClock() {
            window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
                const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
                const seconds = String(elapsed % 60).padStart(2, "0");
                this.elements.timeDisplay.textContent = `${minutes}:${seconds}`;
            }, 1000);
        }

        resetGame(kind) {
            this.stopAuto();
            this.selected = null;
            this.startedAt = Date.now();
            this.resetCompletionEffect();
            if (kind === "retry") {
                this.core.retry();
                this.setStatus("同じ並びで再開しました。");
            } else {
                this.core.restart();
                this.setStatus("新しい並びで開始しました。");
            }
            this.render();
        }

        cardButton(card, source, index) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `card ${card.faceUp ? "face-up" : "face-down"}`;
            button.dataset.cardId = card.id;
            button.style.backgroundImage = `url("${ASSET_PATH}${card.faceUp ? card.image : this.backImage}")`;
            button.style.top = source.type === "tableau" ? `${index * this.cardOffset()}px` : "0";
            button.setAttribute("aria-label", card.faceUp ? `${card.rank} ${SUIT_LABEL[card.suit]}` : "裏向きカード");
            if (card.faceUp) {
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    this.handleCardClick(source);
                });
                button.addEventListener("dblclick", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleCardDoubleClick(source);
                });
                this.bindDrag(button, source);
            }
            if (this.isSelected(source)) {
                button.classList.add("selected");
            }
            return button;
        }

        cardOffset() {
            const width = Math.max(44, Math.min(74, window.innerWidth < 620 ? (window.innerWidth - 44) / 7 : window.innerWidth * 0.09));
            return Math.max(18, Math.min(29, width * 0.38));
        }

        renderPile(pile, cards, sourceFactory) {
            pile.textContent = "";
            cards.forEach((card, index) => pile.appendChild(this.cardButton(card, sourceFactory(index), index)));
        }

        render() {
            this.core.syncComplete();
            this.elements.stock.textContent = "";
            if (this.core.state.stock.length) {
                const back = document.createElement("span");
                back.className = "card face-down";
                back.style.backgroundImage = `url("${ASSET_PATH}${this.backImage}")`;
                this.elements.stock.appendChild(back);
            }
            this.renderPile(this.elements.waste, this.core.state.waste.slice(-3), (index) => {
                const base = Math.max(0, this.core.state.waste.length - 3);
                return { type: "waste", index: base + index };
            });
            this.elements.foundations.forEach((pile) => {
                const suit = pile.dataset.foundation;
                this.renderPile(pile, this.core.state.foundations[suit].slice(-1), () => ({ type: "foundation", suit }));
            });
            this.elements.tableau.textContent = "";
            this.core.state.tableau.forEach((column, col) => {
                const columnElement = document.createElement("div");
                columnElement.className = "tableau-column";
                columnElement.dataset.column = String(col);
                columnElement.tabIndex = 0;
                columnElement.setAttribute("role", "button");
                columnElement.setAttribute("aria-label", `場札 ${col + 1}`);
                columnElement.addEventListener("click", () => this.handleTableauClick(col));
                column.forEach((card, index) => columnElement.appendChild(this.cardButton(card, { type: "tableau", col, index }, index)));
                this.elements.tableau.appendChild(columnElement);
            });
            this.elements.undoButton.disabled = this.core.history.length === 0;
            if (this.core.completed) {
                if (!this.completionShown) {
                    this.showCompletion();
                }
            } else if (this.core.isStuckCandidate()) {
                this.resetCompletionEffect();
                this.setStatus("詰み候補です。手動で動かせるカードを探してください。");
            } else {
                this.resetCompletionEffect();
            }
        }

        selectWaste() {
            const card = this.core.state.waste[this.core.state.waste.length - 1];
            if (!card) {
                return;
            }
            this.selected = { type: "waste" };
            this.setStatus("山札のカードを選択しました。");
            this.render();
        }

        handleCardClick(source) {
            this.stopAuto();
            if (source.type === "waste") {
                this.selectWaste();
                return;
            }
            if (source.type === "foundation") {
                this.selected = { type: "foundation", suit: source.suit };
                this.render();
                return;
            }
            const card = this.core.state.tableau[source.col][source.index];
            if (!card || !card.faceUp) {
                return;
            }
            if (this.selected) {
                const moved = this.tryMoveSelectionToTableau(source.col);
                if (moved) {
                    this.selected = null;
                    this.render();
                    return;
                }
            }
            this.selected = { type: "tableau", col: source.col, index: source.index };
            this.setStatus("カードを選択しました。");
            this.render();
        }

        handleCardDoubleClick(source) {
            this.stopAuto();
            this.cancelDrag();
            this.selected = null;
            let moved = false;
            if (source.type === "waste") {
                moved = source.index === this.core.state.waste.length - 1 && this.core.moveWasteToFoundation();
            } else if (source.type === "tableau") {
                const column = this.core.state.tableau[source.col];
                moved = source.index === column.length - 1 && this.core.moveTableauToFoundation(source.col);
            }
            this.setStatus(moved ? "組札へ移動しました。" : "組札には置けません。");
            this.render();
        }

        handleTableauClick(col) {
            this.stopAuto();
            if (!this.selected) {
                return;
            }
            const moved = this.tryMoveSelectionToTableau(col);
            this.setStatus(moved ? "場札へ移動しました。" : "そこには置けません。");
            if (moved) {
                this.selected = null;
            }
            this.render();
        }

        handleFoundationClick(suit) {
            this.stopAuto();
            let moved = false;
            if (!this.selected) {
                return;
            }
            if (this.selected.type === "waste") {
                moved = this.core.moveWasteToFoundation();
            } else if (this.selected.type === "tableau") {
                const col = this.selected.col;
                const column = this.core.state.tableau[col];
                moved = this.selected.index === column.length - 1 && column[column.length - 1].suit === suit && this.core.moveTableauToFoundation(col);
            }
            this.setStatus(moved ? "組札へ移動しました。" : "組札には置けません。");
            if (moved) {
                this.selected = null;
            }
            this.render();
        }

        tryMoveSelectionToTableau(col) {
            if (this.selected.type === "waste") {
                return this.core.moveWasteToTableau(col);
            }
            if (this.selected.type === "foundation") {
                return this.core.moveFoundationToTableau(this.selected.suit, col);
            }
            return this.core.moveTableauToTableau(this.selected.col, this.selected.index, col);
        }

        isSelected(source) {
            if (!this.selected) {
                return false;
            }
            if (this.selected.type === "waste" && source.type === "waste") {
                return source.index === this.core.state.waste.length - 1;
            }
            return this.selected.type === source.type && this.selected.col === source.col && this.selected.index === source.index && this.selected.suit === source.suit;
        }

        toggleAuto() {
            if (this.autoTimer) {
                this.stopAuto();
                return;
            }
            this.elements.autoButton.textContent = "stop";
            this.autoTimer = window.setInterval(() => {
                const moved = this.core.runAutoStep();
                this.selected = null;
                this.render();
                if (!moved || this.core.completed || this.core.isStuckCandidate()) {
                    this.stopAuto();
                    this.setStatus(moved ? "autoを停止しました。" : "autoで動かせる手がありません。");
                }
            }, 260);
        }

        stopAuto() {
            if (this.autoTimer) {
                window.clearInterval(this.autoTimer);
                this.autoTimer = null;
                this.elements.autoButton.textContent = "auto";
            }
        }

        setStatus(text) {
            this.elements.statusText.textContent = text;
        }

        bindDrag(button, source) {
            button.addEventListener("pointerdown", (event) => {
                if (event.button !== 0) {
                    return;
                }
                this.stopAuto();
                this.drag = {
                    pointerId: event.pointerId,
                    source,
                    startX: event.clientX,
                    startY: event.clientY,
                    moved: false,
                    cards: this.dragCards(button, source),
                };
                button.setPointerCapture(event.pointerId);
            });
            button.addEventListener("pointermove", (event) => this.moveDrag(event));
            button.addEventListener("pointerup", (event) => {
                this.finishDrag(event);
            });
            button.addEventListener("pointercancel", () => this.cancelDrag());
            button.addEventListener("lostpointercapture", () => this.cancelDrag());
        }

        dragCards(button, source) {
            if (source.type !== "tableau") {
                return [button];
            }
            const column = button.closest(".tableau-column");
            if (!column) {
                return [button];
            }
            return Array.from(column.querySelectorAll(".card")).slice(source.index);
        }

        moveDrag(event) {
            if (!this.drag || this.drag.pointerId !== event.pointerId) {
                return;
            }
            const dx = event.clientX - this.drag.startX;
            const dy = event.clientY - this.drag.startY;
            if (!this.drag.moved && Math.hypot(dx, dy) < 4) {
                return;
            }
            event.preventDefault();
            this.drag.moved = true;
            this.drag.cards.forEach((card, index) => {
                card.classList.add(index === 0 ? "dragging" : "dragging-stack");
                card.style.transform = `translate(${dx}px, ${dy}px)`;
            });
        }

        finishDrag(event) {
            if (!this.drag || this.drag.pointerId !== event.pointerId) {
                return;
            }
            const drag = this.drag;
            this.drag = null;
            if (!drag.moved) {
                this.clearDragStyles(drag.cards);
                return;
            }
            const target = this.dropTargetAt(event.clientX, event.clientY, drag.cards);
            this.clearDragStyles(drag.cards);
            if (target.column) {
                this.selected = drag.source;
                this.handleTableauClick(Number(target.column.dataset.column));
            } else if (target.foundation) {
                this.selected = drag.source;
                this.handleFoundationClick(target.foundation.dataset.foundation);
            } else {
                this.selected = null;
            }
        }

        dropTargetAt(clientX, clientY, draggedCards) {
            draggedCards.forEach((card) => {
                card.style.visibility = "hidden";
            });
            try {
                const elements = typeof document.elementsFromPoint === "function"
                    ? document.elementsFromPoint(clientX, clientY)
                    : [document.elementFromPoint(clientX, clientY)];
                const closest = (selector) => elements
                    .map((element) => (element && typeof element.closest === "function" ? element.closest(selector) : null))
                    .find(Boolean) || null;
                const column = closest(".tableau-column") || this.dropZoneAt(".tableau-column", clientX, clientY);
                const foundation = closest(".foundation-pile") || this.dropZoneAt(".foundation-pile", clientX, clientY);
                return { column, foundation };
            } finally {
                draggedCards.forEach((card) => {
                    card.style.visibility = "";
                });
            }
        }

        dropZoneAt(selector, clientX, clientY) {
            return Array.from(document.querySelectorAll(selector)).find((zone) => {
                const rect = zone.getBoundingClientRect();
                return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
            }) || null;
        }

        cancelDrag() {
            if (!this.drag) {
                return;
            }
            this.clearDragStyles(this.drag.cards);
            this.drag = null;
        }

        clearDragStyles(cards) {
            cards.forEach((card) => {
                card.classList.remove("dragging", "dragging-stack");
                card.style.transform = "";
            });
        }

        initEffects() {
            if (!window.THREE) {
                return;
            }
            const canvas = document.getElementById("cards-effects");
            let renderer;
            try {
                renderer = new window.THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            } catch (error) {
                console.warn("Three.js completion effect is unavailable.", error);
                return;
            }
            const scene = new window.THREE.Scene();
            const camera = new window.THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.z = 18;
            const group = new window.THREE.Group();
            scene.add(group);
            const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            this.effects = { renderer, scene, camera, group, active: false, start: 0, canvas, reducedMotion };
            const resize = () => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            };
            window.addEventListener("resize", resize);
            resize();
            const animate = () => {
                window.requestAnimationFrame(animate);
                if (!this.effects || !this.effects.active) {
                    return;
                }
                const elapsed = (Date.now() - this.effects.start) / 1000;
                group.children.forEach((mesh, index) => {
                    const speed = this.effects.reducedMotion ? 0.35 : 1;
                    mesh.position.y = mesh.userData.baseY + Math.sin(elapsed * 5 + index) * 0.7 * speed + elapsed * mesh.userData.rise * speed;
                    mesh.position.x = mesh.userData.baseX + Math.sin(elapsed * 2.8 + index) * 0.28 * speed;
                    mesh.rotation.z += (0.045 + index * 0.002) * speed;
                    mesh.rotation.x += 0.022 * speed;
                    mesh.material.opacity = Math.max(0, 1 - elapsed / 4.8);
                });
                renderer.render(scene, camera);
                if (elapsed > (this.effects.reducedMotion ? 2.2 : 5)) {
                    this.effects.active = false;
                    group.clear();
                    renderer.clear();
                    document.body.classList.remove("effects-active");
                }
            };
            animate();
        }

        showCompletion() {
            this.completionShown = true;
            this.setStatus("クリアです。");
            document.body.classList.add("completion-active");
            window.setTimeout(() => {
                document.body.classList.remove("completion-active");
            }, 2600);
            this.playCompleteEffect();
        }

        resetCompletionEffect() {
            if (!this.completionShown && !document.body.classList.contains("completion-active")) {
                return;
            }
            this.completionShown = false;
            document.body.classList.remove("completion-active", "effects-active");
            if (this.effects) {
                this.effects.active = false;
                this.effects.group.clear();
                this.effects.renderer.clear();
            }
        }

        playCompleteEffect() {
            if (!this.effects || this.effects.active) {
                return;
            }
            const { group } = this.effects;
            group.clear();
            document.body.classList.add("effects-active");
            const textureLoader = new window.THREE.TextureLoader();
            const count = this.effects.reducedMotion ? 8 : 24;
            for (let i = 0; i < count; i += 1) {
                const suit = SUITS[i % SUITS.length];
                const rank = RANKS[(i * 3) % RANKS.length].toLowerCase();
                const texture = textureLoader.load(`${ASSET_PATH}${rank}_${suit}.png`);
                const material = new window.THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 });
                const geometry = new window.THREE.PlaneGeometry(1.45, 2.04);
                const mesh = new window.THREE.Mesh(geometry, material);
                const spread = count > 12 ? 8.8 : 6.2;
                mesh.userData.baseX = -spread / 2 + (spread / Math.max(1, count - 1)) * i;
                mesh.userData.baseY = -4.1 + (i % 4) * 0.34;
                mesh.userData.rise = 1.15 + (i % 5) * 0.18;
                mesh.position.x = mesh.userData.baseX;
                mesh.position.y = mesh.userData.baseY;
                mesh.position.z = -i * 0.025;
                mesh.rotation.z = -0.65 + (i % 7) * 0.22;
                group.add(mesh);
            }
            this.effects.start = Date.now();
            this.effects.active = true;
        }
    }

    globalThis.SolitaireCore = SolitaireCore;
    globalThis.SolitaireUi = SolitaireUi;
    if (typeof document !== "undefined") {
        window.addEventListener("DOMContentLoaded", () => {
            new SolitaireUi();
        });
    }
}());
