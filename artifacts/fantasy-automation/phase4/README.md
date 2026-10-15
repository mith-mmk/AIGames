# 第四段階とUIの検証記録

2026-10-15。Game StudioのGame UI Frontend／Game Playtest／Web Game Foundations／Three WebGL Gameを使用。

## 改修前後

改修前は`f1a42db`の配布JavaScriptをビルドせずに配信し、撮影前後でコミットの内容とのbyte一致を確認した。ベースラインは再生成しない。

| 確認 | 改修前 | 改修後 |
| --- | --- | --- |
| デスクトップ建設一覧 | [一覧](before/desktop-catalog.png) | [検索と未解放の費用](source/catalog-search-locked.png) |
| モバイル一覧 | [320px](before/catalog-320.png) | [320px](source/catalog-320.png) |
| 解体操作 | 対象クリック／即時撤去 | [確認と取消](source/delete-confirmation.png) |
| ゴーレム運用 | [既存工房](before/golem-workshop.png) | [研究案内](source/golem-research-guide.png)・[方針の理由](source/golem-policy-reason.png)・[補給達成](source/golem-supply-complete.png) |

独立したモバイルUI確認は [phase4-ui-compact/results.json](../phase4-ui-compact/results.json)。1440／390／320pxで検索、未解放の費用、案内、解体画面の収まり、キャンセル初期フォーカス、Esc取消を確認した。

## 再実行

```sh
npm test
npm run check:fantasy-stage4
npm run build:pages
npm run playtest:fantasy-stage4
node scripts/fantasy-automation-phase4.cjs --built
npm run playtest:fantasy-touch
node scripts/fantasy-automation-touch.cjs --built
```

`--ui-only`は検索・解体・ゴーレム導線だけを確認する。通常実行は転送門と世界樹まで確認する。`--before`は保存済みのベースラインを上書きしない。

## 通常命令の証拠

[reachability.json](fixtures/reachability.json) は資材・地形・技術・実績の直接書換えを行わない進行記録。seed662、1,014命令成功、失敗0、1,350ゲーム秒で全12研究と世界樹の成長10へ到達した。原料の自動生産と実物の転送を使い、同じ品の往復による転送実績の水増しはしない。建設資材の手採取・回収、作業員の手動配置、補助魔力炉への手動燃料補給は使う。

`fixtures/` の中間状態は同じ通常命令の実行中に保存したもの。旧v3との比較用データは `before/golem-active-v3.json` を保持する。

## 最終結果

| 確認 | 通常版 | Pages生成物 |
| --- | --- | --- |
| 検索・登録、Delete・取消・連打・入力中の抑止、旧v3保持、ゴーレム案内、転送設定・断線復旧、成長途中の保存、成長10・全12研究、リサイズ | [8項目成功](source/results.json) | [8項目成功](built/results.json) |
| 1440／390／320px、実タップによる建設・選択・解体・取消・確定 | [3画面成功](touch-source/results.json) | [3画面成功](touch-built/results.json) |
| 収納・登録・方向・物流・目的・ゴーレムの既存UI回帰 | [14項目成功](../visual-ui/source/results.json) | [14項目成功](../visual-ui/built/results.json) |
| 独立cloneの`/AIGames/`配信 | [依存導入前に成功](../distribution/phase4-clean-source.json) | [生成物だけで成功](../distribution/phase4-clean-built.json) |

両版とも世界樹の種10個、初回転送20個、世界樹の成長10を実際に達成。補助魔力炉への木材1個の手動補給は各16回行った。原料や実績を直接書き換えず、画面の補給ボタンを使った。ページ例外・失敗応答は0。全取得状態の保存検証は [browser-validation.json](browser-validation.json)。

[完成した世界樹（通常版）](source/world-awakened.png)／[配布版](built/world-awakened.png)、[成長途中](source/tree-growth-mid.png)、[モバイル解体確認](touch-built/delete-confirm-320.png)。

クリーンcheckoutでは依存導入・全テスト・到達検証・Pages306ファイル生成が成功し、ゲーム本体を変えずに作業ツリーが空のまま再現できた。新作127件（従来96件を含む）と既存作品のテストが成功。[総合結果](verification.json)と[仕様・条件](../../../docs/fantasy-automation/stage4.md)を参照。

Headless Chromium/SwiftShaderでの確認。実機GPU性能、Safari／Firefoxは未測定。mainへのマージ・公開は実施していない。
