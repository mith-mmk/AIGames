/* eslint-disable no-unused-vars -- named landmarks document the reconstruction data */
// Procedural reconstruction. Metres, east +X, up +Y, south +Z.
// Pleiades source coordinates are never regenerated randomly. Only residential
// infill and decorative vegetation use the seeded pseudo-random generator.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RomaTerrain } from "./rome-320-terrain.js";

const geoResponse = await fetch("./assets/rome-320/geo.json");
if (!geoResponse.ok) {
  throw new Error(`地理データを読み込めませんでした（${geoResponse.status}）`);
}
const GEO = await geoResponse.json();

class Rome320Experience {
  constructor(viewport) {
    if (!viewport) throw new Error("3D表示領域が見つかりません");
    this.viewport = viewport;
    this.ready = false;
  }

  async init() {
    await buildRome(this);
    this.ready = true;
  }
}

async function buildRome(experience) {
      const $ = (id) => document.getElementById(id),
        TAU = Math.PI * 2,
        DEG = Math.PI / 180;
      const ORIGIN = { lat: 41.8945, lon: 12.49 };
      // WGS84 local tangent-plane scale at the scene origin.
      const WGS84_A = 6378137,
        WGS84_E2 = 0.00669437999014,
        phi0 = ORIGIN.lat * DEG,
        WGS84_W = Math.sqrt(1 - WGS84_E2 * Math.sin(phi0) ** 2);
      const MX = (WGS84_A / WGS84_W) * Math.cos(phi0) * DEG,
        MZ = ((WGS84_A * (1 - WGS84_E2)) / WGS84_W ** 3) * DEG;
      const xy = (lat, lon) =>
        new THREE.Vector2((lon - ORIGIN.lon) * MX, -(lat - ORIGIN.lat) * MZ);
      const ll = (x, z) => ({
        lat: ORIGIN.lat - z / MZ,
        lon: ORIGIN.lon + x / MX,
      });
      const clamp = THREE.MathUtils.clamp,
        lerp = THREE.MathUtils.lerp,
        smooth = (a, b, x) => {
          let t = clamp((x - a) / (b - a), 0, 1);
          return t * t * (3 - 2 * t);
        };
      let seed = 320;
      function rnd() {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      const yieldFrame = () =>
        new Promise((resolve) => requestAnimationFrame(resolve));
      const setLoading = (s) => {
        $("load-detail").textContent = s;
      };
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xd7cab1, 0.000115);
      const camera = new THREE.PerspectiveCamera(
        44,
        innerWidth / innerHeight,
        4,
        18000,
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      experience.scene = scene;
      experience.camera = camera;
      experience.renderer = renderer;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.setSize(innerWidth, innerHeight);
      experience.viewport.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      experience.controls = controls;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minDistance = 80;
      controls.maxDistance = 10000;
      controls.maxPolarAngle = Math.PI * 0.455;
      controls.minPolarAngle = 0.04;
      controls.screenSpacePanning = false;
      controls.panSpeed = 0.8;
      controls.zoomSpeed = 0.85;
      controls.rotateSpeed = 0.55;
      controls.keyPanSpeed = 24;
      controls.listenToKeyEvents(experience.viewport);
      const ambient = new THREE.AmbientLight(0xe2dfcc, 0.68);
      scene.add(ambient);
      const hemi = new THREE.HemisphereLight(0xc1d7df, 0x8c7150, 0.9);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffd49a, 3.5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      sun.shadow.bias = -0.00013;
      sun.shadow.normalBias = 0.7;
      sun.shadow.camera.near = 100;
      sun.shadow.camera.far = 14000;
      sun.shadow.autoUpdate = false;
      scene.add(sun);
      scene.add(sun.target);
      const sunOffset = new THREE.Vector3(-3800, 3200, 2100);
      let shadowCenter = new THREE.Vector3(Infinity, Infinity, Infinity),
        shadowSpan = 0,
        shadowUpdates = 0;
      const lightDirection = sunOffset.clone().normalize();
      const lightRight = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), lightDirection)
        .normalize();
      const lightUp = new THREE.Vector3()
        .crossVectors(lightDirection, lightRight)
        .normalize();
      const staticRoot = new THREE.Group(),
        detailRoot = new THREE.Group();
      scene.add(staticRoot, detailRoot);
      const palettes = {
        stone: 0xe5d7b9,
        marble: 0xf1e6cf,
        shade: 0xb7a482,
        brick: 0xb98764,
        roof: 0xb7613f,
        darkroof: 0x95523c,
        road: 0xc7b99b,
        sand: 0xdacaab,
        dark: 0x514638,
        wood: 0x6c5541,
        green: 0x627c4d,
        leaf: 0x697c48,
        water: 0x548c83,
        bronze: 0x666f50,
      };
      const mats = {};
      for (const [k, v] of Object.entries(palettes))
        mats[k] = new THREE.MeshStandardMaterial({
          color: v,
          roughness: k === "bronze" ? 0.55 : 0.9,
          metalness: k === "bronze" ? 0.45 : 0,
        });
      mats.house = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
      });
      // Road ribbons sit only centimetres above the sampled terrain. A depth
      // offset keeps those coplanar surfaces stable in distant overview shots.
      mats.road.polygonOffset = true;
      mats.road.polygonOffsetFactor = -2;
      mats.road.polygonOffsetUnits = -2;
      const geos = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
        column: new THREE.CylinderGeometry(0.92, 1, 1, 12),
        lowcyl: new THREE.CylinderGeometry(1, 1, 1, 10),
        cone: new THREE.ConeGeometry(1, 1, 10),
        sphere: new THREE.SphereGeometry(1, 12, 8),
        dome: new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2),
      };
      function makeRoof() {
        const p = [
          -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0,
          1, 0.5,
        ];
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        g.setIndex([
          0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 2, 5, 4, 2, 4, 1, 1, 4, 3, 1, 3,
          0,
        ]);
        g.computeVertexNormals();
        return g.toNonIndexed();
      }
      geos.roof = makeRoof();
      function makeArch() {
        const s = new THREE.Shape();
        s.absarc(0, 0, 1, 0, Math.PI, false);
        s.lineTo(-0.72, 0);
        s.absarc(0, 0, 0.72, Math.PI, 0, true);
        s.closePath();
        const g = new THREE.ExtrudeGeometry(s, {
          depth: 1,
          bevelEnabled: false,
          curveSegments: 10,
        });
        g.translate(0, 0, -0.5);
        return g;
      }
      geos.arch = makeArch();
      const batches = new Map(),
        dummy = new THREE.Object3D();
      let instanceTotal = 0;
      function add(
        geo,
        mat,
        x,
        y,
        z,
        sx = 1,
        sy = 1,
        sz = 1,
        yaw = 0,
        detail = 0,
        color = null,
        rx = 0,
        rz = 0,
      ) {
        const zone = detail
          ? 0
          : Math.floor(x / 850) + "," + Math.floor(z / 850);
        const key = geo + "|" + mat + "|" + detail + "|" + zone;
        let b = batches.get(key);
        if (!b) {
          b = { geo, mat, detail, items: [] };
          batches.set(key, b);
        }
        b.items.push([x, y, z, sx, sy, sz, yaw, color, rx, rz]);
      }
      function frame(lat, lon, bearing = 0, elevation = null) {
        const p = xy(lat, lon);
        return {
          x: p.x,
          z: p.y,
          y: elevation ?? heightAt(p.x, p.y),
          yaw: -bearing * DEG,
        };
      }
      function local(
        f,
        geo,
        mat,
        x,
        y,
        z,
        sx = 1,
        sy = 1,
        sz = 1,
        yaw = 0,
        detail = 0,
        color = null,
        rx = 0,
        rz = 0,
      ) {
        const c = Math.cos(f.yaw),
          s = Math.sin(f.yaw);
        add(
          geo,
          mat,
          f.x + c * x + s * z,
          f.y + y,
          f.z - s * x + c * z,
          sx,
          sy,
          sz,
          f.yaw + yaw,
          detail,
          color,
          rx,
          rz,
        );
      }
      function mesh(g, mat, f, x = 0, y = 0, z = 0, detail = false) {
        const m = new THREE.Mesh(g, typeof mat === "string" ? mats[mat] : mat);
        if (f) {
          const c = Math.cos(f.yaw),
            s = Math.sin(f.yaw);
          m.position.set(f.x + c * x + s * z, f.y + y, f.z - s * x + c * z);
          m.rotation.y = f.yaw;
        } else m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        (detail ? detailRoot : staticRoot).add(m);
        return m;
      }
      function flushBatches() {
        for (const b of batches.values()) {
          const m = new THREE.InstancedMesh(
            geos[b.geo],
            mats[b.mat],
            b.items.length,
          );
          for (let i = 0; i < b.items.length; i++) {
            const a = b.items[i];
            dummy.position.set(a[0], a[1], a[2]);
            dummy.rotation.set(a[8], a[6], a[9]);
            dummy.scale.set(a[3], a[4], a[5]);
            dummy.updateMatrix();
            m.setMatrixAt(i, dummy.matrix);
            if (a[7] !== null) m.setColorAt(i, new THREE.Color(a[7]));
          }
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
          m.computeBoundingSphere();
          // Distant low-poly tree crowns collapse into black circular shadow
          // pixels. Keep architectural shadows, but do not let detail foliage
          // stamp high-contrast discs across the horizon.
          m.castShadow =
            b.mat !== "dark" &&
            !(b.detail && (b.mat === "leaf" || b.mat === "green"));
          m.receiveShadow = true;
          (b.detail ? detailRoot : staticRoot).add(m);
          instanceTotal += b.items.length;
        }
        batches.clear();
      }
      function ringGeo(
        a,
        b,
        ai,
        bi,
        height,
        segments = 80,
        start = 0,
        arc = TAU,
      ) {
        const pos = [],
          ind = [];
        for (let i = 0; i <= segments; i++) {
          const t = start + (arc * i) / segments,
            c = Math.cos(t),
            s = Math.sin(t);
          pos.push(
            a * c,
            0,
            b * s,
            a * c,
            height,
            b * s,
            ai * c,
            height,
            bi * s,
            ai * c,
            0,
            bi * s,
          );
        }
        for (let i = 0; i < segments; i++) {
          const n = i * 4;
          for (let k = 0; k < 4; k++) {
            const j = (k + 1) % 4;
            ind.push(n + k, n + 4 + k, n + 4 + j, n + k, n + 4 + j, n + j);
          }
        }
        if (arc < TAU - 0.001) {
          ind.push(0, 1, 2, 0, 2, 3);
          const n = segments * 4;
          ind.push(n, n + 2, n + 1, n, n + 3, n + 2);
        }
        for (let i = 0; i < ind.length; i += 3) {
          const t = ind[i + 1];
          ind[i + 1] = ind[i + 2];
          ind[i + 2] = t;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(ind);
        g.computeVertexNormals();
        return g;
      }
      function ellipseFloor(f, a, b, mat, y = 0.12) {
        local(f, "cyl", mat, 0, y, 0, a, 0.32, b);
      }
      function pointSegment(x, z, a, b) {
        const dx = b.x - a.x,
          dz = b.y - a.y,
          l = dx * dx + dz * dz,
          t = l ? clamp(((x - a.x) * dx + (z - a.y) * dz) / l, 0, 1) : 0;
        return { d: Math.hypot(x - a.x - t * dx, z - a.y - t * dz), t };
      }
      function insidePolygon(x, z, poly) {
        let odd = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const a = poly[i],
            b = poly[j];
          if (
            a.y > z !== b.y > z &&
            x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x
          )
            odd = !odd;
        }
        return odd;
      }
      // Geographic terrain. Heights are an explicit smooth approximation, not a DEM.
      const riverWay = GEO.river.map((v) => xy(v[1], v[0]));
      const riverCurve = new THREE.CatmullRomCurve3(
        riverWay.map((v) => new THREE.Vector3(v.x, 12, v.y)),
        false,
        "centripetal",
      );
      const riverSamples = riverCurve
        .getPoints(200)
        .map((v) => new THREE.Vector2(v.x, v.z));
      const riverSegs = [];
      for (let i = 0; i < riverSamples.length - 1; i++)
        riverSegs.push([riverSamples[i], riverSamples[i + 1]]);
      const riverBranch = new THREE.CatmullRomCurve3(
        GEO.water.branch.map((v) => {
          const p = xy(v[1], v[0]);
          return new THREE.Vector3(p.x, 12, p.y);
        }),
        false,
        "centripetal",
      )
        .getPoints(45)
        .map((v) => new THREE.Vector2(v.x, v.z));
      for (let i = 0; i < riverBranch.length - 1; i++)
        riverSegs.push([riverBranch[i], riverBranch[i + 1]]);
      const aqueductPath = GEO.water.aqueduct.map((v) => xy(v[1], v[0]));
      const wallPaths = GEO.wallPaths.map((p) => p.map((v) => xy(v[1], v[0])));
      const perimeter = GEO.outerPerimeter.map((v) => xy(v[1], v[0]));
      const terrainModel = RomaTerrain.create(GEO, xy);
      const hills = terrainModel.hills.filter(h => GEO.hills.some(g => g.id === h.id));
      let terrainGrid = null;
      const landmarkData = GEO.landmarks;
      const flattenZones = [];
      const exclusions = [];
      const roadSegments = [];
      function riverMetric(x, z) {
        let min = Infinity,
          idx = 0;
        for (let i = 0; i < riverSegs.length; i++) {
          const a = riverSegs[i][0],
            b = riverSegs[i][1],
            dx = b.x - a.x,
            dz = b.y - a.y;
          let t = clamp(
            ((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz || 1),
            0,
            1,
          );
          const d = (x - a.x - t * dx) ** 2 + (z - a.y - t * dz) ** 2;
          if (d < min) {
            min = d;
            idx = i;
          }
        }
        return { distance: Math.sqrt(min), index: idx };
      }
      function riverWidth(i) {
        return i >= riverSamples.length - 1
          ? 34
          : 53 + 10 * Math.sin(i * 0.04) + 5 * Math.sin(i * 0.14);
      }
      function rawHeight(x, z) {
        let y = terrainModel.landHeight(x, z);
        const r = riverMetric(x, z), bank = r.distance - riverWidth(r.index);
        return lerp(7, y, smooth(-12, 68, bank));
      }
      function plotHeightAt(x, z) {
        let y = rawHeight(x, z);
        for (const f of flattenZones) {
          const c = Math.cos(f.yaw),
            s = Math.sin(f.yaw),
            dx = x - f.x,
            dz = z - f.z;
          const u = Math.abs(c * dx - s * dz),
            v = Math.abs(s * dx + c * dz);
          const d = Math.max(u - f.w / 2, v - f.d / 2);
          if (d < 22) y = lerp(f.y, y, smooth(0, 22, d));
        }
        return y;
      }
      // Height queries after mesh creation use the SAME triangles as the visible terrain.
      // This prevents roads/house foundations/camera clearances from sampling an invisible
      // smooth surface that differs from the rendered mesh at a plateau edge.
      function heightAt(x, z) {
        if (!terrainGrid) return plotHeightAt(x,z);
        const {xs,zs,heights,nx}=terrainGrid;
        function interval(a,v) {
          let lo=0,hi=a.length-1;
          while(hi-lo>1) { const m=(lo+hi)>>1; if(a[m]<=v) lo=m; else hi=m; }
          return lo;
        }
        if(x<xs[0] || x>xs.at(-1) || z<zs[0] || z>zs.at(-1)) return plotHeightAt(x,z);
        const i=interval(xs,x),j=interval(zs,z);
        const u=clamp((x-xs[i])/(xs[i+1]-xs[i]),0,1),v=clamp((z-zs[j])/(zs[j+1]-zs[j]),0,1);
        const a=heights[j*nx+i],b=heights[j*nx+i+1],c=heights[(j+1)*nx+i],d=heights[(j+1)*nx+i+1];
        return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
      }
      function reserve(f, w, d, flatten = true, pad = 13) {
        exclusions.push({
          x: f.x,
          z: f.z,
          yaw: f.yaw,
          w: w + pad * 2,
          d: d + pad * 2,
        });
        if (flatten) flattenZones.push({ ...f, w, d });
      }
      function excluded(x, z, margin = 0) {
        for (const e of exclusions) {
          const c = Math.cos(e.yaw),
            s = Math.sin(e.yaw),
            dx = x - e.x,
            dz = z - e.z;
          if (
            Math.abs(c * dx - s * dz) < e.w / 2 + margin &&
            Math.abs(s * dx + c * dz) < e.d / 2 + margin
          )
            return true;
        }
        return false;
      }
      function nearRoad(x, z, margin = 0) {
        for (const s of roadSegments)
          if (pointSegment(x, z, s.a, s.b).d < s.w / 2 + margin) return true;
        return false;
      }
      const landmarks = [];
      function landmark(
        key,
        name,
        lat,
        lon,
        bearing,
        w,
        d,
        description,
        kind,
        extras = {},
      ) {
        // Major sites on valley floors and hilltops have explicit approximate levels.
        // Taking a neighbouring building's already-flattened height propagates errors.
        const p = xy(lat, lon);
        const f = frame(lat, lon, bearing,
          extras.groundHeightM ?? GEO.terrainModel.siteLevelsM[key] ?? rawHeight(p.x,p.y));
        reserve(f, w, d, extras.flatten !== false, extras.pad ?? 16);
        const l = {
          key,
          name,
          lat,
          lon,
          f,
          w,
          d,
          description,
          kind,
          ...extras,
        };
        landmarks.push(l);
        return l;
      }
      function getRecord(id) {
        return landmarkData.find((d) => d.id === id);
      }
      function fromRecord(
        key,
        id,
        w,
        d,
        kind,
        description,
        bearing,
        extras = {},
      ) {
        const r = getRecord(id);
        return landmark(
          key,
          r.nameJa,
          r.modelCenterEstimate?.lat ?? r.lat,
          r.modelCenterEstimate?.lon ?? r.lon,
          bearing ??
            r.modelOrientation?.bearingDeg ??
            r.siteGeometryBounds?.bearingDeg ??
            0,
          w,
          d,
          description,
          kind,
          {
            ...extras,
            structureW: extras.structureW ?? r.modelStructureWidthM,
          },
        );
      }
      const colosseum = fromRecord(
        "colosseum",
        "285857974",
        189,
        156,
        "colosseum",
        "約5万人を迎えた円形闘技場。189 × 156mの楕円形を、三層のアーケードが囲む。",
        111.5,
        { labelHeight: 54, major: true },
      );
      // Oval primitives use X=short axis and Z=long axis. Correct reservation dimensions.
      colosseum.w = 156;
      colosseum.d = 189;
      exclusions[0].w = 188;
      exclusions[0].d = 221;
      flattenZones[0].w = 165;
      flattenZones[0].d = 198;
      const pantheon = landmark(
        "pantheon",
        "パンテオン",
        41.89856,
        12.476835,
        356,
        61,
        91,
        "天窓を持つ大ドーム。北を向く柱廊と円堂を、同じ位置・方角に復元。",
        "pantheon",
        { labelHeight: 48, major: true },
      );
      const circus = fromRecord(
        "circus",
        "458808506",
        150,
        610,
        "circus",
        "パラティーノ丘とアウェンティヌス丘の間に広がる、戦車競走の大競技場。",
        126.3,
        { labelHeight: 31, major: true },
      );
      const forum = landmark(
        "forum",
        "フォルム・ロマヌム",
        41.89238,
        12.48535,
        111.5,
        100,
        235,
        "政治と祈りの中心。神殿とバシリカが並ぶ、古代都市の広場。",
        "forum",
        { labelHeight: 28, major: true },
      );
      const venus = fromRecord(
        "venus",
        "261794683",
        103,
        155,
        "venus",
        "ウェヌスとローマを祀る二重神殿。コロッセオの西側に広がる大基壇。",
        110.6,
        { labelHeight: 40 },
      );
      const caesar = fromRecord(
        "caesar",
        "445545537",
        75,
        155,
        "imperial",
        "カエサルが開いた広場。ウェヌス・ゲネトリクス神殿を中心とする。",
        135.3,
      );
      const augustus = fromRecord(
        "augustusForum",
        "47606496",
        100,
        130,
        "imperial",
        "マルス・ウルトル神殿と半円形の広場を備える、皇帝のフォルム。",
        43.4,
      );
      const nerva = fromRecord(
        "nerva",
        "984830239",
        43,
        165,
        "imperial",
        "旧来の通りを組み込んだ、細長いネルウァのフォルム。",
        49.8,
      );
      const trajan = fromRecord(
        "trajan",
        "250091860",
        128,
        242,
        "trajan",
        "バシリカ・ウルピアと記念柱がそびえる、帝政期最大級のフォルム。",
        135,
        { labelHeight: 45, major: true },
      );
      const peace = fromRecord(
        "peace",
        "152567558",
        110,
        135,
        "imperial",
        "庭園と回廊を持つ平和のフォルム。美術品も集められた公共空間。",
        45,
      );
      const caracalla = fromRecord(
        "caracalla",
        "322942899",
        337,
        328,
        "caracalla",
        "216年に開かれた大浴場。丸い高温浴室、広場、プール、庭園を備える。",
        45,
        { labelHeight: 52, major: true },
      );
      const diocletian = fromRecord(
        "diocletian",
        "420615524",
        380,
        365,
        "diocletian",
        "306年に完成した大浴場。大きなヴォールトの浴室と運動場が並ぶ。",
        45,
        { labelHeight: 52, major: true },
      );
      const trajanBaths = fromRecord(
        "trajanBaths",
        "188289894",
        330,
        315,
        "trajanBaths",
        "オッピウス丘に109年に開かれた浴場。前庭と大きな浴室棟を備える。",
        36,
        { labelHeight: 43 },
      );
      const hadrian = fromRecord(
        "hadrian",
        "334776904",
        90,
        90,
        "hadrian",
        "テヴェレ川右岸の皇帝廟。320年には、後世の城塞の姿になる前の霊廟。",
        0,
        { labelHeight: 54, major: true },
      );
      const augustTomb = fromRecord(
        "augustTomb",
        "281368358",
        100,
        100,
        "augustTomb",
        "カンプス・マルティウス北部に築かれた、アウグストゥス一族の円形霊廟。",
        0,
        { labelHeight: 40 },
      );
      const stadium = fromRecord(
        "stadium",
        "92342486",
        106,
        275,
        "stadium",
        "運動競技のための競技場。現在のナヴォーナ広場に、その平面形が残る。",
        356.6,
        { labelHeight: 25 },
      );
      const marcellus = landmark(
        "marcellus",
        "マルケッルス劇場",
        41.8918,
        12.47999,
        52,
        134,
        105,
        "アウグストゥスが完成させた石造劇場。川に近い市街地に半円の客席が開く。",
        "theater",
        { labelHeight: 34 },
      );
      const pompey = landmark(
        "pompey",
        "ポンペイウス劇場",
        41.89528,
        12.47372,
        92,
        155,
        120,
        "紀元前55年に完成した、ローマで最初の常設石造劇場。",
        "theater",
        { labelHeight: 36 },
      );
      const flavia = fromRecord(
        "flavia",
        "564783056",
        108,
        156,
        "palace",
        "パラティーノ丘の皇帝宮殿。中庭と柱廊、謁見の大広間が並ぶ。",
        44.5,
        { labelHeight: 30, major: true },
      );
      const augustana = fromRecord(
        "augustana",
        "792237246",
        100,
        200,
        "palace",
        "皇帝宮殿の居住区。丘の斜面を利用した複層の宮殿群。",
        44.3,
        {
          labelHeight: 25,
          severanTerraceReach: 75,
          severanTerraceDepth: 18,
        },
      );
      {
        const offset = augustana.w / 2 + augustana.severanTerraceReach / 2;
        const c = Math.cos(augustana.f.yaw),
          s = Math.sin(augustana.f.yaw);
        exclusions.push({
          x: augustana.f.x + c * offset,
          z: augustana.f.z - s * offset,
          yaw: augustana.f.yaw,
          w: augustana.severanTerraceReach,
          d: augustana.d,
        });
      }
      const aqueductMeta = GEO.water.aqueductModel;
      const aqueduct = landmark(
        aqueductMeta.id,
        aqueductMeta.nameJa,
        41.8863,
        12.4974,
        0,
        2,
        2,
        "ポルタ・マッジョーレからカエリウス丘を経て、宮殿へ水を運んだクラウディア水道の支線。",
        "aqueduct",
        { flatten: false, pad: 0, labelHeight: 24, major: true },
      );
      const hadrianTemple = fromRecord(
        "hadrianTemple",
        "666765291",
        35,
        50,
        "temple",
        "神格化されたハドリアヌス帝を祀る、カンプス・マルティウスの神殿。",
        86,
      );
      const portunus = fromRecord(
        "portunus",
        "494660670",
        12,
        24,
        "temple",
        "河港に近いフォルム・ボアリウムの、ポルトゥヌスを祀る神殿。",
        342.7,
      );
      const hercules = fromRecord(
        "hercules",
        "825969667",
        21,
        21,
        "roundTemple",
        "円形の列柱に囲まれた、ヘラクレス・ウィクトルの神殿。",
        0,
      );
      const maxRecord = landmarkData.find((l) => /Maxenti/.test(l.name));
      const maxentius = landmark(
        "maxentius",
        "マクセンティウスのバシリカ",
        maxRecord?.lat ?? 41.8918,
        maxRecord?.lon ?? 12.4886,
        110.5,
        80,
        100,
        "コンスタンティヌス帝の時代に完成した、巨大なヴォールトを持つバシリカ。",
        "basilica",
        { labelHeight: 42 },
      );
      const archRecord = landmarkData.find((l) => /Constantini/.test(l.name));
      const constantine = landmark(
        "constantine",
        "コンスタンティヌス凱旋門",
        archRecord?.lat ?? 41.889762,
        archRecord?.lon ?? 12.490656,
        20,
        26,
        11,
        "315年に奉献された三連の凱旋門。コロッセオとパラティーノ丘の間に立つ。",
        "arch",
        { labelHeight: 24 },
      );
      const capitol = landmark(
        "capitol",
        "ユピテル神殿",
        41.892222,
        12.481667,
        130,
        63,
        72,
        "カピトリーノ丘の頂に立つ、ローマ国家の中心的な神殿。",
        "temple",
        { labelHeight: 35 },
      );
      // The Forum archaeological perimeter excludes residential infill around its individual monuments.
      const forumFootprint = getRecord("502866838").footprintRingLonLat.map(
        (v) => xy(v[1], v[0]),
      );
      function civicExcluded(x, z) {
        return excluded(x, z, 10) || insidePolygon(x, z, forumFootprint);
      }
      function makeTerrain() {
        function axis(segments) {
          const a=[segments[0][0]];
          for(const [from,to,step] of segments) {
            const n=Math.ceil((to-from)/step);
            for(let i=1;i<=n;i++) a.push(Math.fround(lerp(from,to,i/n)));
          }
          return a;
        }
        const xs=axis([[-12000,-5300,260],[-5300,-1800,80],[-1800,-800,20],[-800,500,8],[500,2200,20],[2200,5300,80],[5300,12000,260]]);
        const zs=axis([[-12000,-5600,260],[-5600,-2500,80],[-2500,-100,20],[-100,1050,8],[1050,2200,20],[2200,5600,80],[5600,12000,260]]);
        const nx=xs.length,nz=zs.length,n=nx*nz;
        const positions=new Float32Array(n*3), colors=new Float32Array(n*3), heights=new Float32Array(n);
        const indices=new Uint32Array((nx-1)*(nz-1)*6);
        let k=0;
        for(let j=0;j<nz;j++) for(let i=0;i<nx;i++) {
          const index=j*nx+i, x=xs[i], z=zs[j], y=plotHeightAt(x,z);
          positions[index*3]=x;positions[index*3+1]=y;positions[index*3+2]=z;heights[index]=y;
          if(i<nx-1 && j<nz-1) {
            const a=index,b=a+1,c=a+nx,d=c+1;
            indices[k++]=a;indices[k++]=c;indices[k++]=b;
            indices[k++]=b;indices[k++]=c;indices[k++]=d;
          }
        }
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setIndex(new THREE.BufferAttribute(indices,1));
        g.computeVertexNormals();
        const normals=g.attributes.normal;
        const cityC=new THREE.Color(0xb9aa87),fieldC=new THREE.Color(0x949973),bankC=new THREE.Color(0xc1b290);
        const tuffC=new THREE.Color(0x938362),grassC=new THREE.Color(0x86906a),baseC=new THREE.Color();
        for(let i=0;i<n;i++) {
          const x=positions[i*3],z=positions[i*3+2],y=heights[i];
          baseC.copy(insidePolygon(x,z,perimeter)?cityC:fieldC);
          const steep=smooth(.015,.13,1-normals.getY(i));
          baseC.lerp(grassC,smooth(24,48,y)*.18*(1-steep));
          baseC.lerp(tuffC,steep*.76);
          const noise=(Math.sin(x*.041+Math.sin(z*.023))*Math.sin(z*.053)+Math.sin((x+z)*.009)*.5)*.024;
          const river=riverMetric(x,z);
          baseC.lerp(bankC,1-smooth(40,125,river.distance));
          baseC.offsetHSL(0,noise*.18,noise);
          colors[i*3]=baseC.r;colors[i*3+1]=baseC.g;colors[i*3+2]=baseC.b;
        }
        g.setAttribute('color',new THREE.BufferAttribute(colors,3));
        g.computeBoundingSphere();
        const ground=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
        ground.name='terrain-1to1';ground.receiveShadow=true;ground.castShadow=true;
        staticRoot.add(ground);
        terrainGrid={xs,zs,heights,nx,vertices:n,triangles:indices.length/3};
      }
      function makeSky() {
        const skyMat = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthTest: false,
          depthWrite: false,
          fog: false,
          toneMapped: false,
          uniforms: {
            zenith: { value: new THREE.Color(0x89b2ba) },
            horizon: { value: new THREE.Color(0xedcfaa) },
            nadir: { value: new THREE.Color(0xd6c5a6) },
          },
          vertexShader:
            // Ignore camera translation and project the sky at the far plane.
            // A world-space dome was clipped when zooming away from the city.
            "varying vec3 vDirection; void main(){vDirection=position;vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=clip.xyww;}",
          fragmentShader:
            "varying vec3 vDirection; uniform vec3 zenith;uniform vec3 horizon;uniform vec3 nadir;void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);vec3 c=mix(horizon,zenith,pow(h,.48));c=mix(c,nadir,smoothstep(0.0,.6,-d.y));float sun=pow(max(dot(d,normalize(vec3(-.75,.19,.43))),0.0),13.0);c+=vec3(.15,.075,.012)*sun;gl_FragColor=vec4(c,1.0);#include <colorspace_fragment>\n}",
        });
        skyMat.fragmentShader = skyMat.fragmentShader.replace(
          ";#include",
          ";\n#include",
        );
        const sky = new THREE.Mesh(
          new THREE.SphereGeometry(1, 32, 24),
          skyMat,
        );
        sky.frustumCulled = false;
        // Draw behind the terrain without occupying its depth buffer.
        sky.renderOrder = -1;
        scene.add(sky);
        return sky;
      }
      let waterMaterial;
      function makeRiver() {
        const p = [],
          uv = [],
          ind = [];
        for (const path of [riverSamples, riverBranch]) {
          const base = p.length / 3;
          for (let i = 0; i < path.length; i++) {
            const a = path[Math.max(i - 1, 0)],
              b = path[Math.min(i + 1, path.length - 1)],
              t = b.clone().sub(a).normalize(),
              n = new THREE.Vector2(-t.y, t.x),
              w = path === riverBranch ? 34 : riverWidth(i),
              c = path[i];
            p.push(
              c.x + n.x * w,
              12.2,
              c.y + n.y * w,
              c.x - n.x * w,
              12.2,
              c.y - n.y * w,
            );
            uv.push(0, i / 12, 1, i / 12);
            if (i < path.length - 1) {
              const k = base + i * 2;
              ind.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
            }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(ind);
        g.computeVertexNormals();
        waterMaterial = new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.fog,
            { time: { value: 0 }, animateWater: { value: 1 } },
          ]),
          fog: true,
          side: THREE.DoubleSide,
          vertexShader:
            "uniform float time;uniform float animateWater;varying vec3 vWorld;\n#include <fog_pars_vertex>\nvoid main(){vec3 p=position;p.y+=animateWater*.11*sin(p.x*.06+p.z*.03+time*.7);vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}",
          fragmentShader:
            "uniform float time;varying vec3 vWorld;\n#include <fog_pars_fragment>\nvoid main(){float t=time*.42;vec3 n=normalize(vec3(.045*cos(vWorld.x*.1+vWorld.z*.065+t),1.0,.037*sin(vWorld.z*.125-vWorld.x*.03+t)));vec3 viewDir=normalize(cameraPosition-vWorld);float fres=pow(1.0-max(dot(n,viewDir),0.0),3.0);vec3 c=mix(vec3(.095,.235,.216),vec3(.5,.64,.61),fres*.7);vec3 lightDir=normalize(vec3(-.72,.35,.45));float spec=pow(max(dot(reflect(-lightDir,n),viewDir),0.0),95.0);c+=vec3(1.0,.79,.42)*spec*.62;float wave=sin(vWorld.x*.17+vWorld.z*.12+t)*sin(vWorld.z*.15+t*.7);c+=wave*.012;gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>\n}",
        });
        const water = new THREE.Mesh(g, waterMaterial);
        water.frustumCulled = false;
        staticRoot.add(water);
      }
      function ribbon(coords, width, mat = "road", addExclusion = true) {
        const points = coords.map((v) => xy(v[1], v[0]));
        if (addExclusion)
          for (let i = 0; i < points.length - 1; i++)
            roadSegments.push({ a: points[i], b: points[i + 1], w: width });
        const verts = [],
          inds = [];
        for (let k = 0; k < points.length - 1; k++) {
          const a = points[k],
            b = points[k + 1],
            delta = b.clone().sub(a),
            length = delta.length(),
            n = new THREE.Vector2(-delta.y, delta.x).normalize();
          const steps = Math.ceil(length / 8);
          for (let i = 0; i < steps; i++) {
            const j = verts.length / 3;
            for (const t of [i / steps, (i + 1) / steps])
              for (const side of [-1, 1]) {
                const x = lerp(a.x, b.x, t) + ((n.x * width) / 2) * side,
                  z = lerp(a.y, b.y, t) + ((n.y * width) / 2) * side;
                verts.push(x, heightAt(x, z) + 0.23, z);
              }
            inds.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        g.setIndex(inds);
        g.computeVertexNormals();
        mesh(g, mat);
      }
      function makeRoads() {
        const roads = [
          {
            w: 13,
            p: [
              [12.47611, 41.91143],
              [12.47723, 41.90797],
              [12.47903, 41.90259],
              [12.48074, 41.8985],
              [12.48255, 41.89586],
            ],
          },
          {
            w: 11,
            p: [
              [12.482, 41.896],
              [12.48806, 41.89868],
              [12.49168, 41.90341],
              [12.49989, 41.90991],
            ],
          },
          {
            w: 9,
            p: [
              [12.48483, 41.89311],
              [12.4873, 41.894],
              [12.49118, 41.89582],
              [12.49556, 41.89849],
              [12.50455, 41.89859],
              [12.50952, 41.89868],
            ],
          },
          {
            w: 10,
            p: [
              [12.4868, 41.89211],
              [12.48986, 41.89123],
              [12.49101, 41.89076],
              [12.49296, 41.89084],
              [12.49947, 41.89096],
              [12.50716, 41.89147],
              [12.51452, 41.89214],
            ],
          },
          {
            w: 10,
            p: [
              [12.49055, 41.88948],
              [12.49161, 41.8872],
              [12.49426, 41.88333],
              [12.49905, 41.87716],
              [12.50125, 41.87389],
              [12.506, 41.866],
            ],
          },
          {
            w: 10,
            p: [
              [12.48098, 41.88796],
              [12.48205, 41.88265],
              [12.48211, 41.87652],
              [12.48098, 41.87005],
              [12.4811, 41.862],
            ],
          },
          {
            w: 10,
            p: [
              [12.47961, 41.89146],
              [12.48017, 41.88928],
              [12.48264, 41.88794],
              [12.48552, 41.88615],
              [12.48873, 41.88431],
              [12.49212, 41.88238],
            ],
          },
          {
            w: 8,
            p: [
              [12.47927, 41.89128],
              [12.47243, 41.89217],
              [12.46809, 41.89202],
              [12.46358, 41.88999],
              [12.4603, 41.88839],
            ],
          },
          {
            w: 9,
            p: [
              [12.46573, 41.90317],
              [12.46734, 41.90183],
              [12.47143, 41.90027],
              [12.47538, 41.89972],
              [12.48019, 41.89994],
              [12.4861, 41.90136],
            ],
          },
          {
            w: 8,
            p: [
              [12.48893, 41.89416],
              [12.4913, 41.89614],
              [12.49339, 41.90003],
              [12.49734, 41.90268],
            ],
          },
          {
            w: 8,
            p: [
              [12.4947, 41.90629],
              [12.50339, 41.90928],
              [12.5096, 41.91],
            ],
          },
        ];
        for (const r of roads) ribbon(r.p, r.w);
      }
      // Basic building vocabulary: podium, columns, entablature, pediment, tile roof.
      function column(f, x, z, h, r = 1.1, y = 0, detail = 0) {
        local(
          f,
          "cyl",
          "stone",
          x,
          y + 0.35,
          z,
          r * 1.25,
          0.7,
          r * 1.25,
          0,
          detail,
        );
        local(
          f,
          "column",
          "marble",
          x,
          y + h / 2 + 0.7,
          z,
          r,
          h - 0.8,
          r,
          0,
          detail,
        );
        local(
          f,
          "box",
          "marble",
          x,
          y + h + 0.1,
          z,
          r * 2.5,
          0.7,
          r * 2.5,
          0,
          detail,
        );
      }
      function colonnade(
        f,
        x,
        z,
        length,
        count,
        h,
        axis = "x",
        r = 0.9,
        y = 0,
      ) {
        for (let i = 0; i < count; i++) {
          const t = (i / (count - 1) - 0.5) * length;
          column(
            f,
            x + (axis === "x" ? t : 0),
            z + (axis === "z" ? t : 0),
            h,
            r,
            y,
          );
        }
        local(
          f,
          "box",
          "marble",
          x,
          y + h + 1,
          z,
          axis === "x" ? length + 3 : r * 3,
          1.3,
          axis === "z" ? length + 3 : r * 3,
        );
      }
      function temple(
        f,
        w,
        d,
        h,
        front = 6,
        sides = 10,
        roofColor = "roof",
        noReserve = false,
      ) {
        for (let i = 0; i < 3; i++)
          local(
            f,
            "box",
            "stone",
            0,
            0.5 + i * 0.75,
            0,
            w + 5 - i * 1.4,
            1,
            d + 6 - i * 1.4,
          );
        local(f, "box", "stone", 0, 3, 0, w, 2.5, d);
        const floor = 4.3,
          r = Math.max(0.5, w / (front * 5.4));
        local(
          f,
          "box",
          "marble",
          0,
          floor + h * 0.44,
          d * 0.07,
          w * 0.61,
          h * 0.88,
          d * 0.61,
        );
        local(
          f,
          "box",
          "dark",
          0,
          floor + h * 0.38,
          -d * 0.24,
          w * 0.14,
          h * 0.62,
          0.25,
        );
        colonnade(f, 0, -d * 0.43, w * 0.9, front, h, "x", r, floor);
        colonnade(f, 0, d * 0.43, w * 0.9, front, h, "x", r, floor);
        for (const x of [-w * 0.45, w * 0.45])
          colonnade(f, x, 0, d * 0.84, sides, h, "z", r, floor);
        local(f, "box", "marble", 0, floor + h + 1.6, 0, w + 1.7, 1.7, d + 1.7);
        local(
          f,
          "roof",
          "stone",
          0,
          floor + h + 2.45,
          0,
          w + 1.9,
          w * 0.17,
          d + 1.8,
        );
        local(
          f,
          "roof",
          roofColor,
          0,
          floor + h + 3,
          0,
          w + 2.9,
          w * 0.16,
          d + 2.8,
        );
      }
      function peristyle(f, w, d, h = 8) {
        local(f, "box", "road", 0, 0.1, 0, w, 0.25, d);
        for (const side of [-1, 1]) {
          local(f, "box", "brick", side * (w / 2 - 4), h / 2, 0, 8, h, d);
          local(f, "roof", "roof", side * (w / 2 - 4), h, 0, 11, 2.7, d + 2);
          colonnade(
            f,
            side * (w / 2 - 11),
            0,
            d - 14,
            Math.max(5, Math.floor(d / 7)),
            h - 1,
            "z",
            0.68,
          );
        }
        for (const side of [-1, 1]) {
          local(f, "box", "brick", 0, h / 2, side * (d / 2 - 4), w - 8, h, 8);
          local(
            f,
            "roof",
            "roof",
            0,
            h,
            side * (d / 2 - 4),
            11,
            2.7,
            w - 8,
            Math.PI / 2,
          );
          colonnade(
            f,
            0,
            side * (d / 2 - 11),
            w - 22,
            Math.max(5, Math.floor(w / 7)),
            h - 1,
            "x",
            0.68,
          );
        }
      }
      function basilica(f, w, d, h = 22) {
        local(f, "box", "stone", 0, 1, 0, w + 4, 2, d + 4);
        local(f, "box", "brick", 0, h * 0.4, 0, w, h * 0.8, d);
        local(f, "box", "marble", 0, h * 0.72, 0, w * 0.52, h * 0.8, d * 0.94);
        local(f, "roof", "roof", 0, h * 1.12, 0, w * 0.6, 6, d + 2);
        for (const x of [-w * 0.38, w * 0.38])
          local(f, "roof", "roof", x, h * 0.81, 0, w * 0.26, 3.4, d);
        for (const z of [-d * 0.45, d * 0.45])
          colonnade(f, 0, z, w * 0.88, 8, h * 0.72, "x", 0.85);
        for (const x of [-w * 0.505, w * 0.505])
          for (let z = -d * 0.4; z < d * 0.45; z += 8) {
            local(f, "box", "dark", x, h * 0.51, z, 0.15, h * 0.29, 3.5, 0, 1);
            local(
              f,
              "column",
              "marble",
              x,
              h * 0.37,
              z + 3.9,
              0.6,
              h * 0.72,
              0.6,
            );
          }
        local(f, "box", "stone", 0, h * 0.79, 0, w + 1, 1, d + 2);
      }
      function archBay(
        f,
        x,
        y,
        z,
        width,
        h,
        depth = 3,
        yaw = 0,
        detail = 0,
        material = "stone",
      ) {
        const ff = { ...f };
        const c = Math.cos(f.yaw),
          s = Math.sin(f.yaw);
        ff.x = f.x + c * x + s * z;
        ff.z = f.z - s * x + c * z;
        ff.y = f.y + y;
        ff.yaw = f.yaw + yaw;
        const radius = width / 2,
          legH = h - radius * 0.72;
        local(
          ff,
          "arch",
          material,
          0,
          legH,
          0,
          radius,
          radius,
          depth,
          0,
          detail,
        );
        for (const side of [-1, 1])
          local(
            ff,
            "box",
            material,
            side * radius * 0.86,
            legH / 2,
            0,
            radius * 0.28,
            legH,
            depth,
            0,
            detail,
          );
      }
      function obelisk(f, x, z, h = 24) {
        local(f, "box", "stone", x, 1.6, z, 6, 3.2, 6);
        local(f, "cone", "brick", x, h + 4, z, 1.2, 3, 1.2);
        const g = new THREE.CylinderGeometry(1.1, 1.8, h, 4);
        const m = mesh(g, "brick", f, x, h / 2 + 3, z);
        m.rotation.y += Math.PI / 4;
      }
      function buildColosseum(l) {
        const f = l.f,
          a = 78,
          b = 94.5;
        ellipseFloor(f, a + 13, b + 13, "road");
        mesh(
          ringGeo(a - 6, b - 6, a - 12, b - 12, 39, 112),
          "shade",
          f,
          0,
          1,
          0,
        );
        for (const y of [0, 13, 26, 39])
          mesh(
            ringGeo(a + 0.8, b + 0.8, a - 8, b - 8, 1.7, 128),
            "marble",
            f,
            0,
            y + 0.7,
            0,
          );
        for (let floor = 0; floor < 3; floor++) {
          for (let i = 0; i < 80; i++) {
            const t = (TAU * i) / 80,
              x = Math.cos(t) * a,
              z = Math.sin(t) * b,
              nx = Math.cos(t) / a,
              nz = Math.sin(t) / b,
              yaw = Math.atan2(nx, nz),
              width =
                ((Math.hypot(a * Math.sin(t), b * Math.cos(t)) * TAU) / 80) *
                0.95;
            archBay(f, x, floor * 13 + 2.2, z, width, 9.2, 3.3, yaw);
            const t2 = t + TAU / 160;
            column(
              f,
              Math.cos(t2) * (a + 0.7),
              Math.sin(t2) * (b + 0.7),
              10,
              0.59,
              floor * 13 + 2,
              1,
            );
          }
        }
        mesh(ringGeo(a, b, a - 7, b - 7, 8.2, 128), "stone", f, 0, 40.7, 0);
        mesh(
          ringGeo(a + 1, b + 1, a - 7, b - 7, 0.9, 128),
          "marble",
          f,
          0,
          48.9,
          0,
        );
        for (let i = 0; i < 80; i++) {
          const t = (TAU * i) / 80,
            x = Math.cos(t) * (a + 0.13),
            z = Math.sin(t) * (b + 0.13),
            yaw = Math.atan2(Math.cos(t) / a, Math.sin(t) / b);
          local(f, "box", "dark", x, 44.6, z, 1.6, 2.5, 0.25, yaw, 1);
          local(
            f,
            "cyl",
            "wood",
            Math.cos(t) * (a - 2),
            52,
            Math.sin(t) * (b - 2),
            0.17,
            7,
            0.17,
            0,
            1,
          );
        }
        for (let i = 0; i < 22; i++) {
          const t = i / 21,
            aa = 26 + t * 42,
            bb = 43 + t * 40;
          mesh(
            ringGeo(aa + 1.85, bb + 1.8, aa, bb, 0.85, 100),
            "stone",
            f,
            0,
            3.8 + t * 32.7,
            0,
          );
        }
        ellipseFloor(f, 25, 42, "sand", 2.2);
        for (let i = 0; i < 12; i++) {
          const t = (TAU * i) / 12;
          const ff = { ...f, yaw: f.yaw - t };
          local(ff, "box", "marble", 0, 20, 63, 1, 1.0, 37, 0, 1, null, -0.72);
        }
        for (const zz of [-b - 3, b + 3]) archBay(f, 0, 0, zz, 8, 10, 8);
      }
      function buildPantheon(l) {
        const f = l.f;
        local(f, "cyl", "stone", 0, 1, 4, 31, 2, 31);
        local(f, "cyl", "brick", 0, 15, 5, 28.8, 28, 28.8);
        local(f, "cyl", "stone", 0, 26, 5, 28.9, 2.4, 28.9);
        local(f, "cyl", "shade", 0, 29, 5, 26.7, 3.7, 26.7);
        const theta = Math.asin(4.5 / 22);
        const g = new THREE.SphereGeometry(
          22,
          64,
          30,
          0,
          TAU,
          theta,
          Math.PI / 2 - theta,
        );
        const d = mesh(g, "stone", f, 0, 21.5, 5);
        d.material = new THREE.MeshStandardMaterial({
          color: 0xd9ccab,
          side: THREE.DoubleSide,
          roughness: 1,
        });
        for (let i = 0; i < 5; i++) {
          const rr = 26.7 - i * 1.2;
          mesh(
            ringGeo(rr, rr, rr - 0.8, rr - 0.8, 0.5, 90),
            "stone",
            f,
            0,
            30.8 + i * 1.3,
            5,
          );
        }
        const oculus = new THREE.TorusGeometry(4.5, 0.45, 6, 48);
        oculus.rotateX(Math.PI / 2);
        mesh(oculus, "marble", f, 0, 43, 5);
        local(f, "box", "brick", 0, 10, -22, 34, 20, 16);
        local(f, "box", "stone", 0, 1, -35, 38, 2, 26);
        for (const z of [-44, -38, -32])
          for (let i = 0; i < 8; i++) {
            if (z !== -44 && i > 1 && i < 6) continue;
            column(f, (i - 3.5) * 4.2, z, 13.8, 0.78, 2);
          }
        local(f, "box", "marble", 0, 17.3, -36, 34.8, 1.8, 22);
        local(f, "roof", "stone", 0, 18.2, -36, 35, 5.5, 22);
        local(f, "roof", "darkroof", 0, 18.7, -36, 36.5, 5.5, 24);
        local(f, "box", "dark", 0, 8, -30.1, 6, 12, 0.25);
        for (let i = 0; i < 12; i++) {
          const t = (TAU * i) / 12;
          local(
            f,
            "box",
            "stone",
            Math.cos(t) * 28.6,
            12,
            5 + Math.sin(t) * 28.6,
            2.5,
            21,
            1,
            Math.PI / 2 - t,
            1,
          );
        }
      }
      function stadiumShape(width, length) {
        const r = width / 2,
          L = length - r;
        const s = new THREE.Shape();
        s.moveTo(-r, length / 2);
        s.lineTo(r, length / 2);
        s.lineTo(r, -length / 2 + r);
        s.absarc(0, -length / 2 + r, r, 0, Math.PI, true);
        s.lineTo(-r, length / 2);
        return s;
      }
      function stadiumRing(width, length, innerWidth, innerLength, h) {
        const s = stadiumShape(width, length),
          hole = stadiumShape(innerWidth, innerLength);
        s.holes.push(new THREE.Path(hole.getPoints(56).reverse()));
        const g = new THREE.ExtrudeGeometry(s, {
          depth: h,
          bevelEnabled: false,
          curveSegments: 30,
        });
        g.rotateX(Math.PI / 2);
        g.translate(0, h, 0);
        return g;
      }
      function buildCircus(l, isStadium = false) {
        const f = l.f,
          w = isStadium ? 106 : 140,
          d = isStadium ? 275 : 600;
        local(f, "box", "road", 0, 0.2, 0, w + 16, 0.4, d + 16);
        const floor = stadiumShape(w - 38, d - 22);
        const fg = new THREE.ShapeGeometry(floor, 50);
        fg.rotateX(-Math.PI / 2);
        fg.rotateY(Math.PI);
        mesh(fg, "sand", f, 0, 0.65, 0);
        for (let i = 0; i < 11; i++) {
          const inset = i * 2.8;
          mesh(
            stadiumRing(
              w - inset,
              d - inset,
              w - inset - 2.4,
              d - inset - 2.4,
              1.8,
            ),
            "stone",
            f,
            0,
            17 - i * 1.42,
            0,
          );
        }
        mesh(stadiumRing(w, d, w - 4, d - 4, 15), "brick", f);
        const length = d - w / 2;
        for (const x of [-w / 2, w / 2])
          for (let z = -d / 2 + w / 2; z < d / 2; z += 9)
            archBay(f, x, 0, z, 7.4, 9, 3.6, Math.PI / 2, 1);
        local(f, "box", "brick", 0, 9, d / 2, w, 18, 12);
        local(f, "roof", "roof", 0, 18, d / 2, 15, 5, w, Math.PI / 2);
        for (let i = -5; i <= 5; i++)
          archBay(f, (i * (w - 12)) / 12, 1, d / 2 + 6.1, 8, 9, 2.5, 0, 1);
        if (!isStadium) {
          local(f, "box", "stone", 0, 1.2, -6, 10, 2.4, 360);
          local(f, "box", "green", 0, 2.5, -5, 6, 0.5, 318);
          for (const z of [-110, 85])
            local(f, "box", "water", 0, 2.8, z, 5, 0.3, 65);
          obelisk(f, 0, -20, 24);
          for (const z of [-183, 174])
            for (const x of [-2.8, 0, 2.8])
              local(f, "cone", "bronze", x, 6, z, 0.7, 7, 0.7);
        }
      }
      function buildTheater(l) {
        const f = l.f,
          r = l.w / 2;
        ellipseFloor(f, r + 4, r * 0.65 + 7, "road");
        for (let i = 0; i < 14; i++) {
          const rr = r - 3 - i * 2.7;
          mesh(
            ringGeo(rr, rr, rr - 2.5, rr - 2.5, 1.2, 70, 0, Math.PI),
            "stone",
            f,
            0,
            24 - i * 1.55,
            -13,
          );
        }
        mesh(
          ringGeo(r, r, r - 6, r - 6, 28, 80, 0, Math.PI),
          "brick",
          f,
          0,
          0,
          -13,
        );
        for (let j = 0; j < 2; j++)
          for (let i = 0; i < 35; i++) {
            const t = ((i + 0.5) * Math.PI) / 35;
            archBay(
              f,
              Math.cos(t) * (r + 0.5),
              j * 12.5 + 1,
              Math.sin(t) * (r + 0.5) - 13,
              ((Math.PI * r) / 35) * 0.89,
              9,
              3,
              Math.PI / 2 - t,
              1,
            );
          }
        local(f, "box", "brick", 0, 12, -16, l.w, 24, 20);
        local(f, "roof", "roof", 0, 24, -16, 23, 4, l.w + 2, Math.PI / 2);
        colonnade(f, 0, -4, l.w - 12, 18, 12, "x", 0.7);
      }
      function buildBaths(l) {
        const f = l.f,
          w = l.w,
          d = l.d,
          dioc = l.kind === "diocletian";
        peristyle(f, w, d, 10);
        for (const x of [-w * 0.32, w * 0.32]) {
          const ff = { ...f };
          const c = Math.cos(f.yaw),
            s = Math.sin(f.yaw);
          ff.x += c * x;
          ff.z -= s * x;
          peristyle(ff, 65, 112, 13);
          local(ff, "box", "sand", 0, 0.5, 0, 42, 0.4, 86);
        }
        local(f, "box", "brick", 0, 14, 0, w * 0.54, 28, 106);
        local(f, "box", "stone", 0, 16, -d * 0.12, 62, 32, 76);
        local(f, "box", "stone", 0, 31, 0, 78, 8, 60);
        for (const x of [-24, 0, 24]) {
          const g = new THREE.CylinderGeometry(
            13,
            13,
            61,
            28,
            1,
            false,
            0,
            Math.PI,
          );
          g.rotateZ(Math.PI / 2);
          const m = mesh(g, "stone", f, x, 35, 0);
          m.rotation.y += Math.PI / 2;
        }
        local(f, "box", "marble", 0, 37, 0, 86, 2, 66);
        // The natatio is an open-air pool; the caldarium faces southwest.
        local(f, "box", "marble", 0, 0.5, -d * 0.27, 71, 1, 58);
        local(f, "box", "water", 0, 1.1, -d * 0.27, 52, 0.18, 36);
        colonnade(f, 0, -d * 0.27 - 23, 66, 10, 15, "x", 0.9);
        for (const x of [-48, 48]) {
          local(f, "box", "brick", x, 17, -55, 24, 34, 42);
          local(f, "roof", "roof", x, 34, -55, 27, 5, 45);
        }
        if (dioc) {
          local(f, "box", "brick", 0, 16, d * 0.24, 47, 32, 29);
          local(f, "roof", "roof", 0, 32, d * 0.24, 51, 8, 32);
          for (const side of [-1, 1])
            local(f, "dome", "stone", side * 24, 21, d * 0.24, 12, 12, 13);
        } else {
          const r = l.kind === "caracalla" ? 19 : 17;
          local(f, "cyl", "brick", 0, 13, d * 0.25, r, 26, r);
          local(f, "dome", "stone", 0, 26, d * 0.25, r + 1, r + 1, r + 1);
          for (let i = 0; i < 12; i++) {
            const t = (TAU * i) / 12;
            column(
              f,
              Math.cos(t) * (r + 1),
              d * 0.25 + Math.sin(t) * (r + 1),
              18,
              0.9,
              1,
              1,
            );
          }
        }
        for (const x of [-w * 0.24, w * 0.24])
          for (let z = 45; z < d * 0.4; z += 23) {
            local(f, "box", "green", x, 0.5, z, 42, 0.6, 16);
            for (const dx of [-15, 15]) pine(f, x + dx, z, 12, 1);
          }
        for (const side of [-1, 1]) {
          const g = ringGeo(44, 44, 36, 36, 13, 44, -Math.PI / 2, Math.PI);
          const m = mesh(g, "brick", f, side * (w / 2 - 3), 0, 35);
          m.rotation.y += side === -1 ? Math.PI : 0;
        }
      }
      function buildImperial(l) {
        const f = l.f;
        peristyle(f, l.w, l.d, 10);
        if (l.key === "peace") {
          for (const x of [-26, 26]) {
            local(f, "box", "green", x, 0.55, 0, 21, 0.6, 66);
            for (const z of [-22, 0, 22]) pine(f, x, z, 10, 1);
          }
          return;
        }
        // Temples are added at their separately georeferenced positions below.
        if (l.key === "nerva") {
          const ff = { ...f };
          const z = -l.d * 0.32;
          ff.x += Math.sin(f.yaw) * z;
          ff.z += Math.cos(f.yaw) * z;
          temple(ff, 22, 33, 11, 6, 7);
        }
      }
      function supportTerrace(l) {
        const f = l.f,
          structureW = l.structureW ?? l.w;
        local(f, "box", "stone", 0, -0.25, 0, structureW + 2, 0.7, l.d + 2);
        if (l.key !== "augustana") return;
        // The south-eastern palace extension is carried by the Severan arcades,
        // not by a retaining wall wrapped around every side of the plateau.
        // At this model scale, 18 m × 200 m keeps the upper strip close to the
        // archaeological park's approximate 3,500 m² figure.
        const bays = 17,
          bayWidth = l.d / bays,
          palaceEdge = l.w / 2,
          terraceReach = l.severanTerraceReach,
          edge = palaceEdge + terraceReach,
          terraceDepth = l.severanTerraceDepth,
          arcadeHeight = 23;
        local(
          f,
          "box",
          "stone",
          edge - terraceDepth / 2,
          -0.25,
          0,
          terraceDepth,
          0.7,
          l.d + 2,
        );
        for (let i = 0; i < bays; i++) {
          const v = -l.d / 2 + bayWidth * (i + 0.5);
          archBay(
            f,
            edge,
            -arcadeHeight,
            v,
            bayWidth * 0.88,
            arcadeHeight,
            2.8,
            Math.PI / 2,
            0,
            "brick",
          );
        }
        local(f, "box", "stone", edge, -0.7, 0, 3.4, 1.4, l.d + 2);
      }
      function buildPalace(l) {
        const f = l.f,
          w = l.structureW ?? l.w;
        supportTerrace(l);
        peristyle(f, w, l.d, 13);
        local(f, "box", "green", 0, 0.45, 0, w * 0.45, 0.6, l.d * 0.42);
        for (const z of [-l.d * 0.3, l.d * 0.3]) {
          local(f, "box", "brick", 0, 12, z, w * 0.76, 24, 32);
          local(f, "roof", "roof", 0, 24, z, 36, 6, w * 0.8, Math.PI / 2);
        }
        local(f, "cyl", "stone", 0, 0.8, 0, 11, 1, 11);
        local(f, "cyl", "water", 0, 1.4, 0, 9, 0.15, 9);
        for (const x of [-w * 0.27, w * 0.27])
          for (const z of [-l.d * 0.16, l.d * 0.16]) pine(f, x, z, 13, 1);
      }
      function buildMausoleum(l, isHadrian) {
        const f = l.f,
          r = isHadrian ? 32 : 43.5;
        if (isHadrian) local(f, "box", "marble", 0, 6, 0, 89, 12, 89);
        local(
          f,
          "cyl",
          "stone",
          0,
          isHadrian ? 23 : 9,
          0,
          r,
          isHadrian ? 26 : 18,
          r,
        );
        local(
          f,
          "cyl",
          "marble",
          0,
          isHadrian ? 36.5 : 18.7,
          0,
          r + 1,
          1.6,
          r + 1,
        );
        local(
          f,
          "cone",
          "green",
          0,
          isHadrian ? 41 : 27,
          0,
          r * 0.88,
          isHadrian ? 10 : 17,
          r * 0.88,
        );
        local(
          f,
          "cyl",
          "stone",
          0,
          isHadrian ? 47 : 35,
          0,
          r * 0.22,
          13,
          r * 0.22,
        );
        local(f, "box", "bronze", 0, isHadrian ? 55 : 44, 0, 3, 4, 3);
        for (let i = 0; i < 20; i++) {
          const t = (TAU * i) / 20;
          if (isHadrian)
            column(
              f,
              Math.cos(t) * (r + 0.2),
              Math.sin(t) * (r + 0.2),
              13,
              0.7,
              17,
              1,
            );
          else pine(f, Math.cos(t) * 30, Math.sin(t) * 30, 8, 1);
        }
      }
      function roundTemple(f, r = 10, h = 10) {
        local(f, "cyl", "stone", 0, 1, 0, r + 2, 2, r + 2);
        local(f, "cyl", "stone", 0, h / 2 + 2, 0, r * 0.64, h, r * 0.64);
        for (let i = 0; i < 20; i++) {
          const t = (TAU * i) / 20;
          column(f, Math.cos(t) * r, Math.sin(t) * r, h, 0.46, 2);
        }
        local(f, "cyl", "marble", 0, h + 3, 0, r + 1, 1.2, r + 1);
        local(f, "cone", "roof", 0, h + 6, 0, r + 1.4, 5, r + 1.4);
      }
      function triumphArch(f, width = 25, height = 21, triple = true) {
        const zDepth = 7.5;
        if (triple) {
          for (const x of [-9, -4.5, 4.5, 9])
            local(
              f,
              "box",
              "stone",
              x,
              7.3,
              0,
              x === -9 || x === 9 ? 4 : 2.6,
              14.6,
              zDepth,
            );
          archBay(f, 0, 0, 0, 8.6, 11, 7.6);
          for (const x of [-8, 8]) archBay(f, x, 0, 0, 4.6, 8.2, 7.7);
        } else {
          for (const x of [-5, 5])
            local(f, "box", "stone", x, 6, 0, 3, 12, zDepth);
          archBay(f, 0, 0, 0, 7, 10, 7.6);
        }
        local(f, "box", "marble", 0, height - 4, 0, width, 7.5, zDepth + 0.6);
        local(
          f,
          "box",
          "stone",
          0,
          height - 0.1,
          0,
          width + 1.5,
          0.8,
          zDepth + 1.5,
        );
        for (const z of [-zDepth / 2 - 0.5, zDepth / 2 + 0.5])
          for (const x of triple ? [-10, -5, 5, 10] : [-5, 5])
            column(f, x, z, height * 0.6, 0.62, 1, 1);
        local(
          f,
          "box",
          "shade",
          0,
          height - 3.5,
          zDepth / 2 + 0.5,
          width * 0.44,
          2.4,
          0.2,
          0,
          1,
        );
      }
      function geof(id, bearing) {
        const r = getRecord(id);
        return frame(r.lat, r.lon, bearing ?? r.siteGeometryBounds.bearingDeg);
      }
      function buildForumCore() {
        const f = forum.f;
        local(f, "box", "road", 0, 0.3, 0, 100, 0.6, 235);
        basilica(geof("173078007", 111), 48, 100, 18);
        basilica(geof("417632343", 111), 30, 98, 18);
        const curia = geof("837078212", 44);
        local(curia, "box", "brick", 0, 11, 0, 18, 22, 27);
        local(curia, "roof", "roof", 0, 22, 0, 21, 4, 30);
        local(curia, "box", "dark", 0, 6, -13.6, 4, 10, 0.18);
        roundTemple(geof("55302071", 0), 7.5, 9);
        temple(geof("193196776", 130), 22, 33, 12, 6, 8);
        triumphArch(geof("370240026", 130), 25, 20, true);
        triumphArch(geof("236855821", 21), 14, 15, false);
        const sat = frame(41.892451, 12.484065, 20);
        temple(sat, 22, 40, 13, 6, 9);
        const cast = frame(41.89152, 12.48555, 20);
        temple(cast, 26, 49, 13, 8, 11);
        roundTemple(geof("766385425", 20), 9, 13);
      }
      function buildLandmarks() {
        for (const l of landmarks) {
          switch (l.kind) {
            case "colosseum":
              buildColosseum(l);
              break;
            case "pantheon":
              buildPantheon(l);
              break;
            case "circus":
              buildCircus(l);
              break;
            case "stadium":
              buildCircus(l, true);
              break;
            case "theater":
              buildTheater(l);
              break;
            case "caracalla":
            case "diocletian":
            case "trajanBaths":
              buildBaths(l);
              break;
            case "imperial":
              buildImperial(l);
              break;
            case "palace":
              buildPalace(l);
              break;
            case "hadrian":
              buildMausoleum(l, true);
              break;
            case "augustTomb":
              buildMausoleum(l, false);
              break;
            case "temple":
              temple(
                l.f,
                l.w - 5,
                l.d - 6,
                l.w > 50 ? 20 : 12,
                l.w > 45 ? 8 : l.w < 15 ? 4 : 6,
                11,
              );
              break;
            case "roundTemple":
              roundTemple(l.f);
              break;
            case "arch":
              triumphArch(l.f);
              break;
            case "basilica":
              basilica(l.f, 80, 100, 29);
              break;
            case "venus":
              temple(l.f, 51, 112, 19, 10, 20);
              local(l.f, "box", "stone", 0, 1, 0, 100, 2, 145);
              break;
            case "trajan":
              peristyle(l.f, 128, 235, 12);
              basilica(geof("629324739", 45), 58, 170, 22);
              break;
          }
        }
        buildForumCore();
        temple(geof("898745908", 135), 27, 45, 13, 8, 11);
        temple(geof("823121346", 223), 49, 55, 18, 8, 10);
        const cf = geof("783489695", 0);
        local(cf, "box", "stone", 0, 3, 0, 6, 6, 6);
        local(cf, "cyl", "marble", 0, 21, 0, 1.83, 30, 1.83);
        local(cf, "cyl", "stone", 0, 36.7, 0, 2.1, 1.7, 2.1);
        local(cf, "box", "bronze", 0, 39, 0, 1.2, 3, 1.2);
        for (let i = 0; i < 23; i++) {
          const g = new THREE.TorusGeometry(1.88, 0.075, 3, 18);
          g.rotateX(Math.PI / 2);
          mesh(g, "shade", cf, 0, 6.5 + i * 1.27, 0, true);
        }
        const ludus = geof("594335209", 111);
        reserve(ludus, 78, 91);
        peristyle(ludus, 78, 91, 7);
        mesh(ringGeo(22, 31, 19, 27, 4, 64), "stone", ludus, 0, 0.3, 0);
        ellipseFloor(ludus, 19, 27, "sand", 0.5);
        const oct = geof("236573248", 130);
        reserve(oct, 100, 113);
        peristyle(oct, 100, 113, 10);
        const sf = geof("527986452", 0);
        local(sf, "box", "stone", 0, 4.5, 0, 14, 9, 14);
        local(sf, "box", "bronze", 0, 22, 0, 3.5, 13, 2.5);
        for (const x of [-1.3, 1.3])
          local(sf, "column", "bronze", x, 13, 0, 0.8, 10, 0.8);
        local(sf, "sphere", "bronze", 0, 30, 0, 1.8, 2.3, 1.8);
        local(sf, "box", "bronze", 4, 25, 0, 6, 1.1, 1.1, 0, 1, null, 0, -0.25);
      }
      function pine(f, x, z, h = 15, detail = 0) {
        local(
          f,
          "cyl",
          "wood",
          x,
          h * 0.38,
          z,
          0.45,
          h * 0.76,
          0.45,
          0,
          detail,
        );
        local(
          f,
          "sphere",
          "leaf",
          x,
          h * 0.8,
          z,
          h * 0.48,
          h * 0.22,
          h * 0.45,
          0,
          detail,
        );
        local(
          f,
          "sphere",
          "green",
          x - h * 0.19,
          h * 0.84,
          z + h * 0.08,
          h * 0.32,
          h * 0.18,
          h * 0.32,
          0,
          detail,
        );
      }
      let wallLength = 0,
        wallTowers = 0,
        houseCount = 0,
        ruralPineCount = 0;
      const projectedGates = GEO.gates
        .filter((g) => g.id !== "porta-clausa")
        .map((g) => {
          const source = xy(g.lat, g.lon);
          let best = { d: Infinity };
          for (const path of wallPaths)
            for (let i = 0; i < path.length - 1; i++) {
              const a = path[i],
                b = path[i + 1],
                q = pointSegment(source.x, source.y, a, b);
              if (q.d < best.d)
                best = {
                  d: q.d,
                  p: a.clone().lerp(b, q.t),
                  yaw: Math.atan2(b.x - a.x, b.y - a.y),
                };
            }
          return {
            ...g,
            p: best.p,
            yaw: best.yaw,
            small: /pinciana|asinaria|metronia|settimiana/.test(g.id),
          };
        });
      function makeWalls() {
        const usedGates = new Set();
        for (const path of wallPaths) {
          let towerOffset = 0;
          for (let i = 0; i < path.length - 1; i++) {
            const a = path[i],
              b = path[i + 1],
              dx = b.x - a.x,
              dz = b.y - a.y,
              length = Math.hypot(dx, dz),
              yaw = Math.atan2(dx, dz);
            wallLength += length;
            const steps = Math.max(1, Math.ceil(length / 6));
            for (let j = 0; j < steps; j++) {
              const t = (j + 0.5) / steps,
                x = lerp(a.x, b.x, t),
                z = lerp(a.y, b.y, t),
                r = riverMetric(x, z);
              if (r.distance < riverWidth(r.index) + 5) continue;
              let gate = null;
              for (const g of projectedGates)
                if (Math.hypot(x - g.p.x, z - g.p.y) < (g.small ? 3.5 : 6.5)) {
                  gate = g;
                  break;
                }
              if (gate) {
                if (!usedGates.has(gate.id)) {
                  usedGates.add(gate.id);
                  const ff = {
                    x: gate.p.x,
                    z: gate.p.y,
                    y: heightAt(gate.p.x, gate.p.y),
                    yaw: gate.yaw + Math.PI / 2,
                  };
                  const small = gate.small;
                  archBay(
                    ff,
                    0,
                    0,
                    0,
                    small ? 4.2 : 7.5,
                    small ? 4.6 : 7.0,
                    3.5,
                  );
                  local(
                    ff,
                    "box",
                    "brick",
                    0,
                    small ? 6 : 8,
                    0,
                    small ? 6 : 12,
                    2,
                    4,
                  );
                  if (!small)
                    for (const side of [-1, 1]) {
                      local(ff, "box", "brick", side * 9, 5, 0, 6, 10, 7);
                      local(
                        ff,
                        "box",
                        "stone",
                        side * 9,
                        10.4,
                        0,
                        6.8,
                        0.8,
                        7.8,
                      );
                    }
                }
                continue;
              }
              const y = heightAt(x, z);
              add(
                "box",
                "brick",
                x,
                y + 3.25,
                z,
                3.5,
                6.5,
                length / steps + 0.3,
                yaw,
              );
              add(
                "box",
                "stone",
                x,
                y + 6.55,
                z,
                3.8,
                0.5,
                length / steps + 0.3,
                yaw,
              );
              for (const dt of [-0.22, 0.22]) {
                const xx = lerp(a.x, b.x, clamp(t + dt / steps, 0, 1)),
                  zz = lerp(a.y, b.y, clamp(t + dt / steps, 0, 1));
                add(
                  "box",
                  "brick",
                  xx,
                  heightAt(xx, zz) + 7.05,
                  zz,
                  3.7,
                  0.6,
                  1.4,
                  yaw,
                  1,
                );
              }
            }
            for (let d = towerOffset; d < length; d += 30) {
              const t = d / length,
                x = lerp(a.x, b.x, t),
                z = lerp(a.y, b.y, t),
                r = riverMetric(x, z);
              if (
                r.distance < riverWidth(r.index) + 7 ||
                projectedGates.some(
                  (g) => Math.hypot(x - g.p.x, z - g.p.y) < 21,
                )
              )
                continue;
              const y = heightAt(x, z);
              add("box", "brick", x, y + 5.2, z, 6.6, 10.4, 6.6, yaw);
              add("box", "stone", x, y + 10.65, z, 7.1, 0.5, 7.1, yaw);
              for (const side of [-1, 1]) {
                add(
                  "box",
                  "brick",
                  x + Math.cos(yaw) * side * 3,
                  y + 11.5,
                  z - Math.sin(yaw) * side * 3,
                  0.8,
                  1.4,
                  6.8,
                  yaw,
                  1,
                );
                add(
                  "box",
                  "brick",
                  x + Math.sin(yaw) * side * 3,
                  y + 11.5,
                  z + Math.cos(yaw) * side * 3,
                  6.8,
                  1.4,
                  0.8,
                  yaw,
                  1,
                );
              }
              wallTowers++;
            }
            towerOffset = (30 - ((length - towerOffset) % 30)) % 30;
          }
        }
      }
      function house(x, z, w, d, h, yaw, type) {
        const c = Math.cos(yaw),
          s = Math.sin(yaw),
          levels = [];
        for (const xx of [-w / 2, w / 2])
          for (const zz of [-d / 2, d / 2])
            levels.push(heightAt(x + c * xx + s * zz, z - s * xx + c * zz));
        const y = Math.max(...levels, heightAt(x, z)),
          low = Math.min(...levels),
          f = { x, z, y, yaw };
        if (y - low > 6.5) return; // Do not mask scarps with procedural houses.
        const color = new THREE.Color().setHSL(
          0.075 + rnd() * 0.036,
          0.2 + rnd() * 0.14,
          0.54 + rnd() * 0.22,
        );
        const roofColor = new THREE.Color().setHSL(
          0.035 + rnd() * 0.03,
          0.36 + rnd() * 0.17,
          0.35 + rnd() * 0.14,
        );
        local(
          f,
          "box",
          "shade",
          0,
          -(y - low) / 2,
          0,
          w + 1,
          y - low + 1,
          d + 1,
        );
        if (type < 0.22 && w > 21) {
          const t = w * 0.27;
          for (const side of [-1, 1]) {
            local(
              f,
              "box",
              "house",
              (side * (w - t)) / 2,
              h / 2,
              0,
              t,
              h,
              d,
              0,
              0,
              color,
            );
            local(
              f,
              "roof",
              "house",
              (side * (w - t)) / 2,
              h,
              0,
              t + 1.4,
              2.8,
              d + 1.4,
              0,
              0,
              roofColor,
            );
          }
          for (const side of [-1, 1]) {
            local(
              f,
              "box",
              "house",
              0,
              h / 2,
              (side * (d - t)) / 2,
              w - t * 2,
              h,
              t,
              0,
              0,
              color,
            );
            local(
              f,
              "roof",
              "house",
              0,
              h,
              (side * (d - t)) / 2,
              t + 1.5,
              2.6,
              w - t * 2 + 1.5,
              Math.PI / 2,
              0,
              roofColor,
            );
          }
        } else {
          local(f, "box", "house", 0, h / 2, 0, w, h, d, 0, 0, color);
          local(
            f,
            "roof",
            "house",
            0,
            h,
            0,
            w + 1.5,
            Math.min(w * 0.23, 4.5),
            d + 1.4,
            0,
            0,
            roofColor,
          );
        }
        if (rnd() < 0.68) {
          for (const side of [-1, 1])
            for (let floor = 1; floor < h / 3.5; floor++)
              for (let i = 0; i < 3; i++) {
                const xx = (i - 1) * w * 0.27;
                local(
                  f,
                  "box",
                  "dark",
                  xx,
                  floor * 3.4,
                  side * (d / 2 + 0.08),
                  1.15,
                  1.45,
                  0.12,
                  0,
                  1,
                );
              }
          local(
            f,
            "box",
            "dark",
            w * 0.17,
            1.5,
            -d / 2 - 0.1,
            2,
            3,
            0.15,
            0,
            1,
          );
          local(f, "box", "stone", 0, h - 0.25, 0, w + 1, 0.55, d + 1, 0, 1);
        }
        houseCount++;
      }
      function makeCity() {
        const districts = [
          { lat: 41.903, lon: 12.4805, yaw: 0.06, span: 1300, step: 34 },
          { lat: 41.896, lon: 12.4775, yaw: 0.04, span: 1100, step: 31 },
          { lat: 41.889, lon: 12.4706, yaw: 0.32, span: 1250, step: 38 },
          { lat: 41.882, lon: 12.484, yaw: -0.58, span: 1050, step: 38 },
          { lat: 41.8938, lon: 12.501, yaw: -0.69, span: 1550, step: 37 },
          { lat: 41.9068, lon: 12.4995, yaw: -0.79, span: 1300, step: 38 },
          { lat: 41.882, lon: 12.5015, yaw: -0.55, span: 1250, step: 42 },
          { lat: 41.899, lon: 12.488, yaw: -0.62, span: 1200, step: 32 },
        ].map((d) => ({ ...d, p: xy(d.lat, d.lon) }));
        for (let di = 0; di < districts.length; di++) {
          const d = districts[di],
            c = Math.cos(d.yaw),
            s = Math.sin(d.yaw);
          for (let u = -d.span; u <= d.span; u += d.step)
            for (let v = -d.span; v <= d.span; v += d.step) {
              const x = d.p.x + c * u + s * v,
                z = d.p.y - s * u + c * v;
              let closest = 0,
                min = Infinity;
              for (let j = 0; j < districts.length; j++) {
                const dd =
                  (x - districts[j].p.x) ** 2 + (z - districts[j].p.y) ** 2;
                if (dd < min) {
                  closest = j;
                  min = dd;
                }
              }
              if (closest !== di || !insidePolygon(x, z, perimeter)) continue;
              const river = riverMetric(x, z);
              if (
                river.distance < riverWidth(river.index) + 24 ||
                civicExcluded(x, z) ||
                nearRoad(x, z, 13)
              )
                continue;
              let inWall = false;
              for (const path of wallPaths) {
                for (let i = 0; i < path.length - 1; i++)
                  if (pointSegment(x, z, path[i], path[i + 1]).d < 21) {
                    inWall = true;
                    break;
                  }
                if (inWall) break;
              }
              if (inWall) continue;
              const sparse = z > 1350 || x > 1300 || z < -1500 ? 0.49 : 0.83;
              if (rnd() > sparse) continue;
              const w = 15 + rnd() * (d.step - 22),
                depth = 15 + rnd() * (d.step - 21),
                h = 7 + rnd() * 12;
              house(
                x + (rnd() - 0.5) * 3,
                z + (rnd() - 0.5) * 3,
                w,
                depth,
                h,
                d.yaw + (rnd() - 0.5) * 0.09,
                rnd(),
              );
            }
        }
        // Small rural farms and vegetation outside the walls provide geographic context.
        for (let i = 0; i < 2300; i++) {
          const x = (rnd() - 0.5) * 8500,
            z = (rnd() - 0.5) * 8400,
            r = riverMetric(x, z);
          if (
            r.distance < riverWidth(r.index) + 11 ||
            civicExcluded(x, z) ||
            nearRoad(x, z, 4)
          )
            continue;
          const inside = insidePolygon(x, z, perimeter);
          if (inside && rnd() > 0.22) continue;
          const f = { x, z, y: heightAt(x, z), yaw: rnd() * TAU };
          // Individual spherical crowns farther away alias into black dots in
          // the full-quality horizon. Nearby vegetation retains the 3D trees;
          // distant countryside is represented by terrain and farm plots.
          if (Math.hypot(x, z) < 2300) {
            pine(f, 0, 0, 9 + rnd() * 10, 1);
            ruralPineCount++;
          }
          if (!inside && rnd() < 0.045) {
            house(x + 25, z, 15, 24, 6, rnd() * TAU, 0.8);
            local(f, "box", "green", -25, 0.3, 0, 34, 0.3, 90);
          }
        }
      }
      function bridge(coords, name, width = 7, count = null) {
        const a = xy(coords[0][1], coords[0][0]),
          b = xy(coords[1][1], coords[1][0]),
          delta = b.clone().sub(a),
          length = delta.length(),
          mid = a.clone().add(b).multiplyScalar(0.5),
          yaw = Math.atan2(delta.x, delta.y),
          f = { x: mid.x, z: mid.y, y: 12.3, yaw };
        const deckH = 8.5;
        local(f, "box", "stone", 0, deckH, 0, width, 1.5, length);
        for (const side of [-1, 1])
          local(
            f,
            "box",
            "stone",
            side * (width / 2 - 0.3),
            deckH + 1.25,
            0,
            0.65,
            1.0,
            length,
          );
        const n = count || Math.max(2, Math.round(length / 22)),
          bay = length / n;
        for (let i = 0; i < n; i++) {
          const z = (i + 0.5) * bay - length / 2;
          local(
            f,
            "arch",
            "stone",
            0,
            3.4,
            z,
            bay / 2,
            4.0,
            width,
            Math.PI / 2,
          );
          const pierZ = z - bay / 2;
          local(f, "box", "stone", 0, 3.3, pierZ, width + 2, 6.6, 3.2);
        }
      }
      function makeWaterLandmarks() {
        if (!GEO.water) return;
        for (const b of GEO.water.bridges) {
          bridge(b.endpoints, b.nameJa, b.width || 7, b.arches);
        }
        if (GEO.water.island) {
          const p = GEO.water.island.polygon.map((v) => xy(v[1], v[0]));
          const shape = new THREE.Shape(
            p.map((v) => new THREE.Vector2(v.x, -v.y)),
          );
          const g = new THREE.ExtrudeGeometry(shape, {
            depth: 4.5,
            bevelEnabled: false,
          });
          g.rotateX(-Math.PI / 2);
          mesh(g, "sand", null, 0, 11, 0);
          const c = GEO.water.island.center;
          const f = frame(c.lat, c.lon, 125, 15.8);
          reserve(f, 65, 260, false);
          temple(f, 19, 43, 10, 6, 9);
          for (const z of [-58, 58]) {
            local(f, "box", "brick", 0, 5, z, 27, 10, 27);
            local(f, "roof", "roof", 0, 10, z, 30, 4, 29);
          }
          for (const z of [-88, 85]) pine(f, 0, z, 12, 1);
        }
      }
      let aqueductBays = 0;
      // The first short mapped fragment is retained and the documented
      // Porta Maggiore–Caelian–Palatine relationship is continued as a
      // deliberately schematic line in geo.json.
      function makeAqueduct() {
        if (!GEO.water?.aqueduct) return;
        const model = GEO.water.aqueductModel,
          p = aqueductPath;
        for (let k = 0; k < p.length - 1; k++) {
          const a = p[k],
            b = p[k + 1],
            d = b.clone().sub(a),
            len = d.length(),
            yaw = Math.atan2(d.x, d.y),
            n = Math.ceil(len / model.bayM),
            bay = len / n;
          exclusions.push({
            x: (a.x + b.x) / 2,
            z: (a.y + b.y) / 2,
            yaw: yaw + Math.PI / 2,
            w: len + 8,
            d: 40,
          });
          for (let i = 0; i < n; i++) {
            const x = lerp(a.x, b.x, (i + 0.5) / n),
              z = lerp(a.y, b.y, (i + 0.5) / n),
              f = { x, z, y: heightAt(x, z), yaw: yaw + Math.PI / 2 };
            archBay(f, 0, 0, 0, bay * 0.92, model.heightM, 3.2, 0, 0, "brick");
            local(
              f,
              "box",
              "stone",
              0,
              model.heightM + 1.35,
              0,
              bay + 0.7,
              2.7,
              3.6,
            );
            aqueductBays++;
          }
        }
      }
      let quality = "full",
        tour = null,
        transition = null,
        animationFrames = 0,
        lastRenderTime = 0,
        lastHUD = 0,
        frameWindow = performance.now(),
        frameCount = 0,
        currentFPS = 0,
        ready = false;
      const reducedMotion = matchMedia(
        "(prefers-reduced-motion:reduce)",
      ).matches;
      const views = {
        forum: {
          target: [forum.f.x + 20, forum.f.y + 10, forum.f.z + 55],
          offset: [800, 650, 1050],
        },
        colosseum: {
          target: [colosseum.f.x, colosseum.f.y + 15, colosseum.f.z],
          offset: [260, 245, 290],
        },
        pantheon: {
          target: [pantheon.f.x, pantheon.f.y + 16, pantheon.f.z - 5],
          offset: [190, 160, -190],
        },
        palatine: {
          target: [xy(41.8893064,12.4871093).x, 57, xy(41.8893064,12.4871093).y],
          offset: [-360, 250, 430],
        },
        aqueduct: {
          target: [aqueduct.f.x, aqueduct.f.y + 10, aqueduct.f.z],
          offset: [420, 260, 520],
        },
        capitoline: {
          target: [capitol.f.x, capitol.f.y+12, capitol.f.z],
          offset: [-230, 190, 330],
        },
        circus: {
          target: [circus.f.x, circus.f.y + 12, circus.f.z],
          offset: [-390, 300, 510],
        },
        caracalla: {
          target: [caracalla.f.x, caracalla.f.y + 22, caracalla.f.z],
          offset: [430, 340, 470],
        },
        diocletian: {
          target: [diocletian.f.x, diocletian.f.y + 22, diocletian.f.z],
          offset: [-420, 360, 460],
        },
        hadrian: {
          target: [hadrian.f.x, hadrian.f.y + 18, hadrian.f.z],
          offset: [280, 240, -330],
        },
        overview: { target: [-70, 40, 40], offset: [2900, 4050, 4400] },
      };
      const visitedPlaces = new Set(["forum"]);
      function v3(a) {
        return new THREE.Vector3(...a);
      }
      function preset(key) {
        const view = views[key];
        const target = v3(view.target);
        return { target, position: target.clone().add(v3(view.offset)) };
      }
      function showToast(text, ms = 2500) {
        $("toast").textContent = text;
        $("toast").classList.add("visible");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(
          () => $("toast").classList.remove("visible"),
          ms,
        );
      }
      function clearDamping() {
        const pos = camera.position.clone(),
          target = controls.target.clone(),
          d = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = d;
        camera.position.copy(pos);
        controls.target.copy(target);
        camera.lookAt(target);
      }
      function markVisited(key) {
        if (!document.querySelector(`.site-card[data-place="${key}"]`)) return;
        visitedPlaces.add(key);
        document
          .querySelectorAll(".site-card[data-place]")
          .forEach((card) =>
            card.classList.toggle("visited", visitedPlaces.has(card.dataset.place)),
          );
        $("visited-count").textContent = `${visitedPlaces.size} / 9`;
      }
      function stopTour(silent = false) {
        if (!tour) return;
        tour = null;
        controls.enabled = true;
        clearDamping();
        $("tour-button").setAttribute("aria-pressed", "false");
        $("tour-title").textContent = "空から巡る";
        $("tour-time").textContent = "15 秒";
        $("tour-progress").style.transform = "scaleX(0)";
        $("play-icon").innerHTML =
          '<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>';
        if (!silent) showToast("デモを終了しました");
      }
      function cancelMotion() {
        stopTour(true);
        if (transition) {
          transition = null;
          controls.enabled = true;
          clearDamping();
        }
      }
      function goTo(key) {
        cancelMotion();
        const p = preset(key);
        markVisited(key);
        if (reducedMotion) {
          camera.position.copy(p.position);
          controls.target.copy(p.target);
          camera.lookAt(p.target);
          controls.update();
        } else {
          clearDamping();
          controls.enabled = false;
          transition = {
            start: performance.now(),
            duration: 1250,
            fromPos: camera.position.clone(),
            toPos: p.position,
            fromTarget: controls.target.clone(),
            toTarget: p.target,
          };
        }
        document
          .querySelectorAll("[data-place]")
          .forEach((el) =>
            el.setAttribute("aria-current", String(el.dataset.place === key)),
          );
        if ($("discover-dialog").open) $("discover-dialog").close();
      }
      function startTour() {
        if (tour) {
          stopTour();
          return;
        }
        cancelMotion();
        clearDamping();
        const p1 = preset("colosseum"),
          p2 = {
            target: v3([forum.f.x, forum.f.y + 10, forum.f.z]),
            position: v3([forum.f.x + 380, forum.f.y + 440, forum.f.z + 620]),
          },
          p3 = preset("pantheon"),
          p4 = preset("overview");
        controls.enabled = false;
        tour = {
          start: performance.now(),
          duration: 15000,
          cameraCurve: new THREE.CatmullRomCurve3(
            [
              camera.position.clone(),
              p1.position,
              p2.position,
              p3.position,
              p4.position,
            ],
            false,
            "centripetal",
          ),
          targetCurve: new THREE.CatmullRomCurve3(
            [
              controls.target.clone(),
              p1.target,
              p2.target,
              p3.target,
              p4.target,
            ],
            false,
            "centripetal",
          ),
        };
        $("tour-button").setAttribute("aria-pressed", "true");
        $("tour-title").textContent = "デモを停止";
        $("play-icon").innerHTML =
          '<path d="M7 7h10v10H7z" fill="currentColor" stroke="none"/>';
        showToast("コロッセオから都の全景へ", 2300);
      }
      function setQuality(mode, notify = true) {
        quality = mode;
        const full = mode === "full";
        detailRoot.visible = full;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, full ? 1.6 : 1));
        renderer.setSize(innerWidth, innerHeight);
        sun.shadow.mapSize.set(full ? 4096 : 1536, full ? 4096 : 1536);
        sun.shadow.normalBias = full ? 0.65 : 1.3;
        if (waterMaterial)
          waterMaterial.uniforms.animateWater.value = full ? 1 : 0;
        renderer.shadowMap.needsUpdate = true;
        sun.shadow.needsUpdate = true;
        shadowSpan = 0;
        $("full-mode").setAttribute("aria-pressed", String(full));
        $("light-mode").setAttribute("aria-pressed", String(!full));
        if (notify)
          showToast(
            full
              ? "フル：細部・高精細な影・動く水面"
              : "軽量：主要建築と地理は共通、描画負荷を削減",
          );
      }
      function updateShadow() {
        const distance = camera.position.distanceTo(controls.target),
          desiredSpan = clamp(distance * 0.85, 360, 4600),
          span = Math.ceil(desiredSpan / 64) * 64,
          mapSize = sun.shadow.mapSize.x,
          texel = (span * 2) / mapSize,
          lightX = lightRight.dot(controls.target),
          lightY = lightUp.dot(controls.target),
          snappedX = Math.round(lightX / texel) * texel,
          snappedY = Math.round(lightY / texel) * texel,
          center = controls.target
            .clone()
            .addScaledVector(lightRight, snappedX - lightX)
            .addScaledVector(lightUp, snappedY - lightY);
        if (
          center.distanceToSquared(shadowCenter) > texel * texel * 0.25 ||
          span !== shadowSpan
        ) {
          shadowCenter.copy(center);
          shadowSpan = span;
          sun.position.copy(center).add(sunOffset);
          sun.target.position.copy(center);
          const c = sun.shadow.camera;
          c.left = -span;
          c.right = span;
          c.top = span;
          c.bottom = -span;
          c.updateProjectionMatrix();
          renderer.shadowMap.needsUpdate = true;
          sun.shadow.needsUpdate = true;
          shadowUpdates++;
        }
      }
      const mapCanvas = $("mini-map"),
        mapCtx = mapCanvas.getContext("2d");
      const mapBox = { x0: -2750, x1: 2450, z0: -2300, z1: 2550 };
      function mapPoint(x, z) {
        return [
          ((x - mapBox.x0) / (mapBox.x1 - mapBox.x0)) * mapCanvas.width,
          ((z - mapBox.z0) / (mapBox.z1 - mapBox.z0)) * mapCanvas.height,
        ];
      }
      function mapPath(points, close = false) {
        mapCtx.beginPath();
        points.forEach((p, i) => {
          const [x, y] = mapPoint(p.x, p.y);
          i ? mapCtx.lineTo(x, y) : mapCtx.moveTo(x, y);
        });
        if (close) mapCtx.closePath();
      }
      function updateMap() {
        const c = mapCtx,
          w = mapCanvas.width,
          h = mapCanvas.height;
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#e5e7d6";
        c.fillRect(0, 0, w, h);
        mapPath(perimeter, true);
        c.fillStyle = "#ede4cf";
        c.fill();
        for(const hill of hills) {
          const [hx,hy]=mapPoint(hill.p.x,hill.p.y);
          c.fillStyle="#87996d35";c.beginPath();
          c.ellipse(hx,hy,hill.radiusEastM/(mapBox.x1-mapBox.x0)*w,
            hill.radiusNorthM/(mapBox.z1-mapBox.z0)*h,0,0,TAU);c.fill();
        }
        for (const riverLine of [riverSamples, riverBranch]) {
          mapPath(riverLine);
          c.strokeStyle = "#71a096";
          c.lineWidth = 6;
          c.lineJoin = "round";
          c.lineCap = "round";
          c.stroke();
        }
        mapPath(aqueductPath);
        c.strokeStyle = "#a46f50";
        c.lineWidth = 2.5;
        c.lineJoin = "round";
        c.setLineDash([6, 4]);
        c.stroke();
        c.setLineDash([]);
        for (const p of wallPaths) {
          mapPath(p);
          c.strokeStyle = "#9d7b4d";
          c.lineWidth = 2;
          c.stroke();
        }
        for (const l of landmarks) {
          const [x, y] = mapPoint(l.f.x, l.f.z);
          c.fillStyle = l.major ? "#66765a" : "#b1ac8a";
          c.beginPath();
          c.arc(x, y, l.major ? 2.5 : 1.2, 0, TAU);
          c.fill();
        }
        const [tx, ty] = mapPoint(controls.target.x, controls.target.z);
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const angle = Math.atan2(direction.x, -direction.z);
        c.save();
        c.translate(tx, ty);
        c.rotate(angle);
        c.fillStyle = "#2e57452c";
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-31, -55);
        c.lineTo(31, -55);
        c.closePath();
        c.fill();
        c.strokeStyle = "#fff8e4";
        c.lineWidth = 3;
        c.fillStyle = "#315b46";
        c.beginPath();
        c.arc(0, 0, 5.5, 0, TAU);
        c.fill();
        c.stroke();
        c.restore();
        c.strokeStyle = "#52674a";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(w - 102, h - 30);
        c.lineTo(w - 62, h - 30);
        c.stroke();
        c.fillStyle = "#55664d";
        c.font = "17px system-ui";
        c.fillText("500 m", w - 107, h - 38);
        $("compass-needle").style.transform = "rotate(" + -angle + "rad)";
      }
      const labelObjects = [];
      function makeLabels() {
        for (const l of landmarks.filter(
          (x) => x.major || ["stadium", "venus", "marcellus"].includes(x.key),
        )) {
          const el = document.createElement("div");
          el.className = "landmark-label" + (l.major ? " major" : "");
          el.textContent = l.key === "flavia" ? "パラティーノ宮殿" : l.name;
          el.style.visibility = "hidden";
          $("labels").appendChild(el);
          const width = el.getBoundingClientRect().width;
          el.hidden = true;
          el.style.visibility = "";
          labelObjects.push({ l, el, width });
        }
        for(const h of hills) {
          const el=document.createElement("div");
          el.className="landmark-label hill-label";el.textContent=h.name;el.style.visibility="hidden";
          $("labels").appendChild(el);
          const width=el.getBoundingClientRect().width;el.hidden=true;el.style.visibility="";
          labelObjects.push({el,width,l:{key:h.id,name:h.name,isHill:true,major:true,
            f:{x:h.p.x,z:h.p.y,y:heightAt(h.p.x,h.p.y)},labelHeight:14}});
        }
      }
      let lastPlace = "";
      function updateHUD() {
        const pos = ll(controls.target.x, controls.target.z);
        $("lat-lon").textContent =
          pos.lat.toFixed(4) + "° N　" + pos.lon.toFixed(4) + "° E";
        const distance = camera.position.distanceTo(controls.target);
        $("height-label").textContent = distance > 3800 ? "全市域" : "鳥瞰";
        let selected = null,
          min = Infinity;
        for (const l of landmarks) {
          const d = Math.hypot(
            l.f.x - controls.target.x,
            l.f.z - controls.target.z,
          );
          if (d < min) {
            min = d;
            selected = l;
          }
        }
        let name, description;
        if (distance > 4800) {
          name = "アウレリアヌス城壁内外";
          description =
            "テヴェレ川と丘に広がるローマ。城壁に囲まれた市街と、周辺の地形を見渡す。";
        } else if (min > 520) {
          const river = riverMetric(controls.target.x, controls.target.z);
          if (river.distance < 180) {
            name = "テヴェレ川沿い";
            description =
              "都市を南北に貫く川。低い河岸と橋が、市街の両岸をつなぐ。";
          } else {
            name = "ローマ市街";
            description =
              "大理石の公共建築と、赤茶色の屋根の住居が重なる街並み。";
          }
        } else {
          name = selected.name + (min > 150 ? "周辺" : "");
          description = selected.description;
        }
        const currentHill = hills.find(h => terrainModel.hillWeight(h,controls.target.x,controls.target.z) > .88);
        if (currentHill && min > 150 && distance < 2200) {
          name=currentHill.name;
          description="丘上の台地と周囲の谷の高低差。地表は史料に基づく概略モデルで、標高差は誇張していません。";
        }
        if (name !== lastPlace) {
          $("place-name").textContent = name;
          $("place-description").textContent = description;
          lastPlace = name;
        }
        $("mode-status").textContent =
          (quality === "full" ? "フル" : "軽量") +
          " · " +
          Math.round(currentFPS) +
          " fps";
        if (document.body.classList.contains("labels-hidden") || document.body.classList.contains("ui-hidden")) {
          if (!document.body.classList.contains("ui-hidden")) updateMap();
          return;
        }
        const uiRects=[...document.querySelectorAll("#brand,#place-panel,#render-panel,#display-panel,#navigation,#map-panel,#help,#notice")]
          .filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
        const boxes = [];
        const sorted = [...labelObjects].sort(
          (a, b) =>
            (a.l === selected ? -1 : b.l === selected ? 1 : 0) ||
            Number(b.l.isHill || false) - Number(a.l.isHill || false) ||
            Number(b.l.major) - Number(a.l.major) ||
            Math.hypot(a.l.f.x-controls.target.x,a.l.f.z-controls.target.z) -
            Math.hypot(b.l.f.x-controls.target.x,b.l.f.z-controls.target.z),
        );
        let shown = 0, hillsShown = 0;
        for (const o of sorted) {
          const v = new THREE.Vector3(
            o.l.f.x,
            o.l.f.y + (o.l.labelHeight || 30),
            o.l.f.z,
          ).project(camera);
          const sx = (v.x * 0.5 + 0.5) * innerWidth,
            sy = (-v.y * 0.5 + 0.5) * innerHeight;
          const labelWidth = Math.max(
              75,
              o.width || o.l.name.length * 12 + 22,
            ),
            box = { x: sx - labelWidth / 2, y: sy - 26, w: labelWidth, h: 37 };
          const ui = uiRects.some(r => box.x < r.right+8 && box.x+box.w > r.left-8 &&
            box.y < r.bottom+8 && box.y+box.h > r.top-8);
          const overlap = boxes.some(
            (b) =>
              box.x < b.x + b.w + 12 &&
              box.x + box.w + 12 > b.x &&
              box.y < b.y + b.h &&
              box.y + box.h > b.y,
          );
          const visible =
            v.z < 1 &&
            v.z > -1 &&
            sx > 40 &&
            sx < innerWidth - 40 &&
            sy > 75 &&
            sy < innerHeight - 100 &&
            !ui &&
            !overlap &&
            (!o.l.isHill || hillsShown < 2) &&
            shown < (innerWidth < 760 ? 4 : 7) &&
            (distance < 5600 || o.l.major);
          o.el.hidden = !visible;
          if (visible) {
            o.el.style.left = sx + "px";
            o.el.style.top = sy - 12 + "px";
            o.el.classList.toggle("selected", o.l === selected && min < 180);
            boxes.push(box);
            shown++;
            if(o.l.isHill) hillsShown++;
          }
        }
        updateMap();
      }
      function setupSources() {
        const urls = [
          [
            "ローマ市：アウレリアヌス期の城壁",
            "https://www.sovraintendenzaroma.it/content/le-mura-di-aureliano-e-di-onorio",
          ],
          [
            "城壁バーチャル博物館：地理資料",
            "https://museovirtualedellemura.romasitounesco.it/il-progetto/",
          ],
          [
            "Pleiades：地名・遺構データ",
            "https://github.com/isawnyu/pleiades.datasets",
          ],
          ["テヴェレ川：地理データ", "https://pleiades.stoa.org/places/423080"],
          ["ローマ市：コロッセオ", "https://www.turismoroma.it/en/node/1155"],
          [
            "ローマ市：キルクス・マクシムス",
            "https://www.turismoroma.it/en/places/circus-maximus",
          ],
          [
            "パドヴァ大学：ディオクレティアヌス浴場",
            "https://tess.beniculturali.unipd.it/web/scheda-stampa/?recid=13256",
          ],
          [
            "Three.js：使用バージョン",
            "https://github.com/mrdoob/three.js/releases/tag/r180",
          ],
        ];
        for(const source of GEO.terrainModel.sources) urls.push([source.title,source.url]);
        for (const [label, href] of urls) {
          const a = document.createElement("a");
          a.textContent = label;
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          $("source-links").appendChild(a);
        }
        const details = document.createElement("details");
        details.style.marginTop = "18px";
        const summary = document.createElement("summary");
        summary.textContent =
          "各遺構の位置データ（" + landmarkData.length + "件）";
        details.appendChild(summary);
        const list = document.createElement("ul");
        for (const l of landmarkData) {
          const li = document.createElement("li"),
            a = document.createElement("a");
          a.textContent =
            l.nameJa + " — " + l.lat.toFixed(5) + ", " + l.lon.toFixed(5);
          a.href = l.source;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          li.appendChild(a);
          list.appendChild(li);
        }
        details.appendChild(list);
        $("source-links").after(details);
      }
      function wireUI() {
        window.addEventListener("roma-display-change",()=>{lastHUD=0;if(ready) updateHUD();});
        $("full-mode").onclick = () => setQuality("full");
        $("light-mode").onclick = () => setQuality("light");
        $("tour-button").onclick = startTour;
        document
          .querySelectorAll("[data-place]")
          .forEach((el) => (el.onclick = () => goTo(el.dataset.place)));
        $("source-button").onclick = () => {
          cancelMotion();
          $("source-dialog").showModal();
        };
        $("close-sources").onclick = () => $("source-dialog").close();
        $("discover-button").onclick = () => {
          cancelMotion();
          $("discover-dialog").showModal();
        };
        $("close-discover").onclick = () => $("discover-dialog").close();
        $("source-dialog").addEventListener("click", (e) => {
          if (e.target === $("source-dialog")) {
            const r = e.target.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              e.target.close();
          }
        });
        $("discover-dialog").addEventListener("click", (e) => {
          if (e.target === $("discover-dialog")) {
            const r = e.target.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              e.target.close();
          }
        });
        renderer.domElement.addEventListener(
          "pointerdown",
          () => {
            cancelMotion();
            $("viewport").focus({ preventScroll: true });
          },
          true,
        );
        renderer.domElement.addEventListener("wheel", cancelMotion, {
          capture: true,
          passive: true,
        });
        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape") cancelMotion();
          if (e.target === $("viewport") && e.key.startsWith("Arrow"))
            cancelMotion();
        });
        window.addEventListener("resize", () => {
          camera.aspect = innerWidth / innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(innerWidth, innerHeight);
          lastHUD = 0;
        });
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) cancelMotion();
        });
        renderer.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          ready = false;
          $("loading").classList.remove("gone");
          $("loading").hidden = false;
          window.romaLoadFailure(
            "3D描画の接続が失われました。ほかの重い処理を閉じ、再読み込みしてください。",
          );
        });
        mapCanvas.addEventListener("click", (e) => {
          const r = mapCanvas.getBoundingClientRect(),
            x = lerp(mapBox.x0, mapBox.x1, (e.clientX - r.left) / r.width),
            z = lerp(mapBox.z0, mapBox.z1, (e.clientY - r.top) / r.height);
          cancelMotion();
          const delta = new THREE.Vector3(
            x - controls.target.x,
            0,
            z - controls.target.z,
          );
          controls.target.add(delta);
          camera.position.add(delta);
          controls.update();
        });
      }
      function animate(now) {
        requestAnimationFrame(animate);
        if (!ready || document.hidden) return;
        const interval = quality === "light" ? 1000 / 30 : 0;
        if (now - lastRenderTime < interval) return;
        lastRenderTime = now;
        if (tour) {
          const t = clamp((now - tour.start) / tour.duration, 0, 1),
            u = smooth(0, 1, t);
          camera.position.copy(tour.cameraCurve.getPoint(u));
          controls.target.copy(tour.targetCurve.getPoint(u));
          camera.position.y = Math.max(
            camera.position.y,
            heightAt(camera.position.x, camera.position.z) + 55,
          );
          camera.lookAt(controls.target);
          $("tour-progress").style.transform = "scaleX(" + t + ")";
          $("tour-time").textContent = 15 - Math.floor(t * 15) + " 秒";
          if (t >= 1) {
            stopTour(true);
            document
              .querySelectorAll("[data-place]")
              .forEach((e) =>
                e.setAttribute(
                  "aria-current",
                  String(e.dataset.place === "overview"),
                ),
              );
            showToast("城壁と都の全景。自由に見渡せます");
          }
        } else if (transition) {
          const t = clamp((now - transition.start) / transition.duration, 0, 1),
            u = smooth(0, 1, t);
          camera.position.lerpVectors(transition.fromPos, transition.toPos, u);
          controls.target.lerpVectors(
            transition.fromTarget,
            transition.toTarget,
            u,
          );
          camera.lookAt(controls.target);
          if (t === 1) {
            transition = null;
            controls.enabled = true;
            clearDamping();
          }
        } else {
          controls.update();
          const x = clamp(controls.target.x, -3900, 3900),
            z = clamp(controls.target.z, -3800, 4100);
          const delta = new THREE.Vector3(
            x - controls.target.x,
            0,
            z - controls.target.z,
          );
          controls.target.add(delta);
          camera.position.add(delta);
          const ground = heightAt(camera.position.x, camera.position.z);
          if (camera.position.y < ground + 18) camera.position.y = ground + 18;
        }
        waterMaterial.uniforms.time.value =
          quality === "full" ? now * 0.001 : 0;
        updateShadow();
        renderer.render(scene, camera);
        frameCount++;
        animationFrames++;
        if (now - frameWindow > 850) {
          currentFPS = (frameCount * 1000) / (now - frameWindow);
          frameCount = 0;
          frameWindow = now;
        }
        if (now - lastHUD > 140) {
          updateHUD();
          lastHUD = now;
        }
      }
      // Build in bounded phases so the initial loading UI remains responsive.
      setLoading("遺構の位置と建築を復元中");
      await yieldFrame();
      buildLandmarks();
      makeWaterLandmarks();
      setLoading("丘とテヴェレ川を生成中");
      await yieldFrame();
      makeTerrain();
      makeSky();
      makeRiver();
      setLoading("街道と城壁を配置中");
      await yieldFrame();
      makeRoads();
      makeWalls();
      makeAqueduct();
      setLoading("街区と住居を生成中");
      await yieldFrame();
      makeCity();
      flushBatches();
      makeLabels();
      setupSources();
      wireUI();
      markVisited("forum");
      const initial = preset("forum");
      camera.position.copy(initial.position);
      controls.target.copy(initial.target);
      controls.update();
      setQuality(innerWidth < 650 ? "light" : "full", false);
      updateShadow();
      setLoading("光と影を準備中");
      await yieldFrame();
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
      ready = true;
      window.romaReady = true;
      clearTimeout(window.romaLoadTimer);
      $("loading").classList.add("gone");
      setTimeout(() => ($("loading").hidden = true), 650);
      updateHUD();
      requestAnimationFrame(animate);
      // Read-only geometry diagnostics; never send data to a server.
      window.romaDiagnostics = () => ({
        three: THREE.REVISION,
        quality,
        ready,
        houseCount,
        wallTowers,
        wallLengthM: Math.round(wallLength),
        landmarkCount: landmarkData.length,
        renderedLandmarkCount: landmarks.length,
        aqueductBays,
        ruralPineCount,
        palaceStructureWidths: {
          flavia: flavia.structureW,
          augustana: augustana.structureW,
        },
        instances: instanceTotal,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        shadowUpdates,
        camera: camera.position.toArray(),
        target: controls.target.toArray(),
        tourActive: !!tour,
        transitionActive: !!transition,
        frames: animationFrames,
        labelsVisible: !document.body.classList.contains("labels-hidden") && !document.body.classList.contains("ui-hidden"),
        uiVisible: !document.body.classList.contains("ui-hidden"),
        terrainRevision: GEO.terrainModel.revision,
        terrainVertices: terrainGrid.vertices,
        terrainTriangles: terrainGrid.triangles,
        verticalScale: 1,
        terrainSamples: [
          ["palatine",41.8893064,12.4871093], ["flavia",41.8887767,12.4865885],
          ["augustana",41.8879876,12.4868711], ["forum",41.89238,12.48535],
          ["circus",41.8859299,12.485711], ["capitol",41.892222,12.481667]
        ].map(([id,lat,lon])=>{const p=xy(lat,lon);return {id,height:heightAt(p.x,p.y)};}),
      });
}

const romaExperience = new Rome320Experience(document.getElementById("viewport"));
await romaExperience.init();
