# Whole long-lane: 未採用版の小型復元packet

**本番非採用。** 安全認定・完成版の配布ではなく、全体配置を変えた一案と失敗・限定改善を保存する資料です。productionは884960985a413986d57aff0c2280e59a7be79dcf、作業HEADは891ae621f7d822dcb2c3d66ea1247fa4f4c97bb5のままです。既存tests期待値、操作キー、force係数、solverを変更していません。

## 今回の結果

- Board左−3.23／右3.65、幅6.88／長11.90。pivot±1.90／Z4.45、bat長1.65。長いlaneをsling外側のZ1.35から始め、frontとsling→batのZ関係を維持しました。先の下流延長案はsource化していません。参考は透視画像であり、これらは画像から算出したCAD寸法ではありません。
- 初版d2は右支持が曲がったshooterへ侵入（−.099519）。支持を実inner stockへ合わせた4cではOUT末端のfloor-center幅が右−.0060513。いずれも失敗値と生成元を保持しています。
- 最終94eaはOUTを早く外へ分ける1本の連続curve、追従する実取付、同じ有限earned save軸を使用。実bat下部全yaw保守下限+.064258、OUT裸表面幅は左.389880／右.384986。主OUTの幾何的存在経路は確認しましたが、左cam上昇やwire横梁への高所接触を安全PASSにしていません。
- 右OUT裏とshooterの間はfloor球が入らない一方、上から球が両rail上へ乗り得ます。事前固定した合法高所fixtureは112tickで通常排出。接触中のpost-step負gap−.00345817も保存しました。自然な高所到達や全軌道安全の保証ではありません。
- 自然6powersでは旧版は全てfield到達。候補は.55のみ同球shooter帰還／score0、残り5powersはfield到達。弱.1の同球帰還・位置を変えない再発射は保持。一度の帰還を永久loopとは断定していません。
- 固定delay30–70/5tick、左右の18件ずつは候補3/18対旧14/18。ただし長batでは同delayが同打点ではありません。追加固定70–100/5tickの14件ずつは候補9/14対旧4/14。**前者を全操作域縮小、後者を性能向上とは解釈しません。** normalized along域が異なり、連続したaim幅は未資格です。
- 新65のalong/aimは旧55付近、新70は旧60付近。追加域は新along.319615–.535049／旧.395699–.686125。世界の発射位置も約.49–.50外へ移るため、時間換算だけで旧経路を回復したともいえません。
- 全64実行（36+28、delay70重複）で合法開始、実bat捕捉、coil1回、playing reset0を確認。候補の非bat停止はこの限定集合で0。繰返し70は分類不変、右traceは完全一致、左はworld生成順の異なる実行で捕捉時刻・shotの微小差があります。原因やbitwise決定性は未証明で、元差分を保持しています。
- 限定OUTは左右無充電で排出、明示的charge1 fixtureは1作動後排出。chargeを自然に獲得した試験ではありません。
- 45°493112triangles／569calls、500000予算の余裕6888。実render/contactの検査対象は59attachments、199lower rail、cam10頂点で一致。全1581collider外皮の認定ではありません。OUT二重折れは改善しましたが、wireによる印字遮蔽、短い印字帯、横梁列、大bat、幅広い余白など参考差が残ります。

全202回帰、自然54、dense/連続aim、自然wire handoff、人のPC/mobile、実機phoneは**未実行**。static save＋impulseは可動機構完成ではありません。関連actuator提案は今回実装されていません。

## 3版の復元

repo rootから実行します。

```sh
node docs/pinball-experiments/whole-long-lane-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/whole-long-lane-unadopted/restore.mjs
node docs/pinball-experiments/whole-long-lane-unadopted/restore.mjs --variant d2 --verify-only
node docs/pinball-experiments/whole-long-lane-unadopted/restore.mjs --variant 4c --output artifacts/pinball/whole-lane-review-4c
```

- final: `94ea51ffb02ae7d030f79ade9f05d02eeeaf73da088ea83b8d518253624d0c03`
- d2: `d2ae6a0877c7f131ee9638329116c1f69b5b9537f3f8066605f1b0bf140e83a9`
- 4c: `4c586a1b7ff457e12bd6c7cda38a003c2b9ff39dca516af25bf96ea1168f19f4`

既定出力はartifacts/pinball/whole-long-lane-recovered-94ea51（d2/4c選択時は末尾が各hash短縮形）。出力はartifacts/pinball直下に限定。元凍結directory、不一致の既存file、symlink、非directory、誤った深さを拒否します。全出力を事前検査し、同一byteだけ再利用、既存不一致の上書きはしません。payload/vendorのhash破損も拒否します。

各版の原build/geometry/helper/loader byteは変更せず保存。wrapperが既知4入力だけをpayloadへ向け、原buildの4出力をメモリへ捕捉してhash照合します。元artifactを読み書きする必要はありません。pinned Git baseと既存vendorは必要です。3版とも全生成source/baseline/changesが元byteと一致しました。

各復元は10fileです。元buildが生成するmanifestは `build-generated-manifest.json`、追記された凍結版manifestは `manifest.json` として両方保持します。この違いはsource改変ではありません。`dependencies.json`は最終版の元byteで、共通vendorと元入力の記録です。版別の正確な原build/geometry/helper hashはpacket-manifestのpayload項目が正本です。

単独loaderで、world stepをしない物理組立確認:

```sh
node --import ./artifacts/pinball/whole-long-lane-recovered-94ea51/loader.mjs docs/pinball-experiments/whole-long-lane-unadopted/verify-recovered-assembly.mjs
```

最終版1581colliders／59attachments、失敗2版1615／59を再確認済み。loaderを他の実験loaderと重ねないでください。原buildや保存診断・図生成scriptは歴史的な固定出力先を含むため、そのまま実行しないでください。復元にはsafe wrapperを使用します。

## 保存範囲と未達

- payload/: 3版の原生成元、helper、loader、manifest、最終設計READMEと負値、共通の2edit-list入力。巨大source mapsは含めません。
- design/: 比較図の小型生成script・寸法・説明。参考画像を埋め込んだ元SVG/HTML/PNGはevidence-references.jsonでbytes/hashを保存。
- static/: receiverの実法線/球中心、全bat sweep、元OUT閉塞、新OUT割当、支持、固定高所startと実全高負値。大きい1713断面traceはhash参照。
- diagnostics/: 全36coarse summary、追加28summary、time correspondence、繰返し70差分、自然発射／OUT／高所の小型要約。全raw traceはhash参照。
- independent/: 予算、実mesh/contact測定、参考比較、画像hash。d2/94eaを別版として保存。
- related/: **未実装** earned-save-actuator設計を元byte/hashのまま保全。
- verification.json: 3版全30file hash一致、idempotence、6拒否case、物理組立、元freeze不変、検証一時物のTrash移動。

上部は広いshooterを旧bar/field入口へ浅い実曲線でつなぎ、roof最初点・backplateも同じ接合へ変更しました。.55の自然帰還差は未達のままです。長batはstrike式の係数を変えずとも接触・正規化打点・タイミング・世界の経路を変えます。受球のnormalized quiet目標一致は、その後の遊びやすさを保証しません。

今後は参考の長帯、上部の弱中強導入、長batの連続打点範囲と実shot corridor、見える支持を同時に評価する必要があります。局所curveや力を追加して今回の結果を成功扱いにはしません。このpacketは次の形状試作を含みません。
