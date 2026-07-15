const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const code = fs.readFileSync("web/js/cards.js", "utf8");
const context = { console, globalThis: {}, setInterval: () => 0 };
vm.createContext(context);
vm.runInContext(code, context);

const SolitaireCore = context.globalThis.SolitaireCore;
const SolitaireUi = context.globalThis.SolitaireUi;
const assetDirectory = "web/assets/cards";

function pngSize(path) {
    const data = fs.readFileSync(path);
    assert.equal(data.subarray(1, 4).toString("ascii"), "PNG");
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function card(rank, suit, value, faceUp = true) {
    return {
        id: `${rank}_${suit}`,
        suit,
        rank,
        color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
        value,
        image: `${String(rank).toLowerCase()}_${suit}.png`,
        faceUp,
    };
}

function fillFoundations(game, maxValue = 13) {
    ["spades", "hearts", "diamonds", "clubs"].forEach((suit) => {
        game.state.foundations[suit] = [];
        for (let value = 1; value <= maxValue; value += 1) {
            game.state.foundations[suit].push(card(String(value), suit, value));
        }
    });
}

function fakeClassList() {
    const values = new Set();
    return {
        add: (...names) => names.forEach((name) => values.add(name)),
        remove: (...names) => names.forEach((name) => values.delete(name)),
        contains: (name) => values.has(name),
    };
}

function fakeElement(dataset = {}) {
    return {
        dataset,
        style: {},
        className: "",
        textContent: "",
        disabled: false,
        tabIndex: 0,
        children: [],
        classList: fakeClassList(),
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        addEventListener() {},
        setAttribute() {},
    };
}

function fakeUi(game) {
    const statusText = fakeElement();
    const ui = Object.create(SolitaireUi.prototype);
    ui.core = game;
    ui.backImage = "back00.png";
    ui.selected = null;
    ui.completionShown = false;
    ui.effectCalls = 0;
    ui.playCompleteEffect = () => {
        ui.effectCalls += 1;
    };
    ui.elements = {
        stock: fakeElement(),
        waste: fakeElement(),
        foundations: ["spades", "hearts", "diamonds", "clubs"].map((suit) => fakeElement({ foundation: suit })),
        tableau: fakeElement(),
        undoButton: fakeElement(),
        statusText,
    };
    return ui;
}

{
    const deck = SolitaireCore.buildDeck();
    assert.equal(deck.length, 52);
    assert.equal(new Set(deck.map((card) => card.id)).size, 52);
}

{
    const deckImages = SolitaireCore.buildDeck().map((item) => item.image);
    const extraImages = ["joker_red.png", "joker_black.png"];
    const backImages = Array.from({ length: 6 }, (_, index) => `back${String(index).padStart(2, "0")}.png`);
    [...deckImages, ...extraImages, ...backImages].forEach((name) => {
        const path = `${assetDirectory}/${name}`;
        assert.equal(fs.existsSync(path), true, `${name} is missing`);
        assert.equal(JSON.stringify(pngSize(path)), "[74,104]", `${name} has an invalid size`);
    });
    const html = fs.readFileSync("web/cards.html", "utf8");
    const backOptions = html.match(/value="back\d{2}\.png"/g) || [];
    assert.equal(backOptions.length, 6);
    assert.equal(new Set(backOptions).size, 6);
}

{
    const game = new SolitaireCore({ seed: 1234, drawCount: 1 });
    assert.equal(JSON.stringify(game.state.tableau.map((column) => column.length)), "[1,2,3,4,5,6,7]");
    assert.equal(game.state.stock.length, 24);
    assert.equal(game.state.tableau.every((column) => column[column.length - 1].faceUp), true);
}

{
    const game = new SolitaireCore({ seed: 42, drawCount: 3 });
    assert.equal(game.drawStock(), true);
    assert.equal(game.state.waste.length, 3);
    assert.equal(game.undo(), true);
    assert.equal(game.state.waste.length, 0);
    assert.equal(game.state.stock.length, 24);
}

{
    const game = new SolitaireCore({ seed: 7 });
    game.state.waste = [card("A", "spades", 1)];
    assert.equal(game.moveWasteToFoundation(), true);
    assert.equal(game.state.foundations.spades.length, 1);
}

{
    const game = new SolitaireCore({ seed: 8 });
    game.state.tableau = [
        [card("K", "spades", 13)],
        [card("Q", "hearts", 12)],
        [], [], [], [], [],
    ];
    assert.equal(game.moveTableauToTableau(1, 0, 0), true);
    assert.equal(game.state.tableau[0].length, 2);
}

{
    const game = new SolitaireCore({ seed: 13 });
    game.state.tableau = [
        [card("K", "spades", 13), card("Q", "hearts", 12), card("J", "clubs", 11), card("10", "diamonds", 10)],
        [card("K", "clubs", 13)],
        [], [], [], [], [],
    ];
    assert.equal(game.moveTableauToTableau(0, 1, 1), true);
    assert.equal(game.state.tableau[0].length, 1);
    assert.equal(game.state.tableau[1].map((item) => item.rank).join(","), "K,Q,J,10");
    assert.equal(game.moveTableauToTableau(1, 0, 2), true);
    assert.equal(game.state.tableau[2].map((item) => item.rank).join(","), "K,Q,J,10");
}

{
    const game = new SolitaireCore({ seed: 9 });
    fillFoundations(game, 12);
    game.state.tableau = [[card("K", "spades", 13)], [], [], [], [], [], []];
    game.state.stock = [];
    game.state.waste = [];
    assert.equal(game.moveTableauToFoundation(0), true);
    assert.equal(game.completed, false);
    game.state.foundations.hearts.push(card("K", "hearts", 13));
    game.state.foundations.diamonds.push(card("K", "diamonds", 13));
    game.state.foundations.clubs.push(card("K", "clubs", 13));
    game.noteProgress();
    assert.equal(game.completed, true);
}

{
    const game = new SolitaireCore({ seed: 10 });
    fillFoundations(game, 13);
    game.state.stock = [];
    game.state.waste = [];
    game.state.tableau = [[], [], [], [], [], [], []];
    assert.equal(game.isComplete(), true);
    game.state.stock.push(card("A", "spades", 1, false));
    assert.equal(game.isComplete(), false);
}

{
    const game = new SolitaireCore({ seed: 11 });
    fillFoundations(game, 13);
    game.state.foundations.spades.pop();
    game.state.stock = [];
    game.state.waste = [];
    game.state.tableau = [[card("K", "spades", 13)], [], [], [], [], [], []];
    assert.equal(game.moveTableauToFoundation(0), true);
    assert.equal(game.completed, true);
    assert.equal(game.undo(), true);
    assert.equal(game.completed, false);
}

{
    context.document = {
        body: fakeElement(),
        createElement: () => fakeElement(),
        elementsFromPoint: () => [],
        querySelectorAll: () => [],
    };
    context.window = {
        innerWidth: 980,
        setTimeout: (callback) => {
            callback();
            return 0;
        },
    };
    const game = new SolitaireCore({ seed: 12 });
    fillFoundations(game, 13);
    game.state.stock = [];
    game.state.waste = [];
    game.state.tableau = [[], [], [], [], [], [], []];
    const ui = fakeUi(game);
    ui.render();
    assert.equal(ui.completionShown, true);
    assert.equal(ui.effectCalls, 1);
    ui.render();
    assert.equal(ui.effectCalls, 1);
    game.state.tableau = [[card("K", "spades", 13)], [], [], [], [], [], []];
    ui.render();
    assert.equal(ui.completionShown, false);
}

{
    const targetColumn = fakeElement({ column: "3" });
    targetColumn.closest = (selector) => selector === ".tableau-column" ? targetColumn : null;
    context.document.elementsFromPoint = () => [targetColumn];
    const ui = Object.create(SolitaireUi.prototype);
    const draggedCard = fakeElement();
    const target = ui.dropTargetAt(100, 200, [draggedCard]);
    assert.equal(target.column, targetColumn);
    assert.equal(draggedCard.style.visibility, "");
}
