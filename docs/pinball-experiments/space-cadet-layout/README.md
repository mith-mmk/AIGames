# Space Cadet–inspired shot layout and approachable play

Baseline: Site v26 and AIGames `20f00b36b783e47cae709aae52b8b8e628354b84`.
Reference: screenshots of Microsoft 3D Pinball: Space Cadet and its distinction
between inlanes, outlanes, kickers, a high launch ramp and a separate target set.
No Space Cadet artwork or assets were imported.

- Consolidate the lower split around a flush-ended tapered rail. Keep IN
  through the inside return to the same flipper; OUT stays a physical drain.
  Shrink the lower slings into shorter launch-facing parts with a sealed
  foot. Only their inner face actively rebounds toward the playable center;
  the lane-facing rubber remains passive. Raise the visible side backing.
- Easy extends the one-replay window from 10 to 14 seconds. It reduces the downhill
  acceleration to .78, shallows idle flippers from −.60 to −.45 rad, and adds one shared OUT
  kickback per numbered ball. It cannot
  rearm on a same-ball return. LEFT SAVE earned through workshop/collector
  remains independent. Uncharged center and outer drains are genuinely open;
  TILT/escapes do not get the replay. Standard keeps its original slope,
  idle angle and earned saves.
- Upper pop placement leaves a visible central aim. An upfield spinner→B shot without another
  impact is a 350-point fixed bonus. The centered paths that formerly cycled
  above the pop for 30s clear that area in under 1s in the local fixtures. Ground LEFT LOOP is 300, elevated RAMP is
  600, right target collection keeps its own route and reward. Visual and sound
  signals distinguish features and charge state.

## Reproduction

- `npm run test:pinball` includes the initially clear archived slow-sling and
  high-side drop fixtures; bilateral swept kickback, fast vs airborne, and
  uncharged central drainage; and right-bat DRIVE and left-bat RAMP fixtures.
- Standard release timings shift with the new geometry; 76–78 qualify after
  the standard warm-up, and 77/78/80/81/85 after the no-warm-up approach.
  Easy release ticks 97–99 traverse and recover the same ball with every save disabled.
  Standard DRIVE ticks 36/38/40 and Easy 44/46/48 are separate real bat shots.
  These tests start from a placed approach, then use physics and held/released
  input; they do not measure human aim or feel.
- `node scripts/pinball-upper-shot-audit.mjs` and
  `node scripts/pinball-upper-bat-audit.mjs` cover directed and bat shots.
  `PINBALL_WEB_ROOT=/path/to/web node scripts/pinball-layout-compare.mjs /tmp/results.json`
  compares the first numbered ball, not UI time, with a 60-second cap.
- `PINBALL_QA_URL=http://127.0.0.1:4173/pinball.html node scripts/pinball-layout-browser.cjs`
  exercises actual browser controls and saves desktop/mobile-size screenshots.
  An emulated mobile viewport is not a physical phone or human playtest.

## Controlled v26 comparison

The untouched v26 and this layout each ran 12 first-ball attempts per mode:
six launch powers × two pulse phases, no fixture injection, and a 60-second
cap. The new easy median is 29.60 s versus 19.77 s; the new standard median
is 25.15 s versus 16.94 s. The new sample had no capped runs, cabinet escapes
or live repositioning. These figures describe fixed scripted button timing,
not human skill or feel. The upper ramp completed under three nearby
deliberate Easy timing fixtures; it was not hit by the twelve automated
first-ball Easy pulse trials.

An additional 24 initially clear placements compare approach speed 1/3/6
along the active slingshot face normal in both modes and on both sides.
0.1 seconds after contact, v26 showed about .38/0/.77 outward speed.
The measured replacement gives 4.99 (standard) and 5.05 (easy) in the same
relative approach fixtures. This is a physical collision fixture, not a
universal recommendation about coil strength.
