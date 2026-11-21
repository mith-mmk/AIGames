export const TABS = [
  {id:'basic',name:'基本・精算',icon:'table',groups:['基本','精算'],description:'人数、対局の長さ、持ち点と最終精算を決めます。'},
  {id:'progress',name:'進行・流局',icon:'flag',groups:['鳴き・流局','終局'],description:'鳴きの優先、途中流局、連荘、対局終了の条件を設定します。'},
  {id:'reach',name:'リーチ・三麻',icon:'shield',groups:['リーチ','責任払い','三麻'],description:'リーチの取り扱い、責任払い、三人打ちの北抜きとツモ精算。'},
  {id:'dora',name:'ドラ・役満',icon:'dice',groups:['ドラ','役満'],description:'ドラと赤牌の枚数、槓に伴う追加ドラ、役満の倍数を設定します。'},
  {id:'yaku',name:'基本役',icon:'book',groups:['役・和了'],description:'基本役の成立条件と、門前・副露それぞれの翻数を調整します。'},
  {id:'local',name:'ローカル役',icon:'spark',groups:['ローカル役の細則'],description:'役ごとの説明を確認して採用できます。地域差のある役は、ここに記載した定義で判定します。'},
  {id:'com',name:'COMの打ち筋',icon:'users',groups:[],description:'対戦する打ち手を各席に配置します。初期値はランダム。対局開始時に12種類から抽選し、その対局では固定します。'},
  {id:'display',name:'表示・操作',icon:'eye',groups:[],description:'進行速度、視点、効果音、手牌の表示を調整します。'},
];
export const WEIGHT_LABELS={speed:'速度',value:'打点',defense:'守備',calls:'副露',riichi:'立直',flush:'染め',pairs:'対子',dora:'ドラ',yakuman:'役満',reading:'読み'};
export const PREF_FIELDS=[
  {key:'speed',label:'対局の進行速度',type:'select',options:[{value:.5,label:'ゆっくり ×0.5'},{value:1,label:'標準 ×1'},{value:2,label:'速い ×2'},{value:4,label:'高速 ×4'}],description:'COMの思考後の待ち時間と、対局の演出間隔を調整します。'},
  {key:'view',label:'初期視点',type:'select',options:[{value:'table',label:'俯瞰'},{value:'top',label:'真上'},{value:'player',label:'手元'}],description:'卓上の視点ボタンからも切り替えられます。'},
  {key:'sound',label:'効果音',type:'boolean',description:'牌、サイコロ、鳴きと和了の効果音を再生します。'},
  {key:'volume',label:'効果音の音量',type:'number',min:0,max:100,step:5,unit:'%',description:'0で無音、100で最大です。'},
  {key:'analysis',label:'手牌分析を表示',type:'boolean',description:'向聴数、受け入れ枚数、選択牌の危険度を公開情報から表示します。'},
  {key:'tileNames',label:'手牌に牌の名前を表示',type:'boolean',description:'下段の手牌の数字キー表示を「一萬」「發」などの牌名に変えます。'},
];
