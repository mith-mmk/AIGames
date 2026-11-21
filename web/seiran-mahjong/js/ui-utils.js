export const number=(n)=>Number(n||0).toLocaleString('ja-JP');
export const getPath=(obj,path)=>path.split('.').reduce((v,k)=>v?.[k],obj);
export function setPath(obj,path,value){const keys=path.split('.');let at=obj;for(const k of keys.slice(0,-1)){if(k==='__proto__'||k==='constructor'||k==='prototype')return;at[k]??={};at=at[k];}const last=keys.at(-1);if(!['__proto__','constructor','prototype'].includes(last))at[last]=value;}
export function storageGet(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function storageSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function downloadJSON(filename,value){downloadBlob(filename,new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));}
export function downloadBlob(filename,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export function timeText(iso){if(!iso)return '';try{return new Date(iso).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return '';}}

export class TableSound{
 constructor(){this.enabled=false;this.volume=.4;this.ctx=null;}
 enable(on){this.enabled=on;if(on){try{this.ctx??=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume();}catch{this.enabled=false;}}}
 tone(freq,duration=.08,delay=0,type='sine',gain=.2){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(this.volume*gain,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration+.01);}
 play(type){if(!this.enabled)return;if(['ron','tsumo','win'].includes(type)){[440,554.37,659.25,880].forEach((f,i)=>this.tone(f,.5,i*.1,'sine',.14));return;}if(['riichi','openRiichi','declareRiichi'].includes(type)){[659.25,880,1318.5].forEach((f,i)=>this.tone(f,.35,i*.09,'sine',.13));return;}if(['deal','newHand','start','dice'].includes(type)){for(let i=0;i<9;i++)this.tone(400+Math.random()*900,.035,i*.09,'triangle',.11);return;}if(['chi','pon','ankan','minkan','kakan','kan','nuki'].includes(type)){this.tone(620,.1,0,'triangle',.14);this.tone(940,.12,.09,'triangle',.1);return;}if(type==='discard'){this.tone(900,.038,0,'triangle',.15);this.tone(1600,.035,.012,'sine',.08);}else if(type==='draw')this.tone(730,.025,0,'triangle',.06);}
}

// IndexedDB keeps the replay out of localStorage's small per-origin string quota.
export class ReplayStore{
 constructor(){this.promise=null;}
 async database(){
  if(!('indexedDB'in window))return null;
  this.promise??=new Promise(resolve=>{
    try{
      const req=indexedDB.open('seiran-replays',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('matches'))req.result.createObjectStore('matches');};
      req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();this.promise=null;};resolve(db);};
      req.onerror=()=>resolve(null);req.onblocked=()=>resolve(null);
    }catch{resolve(null);}
  });return this.promise;
 }
 async get(id){const db=await this.database();if(!db)return null;return new Promise(resolve=>{try{const r=db.transaction('matches').objectStore('matches').get(id);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>resolve(null);}catch{resolve(null);}});}
 async put(id,value){const db=await this.database();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction('matches','readwrite');tx.objectStore('matches').put(value,id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);}catch{resolve(false);}});}
}
