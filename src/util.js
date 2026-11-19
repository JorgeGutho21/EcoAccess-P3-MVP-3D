import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
export const FONT_B = 'Inter, "Segoe UI", system-ui, sans-serif';
export const C = {
  g900: '#0E3B20', g700: '#1E6B30', g600: '#2F8A3C', g400: '#6DB33F', g100: '#DCEFD8',
  white: '#FFFFFF', paper: '#F3F6F2', graphite: '#1D2320', graph2: '#3A4440', mute: '#6B7A72',
  amber: '#E3A21A', red: '#C8442E',
};

export const state = { scale: 1, reduced: false, quality: 2 };
// Niveles de calidad: 2 = alta, 1 = media, 0 = ligera (se ajusta solo si el equipo no mantiene ~45 fps)
export const QUALITY = [
  { name: 'Ligera', pr: 0.8, bloom: false, shadow: 1024, samples: 0 },
  { name: 'Media', pr: 1.0, bloom: true, shadow: 1024, samples: 2 },
  { name: 'Alta', pr: 1.5, bloom: true, shadow: 2048, samples: 4 },
];

// ----- Texturas de canvas redibujables -----
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData = { canvas: c, ctx };
  if (draw) redraw(t, draw);
  return t;
}
export function redraw(tex, draw) {
  const { canvas, ctx } = tex.userData;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, canvas.width, canvas.height);
  ctx.restore();
  tex.needsUpdate = true;
}
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
export function wrap(ctx, text, x, y, maxW, lh, maxLines = 6) {
  const words = text.split(' ');
  let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lh; line = words[i]; lines++;
      if (lines >= maxLines) return y;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}

// Patrón QR ilustrativo (no codifica una URL real)
export function drawQR(ctx, x, y, size, dark = C.graphite) {
  const n = 29, m = size / n;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - m * 2, y - m * 2, size + m * 4, size + m * 4);
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const inFinder = (r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8);
    if (!inFinder && rnd() > 0.53) ctx.fillRect(x + c * m, y + r * m, m + 0.4, m + 0.4);
  }
  const finder = (fx, fy) => {
    ctx.fillStyle = dark; ctx.fillRect(x + fx * m, y + fy * m, 7 * m, 7 * m);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + (fx + 1) * m, y + (fy + 1) * m, 5 * m, 5 * m);
    ctx.fillStyle = C.g600; ctx.fillRect(x + (fx + 2) * m, y + (fy + 2) * m, 3 * m, 3 * m);
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}

// ----- Renderizador ligado a un contenedor del escenario 1920×1080 -----
let sharedEnv = null;
export function envFor(renderer) {
  if (!sharedEnv) sharedEnv = new Map();
  if (!sharedEnv.has(renderer)) {
    const pm = new THREE.PMREMGenerator(renderer);
    sharedEnv.set(renderer, pm.fromScene(renderer.__outdoor ? outdoorEnvScene() : new RoomEnvironment(), 0.04).texture);
    pm.dispose();
  }
  return sharedEnv.get(renderer);
}

// Escena de entorno exterior para reflejos realistas: cielo, horizonte claro, suelo y sol
function outdoorEnvScene() {
  const sc = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 sky = mix(vec3(0.85,0.92,1.0), vec3(0.32,0.58,0.95), smoothstep(0.0,0.7,h));
        vec3 ground = mix(vec3(0.55,0.55,0.50), vec3(0.30,0.42,0.22), smoothstep(0.0,-0.5,h));
        vec3 c = h > 0.0 ? sky : ground;
        vec3 sunDir = normalize(vec3(0.5,0.75,0.45));
        c += vec3(12.0,10.5,8.5) * pow(max(dot(vP,sunDir),0.0), 400.0);
        gl_FragColor = vec4(c * 1.2, 1.0);
      }`,
  });
  sc.add(new THREE.Mesh(geo, mat));
  return sc;
}

export class View {
  constructor(el, { camera, scene, shadows = true, exposure = 1.0, bloom = false, outdoor = false, maxPR = 2.5 }) {
    this.maxPR = maxPR;
    this.wantBloom = bloom;
    this.el = el;
    this.scene = scene;
    this.camera = camera;
    this.renderer = new THREE.WebGLRenderer({ antialias: !bloom, alpha: true, powerPreference: 'high-performance' });
    this.renderer.__outdoor = outdoor;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = exposure;
    if (shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    el.appendChild(this.renderer.domElement);
    scene.environment = envFor(this.renderer);
    if (bloom) {
      // Render en HDR (half float + MSAA) → bloom solo de lo muy brillante → tone mapping + sRGB una sola vez (OutputPass)
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: QUALITY[state.quality].samples });
      this.rt = rt;
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(scene, camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.45, 2.3);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.w = 1; this.h = 1;
    this.resize();
  }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.w = w; this.h = h;
    const q = QUALITY[state.quality];
    const pr = Math.min(this.maxPR, q.pr, Math.max(0.6, (window.devicePixelRatio || 1) * state.scale));
    if (this.rt) this.rt.samples = q.samples;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, true);
    if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); }
    const cam = this.camera;
    if (cam.isPerspectiveCamera) cam.aspect = w / h;
    else {
      const fh = cam.userData.frustum || 10;
      cam.left = -fh * w / h / 2; cam.right = fh * w / h / 2; cam.top = fh / 2; cam.bottom = -fh / 2;
    }
    if (cam.isPerspectiveCamera && this.offset) cam.setViewOffset(w, h, w * this.offset[0], h * this.offset[1], w, h);
    cam.updateProjectionMatrix();
  }
  render() { if (this.composer && QUALITY[state.quality].bloom && !state.noPost) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  // proyecta un punto 3D a coordenadas CSS del contenedor
  project(v3, out = { x: 0, y: 0, vis: true }) {
    const v = v3.clone().project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * this.w;
    out.y = (-v.y * 0.5 + 0.5) * this.h;
    out.vis = v.z < 1;
    return out;
  }
  pointer(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
}

export function addLights(scene, { key = 2.2, fill = 0.7, shadowSize = 6 } = {}) {
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6f8f4f, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, key);
  sun.position.set(6, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(QUALITY[state.quality].shadow, QUALITY[state.quality].shadow);
  Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xd8f0ff, fill);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  return { hemi, sun, rim };
}

export function shadowFloor(size = 40, opacity = 0.18) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function damp(cur, target, lambda, dt) { return lerp(cur, target, 1 - Math.exp(-lambda * dt)); }
