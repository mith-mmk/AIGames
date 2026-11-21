/** Deliberately different, visible numerical personalities. No hidden opponent tiles are used. */
export const AI_PERSONAS = Object.freeze([
  {id:'speed',name:'疾風',tagline:'受け入れを広く、一巡でも速く。',color:'#67d7ce',weights:{speed:100,value:25,defense:38,calls:78,riichi:70,flush:15,pairs:20,dora:40,yakuman:5,reading:40}},
  {id:'value',name:'黄金',tagline:'安手を急がず、満貫の形を残す。',color:'#edc269',weights:{speed:45,value:100,defense:48,calls:35,riichi:70,flush:55,pairs:45,dora:85,yakuman:40,reading:50}},
  {id:'riichi',name:'一閃',tagline:'門前を育て、先制リーチで勝負。',color:'#ef7d91',weights:{speed:82,value:65,defense:40,calls:5,riichi:100,flush:20,pairs:40,dora:55,yakuman:12,reading:40}},
  {id:'caller',name:'鳴神',tagline:'チー、ポン。小さな隙から速攻。',color:'#ffae76',weights:{speed:95,value:30,defense:30,calls:100,riichi:20,flush:45,pairs:38,dora:40,yakuman:5,reading:35}},
  {id:'fortress',name:'玄武',tagline:'危険牌を抱えず、守れる手を作る。',color:'#81acd9',weights:{speed:60,value:45,defense:95,calls:30,riichi:45,flush:20,pairs:40,dora:35,yakuman:5,reading:82}},
  {id:'fold',name:'静水',tagline:'勝負どころを絞り、現物で降りる。',color:'#a5b9d8',weights:{speed:42,value:45,defense:100,calls:12,riichi:30,flush:15,pairs:45,dora:30,yakuman:5,reading:100}},
  {id:'balanced',name:'中庸',tagline:'聴牌速度、打点、守備を釣り合わせる。',color:'#97d7a2',weights:{speed:75,value:65,defense:65,calls:52,riichi:72,flush:35,pairs:35,dora:60,yakuman:15,reading:65}},
  {id:'flush',name:'一染',tagline:'混一色と清一色へ、色を寄せる。',color:'#bd91de',weights:{speed:50,value:85,defense:45,calls:78,riichi:48,flush:100,pairs:35,dora:55,yakuman:20,reading:45}},
  {id:'pairs',name:'双璧',tagline:'対子を残し、七対子と対々和へ。',color:'#dc9bba',weights:{speed:55,value:70,defense:58,calls:65,riichi:65,flush:25,pairs:100,dora:60,yakuman:30,reading:55}},
  {id:'dora',name:'赤銅',tagline:'赤牌とドラを抱えて打点を伸ばす。',color:'#ec876c',weights:{speed:60,value:85,defense:38,calls:58,riichi:62,flush:30,pairs:48,dora:100,yakuman:18,reading:42}},
  {id:'yakuman',name:'天極',tagline:'国士、四暗刻、大三元の芽を追う。',color:'#d6c47b',weights:{speed:28,value:92,defense:25,calls:35,riichi:40,flush:55,pairs:80,dora:30,yakuman:100,reading:30}},
  {id:'analyst',name:'慧眼',tagline:'河、筋、壁と副露から危険度を読む。',color:'#7caed2',weights:{speed:72,value:62,defense:78,calls:44,riichi:64,flush:35,pairs:42,dora:55,yakuman:15,reading:100}},
]);

export function personaById(id) { return AI_PERSONAS.find(p=>p.id===id) || AI_PERSONAS[6]; }


export const RANDOM_PERSONA = 'random';
export const PERSONA_LABELS = Object.freeze({random:'ランダム',speed:'速度重視',value:'打点重視',riichi:'門前リーチ',caller:'鳴き速攻',fortress:'鉄壁守備',fold:'ベタオリ',balanced:'押し引き均衡',flush:'染め手志向',pairs:'対々和・七対子',dora:'ドラ重視',yakuman:'役満志向',analyst:'分析型'});
export const WEIGHT_LABELS = Object.freeze({speed:'速度',value:'打点',defense:'守備',calls:'副露',riichi:'立直',flush:'染め',pairs:'対子',dora:'ドラ',yakuman:'役満',reading:'読み'});
export const PERSONA_OPTIONS = Object.freeze([
 {value:RANDOM_PERSONA,label:'ランダム',description:'対局開始時に12種類から等確率で抽選。対局中と再開時は固定。同じ打ち筋が複数席になることもあります。'},
 ...AI_PERSONAS.map(p=>({value:p.id,label:`${p.name} · ${PERSONA_LABELS[p.id]}`,description:p.tagline})),
]);

/** Keep a third slot even in sanma, so switching modes does not erase a chosen persona. */
export function normalizePersonaChoices(choices) {
 const values=Array.isArray(choices)?choices:[];
 return Array.from({length:3},(_,i)=>PERSONA_OPTIONS.some(p=>p.value===values[i])?values[i]:RANDOM_PERSONA);
}

/** A separate, deterministic stream never consumes the wall/AI RNG. Legacy deals stay reproducible. */
export function resolvePersonaChoices(choices, players, seed) {
 let state=((Number(seed)>>>0)^0xa19f73b5)>>>0;
 const random=()=>{
   state=(state+0x6d2b79f5)>>>0;
   let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;
 };
 return normalizePersonaChoices(choices).slice(0,players-1).map(id=>{
   const pick=Math.floor(random()*AI_PERSONAS.length);
   return id===RANDOM_PERSONA?AI_PERSONAS[pick].id:id;
 });
}
