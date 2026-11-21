import {installDataController} from './ui/data-controller.js';
import {MatchLibrary} from './data/library.js';
import {MahjongGame} from './core/game.js';
import {analyzeHand} from './core/ai.js';
import {PERSONA_LABELS,personaById} from './core/personas.js';
import {normalizeRules} from './core/rules.js';
import {tileName,sortTiles} from './core/tiles.js';
import {winningTiles} from './core/score.js';
import {TableView} from './render/table.js';
import {CanvasUI} from './ui/canvas-ui.js';
import {drawScreen} from './ui/screens.js';
import {storageGet,storageSet,downloadJSON,TableSound,ReplayStore} from './ui-utils.js';

export const VERSION='1.2.0';
const KEYS={rules:'seiran.rules.v1',prefs:'seiran.preferences.v1',auto:'seiran.auto.v1',manual:'seiran.saved.v1',previous:'seiran.previous.v1'};
import {ACTION_NAMES,windName,roundName,lengthName,reasonText} from './ui/labels.js';
const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dateFilename=()=>new Date().toISOString().replaceAll(':','-').slice(0,19);

export class MahjongApp {
  constructor(){
    this.preferences={speed:1,sound:false,volume:.35,view:'table',noCall:false,autoWin:false,autoDiscard:false,analysis:false,tileNames:false,...storageGet(KEYS.prefs,{})};
    if(![.5,1,2,4].includes(this.preferences.speed))this.preferences.speed=1;
    // No hard-coded old default triplet. Existing explicit selections are retained.
    this.configuredRules=normalizeRules(storageGet(KEYS.rules,{}));
    this.library=new MatchLibrary();this.matches=[];this.startedAt=new Date().toISOString();this.endedAt=null;this.settlementVisited=false;
    this.selected=null;this.declaration=null;this.modal=null;this.actions=[];this.busy=false;this.paused=false;
    this.replayMode=false;this.replayPlaying=false;this.replayFrames=[];this.replayIndex=0;
    this.lastEvent=0;this.lastHand=0;this.lastFrameEvent=-1;this.resultShown='';this.toastMessage=null;this.banner=null;
    this.sound=new TableSound();this.sound.volume=this.preferences.volume;this.replayStore=new ReplayStore();
    const auto=storageGet(KEYS.auto);let resumed=false;
    if(auto)try{this.restoreEnvelope(auto);resumed=true;}catch(e){console.warn('Saved match was not restored:',e);}
    if(!this.game){this.game=new MahjongGame(this.configuredRules,uid(),{deferStart:true});this.matchId=uid();}
    this.view=new TableView(document.body,{onTileClick:id=>this.selectTile(id)});
    this.ui=new CanvasUI(this.view,(ui,frame)=>drawScreen(this,ui,frame),{
      onEscape:()=>this.escape(),onKey:e=>this.key(e),onPage:n=>this.changePage(n),onFile:file=>this.importFile(file),onError:e=>this.toast(e.message,true),
    });
    this.view.setView(this.preferences.view);this.refresh();
    this.ready=this.view.ready.then(async()=>{
      await this.initializeData(resumed);
      if(resumed)this.toast(`${roundName(this.game.state)}の対局を再開しました。`);
      else if(this.game.state.phase!=='seating'){this.view.animateDeal();this.view.rollDice(this.game.state.dice);}
      this.autoSave();this.schedule(resumed?900:1600);
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.autoSave();else this.schedule(350);});
    window.addEventListener('pagehide',()=>this.autoSave());
    this.view.renderer.domElement.addEventListener('pointerdown',()=>{if(this.preferences.sound&&!this.sound.enabled)this.sound.enable(true);},{once:true,capture:true});
  }
  get state(){return this.replayMode?this.replayState:this.game.state;}
  get hand(){const p=this.state.players[0],tiles=sortTiles([...p.hand]);const at=tiles.findIndex(t=>t.id===p.drawnTileId);if(at>=0)tiles.push(...tiles.splice(at,1));return tiles.map(t=>({...t,drawn:t.id===p.drawnTileId}));}
  invalidate(){this.ui?.invalidate();}
  toast(message,error=false){this.toastMessage={message:String(message),error};clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{this.toastMessage=null;this.invalidate();},error?6500:3800);this.invalidate();}
  open(kind,data={},parent=null){if(kind==='settlement')this.settlementVisited=true;this.modal={kind,page:0,...data,parent};this.ui&&(this.ui.focus=null);this.invalidate();}
  close(){if(this.modal?.kind==='seating')return;this.modal=this.modal?.parent||null;this.ui.focus=null;this.invalidate();this.schedule(250);}
  escape(){if(this.modal){this.close();return;}if(this.replayMode){this.exitReplay();return;}this.selected=null;this.declaration=null;this.view.setSelected(null);this.refresh();}
  changePage(delta){if(!this.modal)return;const m=this.modal;m.page=Math.max(0,Math.min((m.pageCount||1)-1,(m.page||0)+delta));this.ui.focus=null;this.invalidate();}
  openSettings(initial=this.configuredRules,tab='basic'){this.open('settings',{draft:normalizeRules(structuredClone(initial)),prefs:structuredClone(this.preferences),tab});}
  quickStart(){if(this.game.state.phase==='matchEnd'&&!this.settlementVisited){this.open('settlement');return;}this.open('start',{draft:normalizeRules(structuredClone(this.configuredRules))});}
  changePlayers(draft,players){if(draft.players===players)return;draft.players=players;draft.initialPoints=players===3?35000:25000;draft.returnPoints=players===3?40000:30000;draft.notenPenalty=players===3?2000:3000;draft.uma=players===3?[20,0,-20]:[20,10,-10,-20];}
  applySettings(m,start=false){
    this.configuredRules=normalizeRules(m.draft);this.preferences={...this.preferences,...m.prefs};this.savePreferences();storageSet(KEYS.rules,this.configuredRules);this.persistSettings();
    this.sound.volume=this.preferences.volume;this.sound.enable(this.preferences.sound);this.view.setView(this.preferences.view);
    if(start)this.startGame(this.configuredRules);else{this.modal=null;this.toast('設定を保存しました。対局ルールとCOMは次の新規対局から適用。');this.refresh();}
  }
  savePreferences(){storageSet(KEYS.prefs,this.preferences);this.persistSettings();this.invalidate();}
  toggle(key){this.preferences[key]=!this.preferences[key];if(key==='sound')this.sound.enable(this.preferences.sound);this.savePreferences();this.schedule(150);}
  cycleSpeed(){const speeds=[.5,1,2,4];this.preferences.speed=speeds[(speeds.indexOf(this.preferences.speed)+1)%speeds.length];this.savePreferences();}
  setView(id){this.preferences.view=id;this.view.setView(id);this.savePreferences();}
  envelope(){return {format:'seiran-save',version:1,savedAt:new Date().toISOString(),startedAt:this.startedAt,endedAt:this.endedAt,matchId:this.matchId,ui:{endScreen:this.modal?.kind==='settlement'?'settlement':'result',seatingStep:this.modal?.kind==='seating'?this.modal.step:0},state:this.game.serialize()};}
  autoSave(){if(!this.game)return;this.persistSlot('auto',this.envelope());if(!storageSet(KEYS.auto,this.envelope())&&!this.storageWarning){this.storageWarning=true;this.toast('端末の保存領域が不足しています。ファイルへの保存は「保存」画面から。',true);}clearTimeout(this.replaySaveTimer);this.replaySaveTimer=setTimeout(()=>this.replayStore.put(this.matchId,{frames:this.replayFrames,rules:this.game.state.rules,savedAt:Date.now()}),1500);}
  recordFrame(){const s=this.game.state;if(s.eventId===this.lastFrameEvent)return;this.lastFrameEvent=s.eventId;
    const keep={rules:s.rules,phase:s.phase,turn:s.turn,dealer:s.dealer,roundWind:s.roundWind,handNumber:s.handNumber,honba:s.honba,riichiPot:s.riichiPot,remaining:s.remaining,handId:s.handId,dice:s.dice,doraIndicators:s.doraIndicators,uraIndicators:s.uraIndicators,doraCount:s.doraCount,kanCount:s.kanCount,lastDiscard:s.lastDiscard,lastDraw:s.lastDraw,players:s.players,result:s.result,standings:s.standings,event:s.event,events:[],wall:[],deadWall:[]};
    this.replayFrames.push(JSON.parse(JSON.stringify(keep,(key,value)=>value&&Number.isInteger(value.type)&&Number.isInteger(value.id)&&'red'in value?{$tile:value.id,red:value.red}:value)));
    if(this.replayFrames.length>5000)this.replayFrames.shift();
  }
  restoreEnvelope(data,frames=null){if(!data||data.version!==1||typeof data.state!=='string')throw new Error('対応していない保存ファイルです。');const restored=MahjongGame.restore(data.state);restored.validateState();
    this.startedAt=data.startedAt||data.savedAt||new Date().toISOString();this.endedAt=data.endedAt||null;this.pendingEndScreen=data.ui?.endScreen;this.pendingSeatingStep=data.ui?.seatingStep||0;this.settlementVisited=false;this.archivedMatch=null;
    this.game=restored;this.matchId=typeof data.matchId==='string'?data.matchId:uid();this.selected=null;this.declaration=null;this.lastEvent=restored.state.eventId;this.lastHand=restored.state.handId;this.lastFrameEvent=-1;this.resultShown='';this.replayMode=false;this.replayPlaying=false;this.replayFrames=frames??[];
    if(frames){this.lastFrameEvent=restored.state.eventId;return;}
    const id=this.matchId;this.replayStore.get(id).then(record=>{if(this.matchId!==id)return;if(record?.frames?.length)this.replayFrames=record.frames;else this.recordFrame();this.invalidate();});
  }
  startGame(rules=this.configuredRules,seed=uid(),{force=false}={}){
    if(!force&&this.game&&!['seating','matchEnd'].includes(this.game.state.phase)){this.confirm('新しい対局を開始','現在の対局を中断します。局面は「前回の対局」に保存しますが、未終了の対局は成績に含めません。',()=>this.startGame(rules,seed,{force:true}),'対局を切り替える');return;}
    clearTimeout(this.resultTimer);clearInterval(this.setupTimer);
    if(this.game){storageSet(KEYS.previous,this.envelope());this.persistSlot('previous',this.envelope());this.replayStore.put(this.matchId,{frames:this.replayFrames,rules:this.game.state.rules,savedAt:Date.now()});}
    this.configuredRules=normalizeRules(rules);storageSet(KEYS.rules,this.configuredRules);this.game=new MahjongGame(this.configuredRules,seed,{deferStart:true});this.matchId=uid();this.startedAt=new Date().toISOString();this.endedAt=null;this.settlementVisited=false;this.archivedMatch=null;this.persistSettings();
    this.replayFrames=[];this.lastFrameEvent=-1;this.lastEvent=0;this.lastHand=0;this.resultShown='';this.selected=null;this.declaration=null;this.replayMode=false;this.replayPlaying=false;this.modal=null;
    this.open('seating',{step:0});this.refresh();this.autoSave();
  }
  selectTile(id){if(this.replayMode||this.modal||this.busy)return;const legal=this.actions.some(a=>a.type===(this.declaration||'discard')&&a.tileId===id);if(!legal)return;
    this.selected=this.selected===id?null:id;this.view.setSelected(this.selected);this.invalidate();
  }
  commitTile(id=this.selected){if(this.modal||this.replayMode||id==null)return;const a=this.actions.find(a=>a.type===(this.declaration||'discard')&&a.tileId===id);if(a)this.doAction(a);}
  doAction(action){if(this.busy||this.replayMode)return;this.busy=true;try{this.game.act(action,0);this.selected=null;this.declaration=null;this.view.setSelected(null);this.refresh();this.autoSave();}catch(e){this.toast(e.message,true);this.refresh();}finally{this.busy=false;this.schedule(300/this.preferences.speed);}}
  chooseAction(type){const choices=this.actions.filter(a=>a.type===type);if(!choices.length)return;
    if(['riichi','openRiichi'].includes(type)){this.declaration=type;this.selected=null;this.view.setSelected(null);this.invalidate();return;}
    if(choices.length===1)this.doAction(choices[0]);else this.open('choices',{type,choices});
  }
  nextHand(){try{this.game.nextHand();this.modal=null;this.selected=null;this.declaration=null;this.refresh();this.autoSave();this.schedule(1300/this.preferences.speed);}catch(e){this.toast(e.message,true);}}
  schedule(delay=500){clearTimeout(this.loopTimer);if(!this.paused)this.loopTimer=setTimeout(()=>this.tick(),delay);}
  tick(){
    if(this.busy||this.modal||this.replayMode||document.hidden){this.schedule(250);return;}
    if(['seating','handEnd','matchEnd'].includes(this.game.state.phase)){this.schedule(350);return;}
    try{const a=this.game.getActions(0),win=a.find(x=>['tsumo','ron'].includes(x.type));
      if(win&&this.preferences.autoWin){this.doAction(win);return;}
      if(this.game.state.phase==='response'&&this.preferences.noCall&&!win){const pass=a.find(x=>x.type==='pass');if(pass){this.doAction(pass);return;}}
      const p=this.game.state.players[0];if(this.game.state.phase==='discard'&&this.game.state.turn===0&&!win){const extras=a.filter(x=>!['discard','riichi','openRiichi'].includes(x.type));if(this.preferences.autoDiscard||(p.riichi&&extras.length===0)){const discard=a.find(x=>x.type==='discard'&&x.tileId===p.drawnTileId);if(discard){this.doAction(discard);return;}}}
      const moved=this.game.stepAI();if(moved){this.refresh();this.autoSave();this.schedule((this.game.state.event?.type==='discard'?780:520)/this.preferences.speed);}else this.schedule(180);
    }catch(e){console.error(e);this.toast(`対局処理: ${e.message}`,true);this.schedule(2000);}
  }
  eventLabel(event,s=this.state){const name=event.player==null?'':s.players[event.player]?.name||`席${event.player+1}`,tile=event.tile?tileName(event.tile):'';
    if(event.type==='deal')return `${roundName({...s,...event,...event.details})} — 配牌`;if(event.type==='draw')return `${name}が${event.player===0||this.replayMode?tile:'牌'}をツモ`;
    if(event.type==='discard')return `${name} → ${tile}${event.details?.riichi?'（立直宣言）':''}`;
    if(event.type==='abortiveDraw')return `途中流局 ${reasonText(event.details?.reason)}`;
    return `${name} ${ACTION_NAMES[event.type]||event.type}${tile&&event.type!=='draw'?' · '+tile:''}`;
  }
  refresh(){const s=this.state;
    if(!this.replayMode&&s.phase==='seating'&&this.modal?.kind!=='seating')this.open('seating',{step:this.pendingSeatingStep||0});this.actions=this.replayMode?[]:this.game.getActions(0);this.view.update(s);
    if(!this.replayMode){const fresh=(s.events||[s.event]).filter(e=>e&&e.id>this.lastEvent);for(const e of fresh){this.sound.play(e.type);if(['ron','tsumo','riichi','openRiichi','chi','pon','ankan','kakan','minkan','nuki','abortiveDraw','exhaustiveDraw'].includes(e.type)){
      this.banner={label:ACTION_NAMES[e.type],name:s.players[e.player]?.name||''};clearTimeout(this.bannerTimer);this.bannerTimer=setTimeout(()=>{this.banner=null;this.invalidate();},['ron','tsumo'].includes(e.type)?1500:950);
    }}if(fresh.length)this.lastEvent=Math.max(...fresh.map(e=>e.id));
      this.lastAction=fresh.filter(e=>!['draw','handEnd'].includes(e.type)).at(-1)||this.lastAction;
      if(s.handId!==this.lastHand){this.lastHand=s.handId;this.view.rollDice(s.dice);}this.recordFrame();
      if(['handEnd','matchEnd'].includes(s.phase)&&this.resultShown!==`${this.matchId}:${s.handId}:${s.phase}`){this.resultShown=`${this.matchId}:${s.handId}:${s.phase}`;clearTimeout(this.resultTimer);if(s.phase==='matchEnd')this.endedAt??=new Date().toISOString();this.open(this.pendingEndScreen==='settlement'&&s.phase==='matchEnd'?'settlement':'result');this.pendingEndScreen=null;this.archiveResult();}
    }this.invalidate();
  }
  handStatus(){const s=this.state,p=s.players[0];let line=this.replayMode?`牌譜 ${this.replayIndex+1} / ${this.replayFrames.length}`:s.phase==='matchEnd'?'対局終了':s.phase==='handEnd'?'局終了':this.declaration?'リーチの宣言牌を選択':s.phase==='response'&&this.actions.length?`${tileName(s.response?.tile||s.lastDiscard?.tile)} — 鳴き・和了の選択`:s.turn===0&&s.phase==='discard'?'あなたの番です':'相手の打牌を待っています';
    if(p.riichiFuriten)line+=' · リーチ後フリテン';else if(p.discardFuriten)line+=' · 捨て牌フリテン';else if(p.temporaryFuriten)line+=' · 同巡フリテン';return line;
  }
  getActionButtons(){const s=this.state;
    if(this.replayMode)return [{id:'replay-prev',label:'前の打牌',fn:()=>this.seekReplay(this.replayIndex-1)},{id:'replay-play',label:this.replayPlaying?'一時停止':'自動再生',fn:()=>this.toggleReplay()},{id:'replay-next',label:'次の打牌',fn:()=>this.seekReplay(this.replayIndex+1)},{id:'replay-exit',label:'対局に戻る',fn:()=>this.exitReplay(),primary:true}];
    if(s.phase==='matchEnd')return [{id:'result',label:'対局結果',fn:()=>this.open('result'),primary:true},{id:'new',label:'新しい対局',fn:()=>this.quickStart()}];
    if(s.phase==='handEnd')return [{id:'result',label:'結果を見る',fn:()=>this.open('result')},{id:'next',label:'次の局へ',fn:()=>this.nextHand(),primary:true}];
    if(this.declaration)return [{id:'cancel',label:'宣言を取消',fn:()=>this.escape()},{id:'commit',label:'リーチを確定',fn:()=>this.commitTile(),disabled:this.selected==null,primary:true}];
    const buttons=[];for(const type of ['ron','tsumo','chi','pon','minkan','ankan','kakan','nuki','abort','riichi','openRiichi','pass'])if(this.actions.some(a=>a.type===type))buttons.push({id:`action-${type}`,label:type==='openRiichi'?'オープン':ACTION_NAMES[type],fn:()=>this.chooseAction(type),primary:['ron','tsumo'].includes(type)});
    if(this.actions.some(a=>a.type==='discard'))buttons.push({id:'commit',label:this.selected==null?'牌を選択':'打牌',fn:()=>this.commitTile(),disabled:this.selected==null,primary:true});
    return buttons;
  }
  inlineAnalysis(){
    if(!this.preferences.analysis||this.replayMode)return '';
    const key=`${this.matchId}:${this.game.state.eventId}:${this.game.state.phase}`;
    if(this.analysisCache?.key!==key){
      try{this.analysisCache={key,value:analyzeHand(this.game.getPublicState(0),0)};}
      catch{return '分析できませんでした';}
    }
    const data=this.analysisCache.value,tile=this.hand.find(t=>t.id===this.selected);
    const chosen=tile?data.candidates?.find(c=>c.type===tile.type&&c.red===tile.red):null;
    const value=chosen||data,sh=value.shanten;
    return `${sh<0?'和了形':sh===0?'聴牌':sh+'向聴'}${chosen?' · 選択牌切り後':''}${value.ukeire?' · 受入 '+value.ukeire+'枚':''}${chosen?' · 危険度 '+Math.round(chosen.danger*100)+'%':''}`;
  }
  showAnalysis(){try{const p=this.game.state.players[0],analysis=analyzeHand(this.game.getPublicState(0),0);const selectedTile=p.hand.find(t=>t.id===this.selected),best=analysis.candidates?.find(c=>selectedTile&&c.type===selectedTile.type&&c.red===selectedTile.red)||analysis.candidates?.[0];const hand=this.selected!=null?p.hand.filter(t=>t.id!==this.selected):p.hand.length%3===1?p.hand:p.hand.filter(t=>t.id!==p.drawnTileId);const waits=hand.length%3===1?winningTiles(hand,p.melds,this.game.state.rules):[];this.open('analysis',{analysis,best,waits});}catch(e){this.toast(e.message,true);}}
  manualSave(){this.persistSlot('manual',this.envelope());if(storageSet(KEYS.manual,this.envelope()))this.toast('現在の対局を保存しました。');else this.toast('端末に保存できませんでした。',true);this.invalidate();}
  restoreSlot(key){try{this.restoreEnvelope(this.getSlot(key));this.modal=null;this.refresh();this.autoSave();this.toast('保存した対局を再開しました。');}catch(e){this.toast(e.message,true);}}
  getSlot(key){return this.savedSlots?.[key]||storageGet(KEYS[key]);}
  exportSave(){downloadJSON(`seiran-save-${dateFilename()}.json`,this.envelope());}
  exportReplay(){downloadJSON(`seiran-paifu-${dateFilename()}.json`,{format:'seiran-replay',version:1,save:this.envelope(),frames:this.replayFrames});}
  exportActions(){downloadJSON(`seiran-actions-${dateFilename()}.json`,JSON.parse(this.game.exportPaifu()));}
  async pickFile(){
    try{
      if(window.showOpenFilePicker){const [handle]=await window.showOpenFilePicker({types:[{description:'麻雀の保存・バックアップ',accept:{'application/json':['.json'],'application/zip':['.zip']}}],multiple:false});await this.importFile(await handle.getFile());return;}
      // Browser-native file dialog only. This element is never inserted into or painted in the document.
      const chooser=document.createElement('input');chooser.type='file';chooser.accept='.json,.zip,application/json,application/zip';
      chooser.onchange=()=>this.importFile(chooser.files?.[0]);chooser.click();
    }catch(e){if(e.name!=='AbortError')this.toast(e.message,true);}
  }
  async importFile(file){if(!file)return;try{if(await this.prepareDataFile(file))return;if(file.size>32*1024*1024)throw new Error('32MB以下の保存ファイルを選んでください。');const data=JSON.parse(await file.text());
    if(data.format==='seiran-replay'){
      if(data.version!==1||!data.save||!Array.isArray(data.frames))throw new Error('牌譜ファイルの形式が不正です。');
      const frames=data.frames.slice(-5000);for(const f of frames){if(!f||![3,4].includes(f.rules?.players)||!Array.isArray(f.players)||f.players.length!==f.rules.players||f.players.some(p=>!p||!Array.isArray(p.hand)||!Array.isArray(p.melds)||!Array.isArray(p.discards)||p.hand.some(t=>!Number.isInteger(t.$tile??t.id)||(t.$tile??t.id)<0||(t.$tile??t.id)>135)))throw new Error('牌譜の局面データが不正です。');}
      this.restoreEnvelope(data.save,frames);
    }else this.restoreEnvelope(data);
    this.modal=null;this.refresh();this.autoSave();this.toast('対局ファイルを読み込みました。');
  }catch(e){this.toast(`読み込み失敗: ${e.message}`,true);}}
  enterReplay(){if(!this.replayFrames.length)return;this.modal=null;this.replayMode=true;this.replayPlaying=false;this.selected=null;this.view.setSelected(null);this.seekReplay(0);}
  seekReplay(index){this.replayIndex=Math.max(0,Math.min(this.replayFrames.length-1,index));this.replayState=JSON.parse(JSON.stringify(this.replayFrames[this.replayIndex]),(key,value)=>value&&Number.isInteger(value.$tile)?{id:value.$tile,type:Math.floor(value.$tile/4),red:!!value.red}:value);this.refresh();}
  toggleReplay(){this.replayPlaying=!this.replayPlaying;if(this.replayPlaying)this.playReplay();this.invalidate();}
  playReplay(){if(!this.replayMode||!this.replayPlaying)return;if(this.replayIndex>=this.replayFrames.length-1){this.replayPlaying=false;this.invalidate();return;}this.seekReplay(this.replayIndex+1);setTimeout(()=>this.playReplay(),800/this.preferences.speed);}
  exitReplay(){if(this.liveReplayFrames){this.replayFrames=this.liveReplayFrames;this.liveReplayFrames=null;}this.replayMode=false;this.replayPlaying=false;this.selected=null;this.lastEvent=this.game.state.eventId;this.refresh();this.schedule(500);}
  key(event){
    if(this.modal?.kind==='number'){const m=this.modal;if(event.key==='Enter'){m.commit();return true;}if(event.key==='Backspace'){m.input=m.input.slice(0,-1);return true;}if(/[0-9.\-]/.test(event.key)&&event.key.length===1){m.input+=event.key;return true;}return false;}
    if(this.modal)return false;
    if(this.replayMode){if(event.key==='ArrowRight')this.seekReplay(this.replayIndex+1);else if(event.key==='ArrowLeft')this.seekReplay(this.replayIndex-1);else return false;return true;}
    if(['ArrowLeft','ArrowRight'].includes(event.key)){const ids=this.hand.filter(t=>this.actions.some(a=>a.type===(this.declaration||'discard')&&a.tileId===t.id)).map(t=>t.id);if(!ids.length)return true;let index=ids.indexOf(this.selected);index=(index+(event.key==='ArrowLeft'?-1:1)+ids.length)%ids.length;this.selected=ids[index];this.view.setSelected(this.selected);return true;}
    if(event.key==='Enter'){this.commitTile();return true;}if(event.code==='Space'){const win=this.actions.find(a=>['ron','tsumo'].includes(a.type));if(win)this.doAction(win);return true;}
    if(event.key.toLowerCase()==='r'){this.chooseAction('riichi');return true;}if(event.key.toLowerCase()==='n'){this.chooseAction('nuki');return true;}return false;
  }
}

installDataController(MahjongApp);
const app=new MahjongApp();await app.ready;
// Explicit diagnostic/development entry points, never passed to the AI's public state.
window.seiran={version:VERSION,get game(){return app.game;},get view(){return app.view;},get preferences(){return {...app.preferences};},get configuredRules(){return structuredClone(app.configuredRules);},get replayFrames(){return app.replayFrames.length;},get app(){return app;},
 newGame:(r,seed)=>app.startGame(r,seed,{force:true}),showSettings:(r,tab)=>app.openSettings(r,tab),showResult:()=>app.open('result'),showGuide:()=>app.open('guide'),pause(){app.paused=true;clearTimeout(app.loopTimer);},resume(){app.paused=false;app.schedule(100);},validate:()=>app.game.validateState(),render:()=>app.refresh(),ui:()=>app.ui.diagnostics()};
