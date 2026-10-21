# 設備回転と3マス電力網

公開版4（AIGames `d328a95`）の実配信を読み、隔離したタッチブラウザで確認してから修正した。既設の採掘機では大きな方向操作が表示されず、詳細の小さな回転ボタンだけになることを再現した。対応するソースも同じ配布JS/CSSであることをSHAで確認した。

## 操作

- 設備を選ぶと右下に「選択中: 設備名 (X, Z)」が出る。高さ56pxの左右90°ボタンで、その設備だけを回転する。採掘機・製錬炉・収納箱など、方向を使う設備で共通に使える。
- 建設中は「配置中: 設備名」。回転後も同じ種類を続けて置ける。「選択」で建設を終えてから既設設備を選べる。Rキーと「向き」の直接指定も維持。電柱など方向を使わない設備の回転は無効化し、供給範囲を表示する。
- 電柱（建設一覧では魔力導線）は周囲3マスへ供給し、電柱同士・発生炉にも3マス以内で接続する。距離は縦横の移動数の合計で、範囲はひし形。電柱を3マスずつ先へ置くと網を延長できる。
- 電柱を選ぶと、25区画の供給範囲と接続先の線が出る。配置時も指を置いた時点で確認でき、離すと設置。線と範囲は魔力あり／発生炉につながるが蓄積なし／未接続を区別する。

旧来の隣接接続も維持。設備ID、建設費、魔力の生成量・消費量、レシピ、資材、手動出荷は変更していない。保存形式はv5のままで、新しい必須フィールドはない。電力網は保存済みの位置・設備種別から復元する。シミュレーション・描画・配置プレビュー・案内は同じ接続ルールを参照する。範囲内の設備へ既に供給できている場合、案内は不要な追加電柱を要求しない。

## 検証

`npm test`（既存ゲーム、工房の固定クロック7件＋TypeScript154件）、`npm run build:pages`に成功。配布物309ファイルを検査し、JS/CSSが元の配信ファイルと同一であることを確認。既存CSS警告6件、エラー0。

`npm run playtest:fantasy-rotation-power` で1024×768、768×1024、390×844を操作。配置前の回転、既設の採掘機・製錬炉の回転、4pxの指ずれ、タッチキャンセル、反復回転、Rキー、カメラ位置・角度・ズームの不変、保存再開を検証した。発生炉→3マス→電柱→3マス→電柱→3マス→採掘機の実際の生産も確認し、中継電柱の撤去による停止、切断状態の保存再開、再建による再稼働を検証した。単体テストは3／4マスの境界、重複・循環接続で魔力を増やさないこと、旧v4移行・v5復元による資材・進捗の保持を確認する。

証拠: [公開版4での再現](../../artifacts/fantasy-automation/rotation-power/before/live-v4.json)、[タッチ・電力網テスト](../../artifacts/fantasy-automation/rotation-power/source/results.json)。

初回案内のブラウザ検証も、誤回転の修復、稼働中の電柱撤去・復旧、最初の手動出荷、案内の反復開閉、320／390pxのタッチ完走を含め成功した。[案内の結果](../../artifacts/fantasy-automation/rotation-power/onboarding/results.json)と[検証要約](../../artifacts/fantasy-automation/rotation-power/summary.json)に保存している。

| 状態 | 画像 |
| --- | --- |
| 修正前・既設採掘機 | [公開版4](../../artifacts/fantasy-automation/rotation-power/before/before-selected-miner.png) |
| 修正後・製錬炉の大きな回転操作 | [iPad相当](../../artifacts/fantasy-automation/rotation-power/source/rotation-1024.png) |
| 配置前の3マス範囲・接続 | [プレビュー](../../artifacts/fantasy-automation/rotation-power/source/power-preview-14-16.png) |
| 2本の電柱で9マス先へ供給 | [稼働中](../../artifacts/fantasy-automation/rotation-power/source/chain-powered.png) |

実機iPad／iPadOS Safariは未検証。公開版4の確認は、環境のChromium証明書制約に対し、TLS検証済みHTTPS取得を原URLの隔離ブラウザへ読み込む経路を使用。ユーザーの実ブラウザ・実セーブは使用していない。

今回の変更は作業ブランチで保全し、mainへマージせず公開前に報告する。この実行環境にSites公式`site-workflow.mjs`はないが、前回成功した親側の公式ヘルパー経路を使えば同じ所有者限定Siteへ適用できる。変更対象の配布物は`web/js/fantasy-automation/runtime/app.js`と`web/css/fantasy-automation.css`。既存のSite ID、ルートURL、`.openai/hosting.json`、公開範囲は保持する。新しいSiteや認証設定を作らない。
