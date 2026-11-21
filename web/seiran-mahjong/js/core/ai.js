import { shanten, winningTiles } from './score.js';
import { countsOf, doraFromIndicator, isTerminalHonor } from './tiles.js';

import { AI_PERSONAS, personaById } from './personas.js';
export { AI_PERSONAS, personaById } from './personas.js';

const tileKey = ts=>ts.map(t=>t.type).sort((a,b)=>a-b).join(',');
const meldKey = ms=>ms.map(m=>`${m.kind}:${m.tiles[0]?.type}`).join('|');
const closed = p=>p.melds.every(m=>m.kind==='ankan');

/** A view containing only information this seat may legally observe. */
export function publicView(state, viewer=0) {
  return {
    rules:state.rules,viewer,phase:state.phase,turn:state.turn,dealer:state.dealer,
    roundWind:state.roundWind,handNumber:state.handNumber,honba:state.honba,
    remaining:state.remaining,riichiPot:state.riichiPot,
    doraIndicators:state.doraIndicators.map(t=>({...t})),
    lastDiscard:state.lastDiscard?{...state.lastDiscard,tile:{...state.lastDiscard.tile}}:null,
    response:state.response?{kind:state.response.kind,source:state.response.source}:null,
    players:state.players.map((p,i)=>({
      name:p.name,persona:p.persona,score:p.score,seatWind:p.seatWind,
      hand:(i===viewer||p.openRiichi||p.revealed)?p.hand.map(t=>({...t})):[],
      handCount:p.hand.length,melds:p.melds.map(m=>({...m,tiles:m.tiles.map(t=>({...t}))})),
      discards:p.discards.map(d=>({...d,tile:{...d.tile}})),nuki:p.nuki.map(t=>({...t})),
      riichi:p.riichi,riichiPending:p.riichiPending,openRiichi:p.openRiichi,
      ippatsu:p.ippatsu,drawnTileId:i===viewer?p.drawnTileId:null,
    })),
  };
}

export function visibleCounts(state, player) {
  const counts=new Array(34).fill(0);
  state.players.forEach((p,i)=>{
    if(i===player||p.openRiichi||p.revealed) for(const t of p.hand)counts[t.type]++;
    for(const m of p.melds)for(const t of m.tiles)counts[t.type]++;
    for(const d of p.discards)if(!d.called)counts[d.tile.type]++;
    for(const t of p.nuki)counts[t.type]++;
  });
  for(const t of state.doraIndicators)counts[t.type]++;
  return counts;
}

function opponentsThreat(state,player) {
  return state.players.map((p,i)=>i===player?0:p.riichi||p.riichiPending?1:
    p.openRiichi?1:p.melds.filter(m=>m.kind!=='ankan').length>=3?.68:
    p.melds.filter(m=>m.kind!=='ankan').length>=2?.35:
    state.remaining<16?.23:0);
}

/** Heuristic danger, not a claim to know another player's concealed hand. */
export function estimateDanger(state,player,type,reading=60,visible=visibleCounts(state,player)) {
  const threats=opponentsThreat(state,player);
  let combined=0;
  state.players.forEach((p,i)=>{
    if(i===player||!threats[i])return;
    const discards=new Set(p.discards.map(d=>d.tile.type));
    if(discards.has(type))return; // All own discards are genbutsu to that seat.
    if(p.openRiichi&&p.hand.length%3===1) {
      const waits=winningTiles(p.hand,p.melds,state.rules);
      combined=Math.max(combined,waits.includes(type)?1:0);
      return;
    }
    let risk=type>=27?.43:.74;
    const available=Math.max(0,4-visible[type]);
    if(type>=27)risk=available===0?.025:available===1?.11:available===2?.3:.55;
    else {
      const rank=type%9;
      if(rank===0||rank===8)risk*=.75;
      const base=type-rank;
      const low=rank>=3&&discards.has(type-3), high=rank<=5&&discards.has(type+3);
      const suji=(rank<=2&&high)||(rank>=6&&low)||(rank>=3&&rank<=5&&low&&high);
      if(suji)risk*=1-.46*reading/100;
      const left=rank>0&&visible[type-1]>=4;
      const right=rank<8&&visible[type+1]>=4;
      if((rank<=2&&right)||(rank>=6&&left)||(left&&right))risk*=1-.5*reading/100;
      const suitMelds=p.melds.filter(m=>m.tiles[0].type<27).map(m=>Math.floor(m.tiles[0].type/9));
      if(suitMelds.length>=2&&new Set(suitMelds).size===1) {
        risk*=Math.floor(type/9)===suitMelds[0]?1+.35*reading/100:.55;
      }
      // Discarding all four copies is safe only for pair waits; sequences still matter.
      if(available===0)risk*=.6;
      if(p.discards.length>=8&&p.discards.slice(0,6).some(d=>d.tile.type===base+rank))risk*=.65;
    }
    for(const d of state.doraIndicators) {
      const dt=state.rules.doraMode==='indicator'?d.type:doraFromIndicator(d.type,state.rules.players);
      if(type===dt)risk*=1.15;
    }
    combined=1-(1-combined)*(1-Math.min(.96,risk*threats[i]));
  });
  return Math.max(0,Math.min(1,combined));
}

function handValue(hand,melds,state,player,w) {
  const c=countsOf(hand), suits=[0,0,0];
  let value=0,pairs=0,dragonPairs=0,terminals=0,triples=0;
  for(const t of hand) {
    if(t.type<27)suits[Math.floor(t.type/9)]++;
    if(t.red&&state.rules.redDora)value+=w.dora*.09;
    for(const d of state.doraIndicators) {
      const type=state.rules.doraMode==='indicator'?d.type:doraFromIndicator(d.type,state.rules.players);
      if(state.rules.dora&&t.type===type)value+=w.dora*.09;
    }
  }
  for(let t=0;t<34;t++) {
    if(c[t]>=2)pairs++;
    if(c[t]>=3)triples++;
    if(c[t]&&isTerminalHonor(t))terminals++;
    if(t>=31&&c[t]>=2)dragonPairs++;
    if(c[t]>=2&&(t>=31||t===state.roundWind||t===state.players[player].seatWind))value+=w.value*.07;
  }
  for(const m of melds)if(m.tiles[0].type<27)suits[Math.floor(m.tiles[0].type/9)]+=3;
  const dominant=Math.max(...suits), offSuit=suits.reduce((a,b)=>a+b,0)-dominant;
  if(dominant>=6)value+=(dominant-offSuit*1.6)*w.flush*.085;
  value+=pairs*w.pairs*.095+triples*w.pairs*.06;
  if(melds.length===0&&terminals>=8)value+=(terminals-7)*w.yakuman*.35;
  if(dragonPairs>=2)value+=dragonPairs*w.yakuman*.15;
  if(triples>=2)value+=triples*w.yakuman*.12;
  return value;
}

function hasYakuPath(hand,melds,state,player) {
  if(!melds.some(m=>m.kind!=='ankan'))return true;
  const all=[...hand,...melds.flatMap(m=>m.tiles)], c=countsOf(hand);
  if(melds.some(m=>m.kind!=='chi'&&(m.tiles[0].type>=31||m.tiles[0].type===state.roundWind||m.tiles[0].type===state.players[player].seatWind)))return true;
  if([...Array(34).keys()].some(t=>c[t]>=2&&(t>=31||t===state.roundWind||t===state.players[player].seatWind)))return true;
  if(state.rules.kuitan&&all.filter(t=>isTerminalHonor(t.type)).length<=1)return true;
  if(new Set(all.filter(t=>t.type<27).map(t=>Math.floor(t.type/9))).size===1)return true;
  if(!melds.some(m=>m.kind==='chi')&&c.filter(n=>n>=2).length>=3)return true;
  return false;
}

/** Evaluate discard candidates using shanten, remaining visible acceptance and defense. */
export function analyzeHand(state,player=0,options={}) {
  const p=state.players[player],w=personaById(p.persona).weights, visible=visibleCounts(state,player);
  const memo=new Map(),mk=meldKey(p.melds);
  const st=tiles=>{const k=tileKey(tiles)+'|'+mk;if(!memo.has(k))memo.set(k,shanten(tiles,p.melds,state.rules));return memo.get(k);};
  const current=st(p.hand);
  if(p.hand.length%3!==2)return {shanten:current,ukeire:0,candidates:[],threat:Math.max(...opponentsThreat(state,player))};
  const candidates=[],byType=new Map();
  for(const tile of p.hand) {
    const key=`${tile.type}:${tile.red?'r':'n'}`;
    if(byType.has(key))continue;
    const after=p.hand.filter(t=>t.id!==tile.id),s=st(after);
    const candidate={tileId:tile.id,type:tile.type,red:tile.red,shanten:s,ukeire:0,accepts:[],danger:estimateDanger(state,player,tile.type,w.reading,visible),after};
    candidates.push(candidate);byType.set(key,candidate);
  }
  const bestShanten=Math.min(...candidates.map(c=>c.shanten));
  const threat=Math.max(...opponentsThreat(state,player));
  for(const c of candidates) {
    if(c.shanten<=bestShanten+(threat>.7&&w.defense>=90?1:0)) {
      for(let type=0;type<34;type++) {
        if(state.rules.players===3&&type>=1&&type<=7)continue;
        const n=Math.max(0,4-visible[type]);
        if(n&&st([...c.after,{id:-100-type,type,red:false}])<c.shanten) {c.ukeire+=n;c.accepts.push(type);}
      }
    }
    const value=handValue(c.after,p.melds,state,player,w);
    const late=state.remaining<25?1.3:1;
    const readyBonus=c.shanten===0?.38:c.shanten===1?.78:1.15;
    const fold=(w.defense>=95&&c.shanten>0?1.7:1)*readyBonus;
    c.utility=-c.shanten*(105+w.speed*1.5)+c.ukeire*(.35+w.speed*.021)+value
      -c.danger*threat*w.defense*5.6*fold*late;
    delete c.after;
  }
  candidates.sort((a,b)=>b.utility-a.utility||a.danger-b.danger||a.tileId-b.tileId);
  return {shanten:current,ukeire:candidates[0]?.ukeire||0,candidates,threat,bestShanten};
}

/** Pure seat decision. The caller supplies a sanitized publicView and legal actions. */
export function chooseAIAction(state,player,actions,random=()=>.5) {
  if(!actions.length)return null;
  const p=state.players[player],w=personaById(p.persona).weights;
  const win=actions.find(a=>a.type==='ron'||a.type==='tsumo');if(win)return win;
  const pass=actions.find(a=>a.type==='pass');
  if(state.phase==='response') {
    const before=shanten(p.hand,p.melds,state.rules),threat=Math.max(...opponentsThreat(state,player));
    let best=null,bestValue=-Infinity;
    for(const a of actions.filter(a=>['chi','pon','minkan'].includes(a.type))) {
      if(w.calls<15||threat>.7&&w.defense>85&&before>0)continue;
      const taken=p.hand.filter(t=>a.tileIds.includes(t.id));
      const hand=p.hand.filter(t=>!a.tileIds.includes(t.id));
      const melds=[...p.melds,{kind:a.type,tiles:[...taken,state.lastDiscard.tile],from:state.lastDiscard.player}];
      if(!hasYakuPath(hand,melds,state,player))continue;
      let after=Infinity;
      if(a.type==='minkan')after=shanten(hand,melds,state.rules);
      else for(const t of hand)if(!a.forbiddenTypes?.includes(t.type))after=Math.min(after,shanten(hand.filter(x=>x.id!==t.id),melds,state.rules));
      const gain=before-after;
      let value=gain*100+w.calls*.65-w.riichi*.33-(closed(p)?16:0)-threat*w.defense*.65;
      if(a.type==='pon'&&state.lastDiscard.tile.type>=31)value+=w.value*.25;
      if(a.type==='pon')value+=w.pairs*.14;
      if(w.flush>70&&state.lastDiscard.tile.type<27) {
        const suits=[0,0,0];for(const t of p.hand)if(t.type<27)suits[Math.floor(t.type/9)]++;
        if(Math.floor(state.lastDiscard.tile.type/9)===suits.indexOf(Math.max(...suits)))value+=22;
      }
      if(gain<0)value-=150;
      if(value>bestValue){bestValue=value;best=a;}
    }
    return best&&bestValue>14?best:pass||actions[0];
  }
  const nuki=actions.find(a=>a.type==='nuki');
  if(nuki) {
    const northCount=p.hand.filter(t=>t.type===30).length;
    if(!(northCount>=3&&state.roundWind===30&&w.value>85))return nuki;
  }
  const abort=actions.find(a=>a.type==='abort');
  if(abort) {
    const distinct=new Set(p.hand.filter(t=>isTerminalHonor(t.type)).map(t=>t.type)).size;
    if(distinct<11&&w.yakuman<80)return abort;
  }
  const analysis=analyzeHand(state,player);
  const kan=actions.find(a=>a.type==='ankan'||a.type==='kakan');
  if(kan&&!(analysis.threat>.6&&w.defense>45)&&state.remaining>7) {
    // Locked riichi kans already passed the engine's wait-invariance test.
    if(p.riichi||analysis.bestShanten<=1||w.dora>80||random()<.3)return kan;
  }
  const candidates=analysis.candidates;
  const findScore=a=>candidates.find(c=>c.tileId===a.tileId)||candidates.find(c=>p.hand.find(t=>t.id===a.tileId)?.type===c.type);
  const discards=actions.filter(a=>a.type==='discard');
  const bestDiscard=discards.sort((a,b)=>(findScore(b)?.utility??-1e6)-(findScore(a)?.utility??-1e6))[0];
  const riichis=actions.filter(a=>a.type==='riichi');
  if(riichis.length) {
    riichis.sort((a,b)=>(findScore(b)?.utility??-1e6)-(findScore(a)?.utility??-1e6));
    const r=riichis[0],c=findScore(r);
    const front=(c?.utility??0)>=(findScore(bestDiscard)?.utility??0)-12;
    if(front&&(w.riichi>=60||w.riichi>=35&&analysis.threat<.6&&random()<.65||state.remaining<14)) {
      const open=actions.find(a=>a.type==='openRiichi'&&a.tileId===r.tileId);
      if(open&&w.riichi>=95&&analysis.threat===0&&p.score>=state.rules.returnPoints&&random()<.2)return open;
      return r;
    }
  }
  return bestDiscard||actions.find(a=>a.type==='next')||actions[0];
}
