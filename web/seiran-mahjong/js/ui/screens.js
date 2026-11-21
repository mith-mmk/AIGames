import {drawMatchScreen} from './match-screens.js';
import {THEME as T} from './canvas-ui.js';
import {rect,modalLayout,paginate,handLayout,clamp} from './layout.js';
import {DEFAULT_RULES,RULE_FIELDS,YAKU_CATALOG,LOCAL_YAKU,normalizeRules} from '../core/rules.js';
import {AI_PERSONAS,PERSONA_OPTIONS,PERSONA_LABELS,WEIGHT_LABELS,personaById} from '../core/personas.js';
import {tileName} from '../core/tiles.js';
import {getPath,setPath,number as fmt,timeText} from '../ui-utils.js';
import {TABS,PREF_FIELDS} from './settings-data.js';
import {ACTION_NAMES,windName,roundName,lengthName,reasonText} from './labels.js';

const fieldLabel=(field,value)=>field.type==='boolean'?(value?'あり':'なし'):field.type==='select'?(field.options.find(o=>o.value===value)?.label??String(value)):String(value);
function dialog(app,ui,frame,title,maxWidth=1024){
  const d=modalLayout(frame,maxWidth);app.modalBounds=d;ui.beginModal();ui.panel(d,T.panel,12,T.line);
  ui.text(title,d.x+16,d.y+23,{size:frame.narrow?17:20,weight:700,width:d.w-135});
  ui.button('dialog-close','×',rect(d.x+d.w-46,d.y+8,34,30),()=>app.close(),{size:23,quiet:true});
  ui.line(d.x+12,d.y+46,d.x+d.w-12,d.y+46);return d;
}
function pageFooter(app,ui,d,page,extra=[]){
  const f=d.footer,buttons=[{id:'page-prev',label:'前へ',fn:()=>app.changePage(-1),disabled:page.page===0},{id:'page-next',label:'次へ',fn:()=>app.changePage(1),disabled:page.page>=page.pageCount-1},...extra];
  const gap=8,w=(f.w-gap*(buttons.length-1))/buttons.length;
  buttons.forEach((b,i)=>ui.button(b.id,b.label,rect(f.x+i*(w+gap),f.y+8,w,32),b.fn,{disabled:!!b.disabled,primary:!!b.primary,size:14}));
}
function listPage(app,ui,d,items,{rowHeight=68,top=0,reserved=0,extra=[]}={}){
  const m=app.modal,b={...d.body,y:d.body.y+top,h:d.body.h-top},p=paginate(items,m.page,b.h,rowHeight,reserved);m.page=p.page;m.pageCount=p.pageCount;
  ui.text(`${p.page+1} / ${p.pageCount}`,d.x+d.w-60,d.y+24,{align:'right',color:T.muted,size:12,width:62});
  p.items.forEach((entry,i)=>drawEntry(app,ui,entry,rect(b.x,b.y+i*rowHeight+4,b.w,rowHeight-8),p.start+i));
  pageFooter(app,ui,d,p,extra);return p;
}
function drawEntry(app,ui,e,r,index){
  if(e.kind==='field'){drawField(app,ui,e,r);return;}
  if(e.kind==='yaku'){const y=e.yaku,enabled=y.local?(y.id==='openRiichi'?e.draft.openRiichi:e.draft.localYaku[y.id]):true;
    ui.panel(r,T.raised,7,T.line);ui.text(y.name,r.x+12,r.y+17,{size:15,weight:700,width:r.w-105});
    ui.text(y.local?(enabled?'採用':'不採用'):y.yakuman?'役満':`${y.closed}翻`,r.x+r.w-14,r.y+17,{align:'right',size:12,color:enabled?T.accent:T.muted});
    ui.wrap(y.description,r.x+12,r.y+43,r.w-24,{size:12,lineHeight:18,maxLines:Math.max(1,Math.floor((r.h-35)/18))});
    ui.hit(`yaku-${y.id}`,r,()=>app.open('yaku',{yaku:y,draft:e.draft,readOnly:e.readOnly},app.modal),{label:y.name});return;
  }
  if(e.kind==='persona'){const p=e.persona;
    ui.panel(r,T.raised,7,T.line);ui.text(`${p.name} · ${PERSONA_LABELS[p.id]}`,r.x+12,r.y+17,{size:15,weight:700,width:r.w-24});
    ui.text(p.tagline,r.x+12,r.y+43,{size:12,color:T.muted,width:r.w-24});
    ui.hit(`persona-${p.id}`,r,()=>app.open('persona',{persona:p},app.modal),{label:p.name});return;
  }
  if(e.kind==='tiles'){
    const tiles=e.tiles||[],labelHeight=e.label?24:0,h=Math.min(r.h-labelHeight-8,(r.w-16)/Math.max(1,tiles.length)/.71-3),w=h*.71;
    ui.panel(r,T.raised,7,T.line);if(e.label)ui.text(e.label,r.x+12,r.y+14,{size:14,weight:600,width:r.w-24});
    const sx=r.x+(r.w-tiles.length*(w+3)+3)/2;
    tiles.forEach((t,i)=>ui.tile(`list-tile-${index}-${i}`,t,rect(sx+i*(w+3),r.y+labelHeight+4,w,h),null));
    if(e.fn)ui.hit(e.id||`entry-${index}`,r,e.fn,{label:e.label});return;
  }
  if(e.kind==='weight'){
    ui.text(e.label,r.x,r.y+r.h/2,{size:14,width:76});const x=r.x+82,w=Math.max(20,r.w-130);ui.panel(rect(x,r.y+r.h/2-4,w,8),T.raised,4);
    ui.panel(rect(x,r.y+r.h/2-4,w*e.value/100,8),T.accent,4);ui.text(e.value,r.x+r.w,r.y+r.h/2,{align:'right',size:14,color:T.gold});return;
  }
  const active=!!e.active,hover=ui.hover===(e.id||`entry-${index}`);
  ui.panel(r,e.primary?T.gold:hover?T.hover:T.raised,7,active?T.accent:T.line);
  const color=e.primary?T.ink:e.disabled?T.muted:T.text;
  ui.text(e.label,r.x+12,r.y+(e.description?18:r.h/2),{size:e.size||15,weight:e.primary?700:500,color,width:r.w-24});
  if(e.description)ui.wrap(e.description,r.x+12,r.y+41,r.w-24,{size:12,color:e.primary?T.ink:T.muted,lineHeight:18,maxLines:Math.max(1,Math.floor((r.h-35)/18))});
  if(e.fn)ui.hit(e.id||`entry-${index}`,r,e.fn,{disabled:!!e.disabled,label:e.label});
}
function choose(app,title,options,current,set,parent=app.modal){
  app.open('select',{title,options,current,set},parent);
}
function numeric(app,field,value,set,parent=app.modal){
  app.open('number',{field,input:String(value??0),set},parent);
  const m=app.modal;m.commit=()=>{const value=Number(m.input);if(!m.input.trim()||!Number.isFinite(value)){app.toast('数値を入力してください。',true);return;}
    const step=field.step||1;if(value<(field.min??0)||value>(field.max??100)||Math.abs(value/step-Math.round(value/step))>1e-7){app.toast(`${field.min??0}〜${field.max??100}の範囲で、${step}刻みで入力してください。`,true);return;}
    m.set(value);app.close();};
}
function drawField(app,ui,e,r){
  const {field,get,set}=e,value=get(),narrow=r.w<570;const labelWidth=narrow?r.w-24:r.w-264;
  ui.panel(r,T.raised,7,T.line);ui.text(field.label,r.x+12,r.y+17,{size:14,weight:600,width:labelWidth});
  if(field.description)ui.text(field.description,r.x+12,r.y+(narrow?39:42),{size:11,color:T.muted,width:labelWidth});
  const info=rect(r.x+4,r.y+3,narrow?r.w-8:Math.max(1,r.w-258),narrow?48:r.h-6);
  if(field.description)ui.hit(`info-${e.id||field.key}`,info,()=>app.open('info',{title:field.label,text:field.description},app.modal),{label:`${field.label}の説明`});
  const control=narrow?rect(r.x+12,r.y+r.h-35,r.w-24,29):rect(r.x+r.w-238,r.y+(r.h-32)/2,226,32);
  const id=e.id||field.key;
  if(field.type==='boolean')ui.button(`field-${id}`,value?'あり  ✓':'なし',control,()=>{set(!value);app.invalidate();},{active:!!value});
  else if(field.type==='select')ui.button(`field-${id}`,fieldLabel(field,value)+'  ▾',control,()=>choose(app,field.label,field.options,value,v=>{set(v);app.invalidate();}));
  else{
    const bw=34,gap=5;
    ui.button(`minus-${id}`,'−',rect(control.x,control.y,bw,control.h),()=>{set(Math.max(field.min??0,Number(value)-(field.step||1)));app.invalidate();},{disabled:value<=(field.min??0),size:18});
    ui.button(`field-${id}`,String(value)+(field.unit||''),rect(control.x+bw+gap,control.y,control.w-bw*2-gap*2,control.h),()=>numeric(app,field,value,set));
    ui.button(`plus-${id}`,'＋',rect(control.x+control.w-bw,control.y,bw,control.h),()=>{set(Math.min(field.max??100,Number(value)+(field.step||1)));app.invalidate();},{disabled:value>=(field.max??100),size:18});
  }
}
function ruleEntry(app,m,field){return {kind:'field',field,get:()=>getPath(m.draft,field.key),set:value=>{
  if(field.key==='players')app.changePlayers(m.draft,value);else setPath(m.draft,field.key,value);
  if(['openRiichi','localYaku.openRiichi'].includes(field.key)){m.draft.openRiichi=value;m.draft.localYaku.openRiichi=value;}
}};}
function preferenceEntry(m,field){return {kind:'field',id:`pref-${field.key}`,field,get:()=>field.key==='volume'?Math.round(m.prefs.volume*100):m.prefs[field.key],set:value=>{m.prefs[field.key]=field.key==='volume'?value/100:value;}};}
function drawSettings(app,ui,frame){
  const m=app.modal,tab=TABS.find(t=>t.id===m.tab)||TABS[0],d=dialog(app,ui,frame,'卓の設定');
  ui.button('settings-category',tab.name+'  ▾',rect(d.body.x,d.body.y+5,d.body.w,34),()=>choose(app,'設定の分類',TABS.map(t=>({value:t.id,label:t.name,description:t.description})),m.tab,v=>{m.tab=v;m.page=0;}));
  let entries=[];
  if(m.tab==='basic')entries.push({id:'preset',label:'標準ルールへ戻す',description:'四麻・三麻・赤なし四麻の標準値。COMはランダム。',fn:()=>choose(app,'標準ルール',[
    {value:'four',label:'四麻の標準',description:'25,000点持ち・東風・赤各1枚'},
    {value:'three',label:'三麻の標準',description:'35,000点持ち・北抜き・ツモ損あり'},
    {value:'nored',label:'赤なし四麻',description:'25,000点持ち・東南戦'}],null,v=>{m.draft=normalizeRules(v==='three'?{players:3}:v==='nored'?{players:4,length:'south',redCounts:{m:0,p:0,s:0}}:{});m.page=0;})});
  if(m.tab==='dora')entries.push({id:'red-preset',label:'赤牌の枚数パターン',description:`現在：萬${m.draft.redCounts.m}・筒${m.draft.redCounts.p}・索${m.draft.redCounts.s}`,fn:()=>choose(app,'赤牌の枚数',[
    {value:'0,0,0',label:'赤牌なし'},{value:'1,1,1',label:'1枚ずつ'},{value:'2,1,1',label:'2-1-1'}],null,v=>{const [mCount,p,s]=v.split(',').map(Number);m.draft.redCounts={m:mCount,p,s};})});
  const fields=RULE_FIELDS.filter(f=>tab.groups.includes(f.group)&&!(f.key.startsWith('uma.')&&Number(f.key.split('.')[1])>=m.draft.players));
  entries.push(...fields.map(field=>ruleEntry(app,m,field)));
  if(['yaku','local'].includes(m.tab)){
    if(m.tab==='local')entries.push({id:'clear-local',label:'すべてのローカル役を不採用にする',description:'役の説明と翻数は、各役名を選んで確認できます。',fn:()=>{for(const y of LOCAL_YAKU)m.draft.localYaku[y.id]=false;m.draft.openRiichi=false;app.invalidate();}});
    entries.push(...YAKU_CATALOG.filter(y=>y.local===(m.tab==='local')).map(y=>({kind:'yaku',yaku:y,draft:m.draft})));
  }
  if(m.tab==='com'){
    entries.push({id:'all-random',label:'全員をランダムにする',description:'対局開始時に抽選。途中保存・再開では変更しません。',fn:()=>{m.draft.aiPersonas=['random','random','random'];app.invalidate();}});
    entries.push(...Array.from({length:m.draft.players-1},(_,i)=>({kind:'field',id:`com-${i}`,field:{key:`com-${i}`,label:`参加者 COM ${i+1}`,description:'12種類から抽選、または固定の打ち筋を指定。',type:'select',options:PERSONA_OPTIONS},get:()=>m.draft.aiPersonas[i],set:v=>m.draft.aiPersonas[i]=v})));
    entries.push(...AI_PERSONAS.map(persona=>({kind:'persona',persona})));
  }
  if(m.tab==='display')entries.push(...PREF_FIELDS.map(f=>preferenceEntry(m,f)));
  const rowHeight=d.body.w<570?104:66;
  listPage(app,ui,d,entries,{rowHeight,top:46,extra:[{id:'settings-save',label:'設定を保存',fn:()=>app.applySettings(m)},{id:'settings-start',label:'対局を開始',fn:()=>app.applySettings(m,true),primary:true}]});
}
function drawStart(app,ui,frame){
  const m=app.modal,d=dialog(app,ui,frame,'新しい対局',780),r=m.draft;
  const fields=['players','length'].map(key=>RULE_FIELDS.find(f=>f.key===key));
  const com=Array.from({length:r.players-1},(_,i)=>({kind:'field',id:`start-com-${i}`,field:{key:`start-com-${i}`,label:`COM ${i+1}`,description:'対局開始時に抽選。対局中は同じ打ち筋。',type:'select',options:PERSONA_OPTIONS},get:()=>r.aiPersonas[i],set:v=>r.aiPersonas[i]=v}));
  const entries=[...fields.map(f=>ruleEntry(app,m,f)),...com,{label:`持ち点 ${fmt(r.initialPoints)} ／ 返し点 ${fmt(r.returnPoints)}`,description:'現在の対局は「前回の対局」として保存されます。'}];
  listPage(app,ui,d,entries,{rowHeight:d.w<594?104:70,extra:[{id:'start-settings',label:'詳細設定',fn:()=>app.openSettings(r)},{id:'start-match',label:'対局を開始',fn:()=>app.startGame(r),primary:true}]});
}
function drawSelector(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,m.title,800);listPage(app,ui,d,m.options.map((o,i)=>({id:`select-${String(o.value)}`,label:(m.current===o.value?'✓ ':'')+o.label,description:o.description,active:m.current===o.value,fn:()=>{m.set(o.value);app.close();}})),{rowHeight:frame.narrow?82:64});}
function drawNumber(app,ui,frame){
  const m=app.modal,d=dialog(app,ui,frame,m.field.label,520),b=d.body;
  ui.panel(rect(b.x,b.y+8,b.w,36),T.raised,6,T.gold);ui.text(m.input||' ',b.x+b.w-12,b.y+26,{align:'right',size:22,width:b.w-24});
  ui.text(`${m.field.min??0}〜${m.field.max??100} ／ ${m.field.step||1}刻み`,b.x,b.y+59,{size:12,color:T.muted,width:b.w});
  const top=b.y+75,keys=['7','8','9','4','5','6','1','2','3','−','0','⌫'],gap=7,w=(b.w-gap*2)/3,h=Math.min(48,(b.h-84-gap*3)/4);
  keys.forEach((key,i)=>ui.button(`key-${i}`,key,rect(b.x+(i%3)*(w+gap),top+Math.floor(i/3)*(h+gap),w,h),()=>{
    if(key==='⌫')m.input=m.input.slice(0,-1);else if(key==='−')m.input=m.input.startsWith('-')?m.input.slice(1):'-'+m.input;else m.input=(m.input==='0'?'':m.input)+key;app.invalidate();
  },{size:20}));
  ui.button('number-clear','全消去',rect(d.footer.x,d.footer.y+8,(d.footer.w-8)/2,32),()=>{m.input='';app.invalidate();});
  ui.button('number-confirm','確定',rect(d.footer.x+(d.footer.w+8)/2,d.footer.y+8,(d.footer.w-8)/2,32),m.commit,{primary:true});
}
function yakuValues(y,draft){
  const over=draft.yakuOverrides[y.id]||{},key={junseiChuuren:'pureNineGatesDouble',suuankouTanki:'suuankouTankiDouble',kokushi13:'kokushi13Double',daisuushii:'daisuushiiDouble'}[y.id];
  const mult=y.id==='daichisei'?draft.daichiseiMultiplier:key&&draft[key]&&draft.doubleYakuman?2:y.yakuman||0;
  return {closed:over.closed??y.closed,open:over.open??y.open,yakuman:over.yakuman??mult};
}
function drawYaku(app,ui,frame){
  const m=app.modal,y=m.yaku,d=dialog(app,ui,frame,y.name,850),values=yakuValues(y,m.draft),entries=[];
  // All explanations are available without clipping: split into short paragraph rows.
  const chars=frame.narrow?64:135,text=y.description;
  for(let i=0;i<text.length;i+=chars)entries.push({label:i?'成立条件（続き）':'成立条件',description:text.slice(i,i+chars)});
  if(m.readOnly){entries.push({label:values.yakuman?`${values.yakuman}倍役満`:`門前 ${values.closed}翻${values.open==null?'・門前限定':` ／ 副露 ${values.open}翻`}`,description:y.local?`採用状態：${(y.id==='openRiichi'?m.draft.openRiichi:m.draft.localYaku[y.id])?'あり':'なし'}`:'対局中のルールで表示。'});}
  else{
    if(y.local)entries.push({kind:'field',field:{key:`enable-${y.id}`,label:'この役を採用',type:'boolean'},get:()=>y.id==='openRiichi'?m.draft.openRiichi:!!m.draft.localYaku[y.id],set:v=>{m.draft.localYaku[y.id]=v;if(y.id==='openRiichi')m.draft.openRiichi=v;}});
    const keys=y.yakuman?['yakuman']:['closed',...(y.open==null?[]:['open']),...(y.local?['yakuman']:[])];
    entries.push(...keys.map(key=>({kind:'field',field:{key:`yaku-${y.id}-${key}`,label:{closed:'門前の翻数',open:'副露の翻数',yakuman:'役満の倍数'}[key],description:key==='yakuman'?'0で役満扱いを無効化。通常役は設定した翻数で計算。':'0でこの状態の役加算を無効化。',type:'number',min:0,max:key==='yakuman'?6:13,step:1},get:()=>yakuValues(y,m.draft)[key],set:v=>{m.draft.yakuOverrides[y.id]??={};m.draft.yakuOverrides[y.id][key]=v;}})));
    entries.push({id:'yaku-reset',label:'この役の翻数・倍率を標準に戻す',fn:()=>{delete m.draft.yakuOverrides[y.id];app.invalidate();}});
  }
  listPage(app,ui,d,entries,{rowHeight:d.w<594?104:78});
}
function drawPersona(app,ui,frame){const m=app.modal,p=m.persona,d=dialog(app,ui,frame,`${p.name} · ${PERSONA_LABELS[p.id]}`,680);
  ui.text(p.tagline,d.body.x,d.body.y+18,{size:13,color:T.muted,width:d.body.w});
  listPage(app,ui,d,Object.entries(p.weights).map(([key,value])=>({kind:'weight',label:WEIGHT_LABELS[key],value})),{top:36,rowHeight:32});
}
function drawMenu(app,ui,frame){const d=dialog(app,ui,frame,'メニュー',820),p=app.preferences;
  const entries=[
    {id:'menu-history',label:'対戦成績',description:'過去の順位・精算・和了履歴・点数推移。',fn:()=>app.showHistory()},
    {id:'menu-graph',label:'点数推移',description:'開始時と各局精算後の点数・供託を確認。',fn:()=>app.open('graph')},
    {id:'menu-data',label:'データ管理',description:'ZIPバックアップ、JSON入出力、統合・選択復元。',fn:()=>app.open('data')},
    {id:'menu-save',label:'保存・再開',description:'手動保存、以前の対局、保存ファイルの入出力。',fn:()=>app.open('save')},
    {id:'menu-record',label:'牌譜',description:'操作記録、卓上再生、牌譜ファイル。',fn:()=>app.open('record')},
    {id:'menu-catalog',label:'役・牌の図鑑',description:'基本役とローカル役の成立条件、全34種の牌。',fn:()=>app.open('catalog',{tab:'standard'})},
    {id:'menu-analysis',label:'手牌分析',description:'向聴数・受け入れ・推定危険度。',fn:()=>app.showAnalysis(),disabled:app.replayMode},
    {id:'menu-options',label:'対局の操作設定',description:'鳴きなし、自動和了、ツモ切り、速度、効果音。',fn:()=>app.open('options')},
    {id:'menu-settings',label:'卓の設定',description:'三麻・四麻、ルール、ランダムCOM、表示設定。',fn:()=>app.openSettings()},
    {id:'menu-guide',label:'操作ガイド',description:'牌の選択・確定、キーボードとタッチの使い方。',fn:()=>app.open('guide')},
  ];listPage(app,ui,d,entries,{rowHeight:64});
}
function drawOptions(app,ui,frame){const d=dialog(app,ui,frame,'対局の操作設定',760);
  const entries=[...['noCall','autoWin','autoDiscard','sound'].map((key,i)=>({kind:'field',field:{key,label:['鳴きなし','自動和了','ツモ切り','効果音'][i],description:['鳴きを見送ります。ロン・ツモは見送りません。','和了可能なら自動的に和了。','自分の番で引いた牌を自動的に打牌。','牌・サイコロ・鳴き・和了の音。'][i],type:'boolean'},get:()=>app.preferences[key],set:()=>app.toggle(key)})),
    ...PREF_FIELDS.filter(f=>['speed','view','volume'].includes(f.key)).map(field=>({kind:'field',field,get:()=>field.key==='volume'?Math.round(app.preferences.volume*100):app.preferences[field.key],set:v=>{if(field.key==='view')app.setView(v);else{app.preferences[field.key]=field.key==='volume'?v/100:v;app.sound.volume=app.preferences.volume;app.savePreferences();}}}))];
  listPage(app,ui,d,entries,{rowHeight:d.w<594?104:66});
}
function saveSummary(data){if(!data)return '保存なし';try{const parsed=JSON.parse(data.state),s=parsed.state??parsed;return `${s.rules.players}人打ち ${roundName(s)} ${fmt(s.players[0].score)}点 · ${timeText(data.savedAt)}`;}catch{return '保存データ';}}
function drawSave(app,ui,frame){const d=dialog(app,ui,frame,'保存・再開',850);const entries=[
  {id:'save-now',label:'現在の対局を手動保存',description:'このブラウザの保存領域に記録。',fn:()=>app.manualSave(),primary:true},
  ...[['auto','自動保存'],['manual','手動保存'],['previous','前回の対局']].map(([key,label])=>({id:`restore-${key}`,label:`${label}を再開`,description:saveSummary(app.getSlot(key)),disabled:!app.getSlot(key),fn:()=>app.restoreSlot(key)})),
  {id:'save-file',label:'保存ファイルを書き出す',description:'点数・牌山・選ばれたCOMの打ち筋も保持します。',fn:()=>app.exportSave()},
  {id:'load-file',label:'保存・牌譜ファイルを読み込む',description:'JSONを選択。PCではこの画面へのドロップにも対応。',fn:()=>app.pickFile()},
];listPage(app,ui,d,entries,{rowHeight:70});}
function drawRecord(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,'牌譜',900),log=(app.game.state.log||[]).filter(e=>e.type!=='draw'||e.player===0||['handEnd','matchEnd'].includes(app.game.state.phase));
  const entries=[{id:'replay-start',label:`卓で牌譜を再生 · ${app.replayFrames.length}局面`,description:'前後の局面へ移動。終了すると現在の対局へ戻ります。',fn:()=>app.enterReplay(),disabled:app.replayFrames.length<2,primary:true},
    {id:'record-export',label:'牌譜を書き出す',description:'対局の保存データと再生用の局面。',fn:()=>app.exportReplay()},
    {id:'record-actions',label:'操作記録を書き出す',fn:()=>app.exportActions()},
    {id:'record-import',label:'牌譜ファイルを読み込む',fn:()=>app.pickFile()},
    ...[...log].reverse().map(e=>({label:`${e.id}  ${app.eventLabel(e)}`,description:`${roundName(e)} ${e.honba??0}本場`}))];
  listPage(app,ui,d,entries,{rowHeight:64});
}
const GUIDE=[
 ['牌を選ぶ・打牌する','手牌を1回選ぶと選択枠が付きます。「打牌」で確定。ダブルクリックでも確定できます。確定前は選び直せますが、確定後は取り消せません。'],
 ['鳴き・立直・和了','合法な操作だけを表示します。チー・ポン・カンに複数の候補がある場合は使う牌を選択。リーチは宣言牌を選んで確定します。'],
 ['キーボード','左右キーで手牌を選択、Enterで打牌。Rでリーチ、Nで北抜き、Spaceで和了。Tab／Shift+Tabでボタン移動、Enterで実行。Escapeで戻ります。'],
 ['枠内の設定画面','分類とページで設定を切り替えます。前へ・次へボタン、ホイール、上下スワイプ、PageUp／PageDownに対応。数値は±または数字パネルから入力。'],
 ['3D卓の視点','卓の空いている場所をドラッグして回転、ホイールやピンチで拡大縮小。「視点」で俯瞰・真上・手元へ戻せます。メニュー上では視点が動きません。'],
 ['途中保存と再開','操作ごとに自動保存。同じ端末・同じサイトで再開できます。メニューの保存画面で手動保存やJSON入出力。ランダムで選ばれたCOMも変化しません。'],
 ['COMのランダム設定','各COMの初期値はランダム。新規対局ごとに12種類から独立に抽選し、対局終了まで固定します。同じ打ち筋が複数の席になる場合があります。'],
 ['ルールの反映','対局ルールとCOMは次の新規対局から適用。進行中の対局は元のルールを維持します。三麻は萬子2〜8を除き、チー禁止。'],
 ['入力と画面の制約','操作UIは画面内に描画しています。保存ファイル選択はブラウザの標準ダイアログを利用します。拡大読取ソフトではCanvasの文字を個別に読み上げられない場合があります。'],
];
function drawGuide(app,ui,frame){const d=dialog(app,ui,frame,'操作ガイド',900);listPage(app,ui,d,GUIDE.map(([label,description])=>({label,description})),{rowHeight:frame.narrow?136:98});}
function drawCatalog(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,'役・牌の図鑑');
  const tabs=[['standard','基本役'],['local','ローカル役'],['tiles','麻雀牌']];const gap=6,w=(d.body.w-gap*2)/3;
  tabs.forEach(([id,label],i)=>ui.button(`catalog-${id}`,label,rect(d.body.x+i*(w+gap),d.body.y+5,w,32),()=>{m.tab=id;m.page=0;app.invalidate();},{active:m.tab===id}));
  if(m.tab==='tiles'){
    const groups=[['萬子',Array.from({length:9},(_,type)=>({type,red:false}))],['筒子',Array.from({length:9},(_,i)=>({type:i+9,red:false}))],['索子',Array.from({length:9},(_,i)=>({type:i+18,red:false}))],['字牌',Array.from({length:7},(_,i)=>({type:i+27,red:false}))],['赤五牌',[4,13,22].map(type=>({type,red:true}))]];
    listPage(app,ui,d,groups.map(([label,tiles])=>({kind:'tiles',label,tiles})),{top:44,rowHeight:frame.narrow?90:108});
  }else listPage(app,ui,d,YAKU_CATALOG.filter(y=>y.local===(m.tab==='local')).map(y=>({kind:'yaku',yaku:y,draft:app.state.rules,readOnly:true})),{top:44,rowHeight:frame.narrow?106:78});
}
function drawChoices(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,`${ACTION_NAMES[m.type]}に使う牌`,720),s=app.game.state,p=s.players[0],last=s.response?.tile||s.lastDiscard?.tile;
  const items=m.choices.map((choice,i)=>{const tiles=(choice.tileIds||[choice.tileId]).map(id=>p.hand.find(t=>t.id===id)).filter(Boolean);if(['chi','pon','minkan'].includes(m.type)&&last)tiles.push(last);
    return {kind:'tiles',id:`choice-${i}`,label:choice.label||ACTION_NAMES[m.type],tiles,fn:()=>{app.modal=null;app.doAction(choice);}};});listPage(app,ui,d,items,{rowHeight:106});
}
function drawResult(app,ui,frame){const s=app.game.state,r=s.result,d=dialog(app,ui,frame,s.phase==='matchEnd'?'対局結果':'局結果',950);if(!r){listPage(app,ui,d,[{label:'まだ局は終了していません。'}]);return;}
  const entries=[{label:r.title||({ron:'ロン',tsumo:'ツモ',exhaustive:'流局',abortive:'途中流局'}[r.kind]||'局終了'),description:`${roundName(s)} ${s.honba}本場${r.continueDealer?' · 親が連荘':''}${r.reason?' · '+reasonText(r.reason):''}`}];
  for(const [i,w] of (r.winners||[]).entries())entries.push({id:`winner-${i}`,label:`${s.players[w.player].name} ${r.kind==='tsumo'?'ツモ':'ロン'} · ${w.score.yakuman?w.score.yakuman+'倍役満':`${w.score.han}翻 ${w.score.fu}符`} · +${fmt(r.deltas?.[w.player]||0)}点`,description:'和了牌、成立役、点数の内訳を確認。',fn:()=>app.open('winner',{winner:w},app.modal)});
  if(r.tenpai?.length)entries.push({label:'聴牌',description:r.tenpai.map(i=>s.players[i].name).join('・')});
  if(s.phase==='matchEnd'&&s.standings)entries.push(...s.standings.map(p=>({label:`${p.rank}位  ${p.name}  ${fmt(p.score)}点`,description:`ウマ ${p.uma>0?'+':''}${p.uma} ／ 精算 ${p.result>0?'+':''}${Number(p.result).toFixed(1)}`})));
  else entries.push(...s.players.map((p,i)=>({label:`${windName(p.seatWind)} ${p.name}  ${fmt(p.score)}点`,description:`増減 ${(r.deltas?.[i]??0)>0?'+':''}${fmt(r.deltas?.[i]??0)}点`})))
  listPage(app,ui,d,entries,{rowHeight:68,extra:[{id:'result-record',label:'牌譜',fn:()=>app.open('record')},{id:'result-next',label:s.phase==='matchEnd'?'新しい対局':'次の局へ',fn:()=>s.phase==='matchEnd'?app.quickStart():app.nextHand(),primary:true}]});
}
function drawWinner(app,ui,frame){const m=app.modal,w=m.winner,p=app.game.state.players[w.player],score=w.score||{},d=dialog(app,ui,frame,`${p.name}の和了`,950);
  const entries=[{kind:'tiles',label:'和了牌',tiles:w.tiles||p.hand},...(w.melds||p.melds).map(meld=>({kind:'tiles',label:ACTION_NAMES[meld.kind]||meld.kind,tiles:meld.tiles})),
    {label:score.yakuman?`${score.yakuman}倍役満`:`${score.han||0}翻 ${score.fu||0}符`,description:`${score.limit||''} ／ 受取 ${fmt(app.game.state.result.deltas?.[w.player]||0)}点（供託・本場を含む）`},
    ...(score.yaku||[]).map(y=>({label:y.name,description:y.yakuman?`${y.yakuman}倍役満`:`${y.han}翻`}))];
  listPage(app,ui,d,entries,{rowHeight:96});
}
function drawAnalysis(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,'手牌分析',850),v=m.best||m.analysis,sh=v.shanten,entries=[
  {label:sh<0?'和了形':sh===0?'聴牌':`${sh}向聴`,description:`${app.selected==null?'手牌を評価':'選択牌を切った場合'} ／ 受け入れ ${fmt(v.ukeire||0)}枚 ／ 推定危険度 ${Math.round((v.danger||0)*100)}%`},
  ...(m.waits.length?[{kind:'tiles',label:'待ち牌',tiles:m.waits.map(type=>({type,red:false}))}]:[]),
  {label:'公開情報だけから計算',description:'危険度は推定です。他家の伏せ牌と未来の山は判断に使いません。和了には役とフリテン条件も必要です。'},
];listPage(app,ui,d,entries,{rowHeight:105});}
function drawInfo(app,ui,frame){const m=app.modal,d=dialog(app,ui,frame,m.title,820);const chunk=frame.narrow?105:220,entries=[];for(let i=0;i<m.text.length;i+=chunk)entries.push({label:i?'説明（続き）':'説明',description:m.text.slice(i,i+chunk)});listPage(app,ui,d,entries,{rowHeight:135});}

function drawHud(app,ui,f){
  const s=app.state,p=s.players[0],h=f.header,seat=f.seats,dock=f.dock,compact=f.compact;
  ui.panel(h,T.bg,0);ui.line(h.x,h.y+h.h-1,h.x+h.w,h.y+h.h-1);
  const rightButtons=[['hud-new','新局',()=>app.quickStart()],['hud-settings','設定',()=>app.openSettings()],['hud-menu','メニュー',()=>app.open('menu')]];
  const bw=f.narrow?64:70,gap=6,total=bw*3+gap*2,start=h.x+h.w-total-10;
  rightButtons.forEach(([id,label,fn],i)=>ui.button(id,label,rect(start+i*(bw+gap),h.y+6,bw,h.h-12),fn,{primary:id==='hud-new',size:13}));
  const brandW=f.narrow?Math.max(1,start-h.x-18):Math.min(170,h.w*.18);
  ui.text(f.narrow?'翠嵐麻雀':'翠嵐  麻雀',h.x+12,h.y+h.h/2,{size:compact?17:21,color:T.gold,weight:700,width:brandW});
  if(!f.narrow){const roundX=h.x+brandW+24;ui.text(`${s.rules.players}人打ち · ${lengthName(s.rules)}   ${roundName(s)} ${s.honba}本場  残り${s.remaining}枚`,roundX,h.y+h.h/2,{size:compact?13:15,width:start-roundX-14});}
  ui.panel(seat,T.panel,0);const pc=s.players.length-1,doraW=f.narrow?0:Math.min(210,seat.w*.22),sw=(seat.w-doraW-20)/pc;
  for(let i=1;i<s.players.length;i++){
    const player=s.players[i],x=seat.x+10+(i-1)*sw,r=rect(x,seat.y+3,sw-6,seat.h-6),active=s.turn===i&&s.phase==='discard';
    ui.panel(r,active?T.hover:T.panel,6,active?T.accent:null);
    ui.text(`${windName(player.seatWind)} ${player.name} ${fmt(player.score)}`,x+7,seat.y+(f.narrow?16:seat.h/2-7),{size:compact?12:14,weight:600,width:sw-20});
    ui.text(player.riichi?(player.openRiichi?'オープン立直':'立直'):PERSONA_LABELS[player.persona],x+7,seat.y+(f.narrow?37:seat.h/2+10),{size:10,color:player.riichi?T.gold:T.muted,width:sw-20});
    ui.hit(`seat-${i}`,r,()=>app.open('persona',{persona:personaById(player.persona)}),{label:`${player.name}の打ち筋`});
  }
  if(doraW){const x=seat.x+seat.w-doraW;ui.text('表示牌',x,seat.y+seat.h/2,{size:11,color:T.muted});const count=(s.doraIndicators||[]).length,tw=Math.min((seat.h-8)*.71,(doraW-50-count*3)/Math.max(1,count)),th=tw/.71;
    (s.doraIndicators||[]).forEach((t,i)=>ui.tile(`dora-${i}`,t,rect(x+44+i*(tw+3),seat.y+4,tw,th),null));
  }
  const stage=f.stage;
  if(f.narrow){ui.panel(rect(stage.x+8,stage.y+6,stage.w-16,26),'rgba(8,31,28,.90)',5);ui.text(`${roundName(s)} ${s.honba}本場  残${s.remaining}枚  供託${fmt(s.riichiPot*1000)}点`,stage.x+16,stage.y+19,{size:12,width:stage.w-100});}
  if(f.narrow){const ds=s.doraIndicators||[];ui.panel(rect(stage.x+8,stage.y+38,Math.min(stage.w-16,48+ds.length*25),38),'rgba(8,31,28,.9)',5);
    ui.text('表示牌',stage.x+14,stage.y+57,{size:10,color:T.muted});ds.forEach((t,i)=>ui.tile(`dora-small-${i}`,t,rect(stage.x+52+i*25,stage.y+40,22,31),null));}
  ui.button('hud-view','視点',rect(stage.x+stage.w-64,stage.y+7,54,28),()=>choose(app,'視点',[{value:'table',label:'俯瞰'},{value:'top',label:'真上'},{value:'player',label:'手元'}],app.preferences.view,v=>app.setView(v)),{size:12});
  if(!f.narrow&&stage.h>180){
    ui.text(`供託 ${fmt(s.riichiPot*1000)}点`,stage.x+14,stage.y+22,{size:12,color:T.muted});
    if(app.lastAction)ui.text(app.eventLabel(app.lastAction),stage.x+14,stage.y+stage.h-18,{size:12,color:T.muted,width:Math.min(stage.w-28,440)});
  }
  const analysis=app.inlineAnalysis();if(analysis&&!app.modal&&stage.h>104){const y=stage.y+(f.narrow?83:42),w=Math.min(stage.w-20,440);
    ui.panel(rect(stage.x+10,y,w,26),'rgba(8,31,28,.95)',5);ui.text(analysis,stage.x+18,y+13,{size:11,color:T.accent,width:w-16});}
  ui.panel(dock,T.bg,0);ui.line(dock.x,dock.y,dock.x+dock.w,dock.y,T.line);
  const infoY=dock.y+(compact?13:17),nameW=f.narrow?Math.min(143,dock.w*.41):185;
  ui.text(`${windName(p.seatWind)} あなた  ${fmt(p.score)}`,dock.x+12,infoY,{size:compact?12:15,color:T.gold,weight:700,width:nameW});
  ui.text(app.handStatus(),dock.x+nameW+20,infoY,{size:compact?11:13,color:s.turn===0?T.accent:T.muted,width:dock.w-nameW-32});
  const tiles=app.hand,boxes=handLayout(f,tiles),legal=new Set(app.actions.filter(a=>a.type===(app.declaration||'discard')).map(a=>a.tileId));
  tiles.forEach((tile,i)=>ui.tile(`hand-${tile.id}`,tile,boxes[i],()=>app.selectTile(tile.id),{selected:tile.id===app.selected,legal:legal.has(tile.id)&&!app.replayMode,drawn:tile.drawn,label:app.preferences.tileNames?tileName(tile):i+1,doubleClick:()=>app.commitTile(tile.id)}));
  let buttons=app.getActionButtons(),utilityW=f.narrow?0:70;
  const row=rect(dock.x+10,dock.y+dock.h-34,dock.w-20,28);
  if(utilityW){ui.button('hud-analysis','分析',rect(row.x,row.y,60,row.h),()=>app.showAnalysis(),{size:12,disabled:app.replayMode});}
  const available=row.w-utilityW;
  if(buttons.length>Math.floor(available/68)){
    const primary=buttons.find(b=>b.primary&&!b.disabled)||buttons.at(-1);
    buttons=[{id:'all-actions',label:'操作を選択',fn:()=>app.open('actionMenu',{buttons:app.getActionButtons()})},...(primary?[primary]:[])];
  }
  const maxW=f.narrow?available:Math.min(available,buttons.length*116),bx=row.x+row.w-maxW;
  if(buttons.length){const gap=6,bw=(maxW-gap*(buttons.length-1))/buttons.length;buttons.forEach((b,i)=>ui.button(b.id,b.label,rect(bx+i*(bw+gap),row.y,bw,row.h),b.fn,{primary:b.primary,disabled:b.disabled,size:13}));}
  if(!f.narrow){const selected=tiles.find(t=>t.id===app.selected);ui.text(selected?`${tileName(selected)}を選択中 · 確定後の取消不可`:`速度 ×${app.preferences.speed}${app.preferences.noCall?' · 鳴きなし':''}${app.preferences.autoDiscard?' · ツモ切り':''}`,row.x+utilityW+6,row.y+14,{size:11,color:T.muted,width:Math.max(0,bx-row.x-utilityW-12)});}
  if(app.banner&&!app.modal){const w=Math.min(340,stage.w-28),bh=stage.h<170?62:84;ui.panel(rect(stage.x+(stage.w-w)/2,stage.y+(stage.h-bh)/2,w,bh),'rgba(8,26,21,.95)',10,T.gold);
    ui.text(app.banner.label,stage.x+stage.w/2,stage.y+stage.h/2-9,{size:stage.h<170?23:32,align:'center',weight:700,color:T.gold,width:w-20});ui.text(app.banner.name,stage.x+stage.w/2,stage.y+stage.h/2+23,{size:12,align:'center',color:T.muted});}
}
export function drawScreen(app,ui,frame){
  drawHud(app,ui,frame);
  if(app.modal&&!drawMatchScreen(app,ui,frame)){switch(app.modal.kind){
    case 'settings':drawSettings(app,ui,frame);break;case 'start':drawStart(app,ui,frame);break;case 'select':drawSelector(app,ui,frame);break;case 'number':drawNumber(app,ui,frame);break;
    case 'yaku':drawYaku(app,ui,frame);break;case 'persona':drawPersona(app,ui,frame);break;case 'menu':drawMenu(app,ui,frame);break;case 'options':drawOptions(app,ui,frame);break;
    case 'save':drawSave(app,ui,frame);break;case 'record':drawRecord(app,ui,frame);break;case 'guide':drawGuide(app,ui,frame);break;case 'catalog':drawCatalog(app,ui,frame);break;
    case 'choices':drawChoices(app,ui,frame);break;case 'result':drawResult(app,ui,frame);break;case 'winner':drawWinner(app,ui,frame);break;case 'analysis':drawAnalysis(app,ui,frame);break;
    case 'actionMenu':{const m=app.modal,d=dialog(app,ui,frame,'操作を選択',600);listPage(app,ui,d,m.buttons.map(b=>({id:`menu-${b.id}`,label:b.label,disabled:b.disabled,primary:b.primary,fn:()=>{app.modal=null;b.fn();}})),{rowHeight:50});break;}
    default:drawInfo(app,ui,frame);
  }}
  if(app.toastMessage){const {message,error}=app.toastMessage,d=app.modal&&app.modalBounds,
    w=d?d.w-130:Math.min(620,frame.safe.w-24),x=d?d.x+12:frame.safe.x+(frame.safe.w-w)/2,
    y=d?d.y+4:Math.max(frame.stage.y+5,frame.dock.y-54),height=d?38:48;
    ui.panel(rect(x,y,w,height),error?'#4d201c':'#16382b',6,error?T.danger:T.gold);
    ui.wrap(message,x+8,y+11,w-16,{size:d?10:12,color:T.text,lineHeight:d?15:19,maxLines:2});
    ui.hit('dismiss-toast',rect(x,y,w,height),()=>{app.toastMessage=null;app.invalidate();},{label:'通知を閉じる'});}
}
