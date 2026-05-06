const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const code = fs.readFileSync("web/js/cards.js", "utf8");
const context = { console, globalThis: {}, setInterval: () => 0 };
vm.createContext(context);
vm.runInContext(code, context);

const SolitaireCore = context.globalThis.SolitaireCore;

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

{
    const deck = SolitaireCore.buildDeck();
    assert.equal(deck.length, 52);
    assert.equal(new Set(deck.map((card) => card.id)).size, 52);
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
