/** Pixel-space layout. No access to the parent frame and no document scrolling. */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rect = (x,y,w,h) => ({x,y,w,h});
export const inside = (r,w,h) => r.x>=-0.5 && r.y>=-0.5 && r.w>=0 && r.h>=0 && r.x+r.w<=w+0.5 && r.y+r.h<=h+0.5;
export const contains = (r,x,y) => x>=r.x && y>=r.y && x<r.x+r.w && y<r.y+r.h;
export function frameLayout(width,height,insets={}) {
  const w=Math.max(1,width),h=Math.max(1,height);
  const left=clamp(insets.left||0,0,w/5),right=clamp(insets.right||0,0,w/5);
  const top=clamp(insets.top||0,0,h/5),bottom=clamp(insets.bottom||0,0,h/5);
  const aw=w-left-right,ah=h-top-bottom,compact=ah<520,narrow=aw<600;
  const headerH=compact?40:50, seatsH=narrow?54:(compact?38:46);
  const stackedHand=narrow&&ah>aw;
  const dockH=stackedHand?Math.min(246,ah*.48):(compact?144:188);
  const stage=rect(left,top+headerH+seatsH,aw,Math.max(1,ah-headerH-seatsH-dockH));
  const margin=aw<600?8:16;
  return {w,h,compact,narrow,stackedHand,margin,safe:rect(left,top,aw,ah),header:rect(left,top,aw,headerH),seats:rect(left,top+headerH,aw,seatsH),stage,
    dock:rect(left,top+ah-dockH,aw,dockH),
    modal:rect(left+margin,top+8,Math.max(1,aw-margin*2),Math.max(1,ah-16))};
}
export function modalLayout(frame, maxWidth=1024) {
  const raw=frame.modal,w=Math.min(raw.w,maxWidth),x=raw.x+(raw.w-w)/2;
  const headerH=46, footerH=48;
  return {x,y:raw.y,w,h:raw.h,header:rect(x,raw.y,w,headerH),body:rect(x+12,raw.y+headerH,w-24,Math.max(1,raw.h-headerH-footerH)),footer:rect(x+12,raw.y+raw.h-footerH,w-24,footerH)};
}
export function paginate(items, page, availableHeight, rowHeight, reserved=0) {
  const perPage=Math.max(1,Math.floor(Math.max(1,availableHeight-reserved)/rowHeight));
  const pageCount=Math.max(1,Math.ceil(items.length/perPage)),index=clamp(page||0,0,pageCount-1);
  return {items:items.slice(index*perPage,(index+1)*perPage),page:index,pageCount,perPage,start:index*perPage};
}
export function handLayout(frame,hand) {
  const stack=frame.stackedHand;
  const d=frame.dock,columns=stack?7:Math.max(1,hand.length),rows=stack?Math.ceil(hand.length/7):1;
  const pad=frame.narrow?10:16, gap=frame.narrow?4:5;
  const top=d.y+(frame.compact?25:31),bottom=d.y+d.h-39;
  const spaceHeight=Math.max(1,bottom-top),spaceWidth=d.w-pad*2;
  const h=Math.min(frame.compact?72:100,(spaceHeight-(rows-1)*13)/Math.max(1,rows)-13);
  const tileW=Math.max(1,Math.min(h*.71,(spaceWidth-(columns-1)*gap-(stack?0:12))/columns));
  const tileH=tileW/0.71,rowHeight=tileH+13;
  return hand.map((tile,i)=>{
    const row=stack?Math.floor(i/7):0,index=stack?i%7:i;
    const count=stack?Math.min(7,hand.length-row*7):hand.length;
    const drawn=!stack&&i===hand.length-1&&tile.drawn?12:0;
    const total=count*tileW+(count-1)*gap+(!stack&&hand.at(-1)?.drawn?12:0);
    return {...rect(d.x+(d.w-total)/2+index*(tileW+gap)+drawn,top+row*(rowHeight+13),tileW,tileH),id:tile.id};
  });
}
