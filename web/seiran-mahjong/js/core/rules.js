import { normalizePersonaChoices } from './personas.js';
/** All configurable rules. Values are JSON safe and saved with each match. */
const y = (id,name,closed,open,description,extra={}) => ({id,name,closed,open,description,local:false,...extra});
const l = (id,name,closed,open,description,extra={}) => y(id,name,closed,open,description,{local:true,...extra});
const ym = (id,name,description,open=true,extra={}) => y(id,name,13,open?13:null,description,{yakuman:1,...extra});
const ly = (id,name,description,open=true,extra={}) => ym(id,name,description,open,{local:true,...extra});

export const YAKU_CATALOG = Object.freeze([
 y('menzenTsumo','門前清自摸和',1,null,'副露せずにツモ和了。暗槓は門前を保つ。'),
 y('riichi','立直',1,null,'門前聴牌で1,000点を供託して宣言。'),
 y('doubleRiichi','ダブルリーチ',2,null,'鳴きのない第一巡の第一打でリーチ。通常のリーチと重複しない。'),
 y('ippatsu','一発',1,null,'リーチ宣言から次の自身のツモまでに和了。鳴き・槓で消滅する。'),
 y('pinfu','平和',1,null,'4順子、役牌でない雀頭、両面待ち。門前限定。'),
 y('tanyao','断么九',1,1,'2〜8の数牌だけで構成する。副露時はクイタン設定に従う。'),
 y('iipeikou','一盃口',1,null,'同一の順子2組。七対子とは別の分解で判定。'),
 y('white','白',1,1,'白の刻子または槓子。'),
 y('green','發',1,1,'發の刻子または槓子。'),
 y('red','中',1,1,'中の刻子または槓子。'),
 y('seatWind','自風牌',1,1,'自分の風の刻子または槓子。'),
 y('roundWind','場風牌',1,1,'現在の場の風の刻子または槓子。連風は自風と両方を加算。'),
 y('rinshan','嶺上開花',1,1,'槓の補充牌でツモ和了。北抜きの補充牌は含めない。'),
 y('chankan','搶槓',1,1,'加槓される牌でロン。国士無双の暗槓搶槓は別設定。'),
 y('haitei','海底摸月',1,1,'通常の最後のツモ牌で和了。嶺上開花とは重複しない。'),
 y('houtei','河底撈魚',1,1,'通常の最後の捨て牌でロン。搶槓とは重複しない。'),
 y('sanshokuDoujun','三色同順',2,1,'萬・筒・索で同じ数字の順子を1組ずつ。'),
 y('ittsu','一気通貫',2,1,'同じ色で123・456・789の3順子。'),
 y('chiitoitsu','七対子',2,null,'対子7組。通常は7種類。四枚使いは設定で2対子として認める。'),
 y('toitoi','対々和',2,2,'4面子すべてが刻子または槓子。'),
 y('sanankou','三暗刻',2,2,'暗刻・暗槓が3組。ロンで完成した刻子は暗刻に数えない。'),
 y('sanshokuDoukou','三色同刻',2,2,'萬・筒・索で同じ数字の刻子または槓子。'),
 y('chanta','混全帯么九',2,1,'すべての面子と雀頭に1・9・字牌があり、順子と字牌を含む。'),
 y('sankantsu','三槓子',2,2,'3組の槓子。明槓・暗槓を問わない。'),
 y('shousangen','小三元',2,2,'三元牌2種類が刻子、残り1種類が雀頭。役牌とも複合。'),
 y('honroutou','混老頭',2,2,'1・9・字牌だけで構成。対々和または七対子と複合。'),
 y('honitsu','混一色',3,2,'数牌1種類と字牌だけで構成。'),
 y('junchan','純全帯么九',3,2,'すべての面子と雀頭に1・9を含み、順子があり字牌はない。'),
 y('ryanpeikou','二盃口',3,null,'同一順子の組が2組。一盃口・七対子とは重複しない。'),
 y('chinitsu','清一色',6,5,'1種類の数牌だけで構成する。'),
 ym('kokushi','国士無双','1・9・字牌の13種類と、そのうち1種類の対子。',false),
 ym('kokushi13','国士無双十三面待ち','和了牌を除いた13枚が1・9・字牌各1枚。ダブル指定を別途設定。',false,{specialDouble:true}),
 ym('suuankou','四暗刻','4暗刻・暗槓。双碰待ちのロンは成立しない。',false),
 ym('suuankouTanki','四暗刻単騎','4暗刻・暗槓が完成した雀頭単騎待ち。ダブル指定を別途設定。',false,{specialDouble:true}),
 ym('daisangen','大三元','白・發・中の3刻子または槓子。'),
 ym('shousuushii','小四喜','風牌3刻子と残りの風牌の雀頭。'),
 ym('daisuushii','大四喜','東・南・西・北の4刻子または槓子。',true,{specialDouble:true}),
 ym('tsuuiisou','字一色','字牌のみ。七対子形も成立する。'),
 ym('ryuuiisou','緑一色','2・3・4・6・8索と發だけ。發を必須にする設定あり。'),
 ym('chinroutou','清老頭','数牌の1・9のみ。'),
 ym('chuuren','九蓮宝燈','門前・槓なしで同色1112345678999に同色1枚を加えた形。',false),
 ym('junseiChuuren','純正九蓮宝燈','和了前に同色1112345678999が完成した九面待ち。',false,{specialDouble:true}),
 ym('suukantsu','四槓子','4組の槓子。'),
 ym('tenhou','天和','親が鳴きも槓もない配牌の14枚で和了。',false),
 ym('chiihou','地和','子が鳴きも槓もない最初のツモで和了。',false),
 l('openRiichi','オープンリーチ',2,null,'門前聴牌で手牌を公開して宣言。通常リーチとは置換、ダブルリーチ時はさらに1翻。供託額と非リーチ者の放銃役満を設定可能。'),
 ly('daisharin','大車輪','筒子の22・33・44・55・66・77・88の七対子。',false),
 ly('shousharin','小車輪','筒子の1〜7または3〜9を各2枚の七対子。大車輪とは重複しない。',false),
 ly('suurenkou','四連刻','同一の数牌で連続する数字の刻子・槓子4組。'),
 l('sanrenkou','三連刻',2,2,'同一の数牌で連続する数字の刻子・槓子3組。四連刻採用時は上位役に置換。'),
 ly('benikujaku','紅孔雀','1・5・7・9索と中だけで4面子1雀頭。全5種類を使う。'),
 ly('kouitten','紅一点','2・3・4・6・8索と中だけで和了し、中を対子以上含む。發は使用しない。'),
 ly('kokuissou','黒一色','2・4・8筒と東南西北のみ。対々和形または七対子形。'),
 ly('hyakumangoku','百万石','萬子だけの和了形で数字の合計が100以上。槓子の4枚目も加算する。'),
 ly('renhou','人和','子が鳴きのない最初の自分のツモより前にロン。採用点は役満・満貫・5翻から選択。役別倍率は役満方式に適用し、0倍は全方式で無効。',false),
 ly('shiisanpuuta','十三不塔','鳴き・槓のない親の配牌または子の第一ツモ。対子1組だけがあり、残りはすべて孤立牌で順子・刻子・搭子がない。',false,{specialShape:true}),
 ly('tohokuShinkansen','東北新幹線','123・456・789索と、東の刻子＋北の雀頭、または北の刻子＋東の雀頭。'),
 ly('tohokuExpressway','東北自動車道','2・4・6筒と東・北の5種類をすべて使う対々和形。'),
 ly('paarenchan','八連荘','同一の親が流局を挟まず7回連続和了した後の8回目以降の和了。通常の和了形は必要。'),
 l('sanshokuTsuukan','三色通貫',2,1,'123・456・789をそれぞれ異なる色の順子でそろえる。'),
 l('isshokuSanjun','一色三順',3,2,'同じ数字・色の順子を3組。該当する一盃口と重複しない。'),
 ly('isshokuYonjun','一色四順','同じ数字・色の順子を4組。該当する一色三順・二盃口と重複しない。'),
 l('nagashiMangan','流し満貫',5,5,'通常流局で自分の全捨て牌が1・9・字牌で1枚も鳴かれず、副露していない場合に満貫ツモとして精算。聴牌は不要。副露許可は別設定。翻数変更時は固定30符、ドラなし。',{drawOnly:true}),
 ly('kinmonkyou','金門橋','同一色の123・345・567・789の4順子と任意の雀頭。',false),
 ly('nanbokuSensou','南北戦争','門前14枚で南南南・北北北と、別々の2色で「1・8・6・1」「1・8・6・5」。通常の4面子1雀頭に属さない専用形。',false,{specialShape:true}),
 l('tsubameGaeshi','燕返し',1,1,'他家のリーチ宣言牌をロン。自分のリーチは不要。'),
 l('kanburi','槓振り',1,1,'他家が槓の嶺上牌を引いて最初に切った牌をロン。'),
 l('shiieruRaotai','十二落抬',1,1,'4面子をチー・ポン・明槓で副露した裸単騎の和了。暗槓は数えない。'),
 l('uumensai','五門斉',2,2,'萬子・筒子・索子・風牌・三元牌の5分類すべてを含む和了。'),
 l('iipinMoyue','一筒摸月',5,5,'最後の通常ツモ牌が1筒で和了。海底摸月と重複しない。'),
 l('kyuupinRaoyui','九筒撈魚',5,5,'通常の最後の捨て牌である9筒をロン。河底撈魚と重複しない。'),
 ly('daichikurin','大竹林','索子の22・33・44・55・66・77・88の七対子。',false),
 ly('daisuurin','大数隣','萬子の22・33・44・55・66・77・88の七対子。',false),
 ly('daichisei','大七星','東南西北白發中を各2枚の七対子。字一色を置換する。倍数は個別設定。',false),
 ly('kachouFuugetsu','花鳥風月','5筒・1索・自風または場風・1筒の4刻子と任意の雀頭。槓子も可。'),
 ly('fuukaSetsugetsu','風花雪月','自風または場風・5筒・白・1筒の4刻子と任意の雀頭。槓子も可。'),
]);
export const LOCAL_YAKU = Object.freeze(YAKU_CATALOG.filter(a=>a.local));

export const DEFAULT_RULES = Object.freeze({
 aiPersonas:Object.freeze(['random','random','random']),
 seatSelection:'random',dealerSelection:'random',fixedDealerSeat:0,
 players:4,length:'east',initialPoints:25000,returnPoints:30000,uma:[20,10,-10,-20],oka:true,
 kuitan:true,atozuke:'allowed',greenDragonRequired:false,pao:true,
 redCounts:{m:1,p:1,s:1},redDora:true,dora:true,doraMode:'next',uraDora:true,kanDora:true,kanUraDora:true,
 kanDoraTiming:'immediate',rinshanKanDora:true,chankanKanDora:false,
 multipleYakuman:true,doubleYakuman:true,tripleYakuman:true,pureNineGatesDouble:true,suuankouTankiDouble:true,kokushi13Double:true,daisuushiiDouble:true,
 kazoeYakuman:true,kiriageMangan:false,doubleWindPairFu:4,chiitoiFourCopies:false,chiitoiFu:25,
 doubleRiichi:true,openRiichi:false,openRiichiCost:2000,openRiichiDealInYakuman:false,ippatsu:true,riichiKanMode:'strict',
 twoHanHonbaThreshold:0,drawTenpaiRequired:true,dealerContinuation:'winOrTenpai',agariYame:true,tenpaiYame:false,
 bankruptcy:true,bankruptcyLimit:0,westExtension:false,maxExtraRounds:1,
 simultaneousRon:'multiple',tripleRonDraw:true,nineTerminalsDraw:true,fourWindsDraw:true,fourKansDraw:true,fourRiichiDraw:true,
 notenPenalty:3000,abortiveDealerRepeat:true,
 nuki:true,nukiDora:true,nukiBreakIppatsu:true,sanmaTsumo:'loss',kokushiAnkanRob:true,
 renhouValue:'yakuman',daichiseiMultiplier:1,nagashiManganAllowsCalls:false,
 localYaku:Object.fromEntries(LOCAL_YAKU.map(a=>[a.id,false])),yakuOverrides:{},
});

const F=(key,group,label,type,extra={})=>({key,group,label,type,default:key.split('.').reduce((a,k)=>a?.[k],DEFAULT_RULES),...extra});
const B=(key,group,label,description)=>F(key,group,label,'boolean',{description});
const N=(key,group,label,min,max,step=1,description='')=>F(key,group,label,'number',{min,max,step,description});
const S=(key,group,label,options,description='')=>F(key,group,label,'select',{options:options.map(([value,label])=>({value,label})),description});
export const RULE_FIELDS = Object.freeze([
 S('seatSelection','基本','席決め',[['random','対局ごとに抽選'],['fixed','参加者順に固定']],'あなたは画面手前に表示。COMの席順を抽選します。'),
 S('dealerSelection','基本','起家（最初の親）',[['random','サイコロで抽選'],['fixed','指定の席に固定']]),
 N('fixedDealerSeat','基本','固定起家の席（0＝あなた）',0,3,1,'起家固定のときだけ適用。三麻の3は2に補正。'),
 S('players','基本','人数',[[4,'四麻・1人＋COM3人'],[3,'三麻・1人＋COM2人']]),
 S('length','基本','対局の長さ',[['east','東風戦'],['south','東南戦'],['full','一荘戦（東南西北）']]),
 N('initialPoints','精算','持ち点',1000,100000,1000),N('returnPoints','精算','返し点',1000,100000,1000),
 B('oka','精算','オカをトップに加算','持ち点と返し点の差額をトップへ。精算は千点単位。'),
 ...[0,1,2,3].map(i=>N(`uma.${i}`,'精算',`${i+1}位のウマ（千点）`,-100,100,5)),
 B('kuitan','役・和了','クイタン','副露した断么九を認める。'),
 S('atozuke','役・和了','役の確定タイミング',[['allowed','後付あり'],['first','後付なし（最初の副露で役確定）'],['middle','中付あり（和了前までに役確定）']]),
 B('greenDragonRequired','役・和了','緑一色に發を必須とする','無効時は發なしでも2・3・4・6・8索のみで成立。'),
 N('twoHanHonbaThreshold','役・和了','二翻縛りの開始本場（0で無効）',0,20,1,'ドラを除く役の翻数が2翻以上必要。'),
 B('chiitoiFourCopies','役・和了','七対子で同じ牌4枚を2対子にする'),
 S('chiitoiFu','役・和了','七対子の符',[[25,'25符'],[50,'50符']]),
 S('doubleWindPairFu','役・和了','連風牌の雀頭の符',[[4,'4符'],[2,'2符']]),
 B('dora','ドラ','表ドラ'),B('redDora','ドラ','赤牌をドラに数える'),
 S('doraMode','ドラ','表示牌の読み方',[['next','表示牌の次をドラ'],['indicator','表示牌そのものをドラ']]),
 ...['m','p','s'].map((s,i)=>N(`redCounts.${s}`,'ドラ',`赤五${['萬','筒','索'][i]}の枚数`,0,4)),
 B('uraDora','ドラ','裏ドラ'),B('kanDora','ドラ','カンドラ'),B('kanUraDora','ドラ','カン裏ドラ'),
 S('kanDoraTiming','ドラ','明槓・加槓のドラ表示',[['immediate','槓成立直後'],['afterDiscard','嶺上牌の打牌後']]),
 B('rinshanKanDora','ドラ','嶺上開花で最新のカンドラを数える'),
 B('chankanKanDora','ドラ','搶槓でその槓のカンドラを数える','無効時は未成立の槓による追加ドラを含めない。'),
 B('multipleYakuman','役満','異なる役満を複合する'),B('doubleYakuman','役満','ダブル役満を認める'),B('tripleYakuman','役満','トリプル以上の役満を認める'),
 B('pureNineGatesDouble','役満','純正九蓮宝燈をダブル役満'),B('suuankouTankiDouble','役満','四暗刻単騎をダブル役満'),
 B('kokushi13Double','役満','国士無双十三面待ちをダブル役満'),B('daisuushiiDouble','役満','大四喜をダブル役満'),
 B('kazoeYakuman','役満','数え役満（13翻以上）','無効時は三倍満に制限。'),B('kiriageMangan','役満','切り上げ満貫（4翻30符・3翻60符）'),
 B('pao','責任払い','大三元・大四喜の責任払い'),
 B('doubleRiichi','リーチ','ダブルリーチ'),B('ippatsu','リーチ','一発'),B('openRiichi','リーチ','オープンリーチ'),
 N('openRiichiCost','リーチ','オープンリーチ供託',1000,5000,1000),
 B('openRiichiDealInYakuman','リーチ','オープンリーチへの非リーチ者の放銃を役満'),
 S('riichiKanMode','リーチ','リーチ後の暗槓',[['strict','待ち牌・面子構成ともに不変'],['waits','待ち牌のみ不変']],'4枚目をツモした独立した暗刻が対象。厳格設定では順子との別解が消える暗槓も禁止。'),
 B('kokushiAnkanRob','鳴き・流局','国士無双の暗槓搶槓'),
 S('simultaneousRon','鳴き・流局','同時ロン',[['multiple','ダブロン・トリプルロンあり'],['headBump','頭ハネ（放銃者に最も近い下家）']]),
 B('tripleRonDraw','鳴き・流局','三家和で途中流局'),B('nineTerminalsDraw','鳴き・流局','九種九牌'),B('fourWindsDraw','鳴き・流局','四風連打'),
 B('fourKansDraw','鳴き・流局','四槓散了（複数人の4槓）'),B('fourRiichiDraw','鳴き・流局','四家立直（三麻は三家立直）'),
 B('abortiveDealerRepeat','鳴き・流局','途中流局で親が連荘'),B('drawTenpaiRequired','鳴き・流局','流局の連荘に親の聴牌が必要'),
 S('dealerContinuation','鳴き・流局','親の連荘',[['winOrTenpai','和了または聴牌流局'],['winOnly','和了のみ'],['alwaysDraw','和了・流局ともに連荘']]),
 N('notenPenalty','精算','流局の不聴罰符合計',0,6000,1000,'各側で100点単位に分配し、割り切れない余りは起家からの席順で割り当てる。'),
 B('bankruptcy','終局','飛びで終局'),N('bankruptcyLimit','終局','飛びの境界点',-50000,0,1000,'この点数を下回ると終了。'),
 B('agariYame','終局','最終局トップ親の和了止め'),B('tenpaiYame','終局','最終局トップ親の聴牌止め'),
 B('westExtension','終局','返し点未満なら延長'),N('maxExtraRounds','終局','延長する最大の場数',0,4),
 B('nuki','三麻','北抜き','萬子2〜8抜き・チー禁止は三麻で常に適用。'),B('nukiDora','三麻','抜いた北をドラに数える'),
 B('nukiBreakIppatsu','三麻','北抜きで一発を消す'),S('sanmaTsumo','三麻','ツモの支払い',[['loss','ツモ損あり（通常の各支払い）'],['equalized','ツモ損なし（不足分を二者へ等分）']]),
 S('renhouValue','ローカル役の細則','人和の点数',[['yakuman','役満'],['mangan','満貫（他の役とは高点法）'],['fiveHan','5翻（他の役と複合）']]),
 N('daichiseiMultiplier','ローカル役の細則','大七星の役満倍数',1,3),
 B('nagashiManganAllowsCalls','ローカル役の細則','流し満貫を副露した手にも認める'),
 ...LOCAL_YAKU.filter(a=>a.id!=='openRiichi').map(a=>B(`localYaku.${a.id}`,'ローカル役',a.name,a.description)),
]);

/** Merge partial and saved legacy rules, reject invalid field values, never mutate defaults. */
export function normalizeRules(partial={}) {
 if (!partial || typeof partial!=='object') partial={};
 const r={...DEFAULT_RULES,...partial,redCounts:{...DEFAULT_RULES.redCounts,...partial.redCounts},localYaku:{...DEFAULT_RULES.localYaku,...partial.localYaku},yakuOverrides:{},uma:Array.isArray(partial.uma)?[...partial.uma]:[...DEFAULT_RULES.uma]};
 if (partial.players===3 && partial.initialPoints==null) r.initialPoints=35000;
 if (partial.players===3 && partial.returnPoints==null) r.returnPoints=40000;
 if (partial.players===3 && partial.notenPenalty==null) r.notenPenalty=2000;
 if (partial.players===3 && partial.uma==null) r.uma=[20,0,-20];
 for (const f of RULE_FIELDS) {
   const keys=f.key.split('.'); let obj=r; for(const k of keys.slice(0,-1)) obj=obj[k]; const key=keys.at(-1); let value=obj[key];
   if(f.type==='boolean') value=!!value;
   if(f.type==='select'&&!f.options.some(o=>o.value===value)) value=f.default;
   if(f.type==='number') { value=Number(value); if(!Number.isFinite(value)) value=f.default??0; value=Math.max(f.min,Math.min(f.max,value));value=Math.round(value/(f.step||1))*(f.step||1);value=Math.max(f.min,Math.min(f.max,value)); }
   obj[key]=value;
 }
 r.fixedDealerSeat=Math.min(r.fixedDealerSeat,r.players-1);
 r.uma=r.uma.slice(0,r.players);
 if(r.uma.length<r.players) while(r.uma.length<r.players)r.uma.push(0);
 r.openRiichi=!!(partial.openRiichi ?? partial.localYaku?.openRiichi ?? r.openRiichi);
 r.localYaku.openRiichi=r.openRiichi;
 for (const cat of YAKU_CATALOG) {
   const src=partial.yakuOverrides?.[cat.id]; if(!src || typeof src!=='object')continue;
   const out={};
   for(const key of ['closed','open']) if(src[key]!=null && Number.isFinite(Number(src[key])))out[key]=Math.max(0,Math.min(13,Math.round(Number(src[key]))));
   if(src.yakuman!=null&&Number.isFinite(Number(src.yakuman)))out.yakuman=Math.max(0,Math.min(6,Math.round(Number(src.yakuman))));
   if(Object.keys(out).length)r.yakuOverrides[cat.id]=out;
 }
 r.aiPersonas=normalizePersonaChoices(partial.aiPersonas);
 return r;
}
