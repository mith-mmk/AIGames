# Independent d971 upper-lane joint review

Frozen source d971a4257f41512487cdf88ac9bfd9fc3f5208fd1223bf7e052a13edade98fac, artifacts/pinball/upper-lane-joint-e283fc7/loader.mjs. Compared to 5891 prototype. This is NOT the independent stable roof correction adopted as 79d7b91. No prototype production edits or dynamics were performed here.

## Local result
Local visible/contact mapping has no new blocker found. Eight actual named brass mount meshes are radius .055 / height .23, center Y .12, radialSegments32; corresponding actual cylinder parameters/centers match within1.38e-7. Four bars and24 roof capsules match actual collider axes/radii/halfheight within2.36e-7; sampled actual mesh vertices are within2.57e-7 of corresponding analytical capsule surface. All three sensor centers/extents/yaw match the shared frame within1.91e-7; C center(1.25,.20,-4.45), yaw−26.565°, half(.35,.16,.08).

This is parameter/vertex agreement, NOT exact curved surface equality. Shared 12-gon capsules retain side/cap facet approximation documented in the independent stable roof record. The 32-gon mount side inset is .055*(1-cos(pi/32))≈.00026484. Actual mount bottom Y.005/topY.235 intersects the bar end at axisY.23, establishing visible connection; underside fasteners/holes and a complete real-machine fabrication design are not established by this measurement.

Roof remains the same path as5891: straight/first chord1.319901°, endpointgap0, last arc chord/old retained roof16.316735° kink. Closed capsule render does not remove this physical joint or change topology safety. Sensor field is not a solid component and is not rendered as a hidden wall.

## Visual/budget result
490204 triangles /567 calls at45°, versus485276/590. 10°490060/555; top483884/540. Below500000. Browser pageerrors0. Reviewed actual installed45/10/top/mobile390 plus isolated upper closeup; paired lowercloseup/side/underside also preserved. Final upper closeup is a local crop with other components explicitly hidden only in that diagnostic; it is not a full-component no-clipping view. Whole installed views retain all components.

Right angled bar has visible brass end supports and clearance to the roof in the local image. The C lamp is displaced/rotated with its source frame, partly occluded by real acrylic/stock in installed views. No parts are hidden to improve installed views. Roof rounded caps avoid the prior open tube ends. Reference neon image was reviewed; the change is small at whole/mobile scale and does not resolve long exposed crossheads, left wire/label occlusion, large flippers, broad blank margins or reference S-ramp proportion. Static save remains incomplete. Old prototype OUT arrow direction is inherited, not repaired here.

## Evidence and limits
preview/evidence.json plus paired PNGs; upper-review-final/upper-mesh-contact.json and roof-closeup/roof-side.png are final geometry/cropped evidence. upper-review-initial-resize-failure preserves blank images from screenshot timing before viewport resize settled; no shape changed. Final script waits700ms after viewport resize. No extra natural/aim/full-regression runs by this reviewer. Continuous aim and contact safety belong to dynamics evidence; visual mapping alone does not authorize adoption. Physical phone/human play untested.
