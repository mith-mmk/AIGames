import fs from 'node:fs';
export async function load(url,context,next){
 if(!url.endsWith('/web/js/pinball/physics.mjs'))return next(url,context);
 let source=fs.readFileSync(new URL(url),'utf8');
 source=source.replace('R.ActiveEvents.COLLISION_EVENTS), this.ball)', 'R.ActiveEvents.COLLISION_EVENTS | R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(0), this.ball)');
 source=source.replace('  resetBall() {','  resetBall() { this.pendingBumperContacts?.clear();');
 source=source.replace('      this.world.step(this.queue);','      if(this.state.tilted || this.state.phase!=="playing")this.pendingBumperContacts?.clear();\n      const endedBumpers=[];\n      this.world.step(this.queue);');
 source=source.replace('if (started && this.state.phase === "playing") {','if(!started){if(a===this.ballCollider.handle)endedBumpers.push(b);else if(b===this.ballCollider.handle)endedBumpers.push(a); }\n        if (started && this.state.phase === "playing") {');
 const old='const impulse = Math.max(0, (h.strength??6) - outward) * this.ball.mass();\n        this.ball.applyImpulse({ x: dx / len * impulse, y: 0, z: dz / len * impulse }, true);';
 if(!source.includes(old))throw Error('bumper anchor absent');
 source=source.replace(old,`this.pendingBumperContacts??=new Map();this.bumperOrderAudit??=[];
        this.pendingBumperContacts.set(other,{strength:h.strength??6,x:h.x,z:h.z,time:this.time});`);
 const anchor='      for (const [handle, side] of this.flipperHandles) {';
 source=source.replace(anchor,`      this.queue.drainContactForceEvents(event=>{
        const a=event.collider1(),b=event.collider2();
        const handle=a===this.ballCollider.handle?b:b===this.ballCollider.handle?a:null;
        const pending=this.pendingBumperContacts?.get(handle);
        if(!pending || this.state.tilted || this.state.phase!=="playing" || event.totalForceMagnitude()<=0)return;
        const raw=event.maxForceDirection(),p=this.ball.translation(),len=Math.hypot(raw.x,raw.z);
        if(len<1e-6)return;
        const sign=b===this.ballCollider.handle?1:-1;
        const n={x:raw.x/len*sign,z:raw.z/len*sign},v=this.ball.linvel(),outward=v.x*n.x+v.z*n.z;
        if(outward<0)return;
        const impulse=Math.max(0,pending.strength-outward)*this.ball.mass();
        this.ball.applyImpulse({x:n.x*impulse,y:0,z:n.z*impulse},true);
        this.bumperOrderAudit.push({time:this.time,status:'force-resolved',normal:n,before:{...v},after:{...this.ball.linvel()},impulse,force:event.totalForceMagnitude()});
        this.pendingBumperContacts.delete(handle);
      });
      for(const handle of endedBumpers)this.pendingBumperContacts?.delete(handle);
`+anchor);
 return {format:'module',source,shortCircuit:true};
}
