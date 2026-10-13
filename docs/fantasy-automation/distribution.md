# 静的配布とクリーンcheckout検証

2026-10-13。修正前 `d79b3ec` はHTMLが参照する `web/js/fantasy-automation/runtime/app.js` をGit管理していなかったため、ビルド前のcheckoutをそのままHTTP配信すると起動しなかった。既存のPagesワークフローには生成工程があり、クリーンcheckoutからのPages生成は成功した。配布方法を十分に満たしていなかった点を修正した。

## 修正

- 配布JS `web/js/fantasy-automation/runtime/app.js` をGit管理。TypeScript変更と再生成JSを一緒にコミットする。
- CSS `web/css/fantasy-automation.css` とThree.jsのmodule/core/LICENSEは従来からGit管理済み。
- `npm test` に配布JS検査を追加。Git追跡を確認し、再ビルド前後のSHA-256が不一致なら失敗する。
- Pagesは `npm ci` → `npm test` → `npm run build:pages`。新作JSを再生成してから既存梱包処理で `.pages-dist/` へコピー。HTMLは同じ相対JS/CSS/importmap参照を使う。

## 新規checkout相当での検証

ローカル生成ファイルを持ち込まない独立cloneを2つ作成して確認した（Git管理ファイルだけから開始、node_modulesと.pages-distがないことを確認）。

1. 修正前d79b3ecのcloneでruntime/app.jsが存在しないことを確認。`npm ci` とPages生成後に `.pages-dist/` だけをHTTP配信し、起動と建設が成功。
2. 修正後ba780beのcloneで依存インストール・ビルドを行う前に `web/` だけをHTTP配信し、起動と建設が成功。
3. 同じ修正後cloneで `npm ci` → `npm test` → `npm run build:pages` を実行。既存テスト、新作28件、型検査、配布JS一致検査が成功。304 runtime/licenseファイルを生成。
4. 生成された `.pages-dist/` だけを配信し、起動と建設が成功。再生成後のclone作業ツリーはclean。

すべて `/AIGames/` にマウントし、入口・CSS・app.js・Three.js module/coreがそのprefix内で200応答することをブラウザで確認。ページ例外・404ゼロ。配布JS SHA-256は3経路すべて `6c62c148b77499da153a3ca139f583d13e6e4ef6cac888d2adef75c632e23286`。

証拠は `artifacts/fantasy-automation/distribution/` の `clean-original-pages.json` / `clean-tracked-web.json` / `clean-generated-pages.json` とPNG。検証用HTTP serverとbrowserは終了時に閉じる。

## 開き方

- 正確な入口: `web/fantasy-automation.html`。
- 正確な配布JS: `web/js/fantasy-automation/runtime/app.js`。
- `web/` をHTTPのdocument rootにし、`http://127.0.0.1:4173/fantasy-automation.html` を開く。
- ビルドなし: `node scripts/serve.cjs`（依存インストール不要）、または `python3 -m http.server 4173 --bind 127.0.0.1 --directory web`。
- 開発用: `npm ci` → `npm start`（開始前に再ビルド）。Pages生成: `npm run build:pages`。
- HTMLの `file://` ダブルクリックは対応しない。ES modules/importmapをHTTP配信で起動する方式。

検証再実行は `node scripts/fantasy-automation-distribution.cjs --directory web --label tracked-web`、梱包後は `--directory .pages-dist --label generated-pages`。default base pathは `/AIGames/`、サイトrootは `--base-path /`。

mainへのマージ、Pages設定変更、デプロイは行っていない。CI待機は行わず、同じ生成手順をローカルcloneで検証した。
