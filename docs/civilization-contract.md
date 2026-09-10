# Chronicle Kingdoms ES Module Contract

この文書を新実装の固定境界とする。識別子は文字列、座標は整数、タイル参照は `tileId = y * width + x` とする。状態はJSON互換の値と正規化配列だけで保持し、`Map`、`Set`、DOM、Canvas、関数、クラスインスタンスを入れない。

## モジュールと所有権

| module | exports | responsibility |
| --- | --- | --- |
| `web/js/civilization/engine.mjs` | `CivilizationEngine` | 状態遷移、命令検証、決算、勝利判定 |
| `web/js/civilization/state.mjs` | `createInitialState`, `validateSnapshot` | 初期状態と全項目の保存検証 |
| `web/js/civilization/view.mjs` | `buildCivilizationView` | 視界・既知情報を適用した読み取りモデル |
| `web/js/civilization/data.mjs` | `RULES_VERSION`, `SAVE_VERSION`, `TERRAIN`, `RESOURCES`, `IMPROVEMENTS`, `UNITS`, `BUILDINGS`, `TECHS`, `GOVERNMENTS`, `PROJECTS`, `PRESETS` | IDをキーにした凍結ルール定義 |
| `web/js/civilization/save-store.mjs` | `CivilizationSaveStore` | IndexedDB、自動3世代、手動保存、JSON入出力 |
| `web/js/civilization/renderer.mjs` | `CivilizationRenderer` | 菱形地図、座標変換、カメラ、ミニマップ |
| `web/js/civilization/game.mjs` | `CivilizationGame`, `bindCivilizationEvents` | Canvas初期化、UI状態、入力と描画の接続 |

各モジュールに変更可能なグローバル状態を置かない。`CivilizationGame` の `constructor(root)` がCanvasを取得し、`init(options)` は新規開始・ロードのどちらでも必ず呼ばれる。`bindCivilizationEvents(game)` はクラス外で定義し、登録済みリスナーの解除関数を返す。UI担当はエンジンの `state` を直接変更しない。ゲーム外UI状態は `{ screen, selected:{kind,id}, camera:{x,y,zoom}, inputMode, notifications }` とし、`CivilizationGame` だけが保持してSnapshotへ入れない。

データ表の値は次の形に固定する。`RULES_VERSION=1`、`SAVE_VERSION=1`。`TERRAIN[id]={label,food,production,trade,move,defense,water}`、`RESOURCES[id]={label,food,production,trade,terrains}`、`IMPROVEMENTS[id]={label,kind,cost,requires,terrains,food?,production?,trade?}`、`UNITS[id]={label,symbol,cost,attack,defense,hp,movement,role,domain,capacity,ocean,requires,upkeep,populationCost}`、`BUILDINGS[id]={label,cost,requires,food,production,trade,research,culture,happiness,defense,upkeep}`、`TECHS[id]={label,cost,requires,era,description,effects?}`（`effects={food,production,trade,research,vision}`）、`GOVERNMENTS[id]={label,requires,tradeMultiplier,freeUnits,happiness,warWeariness,upkeepMultiplier}`、`PROJECTS[id]={label,cost,requires,kind:"culture"|"space",part:null|"structure"|"propulsion"|"support"}`、`PRESETS[id]={label,width,height,civCount,speed,maxTurns}`。`requires` は技術IDまたは `null`（技術だけ配列）、改良の `kind` は `route|landUse`、`terrains` は地形ID配列。

## 公開API

```js
class CivilizationEngine {
  constructor();                 // data.mjsを内部利用、外部注入なし
  init(config);                 // Result。新規状態を生成
  dispatch(command);           // Result。唯一の状態変更入口
  getView(civId);              // CivilizationView。状態を変更しない
  getPathPreview(civId, unitId, to); // PathPreview。状態を変更しない
  getCombatPreview(civId, attackerUnitId, defenderUnitId); // CombatPreview
  serialize();                 // JSON文字列化可能なSnapshotのdeep copy
  load(snapshot);              // Result。検証完了後だけ状態を一括交換
}
```

`Result = { ok: boolean, reason: string | null, events: GameEvent[] }`。失敗時は `events: []` とし、状態・乱数・ID採番を一切変更しない。例外はプログラム不変条件の破損にだけ使い、入力不正は `reason`（`INVALID_COMMAND`, `NOT_ACTIVE_CIV`, `NOT_FOUND`, `NOT_OWNER`, `NOT_VISIBLE`, `ILLEGAL_TARGET`, `INSUFFICIENT_MOVEMENT`, `PREREQUISITE_MISSING`, `QUEUE_FULL`, `INVALID_ALLOCATION`, `DIPLOMACY_REQUIRED`, `GAME_OVER`, `INVALID_SNAPSHOT`, `INCOMPATIBLE_VERSION`）で返す。

`GameEvent = { id, type, round, civId, entityId, data }`。`data` はJSON互換オブジェクト。命令内の `civId` は現在手番かつ対象所有者であることを毎回検証する。乱数を使う結果もイベントへ確定値を記録する。

```js
class CivilizationRenderer {
  constructor(canvas, uiState);
  draw(view, { selectedTileId, selectedUnitId, selectedCityId, hoverTileId, preview } = {});
  resize(); tileFromPointer(clientX, clientY); // {x,y,tileId} | null
  pan(dx, dy); zoomAt(factor, clientX, clientY); centerOn(x, y);
  drawMiniMap(canvas, view); dispose();
}
```

Rendererはゲームを変更せず、渡された `uiState.camera` だけを表示域として更新できる。

## StartConfig

```js
{
  presetId: "small" | "standard" | "large" | "custom",
  width: 48 | 64 | 96, height: 32 | 40 | 60,
  civilizationCount: 2..8, speed: 0.6 | 1.0 | 1.5,
  maxRounds: 120..1000, mapType: "continents" | "archipelago",
  seed: uint32, humanCivId: string, civilizationIds: string[]
}
```

プリセット既定値は `small=48x32/4文明/0.6/240`、`standard=64x40/6文明/1.0/400`、`large=96x60/8文明/1.5/600`。`custom` では幅・高さも48x32、64x40、96x60のいずれかに限定する。東西は接続し南北は端とする。速度倍率は研究、生産、成長、文化必要量、改良工期、宇宙航行期間にだけ使う。

## Snapshot / GameState

```js
{
  schemaVersion: 1, rulesVersion: 1, gameId: string, config: StartConfig,
  nextId: uint32, rng: { algorithm: "mulberry32", state: uint32 },
  turn: {
    round: uint32, activeCivId: string, activeCivIndex: uint32,
    phase: "orders" | "settlement" | "roundEnd", status: "running" | "finished",
    winnerCivIds: string[], victoryType: null | "conquest" | "space" | "culture" | "score"
  },
  world: { width, height, wrapX: true, tiles: Tile[] },
  civilizations: Civilization[], cities: City[], units: Unit[],
  relations: Relation[], treaties: Treaty[], tradeRoutes: TradeRoute[], intelligence: Intelligence[],
  spacePrograms: SpaceProgram[], chronicle: GameEvent[]
}
```

`Tile = { id, x, y, terrainId, river, resourceId, routeId, landUseId }`。`routeId` は `null|"road"|"railroad"`、`landUseId` は `null|"irrigation"|"mine"`。タイルに `cityId`、`unitIds`、所有者、視界を書かない。

`Civilization = { id, name, color, isHuman, eliminated, capitalCityId, treasury, rates, government, knownTechIds, research, warWeariness }`。

- `rates = { tax, science, luxury }`。各値は10刻みの0..100、合計100。
- `government = { currentId, pendingId, transitionRoundsLeft }`。
- `research = { activeTechId, progressByTech: [{ techId, points }] }`。対象変更時も各技術の進捗を保持する。

`City = { id, ownerId, name, x, y, population, foodStock, buildingIds, focus, workedTileIds, lockedTileIds, specialists, productionQueue, cultureByCiv, greatWorkCivIds, disorder }`。

- `specialists = { scientist, taxCollector, entertainer }`。
- `focus` は `balanced|growth|production|research`。`productionQueue` は最大5件の `{ id, kind: "unit"|"building"|"project", definitionId, progress, repeat }`。順序変更時も各項目の進捗を保持する。
- 中心タイルは追加で自動収穫し、`workedTileIds.length + scientist + taxCollector + entertainer === population` とする。`lockedTileIds` は `workedTileIds` の部分集合。
- `cultureByCiv = [{ civId, amount }]` とし、文化勝利は現在所有文明の自国生成分だけ数える。

`Unit = { id, ownerId, typeId, x, y, hp, movementLeft, experience, homeCityId, transportedByUnitId, stance, order }`。`stance` は `active|waiting|fortified|sleeping`。`order` は `null` または `{ type: "path"|"improve", path: [{x,y}], improvementId, progress }`。輸送船の積荷一覧は `transportedByUnitId` から導出する。

`Relation = { civAId, civBId, value, atWar, contacted }`。`value` は -100..100、`atWar` は関係値と独立する。`contacted` が偽の組は外交対象外とする。

`Treaty = { id, civAId, civBId, kind, status, proposedByCivId, terms, expiresRound }`。`kind` は `peace|openBorders|tradeAgreement|alliance|exchange`、`status` は `proposed|active|rejected|expired`。`terms = { goldFromA, goldFromB, techIdsFromA, techIdsFromB }`。

`TradeRoute = { id, ownerCivId, originCityId, destinationCityId, pathTileIds, status, suspendedReason }`。1都市につき有効経路は最大3本。`status` は `active|suspended`。

`Intelligence = { observerCivId, exploredTileIds, lastSeenCities }`。`lastSeenCities = [{ cityId, ownerId, name, x, y, population, seenRound }]`。現在視界は都市・ユニットから毎回導出し保存しない。

`SpaceProgram = { civId, components, launchedRound, arrivalRound }`。`components = { structure, propulsion, support }`。発射条件は3/2/1、標準速度の航行は10ラウンド。

## Command union

全命令は `{ type, civId, ... }`。`commandId` は不要で、成功した命令のイベントIDが追跡キーになる。

| `type` | additional fields |
| --- | --- |
| `unit.move` | `unitId, to:{x,y}`。隣接移動。敵なら守備隊1部隊との戦闘を解決 |
| `unit.path` | `unitId, path:[{x,y}], continue?:boolean`。敵発見・移動不能で停止。`continue:false` は移動力不足でも残りの経路を保存しない。省略時は従来どおり次の手番へ継続 |
| `unit.attack` | `unitId, targetUnitId` |
| `unit.wait` / `unit.fortify` / `unit.sleep` / `unit.wake` | `unitId`。`wake` は継続命令も消去 |
| `unit.foundCity` | `unitId, name` |
| `unit.improve` | `unitId, improvementId:"road"|"railroad"|"irrigation"|"mine"` |
| `unit.board` | `unitId, transportUnitId` |
| `unit.unload` | `unitId, to:{x,y}` |
| `city.allocate` | `cityId, workedTileIds, lockedTileIds, specialists` |
| `city.setFocus` | `cityId, focus:"balanced"|"growth"|"production"|"research"` |
| `city.queue` | `cityId, action:"append"|"remove"|"move"|"setRepeat", item?, itemId?, toIndex?, repeat?` |
| `city.rename` | `cityId, name`。所有者のみ。前後空白を除去し1〜40文字、制御文字不可。`city.renamed` を発行 |
| `civ.setRates` | `rates:{tax,science,luxury}` |
| `civ.selectResearch` | `techId` |
| `civ.changeGovernment` | `governmentId` |
| `diplomacy.propose` | `targetCivId, kind, terms` |
| `diplomacy.respond` | `treatyId, accept:boolean` |
| `diplomacy.declareWar` | `targetCivId` |
| `trade.open` | `originCityId, destinationCityId` |
| `trade.close` | `tradeRouteId` |
| `space.launch` | なし。完成部品を検証して発射 |
| `civ.endTurn` | なし。決算後に次文明へ進み、全文明終了時だけ勝利判定 |

`city.queue` の `item` は `{ kind, definitionId, repeat }`。`move` は `itemId,toIndex`、`remove` は `itemId`、`setRepeat` は `itemId,repeat` を必須とする。一括待機は各部隊に `unit.wait` を順に `dispatch` する。

## CivilizationView

`getView(civId)` はdeep copyの `{ self, turn, world, civilizations, cities, units, relations, treaties, tradeRoutes, spacePrograms, availableCommands, pending }` を返す。`self` は文明本体に `forecast:{grossTrade,tax,science,luxury,upkeep,netGold,researchPerRound}` を加える。`world.tiles` は全件を維持し、各要素を `{ id,x,y,visibility:"unexplored"|"remembered"|"visible",terrainId,river,resourceId,routeId,landUseId,cityId,unitIds }` とする。未探索は識別子・座標・`visibility` 以外を `null`、記憶済みは地形と `lastSeenCities` の都市だけ、可視は現在情報を返す。敵ユニット、条約、交易路、宇宙計画は当該文明が知り得る範囲だけ含める。`availableCommands` は選択非依存の合法候補、`pending` は `{ uncommandedUnitIds, cityIdsWithoutProduction, needsResearch }`。

各可視自都市は `forecast:{ food:{gross,consumed,net,threshold,turns,reason}, production:{perRound,current,required,turns,reason}, trade:{gross,tax,science,luxury}, happiness:{happy,content,unhappy,reasons}, upkeep, culture:{perRound,selfTotal,threshold,qualified} }` を持つ。値が進まない場合は `turns:null` と `reason` を返す。

`PathPreview = { ok, reason, path:[{x,y,cost,arrivalRound,certainty:"known"|"estimated"}], totalCost, arrivalRound }`。`CombatPreview = { ok, reason, attackerPower, defenderPower, winChance }`。両メソッドとも対象文明の視界で検証し、未知・不可視情報を漏らさない。AIは必ず担当文明の `getView(civId)` とこの2つの照会だけを入力にし、返したCommandを通常の `dispatch` に渡す。UIとAIで式を複製しない。

## 保存と検証

```js
class CivilizationSaveStore {
  constructor({ indexedDB, databaseName = "ai-games-chronicle-kingdoms" });
  open();
  write({ slotId, kind: "auto"|"manual", label, snapshot });
  read(slotId); list(); remove(slotId);
  exportJson(slotId); importJson(jsonText);
}
```

`write` はdeep copyを保存し、自動保存だけ新しい3件を残す。`read/importJson` は生データを返し、採用判断は必ず `engine.load(snapshot)` に委ねる。`load` は型、列挙値、ID一意性、全参照、座標、タイル数、文明数、手番、配分合計、都市割当、キュー長、輸送関係、条約、交易上限、ルール版を検証し、成功するまで現状態を交換しない。旧セーブの移行・上書き・削除は行わない。
