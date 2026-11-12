/** Per-ball abuse meter; simulation time makes pause deterministic. */
export class NudgeMeter {
 constructor(){this.reset();}
 reset(){this.heat=0;this.cooldown=0;this.tilted=false;}
 step(dt){this.cooldown=Math.max(0,this.cooldown-dt);if(!this.tilted)this.heat=Math.max(0,this.heat-dt*.35);}
 push(){if(this.tilted||this.cooldown>0)return 'ignored';this.cooldown=.35;this.heat+=1;if(this.heat>=2.5){this.tilted=true;return 'tilt';}return this.heat>=1.7?'warning':'nudge';}
}
