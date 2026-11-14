# 盤面全体の制約と方針比較

この資料は読取・図解のみです。新しい球道、候補ソース、力、操作、テスト期待値は作成・変更していません。参照HEADは 4b3b4f0、採用runtimeは c1f7aeb。36 runtimeファイルがc1とbyte一致することを確認してから実形状を抽出しました。

## 見る順序

- pinball-layout-constraints.pdf: 3ページのまとめ。1: 俯瞰/下部拡大、2: 通路/支持断面、3: 全体方針比較。
- 01-sheet.png / 02-sheet.png / 03-sheet.png: 同じ図のPNG。SVG3枚と単独HTMLも保持。
- accepted-geometry.json: 源泉ファイルhashと数値/抽出形状。extract-accepted.mjs はruntimeを読取るだけで、このJSONを生成します。
- build-diagrams.py / render.cjs: 図の再生成と既存Chromeの静的render。ゲームを起動・操作しません。

青はshooter、淡青は高架ramp/wire、紫は低いramp base/nose、赤はsling rubber、緑/金は下部guide。俯瞰は高さを重ねた投影なので、線が重なるだけで衝突/通行不能と判断できません。sling coverは実constructed vertexの凸な外周投影で、service-windowの穴は省略。小さい棒は全景でsubpixelになり得ます。全寸法はゲーム内table-local単位であり、メーカーの実寸ではありません。

## 結論

1. 現acceptedは自然発射と既存操作系列の動作根拠がある一方、参考の長い並行IN/OUT、支持の見え方、全面的なvisible/contact一致、実機mobile/human playまで完成した状態ではありません。
2. broad slingと旧shooter位置のまま、同じ平面帯へ2本の長い球道を追加する「断面配分」は不足します。しかし、その条件付き不足は全体設計不可能という意味ではありません。
3. 幅を増やすだけでは解けません。これまでに、上部を同量移動すると中央へ届かず排出、旧出口へ曲げ戻すと途中で同球帰還という別の失敗が出ています。
4. 次に比較すべき自由度は、各部の寸法だけでなく、入口/戻り出口の役割、pivot/heel/drain位置、中央開口を含む全体の接続関係です。どれも新しい自然経路として未証明です。今回の資料は技術的な採用資格の証明でもgeometry freezeでもありません。

## 維持する「結果」と、案ごとに選べる「配置」

ユーザー条件として維持するもの:
- keyboard/touch操作の意味、既存force契約、同等以上の連続aim幅。
- weak/medium/strongの自然な導入。同球weak returnと、通常powerが中央に進まず帰還する退行を混同しない。
- 実IN捕捉。その後に実際のrelease/repressを行う同球refire。
- OUTの通常排出とearned kickback。隠れ壁、瞬間移動、隠れ床、autoaim、救済追加で成立させない。
- 見える外皮と接触の対応、実支持、参考の主要関係、mobileでの判読と操作。

案ごとに可変にできるもの:
- boardの幅/長さ、shooter軸、pivotのX/Z、heel位置、中央gap、支持の固定先、reference mouthの役割。
- これらの現runtime値を固定するのは比較のための設計仮定であり、ユーザーの絶対条件ではありません。force定数が同じでも、pivot/接触位置/軌道が変われば操作結果・難易度は再資格が必要です。

## 数値の意味

### 固定平面帯の配分不足

実sling contactの最大 |x| = 1.9519678。旧shooter dividerの内側は x = 2.35 - .045 = 2.305。保守的な平面配分の残りは .3530322。

球径.270 + 仮の総余裕.050で、1通路.320。2通路と中間rail幅.040には.680必要で、差は.3269678。余裕をゼロにした.270+.040+.270=.580でも、この同じ帯には入りません。

これは「この外皮/配置を保った同じ平面帯に、重ならない2つの所定幅通路を割り当てる」条件の不足です。sling外形の最大値を使う保守的配分であり、同一Zの全状態3D球検査でも、曲線/高低差を含む全設計の不可能証明でもありません。+.35側拡幅はbare-envelopeの出発点に過ぎず、支持・法線距離・継ぎ目・heelまで含む成立値ではありません。

実visible lower mounting capは直径.130、railは直径.040。図ではcapを点線輪郭として示します。現physicsのlower-lane生成部はrail capsuleで、cap/shaftの独立colliderはありません。この不一致を「acceptedだから一致済み」と扱わず、将来設計は見える取付径を無視しないこと。colliderを追加するだけでもball接触が変わるので、独立して安全な小修正と認定しません。

### Shooter断面

内rail r.045、外rail nominal r.060、軸間隔.370、軸高Y.230。理想平行円柱の軸高さでは表面gap.265 < D.270。地上球中心Y.175は軸より.055低いので、軸高さの不適合だけで地上球が詰まるとは証明できません。

理想無限平行円柱モデルの地上中心可動区間は、
.370 - sqrt((.135+.045)^2-.055^2) - sqrt((.135+.060)^2-.055^2) ≈ .01152。
これは球中心位置の「総幅」であり、片側marginでも、実S曲線のsphere clearanceでもありません。

旧外railは8角convex hull。棄却S案の外railは丸capsuleで、同じnominal radiusでも最大半径差.004567。経路と断面を同時変更した交絡があり、差が棄却の単独原因と証明されたわけではありません。ground spine最小gap+.002747は、その線とqueryモデルの限定値です。

### Bat / 中央開口

実flipper接触profileを休止角で投影した左右最小X間隔は.5906936。nominal tip式 2(1.25 - 1.14 cos(.60)) の.6182348とは、丸いprofile等のため一致しません。これは投影の最小X差で、あらゆる球状態のdrain可動幅ではありません。

各pivotを.400外へ移しbat長/姿勢を同じにする条件だけなら、投影gapは+.800の1.3906936になります。新geometryを実装した値ではなく平行移動の算術です。以前の長さ約1.625という導出は、旧中央開口も固定する追加仮定の下だけの話です。batを必ず長くする必要も、広い開口が参考不一致だという証明もありません。中心saveの届き方、排出確率、狙い幅、捕捉/再射出は未証明です。

### 下部・wire・支持

- straight triple-rail overlapはz3.00..3.35の.350 (1.30 ball diameters)。全route長ではありません。
- IN/OUT印刷長1.10/1.70=.647はinkの比で、球道長や実幅ではありません。
- wire終点(-1.72,.44,3.00)、支持球中心Y.575。球の実リリース方向・速度からINへ接続する必要があります。棄却下部案の同XZ高/低gap +.217768 / -.032706は鉛直列であり、自然落下軌道ではありません。
- 旧候補INはbat-local球中心u≈.551/.552、接触後tip方向速度≈1.626/1.642から先端排出。accepted相対対照u≈.493 / 1.367はcradle。2layoutの観測であり保証閾値ではありません。held完了時coil0は正常、実測した失敗は捕捉です。
- left saveはx(-2.62,-2.08), z(3.45,3.72)の下降検知と固定上流-z射出に依存。OUTを曲げるなら検知/実機構/射出方向の接続を同時に考え、検知拡大や隠れ補助で合わせません。
- 実visible板厚Y[-.14,.04]。旧候補foot[-.05,-.02]は板内、stem bottom-.04では裏まで届きません。
- 次の棄却upper案のshaft[-.18,.23], washer[-.152,-.14], nut[-.174,-.152]は実際に板裏へ届きます。ただし板穴なし/丸nut proxyなどの加工表現は未完成で、候補自体は不採用です。
- 左に移した旧post x-2.80/r.037は板端-2.75と.013離れ、下へ伸ばすだけでは締結しません。実cabinet bracket/bridging load pathが必要です。

## 参考の観測と未確定事項

原画current-reference.png (1087 x 1447)とaccepted installed45を実見しました。重要なのは、右Sと左wire、広いsling、sling外側に沿う長いIN/OUT、読める機械支持、中心開口の関係です。透視の占有比・遮蔽・見た目は比較できても、world幅/円弧R/高さには変換しません。

例として右側可視bandの縦方向区間を手で選ぶと、INは画面Y約930..1195、OUTは約920..1155。縦差265/235≈1.13。端点各±15pxの曖昧さだけでも約.89..1.44になるため図は約.9..1.4と記しています。これは原画上の見える区間で、接触routeの端点でも、モデルink長比.647と同じ測定でもありません。

浮いて見える下部mouthはground入口と断定できません。戻り出口という読みも可能で、原画だけでは流入方向/接続が不明です。現ground→右S→左wireは一つの実装解です。mouthを戻り側として設計するなら、別の可到達な自然上り経路と、その取得操作/出口/回収を具体化しなければなりません。画像の雰囲気だけでportalや隠れ床を置く余地はありません。

## 3つの全体方針

| 方針 | 何を保つ/変えるか | 成立の段階 | 影響と最初の未解決 |
|---|---|---|---|
| A: 現経路保全を優先 | 現shooter/roof/nose、bat/heel、wireを比較datumとして保つ。新規案は下部の上流からIN/OUTを一緒に戻す程度に限定。 | accepted baseには動作根拠あり、reference未達。新しいtransitionは未実装/未証明。 | sling後の横移動距離と受球姿勢、OUT外側の排出先、left save軸が制約。長い参考laneを保証しない。 |
| B: 幅を全体へ再配分 | broad slingを保ち双方IN/OUTへ幅を配る。board、shooter、上部出口/rollover、noseへの地上access、左右支持/下部移行を同時設計。 | 必要な断面の場所を作れる可能性があるだけ。連続3D経路/自然導入は未証明。 | 旧同量移動は低powerの中央導入を失い、旧出口S接続は5/6power帰還。幅やRだけを選んで再試行しない。 |
| C: 全体再資格を許す | pivot/heel/drain/中央gapを可変とし、まず旧bat長を保つ比較も許す。mouthの入口/戻り役割も設計前に決める。 | 配置自由度が増えるだけで、全体成立の証明ではない。新自然上り/戻りrouteは未設計。 | 操作/aim、capture/refire、中心save、排出/難易度を再資格。戻りmouth案なら別の上り経路が追加課題。 |

判断を求める場合の問いは「何mm増やすか」ではなく、「現経路保全を優先するか、pivot/中央gapまで変える全体再資格を許すか、mouthを戻りと読む別の接続も調べるか」です。どれも同等以上の操作結果と参考品質が条件で、ユーザーが物理数値を代わりに決める必要はありません。

現時点で安全・参考両面を満たして独立採用できる小形状改善は見つかっていません。共有cap/contactや支持取付は改善対象ですが、動作を変えずに直せると断言できません。図/境界の見える化を先に固定し、形状実装は、この比較を踏まえた別の設計・検証段階です。

## 過去の失敗を消さない

- sling縮小案はfocused動作を通っても面積37%/49%となりreference不採用。上部post移動は実重なり/自然入射干渉あり。
- A系はOUTだけ太り、B/C/C2は入口/return退行。C2の長時間.55反復はball1に留まり、no stationary stopを成功扱いできなかった。
- lane-entry integrated: .55/.65/.75は中央なし/score0で通常drain。両INは捕捉せずtip排出。OUTの通常drainは確認したがIN成功ではない。
- upper-only R1.70: .85だけfield/25。他5powerは同球shooter帰還/bar0。弱.1契約維持とは別の退行。
- 追加.925追跡は保存p/v92点一致、44–47に左右隣接capsule接触と大幅減速、91で小さな反転。反転前case/supportの非空接触なし。ただしpoststep記録ではCCD/接線/全substep寄与を分離できず、単一原因は確定しない。
- 旧/新engine flavor・world順序・復元fixtureと自然経路は分ける。旧成功区間や後から有利な値で失敗assertを置換しない。

## 次に進む場合の順序 (今回未実行)

1. route役割と可変datumを決め、全高さのsphere corridor/実支持/共有外皮/継ぎ目を図示。参考のinstalled/近接/裏側/mobileを確認。
2. matched accepted対照、自然6power .55/.65/.75/.85/.925/1 と真のweak .1を先に。中央到達/バー実接触/return/進行を記録。
3. 生存案のみ、全高/offsetの限定connector接近と、左右INの持続捕捉→実release/repress refire、OUT排出/earned-saveを確認。
4. 旧strong 6条件×3、same-ball80–84、aim matrix両順序をそのまま。accepted固定系列の連続5sample/33.333msという観測だけで全ユーザーaim保証としない。
5. 全既存回帰/自然controller games、reference実見。実機phoneと人間playは別gateとして未実施を明記。

この順序は将来の検証設計で、合格結果ではありません。

## 根拠と再生成

source-index.jsonに入力ファイルのSHA256を保存。原画は転載していません。主要根拠はrepoのpinball-reference-acceptance.md、lower-lane constraint報告、path-constraints-4b3b4f0、infeed-cause、二つのunadopted復元packetです。PNG/PDF/HTMLの文字・ページ境界は実renderで確認します。

再生成はrepo rootから:
    node docs/pinball-experiments/whole-layout-constraints-4b3b4f0/extract-accepted.mjs
    python3 docs/pinball-experiments/whole-layout-constraints-4b3b4f0/build-diagrams.py
    node docs/pinball-experiments/whole-layout-constraints-4b3b4f0/render.cjs --pdf

これらは資料ファイルを更新します。runtimeがc1から変わるとextractは停止します。既存図の再生成は、新候補geometryの技術的な採用資格を示しません。
