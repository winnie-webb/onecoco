/**
 * The 3D coconut. Loaded lazily, after first paint, as its own chunk.
 *
 * Speed rules (docs/BUILD-YOUR-COCO-3D-PLAN.md §4):
 * - No model files: the coconut is a lathe of `lib/coco/shape.ts`; garnish is
 *   built from primitives. The only texture is the sticker canvas.
 * - No render loop. A frame is drawn when the spec changes or while the
 *   coconut is moving, then the GPU goes idle.
 * - DPR capped at 2 (1.5 on low-end devices).
 *
 * No React in here: the builder talks to it through `update` and `dispose`.
 */

import { Camera, Cylinder, Geometry, Mesh, Program, Renderer, Sphere, Texture, Transform, type OGLRenderingContext } from "ogl";
import { type CocoSpec, straws, shapes } from "@/lib/coco/spec";
import {
  BOTTOM_Y,
  HIBISCUS,
  LIME,
  STICKER_CENTER_Y,
  STRAW,
  TOP_RADIUS,
  TOP_Y,
  UMBRELLA,
  UNITS_PER_INCH,
  VIEW_CENTER_Y,
  VIEW_HEIGHT,
  sampleProfile,
} from "@/lib/coco/shape";
import { type FontFamilies, drawSticker, loadStickerFont } from "@/lib/coco/sticker";

const SEGMENTS = 72;
/** Sticker texture resolution, px per inch. 256 → a 512 px texture: sharp at phone size. */
const TEXTURE_PPI = 256;
const SNAP_BACK_MS = 2500;

const huskVertex = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
void main() {
  vObj = position;
  vObjN = normal;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

// Shared lighting: a warm key light, sky/sand bounce and a soft rim. Lights are
// in view space, so they stay put while the coconut turns.
const lighting = /* glsl */ `
vec3 shade(vec3 base, vec3 N, vec3 V, float gloss) {
  vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
  float diff = max((dot(N, L) + 0.25) / 1.25, 0.0);
  vec3 hemi = mix(vec3(0.85, 0.76, 0.58), vec3(0.95, 0.98, 1.0), N.y * 0.5 + 0.5);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 40.0);
  return base * (diff * vec3(1.0, 0.97, 0.9) * 0.8 + hemi * 0.35) + rim * 0.12 + spec * gloss;
}`;

const huskFragment = /* glsl */ `
precision highp float;
uniform sampler2D uSticker;
uniform float uHasSticker;
uniform vec2 uStickerSize;
uniform float uStickerY;
uniform float uPart;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
${lighting}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(vView);
  float ang = atan(vObj.x, vObj.z);
  vec3 base;
  float gloss = 0.04;
  if (uPart < 0.5) {
    // Husk: vertical fibres plus soft blotches.
    float fib = noise(vec2(ang * 60.0, vObj.y * 2.5)) * 0.6 + noise(vec2(ang * 190.0, vObj.y * 7.0)) * 0.4;
    float blot = noise(vec2(ang * 3.0, vObj.y * 2.0));
    base = vec3(0.94, 0.9, 0.8) * (0.9 + 0.12 * fib) - vec3(0.0, 0.02, 0.06) * blot;
    // Sticker decal: arc-length around the husk, so it wraps like vinyl.
    float r = length(vObj.xz);
    vec2 d = vec2(ang * r / uStickerSize.x + 0.5, (vObj.y - uStickerY) / uStickerSize.y + 0.5);
    if (uHasSticker > 0.5 && vObj.z > 0.0 && d.x > 0.0 && d.x < 1.0 && d.y > 0.0 && d.y < 1.0) {
      vec4 s = texture2D(uSticker, d);
      base = base * (1.0 - s.a) + s.rgb;
      gloss = mix(gloss, 0.35, s.a);
    }
  } else if (uPart < 1.5) {
    // Cut crown: denser, slightly yellow, with the straw hole.
    float n = noise(vObj.xz * 30.0);
    base = vec3(0.93, 0.88, 0.72) * (0.92 + 0.08 * n);
    float hole = length(vObj.xz - vec2(0.08, 0.0));
    base *= mix(0.35, 1.0, smoothstep(0.07, 0.09, hole));
  } else {
    base = vec3(0.8, 0.74, 0.6);
  }
  gl_FragColor = vec4(shade(base, N, V, gloss), 1.0);
}`;

const propVertex = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
varying vec2 vUv;
void main() {
  vObj = position;
  vObjN = normal;
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

// Modes: 0 plain, 1 striped straw, 2 lime wedge, 3 petal, 4 umbrella panels.
const propFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uMode;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
varying vec2 vUv;
${lighting}
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vView);
  vec3 base = uColor;
  float gloss = 0.15;
  if (uMode > 0.5 && uMode < 1.5) {
    base = mix(uColor, vec3(1.0), step(0.72, fract(vUv.x * 3.0 + vUv.y * 9.0)));
    gloss = 0.4;
  } else if (uMode < 2.5 && uMode > 1.5) {
    // Flat faces are flesh with segment lines; the curved side is peel.
    if (abs(vObjN.y) > 0.5) {
      float a = atan(vObj.z, vObj.x);
      float seg = smoothstep(0.02, 0.06, abs(fract(a / 0.52) - 0.5));
      base = mix(vec3(0.95, 0.98, 0.8), uColor2, seg * smoothstep(0.02, 0.1, length(vObj.xz)));
    }
  } else if (uMode > 2.5 && uMode < 3.5) {
    base = mix(uColor2, uColor, smoothstep(-0.8, 0.4, vObj.x));
  } else if (uMode > 3.5) {
    base = mix(uColor, uColor2, step(0.5, fract(vUv.x * 4.0)));
  }
  gl_FragColor = vec4(shade(base, N, V, gloss), 1.0);
}`;

const shadowFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  float d = length((vUv - 0.5) * vec2(1.0, 1.0)) * 2.0;
  gl_FragColor = vec4(0.1, 0.12, 0.08, 0.32 * (1.0 - smoothstep(0.35, 1.0, d)));
}`;

const shadowVertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

function latheGeometry(gl: OGLRenderingContext) {
  const prof = sampleProfile(5);
  const rings = prof.length;
  const cols = SEGMENTS + 1;
  const position = new Float32Array(rings * cols * 3);
  const normal = new Float32Array(rings * cols * 3);
  for (let i = 0; i < rings; i++) {
    const [r, y] = prof[i];
    const prev = prof[Math.max(i - 1, 0)];
    const next = prof[Math.min(i + 1, rings - 1)];
    let nr = next[1] - prev[1];
    let ny = -(next[0] - prev[0]);
    const len = Math.hypot(nr, ny) || 1;
    nr /= len;
    ny /= len;
    for (let j = 0; j < cols; j++) {
      const t = (j / SEGMENTS) * Math.PI * 2;
      const k = (i * cols + j) * 3;
      position[k] = r * Math.sin(t);
      position[k + 1] = y;
      position[k + 2] = r * Math.cos(t);
      normal[k] = nr * Math.sin(t);
      normal[k + 1] = ny;
      normal[k + 2] = nr * Math.cos(t);
    }
  }
  const index = new Uint16Array((rings - 1) * SEGMENTS * 6);
  let n = 0;
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      index.set([a, b, c, b, d, c], n);
      n += 6;
    }
  }
  return new Geometry(gl, {
    position: { size: 3, data: position },
    normal: { size: 3, data: normal },
    index: { data: index },
  });
}

function discGeometry(gl: OGLRenderingContext, radius: number, y: number, up: boolean) {
  const position = new Float32Array((SEGMENTS + 1) * 3);
  const normal = new Float32Array((SEGMENTS + 1) * 3);
  position.set([0, y, 0]);
  for (let j = 0; j <= SEGMENTS; j++) normal.set([0, up ? 1 : -1, 0], j * 3);
  for (let j = 0; j < SEGMENTS; j++) {
    const t = (j / SEGMENTS) * Math.PI * 2;
    position.set([radius * Math.sin(t), y, radius * Math.cos(t)], (j + 1) * 3);
  }
  const index = new Uint16Array(SEGMENTS * 3);
  for (let j = 0; j < SEGMENTS; j++) {
    const a = j + 1;
    const b = ((j + 1) % SEGMENTS) + 1;
    index.set(up ? [0, a, b] : [0, b, a], j * 3);
  }
  return new Geometry(gl, {
    position: { size: 3, data: position },
    normal: { size: 3, data: normal },
    index: { data: index },
  });
}

const hex = (h: string): [number, number, number] => {
  const v = parseInt(h.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export type SceneOptions = {
  fonts: FontFamilies;
  reducedMotion: boolean;
  /** Called once the GPU context is gone; the builder falls back to 2D. */
  onContextLost: () => void;
  /** Called after the first frame is on screen. */
  onReady: () => void;
};

export type CocoScene = {
  update(spec: CocoSpec): void;
  /** Render now and copy the frame into a 2D context (share image). */
  drawInto(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
  /** Nudge the spin, e.g. from arrow keys. */
  spin(radians: number): void;
  dispose(): void;
};

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): CocoScene {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);

  const renderer = new Renderer({ canvas, dpr, alpha: true, antialias: dpr <= 1.5, powerPreference: "low-power" });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const camera = new Camera(gl, { fov: 20, near: 1, far: 30 });
  // Frame VIEW_HEIGHT at the coconut's front face (z ≈ 1), where the sticker is,
  // so it matches the flat 2D preview.
  const distance = VIEW_HEIGHT / 2 / Math.tan((10 * Math.PI) / 180) + 1;
  camera.position.set(0, VIEW_CENTER_Y + 0.9, distance);
  camera.lookAt([0, VIEW_CENTER_Y, 0]);

  const scene = new Transform();
  const coco = new Transform();
  coco.setParent(scene);

  // Sticker texture, redrawn by drawSticker whenever the words or design change.
  const stickerCanvas = document.createElement("canvas");
  const stickerCtx = stickerCanvas.getContext("2d")!;
  const stickerTex = new Texture(gl, { image: stickerCanvas, generateMipmaps: false, premultiplyAlpha: true });

  const huskUniforms = {
    uSticker: { value: stickerTex },
    uHasSticker: { value: 1 },
    uStickerSize: { value: [2 * UNITS_PER_INCH, 2 * UNITS_PER_INCH] },
    uStickerY: { value: STICKER_CENTER_Y },
    uPart: { value: 0 },
  };
  const huskProgram = (part: number) =>
    new Program(gl, { vertex: huskVertex, fragment: huskFragment, uniforms: { ...huskUniforms, uPart: { value: part } } });

  new Mesh(gl, { geometry: latheGeometry(gl), program: huskProgram(0) }).setParent(coco);
  new Mesh(gl, { geometry: discGeometry(gl, TOP_RADIUS, TOP_Y, true), program: huskProgram(1) }).setParent(coco);
  new Mesh(gl, { geometry: discGeometry(gl, 0.55, BOTTOM_Y, false), program: huskProgram(2) }).setParent(coco);

  // Contact shadow: one quad, no shadow maps.
  const shadow = new Mesh(gl, {
    geometry: new Geometry(gl, {
      position: { size: 3, data: new Float32Array([-1.6, 0, -1.6, 1.6, 0, -1.6, -1.6, 0, 1.6, 1.6, 0, 1.6]) },
      uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]) },
      index: { data: new Uint16Array([0, 2, 1, 1, 2, 3]) },
    }),
    program: new Program(gl, { vertex: shadowVertex, fragment: shadowFragment, transparent: true, depthWrite: false, cullFace: false }),
  });
  shadow.position.y = BOTTOM_Y - 0.005;
  shadow.setParent(scene);

  const prop = (color: string, mode: number, color2 = color) =>
    new Program(gl, {
      vertex: propVertex,
      fragment: propFragment,
      cullFace: false,
      uniforms: { uColor: { value: hex(color) }, uColor2: { value: hex(color2) }, uMode: { value: mode } },
    });

  // Straw.
  const strawProgram = prop(straws[0].color, 1);
  const straw = new Mesh(gl, {
    geometry: new Cylinder(gl, { radiusTop: 0.055, radiusBottom: 0.055, height: STRAW.length, radialSegments: 16 }),
    program: strawProgram,
  });
  straw.position.set(STRAW.x, STRAW.y, 0);
  straw.rotation.z = STRAW.tilt;
  straw.setParent(coco);

  // Hibiscus: five squashed spheres and a stamen, on the front-right of the crown.
  const hibiscus = new Transform();
  const petalGeo = new Sphere(gl, { radius: 1, widthSegments: 12, heightSegments: 8 });
  const petalProgram = prop("#e11d48", 3, "#7f1d1d");
  for (let i = 0; i < 5; i++) {
    const holder = new Transform();
    holder.rotation.y = (i / 5) * Math.PI * 2;
    holder.setParent(hibiscus);
    const petal = new Mesh(gl, { geometry: petalGeo, program: petalProgram });
    petal.scale.set(0.2, 0.035, 0.13);
    petal.position.x = 0.17;
    petal.rotation.z = 0.25;
    petal.setParent(holder);
  }
  const stamen = new Mesh(gl, {
    geometry: new Cylinder(gl, { radiusTop: 0.018, radiusBottom: 0.018, height: 0.3, radialSegments: 6 }),
    program: prop("#fbbf24", 0),
  });
  stamen.position.y = 0.12;
  stamen.rotation.z = -0.3;
  stamen.setParent(hibiscus);
  hibiscus.position.set(HIBISCUS.x, HIBISCUS.y, HIBISCUS.z);
  hibiscus.rotation.set(0.55, 0, 0.25);
  hibiscus.setParent(coco);

  // Paper umbrella: an eight-panel cone on a stick.
  const umbrella = new Transform();
  const canopy = new Mesh(gl, {
    geometry: new Cylinder(gl, { radiusTop: 0, radiusBottom: 0.5, height: 0.2, radialSegments: 8 }),
    program: prop("#f97316", 4, "#fde68a"),
  });
  canopy.position.y = 0.55;
  canopy.setParent(umbrella);
  const stick = new Mesh(gl, {
    geometry: new Cylinder(gl, { radiusTop: 0.014, radiusBottom: 0.014, height: UMBRELLA.stick, radialSegments: 6 }),
    program: prop("#f5e6c8", 0),
  });
  stick.setParent(umbrella);
  umbrella.position.set(UMBRELLA.x, UMBRELLA.y, UMBRELLA.z);
  umbrella.rotation.z = UMBRELLA.tilt;
  umbrella.setParent(coco);

  // Lime wedge perched on the rim.
  const lime = new Mesh(gl, {
    geometry: new Cylinder(gl, { radiusTop: 0.28, radiusBottom: 0.28, height: 0.12, radialSegments: 16, thetaLength: Math.PI }),
    program: prop("#4d7c0f", 2, "#bef264"),
  });
  lime.position.set(LIME.x, LIME.y, LIME.z);
  lime.rotation.set(Math.PI / 2, 0.5, 0);
  lime.setParent(coco);

  const garnish = { hibiscus, umbrella, lime } as const;

  /* ---------------- Rendering on demand ---------------- */

  let frame = 0;
  let disposed = false;
  let ready = false;
  let angle = 0;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let lastInteraction = 0;
  let snapTimer = 0;

  const draw = () => {
    coco.rotation.y = angle;
    renderer.render({ scene, camera });
    if (!ready) {
      ready = true;
      opts.onReady();
    }
  };

  const tick = () => {
    frame = 0;
    if (disposed) return;
    let moving = false;
    if (!dragging && Math.abs(velocity) > 0.0005) {
      angle += velocity;
      velocity *= 0.93;
      moving = true;
    } else if (!dragging && performance.now() - lastInteraction > SNAP_BACK_MS) {
      // Return to the front so the sticker is what they see.
      const target = Math.round(angle / (Math.PI * 2)) * Math.PI * 2;
      const delta = target - angle;
      if (Math.abs(delta) > 0.002 && !opts.reducedMotion) {
        angle += delta * 0.12;
        moving = true;
      } else {
        angle = target;
      }
    }
    draw();
    if (moving) request();
  };

  const request = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  };

  const scheduleSnap = () => {
    clearTimeout(snapTimer);
    snapTimer = window.setTimeout(request, SNAP_BACK_MS + 20);
  };

  // Measure the box, not the canvas: OGL writes an explicit pixel size onto the
  // canvas style, which would otherwise freeze it at its first size.
  const box = canvas.parentElement ?? canvas;
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = box;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.perspective({ aspect: w / h });
    request();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(box);

  /* ---------------- Interaction ---------------- */

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    velocity = 0;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = ((e.clientX - lastX) / canvas.clientWidth) * Math.PI * 1.6;
    lastX = e.clientX;
    angle += dx;
    velocity = opts.reducedMotion ? 0 : dx;
    lastInteraction = performance.now();
    request();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    lastInteraction = performance.now();
    request();
    scheduleSnap();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const onLost = (e: Event) => {
    e.preventDefault();
    disposed = true;
    opts.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  /* ---------------- Spec ---------------- */

  let stickerKey = "";
  let current: CocoSpec | null = null;

  const redrawSticker = (spec: CocoSpec) => {
    const shape = shapes.find((s) => s.value === spec.shape) ?? shapes[0];
    stickerCanvas.width = Math.round(shape.widthIn * TEXTURE_PPI);
    stickerCanvas.height = Math.round(shape.heightIn * TEXTURE_PPI);
    drawSticker(stickerCtx, spec, { fonts: opts.fonts, placeholder: true });
    stickerTex.needsUpdate = true;
    huskUniforms.uStickerSize.value = [shape.widthIn * UNITS_PER_INCH, shape.heightIn * UNITS_PER_INCH];
  };

  return {
    update(spec) {
      current = spec;
      const key = [spec.name, spec.message, spec.design, spec.font, spec.shape, spec.symbol].join("\u0000");
      if (key !== stickerKey) {
        stickerKey = key;
        redrawSticker(spec);
        // First use of a font fetches it; redraw once it lands.
        loadStickerFont(spec.font, opts.fonts).then(() => {
          if (current === spec && !disposed) {
            redrawSticker(spec);
            request();
          }
        });
      }
      strawProgram.uniforms.uColor.value = hex((straws.find((s) => s.value === spec.straw) ?? straws[0]).color);
      for (const [k, node] of Object.entries(garnish)) {
        node.visible = spec.extras.includes(k as keyof typeof garnish);
      }
      request();
    },
    drawInto(ctx, x, y, w, h) {
      // Render once at the target resolution (the on-screen canvas is small),
      // copy it in the same task while the drawing buffer is still readable,
      // then put the screen size back.
      const cssW = renderer.width;
      const cssH = renderer.height;
      renderer.dpr = w / cssW;
      renderer.setSize(cssW, cssH);
      draw();
      ctx.drawImage(canvas, x, y, w, h);
      renderer.dpr = dpr;
      renderer.setSize(cssW, cssH);
      draw();
    },
    spin(radians) {
      velocity = opts.reducedMotion ? 0 : radians * 0.07;
      if (opts.reducedMotion) angle += radians;
      lastInteraction = performance.now();
      request();
      scheduleSnap();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(snapTimer);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
