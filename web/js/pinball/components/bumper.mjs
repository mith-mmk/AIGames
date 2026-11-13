import * as T from "../../vendor/three-0.180.0/three.module.min.js";

// Visual estimates from neon-reference.png and mechanical-reference.png, not
// measured engineering dimensions. Units match the existing table. The widest
// ball-height part is the .4 skirt; radius .16 uniformly scales the mini model.
export const BUMPER_DIMENSIONS = Object.freeze({
  contactRadius: .4, baseRadius: .345, capRadius: .395,
  skirtY: .145, ringY: .285, capY: .465, topY: .64,
  skirtTravel: .028, ringTravel: .065, strokeSeconds: .19,
});

/** Standalone, Y-up pop bumper. Root origin sits on the playfield.
 * hit({x,z}) optionally tilts the contact skirt toward an incoming ball.
 * This visual mechanism does not change collision bodies or scoring.
 * Caller owns supplied materials; dispose() only releases owned resources.
 */
export class MechanicalBumper {
  constructor({ materials = {}, radius = .4 } = {}) {
    if (!Number.isFinite(radius) || radius <= 0) throw new RangeError("Bumper radius must be positive");
    this.dimensions = BUMPER_DIMENSIONS;
    this.root = new T.Group();
    this.root.name = "mechanical-pop-bumper";
    this.root.scale.setScalar(radius / BUMPER_DIMENSIONS.contactRadius);
    this.root.userData.contactRadius = radius;
    this.root.userData.dimensionsAreEstimates = true;
    this.geometries = new Set();
    this.ownedMaterials = new Set();
    this.materials = {};
    const use = (name, options, borrow = name) => {
      const supplied = materials[borrow];
      const material = supplied || new T.MeshStandardMaterial(options);
      if (!supplied) this.ownedMaterials.add(material);
      this.materials[name] = material;
    };
    use("chrome", { color: 0xb8c7cd, metalness: .88, roughness: .23 });
    use("brass", { color: 0xb78b42, metalness: .76, roughness: .34 });
    use("enamel", { color: 0x174b46, metalness: .22, roughness: .31 }, "bumperEnamel");
    use("rubber", { color: 0x202126, roughness: .88 });
    use("plastic", { color: 0xe5cda0, roughness: .34 }, "bumperPlastic");
    use("dark", { color: 0x20272b, metalness: .48, roughness: .47 });
    // Separate lens material avoids altering shared light/amber materials.
    use("lens", { color: 0xffc36b, emissive: 0xff9a32, emissiveIntensity: .22,
      transparent: true, opacity: .76, roughness: .23, metalness: .02,
      depthWrite: false, side: T.DoubleSide }, "bumperLens");
    this.fixed = this.group("fixed-housing", this.root);
    this.skirt = this.group("moving-contact-skirt", this.root);
    this.striker = this.group("moving-strike-ring-and-rods", this.root);
    this.skirt.position.y = BUMPER_DIMENSIONS.skirtY;
    this.striker.position.y = BUMPER_DIMENSIONS.ringY;
    this.elapsed = Infinity;
    this.direction = new T.Vector2(1, 0);
    this.build();
  }

  group(name, parent) {
    const group = new T.Group(); group.name = name; parent.add(group); return group;
  }

  mesh(name, geometry, material, parent = this.fixed) {
    this.geometries.add(geometry);
    const mesh = new T.Mesh(geometry, this.materials[material]);
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }

  turned(name, profile, material, parent = this.fixed, segments = 48) {
    return this.mesh(name, new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r,y)), segments), material, parent);
  }

  repeated(name, geometry, material, count, place, parent = this.fixed) {
    this.geometries.add(geometry);
    const mesh = new T.InstancedMesh(geometry, this.materials[material], count);
    const transform = new T.Object3D();
    for (let i = 0; i < count; i++) {
      transform.position.set(0,0,0); transform.rotation.set(0,0,0); transform.scale.setScalar(1);
      place(transform, i, i * Math.PI * 2 / count); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  build() {
    const d = this.dimensions;
    // Turned flange with bevel, gasket and recessed center rather than stacked
    // solid cylinders. Open center permits the moving pull-rods to pass through.
    this.turned("mounting-flange", [[.13,.015],[.31,.015],[.345,.03],[.345,.055],[.325,.07],[.13,.07],[.13,.015]], "brass");
    this.turned("isolation-gasket", [[.13,.006],[.32,.006],[.328,.016],[.32,.025],[.13,.025],[.13,.006]], "rubber");
    this.turned("stepped-central-housing", [[.12,.06],[.22,.06],[.235,.085],[.235,.12],[.205,.14],[.19,.39],[.215,.425],[.215,.46],[.12,.46],[.12,.06]], "enamel");
    // A dished actuator skirt with a real central aperture and rolled edge.
    this.turned("contact-skirt", [[.205,.014],[.27,.008],[.37,-.026],[.396,-.015],[.4,0],[.388,.014],[.285,.035],[.205,.04],[.205,.014]], "plastic", this.skirt);
    this.turned("skirt-edge-rubber", [[.381,-.014],[.398,-.01],[.4,0],[.395,.008],[.382,.007],[.381,-.014]], "rubber", this.skirt);
    // Strike ring has a sloped striking face and underslung pull rods.
    this.turned("sloped-chrome-strike-ring", [[.226,.01],[.278,.015],[.342,-.025],[.353,-.018],[.355,0],[.285,.051],[.226,.046],[.226,.01]], "chrome", this.striker);
    this.repeated("strike-pull-rods", new T.CylinderGeometry(.014,.014,.20,8), "chrome", 2,
      (o,i,a) => o.position.set(Math.cos(a)*.254,-.075,Math.sin(a)*.254), this.striker);
    // Stationary upper cage supports are distinct from the thinner moving rods.
    this.repeated("fixed-support-columns", new T.CylinderGeometry(.023,.027,.31,10), "brass", 6,
      (o,i,a) => o.position.set(Math.cos(a+.27)*.205,.287,Math.sin(a+.27)*.205));
    this.repeated("rod-guide-collars", new T.CylinderGeometry(.026,.03,.037,10), "dark", 2,
      (o,i,a) => o.position.set(Math.cos(a)*.254,.088,Math.sin(a)*.254));
    // Stern JAWS manual p49 confirms two ring rods, a separate skirt spring,
    // and a central switch stem. These interior parts are normally occluded.
    this.mesh("central-skirt-switch-stem", new T.CylinderGeometry(.012,.012,.15,8), "plastic", this.skirt).position.y = -.075;
    const springPoints = [];
    for (let i = 0; i <= 72; i++) {
      const angle = i / 72 * Math.PI * 8;
      springPoints.push(new T.Vector3(Math.cos(angle)*.05,i/72*.075,Math.sin(angle)*.05));
    }
    this.skirtSpring = this.mesh("independent-skirt-return-spring",
      new T.TubeGeometry(new T.CatmullRomCurve3(springPoints),72,.005,5,false), "chrome");
    this.skirtSpring.position.y = .035;
    this.mesh("central-leaf-switch", new T.BoxGeometry(.028,.005,.105), "brass").position.set(0,.012,.033);
    this.turned("barrel-light-lens", [[.192,.315],[.216,.315],[.224,.332],[.224,.406],[.211,.424],[.192,.424],[.192,.315]], "lens");
    this.turned("cap-underseal", [[.208,.439],[.362,.439],[.375,.453],[.366,.467],[.208,.467],[.208,.439]], "rubber");
    // Sculpted annular cap: substantial beveled shoulder, recessed lens seat.
    this.turned("sculpted-enamel-cap", [[.257,.462],[.36,.462],[.388,.478],[.395,.498],[.387,.516],[.365,.531],[.29,.546],[.263,.54],[.257,.52],[.257,.462]], "enamel");
    this.turned("cap-chrome-lip", [[.382,.478],[.396,.488],[.397,.499],[.389,.511],[.381,.506],[.386,.494],[.382,.478]], "chrome");
    this.turned("lens-seat-bezel", [[.247,.528],[.267,.528],[.279,.545],[.267,.556],[.247,.551],[.247,.528]], "brass");
    // Curved amber dome, with radial metal ribs that remain legible unlit.
    this.turned("domed-light-lens", [[.0,d.topY],[.07,.636],[.135,.617],[.195,.587],[.248,.545],[.248,.535]], "lens");
    const ribCurve = new T.CatmullRomCurve3([
      new T.Vector3(.025,.64,0), new T.Vector3(.10,.63,0),
      new T.Vector3(.18,.601,0), new T.Vector3(.25,.55,0),
    ]);
    this.repeated("dome-protective-ribs", new T.TubeGeometry(ribCurve,12,.006,5,false), "brass", 8, (o,i,a) => { o.rotation.y = a; });
    this.turned("dome-crown", [[0,.638],[.037,.638],[.041,.646],[.031,.652],[0,.652]], "chrome", this.fixed, 24);
    // Three extruded fastening ears give the flange a manufactured outline.
    const ear = new T.Shape();
    ear.moveTo(-.047,-.035); ear.lineTo(.047,-.035); ear.lineTo(.045,.035);
    ear.quadraticCurveTo(0,.068,-.045,.035); ear.closePath();
    const earGeo = new T.ExtrudeGeometry(ear,{depth:.018,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:1,steps:1,curveSegments:6});
    earGeo.rotateX(-Math.PI/2);
    this.repeated("mounting-ears", earGeo, "brass", 3, (o,i,a) => {
      o.position.set(Math.cos(a)*.302,.038,Math.sin(a)*.302); o.rotation.y = -a-Math.PI/2;
    });
    this.repeated("mounting-bolt-heads", new T.CylinderGeometry(.022,.022,.014,6), "chrome", 3,
      (o,i,a) => o.position.set(Math.cos(a)*.328,.068,Math.sin(a)*.328));
    this.repeated("cap-fasteners", new T.CylinderGeometry(.012,.016,.012,8), "chrome", 8,
      (o,i,a) => o.position.set(Math.cos(a)*.332,.543,Math.sin(a)*.332));
    this.repeated("fastener-slots", new T.BoxGeometry(.017,.003,.003), "dark", 8,
      (o,i,a) => { o.position.set(Math.cos(a)*.332,.550,Math.sin(a)*.332); o.rotation.y = -a; });
  }

  hit(direction) {
    this.elapsed = 0;
    const x = direction?.x, z = direction?.z;
    if (Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x,z) > 0) this.direction.set(x,z).normalize();
    else this.direction.set(1,0);
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt < 0) return;
    this.elapsed += dt;
    const d = this.dimensions;
    // Fast solenoid pull, brief bottom dwell, then damped mechanical return.
    const t = this.elapsed / d.strokeSeconds;
    const pull = t < .18 ? t / .18 : t < .34 ? 1 : t < 1 ? Math.pow((1-t)/.66,2) : 0;
    const skirt = t < .12 ? t/.12 : t < .8 ? Math.pow((.8-t)/.68,2) : 0;
    this.striker.position.y = d.ringY - d.ringTravel * pull;
    this.skirt.position.y = d.skirtY - d.skirtTravel * skirt;
    this.skirtSpring.scale.y = 1 - d.skirtTravel / .075 * skirt;
    this.skirt.rotation.set(this.direction.y * .065 * skirt,0,-this.direction.x * .065 * skirt);
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.geometries.clear(); this.ownedMaterials.clear();
    this.root.removeFromParent(); this.root.clear();
  }
}
