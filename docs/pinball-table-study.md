# Chappy Workshop / table study 01

Status: **visual/mechanism study, not a playable physics game**. This first slice follows the owner's emphasis on table composition and well-made 3D parts. Do not label path animation as a collision or playability test.

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
