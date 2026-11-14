# 同じ1全体案の比較前提を修正: sling外側から開始

この比較を作成した時点でruntimeは未実装。長さ12.65案はsling→batのZ距離+41.7%と余白に問題があり、source化しない。side-start-comparison.png / SVG / HTML は、frontを旧6.15、pivotZを旧4.45へ戻した配置比較である。元案図は判断履歴として保持する。

## 固定した比較寸法

- board左右−2.85/3.65、rear−5.75/front6.15、幅6.50×長11.90。旧上部/robot/mission/slingを保持したため、board中心+.40への非対称と右上余白は残る。
- 左右pivot±1.90/Y.27/Z4.45、bat長1.65、半幅.14、heelBack.06。元長1.14はユーザー絶対条件ではない。旧中央開口を固定するために長batを必須としたわけではない。
- 既存共有 flipperProfile() を length1.65 で構築し、旧rest角へ実投影した中央gap **1.048863423**。同pivot/旧長1.14なら **1.890693564**。単なるnominal先端式でなく共有profileの輪郭。丸め/サンプリング密度はside-start-dimensions.jsonの計算元の通り。球の全状態drain幅や難易度保証ではない。
- divider直線X2.30/Z1.35..2.45、そこからneck X1.851035135/Z4.066486926へ二円弧。R1.567271545、最大接線31.044320616度、直線1.100＋移行1.698375718＝主軸長2.798375718。末端tail/support/受球法線は未固定であり、この長さ全体を完成したINと呼ばない。
- 実sling外面最大1.951968に対しIN裸幅2.28−1.951968=.328032。右OUTはdivider外面2.32→shooter内面2.705=.385。shooter球軸2.93、内rail軸2.75/r.045を区別する。
- INの上側内境界は実sling rubberであり、その中に別の平行railを重ねない。slingを離れた後のinner railは図で破線にし未設計を明示。
- wire端位置の仮目標は(−2.06,.44,2.75)。旧端(−1.72,.44,3.00)を単に切り取った設計ではない。新連続曲線、実終端接線/球速度、支持、検知の全てが未設計。橙破線は方向検討線であり球の軌道予測でも新wire外皮でもない。
- front/ball stop/rod長は旧Zに戻す。前案の+.75 rod/ばね延長はこの比較に含めない。shooterのX移設と上部接続は依然必要。

## 力係数を変えなくても作用結果が変わる

physics.mjs strikeFlipper の along はbat-local uではなく、(pivotAbsX − abs(ballWorldX)) / (flipperCenter+flipperHalfLength) を0..1にclampした値。length1.65なら、同じpivotからの相対X打点の along は旧の1.14/1.65=.690909倍になる。

例: 旧along=.30の同じ距離なら新along=.207272727。既存の aimAngle=.18−1.6*along+.2*(faceAngle+.5) は +.148363636rad 変化し、角速度係数が1なら speed=min(32,8+12+24*along) は−2.225454545。入力/coil係数/force/solverは変えない。物理的に到達できる打点分布が拡がる可能性と、同一release timingのaim/速度が変わることは別である。同等以上の連続aimを未証明のまま約束しない。

実装する場合の共通変更点:
- LOWER_LAYOUT中心.795＋halfLength.855でreach1.65、差.06でheelBack維持。これらはレイアウトの比較寸法で、productionには未適用。
- mechanical-contactの共有profile/convex colliderを実長で作り、visualだけ横scaleしない。
- MechanicalFlipper の sx=length/1.04 はbody/engravingだけでなくbearing mount、crank pin、slider、link、spring anchor等にも影響する。既存材質は保持する。underboard機構の実連続性/全moving mesh sweep/固定部との隙間を再計測する。
- yaw範囲、更新則、strike式、friction/restitution、キーを据え置く。長さに合わせる名目でaim係数や速度へ補正を加えない。

## 既に判明した静的不成立と次の検査

左外railをdividerから法線.430で作り、支持列を前案のX−2.75/Z3へ置くだけでは外周通路が成立しない。97点の円弧chord列に対するpost中心の最短距離は.09366458954、最近点の絶対X/Zは(2.65961160410,2.97544407973)。同高stock r.020とpost r.037を引くとgap **.03666458954 < 球径.270**。foot r.085の俯瞰投影とは−.01133541046重なるが、高さが違うのでこれだけでfootとrailの実固体貫入とは呼ばない。

これは『その支持列を残した外周通路』という仮定が成立しない結果であり、全体案不可能という意味ではない。必要な構造選択は次のいずれか:
1. 外rail/支持/cabinetを実在する境界として一体化し、wireやairborne球も含め背後へ入らない構造にする。目立たない隠れguardや青い塞ぎ箱で代用しない。
2. 左にも外周の実球幅を配分し、板・支持列・crossheadの幅を一体に増す。shaftだけの微移動では足/壁/返球の検証にならない。

右ではOUT outer rail案X2.73とshooter内railX2.75が固定部として重なるため、二本の独立stockのまま合格にしない。共有する実境界と分岐継ぎ目を設計する必要がある。上部connectorとroof外railの継ぎ目、右の裏側到達領域も未解決。

図の方向が選ばれた場合も、まずこの外周構造を決め、その後に実receiverの球中心/normal＋bat全sweep/shaft＋wire全高を同じ静的組立で検査する。不成立区間を残したままruntime freezeや動的試験へ進めない。有限earned saveの静的cam/未完成駆動は別の未達として保持し、ここに動的方式変更を混ぜない。

## 状態

profile/寸法/既存source式の計算のみ。candidate runtime/全mesh衝突の静的組立/自然試験は未実施。既存202/54/36/連続aimは試していない。production・既存freeze・tests期待値不変。図を既存Chromeでrenderし、全textのpage内検査とPNG実見を行った。参考の長帯とsling/bat近接は前案より読みやすいが、外周/機構/動作の成立資格とは分離する。
