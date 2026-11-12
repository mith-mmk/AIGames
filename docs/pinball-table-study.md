# Chappy Workshop / implementation history

Current status: **partial 0.1 prototype plus selected 0.2 features** on `pinball/0.1.0`. Physics, basic scoring and three balls exist; original-spec completion is not claimed. See [original specification audit](pinball-spec-audit.md) for implemented/missing requirements. Latest local tuning is not yet deployed to Site.

The sections below through Art pass 07 are historical records of the initial visual slice, not descriptions of the current runtime. Statements such as “Rapier not integrated” and “non-playable” apply only to that earlier slice.

## Art direction and scope

An original jade-enamel and brass robot workshop. Open lower playfield, three target entrances, raised perimeter sky rail, three layered energy bumpers and an automaton landmark at the rear. Rubber, enamel, polished metal and warm plastic use separate materials. Rails have mountings; ramps have posts; bumper caps have screws; the plunger has a coil and rod. Lower flippers have distinct rubber and body pieces.

These parameterized meshes are editable source assets, not a final GLB art pipeline. The rectangular robot/cabinet surfaces still need bevels, authored artwork, environment reflections and an art-quality pass. The simple robot is original placeholder character design, not a faithful recreation of any supplied character image (none was supplied in this attachment).

## Implementation

- `web/pinball.html`, `web/css/pinball.css`, `web/js/pinball/`.
- Uses repository-vendored Three.js 0.180.0 with no network runtime dependency. Kept plain ES modules for this existing static site's first visual slice. TypeScript/Vite and Rapier from the attached proposal are **not yet integrated**.
- Table dimensions 0.55×1.15 m scaled ×10 in this view, 6.5° tilt, ball diameter 27 mm scaled ×10. Render assets and later colliders must share layout definitions.
- All animation state belongs to a class. No score, game-over, collision, launch physics or missions are advertised.
- Camera buttons, pointer capture, keyboard flippers, blur release, context loss messaging and mobile layout.

## Verify

`npm run test:pinball`
`npm run build:pages`
`npm run playtest:pinball` (installed Chrome; or set PINBALL_BROWSER_CHANNEL)
`node scripts/pinball-browser.cjs --built`
`npm start` then open http://127.0.0.1:4173/pinball.html

Browser images are local QA evidence in `artifacts/pinball/`. Inspect full view, close view and narrow viewport. The automated path is only a geometric readability check.

## Next slices

1. Get feedback on composition, palette and robot design. Author a detailed landmark and art surfaces, bevels, material detail and GLB export/pivots.
2. Connect Rapier at 120 Hz, CCD ball and kinematic flippers, actual curved ramp colliders, plunger and drain. Validate high-speed contact and interrupted/repeated input before claiming playability.
3. Integrate TypeScript build locally rather than migrate the entire site; permit WASM/GLB packaging and MIME only when those files are actually shipped.
4. Add rules, sounds, three-ball game and touch plunger after the physical play loop is verified.

## Art pass 02: workshop setting

Added an actual workshop backdrop: paneled wall, frosted window, workbench, hanging hand tools, jars, books/parts boxes and a brass-shaded practical lamp. Floorboard seams establish scale. Cabinet legs now sit on the horizontal floor independently of playfield tilt. All scenery is explicitly separate from future gameplay colliders.

Original canvas-printed playfield artwork adds a dial/gear seal, lane arrows, double border and maker legends, without putting extra solid obstacles in ball paths. Cabinet side panels, vents and corner protectors add depth. Local textures require no external requests.

Still not final art: tools and bottles are stylized parametric silhouettes. Next visual pass should refine material microdetail and bevels, a recognizable landmark silhouette and environmental reflections, while keeping the ball and targets brighter than scenery. Physics remains unconnected.

## Art pass 03: mechanical reference

The owner requested an ImageGen concept before implementing more mechanical character. The supplied concept was inspected locally (private QA reference; not shipped). Adapted its large rear flywheel, toothed gears with hubs/spokes, crank linkage, guarded cylinders, warm luminous bumper caps, metallic ramp and brass-faced robot into actual editable meshes. Backboard machinery is behind the ramp; the lower central ball route remains open. Cosmetic mechanisms do not imply functioning physics.

Added rounded extrusions for bodywork, shared deterministic patina texture, robot ear ribs / elbow rings / gripped tool, ramp rail stanchions and an external cabinet service hatch. A 128px cubemap of the room is baked once at startup, filtered with PMREM and rebuilt on WebGL context restoration. No per-frame cube capture or remote texture requests.

Desktop full view measured 542 draw calls / 133,144 triangles on hadrianus Chrome. Browser regression tests enforce <1,000 calls and <500,000 triangles; these are complexity guardrails, not a claim of mobile frame rate. Real-device mobile performance and physics remain unverified. Art remains a stylized interpretation, not photographic fidelity to the concept.

## Art pass 04: reduce green dominance

Per owner feedback, playfield and cabinet sides now use iron/graphite; wall, ambient light and rim light are neutral/cool instead of teal. Brass defines mechanisms and amber marks light sources. Muted green remains only on small robot/engine/tool accents. A separate bright silver ball material avoids inheriting the dark environment response of structural chrome. Previous green version is preserved in commit dfacd631.

## Art pass 05: quieter illustrated target hierarchy

Inspected the owner's neon/junk-mech reference and explicit request to calm its visual density. Kept iron/brass palette and a muted original robot stencil; did not import the reference's neon palette, signs, hazard stripes or fake scoring UI. Removed 11 crossing brass circuit lines and four decorative light inserts. Three non-flashing flat shot marks identify the two target banks and central bumper cluster. No game rules or active missions are implied. The low-contrast stencil and generous central negative space prioritize the silver ball.

## Art pass 06: restore mechanical density without neon clutter

The owner found pass 05 too sparse. Restored all 11 circuit runs in thinner, low-contrast dark bronze and four flush metal insert assemblies with concentric rings, small ivory centers and mounting screws. Replaced the stencil with a quiet maker crest so artwork no longer competes with those actual parts. Moved bank labels above the inserts to retain a clear hierarchy. Main mechanisms and ball paths are unchanged; no new raised obstacles were placed in the lanes.

## Art pass 07: substantial gameplay hardware

Added 2 triangular slingshot assemblies (plates, rubber bands, posts, kicker linkages), 6 raised targets in 2 new banks, 1 spinner gate, a second elevated ramp with two rails / 22 rail stanchions / 2 support pylons, and 1 receiving tower. Existing 6 targets, 3 bumpers, 2 flippers and first ramp remain. The old two inner guide tubes were replaced by the sling boundaries rather than left intersecting them. Central corridor and flipper approach are reserved.

These are rendered gameplay-hardware candidates, not functioning Rapier bodies. The new ramp ends at a modeled receiver, whose internal return path is not implemented. Layout guards check approach bounds, rail width and gate height; actual collisions, shot reachability and dynamics still need physics integration. Desktop full-view budget: 668 calls / 166,102 triangles.

Review caught the original right-sling tip intersecting the existing preview ball path. Moved the upper sling vertex inward; minimum sampled ball-center/rubber-centerline distance is now 0.308 render units versus combined radii 0.190. Added both-sided curve-sampling regression coverage with an extra 0.02 margin. This remains geometric preview clearance, not a physical simulation test.

## Playable alpha

Art expansion is paused. Rapier 0.17.3 (vendored inline WASM with Apache license) drives a CCD ball at 120 Hz, kinematic flippers, bumpers, targets, slings and ramp collision proxies. Three balls, scoring, launch, restart, pause/gameover, keyboard and simultaneous pointer controls are connected. Blur/visibility/context loss pauses play; resuming is explicit. No external runtime CDN is required.

This is an initial gameplay implementation: complex art uses simplified collision proxies; upper receiver collection awards once then relocates the ball to the return lane; stalled balls trigger a non-scoring ball-search recovery. It is not a fully mechanically simulated machine. Touch layout was checked at 390x844 in desktop Chrome, not on a physical phone.

Validation: 13 rules/layout/physics tests plus real Chromium launch, dual inputs, pause freeze, score/three drains/gameover, restart, narrow viewport, blur and WebGL context restoration. Distribution retains Three.js and Rapier license notices.

## Playability correction

User play exposed unusable diagonal framing and repeatable left-lane traps. Independent contact traces confirmed the ball wedged between floor and low ramp convex hulls. Both ramps are deferred and removed from render/collision, along with teleport rescue. Shortened flippers leave a real drain gap; continuous slanted target banks prevent pockets; balls returning to shooter bottom now drain. Orthographic high-angle/top views reserve UI space and hide non-colliding tall scenery. 90 varied shots and 12 three-ball sessions completed without rescue; browser natural three-ball play ended in 24.8 seconds without input. This validates basic play, not final balance or full ramp implementation.

## Beginner play tuning

A front-centered view 34 degrees from overhead replaces the almost vertical default; top view remains available. The geometric board tilt remains 6.5 degrees. Downhill acceleration uses a documented 0.65 rolling-inertia/gameplay approximation, not an exact rigid-body simulation of a real table. Solid triangular return guides close the old side escape routes and guide balls inside flipper pivots; center drain remains. Bumper and sling kicks are softer. No automatic rescue or ball-save is used.

After tuning, 31 launch-strength samples: no-input median 9.13 seconds, simple reactive-flipper median 10.17 seconds, maximum 56.53 seconds, minimum 3.52 seconds. Earlier 21-strength no-input sample median was 3.72 seconds; sample counts differ, so this is indicative rather than a controlled paired comparison. Tests also include 90 varied launches, 12 full sessions and explicit left/right guide delivery. Browser test now includes real-time key pulses with rendering running, in addition to fast physics sweeps. Physical-phone testing and player difficulty feedback remain outstanding.
