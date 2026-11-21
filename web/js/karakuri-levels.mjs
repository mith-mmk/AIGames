// A small authored campaign: finite parts and discrete gear/belt/latch choices.
const stage = (name, goal, hint, options = {}) => Object.freeze({
  name, goal, hint, initial: 'chain', idler: false, radii: [1], beltModes: ['open'], delays: [0], screwDirection: 1, window: null,
  solution: { radius: 1, beltMode: 'open', idler: false, delay: 0 }, ...options
});
export const STAGES = Object.freeze([
  stage('ベルへの道', 'ハンドルからリフトへ力をつなぎ、ベルを鳴らそう。', '歯車は外周を接する。ベルトを横向きにし、レールの青い入口をリフト側へ。', { initial: 'tray' }),
  stage('入口と下り坂', '動く機構を観察し、レールの入口と下り方向を整えよう。', '青い入口が左、ベルが右。向きが逆なら、玉は手前へ落ちる。'),
  stage('ベルトのひとひねり', '左ねじのリフトを逆回転で上げよう。', '平行ベルトは同じ向き、交差ベルトは逆向きに回す。', {
    initial: 'assembled', screwDirection: -1, beltModes: ['open', 'cross'], solution: { radius: 1, beltMode: 'cross', idler: false, delay: 0 }
  }),
  stage('回り道の一枚', '平行ベルトのまま、歯車を一枚加えて逆回転を作ろう。', '中継歯車を追加。歯車が一枚増えると、次の回転方向が反転する。', {
    idler: true, screwDirection: -1, solution: { radius: 1, beltMode: 'open', idler: true, delay: 0 }
  }),
  stage('速い仕事', '早く開く門へ。小さな出力歯車でリフトを速くしよう。', '同じ外周の速さなら、小さな歯車ほど速く回る。交換したら軸とベルトも合わせ直す。', {
    radii: [1, .6], window: [4.2, 4.6], solution: { radius: .6, beltMode: 'open', idler: false, delay: 0 }
  }),
  stage('ゆっくり正確に', '遅く開く門へ。大きな出力歯車でゆっくり持ち上げよう。', '特大の出力歯車は遅い。門が開く時刻と、玉が門へ着く時刻を比べよう。', {
    radii: [1, 1.4], window: [6.6, 7.0], solution: { radius: 1.4, beltMode: 'open', idler: false, delay: 0 }
  }),
  stage('玉止めの一拍', '歯車はそのまま。上で少し待ってから玉を送り出そう。', '玉止めは上昇が終わった後の待ち時間。リフトの速さは変わらない。', {
    delays: [0, 1, 2], window: [6.4, 6.8], solution: { radius: 1, beltMode: 'open', idler: false, delay: 1 }
  }),
  stage('逆回転で急ぐ', '左ねじを速く回し、早い門を通そう。', '逆回転は中継歯車でも交差ベルトでも作れる。速さを決めるのは出力歯車。', {
    idler: true, radii: [1, .6], beltModes: ['open', 'cross'], screwDirection: -1, window: [4.2, 4.6],
    solution: { radius: .6, beltMode: 'open', idler: true, delay: 0 }
  }),
  stage('速さと待ち時間', '細い時間窓へ。速く上げて、長く待つ組合せを見つけよう。', '大きな歯車で遅くするだけでは間に合わない。上昇時間＋待ち時間＋玉の道のり。', {
    radii: [1, .6, 1.4], delays: [0, 1, 2], window: [6.28, 6.53], solution: { radius: .6, beltMode: 'open', idler: false, delay: 2 }
  }),
  stage('工房の総仕上げ', '逆回転・遅い上昇・玉止めを組み合わせ、最後の門へ。', 'ねじの向き、出力の大きさ、上での待ち時間。試運転の到着時刻を手がかりに。', {
    initial: 'tray', idler: true, radii: [1, .6, 1.4], beltModes: ['open', 'cross'], delays: [0, 1, 2], screwDirection: -1, window: [7.65, 8.0],
    solution: { radius: 1.4, beltMode: 'open', idler: true, delay: 1 }
  })
]);
