import * as THREE from 'three';
import {tileDataURL} from '../render/tile-art.js';
import {frameLayout,contains,inside,clamp} from './layout.js';

export const THEME=Object.freeze({bg:'#081f1c',panel:'#102d28',raised:'#1b3b33',line:'#436359',text:'#f2f0df',muted:'#b0c9bf',gold:'#f0ce81',ink:'#11291f',accent:'#99dfb5',danger:'#ffad9b',hover:'#2a5142'});
const FONT='"Noto Sans CJK JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';
/** An immediate-mode UI, painted into an offscreen texture and composited INSIDE the WebGL frame. */
export class CanvasUI {
  constructor(view, draw, handlers={}) {
    this.view=view;this.draw=draw;this.handlers=handlers;this.canvas=view.renderer.domElement;
    this.surface=document.createElement('canvas');this.ctx=this.surface.getContext('2d',{alpha:true});
    this.texture=this.makeTexture();
    this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,fog:false});
    this.geometry=new THREE.PlaneGeometry(2,2);this.scene=new THREE.Scene();this.scene.add(new THREE.Mesh(this.geometry,this.material));
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);this.camera.position.z=1;
    this.regions=[];this.images=new Map();this.hover=null;this.focus=null;this.down=null;this.modal=false;this.dirty=true;
    this.canvas.tabIndex=0;this.canvas.setAttribute('role','application');this.canvas.setAttribute('aria-label','翠嵐麻雀。Tabで操作を選択、Enterで実行、Escapeで戻る。左右キーで手牌を選択。');
    this.bindInput();view.hud=this;view.resize();
  }
  makeTexture(){
    const texture=new THREE.CanvasTexture(this.surface);texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    return texture;
  }
  resize(w,h) {
    const css=getComputedStyle(document.documentElement),insets={};
    for(const edge of ['top','bottom','left','right'])insets[edge]=parseFloat(css.getPropertyValue(`--safe-${edge}`))||0;
    // Discard old hit boxes immediately: resize must never leave clickable off-frame controls.
    if(this.layout?.w!==w||this.layout?.h!==h){this.regions=[];this.textLabels=[];}
    this.layout=frameLayout(w,h,insets);
    const max=this.view.renderer.capabilities.maxTextureSize||4096;
    this.dpr=Math.min(window.devicePixelRatio||1,2,max/Math.max(w,h));
    const width=Math.max(1,Math.round(w*this.dpr)),height=Math.max(1,Math.round(h*this.dpr));
    if(this.surface.width!==width||this.surface.height!==height){
      this.surface.width=width;this.surface.height=height;
      // WebGL texture storage dimensions are immutable after first upload. Reusing it
      // after resizing leaves stale pixels / scaled duplicate HUDs on some renderers.
      const previous=this.texture;this.texture=this.makeTexture();this.material.map=this.texture;
      previous.dispose();
    }
    this.dirty=true;
  }
  invalidate(){this.dirty=true;}
  repaint(){
    if(!this.dirty||!this.layout)return false;
    const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.layout.w,this.layout.h);
    this.regions=[];this.textLabels=[];this.modal=false;this.draw(this,this.layout);
    this.view.controls.enabled=!this.modal;this.texture.needsUpdate=true;this.dirty=false;return true;
  }
  panel(r,color=THEME.panel,radius=10,stroke=null){
    const c=this.ctx;c.save();c.beginPath();c.roundRect(r.x,r.y,Math.max(0,r.w),Math.max(0,r.h),Math.min(radius,r.w/2,r.h/2));
    c.fillStyle=color;c.fill();if(stroke){c.lineWidth=1;c.strokeStyle=stroke;c.stroke();}c.restore();
  }
  line(x1,y1,x2,y2,color=THEME.line){const c=this.ctx;c.save();c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore();}
  text(value,x,y,{size=14,color=THEME.text,weight=500,align='left',width=Infinity}={}){
    if(width<=0)return;
    const c=this.ctx;c.save();c.font=`${weight} ${size}px ${FONT}`;c.textBaseline='middle';c.textAlign=align;c.fillStyle=color;
    const original=String(value??'');let t=original;
    if(c.measureText(t).width>width){while(t.length&&c.measureText(t+'…').width>width)t=t.slice(0,-1);t+='…';}
    c.fillText(t,x,y);c.restore();this.textLabels?.push({text:original,x,y,size,display:t});
  }
  wrap(value,x,y,width,{size=14,lineHeight=22,color=THEME.muted,maxLines=4,weight=400}={}){
    const c=this.ctx;c.save();c.font=`${weight} ${size}px ${FONT}`;
    let row='',lines=[];for(const char of String(value??'')){
      if(char==='\n'){lines.push(row);row='';continue;}
      if(row&&c.measureText(row+char).width>width){lines.push(row);row=char;}else row+=char;
    }if(row)lines.push(row);c.restore();
    lines.slice(0,maxLines).forEach((line,i)=>this.text(i===maxLines-1&&lines.length>maxLines?line.slice(0,-1)+'…':line,x,y+i*lineHeight,{size,color,weight,width}));
    return Math.min(lines.length,maxLines)*lineHeight;
  }
  hit(id,r,click,{disabled=false,doubleClick=null,label='',block=false}={}){
    // All hit regions must be visible and belong to this frame; never let clipped controls receive input.
    if(!inside(r,this.layout.w,this.layout.h))return;
    this.regions.push({...r,id,click,disabled,doubleClick,label,block});
  }
  button(id,label,r,click,{active=false,primary=false,disabled=false,quiet=false,size=14}={}){
    const hot=this.hover===id,focused=this.focus===id;
    this.panel(r,primary?THEME.gold:active?THEME.hover:hot?THEME.hover:quiet?THEME.panel:THEME.raised,7,focused?THEME.gold:active?THEME.accent:THEME.line);
    this.text(label,r.x+r.w/2,r.y+r.h/2,{align:'center',size,weight:primary?700:500,color:disabled?THEME.muted:primary?THEME.ink:active?THEME.accent:THEME.text,width:r.w-10});
    this.hit(id,r,click,{disabled,label});
  }
  tile(id,tile,r,click,{selected=false,legal=true,drawn=false,doubleClick=null,label=null}={}){
    const key=`${tile.type}:${!!tile.red}`;let image=this.images.get(key);
    if(!image){image=new Image();image.onload=()=>this.invalidate();image.src=tileDataURL(tile.type,!!tile.red);this.images.set(key,image);}
    const hot=this.hover===id,focus=this.focus===id;
    this.panel({x:r.x,y:r.y+3,w:r.w,h:r.h},'#176750',4);
    if(selected||hot||focus)this.panel({x:r.x-2,y:r.y-3,w:r.w+4,h:r.h+7},selected?THEME.gold:THEME.accent,5);
    // Intentionally no alpha or disabled opacity on the face: symbols stay readable in every phase.
    if(image.complete&&image.naturalWidth)this.ctx.drawImage(image,r.x,r.y,r.w,r.h);else this.panel(r,'#fffdf5',4);
    if(drawn)this.line(r.x+3,r.y+r.h+4,r.x+r.w-3,r.y+r.h+4,THEME.gold);
    if(label!==null)this.text(label,r.x+r.w/2,r.y+r.h+11,{align:'center',size:10,color:selected?THEME.gold:THEME.muted,width:r.w+5});
    if(click)this.hit(id,r,click,{disabled:!legal,doubleClick,label:String(label??tile.type)});
  }
  beginModal(){this.modal=true;this.regions=[];this.panel({x:0,y:0,w:this.layout.w,h:this.layout.h},'rgba(0,10,8,.78)',0);}
  point(event){const r=this.canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*this.layout.w/r.width,y:(event.clientY-r.top)*this.layout.h/r.height};}
  at(x,y){return [...this.regions].reverse().find(r=>contains(r,x,y));}
  blocks(x,y){return this.modal||!!this.at(x,y)||contains(this.layout.header,x,y)||contains(this.layout.seats,x,y)||contains(this.layout.dock,x,y);}
  invoke(region,double=false){if(!region||region.disabled||region.block)return;try{const result=double&&region.doubleClick?region.doubleClick():region.click?.();if(result?.catch)result.catch(e=>this.handlers.onError?.(e));}catch(e){this.handlers.onError?.(e);}this.invalidate();}
  bindInput(){
    const c=this.canvas,consume=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
    this.listeners=[];const bind=(name,fn,options={capture:true,passive:false})=>{c.addEventListener(name,fn,options);this.listeners.push([name,fn,options]);};
    bind('pointerdown',e=>{if(!this.layout)return;const p=this.point(e);if(!this.blocks(p.x,p.y))return;consume(e);c.focus({preventScroll:true});
      const hit=this.at(p.x,p.y);this.down={...p,id:hit?.id,pointer:e.pointerId,t:performance.now()};try{c.setPointerCapture(e.pointerId);}catch{}this.invalidate();});
    bind('pointermove',e=>{if(!this.layout)return;const p=this.point(e),r=this.at(p.x,p.y);const next=r&&!r.disabled&&!r.block?r.id:null;
      if(next!==this.hover){this.hover=next;this.invalidate();}c.style.cursor=next?'pointer':this.blocks(p.x,p.y)?'default':'grab';if(this.down||this.blocks(p.x,p.y))consume(e);});
    bind('pointerup',e=>{if(!this.down)return;consume(e);const down=this.down;this.down=null;const p=this.point(e),r=this.at(p.x,p.y);
      try{if(c.hasPointerCapture(e.pointerId))c.releasePointerCapture(e.pointerId);}catch{}
      if(Math.hypot(p.x-down.x,p.y-down.y)>14){if(this.modal&&Math.abs(p.y-down.y)>40)this.handlers.onPage?.(p.y<down.y?1:-1);return;}
      if(r?.id===down.id){const now=performance.now(),dbl=!!r.doubleClick&&this.lastClick?.id===r.id&&now-this.lastClick.t<350;this.lastClick={id:r.id,t:now};this.focus=null;this.invoke(r,dbl);}});
    bind('pointercancel',()=>{this.down=null;this.invalidate();});
    bind('pointerleave',()=>{this.hover=null;this.invalidate();});
    bind('wheel',e=>{const p=this.point(e);if(!this.blocks(p.x,p.y))return;consume(e);const now=performance.now();if(this.modal&&Math.abs(e.deltaY)>8&&now-(this.lastWheel||0)>180){this.lastWheel=now;this.handlers.onPage?.(e.deltaY>0?1:-1);this.invalidate();}});
    bind('contextmenu',e=>{const p=this.point(e);if(this.blocks(p.x,p.y))consume(e);});
    bind('keydown',e=>{
      if(e.key==='Tab'){consume(e);const list=this.regions.filter(r=>!r.disabled&&!r.block&&r.click);const at=list.findIndex(r=>r.id===this.focus);this.focus=list[(at+(e.shiftKey?-1:1)+list.length)%list.length]?.id??null;this.invalidate();return;}
      if(e.key==='Escape'){consume(e);this.lastClick=null;this.focus=null;this.handlers.onEscape?.();this.invalidate();return;}
      if(['PageDown','PageUp'].includes(e.key)&&this.modal){consume(e);this.handlers.onPage?.(e.key==='PageDown'?1:-1);this.invalidate();return;}
      if((e.key==='Enter'||e.code==='Space')&&this.focus){consume(e);this.invoke(this.regions.find(r=>r.id===this.focus));return;}
      if(this.handlers.onKey?.(e)){consume(e);this.focus=null;this.invalidate();}
    });
    bind('dragover',e=>{consume(e);});bind('drop',e=>{consume(e);this.handlers.onFile?.(e.dataTransfer?.files?.[0]);});
  }
  diagnostics(){return {width:this.layout.w,height:this.layout.h,modal:this.modal,regions:this.regions.map(({id,x,y,w,h,disabled,label})=>({id,x,y,w,h,disabled,label})),labels:this.textLabels,stage:this.layout.stage};}
  dispose(){for(const [name,fn,opt] of this.listeners)this.canvas.removeEventListener(name,fn,opt);this.geometry.dispose();this.material.dispose();this.texture.dispose();this.images.clear();}
}
