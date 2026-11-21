/** Completed records, saves and settings share a single atomic IndexedDB transaction at import. */
export class MatchLibrary {
  constructor(){this.promise=null;this.db=null;}
  async database(){
    if(!globalThis.indexedDB)throw new Error('この環境では成績の永続保存を利用できません。JSONに書き出すと記録を保管できます。');
    if(!this.promise)this.promise=new Promise((resolve,reject)=>{
      const request=indexedDB.open('seiran-library',2);
      request.onupgradeneeded=()=>{for(const name of ['matches','saves','replays','meta'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);};
      request.onsuccess=()=>{this.db=request.result;this.db.onversionchange=()=>{this.db.close();this.db=null;this.promise=null;};resolve(this.db);};
      request.onerror=()=>{this.promise=null;reject(request.error||new Error('成績データベースを開けません。'));};
      request.onblocked=()=>{this.promise=null;reject(new Error('別タブのデータベース接続により更新が保留されています。'));};
    });
    return this.promise;
  }
  async read(store,key){const db=await this.database();return new Promise((resolve,reject)=>{const tx=db.transaction(store),req=key==null?tx.objectStore(store).getAll():tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});}
  async snapshot(){
    const db=await this.database();return new Promise((resolve,reject)=>{
      const tx=db.transaction(['matches','saves','replays','meta']),result={matches:[],saves:{},replays:{},settings:null};
      const matches=tx.objectStore('matches').getAll();matches.onsuccess=()=>result.matches=matches.result;
      const saves=tx.objectStore('saves').openCursor();saves.onsuccess=()=>{const c=saves.result;if(c){result.saves[c.key]=c.value;c.continue();}};
      const replays=tx.objectStore('replays').openCursor();replays.onsuccess=()=>{const c=replays.result;if(c){result.replays[c.key]=c.value;c.continue();}};
      const settings=tx.objectStore('meta').get('settings');settings.onsuccess=()=>result.settings=settings.result||null;
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||new Error('読み込みを中断しました。'));
    });
  }
  async write(store,key,value){
    const db=await this.database();return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);
      tx.oncomplete=()=>resolve(true);tx.onabort=()=>reject(tx.error||new Error('保存できませんでした。'));
    });
  }
  async putMatch(record){
    // Same match ends once. Reloads must not create or silently alter a previous result.
    const db=await this.database();return new Promise((resolve,reject)=>{
      const tx=db.transaction(['matches','meta'],'readwrite'),store=tx.objectStore('matches'),deleted=tx.objectStore('meta').get(`deleted:${record.id}`);let inserted=false;
      deleted.onsuccess=()=>{if(deleted.result){inserted=null;return;}const req=store.get(record.id);req.onsuccess=()=>{if(!req.result){store.add(record,record.id);inserted=true;}else if(req.result.save.state!==record.save.state)tx.abort();};};
      tx.oncomplete=()=>resolve(inserted);tx.onabort=()=>reject(tx.error||new Error('同じ対局IDに別の結果が保存されています。'));
    });
  }
  async removeMatch(id){const db=await this.database();return new Promise((resolve,reject)=>{const tx=db.transaction(['matches','meta'],'readwrite');tx.objectStore('matches').delete(id);tx.objectStore('meta').put(true,`deleted:${id}`);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});}
  /** All parsing/hashing/validation is done BEFORE entering the transaction. */
  async applyImport(bundle,{mode='merge',matches=true,settings=true,saves=true,replays=true}={}){
    if(!['merge','replace'].includes(mode))throw new Error('復元方式が不正です。');
    const db=await this.database();return new Promise((resolve,reject)=>{
      let tx;try{tx=db.transaction(['matches','saves','replays','meta'],'readwrite',{durability:'strict'});}catch{tx=db.transaction(['matches','saves','replays','meta'],'readwrite');}
      const count={added:0,skipped:0};let failure;
      const fail=message=>{failure=new Error(message);tx.abort();};
      if(matches&&bundle.matches){
        const store=tx.objectStore('matches');
        if(mode==='replace')store.clear();
        for(const record of bundle.matches){
          tx.objectStore('meta').delete(`deleted:${record.id}`);
          const req=store.get(record.id);req.onsuccess=()=>{
            if(req.result){if(req.result.save.state!==record.save.state){fail(`対局ID ${record.id} が既存の別内容と衝突しています。データは変更していません。`);return;}count.skipped++;}
            else{store.add(record,record.id);count.added++;}
          };
        }
      }
      if(settings&&bundle.settings)tx.objectStore('meta').put(bundle.settings,'settings');
      if(saves&&bundle.saves){
        const store=tx.objectStore('saves');if(mode==='replace')store.clear();
        for(const [key,value] of Object.entries(bundle.saves))store.put(value,key);
      }
      if(replays&&bundle.replays){const store=tx.objectStore('replays');if(mode==='replace')store.clear();for(const [key,value] of Object.entries(bundle.replays))store.put(value,key);}
      tx.oncomplete=()=>resolve(count);tx.onabort=()=>reject(failure||tx.error||new Error('復元に失敗しました。変更は取り消されました。'));
    });
  }
}
