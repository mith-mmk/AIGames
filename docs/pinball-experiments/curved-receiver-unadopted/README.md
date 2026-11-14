# Curved receiver: 未採用版の小型復元packet

**本番非採用。** accepted runtimeは884960985a413986d57aff0c2280e59a7be79dcf、作業HEADはeaf9be3a21bf5f09b1d17e277198e13dd9aead3f。この資料は検証済み版の配布ではなく、不成立の比較候補と根拠を保存するものです。production・既存test期待値は変更していません。

凍結source SHA256: `613f54747cc4fbbf66ee8c1cedbe4ff64c99271ee5cd17697c28ea381eb1ace0`。

## 改善した点と、採用できない理由

- 初版のinner終端とdividerの軸間.255501は球径に不足。元寸法・負値を保存し、受球境界を(1.35,3.10)から(1.27,3.20)へ内向きに再接続しました。修正版軸間は.418956です。
- 旧pivot±1.25へ戻し、同batの実可動外形を避けるtailに変更。旧rail貫入−.058009に対し、新しい全yaw保守的離隔下限は+.071491。実画像でも旧rubber貫入から分離したことを確認しています。これは全盤面の安全証明ではありません。
- OUT tailの最狭表面間は.286685、球径.270との差は.016685のみ。同Bezier parameterの中点経路は不正です。別の静的な連続可通領域は確認しましたが、そこへ球を導く処理はruntimeにありません。
- 自然6powersと弱.1の同球帰還・再発射、限定OUT中央fixtureは通過。全36の捕捉とcoil1回を保持しましたが、上流到達は候補13/18対旧14/18。
- **右45／左55は上流到達後に左外側X≈−2.4805/Z≈2.99で停止。** 新shaft(−2.33,.02,3)と既存stock(−2.65,.2175,3)、low stock、floorに接触し、shaftと外stockには実荷重があります。870／924tick（7.25／7.70秒）の連続低速観測で、held bat捕捉とは別です。永久停止を証明したとは述べませんが、この有限観測だけでも未達です。
- 参考の長く比較的直線的な帯に対し、66.48°のSと外向きtail、短い印字帯、OUT文字を横切るstaticcamが残り、参考改善とは評価しません。45°498808trianglesは予算500000内ですが、残り1192しかありません。

全202回帰、自然54、連続aimの資格確認、自然wire到着、実機mobile、人のplaytestは未実施。static save／bracket／board bores／固定stock接合の完成も未達です。到達数や静的clearanceを、外側領域の二停止への免責にはしません。

## 復元方法

repo rootから:

```sh
node docs/pinball-experiments/curved-receiver-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/curved-receiver-unadopted/restore.mjs
# 別名も指定可能。artifacts/pinball の直下に限ります。
node docs/pinball-experiments/curved-receiver-unadopted/restore.mjs --output artifacts/pinball/curved-receiver-review-copy
```

既定出力はartifacts/pinball/curved-receiver-recovered-eaf9be3。元凍結directoryへの出力は、既存byteが一致していても拒否します。既存同一fileは再利用し、不一致・非regular file・symlink・誤った深さは書き込み前に拒否します。通常の復元では4生成file＋10exact payloadの**14file**を復元します。

原build.mjs・helper・fixed-plan・loader・manifest・dependenciesのbyteは保存したままです。wrapperが既知の3入力だけをpayloadへ向け、元buildの4出力をメモリへ捕捉し、全生成hashを確認してから別directoryへ書きます。元artifactが存在しなくても、pinned git baseとpayload・vendorが揃えば復元できます。未知の元directory読み込み／書き込みは拒否します。

単独復元loaderの物理組立確認（world stepなし）:

```sh
node --import ./artifacts/pinball/curved-receiver-recovered-eaf9be3/loader.mjs docs/pinball-experiments/curved-receiver-unadopted/verify-recovered-assembly.mjs
```

元payload/verify-assembly.mjs、診断runner、static auditは歴史的な出力先を保つため、復元directoryからそのまま実行して元artifactを上書きしないでください。上記safe wrapperと専用組立確認を使います。initial-audit.mjsは当時のplan importを保持しており、初版の再計算にはinitial-planへの明示的な解決が必要です。

## 保存範囲

- payload/: 原build/input/loader/manifest/dependencies/README/組立結果のexact byte。
- coarse-summary.json: 全36行の原summaryを省略せず保存。stopped-endpoints.jsonは二停止の実接触・荷重・状態。
- static/: 初版／修正版寸法、audit、負値を含む実数値、corridor計算。out-witnessの巨大点列はhash参照のみ。
- independent/: 独立sweep／gap／旧shot全点間比較。independent-review.md／independent-summary.jsonに実画面の未達と予算。
- evidence-references.jsonとindependent-evidence-manifest.json: 元source、raw traces、34画像などのpath・bytes・SHA256。画像や巨大rawはpacketに含めません。
- verification.json: 別output復元、全14file一致、idempotence、不一致／symlink等の拒否、物理組立、元freeze不変、検証一時物のTrash移動結果。

## 次に必要な全体判断

1. IN／OUTの予定通路だけでなく、wire外側・既存外stock・shooter・支持間へ実際に戻る領域を一体で定義する必要があります。shaft一本の移動だけで二停止を消して終わりにはしません。
2. 参考の長帯と射出口を両立するため、lane開始位置、sling外皮、受球面、pivot、上流target経路のどの相対配置を可変にするかを全体図で判断します。旧受球datumと入口を両固定した66°Sは参考から離れました。単純な盤伸長や旧失敗した外拡幅を自動的に再採用しません。
3. saveの可動機構は別の完成条件です。静的cam＋有限impulseを完成品と扱わず、可視運動・実接触・earned作用を一致させる検証が必要です。

このpacketには次の形状試作・力調整・test期待値変更を含めません。
