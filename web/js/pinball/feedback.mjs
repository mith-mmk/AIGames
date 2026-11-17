/** Read-only presentation edge detector. Never emits scoring or physics input. */
export class PinballFeedback {
  constructor(){this.reset();}
  reset(){this.previous=null;}
  update(state,held={},hits=[]){
    const next={phase:state.phase,ball:state.ballNumber,tilted:state.tilted,mission:state.mission.completed,multiplier:state.multiplier,award:state.lastContactAward,captures:state.scoop?.captures??0,collections:state.scoop?.collections??0,skillShots:state.skillShots??0,left:Boolean(held.left),right:Boolean(held.right)};
    const p=this.previous;this.previous=next;
    if(!p||state.phase==='paused')return [];
    const events=[];
    if(p.phase==='ready'&&next.phase==='playing')events.push('launch');
    if(!p.tilted&&next.tilted)events.push('tilt');
    if(next.phase==='gameover'&&p.phase!=='gameover')events.push('gameover');
    else if(next.ball>p.ball)events.push('drain');
    if(next.phase==='playing'&&!next.tilted){
      if((next.left&&!p.left)||(next.right&&!p.right))events.push('flipper');
      const types=new Set(hits.map(h=>h.type==='bank'?'target':h.type||'bumper'));
      if(next.award&&next.award!==p.award){
        const label=next.award.label.toLowerCase();
        types.add(label==='left loop'?'loop':label==='bank'?'target':['bumper','sling','target'].includes(label)?label:'target');
      }
      events.push(...types);
      // Counters survive render gaps; an award is sounded once, never each frame.
      if(next.collections>p.collections)events.push('scoop-reward');
      else if(next.captures>p.captures)events.push('scoop');
      if(next.skillShots>p.skillShots)events.push('skill-shot');
      if(next.mission>p.mission)events.push('mission');
      if(next.multiplier>p.multiplier)events.push('multiplier');
    }
    return events;
  }
}
