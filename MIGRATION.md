# AI Games 独立公開への移行

現時点ではローカル実装・検証のみ。mainへのpush、Pages設定変更、デプロイは未実施。

## 公開元と変更

正本はこのリポジトリの `web/`。予定URLは `https://mith-mmk.github.io/AIGames/`。ホームページは入口と旧URLの互換窓口にする。ゲーム本体をホームページへ毎回コピーしない。

`npm run build:pages` で `.pages-dist/` を生成する。拡張子とファイル名による許可リストを使い、`.git`、node_modules、ドットファイル、テスト、データ生成スクリプト、package情報、検証画像を含めない。ルートLICENSE、Three.js LICENSE、データの出典説明は残す。ローカルHTML/CSS参照、相対module import、アセットのルート・固定fetch、Rogue Codexのテクスチャ一覧を検査する。機密ファイルを公開用 `web/` に置かない。

`.github/workflows/pages.yml` はmain更新／手動実行を対象とし、npm test→梱包→Pages artifact→deployを行う。buildはcontents/read・pages/read、deployのみpages/write・id-token/write。github-pages環境とconcurrencyを設定し、checkoutの認証情報を保存しない。Pagesの公開元は管理画面でGitHub Actionsへ切り替える必要がある。自動的に有効化する処理は入れていない。構成は [GitHub公式のPagesカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) に基づく。

ルービックキューブはホームページ `mith-mmk/mith-mmk.github.io` のmaster `990789f3ae22368846c6fd21a561e7b36fdb7dce`、`script/vibe/rubiks_cube_random_initial.html` から移植。CSS/JSを内包し、外部依存・画像なし。移植元に個別ライセンス表示はなく、ユーザー所有コードの移植指示に基づく。新しい第三者ライセンスを推定して付与していない。既存の回転処理を保ち、一覧への戻り口・日本語説明・ボタンを追加。Solveは汎用解法探索ではなく、記録した回転の逆順再生。

Rogue Dungeonの存在しないJS参照を `js/rougelike2.js` に修正。このファイルと稼働ホームページの `script/vibe/js/rougelike-copilot.js` は同じblob `fdea88611a75f16cfd4be768d746b22f6ac2d247`。一覧のホームページへの戻り先を明示し、gotopアイコンを同梱してルート `/icon/` 依存を除去した。ゲーム→一覧とアセットの相対パス・保存キーは維持。

## 公開順序（この順を守る）

1. AIGamesの完成版と移行branchをレビューしてmainへ取り込む。PagesをGitHub Actions公開に設定し、main更新のworkflowを確認する。ここはremote変更の直接承認が必要で、今回まだ実施していない。
2. `/AIGames/` の一覧、主要ゲーム、`.mjs` MIME、JSON/画像、10面、Rubik、CDN依存のゲームを本番で確認する。`migration-ready.json` のrevisionとmain SHAを照合し、古いキャッシュと区別する。テスト済みURLの末尾スラッシュ、query/hashも確認する。
3. その後でホームページの `feat/aigames-entry` をmasterへ取り込み公開する。ホームページと `script/index.html` の入口は `/AIGames/` へ。旧HTML18ページは `migrate.js` が公開元のmarkerを検査して同名ページへ `location.replace` する。query/hashを保持する。marker未公開・取得失敗・3秒のタイムアウト時は旧ページをそのまま動かす。JavaScriptなしでは移行先リンクを表示し、旧内容も残す。入口リンクは新サイトへの直接リンクなので、ホームページを先に公開しない。
4. 旧アセットは今回削除しない。新サイトへ転送できない環境の旧ページを支えるために必要。動作確認と利用状況を確認した後、旧URL互換の維持方針を決めて別途整理する。ゲームの正本はAIGames側だけを更新する。

同じHTTPS originの別パスなのでlocalStorageのキー・値をそのまま利用する。originを変更する将来案では自動移行できない。両サイト共通の見た目はホームページへの戻り口と名称に留め、ゲーム個別UIは維持した。

## ローカル検証・再実行

```
npm test
npm run build:pages
node scripts/migration-browser.cjs
```

ホームページの作業checkoutは隣の `../homepage`。別配置なら環境変数 `HOMEPAGE_CHECKOUT` を指定する。テスト内のHTTPサーバーは動的ポートでホームページと `/AIGames/` を同一originにマウントし、終了時に閉じる。恒常的なプレビューは `npm start` でゲーム単体を閲覧できる。

2026-10-03: npm test成功。ESLintエラー0、既存CSS baseline警告3件。公開梱包283ファイルとHTML/CSS/import/アセット参照を検査。NERO Chrome154でRubikのドラッグ・シャッフル・逆順復元（6面色の一致）・リセット・390px幅、Rogueの戦士開始/キー入力、からくり全10面の選択/開始/戻すと3面成功、同一origin進捗保持、一覧→ゲーム→一覧→ホームページを確認した。旧HTML18ページすべてでquery/hash付きURL転送、markerなしの旧ゲーム維持、noscriptリンク、283公開ファイルの200応答とmjs MIMEを確認。検査ページのJSエラー0・意図しない404応答0。

`artifacts/migration/` にJSONと画像を保存。既存RogueのCDN Three0.180は同版のローカルミラーでテストしたため、本番CDN到達性・GitHub Actions実行・公開反映は未検証。全作品の全プレイ状態の検証ではない。からくりの既存全10面解法・接触検証はnpm testで維持。

mainマージ/pushは自動承認レビューが委譲メッセージ中の引用を直接のユーザー承認として確認できないため拒否した。別経路での回避・再試行は行っていない。公開には認識される直接承認と、Pages公開設定の確認が必要。
