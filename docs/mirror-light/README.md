# 光の庭 — 3D 鏡・光線パズル

鏡をクリック・タップし、光をゴールへ導く日本語のブラウザゲーム。手作りの全10面、Undo、リセット、面選択、現在の配置に応じた3段階ヒント付き。すべての面が最初から選択可能で、時間制限・ランダム生成はありません。

## 起動と検証

リポジトリ直下で実行します。

```sh
npm ci
npm start
```

`http://127.0.0.1:4173/mirror-light.html` を開きます。既存の起動スクリプトのログには `karakuri.html` が表示されますが、全ゲームを同じサーバーで配信しています。サーバーは Windows でもフォアグラウンドで動かしてください。HTML の直接ファイル起動ではなく HTTP を使用します。

```sh
npm test
npm run build:pages
npm run test:mirror-light
npm run solve:mirror-light
npm run playtest:mirror-light
node scripts/mirror-light-browser.cjs --built
```

ブラウザ検証スクリプトは独自の一時 HTTP サーバーを起動・終了するため、`npm start` は不要です。Linux に `/usr/bin/chromium` があればそれを使用し、なければ Playwright の Chromium を使用します。必要に応じて `npx playwright install chromium`、または環境変数 `MIRROR_BROWSER_EXECUTABLE` で実行ファイルを指定します。`--built` は `.pages-dist` の実際のビルド出力を検証します。

## 操作とルール

- 銀の鏡：タップ・クリックで `/` と `\` を切り替える。鏡の立体部分と文字ラベルの両方を押せます。
- 金の鏡：固定。動かせない向きも推理の材料です。
- 濃い石：光を止める。
- 青い輪：通過点。順番は自由ですが、同じ光路ですべてを通ってからゴールに届く必要があります。
- 白い輪：ゴール。到達時点で光路を停止し、通過点不足なら成功にしません。
- 空のマスで光路が交差：方向を変えず通過。鏡上では入射方向に従って反射。
- 成功後も Undo とリセットで再検討可能。成功後の追加回転は無効。

カメラは固定の斜め上視点で、回転・パン操作はありません。DOM のボタンは Tab / Enter / Space でも操作可能。狭い画面では鏡ラベルの重なりを避け、折り畳みの「遊び方・押しやすい操作」に44px以上の選択・回転操作を用意しています。キャンバスの文字に依存せず、各鏡の向き・座標・固定状態もテキストで確認できます。

クリア状況と自己ベスト手数のみを `aigames-mirror-garden-v1` に保存します。途中の配置や Undo 履歴は保存しません。保存を拒否された場合もプレイできます。WebGL を開始できない場合はテキストの鏡操作を開き、3D表示がないことを明示します。

## 実装境界

既存の `AGENTS.md` の静的 HTML / JavaScript 構成を優先し、TypeScript・Vite の新しいビルド工程や外部 CDN は追加していません。Game Studio の game-studio、web-game-foundations、phaser-2d-game、game-ui-frontend、game-playtest を確認後、最新の3D指定に合わせ three-webgl-game を適用。既存同梱の Three.js 0.180.0 を相対 import で再利用します。素材は小さな幾何形状で生成し、物理エンジンや外部モデルは不要です。

| ファイル | 責務 |
| --- | --- |
| `web/mirror-light.html` / `web/css/mirror-light.css` | 日本語 DOM UI とレスポンシブ表示 |
| `web/js/mirror-light/levels.mjs` | 深く凍結した10面の初期データ・教育意図 |
| `core.mjs` | 決定的な光路、全探索、独立したセッション状態、Undo・ヒント |
| `renderer.mjs` | Three.js の盤面、鏡、光線、固定カメラ、リサイズ、Raycaster |
| `ui.mjs` / `input.mjs` | 表示への反映と物理入力から操作への対応 |
| `storage.mjs` | 最良記録の保存・検証・例外処理 |
| `app.mjs` | セッション、表示、入力、保存の連携 |
| `scripts/mirror-light-solve.mjs` | 全面の解と難易度に関する数値の再生成 |
| `scripts/mirror-light-browser.cjs` | PC・タッチ・キーボードと画像によるブラウザ QA |

ゲームの向き・手数・履歴は `MirrorSession` のインスタンスにだけ属し、Three.js オブジェクトやグローバル変数を状態源にしません。UIのカメラ投影・ラベル位置の調整はゲームのセル位置に影響しません。イベントの登録は状態クラス外に置き、終了時に解放します。

光線は物理的な反射計算ではなくグリッド上の決定的ルールを表示します。方向は右・下・左・上の4方向。追跡済み集合に `(x, y, 入射方向)` を記録し、再訪したらループとして停止します。単なるセルの再訪は停止条件にしないため、9面の交差光路も正しく動きます。ユニークな方向付き状態は最大 `幅 × 高さ × 4` です。

表示は状態更新・リサイズ・WebGL復旧時にだけ描画します。常時点滅やカメラ移動はなく、不要な非同期描画もありません。光線の更新と再描画は同じ同期処理で行い、外した光線だけを表示する中間フレームを作りません。入れ替えたジオメトリとマテリアルを dispose し、`pagehide` 時も解放します。BFCache に戻る場合は稼働中のインスタンスを維持します。

## 成果物

- [難易度設計](difficulty.md)
- [プレイテスト記録](playtest.md)
- [全10面の解・数値](../../artifacts/mirror-light/solutions.json)
- [PC 初期画面](../../artifacts/mirror-light/desktop-stage01.png)
- [PC 10面クリア](../../artifacts/mirror-light/desktop-stage10-cleared.png)
- [390px 8面](../../artifacts/mirror-light/mobile-stage08.png)
- [320px 10面](../../artifacts/mirror-light/mobile-stage10.png)
- [320px 10面クリア](../../artifacts/mirror-light/mobile-stage10-cleared.png)

変更はこの新ゲーム・その検証と文書・`package.json` の検証コマンド・`web/index.html` の1リンクに限定しています。既存ローマ・からくりの実装、依存パッケージ、公開ワークフローは変更していません。専用ブランチへの通常 push までを対象とし、main マージと本番公開は行いません。
