import { PinballSound } from "./sound.mjs";
import { PinballFeedback } from "./feedback.mjs";
import { BumperEffects } from "./bumper-effects.mjs";
import { Plunger, bindPlunger } from "./plunger.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { WorkshopRoom } from "./workshop.mjs";
import { WorkshopAssets } from "./assets.mjs";
import { PinballPhysics } from "./physics.mjs";
import { TABLE, SHOOTER_LAYOUT, TablePreviewState } from "./layout.mjs";
export class PinballTablePreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = new TablePreviewState();
    this.game = null;
    this.plunger = new Plunger();
    this.sound=new PinballSound();this.feedback=new PinballFeedback();
    this.viewAngle = 45;
    try { const saved=Number(localStorage.getItem("pinball-view-angle")); if(saved>=10&&saved<=90)this.viewAngle=saved; } catch { /* Storage is optional. */ }
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x08111c);
    this.scene.fog = new T.Fog(0x08111c, 24, 48);
    this.camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    this.assets = new WorkshopAssets();
    this.board = this.assets.build();
    this.bumperEffects=new BumperEffects(this.assets.root);
    this.reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    this.board.rotation.x = TABLE.tilt;
    this.scene.add(this.board);
    this.ball = this.assets.mesh(
      new T.SphereGeometry(TABLE.ballRadius, 32, 20),
      "ball",
      this.board,
      2.53,
      .175,
      SHOOTER_LAYOUT.ballZ,
    );
    this.scene.add(new T.HemisphereLight(0xe5e7ee, 0x353339, 1.5));
    const key = new T.DirectionalLight(0xffeed5, 3.8);
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
    const rim = new T.DirectionalLight(0xc4d0ef, 1.8);
    rim.position.set(4, 4, -5);
    this.scene.add(rim);
    const floor = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.MeshStandardMaterial({ color: 0x10182d, roughness: 0.88 }),
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
    // Reflection-only softboxes separate silver, cyan and amber without extra
    // runtime lights, shadow maps or per-frame environment capture.
    const cards=new T.Group();
    for(const [color,x,y,z,w,h] of [[0xf1f8ff,-5,6,1,3,7],[0x7bddff,5,5,-2,2,6],[0xffd98a,0,7,-7,5,2]]){
      const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));card.position.set(x,y,z);card.lookAt(0,1,0);cards.add(card);
    }
    this.scene.add(cards);
    this.board.visible = false;
    reflectionCamera.update(this.renderer, this.scene);
    this.board.visible = true;
    cards.removeFromParent();cards.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.reflection = pmrem.fromCubemap(reflectionTarget.texture);
    this.scene.environment = this.reflection.texture;
    this.scene.environmentIntensity = 1.15;
    reflectionTarget.dispose();
    pmrem.dispose();
  }
  init() {
    this.state.init();
    this.state.view="custom";
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    document.querySelector("#message").textContent = "物理エンジンを準備中…";
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
    if(name === "play") this.viewAngle=45;
    if(name === "top") this.viewAngle=90;
    if(name === "play" || name === "top") {
      try { localStorage.setItem("pinball-view-angle",String(this.viewAngle)); } catch { /* Optional persistence. */ }
    }
    document.querySelector("#view-angle").value=this.viewAngle;
    document.querySelector("#view-angle-label").textContent=`${Math.round(this.viewAngle)}°`;
    // Gameplay views retain the complete lane and both flippers, without perspective compression.
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const angle=this.viewAngle*Math.PI/180;
    // Fit the actual cabinet corners rather than adding two conservative margins.
    const tangent=Math.tan(this.camera.fov*.5*Math.PI/180); let distance=0;
    const framePoints=[];
    for(const x of [-3.05,3.05]) for(const y of [-.6,.8]) for(const z of [-6,6]) framePoints.push([x,y,z]);
    // Tall backglass is only at the rear; a full-height bounding cuboid would
    // unnecessarily shrink the live playfield on portrait screens.
    for(const x of [-2.98,2.98]) for(const y of [.4,3.30]) framePoints.push([x,y,-6.50]);
    for(const x of [2.50,3.45]) for(const y of [.59,2.20]) for(const z of [-5.80,-4.90]) framePoints.push([x,y,z]);
    for(const x of [-3.92,-2.65]) for(const y of [.55,2.25]) framePoints.push([x,y,-5.15]);
    for(const [x,y,z] of framePoints) {
      const screenY=y*Math.cos(angle)-z*Math.sin(angle);
      const towardCamera=y*Math.sin(angle)+z*Math.cos(angle);
      distance=Math.max(distance,Math.abs(screenY)/tangent+towardCamera,Math.abs(x)/(tangent*aspect)+towardCamera);
    }
    distance*=1.04;
    this.camera.aspect=aspect;
    this.camera.up.set(0, 0, -1);
    const position = new T.Vector3(0, distance*Math.sin(angle), distance*Math.cos(angle)).applyAxisAngle(new T.Vector3(1,0,0), TABLE.tilt);
    this.camera.position.copy(position);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom=1; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld(true);
    // Perspective makes the cabinet asymmetric about its world origin. Fit and
    // center its projected bounds rather than wasting the upper half of the view.
    const corners=[];
    for(const [x,y,z] of framePoints) {
      corners.push(new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(1,0,0),TABLE.tilt).project(this.camera));
    }
    const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x));
    const minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
    this.camera.zoom=Math.min(1.94/(maxX-minX),1.94/(maxY-minY));
    this.camera.updateProjectionMatrix();
    this.camera.projectionMatrix.elements[8]=(minX+maxX)/2*this.camera.zoom;
    this.camera.projectionMatrix.elements[9]=(minY+maxY)/2*this.camera.zoom;
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    // Backdrop and non-colliding tall mascot must not hide the active ball lanes.
    this.scene.getObjectByName("chappy-automaton").visible = false;
    this.scene.getObjectByName("rear-mechanical-bank").visible = false;
    this.room.root && (this.room.root.visible = true);
    // Mascot stays on the supported left shoulder balcony, in front of the backglass.
    if(this.room.friend){this.room.friend.root.position.set(-3.25,.82,-5.15);this.room.friend.root.scale.setScalar(.62);if(this.room.friendStand)this.room.friendStand.visible=true;}
    document
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("selected", b.dataset.view === name));
  }
  async connectPhysics() {
    this.game = await PinballPhysics.create();
    document.querySelector("#message").textContent = "";
    document.querySelectorAll("button").forEach(b => { b.disabled = false; });
    if (new URLSearchParams(location.search).has("test")) window.__pinball = this;
    this.feedback.update(this.game.state,this.state);
    this.updateHUD();
  }
  launch(power = 1) { if (this.game) this.game.launch(power); }
  togglePause(event) {
    this.plunger.cancel();
    if (this.game && this.game.state.phase !== "gameover")
      this.game.setPaused(this.game.state.phase !== "paused");
    this.sound.setPaused(this.game?.state.phase==="paused");
    if(!this.sound.paused&&event)void this.sound.unlock(event);
  }
  restart() {
    if (!this.game) return;
    this.plunger.cancel();
    this.state.release(); this.game.restart(); this.bumperEffects.reset(); this.assets.resetMechanics?.(); this.last = 0;this.feedback.reset();this.feedback.update(this.game.state,this.state);this.room.reset();this.sound.stop();
    document.querySelectorAll("#left,#right").forEach(b => b.setAttribute("aria-pressed", "false"));
  }
  updateHUD() {
    const state = this.game.state;
    this.assets.mechanical.cabinet.updateSnapshot(state);
    if (state.phase !== "ready") this.plunger.cancel();
    const power = this.plunger.update(performance.now());
    const percent = Math.round(power * 100);
    document.querySelector("#launch-power").textContent = `${percent}%`;
    document.querySelector("#launch").style.backgroundSize = `${percent}% 100%`;
    document.querySelector("#launch").setAttribute("aria-pressed", String(this.plunger.owner !== null));

    document.querySelector("#score").textContent = state.score.toLocaleString("ja-JP");
    document.querySelector("#balls").textContent = `${Math.min(state.ballNumber, 3)} / 3`;
    const labels = { ready: state.returnedShooter ? "戻り球 · 長押し→離して再発射" : "SPACE長押し→離す / ボタンを上に引いて発射", playing: "バンパーとターゲットを狙おう", paused: "一時停止中", gameover: "GAME OVER" };
    document.querySelector("#phase").textContent = state.tilted?"TILT · 操作と加点停止／この球を終了":this.game.nudgeMeter.heat>=1.7?"警告 · ナッジを控えてください":labels[state.phase];
    document.querySelector("#nudge").disabled=state.phase!=="playing"||state.tilted;
    document.querySelector("#pause").textContent = state.phase === "paused" ? "再開" : "停止";
    document.querySelector("#launch").disabled = state.phase !== "ready";
    document.querySelector("#gameover").hidden = state.phase !== "gameover";
    document.querySelector("#final-score").textContent = state.score.toLocaleString("ja-JP");
    document.querySelector("#rollovers").textContent = ["A","B","C"].map((label,i)=>`${label} ${state.rollovers?.[i] ? "●" : "○"}`).join("　");
    document.querySelector("#kickback").textContent = `CENTER SAVE ${state.kickbackCharges ?? 0} / 1`;
    if(state.lastAward && state.lastAward.score!==this.shownAwardScore) {
      this.shownAwardScore=state.lastAward.score;this.awardShownAt=performance.now();this.shownAward=state.lastAward;
    }
    if(!state.score) {this.shownAward=null;this.shownAwardScore=0;}
    const recent=this.shownAward && performance.now()-this.awardShownAt<1800;
    document.querySelector("#score-event").textContent=recent?`${this.shownAward.label} +${this.shownAward.points}`:state.lastEvent;
    let delta=document.querySelector("#score-delta");
    if(!delta){delta=document.createElement("span");delta.id="score-delta";document.querySelector(".score-panel").append(delta);}
    delta.textContent=recent?`+${this.shownAward.points}`:"";
    const multiplier=state.multiplierMission;
    if(multiplier) {
      document.querySelector('#multiplier').textContent=`×${state.multiplier}`;
      document.querySelector('#multiplier-progress').textContent=`${multiplier.description} · ${multiplier.progress}/${multiplier.target}`;
    }
    const mission=state.mission;
    if(mission && document.querySelector("#mission-title")) {
      document.querySelector("#mission-title").textContent=mission.title;
      document.querySelector("#mission-progress").textContent=`${mission.description} · ${mission.progress}/${mission.target}`;
    }
    for(const [i,lamp] of (this.assets.missionLamps??[]).entries()) {
      const lit=mission && (mission.allComplete || i<Math.floor(this.assets.missionLamps.length*mission.progress/Math.max(1,mission.target)));
      lamp.material=this.assets.materials[lit?"light":"amber"];
    }
    if(this.assets.sideSaveLamp) this.assets.sideSaveLamp.material=this.assets.materials[state.sideSaveCharges?"light":"dark"];
    document.querySelector("#kickback").textContent += ` · LEFT SAVE ${state.sideSaveCharges??0}`;
    for(const [i,lamp] of (this.assets.laneLamps || []).entries()) lamp.material = this.assets.materials[state.rollovers?.[i] ? "light" : "jade"];
    this.canvas.dataset.phase = state.phase;
    this.canvas.dataset.score = state.score;
    this.canvas.dataset.ball = state.ballNumber;
  }
  frame(time) {
    const dt = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
    this.last = time;
    if (this.game) {
      if(this.game.state.phase === "ready") this.game.setPlungerPull(this.plunger.update(performance.now()));
      this.game.step(dt, { left: this.state.left, right: this.state.right });
      const p = this.game.ballPosition;
      this.ball.position.set(p.x, p.y, p.z);
      const hits=this.game.takeVisualHits();
      const events=this.feedback.update(this.game.state,this.state,hits);
      this.sound.setPaused(this.game.state.phase==="paused");
      for(const event of events)this.sound.play(event);
      this.room.update(dt,events.map(e=>["bumper","sling","target"].includes(e)?"hit":e),{phase:this.game.state.phase,reducedMotion:this.reducedMotion.matches,tilted:this.game.state.tilted});
      this.assets.updateMechanics(this.game.state.phase === "paused" ? 0 : dt,hits,{flipperAngles:this.game.flipperAngles,pullPower:this.game.plungerPull});
      if (this.assets.spinnerPivot) this.assets.spinnerPivot.rotation.x = this.game.spinnerAngle || 0;
      this.bumperEffects.update(this.game.state.phase==="paused"?0:dt,hits,this.reducedMotion.matches);
      this.canvas.dataset.bumperEffects=this.bumperEffects.hits;
      this.updateHUD();
    }
    this.renderer.render(this.scene, this.camera);
    if (this.frameCount++ % 60 === 0) {
      this.canvas.dataset.drawCalls = this.renderer.info.render.calls;
      this.canvas.dataset.triangles = this.renderer.info.render.triangles;
    }
  }
  pause() {
    this.plunger.cancel();
    if (this.game && this.game.state.phase !== "gameover") this.game.setPaused(true);
    this.state.release();
    this.sound.setPaused(true);
    this.last = 0;
  }
}
function bindInput(game) {
  const soundButton=document.querySelector("#sound");
  const soundLabel=()=>{soundButton.textContent=game.sound.muted?"音 OFF":"音 ON";soundButton.setAttribute("aria-pressed",String(!game.sound.muted));};
  soundLabel();
  for(const type of ["pointerdown","keydown","touchend"])window.addEventListener(type,e=>{if(e.isTrusted)void game.sound.unlock(e);},{capture:true,passive:true});
  soundButton.addEventListener("click",e=>{game.sound.toggleMuted();soundLabel();if(!game.sound.muted)void game.sound.unlock(e);});
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
        e.stopPropagation();
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
    if (e.defaultPrevented || (e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[contenteditable]"))) return;
    const side = sideFor(e.code);
    if (side) {
      e.preventDefault();
      held[side].add(e.code);
      sync(side);
    }
    if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) game.togglePause(e);
    if(e.code==="KeyN"&&!e.repeat){e.preventDefault();game.game?.nudge();}
    if (e.code === "KeyR" && !e.repeat) { held.left.clear(); held.right.clear(); game.restart(); }
    if (e.code === "KeyC" && !e.repeat) {
      const modes = ["play", "top"];
      game.setView(modes[(modes.indexOf(game.state.view) + 1) % modes.length]);
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
  document.querySelector("#nudge").addEventListener("click",()=>game.game?.nudge());
  document.querySelector("#view-angle").addEventListener("input", e=>{
    game.viewAngle=Number(e.target.value); game.setView("custom");
    try { localStorage.setItem("pinball-view-angle",String(game.viewAngle)); } catch { /* Optional persistence. */ }
  });
  bindPlunger(game, document.querySelector("#launch"));
  document.querySelector("#pause").addEventListener("click", e => game.togglePause(e));
  for (const b of document.querySelectorAll("[data-restart]")) b.addEventListener("click", () => {
    held.left.clear(); held.right.clear(); game.restart();
  });
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
  const game = new PinballTablePreview(document.querySelector("#table"));
  bindInput(game);
  await game.connectPhysics();
} catch (error) {
  document.querySelector("#message").textContent =
    `3D表示を開始できませんでした。WebGL 2対応ブラウザをお試しください。 (${error.message})`;
}
