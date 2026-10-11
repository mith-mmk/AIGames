// Grid coordinates: x right, y down. Orientation 0 = /, 1 = \\.
// Authored boards only: no random placement, timer or hidden optical rules.
const mirror = (id, x, y, orientation, fixed = false) => ({ id, x, y, orientation, fixed });
const make = (id, title, size, source, goal, mirrors, walls, checkpoints, minimum, lesson, hint, planning) => ({
  id, title, width: size, height: size, source: { x: source[0], y: source[1], direction: 0 },
  goal: { x: goal[0], y: goal[1] }, mirrors,
  walls: walls.map(([x, y]) => ({ x, y })), checkpoints: checkpoints.map(([x, y]) => ({ x, y })),
  expectedMinimum: minimum, lesson, hint, planning,
});
export const LEVELS = [
  make(1, 'ひとすじの光', 5, [0, 3], [2, 0], [mirror('A', 2, 3, 1)], [], [], 1,
    '鏡を押すと / と \\ が切り替わります。光を白い輪へ届けましょう。', '右へ進む光を、上へ曲げてみましょう。', '反射1回・選択肢1個。まず操作を学ぶ。'),
  make(2, 'ふたつの曲がり角', 5, [0, 3], [4, 1], [mirror('A', 2, 3, 1), mirror('B', 2, 1, 1)], [], [], 2,
    '光の来る方向が変わっても、鏡は同じ反射ルールです。', 'まず上へ。そのあと右へ。光源から順に追いましょう。', '反射2回。入射方向の読み替え。'),
  make(3, '石をよけて', 5, [0, 4], [4, 0], [mirror('A', 1, 4, 1), mirror('B', 1, 2, 1), mirror('C', 3, 2, 0), mirror('D', 3, 0, 0)], [[3, 4], [2, 1]], [], 2,
    '濃い石は光を止めます。すでに正しい鏡はそのままで大丈夫。', '石の手前で上へ。後半の鏡はもうつながっています。', '反射4回、変更2個。鏡数と手数を切り分ける。'),
  make(4, '遠回りの庭', 6, [0, 4], [5, 4], [mirror('A', 1, 4, 1), mirror('B', 1, 1, 1), mirror('C', 4, 1, 0), mirror('D', 4, 4, 1), mirror('E', 3, 3, 0)], [[2, 4], [5, 1]], [], 3,
    'ゴールが近くても、光は庭を回り込むことがあります。', 'A → B → C → D と回り込みます。E は必要でしょうか。', '反射4回、候補5個。不要な鏡を見分ける。'),
  make(5, '動かない道しるべ', 6, [0, 4], [5, 4], [mirror('A', 2, 4, 1), mirror('F', 2, 1, 0, true), mirror('B', 4, 1, 0), mirror('C', 4, 4, 0), mirror('D', 1, 1, 1)], [[3, 4], [4, 5]], [], 3,
    '金色の鏡は固定されています。その向きを手がかりにしましょう。', '固定鏡 F から、光を右へ送り出せます。', '固定鏡を導入。制約から前後を推測する。'),
  make(6, '灯りをともして', 6, [0, 4], [5, 4], [mirror('A', 1, 4, 0), mirror('B', 1, 1, 1), mirror('C', 4, 1, 0), mirror('D', 4, 4, 0), mirror('E', 3, 3, 1)], [[2, 4], [5, 1]], [[3, 1]], 3,
    '青い小さな輪は通過点。すべてを通ってからゴールへ届けます。', '通過点は B と C の間です。近道では灯りがともりません。', '通過点を導入。ゴール以外の条件も読む。'),
  make(7, 'ふたつの灯り', 7, [0, 5], [6, 5], [mirror('A', 1, 5, 1), mirror('B', 1, 1, 1), mirror('C', 5, 1, 0), mirror('D', 5, 5, 0), mirror('E', 3, 5, 1), mirror('F', 3, 3, 0)], [[2, 5], [6, 1]], [[3, 1], [5, 3]], 4,
    '通過点は2つ。向きを変えた先に何があるかも見てみましょう。', '上辺から右辺へ。D で左に戻ると、余分な鏡へ迷い込みます。', '分岐先に鏡を置く。1〜2反射先まで読む。'),
  make(8, '外周の回廊', 7, [0, 5], [0, 4], [mirror('A', 2, 5, 1), mirror('B', 2, 1, 0), mirror('C', 0, 1, 1), mirror('D', 0, 0, 1), mirror('E', 5, 0, 1), mirror('F', 5, 4, 1), mirror('G', 3, 3, 0), mirror('H', 4, 5, 1)], [[3, 5], [6, 4]], [[3, 0], [3, 4]], 4,
    'ゴールの近くから、いったん遠ざかる光路もあります。', 'A → B で左へ、C → D で上辺へ。そのあと下へ戻ります。', '反射6回、変更4個。外周への迂回と先読み。'),
  make(9, '交差する道', 7, [0, 6], [6, 1], [mirror('A', 1, 6, 1), mirror('B', 1, 2, 1), mirror('C', 5, 2, 0), mirror('D', 5, 0, 0), mirror('E', 2, 0, 1), mirror('F', 2, 4, 1), mirror('G', 6, 4, 1), mirror('H', 4, 5, 0)], [[2, 6], [6, 0]], [[3, 2], [2, 3]], 5,
    '光線どうしが交差しても、そのまま通り抜けます。', 'C から上辺を左へ回り、E から下へ。交差点には鏡がありません。', '反射7回。交差を曲がり角と混同しない。'),
  make(10, '光の庭の完成', 7, [0, 6], [6, 0], [mirror('A', 1, 6, 1), mirror('B', 1, 1, 1), mirror('C', 5, 1, 0), mirror('D', 5, 5, 1), mirror('E', 3, 5, 0), mirror('F', 3, 3, 0, true), mirror('G', 6, 3, 1), mirror('H', 3, 6, 0), mirror('I', 0, 3, 1), mirror('J', 4, 2, 0)], [[2, 6], [6, 5]], [[3, 1], [4, 5], [6, 2]], 6,
    '固定鏡・通過点・遠回り。これまでのルールだけで庭を完成させます。', 'F の前には E、あとには G。3つの通過点を一筆書きでつなぎましょう。', '反射7回、変更6個。既習の4ルールを統合する。'),
];
// Deep-freeze the catalog: sessions always own independent orientation arrays.
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
freeze(LEVELS);
