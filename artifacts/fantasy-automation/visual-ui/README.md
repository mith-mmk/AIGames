# UI と第3段階の実操作検証

2026-10-15。Playwright と Chromium/SwiftShader を使用。ゲーム状態を window に公開せず、実シミュレーションまたは通常コマンドで作った保存データを隔離ブラウザの IndexedDB に読み込み、画面のボタン・マウス・キーボード・タッチから操作した。

## 比較画像

変更前の画像・保存データと runtime SHA256 は [before](before/metadata.json) に保全した。`--before` の再実行で上書きしない。

| 内容 | 変更前 | 改善後（配布版） |
| --- | --- | --- |
| 最初の画面 | [画像](before/initial.png) | [画像](built/initial.png) |
| 収納箱 | [画像](before/storage.png) | [アイコン操作](built/chest-icons.png)、[32個満杯](built/chest-full.png) |
| 鉄100本納品 | [画像](before/iron100.png) | [次の研究目標](built/iron100-next-goal.png) |
| 搬送の停止 | [画像](before/jam.png) | [満杯](built/ports-full.png)、[素材不一致](built/ports-incompatible.png)、[接続](built/ports-connected.png) |
| 向き | [画像](before/directions.png) | [北](built/direction-0.png)、[東](built/direction-1.png)、[南](built/direction-2.png)、[西](built/direction-3.png) |
| 建設プレビュー | — | [可能・チェック](built/ghost-valid.png)、[不可・×](built/ghost-invalid.png) |
| ゴーレム工房 | — | [稼働](built/golem-active.png)、[材料補給](built/golem-materials.png)、[自律工房の研究](built/sanctuary-researched.png) |
| 小画面 | — | [320px](built/responsive-320.png)、[390px](built/responsive-390.png)、[タッチ収納](built/touch-chest-390.png) |

## 検証結果

[ソース版14項目](source/results.json)、[配布版14項目](built/results.json) は全成功。1個・全量・Shift・Enter による収納操作、フォーカス保持、ネイティブ Space が一時停止へ漏れないこと、手動取得後の来歴、32個上限と重複防止、保存・読込一致、カテゴリー一覧、登録の再読込保持、キー1、4方向のプレビューと配置、停止中の進捗、3種の接続状態、鉄100本後と鉄10本の進んだ工房の次目標、旧v2保存の読込時非書換え、ゴーレム補給、タッチと各画面幅を確認した。

その後の「一覧で選択した直後に canvas へフォーカスする」変更は、新しい runtime で [ソース版](focus-source/results.json) と [配布版](focus-built/results.json) の専用検証を実施した。canvas をクリックする前の R でプレビューが回転する。各検証の runtime SHA256 は対応する metadata/results に記録している。

[生産と保存データの追加検証](live-production-validation.json) では両版とも自動燃料補給20回に達し、その期間にゴーレム2体、魔導核5個、既存ラインの剣13本が新たに自動生産された。所要ゲーム時間はソース55.4秒、配布55.5秒。すべての捕捉したゲーム状態は厳格な保存検証を通過。材料方針で実際の手持ちから預けた延べ棒が搬送され、燃料補給実績は増えず、作業員・方針・待機時間・運搬経路の保存・再開が一致した。

関連回帰も成功:

- [通常操作 SOURCE](../source/browser-results.json) / [BUILT](../built/browser-results.json): 実スターター設置・稼働、R/Shift/X/ドラッグ、繰り返し保存読込、320/390/1440リサイズ、WebGL復帰、保存拒否とWebGL不可時の表示。
- [技術ツリー SOURCE](../technology/source/results.json) / [BUILT](../technology/built/results.json): 新たな60ゲーム秒以上の自動剣生産は毎分14.75本 / 14.48本。研究・収納・旧v1移行・パネル操作・小画面を確認。
- [案内 SOURCE](../onboarding/source/results.json) / [BUILT](../onboarding/built/results.json): 初回自動納品、誤った向きの修復、導線切断の復旧、保存保全、390/320pxの全手順と自動木材補給。

全ブラウザ検証で page error と404等の失敗リクエストは0。各検証終了時に一時HTTPサーバーとブラウザを停止した。

## 見つけて修正した問題

- モバイルで木材を補給した後の「稼働」案内が、設備詳細との重なりで隠れる問題。別担当が修正し、[再現](../onboarding/source/mobile-run-hidden-repro.json) と [修正後](../onboarding/source/mobile-run-recovery.json) および両版案内の実操作で確認した。
- 配置不可の採掘機プレビューを残したまま保存すると、配置理由が保存通知を隠す問題。[修正前画像](regressions/invalid-preview-save-before.png) を保全。配置予定の理由を主要通知に追記する修正後、成功通知と保存状態不変を両版で確認した。

## 再実行

配布版の実行前に `.pages-dist` が生成されていること。

```sh
node scripts/fantasy-automation-visual-ui.cjs
node scripts/fantasy-automation-visual-ui.cjs --built
node scripts/fantasy-automation-visual-ui.cjs --focus
node scripts/fantasy-automation-visual-ui.cjs --focus --built
node scripts/fantasy-automation-browser.cjs --built
node scripts/fantasy-automation-technology.cjs
node scripts/fantasy-automation-technology.cjs --built
node scripts/fantasy-automation-onboarding.cjs
node scripts/fantasy-automation-onboarding.cjs --built
```
