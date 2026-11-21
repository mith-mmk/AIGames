// The renderer and contact calculation share dimensions, including the rail's tilt.
export const MECHANISM = Object.freeze({
  radius: .18, clearance: .002, gravity: 9.8,
  liftX: .9, liftZ: 0, plateWidth: .8, plateDepth: .9, plateThickness: .13,
  liftBottom: .35, railY: 1.8, railLength: 3, railWidth: .65, railThickness: .12, railTilt: .22,
  beltY: .15, guideX: .65, guideZ: .6, screwRadius: .11,
  bellX: 4.65, bellZ: 0, bellTop: 1.195, bellKnobRadius: .1, deskTop: .012,
  gateX: 4.4, gateThickness: .1, gateClosedY: 1.9, gateOpenY: 2.95, gateHeight: .8
});

export function railEnds(rail) {
  const g = MECHANISM, c = Math.cos(g.railTilt), s = Math.sin(g.railTilt);
  return [-1, 1].map(sign => ({
    x: rail.x + sign * g.railLength / 2 * c + g.railThickness / 2 * s,
    y: g.railY - sign * g.railLength / 2 * s + g.railThickness / 2 * c
  }));
}

export function clearsLift(part) {
  const g = MECHANISM;
  if (part.id === 'belt') return true;
  const halfX = part.radius ? part.radius + .12 : g.railLength / 2 * Math.cos(g.railTilt) + g.railThickness / 2 * Math.sin(g.railTilt);
  const halfZ = part.radius ? part.radius + .12 : .365;
  const xExtent = halfX * Math.abs(Math.cos(part.angle)) + halfZ * Math.abs(Math.sin(part.angle));
  const zExtent = halfX * Math.abs(Math.sin(part.angle)) + halfZ * Math.abs(Math.cos(part.angle));
  return Math.abs(part.x - g.liftX) >= xExtent + g.plateWidth / 2 + .01 || Math.abs(part.z) >= zExtent + g.plateDepth / 2 + .01;
}

// Height of a sphere tangent to a finite rectangle (including its edges).
export function plateContact(x, z, platformY) {
  const g = MECHANISM;
  const dx = Math.max(0, Math.abs(x - g.liftX) - g.plateWidth / 2);
  const dz = Math.max(0, Math.abs(z - g.liftZ) - g.plateDepth / 2);
  const square = g.radius ** 2 - dx ** 2 - dz ** 2;
  return square >= 0 ? platformY + g.plateThickness / 2 + Math.sqrt(square) : -Infinity;
}

export function railContact(rail, x, z) {
  const g = MECHANISM, c = Math.cos(g.railTilt), s = Math.sin(g.railTilt);
  const dx = x - rail.x, dz = z - rail.z;
  const localX = dx * Math.cos(rail.angle) + dz * Math.sin(rail.angle);
  const localZ = -dx * Math.sin(rail.angle) + dz * Math.cos(rail.angle);
  const side = Math.max(0, Math.abs(localZ) - g.railWidth / 2);
  if (side > g.radius) return -Infinity;
  const radius = Math.sqrt(g.radius ** 2 - side ** 2);
  const half = g.railLength / 2;
  const left = -half * c + g.railThickness / 2 * s;
  const right = half * c + g.railThickness / 2 * s;
  const tangentX = localX - radius * s;
  if (tangentX >= left && tangentX <= right) return g.railY - localX * Math.tan(g.railTilt) + g.railThickness / (2 * c) + radius / c;
  const edgeX = tangentX < left ? left : right;
  const edgeY = g.railY + (tangentX < left ? 1 : -1) * half * s + g.railThickness / 2 * c;
  const square = radius ** 2 - (localX - edgeX) ** 2;
  return square >= 0 ? edgeY + Math.sqrt(square) : -Infinity;
}

export function contactPose(lift, travel, rail, connected) {
  const g = MECHANISM;
  const [entry, exit] = railEnds({ x: 2.8 });
  const liftTop = entry.y - g.plateThickness / 2;
  const platformY = g.liftBottom + lift * (liftTop - g.liftBottom);
  let x = g.liftX, z = g.liftZ, y = platformY + g.plateThickness / 2 + g.radius;
  let phase = 'lift';
  if (travel > 0 && connected) {
    x += travel * (g.bellX - g.liftX);
    const departureX = exit.x + g.radius * Math.sin(g.railTilt);
    if (x <= departureX) {
      y = Math.max(plateContact(x, z, platformY), railContact(rail, x, z));
      phase = x < entry.x ? 'release' : 'rail';
    } else {
      const velocity = (g.bellX - g.liftX) / 3;
      const elapsed = (x - departureX) / velocity;
      y = exit.y + g.radius * Math.cos(g.railTilt) - velocity * Math.tan(g.railTilt) * elapsed - g.gravity / 2 * elapsed ** 2;
      const side = Math.max(0, Math.hypot(x - g.bellX, z - g.bellZ) - g.bellKnobRadius);
      if (side <= g.radius) y = Math.max(y, g.bellTop + Math.sqrt(g.radius ** 2 - side ** 2));
      phase = 'flight';
    }
  } else if (travel > 0) {
    // A missing/reversed rail spills the marble off the front, away from the drive.
    z += travel * 1.35;
    const departureAngle = 1.2;
    const departureZ = g.plateDepth / 2 + g.radius * Math.sin(departureAngle);
    if (z <= departureZ) y = plateContact(x, z, platformY);
    else {
      const elapsed = (z - departureZ) / .45;
      y = platformY + g.plateThickness / 2 + g.radius * Math.cos(departureAngle) - .45 * Math.tan(departureAngle) * elapsed - g.gravity / 2 * elapsed ** 2;
    }
    phase = 'fall';
    y = Math.max(y, plateContact(x, z, platformY), railContact(rail, x, z));
  }
  if (travel > 0) y = Math.max(y, plateContact(x, z, platformY), railContact(rail, x, z));
  y = Math.max(y, g.deskTop + g.radius) + g.clearance;
  return { platform: { x: g.liftX, y: platformY, z: g.liftZ }, marble: { x, y, z }, phase };
}
