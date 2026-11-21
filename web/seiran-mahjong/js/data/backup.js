import {DATA_VERSION,aggregate,validateMatch,validateEnvelope,validateSettings,safeJSON} from './records.js';
import {ENGINE_VERSION} from '../core/game.js';
const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
export const LIMITS=Object.freeze({file:64*1024*1024,expanded:128*1024*1024,entry:32*1024*1024,entries:2048,matches:5000});
const ok=(condition,message)=>{if(!condition)throw new Error(message);};
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
const pathOK=p=>typeof p==='string'&&p.length>0&&p.length<=180&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..');
const view=bytes=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
function join(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
/** ZIP32 STORE writer. UTF-8, CRC32, no dependencies or opaque binary assets. */
export function writeZip(entries){
  const locals=[],centrals=[];let offset=0;
  ok(entries.size<=LIMITS.entries,'ZIP内のファイル数が多すぎます。');
  for(const [name,value] of entries){
    ok(pathOK(name),'ZIPのファイル名が不正です。');const filename=te.encode(name),bytes=typeof value==='string'?te.encode(value):value;
    ok(bytes.length<=LIMITS.entry,'ZIP内のデータが大きすぎます。');
    const crc=crc32(bytes),header=new Uint8Array(30),h=view(header);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,filename.length,true);
    const central=new Uint8Array(46),c=view(central);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);
    locals.push(header,filename,bytes);centrals.push(central,filename);offset+=30+filename.length+bytes.length;
  }
  const size=centrals.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),e=view(end);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.size,true);e.setUint16(10,entries.size,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
  ok(offset+size+22<=LIMITS.file,'バックアップが64MBを超えています。個別JSONで書き出してください。');return join([...locals,...centrals,end]);
}
async function inflate(bytes,expected){
  ok(typeof DecompressionStream==='function','このブラウザでは圧縮ZIPを読み込めません。ゲームから出力したZIPは非圧縮形式です。');
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>expected||size>LIMITS.entry){await reader.cancel();throw new Error('ZIPの展開サイズが上限を超えました。');}parts.push(value);}}finally{reader.releaseLock();}
  ok(size===expected,'ZIPの展開サイズが一致しません。');return join(parts);
}
export async function readZip(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);ok(bytes.length>=22&&bytes.length<=LIMITS.file,'ZIPのサイズが不正です。');
  const v=view(bytes);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
  ok(end>=0,'ZIP終端が見つかりません。');
  const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),offset=v.getUint32(end+16,true);
  ok(!v.getUint16(end+4,true)&&!v.getUint16(end+6,true)&&v.getUint16(end+8,true)===count&&count<=LIMITS.entries&&offset+size===end,'複数ボリューム・ZIP64または破損したZIPです。');
  let at=offset,total=0;const files=new Map(),ranges=[];
  for(let i=0;i<count;i++){
    ok(at+46<=end&&v.getUint32(at,true)===0x02014b50,'ZIPの目録が壊れています。');
    const flags=v.getUint16(at+8,true),method=v.getUint16(at+10,true),crc=v.getUint32(at+16,true),packed=v.getUint32(at+20,true),raw=v.getUint32(at+24,true),len=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),local=v.getUint32(at+42,true);
    ok(!(flags&1)&&[0,8].includes(method)&&raw<=LIMITS.entry&&at+46+len+extra+comment<=end,'暗号化・未対応の圧縮形式・過大なZIPです。');
    total+=raw;ok(total<=LIMITS.expanded,'ZIP全体の展開サイズが大きすぎます。');
    const name=td.decode(bytes.subarray(at+46,at+46+len));ok(pathOK(name)&&!files.has(name),'ZIPのパスが不正または重複しています。');
    ok(local+30<=offset&&v.getUint32(local,true)===0x04034b50,'ZIPの個別ヘッダーが壊れています。');
    const ll=v.getUint16(local+26,true),le=v.getUint16(local+28,true),start=local+30+ll+le;
    ok(start+packed<=offset&&v.getUint16(local+8,true)===method&&!(v.getUint16(local+6,true)&1)&&td.decode(bytes.subarray(local+30,local+30+ll))===name,'ZIPヘッダーと目録が一致しません。');
    ok(!ranges.some(([a,b])=>local<b&&start+packed>a),'ZIPのデータ領域が重複しています。');ranges.push([local,start+packed]);
    const compressed=bytes.subarray(start,start+packed),data=method===0?compressed:await inflate(compressed,raw);
    ok(data.length===raw&&crc32(data)===crc,'ZIPのCRCチェックに失敗しました。');files.set(name,new Uint8Array(data));at+=46+len+extra+comment;
  }
  ok(at===end,'ZIPの目録サイズが不正です。');return files;
}
async function sha256(bytes){ok(!!globalThis.crypto?.subtle,'データ検証にはHTTPSまたはlocalhostが必要です。');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}

export function validateBundle(raw){
  ok(raw?.format==='seiran-data'&&raw.schemaVersion===DATA_VERSION,'対応していないバックアップ版です。元のファイルは変更しません。');
  const bundle={format:'seiran-data',schemaVersion:DATA_VERSION};
  if(raw.matches!=null){ok(Array.isArray(raw.matches)&&raw.matches.length<=LIMITS.matches,'対局件数が不正です。');const ids=new Set();bundle.matches=raw.matches.map(record=>{const r=validateMatch(record);ok(!ids.has(r.id),'対局IDが重複しています。');ids.add(r.id);return r;});}
  if(raw.settings!=null)bundle.settings=validateSettings(raw.settings);
  if(raw.saves!=null){ok(typeof raw.saves==='object'&&!Array.isArray(raw.saves),'セーブ一覧が不正です。');bundle.saves={};for(const [key,save] of Object.entries(raw.saves)){ok(['auto','manual','previous'].includes(key),'保存スロットが不正です。');validateEnvelope(save);bundle.saves[key]=save;}}
  if(raw.replays!=null){ok(typeof raw.replays==='object'&&!Array.isArray(raw.replays)&&Object.keys(raw.replays).length<=LIMITS.matches,'牌譜一覧が不正です。');bundle.replays={};for(const [id,save] of Object.entries(raw.replays)){ok(/^[\w.-]{1,120}$/.test(id)&&id===save.matchId,'牌譜IDが不正です。');validateEnvelope(save);bundle.replays[id]=save;}}
  ok(['matches','settings','saves','replays'].some(k=>k in bundle),'復元するデータがありません。');return bundle;
}
export async function exportBackup(raw){
  const bundle=validateBundle(raw),entries=new Map();
  const add=(name,data)=>entries.set(name,te.encode(JSON.stringify(data)));
  if(bundle.settings)add('settings.json',bundle.settings);
  if(bundle.matches){add('matches.json',bundle.matches);add('statistics.json',{derived:true,sanma:aggregate(bundle.matches,3),yonma:aggregate(bundle.matches,4)});}
  for(const [key,save] of Object.entries(bundle.saves||{}))add(`saves/${key}.json`,save);
  for(const [id,save] of Object.entries(bundle.replays||{}))add(`replays/${id}.json`,save);
  const files=[];for(const [path,data] of entries)files.push({path,size:data.length,sha256:await sha256(data)});
  add('manifest.json',{format:'seiran-backup',schemaVersion:DATA_VERSION,engineVersion:ENGINE_VERSION,createdAt:new Date().toISOString(),files});
  return writeZip(entries);
}
export async function importBackup(bytes){
  const entries=await readZip(bytes),manifestData=entries.get('manifest.json');ok(manifestData&&manifestData.length<256*1024,'バックアップの目録がありません。');
  const manifest=safeJSON(td.decode(manifestData));ok(manifest.format==='seiran-backup'&&manifest.schemaVersion===DATA_VERSION,'未対応のバックアップ版です。');
  ok(Array.isArray(manifest.files)&&manifest.files.length===entries.size-1,'目録のファイル数が一致しません。');
  const bundle={format:'seiran-data',schemaVersion:DATA_VERSION},seen=new Set();
  for(const file of manifest.files){
    ok(file&&typeof file.path==='string'&&file.path!=='manifest.json'&&!seen.has(file.path),'目録のパスが重複しています。');seen.add(file.path);
    const value=entries.get(file.path);ok(value&&value.length===file.size&&await sha256(value)===file.sha256,'バックアップのハッシュ検証に失敗しました。');
    const data=safeJSON(td.decode(value));
    if(file.path==='matches.json')bundle.matches=data;
    else if(file.path==='settings.json')bundle.settings=data;
    else if(file.path==='statistics.json')continue; // Display-only. Always recompute statistics from records.
    else if(/^saves\/(auto|manual|previous)\.json$/.test(file.path)){bundle.saves??={};bundle.saves[file.path.slice(6,-5)]=data;}
    else if(/^replays\/[\w.-]+\.json$/.test(file.path)){bundle.replays??={};bundle.replays[file.path.slice(8,-5)]=data;}
    else throw new Error('バックアップに未知のファイルがあります。');
  }
  return validateBundle(bundle);
}
