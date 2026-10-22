# ホームページ配色への統一

参照: https://mith-mmk.github.io/ および https://mith-mmk.github.io/css/default.css
2026-10-22にBraveの実表示・computed style・公開CSSを照合。

- 背景: `#f9f9f9`
- ヘッダー: `#2c3e50`、見出し: `#ecf0f1`
- 本文: `#333333`
- アクセント: `#3498db`
- 淡色面: `#ecf0f1`、カード枠: `#bdc3c7`
- 小さいリンク文字: 参照CSSの青 `#2980b9` を `#226b9b` に濃くし、通常文字のコントラストを確保

本文・リンク・ジャンル・補助文字・フッターの9組は、sRGBの相対輝度によるWCAG計算で4.5:1以上（最小5.02:1）。詳細は `contrast.json`。

`npm run build:pages` 成功。`npx eslint web/css/catalog.css` はエラーなし、outlineの既存形式のbaseline警告1件。
`CATALOG_EVIDENCE=artifacts/catalog-colors node scripts/catalog-browser.cjs` 成功（Windowsでは環境変数をPowerShellで設定）。
生成済み公開ファイルをローカルHTTPの `/AIGames/` でChrome headless検証。通常環境ではlocalhost接続が拒否されるため許可付き実行を使用。

既存23件の全情報、検索・ジャンルAND・日付/名前順・日付欠損末尾・同日順・0件・件数・リセット・キーボード・画像読み込み・JavaScript無効時のリンク保持を検証。
1440/768/390/320pxで横はみ出しなし。PCとスマホの実画像を目視確認。

一覧専用CSSのみ配色変更。HTML・機能JS・共有CSS・ゲーム本体は変更なし。
検証スクリプトはカード形式のmainを基準に23件を比較できるよう修正し、証跡出力先を選択可能にした。
この変更のマージ・公開は未実施。
