export const ACTION_NAMES={seating:'席決め',next:'次局',chi:'チー',pon:'ポン',ankan:'暗槓',minkan:'大明槓',kakan:'加槓',kan:'カン',kanDeclared:'槓の宣言',ron:'ロン',tsumo:'ツモ',riichi:'リーチ',openRiichi:'オープンリーチ',nuki:'北抜き',discard:'打牌',draw:'摸牌',deal:'配牌',abortiveDraw:'途中流局',exhaustiveDraw:'流局',handEnd:'局終了',matchEnd:'終局',pass:'見送り',abort:'九種九牌'};
export const windName=n=>['東','南','西','北'][(n??27)-27]??'東';
export const roundName=s=>`${windName(s.roundWind)}${['一','二','三','四'][s.handNumber-1]??s.handNumber}局`;
export const lengthName=r=>({east:'東風戦',south:'東南戦',full:'一荘戦'}[r.length]||'東風戦');
export const reasonText=reason=>({nineTerminals:'九種九牌',fourWinds:'四風連打',fourKans:'四槓散了',fourRiichi:'全員の立直',tripleRon:'三家和',wallExhausted:'残りの牌がなくなりました',nagashiMangan:'全捨て牌が么九牌で、鳴かれていません'}[reason]||reason||'');
