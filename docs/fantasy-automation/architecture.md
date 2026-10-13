# 魔導からくり工房 — 構成と実装範囲

Library の「貼り付けたテキスト.txt」企画 v0.1 全579行を確認。ブラウザ、Three.js、TypeScript、Vite、ローポリ・デフォルメ、OrthographicCamera、32×32シードマップ、20Hz固定ステップを採用する。

MVPは採掘→搬送→精錬→搬送→納品箱。鉄の延べ棒100本の自動納品でクリア。木材・鉄鉱石・鉄の延べ棒の3種を実装し、本文の「4種」という見出しだけから第4資源を追加しない。ゴーレム・錬金術・転送門・世界樹は将来範囲。

## 既存構成との共存

- `AGENTS.md` に従い各作品の入口は独立HTML、タイトルは `AI Games`、コードは `web/js/`、CSSは `web/css/`。
- 新作だけTypeScriptをVite library buildで `web/js/fantasy-automation/runtime/app.js` に変換。配布JSもGit管理してビルドなしHTTP配信を可能にする。既存HTML・JavaScriptの配信方式を変えない。
- 同梱済みThree.js 0.180.0をHTML importmapで参照。型と開発ビルド用npm packageも同版。外部CDN・他社参考画像の転用なし。
- `npm start` の前と `npm run build:pages` の前に新作をビルドする。Pagesのコピー許可リストはTSやテストを公開しない。
- 既存Three.js LICENSEを保持。GLBや物理応答は今回不要。将来GLB採用時は梱包拡張子とloader追加が必要。
- 作業ブランチ `feat/fantasy-automation`。mainマージ・Pages公開は今回行わない。Pages workflowはmain更新と手動実行でのみ稼働。

## 担当とAPI

[interfaces.md](interfaces.md) を共有境界の正本とする。Simulationがplain state/命令/20Hz更新を所有し、描画はstateを読む。カメラやDOM状態は保存しない。入力はcanvasでのみ地形へ渡す。保存はIndexedDB 1枠、版管理と厳密な検証を行う。

## 不足仕様の補足

- 設備1×1区画、出力は矢印側、入力は隣接セルから受け入れる。0北/1東/2南/3西。
- 木材・鉱石はMVP中に枯渇しない。初期資材から自給できるよう森林と鉱脈を中央に保証。
- 建設費はデータ定義。導線は木材1、ベルトは木材1+延べ棒1。設備キットを優先消費。
- 手動補給した鉱石・延べ棒は自動納品に含めない。手動燃料補給は採掘機で生まれる鉱石の自動属性に影響しない。
- タブ非表示では進行を停止。オフライン進行はMVP外。速度0/1/2はゲーム内時間のみ変える。

## 検証

固定ステップ、資源保存、更新順依存、採掘から精錬、配線切断/復旧、詰まり復旧、自動100本のクリア、手動納品除外、保存再開をNodeで検証。Playwright/Chromiumでsource/built両方の起動、実入力、反復操作、320/390/desktopリサイズ、WebGL状態、スクリーンショットを確認。既存 `npm test` とPages梱包を実行する。CI待機は行わない。
