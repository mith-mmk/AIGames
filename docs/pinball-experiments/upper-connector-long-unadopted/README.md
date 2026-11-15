# Longer upper connector: 未採用版の小型復元packet

**a038は不採用。** 参考全体案94eaのupper connectorだけを長くした比較ですが、.55の場内導入を回復せず、自然.75／1に新たな停止が生じました。静的に通れる経路が存在することと、自然に入る全領域で停止しないことを分離して保存します。追加shape・力調整・test期待値変更はありません。

復元は当時のaccepted884960985a413986d57aff0c2280e59a7be79dcfを起点とし、94ea→a038の原bytesを再現します。現在のstable0b75d19770428cb6daf48f2cb7776ba109860d79／206件資格は別です。**本試作の全206回帰、当時の全202、自然54は未実行。** stable OUT矢印修正を復元源や関連patchへ混ぜていません。

## 変更と失敗

- Shared geometryの2値のみ: connector開始Z.50→2.45、run3.60→5.55。shift.40、終点X2.35/Z−3.10、断面、roof/bar、操作/force/restitution/solver、lower/longbat/wireは不変。1module差／38module byte一致。
- R8.20→19.3515625、理想最大接線12.680383→8.244596°。内外各24segments。右支持3本のshaft/cap/foot/crossheadも共有生成元で追従し、部材は削除していません。
- 原因仮説は94eaの.55にあった早いouter→inner反射を浅くすることでした。新案の初outer接触はtick40（旧94ea61）へ早まりましたが、.55は再びroof未到達で同球shooter帰還。最深Z−4.223624、94ea−4.177123、accepted−4.641886です。Zを.046501進めたことを成功とはしません。
- **自然.75と1は(2.331826,.171238,−.681536)付近で停止。** 20秒上限時もplaying／ball1、連続低速tail1913／1940tick（15.94／16.17秒）。永久停止の数学的証明ではありませんが、自然開始からこの長時間拘束が生じた時点で未達です。同powerの94ea／acceptedは通常排出でした。
- 最小.75再観測は2400tick全p/vが保存traceと一致。停止時はinner capsule中心(2.499650,.23,−.701355)／r.045と、ramp baseColliders[29]（colliders[496]）trimesh、floorに実荷重。**柱ではありません。** 末端のinner/base impulseは約.002414/.005838、floor.073614。base初接触384tick、477tickでinnerとの同時接触に入り停止しました。1の拘束相手は同じ位置だけを理由に断定しません。
- 他の新.65/.85/.925は通常排出、弱.1の同球帰還・位置を変えない再発射は保持。右OUTは94eaと同じ絶対startで双方201tick排出。成功fixtureへの位置変更はしていません。

## 静的数値の成立範囲

当時の検査はordinary worldを組み立てるだけでstepを行わず、次を測りました:

- Shooter球中心polylineの連続離隔下限+.007317、右OUT中央値+.034957（94ea+.050564）。右OUT上流側の余裕は減少。
- 上部中心polyline上、Y.175–1.20の**1枚の鉛直sheet**は+.024044。これはinner裏のfield-return領域、実到達する全体積、反射後の通路を認定していません。今回の停止はその対象外でした。
- 右外周X3.45の同一線は実sample最小+.000901849。粗い間隔.002の誤差上限込み下限−.000098151を保存し、間隔だけ.0005へ細分して+.000651849。ごく小さい幾何余裕であり、安全や頑健性の資格ではありません。
- 移動した支持12部材の実mesh端/半径・collider中心差は最大約1.21e−7。円筒contactと多角形側面が解析的に同一だと主張しません。
- Bare upper gap.349990、右OUT入口pair gap.352730は支持・ramp裏・自然反射を含む全通路保証ではありません。正値で自然停止を免責しません。

当時のstatic説明はpayload/README.mdにそのまま保存し、この最終READMEとdiagnosticsの失敗観測を後続結果として優先します。inner裏の実base境界を含めない中心線だけの判断では不足でした。次案や新しいcurveはこのpacketに含めません。

## 安全な復元

repo rootから:

```sh
node docs/pinball-experiments/upper-connector-long-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/upper-connector-long-unadopted/restore.mjs
node docs/pinball-experiments/upper-connector-long-unadopted/restore.mjs --output artifacts/pinball/upper-connector-review-copy
```

既定出力: artifacts/pinball/upper-connector-long-recovered-a03806。

Source hashes:
- 94ea: `94ea51ffb02ae7d030f79ade9f05d02eeeaf73da088ea83b8d518253624d0c03`
- a038: `a03806a4f8e23b4ad7cee33fbea423118ef885e353fa917c11906c275758be76`

parent/の原buildから94eaをメモリ内生成し、payload/の原buildからa038をメモリ内生成。各生成hashを照合してから別directoryへ**11file**を書きます。巨大source mapsをpacketへ含めず、元artifactがなくてもpinned Git baseと検証済みvendorから再構築できます。両段の元build/input byteは変更していません。

元a038／94ea directory、違う深さ、symlink、非directory、既存不一致fileを事前拒否。既存同一fileは再利用し、異なるbyteを上書きしません。破損payload/vendorも拒否します。

単独loaderで物理組立のみ確認:

```sh
node --import ./artifacts/pinball/upper-connector-long-recovered-a03806/loader.mjs docs/pinball-experiments/upper-connector-long-unadopted/verify-recovered-assembly.mjs
```

復元loader.mjsはa038、baseline-loader.mjsは94ea、accepted-loader.mjsは8849609です。重ねて使わないでください。1581colliders／59attachments、step0を再確認済み。原buildや保存診断scriptは歴史的な固定出力先を保つため、そのまま実行せずsafe restoreを使います。

## 保存範囲

- payload/・parent/: 原build、共有geometry、helper、loader、元manifest/dependencies、正確な再構築入力。
- proposal/・static/: 具体寸法、実支持測定、全高sheetの限定、粗い負boundを含む検査値。
- diagnostics/: 自然各power、弱帰還、右OUT、.55接触、.75完全再現・荷重の小型final資料。巨大rawはevidence-referencesのbytes/hash参照。
- related/prototype-ribbon/: **94ea内だけ**の幅広印字失敗7bc02bd0→細帯8b3e8f56→OUT矢印方向修正ea806409の逐次patch/hash・画像manifest。a038に適用せず、stable修正も含めません。最終prototypeは493232triangles／563callsで、印字の局所改善に留まります。whole layout、自然性、static save未完は不変です。
- verification.json: 11file一致、冪等性、7拒否case、組立、両元freeze不変、検証一時物のTrash移動。別作業のstable差分内容は保存せずhashだけにしています。

自然wire、連続aim、人のPC/mobile、現全206／当時全202／自然54は未実行。a038不採用と、prototype内の印字局所改善、別のstable矢印修正を混同しません。
