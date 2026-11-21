# 第三者ライセンスと素材の出典

翠嵐麻雀で使用する第三者のソフトウェア、字形の元となるフォント、ライセンス、参照資料を記載します。この文書は各ライセンスの対象を明確にするためのものであり、ゲーム独自のソースコード全体に新たなライセンスを指定するものではありません。

## Three.js

| 項目 | 内容 |
|---|---|
| 名称・バージョン | Three.js 0.186.1 |
| 著作権表示 | Copyright © 2010–2026 three.js authors |
| ライセンス | MIT License |
| 同梱ライセンス全文 | [dist/vendor/three/LICENSE](../dist/vendor/three/LICENSE) |
| 公式サイト | https://threejs.org/ |
| 原典リポジトリ | https://github.com/mrdoob/three.js |
| npm公式の版確認先 | https://registry.npmjs.org/three/latest |
| 通常の配信元 | https://cdn.jsdelivr.net/npm/three@0.186.1/ |

`dist/vendor/three/` には、CDNから読み込めない場合に使う同一バージョンの必要ファイルを収録しています。

- `build/three.module.js`
- `build/three.core.js`
- `examples/jsm/controls/OrbitControls.js`
- `examples/jsm/geometries/RoundedBoxGeometry.js`
- `examples/jsm/utils/BufferGeometryUtils.js`

これらの追加モジュールもThree.jsプロジェクトに含まれ、上記のMIT Licenseに従います。バージョンの確認日と参照URLは[three-version.json](three-version.json)に保存しています。

## Noto Serif CJK JP

| 項目 | 内容 |
|---|---|
| 元フォント | Noto Serif CJK JP Bold |
| 著作権表示 | Copyright 2017–2024 Adobe (http://www.adobe.com/) |
| ライセンス | SIL Open Font License 1.1（OFL 1.1） |
| 同梱ライセンス全文 | [dist/js/render/Noto-OFL.txt](../dist/js/render/Noto-OFL.txt) |
| 配布元 | https://github.com/notofonts/noto-cjk/tree/main/Serif |
| 元フォントファイル | https://github.com/notofonts/noto-cjk/blob/main/Serif/OTF/Japanese/NotoSerifCJKjp-Bold.otf |
| 原典ライセンス | https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE |

使用箇所と変換内容は次のとおりです。

- **牌面・卓の文字**：18文字のグリフをSVGパスへ変換し、[glyphs.js](../dist/js/render/glyphs.js)へ収録しています。対象は「一二三四五六七八九萬東南西北發中翠嵐」です。牌面と卓の文字はこの輪郭を使い、実行時に元のOTFファイルを取得しません。
- **UIの文字**：v1.1.0の操作UIは端末側に利用可能な日本語ゴシック体を使います。配布ZIPにフォントファイルは含めません。

前述の字形輪郭には上記のOFL 1.1が適用されます。

## Noto Sans CJK JP

| 項目 | 内容 |
|---|---|
| 元フォント | Noto Sans CJK JP Regular / Bold |
| 著作権表示 | Copyright © 2014–2021 Adobe (http://www.adobe.com/) |
| ライセンス | SIL Open Font License 1.1（OFL 1.1） |
| 同梱ライセンス全文 | [dist/assets/NotoSansCJK-OFL.txt](../dist/assets/NotoSansCJK-OFL.txt) |
| 配布元 | https://github.com/notofonts/noto-cjk/tree/main/Sans |
| 元フォント・Regular | https://github.com/notofonts/noto-cjk/blob/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf |
| 元フォント・Bold | https://github.com/notofonts/noto-cjk/blob/main/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf |
| 原典ライセンス | https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE |

UIには端末に搭載された日本語ゴシック体を使用します。配布ZIPにはNoto Sansのフォントファイルは含めません。引用した元フォントの出典としてライセンス情報を記載しています。

## 牌図・ルールの参照資料

基本役および一般的な日本式麻雀牌の図柄を確認するため、[日本プロ麻雀連盟「採用役一覧」](https://www.ma-jan.or.jp/activity/yaku.html)を参照しています。ローカル役と細則の調査では、[麻雀祭都の資料](https://mjradio.web.fc2.com/majansite-mirror/index.html)を参照しています。採用条件の詳細は[本ゲームのルール説明](RULES.md)、牌図の具体的な参照先は[造形説明](TILES.md)に記載しています。

参照サイトの牌画像や本文そのものは、ゲームの素材として同梱していません。萬子・字牌の文字輪郭は前述のNotoフォントを使用し、筒子の輪、索子の竹と一索の鳥、牌面の配置は[独自のSVGコード](../dist/js/render/tile-art.js)で構成しています。特定の牌メーカーとの提携や、その製品の完全な複製を示すものではありません。

## その他の描画・音

- UIの文字・記号・枠・ボタンは `dist/js/ui/` のCanvas描画で構成します。別途ダウンロードするアイコン画像や外部アイコンフォントは使用していません。
- 卓・牌・サイコロ・点棒はThree.jsの形状とコードで構成します。ラシャの表面模様と表示パネルもコードから描画します。
- 効果音はWeb Audio APIで合成します。外部の音声ファイルは使用していません。
- AIによる生成画像、外部から取得した写真・背景画像・3Dモデルは配布物に含めていません。

再配布時は、同梱された各ライセンスの全文と著作権表示を保持してください。ライセンスの詳細な条件は、それぞれの同梱原文に記載されています。
