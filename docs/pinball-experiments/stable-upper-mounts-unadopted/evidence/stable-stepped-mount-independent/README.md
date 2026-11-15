# Independent stepped upper mount review

Frozen source61e4f76a0594d56ca1b3b614e4ef70f2e202637f7e968a637e58565cda38f63f; stable-upper-stepped-mounts-527764b/loader.mjs. Production untouched. Failed aa38 full-height mount and old baseline evidence preserved separately.

## Local gate
Actual1396 colliders retain old1380 records byte-for-byte, including handles/transforms/shapes/materials. PrefixSHA92de221466b0281dc4c8293eda57f84b49591cf8d8d5a9ad6fd527dbe3f86418. Actual16 named visible mount meshes correspond to sixteen cylinders with combined center/radius/height error<=9.56e-8. Four actual bar meshes each192tri retain original radius.035/axes/length; maximum vertex radial error1.53e-7. Flanges r.055,Y.005..060; stems r.020,Y.060..235. No added topcollar. Existing roof unchanged.

45°451868tri/691calls (stable450140/683): +1728tri/+8calls, below500k.10°451724/679; top445548/664. No browser errors. Actual45/10/top/mobile390 and isolated support side/top reviewed; paired lowercloseup/side/underside also preserved. Isolated side deliberately crops outerbars, isolated top includes allfour. Installed views retain all parts. No local visual blocker: low feet/slender posts visibly connect to bar ends and look mechanically more articulated than the old solid cylinders; effect is small at whole/mobile scale. Not a claim that reference layout is complete.

## Analytic / mechanical limits
Independent derivation in analytic-review.md confirms ideal support-expanded-volume containment within oldbar endpoint-expanded region for sphere-centerY>=.170. Nominalminimum+.0040597372; no claim below.170, during penetration into oldbar, or of solver/dynamic equivalence. Installed float errors are much smaller than this reserve; designer's exact installed bound is separate evidence, not duplicated here.

Flange meets stem atY.060; stem extends into oldbar endpoint volumeY.195..235. Actual side image shows no floating segment. This establishes geometry connection, not strength, threads, holes or underside fixation. Two closed cylinder primitives retain their internal shared disk; no Boolean union is implied. Render32-gon stem/flange surfaces are inscribed: worst radial insets stem.0000963055/flange.000264840. Bar12-gon side inset.00119260 and capfacet approximation remain. Vertex/parameter equality is not exact analytic surface equality.

## Evidence / scope
preview/evidence.json and pairedimages; physics/*public.json; bar-review/bar-mesh-contact.json plus isolatedimages; summary.json; manifest.json. Source maps preserved by runners. No extra natural/gameplay/full test runs by this reviewer; other workers qualify regression, launch, scoring, aim and contacts. Physical mobile/human play untested. Stable/prototype sources were not edited, force/keys/sensors/roof unchanged.
