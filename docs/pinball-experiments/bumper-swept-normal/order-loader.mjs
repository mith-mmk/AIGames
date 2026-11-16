import fs from 'node:fs';
export async function load(url,context,next){
 if(!url.endsWith('/web/js/pinball/physics.mjs'))return next(url,context);
 let source=fs.readFileSync(new URL(url),'utf8');
 const old='const impulse = Math.max(0, (h.strength??6) - outward) * this.ball.mass();\n        this.ball.applyImpulse({ x: dx / len * impulse, y: 0, z: dz / len * impulse }, true);';
 if(!source.includes(old))throw Error('bumper anchor absent');
 source=source.replace(old,`this.pendingBumperContacts??=new Map();this.bumperOrderAudit??=[];
        this.pendingBumperContacts.set(other,{strength:h.strength??6});
        this.bumperOrderAudit.push({time:this.time,status:'pending',handle:other,v:{...v}});`);
 const anchor='      for (const [handle, side] of this.flipperHandles) {';
 if(!source.includes(anchor))throw Error('contact processing anchor absent');
 source=source.replace(anchor,`      for(const [handle,pending] of this.pendingBumperContacts??[]){
        const collider=this.world.getCollider(handle);let touching=false,resolved=false;
        if(collider)this.world.contactPair(this.ballCollider,collider,(m,flipped)=>{
          if(!m.numContacts())return;touching=true;
          let compressive=false;for(let i=0;i<m.numContacts();i++)if(m.contactImpulse(i)>0)compressive=true;
          const raw=m.normal(),sign=flipped?1:-1,n={x:raw.x*sign,y:raw.y*sign,z:raw.z*sign},v=this.ball.linvel(),outward=v.x*n.x+v.y*n.y+v.z*n.z;
          if(!resolved&&compressive&&outward>0){
            const impulse=Math.max(0,pending.strength-outward)*this.ball.mass();
            this.ball.applyImpulse({x:n.x*impulse,y:n.y*impulse,z:n.z*impulse},true);resolved=true;
            this.bumperOrderAudit.push({time:this.time,status:'resolved',handle,normal:n,before:{...v},after:{...this.ball.linvel()},impulse});
          }
        });
        if(resolved||!touching){this.pendingBumperContacts.delete(handle);if(!touching)this.bumperOrderAudit.push({time:this.time,status:'lost-without-kick',handle});}
      }
`+anchor);
 return {format:'module',source,shortCircuit:true};
}
