# 一覧ページ検証

- main基点: `05114163486ce2cb6caf51b1b59b072331d5638a`
- `npm test`: 成功（既存CSSのbaseline警告4件）
- `npx eslint web/js/catalog.js web/css/catalog.css`: エラーなし（outlineのbaseline警告1件）
- `npm run build:pages`: 成功
- `node scripts/catalog-browser.cjs`: 成功、詳細は `browser-results.json`

ブラウザ検証は生成済み `.pages-dist` を `/AIGames/` 配下にマウントしたローカルHTTPサーバーとChrome headlessで実行。
通常sandboxはlocalhost通信を拒否したため、許可付き実行で検証した。
接続済みBraveはローカルHTTPにタイムアウトし、file URLはブラウザポリシーで拒否されたため中止。
公開ゲームの画像撮影は接続済みBraveで実施できた。

既存22件のhref・タイトル・説明・日付・作者の保持、追加後23件、日付欠損の末尾固定、同日の元順保持、名前順、NFKCタイトル検索、ジャンルとのAND、0件表示と件数、キーボードでのリセットとTab移動、画像ロード、横スクロールなし、JavaScript無効時の全リンクを確認。

`catalog-1440.png`, `catalog-768.png`, `catalog-390.png`, `catalog-320.png` は実ブラウザ描画。
