import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { WorkshopRoom } from "./workshop.mjs";
import { WorkshopAssets } from "./assets.mjs";
import { TABLE, TablePreviewState, flipperAngle } from "./layout.mjs";
export class PinballTablePreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = new TablePreviewState();
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x141418);
    this.scene.fog = new T.Fog(0x141418, 24, 48);
    this.camera = new T.PerspectiveCamera(38, 1, 0.1, 80);
    this.assets = new WorkshopAssets();
    this.board = this.assets.build();
    this.board.rotation.x = TABLE.tilt;
    this.scene.add(this.board);
    this.ball = this.assets.mesh(
      new T.SphereGeometry(TABLE.ballRadius, 32, 20),
      "ball",
      this.board,
      2.53,
      0.16,
      3.7,
    );
    this.scene.add(new T.HemisphereLight(0xe5e7ee, 0x353339, 3));
    const key = new T.DirectionalLight(0xffeed5, 4);
    key.position.set(-5, 11, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 30,
    });
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    const rim = new T.DirectionalLight(0xc4d0ef, 2);
    rim.position.set(4, 4, -5);
    this.scene.add(rim);
    const floor = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.75 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.4;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.room = new WorkshopRoom(this.assets);
    this.scene.add(this.room.build());
    this.bakeEnvironment();
    this.frameCount = 0;
    this.last = 0;
    this.running = true;
    this.init();
  }
  bakeEnvironment() {
    this.scene.environment = null;
    if (this.reflection) this.reflection.dispose();
    // Bake only room lighting into reflections; never run six captures per frame.
    const reflectionTarget = new T.WebGLCubeRenderTarget(128, { type: T.HalfFloatType });
    const reflectionCamera = new T.CubeCamera(0.1, 60, reflectionTarget);
    reflectionCamera.position.set(0, 2, 0);
    this.board.visible = false;
    reflectionCamera.update(this.renderer, this.scene);
    this.board.visible = true;
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.reflection = pmrem.fromCubemap(reflectionTarget.texture);
    this.scene.environment = this.reflection.texture;
    reflectionTarget.dispose();
    pmrem.dispose();
  }
  init() {
    this.state.init();
    this.resize();
    this.setView("play");
    this.renderer.setAnimationLoop((t) => this.frame(t));
    document.querySelector("#message").textContent = "";
  }
  resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.setView(this.state.view);
  }
  setView(name) {
    this.state.view = name;
    const mobile = this.camera.aspect < 0.8;
    const positions = {
      play: mobile ? [0, 19, 15] : [9, 14, 15],
      detail: [5, 5.8, 6.8],
      top: [0, 21, 0.01],
    };
    this.camera.position.set(...positions[name]);
    this.camera.lookAt(0, 0, name === "detail" ? 1.1 : 0);
    document
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("selected", b.dataset.view === name));
  }
  toggleTour() {
    this.state.tour = !this.state.tour;
    document
      .querySelector("#tour")
      .setAttribute("aria-pressed", String(this.state.tour));
  }
  frame(time) {
    const dt = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
    this.last = time;
    this.state.update(dt);
    for (let i = 0; i < 2; i++) {
      const f = this.assets.flippers[i],
        active = i ? this.state.right : this.state.left;
      const target = flipperAngle(Boolean(i), active);
      f.rotation.y = T.MathUtils.damp(f.rotation.y, target, 24, dt);
    }
    if (this.state.tour) {
      const p = this.assets.curve.getPoint(this.state.progress);
      this.ball.position.copy(p);
      this.ball.position.y += TABLE.ballRadius;
      this.ball.rotation.x += dt * 8;
    }
    this.renderer.render(this.scene, this.camera);
    if (this.frameCount++ % 60 === 0) {
      this.canvas.dataset.drawCalls = this.renderer.info.render.calls;
      this.canvas.dataset.triangles = this.renderer.info.render.triangles;
    }
  }
  pause() {
    this.state.release();
    this.last = 0;
  }
}
function bindInput(game) {
  const held = { left: new Set(), right: new Set() };
  const sync = (side) => {
    game.state.setFlipper(side, held[side].size > 0);
    document
      .getElementById(side)
      .setAttribute("aria-pressed", String(held[side].size > 0));
  };
  for (const side of ["left", "right"]) {
    const b = document.getElementById(side);
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        held[side].add(e.code);
        sync(side);
      }
    });
    b.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        held[side].delete(e.code);
        sync(side);
      }
    });
    b.addEventListener("blur", () => {
      held[side].delete("Space");
      held[side].delete("Enter");
      sync(side);
    });
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      held[side].add(`p${e.pointerId}`);
      sync(side);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(event, (e) => {
        held[side].delete(`p${e.pointerId}`);
        sync(side);
      });
  }
  const sideFor = (code) =>
    ["KeyZ", "ShiftLeft"].includes(code)
      ? "left"
      : ["Slash", "ShiftRight"].includes(code)
        ? "right"
        : null;
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLElement && e.target.closest("button,summary,a"))
      return;
    const side = sideFor(e.code);
    if (side) {
      e.preventDefault();
      held[side].add(e.code);
      sync(side);
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) game.toggleTour();
    }
    if (e.code === "KeyC" && !e.repeat) {
      const modes = ["play", "detail", "top"];
      game.setView(modes[(modes.indexOf(game.state.view) + 1) % 3]);
    }
  });
  window.addEventListener("keyup", (e) => {
    const side = sideFor(e.code);
    if (side) {
      held[side].delete(e.code);
      sync(side);
    }
  });
  const release = () => {
    held.left.clear();
    held.right.clear();
    sync("left");
    sync("right");
    game.pause();
  };
  window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", () => {
    release();
    game.renderer.setAnimationLoop(
      document.hidden ? null : (t) => game.frame(t),
    );
  });
  window.addEventListener("resize", () => game.resize());
  document
    .querySelectorAll("[data-view]")
    .forEach((b) =>
      b.addEventListener("click", () => game.setView(b.dataset.view)),
    );
  document
    .querySelector("#tour")
    .addEventListener("click", () => game.toggleTour());
  game.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    game.renderer.setAnimationLoop(null);
    release();
    document.querySelector("#message").textContent =
      "描画が中断しました。復帰しない場合はページを再読み込みしてください。";
  });
  game.canvas.addEventListener("webglcontextrestored", () => {
    game.bakeEnvironment();
    game.last = 0;
    document.querySelector("#message").textContent = "";
    game.renderer.setAnimationLoop((t) => game.frame(t));
  });
}
try {
  bindInput(new PinballTablePreview(document.querySelector("#table")));
} catch (error) {
  document.querySelector("#message").textContent =
    `3D表示を開始できませんでした。WebGL 2対応ブラウザをお試しください。 (${error.message})`;
}
