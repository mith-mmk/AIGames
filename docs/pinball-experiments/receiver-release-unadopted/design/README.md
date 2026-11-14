# Receiver / release を一体にした次の1案

**設計提案のみ。新しいruntime、loader、物理形状freeze、動的試験は作成していません。** 旧accepted c1と未採用Cの保存済み全36traceを比較し、次に一度だけ比較する形状の範囲と判定順を定めます。元Cのfreeze・復元packetは変更しません。

`receiver-release-plan.png` は実レンダリングして可読性を確認した単一画像です。SVG/HTMLを併存します。右列の破線は「旧traceを外側へ.15移した設計用の投影」であり、新形状の予測軌跡ではありません。左側を左右反転して表示し、図の横軸は |X|、外側が右です。単位はゲーム内モデル単位で、参考画像のCAD寸法ではありません。

## 1. 保存traceが示す問題

旧版のquiet捕捉時の球中心bat-local uは約.3546、Cは約.2137です。Cは球が止まるものの、丸いheelに寄りすぎています。旧版の停止面はrailの曲がり部、Cでは新しいZ4.10 shaftも実荷重を受けています。

release60..70直前、旧版のuは.24284→.34174へ広がり、Cは−.06365→−.06036付近に留まります。これは「捕捉成功」だけでは保てなかった転がり幅です。uは球中心の局所座標で、接触点やsource内のaim変数ではありません。負のuだけで潜り込みとは判定できません。角度は保存入力と不変の更新則からoffline再構成したもので、当時の実body pose測定ではありません。

全36対照では、同球coilはすべて1回ですがZ<−1到達は旧14/18（左6/9、右8/9）対C3/18（左2/9、右1/9）。

- C30..55はZ4.10のheel shaft接触を含みます。3つの到達例もそのshaftに触れるため、絶対的な通行止めではありません。
- C60..70は、**Z3.35の旧inner rail終端＋新shaft** に当たり下流へ戻ります。前の「shaftなし」はZ4.10のみを分類した集計の意味で、支持接触がないという意味ではありません。
- Cはrelease後の接触位置が狭い範囲に集中し、不変のstrike式でも旧版と異なる外向き出力になります。左60..70は旧vx+9.09..+12.92、C−1.55..−1.43、どちらもvzは上流向きです。力不足と断定する理由はありません。

従って、4.10 shaftだけを消す、3.35 shaftだけを動かす、成功したdelayだけを使う、という修正は提案しません。球が止まる面、release中に転がる面、実際の上流出口、両支持端を同じ設計として扱います。

## 2. 単一案: accepted相対receiverを持つearly curve

固定: board/shooter/upper/ramp/nose/wire/slings、bat形状・長さ1.14・角度、キー、force、solver。pivotはCと同じ±1.40/Y.27/Z4.45。旧中央gapに戻すことは条件にしません。

**幾何基準として旧receiverのbatに対する相対位置を戻し、そこへCの前半曲線から接続する** 方針です。球を所定位置へ移動・誘導する補助処理は使いません。

右側の寸法（左は鏡像）:

| 対象 | 提案寸法・扱い |
|---|---|
| divider前半 | Cのfirst arc、(1.900,3.000)→(1.6925,3.550)の解析形状を維持 |
| 後半connector | そこから(1.379316,4.028382)へ接線を合わせて接続。図のBezier制御点はJSONに保存 |
| terminal receiver | accepted実sampled railのZ≥4.028382をX+.15。最内側のaxisは約X1.351035/Z4.066487 |
| heel | X1.435、終端Z4.85。現CのX1.485/Z4.10というshaft停止点を使わない |
| inner rail | X1.35/Z2.75..3.35の実stockを維持。下端shaftはZ3.35から3.10へ移す |
| dividerの支持 | (1.900,3.000)、(1.6925,3.550)、(1.435,4.650)。曲がりの停止面へshaftを置かない |
| OUT後半 | Cの前半外周から独立した滑らかなtailを(1.865,4.350)へ接続し、Z4.85まで直線。小さいreceiver曲率へ単純normal-offsetして折り返す方法は使わない |
| 全lower支持 | 片側9か所。Cと同寸法のshaft/washer/nut、合計54partsを想定。全stationはJSONに保存 |

terminal receiverは旧相対形状を参照するため、旧捕捉球中心を外へ.15移したX≈±1.20435/Z4.05783、u≈.3546が**設計の基準**になります。新しい到着で同じ静止位置を得ることは未証明です。固定位置へ置くfixtureでこの目的を達成したことにはしません。

図は既存geometry抽出JSONの約7桁丸め値を使います。将来source化する場合はacceptedの実関数からterminalを得て、継目・接線・実球全高を再確認する必要があります。図のdense分割数は描画用で、次のcontact分割数の確定値ではありません。

### IN innerとwireの扱い

wire出口と既存inner railを削除して単に広い空白へする案ではありません。Z3.35で終わるinner stockは残し、球の想定発射側をその内側へ戻すのが主解決です。end shaftの移設は終端の垂直stockを発射口へ突き出さないための従属変更です。rail自体への衝突はなお試験対象です。wire受球・到着速度は、旧相対receiverを採用しただけでは保証されません。

### 支持と板厚

支持はCと同じ実物外形・同一contactを前提とし、shaftY−.18..+.22、washer−.152..−.140、nut−.174..−.152。実板下面は−.140です。Z4.10のground shaftをなくし、連続したformed railを前半stationとheel後方Z4.65から固定する配置です。

これは製造強度の証明ではありません。receiver途中のspan、曲がり接合、裏nutの実在、bat swept volume、手前frameとの衝突は確認が必要です。見えない支柱や隠れた接触面で成立させません。単に細くして成功する値を探す案でもありません。

## 3. 静的な設計reserveと、その限界

保存した旧18traceを片側外へ.15だけ平行投影しました。対象はrepress以後、最初に下流速度へ反転するまでの最初の上流走行です。交差Xは隣接保存点間の線形補間です。物理再計算はありません。

左側の最初のZ3.35交差は |X|.429623..1.138456。両側を含む保存点での最小離隔:

- 固定inner rail＋旧Z3.35 end shaftに対して +.069271。
- 提案した9支持stationに対して +.084488。
- 図の新connector stockに対して +.042658。

球R.135、railR.020、shaftR.018の簡単な有限線分/円柱モデルを使います。これらは「旧相対release範囲を回復する価値がある」という設計reserveです。新しい軌跡、連続時間clearance、CCD、sling通過、全世界、全高さ、全timingの保証ではありません。未来の球をこの投影へ合わせる操作は行いません。

dividerからOUT外周への**図のsample点**の最短axis距離は約.412917。r.020のstock同士ならその点での表面差は約.372917ですが、連続した実球通路の下限証明ではありません。横断水平差はZ3.00=.430、3.55=.5114、4.05=.5490、4.35以降=.430です。水平差はnormal幅ではありません。receiver近傍は一様平行ではなく局所的に広がります。CのOUT改善を保ちつつ、その広がりが参考から離れすぎないかを実見する必要があります。

## 4. 中央gap、参考、描画

同bat・外pivotによりrest projected gapは旧約.590694→約.890694。戻りreceiverを外へ置ける余地は増えますが、中央drain、center-save到達、自然難易度に影響します。参考が広いgapに見えることは定性的観察であり、この数値の正当化ではありません。旧gap固定も、新gapの自動採用も行いません。

長いIN/OUT帯の参考未達は維持します。形状が通った後にだけ、実通路へ沿う印字占有を検討できます。長いラベルで通路幅や急な曲がりを隠しません。静的camがOUT表示を横切る問題は本案だけでは解消しません。

描画予算は500,000がhard gateです。別途検証されている退化index削除はこの形状案に含めず、採用された基準sourceのhashで比較を開始します。図からtriangle数を保証しません。導入後のinstalled45/10/top/mobileで再測定し、超過ならfull回帰へ進めません。共有contactを失う見た目だけの簡略化は提案しません。

## 5. 可動saveは分離する

今回はcapture/release/支持の仮説を先に判定するため、比較試作ではCの固定save frame・低cam・同じ有限earned impulseを保つ提案です。save位置を決める前半curveのstation（parameter約.42258）は後半connector変更の手前にあります。未知のmoving camを同時に追加すると、上流出口改善と新接触タイミングの原因が混ざります。

その代わり、この比較に成功してもmechanical finishの採用にはしません。Cのstatic cam/rod、housingとstud間の.029隙間にbracketがない状態は未完のままです。可動saveは、可視rod/camの移動と実contact、実bracket、狭いdetector、同じ強さ/回数/earned条件を一体にした**別の完成gate**が必要です。上部/下部の通行合格を利用して、この未完を完了扱いにはしません。

## 6. 実装する場合の事前gate

実装は次の段階です。本資料は1案だけを定めます。最初のassembled sourceを1つfreezeし、hash/loader/changed-vs-unchangedを揃えます。結果に合わせてその場でpostsやdelayを動かしません。

1. 静的・実見: 同じ球径でcapture面、release区間、Z4.10旧支持点、Z3.35 rail/end、継目、wire降下全高、batのrest→held swept volumeと真の裏支持を確認。negativeを全保存。図の丸め値や最短sampleを合格証にしない。
2. installed予算と参考:45/10/top/mobile。OUT局所広がり、receiver急曲率、長帯未達、save未完を別記。予算超過を変更で正当化しない。
3. 自然導入: accepted対候補の.55/.65/.75/.85/.925/1、弱.1の同球帰還/再発射。upper不変でも全結果を比較する。
4. 全36対照を固定順で比較: release30..70を5刻み、左右、旧/新各18。acceptedは旧relative start、候補はCと同じIN±1.695/Y.18/Z3、vz3・初期spin0を事前指定。初期球包絡が不正なら置き直して救済せず、そのcaseを不成立として報告する。
5. 同時記録: quiet捕捉時u/w/球位置、release中とrepress直前のu範囲、実bat pose/角速度、lastFlipperShot・coil時点、初回bat離脱、両支持端・rail・slingの実contact。sphere-center uとsource aim変数を区別する。旧同等のrolling位置分布が戻るか、単に止まるだけかを判定する。
6. このfamilyの退行判定は旧14/18（左6、右8）を基準にする。ただし達した数だけで採用しない。左右の崩れ、arrival/捕捉の合法性、位置分布・方向幅、Cの成功caseも含む全行を残す。u=.3546や出力値を固定の万能閾値にしない。
7. OUT無充電低速drain、一初期chargeの一回発火、自然wire→IN、center-save/中央drainを確認。fixture chargeは自然にearnedした証拠と呼ばない。
8. 前段が有望な場合だけ自然54、連続aim、強入力、全198回帰と人/実機mobile評価へ進む。現時点ではすべて未実行。実操作の到達率・難易度と参考/可動saveの残件が閉じるまで採用しない。

既存testsの絶対座標期待値はこの資料では変更しません。通るtimingへ入力を変更する、forceを増す、solverを替える、球をresetする、hidden wall/autoaimを置くことは範囲外です。

## ファイルと再現範囲

- `dimensions-and-reserve.json`: 全36行のoffline交差/離隔、concept制御点・支持station、資料source hash。
- `analyze-and-draw.py`: 保存traceを読むだけの計算とSVG作成。runtimeを生成/実行しません。
- `receiver-release-plan.svg` / `.html` / `.png`: 同一寸法図。HTML経由で既存ChromeからPNGをレンダリング。
- `manifest.json`: 本資料と根拠のhash。

この作業によるproduction/test変更・commitはありません。並行している描画indexの変更は本資料の作業範囲外です。
