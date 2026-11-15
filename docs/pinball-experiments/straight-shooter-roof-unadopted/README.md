# Straight shooter + top roof: 未採用版の小型復元packet

**5891d92eは未採用。** a038のrail＋ramp base＋floor停止を構造から避けるため、housing域ではshooterを直線のまま外側に残し、上部roofで左へ曲げる別topologyを試しました。.55の場内導入は回復しましたが、最大power1が右端rollover barからshooterへ戻るため、local natural gate不合格です。追加shapeや力調整は行っていません。

## 二つの構造方針と選択

1. **共通境界へ実体統合する案（未実装）**。housing外面X2.35をinnerX2.75まで単純に広げるだけでは、既存の上流端面がrail側へ球を向け、閉じるcornerを残します。終端ramp右端(2.205796,−.591417)から単純拡張端(2.75,−.526788)への上流法線は+X/−Z。railの−X法線と対向し得るため、これを解決済みとせずprebuildで保留しました。外端をZ−1.10まで成形し直す具体概念では法線が−X/−Zになりますが、実top/bottom/skirt/支持/ground ramp入口を同時設計する必要があります。この寸法は未検証で、family全体が不可能という意味ではありません。design/shared-boundary-alternative.json参照。
2. **実球の連結field-return corridorを残す案（今回source化）**。盤幅6.88・左右端−3.23/3.65は増やさず、innerX2.75／outerX3.205をZ−3.75まで直線維持。新しい印字帯・隠れ壁・箱・救済処理は追加しません。housing外側から既存OUTへの地上通路を実固定部材込みで確認しました。

以前のa038は、停止Z−.681535/Y.175でbase側許容X>=2.334806とrail側X<=2.329402が.005404重なり、隣接Z−.65では.071828不足していました。単一点の支持移動・面削りでは解決しないことをdesign/prior-field-*へ保存しています。

## 凍結寸法と変更範囲

- 94eaからshared whole-layout-geometry 1moduleのみ差、38module byte一致。input/force/restitution/solver、ramp deck/flow、longbat/lower/save、印字sourceは不変。右3支持は同じZの実innerX2.75へ移動し、post/foot/collar/crossheadが一体追従します。
- Top outerは(3.205,.23,−3.75)から(2.40,.23,−5.20)へR1.708400621、58.075653°の単一左円弧。innerは同心R1.253400621で旧開放Z−3.90まで、終点X2.740992。旧roof後半・bars/sensorsは保持。backingも外側.010へ同じ生成元で接続。
- inner4／outer1／roof24の実segment。直線→理想円弧は接線連続ですが、実最初chordは1.319901°。旧roofへの継目は実16.316735°（理想14.996834°）なので、roof全体が滑らかな接線連続とは呼びません。
- 可視roofは継承した8角open Tube、contactはcapsule。頂点/軸/半径はe−7級で合いますが、facetの内側差.004567228と孤立終端の可視hemisphereなし／contact軸延長.06が残ります。継目数増加だけから露出面積増加とは言えず、解析lune総面積は旧新同じ.016311849。実到達可能な露出面積は未認定です。

## 静的検査の範囲

ordinary engine組立のみ、step0、1580colliders／59attachments。floor接触を除き、実固定caps/feet/crossheads/base/roofを含む球R.135の各幾何witnessを測定しました。query誤差は下記の離散間隔上限とは別です。

- field X2.53/Y.175、Z−4.15からhousing全長を通り右OUT中央値・開放Z4.85へ連続path: 離隔下限+.037045。
- inner開放cap上側を回るZ−4.15横断: +.031752。
- 実発射X2.93/Y.175からZ−4.15: +.007000、最狭は実右post。右foot半径は実.040（左footは.085）。bare rail面間.355／floor中心区間.093609だけを全通路保証にしていません。
- 右OUT中央値+.050564、外周X3.45線+.000652。後者の余裕は小さく、頑健性保証ではありません。
- X2.97/Y.175–1.20/Z−3.90..4.425の別height sheet下限+.025593。実発射点をこのXへ動かす処理はありません。元X2.93はrail高さで接するため粗sheet下限−.010959をそのまま保存。
- **field側高所sheetは実crossheadと交差**します。地上連結は高所の全到達領域・全停止解消を証明しません。上記witnessは自然軌道でも案内処理でもありません。

## 自然比較と最大power失敗

accepted884／94ea／5891は各別process、同順序.55,.65,.75,.85,.925,1＋weak.1、同操作/力/通常engineで比較。

- 新.55はupperから場内へ入り通常drain、score25/minZ−4.544466。accepted minZ−4.641886。新.65/.75/.85/.925も場内→drain。今回sixではa038固有の長時間停止なし。ただしstableの別のrear pauseを含むwhole no-stall資格ではありません。
- **power1はscore0、同球shooter帰還**。旧2版はfield/drain。343tick全p/v一致の観測では、tick54の初期円弧4capsule接触後、55でv(0,−.203,−15.525)→(−9.174,0,−1.723)。公開manifoldの初期impulse0から厳密CCD/substepを断定しません。
- 球は開口から左へ出てX1.971414/Z−4.555743へ達しますが、tick67–68の右端bar中心(1.875,.23,−4.55)でimpulse1.126834、vx−8.465→+3.002。下側fieldへ渡る前に右へ反射し、同球帰還となりました。**約15°継目／innerend／柱への接触はその反転までありません。** 「開口を通れない」失敗ではなく、屋根からbarへの入射・場内受渡しの失敗です。
- 弱.1は全3版で同球帰還し、同位置からの再発射を保持。永久launch loopとは断定しません。
- 未実行: candidate全206／自然54／dense568／自然wire全経路／人のPC・実機mobile。現在stableのfresh206件passログSHAは6f460b2ee61250c5eea030764f56d7f7d7904bca5c44b22468fed236a111cf51。これは候補資格ではありません。

独立画像は45°485276tri／590calls、500k以内。直線shooterは整理される一方、長い右crossheadと空白、左wire、大bat、static save未完が参考差として残ります。参考画は透視画像でCAD寸法ではありません。画像rawはコピーせずhash参照です。

## 安全な復元

repo rootから:

```sh
node docs/pinball-experiments/straight-shooter-roof-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/straight-shooter-roof-unadopted/restore.mjs --output artifacts/pinball/straight-roof-review-copy
```

既定出力はartifacts/pinball/straight-shooter-roof-recovered-5891d9。固定accepted884 Git baseと、既存tracked whole-long-lane-unadopted内の原94ea build/helper/geometryをhash固定で再利用し、新payloadの**原build bytes**をメモリ内実行します。親packetの重複copyや巨大source mapsは含めません。依存packetを同じ相対位置で保つ必要があります。

Source SHA: 5891d92eeed8fb333bfefc493a09d72a89c03a10d615beb9203b0d7b0f7edbfa。元94ea／a038／5891 directoryへの出力、異なる深さ、symlink、非directory、既存不一致を拒否し、既存同一bytesだけ再利用。原buildの固定出力先を直接実行せずrestoreを使います。

復元12fileをhash確認し、単独loaderでstep0組立を確認します:

```sh
node --import ./artifacts/pinball/straight-shooter-roof-recovered-5891d9/loader.mjs docs/pinball-experiments/straight-shooter-roof-unadopted/verify-recovered-assembly.mjs
```

loader=5891、baseline-loader=94ea、accepted-loader=884。重ねて使用しません。後のstable OUT-arrow／prototype ribbon描画変更は含めていません。verification.jsonに冪等性・拒否・元freeze不変・検証一時物のTrash移動を保存します。

## 次の設計判断（未実装）

roof形状だけの盲目的sweepやbar削除ではなく、.55と最大powerの実入射状態を対照に、**roofからの導入方向・右barの実位置/角度・対応sensor・複数laneの実開口**を一体で検討する必要があります。barの接触機構・得点条件を残し、sensorだけ移動しません。高所支持・可視外皮とcontactの差、参考構図も独立gateに残します。今回sourceは変更しません。
