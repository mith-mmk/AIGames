import {MahjongGame,ENGINE_VERSION} from '../core/game.js';
import {normalizeRules} from '../core/rules.js';

export const DATA_VERSION=2;
export const clone=value=>structuredClone(value);
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
export function safeJSON(text){
  assert(typeof text==='string'&&text.length<=64*1024*1024,'JSONは64MB以下にしてください。');
  return JSON.parse(text,(key,value)=>{
    if(['__proto__','prototype','constructor'].includes(key))throw new Error('安全でないデータのキーです。');
    return value;
  });
}
export function validateEnvelope(envelope){
  assert(envelope?.format==='seiran-save'&&envelope.version===1&&typeof envelope.state==='string','保存データの形式が不正です。');
  const parsed=safeJSON(envelope.state);
  assert(parsed?.state?.log?.length<=100000&&parsed?.state?.actionHistory?.length<=100000,'対局の記録が大きすぎます。');
  const game=MahjongGame.restore(JSON.stringify(parsed));
  const s=game.state;
  assert(Number.isInteger(s.seed)&&Number.isInteger(s.rng)&&s.rng>=0&&s.rng<=0xffffffff,'乱数状態が不正です。');
  assert(Number.isInteger(s.roundIndex)&&s.roundIndex>=0&&s.roundIndex<100&&Number.isInteger(s.handNumber)&&s.handNumber>=1&&s.handNumber<=s.rules.players,'局番号が不正です。');
  assert(Number.isInteger(s.honba)&&s.honba>=0&&s.honba<10000,'本場が不正です。');
  assert(Number.isInteger(s.initialDealer)&&s.initialDealer>=0&&s.initialDealer<s.rules.players,'起家が不正です。');
  assert(s.players.every(p=>typeof p.name==='string'&&p.name.length<=100),'参加者名が不正です。');
  assert(s.dealer===(s.initialDealer+s.handNumber-1)%s.rules.players,'親と局番号が一致しません。');
  assert(s.roundWind===27+s.roundIndex%4,'場風が一致しません。');
  for(const a of s.actionHistory)assert(a&&Number.isInteger(a.player)&&a.player>=0&&a.player<s.rules.players&&a.action&&typeof a.action.type==='string','操作記録が不正です。');
  if(s.phase==='matchEnd')validateHistory(s);
  return game;
}

/** The ranking and settlement are derived from scores, never trusted from imported totals. */
export function settlement(state){
  const s=state,r=s.rules,n=r.players;
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>s.players[b].score-s.players[a].score||(a-s.initialDealer+n)%n-(b-s.initialDealer+n)%n);
  const oka=r.oka?(r.returnPoints-r.initialPoints)*n/1000:0;
  return order.map((player,index)=>{
    const p=s.players[player],base=(p.score-(r.oka?r.returnPoints:r.initialPoints))/1000,uma=r.uma[index]||0,award=index===0?oka:0;
    return {player,id:p.id,name:p.name,rank:index+1,score:p.score,base,uma,oka:award,result:Number((base+uma+award).toFixed(1))};
  });
}

export function validateHistory(s){
  const n=s.rules.players,total=s.rules.initialPoints*n;
  assert(Array.isArray(s.handRecords)&&Array.isArray(s.scoreHistory),'局記録がありません。');
  let prior=null,lastId=-1;
  for(const h of s.handRecords){
    assert(Number.isInteger(h.handId)&&h.handId>lastId,'局IDが重複または逆順です。');lastId=h.handId;
    assert(Array.isArray(h.scores)&&h.scores.length===n&&h.scores.every(Number.isInteger)&&Array.isArray(h.scoresBefore)&&h.scoresBefore.length===n&&h.scoresBefore.every(Number.isInteger),'局の点数が不正です。');
    assert(Number.isInteger(h.riichiPot)&&Number.isInteger(h.potBefore)&&h.riichiPot>=0&&h.potBefore>=0,'供託が不正です。');
    assert(h.scores.reduce((a,b)=>a+b,0)+h.riichiPot*1000===total&&h.scoresBefore.reduce((a,b)=>a+b,0)+h.potBefore*1000===total,'局記録の点棒総額が一致しません。');
    if(prior)assert(prior.scores.every((v,i)=>v===h.scoresBefore[i])&&prior.riichiPot===h.potBefore,'点数推移が連続していません。');
    assert(['ron','tsumo','exhaustive','abortive'].includes(h.result?.kind)&&Array.isArray(h.result.winners)&&h.result.winners.length<n,'局の結果が不正です。');
    const wins=new Set();for(const w of h.result.winners){
      assert(Number.isInteger(w.player)&&w.player>=0&&w.player<n&&!wins.has(w.player),'和了者が不正です。');wins.add(w.player);
      assert(w.from===null||Number.isInteger(w.from)&&w.from>=0&&w.from<n&&w.from!==w.player,'放銃者が不正です。');
      assert(w.score?.valid&&Number.isFinite(w.score.total)&&w.score.total>=0&&Array.isArray(w.score.yaku),'和了点の記録が不正です。');
    }
    assert(Array.isArray(h.flags)&&h.flags.length===n,'成績の局フラグが不正です。');
    prior=h;
  }
  if(prior)assert(prior.scores.every((v,i)=>v===s.players[i].score)&&prior.riichiPot===s.riichiPot,'最終点数と局履歴が一致しません。');
  if(!s.historyPartial)assert(s.handRecords.length===s.completedHands&&s.scoreHistory.length===s.completedHands+1,'局記録が欠落しています。');
  for(let i=0;i<s.handRecords.length;i++){
    const h=s.handRecords[i],point=s.scoreHistory.find(p=>p.handId===h.handId);
    assert(point&&h.scores.every((v,k)=>v===point.scores[k])&&h.riichiPot===point.riichiPot,'グラフと局結果が一致しません。');
  }
  const ranked=settlement(s);
  assert(s.standings?.length===n&&ranked.every((v,i)=>['player','rank','score','uma','oka','result'].every(k=>v[k]===s.standings[i][k])),'終局精算が一致しません。');
  return true;
}

export function makeMatchRecord(envelope,{startedAt,endedAt=new Date().toISOString()}={}){
  const game=validateEnvelope(envelope),s=game.state;
  assert(s.phase==='matchEnd','終局していない対局は成績に登録できません。');
  const id=envelope.matchId;
  assert(typeof id==='string'&&/^[\w.-]{1,120}$/.test(id),'対局IDが不正です。');
  const start=startedAt||envelope.startedAt||envelope.savedAt||endedAt;
  assert(Number.isFinite(Date.parse(start))&&Number.isFinite(Date.parse(endedAt)),'対局日時が不正です。');
  const safeSave={format:'seiran-save',version:1,matchId:id,startedAt:start,savedAt:envelope.savedAt||endedAt,state:game.serialize()};
  return {schemaVersion:DATA_VERSION,id,engineVersion:s.engineVersion||ENGINE_VERSION,startedAt:start,endedAt,
    players:s.rules.players,length:s.rules.length,partial:!!s.historyPartial,rules:clone(s.rules),seats:clone(s.setup),
    participants:s.players.map((p,i)=>({player:i,id:p.id,name:p.name,persona:p.persona,human:i===0})),
    standings:settlement(s),scoreHistory:clone(s.scoreHistory),hands:clone(s.handRecords),
    endReason:s.result?.endReason||'対局終了',save:safeSave};
}
export function validateMatch(record){
  assert(record?.schemaVersion===DATA_VERSION,'未対応の対局データ版です。');
  assert(record.id===record.save?.matchId,'対局IDが一致しません。');
  // Ignore imported derived totals; reconstruct them from the validated saved match.
  return makeMatchRecord(record.save,{startedAt:record.startedAt,endedAt:record.endedAt});
}

/** Rates use completed, recorded hands; aborted hands are not opportunities to win/deal in. */
export function aggregate(records,players){
  const out={players,matches:0,ranks:Array(players).fill(0),rankSum:0,hands:0,wins:0,dealIns:0,riichi:0,calls:0,winPoints:0,income:0,partialMatches:0};
  for(const record of records.filter(r=>r.players===players)){
    const mine=record.standings.find(p=>p.player===0);if(!mine)continue;
    out.matches++;out.ranks[mine.rank-1]++;out.rankSum+=mine.rank;out.income+=mine.result;if(record.partial)out.partialMatches++;
    for(const hand of record.hands){
      if(hand.result.kind==='abortive')continue;
      out.hands++;out.riichi+=Number(!!hand.flags?.[0]?.riichi);out.calls+=Number(!!hand.flags?.[0]?.called);
      const winner=hand.result.winners.find(w=>w.player===0);
      if(winner){out.wins++;out.winPoints+=winner.score.total||0;}
      if(hand.result.winners.some(w=>w.from===0))out.dealIns++; // Multiple ron is one deal-in hand.
    }
  }
  return {...out,averageRank:out.matches?out.rankSum/out.matches:0,topRate:out.matches?out.ranks[0]/out.matches:0,
    winRate:out.hands?out.wins/out.hands:0,dealInRate:out.hands?out.dealIns/out.hands:0,
    riichiRate:out.hands?out.riichi/out.hands:0,callRate:out.hands?out.calls/out.hands:0,
    averageWin:out.wins?out.winPoints/out.wins:0,income:Number(out.income.toFixed(1))};
}
export function validateSettings(data){
  assert(data&&typeof data==='object'&&!Array.isArray(data),'設定データが不正です。');
  const src=data.preferences||{},preferences={};
  for(const key of ['sound','noCall','autoWin','autoDiscard','analysis','tileNames'])if(typeof src[key]==='boolean')preferences[key]=src[key];
  if([.5,1,2,4].includes(src.speed))preferences.speed=src.speed;
  if(['table','top','player'].includes(src.view))preferences.view=src.view;
  if(Number.isFinite(src.volume))preferences.volume=Math.max(0,Math.min(1,src.volume));
  return {rules:normalizeRules(data.rules||{}),preferences};
}

/** Deterministic replay includes each decision's PRNG state, so AI tie breakers do not drift. */
export function replayGame(record,onState){
  const final=validateEnvelope(record.save).state;
  assert(!final.historyPartial&&final.engineVersion===ENGINE_VERSION,'旧版・部分履歴の再計算再生はできません。保存された局結果を表示します。');
  const game=new MahjongGame(final.rules,final.seed);onState?.(game.state);
  for(const entry of final.actionHistory){
    if(entry.rng!=null)game.state.rng=entry.rng;
    game.act(entry.action,entry.player);onState?.(game.state);
  }
  assert(game.state.players.every((p,i)=>p.score===final.players[i].score)&&game.state.phase===final.phase&&game.state.handId===final.handId,'再生結果が元の対局と一致しません。');
  game.validateState();return game;
}
