# Shared implementation contract

Buildless ESM browser game. Repository `/workspace/scratch/969ff7b0deed/jade-mahjong`. Published files in `dist`. Node native tests `tests/*.test.mjs`. Pure game state separate from WebGL.

## Tiles
Tile `{id:number,type:number,red:boolean}`. id is unique per physical tile. Types 0..8=1m..9m,9..17=1p..9p,18..26=1s..9s,27=東,28=南,29=西,30=北,31=白,32=發,33=中. No Unicode mahjong glyph assets: original SVG/canvas paths, conventional Japanese faces, white dragon blank, 1-sou a bird.

## Core rules/scoring agent owns
`dist/js/core/tiles.js`, `rules.js`, `score.js`; `tests/scoring.test.mjs`, `docs/RULES.md`.
tiles.js exports `tileName(typeOrTile)`, `countsOf(tiles)`, `createTiles(rules)`, `sortTiles(tiles)`, `isTerminalHonor(type)`, `doraFromIndicator(type,players=4)`.
rules.js exports `DEFAULT_RULES`, `normalizeRules(partial)`, `RULE_FIELDS`, `YAKU_CATALOG` (standard+all requested locals), `LOCAL_YAKU`. RULE_FIELDS groups support generic UI; send exact schema to root ASAP. Rules use `players` 3|4, `length` 'east'|'south'|'full', `localYaku` object of enabled flags/config, `yakuOverrides` object.
score.js exports `evaluateHand({tiles,melds,winTile,context,rules})` complete concealed tiles INCLUDE winning tile (14 minus 3*melds, plus physically one extra per kan inside melds). Returns `{valid,reason,han,fu,yakuman,yaku:[{id,name,han,yakuman}],dora,basePoints,limit,payments:{ron,tsumoDealer,tsumoNonDealer},...}`.
`isWinning(tiles,melds=[],rules=DEFAULT_RULES)`, `winningTiles(tiles,melds=[],rules=DEFAULT_RULES)` takes 13-equivalent tiles; returns type numbers. `shanten(tiles,melds=[],rules=DEFAULT_RULES)` returns -1 complete,0 tenpai. `calculatePoints(han,fu,yakuman,context,rules)` accessible tests.
meld `{kind:'chi'|'pon'|'ankan'|'minkan'|'kakan',tiles:Tile[],from:number,calledTileId:number}`. Closed if all melds ankan. context includes `tsumo:boolean,riichi:boolean,doubleRiichi:boolean,openRiichi:boolean,ippatsu:boolean,rinshan:boolean,chankan:boolean,haitei:boolean,houtei:boolean,seatWind:27..30,roundWind:27..30,dealer:boolean,doraIndicators:Tile[],uraIndicators:Tile[],nuki:number,honba:number,firstTurn:boolean,uninterrupted:boolean,renhou:boolean,consecutiveWins:number,lastDiscardRiichi:boolean,lastDiscardAfterKan:boolean`. Additional precise fields can be agreed by message.

## Game agent owns
`dist/js/core/game.js`, `ai.js`, `tests/game.test.mjs`; docs/GAME-API.md.
`MahjongGame` export: constructor(rules?,seed?), `.state` pure JSON, `.getActions(player=0)` array `{type:'discard'|'tsumo'|'ron'|'riichi'|'openRiichi'|'chi'|'pon'|'ankan'|'minkan'|'kakan'|'nuki'|'pass'|'abort'|'next',...}` (discard/riichi tileId, calls tileIds). `.act(action,player=0)` returns state and throws/rejects invalid. `.stepAI()` advances one deterministic COM action or draw until human decision; root timer calls it. `.serialize()` JSON string, static `.restore(string)` game. Constructor begins hand playable, no animation delay in core. `.nextHand()` equivalent next action. Export helpers as needed. Agent can adjust API then document promptly.
state minimum `{rules,players:[{name,persona,score,hand:Tile[],melds:[],discards:[{tile:Tile,riichi:boolean,called:boolean}],nuki:Tile[],riichi,openRiichi,ippatsu}],phase:'discard'|'response'|'handEnd'|'matchEnd',turn,dealer,roundWind:27..30,handNumber:1..4,honba,riichiPot,remaining,wall:Tile[],deadWall:Tile[],doraIndicators:Tile[],uraIndicators:Tile[],lastDiscard:{player,tile},result,log:[],dice:[number,number],handId}`.
Each state update `.state.event` `{id,type,player,tile,details}` for animation. Human draw tile separate via player.drawnTileId. Player0 human. Number of COM=players-1. `AI_PERSONAS` 12 records export with id,name,tagline,color,weights object numerical speed,value,defense,calls,riichi,flush,pairs,dora,yakuman,reading (0..100). AI may use visible info only. `analyzeHand(state,player)` optional shanten/ukeire/danger readout. All actions validated at state boundary; no undo once committed; selection reversible in UI. Redo simulation harness useful for full match smoke.

## Render agent owns
`dist/js/render/table.js`, `tile-art.js`, any render assets. Imports `three` and `three/addons/...` from importmap (version 0.186.1, pinned and bundled). `TableView` constructor(container,options={onTileClick:(tileId)=>{}}). `.update(state,options?)`, `.setView('table'|'top'|'player')`, `.rollDice([n,n])`, `.animateDeal()`, `.setSelected(tileId)`, `.resize()`, `.dispose()`. Expose `.ready` promise if needed. Render complete 3D automatic mahjong table: modeled thick tile body/back/front, tile walls, dice central tray, score LEDs, discards in 6 cols, open melds, 3D concealed human hand, 3/4 chairs/seats, point-stick trays, lift/deal/draw/discard/call/reveal/riichi animations. Tilted overhead camera default, green felt, ivory faces, midnight jade table with champagne trim. Keep tabletop large/readable. The lower hand and all interactive screens are drawn by ui/canvas-ui.js and ui/screens.js, then composited inside the same visible WebGL canvas.
`tile-art.js` exports `tileSVG(type,red=false)` returns SVG string and `tileDataURL(type,red=false)` synchronous data URL for Canvas image drawing, `createTileTexture(THREE,type,red=false)` or documented actual API. All 34 types and red 5 each. No generated images.

## Root owns
dist/index.html, style.css, js/app.js, server, package/docs README, site registration/deploy, integration/browser QA and zip.

Use existing contracts; message other owners for required adjustments. Each owner creates meaningful tests for complex scoring/flow requirements. No placeholder controls. Default locals off; descriptions state exact adopted definition and variants. Source research URLs recorded. No shared file changes outside ownership without notifying root.

## v1.1.0 presentation changes

See CANVAS-UI.md. The simulation API stays unchanged. `rules.aiPersonas` defaults to three `random` slots; `players[].persona` stores a resolved real persona. UI hit coordinates are local CSS pixels inside the current frame, never the parent viewport.
