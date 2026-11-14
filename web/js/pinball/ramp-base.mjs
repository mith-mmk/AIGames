import * as T from '../vendor/three-0.180.0/three.module.min.js';

// The deck closes the channel-facing top. Only the outside divider strip has
// an opaque top here. Convexifying both regions together lifts the running
// surface above the acrylic at the S bend, so retain their actual triangles.
export function baseShell(segments, includeDeck = false) {
  const rows = segments.length ? [segments[0].a, ...segments.map(s => s.b)] : [];
  const positions = [], indices = [], tags = [], strips = [], endpoints = [];
  let activeStrip = 0, activeEndpoint = null;
  const down = v => v.clone().setY(.035);
  const outer = r => new T.Vector3(2.35, r.p.y, r.p.z);
  function triangle(a, b, c, tag, outward) {
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(outward) < 0) [b, c] = [c, b];
    const k = positions.length / 3;
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    indices.push(k, k + 1, k + 2);
    tags.push(tag); strips.push(activeStrip); endpoints.push(activeEndpoint);
  }
  function quad(a, b, c, d, tag, outward) {
    triangle(a, b, c, tag, outward);
    triangle(b, d, c, tag, outward);
  }
  for (let i = 0; i < rows.length - 1; i++) {
    activeStrip = i;
    const a = rows[i], b = rows[i + 1], o = outer(a), q = outer(b);
    const left = a.left.clone().sub(a.right).add(b.left.clone().sub(b.right)).normalize();
    if (includeDeck) quad(a.left, a.right, b.left, b.right, 'deck', new T.Vector3(0, 1, 0));
    quad(a.right, o, b.right, q, 'outer-top', new T.Vector3(0, 1, 0));
    quad(a.left, down(a.left), b.left, down(b.left), 'left-skirt', left);
    quad(o, down(o), q, down(q), 'outer-wall', new T.Vector3(1, 0, 0));
    quad(down(a.left), down(a.right), down(b.left), down(b.right), 'bottom', new T.Vector3(0, -1, 0));
    quad(down(a.right), down(o), down(b.right), down(q), 'bottom', new T.Vector3(0, -1, 0));
  }
  for (const [r, sign] of [[rows[0], -1], [rows.at(-1), 1]]) {
    if (!r) continue;
    activeStrip = sign < 0 ? 0 : rows.length - 2;
    activeEndpoint = sign;
    // Installed/generic rows need not carry an analytic tangent. Only the
    // orientation, not the shape, depends on this endpoint direction.
    const tangent = r.t?.clone() ?? (sign < 0
      ? rows[1].p.clone().sub(r.p) : r.p.clone().sub(rows.at(-2).p));
    const o = outer(r), outward = tangent.multiplyScalar(sign);
    quad(r.left, down(r.left), r.right, down(r.right), 'endcap', outward);
    quad(r.right, down(r.right), o, down(o), 'endcap', outward);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.userData.tags = tags; geometry.userData.strips = strips;
  geometry.userData.endpoints = endpoints;
  return geometry;
}

function selectedFaces(source, accepts) {
  const a = source.attributes.position, indices = source.index.array, positions = [];
  for (let face = 0; face < indices.length / 3; face++) {
    if (!accepts(face)) continue;
    for (let j = 0; j < 3; j++) {
      const i = indices[face * 3 + j];
      positions.push(a.getX(i), a.getY(i), a.getZ(i));
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(Array.from({length: positions.length / 3}, (_, i) => i));
  geometry.computeVertexNormals();
  return geometry;
}

// Preserve the established strip count and construction order without dummy
// colliders. The union is one closed housing with the existing deck; there
// are no internal strip end faces, internal right skirt, or duplicated deck.
export function baseShellStrips(segments) {
  const shell = baseShell(segments);
  const parts = segments.map((_, strip) => selectedFaces(shell,
    face => shell.userData.strips[face] === strip));
  shell.dispose();
  return parts;
}

export function baseShellVisualParts(segments) {
  const shell = baseShell(segments), last = segments.at(-1)?.b, parts = [];
  const names = {
    'outer-top': 'divider-base-top', 'left-skirt': 'left-low-base-skirt',
    'outer-wall': 'divider-base-outer-wall', bottom: 'low-base-floor',
    endcap: 'low-base-front-cap',
  };
  for (const [tag, name] of Object.entries(names)) {
    const geometry = selectedFaces(shell, face => shell.userData.tags[face] === tag
      && !(tag === 'endcap' && shell.userData.endpoints[face] === 1));
    if (geometry.index.count) parts.push({name, geometry});
    else geometry.dispose();
  }
  if (last) {
    // Preserve the public six-vertex endcap section. It is the same two
    // boundary panels as the shell, with shared vertices for inspection.
    const positions = [];
    for (const p of [last.left, last.right, new T.Vector3(2.35, last.p.y, last.p.z)]) {
      positions.push(p.x, .035, p.z, p.x, p.y, p.z);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    const attribute=geometry.attributes.position;
    const key=(a,i)=>[a.getX(i),a.getY(i),a.getZ(i)].join(',');
    const lookup=new Map(Array.from({length:attribute.count},(_,i)=>[key(attribute,i),i]));
    const indices=[],source=shell.attributes.position;
    for(let face=0;face<shell.index.count/3;face++){
      if(shell.userData.endpoints[face]!==1)continue;
      for(let j=0;j<3;j++)indices.push(lookup.get(key(source,shell.index.array[face*3+j])));
    }
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    parts.push({name: 'low-base-end-cap', geometry});
  }
  shell.dispose();
  return parts;
}
