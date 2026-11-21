import {THEME as T} from './canvas-ui.js';
import {rect,modalLayout,paginate} from './layout.js';
import {number as fmt,timeText,getPath} from '../ui-utils.js';
import {roundName,windName,ACTION_NAMES} from './labels.js';
import {aggregate,settlement} from '../data/records.js';
import {PERSONA_LABELS} from '../core/personas.js';
import {RULE_FIELDS,YAKU_CATALOG} from '../core/rules.js';

const sign=n=>`${n>0?'+':''}${fmt(n)}`;
const colors=['#f2ce79','#88d5fb','#e7a8e5','#9dd8ac'];
function shell(app,ui,f,title,maxWidth=1120,{locked=false}={}){
  const d=modalLayout(f,maxWidth);app.modalBounds=d;ui.beginModal();ui.panel(d,T.panel,12,T.line);
  ui.text(title,d.x+14,d.y+23,{size:f.narrow?16:20,weight:700,width:d.w-(locked?24:62)});
  if(!locked)ui.button('dialog-close','×',rect(d.x+d.w-44,d.y+8,32,30),()=>app.close(),{quiet:true,size:19});
  ui.line(d.x+12,d.y+45,d.x+d.w-12,d.y+45);return d;
}
function footer(ui,d,buttons){const gap=7,w=(d.footer.w-gap*(buttons.length-1))/buttons.length;buttons.forEach((b,i)=>ui.button(b.id,b.label,rect(d.footer.x+i*(w+gap),d.footer.y+8,w,32),b.fn,{primary:b.primary,disabled:b.disabled,size:w<120?12:14}));}
function rows(app,ui,d,items,{top=0,rowHeight=64,buttons=[]}={}){
  const m=app.modal,height=d.body.h-top,p=paginate(items,m.page,height,rowHeight);m.page=p.page;m.pageCount=p.pageCount;
  p.items.forEach((item,i)=>{
    const r=rect(d.body.x,d.body.y+top+i*rowHeight+4,d.body.w,rowHeight-8);ui.panel(r,item.primary?T.gold:T.raised,7,T.line);
    ui.text(item.label,r.x+10,r.y+(item.description?16:r.h/2),{size:item.size||14,weight:600,color:item.primary?T.ink:T.text,width:r.w-20});
    if(item.description)ui.wrap(item.description,r.x+10,r.y+38,r.w-20,{size:12,lineHeight:17,maxLines:Math.max(1,Math.floor((r.h-31)/17))});
    if(item.fn)ui.hit(item.id||`row-${p.start+i}`,r,item.fn,{label:item.label,disabled:item.disabled});
  });
  footer(ui,d,[{id:'page-prev',label:`前へ ${p.page+1}/${p.pageCount}`,fn:()=>app.changePage(-1),disabled:!p.page},{id:'page-next',label:'次へ',fn:()=>app.changePage(1),disabled:p.page===p.pageCount-1},...buttons]);
}
function dice(ui,x,y,values,rolling,scale=1){
  const size=42*scale,gap=14*scale;
  values.forEach((value,i)=>{
    const r=rect(x+i*(size+gap),y,size,size);ui.panel(rect(r.x+4,r.y+4,size,size),'#a6bfb3',6);ui.panel(r,'#fffdf0',6,'#c2d8c6');
    const n=rolling?1+Math.floor((performance.now()/75+i*3)%6):value;
    const positions={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
    const c=ui.ctx;c.save();c.fillStyle=n===1?'#b61628':'#0d252a';for(const [dx,dy] of positions[n]){c.beginPath();c.arc(r.x+size/2+dx*size*.24,r.y+size/2+dy*size*.24,size*(n===1?.095:.057),0,Math.PI*2);c.fill();}c.restore();
  });
}
function seating(app,ui,f){
  const m=app.modal,s=app.game.state,setup=s.setup,d=shell(app,ui,f,'対局準備 — 席決め・親決め',920,{locked:true}),b=d.body;
  const step=m.step||0,rolling=(app.setupRollingUntil||0)>performance.now();
  const titles=['席順を抽選しました','仮東を決めるサイコロ','起家を決めるサイコロ'];
  ui.text(titles[step],b.x+4,b.y+17,{size:17,weight:700,color:T.gold,width:b.w});
  if(b.h<245){
    const gap=5,w=(b.w-gap*(s.rules.players-1))/s.rules.players;
    s.players.forEach((p,i)=>{const r=rect(b.x+i*(w+gap),b.y+38,w,58);ui.panel(r,T.raised,6,i===s.dealer&&step===2?T.gold:T.line);ui.text(`${i===0?'手前':['','右','奥','左'][i]} · ${step===2?windName(p.seatWind):'席 '+(i+1)}`,r.x+6,r.y+14,{size:11,color:T.muted,width:w-12});ui.text(p.name,r.x+6,r.y+38,{size:14,width:w-12});});
    if(step){dice(ui,b.x+8,b.y+114,step===1?setup.provisionalDice:setup.dealerDice,rolling,.8);ui.wrap(step===1?`仮東：${s.players[setup.provisionalDealer].name}`:`起家：${s.players[s.dealer].name} ／ 東一局から開始`,b.x+105,b.y+127,b.w-110,{size:15,color:T.gold,maxLines:2});}
    else ui.wrap('あなたは手前に表示。参加者の席順は対局が終わるまで固定します。',b.x+4,b.y+121,b.w-8,{size:13,maxLines:2});
  }else{
    s.players.forEach((p,i)=>{const r=rect(b.x,b.y+40+i*48,b.w,42);ui.panel(r,T.raised,6,step===2&&i===s.dealer?T.gold:T.line);ui.text(`${i===0?'あなたの席':'席 '+(i+1)}  ${p.name}`,r.x+9,r.y+15,{size:14,width:r.w-18});ui.text(`${step===2?windName(p.seatWind)+'家 · ':''}${i===0?'プレイヤー':PERSONA_LABELS[p.persona]}`,r.x+9,r.y+31,{size:11,color:T.muted,width:r.w-18});});
    const y=b.y+48*s.rules.players+56;
    if(step){dice(ui,b.x+6,y,step===1?setup.provisionalDice:setup.dealerDice,rolling,.85);ui.wrap(step===1?`仮東：${s.players[setup.provisionalDealer].name}`:`起家：${s.players[s.dealer].name}`,b.x+110,y+18,b.w-110,{size:15,color:T.gold,maxLines:2});}
    else ui.wrap('席順は対局中に変わりません。次にサイコロで最初の親を決めます。',b.x+4,y+12,b.w-8,{size:13,maxLines:3});
  }
  footer(ui,d,[{id:'seating-next',label:step===0?'仮東を決める':step===1?'起家を決める':'配牌して開始',fn:()=>app.advanceSeating(),primary:true,disabled:rolling}]);
}
function context(app){
  const m=app.modal,record=m.record;
  if(record){const hand=record.hands[m.handIndex??record.hands.length-1];return {s:{rules:record.rules,players:record.participants.map((p,i)=>({...p,score:hand.scores[i]})),...hand,phase:'archived',standings:record.standings},r:hand.result,hand,record};}
  const s=app.game.state;return {s,r:s.result,hand:s.handRecords?.at(-1),record:null};
}
function result(app,ui,f){
  const m=app.modal,{s,r,hand,record}=context(app),d=shell(app,ui,f,`${hand?.label||roundName(s)+' '+s.honba+'本場'} — ${r?.title||'局結果'}`),b=d.body;
  if(!r){rows(app,ui,d,[{label:'この局はまだ終わっていません。'}]);return;}
  const end=()=>record?app.close():s.phase==='matchEnd'?app.open('settlement'):app.nextHand();
  const buttons=[{id:'result-detail',label:'点数内訳',fn:()=>app.open('scoreDetail',{record,handIndex:m.handIndex,winnerIndex:m.winnerIndex||0},m)},
    {id:'result-graph',label:'点数推移',fn:()=>app.open('graph',{record},m)},
    {id:'result-next',label:record?'履歴に戻る':s.phase==='matchEnd'?'確認して精算':'確認して次局',fn:end,primary:true}];
  if(!r.winners?.length){
    rows(app,ui,d,[{label:r.title||'流局',description:r.continueDealer?'親が連荘します。':'次の局へ親が移ります。'},...s.players.map((p,i)=>({label:`${p.name}  ${fmt(p.score)}点  ${sign(hand?.netDeltas?.[i]??r.deltas?.[i]??0)}`,description:r.tenpai?.includes(i)?'聴牌':r.kind==='abortive'?'途中流局':'不聴'}))],{rowHeight:Math.min(62,(b.h-4)/(s.rules.players+1)),buttons:buttons.slice(1)});return;
  }
  const index=Math.min(m.winnerIndex||0,r.winners.length-1),w=r.winners[index],score=w.score,p=s.players[w.player];let y=b.y+18;
  if(r.winners.length>1){const width=(b.w-6*(r.winners.length-1))/r.winners.length;r.winners.forEach((v,i)=>ui.button(`winner-tab-${i}`,s.players[v.player].name,rect(b.x+i*(width+6),b.y+3,width,28),()=>{m.winnerIndex=i;m.yakuPage=0;app.invalidate();},{active:i===index}));y+=35;}
  const received=(w.paymentDeltas?.[w.player]??r.deltas?.[w.player]??score.total)+(w.paymentDeltas?w.deposit||0:0);
  const title=`${p.name} · ${r.kind==='tsumo'?'ツモ':'ロン'} ${score.yakuman?score.yakuman+'倍役満':score.han+'翻 '+score.fu+'符 '+(score.limit||'')}  ${sign(received)}点`;
  ui.text(title,b.x+2,y,{size:f.narrow?15:19,weight:700,color:T.gold,width:b.w-4});y+=22;
  const closed=[...(w.tiles||[])];if(w.winTile){const at=closed.findIndex(t=>t.id===w.winTile.id);if(at>=0)closed.push(...closed.splice(at,1));}
  const tiles=[...closed.map(t=>({t,win:t.id===w.winTile?.id})),...(w.melds||[]).flatMap((meld,i)=>meld.tiles.map((t,j)=>({t,group:i+1,label:j===0?(ACTION_NAMES[meld.kind]||'副露'):null})))];
  const stack=b.w<460&&f.h>f.w,cols=stack?7:Math.max(1,tiles.length),rowCount=Math.ceil(tiles.length/cols),gap=3;
  const available=Math.max(35,(b.y+b.h-y-86)/rowCount-12),tileW=Math.min(66,available*.71,(b.w-gap*(cols-1))/cols),tileH=tileW/.71;
  tiles.forEach(({t,win,group,label},i)=>{const row=Math.floor(i/cols),col=i%cols;ui.tile(`win-tile-${i}`,t,rect(b.x+col*(tileW+gap),y+row*(tileH+12),tileW,tileH),null,{selected:!!win});if(label)ui.text(label,b.x+col*(tileW+gap),y+row*(tileH+12)+tileH+8,{size:9,color:T.muted,width:tileW*3});});
  y+=rowCount*(tileH+12)+3;
  const indicators=w.context?.doraIndicators||hand?.doraIndicators||s.doraIndicators||[],ura=w.context?.riichi?(w.context?.uraIndicators||hand?.uraIndicators||[]):[];
  ui.text('表示牌',b.x,y+11,{size:11,color:T.muted,width:46});let dx=b.x+47;
  for(const t of indicators){ui.tile(`dora-${t.id}`,t,rect(dx,y,17,24),null);dx+=20;}
  if(ura.length){ui.text('裏',dx+4,y+11,{size:11,color:T.muted});dx+=24;for(const t of ura){ui.tile(`ura-${t.id}`,t,rect(dx,y,17,24),null);dx+=20;}}
  if(b.w>430)ui.text(`供託 ${sign(w.deposit||0)}点`,b.x+b.w,y+11,{align:'right',size:11,color:T.gold,width:145});
  y+=36;
  const bonus=score.yakuman?[]:[['omote','ドラ'],['ura','裏ドラ'],['red','赤ドラ'],['nuki','抜きドラ']].filter(([key])=>score.dora?.[key]>0).map(([key,name])=>`${name} ${score.dora[key]}翻`);
  const yaku=[...(score.yaku||[]).map(v=>`${v.name} ${v.yakuman?v.yakuman+'倍役満':v.han+'翻'}`),...bonus].join(' ／ ');
  const reserve=26,maxLines=Math.max(1,Math.floor((b.y+b.h-y-reserve)/20));ui.wrap(yaku,b.x,y,b.w,{size:f.narrow?12:14,color:T.text,weight:600,lineHeight:20,maxLines});
  const pay=(w.paymentDeltas||r.deltas).map((delta,i)=>delta<0?`${s.players[i].name} ${sign(delta)}点`:null).filter(Boolean).join(' ／ ');
  ui.text(pay||'供託からの受け取り',b.x,b.y+b.h-11,{size:11,color:T.muted,width:b.w});
  footer(ui,d,buttons);
}
function scoreDetail(app,ui,f){
  const {s,r,hand}=context(app),m=app.modal,w=r?.winners?.[m.winnerIndex||0],d=shell(app,ui,f,'点数の内訳・適用ルール');
  if(!w){rows(app,ui,d,[{label:'和了者なし',description:'不聴罰符・連荘条件は局結果に表示します。'}]);return;}
  const score=w.score,fu=score.fuDetails||[],entries=[
    {label:`${score.han}翻 ${score.fu}符  ${score.limit||''}`,description:`和了の基本受取 ${fmt(score.total)}点 ／ 本場 ${s.honba} ／ 供託 ${fmt(w.deposit||0)}点`},
    ...score.yaku.map(y=>({label:y.name,description:y.yakuman?`${y.yakuman}倍役満`:`${y.han}翻${s.rules.yakuOverrides[y.id]?'（役別設定の補正を適用）':''}`})),
    ...fu.map(v=>typeof v==='string'?{label:v}:{label:v.label||v.reason||v.name||'符',description:typeof v.fu==='number'?`${v.fu}符`:JSON.stringify(v)}),
    {label:'支払い',description:`ロン ${fmt(score.payments?.ron)}点 ／ 親のツモ支払い ${fmt(score.payments?.tsumoDealer)}点 ／ 子 ${fmt(score.payments?.tsumoNonDealer)}点`},
    ...(w.pao||[]).map(v=>({label:`責任払い：${s.players[v.player].name}`,description:`${v.units}役満分・${v.id}`})),
    {label:'採用ルール',description:`クイタン ${s.rules.kuitan?'あり':'なし'} ／ 二翻縛り ${s.rules.twoHanHonbaThreshold||'なし'} ／ 複合役満 ${s.rules.multipleYakuman?'あり':'なし'}`},
    {label:'ドラの適用',description:`表 ${score.dora?.omote||0} ／ 裏 ${score.dora?.ura||0} ／ 赤 ${score.dora?.red||0} ／ 北抜き ${score.dora?.nuki||0}${score.dora?.ignored?'（役満のため加算なし）':''}`},
  ];rows(app,ui,d,entries,{rowHeight:f.narrow?88:65});
}
function finalSettlement(app,ui,f){
  const m=app.modal,record=m.record,s=record?null:app.game.state,list=record?record.standings:settlement(s),rules=record?.rules||s.rules;
  const d=shell(app,ui,f,'終局精算',1120),b=d.body,wide=b.w>=500;
  ui.text(record?.endReason||s.result?.endReason||'対局終了',b.x,b.y+15,{size:14,color:T.gold,width:b.w});
  let y=b.y+35;
  if(wide){const cols=[0,.1,.35,.51,.65,.77,.99],labels=['順位','参加者','素点','基準差','ウマ','オカ','最終得点'];labels.forEach((label,i)=>ui.text(label,b.x+b.w*cols[i],y,{size:12,color:T.muted,align:i===6?'right':'left'}));y+=24;
    const rh=Math.min(62,(b.h-103)/list.length);list.forEach((p,i)=>{const yy=y+i*rh;ui.panel(rect(b.x,yy-10,b.w,rh-5),p.player===0?'#274632':T.raised,6,p.rank===1?T.gold:T.line);
      const values=[`${p.rank}位`,p.name,fmt(p.score),sign(p.base??(p.score-(rules.oka?rules.returnPoints:rules.initialPoints))/1000),sign(p.uma),sign(p.oka),`${p.result>0?'+':''}${p.result.toFixed(1)}`];
      values.forEach((v,k)=>ui.text(v,b.x+(k===0?8:b.w*cols[k]-(k===6?7:0)),yy+(rh-20)/2,{size:k===6?18:14,color:k===6?T.gold:T.text,weight:k===6?700:500,align:k===6?'right':'left',width:k===1?b.w*.23:b.w*.17}));});y+=list.length*rh;
  }else{
    const rh=Math.min(86,(b.h-90)/list.length);list.forEach((p,i)=>{const yy=y+i*rh;ui.panel(rect(b.x,yy-8,b.w,rh-5),p.player===0?'#274632':T.raised,6,p.rank===1?T.gold:T.line);
      ui.text(`${p.rank}位 ${p.name}  ${fmt(p.score)}点`,b.x+8,yy+8,{size:14,weight:600,width:b.w-83});ui.text(`${p.result>0?'+':''}${p.result.toFixed(1)}`,b.x+b.w-8,yy+8,{size:19,color:T.gold,align:'right',weight:700});
      ui.text(`基準差 ${sign(p.base??(p.score-(rules.oka?rules.returnPoints:rules.initialPoints))/1000)}  ウマ ${sign(p.uma)}  オカ ${sign(p.oka)}`,b.x+8,yy+Math.min(rh-17,32),{size:11,color:T.muted,width:b.w-16});});y+=rh*list.length;
  }
  ui.wrap(`持ち ${fmt(rules.initialPoints)}／返し ${fmt(rules.returnPoints)}点。同点は起家からの席順。精算は千点単位。${rules.uma.reduce((a,b)=>a+b,0)!==0?'ウマ合計が0でない設定です。':''}`,b.x,Math.min(b.y+b.h-26,y+10),b.w,{size:11,color:T.muted,maxLines:2,lineHeight:16});
  footer(ui,d,[{id:'settlement-graph',label:'点数推移',fn:()=>app.open('graph',{record},m)},{id:'settlement-history',label:'対戦成績',fn:()=>app.showHistory()},{id:'settlement-next',label:record?'戻る':'新しい対局',fn:()=>record?app.close():app.quickStart(),primary:true}]);
}
function graph(app,ui,f){
  const m=app.modal,record=m.record,s=app.game.state,points=record?.scoreHistory||s.scoreHistory||[],people=record?.participants||s.players,n=people.length,d=shell(app,ui,f,'点数推移 — 各局精算後',1120),b=d.body;
  const perPage=Math.max(5,Math.floor((b.w-60)/23)),pages=Math.max(1,Math.ceil(Math.max(1,points.length-1)/perPage));m.page=Math.min(m.page||0,pages-1);m.pageCount=pages;
  const start=m.page*perPage,shown=points.slice(start,start+perPage+1);
  people.forEach((p,i)=>ui.text(p.name,b.x+i*(b.w/n),b.y+13,{size:12,color:colors[i],weight:700,width:b.w/n-5}));
  if(!shown.length){rows(app,ui,d,[{label:'まだ点数の記録がありません。'}]);return;}
  const minimum=Math.min(0,...shown.flatMap(p=>p.scores)),maximum=Math.max(...shown.flatMap(p=>p.scores),1),step=Math.max(1000,Math.ceil((maximum-minimum)/5000)*1000),low=Math.floor(minimum/step)*step,high=Math.ceil((maximum+1)/step)*step;
  const plot=rect(b.x+49,b.y+39,Math.max(1,b.w-59),Math.max(30,b.h-119)),c=ui.ctx;
  for(let v=low;v<=high;v+=step){const y=plot.y+plot.h-(v-low)/(high-low)*plot.h;ui.line(plot.x,y,plot.x+plot.w,y,T.line);ui.text(`${v/1000}千`,plot.x-7,y,{align:'right',size:10,color:T.muted,width:47});}
  const x=i=>plot.x+(shown.length===1?.5:i/(shown.length-1))*plot.w,y=v=>plot.y+plot.h-(v-low)/(high-low)*plot.h;
  people.forEach((p,seat)=>{c.save();c.strokeStyle=colors[seat];c.lineWidth=seat===0?3:2;c.setLineDash(seat===1?[6,3]:seat===2?[2,3]:[]);c.beginPath();shown.forEach((pt,i)=>i?c.lineTo(x(i),y(pt.scores[seat])):c.moveTo(x(i),y(pt.scores[seat])));c.stroke();c.setLineDash([]);shown.forEach((pt,i)=>{c.fillStyle=colors[seat];c.beginPath();c.arc(x(i),y(pt.scores[seat]),3,0,Math.PI*2);c.fill();});c.restore();});
  shown.forEach((pt,i)=>{const w=Math.min(32,plot.w/Math.max(1,shown.length-1));ui.hit(`graph-point-${start+i}`,rect(x(i)-w/2,plot.y,w,plot.h),()=>{m.point=start+i;app.invalidate();},{label:pt.label});if(i===0||i===shown.length-1||shown.length<8)ui.text(pt.label.replace('局 ','-').replace('本場',''),x(i),plot.y+plot.h+15,{align:'center',size:9,color:T.muted,width:Math.max(25,plot.w/shown.length)});});
  const selected=points[m.point??start+shown.length-1]||shown.at(-1);ui.text(`${selected.label} ／ 供託 ${fmt(selected.riichiPot*1000)}点`,b.x,b.y+b.h-36,{size:12,color:T.gold,width:b.w});
  ui.text(selected.scores.map((score,i)=>`${people[i].name} ${fmt(score)}`).join(' ／ '),b.x,b.y+b.h-14,{size:11,width:b.w});
  footer(ui,d,[{id:'page-prev',label:'前の区間',fn:()=>app.changePage(-1),disabled:!m.page},{id:'page-next',label:'次の区間',fn:()=>app.changePage(1),disabled:m.page===pages-1},{id:'graph-back',label:'戻る',fn:()=>app.close()}]);
}
function history(app,ui,f){
  const m=app.modal,d=shell(app,ui,f,'過去の対戦成績',1050),filter=m.filter||0;
  const matches=(app.matches||[]).filter(r=>!filter||r.players===filter).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt));
  const filters=[[0,'すべて'],[4,'四麻'],[3,'三麻']];filters.forEach(([value,label],i)=>ui.button(`history-filter-${value}`,label,rect(d.body.x+i*(d.body.w/3+2),d.body.y+3,d.body.w/3-4,29),()=>{m.filter=value;m.page=0;app.invalidate();},{active:filter===value}));
  const entries=matches.map(r=>{const p=r.standings.find(p=>p.player===0);return {id:`history-${r.id}`,label:`${timeText(r.endedAt)} · ${r.players}人打ち · ${p.rank}位 ${sign(p.result)}`,description:`${r.hands.length}局 ／ ${r.endReason}${r.partial?' ／ 旧版の部分履歴':''}`,fn:()=>app.open('historyMatch',{record:r},m)};});
  if(!entries.length)entries.push({label:'完了した対局はまだありません',description:app.dataError||'対局が終了すると自動的に保存します。途中でやめた対局は通算成績に含めません。'});
  rows(app,ui,d,entries,{top:38,rowHeight:f.narrow?83:64,buttons:[{id:'history-stats',label:'通算成績',fn:()=>app.open('statistics',{filter:filter||app.game.state.rules.players},m)}]});
}
function historyMatch(app,ui,f){
  const m=app.modal,r=m.record,d=shell(app,ui,f,`${r.players}人打ち · ${timeText(r.endedAt)}`),entries=[
    {id:'history-settlement',label:'終局精算',description:r.endReason,fn:()=>app.open('settlement',{record:r},m)},
    {id:'history-graph',label:'点数推移',fn:()=>app.open('graph',{record:r},m)},
    {id:'history-replay',label:'牌譜を卓で再生',description:r.partial?'旧版からの途中再開では、完全な再計算再生はできません。':'記録した山・操作・乱数状態から再現。現在の対局は変更しません。',fn:()=>app.replayRecord(r),disabled:r.partial},
    {id:'history-export',label:'この対局をJSONに書き出す',fn:()=>app.exportData('match',r)},
    {id:'history-rules',label:'対局時のルール・参加者',description:r.participants.map(p=>p.name).join(' ／ '),fn:()=>app.open('recordRules',{record:r},m)},
    ...r.hands.map((h,i)=>({id:`history-hand-${h.handId}`,label:`${h.label} · ${h.result.title}`,description:`${h.result.winners.map(w=>r.participants[w.player].name).join(' ／ ')}  自分の増減 ${sign(h.netDeltas?.[0]||0)}点`,fn:()=>app.open('result',{record:r,handIndex:i},m)})),
    {id:'history-delete',label:'この対局を削除',description:'削除後は通算成績を再集計します。',fn:()=>app.confirm('対局記録を削除',`${timeText(r.endedAt)}の対局を削除します。バックアップ内の記録は変更しません。`,()=>app.deleteMatch(r.id))},
  ];rows(app,ui,d,entries,{rowHeight:f.narrow?94:68});
}
function stats(app,ui,f){
  const m=app.modal,n=m.filter||4,v=aggregate(app.matches||[],n),d=shell(app,ui,f,`${n===3?'三麻':'四麻'}の通算成績`);
  const entries=[{label:`対局数 ${v.matches}  平均順位 ${v.averageRank.toFixed(2)}`,description:`順位別 ${v.ranks.map((count,i)=>`${i+1}位 ${count}`).join(' ／ ')}`},
    {label:`1位率 ${(v.topRate*100).toFixed(1)}% ／ 累積得点 ${sign(v.income)}`,description:'最終得点はウマ・オカを適用した千点単位。'},
    {label:`和了率 ${(v.winRate*100).toFixed(1)}% ／ 放銃率 ${(v.dealInRate*100).toFixed(1)}%`,description:`${v.hands}局中 和了 ${v.wins}回 ／ 放銃 ${v.dealIns}回`},
    {label:`立直率 ${(v.riichiRate*100).toFixed(1)}% ／ 副露率 ${(v.callRate*100).toFixed(1)}%`,description:`立直 ${v.riichi}局 ／ 副露 ${v.calls}局`},
    {label:`平均和了点 ${fmt(Math.round(v.averageWin))}点`,description:'本場・供託を除く、実際の三麻・四麻方式での基本受取点。'},
    {label:'集計の基準',description:`終了した対局のみ。局率では途中流局を除外し、ダブロンへの放銃も1局として数えます。${v.partialMatches?'部分履歴 '+v.partialMatches+'対局を含みます。':''}`},
    {label:'ルール差について',description:'三麻・四麻は別集計。各対局のルールは履歴から確認できます。異なるウマやローカル役の成績を同条件とは見なしません。'},
  ];rows(app,ui,d,entries,{rowHeight:f.narrow?102:68,buttons:[{id:'stats-other',label:n===3?'四麻へ':'三麻へ',fn:()=>{m.filter=n===3?4:3;m.page=0;app.invalidate();}}]});
}
function data(app,ui,f){
  const d=shell(app,ui,f,'データ管理・バックアップ');
  rows(app,ui,d,[
    {id:'data-backup',label:'全データをZIPでバックアップ',description:'ルール・COM・表示設定、対戦成績、牌譜、途中保存をまとめます。',fn:()=>app.exportData('all'),primary:true},
    {id:'data-import',label:'ZIP／JSONを読み込む',description:'検証後に統合・置換と復元対象を確認。確認前には書き込みません。',fn:()=>app.pickFile()},
    {id:'data-matches',label:'対戦成績をJSONで書き出す',description:`${app.matches?.length||0}対局。集計値ではなく元の対局結果を保存。`,fn:()=>app.exportData('matches')},
    {id:'data-settings',label:'ルール・COM・表示設定をJSONで書き出す',fn:()=>app.exportData('settings')},
    {id:'data-save',label:'現在の対局をJSONで書き出す',fn:()=>app.exportSave()},
    {id:'data-replays',label:'保存された牌譜をJSONで書き出す',fn:()=>app.exportData('replays')},
    {id:'data-replay-library',label:'保存された牌譜を選ぶ',fn:()=>app.showReplayLibrary()},
    {id:'data-rollback',label:'直前のインポートを取り消す',description:'取り込み前の端末データに戻します。確認画面を表示。',fn:()=>app.rollbackImport()},
    {id:'data-diagnostic',label:'不具合再現用データを書き出す',description:'ゲーム版・ルール・席・山順序・操作・乱数状態を記録。他家の牌も含みます。',fn:()=>app.exportDiagnostic()},
    {label:app.dataError?'保存エラー':'保存状況',description:app.dataError||'成績と牌譜はこのブラウザ内のIndexedDBに保存しています。クラウド同期ではありません。'},
  ],{rowHeight:f.narrow?104:70});
}
function preview(app,ui,f){
  const m=app.modal,bundle=m.bundle,d=shell(app,ui,f,'インポート内容の確認'),entries=[
    {label:'ファイルの検証が完了しました',description:`対局 ${bundle.matches?.length||0}件 ／ 牌譜 ${Object.keys(bundle.replays||{}).length}件 ／ 途中保存 ${Object.keys(bundle.saves||{}).length}件`},
    {id:'import-mode',label:`復元方式：${m.mode==='replace'?'置換':'統合'}`,description:m.mode==='replace'?'選択した種類の既存データを置き換えます。未選択の種類は保持。':'対局IDの重複は追加しません。内容が異なるID衝突はエラーにします。',fn:()=>{m.mode=m.mode==='replace'?'merge':'replace';app.invalidate();}},
    ...[['matches','対戦成績'],['replays','牌譜'],['saves','途中保存'],['settings','設定']].filter(([key])=>bundle[key]!=null).map(([key,label])=>({id:`import-${key}`,label:`${m.selection[key]?'✓ 復元する':'— 復元しない'}：${label}`,description:key==='saves'?'自動保存が含まれる場合は、その対局に切り替わります。':key==='settings'?'設定だけを復元しても進行中の対局ルールは変更しません。':'',fn:()=>{m.selection[key]=!m.selection[key];app.invalidate();}})),
    {label:'安全な復元',description:'変更は1回のデータベース取引で確定。失敗時には変更を取り消します。直前のデータも復元用に保存します。'},
  ];rows(app,ui,d,entries,{rowHeight:f.narrow?106:72,buttons:[{id:'import-apply',label:'復元を実行',fn:()=>app.applyDataImport(m),primary:true,disabled:app.dataBusy||!Object.values(m.selection).some(Boolean)}]});
}
function confirm(app,ui,f){const m=app.modal,d=shell(app,ui,f,m.title||'確認',780);ui.wrap(m.message,d.body.x,d.body.y+24,d.body.w,{size:15,color:T.text,maxLines:Math.floor((d.body.h-30)/24),lineHeight:24});footer(ui,d,[{id:'confirm-cancel',label:'戻る',fn:()=>app.close()},{id:'confirm-yes',label:m.confirmLabel||'確認して実行',fn:()=>{const action=m.action;app.modal=m.parent||null;const result=action?.();app.invalidate();return result;},primary:true}]);}
export function drawMatchScreen(app,ui,f){
  const kind=app.modal?.kind;
  const screens={seating,result,scoreDetail,settlement:finalSettlement,graph,history,historyMatch,statistics:stats,data,importPreview:preview,confirm};
  if(screens[kind]){screens[kind](app,ui,f);return true;}
  if(kind==='recordRules'){
    const r=app.modal.record,d=shell(app,ui,f,'対局時のルール・COM');const rules=RULE_FIELDS.map(field=>{const value=getPath(r.rules,field.key);return {label:field.label,description:field.type==='boolean'?(value?'あり':'なし'):field.type==='select'?(field.options.find(o=>o.value===value)?.label||String(value)):String(value)};});
    rules.push({label:'順位ウマ',description:r.rules.uma.join(' ／ ')});
    for(const [id,value] of Object.entries(r.rules.yakuOverrides))rules.push({label:`役別補正：${YAKU_CATALOG.find(y=>y.id===id)?.name||id}`,description:Object.entries(value).map(([key,v])=>`${({closed:'門前',open:'副露',yakuman:'役満倍数'})[key]||key} ${v??'不成立'}`).join(' ／ ')});
    rows(app,ui,d,[...r.participants.map(p=>({label:p.name,description:PERSONA_LABELS[p.persona]||'プレイヤー'})),...rules],{rowHeight:f.narrow?94:64});return true;
  }
  if(kind==='replayLibrary'){
    const m=app.modal,d=shell(app,ui,f,'保存された牌譜');rows(app,ui,d,m.replays.length?m.replays.map(([id,save])=>({id:`saved-replay-${id}`,label:`${timeText(save.savedAt)}  ${id.slice(0,12)}`,description:'当時の操作順に再生します。',fn:()=>app.replayRecord({save})})):[{label:'保存された牌譜はありません。'}],{rowHeight:66});return true;
  }
  return false;
}
