/** Physical table presentation; pure game decisions live in core/game.js. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTileTexture } from './tile-art.js';
import { GLYPHS } from './glyphs.js';

const W = .46, H = .64, D = .29, GAP = .026, FELT_Y = .062;
const EASE = x => 1 - (1 - x) ** 3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const UP = new THREE.Vector3(0,1,0);
const FACE_UP = new THREE.Quaternion();
const UPRIGHT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
const FACE_DOWN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI);
const WINDS = ['東','南','西','北'];

function roundedRect(ctx,x,y,w,h,r) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();
}

function drawGlyph(ctx,char,x,y,w,h,color) {
  const glyph=GLYPHS[char];if(!glyph)return;
  const [x0,y0,x1,y1]=glyph.bounds,sx=w/(x1-x0),sy=h/(y1-y0);
  ctx.save();ctx.translate(x-x0*sx,y+y1*sy);ctx.scale(sx,-sy);ctx.fillStyle=color;ctx.fill(new Path2D(glyph.d));ctx.restore();
}

export class TableView {
  constructor(container, options = {}) {
    if (!container) throw new TypeError('TableView needs a container');
    this.container = container;
    this.options = options;
    this.state = null;
    this.tiles = new Map();
    this.faceMaterials = new Map();
    this.textures = new Set();
    this.materials = new Set();
    this.geometries = new Map();
    this.selected = null;
    this.hovered = null;
    this.view = 'table';
    this._animations = new Set();
    this._seenEvents = new Set();
    this._needsRender = true;
    this._disposed = false;
    this._lastTime = performance.now();
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._clickTargets = [];
    this._scratchMatrix = new THREE.Matrix4();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#071b18');
    this.scene.fog = new THREE.FogExp2('#071b18', .024);
    this.camera = new THREE.PerspectiveCamera(38,1,.1,140);
    this.camera.position.set(0,18,19.3);
    this.camera.lookAt(0,0,0);

    this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.27;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    this.renderer.domElement.setAttribute('aria-label','立体の自動麻雀卓。ドラッグで視点移動、手牌を選択できます。');
    this.renderer.domElement.setAttribute('role','img');
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .09;
    this.controls.minPolarAngle = .035;
    this.controls.maxPolarAngle = Math.PI*.425;
    this.controls.minDistance = 13;
    this.controls.maxDistance = 48;
    this.controls.enablePan = false;
    this.controls.target.set(0,.1,0);
    this.controls.addEventListener('change',() => this._needsRender = true);
    this.controls.addEventListener('start',() => this._cameraTween = null);

    this._makeMaterials();
    this._makeLighting();
    this._makeTable();
    this._makeWall();
    this._makeDice();
    this._bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.setAnimationLoop(time => this._frame(time));
    // Preload the full face set once; no texture allocation during a hand.
    const ready = [];
    for (let type = -1; type < 34; type++) ready.push(this._faceMaterial(type,false).map.userData.ready);
    for (const type of [4,13,22]) ready.push(this._faceMaterial(type,true).map.userData.ready);
    this.ready = Promise.all(ready).then(() => {this._needsRender = true; return this;});
  }

  _material(params, physical = false) {
    const m = physical ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params);
    this.materials.add(m);return m;
  }

  _geo(key, factory) {
    if (!this.geometries.has(key)) this.geometries.set(key,factory());
    return this.geometries.get(key);
  }

  _box(w,h,d,r = .035) {
    return this._geo(`box:${w}:${h}:${d}:${r}`,() => new RoundedBoxGeometry(w,h,d,3,r));
  }

  _mesh(geo,mat,x=0,y=0,z=0,parent=this.scene) {
    const mesh = new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);
    mesh.castShadow = true;mesh.receiveShadow = true;
    parent.add(mesh);return mesh;
  }

  _makeMaterials() {
    this.mat = {
      body: this._material({color:'#0c211e',roughness:.38,metalness:.32}),
      rail: this._material({color:'#112c28',roughness:.57,metalness:.16}),
      brass: this._material({color:'#b49b62',roughness:.33,metalness:.78}),
      dark: this._material({color:'#06110f',roughness:.35,metalness:.35}),
      ivory: this._material({color:'#fbf6e6',roughness:.29,metalness:0,clearcoat:.38,clearcoatRoughness:.19},true),
      back: this._material({color:'#1b8c76',roughness:.28,metalness:.03,clearcoat:.52,clearcoatRoughness:.18},true),
      glass: this._material({color:'#142a24',roughness:.1,metalness:.2,transparent:true,opacity:.72}),
      led: this._material({color:'#d9b768',emissive:'#e6bd69',emissiveIntensity:1.2,roughness:.5}),
      quietLed: this._material({color:'#28554a',emissive:'#0e473a',emissiveIntensity:.18,roughness:.5}),
    };
    const canvas = document.createElement('canvas');canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#154d41';ctx.fillRect(0,0,256,256);
    let seed = 739103;
    for (let y=0;y<256;y++) for (let x=0;x<256;x++) {
      seed=(seed*1664525+1013904223)>>>0;
      const grain=(seed>>>24)/255;
      ctx.fillStyle=`rgba(${grain>.5?'95,155,115':'0,26,22'},${.04+grain*.075})`;
      ctx.fillRect(x,y,1,1);
    }
    for(let y=0;y<256;y+=3){ctx.fillStyle='rgba(182,224,190,.024)';ctx.fillRect(0,y,256,1);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(9,9);texture.anisotropy=8;this.textures.add(texture);
    this.mat.felt=this._material({map:texture,roughness:.99,metalness:0});
    this.mat.outline = new THREE.LineBasicMaterial({color:'#f2ce7b',transparent:true,opacity:.95,depthTest:false});
    this.materials.add(this.mat.outline);
  }

  _makeLighting() {
    this.scene.add(new THREE.HemisphereLight('#d7eadf','#07251a',2.25));
    const key = new THREE.DirectionalLight('#fff0d3',3.55);
    key.position.set(-7,18,9);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);
    key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
    key.shadow.camera.near=1;key.shadow.camera.far=48;key.shadow.normalBias=.025;key.shadow.bias=-.0002;
    key.shadow.radius=3;this.scene.add(key);
    const fill=new THREE.DirectionalLight('#9ed5c7',1.15);fill.position.set(10,8,-10);this.scene.add(fill);
    const pool=new THREE.PointLight('#4caa87',26,40,2);pool.position.set(0,6,-7);this.scene.add(pool);
    const floor=this._mesh(this._geo('floor',()=>new THREE.PlaneGeometry(160,160)),this._material({color:'#081e19',roughness:.95}),0,-2.0,0);
    floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  }

  _canvasTexture(w,h,draw) {
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;this.textures.add(tex);return tex;
  }

  _labelPlane(texture,w,h,x,y,z,rotation=0,emissive=false,parent=this.scene) {
    const material=this._material({map:texture,transparent:true,roughness:.8,metalness:0,depthWrite:false,...(emissive?{emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.32}:{})});
    const m=this._mesh(this._geo(`plane:${w}:${h}`,()=>new THREE.PlaneGeometry(w,h)),material,x,y,z,parent);
    m.rotation.set(-Math.PI/2,0,rotation);m.castShadow=false;return m;
  }

  _makeTable() {
    this._mesh(this._box(20,.18,20,.5),this.mat.brass,0,-.25,0);
    this._mesh(this._box(19.8,1.3,19.8,.48),this.mat.body,0,-.82,0);
    this._mesh(this._box(19.9,.37,19.9,.46),this.mat.rail,0,-.12,0);
    this._mesh(this._box(17.72,.055,17.72,.30),this.mat.brass,0,.043,0);
    this._mesh(this._box(17.62,.055,17.62,.28),this.mat.felt,0,.068,0);
    // Narrow lower plinth catches the pool of light under the automatic table.
    this._mesh(this._box(16.8,.2,16.8,.4),this.mat.dark,0,-1.56,0);
    this._mesh(this._box(10.2,.36,10.2,.45),this.mat.body,0,-1.80,0);

    this.screens=[];this.turnLights=[];
    for(let seat=0;seat<4;seat++) {
      const g=new THREE.Group();g.rotation.y=seat*Math.PI/2;this.scene.add(g);
      this._mesh(this._box(5.9,.075,.13,.035),this.mat.brass,0,.11,8.68,g);
      // Inset point-stick drawer with real narrow sticks laid in channels.
      this._mesh(this._box(3.12,.10,.68,.10),this.mat.dark,-4.45,.135,9.16,g);
      this._mesh(this._box(3.24,.033,.80,.10),this.mat.brass,-4.45,.098,9.16,g);
      for(let row=0;row<4;row++) {
        const stick=this._stick(row===0?10000:row===1?5000:row===2?1000:100);
        stick.position.set(-4.45,.225,8.94+row*.145);g.add(stick);
      }
      const plateTex=this._canvasTexture(640,128,(ctx,w,h)=>{
        ctx.clearRect(0,0,w,h);ctx.fillStyle='#c6b784';ctx.textAlign='center';ctx.font='500 26px sans-serif';ctx.letterSpacing='4px';ctx.fillText('SEIRAN  /  MAHJONG CLUB',w/2,56);ctx.fillStyle='#638e7f';ctx.font='13px sans-serif';ctx.fillText('AUTOMATIC TABLE  •  01',w/2,89);
      });
      this._labelPlane(plateTex,3.6,.72,4.4,.091,9.1,0,false,g);
      // The four elevator doors are actual recessed slots under the walls.
      this._mesh(this._box(8.66,.025,.90,.06),this.mat.dark,0,.106,5.74,g);
      this._mesh(this._box(8.57,.024,.82,.05),this.mat.rail,0,.12,5.74,g);
      const slitGeo=this._geo('slit',()=>new THREE.BoxGeometry(8.52,.009,.022));
      this._mesh(slitGeo,this.mat.brass,0,.139,5.31,g);
      this._mesh(slitGeo,this.mat.brass,0,.139,6.17,g);
    }

    // Square automatic-table controller: four recessed score displays and a
    // mechanical dice bowl in its center, with a warm brass perimeter.
    this._mesh(this._box(3.44,.11,3.44,.16),this.mat.brass,0,.135,0);
    this._mesh(this._box(3.30,.16,3.30,.13),this.mat.dark,0,.235,0);
    this._mesh(this._box(3.15,.07,3.15,.11),this.mat.glass,0,.342,0);
    for(let seat=0;seat<4;seat++) {
      const panel=new THREE.Group();panel.rotation.y=seat*Math.PI/2;this.scene.add(panel);
      this._mesh(this._box(2.05,.026,.47,.06),this.mat.body,0,.395,1.12,panel);
      const tex=this._canvasTexture(768,176,()=>{});
      this._labelPlane(tex,1.96,.45,0,.412,1.12,0,true,panel);
      this.screens.push(tex);
      const led=this._mesh(this._box(.64,.022,.036,.012),this.mat.quietLed,0,.411,1.49,panel);
      led.castShadow=false;this.turnLights.push(led);
      for(let k=0;k<3;k++)this._mesh(this._geo('controllerButton',()=>new THREE.CylinderGeometry(.033,.033,.015,12)),this.mat.brass,-.88+k*.12,.415,.77,panel);
    }
    const bowl=this._mesh(this._geo('diceBowl',()=>new THREE.CylinderGeometry(.64,.6,.12,48)),this.mat.brass,0,.415,0);
    bowl.castShadow=false;
    this._mesh(this._geo('diceBowlBase',()=>new THREE.CylinderGeometry(.575,.575,.03,48)),this.mat.dark,0,.484,0);
    const circle=new THREE.TorusGeometry(.578,.016,8,48);this.geometries.set('diceBowlRim',circle);
    const rim=this._mesh(circle,this.mat.brass,0,.555,0);rim.rotation.x=Math.PI/2;

    // Low-key embroidered rules mark, readable only as a real felt marking.
    const embroidery=this._canvasTexture(640,100,(ctx,w,h)=>{
      drawGlyph(ctx,'翠',w/2-53,5,37,42,'rgba(200,215,173,.42)');drawGlyph(ctx,'嵐',w/2+16,5,37,42,'rgba(200,215,173,.42)');ctx.fillStyle='rgba(151,190,156,.38)';ctx.textAlign='center';ctx.font='10px sans-serif';ctx.letterSpacing='4px';ctx.fillText('THE ART OF THE HAND',w/2,73);
    });
    this._labelPlane(embroidery,3.1,.49,0,.111,6.52);
  }

  _stick(value=1000) {
    const group=new THREE.Group();
    this._mesh(this._box(2.6,.04,.091,.009),this.mat.ivory,0,0,0,group);
    const key=`stick:${value}`;
    if(!this._stickTextures)this._stickTextures=new Map();
    if(!this._stickTextures.has(key))this._stickTextures.set(key,this._canvasTexture(512,32,(ctx,w,h)=>{
      const count=value===100?8:value===1000?1:value===5000?5:7;
      ctx.fillStyle=value>=1000?'#ae2823':'#163d39';
      for(let k=0;k<count;k++){ctx.beginPath();ctx.arc(w/2+(k-(count-1)/2)*20,h/2,value===1000?8:4,0,Math.PI*2);ctx.fill();}
    }));
    const tex=this._stickTextures.get(key);
    if(!this._stickMats)this._stickMats=new Map();
    if(!this._stickMats.has(key))this._stickMats.set(key,this._material({map:tex,transparent:true,roughness:.5,depthWrite:false}));
    const top=this._mesh(this._geo('stickFace',()=>new THREE.PlaneGeometry(2.58,.08)),this._stickMats.get(key),0,.024,0,group);top.rotation.x=-Math.PI/2;top.castShadow=false;
    return group;
  }

  _faceMaterial(type,red) {
    const key=`${type}:${red?1:0}`;
    if(!this.faceMaterials.has(key)) {
      const tex=createTileTexture(THREE,type,red);this.textures.add(tex);
      tex.userData.ready.then(()=>this._needsRender=true).catch(()=>{});
      // ACES tone mapping + the strong table lights were bleaching the inks.
      // Tile faces are printed graphics: keep their original sRGB contrast while
      // the ivory tile body continues to receive the physical lighting.
      const material = new THREE.MeshBasicMaterial({
        map:tex, color:'#ffffff', toneMapped:false, fog:false,
        polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1,
      });
      this.materials.add(material);
      this.faceMaterials.set(key,material);
    }
    return this.faceMaterials.get(key);
  }

  _makeTile(tile,hidden=false) {
    const group=new THREE.Group();
    const body=this._mesh(this._box(W,D,H,.043),this.mat.ivory,0,0,0,group);
    const back=this._mesh(this._box(W*.998,.075,H*.997,.032),this.mat.back,0,-D/2+.035,0,group);
    const face=this._mesh(this._geo('tileFace',()=>new THREE.PlaneGeometry(W*.956,H*.958)),this._faceMaterial(hidden?-1:tile.type,hidden?false:!!tile.red),0,D/2+.001,0,group);
    face.rotation.x=-Math.PI/2;face.castShadow=false;face.receiveShadow=false;
    const outlineGeo=this._geo('tileOutline',()=>new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-W/2,.151,-H/2),new THREE.Vector3(W/2,.151,-H/2),new THREE.Vector3(W/2,.151,H/2),new THREE.Vector3(-W/2,.151,H/2),
    ]));
    const outline=new THREE.LineLoop(outlineGeo,this.mat.outline);outline.visible=false;outline.renderOrder=9;group.add(outline);
    group.userData={tileId:tile.id,face,body,back,outline,type:hidden?-1:tile.type,red:hidden?false:!!tile.red};
    return group;
  }

  _makeWall() {
    this.wallGroup=new THREE.Group();this.scene.add(this.wallGroup);
    this.wallBodies=new THREE.InstancedMesh(this._box(W,D,H,.043),this.mat.ivory,136);
    this.wallBacks=new THREE.InstancedMesh(this._box(W*.998,.075,H*.997,.032),this.mat.back,136);
    for(const mesh of [this.wallBodies,this.wallBacks]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.count=0;this.wallGroup.add(mesh);}
    this.wallDora=[];
  }

  _wallPositions(state) {
    const total=state.rules.players===3?108:136;
    const stackCounts=total===108?[14,14,13,13]:[17,17,17,17];
    const result=[];
    for(let seat=0;seat<4;seat++) {
      const count=stackCounts[seat],q=this._seatQ(seat);
      for(let stack=0;stack<count;stack++)for(const layer of [1,0]) {
        const v=new THREE.Vector3((stack-(count-1)/2)*(W+GAP),.145+D/2+layer*(D+.006),5.74).applyQuaternion(q);
        result.push({pos:v,quat:q.clone().multiply(FACE_DOWN),up:q.clone(),index:result.length});
      }
    }
    const dice=state.dice||[3,4],breakIndex=(((dice[0]+dice[1])*2+(state.dealer||0)*stackCounts[0]*2)%total+total)%total;
    return result.slice(breakIndex).concat(result.slice(0,breakIndex));
  }

  _updateWall(state) {
    const sig=[state.rules.players,state.remaining,state.dealer,(state.dice||[]).join(','),(state.doraIndicators||[]).map(t=>t.id).join(',')].join('|');
    if(this._wallSignature===sig)return;
    this._wallSignature=sig;
    const positions=this._wallPositions(state);
    const total=positions.length,remaining=clamp(Number.isFinite(state.remaining)?state.remaining:(state.wall?.length||0),0,total-14);
    const living=positions.slice(total-remaining-14),dead=positions.slice(total-14),indicators=state.doraIndicators||[];
    const exposed=new Map();
    indicators.slice(0,5).forEach((tile,i)=>{const p=dead[4+i*2];if(p)exposed.set(p.index,tile);});
    let count=0;const one=new THREE.Vector3(1,1,1),offset=new THREE.Vector3();
    for(const p of living) {
      if(exposed.has(p.index))continue;
      this._scratchMatrix.compose(p.pos,p.quat,one);this.wallBodies.setMatrixAt(count,this._scratchMatrix);
      offset.set(0,-D/2+.035,0).applyQuaternion(p.quat).add(p.pos);
      this._scratchMatrix.compose(offset,p.quat,one);this.wallBacks.setMatrixAt(count,this._scratchMatrix);count++;
    }
    this.wallBodies.count=this.wallBacks.count=count;
    this.wallBodies.instanceMatrix.needsUpdate=this.wallBacks.instanceMatrix.needsUpdate=true;
    this.wallBodies.computeBoundingSphere();this.wallBacks.computeBoundingSphere();
    this.wallDora.forEach(g=>this.wallGroup.remove(g));this.wallDora=[];
    for(const p of living)if(exposed.has(p.index)) {
      const g=this._makeTile(exposed.get(p.index));g.position.copy(p.pos);g.quaternion.copy(p.up);this.wallGroup.add(g);this.wallDora.push(g);
    }
    this.drawOrigin=(living[0]?.pos||new THREE.Vector3(0,.65,5.7)).clone();
  }

  _makeDice() {
    this.dice=[];
    const normals=[null,new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,-1,0)];
    const pipPositions={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
    const faceMats=[];
    for(let number=1;number<=6;number++) {
      const texture=this._canvasTexture(128,128,ctx=>{
        ctx.fillStyle=number===1?'#b72a24':'#14342d';for(const [x,y]of pipPositions[number]){ctx.beginPath();ctx.arc(64+x*29,64+y*29,number===1?18:11,0,Math.PI*2);ctx.fill();}
      });
      faceMats[number]=this._material({map:texture,transparent:true,roughness:.4,depthWrite:false});
    }
    this._diceNormals=normals;
    for(let d=0;d<2;d++) {
      const group=new THREE.Group();this._mesh(this._box(.29,.29,.29,.035),this.mat.ivory,0,0,0,group);
      for(let number=1;number<=6;number++) {
        const v=normals[number],plane=this._mesh(this._geo('diceFace',()=>new THREE.PlaneGeometry(.25,.25)),faceMats[number],v.x*.148,v.y*.148,v.z*.148,group);
        plane.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v);plane.castShadow=false;
      }
      group.position.set(d===0?-.19:.19,.65,d===0?.10:-.10);this.scene.add(group);this.dice.push(group);
    }
  }

  _seatQ(seat) {return new THREE.Quaternion().setFromAxisAngle(UP,this._seatAngle(seat));}
  _seatAngle(seat) {return this.state?.rules?.players===3 ? [0,Math.PI/2,Math.PI,Math.PI*1.5][seat] : seat*Math.PI/2;}
  _seatPos(seat,x,y,z) {return new THREE.Vector3(x,y,z).applyQuaternion(this._seatQ(seat));}

  _displayTile(key,tile,pos,quat,{hidden=false,interactive=false,delay=0,enter=false,faceDown=false,selected=false,last=false}={}) {
    let record=this.tiles.get(key);
    const type=hidden?-1:tile.type,red=hidden?false:!!tile.red;
    if(!record) {
      const group=this._makeTile(tile,hidden);this.scene.add(group);
      const origin=enter?new THREE.Vector3(0,-.35,0):(this.drawOrigin||pos).clone();
      group.position.copy(this._animateUpdate?origin:pos);
      group.quaternion.copy(this._animateUpdate?FACE_UP:quat);
      record={group,pos:pos.clone(),quat:quat.clone(),basePos:pos.clone(),key,seen:true,interactive,selected:false};
      this.tiles.set(key,record);
    }
    record.seen=true;record.interactive=interactive;record.basePos.copy(pos);
    record.group.userData.tileId=tile.id;
    record.group.userData.seat=interactive?0:-1;
    if(record.group.userData.type!==type||record.group.userData.red!==red) {
      record.group.userData.face.material=this._faceMaterial(type,red);
      record.group.userData.type=type;record.group.userData.red=red;
    }
    const lift=selected?.20:(interactive&&tile.id===this.hovered?.075:0);
    const target=pos.clone();target.y+=lift;
    if(selected)target.z+=.075;
    record.group.userData.outline.visible=selected||last;
    const changed=record.pos.distanceToSquared(target)>.0000001||record.quat.angleTo(quat)>.00001;
    if(changed||!record.initialized) {
      record.pos.copy(target);record.quat.copy(quat);record.selected=selected;
      if(this._animateUpdate)record.tween={from:record.group.position.clone(),to:target.clone(),qFrom:record.group.quaternion.clone(),qTo:quat.clone(),start:performance.now()+delay,duration:enter?650:340,arc:enter?1.45:interactive?.36:.70};
      else {record.group.position.copy(target);record.group.quaternion.copy(quat);record.tween=null;}
      record.initialized=true;
    }
    if(interactive)this._clickTargets.push(record.group.userData.body);
  }

  _showHandsAndRiver(state,newHand) {
    this._clickTargets=[];for(const r of this.tiles.values())r.seen=false;
    const ronTiles=new Set();
    for(const winner of state.result?.winners||[]) {
      if(winner.from==null)continue;
      const ids=new Set((state.players[winner.player]?.hand||[]).map(t=>t.id));
      for(const tile of winner.tiles||[])if(!ids.has(tile.id))ronTiles.add(tile.id);
    }
    for(let seat=0;seat<state.players.length;seat++) {
      const player=state.players[seat],q=this._seatQ(seat);
      const winning=state.result?.winners?.find?.(w=>(w.player??w.seat??w.index)===seat);
      const revealed=!!player.openRiichi||!!player.revealed||!!winning;
      let hand=player.hand||[];
      if(winning?.tiles)hand=winning.tiles;
      hand=[...hand].sort((a,b)=>a.type-b.type||Number(a.red)-Number(b.red)||a.id-b.id);
      const drawIndex=hand.findIndex(t=>t.id===player.drawnTileId);
      if(drawIndex>=0&&drawIndex!==hand.length-1)hand.push(...hand.splice(drawIndex,1));
      const gap=drawIndex>=0?.16:0,totalWidth=(hand.length-1)*(W+GAP)+gap;
      const y=revealed&&seat!==0?.27:.45;
      const orientation=q.clone().multiply(revealed&&seat!==0?FACE_UP:UPRIGHT);
      const meldWidth=(player.melds||[]).reduce((sum,m)=>sum+(m.kind==='ankan'||m.kind==='minkan'?4:3)*.41+.22,0);
      const handCenter=meldWidth>0?-Math.min(2.8,meldWidth*.38):0;
      hand.forEach((tile,i)=>{
        const x=handCenter+(i*(W+GAP)-totalWidth/2)+(i===hand.length-1?gap:0);
        const pos=this._seatPos(seat,x,y,7.58);
        const virtualWin=winning?.from!=null&&!(player.hand||[]).some(t=>t.id===tile.id);
        this._displayTile(virtualWin?`win:${seat}:${tile.id}`:`tile:${tile.id}`,tile,pos,orientation,{hidden:seat!==0&&!revealed,interactive:seat===0&&state.phase==='discard'&&state.turn===0,delay:newHand?300+i*42+seat*70:0,enter:newHand,selected:seat===0&&tile.id===this.selected});
      });

      (player.discards||[]).forEach((discard,i)=>{
        if(discard.called||ronTiles.has((discard.tile||discard).id))return;
        const tile=discard.tile||discard;
        const row=Math.floor(i/6),col=i%6;
        const previousSideways=player.discards.slice(row*6,i).filter(d=>d.riichi).length;
        const x=(col-2.5)*.50+previousSideways*(H-W)+(discard.riichi?(H-W)/2:0),z=2.45+row*.70;
        const pos=this._seatPos(seat,x,FELT_Y+D/2+.035,z);
        const orientation=q.clone();if(discard.riichi)orientation.multiply(new THREE.Quaternion().setFromAxisAngle(UP,Math.PI/2));
        this._displayTile(`tile:${tile.id}`,tile,pos,orientation,{last:tile.id===state.lastDiscard?.tile?.id&&state.phase==='response'});
      });

      let cursor=7.5;
      for(const meld of (player.melds||[])) {
        const tiles=[...meld.tiles];
        let calledIndex=tiles.findIndex(t=>t.id===meld.calledTileId);
        if(calledIndex<0)calledIndex=0;
        const called=tiles[calledIndex];
        const isAdded=meld.kind==='kakan';
        let extra=null;
        if(isAdded&&tiles.length>3) {
          const extraIndex=tiles.findIndex(t=>t.id===meld.addedTileId);
          extra=tiles.splice(extraIndex<0?tiles.length-1:extraIndex,1)[0];
        }
        if(meld.kind!=='ankan'&&called) {
          const idx=tiles.findIndex(t=>t.id===called.id);if(idx>=0)tiles.splice(idx,1);
          const relative=(meld.from-seat+state.players.length)%state.players.length;
          tiles.splice(relative===1?tiles.length:relative===2?1:0,0,called);
        }
        let calledPos=null;
        for(let i=tiles.length-1;i>=0;i--) {
          const tile=tiles[i],sideways=meld.kind!=='ankan'&&tile.id===meld.calledTileId;
          const down=meld.kind==='ankan'&&(i===0||i===tiles.length-1);
          const step=sideways?H+.028:W+.028;
          cursor-=step/2;
          const pos=this._seatPos(seat,cursor,FELT_Y+D/2+.035,7.30);
          const orientation=q.clone().multiply(down?FACE_DOWN:FACE_UP);
          if(sideways)orientation.multiply(new THREE.Quaternion().setFromAxisAngle(UP,Math.PI/2));
          this._displayTile(`tile:${tile.id}`,tile,pos,orientation,{hidden:down});
          if(sideways)calledPos={pos:pos.clone(),quat:orientation.clone()};
          cursor-=step/2;
        }
        if(extra) {
          const target=calledPos||{pos:this._seatPos(seat,cursor+.3,FELT_Y+D/2+.035,7.3),quat:q.clone()};
          target.pos.y+=D+.014;
          this._displayTile(`tile:${extra.id}`,extra,target.pos,target.quat);
        }
        cursor-=.20;
      }

      (player.nuki||[]).forEach((tile,i)=>{
        this._displayTile(`tile:${tile.id}`,tile,this._seatPos(seat,-7.30+i*(W+.04),FELT_Y+D/2+.036,6.85),q.clone());
      });
      this._showRiichiStick(seat,!!player.riichi||!!player.openRiichi);
    }
    for(const [key,record]of this.tiles)if(!record.seen){this.scene.remove(record.group);this.tiles.delete(key);}
  }

  _showRiichiStick(seat,visible) {
    if(!this.riichiSticks)this.riichiSticks=[];
    if(!this.riichiSticks[seat]) {
      const stick=this._stick(1000);stick.scale.setScalar(.65);stick.position.copy(this._seatPos(seat,0,.13,1.88));stick.quaternion.copy(this._seatQ(seat));this.scene.add(stick);this.riichiSticks[seat]=stick;
    }
    this.riichiSticks[seat].visible=visible;
  }

  _updateScores(state) {
    for(let seat=0;seat<4;seat++) {
      const player=state.players[seat],texture=this.screens[seat],ctx=texture.image.getContext('2d');
      const wind=player?WINDS[((seat-state.dealer+state.players.length)%state.players.length)]:'';
      const signature=player?`${player.score}:${wind}:${state.turn===seat}:${state.phase}:${player.riichi}`:'empty';
      if(texture.userData.signature===signature)continue;
      texture.userData.signature=signature;ctx.clearRect(0,0,768,176);
      ctx.fillStyle='#081611';roundedRect(ctx,0,0,768,176,17);ctx.fill();
      if(player) {
        const active=state.turn===seat&&['discard','response'].includes(state.phase);
        drawGlyph(ctx,wind,32,44,72,83,active?'#d9c48a':'#779486');
        ctx.fillStyle=active?'#edd69a':'#adc3a9';ctx.font='500 95px monospace';ctx.textAlign='right';ctx.fillText(Math.round(player.score).toLocaleString('en-US'),735,121);
        this.turnLights[seat].material=active?this.mat.led:this.mat.quietLed;
      } else {
        ctx.fillStyle='#486156';ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText('3 PLAYER TABLE',384,105);this.turnLights[seat].material=this.mat.quietLed;
      }
      texture.needsUpdate=true;
    }
  }

  update(state,options={}) {
    if(this._disposed||!state?.players)return;
    const old=this.state;
    const newMatch=state.seed!=null&&this._previousSeed!=null&&state.seed!==this._previousSeed;
    const newHand=!old||newMatch||this._previousHandId!==state.handId;
    this.state=state;
    this._animateUpdate=options.animate!==false&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._updateWall(state);
    this._showHandsAndRiver(state,newHand);
    this._updateScores(state);
    if(newHand) {
      this._seenEvents.clear();
      if(this._animateUpdate){this.animateDeal();this.rollDice(state.dice||[3,4]);}
      else this._settleDice(state.dice||[3,4]);
    }
    if(!newHand&&this._animateUpdate)state.players.forEach((player,seat)=>{
      if(player.riichi&&!this._previousRiichi?.[seat]) {
        this._flyStick(this._seatPos(seat,-4.45,.3,9.15),this._seatPos(seat,0,.16,1.88),.68,1100,1000);
      }
    });
    for(const event of (state.events||[state.event]).filter(Boolean)) {
      const id=event.id??`${state.handId}:${event.type}:${event.player}:${event.tile?.id}:${state.remaining}`;
      if(this._seenEvents.has(id))continue;
      this._seenEvents.add(id);
      if(!newHand&&this._animateUpdate)this._eventAnimation(event,old,state);
    }
    if(this._seenEvents.size>160)this._seenEvents=new Set([...this._seenEvents].slice(-80));
    // A score snapshot is essential because the engine may mutate .state in place.
    this._previousScores=state.players.map(p=>p.score);
    this._previousRiichi=state.players.map(p=>!!p.riichi);
    this._previousHandId=state.handId;
    if(state.seed!=null)this._previousSeed=state.seed;
    this._needsRender=true;
  }

  _eventAnimation(event,old,state) {
    if(['ron','tsumo','handEnd'].includes(event.type)&&this._previousScores) {
      const signature=state.handId+':'+state.players.map(p=>p.score).join(',');
      if(this._payoutSignature===signature)return;
      this._payoutSignature=signature;
      const differences=state.players.map((p,i)=>p.score-this._previousScores[i]);
      const receiver=differences.indexOf(Math.max(...differences));
      if(differences[receiver]>0)for(let i=0;i<differences.length;i++)if(differences[i]<0) {
        const from=this._seatPos(i,-4.45,.25,9.15),to=this._seatPos(receiver,-4.45,.3,9.15);
        for(let k=0;k<3;k++)this._flyStick(from.clone().add(new THREE.Vector3(k*.1,0,0)),to.clone().add(new THREE.Vector3(k*.1,0,0)),.8,1100+k*90,1000,k*95);
      }
    }
    if(['ankan','minkan','kakan'].includes(event.type)) {
      this._animations.add({kind:'kanPulse',start:performance.now(),duration:850});
    }
  }

  _flyStick(from,to,scale=.7,duration=1000,value=1000,delay=0) {
    const group=this._stick(value);group.scale.setScalar(scale);group.position.copy(from);this.scene.add(group);
    this._animations.add({kind:'stick',group,from,to,start:performance.now()+delay,duration});
  }

  animateDeal() {
    for(const animation of this._animations)if(animation.kind==='wallRise')this._animations.delete(animation);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.wallGroup.position.y=0;this._needsRender=true;return;}
    this.wallGroup.position.y=-.98;
    this._animations.add({kind:'wallRise',start:performance.now()+150,duration:1250});
    this._needsRender=true;
  }

  _settleDice(numbers) {
    for(let i=0;i<2;i++) {
      const value=clamp(Number(numbers[i])||1,1,6),q=new THREE.Quaternion().setFromUnitVectors(this._diceNormals[value],UP);
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(UP,i===0?.23:-.29));
      this.dice[i].quaternion.copy(q);this.dice[i].position.set(i===0?-.20:.20,.647,i===0?.10:-.1);
    }
  }

  rollDice(numbers=[1,1]) {
    for(const a of this._animations)if(a.kind==='dice')this._animations.delete(a);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){this._settleDice(numbers);this._needsRender=true;return;}
    const finals=numbers.map((number,i)=>{
      const q=new THREE.Quaternion().setFromUnitVectors(this._diceNormals[clamp(Number(number)||1,1,6)],UP);
      return q.premultiply(new THREE.Quaternion().setFromAxisAngle(UP,i===0?.23:-.29));
    });
    this._animations.add({kind:'dice',start:performance.now(),duration:1600,finals});this._needsRender=true;
  }

  setSelected(tileId) {
    this.selected=tileId??null;
    if(this.state){this._animateUpdate=true;this._showHandsAndRiver(this.state,false);this._needsRender=true;}
  }

  setView(view) {
    if(!['table','top','player'].includes(view))return;
    this.view=view;
    const direction=view==='top'?new THREE.Vector3(0,1,.005):view==='player'?new THREE.Vector3(0,.68,1):new THREE.Vector3(0,.93,1);
    direction.normalize();
    const position=direction.multiplyScalar(this._fitDistance(direction));
    this._cameraTween={from:this.camera.position.clone(),to:position,start:performance.now(),duration:650};
    this._needsRender=true;
  }

  _fitDistance(direction) {
    const cam=new THREE.PerspectiveCamera(this.camera.fov,this.camera.aspect,.1,140);
    let distance=20;
    const corners=[];
    for(const x of [-10.25,10.25])for(const y of [-1.7,1])for(const z of [-10.25,10.25])corners.push(new THREE.Vector3(x,y,z));
    for(let step=0;step<45;step++) {
      cam.position.copy(direction).multiplyScalar(distance);cam.lookAt(0,.1,0);cam.updateMatrixWorld();
      let maximum=0;for(const corner of corners){const v=corner.clone().project(cam);maximum=Math.max(maximum,Math.abs(v.x),Math.abs(v.y));}
      if(maximum<=.94)break;distance*=1.035;
    }
    return Math.min(distance,58);
  }

  resize() {
    if(this._disposed)return;
    const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight);
    this.renderer.setSize(w,h,false);
    this.hud?.resize(w,h);
    const stage=this.hud?.layout.stage;
    this.camera.aspect=stage?stage.w/stage.h:w/h;this.camera.updateProjectionMatrix();
    const direction=this.camera.position.clone().sub(this.controls.target).normalize();
    const distance=this._fitDistance(direction);this.camera.position.copy(direction.multiplyScalar(distance));
    this.controls.maxDistance=Math.max(48,distance*1.5);this.controls.update();this._needsRender=true;
  }

  _bindPointer() {
    const canvas=this.renderer.domElement;
    this._onPointerDown=e=>{this._pointerDown={x:e.clientX,y:e.clientY,t:performance.now()};};
    this._onPointerMove=e=>{
      if(e.buttons)return;
      const hit=this._hitTile(e);const id=hit?.tileId??null;
      if(id!==this.hovered){this.hovered=id;canvas.style.cursor=id!==null?'pointer':'grab';if(this.state){this._animateUpdate=true;this._showHandsAndRiver(this.state,false);this._needsRender=true;}}
    };
    this._onPointerUp=e=>{
      const down=this._pointerDown;this._pointerDown=null;
      if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||performance.now()-down.t>800)return;
      const tile=this._hitTile(e);if(tile)this.options.onTileClick?.(tile.tileId);
    };
    this._onPointerLeave=()=>{if(this.hovered!==null){this.hovered=null;if(this.state){this._animateUpdate=true;this._showHandsAndRiver(this.state,false);this._needsRender=true;}}};
    canvas.addEventListener('pointerdown',this._onPointerDown);
    canvas.addEventListener('pointermove',this._onPointerMove);
    canvas.addEventListener('pointerup',this._onPointerUp);
    canvas.addEventListener('pointerleave',this._onPointerLeave);
  }

  _hitTile(event) {
    const r=this.renderer.domElement.getBoundingClientRect();
    const stage=this.hud?.layout.stage||{x:0,y:0,w:r.width,h:r.height};
    const px=event.clientX-r.left-stage.x,py=event.clientY-r.top-stage.y;
    if(px<0||py<0||px>=stage.w||py>=stage.h)return null;
    this._pointer.set(px/stage.w*2-1,-py/stage.h*2+1);
    this._raycaster.setFromCamera(this._pointer,this.camera);
    const intersection=this._raycaster.intersectObjects(this._clickTargets,false)[0];
    return intersection?.object?.parent?.userData;
  }

  _frame(time) {
    if(this._disposed)return;
    let animate=false;
    if(this._cameraTween) {
      const a=this._cameraTween,t=clamp((time-a.start)/a.duration,0,1);this.camera.position.lerpVectors(a.from,a.to,EASE(t));this.controls.target.set(0,.1,0);this.camera.lookAt(this.controls.target);if(t===1)this._cameraTween=null;animate=true;
    }
    for(const record of this.tiles.values())if(record.tween) {
      const a=record.tween,t=clamp((time-a.start)/a.duration,0,1),u=EASE(t);
      record.group.position.lerpVectors(a.from,a.to,u);record.group.position.y+=Math.sin(Math.PI*t)*a.arc;
      record.group.quaternion.slerpQuaternions(a.qFrom,a.qTo,u);
      if(t===1)record.tween=null;animate=true;
    }
    for(const a of this._animations) {
      const t=clamp((time-a.start)/a.duration,0,1),u=EASE(t);animate=true;
      if(a.kind==='wallRise')this.wallGroup.position.y=-.98*(1-u);
      if(a.kind==='stick') {a.group.visible=time>=a.start;a.group.position.lerpVectors(a.from,a.to,u);a.group.position.y+=Math.sin(t*Math.PI)*2.3;a.group.rotation.y=t*Math.PI*.7;}
      if(a.kind==='dice') {
        for(let i=0;i<2;i++) {
          const g=this.dice[i],endX=i===0?-.20:.20,endZ=i===0?.10:-.1;
          g.position.set(endX+Math.sin(t*26+i*3)*.22*(1-t),.647+Math.abs(Math.sin(t*13.5+i*.8))*.54*(1-t),endZ+Math.cos(t*29+i*4)*.16*(1-t));
          if(t<.78)g.rotation.set(t*27+i,t*33-i,t*21+i*.7);
          else {const from=new THREE.Quaternion().setFromEuler(new THREE.Euler(.78*27+i,.78*33-i,.78*21+i*.7));g.quaternion.slerpQuaternions(from,a.finals[i],EASE((t-.78)/.22));}
        }
      }
      if(a.kind==='kanPulse')this.mat.led.emissiveIntensity=1.2+Math.sin(t*Math.PI)*1.7;
      if(t===1) {if(a.group)this.scene.remove(a.group);if(a.kind==='dice'){this.dice[0].position.set(-.20,.647,.10);this.dice[1].position.set(.20,.647,-.10);}this._animations.delete(a);}
    }
    const moved=this.controls.update();
    const hudChanged=this.hud?.repaint()||false;
    if(animate||moved||hudChanged||this._needsRender){
      const r=this.renderer,hud=this.hud;
      if(hud){
        const {w,h,stage}=hud.layout;
        // Cache the expensive 3D pass. Hovering or paging a menu only repaints the UI.
        const pw=Math.max(1,Math.round(stage.w*r.getPixelRatio())),ph=Math.max(1,Math.round(stage.h*r.getPixelRatio()));
        let cacheChanged=false;
        if(!this._worldTarget){
          this._worldTarget=new THREE.WebGLRenderTarget(pw,ph,{samples:Math.min(4,r.capabilities.maxSamples||0)});
          this._worldTarget.texture.colorSpace=THREE.SRGBColorSpace;
          this._worldGeometry=new THREE.PlaneGeometry(2,2);
          this._worldMaterial=new THREE.MeshBasicMaterial({map:this._worldTarget.texture,depthTest:false,depthWrite:false,toneMapped:false});
          this._worldScene=new THREE.Scene();this._worldScene.add(new THREE.Mesh(this._worldGeometry,this._worldMaterial));cacheChanged=true;
        }else if(this._worldTarget.width!==pw||this._worldTarget.height!==ph){this._worldTarget.setSize(pw,ph);cacheChanged=true;}
        r.autoClear=false;r.setScissorTest(false);
        if(animate||moved||this._needsRender||cacheChanged){
          // setRenderTarget installs its pixel-sized viewport; setViewport would apply DPR twice.
          r.setRenderTarget(this._worldTarget);r.clear();r.render(this.scene,this.camera);r.setRenderTarget(null);
        }
        r.setViewport(0,0,w,h);r.setClearColor('#081f1c',1);r.clear();
        r.setViewport(stage.x,h-stage.y-stage.h,stage.w,stage.h);r.render(this._worldScene,hud.camera);
        r.setViewport(0,0,w,h);r.clearDepth();r.render(hud.scene,hud.camera);
      }else r.render(this.scene,this.camera);
      this._needsRender=false;
    }
    this._lastTime=time;
  }

  dispose() {
    if(this._disposed)return;this._disposed=true;
    this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.controls.dispose();this.hud?.dispose();
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this._onPointerDown);canvas.removeEventListener('pointermove',this._onPointerMove);canvas.removeEventListener('pointerup',this._onPointerUp);canvas.removeEventListener('pointerleave',this._onPointerLeave);
    for(const tex of this.textures)tex.dispose();for(const mat of this.materials)mat.dispose();for(const geo of this.geometries.values())geo.dispose();
    this._worldTarget?.dispose();this._worldGeometry?.dispose();this._worldMaterial?.dispose();
    this.scene.clear();this.renderer.dispose();canvas.remove();this.tiles.clear();this._animations.clear();
  }
}
