import * as T from "../../vendor/three-0.180.0/three.module.min.js";
import { LOWER_LAYOUT } from "../layout.mjs";
import { flipperProfile } from "../mechanical-contact.mjs";

/**
 * Standalone visual prototype, not a collider or a measured production part.
 * Units are the existing table's arbitrary world units, NOT metres/mm.
 * root origin = shaft axis at LOWER_LAYOUT.flipperPivot height (.27).
 * +X points along the bat; +Y is up. root is stationary; only moving rotates.
 * Call setAngle with the physics angle (radians), not a second animation clock.
 *
 * length: shaft-to-tip reach; defaults to the shared collider center + half length.
 * halfWidth: maximum contact width (.14, from layout). heelBack: .06, from
 * collider center - half length. The tapered outline lies inside that box.
 * mechanical-contact.mjs supplies the shared profile for rendering/collision.
 * All heights, radii, fillets, belt thickness and decorative proportions below
 * are ART ESTIMATES from the two supplied reference images, not measurements.
 * height is a vertical proportion reference, NOT the rubber contact height.
 * At height=.29 the rubber spans local Y[-.109,.034] (height .143);
 * the complete assembly includes the below-playfield shaft.
 * Scale length/halfWidth/height to fit art, not to change gameplay.
 * materials may supply body, rubber, metal, bearing, inset, engraving or the
 * existing cream/chrome/brass/dark/steel aliases. Supplied materials are borrowed
 * unchanged and NEVER disposed. Unspecified materials are owned by this model.
 * dispose() releases owned geometry/materials and detaches root; idempotent.
 * No assets.mjs/parts-detail.mjs integration is performed by this module.
 */
export class MechanicalFlipper {
  constructor({ materials = {}, length = LOWER_LAYOUT.flipperCenter + LOWER_LAYOUT.flipperHalfLength,
    halfWidth = LOWER_LAYOUT.flipperHalfWidth, height = .29,
    heelBack = LOWER_LAYOUT.flipperHalfLength - LOWER_LAYOUT.flipperCenter,
    angle = 0 } = {}) {
    for (const [key, value] of Object.entries({ length, halfWidth, height, heelBack })) {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${key} must be positive and finite`);
    }
    if (length < halfWidth * 3 || heelBack > halfWidth) throw new RangeError("Flipper proportions cannot form a tapered bat");
    if (!Number.isFinite(angle)) throw new RangeError("angle must be finite");
    this.root = new T.Group(); this.root.name = "mechanical-flipper";
    this.moving = new T.Group(); this.moving.name = "flipper-moving-assembly";
    this.root.add(this.moving);
    this.geometries = new Set(); this.ownedMaterials = new Set(); this.disposed = false;
    this.parameters = Object.freeze({ length, halfWidth, height, heelBack,
      dimensions: "Table-local estimates, not manufacturer measurements" });
    this.materials = {};
    const palette = {
      body: ["cream", { color: 0xe8dfc8, roughness: .37, metalness: .15 }],
      rubber: ["rubber", { color: 0x222629, roughness: .92, metalness: 0 }],
      metal: ["chrome", { color: 0xbfc9cb, roughness: .28, metalness: .9 }],
      bearing: ["brass", { color: 0xb88a48, roughness: .34, metalness: .8 }],
      inset: ["steel", { color: 0x3b555c, roughness: .45, metalness: .7 }],
      engraving: ["dark", { color: 0x20272a, roughness: .72, metalness: .25 }],
    };
    for (const [key, [alias, settings]] of Object.entries(palette)) {
      const borrowed = materials[key] || materials[alias];
      if (borrowed && !borrowed.isMaterial) throw new TypeError(`materials.${key} must be a Three material`);
      const material = borrowed || new T.MeshStandardMaterial(settings);
      this.materials[key] = material;
      if (!borrowed) this.ownedMaterials.add(material);
    }
    // Normalize every estimate to the selected contact dimensions.
    this.sx = length / 1.04; this.sz = halfWidth / .14; this.sy = height / .29;
    this.build(); this.setAngle(angle);
    this.root.userData.mechanicalFlipper = { ...this.parameters, prototype: true,
      pivotConvention: "Place root at LOWER_LAYOUT.flipperPivot; rotate moving only",
      contactEnvelope: { x: [-heelBack, length], z: [-halfWidth, halfWidth] } };
  }

  mesh(name, geometry, material, parent = this.moving) {
    this.geometries.add(geometry);
    const mesh = new T.Mesh(geometry, this.materials[material]);
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }

  // Exact common tangents between heel and tip circles, unlike a rounded box.
  outline(inset = 0, PathType = T.Shape) {
    const p = new PathType();
    const points = flipperProfile({ ...this.parameters, inset, samples: 64 });
    points.forEach(([x,z], i) => i ? p.lineTo(x,z) : p.moveTo(x,z));
    p.closePath(); return p;
  }

  extrude(shape, bottom, depth, bevel = .004) {
    const g = new T.ExtrudeGeometry(shape, { depth: depth * this.sy,
      bevelEnabled: bevel > 0, bevelThickness: bevel * this.sy,
      bevelSize: bevel * Math.min(this.sx, this.sz), bevelSegments: 3,
      curveSegments: 20, steps: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bottom * this.sy, 0);
    return g;
  }

  turn(name, profile, material, parent = this.root, x = 0, z = 0) {
    const points = profile.map(([r, y]) => new T.Vector2(r * this.sz, y * this.sy));
    const mesh = this.mesh(name, new T.LatheGeometry(points, 48), material, parent);
    mesh.position.set(x * this.sx, 0, z * this.sz); return mesh;
  }

  polygon(points, Type = T.Shape) {
    const shape = new Type();
    points.forEach(([x, z], i) => i ? shape.lineTo(x * this.sx, z * this.sz) : shape.moveTo(x * this.sx, z * this.sz));
    shape.closePath(); return shape;
  }

  fastener(name, x, z, y, parent) {
    this.turn(`${name}-head`, [[0,y-.008],[.021,y-.008],[.026,y-.003],
      [.026,y+.004],[.021,y+.009],[0,y+.009]], "metal", parent, x, z);
    // Real recessed cross slot cut visually into a shallow dark well, restrained
    // at this scale. No glowing ring or overlaid giant decorative cylinders.
    const slot = this.polygon([[-.015,-.003],[.015,-.003],[.015,.003],[-.015,.003]]);
    const mesh = this.mesh(`${name}-slot`, this.extrude(slot,y+.009,.0005,0), "engraving", parent);
    mesh.position.set(x*this.sx,0,z*this.sz);
  }

  build() {
    const w = this.parameters.halfWidth;
    // A continuous hollow rubber band is the actual outside contact surface.
    // Its independent cross section rounds over both upper/lower edges.
    const rubber = this.outline(w * .035);
    rubber.holes.push(this.outline(w * .22, T.Path));
    this.mesh("continuous-moulded-rubber-belt", this.extrude(rubber,-.105,.135,.004), "rubber");
    const lower = this.outline(w * .23);
    this.mesh("sculpted-lower-carrier", this.extrude(lower,-.129,.045,.008), "inset");
    this.mesh("tapered-cast-bat-core", this.extrude(this.outline(w * .24),-.089,.145,.010), "body");
    // Narrow metal shoulder, integrated into the rim, under the sculpted cap.
    this.mesh("machined-cap-shoulder", this.extrude(this.outline(w * .20),.045,.026,.005), "metal");
    // Core ends at .066 and shoulder at .076, BELOW the engraving bed
    // (.087..091). Otherwise the ivory core occludes these actual cap voids.
    const cap = this.outline(w * .28);
    // Actual voids through the cap over a recessed dark bed. Engraving is not
    // a floating decal or a raised plate. Tiny counter-islands remain ivory.
    const glyphs = {
      C: [[1,0],[0,0],[0,1],[1,1],[1,.80],[.23,.80],[.23,.20],[1,.20]],
      H: [[0,0],[.23,0],[.23,.39],[.77,.39],[.77,0],[1,0],[1,1],[.77,1],[.77,.61],[.23,.61],[.23,1],[0,1]],
      A: [[0,0],[.34,1],[.66,1],[1,0],[.76,0],[.64,.34],[.36,.34],[.24,0]],
      P: [[0,0],[.24,0],[.24,.42],[1,.42],[1,1],[0,1]],
      Y: [[0,1],[.26,1],[.5,.63],[.74,1],[1,1],[.62,.40],[.62,0],[.38,0],[.38,.40]],
    };
    const counters = { A: [[.42,.52],[.58,.52],[.5,.77]], P: [[.24,.62],[.76,.62],[.76,.80],[.24,.80]] };
    const label = "CHAPPY", glyphWidth = .054, advance = .072, labelX = .30;
    for (let i = 0; i < label.length; i++) {
      const letter = label[i];
      const map = points => points.map(([x,z]) => [labelX + i*advance + x*glyphWidth, (z-.5)*.052]);
      cap.holes.push(this.polygon(map(glyphs[letter]), T.Path));
      if (counters[letter]) this.mesh(`engraving-counter-${i}`,
        this.extrude(this.polygon(map(counters[letter])),.080,.016,0), "body");
    }
    const groove = [[.79,-.014],[.88,-.014],[.90,0],[.88,.014],[.79,.014],[.805,0]];
    cap.holes.push(this.polygon(groove,T.Path));
    this.mesh("recessed-engraving-bed", this.extrude(this.outline(w*.32),.087,.004,0), "engraving");
    this.mesh("engraved-sculpted-top-cap", this.extrude(cap,.080,.016,0), "body");
    // Heel is tied to a real coaxial shaft. Stationary flange remains still
    // while the shaft, bat, upper washer and retaining screw move together.
    this.turn("pivot-shaft", [[0,-.47],[.039,-.47],[.041,-.45],[.041,.105],[0,.105]], "metal", this.moving);
    this.turn("rotating-heel-hub", [[.041,-.15],[.065,-.15],[.074,-.135],
      [.074,-.105],[.064,-.09],[.041,-.09],[.041,-.15]], "inset", this.moving);
    this.turn("top-retaining-washer", [[.026,.095],[.049,.095],[.057,.100],
      [.057,.111],[.048,.117],[.026,.117],[.026,.095]], "bearing", this.moving);
    this.fastener("shaft-retainer",0,0,.120,this.moving);
    const mount = this.polygon([[-.115,-.102],[-.075,-.137],[.104,-.137],[.145,-.093],
      [.145,.093],[.104,.137],[-.075,.137],[-.115,.102]]);
    const bore = new T.Path(); bore.absarc(0,0,.047*this.sz,0,Math.PI*2); mount.holes.push(bore);
    this.mesh("fixed-bevelled-bearing-mount",this.extrude(mount,-.240,.029,.004),"metal",this.root);
    this.turn("fixed-bearing-flange", [[.042,-.215],[.091,-.215],[.098,-.208],
      [.098,-.190],[.074,-.184],[.071,-.151],[.065,-.143],[.042,-.143],[.042,-.215]],"bearing");
    this.turn("bearing-dust-seal", [[.041,-.153],[.065,-.153],[.067,-.149],
      [.065,-.141],[.041,-.141],[.041,-.153]],"rubber");
    for (const z of [-.103,.103]) this.fastener(`mount-${z < 0 ? "rear" : "front"}`, .040,z,-.204,this.root);
    this.buildActuation();
  }

  // Estimated underboard mechanism: fixed coil/brackets, coaxial crank and a
  // constant-length pinned link. Geometry follows the supplied shaft angle;
  // it does NOT simulate coil force, switch timing, spring force or collisions.
  buildActuation() {
    const plate = this.polygon([[-.15,-.98],[.31,-.98],[.34,-.90],[.34,.15],
      [.25,.20],[-.15,.20],[-.20,.12],[-.20,-.90]].map(([x,z])=>[x,-z]));
    for (const [x,z] of [[-.13,-.90],[.27,-.90],[-.13,.11],[.27,.11]]) {
      const hole = new T.Path(); hole.absarc(x*this.sx,-z*this.sz,.022*this.sz,0,Math.PI*2);
      plate.holes.push(hole);
    }
    this.mesh("underboard-stamped-baseplate",this.extrude(plate,-.56,.018,.005),"metal",this.root);
    const crank = this.polygon([[-.057,-.050],[.02,-.057],[.175,-.036],
      [.194,0],[.175,.036],[.02,.057],[-.057,.050]]);
    this.mesh("shaft-clamped-crank",this.extrude(crank,-.465,.035,.006),"inset",this.moving);
    this.turn("crank-shaft-clamp",[[.041,-.475],[.062,-.475],[.068,-.465],
      [.068,-.411],[.058,-.401],[.041,-.401],[.041,-.475]],"metal",this.moving);
    this.turn("crank-link-pin",[[0,-.455],[.020,-.455],[.020,-.377],[.026,-.377],
      [.026,-.365],[0,-.365]],"bearing",this.moving,.16,0);
    // Turned bobbin rotates onto Z; its central bore accepts the sliding core.
    const coil = new T.Group(); coil.name="stationary-solenoid";
    coil.position.set(.16*this.sx,-.40*this.sy,-.77*this.sz);
    coil.rotation.x=Math.PI/2;this.root.add(coil);
    this.turn("solenoid-bobbin",[[.027,-.16],[.104,-.16],[.112,-.15],
      [.112,-.127],[.083,-.127],[.083,.127],[.112,.127],[.112,.15],
      [.104,.16],[.027,.16],[.027,-.16]],"engraving",coil);
    this.turn("copper-winding-envelope",[[.082,-.124],[.090,-.124],[.098,-.11],
      [.098,.11],[.090,.124],[.082,.124],[.082,-.124]],"bearing",coil);
    // Fine continuous winding helix; not stacked cylinder overlays.
    const windingPoints=[];
    for(let i=0;i<=640;i++) {const t=i/640,theta=t*Math.PI*2*24;
      windingPoints.push(new T.Vector3(Math.cos(theta)*.099*this.sz,(-.115+t*.23)*this.sy,Math.sin(theta)*.099*this.sz));}
    this.mesh("continuous-coil-winding",new T.TubeGeometry(new T.CatmullRomCurve3(windingPoints),640,.0018*this.sz,4,false),"bearing",coil);
    // Each bracket is an extruded folded L section, not a box holding a tube.
    for (const z of [-.94,-.60]) {
      const shape=new T.Shape();shape.moveTo(-.14,-.15);shape.lineTo(.14,-.15);
      shape.lineTo(.14,.13);shape.lineTo(.12,.13);shape.lineTo(.12,-.125);
      shape.lineTo(-.14,-.125);shape.closePath();
      const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2});
      g.scale(this.sx,this.sy,this.sz);g.translate(.16*this.sx,-.40*this.sy,z*this.sz);
      this.mesh(`folded-solenoid-bracket-${z}`,g,"metal",this.root);
    }
    const rodGeometry = new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.019,0),
      new T.Vector2(.019,1),new T.Vector2(0,1)],24);
    this.sliderRod=this.mesh("sliding-solenoid-plunger",rodGeometry,"metal",this.root);
    const linkShape=this.polygon([[-.027,0],[.027,0],[.027,1],[-.027,1]]);
    // Link is authored along local Y in geometry for endpoint orientation below.
    const linkGeometry=new T.ExtrudeGeometry(linkShape,{depth:.016,bevelEnabled:true,bevelSize:.005,bevelThickness:.003,bevelSegments:2});
    // Normalize the long axis independent of table-width scaling.
    linkGeometry.scale(1,1/this.sz,1);linkGeometry.translate(0,0,-.008);
    this.actuatorLink=this.mesh("pinned-plunger-crank-link",linkGeometry,"inset",this.root);
    this.sliderPin=this.turn("slider-clevis-pin",[[0,-.424],[.023,-.424],[.023,-.374],[0,-.374]],"bearing",this.root);
    const springPoints=[];
    for(let i=0;i<=320;i++){const t=i/320,theta=t*Math.PI*2*16;
      const radius=(t<.04||t>.96)?.004:.016;
      springPoints.push(new T.Vector3(Math.cos(theta)*radius,t,Math.sin(theta)*radius));}
    this.returnSpring=this.mesh("extension-return-spring",new T.TubeGeometry(new T.CatmullRomCurve3(springPoints),320,.003,5,false),"metal",this.root);
    this.turn("return-spring-fixed-anchor",[[0,-.54],[.019,-.54],[.019,-.385],[0,-.385]],"bearing",this.root,-.12,-.42);
    this.actuation = { crankRadius:.16*this.sx, linkLength:.42*Math.max(this.sx,this.sz),
      sliderX:.16*this.sx, planeY:-.397*this.sy, springAnchor:new T.Vector3(-.12*this.sx,-.397*this.sy,-.42*this.sz) };
  }

  orientBetween(mesh, start, end) {
    const direction=new T.Vector3().subVectors(end,start),length=direction.length();
    mesh.position.copy(start);mesh.scale.y=length;
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
  }

  updateActuation(angle) {
    if(!this.actuation)return;
    const a=this.actuation;
    const pin=new T.Vector3(a.crankRadius*Math.cos(angle),a.planeY,-a.crankRadius*Math.sin(angle));
    const dx=pin.x-a.sliderX;
    const slider=new T.Vector3(a.sliderX,a.planeY,pin.z-Math.sqrt(Math.max(0,a.linkLength*a.linkLength-dx*dx)));
    this.orientBetween(this.actuatorLink,slider,pin);
    this.orientBetween(this.sliderRod,new T.Vector3(a.sliderX,a.planeY,-.88*this.sz),slider);
    this.sliderPin.position.x=slider.x;this.sliderPin.position.z=slider.z;
    this.orientBetween(this.returnSpring,a.springAnchor,pin);
    this.root.userData.actuation = { visualizationOnly:true, crankPin:pin.toArray(),
      sliderPin:slider.toArray(), linkLength:a.linkLength, measuredLinkLength:pin.distanceTo(slider) };
  }

  setAngle(angle) {
    if (this.disposed) throw new Error("Cannot animate a disposed MechanicalFlipper");
    if (!Number.isFinite(angle)) throw new RangeError("angle must be finite radians");
    this.moving.rotation.y = angle;
    this.updateActuation(angle);
    return this;
  }

  dispose() {
    if (this.disposed) return;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.geometries.clear(); this.ownedMaterials.clear();
    this.root.removeFromParent(); this.root.clear(); this.moving.clear();
    this.disposed = true;
  }
}
