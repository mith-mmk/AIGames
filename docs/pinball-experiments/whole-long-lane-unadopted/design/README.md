# 長い下部 lane の全体寸法案: 実装前比較

採用 HEAD 891ae621f7d822dcb2c3d66ea1247fa4f4c97bb5、runtime 884960985a413986d57aff0c2280e59a7be79dcf。既存形状・入力・力・solver・test期待値を変更していない。候補source map、collider、physics試験はまだ作っていない。

same-scale-comparison.png / .svg / comparison.html が比較図、dimensions.json が提案の初期寸法。参考 neon-reference.png は実見した透視画像であり、物理scaleやCAD境界を決める根拠ではない。accepted と案のみ同じ68px/model-unit。元参考画像をこのローカル比較資料に含めるが、公開/外部送信はしていない。

## 何が旧局所案と異なるか

旧 curved-receiver は短い領域で66.48度まで曲げ、旧pivotへ戻し、見た目を強S化した。今回主区間は divider (1.90,.22,3.00)→(1.35,.22,4.65)、長さ1.739253、傾き18.434949度の直線。両側を法線方向に.430ずつ配分する（X差.430ではない）。半径.020 stock同士なら直線の表面間.390、球径.270との差.120。ただし端部接続、支持、曲線内側、外周を含む安全幅の保証ではない。

新pivotは±1.35/Y.27/Z5.20、同じbat長1.14。旧rest投影gap.590694に片側+.10を足す算術は.790694。広いgap自体を参考不一致と扱わないが、center save、排出難易度、自然capture/refire、連続aimは再資格。

boardは左−2.85/右3.65、rear−5.75/front6.90、6.50×12.65。旧5.50×11.90から幅+18.18%、長+6.30%。L/W2.16364→1.94615なので、過去の幅据置き+.90延長と同じ細長化ではない。一方、上部/robot/missionをX0へ残すとboardcenter+.40から偏り、右外周の余白が大きい。新下部の空白も消えていない。

- wire終点Z3→pivotZ差1.45→2.20 (+51.72%)。直線plan距離は旧sqrt(.47²+1.45²)=1.524270、新sqrt(.37²+2.20²)=2.230897。支持球高さは同じで、自由落下高さ増ではなく走行・接触・到着速度が変わる問題。
- sling末端Z2.65→pivotZ差1.80→2.55 (+41.67%)。shotがsling高さへ達する距離/時間が変わる。上流到達が旧と同じになる予測はしていない。
- robot inkは実accepted rasterのAABB、mission/indicatorは旧datumのまま。装飾を伸ばして空白を隠していない。

## Shooter と外周

shooter軸2.93。内rail候補は (2.75,.23,+.50)→(2.35,.23,−3.10) に長さ方向run3.60/横shift.40の二円弧。中心軸R8.20、最大接線12.680383度。内r.045/外r.060に法線軸差.455を配分し、理想同高表面間.350。旧追加S入口の.265<D.270をそのまま繰り返さない。

旧roof/bar/sensor/場内出口を保持する方針だが、外rail終点X2.805/Z−3.10から旧X2.72/Z−4.15への実継ぎ目は未確定。図の橙破線はその未確定を示す。旧外stockは8角の実断面なので、新円筒/capsuleと混ぜて断面同一と主張しない。

右端3.65はouter rail X3.205/r.060とwall内面3.63の間に、理想直線solid幅.365を確保する仮配分。裏を青い塞ぎ箱にせず、外周へ球が来る可能性も設計対象にする。ただし支持の実外皮、上部の連結、front出口まで連続した可通領域は未検証。

左支持列X−2.75はboard端−2.85から.10内。foot r.085ならboard内の端余裕.015。これは固定足が板上へ載る条件に過ぎず、球幅の証明ではない。wall内面−2.83に対しfoot端−2.835の固定部重なり.005、crossheadを旧wireへつなぐ接合と裏面締結は設計が要る。既存上部wire通路を削るだけの支持移設にしない。

## Front と rod

球stop中心Z4.60、球readyZ4.425、pull travel.32を固定し、shooting fieldまでの走行距離はZ+.75移動しない。案はmechanical plungerのrear spring seat / guide / knobを+.75、tip/front spring seatは旧datumとしている。新rear seat6.14、guide6.164..6.344、knob origin6.45、rest cap端6.63、fullpull cap端6.95。新front6.90に対し旧と同じrest−.27/pull+.05の関係。

これはrod/guideを接続して描くための幾何案であり、実筐体cutout/固定荷重経路の確認ではない。圧縮ばねの長さも.67→1.42と増す。入力/既存launch forceは変えないが、より長いばねの見た目・支持機構が妥当かは未評価。rodは球後方へ延ばす想定でも、実meshのpull全域と球/前枠の接触検査を省略しない。

## 実装前の未確定

1. 主lane末端からreceiver/heelへの接続を、実球中心＋bat接触＋rail法線と全moving mesh sweepで決める。旧の貫入tailを再利用しない。図の橙heel領域は通路ではない。
2. OUTの全高出口・外側領域・wire降下の実到着を同じ支持列で検査する。片側midlineだけを保証にしない。前回のshaft+stock間.265で2球停止した外側領域も含める。
3. 同じ有限earned作用を保ったsaveの実位置・軸をOUTと決める。旧静的camは完成した可動機構ではなく、この図にも合格部品として描いていない。動的saveへの置換は別資格。
4. 新長いshooter連結と上部継ぎ目、実板/前枠/rodを構造として成立させる。弱発射をforceで補正しない。
5. 参考への全体比率/空白/可読性を先に判断する。見た目未達ならこの寸法のままsource化しない。

上記が固定された場合のみ単一のartifact source freezeへ進み、静的全高球域/whole-bat/support → 自然6powerとweak → 左右OUT/36IN → 自然wire/continuousaim/202全回帰/54自然gameの順で比較する。全試験は今回未実行。元曲線案や既存復元packetは改変しない。

## 再生成

repo rootで python3 artifacts/pinball/whole-long-lane-plan-891ae62/draw.py、node artifacts/pinball/whole-long-lane-plan-891ae62/render.cjs。既存Chrome/Playwrightだけでrender。render-check.jsonはSVG全textがpage内に入るか検査。俯瞰のprofile sweepは輪郭投影の離散表示で、連続3D干渉計算ではない。
