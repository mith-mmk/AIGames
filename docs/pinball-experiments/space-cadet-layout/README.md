# Space Cadet–inspired shot layout and approachable play

Baseline: Site v26 and AIGames `20f00b36b783e47cae709aae52b8b8e628354b84`.
Reference: screenshots of Microsoft 3D Pinball: Space Cadet and its distinction
between inlanes, outlanes, kickers, a high launch ramp and a separate target set.
No Space Cadet artwork or assets were imported.

- Consolidate the lower split around a flush-ended tapered rail. Keep IN
  through the inside return to the same flipper; OUT stays a physical drain.
  Open the left sling approach, close the rubber's reachable interior pocket
  with visible/physical stock, retain the right sling angle necessary for the
  elevated ramp, and raise the visible side backing.
- Easy retains the 10-second single-replay window. It reduces the downhill
  acceleration to .78, shallows idle flippers from −.60 to −.45 rad, reduces
  sling boost, and adds one shared OUT kickback per numbered ball. It cannot
  rearm on a same-ball return. LEFT SAVE earned through workshop/collector
  remains independent. Uncharged center and outer drains are genuinely open;
  TILT/escapes do not get the replay. Standard keeps its original slope,
  idle angle, sling boost and earned saves.
- Upper pop placement leaves a visible central aim. Spinner→B without another
  impact is a 350-point fixed bonus. Ground LEFT LOOP is 300, elevated RAMP is
  600, right target collection keeps its own route and reward. Visual and sound
  signals distinguish features and charge state.

## Reproduction

- `npm run test:pinball` includes the initially clear archived slow-sling and
  high-side drop fixtures; bilateral swept kickback, fast vs airborne, and
  uncharged central drainage; and right-bat DRIVE and left-bat RAMP fixtures.
- The existing five consecutive standard ramp release ticks 80–84 still
  traverse, recover the same ball on the left bat, and re-fire. Easy release
  ticks 97–99 traverse and recover the same ball with every save disabled.
  Standard DRIVE ticks 36/38/40 and Easy 44/46/48 are separate real bat shots.
  These tests start from a placed approach, then use physics and held/released
  input; they do not measure human aim or feel.
- `node scripts/pinball-upper-shot-audit.mjs` and
  `node scripts/pinball-upper-bat-audit.mjs` cover directed and bat shots.
  `PINBALL_WEB_ROOT=/path/to/web node scripts/pinball-layout-compare.mjs /tmp/results.json`
  compares the first numbered ball, not UI time, with a 60-second cap.
- `PINBALL_QA_URL=http://127.0.0.1:4173/pinball.html node scripts/pinball-layout-browser.cjs`
  exercises actual browser controls and saves desktop/mobile-size screenshots.
  The managed preview renderer reported WebGL disabled and local Chromium
  could not create its process socket here; browser visual/gameplay, a physical
  phone, and human play have not been verified in this environment.
