import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import { WorkshopAssets } from './assets.mjs';

test('straight structural tubes retain endpoints/radius without redundant axial tessellation', () => {
  const assets=new WorkshopAssets(),root=new T.Group();
  const points=[[1,2,3],[4,6,3]];
  const tube=assets.tube(root,points,.05,'steel');
  const g=tube.geometry;
  assert.equal(g.index.count/3,16);
  assert.equal(g.parameters.radialSegments,8);
  assert.equal(g.parameters.radius,.05);
  for(const [t,point] of [[0,points[0]],[1,points[1]]])
    assert.ok(g.parameters.path.getPoint(t).distanceTo(new T.Vector3(...point))<1e-12);
  assert.ok([...g.attributes.position.array].every(Number.isFinite));
  const curved=assets.tube(root,[[0,0,0],[1,1,0],[2,0,0]],.05,'steel');
  assert.equal(curved.geometry.parameters.tubularSegments,100);
  tube.geometry.dispose();curved.geometry.dispose();
  for(const m of Object.values(assets.materials))m.dispose();
});
