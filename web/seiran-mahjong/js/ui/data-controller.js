import {MahjongGame,ENGINE_VERSION} from '../core/game.js';
import {MatchLibrary} from '../data/library.js';
import {makeMatchRecord,validateEnvelope,safeJSON,replayGame,DATA_VERSION,validateSettings} from '../data/records.js';
import {exportBackup,importBackup,validateBundle,LIMITS} from '../data/backup.js';
import {storageGet,storageSet,downloadJSON,downloadBlob} from '../ui-utils.js';
const KEYS={rules:'seiran.rules.v1',prefs:'seiran.preferences.v1',auto:'seiran.auto.v1',manual:'seiran.saved.v1',previous:'seiran.previous.v1'};
const timestamp=()=>new Date().toISOString().replaceAll(':','-').slice(0,19);
export function installDataController(App){Object.assign(App.prototype,{
  async initializeData(resumed){
    this.library??=new MatchLibrary();this.matches??=[];
    try{
      const snapshot=await this.library.snapshot();this.matches=snapshot.matches;this.savedSlots=snapshot.saves;
      if(snapshot.settings){const settings=validateSettings(snapshot.settings);this.configuredRules=settings.rules;this.preferences={...this.preferences,...settings.preferences};this.view.setView(this.preferences.view);}
      const disk=snapshot.saves.auto,local=storageGet(KEYS.auto);
      if(disk&&(!local||Date.parse(disk.savedAt)>Date.parse(local.savedAt))){this.restoreEnvelope(disk);resumed=true;}
      if(!resumed&&snapshot.settings)this.game=new MahjongGame(this.configuredRules,this.game.state.seed,{deferStart:true});
      this.dataReady=true;this.dataError=null;
    }catch(error){this.dataError=error.message;this.dataReady=false;this.toast(error.message,true);}
    if(this.game.state.phase==='seating')this.open('seating',{step:this.pendingSeatingStep||0});
    this.refresh();if(this.game.state.phase==='matchEnd')this.archiveResult();
  },
  confirm(title,message,action,confirmLabel){this.open('confirm',{title,message,action,confirmLabel},this.modal);},
  advanceSeating(){
    if(this.game.state.phase!=='seating')return;const m=this.modal;if(!m||m.kind!=='seating')return;
    if((m.step||0)>=2){this.game.beginMatch();this.modal=null;this.refresh();this.view.animateDeal();this.view.rollDice(this.game.state.dice);this.sound.play('deal');this.autoSave();this.schedule(1400/this.preferences.speed);return;}
    m.step=(m.step||0)+1;const values=m.step===1?this.game.state.setup.provisionalDice:this.game.state.setup.dealerDice;
    this.view.rollDice(values);this.sound.play('dice');this.setupRollingUntil=performance.now()+800/this.preferences.speed;
    clearInterval(this.setupTimer);this.setupTimer=setInterval(()=>{this.invalidate();if(performance.now()>=this.setupRollingUntil){clearInterval(this.setupTimer);this.autoSave();}},45);this.invalidate();
  },
  persistSettings(){if(this.library&&this.dataReady)this.library.write('meta','settings',{rules:this.configuredRules,preferences:this.preferences}).catch(e=>this.reportDataError(e));},
  reportDataError(error){this.dataError=error.message||String(error);if(this.lastDataError!==this.dataError){this.lastDataError=this.dataError;this.toast(`データ保存：${this.dataError}`,true);}this.invalidate();},
  persistSlot(key,envelope){this.savedSlots??={};this.savedSlots[key]=envelope;if(this.library&&this.dataReady)this.library.write('saves',key,envelope).catch(e=>this.reportDataError(e));},
  async archiveResult(){
    if(this.archivePromise)return this.archivePromise;
    if(this.game.state.phase!=='matchEnd'||!this.dataReady||this.archivedMatch===this.matchId)return;
    this.archiving=true;
    this.archivePromise=(async()=>{
      try{
        const record=makeMatchRecord(this.envelope(),{startedAt:this.startedAt,endedAt:this.endedAt||new Date().toISOString()});
        const inserted=await this.library.putMatch(record);
        if(inserted!==null)await this.library.write('replays',record.id,record.save);
        if(this.matchId===record.id)this.archivedMatch=record.id;
        this.matches=await this.library.read('matches');this.dataError=null;this.invalidate();
      }catch(error){this.reportDataError(error);}
      finally{this.archiving=false;this.archivePromise=null;}
    })();
    return this.archivePromise;
  },
  async showHistory(){this.open('history',{filter:0});try{if(this.game.state.phase==='matchEnd')await this.archiveResult();this.matches=await this.library.read('matches');this.invalidate();}catch(e){this.reportDataError(e);}},
  async deleteMatch(id){try{await this.library.removeMatch(id);this.matches=this.matches.filter(r=>r.id!==id);this.open('history',{filter:0});this.toast('対局結果を削除し、通算成績を再集計しました。牌譜は保持しています。');}catch(e){this.reportDataError(e);}},
  async collectData(){
    let snapshot;if(this.dataReady){await this.archiveResult();snapshot=await this.library.snapshot();}else snapshot={matches:this.matches||[],saves:{},replays:{},settings:null};
    const saves={...snapshot.saves};for(const key of ['auto','manual','previous']){const local=storageGet(KEYS[key]);if(local&&(!saves[key]||Date.parse(local.savedAt)>Date.parse(saves[key].savedAt)))saves[key]=local;}saves.auto=this.envelope();
    return {format:'seiran-data',schemaVersion:DATA_VERSION,matches:snapshot.matches,saves,replays:snapshot.replays||{},settings:{rules:this.configuredRules,preferences:this.preferences}};
  },
  async exportData(kind='all',record=null){
    if(this.dataBusy)return;this.dataBusy=true;
    try{const all=await this.collectData();let bundle;if(kind==='match')bundle={format:'seiran-data',schemaVersion:DATA_VERSION,matches:[record]};else if(kind==='all')bundle=all;else bundle={format:'seiran-data',schemaVersion:DATA_VERSION,[kind]:all[kind]};
      if(kind==='all'){const bytes=await exportBackup(bundle);downloadBlob(`seiran-backup-${timestamp()}.zip`,new Blob([bytes],{type:'application/zip'}));}else downloadJSON(`seiran-${kind}-${timestamp()}.json`,validateBundle(bundle));this.toast('データを書き出しました。');
    }catch(e){this.toast(`書き出し失敗：${e.message}`,true);}finally{this.dataBusy=false;this.invalidate();}
  },
  exportDiagnostic(){downloadJSON(`seiran-diagnostic-${timestamp()}.json`,{format:'seiran-diagnostic',schemaVersion:DATA_VERSION,engineVersion:ENGINE_VERSION,save:this.envelope(),paifu:JSON.parse(this.game.exportPaifu())});},
  async showReplayLibrary(){try{const snapshot=await this.library.snapshot();this.open('replayLibrary',{replays:Object.entries(snapshot.replays)});}catch(e){this.reportDataError(e);}},
  async prepareDataFile(file){
    if(!file)return;if(file.size>LIMITS.file)throw new Error('64MB以下のファイルを選んでください。');const head=new Uint8Array(await file.slice(0,4).arrayBuffer());let bundle;
    if(head[0]===0x50&&head[1]===0x4b)bundle=await importBackup(await file.arrayBuffer());
    else{const data=safeJSON(await file.text());
      if(data.format==='seiran-data')bundle=validateBundle(data);
      else if(data.format==='seiran-save'||data.format==='seiran-diagnostic'){
        const save=data.format==='seiran-diagnostic'?data.save:data;validateEnvelope(save);
        this.confirm('保存された対局を再開','現在の対局は「前回の対局」に退避して、読み込んだ局面に切り替えます。',()=>{const previous=this.envelope();storageSet(KEYS.previous,previous);this.persistSlot('previous',previous);this.restoreEnvelope(save);this.modal=null;this.refresh();this.autoSave();this.schedule(350);this.toast('保存した対局を再開しました。');},'対局を再開');return true;
      }else if(data.format==='seiran-replay'&&data.version===2){validateEnvelope(data.save);bundle=validateBundle({format:'seiran-data',schemaVersion:DATA_VERSION,replays:{[data.save.matchId]:data.save}});}
      else return false;
    }
    this.open('importPreview',{bundle,mode:'merge',selection:{matches:bundle.matches!=null,replays:bundle.replays!=null,saves:bundle.saves!=null,settings:bundle.settings!=null},fileName:file.name});return true;
  },
  async applyDataImport(m){if(this.dataBusy)return;const text=m.mode==='replace'?'選択した種類の既存データを置き換えます。直前のデータは復元用に残します。':'選択したデータを取り込みます。同じ対局の重複は数えません。';this.confirm('データを復元',text+(m.selection.saves&&m.bundle.saves?.auto?' 自動保存の対局を再開します。':''),()=>this.executeDataImport(m),'復元する');},
  async executeDataImport(m,{rollback=false}={}){
    if(this.dataBusy)return;this.dataBusy=true;
    try{const bundle=validateBundle(m.bundle);if(!rollback){const before=await this.collectData();await this.library.write('meta','beforeImport',before);}
      const result=await this.library.applyImport(bundle,{mode:m.mode,...m.selection});const snapshot=await this.library.snapshot();this.matches=snapshot.matches;this.savedSlots=snapshot.saves;
      if(m.selection.settings&&bundle.settings){this.configuredRules=bundle.settings.rules;this.preferences={...this.preferences,...bundle.settings.preferences};storageSet(KEYS.rules,this.configuredRules);storageSet(KEYS.prefs,this.preferences);this.view.setView(this.preferences.view);this.sound.volume=this.preferences.volume;this.sound.enable(this.preferences.sound);}
      if(m.selection.saves&&bundle.saves){for(const key of ['auto','manual','previous']){if(snapshot.saves[key])storageSet(KEYS[key],snapshot.saves[key]);else try{localStorage.removeItem(KEYS[key]);}catch{}}if(bundle.saves.auto){this.restoreEnvelope(bundle.saves.auto);this.modal=null;this.refresh();}}
      if(!['result','seating','settlement'].includes(this.modal?.kind))this.open('data');this.dataError=null;this.toast(`復元完了：追加 ${result.added}件、重複 ${result.skipped}件。`);this.invalidate();
    }catch(error){this.toast(`復元失敗：${error.message}`,true);}finally{this.dataBusy=false;this.invalidate();}
  },
  async rollbackImport(){try{const previous=await this.library.read('meta','beforeImport');if(!previous){this.toast('取り消せるインポートはありません。');return;}const bundle=validateBundle(previous);this.confirm('インポートを取り消す','取り込み前の全データへ戻します。取り込み後に増えた記録は失われます。',()=>this.executeDataImport({bundle,mode:'replace',selection:{matches:true,replays:true,settings:true,saves:true}},{rollback:true}),'元に戻す');}catch(e){this.toast(e.message,true);}},
  async replayRecord(record){
    if(this.replayMode)this.exitReplay();
    try{const frames=[];this.toast('記録から牌譜を復元しています…');await new Promise(r=>setTimeout(r,35));
      replayGame(record,s=>{if(frames.length>=12000)throw new Error('この牌譜は再生上限の12,000操作を超えています。元の記録は変更していません。');const {rules,phase,turn,dealer,roundWind,handNumber,honba,riichiPot,remaining,handId,dice,doraIndicators,uraIndicators,doraCount,kanCount,lastDiscard,lastDraw,players,result,standings,event}=s;frames.push(JSON.parse(JSON.stringify({rules,phase,turn,dealer,roundWind,handNumber,honba,riichiPot,remaining,handId,dice,doraIndicators,uraIndicators,doraCount,kanCount,lastDiscard,lastDraw,players,result,standings,event,events:[],wall:[],deadWall:[]})));});
      this.liveReplayFrames=this.replayFrames;this.replayFrames=frames;this.enterReplay();this.toast('牌譜再生中。現在の対局は変更しません。');
    }catch(e){this.toast(`牌譜：${e.message}`,true);}
  },
});}
