import { resolvePersonaChoices } from './personas.js';
import { normalizeRules } from './rules.js';
import { createTiles, countsOf, isTerminalHonor, tileName } from './tiles.js';
import { evaluateHand, isWinning, winningTiles, calculatePoints, guaranteedYakuBeforeWin, canRiichiKan } from './score.js';
import { AI_PERSONAS, personaById, chooseAIAction, publicView } from './ai.js';

const VERSION=2;
export const ENGINE_VERSION='1.2.0';
const clone=x=>JSON.parse(JSON.stringify(x));
const sortHand=ts=>ts.sort((a,b)=>a.type-b.type||Number(a.red)-Number(b.red)||a.id-b.id);
const isClosed=p=>p.melds.every(m=>m.kind==='ankan');
const sameSet=(a,b)=>a.length===b.length&&[...a].sort((x,y)=>x-y).every((v,i)=>v===[...b].sort((x,y)=>x-y)[i]);
const actionKey=a=>JSON.stringify([a.type,a.tileId??null,[...(a.tileIds||[])].sort((x,y)=>x-y),a.meldIndex??null,a.reason??null]);
const seatOrder=(source,n)=>Array.from({length:n-1},(_,i)=>(source+i+1)%n);
const localEnabled=(rules,id)=>rules.localYaku?.[id]===true||rules.localYaku?.[id]?.enabled===true;

function numericSeed(seed) {
  if(typeof seed==='number'&&Number.isFinite(seed))return (seed>>>0)||0x6d2b79f5;
  const text=String(seed??Date.now());let n=2166136261;
  for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}
  return (n>>>0)||0x6d2b79f5;
}

/** Deterministic, JSON-serializable Japanese mahjong state machine. */
export class MahjongGame {
  constructor(rules={},seed,{deferStart=false}={}) {
    const r=normalizeRules(rules),seedValue=numericSeed(seed);
    const personaIds=resolvePersonaChoices(r.aiPersonas,r.players,seedValue);
    this.state={
      version:VERSION,engineVersion:ENGINE_VERSION,rules:r,seed:seedValue,rng:seedValue,
      scoreHistory:[],handRecords:[],handStarts:[],historyPartial:false,
      players:Array.from({length:r.players},(_,i)=>({
        id:i===0?'human':`com-${i}`,
        name:i===0?'あなた':personaById(personaIds[i-1]).name,
        persona:i===0?'balanced':personaById(personaIds[i-1]).id,
        score:r.initialPoints,human:i===0,hand:[],melds:[],discards:[],nuki:[],
      })),
      phase:'discard',turn:0,dealer:0,initialDealer:0,roundIndex:0,roundWind:27,
      handNumber:1,honba:0,riichiPot:0,remaining:0,wall:[],deadWall:[],
      doraIndicators:[],uraIndicators:[],doraCount:1,pendingDoraCount:0,
      kanCount:0,kanOwners:[],rinshanCount:0,lastDiscard:null,lastDraw:null,
      result:null,response:null,pendingRiichi:null,interrupted:false,
      log:[],events:[],event:null,eventId:0,actionHistory:[],dice:[1,1],
      handId:0,completedHands:0,consecutiveDealerWins:0,standings:null,
      initialTotal:r.initialPoints*r.players,
    };
    this._prepareSeating();
    if(!deferStart)this.beginMatch(false);
  }

  _prepareSeating() {
    const s=this.state,n=s.rules.players;
    // Diffuse small numeric seeds before their first use in a seating draw.
    for(let i=0;i<8;i++)this._random();
    if(s.rules.seatSelection==='random') {
      // The camera stays with the human; shuffle the other participants, not their identities.
      for(let i=n-1;i>1;i--){const j=1+Math.floor(this._random()*i);[s.players[i],s.players[j]]=[s.players[j],s.players[i]];}
    }
    const roll=()=>[1+Math.floor(this._random()*6),1+Math.floor(this._random()*6)];
    const provisionalDice=roll(),dealerDice=roll();
    const provisionalDealer=(provisionalDice[0]+provisionalDice[1]-1)%n;
    const dealer=s.rules.dealerSelection==='fixed'?s.rules.fixedDealerSeat:(provisionalDealer+dealerDice[0]+dealerDice[1]-1)%n;
    s.dealer=dealer;s.initialDealer=dealer;s.turn=dealer;s.phase='seating';s.dice=dealerDice;
    s.setup={provisionalDice,dealerDice,provisionalDealer,dealer,seatSelection:s.rules.seatSelection,dealerSelection:s.rules.dealerSelection,
      seats:s.players.map((p,seat)=>({seat,id:p.id,name:p.name,persona:p.persona,wind:27+(seat-dealer+n)%n}))};
    s.players.forEach((p,i)=>{p.seatWind=27+(i-dealer+n)%n;});
    s.scoreHistory=[{handId:0,label:'開始',scores:s.players.map(p=>p.score),riichiPot:0,dealer,roundWind:27,handNumber:1,honba:0}];
    this._emit('seating',dealer,null,s.setup);
  }

  beginMatch(record=true) {
    if(this.state.phase!=='seating')throw new Error('席決めは終了しています。');
    // The seed reproduces seating without an action entry; replay starts immediately after setup.
    this._startHand();return this.state;
  }

  _random() {
    let x=this.state.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;
    this.state.rng=x>>>0;return (x>>>0)/4294967296;
  }

  _emit(type,player=null,tile=null,details={}) {
    const s=this.state,event={id:++s.eventId,type,player,tile:tile?{...tile}:null,details:clone(details)};
    s.event=event;s.events.push(event);if(s.events.length>32)s.events.shift();
    s.log.push({...event,handId:s.handId,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba});
    return event;
  }

  _startHand() {
    const s=this.state,n=s.rules.players;
    s.handId++;s.handStartScores=s.players.map(p=>p.score);s.handStartPot=s.riichiPot;s.result=null;s.response=null;s.pendingRiichi=null;s.standings=null;
    s.kanCount=0;s.kanOwners=[];s.rinshanCount=0;s.doraCount=1;s.pendingDoraCount=0;
    s.interrupted=false;s.lastDiscard=null;s.lastDraw=null;s.pendingFourKans=false;
    s.dice=[Math.floor(this._random()*6)+1,Math.floor(this._random()*6)+1];
    const tiles=createTiles(s.rules);
    for(let i=tiles.length-1;i>0;i--){const j=Math.floor(this._random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
    const breakOffset=((s.dice[0]+s.dice[1])*2)%tiles.length;
    const ordered=[...tiles.slice(breakOffset),...tiles.slice(0,breakOffset)];
    s.handStarts.push({handId:s.handId,dealer:s.dealer,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba,dice:[...s.dice],rng:s.rng,deck:ordered.map(t=>t.id)});
    s.deadWall=ordered.splice(-14);s.wall=ordered;
    for(let i=0;i<n;i++) {
      const p=s.players[i];Object.assign(p,{
        hand:[],melds:[],discards:[],nuki:[],riichi:false,riichiPending:false,doubleRiichi:false,
        openRiichi:false,ippatsu:false,riichiFuriten:false,temporaryFuriten:false,
        discardFuriten:false,riichiWaits:[],drawnTileId:null,drawCount:0,discardCount:0,
        seatWind:27+(i-s.dealer+n)%n,forbiddenTypes:[],pao:{},revealed:false,firstCallEvidence:null,
      });
    }
    // Traditional groups of four, repeated three times, then the thirteenth tile.
    for(let batch=0;batch<3;batch++)for(let j=0;j<n;j++) {
      const p=s.players[(s.dealer+j)%n];p.hand.push(...s.wall.splice(0,4));
    }
    for(let j=0;j<n;j++)s.players[(s.dealer+j)%n].hand.push(s.wall.shift());
    for(const p of s.players)sortHand(p.hand);
    s.phase='discard';s.turn=s.dealer;this._syncIndicators();
    this._emit('deal',s.dealer,null,{dice:s.dice,players:n,roundWind:s.roundWind,handNumber:s.handNumber});
    this._draw(s.dealer,'wall');
  }

  _syncIndicators() {
    const s=this.state;
    s.doraIndicators=Array.from({length:s.doraCount},(_,i)=>s.deadWall[4+i*2]);
    s.uraIndicators=Array.from({length:s.doraCount},(_,i)=>s.deadWall[5+i*2]);
    s.remaining=s.wall.length;
  }

  _draw(player,source='wall',kanInfo=null) {
    const s=this.state,p=s.players[player];
    if(!s.wall.length)return this._exhaustiveDraw();
    let tile;
    if(source==='rinshan') {
      if(s.rinshanCount>=4)throw new Error('嶺上牌は4枚までです。');
      tile=s.deadWall[s.rinshanCount];
      s.deadWall[s.rinshanCount]=s.wall.pop();s.rinshanCount++;
    } else tile=s.wall.shift();
    p.hand.push(tile);sortHand(p.hand);p.drawnTileId=tile.id;p.drawCount++;
    p.temporaryFuriten=false;p.forbiddenTypes=[];
    s.turn=player;s.phase='discard';s.response=null;
    s.lastDraw={player,tile,source,kanDoraIndex:kanInfo?.doraIndex??null};
    this._syncIndicators();this._updateFuriten(player);
    this._emit('draw',player,tile,{source,remaining:s.remaining});
  }

  _context(player,tsumo,extra={}) {
    const s=this.state,p=s.players[player],r=s.rules;
    const response=s.response,chankan=!!response&&['kakan','ankan'].includes(response.kind);
    let active=[...s.doraIndicators],ura=[...s.uraIndicators];
    let pending=null,pendingUra=null;
    if(tsumo&&s.lastDraw?.source==='rinshan'&&s.lastDraw.kanDoraIndex!=null) {
      const i=s.lastDraw.kanDoraIndex;
      // The scorer applies rinshanKanDora consistently for visible and deferred indicators.
      pending=s.deadWall[4+2*i];pendingUra=s.deadWall[5+2*i];
      active=active.filter(t=>t.id!==pending?.id);ura=ura.filter(t=>t.id!==pendingUra?.id);
    } else if(chankan) {
      const i=s.doraCount+s.pendingDoraCount;
      if(i<5){pending=s.deadWall[4+2*i];pendingUra=s.deadWall[5+2*i];}
    }
    const sourcePlayer=response?.source??s.lastDiscard?.player;
    const context={
      tsumo,riichi:!!p.riichi,doubleRiichi:!!p.doubleRiichi,openRiichi:!!p.openRiichi,
      ippatsu:!!p.ippatsu&&r.ippatsu,rinshan:tsumo&&s.lastDraw?.source==='rinshan',
      chankan,haitei:tsumo&&s.wall.length===0&&s.lastDraw?.source==='wall',
      houtei:!tsumo&&!chankan&&s.wall.length===0&&s.lastDiscard?.afterNormalDraw===true,
      seatWind:p.seatWind,roundWind:s.roundWind,dealer:player===s.dealer,
      doraIndicators:active,uraIndicators:ura,pendingKanDoraIndicator:pending,pendingKanUraIndicator:pendingUra,
      nuki:p.nuki.length,honba:s.honba,firstTurn:p.discardCount===0,
      uninterrupted:!s.interrupted,renhou:!tsumo&&p.drawCount===0&&!s.interrupted&&player!==s.dealer,
      consecutiveWins:s.consecutiveDealerWins,
      lastDiscardRiichi:!!s.lastDiscard?.riichi,lastDiscardAfterKan:!!s.lastDiscard?.afterKan,
      discarderRiichi:sourcePlayer!=null?!!s.players[sourcePlayer].riichi:undefined,
      firstCallEvidence:p.firstCallEvidence||undefined,
      ...extra,
    };
    if(r.atozuke!=='allowed') {
      const tile=tsumo?p.hand.find(t=>t.id===p.drawnTileId):response?.tile||s.lastDiscard?.tile;
      if(tile&&isWinning(tsumo?p.hand:[...p.hand,tile],p.melds,r)) {
        const before=tsumo?p.hand.filter(t=>t.id!==tile.id):p.hand;
        const ids=guaranteedYakuBeforeWin({tiles:before,melds:p.melds,context,rules:r});
        context.guaranteedYakuIds=ids;context.yakuEstablishedBeforeWin=ids.length>0;
      }
    }
    return context;
  }

  _evaluate(player,tsumo,tile,extra={}) {
    const p=this.state.players[player];
    return evaluateHand({tiles:tsumo?p.hand:[...p.hand,tile],melds:p.melds,winTile:tile,context:this._context(player,tsumo,extra),rules:this.state.rules});
  }

  _updateFuriten(player) {
    const s=this.state,p=s.players[player];
    const hand=p.hand.length%3===2&&p.drawnTileId!=null?p.hand.filter(t=>t.id!==p.drawnTileId):p.hand;
    const waits=hand.length%3===1?winningTiles(hand,p.melds,s.rules):[];
    const discarded=new Set(p.discards.map(d=>d.tile.type));
    p.discardFuriten=waits.some(t=>discarded.has(t));
    return p.discardFuriten||p.temporaryFuriten||p.riichiFuriten;
  }

  _canRon(player,tile,kind='discard') {
    const s=this.state,p=s.players[player];
    if(p.hand.length%3!==1||this._updateFuriten(player))return null;
    const scored=this._evaluate(player,false,tile);
    if(!scored.valid)return null;
    if(kind==='ankan'&&(!s.rules.kokushiAnkanRob||!scored.yaku.some(y=>y.id==='kokushi'||y.id==='kokushi13')))return null;
    return scored;
  }

  _discardActions(player) {
    const s=this.state,p=s.players[player],r=s.rules;
    if(player!==s.turn||s.phase!=='discard')return [];
    const actions=[],drawn=p.hand.find(t=>t.id===p.drawnTileId);
    if(drawn) {
      const score=this._evaluate(player,true,drawn);
      if(score.valid)actions.push({type:'tsumo',tileId:drawn.id,label:'ツモ'});
    }
    for(const tile of p.hand) {
      if(p.riichi&&tile.id!==p.drawnTileId)continue;
      if(p.forbiddenTypes.includes(tile.type))continue;
      actions.push({type:'discard',tileId:tile.id,label:`${tileName(tile)}を切る`});
    }
    if(!p.riichi&&isClosed(p)&&s.remaining>=r.players) {
      for(const tile of p.hand) {
        if(p.forbiddenTypes.includes(tile.type))continue;
        const hand=p.hand.filter(t=>t.id!==tile.id),waits=winningTiles(hand,p.melds,r);
        if(!waits.length)continue;
        if(p.score>=1000)actions.push({type:'riichi',tileId:tile.id,label:'リーチ'});
        if(r.openRiichi&&p.score>=r.openRiichiCost)actions.push({type:'openRiichi',tileId:tile.id,label:'オープンリーチ'});
      }
    }
    if(s.remaining>0&&s.kanCount<4&&p.drawnTileId!=null) {
      const c=countsOf(p.hand);
      for(let type=0;type<34;type++)if(c[type]===4) {
        const group=p.hand.filter(t=>t.type===type);
        if(p.riichi) {
          if(drawn?.type!==type)continue;
          const waits=winningTiles(p.hand.filter(t=>t.type!==type),[...p.melds,{kind:'ankan',tiles:group,from:player,calledTileId:null}],r);
          if(!sameSet(waits,p.riichiWaits))continue;
          if(!canRiichiKan({beforeTiles:p.hand.filter(t=>t.id!==p.drawnTileId),melds:p.melds,kanType:type,rules:r}))continue;
        }
        actions.push({type:'ankan',tileIds:group.map(t=>t.id),label:`${tileName(type)}・暗槓`});
      }
      if(!p.riichi)p.melds.forEach((meld,meldIndex)=>{
        if(meld.kind!=='pon')return;
        for(const tile of p.hand)if(tile.type===meld.tiles[0].type)actions.push({type:'kakan',tileId:tile.id,meldIndex,label:`${tileName(tile)}・加槓`});
      });
    }
    if(r.players===3&&r.nuki&&s.remaining>0&&p.drawnTileId!=null) {
      for(const tile of p.hand)if(tile.type===30&&(!p.riichi||tile.id===p.drawnTileId))actions.push({type:'nuki',tileId:tile.id,label:'北を抜く'});
    }
    if(r.nineTerminalsDraw&&!s.interrupted&&p.discardCount===0&&new Set(p.hand.filter(t=>isTerminalHonor(t.type)).map(t=>t.type)).size>=9)actions.push({type:'abort',reason:'nineTerminals',label:'九種九牌'});
    return actions;
  }

  _responseActions(player,ignoreChoice=false) {
    const s=this.state,response=s.response,p=s.players[player],r=s.rules;
    if(!response||s.phase!=='response'||player===response.source||(!ignoreChoice&&Object.hasOwn(response.choices,player)))return [];
    const tile=response.tile,actions=[];
    if(this._canRon(player,tile,response.kind))actions.push({type:'ron',tileId:tile.id,label:'ロン'});
    if(response.kind==='discard'&&!p.riichi&&s.remaining>0) {
      const matches=p.hand.filter(t=>t.type===tile.type);
      const combinations=[];
      for(let a=0;a<matches.length;a++)for(let b=a+1;b<matches.length;b++)combinations.push([matches[a],matches[b]]);
      const seen=new Set();
      for(const pair of combinations) {
        const key=pair.map(t=>t.red?'r':'n').sort().join('');if(seen.has(key))continue;seen.add(key);
        const forbidden=[tile.type];
        if(p.hand.some(t=>!pair.some(a=>a.id===t.id)&&!forbidden.includes(t.type)))actions.push({type:'pon',tileIds:pair.map(t=>t.id),forbiddenTypes:forbidden,label:'ポン'});
      }
      if(matches.length===3&&s.kanCount<4)actions.push({type:'minkan',tileIds:matches.map(t=>t.id),label:'大明槓'});
      if(r.players===4&&player===(response.source+1)%r.players&&tile.type<27) {
        const rank=tile.type%9,base=tile.type-rank;
        for(let start=Math.max(0,rank-2);start<=Math.min(6,rank);start++) {
          const needed=[base+start,base+start+1,base+start+2].filter(t=>t!==tile.type);
          const lists=needed.map(t=>p.hand.filter(x=>x.type===t));
          for(const x of lists[0])for(const y of lists[1]) {
            const comboKey=`${start}:${x.red}:${y.red}`;if(seen.has(comboKey))continue;seen.add(comboKey);
            const forbidden=[];
            for(let t=base;t<base+9;t++) {
              const kinds=[needed[0],needed[1],t].sort((a,b)=>a-b);
              if(kinds[0]+1===kinds[1]&&kinds[1]+1===kinds[2])forbidden.push(t);
            }
            if(p.hand.some(t=>t.id!==x.id&&t.id!==y.id&&!forbidden.includes(t.type)))actions.push({type:'chi',tileIds:[x.id,y.id],forbiddenTypes:forbidden,label:`チー ${[...needed,tile.type].sort((a,b)=>a-b).map(t=>t%9+1).join('')}`});
          }
        }
      }
    }
    if(actions.length)actions.push({type:'pass',label:'見送る'});
    return actions;
  }

  getActions(player=0) {
    if(!Number.isInteger(player)||player<0||player>=this.state.rules.players)return [];
    if(this.state.phase==='handEnd')return player===0?[{type:'next',label:'次の局へ'}]:[];
    if(this.state.phase==='matchEnd')return [];
    return this.state.phase==='response'?this._responseActions(player):this._discardActions(player);
  }

  act(action,player=0) {
    const legal=this.getActions(player),selected=legal.find(a=>actionKey(a)===actionKey(action));
    if(!selected)throw new Error('この局面では選べない操作です。');
    this.state.actionHistory.push({handId:this.state.handId,player,rng:this.state.rng,action:clone(selected)});
    if(selected.type==='next'){this.nextHand(false);return this.state;}
    if(this.state.phase==='response') {
      const s=this.state,offered=legal.some(a=>a.type==='ron');
      const p=s.players[player],res=s.response;
      const skippedShape=res.kind!=='ankan'&&isWinning([...p.hand,res.tile],p.melds,s.rules);
      if((offered||skippedShape)&&selected.type!=='ron')this._missedRon(player);
      s.response.choices[player]=clone(selected);
      this._resolveResponseIfReady();
      return s;
    }
    switch(selected.type) {
      case 'discard':this._discard(player,selected.tileId);break;
      case 'riichi':case 'openRiichi':this._declareRiichi(player,selected);break;
      case 'tsumo':this._win([player],player,true);break;
      case 'ankan':case 'kakan':this._beginKan(player,selected);break;
      case 'nuki':this._nuki(player,selected.tileId);break;
      case 'abort':this._abortiveDraw(selected.reason);break;
      default:throw new Error('未知の操作です。');
    }
    return this.state;
  }

  _declareRiichi(player,action) {
    const s=this.state,p=s.players[player],open=action.type==='openRiichi';
    s.pendingRiichi={player,open,cost:open?s.rules.openRiichiCost:1000,double:s.rules.doubleRiichi&&p.discardCount===0&&!s.interrupted,
      waits:winningTiles(p.hand.filter(t=>t.id!==action.tileId),p.melds,s.rules)};
    p.riichiPending=true;
    this._emit(action.type,player,p.hand.find(t=>t.id===action.tileId),{cost:s.pendingRiichi.cost});
    this._discard(player,action.tileId,true);
  }

  _commitRiichi() {
    const s=this.state,decl=s.pendingRiichi;if(!decl)return;
    const p=s.players[decl.player];p.score-=decl.cost;s.riichiPot+=decl.cost/1000;
    p.riichi=true;p.riichiPending=false;p.doubleRiichi=decl.double;p.openRiichi=decl.open;
    p.ippatsu=!!s.rules.ippatsu;p.riichiWaits=decl.waits;s.pendingRiichi=null;
  }

  _discard(player,tileId,declaration=false) {
    const s=this.state,p=s.players[player],index=p.hand.findIndex(t=>t.id===tileId);
    if(index<0)throw new Error('手牌にない牌です。');
    if(p.riichi&&!declaration) {
      // Declining a winning draw locks later ron, while later tsumo remains possible.
      const drawn=p.hand.find(t=>t.id===p.drawnTileId);
      if(drawn&&this._evaluate(player,true,drawn).valid)p.riichiFuriten=true;
      p.ippatsu=false;
    }
    const [tile]=p.hand.splice(index,1);
    const discard={tile,riichi:declaration,called:false,tsumogiri:tileId===p.drawnTileId};
    p.discards.push(discard);p.discardCount++;p.drawnTileId=null;p.forbiddenTypes=[];
    s.lastDiscard={player,tile,riichi:declaration,afterKan:s.lastDraw?.player===player&&s.lastDraw?.source==='rinshan',afterNormalDraw:s.lastDraw?.player===player&&s.lastDraw?.source==='wall'};
    if(s.pendingDoraCount){s.doraCount=Math.min(5,s.doraCount+s.pendingDoraCount);s.pendingDoraCount=0;this._syncIndicators();}
    this._updateFuriten(player);this._emit('discard',player,tile,{riichi:declaration,tsumogiri:discard.tsumogiri});
    this._beginResponse('discard',player,tile);
  }

  _beginResponse(kind,source,tile,kanAction=null) {
    const s=this.state;s.phase='response';s.response={kind,source,tile,kanAction:kanAction?clone(kanAction):null,choices:{}};
    for(const player of seatOrder(source,s.rules.players)) {
      const actions=this._responseActions(player,true);
      if(!actions.length) {
        // An otherwise complete shape missed without a yaku is also same-turn furiten.
        if(kind!=='ankan'&&s.players[player].hand.length%3===1&&isWinning([...s.players[player].hand,tile],s.players[player].melds,s.rules))this._missedRon(player);
        s.response.choices[player]={type:'pass',automatic:true};
      }
    }
    this._resolveResponseIfReady();
  }

  _missedRon(player) {
    const p=this.state.players[player];p.temporaryFuriten=true;if(p.riichi)p.riichiFuriten=true;
  }

  _resolveResponseIfReady() {
    const s=this.state,res=s.response;if(!res)return;
    const order=seatOrder(res.source,s.rules.players);
    if(order.some(i=>!Object.hasOwn(res.choices,i)))return;
    let rons=order.filter(i=>res.choices[i].type==='ron');
    if(rons.length) {
      if(rons.length===3&&s.rules.tripleRonDraw){this._commitRiichi();this._abortiveDraw('tripleRon');return;}
      if(s.rules.simultaneousRon==='headBump')rons=rons.slice(0,1);
      // A riichi declaration which is immediately won on never takes its deposit.
      if(s.pendingRiichi){s.players[s.pendingRiichi.player].riichiPending=false;s.pendingRiichi=null;}
      if(res.kind!=='discard') {
        const p=s.players[res.source],index=p.hand.findIndex(t=>t.id===res.tile.id);
        if(index<0)throw new Error('搶槓牌の実体が見つかりません。');
        p.hand.splice(index,1);p.drawnTileId=null;
        p.discards.push({tile:res.tile,riichi:false,called:false,robbed:true});
        s.lastDiscard={player:res.source,tile:res.tile,riichi:false,afterKan:false,afterNormalDraw:false,robbed:true};
      }
      this._win(rons,res.source,false);return;
    }
    this._commitRiichi();
    if(res.kind==='ankan'||res.kind==='kakan'){s.response=null;this._performKan(res.source,res.kanAction);return;}
    const priority=order.filter(i=>['pon','minkan'].includes(res.choices[i].type));
    const calls=priority.length?priority:order.filter(i=>res.choices[i].type==='chi');
    if(calls.length){const player=calls[0],action=res.choices[player];s.response=null;this._call(player,res.source,res.tile,action);return;}
    s.response=null;
    if(s.pendingFourKans){this._abortiveDraw('fourKans');return;}
    if(s.rules.fourRiichiDraw&&s.players.every(p=>p.riichi)){this._abortiveDraw('fourRiichi');return;}
    if(s.rules.players===4&&s.rules.fourWindsDraw&&!s.interrupted&&s.players.every(p=>p.discards.length===1)) {
      const types=s.players.map(p=>p.discards[0].tile.type);
      if(types.every(t=>t===types[0])&&types[0]>=27&&types[0]<=30){this._abortiveDraw('fourWinds');return;}
    }
    if(!s.wall.length){this._exhaustiveDraw();return;}
    this._draw((res.source+1)%s.rules.players);
  }

  _interruptIppatsu() {this.state.interrupted=true;for(const p of this.state.players)p.ippatsu=false;}

  _call(player,source,tile,action) {
    const s=this.state,p=s.players[player],used=p.hand.filter(t=>action.tileIds.includes(t.id));
    if(used.length!==action.tileIds.length)throw new Error('副露する牌が足りません。');
    p.hand=p.hand.filter(t=>!action.tileIds.includes(t.id));
    const meld={kind:action.type,tiles:sortHand([...used,tile]),from:source,calledTileId:tile.id};
    const firstOpen=isClosed(p);
    p.melds.push(meld);p.drawnTileId=null;
    if(firstOpen)p.firstCallEvidence={hand:clone(p.hand),melds:clone(p.melds),firstMeldIndex:p.melds.length-1,firstMeldType:tile.type,kind:action.type};
    const discarded=s.players[source].discards.find(d=>d.tile.id===tile.id);discarded.called=true;discarded.calledBy=player;
    this._interruptIppatsu();this._recordPao(player,source,meld);
    s.turn=player;s.phase='discard';p.forbiddenTypes=action.forbiddenTypes||[];
    this._emit(action.type,player,tile,{from:source,tiles:meld.tiles});
    if(action.type==='minkan')this._completeKan(player,'minkan');
    else this._updateFuriten(player);
  }

  _recordPao(player,source,newMeld) {
    const p=this.state.players[player];if(!this.state.rules.pao||newMeld.kind==='chi')return;
    const triplets=p.melds.filter(m=>m.kind!=='chi').map(m=>m.tiles[0].type);
    if(newMeld.tiles[0].type>=31&&[31,32,33].every(t=>triplets.includes(t)))p.pao.daisangen=source;
    if(newMeld.tiles[0].type>=27&&newMeld.tiles[0].type<=30&&[27,28,29,30].every(t=>triplets.includes(t)))p.pao.daisuushii=source;
  }

  _beginKan(player,action) {
    const s=this.state,p=s.players[player];
    const tile=action.type==='kakan'?p.hand.find(t=>t.id===action.tileId):p.hand.find(t=>t.id===action.tileIds[0]);
    this._emit('kanDeclared',player,tile,{kind:action.type,tileIds:action.tileIds||[action.tileId]});
    this._beginResponse(action.type,player,tile,action);
  }

  _performKan(player,action) {
    const s=this.state,p=s.players[player];
    let tile;
    if(action.type==='ankan') {
      const tiles=p.hand.filter(t=>action.tileIds.includes(t.id));tile=tiles[0];
      p.hand=p.hand.filter(t=>!action.tileIds.includes(t.id));
      p.melds.push({kind:'ankan',tiles:sortHand(tiles),from:player,calledTileId:null});
    } else {
      const index=p.hand.findIndex(t=>t.id===action.tileId);[tile]=p.hand.splice(index,1);
      const meld=p.melds[action.meldIndex];meld.kind='kakan';meld.tiles.push(tile);meld.addedTileId=tile.id;
    }
    p.drawnTileId=null;this._interruptIppatsu();
    this._emit(action.type,player,tile,{tiles:action.tileIds||[action.tileId]});
    this._completeKan(player,action.type);
  }

  _completeKan(player,kind) {
    const s=this.state;s.kanCount++;s.kanOwners.push(player);
    let doraIndex=null;
    if(s.rules.kanDora) {
      // A second consecutive kan establishes the preceding deferred indicator.
      // This keeps the visible indicator sequence contiguous in the dead wall.
      if(s.pendingDoraCount){s.doraCount+=s.pendingDoraCount;s.pendingDoraCount=0;}
      doraIndex=s.doraCount+s.pendingDoraCount;
      // Concealed kans always expose immediately; open-kan timing is configurable.
      if(kind==='ankan'||s.rules.kanDoraTiming==='immediate')s.doraCount++;
      else s.pendingDoraCount++;
    }
    s.pendingFourKans=!!s.rules.fourKansDraw&&s.kanCount===4&&new Set(s.kanOwners).size>1;
    this._draw(player,'rinshan',{doraIndex});
  }

  _nuki(player,tileId) {
    const s=this.state,p=s.players[player],index=p.hand.findIndex(t=>t.id===tileId);
    const [tile]=p.hand.splice(index,1);p.nuki.push(tile);p.drawnTileId=null;s.interrupted=true;
    if(s.rules.nukiBreakIppatsu)for(const q of s.players)q.ippatsu=false;
    this._emit('nuki',player,tile,{count:p.nuki.length});
    this._draw(player,'nuki');
  }

  _paymentsForWinner(winner,source,tsumo,score) {
    const s=this.state,n=s.rules.players,deltas=new Array(n).fill(0),p=s.players[winner];
    const pay=(from,amount)=>{amount=Math.round(amount);if(amount<=0||from===winner)return;deltas[from]-=amount;deltas[winner]+=amount;};
    let pao=[];
    if(s.rules.pao&&score.yakuman>0) {
      let available=score.yakuman;
      for(const y of score.yaku)if(p.pao[y.id]!=null&&available>0) {
        const units=Math.min(available,y.yakuman||1);pao.push({player:p.pao[y.id],units,id:y.id});available-=units;
      }
    }
    const liable=pao.reduce((a,x)=>a+x.units,0),normalRatio=score.yakuman>0?(score.yakuman-liable)/score.yakuman:1;
    if(tsumo) {
      for(let i=0;i<n;i++)if(i!==winner) {
        const points=(winner===s.dealer||i===s.dealer)?score.payments.tsumoDealer:score.payments.tsumoNonDealer;
        pay(i,points*normalRatio);
      }
      for(const item of pao)pay(item.player,item.units*8000*(winner===s.dealer?6:4));
      if(pao.length&&normalRatio===0)pay(pao[0].player,s.honba*100*(n-1));
      else for(let i=0;i<n;i++)if(i!==winner)pay(i,s.honba*100);
    } else {
      pay(source,score.payments.ron*normalRatio);
      for(const item of pao) {
        const amount=item.units*8000*(winner===s.dealer?6:4);
        if(item.player===source)pay(source,amount);else {pay(source,amount/2);pay(item.player,amount/2);}
      }
      pay(source,s.honba*300);
    }
    return {deltas,pao};
  }

  _win(winners,source,tsumo,providedScores=null) {
    const s=this.state,n=s.rules.players,changes=new Array(n).fill(0),results=[],potBefore=s.riichiPot;
    const tile=tsumo?s.players[source].hand.find(t=>t.id===s.players[source].drawnTileId):s.response?.tile||s.lastDiscard?.tile;
    for(const player of winners) {
      const score=providedScores?.[player]||this._evaluate(player,tsumo,tile);
      if(!score.valid)throw new Error(`和了判定が一致しません: ${score.reason||'役なし'}`);
      const {deltas,pao}=this._paymentsForWinner(player,source,tsumo,score);
      for(let i=0;i<n;i++)changes[i]+=deltas[i];
      const p=s.players[player];p.revealed=true;
      results.push({player,from:tsumo?null:source,score,tiles:sortHand(tsumo?[...p.hand]:[...p.hand,tile]),melds:clone(p.melds),pao,winTile:tile?clone(tile):null,paymentDeltas:[...deltas],deposit:0,context:clone(this._context(player,tsumo)),nuki:clone(p.nuki)});
    }
    if(s.riichiPot) {results[0].deposit=s.riichiPot*1000;changes[winners[0]]+=s.riichiPot*1000;s.riichiPot=0;}
    for(let i=0;i<n;i++)s.players[i].score+=changes[i];
    const continueDealer=winners.includes(s.dealer);
    s.consecutiveDealerWins=continueDealer?s.consecutiveDealerWins+1:0;
    s.result={kind:tsumo?'tsumo':'ron',title:providedScores?'流し満貫':tsumo?'ツモ和了':'ロン和了',reason:providedScores?'nagashiMangan':null,
      winners:results,tenpai:[],deltas:changes,continueDealer,riichiPotBefore:potBefore};
    this._emit(tsumo?'tsumo':'ron',winners[0],tile,{winners,deltas:changes,nagashi:!!providedScores});
    this._finishHand();
  }

  _exhaustiveDraw() {
    const s=this.state,n=s.rules.players;
    if(localEnabled(s.rules,'nagashiMangan')) {
      const override=s.rules.yakuOverrides.nagashiMangan||{};
      const required=s.rules.twoHanHonbaThreshold>0&&s.honba>=s.rules.twoHanHonbaThreshold?2:1;
      const nagashi=s.players.flatMap((p,i)=>{
        const han=override[isClosed(p)?'closed':'open']??5,yakuman=override.yakuman||0;
        return (yakuman>0||han>=required)&&p.discards.length>0&&p.discards.every(d=>isTerminalHonor(d.tile.type)&&!d.called)
          &&(s.rules.nagashiManganAllowsCalls||isClosed(p))?[i]:[];
      });
      if(nagashi.length) {
        const scores={};
        for(const player of nagashi) {
          const p=s.players[player],yakuman=override.yakuman||0,han=yakuman?0:override[isClosed(p)?'closed':'open']??5;
          const context=this._context(player,true),calc=calculatePoints(han,30,yakuman,context,s.rules);
          scores[player]={valid:true,han,yakuHan:han,fu:30,yakuman,yaku:[{id:'nagashiMangan',name:'流し満貫',han,yakuman}],dora:{omote:0,ura:0,red:0,nuki:0,total:0},...calc};
        }
        this._win(nagashi,nagashi[0],true,scores);return;
      }
    }
    const tenpai=s.players.flatMap((p,i)=>winningTiles(p.hand,p.melds,s.rules).length?[i]:[]);
    const deltas=new Array(n).fill(0);
    if(tenpai.length>0&&tenpai.length<n) {
      // Custom noten totals can fail to divide evenly. Allocate whole 100-point
      // sticks and distribute the remainder in initial seating order.
      const order=Array.from({length:n},(_,i)=>(s.initialDealer+i)%n);
      const split=(seats,sign)=>{
        const units=Math.round(s.rules.notenPenalty/100),base=Math.floor(units/seats.length),remainder=units%seats.length;
        seats.forEach((i,k)=>{deltas[i]=sign*(base+(k<remainder?1:0))*100;});
      };
      split(order.filter(i=>tenpai.includes(i)),1);split(order.filter(i=>!tenpai.includes(i)),-1);
    }
    for(let i=0;i<n;i++){s.players[i].score+=deltas[i];s.players[i].revealed=tenpai.includes(i);}
    const continueDealer=s.rules.dealerContinuation==='alwaysDraw'||s.rules.dealerContinuation!=='winOnly'&&(!s.rules.drawTenpaiRequired||tenpai.includes(s.dealer));
    s.consecutiveDealerWins=0;
    s.result={kind:'exhaustive',title:'流局',reason:'wallExhausted',winners:[],tenpai,deltas,continueDealer};
    this._emit('exhaustiveDraw',null,null,{tenpai,deltas});this._finishHand();
  }

  _abortiveDraw(reason) {
    const s=this.state,names={nineTerminals:'九種九牌',fourWinds:'四風連打',fourKans:'四槓散了',fourRiichi:s.rules.players===3?'三家立直':'四家立直',tripleRon:'三家和'};
    s.consecutiveDealerWins=0;
    s.result={kind:'abortive',title:names[reason]||'途中流局',reason,winners:[],tenpai:[],deltas:new Array(s.rules.players).fill(0),continueDealer:!!s.rules.abortiveDealerRepeat};
    this._emit('abortiveDraw',null,null,{reason});this._finishHand();
  }

  _endReason() {
    const s=this.state,r=s.rules,result=s.result;
    if(r.bankruptcy&&s.players.some(p=>p.score<r.bankruptcyLimit))return '飛び終了';
    const rounds=r.length==='east'?1:r.length==='south'?2:4;
    const last=s.roundIndex>=rounds-1&&s.handNumber===r.players;
    const extension=s.roundIndex>=rounds;
    const top=this._rankedPlayers()[0],target=s.players[top].score>=r.returnPoints;
    if(extension&&target&&(result.winners.length>0||!result.continueDealer))return '延長戦の目標点到達';
    if(last&&result.continueDealer&&top===s.dealer&&target) {
      if(result.winners.some(w=>w.player===s.dealer)&&r.agariYame)return '親の和了止め';
      if(result.kind==='exhaustive'&&r.tenpaiYame)return '親の聴牌止め';
    }
    if(last&&!result.continueDealer) {
      if(target||!r.westExtension)return '規定の対局終了';
      if(s.roundIndex+1>=rounds+r.maxExtraRounds)return '延長上限';
    }
    return null;
  }

  _finishHand() {
    const s=this.state;s.phase='handEnd';s.response=null;s.pendingRiichi=null;s.completedHands++;
    const reason=this._endReason();
    if(reason)this._finishMatch(reason);
    else this._emit('handEnd',null,null,{result:s.result.kind});
    this._recordHand();
  }

  _recordHand() {
    const s=this.state;
    if(s.handRecords.some(h=>h.handId===s.handId))return;
    const flags=s.players.map(p=>({riichi:!!p.riichi,called:p.melds.some(m=>m.kind!=='ankan')}));
    const label=`${['東','南','西','北'][s.roundWind-27]}${s.handNumber}局 ${s.honba}本場`;
    const scores=s.players.map(p=>p.score),before=s.handStartScores||scores;
    s.handRecords.push({handId:s.handId,label,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba,dealer:s.dealer,
      scoresBefore:[...before],potBefore:s.handStartPot||0,scores:[...scores],riichiPot:s.riichiPot,
      netDeltas:scores.map((v,i)=>v-before[i]),result:clone(s.result),flags,
      doraIndicators:clone(s.doraIndicators),uraIndicators:clone(s.uraIndicators)});
    s.scoreHistory.push({handId:s.handId,label,scores,riichiPot:s.riichiPot,dealer:s.dealer,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba});
  }

  _rankedPlayers() {
    const s=this.state,n=s.rules.players;
    return Array.from({length:n},(_,i)=>i).sort((a,b)=>s.players[b].score-s.players[a].score||(a-s.initialDealer+n)%n-(b-s.initialDealer+n)%n);
  }

  _finishMatch(reason) {
    const s=this.state,r=s.rules,order=this._rankedPlayers();
    if(s.riichiPot){s.players[order[0]].score+=s.riichiPot*1000;s.result.deltas[order[0]]+=s.riichiPot*1000;s.riichiPot=0;}
    const oka=r.oka?(r.returnPoints-r.initialPoints)*r.players/1000:0;
    s.standings=order.map((player,index)=>({player,name:s.players[player].name,score:s.players[player].score,rank:index+1,
      uma:r.uma[index]||0,oka:index===0?oka:0,
      result:Number(((s.players[player].score-(r.oka?r.returnPoints:r.initialPoints))/1000+(r.uma[index]||0)+(index===0?oka:0)).toFixed(1)),
    }));
    s.phase='matchEnd';s.result.endReason=reason;
    this._emit('matchEnd',null,null,{reason,standings:s.standings});
  }

  nextHand(record=true) {
    const s=this.state;if(s.phase!=='handEnd')throw new Error('この局面では次局へ進めません。');
    if(record)s.actionHistory.push({handId:s.handId,player:0,rng:s.rng,action:{type:'next',label:'次の局へ'}});
    const result=s.result,draw=result.kind==='exhaustive'||result.kind==='abortive';
    if(result.continueDealer)s.honba++;
    else {
      s.dealer=(s.dealer+1)%s.rules.players;s.handNumber++;
      if(s.handNumber>s.rules.players){s.handNumber=1;s.roundIndex++;s.roundWind=27+s.roundIndex%4;}
      s.honba=draw?s.honba+1:0;s.consecutiveDealerWins=0;
    }
    this._startHand();return s;
  }

  /** Advance exactly one COM decision; false means a human or end-of-hand decision. */
  stepAI() {
    const s=this.state;
    if(['seating','handEnd','matchEnd'].includes(s.phase))return false;
    let player;
    if(s.phase==='discard') {player=s.turn;if(player===0)return false;}
    else {
      player=seatOrder(s.response.source,s.rules.players).find(i=>i!==0&&this.getActions(i).length);
      if(player==null)return false;
    }
    const actions=this.getActions(player),choice=chooseAIAction(publicView(s,player),player,actions,()=>this._random());
    if(!choice)return false;this.act(choice,player);return true;
  }

  setPersona(player,id) {
    if(!Number.isInteger(player)||player<0||player>=this.state.players.length)throw new Error('プレイヤー番号が不正です。');
    if(!AI_PERSONAS.some(p=>p.id===id))throw new Error('COMの個性が見つかりません。');
    const p=this.state.players[player];p.persona=id;if(player!==0)p.name=personaById(id).name;
    return this.state;
  }

  getPublicState(viewer=0) {return publicView(this.state,viewer);}

  serialize() {
    this.validateState();
    return JSON.stringify({format:'jade-mahjong-save',version:VERSION,state:this.state});
  }

  static restore(text) {
    if(typeof text!=='string'||text.length>20000000)throw new Error('保存データの形式が不正です。');
    const parsed=JSON.parse(text);
    if(parsed.format!=='jade-mahjong-save'||![1,VERSION].includes(parsed.version)||!parsed.state)throw new Error('対応していない保存データです。');
    const game=Object.create(MahjongGame.prototype);game.state=parsed.state;
    game.state.rules=normalizeRules(game.state.rules);
    if(parsed.version===1) {
      const s=game.state;s.version=VERSION;s.engineVersion=ENGINE_VERSION;s.historyPartial=true;
      s.players.forEach((p,i)=>p.id??=i===0?'human':`com-${i}`);
      s.handRecords=[];s.handStarts=[];s.handStartScores=s.players.map(p=>p.score);s.handStartPot=s.riichiPot;
      s.scoreHistory=[{handId:s.handId,label:'旧版から再開',scores:s.players.map(p=>p.score),riichiPot:s.riichiPot,dealer:s.dealer,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba}];
      s.setup={legacy:true,dealer:s.initialDealer,seats:s.players.map((p,seat)=>({seat,id:p.id,name:p.name,persona:p.persona,wind:27+(seat-s.initialDealer+s.rules.players)%s.rules.players}))};
    }
    game.validateState();
    if(game.state.phase==='response') {
      for(const [key,choice] of Object.entries(game.state.response.choices)) {
        // Passing ron immediately creates furiten; recomputing the old menu then
        // legitimately no longer contains ron/pass. A recorded pass stays valid.
        if(choice.type==='pass')continue;
        const legal=game._responseActions(Number(key),true);
        if(!legal.some(a=>actionKey(a)===actionKey(choice)))throw new Error('保存された鳴き選択が不正です。');
      }
    }
    return game;
  }

  exportPaifu() {
    return JSON.stringify({format:'jade-mahjong-paifu',version:VERSION,engineVersion:ENGINE_VERSION,setup:this.state.setup,handStarts:this.state.handStarts,historyPartial:this.state.historyPartial,seed:this.state.seed,rules:this.state.rules,
      players:this.state.players.map(p=>({name:p.name,persona:p.persona})),actions:this.state.actionHistory,
      events:this.state.log,result:this.state.result,standings:this.state.standings},null,2);
  }

  /** Check conservation, physical identity, hand sizes and score ownership. Throws on corruption. */
  validateState() {
    const s=this.state,r=s.rules,n=r.players;
    const fail=message=>{throw new Error(`対局データの整合性エラー: ${message}`);};
    if(![3,4].includes(n)||!Array.isArray(s.players)||s.players.length!==n)fail('人数');
    if(!['seating','discard','response','handEnd','matchEnd'].includes(s.phase))fail('進行状態');
    if(!Number.isInteger(s.dealer)||s.dealer<0||s.dealer>=n||!Number.isInteger(s.turn)||s.turn<0||s.turn>=n)fail('座席');
    if(s.phase==='seating'){
      if(s.handId!==0||s.players.some(p=>p.hand.length||p.melds.length||p.discards.length||p.nuki.length||p.score!==r.initialPoints)||s.wall.length||s.deadWall.length||s.riichiPot!==0)fail('席決め中の牌・点数');
      return {valid:true,tiles:0,points:r.initialPoints*n};
    }
    if(!Array.isArray(s.wall)||!Array.isArray(s.deadWall)||s.deadWall.length!==14)fail('牌山');
    if(s.wall.length!==s.remaining)fail('残り牌数');
    if(!Number.isInteger(s.kanCount)||s.kanCount<0||s.kanCount>4||s.rinshanCount!==s.kanCount)fail('槓の回数');
    const expected=new Map(createTiles(r).map(t=>[t.id,t])),seen=new Map(),types=new Array(34).fill(0);
    const add=(t,where)=>{
      if(!t||!Number.isInteger(t.id)||!Number.isInteger(t.type)||t.type<0||t.type>33)fail(`${where}の牌`);
      const ref=expected.get(t.id);if(!ref||ref.type!==t.type||!!ref.red!==!!t.red)fail(`${where}の牌識別子`);
      if(seen.has(t.id))fail(`牌${t.id}が${seen.get(t.id)}と${where}に重複`);
      seen.set(t.id,where);types[t.type]++;
    };
    s.wall.forEach(t=>add(t,'山'));s.deadWall.forEach(t=>add(t,'王牌'));
    const called=[];
    for(let i=0;i<n;i++) {
      const p=s.players[i];
      for(const key of ['hand','melds','discards','nuki'])if(!Array.isArray(p[key]))fail(`${i}の${key}`);
      if(!Number.isFinite(p.score)||!Number.isInteger(p.score))fail('点数');
      p.hand.forEach(t=>add(t,`${i}手牌`));p.nuki.forEach(t=>{if(t.type!==30||n!==3)fail('抜き牌');add(t,`${i}北`);});
      for(const m of p.melds) {
        if(!['chi','pon','ankan','minkan','kakan'].includes(m.kind))fail('副露種別');
        if(!Array.isArray(m.tiles)||m.tiles.length!==(m.kind.includes('kan')?4:3))fail('副露枚数');
        const ts=m.tiles.map(t=>t.type).sort((a,b)=>a-b);
        if(m.kind==='chi') {if(n===3||ts[0]>=27||Math.floor(ts[0]/9)!==Math.floor(ts[2]/9)||ts[0]+1!==ts[1]||ts[1]+1!==ts[2])fail('チーの構成');}
        else if(ts.some(t=>t!==ts[0]))fail('刻子・槓子の構成');
        m.tiles.forEach(t=>add(t,`${i}副露`));
      }
      for(const d of p.discards)if(d.called)called.push(d.tile);else add(d.tile,`${i}河`);
      if(p.drawnTileId!=null&&!p.hand.some(t=>t.id===p.drawnTileId))fail('ツモ牌');
      const equiv=p.hand.length+p.melds.length*3;
      if(equiv!==13&&equiv!==14)fail(`${i}の手牌枚数 ${equiv}`);
      if(s.phase==='discard'&&equiv!==(i===s.turn?14:13))fail('手番と枚数');
      if(s.phase==='response'&&equiv!==(s.response?.kind!=='discard'&&i===s.response?.source?14:13))fail('応答と枚数');
    }
    if(seen.size!==expected.size||types.some(t=>t>4))fail(`総牌数 ${seen.size}/${expected.size}`);
    for(const t of called)if(!seen.get(t.id)?.endsWith('副露'))fail('鳴かれた捨て牌');
    if(!Number.isInteger(s.riichiPot)||s.riichiPot<0||s.players.reduce((a,p)=>a+p.score,0)+s.riichiPot*1000!==r.initialPoints*n)fail('点棒総額');
    if(s.phase==='response'&&(!s.response||!s.response.choices||!s.response.tile))fail('応答データ');
    if(s.version===VERSION){
      if(!Array.isArray(s.scoreHistory)||!Array.isArray(s.handRecords)||!Array.isArray(s.handStarts)||!Array.isArray(s.actionHistory)||!Array.isArray(s.log))fail('記録形式');
      let last=-1;for(const h of s.scoreHistory){if(!Number.isInteger(h.handId)||h.handId<last||!Array.isArray(h.scores)||h.scores.length!==n||h.scores.some(v=>!Number.isInteger(v))||!Number.isInteger(h.riichiPot)||h.riichiPot<0||h.scores.reduce((a,b)=>a+b,0)+h.riichiPot*1000!==r.initialPoints*n)fail('点数推移');last=h.handId;}
    }
    return {valid:true,tiles:seen.size,points:s.players.reduce((a,p)=>a+p.score,0)+s.riichiPot*1000};
  }
}

export { AI_PERSONAS };
