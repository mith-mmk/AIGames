import fs from 'node:fs';
export async function load(url,context,next){
 if(!url.endsWith('/web/js/pinball/physics.mjs'))return next(url,context);
 let source=fs.readFileSync(new URL(url),'utf8');
 const before='      this.world.step(this.queue);';
 const old='const p = this.ball.translation(), dx = p.x - h.x, dz = p.z - h.z, len = Math.hypot(dx, dz) || 1;';
 if(!source.includes(before)||!source.includes(old))throw Error('sweep anchors missing');
 source=source.replace(before,'      this.bumperSweepStart={...this.ball.translation()};\n'+before);
 source=source.replace(old,`const p = this.ball.translation(); let dx=p.x-h.x,dz=p.z-h.z;
      if(h.type==='bumper' && this.bumperSweepStart){
        const c=this.world.getCollider(other),start=this.bumperSweepStart;
        const sx=start.x-h.x,sz=start.z-h.z,ux=p.x-start.x,uz=p.z-start.z;
        const radius=c.radius()+TABLE.ballRadius,aa=ux*ux+uz*uz,bb=2*(sx*ux+sz*uz),cc=sx*sx+sz*sz-radius*radius;
        const disc=bb*bb-4*aa*cc;
        if(cc>0 && dx*dx+dz*dz<radius*radius && aa>0 && disc>=0){
          const fraction=(-bb-Math.sqrt(disc))/(2*aa),y=start.y+fraction*(p.y-start.y),cy=c.translation().y;
          if(fraction>=0&&fraction<=1&&y>=cy-c.halfHeight()&&y<=cy+c.halfHeight()){
            dx=sx+fraction*ux;dz=sz+fraction*uz;
          }
        }
      }
      const len=Math.hypot(dx,dz)||1;`);
 if(process.env.SWEEP_MODE==='restitution')source=source.replace('const impulse = Math.max(0, (h.strength??6) - outward) * this.ball.mass();','const e=(this.world.getCollider(other).restitution()+this.ballCollider.restitution())/2; const impulse = Math.max(0, Math.max(h.strength??6,-outward*e) - outward) * this.ball.mass();');
 return {format:'module',source,shortCircuit:true};
}
