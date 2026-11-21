import {DEFAULT_RULES} from './rules.js';

export const TILE_NAMES=Object.freeze(['一萬','二萬','三萬','四萬','五萬','六萬','七萬','八萬','九萬','一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒','一索','二索','三索','四索','五索','六索','七索','八索','九索','東','南','西','北','白','發','中']);
export const TERMINAL_HONORS=Object.freeze([0,8,9,17,18,26,27,28,29,30,31,32,33]);
export const tileType=t=>typeof t==='number'?t:t?.type;
export function tileName(tile) { const t=tileType(tile); return `${tile?.red?'赤':''}${TILE_NAMES[t]??'不明牌'}`; }
export function countsOf(tiles) {const c=Array(34).fill(0);for(const t of tiles||[]){const n=tileType(t);if(Number.isInteger(n)&&n>=0&&n<34)c[n]++;}return c;}
export function isTerminalHonor(type){type=tileType(type);return type>=27 || type%9===0 || type%9===8;}
export function isHonor(type){return tileType(type)>=27;}
export function sortTiles(tiles){return tiles.sort((a,b)=>tileType(a)-tileType(b)||Number(b?.red)-Number(a?.red)||(a?.id??0)-(b?.id??0));}
export function availableTypes(rules=DEFAULT_RULES){return Array.from({length:34},(_,i)=>i).filter(i=>rules.players!==3||i===0||i>=8);}
export function createTiles(rules=DEFAULT_RULES){
 const tiles=[]; for(const type of availableTypes(rules)){const suit=['m','p','s'][Math.floor(type/9)];const red=type<27&&type%9===4?Math.max(0,Math.min(4,Number(rules.redCounts?.[suit]??1))):0;
   for(let copy=0;copy<4;copy++)tiles.push({id:type*4+copy,type,red:copy<red});
 }return tiles;
}
export function doraFromIndicator(type,players=4){type=tileType(type);if(type<27){if(players===3&&type<9)return type===0?8:0;return Math.floor(type/9)*9+(type%9+1)%9;} if(type<31)return 27+(type-27+1)%4;return 31+(type-31+1)%3;}

/** Text notation for tests, examples and developer diagnostics: 123m406p東白白. 0 is a red five. */
export function parseTiles(text,startId=0){const out=[];const names={'東':27,'南':28,'西':29,'北':30,'白':31,'發':32,'発':32,'中':33};let digits='';for(const ch of text){if(/\d/.test(ch)){digits+=ch;continue;}if('mpsz'.includes(ch)){for(const d of digits){const rank=Number(d);const type=ch==='z'?26+rank:'mps'.indexOf(ch)*9+(rank===0?4:rank-1);if(type<0||type>33)throw new Error('不正な牌表記');out.push({id:startId++,type,red:d==='0'&&ch!=='z'});}digits='';}else if(ch in names){out.push({id:startId++,type:names[ch],red:false});}else if(!/\s/.test(ch))throw new Error('不正な牌表記: '+ch);}if(digits)throw new Error('数牌にはm・p・sが必要');return out;}
