import {DEFAULT_RULES,normalizeRules,YAKU_CATALOG} from './rules.js';
import {countsOf,tileType,availableTypes,isTerminalHonor,TERMINAL_HONORS,doraFromIndicator} from './tiles.js';

const CATALOG=new Map(YAKU_CATALOG.map(y=>[y.id,y]));
const GREEN=new Set([19,20,21,23,25,32]);
const RED_PEACOCK=new Set([18,22,24,26,33]);
const RED_POINT=new Set([19,20,21,23,25,33]);
const BLACK=new Set([10,12,16,27,28,29,30]);
const closedHand=melds=>melds.every(m=>m.kind==='ankan');
const allIn=(c,set)=>c.every((v,t)=>!v||set.has(t));
const rank=t=>t%9+1;
const ceil100=n=>Math.ceil(n/100)*100;
const enabled=(r,id)=>id==='openRiichi'?r.openRiichi:!!r.localYaku?.[id];
const sum=a=>a.reduce((x,y)=>x+y,0);

function meldGroup(m){
 const ts=m.tiles.map(tileType).sort((a,b)=>a-b);
 return {kind:m.kind==='chi'?'sequence':ts.length===4?'kan':'triplet',type:ts[0],open:m.kind!=='ankan',fixed:true,from:m.from,sourceKind:m.kind};
}
function validate(tiles,melds,rules){
 if(!Array.isArray(tiles)||!Array.isArray(melds))return '手牌または副露の形式が不正です。';
 if(melds.length>4||tiles.length!==14-3*melds.length)return '和了に必要な牌数ではありません。';
 const all=[...tiles];
 for(const m of melds){
   if(!Array.isArray(m.tiles)||!['chi','pon','ankan','minkan','kakan'].includes(m.kind))return '副露の形式が不正です。';
   const isKan=m.kind.includes('kan');if(m.tiles.length!==(isKan?4:3))return '副露の牌数が不正です。';
   const ts=m.tiles.map(tileType).sort((a,b)=>a-b);
   if(m.kind==='chi'){
     if(rules.players===3)return '三麻ではチーできません。';
     if(ts[0]>=27||ts[0]%9>6||ts[1]!==ts[0]+1||ts[2]!==ts[0]+2)return 'チーの牌の並びが不正です。';
   }else if(ts.some(t=>t!==ts[0]))return '刻子・槓子の牌が一致しません。';
   all.push(...m.tiles);
 }
 if(all.some(t=>!Number.isInteger(tileType(t))||tileType(t)<0||tileType(t)>33))return '存在しない牌が含まれています。';
 const c=countsOf(all);if(c.some(n=>n>4))return '同じ牌が5枚以上含まれています。';
 if(rules.players===3&&c.slice(1,8).some(Boolean))return '三麻には萬子の2〜8を使用しません。';
 return null;
}

function normalShapes(c,needed){
 const results=[];
 function groups(start,left,built,pair){
   while(start<34&&c[start]===0)start++;
   if(!left){if(start===34)results.push({kind:'normal',pair,groups:built.slice()});return;}
   if(start===34)return;
   if(c[start]>=3){c[start]-=3;built.push({kind:'triplet',type:start,open:false,fixed:false});groups(start,left-1,built,pair);built.pop();c[start]+=3;}
   if(start<27&&start%9<=6&&c[start+1]&&c[start+2]){c[start]--;c[start+1]--;c[start+2]--;built.push({kind:'sequence',type:start,open:false,fixed:false});groups(start,left-1,built,pair);built.pop();c[start]++;c[start+1]++;c[start+2]++;}
 }
 for(let pair=0;pair<34;pair++)if(c[pair]>=2){c[pair]-=2;groups(0,needed,[],pair);c[pair]+=2;}
 return results;
}
function sevenPairs(c,rules){return sum(c)===14&&c.every(n=>n===0||n===2||(rules.chiitoiFourCopies&&n===4))&&(rules.chiitoiFourCopies?sum(c.map(n=>n/2))===7:c.filter(n=>n===2).length===7);}
function kokushi(c){return sum(c)===14&&TERMINAL_HONORS.every(t=>c[t]>=1)&&c.every((n,t)=>!n||isTerminalHonor(t))&&c.some(n=>n===2);}
function thirteenUnconnected(c){
 if(sum(c)!==14||c.filter(n=>n===2).length!==1||c.some(n=>n>2)||c.filter(Boolean).length!==13)return false;
 for(let t=0;t<27;t++)if(c[t])for(let d=1;d<=2;d++)if(t%9+d<9&&c[t+d])return false;
 return true;
}
const NANBOKU_TEMPLATES=[];
for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(a!==b){const c=Array(34).fill(0);c[28]=c[30]=3;for(const n of [1,8,6,1])c[a*9+n-1]++;for(const n of [1,8,6,5])c[b*9+n-1]++;NANBOKU_TEMPLATES.push(c);}
function nanboku(c){return NANBOKU_TEMPLATES.some(t=>t.every((n,i)=>n===c[i]));}
function shapesFor(tiles,melds,rules,includeFirstOnly=false){
 const c=countsOf(tiles),shapes=normalShapes(c,4-melds.length);
 if(!melds.length){
   if(sevenPairs(c,rules))shapes.push({kind:'chiitoitsu',groups:[]});
   if(kokushi(c))shapes.push({kind:'kokushi',groups:[]});
   if(enabled(rules,'nanbokuSensou')&&nanboku(c))shapes.push({kind:'nanbokuSensou',groups:[]});
   if(includeFirstOnly&&enabled(rules,'shiisanpuuta')&&thirteenUnconnected(c))shapes.push({kind:'shiisanpuuta',groups:[]});
 }
 return shapes;
}

/** Pure shape check. A complete shape can still have no yaku or be furiten. */
export function isWinning(tiles,melds=[],rules=DEFAULT_RULES){
 return !validate(tiles,melds,rules)&&shapesFor(tiles,melds,rules,true).length>0;
}
/** Shape waits exclude fifth copies and the first-turn-only 十三不塔. */
export function winningTiles(tiles,melds=[],rules=DEFAULT_RULES){
 if(tiles.length!==13-3*melds.length)return [];
 const c=countsOf([...tiles,...melds.flatMap(m=>m.tiles)]),out=[];
 for(const type of availableTypes(rules))if(c[type]<4){const ts=[...tiles,{type,red:false,id:-1}];if(!validate(ts,melds,rules)&&shapesFor(ts,melds,rules,false).length)out.push(type);}
 return out;
}

/** A riichi kan must preserve waits and, by default, every possible decomposition. */
export function canRiichiKan({beforeTiles=[],melds=[],kanType,rules=DEFAULT_RULES}={}){
 if(beforeTiles.length!==13-3*melds.length||countsOf(beforeTiles)[kanType]!==3||melds.length>=4)return false;
 const oldWaits=winningTiles(beforeTiles,melds,rules);if(!oldWaits.length)return false;
 const group=[...beforeTiles.filter(t=>tileType(t)===kanType),{id:-2,type:kanType,red:false}];
 const after=beforeTiles.filter(t=>tileType(t)!==kanType),afterMelds=[...melds,{kind:'ankan',tiles:group,from:0,calledTileId:null}];
 const newWaits=winningTiles(after,afterMelds,rules);
 if(newWaits.length!==oldWaits.length||oldWaits.some(t=>!newWaits.includes(t)))return false;
 if(rules.riichiKanMode==='waits')return true;
 for(const type of oldWaits){
   const shapes=shapesFor([...beforeTiles,{id:-1,type,red:false}],melds,rules,false);
   if(shapes.some(s=>s.kind!=='normal'||!s.groups.some(g=>g.kind==='triplet'&&g.type===kanType)))return false;
 }
 return true;
}

// A suit is independent until its complete/incomplete groups are combined.
// Keeping every (meld, taatsu, pair) possibility avoids greedy decomposition errors.
const suitMemo=new Map(),shantenMemo=new Map();
function suitOptions(input,honors=false){
 const key=(honors?'h':'s')+input.join('');const cached=suitMemo.get(key);if(cached)return cached;
 const c=input.slice(),out=new Map();
 function visit(start,m,t,p){
   while(start<c.length&&!c[start])start++;
   if(start===c.length){const key=m+','+t+','+p;out.set(key,[m,t,p]);return;}
   if(m>4||t+p>7)return;
   if(c[start]>=3){c[start]-=3;visit(start,m+1,t,p);c[start]+=3;}
   if(!honors&&start<=6&&c[start+1]&&c[start+2]){c[start]--;c[start+1]--;c[start+2]--;visit(start,m+1,t,p);c[start]++;c[start+1]++;c[start+2]++;}
   if(c[start]>=2){c[start]-=2;visit(start,m,t,p+1);c[start]+=2;}
   if(!honors&&start<=7&&c[start+1]){c[start]--;c[start+1]--;visit(start,m,t+1,p);c[start]++;c[start+1]++;}
   if(!honors&&start<=6&&c[start+2]){c[start]--;c[start+2]--;visit(start,m,t+1,p);c[start]++;c[start+2]++;}
   c[start]--;visit(start,m,t,p);c[start]++;
 }
 visit(0,0,0,0);
 // Remove states dominated in taatsu/pairs by another state with identical meld count.
 const options=[...out.values()].filter((a,_,all)=>!all.some(b=>b!==a&&b[0]===a[0]&&b[1]>=a[1]&&b[2]>=a[2]&&(b[1]>a[1]||b[2]>a[2])));
 if(suitMemo.size>24000)suitMemo.clear();suitMemo.set(key,options);return options;
}
/** -1=complete, 0=tenpai. Standard, seven pairs and thirteen orphans are compared. */
export function shanten(tiles,melds=[],rules=DEFAULT_RULES){
 const c=countsOf(tiles),opened=melds.length;const key=c.join('')+'|'+opened+'|'+Number(!!rules.chiitoiFourCopies)+'|'+Number(enabled(rules,'nanbokuSensou'));
 if(shantenMemo.has(key))return shantenMemo.get(key);
 let states=[[opened,0,0]];
 for(let i=0;i<4;i++){
   const opts=suitOptions(i===3?c.slice(27):c.slice(i*9,i*9+9),i===3),next=new Map();
   for(const [m,t,p] of states)for(const [mm,tt,pp] of opts){const M=m+mm;if(M>4)continue;const T=Math.min(4,t+tt),P=Math.min(7,p+pp);next.set(M+','+T+','+P,[M,T,P]);}
   states=[...next.values()];
 }
 let best=8;for(const [m,t,p] of states){const head=p?1:0;best=Math.min(best,8-2*m-Math.min(4-m,t+p-head)-head);}
 if(!opened){
   const distinct=c.filter(Boolean).length,pairs=c.filter(v=>v>=2).length;
   best=Math.min(best,rules.chiitoiFourCopies?6-sum(c.map(n=>Math.floor(n/2))):6-pairs+Math.max(0,7-distinct));
   const orphanDistinct=TERMINAL_HONORS.filter(t=>c[t]).length,orphanPair=TERMINAL_HONORS.some(t=>c[t]>=2);
   best=Math.min(best,13-orphanDistinct-Number(orphanPair));
   if(enabled(rules,'nanbokuSensou'))for(const target of NANBOKU_TEMPLATES)best=Math.min(best,sum(target.map((n,i)=>Math.max(0,n-c[i])))-1);
 }
 if(shantenMemo.size>40000)shantenMemo.clear();shantenMemo.set(key,best);return best;
}

export function calculatePoints(han,fu,yakuman=0,context={},rules=DEFAULT_RULES){
 let basePoints=0,limit='',effectiveYakuman=0;
 if(yakuman>0){
   effectiveYakuman=rules.doubleYakuman===false?1:rules.tripleYakuman===false?Math.min(2,yakuman):yakuman;
   basePoints=8000*effectiveYakuman;limit=effectiveYakuman===1?'役満':effectiveYakuman===2?'ダブル役満':effectiveYakuman===3?'トリプル役満':`${effectiveYakuman}倍役満`;
 }else if(han>=13&&rules.kazoeYakuman!==false){basePoints=8000;limit='数え役満';}
 else if(han>=11){basePoints=6000;limit='三倍満';}
 else if(han>=8){basePoints=4000;limit='倍満';}
 else if(han>=6){basePoints=3000;limit='跳満';}
 else if(han>=5){basePoints=2000;limit='満貫';}
 else if(han>0){basePoints=fu*2**(han+2);if(basePoints>=2000||(rules.kiriageMangan&&(han===4&&fu===30||han===3&&fu===60))){basePoints=2000;limit='満貫';}}
 const dealer=!!context.dealer;
 const ron=ceil100(basePoints*(dealer?6:4));
 let tsumoDealer=ceil100(basePoints*2),tsumoNonDealer=ceil100(basePoints*(dealer?2:1));
 if(rules.players===3&&rules.sanmaTsumo==='equalized'){
   const missing=tsumoNonDealer;
   tsumoDealer=ceil100(tsumoDealer+missing/2);
   tsumoNonDealer=ceil100(tsumoNonDealer+missing/2);
 }
 const n=rules.players===3?3:4,totalTsumo=dealer?tsumoNonDealer*(n-1):tsumoDealer+tsumoNonDealer*(n-2);
 return {basePoints,limit,yakuman:effectiveYakuman,payments:{ron,tsumoDealer,tsumoNonDealer},total:context.tsumo?totalTsumo:ron,totalTsumo};
}

function placements(shape,winType){
 if(shape.kind!=='normal')return [{shape,wait:shape.kind,winningGroup:-1}];
 const result=[];if(shape.pair===winType)result.push({shape,wait:'tanki',winningGroup:-1});
 shape.groups.forEach((g,i)=>{
   if(g.fixed)return;
   if(g.kind==='triplet'&&g.type===winType)result.push({shape,wait:'shanpon',winningGroup:i});
   if(g.kind==='sequence'&&winType>=g.type&&winType<=g.type+2){const offset=winType-g.type;const wait=offset===1?'kanchan':g.type%9===0&&offset===2||g.type%9===6&&offset===0?'penchan':'ryanmen';result.push({shape,wait,winningGroup:i});}
 });
 return result;
}

function fuFor(shape,placement,groups,closed,context,rules,pinfu){
 if(shape.kind==='chiitoitsu')return {fu:rules.chiitoiFu??25,details:[{name:'七対子固定符',fu:rules.chiitoiFu??25}]};
 if(shape.kind!=='normal')return {fu:0,details:[]};
 if(pinfu&&context.tsumo)return {fu:20,details:[{name:'平和ツモ',fu:20}]};
 const details=[{name:'副底',fu:20}];
 if(closed&&!context.tsumo)details.push({name:'門前ロン',fu:10});
 if(context.tsumo)details.push({name:'ツモ',fu:2});
 for(let i=0;i<groups.length;i++){
   const g=groups[i];if(g.kind==='sequence')continue;
   const opened=g.open||!context.tsumo&&i===placement.winningGroup;
   let fu=opened?2:4;if(isTerminalHonor(g.type))fu*=2;if(g.kind==='kan')fu*=4;
   details.push({name:`${opened?'明':'暗'}${g.kind==='kan'?'槓':'刻'}（${isTerminalHonor(g.type)?'么九牌':'中張牌'}）`,fu});
 }
 let pairFu=0;
 if(shape.pair>=31)pairFu+=2;
 if(shape.pair===context.seatWind&&shape.pair===context.roundWind)pairFu+=rules.doubleWindPairFu??4;
 else {if(shape.pair===context.seatWind)pairFu+=2;if(shape.pair===context.roundWind)pairFu+=2;}
 if(pairFu)details.push({name:'役牌の雀頭',fu:pairFu});
 if(['tanki','kanchan','penchan'].includes(placement.wait))details.push({name:{tanki:'単騎待ち',kanchan:'嵌張待ち',penchan:'辺張待ち'}[placement.wait],fu:2});
 let raw=sum(details.map(a=>a.fu));if(raw===20&&!closed&&!context.tsumo){details.push({name:'副露平和形の最低符',fu:10});raw=30;}
 const fu=Math.ceil(raw/10)*10;if(fu!==raw)details.push({name:'10符単位切り上げ',fu:fu-raw});
 return {fu,details};
}

function indicatorBonus(tiles,context,rules){
 const c=countsOf(tiles),read=t=>rules.doraMode==='indicator'?tileType(t):doraFromIndicator(t,rules.players);
 const indicators=[...(context.doraIndicators||[])],uras=[...(context.uraIndicators||[])];
 // The game normally sends only active indicators; these optional fields make
 // delayed kan indicators and robbed-kan variants explicit and deterministic.
 const special=context.chankan?rules.chankanKanDora:context.rinshan?rules.rinshanKanDora:null;
 if(special===true&&context.pendingKanDoraIndicator!=null)indicators.push(context.pendingKanDoraIndicator);
 if(special===true&&context.pendingKanUraIndicator!=null)uras.push(context.pendingKanUraIndicator);
 if(special===false&&context.latestKanIndicatorActive){indicators.pop();uras.pop();}
 const shown=rules.kanDora===false?indicators.slice(0,1):indicators;
 const hidden=rules.kanUraDora===false?uras.slice(0,1):uras;
 let omote=rules.dora===false?0:sum(shown.map(t=>c[read(t)]||0));
 const ura=rules.uraDora!==false&&(context.riichi||context.openRiichi)?sum(hidden.map(t=>c[read(t)]||0)):0;
 const red=rules.redDora===false?0:tiles.filter(t=>t?.red).length;
 const nuki=rules.players===3&&rules.nukiDora!==false?Number(context.nuki)||0:0;
 // North removed from the hand still receives indicator dora in addition to its
 // nuki bonus; context.nukiTiles lets a caller preserve physical tile metadata.
 if(rules.players===3&&rules.dora!==false&&context.nuki>0)omote+=shown.filter(t=>read(t)===30).length*context.nuki;
 const nukiUra=rules.players===3&&rules.uraDora!==false&&(context.riichi||context.openRiichi)?hidden.filter(t=>read(t)===30).length*(Number(context.nuki)||0):0;
 return {omote,ura:ura+nukiUra,red,nuki,total:omote+ura+nukiUra+red+nuki};
}

const pairRuns=(c,suit,start)=>c.every((n,t)=>n===(t>=suit*9+start&&t<suit*9+start+7?2:0));
function hasRun(set,n){for(let s=0;s<3;s++)for(let i=0;i<=9-n;i++)if(Array.from({length:n},(_,j)=>set.has(s*9+i+j)).every(Boolean))return true;return false;}
function suitCount(c){return [0,1,2].filter(s=>c.slice(s*9,s*9+9).some(Boolean)).length;}
const EVENT_YAKU=new Set(['menzenTsumo','ippatsu','rinshan','chankan','haitei','houtei','tenhou','chiihou','renhou','shiisanpuuta','paarenchan','tsubameGaeshi','kanburi','iipinMoyue','kyuupinRaoyui','openRiichiPenalty']);

/** Yaku common to every physically possible ron wait in a 13-equivalent hand.
 * Useful for chronological 先付け/中付け evidence and visible-hand analysis.
 * Event-only bonuses and dora cannot establish a hand yaku in advance.
 */
export function guaranteedYakuBeforeWin({tiles=[],melds=[],context={},rules=DEFAULT_RULES}={}){
 const r=normalizeRules({...rules,atozuke:'allowed',twoHanHonbaThreshold:0}),waits=winningTiles(tiles,melds,r);
 if(!waits.length)return [];
 const ctx={...context,tsumo:false,ippatsu:false,rinshan:false,chankan:false,haitei:false,houtei:false,renhou:false,firstTurn:false,lastDiscardRiichi:false,lastDiscardAfterKan:false};
 let common=null;
 for(const type of waits){
   const winning={id:-1,type,red:false},value=evaluateHand({tiles:[...tiles,winning],melds,winTile:winning,context:ctx,rules:r});
   if(!value.valid)return [];
   const supported=new Set((value.possibleYakuIds||value.yaku.map(y=>y.id)).filter(id=>!EVENT_YAKU.has(id)));
   common=common===null?supported:new Set([...common].filter(id=>supported.has(id)));
   if(!common.size)return [];
 }
 return [...(common||[])];
}

function firstCallSupportsFinalYaku(evidence,rows,groups,all,context){
 const em=evidence.melds||[],index=Number.isInteger(evidence.firstMeldIndex)?evidence.firstMeldIndex:em.findIndex(m=>m.kind!=='ankan');
 const first=em[index];if(!first)return false;
 const fg=meldGroup(first),firstKey=(fg.kind==='sequence'?'s:':'t:')+fg.type;
 const prior=countsOf([...(evidence.hand||[]),...em.slice(0,index).flatMap(m=>m.tiles)]);
 const finalKeys=groups.map(g=>(g.kind==='sequence'?'s:':'t:')+g.type);
 const S=t=>({kind:'sequence',type:t}),T=t=>({kind:'triplet',type:t});
 function supported(pattern){
   const pool=finalKeys.slice();
   for(const g of pattern){const key=(g.kind==='sequence'?'s:':'t:')+g.type,k=pool.indexOf(key);if(k<0)return false;pool.splice(k,1);}
   if(pattern.some(g=>(g.kind==='sequence'?'s:':'t:')+g.type===firstKey))return true;
   const remaining=prior.slice();
   for(const g of pattern){if(g.kind==='sequence'){for(let d=0;d<3;d++)if(--remaining[g.type+d]<0)return false;}else if((remaining[g.type]-=3)<0)return false;}
   return true;
 }
 const valueTiles={white:31,green:32,red:33,seatWind:context.seatWind,roundWind:context.roundWind};
 for(const {id}of rows){
   if(id in valueTiles){if(supported([T(valueTiles[id])]))return true;continue;}
   if(['tanyao','honitsu','chinitsu','honroutou','chanta','junchan','uumensai','shiieruRaotai'].includes(id))return true;
   if(id==='toitoi'&&fg.kind!=='sequence')return true;
   if(id==='sanankou'&&groups.filter(g=>g.kind!=='sequence'&&!g.open&&prior[g.type]>=3).length>=3)return true;
   if(id==='sankantsu'&&(fg.kind==='kan'||em.slice(0,index).filter(m=>m.kind.includes('kan')).length>=3))return true;
   if(id==='shousangen'&&fg.type>=31&&fg.kind!=='sequence')return true;
   if(id==='sanshokuDoujun')for(let i=0;i<7;i++)if(supported([S(i),S(i+9),S(i+18)]))return true;
   if(id==='sanshokuDoukou')for(let i=0;i<9;i++)if(supported([T(i),T(i+9),T(i+18)]))return true;
   if(id==='ittsu')for(let s=0;s<3;s++)if(supported([S(s*9),S(s*9+3),S(s*9+6)]))return true;
   if(id==='sanrenkou')for(let s=0;s<3;s++)for(let i=0;i<7;i++)if(supported([T(s*9+i),T(s*9+i+1),T(s*9+i+2)]))return true;
   if(id==='isshokuSanjun')for(let s=0;s<3;s++)for(let i=0;i<7;i++)if(supported([S(s*9+i),S(s*9+i),S(s*9+i)]))return true;
   if(id==='sanshokuTsuukan')for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)if(a!==b&&a!==c&&b!==c&&supported([S(a*9),S(b*9+3),S(c*9+6)]))return true;
 }
 return false;
}

/** Exact hand value, all decompositions and all possible uses of the winning tile. */
export function evaluateHand({tiles=[],melds=[],winTile,context={},rules=DEFAULT_RULES}={}){
 const r=normalizeRules(rules),ctx={seatWind:28,roundWind:27,dealer:false,tsumo:false,...context};
 const invalid=reason=>({valid:false,reason,han:0,fu:0,yakuman:0,yaku:[],dora:{omote:0,ura:0,red:0,nuki:0,total:0},basePoints:0,limit:'',payments:{ron:0,tsumoDealer:0,tsumoNonDealer:0}});
 const error=validate(tiles,melds,r);if(error)return invalid(error);
 const winType=tileType(winTile??tiles.at(-1));if(!tiles.some(t=>tileType(t)===winType))return invalid('和了牌が手牌に含まれていません。');
 const closed=closedHand(melds),concealed=countsOf(tiles),physical=[...tiles,...melds.flatMap(m=>m.tiles)],all=countsOf(physical);
 const allShapes=shapesFor(tiles,melds,r,true);if(!allShapes.length)return invalid('和了形になっていません。');
 const fixed=melds.map(meldGroup),bonus=indicatorBonus(physical,ctx,r),candidates=[],possibleYakuIds=new Set();
 // The selected 人和 valuation takes priority over its yakuman multiplier.
 // A zero multiplier still disables the role in every valuation mode.
 const renhouEnabled=enabled(r,'renhou')&&r.yakuOverrides.renhou?.yakuman!==0;
 let inferredGuaranteed=Array.isArray(ctx.guaranteedYakuIds)?ctx.guaranteedYakuIds:null;
 let lastReason='ドラ以外の役がありません。';
 for(const shape of allShapes)for(const place of placements(shape,winType)){
   const groups=[...shape.groups,...fixed],sequences=groups.filter(g=>g.kind==='sequence'),triplets=groups.filter(g=>g.kind!=='sequence'),seqSet=new Set(sequences.map(g=>g.type)),tripSet=new Set(triplets.map(g=>g.type));
   const kanCount=groups.filter(g=>g.kind==='kan').length;
   const concealedTriplets=groups.filter((g,i)=>g.kind!=='sequence'&&!g.open&&(ctx.tsumo||i!==place.winningGroup)).length;
   const honors=all.slice(27).some(Boolean),onlyTermHon=all.every((n,t)=>!n||isTerminalHonor(t)),onlyTerm=all.every((n,t)=>!n||t<27&&isTerminalHonor(t));
   const onlyHonors=all.slice(0,27).every(n=>!n),suits=suitCount(all);
   const found=[];
   function add(id,hanOverride=null,multiplier=null){
     const cat=CATALOG.get(id);if(!cat||cat.local&&!enabled(r,id))return false;
     const override=r.yakuOverrides[id]||{};
     if(cat.yakuman||multiplier!=null||override.yakuman>0){
       if(!closed&&cat.open==null)return false;
       const amount=override.yakuman??multiplier??cat.yakuman??1;if(!amount)return false;
       found.push({id,name:cat.name,han:0,yakuman:amount});
     }else{
       const key=closed?'closed':'open',nominal=hanOverride??cat[key];if(nominal==null)return false;
       const han=override[key]??nominal;if(han<=0)return false;found.push({id,name:cat.name,han,yakuman:0});
     }
     return true;
   }
   const specialOnly=['shiisanpuuta','nanbokuSensou'].includes(shape.kind);
   if(shape.kind==='shiisanpuuta'){
     if(ctx.tsumo&&ctx.firstTurn&&ctx.uninterrupted!==false&&melds.length===0)add('shiisanpuuta');
     else continue;
   }else if(shape.kind==='nanbokuSensou')add('nanbokuSensou');
   else {
     if(closed&&ctx.tsumo&&ctx.firstTurn&&ctx.uninterrupted!==false&&!melds.length)add(ctx.dealer?'tenhou':'chiihou');
     if(renhouEnabled&&closed&&!ctx.dealer&&!ctx.tsumo&&ctx.renhou&&ctx.uninterrupted!==false){
       if(r.renhouValue==='yakuman')add('renhou');
       else if(r.renhouValue==='fiveHan'){
         const han=r.yakuOverrides.renhou?.closed??5;
         if(han>0)found.push({id:'renhou',name:'人和',han,yakuman:0});
       }
     }
     if(enabled(r,'paarenchan')&&ctx.dealer&&ctx.consecutiveWins>=7)add('paarenchan');
     if(shape.kind==='kokushi'){
       const pre=concealed.slice();pre[winType]--;
       const pure=TERMINAL_HONORS.every(t=>pre[t]===1);
       add(pure?'kokushi13':'kokushi',null,pure&&r.kokushi13Double&&r.doubleYakuman?2:1);
     }
     if(concealedTriplets===4&&closed)add(place.wait==='tanki'?'suuankouTanki':'suuankou',null,place.wait==='tanki'&&r.suuankouTankiDouble&&r.doubleYakuman?2:1);
     if([31,32,33].every(t=>tripSet.has(t)))add('daisangen');
     if([27,28,29,30].every(t=>tripSet.has(t)))add('daisuushii',null,r.daisuushiiDouble&&r.doubleYakuman?2:1);
     else if(shape.pair>=27&&shape.pair<=30&&[27,28,29,30].filter(t=>tripSet.has(t)).length===3)add('shousuushii');
     const sevenStars=!melds.length&&all.slice(27).every(n=>n===2)&&onlyHonors;
     if(!(sevenStars&&enabled(r,'daichisei')&&add('daichisei',null,r.daichiseiMultiplier))&&onlyHonors)add('tsuuiisou');
     if(allIn(all,GREEN)&&(!r.greenDragonRequired||all[32]>0))add('ryuuiisou');
     if(onlyTerm)add('chinroutou');
     if(kanCount===4)add('suukantsu');
     if(closed&&melds.length===0&&suits===1&&!honors){
       const s=Math.floor(tileType(physical.find(t=>tileType(t)<27))/9),c=all.slice(s*9,s*9+9),base=[3,1,1,1,1,1,1,1,3];
       if(c.every((n,i)=>n>=base[i])){const pre=c.slice();pre[winType%9]--;const pure=pre.every((n,i)=>n===base[i]);add(pure?'junseiChuuren':'chuuren',null,pure&&r.pureNineGatesDouble&&r.doubleYakuman?2:1);}
     }
     if(!melds.length){
       if(pairRuns(all,1,1))add('daisharin');
       if(pairRuns(all,1,0)||pairRuns(all,1,2))add('shousharin');
       if(pairRuns(all,2,1))add('daichikurin');
       if(pairRuns(all,0,1))add('daisuurin');
     }
     if(hasRun(tripSet,4))add('suurenkou');
     if(sequences.some(g=>sequences.filter(a=>a.type===g.type).length===4))add('isshokuYonjun');
     if(allIn(all,RED_PEACOCK)&&[18,22,24,26,33].every(t=>all[t]))add('benikujaku');
     if(allIn(all,RED_POINT)&&all[33]>=2)add('kouitten');
     if(allIn(all,BLACK))add('kokuissou');
     if(all.slice(9).every(n=>!n)&&sum(all.map((n,t)=>n*(t+1)))>=100)add('hyakumangoku');
     if([18,21,24].every(t=>seqSet.has(t))&&(tripSet.has(27)&&shape.pair===30||tripSet.has(30)&&shape.pair===27))add('tohokuShinkansen');
     if(triplets.length===4&&allIn(all,new Set([10,12,14,27,30]))&&[10,12,14,27,30].every(t=>all[t]))add('tohokuExpressway');
     if(closed&&[0,1,2].some(s=>[0,2,4,6].every(i=>seqSet.has(s*9+i))))add('kinmonkyou');
     const qualifyingWinds=[ctx.seatWind,ctx.roundWind].some(t=>tripSet.has(t));
     if(qualifyingWinds&&[13,18,9].every(t=>tripSet.has(t)))add('kachouFuugetsu');
     if(qualifyingWinds&&[13,31,9].every(t=>tripSet.has(t)))add('fuukaSetsugetsu');
     if(r.openRiichiDealInYakuman&&ctx.openRiichi&&!ctx.tsumo&&ctx.discarderRiichi===false)found.push({id:'openRiichiPenalty',name:'オープンリーチへの放銃',han:0,yakuman:1});
   }
   if(!specialOnly&&shape.kind!=='kokushi'){
     if(closed&&ctx.openRiichi&&r.openRiichi){add('openRiichi',2+(ctx.doubleRiichi&&r.doubleRiichi?1:0));}
     else if(closed&&ctx.riichi)add(ctx.doubleRiichi&&r.doubleRiichi?'doubleRiichi':'riichi');
     if(closed&&ctx.tsumo)add('menzenTsumo');
     if(closed&&(ctx.riichi||ctx.openRiichi)&&ctx.ippatsu&&r.ippatsu&&!ctx.rinshan)add('ippatsu');
     const pinfu=shape.kind==='normal'&&closed&&sequences.length===4&&shape.pair<31&&shape.pair!==ctx.seatWind&&shape.pair!==ctx.roundWind&&place.wait==='ryanmen';
     if(pinfu)add('pinfu');
     if(!onlyTermHon&&all.every((n,t)=>!n||t<27&&t%9>=1&&t%9<=7)&&(closed||r.kuitan))add('tanyao');
     if(tripSet.has(31))add('white');if(tripSet.has(32))add('green');if(tripSet.has(33))add('red');
     if(tripSet.has(ctx.seatWind))add('seatWind');if(tripSet.has(ctx.roundWind))add('roundWind');
     if(ctx.tsumo&&ctx.rinshan)add('rinshan');
     if(!ctx.tsumo&&ctx.chankan)add('chankan');
     const moon=enabled(r,'iipinMoyue')&&ctx.tsumo&&ctx.haitei&&!ctx.rinshan&&winType===9;
     const fish=enabled(r,'kyuupinRaoyui')&&!ctx.tsumo&&ctx.houtei&&!ctx.chankan&&winType===17;
     if(!(moon&&add('iipinMoyue'))&&ctx.tsumo&&ctx.haitei&&!ctx.rinshan)add('haitei');
     if(!(fish&&add('kyuupinRaoyui'))&&!ctx.tsumo&&ctx.houtei&&!ctx.chankan)add('houtei');
     if(shape.kind==='chiitoitsu')add('chiitoitsu');
     if(shape.kind==='normal'){
       let duplicatePairs=0;for(const t of seqSet)duplicatePairs+=Math.floor(sequences.filter(g=>g.type===t).length/2);
       const tripleSequence=[...seqSet].some(t=>sequences.filter(g=>g.type===t).length>=3);
       if(!(tripleSequence&&enabled(r,'isshokuSanjun')&&add('isshokuSanjun'))){if(closed&&duplicatePairs>=2)add('ryanpeikou');else if(closed&&duplicatePairs>=1)add('iipeikou');}
       for(let i=0;i<=6;i++)if([i,i+9,i+18].every(t=>seqSet.has(t))){add('sanshokuDoujun');break;}
       for(let s=0;s<3;s++)if([s*9,s*9+3,s*9+6].every(t=>seqSet.has(t))){add('ittsu');break;}
       if(triplets.length===4)add('toitoi');
       if(concealedTriplets>=3)add('sanankou');
       for(let i=0;i<9;i++)if([i,i+9,i+18].every(t=>tripSet.has(t))){add('sanshokuDoukou');break;}
       if(kanCount>=3)add('sankantsu');
       if(shape.pair>=31&&[31,32,33].filter(t=>tripSet.has(t)).length===2)add('shousangen');
       if(sequences.length&&isTerminalHonor(shape.pair)&&groups.every(g=>g.kind==='sequence'?g.type%9===0||g.type%9===6:isTerminalHonor(g.type)))add(honors?'chanta':'junchan');
       if(hasRun(tripSet,3)&&!found.some(y=>y.id==='suurenkou'))add('sanrenkou');
       let mixedStraight=false;
       for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)if(a!==b&&b!==c&&a!==c&&seqSet.has(a*9)&&seqSet.has(b*9+3)&&seqSet.has(c*9+6))mixedStraight=true;
       if(mixedStraight)add('sanshokuTsuukan');
       if(melds.length===4&&melds.every(m=>m.kind!=='ankan'))add('shiieruRaotai');
     }
     if(onlyTermHon&&!onlyHonors&&!onlyTerm)add('honroutou');
     if(suits===1)add(honors?'honitsu':'chinitsu');
     if(suits===3&&all.slice(27,31).some(Boolean)&&all.slice(31).some(Boolean))add('uumensai');
     if(!ctx.tsumo&&ctx.lastDiscardRiichi)add('tsubameGaeshi');
     if(!ctx.tsumo&&ctx.lastDiscardAfterKan&&!ctx.chankan)add('kanburi');
   }
   const yakumanRows=found.filter(y=>y.yakuman>0),regularRows=found.filter(y=>!y.yakuman&&y.han>0);
   let yakuman=yakumanRows.length?(r.multipleYakuman?sum(yakumanRows.map(y=>y.yakuman)):Math.max(...yakumanRows.map(y=>y.yakuman))):0;
   const yakuHan=sum(regularRows.map(y=>y.han));
   if(!yakuman&&r.atozuke!=='allowed'){
     // The game records chronological evidence. When evaluating standalone hands,
     // infer the final guaranteed yaku conservatively from the decomposition.
     if(inferredGuaranteed===null&&ctx.yakuEstablishedBeforeWin==null){
       const pre=tiles.slice();let index=winTile?.id!=null?pre.findIndex(t=>t.id===winTile.id&&tileType(t)===winType):-1;
       if(index<0)index=pre.findIndex(t=>tileType(t)===winType);pre.splice(index,1);
       inferredGuaranteed=guaranteedYakuBeforeWin({tiles:pre,melds,context:ctx,rules:r});
     }
     const singleYakuhai=regularRows.every(y=>['white','green','red','seatWind','roundWind'].includes(y.id));
     const before=ctx.yakuEstablishedBeforeWin??(inferredGuaranteed.length>0);
     const firstOpen=melds.find(m=>m.kind!=='ankan');
     const firstType=tileType(firstOpen?.tiles?.[0]);
     const concealedValue=groups.some(g=>!g.fixed&&g.kind!=='sequence'&&(g.type>=31||g.type===ctx.seatWind||g.type===ctx.roundWind));
     const roleCandidates=inferredGuaranteed?.length?regularRows.filter(y=>inferredGuaranteed.includes(y.id)):regularRows;
     const yakuAtFirst=ctx.firstCallEvidence?firstCallSupportsFinalYaku(ctx.firstCallEvidence,roleCandidates,groups,all,ctx):ctx.firstCallHadYaku??(!firstOpen||concealedValue||!singleYakuhai||firstType>=31||firstType===ctx.seatWind||firstType===ctx.roundWind);
     if(!before||(r.atozuke==='first'&&!closed&&!yakuAtFirst)){lastReason=r.atozuke==='first'?'先付けの条件を満たしていません。':'和了前に役が確定していません。';continue;}
   }
   const required=r.twoHanHonbaThreshold>0&&(ctx.honba||0)>=r.twoHanHonbaThreshold?2:1;
   if(!yakuman&&yakuHan<required){lastReason=required===2?'二翻縛りです。ドラを除く役が2翻必要です。':'ドラ以外の役がありません。';continue;}
   for(const row of found)possibleYakuIds.add(row.id);
   const scoringRows=yakuman?yakumanRows:regularRows;
   const han=yakuman?0:yakuHan+bonus.total;
   const pinfu=regularRows.some(y=>y.id==='pinfu');
   const fu=fuFor(shape,place,groups,closed,ctx,r,pinfu);
   const points=calculatePoints(han,fu.fu,yakuman,ctx,r);
   candidates.push({valid:true,reason:'',han,fu:fu.fu,yakuman:points.yakuman,yaku:scoringRows,dora:yakuman?{...bonus,total:0,ignored:true}:bonus,yakuHan,fuDetails:fu.details,closed,wait:place.wait,shape:shape.kind,groups,pair:shape.pair,...points});
 }
 // Fixed-value 人和 competes with the regular hand, rather than adding five han.
 if(renhouEnabled&&r.renhouValue==='mangan'&&closed&&!ctx.dealer&&!ctx.tsumo&&ctx.renhou&&ctx.uninterrupted!==false&&allShapes.some(s=>!['shiisanpuuta','nanbokuSensou'].includes(s.kind))){
   const points=calculatePoints(5,30,0,ctx,r);candidates.push({valid:true,reason:'',han:5,fu:30,yakuman:0,yaku:[{id:'renhou',name:'人和（満貫）',han:5,yakuman:0}],dora:{...bonus,total:0,ignored:true},yakuHan:5,fuDetails:[],closed,wait:'',shape:'renhou',...points});
 }
 if(!candidates.length)return invalid(lastReason);
 candidates.sort((a,b)=>b.total-a.total||b.yakuman-a.yakuman||b.han-a.han||b.fu-a.fu);
 return {...candidates[0],possibleYakuIds:[...possibleYakuIds]};
}
