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
```

`--ui-only`は検索・解体・ゴーレム導線だけを確認する。通常実行は転送門と世界樹まで確認する。`--before`は保存済みのベースラインを上書きしない。

## 通常命令の証拠

[reachability.json](fixtures/reachability.json) は資材・地形・技術・実績の直接書換えを行わない進行記録。seed662、1,014命令成功、失敗0、1,350ゲーム秒で全12研究と世界樹の成長10へ到達した。原料の自動生産と実物の転送を使い、同じ品の往復による転送実績の水増しはしない。建設資材の手採取・回収、作業員の手動配置、補助魔力炉への手動燃料補給は使う。

`fixtures/` の中間状態は同じ通常命令の実行中に保存したもの。旧v3との比較用データは `before/golem-active-v3.json` を保持する。

ブラウザの最終確認結果は実操作の完了後に追記する。
