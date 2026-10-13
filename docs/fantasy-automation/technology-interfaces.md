# 技術ツリー・第2段階の共有仕様

ユーザー指示: 自動納品の品目を明示、収納箱≠納品箱、メニュー閉じる/再表示。章切替ではなく見える技術ツリー、今回魔導剣の連続生産まで。全担当AGENTS読む。既存セーブと初回guide保持。main merge/publish禁止。rootのみcommit/push/deps。

## 型

root管理types.ts。BaseResource wood/ore/ingot、追加rawCrystal/crystal/sword。Inventoryはbase必須+新資源optional（旧fixturesを維持）、正規state初期は追加3種も0。Kind追加 splitter/storage/crystalMiner/crystalRefiner/assembler。terrain追加crystal。Building recipe?:RecipeId、splitCursor?:0|1、reserved?:Item[]。Item handled?:boolean（手動取り出し/投入済みで自動納品対象外。automatedは生産由来を保持）。GameState version1|2、stats?:ProductionStats、research?:ResearchState、inventoryItems?:Item[]。正規state2で全metaあり。旧state fixtures/restoreはmigrateGameStateで正規化。

ProductionStats: produced/delivered:Partial<Inventory>、recentSwordTicks:number[]、peakSwordRate:number。ResearchState unlocked:TechId[], tracked:TechId|null。TechId basic/logistics/crystals/assembly/mastery。RecipeId ingot/crystal/sword。Command research{id:TechId},track{id:TechId|null},recipe{id:number,recipe:RecipeId},collect{ id:number,resource?:Resource,amount?:number }追加。

## 分担所有

- core: simulation.ts data.ts definitions.json recipes.json。生産/物流/storage32slots FIFO、splitter forwardとclockwise(side)へ交互（詰まりは空いている口を使う）20Hz twoPhase。複数入力は開始時reservedへ移す（旧working input予約はmigrationでreservedへ）。完成時保持、撤去/回収二重無し。新powers型含める。storage自動itemsは由来維持、取り出しinventoryItemsにhandledtrue付きで保存、feed消費/buildcostはinventoryItemsも一致して減らす。回収品手動搬送は自動納品/生産実績に数えない。techlock commands必須。research分岐は研究API利用。
- progression (root新規agent): technology.ts technologies.json recipes sharedtypeのみ参照、migration.ts storage.ts。Pure techNodeStates(state):TechNodeState[]、canResearch(state,id):{ok,reason}、isKindUnlocked(state,kind):boolean、isRecipeUnlocked(state,recipe):boolean、currentSwordRate(state):number、migrationGameState(value:GameState):GameState。storage validateSave unknown→migration→strictv2。version1legacywarehouse無し全old items/ticks/buildings/delivered preserve、existingworking入力recipe分reservedへ。stats ingotproduced >= delivered+existingautomaticingotbuffers、ore >=2*that+orebuffers、新資源0。既存森林鉱脈占有は変更せず空き中央横(20,16),(20,15)crystaldeposits追加、自由oldmap全占有なら空き既存資源は保存され全空き無い場合新crystalplacementblockedは撤去で作れるschema support。userdata未保存DB migration読込で自動overwriteしない。
- ui_save: ui.ts CSSのみ。resources6state可視、上header「鉄の延べ棒 自動納品n/100」アイコン四角銀バー、納品箱詳細品目別auto-deliver、manual由来条件具体。compactbuilddockscroll新設備locked理由/techshow。技術ツリーパネル閉じる/再表示 graph branches /前提/実績各現在数/解放equipment/recipe/researchbutton+trackbutton。表示は必要時、nexttrackedgoalcompact。menu/mainhelp/selection/builddock close/reopen UIstoppropagate。レシピ変更selectforunlocked recipes、storage finite32inventoryresource/provenancecount取出しcontrols。rootcallbacks onTechnologyToggle(show?:boolean),onResearch(id),onTrack(id),onRecipe(recipe),onCollect(resource?,amount?) optionalargs後方互換。UIState technologyOpen?:boolean追加。
- render: renderer.tsのみ。crystalterrain purplegeminstanced、新5facilityoriginalmodels、newresourcecolors/swordshape、splitter2portarrows/32storageitemvisual。既存guide/camera保持。新power kinds knownfromdata?rootcore共有dataexport POWER_KINDS推奨。
- QA (simulation): existingtestfilesなら必要最低限schema更新、new technology/systems/storage tests、scripts/fantasy-automation-technology.cjs independent completepipeline10/min→researchgoal、existingmigration/belt conservation、lock rejection、reachability acyclic progression、本物UI tree research states/track/close/reopen/noinputleak storage get/put save reload、oldguide regressions。root build通知後ブラウザ。
- root: types.ts/app.ts/package/docs/build/commit/pushintegration。

## データ設定（不足仕様を補足）

basic初期解放（既存7種/ingot recipe）。logistics basic前提+自動ingot生産5 →splitter/storage。crystals basic前提+ingot自動納品10 →crystalMiner/crystalRefiner/crystalrecipe。assembly logistics+crystals前提+ingot自動生産30+crystal自動生産10 →assembler/swordrecipe。mastery assembly前提+実測過去60ゲーム秒にsword自動生産10（最高到達）+sword自動納品10 →魔導剣連続生産達成（future golems preview only）。料金支払い無し、実績条件成立でユーザーresearchcommand。

新recipe crystal: rawCrystal1+mana3→crystal1/3s。sword: ingot2+crystal1+mana8→sword1/4s（上限15/min、2smelter/minerと電力増設で10/min attainable）。crystalMiner crystalterrain mana2→rawCrystal1/2s。費用 splitter wood2 ingot2/storage wood6 ingot2/crystalMiner wood4 ingot8/crystalRefiner wood4 ingot8/assembler wood6 ingot12。storage32品上限。出力singleitem inputmultiple reservationdeterministicfirstmatchingindicesをreservedへ。

statsは自動生産・自動搬送のみに加算（item.automated&&!item.handled）。delivery accepts ingot/swordのみ（manual直接feedはstatsに加算せず失敗でなく消費し旧挙動維持）。state.delivered/wonは従来ingot100のまま、stats.delivered.sword separate、tech mastery別achievement。currentSwordRate rollingrecent count(t>tick-1200)、0/1/2のreal-time倍率無関係、peak更新。技術条件ノード実測minはpeak、UIは現在rateと最高rate区別。

magicnetwork generators/miner/smelter/crystalMiner/crystalRefiner/assembler/wire directadjacency。競合ID順。動作停止理由不足品名を出す。レシピ変更稼働中拒否、空bufferまたは互換bufferだけ変更（不必要loss無し）。技術未解放建築/recipe/run? 現行状態移行unlockedbasic、new facilities alwayslegalunlocked validation。
