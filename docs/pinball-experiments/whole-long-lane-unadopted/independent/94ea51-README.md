# Whole long lane: independent static/browser review

Candidate source SHA256: 94ea51ffb02ae7d030f79ade9f05d02eeeaf73da088ea83b8d518253624d0c03. Baseline: accepted 8849609. This directory contains an independent immutable source snapshot. Earlier d2ae6a and 4c586a results are not results for this source.

## Result

The sampled render budget passes: installed 45° is 493112 triangles / 569 calls (6888 triangles below 500000), 10° is 492968 / 557, top is 486792 / 542. Baseline is respectively 449612 / 685, 449468 / 673, 443292 / 658. Browser page errors: zero. This is not a performance qualification on a physical phone.

Actual installed 45°, 10°, top and Chrome 390×844 viewport images, plus lower closeup/side/underside views, are in preview-final. Both baseline and candidate were initialized with animation disabled and rendered manually. No ball launch or natural trial was performed. Browser/server processes were closed by the scripts.

Compared with neon-reference.png, the early OUT branch removes the preceding version's conspicuous double bend/flared throat. Starting the lanes beside the slings gives a longer lane region without extending the front. However the printed bands remain short, the left wire obscures the lettering, the long external crosshead row reads as a ladder, and the wider board / large bats / outer empty areas change the overall composition. The broad slings and robot remain. This is useful structural progress but not a reference-fidelity pass. Perspective artwork is not a CAD dimension or flow-direction guarantee.

## Explicit assembly check

geometry-surface-review/actual-mesh-contact.json records actual transformed browser meshes and corresponding physical descriptors: 59 attachments have maximum center difference 2.205524689483038e-7 and zero nominal radius/height difference. The 199 lower rail checks have maximum center/length/radius discrepancy 2.491620828177071e-7; actual rendered rail vertices differ radially from their corresponding finite capsule by at most 2.5574542257891797e-7. The right OUT radius .045 is checked separately from .020 rails. Cam mesh and hull have 10 vertices each with maximum matching distance 8.899114524108741e-16.

These are parameter/vertex correspondence checks for these lower parts, not a proof that every one of the reported 1581 colliders exactly matches every mesh. Tessellated visible surfaces are inscribed inside ideal capsule/cylinder surfaces. The checks do not erase that representation difference or prove all reachable clearances.

The underside cutaway shows throughboard shafts, washers and nuts. The board is deliberately hidden in that diagnostic: this does not establish drilled board holes, bearing contact or a complete load path. Static cam/rod remains an incomplete moving-save mechanism. No actuator completion is claimed. The current cam lies downstream of the OUT lettering; the previous candidate's label-overlap finding is not carried forward.

## Limits and provenance

The designer's whole-bat clearance and upper/outer continuous-route results are separate evidence; they were not independently rerun here. No d2ae6a column penetration or old late-OUT throat failure is attributed to this corrected source without a new measurement. Roof/support joins and upper passage safety are not certified by these lower-part checks. The inspector owns the right backside high-ball diagnostic. Ground-only clearance cannot certify airborne landing or passage beneath a crosshead.

No full regression, natural gameplay, phone hardware, human play, moving-save qualification or adoption is claimed. Production and permanent tests were not edited. One initial observational script import failed because layout did not export lowerSections; the script was corrected to import the candidate's geometry module. The failed attempt is preserved in geometry-initial-import-error.log; the successful run and scene sources are separate. No runtime fix was made.

Reproduce the static browser evidence with node visual.cjs and node geometry-surface-browser.cjs from the repository root using their artifact paths. These scripts write their evidence directories; preserve this snapshot before rerunning. review-manifest.json hashes the scripts, source maps, measured data and all 16 PNG images (14 paired views and 2 explicitly cutaway views).
