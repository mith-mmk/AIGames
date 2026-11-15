import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const create=PinballPhysics.create.bind(PinballPhysics);
PinballPhysics.create=async(...args)=>{
 const g=await create(...args),found=[];
 g.world.forEachCollider(c=>{const p=c.translation();if(c.shapeType()===10&&Math.hypot(p.x+1.7410209957213656,p.y-.22,p.z-3.778770245989578)<1e-6&&Math.abs(c.radius()-.04)<1e-6&&Math.abs(c.halfHeight()-.02)<1e-6)found.push(c);});
 if(found.length!==1){g.dispose();throw Error('Expected exactly one join socket, found '+found.length);}
 found[0].setEnabled(false);
 return g;
};
// Intentional mesh/contact mismatch for causal measurement only. Never adopted.
