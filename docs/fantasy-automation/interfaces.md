# 実装担当・共有 API

企画到着済み。仮称「魔導からくり工房」。MVPは鉱石採掘→ベルト→精錬→ベルト→納品箱で鉄延べ棒100本の自動納品。手動投入は目標に算入しない。

共有型: `web/js/fantasy-automation/types.ts`。座標 x/z 0..31、1区画1 unit、方向0北/1東/2南/3西。状態は plain serializable。20Hz固定ステップ。インターフェース変更は統合担当へ通知。

- シミュレーション担当: `data.ts`, `simulation.ts`。`DEFINITIONS: Record<Kind, Definition>`。`Simulation` constructor(seed=662), state:GameState, `init(seed?)`, `step()`, `command(Command):CommandResult`, `canBuild(kind,x,z,direction):CommandResult`, `snapshot():GameState`, `restore(state):void`, `powerSummary():{ stored:number; capacity:number }`。pure state、安定id順。出力方向はdirection、入力は任意隣接方向（beltは向き先へ）。wireとgenerator/miner/smelterの直交接続で魔力ネットワーク。木材採取は森林、minerは鉱脈。2phase belt。出力buffer完成品保持。manual feed items automated=false、精錬成果 automated=input.every(automated)。地形seed固定生成、中央に必ず鉱脈/森林を保証。時間 tick/20。100 automatic ingots勝利。
- 3D担当: `renderer.ts`, `input.ts`。`WorldView(host, {onPick(x,z,event), onHover(x,z), onStatus(message)})`。`render(state, {kind:Kind|null,direction:Direction,valid:boolean,hover:{x,z}|null,selectedId:number|null})`, `resize()`, `resetCamera()`, `dispose()`。鳥瞰Orthographic、低ポリ、施設はプリミティブoriginal。右drag/WASD pan、中drag/QE rotate、wheel zoom、canvas上だけイベント、左drag onPick毎セル呼出。UI上の操作は入らない。context loss/recovery通知。rendererゲーム状態変更禁止。
- UI/保存担当: `ui.ts`, `storage.ts`, `web/fantasy-automation.html`, `web/css/fantasy-automation.css`。`GameUI(root, callbacks)` callbacks: `onBuild(kind)`, `onSpeed(speed:0|1|2)`, `onSave()`, `onLoad()`, `onRotate()`, `onRemove()`, `onFeed(resource,amount)`, `onCollect()`, `onCancel()`, `onResetCamera()`, `onNew()`。`update(state, {kind,direction,selectedId,speed,power:{stored,capacity},message})`; `dispose()`。root=#game-ui、canvas host=#world。`GameSave` async `load():Promise<GameState|null>`, `save(state):Promise<void>`, `clear():Promise<void>`。IndexedDB 1slot、export `validateSave(value):GameState` strict validation/migration、fail throws caught app。import DEFINITIONS。HTML importmap three local vendor、entry js/fantasy-automation/runtime/app.js。UI日本語compact top resources/bottom palette、panel折り畳み、復旧wood feed。
- 検証担当: `simulation.test.ts`, `storage.test.ts`, `scripts/fantasy-automation-browser.cjs`、テスト補助fixtureのみ。ゲーム状態/fixtureを使い conservation, deterministic, cut/reconnect, stall, manual exclusion, victory, save/restore、browser source/built入力・resize screenshot。browser開始はintegration完成後。node testsはtsx --test。ゲームinstance window公開は禁止。
- 統合担当: `app.ts`, types, package.json, configs, docs, top index。依存インストール/commit/pushは統合担当のみ。各担当commitしない。

最小補足仮定は docs に記録して進行。原本の画像転用禁止。Worker/Rapier/外部GLBは今回不要。
