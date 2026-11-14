# 全体 long-lane 案 A: 静的 checkpoint、未freeze / 未採用

source SHA256: **4c586a1b7ff457e12bd6c7cda38a003c2b9ff39dca516af25bf96ea1168f19f4**。単独 loader: `artifacts/pinball/whole-long-lane-891ae62/loader.mjs`。baselineは884960985a413986d57aff0c2280e59a7be79dcf、repo HEAD891ae621f7d822dcb2c3d66ea1247fa4f4c97bb5。production/test期待値/commit不変。**静的OUT throatが未成立なので自然試験へ進めない。**

## ここまでの固定配置

board[-3.23,3.65]、幅6.88、長11.90、front6.15。pivot±1.90/Y.27/Z4.45、bat長1.65/半幅.14/heelBack.06。実profile rest投影gap1.048863423。長帯をsling外側Z1.35から開始し、広sling/target/robotのdatumを保持。比較図は../whole-long-lane-plan-891ae62/。幅増と右上余白はreferenceへの未達として隠していない。

旧quietの正規化打点一致を設計目標にした球中心は左(−1.616902454,.175,4.009302855)、bat-local u=.454610851、正規化along=.171574271。対応receiver軸(−1.765226423,.22,4.009302855)。実shared colliderとrubber mesh凸包の接点/query境界を確認。理想静的接点であって、新しいquiet equilibrium、release分布、world shotの証明ではない。以前仮neck1.851035/Z4.066487から内へ.085809、上流へ.057184変更した。

## 実組立と今回の不適合

- ordinary engineの静的組立1615colliders/59attachments。world.stepやlaunchは行っていない。12 changed keys、27 baseline modules byte一致。
- whole bat shared contact最小+.0659336、actual moving mesh凸包8部材の最小+.0659072。rest→held 541姿勢、最大回転半径1.649101から角間隔分の上限.0016491を引く保守下限+.0642581（query誤差は別）。相手はlower stock/attachments。全筐体の全可動内部機構との保証ではない。
- **OUT tail**: non-corresponding segment対の最短axis距離は左.299773526、右.313823397。rail半径を引くsolid gap左.259773526/右.248823397。左は同高.22で球径.270を下回り、floor球中心.175の理想平面中心幅は約+.003126のみ。右はY.22/r.020とY.23/r.045でfloor面の拡張半径和約.319715に対しplan軸間約.313664、約.006051重なる。この通常floor throatは不適合。高く飛び越える可能性と、球の全3D経路の不可能証明とは区別する。
- 主INのbare rail対幅は.3896977。主区間が広くても、receiverからheelへ回るdivider tailとOUT tailの別曲線が出口を狭める。印字やforceでは解消しない。
- 左OUTのfloor高さのinspection lineは低camに約−.019973接触する。cam top.060、board top.040による意図した.020段差で、自然低速/無充電通過は未試験。静的cam/rodとcoil取付未完成は従来どおり未達。

## 支持修正の前後を保持

initial-column-failure/には元 **d2ae6a0877c7f131ee9638329116c1f69b5b9537f3f8066605f1b0bf140e83a9** のsource/build/helper/geometry/manifest/changesと静的結果をそのまま保存。新curved shooterに対し右column X2.75を一律に置いたため、Z−1.831の柱がcenter probeへ−.099519貫入した。

修正版では `shooterInnerXAtZ()` が実inner railの同じchord軸を求め、shaft/foot/cap/crossheadを同時に取付ける。例Z−1.831で柱軸X2.449103。部材は削除していない。新center sampleはY.23で+.0349768/Y.35で+.0576158、Y.175はfloorに接触。これは全軌道保証ではなく、元不適合の同一query比較。

## 通路の存在検査と限界

../whole-long-lane-static-891ae62/continuous-passages.json はfloor接触を除いた、指定polyline上の実球clearance。各区間midpoint sampleから半間隔を引いた1-Lipschitz下限（query誤差別）:
- 左外周X−2.90/Z−4.10..5.00: +.01650075。
- 右shooter外側X3.45/Z−4.10..5.00: +.00040185。正値だが余裕は極めて小さく、generous-marginと呼ばない。
- shooter ball初期位置付近→inner open end: +.00776628。
- 左右IN主approach、receiver前で打切り: +.02650485。

これらはruntime内の誘導線ではない。新sourceにwitnessやball-state correctionを追加していない。OUT tail、wire自然落下、右OUT分岐裏の狭い領域、高所球/全yaw/全初期条件を保証しない。以前の同parameter右EXTERIOR sampleがshooter dividerを横切って負値になることも保存し、有効なstartと扱わない。

## 上部/境界の変更範囲

shooter ball軸2.93、inner軸下部2.75、長いconnectorはZ+.50→−3.10、shift.40/run3.60/R8.20。表面gap.350をinner端まで保つためouter終点とroof先頭のみX2.805/Z−4.15（旧2.72から+.085）、対応backing輪郭を同時変更。後続roof2.40/−5.20以降、rollover bars/sensors、場内出口は旧datum。外stockは旧8角柱から共有round capsule stockへ変わっており、断面が同じとは主張しない。

wireは旧曲線parameter<.8を保ち、.8の実位置/接線から新端(−2.06,.44,2.75)へ共有Hermite接続。end tangent(.284265,0,.958746)。terminal sensorは既存導出則のまま同じrowから(−1.980406,.58,3.018449)、半幅.195/半高.20/半厚.10。これはexit成功の証明ではなく実支持/自然速度/落下とsensor通過を別途確認する必要がある。

## 座標依存の契約

- 旧場外absX>3.2は旧board端2.75＋.45。新実板に合わせ、playing/ready両方を左−3.68/右4.10へ変更。Y/Z範囲、drainZ5.05、state drain/resetの回数・動作は不変。外周へ飛び出す球の安全性を解決したとはしない。
- shooter returnは旧絶対X(2.45,2.70)から新axis−.08..axis+.17=(2.85,3.10)へ。Y帯/returnMinZ4.25/returnMaxZ4.56、下降条件は不変。全域return検知ではない。
- IN sensor位置のみ入口の意味に合わせ(±2.08,.20,1.65)、大きさ/得点処理は旧と同じ。ramp終端sensorは共有wireに追従。score/game-state/charge獲得条件を広げていない。
- strike式/solver/入力/launch力は不変。ただし分母lengthが1.65になり、同じ相対X打点のalongは旧の.690909倍。長さに合わせる係数/速度補正は追加しない。実release打点/aim/speed分布は未試験。
- 既存C由来の有限earned-save strength12/回数/条件を保持し、位置/固定軸と実cam接触だけをlane geometryへ整合。新しい動的saveは混ぜていない。

## 次に必要な変更範囲

現4c586aはOUT throat不適合のためここで止める。quiet正規化一致を絶対固定せずreceiver位置/法線を再配分するか、OUTの外側移行をもっと上流から確保してlegal heelの曲がりと一体化する必要がある。後者は右shooter分岐の到達可能領域と外周を含める。どちらも追加の局所shaft移動ではない。今回sourceを採用/安全freezeと呼ばず、次の変更が必要ならこの不適合の因果を保持してから行う。

全202、自然54、6power、36delay、連続aim、自然wire、実機mobile/human playは今回すべて未実行。元fixture/期待値を書き換えていない。
