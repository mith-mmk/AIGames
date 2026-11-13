/** Reference-inspired printed playfield. These are inks, never collision geometry.
 * Canvas is registered to table-local x [-2.75,2.75], z [-5.75,5.75].
 * Mechanical parts remain separate meshes above this surface.
 */
export const REFERENCE_ART_LANDMARKS = Object.freeze({
  robotHead: [0, .12], robotTorso: [0, 1.45], mission: [0, 2.50],
  shotLabels: [[-.84, -1.02, 'HACK'], [0, -1.16, 'UPGRADE'], [.84, -1.02, 'BUILD']],
});

class PlayfieldInk {
  constructor(ctx) { this.c = ctx; }
  path(points, fill, stroke = null, width = .015) {
    const c=this.c;c.beginPath();points.forEach(([x,z],i)=>i?c.lineTo(x,z):c.moveTo(x,z));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  round(x,z,w,h,r,fill,stroke=null,width=.015) {
    const c=this.c;c.beginPath();c.roundRect(x,z,w,h,r);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  circle(x,z,r,fill,stroke=null,width=.015) {
    const c=this.c;c.beginPath();c.arc(x,z,r,0,Math.PI*2);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  text(text,x,z,size,color='#b4f7ff',weight='700') {
    const c=this.c;c.fillStyle=color;c.font=`${weight} ${size}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,z);
  }
  metal(x,z,w,h) {
    const g=this.c.createLinearGradient(x,z,x+w,z+h);
    g.addColorStop(0,'#f5f6fa');g.addColorStop(.23,'#b7c5d4');g.addColorStop(.48,'#626e82');g.addColorStop(.65,'#c2ccd8');g.addColorStop(1,'#68758c');return g;
  }
  glowPath(points,color,width=.025) {
    const c=this.c;c.save();c.shadowColor=color;c.shadowBlur=8;this.path(points,null,color,width);c.restore();
  }
  bolt(x,z,r=.025) { this.circle(x,z,r,'#6a7789','#142230',.008);this.path([[x-r*.45,z],[x+r*.45,z]],null,'#cbdce6',.005); }
  arrow(x,z,color) {
    const p=[[x,z-.22],[x-.16,z-.02],[x-.055,z-.02],[x-.055,z+.15],[x+.055,z+.15],[x+.055,z-.02],[x+.16,z-.02]];
    const c=this.c;c.save();c.shadowColor=color;c.shadowBlur=10;this.path(p,'#102737',color,.022);c.restore();
  }
  badge(label,x,z,w,color,size=.13) {
    const c=this.c;c.save();c.shadowColor=color;c.shadowBlur=6;this.round(x-w/2,z-.12,w,.24,.05,'#081b2b',color,.018);c.restore();this.text(label,x,z,size,color);
  }
  city() {
    const c=this.c;
    // Wide, low-contrast skyline is behind the hero, not a pattern over the ball.
    for(const side of [-1,1])for(let i=0;i<9;i++) {
      const x=side*(.72+i*.135),h=.30+(i*7%5)*.12,z=1.38-h;
      c.fillStyle=i%2?'#17436b':'#183a60';c.fillRect(x,z,.105,h);
      if(i%3===0)c.fillRect(x+.035,z-.12,.018,.13);
      c.fillStyle='#306b91';for(let k=0;k<Math.floor(h/.12);k++)c.fillRect(x+.025,z+.06+k*.12,.027,.035);
    }
    for(let i=0;i<15;i++) {
      const x=-2.05+i*.28,h=.12+(i*3%7)*.075;
      c.fillStyle='#143c58';c.fillRect(x,-4.89-h,.18,h);
    }
  }
  robot() {
    const c=this.c;c.save();c.translate(0,.05);
    // Dark outline separates silver armor from the blue background.
    // Left upper arm reaches outward and returns to a broad forearm shell.
    this.circle(-.61,1.03,.25,'#101c29','#7f96ab',.04);
    this.path([[-.64,.82],[-.98,.93],[-1.18,1.21],[-1.09,1.42],[-.78,1.20],[-.57,1.14]],this.metal(-1.18,.8,.7,.65),'#071320',.035);
    this.path([[-.88,1.04],[-1.10,1.17],[-1.02,1.26],[-.82,1.14]],'#6e8095','#d3dfeb',.015);
    this.circle(-1.01,1.43,.16,'#182331','#899bad',.026);
    this.path([[-1.13,1.41],[-.95,1.33],[-.72,1.61],[-.75,1.87],[-1.01,1.79],[-1.19,1.58]],this.metal(-1.2,1.32,.5,.56),'#0b1723',.035);
    this.path([[-1.12,1.48],[-.94,1.44],[-.82,1.65],[-.93,1.75],[-1.09,1.65]],'#899aaf','#d3dde8',.012);
    // Shoulder frame and neck are separately legible beneath torso panels.
    this.round(-.42,.68,.84,.43,.15,'#182331','#596e85',.035);
    this.round(-.14,.53,.28,.24,.04,'#35475b','#0a1421',.02);
    this.path([[-.12,.62],[.12,.62]],null,'#a6becd',.02);
    this.path([[-.52,.90],[.45,.88],[.69,1.12],[.56,1.70],[.34,1.90],[-.35,1.88],[-.61,1.58],[-.70,1.14]],this.metal(-.6,.8,1.2,1.1),'#081421',.04);
    this.path([[-.53,.98],[-.22,.93],[-.15,1.37],[-.44,1.57],[-.57,1.35]],'#aeb9c7','#e4e9f0',.012);
    this.path([[.38,.96],[.57,1.10],[.49,1.55],[.28,1.74],[-.33,1.73],[-.43,1.57],[-.18,1.42],[.32,1.41]],'#8798ad','#25384b',.017);
    this.path([[-.12,1.54],[.26,1.54],[.35,1.75],[-.25,1.75]],'#3d5068','#aec0d2',.014);
    this.text('R-07',-.32,1.20,.17,'#0b1b2a','900');
    this.round(.00,1.03,.37,.36,.055,'#102a3c','#a9d7e6',.018);
    c.save();c.translate(.185,1.20);c.shadowColor='#41e6ff';c.shadowBlur=10;
    c.beginPath();c.moveTo(0,.105);c.bezierCurveTo(-.19,-.02,-.10,-.15,0,-.065);c.bezierCurveTo(.10,-.15,.19,-.02,0,.105);c.fillStyle='#64eaff';c.fill();c.restore();
    this.round(-.37,.91,.18,.06,.02,'#152532','#b8c9d7',.008);this.round(-.33,.922,.06,.035,.008,'#edbd38');
    // Right arm holds a two-finger peace gesture, matching the reference pose.
    this.circle(.60,1.05,.18,'#17283a','#8d9faf',.025);
    this.path([[.55,1.10],[.71,1.22],[.94,.91],[.78,.78],[.62,.91]],this.metal(.55,.8,.42,.5),'#0c1926',.03);
    this.circle(.89,.87,.14,'#17283a','#9db1c2',.02);
    this.path([[.79,.83],[1.02,.86],[1.12,.49],[.91,.40]],this.metal(.79,.4,.35,.5),'#111d2b',.03);
    this.path([[1.00,.76],[1.08,.50],[1.14,.52],[1.06,.80]],'#e9b825','#261f12',.015);
    this.circle(1.02,.43,.13,'#182331','#a8bbc8',.022);
    this.path([[.94,.47],[.88,.31],[.93,.17],[1.10,.11],[1.23,.23],[1.23,.40],[1.11,.52]],this.metal(.88,.1,.38,.43),'#0b1522',.03);
    // Separated proximal and distal finger plates avoid a single mitten silhouette.
    c.save();c.translate(.94,.19);c.rotate(-.12);
    this.round(-.055,-.40,.12,.43,.055,this.metal(-.06,-.4,.12,.4),'#111d2b',.025);
    this.path([[-.05,-.22],[.055,-.22]],null,'#273b4e',.02);c.restore();
    c.save();c.translate(1.10,.19);c.rotate(.40);
    this.round(-.055,-.42,.12,.46,.05,this.metal(-.06,-.4,.12,.4),'#111d2b',.025);
    this.path([[-.052,-.21],[.055,-.21]],null,'#273b4e',.02);c.restore();
    this.round(1.10,.22,.15,.12,.04,'#b7c4d1','#142434',.02);
    this.round(1.07,.33,.14,.11,.04,'#a6b7c7','#142434',.02);
    this.path([[.91,.26],[1.04,.29],[1.10,.37],[1.04,.42],[.92,.36]],'#bdc9d5','#172638',.02);
    // Tilted head: thick chamfered housing, screen bezel, side ear discs.
    c.save();c.translate(0,.08);c.rotate(-.07);
    for(const side of [-1,1]) {
      this.circle(side*.66,.16,.14,'#edbf2a','#0d1824',.025);
      this.circle(side*.66,.16,.095,'#253a50','#9daab8',.015);
      this.round(side<0?-.74:.66,-.42,.08,.34,.035,'#e8b72a','#203145',.02);
      this.circle(side*.70,-.09,.046,'#90a3b5','#142331',.015);
    }
    this.path([[-.62,-.35],[-.48,-.51],[.43,-.51],[.61,-.36],[.65,.32],[.48,.48],[-.48,.48],[-.65,.32]],this.metal(-.65,-.5,1.3,1),'#091827',.045);
    this.path([[-.48,-.45],[-.32,-.45],[-.29,-.36],[.33,-.36],[.37,-.46],[.47,-.40],[.54,-.29],[.54,.28],[.42,.36],[-.43,.36],[-.55,.25],[-.55,-.27]],'#c6d0dc','#26394f',.015);
    this.round(-.49,-.30,.98,.60,.09,'#122134','#5f7890',.025);
    const screen=c.createLinearGradient(0,-.3,0,.3);screen.addColorStop(0,'#142c3c');screen.addColorStop(1,'#06111e');
    this.round(-.455,-.265,.91,.53,.065,screen,'#2f6477',.01);
    c.save();c.shadowColor='#34dfff';c.shadowBlur=9;
    for(const side of [-1,1]) {
      for(const [x,z] of [[-.09,.03],[-.045,-.025],[0,-.08],[.045,-.025],[.09,.03]])c.fillRect(side*.23+x-.027,z-.025,.053,.05);
    }
    c.restore();
    // Pixel eyes are explicit screen art, not round lamps competing with the ball.
    c.fillStyle='#7cf4ff';for(const side of [-1,1])for(const [x,z] of [[-.09,.03],[-.045,-.025],[0,-.08],[.045,-.025],[.09,.03]])c.fillRect(side*.23+x-.027,z-.025,.053,.05);
    this.path([[-.10,.145],[0,.18],[.10,.145]],null,'#48bbd0',.02);
    this.path([[-.27,.34],[.27,.34],[.25,.45],[-.25,.45]],'#929fb2','#1e3045',.015);
    for(const [x,z] of [[-.53,-.31],[.53,-.31],[-.53,.29],[.53,.29]])this.bolt(x,z,.022);
    c.restore();c.restore();
  }
  mission() {
    const c=this.c,center=REFERENCE_ART_LANDMARKS.mission;
    // Reference hierarchy: one main gear, four quieter secondary inserts.
    const gear=[];for(let i=0;i<48;i++){const t=i*Math.PI/24,r=i%4<2?.44:.49;gear.push([center[0]+Math.sin(t)*r,center[1]+Math.cos(t)*r]);}
    c.save();c.shadowColor='#ffc120';c.shadowBlur=9;this.path(gear,'#a47b14','#ffd447',.025);c.restore();
    this.circle(...center,.385,'#101c25','#f8c332',.025);
    this.text('MAIN',0,2.37,.15,'#ffe8a2');this.text('MISSION',0,2.59,.16,'#ffe8a2');
    for(const [label,x,color] of [['COMBO',-1.13,'#52ddec'],['MULTI',-.65,'#e9ba3a'],['EXTRA',.65,'#52ddec'],['JACKPOT',1.13,'#e9ba3a']]) {
      this.circle(x,2.50,.21,'#0c2637',color,.018);this.text(label,x,2.48,label.length>5?.087:.105,color);
      if(label==='MULTI'||label==='EXTRA')this.text('BALL',x,2.59,.085,color);
    }
    for(let i=0;i<5;i++)this.badge(`M${i+1}`,(i-2)*.33,3.14,.27,'#59d3e5',.13);
  }
}

/** Paint a complete playfield canvas using table-local registration. */
export function drawReferencePlayfield(ctx,{width=1024,height=2048}={}) {
  if(!ctx)throw new TypeError('A canvas 2D context is required');
  if(!(width>0&&height>0))throw new RangeError('Canvas dimensions must be positive');
  ctx.save();ctx.scale(width/5.5,height/11.5);ctx.translate(2.75,5.75);
  const ink=new PlayfieldInk(ctx);
  const base=ctx.createLinearGradient(-2.75,-5.75,2.75,5.75);
  base.addColorStop(0,'#102334');base.addColorStop(.42,'#1f3f5c');base.addColorStop(.7,'#28445f');base.addColorStop(1,'#263648');
  ctx.fillStyle=base;ctx.fillRect(-2.75,-5.75,5.5,11.5);
  // Broad restrained lighting and panel seams preserve a clean silver ball silhouette.
  const halo=ctx.createRadialGradient(0,.8,.2,0,.8,2.3);
  halo.addColorStop(0,'rgba(28,146,188,.22)');halo.addColorStop(1,'rgba(20,40,62,0)');ctx.fillStyle=halo;ctx.fillRect(-2.4,-1.7,4.8,5.1);
  ink.city();
  for(const s of [-1,1]) {
    ink.path([[s*2.45,-4.9],[s*2.45,4.8]],null,'#48617a',.018);
    ink.path([[s*.62,1.48],[s*1.95,2.65],[s*1.96,4.45]],null,'#42627d',.012);
  }
  for(const [x,z,label] of REFERENCE_ART_LANDMARKS.shotLabels) {
    const color=label==='UPGRADE'?'#ffd129':'#57e8fa';ink.arrow(x,z-.32,color);ink.badge(label,x,z,.64,color,label==='UPGRADE'?.12:.15);
  }
  ink.robot();ink.mission();
  // Reserved shooter print; actual in/out lanes are drawn from shared geometry elsewhere.
  for(const z of [-.5,.25,1,1.75,2.5,3.25])ink.path([[2.50,z-.15],[2.41,z+.04],[2.50,z-.015],[2.59,z+.04]],'#d9ac32');
  for(const z of [3.85,4.10,4.35])ink.path([[-.10,z-.05],[0,z+.045],[.10,z-.05],[0,z+.13]],'#e7bd2d');
  ctx.restore();
  return REFERENCE_ART_LANDMARKS;
}
