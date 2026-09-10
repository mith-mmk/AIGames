import { CivilizationEngine } from './engine.mjs';
import { CivilizationRenderer } from './renderer.mjs';
import { UnitArtStore, nextStackUnit } from './unit-art.mjs';
import { UnitAnimations, buildUnitClips } from './unit-animations.mjs';
import { handleGameKey } from './keyboard.mjs';
import { renderMainBar } from './main-bar.mjs';
import { PRESETS, TECHS, GOVERNMENTS, RULES_VERSION, UNITS } from './data.mjs';
import { renderSelection, renderBriefs, renderDialog } from './panels.mjs';
import { CivilizationSaveStore, stringifySnapshot } from './save-store.mjs';

const reasonLabel=(reason)=>({INVALID_SNAPSHOT:'保存データが不正です',INCOMPATIBLE_VERSION:'保存データの形式・ルール版が一致しません',INVALID_COMMAND:'入力内容が不正です',NOT_ACTIVE_CIV:'他文明の手番です',NOT_FOUND:'対象が存在しません',NOT_OWNER:'自文明の対象ではありません',NOT_VISIBLE:'対象は視界外です',ILLEGAL_TARGET:'この対象には実行できません',INSUFFICIENT_MOVEMENT:'移動力が不足しています',PREREQUISITE_MISSING:'必要な技術や条件が不足しています',QUEUE_FULL:'生産キューは5件までです',INVALID_ALLOCATION:'配置人数または税率を確認してください',DIPLOMACY_REQUIRED:'接触・条約・宣戦の条件を満たしていません',GAME_OVER:'ゲームは終了しています'}[reason]||reason||'同じ位置です');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const parseConfig = (root) => { const q = (s) => root.querySelector(s); const [width,height] = q('#map-size').value.split('x').map(Number); const count=Number(q('#civ-count').value); return { presetId:'custom',width,height,civilizationCount:count,speed:Number(q('#game-speed').value),maxRounds:Number(q('#round-limit').value),mapType:q('#map-type').value,seed:Number(q('#seed-input').value),humanCivId:'civ-0',civilizationIds:Array.from({length:count},(_,i)=>`civ-${i}`)}; };

export class CivilizationGame {
  constructor(root=document.querySelector('#chronicle-app')) { this.root=root; this.uiState={screen:'start',selected:{tileId:null,unitId:null,cityId:null},camera:{x:0,y:0,zoom:1},inputMode:'select',notifications:[]}; this.canvas=root.querySelector('#world-canvas'); this.engine=new CivilizationEngine(); this.store=new CivilizationSaveStore(); this.artStore=new UnitArtStore(); this.assetsReady=false;
    this.renderer=new CivilizationRenderer(this.canvas,this.uiState,this.artStore);
    this.epoch=0; this.presentationPromise=Promise.resolve();
    let enabled=!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try { const saved=localStorage.getItem('chronicle-unit-effects'); if(saved!==null)enabled=saved==='on'; } catch { /* Browser storage can be unavailable. */ }
    this.animations=new UnitAnimations({enabled,onFrame:()=>this.drawMap(),onIdle:()=>this.update()}); this.view=null; this.drag=null; this.dialogKind=null; }
  init(options={}) { if(!this.assetsReady)throw new Error('ユニット素材の読込を完了してください'); const result=options.snapshot?this.engine.load(options.snapshot):this.engine.init(options.config||parseConfig(this.root)); if(!result.ok) throw new Error(reasonLabel(result.reason)||'初期化に失敗しました'); this.epoch++; this.animations.cancel(); const config=this.engine.serialize().config; this.view=this.engine.getView(config.humanCivId); this.uiState.screen='game'; this.busy=false; this.closeDialog(); this.uiState.selected={tileId:null,unitId:null,cityId:null};this.uiState.inputMode='select';this.uiState.preview=null;this.uiState.hoverTileId=null;this.uiState.movePlan=null; this.root.querySelector('#start-screen').classList.add('hidden'); const start=this.view.cities?.find(c=>c.id===this.view.self.capitalCityId)||this.view.units.find(u=>u.ownerId===this.view.self.id); if(start)this.renderer.centerOn(start.x,start.y); this.update(result.events?.[0]?.type==='game.started'?'新しい年代記を開始しました':'セーブを読み込みました'); if(this.view.turn.activeCivId!==this.view.self.id&&this.view.turn.status==='running')void this.runComputerTurns(); return result; }
  update(message=null) { if(!this.view)return; this.view=this.engine.getView(this.view.self.id); const v=this.view; const selectedUnit=v.units.find(u=>u.id===this.uiState.selected.unitId);if(selectedUnit)this.uiState.selected.tileId=selectedUnit.y*v.world.width+selectedUnit.x; if(this.uiState.selected.unitId&&!v.units.some(u=>u.id===this.uiState.selected.unitId)){this.uiState.selected.unitId=null;this.uiState.selected.cityId=v.world.tiles[this.uiState.selected.tileId]?.cityId||null;} const self=v.self; this.root.querySelector('#empire-name').textContent=self.name; this.root.querySelector('#empire-era').textContent=TECHS[self.knownTechIds.at(-1)]?.era||'古代'; this.root.querySelector('#turn-value').textContent=String(v.turn.round); this.root.querySelector('#turn-limit').textContent=`/ ${v.config?.maxRounds||400}`; this.root.querySelector('#treasury').textContent=String(Math.round(self.treasury??0)); this.root.querySelector('#income').textContent=`${(self.forecast?.netGold??0)>=0?'+':''}${self.forecast?.netGold??0} /T`; this.root.querySelector('#research-value').textContent=TECHS[self.research?.activeTechId]?.label||'未選択'; this.root.querySelector('#research-rate').textContent=`+${self.forecast?.researchPerRound??0} RP`; this.root.querySelector('#government').textContent=GOVERNMENTS[self.government?.currentId]?.label||'—'; const pending=(v.pending?.uncommandedUnitIds?.length||0)+(v.pending?.cityIdsWithoutProduction?.length||0)+(v.pending?.needsResearch?1:0); this.root.querySelector('#pending-count').textContent=String(pending); this.root.querySelector('#pending-status').style.color=pending?'#e3b76b':''; if(message)this.updateNotice(message); renderSelection(this,v); renderBriefs(v,this); renderMainBar(this,v); this.renderMapPreview(); this.renderer.drawMiniMap(this.root.querySelector('#mini-map'),v); this.updateCommandControls(); this.root.querySelector('#visibility-note').textContent='可視 / 記憶 / 未探索';this.root.querySelector('#zoom-level').textContent=`${Math.round(this.uiState.camera.zoom*100)}%`;this.canvas.classList.toggle('move-mode',this.uiState.inputMode==='move'); if(v.turn.status==='finished')this.updateNotice(`年代記完結: ${v.turn.winnerCivIds.map(id=>v.civilizations.find(c=>c.id===id)?.name||id).join('・')} / ${v.turn.victoryType}`); }
  async prepareAssets(){
    const start=this.root.querySelector('#start-button');
    const status=this.root.querySelector('#asset-status');
    const retry=this.root.querySelector('#asset-retry');
    start.disabled=true; retry.hidden=true;
    status.textContent='ユニット素材を読み込んでいます…';
    try {
      await this.artStore.load((loaded,total)=>{status.textContent=`ユニット素材 ${loaded} / ${total}`;});
      await this.artStore.loadCity();
      this.assetsReady=true; status.textContent='22兵種と都市の素材を読み込みました';
      start.disabled=Boolean(this.incompatibleRules); this.drawMap();
    } catch(error) { status.textContent=error.message; retry.hidden=false; }
  }
  drawMap(){
    if(!this.view)return;
    this.renderer.draw(this.view,{selectedTileId:this.uiState.selected.tileId,
      selectedUnitId:this.uiState.selected.unitId,selectedCityId:this.uiState.selected.cityId,
      hoverTileId:this.uiState.hoverTileId,preview:this.currentPathPreview(),presentation:this.animations.sample()});
  }
  updateCommandControls(){
    const blocked=this.busy||this.animations.playing;
    this.root.querySelector('#end-turn').disabled=blocked||this.view?.turn.status!=='running';
    for(const selector of ['#selection-actions button','#wait-all','#next-pending'])
      this.root.querySelectorAll(selector).forEach(button=>{button.disabled=blocked||button.dataset.requiresMovement==='true';});
    this.root.querySelectorAll('[data-game-command]').forEach(button=>{button.disabled=blocked||button.dataset.unavailable==='true';});
    this.canvas.setAttribute('aria-busy',String(blocked));
  }
  setEffectsEnabled(enabled){
    this.animations.setEnabled(enabled);
    try {localStorage.setItem('chronicle-unit-effects',enabled?'on':'off');}catch { /* Optional local display preference. */ }
    this.update();
  }
  playUnitClips(clips,budget=1200){
    this.presentationPromise=this.animations.play(clips,budget);
    this.updateCommandControls();
    return this.presentationPromise;
  }
  suspend(){this.epoch++;this.animations.cancel();this.busy=false;this.updateCommandControls();}
  dispose(){this.epoch++;this.animations.dispose();this.renderer.dispose();}
  updateNotice(text){this.root.querySelector('#notification').textContent=text;}
  showSetup(){this.closeDialog();this.root.querySelector('#start-screen').classList.remove('hidden');this.root.querySelector('#cancel-setup').hidden=!this.view;}
  beginMove(){
    const unit=this.selectedUnit();
    if(!unit||unit.ownerId!==this.view?.self.id||unit.transportedByUnitId||this.busy||this.animations.playing)return;
    this.uiState.inputMode=this.uiState.inputMode==='move'?'select':'move';this.uiState.movePlan=null;this.uiState.preview=null;
    this.update(this.uiState.inputMode==='move'?'移動先をクリックして経路を確認し、Enterで確定。Escで取消。':'移動指定を取り消しました');
  }
  selectedUnit(){return this.view?.units.find(unit=>unit.id===this.uiState.selected.unitId);}
  commandSelected(type){const unit=this.selectedUnit();if(unit?.ownerId===this.view?.self.id)return this.command({type,unitId:unit.id});}
  cancelSelection(){
    if(this.uiState.inputMode==='move'){this.uiState.inputMode='select';this.uiState.preview=null;this.uiState.movePlan=null;this.update('移動指定を取り消しました');return;}
    this.uiState.selected={tileId:null,unitId:null,cityId:null};this.uiState.preview=null;this.update();
  }
  onKeyDown(event){handleGameKey(this,event);}
  setRosterTab(tab){this.uiState.rosterTab=tab;this.update();}
  setRosterPage(page){this.uiState.rosterPages={...this.uiState.rosterPages,[this.uiState.rosterTab||'units']:page};this.update();}
  panMap(dx,dy){this.renderer.pan(dx,dy);this.update();}
  zoomMap(factor){const r=this.canvas.getBoundingClientRect();this.renderer.zoomAt(factor,r.left+r.width/2,r.top+r.height/2);this.update();}
  centerCapital(){const target=this.view?.cities.find(city=>city.id===this.view.self.capitalCityId)||this.view?.units.find(unit=>unit.ownerId===this.view.self.id);if(target){this.renderer.centerOn(target.x,target.y);this.update();}}
  toggleMiniMap(){const canvas=this.root.querySelector('#mini-map');canvas.hidden=!canvas.hidden;this.root.querySelector('#toggle-minimap').setAttribute('aria-expanded',String(!canvas.hidden));this.renderer.drawMiniMap(canvas,this.view);}
  navigateMiniMap(event){if(!this.view)return;const point=this.renderer.miniMapPoint(event.currentTarget,event.clientX,event.clientY,this.view.world);this.renderer.centerOn(point.x,point.y);this.update();}
  centerSelected(){const unit=this.selectedUnit();if(unit){this.renderer.centerOn(unit.x,unit.y);this.update();}}
  pointerTile(event,selecting=this.uiState.inputMode!=='move'&&event.button!==2){
    const sprite=selecting&&this.renderer.unitFromPointer(event.clientX,event.clientY);
    const tile=sprite&&this.view?.world.tiles[sprite.tileId];
    return tile?{tileId:tile.id,x:tile.x,y:tile.y}:this.renderer.tileFromPointer(event.clientX,event.clientY);
  }
  currentPathPreview(){
    if(this.uiState.movePlan)return {...this.uiState.movePlan.preview,from:this.selectedUnit(),round:this.view.turn.round};
    if(this.uiState.preview)return {...this.uiState.preview,round:this.view.turn.round};
    const unit=this.selectedUnit();
    return unit?.order?.type==='path'?{from:{x:unit.x,y:unit.y},path:unit.order.path}:null;
  }
  moveSelectedBy(dx,dy){
    const unit=this.selectedUnit();if(!unit)return;
    const width=this.view.world.width;
    this.moveSelectedTo({x:(unit.x+dx+width)%width,y:unit.y+dy},true);
    if(this.uiState.movePlan)this.confirmMove();
  }
  moveSelectedTo(to,singleStep=false){
    const unit=this.selectedUnit();
    if(!unit||unit.ownerId!==this.view?.self.id||unit.transportedByUnitId||this.busy||this.animations.playing)return;
    this.uiState.movePlan=null;this.uiState.preview=null;
    if(to.y<0||to.y>=this.view.world.height)return;
    if(unit.x===to.x&&unit.y===to.y){this.updateNotice('現在の位置です。別のタイルを選んでください');return;}
    const tile=this.view.world.tiles[to.y*this.view.world.width+to.x];
    const enemy=(tile.unitIds||[]).map(id=>this.view.units.find(candidate=>candidate.id===id)).find(candidate=>candidate&&candidate.ownerId!==this.view.self.id&&!candidate.transportedByUnitId);
    const deltaX=Math.abs(unit.x-to.x);const adjacent=Math.max(Math.min(deltaX,this.view.world.width-deltaX),Math.abs(unit.y-to.y))===1;
    let preview;let kind='path';let targetUnitId=null;
    if(adjacent&&enemy){
      if(['settler','worker'].includes(UNITS[enemy.typeId].role)){
        const move=this.engine.inspectMove(this.view.self.id,unit.id,to);
        preview={ok:!move.blocked,reason:move.reason,path:[{...to,arrivalRound:this.view.turn.round}]};kind='move';
      }else{
        preview={...this.engine.getCombatPreview(this.view.self.id,unit.id,enemy.id),path:[{...to,arrivalRound:this.view.turn.round}]};kind='attack';targetUnitId=enemy.id;
      }
    }else if(singleStep){
      const move=this.engine.inspectMove(this.view.self.id,unit.id,to);
      preview={ok:!move.blocked,reason:move.reason,path:[{...to,arrivalRound:this.view.turn.round}],totalCost:move.cost};kind='move';
    }else preview=this.engine.getPathPreview(this.view.self.id,unit.id,to);
    if(!preview.ok||!preview.path.length){this.updateNotice(`移動できません: ${reasonLabel(preview.reason)}`);this.update();return;}
    this.uiState.inputMode='move';this.uiState.preview=null;
    this.uiState.movePlan={unitId:unit.id,to:{...to},preview,kind,targetUnitId,continue:false};
    this.update(`目的地 ${to.x}, ${to.y}。経路を確認してEnterで確定、Escで取消。`);
    this.root?.querySelector('.move-plan')?.scrollIntoView({block:'nearest'});
  }
  setContinueMove(enabled){if(this.uiState.movePlan){this.uiState.movePlan.continue=Boolean(enabled);this.update();}}
  confirmMove(){
    const plan=this.uiState.movePlan;const unit=this.selectedUnit();
    if(!plan||!unit||plan.unitId!==unit.id||this.busy||this.animations.playing)return;
    const path=plan.continue?plan.preview.path:plan.preview.path.filter(step=>step.arrivalRound<=this.view.turn.round);
    if(!path.length){this.updateNotice('今ターンの移動力がありません。自動継続を選ぶか、次の手番に移動してください');return;}
    const command=plan.kind==='attack'?{type:'unit.attack',unitId:unit.id,targetUnitId:plan.targetUnitId}
      :plan.kind==='move'?{type:'unit.move',unitId:unit.id,to:plan.to}
      :{type:'unit.path',unitId:unit.id,path:path.map(({x,y})=>({x,y})),continue:plan.continue};
    const epoch=this.epoch;this.uiState.movePlan=null;this.uiState.preview=null;this.uiState.inputMode='select';
    const result=this.command(command);if(!result.ok){this.update();return;}
    const arrived=this.selectedUnit();const stopped=result.events.find(event=>event.type==='unit.pathStopped');
    if(arrived&&plan.kind!=='attack'){
      const pending=arrived.order?.type==='path'?`。残り${arrived.order.path.length}マスは次の手番に自動継続`:'';
      const limited=!plan.continue&&(arrived.x!==plan.to.x||arrived.y!==plan.to.y)?'。今ターンはここまでです（自動継続なし）':'';
      this.updateNotice(stopped?`移動停止 ${arrived.x}, ${arrived.y}: ${reasonLabel(stopped.data.reason)}`:`移動先 ${arrived.x}, ${arrived.y}${pending}${limited}`);
    }
    void this.presentationPromise.then(()=>{if(epoch===this.epoch&&this.uiState.selected.unitId===unit.id)this.centerSelected();});
  }
  selectTile(tileId){const tile=this.view.world.tiles.find(t=>t.id===tileId); if(!tile)return; this.uiState.selected={tileId,unitId:null,cityId:tile.cityId||null};this.uiState.movePlan=null;this.uiState.preview=null;this.uiState.inputMode='select'; this.update();}
  selectCity(id){const city=this.view.cities.find(c=>c.id===id);if(!city)return;this.uiState.productionCityId=id;this.uiState.movePlan=null;this.uiState.preview=null;this.uiState.inputMode='select';this.uiState.selected={tileId:city.y*this.view.world.width+city.x,unitId:null,cityId:id};this.update();}
  selectUnit(id){const unit=this.view.units.find(u=>u.id===id); if(!unit)return;const city=this.view.cities.find(c=>c.ownerId===this.view.self.id&&c.x===unit.x&&c.y===unit.y);if(city)this.uiState.productionCityId=city.id;this.animations.select(id); this.uiState.selected={tileId:unit.y*this.view.world.width+unit.x,unitId:id,cityId:null};this.uiState.preview=null;this.uiState.movePlan=null;this.uiState.inputMode='select'; this.update();const panel=this.root.querySelector('.command-column');if(panel)panel.scrollTop=0;}
  command(command){if(this.busy||this.animations.playing){this.updateNotice('演出・他文明の行動が終わるまでお待ちください');return {ok:false,reason:'PRESENTATION_BUSY',events:[]};} const before=this.engine.getView(this.view.self.id);const result=this.engine.dispatch({...command,civId:this.view.self.id}); if(!result.ok){this.updateNotice(`命令を実行できません: ${reasonLabel(result.reason)}`);return result;} this.uiState.preview=null;this.uiState.movePlan=null;this.uiState.inputMode='select';this.update(result.events?.at(-1)?.type==='unit.moved'?'部隊が移動しました':'命令を受け付けました'); const battle=result.events?.find(event=>event.type==='combat.resolved');if(battle)this.updateNotice(`戦闘結果: 自軍損害 ${battle.data.attackerDamage} HP / 敵軍損害 ${battle.data.defenderDamage} HP${battle.data.attackerDestroyed?' / 自軍消滅':''}${battle.data.defenderDestroyed?' / 敵軍消滅':''}`);if(this.dialogKind&&!this.root.querySelector('#dialog-layer').classList.contains('hidden'))this.openDialog(this.dialogKind);void this.playUnitClips(buildUnitClips(before,this.view,result.events)); return result;}
  foundCity(){const unit=this.view.units.find(u=>u.id===this.uiState.selected.unitId); const name=`新都市 ${this.view.cities.length+1}`; if(unit)this.command({type:'unit.foundCity',unitId:unit.id,name});}
  setRates(key,value){const rates={...this.view.self.rates,[key]:value}; const others=Object.keys(rates).filter(k=>k!==key); const remainder=100-value; const first=Math.round(remainder/20)*10; rates[others[0]]=clamp(first,0,remainder); rates[others[1]]=remainder-rates[others[0]]; this.command({type:'civ.setRates',rates});}
  declareWar(targetCivId){if(window.confirm('この文明に宣戦布告しますか？関係が悪化し戦争状態になります。'))this.command({type:'diplomacy.declareWar',targetCivId});}
  openDialog(kind){if(!this.view&& !['saves','help'].includes(kind))return; this.dialogKind=kind; const layer=this.root.querySelector('#dialog-layer'); layer.classList.remove('hidden'); this.root.querySelector('#dialog-title').textContent={city:'都市管理',research:'研究評議会',diplomacy:'外交評議会',nation:'国家運営',victory:'勝利進捗',help:'操作ガイド',settings:'ゲーム設定',saves:'保存データ'}[kind]||'詳細'; renderDialog(this,this.view,kind,this.root.querySelector('#dialog-content'));}
  closeDialog(){this.dialogKind=null;this.root.querySelector('#dialog-layer').classList.add('hidden');}
  async endTurn(){
    if(!this.view||this.busy||this.animations.playing||this.view.turn.status!=='running'||this.view.turn.activeCivId!==this.view.self.id)return;
    const epoch=this.epoch;
    const result=this.command({type:'civ.endTurn'});if(!result?.ok)return;
    await this.presentationPromise;
    if(epoch===this.epoch)await this.runComputerTurns();
  }
  async runComputerTurns(){
    if(this.busy)return;
    const epoch=this.epoch;this.busy=true;this.update();
    let animationBudget=1200;
    try{
      const {CivilizationAI}=await import('./ai.mjs');const ai=new CivilizationAI();
      if(epoch!==this.epoch)return;
      let remaining=this.view.config.civilizationCount;
      while(this.view.turn.status==='running'&&this.view.turn.activeCivId!==this.view.self.id&&remaining-->0){
        const id=this.view.turn.activeCivId;const observerId=this.view.self.id;
        const clips=[];let duration=0;
        const facade=Object.freeze({
          getView:(observer)=>observer===id?this.engine.getView(id):null,
          getPathPreview:(observer,...args)=>this.engine.getPathPreview(observer===id?id:null,...args),
          getCombatPreview:(observer,...args)=>this.engine.getCombatPreview(observer===id?id:null,...args),
          dispatch:(command)=>{
            const capture=this.animations.enabled&&duration<animationBudget&&['unit.move','unit.path','unit.attack','civ.endTurn'].includes(command.type);
            const before=capture?this.engine.getView(observerId):null;
            const result=this.engine.dispatch({...command,civId:id});
            if(capture&&result.ok){
              const after=this.engine.getView(observerId);
              for(const clip of buildUnitClips(before,after,result.events)){
                if(duration+clip.duration>animationBudget)break;
                clips.push(clip);duration+=clip.duration;
              }
            }
            return result;
          },
        });
        this.updateNotice(`文明が行動中… ${id}`);
        await new Promise(resolve=>setTimeout(resolve,0));
        if(epoch!==this.epoch)return;
        await ai.runTurn(facade,id);this.update();
        await this.playUnitClips(clips,animationBudget);animationBudget-=duration;
        if(epoch!==this.epoch)return;
        this.update();
        if(this.view.turn.activeCivId===id)throw new Error('AIの手番を終了できませんでした');
      }
      if(epoch!==this.epoch)return;
      await this.autoSave();
      if(this.view.turn.status==='finished')this.openDialog('victory');
      else this.updateNotice(`第${this.view.turn.round}ラウンド / 命令を選んでください`);
    }catch(error){if(epoch===this.epoch)this.updateNotice(`ターン進行に失敗しました: ${error.message}`);}
    finally{if(epoch===this.epoch){this.busy=false;this.update();}}
  }

  nextPending(){
    if(!this.view||this.busy)return;
    const pending=this.view.pending; const ids=pending.uncommandedUnitIds;
    if(ids.length){const next=ids[(ids.indexOf(this.uiState.selected.unitId)+1)%ids.length];this.selectUnit(next);const unit=this.view.units.find(u=>u.id===next);this.renderer.centerOn(unit.x,unit.y);this.update();return;}
    if(pending.cityIdsWithoutProduction.length){this.uiState.selected.cityId=pending.cityIdsWithoutProduction[0];this.openDialog('city');return;}
    if(pending.needsResearch){this.openDialog('research');return;}this.updateNotice('対応待ちはありません。ターン終了ボタンで進めます');
  }
  waitAll(){if(!this.view||this.busy)return;for(const id of [...this.view.pending.uncommandedUnitIds])this.command({type:'unit.wait',unitId:id});}
  renderMapPreview(){
    const p=this.uiState.preview; const unit=this.view.units.find(u=>u.id===this.uiState.selected.unitId);const tile=this.view.world.tiles[this.uiState.hoverTileId];
    const plan=this.uiState.movePlan;
    let message=plan?`目的地 ${plan.to.x}, ${plan.to.y} / Enterで確定 · Escで取消`:this.uiState.inputMode==='move'?'地面のタイルをクリックして目的地を指定 / Escで取消':'左クリックで選択 / 右クリックで経路確認 / 中ドラッグでパン';
    const enemy=tile?.unitIds.map(id=>this.view.units.find(u=>u.id===id)).find(u=>u.ownerId!==this.view.self.id);
    if(!plan&&unit&&enemy){const combat=this.engine.getCombatPreview(this.view.self.id,unit.id,enemy.id);message=combat.ok?`戦力 ${combat.attackerPower.toFixed(1)} 対 ${combat.defenderPower.toFixed(1)} / 勝率 ${Math.round(combat.winChance*100)}%`:reasonLabel(combat.reason);}
    else if(!plan&&p)message=p.ok?`目的地 ${tile.x}, ${tile.y} / 移動費 ${p.totalCost} / 到着 第${p.arrivalRound}ラウンド${p.path.some(step=>step.certainty!=='known')?' / 未知部分は推定':''}`:reasonLabel(p.reason);
    this.root.querySelector('#map-hint').textContent=message;
    this.drawMap();
  }

  async saveManual(){if(!this.view)return this.updateNotice('保存できる年代記がありません');try{await this.store.write({kind:'manual',label:`${this.view.self.name} · 第${this.view.turn.round}ラウンド`,snapshot:this.engine.serialize()});this.updateNotice('手動保存しました');}catch(error){this.updateNotice(`保存に失敗しました: ${error.message}`);}}
  async autoSave(){if(!this.view)return;try{await this.store.write({kind:'auto',snapshot:this.engine.serialize()});}catch(error){this.updateNotice(`自動保存に失敗しました: ${error.message}`);}}
  async loadLatest(){try{const slots=await this.store.list();if(!slots.length)return this.updateNotice('保存データがありません');const snapshot=await this.store.read(slots[0].slotId);this.init({snapshot});this.update('保存データを読み込みました');}catch(error){this.updateNotice(`読込に失敗しました: ${error.message}`);}}
  async exportLatest(){try{const slots=await this.store.list();if(!this.view&&!slots.length)return this.updateNotice('書き出す保存データがありません');const text=this.view?stringifySnapshot(this.engine.serialize()):await this.store.exportJson(slots[0].slotId);const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='chronicle-kingdoms-save.json';link.click();URL.revokeObjectURL(url);this.updateNotice('JSONを書き出しました');}catch(error){this.updateNotice(`書出に失敗しました: ${error.message}`);}}
  async importText(text){try{const snapshot=this.store.importJson(text);this.init({snapshot});this.update('JSONセーブを読み込みました');}catch(error){this.updateNotice(`取込に失敗しました: ${error.message}`);}}
  onCanvasClick(event){
    if(!this.view||this.busy)return;
    const hit=this.pointerTile(event);if(!hit)return;
    if(event.button===2||this.uiState.inputMode==='move'){this.moveSelectedTo({x:hit.x,y:hit.y});return;}
    const tile=this.view.world.tiles[hit.tileId];
    if(tile.unitIds?.length){
      const units=tile.unitIds.map(id=>this.view.units.find(unit=>unit.id===id)).filter(Boolean);
      const selected=this.uiState.selected.tileId===hit.tileId?this.uiState.selected.unitId:null;
      const next=nextStackUnit(units,selected);if(next)this.selectUnit(next.id);
    }else this.selectTile(hit.tileId);
  }

}

export function bindCivilizationEvents(game){const root=game.root;const clean=[];const on=(target,event,handler,opts)=>{target.addEventListener(event,handler,opts);clean.push(()=>target.removeEventListener(event,handler,opts));}; on(root.querySelector('#asset-retry'),'click',()=>game.prepareAssets()); on(root.querySelector('#start-button'),'click',()=>{try{const config=parseConfig(root);game.init({config});const params=new URLSearchParams({rulesVersion:String(RULES_VERSION),seed:String(config.seed),presetId:config.presetId,width:String(config.width),height:String(config.height),civ:String(config.civilizationCount),speed:String(config.speed),rounds:String(config.maxRounds),map:config.mapType});history.replaceState(null,'',`${location.pathname}?${params}`);}catch(error){root.querySelector('#start-error').textContent=error.message;}}); root.querySelectorAll('[data-preset]').forEach(b=>on(b,'click',()=>{root.querySelectorAll('.preset').forEach(x=>x.classList.remove('active'));b.classList.add('active');const p=PRESETS[b.dataset.preset];root.querySelector('#map-size').value=`${p.width}x${p.height}`;root.querySelector('#civ-count').value=p.civCount;root.querySelector('#game-speed').value=p.speed;root.querySelector('#round-limit').value=p.maxTurns;})); on(root.querySelector('#end-turn'),'click',()=>game.endTurn()); on(root.querySelector('#save-button'),'click',()=>game.saveManual()); on(root.querySelector('#load-button'),'click',()=>game.openDialog('saves')); on(root.querySelector('#export-button'),'click',()=>game.exportLatest()); on(root.querySelector('#import-button'),'click',()=>root.querySelector('#import-file').click()); on(root.querySelector('#import-file'),'change',async(e)=>{const file=e.target.files?.[0];if(file)await game.importText(await file.text());e.target.value='';}); on(root.querySelector('#dialog-close'),'click',()=>game.closeDialog()); root.querySelectorAll('[data-dialog]').forEach(b=>on(b,'click',()=>game.openDialog(b.dataset.dialog))); on(root.querySelector('#toggle-minimap'),'click',()=>game.toggleMiniMap()); on(root.querySelector('#center-capital'),'click',()=>game.centerCapital()); on(game.canvas,'click',e=>game.onCanvasClick(e)); on(game.canvas,'contextmenu',e=>{e.preventDefault();game.onCanvasClick(e);}); on(game.canvas,'dblclick',e=>{const hit=game.renderer.tileFromPointer(e.clientX,e.clientY);const tile=hit&&game.view?.world.tiles.find(t=>t.id===hit.tileId);if(tile?.cityId){game.uiState.selected.cityId=tile.cityId;game.openDialog('city');}}); let lastPointer=null; on(game.canvas,'pointerdown',e=>{if(e.button===1){lastPointer={x:e.clientX,y:e.clientY};game.canvas.setPointerCapture(e.pointerId);}}); on(game.canvas,'pointermove',e=>{if(lastPointer){game.renderer.pan(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer={x:e.clientX,y:e.clientY};game.update();}else if(game.view){const hit=game.pointerTile(e);game.uiState.hoverTileId=hit?.tileId??null;const unit=game.view.units?.find(u=>u.id===game.uiState.selected.unitId);game.root.querySelector('#map-coordinates').textContent=hit?`${hit.x}, ${hit.y}`:'—';game.uiState.preview=game.uiState.inputMode==='move'&&!game.uiState.movePlan&&unit&&unit.ownerId===game.view.self.id&&hit?{...game.engine.getPathPreview(game.view.self.id,unit.id,{x:hit.x,y:hit.y}),from:{x:unit.x,y:unit.y}}:null;game.renderMapPreview();}}); on(game.canvas,'pointerleave',()=>{if(!lastPointer){game.uiState.hoverTileId=null;game.uiState.preview=null;game.drawMap();}}); on(game.canvas,'pointerup',e=>{if(e.button===1){lastPointer=null;game.canvas.releasePointerCapture(e.pointerId);}}); on(game.canvas,'wheel',e=>{e.preventDefault();game.renderer.zoomAt(e.deltaY<0?1.12:.9,e.clientX,e.clientY);root.querySelector('#zoom-level').textContent=`${Math.round(game.uiState.camera.zoom*100)}%`;game.update();},{passive:false}); on(window,'resize',()=>{game.renderer.resize();game.update();}); on(window,'keydown',e=>game.onKeyDown(e)); on(root.querySelector('#cancel-setup'),'click',()=>root.querySelector('#start-screen').classList.add('hidden'));on(root.querySelector('#next-pending'),'click',()=>game.nextPending());on(root.querySelector('#wait-all'),'click',()=>game.waitAll());on(root.querySelector('#mini-map'),'click',e=>game.navigateMiniMap(e));on(window,'pagehide',()=>game.suspend());on(window,'pageshow',()=>{if(game.view?.turn.status==='running'&&game.view.turn.activeCivId!==game.view.self.id)void game.runComputerTurns();});return ()=>{clean.forEach(fn=>fn());game.dispose();}; }
