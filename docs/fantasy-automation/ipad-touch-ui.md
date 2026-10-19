# iPad向けの方向操作とメニュー改善

対象は `d708526` の15設備・9レシピ・手動出荷版。変更前に1024×768／768×1024のChromiumタッチ環境で、ベルト配置・選択・回転とメニューを実際に操作して撮影した。今回の作業ではSites更新・Pages公開・mainへのマージを行わない。

## 確認した問題と変更

| 確認内容 | 変更前 | 変更後 |
| --- | --- | --- |
| iPad相当のメニュー入口 | 約25×44px、記号だけ | 100×48px、「メニュー」の文字付き |
| メニュー項目 | 文字11px、高さ44px、間隔6px | 文字14px、高さ48px、間隔10px |
| ベルトの向き | 小さな↻か設備詳細の「回転 R」を繰り返す | 右下の北・東・南・西で直接指定。選択中の方角を強調 |
| 配置と既設ベルトの区別 | 回転操作の対象が分かりづらい | 「搬送ベルトの配置方向」／「選択ベルト (X, Z)」を表示 |
| 長いメニュー | スクロールで閉じる操作が外へ移動 | 閉じるボタンが上端に残る。端でのスクロールをパネル内に留める |
| 詳細を畳んだ後 | 見出しごと隠れ、再表示ボタンが消える | 見出しと＋が残り、方向操作は引き続き使用可能 |
| メニューと地図 | 開いたメニューの外側で地図操作が可能 | 開いている間は地図への建設・移動・拡縮を抑止 |

タッチ操作向けの指定には `pointer: coarse` を使い、幅だけでiPadをデスクトップ扱いしない。320／390pxでは入口を48×48pxにし、増えたヘッダーの高さに合わせて詳細・案内・メニューの位置も調整した。Rキー、マウス連続敷設、2本指の移動・拡縮は維持。地図を押したまま別の指でUIに触れた場合も、地図側の保留タップを取り消す。

設備をタップして詳細が指の下に現れたとき、その指を離した後の互換クリックがUIの別ボタンへ届く問題も、小画面の出荷テストで再現した。タップ開始位置を追跡して防ぎ、次に利用者が実際にUIを押した操作は受け付ける。回帰テストを追加し、メニューを閉じた直後の最初の地図操作も即時に再開する。

## 使い方

1. ベルトを選び、右下の「配置方向」で北・東・南・西をタップする。
2. 区画を順にタップして置く。途中で方角を変えても配置を続けられる。
3. 既設ベルトは建設を「×」で取り消してから選び、「選択ベルト」の4方向で変更する。既設ベルトを直接タップして選択する方法も使える。
4. 詳細が邪魔なときは見出しの「×」で畳み、「＋」で戻す。方角は地図基準で、斜め視点の画面の上下とは異なる。
5. 保存・読込は上部のメニュー。長い内容は指でスクロールし、上端の「メニューを閉じる」で戻る。

## 比較画像

| 状態 | 変更前 | 変更後 |
| --- | --- | --- |
| 横向き・配置 | [前](../../artifacts/fantasy-automation/ipad-touch/before/landscape-build.png) | [後](../../artifacts/fantasy-automation/ipad-touch/after/landscape-build.png) |
| 縦向き・ベルト選択 | [前](../../artifacts/fantasy-automation/ipad-touch/before/portrait-selected.png) | [後（詳細を畳んだ状態）](../../artifacts/fantasy-automation/ipad-touch/after/portrait-selected.png) |
| 縦向き・メニュー | [前](../../artifacts/fantasy-automation/ipad-touch/before/portrait-menu.png) | [後](../../artifacts/fantasy-automation/ipad-touch/after/portrait-menu.png) |

変更前の記録は [before/results.json](../../artifacts/fantasy-automation/ipad-touch/before/results.json)。`--before` は旧runtimeのSHAを検証してから撮影し、現行版の画像で誤って上書きしない。画像はすべて新規ブラウザコンテキストと合成テストデータで作成し、実ユーザーの保存枠を操作していない。

## 検証

再実行:

```sh
npm run build:pages
npm test
npm run playtest:fantasy-ipad
FANTASY_QA_OUTPUT=artifacts/fantasy-automation/ipad-touch/regression/recipes node scripts/fantasy-automation-recipes-shipping.cjs --built
FANTASY_QA_OUTPUT=artifacts/fantasy-automation/ipad-touch/regression/onboarding node scripts/fantasy-automation-onboarding.cjs --built
```

`playtest:fantasy-ipad` は実際のタップ／タッチイベントで、向き指定→複数配置→方向変更→複数配置、同じ方向の再指定、既設ベルトだけの回転、Rキー、詳細の反復開閉、メニュー外の地図タップ抑止、地図＋UIの2本指、メニュー・カタログの指スクロール、カテゴリー選択、技術画面の開閉、縦横リサイズ、v5保存・読込を確認する。320／390pxでも配置・方向指定・メニュー操作と横はみ出しを確認する。結果は [after/results.json](../../artifacts/fantasy-automation/ipad-touch/after/results.json)。

既存のレシピ・出荷テストは15設備・2/5/2の9レシピ、明示的な手動出荷・購入、二重出荷拒否、配置取消、v4→v5移行、保存再開を検証する。案内テストは初回ライン、誤った向き、断線、反復開閉、320／390pxでの案内を通す。結果は [regression](../../artifacts/fantasy-automation/ipad-touch/regression/)。保存形式・経済・レシピ・シミュレーションの仕様は変更していない。

実機iPad／iPadOS Safariは未検証。Chromiumのタッチ・画面サイズのエミュレーションであり、Safari固有のスクロール、表示領域、タップ挙動の保証には実機確認が残る。変更前後画像はローカル版。Sitesはこの作業では更新しない。
