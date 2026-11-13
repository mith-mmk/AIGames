import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopScenery } from "./scenery-components.mjs";

test("workshop structures batch within their scenery budget and preserve QA targets", () => {
  const scenery=new WorkshopScenery();
  assert.ok(scenery.root.userData.budget.sourceParts>650);
  assert.ok(scenery.root.userData.budget.drawCalls<=12);
  assert.ok(scenery.root.userData.budget.triangles<40000);
  assert.equal(scenery.root.userData.scenery.physics,false);
  for(const name of ["left-repair-bench","right-repair-bench","arched-window-masonry","shaped-tool-board","labeled-parts-shelves"]) {
    assert.equal(scenery.root.getObjectByName(name)?.userData.cameraTarget,true);
  }
  scenery.root.traverse(object=>{
    if(!object.geometry)return;
    const geometry=object.geometry;
    assert.equal(geometry.attributes.position.count,geometry.attributes.normal.count);
    assert.equal(geometry.attributes.position.count,geometry.attributes.uv.count);
    for(const attribute of Object.values(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
    // All scenery is outside the playable cabinet. Back-wall architecture is
    // behind z=-8; bench assemblies keep a generous lateral service clearance.
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i))>3.1||p.getZ(i)<-8);
  });
  // The forward tool board must stand on the floor, not float in front of
  // the masonry. Check actual floor-pad vertices under both rack uprights.
  const pads=scenery.root.getObjectByName("workshop-static-dark").geometry.attributes.position;
  for(const x of [3.2,7.8]) {
    let contacts=0;
    for(let i=0;i<pads.count;i++) {
      if(Math.abs(pads.getX(i)-x)<.18&&Math.abs(pads.getY(i)+2.34)<.001&&pads.getZ(i)<-8.1&&pads.getZ(i)>-9.5)contacts++;
    }
    assert.ok(contacts>=6,`Tool rack upright ${x} needs floor-contact pads`);
  }
  scenery.dispose();
});

test("workshop owns and releases its merged geometries and materials exactly once", () => {
  const scenery=new WorkshopScenery();let geometries=0,materials=0;
  scenery.root.traverse(o=>o.geometry?.addEventListener("dispose",()=>geometries++));
  for(const m of scenery.materials.values())m.addEventListener("dispose",()=>materials++);
  scenery.dispose();scenery.dispose();
  assert.equal(geometries,12);assert.equal(materials,12);
  assert.equal(scenery.root.children.length,0);assert.equal(scenery.parts.size,0);
});
