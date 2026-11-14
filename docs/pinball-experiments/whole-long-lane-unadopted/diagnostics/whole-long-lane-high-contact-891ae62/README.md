# Frozen whole A: single high-contact diagnostic

Source 94ea51ffb02ae7d030f79ade9f05d02eeeaf73da088ea83b8d518253624d0c03. Single loader ../whole-long-lane-891ae62/loader.mjs. Reproduce from repo root: node --import ./artifacts/pinball/whole-long-lane-891ae62/loader.mjs artifacts/pinball/whole-long-lane-high-contact-891ae62/run.mjs, then python3 artifacts/pinball/whole-long-lane-high-contact-891ae62/summarize.py.

Exactly the designer's predeclared p/v/spin and 1800-tick bound; no search or variant. All-solid initial query minimum +.0039903615. Ordinary drain after 112 ticks (.933333 seconds), ball 2 ready, playing rescue resets zero. Rail axis end crossed at tick101 (poststep time .85 seconds); last playing tick110 center Z5.048604, then game drains at Z5.05. Final ready ball position is a normal next-ball reset, not the observed old ball crossing Z5.03.

Independent finite capsule surface minimum gap -.003458170 at tick81 against shooter inner. Manifold contact.dist minimum -.003458187 is separately reported, not substituted for final-position geometry. Full trace includes rotations/spin, velocities, contact IDs/normals/flips/impulses. No persistent stop; ball progresses across rail tops, then rolls down their end. One restored fixture does not establish natural arrival frequency or safety at other starts, speeds, spin or directions. No natural36/full-game tests performed.

## Proposed next entrance sections (static only, not executed)

OUT: upstream straight section Z1.35; divider axis |X|2.30/r.020. Left outer |X|2.73/r.020, right shooter inner X2.75/r.045. Midpoints of conservative horizontal solid-facing boundaries give left X=-2.515, right X=2.5125. Y=.180 (ground surface .04 + ballR.135 + .005), v=(0,0,.5), spin0. Left surface interval[2.32,2.71], right[2.32,2.705]. Initial mounts at Z1.35 still require whole-world legality before execution; these are predeclared section candidates, not success-selected starts.

IN: use the new actual LOWER_LAYOUT.slingVertices, not the legacy exported SLING_VERTICES constant. Actual rubber is a sampled centripetal closed curve, so a midpoint computed from the nominal straight vertex edge is not yet an exact contact-boundary start. Proposed shared section remains Z1.35, aligned with the upstream divider end; exact X and longitudinal endpoint buffer await static extraction of the installed sling contact segments. No IN coordinate is frozen or executed. Historical accepted IN±1.72/Z2.8 and prior C±1.695/Z3 remain separate families.
