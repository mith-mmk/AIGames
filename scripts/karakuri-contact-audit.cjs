// Observe the actual scene matrices that Chrome renders. No model state is changed.
exports.installContactAudit = async page => page.evaluate(async () => {
  const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
  const original = THREE.Scene.prototype.updateMatrixWorld;
  window.campaignAudit = { byStage: {}, collisions: [], maxRoots: 0 };
  THREE.Scene.prototype.updateMatrixWorld = function(force) {
    original.call(this, force);
    const scene = this, audit = window.campaignAudit;
    const marble = scene.getObjectByName('marble'), plate = scene.getObjectByName('lift-platform');
    if (!marble || !plate) return;
    const index = Number(document.querySelector('#stage').value) + 1;
    const entry = audit.byStage[index] ||= { frames: 0, minimumGap: Infinity, states: [] };
    entry.frames++; const state = document.querySelector('#status').dataset.state;
    if (!entry.states.includes(state)) entry.states.push(state);
    audit.maxRoots = Math.max(audit.maxRoots, scene.children.filter(o => o.isGroup).length);
    const ball = marble.getWorldPosition(new THREE.Vector3()), plateBox = new THREE.Box3().setFromObject(plate);
    scene.traverse(mesh => {
      if (!mesh.isMesh || mesh === marble || mesh === plate || !mesh.visible) return;
      if (plateBox.intersectsBox(new THREE.Box3().setFromObject(mesh))) audit.collisions.push(`stage ${index}: lift intersects ${mesh.name || mesh.geometry.type}`);
    });
    scene.traverse(mesh => {
      if (!['lift-platform', 'rail-floor', 'rail-marker', 'rail-guard', 'timed-gate', 'marble-latch'].includes(mesh.name)) return;
      const p = mesh.geometry.parameters, local = mesh.worldToLocal(ball.clone());
      const nearest = new THREE.Vector3(THREE.MathUtils.clamp(local.x, -p.width / 2, p.width / 2), THREE.MathUtils.clamp(local.y, -p.height / 2, p.height / 2), THREE.MathUtils.clamp(local.z, -p.depth / 2, p.depth / 2));
      const gap = local.distanceTo(nearest) - .18; entry.minimumGap = Math.min(entry.minimumGap, gap);
      if (gap < -1e-6) audit.collisions.push(`stage ${index}: marble intersects ${mesh.name}: ${gap}`);
    });
  };
});
