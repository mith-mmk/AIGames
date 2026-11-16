/** Direction for an observed bumper collision, never a collision detector.
 * Use the first horizontal sphere/cylinder entry on this integration chord
 * when it enters the cylindrical side. This is not Rapier's internal TOI.
 * Cap contacts, prior overlaps and degenerate chords retain endpoint radial.
 * Does not change a body, position, velocity or scoring state.
 */
export function bumperContactDirection(start, end, center, radius, halfHeight, ballRadius) {
  let dx = end.x - center.x, dz = end.z - center.z;
  if (start) {
    const sx = start.x - center.x, sz = start.z - center.z;
    const ux = end.x - start.x, uz = end.z - start.z;
    const expanded = radius + ballRadius;
    const a = ux * ux + uz * uz, b = 2 * (sx * ux + sz * uz);
    const c = sx * sx + sz * sz - expanded * expanded;
    const discriminant = b * b - 4 * a * c;
    if (c > 0 && dx * dx + dz * dz < expanded * expanded && a > 0 && discriminant >= 0) {
      const fraction = (-b - Math.sqrt(discriminant)) / (2 * a);
      const y = start.y + fraction * (end.y - start.y);
      if (fraction >= 0 && fraction <= 1 && y >= center.y - halfHeight && y <= center.y + halfHeight) {
        dx = sx + fraction * ux; dz = sz + fraction * uz;
      }
    }
  }
  const length = Math.hypot(dx, dz) || 1;
  return { dx, dz, length };
}

/** Keep a passive reflected component as well as the powered minimum. */
export function bumperOutwardTarget(outward, strength, restitution) {
  return Math.max(strength, -outward * restitution);
}
