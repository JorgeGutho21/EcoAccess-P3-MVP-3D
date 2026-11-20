// =====================================================================
// ECO · mascota procedimental detallada (Three.js, sin archivos externos)
//   makeEco()        → THREE.Group (pies en y = 0, mira hacia +z, ~2.1 u de alto)
//   drawEcoFace(...) → dibuja la cara del visor (canvas 1024×512)
// Convención de lados: 'L' = lado izquierdo de la pantalla (−x, sostiene la tablet),
//                      'R' = lado derecho de la pantalla (+x, presenta / señala).
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex, redraw, rr, FONT, FONT_B } from './util.js';
import faceUrl from './assets/eco_face.jpg';

// Cara oficial (arte del usuario), ajustada al UV del visor: 1024×512
let faceImg = null;
const faceTargets = new Set();
const lastFaceArgs = new WeakMap();
export const faceReady = (typeof Image === 'undefined') ? Promise.resolve(null) : new Promise((resolve) => {
  const im = new Image();
  im.onload = () => {
    faceImg = im;
    for (const t of faceTargets) {
      const a = lastFaceArgs.get(t.userData.canvas) || [t.userData.eco?.mood || 'idle', 0, 0];
      redraw(t, (ctx, w, h) => drawEcoFace(ctx, w, h, ...a));
    }
    resolve(im);
  };
  im.onerror = () => resolve(null);
  im.src = faceUrl;
});
// Regiones de los ojos dentro de la imagen (cx, cy, rx, ry del anillo; irx, iry del iris)
const FACE_EYES = [[250, 245, 160, 102, 118, 80], [812, 245, 152, 102, 112, 80]];

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const GLOW = '#5CFF7A';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function M4(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, order = 'XYZ') {
  return new THREE.Matrix4().compose(new V3(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, order)), new V3(sx, sy, sz));
}

// ---------------------------------------------------------------------
// Agrupador: fusiona geometrías estáticas por material (menos draw calls)
// ---------------------------------------------------------------------
class Parts {
  constructor() { this.m = new Map(); }
  add(geo, mat, t) {
    const g = geo.clone();
    if (t) g.applyMatrix4(Array.isArray(t) ? M4(...t) : t);
    if (!this.m.has(mat)) this.m.set(mat, []);
    this.m.get(mat).push(g);
    return this;
  }
  build(parent) {
    const out = [];
    for (const [mat, list] of this.m) {
      const anyNon = list.some((g) => !g.index);
      const gs = list.map((g) => {
        const n = anyNon && g.index ? g.toNonIndexed() : g;
        for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k);
        n.morphAttributes = {};
        return n;
      });
      const geo = gs.length === 1 ? gs[0] : mergeGeometries(gs, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      out.push(mesh);
    }
    this.m.clear();
    return out;
  }
}

// Superficie paramétrica fn(u,v,target) con u,v ∈ [0,1]
function surf(fn, nu, nv, { offset = 0, uv = null, flip = false, closedU = false } = {}) {
  const pos = [], uvs = [], idx = [];
  const p = new V3(), a = new V3(), b = new V3(), pu = new V3(), pv = new V3();
  const e = 1e-3;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      fn(u, v, p);
      if (offset) {
        fn(Math.min(1, u + e), v, a); fn(Math.max(0, u - e), v, b); pu.subVectors(a, b);
        fn(u, Math.min(1, v + e), a); fn(u, Math.max(0, v - e), b); pv.subVectors(a, b);
        const n = pu.cross(pv);
        if (n.lengthSq() > 1e-16) { n.normalize(); if (flip) n.negate(); p.addScaledVector(n, offset); }
      }
      pos.push(p.x, p.y, p.z);
      const t = uv ? uv(u, v) : [u, v];
      uvs.push(t[0], t[1]);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const A = j * (nu + 1) + i, B = A + 1, C = A + nu + 1, D = C + 1;
      if (flip) idx.push(A, D, B, A, C, D); else idx.push(A, B, D, A, D, C);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  if (closedU) {
    const n = g.attributes.normal;
    for (let j = 0; j <= nv; j++) {
      const i0 = j * (nu + 1), i1 = i0 + nu;
      a.fromBufferAttribute(n, i0).add(b.fromBufferAttribute(n, i1)).normalize();
      n.setXYZ(i0, a.x, a.y, a.z); n.setXYZ(i1, a.x, a.y, a.z);
    }
  }
  return g;
}

const lathe = (pts, seg = 32, phiStart = 0, phiLen = TAU) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), seg, phiStart, phiLen);
const tube = (pts, r, n = 64, closed = false, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'centripetal'), n, r, radial, closed);
// cilindro con cantos redondeados (radio 1, alto 1, centrado)
const softCyl = (seg = 40, b = 0.08) => lathe([[0.001, -0.5], [1 - b, -0.5], [1 - b * 0.3, -0.5 + b * 0.3], [1, -0.5 + b], [1, 0.5 - b], [1 - b * 0.3, 0.5 - b * 0.3], [1 - b, 0.5], [0.001, 0.5]], seg);
const ringGeo = (R, r, seg = 40, rad = 8) => new THREE.TorusGeometry(R, r, rad, seg).rotateX(Math.PI / 2); // en plano XZ

// Cinta (sección rectangular) a lo largo de puntos con normales "hacia fuera"
function ribbon(P, N, w, th) {
  const n = P.length, pos = [], uvs = [], idx = [];
  const T = new V3(), B = new V3(), Nn = new V3(), c = [new V3(), new V3(), new V3(), new V3()];
  const rings = [];
  for (let i = 0; i < n; i++) {
    T.subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    B.crossVectors(T, N[i]).normalize();
    Nn.crossVectors(B, T).normalize();
    c[0].copy(P[i]).addScaledVector(B, -w / 2).addScaledVector(Nn, th / 2);
    c[1].copy(P[i]).addScaledVector(B, w / 2).addScaledVector(Nn, th / 2);
    c[2].copy(P[i]).addScaledVector(B, w / 2).addScaledVector(Nn, -th / 2);
    c[3].copy(P[i]).addScaledVector(B, -w / 2).addScaledVector(Nn, -th / 2);
    rings.push(c.map((v) => v.clone()));
  }
  let base = 0;
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    for (let i = 0; i < n; i++) {
      const p0 = rings[i][k], p1 = rings[i][k2];
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      uvs.push(i / (n - 1) * 8, 0, i / (n - 1) * 8, 1);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2, b = a + 1, cc = a + 2, d = a + 3;
      idx.push(a, cc, b, b, cc, d);
    }
    base += n * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------
// Texturas procedimentales
// ---------------------------------------------------------------------
const rep = (tex, x, y) => { const t = tex.clone(); t.repeat.set(x, y); t.needsUpdate = true; return t; };

// --- mapas de altura → normal / rugosidad (tileables) ---
function hCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
  draw(ctx, w, h);
  return c;
}
function blurCanvas(c, px) {
  const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
  const t = tmp.getContext('2d');
  // copia en mosaico 3×3 para que el desenfoque sea continuo en los bordes
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) t.drawImage(c, i * c.width, j * c.height);
  const ctx = c.getContext('2d');
  ctx.filter = `blur(${px}px)`;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ctx.drawImage(tmp, i * c.width, j * c.height);
  ctx.filter = 'none';
  return c;
}
function speckle(ctx, w, h, n, seed, lo, hi, smin, smax) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const g = (lo + r() * (hi - lo)) | 0;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    const s = smin + r() * (smax - smin);
    ctx.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.7));
  }
}
function toNormalTex(hc, strength) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(w, h);
  const H = (x, y) => src[((((y + h) % h) * w) + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = -(H(x + 1, y) - H(x - 1, y)) * strength;
      const ny = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      out.data[i] = (nx / l * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}
function grayTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}
// forro polar acolchado (canales horizontales suaves + pelusa)
function quiltNormal() {
  const c = hCanvas(512, 512, (ctx, w, h) => {
    for (let y = 0; y < h; y++) {
      const v = Math.pow(Math.abs(Math.sin((y / h) * Math.PI * 2)), 0.45);
      const g = (70 + 120 * v) | 0;
      ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 0.55;
    speckle(ctx, w, h, 26000, 11, 40, 230, 1, 3);
    ctx.globalAlpha = 1;
  });
  return toNormalTex(blurCanvas(c, 0.8), 2.2);
}
function ribNormal() {
  const c = hCanvas(256, 64, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = (128 + 120 * Math.sin((x / w) * TAU * 16)) | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x, 0, 1, h);
    }
    ctx.globalAlpha = 0.25; speckle(ctx, w, h, 1500, 3, 60, 200, 1, 2); ctx.globalAlpha = 1;
  });
  return toNormalTex(blurCanvas(c, 0.6), 3.0);
}
function plushNormal() {
  const c = hCanvas(512, 512, (ctx, w, h) => {
    const r = rng(21);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, rad = 3 + r() * 9, lt = r() > 0.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, lt ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 0.5; speckle(ctx, w, h, 18000, 9, 40, 220, 1, 2.5); ctx.globalAlpha = 1;
  });
  return toNormalTex(blurCanvas(c, 1.2), 2.6);
}
function webNormal() {
  const c = hCanvas(128, 32, (ctx, w, h) => {
    for (let row = 0; row < h / 4; row++) {
      for (let col = 0; col < w / 6; col++) {
        const up = (row + col) % 2 === 0;
        const g = ctx.createLinearGradient(col * 6, 0, col * 6 + 6, 0);
        g.addColorStop(0, up ? '#606060' : '#404040'); g.addColorStop(0.5, up ? '#f0f0f0' : '#9a9a9a'); g.addColorStop(1, up ? '#606060' : '#404040');
        ctx.fillStyle = g; ctx.fillRect(col * 6, row * 4, 6, 4);
      }
    }
  });
  return toNormalTex(blurCanvas(c, 0.4), 2.0);
}
function fabricRough() {
  return grayTex(blurCanvas(hCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ececec'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 9000, 4, 190, 255, 1, 3);
  }), 0.6));
}
// variación suave de rugosidad para la carcasa (rompe los reflejos)
function shellRough() {
  return grayTex(blurCanvas(hCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, w, h);
    const r = rng(33);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const v = r() > 0.5 ? 255 : 175;
      g.addColorStop(0, `rgba(${v},${v},${v},0.55)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    speckle(ctx, w, h, 3000, 8, 200, 250, 1, 2);
  }), 2));
}

// Icono de brote (dos hojas) en coordenadas unitarias
function drawSprout(ctx, x, y, s, fill, rib) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = 'round';
  ctx.lineWidth = 0.075;
  ctx.beginPath(); ctx.moveTo(0, 0.48); ctx.quadraticCurveTo(0.03, 0.2, 0, 0.04); ctx.stroke();
  const leaf = (ang, L) => {
    ctx.save(); ctx.translate(0, 0.06); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * 0.25, -L * 0.42, L * 0.78, -L * 0.36, L, 0);
    ctx.bezierCurveTo(L * 0.8, L * 0.3, L * 0.3, L * 0.32, 0, 0);
    ctx.fill();
    if (rib) {
      ctx.strokeStyle = rib; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(L * 0.08, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.04, L * 0.86, 0); ctx.stroke();
    }
    ctx.restore();
  };
  leaf(-Math.PI + 0.62, 0.52);
  leaf(-0.62, 0.58);
  ctx.restore();
}

function logoTex() {
  // pecho: disco oscuro con aro verde y brote verde luminoso
  return canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#0f2a17'); g.addColorStop(0.75, '#040b07'); g.addColorStop(1, '#020604');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = GLOW; ctx.shadowBlur = 18;
    ctx.strokeStyle = '#6DFF86'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.44, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 24;
    drawSprout(ctx, w / 2, h * 0.47, w * 0.62, '#7DFF96', '#0f3a1c');
  });
}
function earLogoTex() {
  // oreja (como el arte oficial): disco verde, aro brillante, brote blanco
  return canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.46, h * 0.42, 8, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#2c9c33'); g.addColorStop(0.6, '#13661d'); g.addColorStop(0.86, '#0a3d12'); g.addColorStop(1, '#0a3d12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = '#9dff7a'; ctx.shadowBlur = 16;
    ctx.strokeStyle = '#B8FF9A'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.455, 0, TAU); ctx.stroke();
    ctx.shadowColor = 'rgba(255,255,255,0.7)'; ctx.shadowBlur = 10;
    drawSprout(ctx, w / 2, h * 0.47, w * 0.66, '#FFFFFF', '#2a8f33');
  });
}
function handDecalTex() {
  // dorso de la mano (MANO ECO): hoja, dos arcos y rejilla de 3 barras
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.shadowColor = GLOW; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#8CFF9E'; ctx.fillStyle = '#8CFF9E'; ctx.lineCap = 'round';
    ctx.save(); ctx.rotate(Math.PI); drawSprout(ctx, 0, 8, 84, '#8CFF9E', '#0d3a18'); ctx.restore();
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, 92, Math.PI * 0.62, Math.PI * 0.86); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 78, Math.PI * 0.64, Math.PI * 0.84); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 92, Math.PI * 1.62, Math.PI * 1.86); ctx.stroke();
    for (let k = 0; k < 3; k++) { rr(ctx, 50 + k * 13, 62, 7, 30, 3.5); ctx.fill(); }
  });
}
function leafTex() {
  return canvasTex(256, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#3E8A22'); g.addColorStop(0.45, '#5BB531'); g.addColorStop(1, '#7FCB42');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const e = ctx.createLinearGradient(0, 0, w, 0);
    e.addColorStop(0, 'rgba(25,70,10,.55)'); e.addColorStop(0.22, 'rgba(0,0,0,0)');
    e.addColorStop(0.78, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(25,70,10,.55)');
    ctx.fillStyle = e; ctx.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '210,255,160' : '20,60,10'},${0.05 + r() * 0.08})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(205,245,150,.6)'; ctx.lineWidth = 3.5;
    for (let k = 1; k <= 8; k++) {
      const y0 = h * (1 - (k / 9) * 0.93);
      for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(w / 2, y0);
        ctx.quadraticCurveTo(w / 2 + sd * w * 0.22, y0 - h * 0.05, w / 2 + sd * w * 0.47, y0 - h * 0.13);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#C9EE9C'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, 6); ctx.stroke();
  });
}
function patchEcoTex() {
  return canvasTex(320, 200, (ctx, w, h) => {
    ctx.fillStyle = '#F7F5EE'; rr(ctx, 4, 4, w - 8, h - 8, 26); ctx.fill();
    ctx.strokeStyle = '#4C9A35'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
    rr(ctx, 14, 14, w - 28, h - 28, 18); ctx.stroke(); ctx.setLineDash([]);
    drawSprout(ctx, w / 2, 62, 88, '#3F9A2E', '#F7F5EE');
    ctx.fillStyle = '#2E7D2A'; ctx.font = `800 52px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EcoAccess', w / 2, 140);
  });
}
function patchUpcTex() {
  return canvasTex(320, 200, (ctx, w, h) => {
    ctx.fillStyle = '#2F8A3C'; rr(ctx, 4, 4, w - 8, h - 8, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(230,255,220,.85)'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
    rr(ctx, 14, 14, w - 28, h - 28, 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 104px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('UPC', w / 2, h / 2 + 6);
  });
}
function patchLeafTex() {
  return canvasTex(256, 200, (ctx, w, h) => {
    ctx.fillStyle = '#5DAA34'; rr(ctx, 4, 4, w - 8, h - 8, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(235,255,220,.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    rr(ctx, 14, 14, w - 28, h - 28, 18); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.5);
    ctx.fillStyle = '#F4FFF0';
    ctx.beginPath(); ctx.moveTo(-80, 0);
    ctx.bezierCurveTo(-40, -52, 40, -52, 82, 0); ctx.bezierCurveTo(40, 46, -40, 46, -80, 0); ctx.fill();
    ctx.strokeStyle = '#5DAA34'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.stroke();
    ctx.restore();
  });
}
function decalLeafTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.8);
    ctx.fillStyle = '#F2FFF0';
    ctx.beginPath(); ctx.moveTo(-100, 0);
    ctx.bezierCurveTo(-50, -66, 50, -66, 104, 0); ctx.bezierCurveTo(50, 60, -50, 60, -100, 0); ctx.fill();
    ctx.strokeStyle = '#3E9A2A'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(90, 0); ctx.stroke();
    ctx.restore();
  });
}
function tabLeafTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.shadowColor = GLOW; ctx.shadowBlur = 26;
    drawSprout(ctx, w / 2, h * 0.47, w * 0.66, '#E2FFE8', 'rgba(60,180,90,.9)');
  });
}
function shadowBlobTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(10,30,18,0.55)'); g.addColorStop(0.55, 'rgba(10,30,18,0.22)'); g.addColorStop(1, 'rgba(10,30,18,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
function defaultTabScreen(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0F3B22'); g.addColorStop(1, '#0A2416');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = GLOW; ctx.shadowBlur = 20;
  drawSprout(ctx, w / 2, h * 0.4, 170, '#8CF29A', '#0F3B22');
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF'; ctx.font = `800 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('EcoAccess', w / 2, h * 0.75);
}

// ---------------------------------------------------------------------
// Cara del visor
// ---------------------------------------------------------------------
let ledMask = null, ledLayer = null;
function ledPattern(ctx) {
  if (!ledMask) {
    ledMask = document.createElement('canvas');
    ledMask.width = ledMask.height = 5;
    const c = ledMask.getContext('2d');
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(2.5, 2.5, 2.05, 0, TAU); c.fill();
  }
  return ctx.createPattern(ledMask, 'repeat');
}
function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

function drawEye(ctx, cx, cy, open, px, py) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, Math.max(0.06, open));
  const RX = 116, RY = 104;
  // anillo exterior brillante (grueso para leerse a tamaño pequeño)
  ctx.fillStyle = '#7DFF96'; ell(ctx, 0, 0, RX, RY); ctx.fill();
  // anillo oscuro del iris
  ctx.fillStyle = '#04160B'; ell(ctx, 0, 0, RX - 20, RY - 20); ctx.fill();
  // iris: degradado verde brillante, más intenso abajo
  const ir = ctx.createRadialGradient(px, py + 40, 6, px, py + 10, RY - 26);
  ir.addColorStop(0, '#C8FFD2'); ir.addColorStop(0.35, '#55F27A'); ir.addColorStop(0.8, '#1C9A42'); ir.addColorStop(1, '#0B4A20');
  ctx.save(); ell(ctx, 0, 0, RX - 30, RY - 30); ctx.clip();
  ctx.fillStyle = ir; ctx.fillRect(-RX, -RY, RX * 2, RY * 2);
  // pupila
  ctx.fillStyle = '#010603'; ctx.beginPath(); ctx.arc(px, py - 2, 50, 0, TAU); ctx.fill();
  ctx.restore();
  // brillos especulares
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(px - 24, py - 30, 21, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 26, py + 22, 9, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawFaceImage(ctx, w, h, mood, blink, look) {
  ctx.save();
  ctx.scale(w / 1024, h / 512);
  ctx.fillStyle = '#04070a'; ctx.fillRect(0, 0, 1024, 512);
  ctx.drawImage(faceImg, 0, 0, 1024, 512);
  const G1 = '#8CFFA0';
  for (const [cx, cy, rx, ry, irx, iry] of FACE_EYES) {
    // mirada: se redibuja el iris desplazado dentro de su propio contorno
    if (Math.abs(look) > 0.02) {
      ctx.save();
      ell(ctx, cx, cy + 6, irx, iry); ctx.clip();
      ctx.fillStyle = '#04070a'; ctx.fillRect(cx - irx, cy - iry, irx * 2, iry * 2 + 12);
      const dx = look * 22, pad = 18;
      ctx.drawImage(faceImg, cx - irx - pad, cy - iry - pad, (irx + pad) * 2, (iry + pad) * 2 + 12,
        cx - irx - pad + dx, cy - iry - pad, (irx + pad) * 2, (iry + pad) * 2 + 12);
      ctx.restore();
    }
    // feliz: párpados inferiores que suben en arco
    if (mood === 'happy' && blink < 0.8) {
      ctx.save();
      ell(ctx, cx, cy, rx + 14, ry + 14); ctx.clip();
      const top = cy + ry * 0.18;
      ctx.fillStyle = '#04070a';
      ctx.beginPath(); ctx.moveTo(cx - rx - 20, cy + ry + 20); ctx.lineTo(cx - rx - 20, top + ry * 0.55);
      ctx.quadraticCurveTo(cx, top - ry * 0.45, cx + rx + 20, top + ry * 0.55); ctx.lineTo(cx + rx + 20, cy + ry + 20); ctx.fill();
      ctx.shadowColor = GLOW; ctx.shadowBlur = 18; ctx.strokeStyle = G1; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - rx * 0.86, top + ry * 0.38); ctx.quadraticCurveTo(cx, top - ry * 0.45, cx + rx * 0.86, top + ry * 0.38); ctx.stroke();
      ctx.restore();
    }
    // parpadeo: párpado superior negro con borde verde
    if (blink > 0.02) {
      ctx.save();
      ell(ctx, cx, cy, rx + 16, ry + 16); ctx.clip();
      const edge = cy - ry - 16 + (2 * ry + 32) * Math.min(1, blink * 1.04);
      ctx.fillStyle = '#04070a'; ctx.fillRect(cx - rx - 20, cy - ry - 20, rx * 2 + 40, edge - (cy - ry - 20));
      ctx.restore();
      if (blink > 0.15) {
        ctx.save();
        ctx.shadowColor = GLOW; ctx.shadowBlur = 18; ctx.strokeStyle = G1; ctx.lineWidth = 16; ctx.lineCap = 'round';
        const yy = Math.min(edge, cy + ry * 0.55);
        const half = rx * Math.sqrt(Math.max(0.15, 1 - ((yy - cy) / (ry + 16)) ** 2));
        ctx.beginPath(); ctx.moveTo(cx - half * 0.9, yy); ctx.quadraticCurveTo(cx, yy + 18 * blink, cx + half * 0.9, yy); ctx.stroke();
        ctx.restore();
      }
    }
  }
  // textura LED sutil sobre los trazos añadidos
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.18; ctx.fillStyle = ledPattern(ctx); ctx.fillRect(0, 0, 1024, 512);
  ctx.restore();
}

export function drawEcoFace(ctx, w, h, mood = 'idle', blink = 0, look = 0) {
  blink = clamp(blink || 0, 0, 1); look = clamp(look || 0, -1, 1);
  if (ctx && ctx.canvas) lastFaceArgs.set(ctx.canvas, [mood, blink, look]);
  if (faceImg && (mood === 'idle' || mood === 'happy' || !mood)) { drawFaceImage(ctx, w, h, mood, blink, look); return; }
  const W = 1024, H = 512;
  // capa de símbolos (nítida) que luego se convierte en matriz de LEDs
  if (!ledLayer) { ledLayer = document.createElement('canvas'); ledLayer.width = W; ledLayer.height = H; }
  const L = ledLayer.getContext('2d');
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, W, H);
  const KX = 1.38;
  L.setTransform(KX, 0, 0, 1, 0, 0); // se dibuja en un espacio virtual de 742×512
  L.lineCap = 'round'; L.lineJoin = 'round';
  const G1 = '#7DFF96';
  const lx = look * 26;
  const VC = W / KX / 2;
  const E = [[-1, VC - 200], [1, VC + 200]];
  const EY = 245;
  // cejas
  for (const [s, cx] of E) {
    let lift = 0, tilt = 0;
    if (mood === 'think') { lift = s < 0 ? 30 : -6; tilt = s < 0 ? -0.1 : 0.14; }
    else if (mood === 'question') { lift = 22; tilt = -s * 0.08; }
    else if (mood === 'happy') lift = 12;
    L.save(); L.translate(cx + lx * 0.3, 74 - lift); L.rotate(tilt);
    L.strokeStyle = G1; L.lineWidth = 30;
    L.beginPath(); L.arc(0, 84, 104, Math.PI * 1.3, Math.PI * 1.7); L.stroke();
    L.restore();
  }
  // ojos
  for (const [, cx] of E) {
    if (mood === 'question') {
      L.fillStyle = G1; L.font = `900 270px ${FONT}`; L.textAlign = 'center'; L.textBaseline = 'middle';
      L.fillText('?', cx + lx * 0.5, EY + 14);
    } else if (mood === 'happy') {
      L.strokeStyle = G1; L.lineWidth = 34;
      L.beginPath(); L.arc(cx, EY + 50, 92, Math.PI * 1.16, Math.PI * 1.84); L.stroke();
    } else if (blink > 0.8) {
      L.strokeStyle = G1; L.lineWidth = 28;
      L.beginPath(); L.arc(cx, EY - 44, 92, Math.PI * 0.22, Math.PI * 0.78); L.stroke();
    } else {
      const py = mood === 'think' ? -26 : 6;
      const px = mood === 'think' ? 26 : lx;
      drawEye(L, cx, EY, 1 - blink, px, py);
    }
  }
  // mejillas
  L.fillStyle = G1;
  for (const [s, cx] of E) {
    if (mood === 'happy') {
      for (let k = 0; k < 3; k++) { L.save(); L.translate(cx + s * 62 + (k - 1) * 26, 404); L.rotate(0.35); rr(L, -7, -18, 14, 36, 7); L.fill(); L.restore(); }
    } else {
      rr(L, cx + s * 62 - 38, 396, 76, 22, 11); L.fill();
    }
  }
  // boca
  L.save();
  L.translate(VC + 24 + lx * 0.45, 406);
  if (mood === 'think') {
    L.strokeStyle = G1; L.lineWidth = 22;
    L.beginPath(); L.moveTo(-48, 6); L.bezierCurveTo(-18, -12, 16, 20, 48, -2); L.stroke();
    L.fillStyle = G1;
    for (let k = 0; k < 3; k++) { L.beginPath(); L.arc(96 + k * 32, -30 - k * 18, 10 + k * 2, 0, TAU); L.fill(); }
  } else if (mood === 'question') {
    L.strokeStyle = G1; L.lineWidth = 22; ell(L, 0, 8, 26, 30); L.stroke();
  } else {
    const k = mood === 'happy' ? 1.28 : 1.08;
    L.scale(k, k);
    const mg = L.createLinearGradient(0, -12, 0, 66);
    mg.addColorStop(0, '#E2FFE6'); mg.addColorStop(0.4, '#8CFFA2'); mg.addColorStop(1, '#3FD866');
    L.fillStyle = mg;
    L.beginPath(); L.moveTo(-80, -10);
    L.quadraticCurveTo(0, 4, 80, -10);
    L.bezierCurveTo(72, 66, -72, 66, -80, -10);
    L.fill();
    L.fillStyle = '#0F5A26';
    ell(L, 0, 36, 34, 12); L.fill();
  }
  L.restore();

  // --- composición final ---
  ctx.save();
  ctx.scale(w / W, h / H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#08110c'); bg.addColorStop(0.55, '#030705'); bg.addColorStop(1, '#010302');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // rejilla de LEDs apagados (muy tenue)
  ctx.globalAlpha = 0.07; ctx.fillStyle = ledPattern(ctx); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  // halo suave
  ctx.filter = 'blur(16px)'; ctx.globalAlpha = 0.55; ctx.drawImage(ledLayer, 0, 0);
  ctx.filter = 'blur(5px)'; ctx.globalAlpha = 0.5; ctx.drawImage(ledLayer, 0, 0);
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  // símbolos recortados en puntos LED
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'destination-in';
  L.fillStyle = ledPattern(L); L.fillRect(0, 0, W, H);
  L.globalCompositeOperation = 'source-over';
  ctx.drawImage(ledLayer, 0, 0);
  ctx.restore();
}


// ---------------------------------------------------------------------
// Manos
// ---------------------------------------------------------------------
const FINGERS = [
  { z: 0.037, L: [0.047, 0.037, 0.031], r: 0.0138 },
  { z: 0.0125, L: [0.051, 0.04, 0.032], r: 0.0142 },
  { z: -0.0125, L: [0.047, 0.037, 0.031], r: 0.0138 },
  { z: -0.036, L: [0.038, 0.03, 0.026], r: 0.0126 },
];
const FIST = [1.5, 1.75, 1.3];
export const HAND_SHAPES = {
  open:     { f: [[0.06, 0.08, 0.05], [0.04, 0.06, 0.04], [0.07, 0.08, 0.05], [0.12, 0.1, 0.06]], spread: 0.14, t: [-1.0, 0, 0.12], tc: 0.05 },
  relaxed:  { f: [[0.3, 0.4, 0.3], [0.36, 0.46, 0.3], [0.44, 0.5, 0.32], [0.52, 0.56, 0.36]], spread: 0.05, t: [-0.7, 0, 0.32], tc: 0.25 },
  hold:     { f: [[0.55, 1.05, 0.95], [0.55, 1.05, 0.95], [0.6, 1.05, 0.95], [0.65, 1.05, 0.9]], spread: 0.02, t: [-0.85, 0, 0.75], tc: 0.55 },
  thumbsUp: { f: [FIST, FIST, FIST, FIST], spread: 0, t: [-1.55, 0, -0.18], tc: -0.05 },
  point:    { f: [[0.02, 0.03, 0.02], FIST, FIST, FIST], spread: 0, t: [-0.45, 0, 1.0], tc: 0.6 },
};
const copyShape = (s) => ({ f: s.f.map((a) => a.slice()), spread: s.spread, t: s.t.slice(), tc: s.tc });

// Mano con piel rígida: todos los segmentos en 3 SkinnedMesh (blanco, brillo, juntas)
function buildHand(s, M) {
  const softCyl = (seg = 40, b = 0.08) => lathe([[0.001, -0.5], [1 - b, -0.5], [1 - b * 0.3, -0.5 + b * 0.3], [1, -0.5 + b], [1, 0.5 - b], [1 - b * 0.3, 0.5 - b * 0.3], [1 - b, 0.5], [0.001, 0.5]], seg);
  const hand = new THREE.Group();
  const root = new THREE.Bone(); hand.add(root);
  const bones = [root];
  const lists = new Map();
  const add = (geo, mat, bone, local) => {
    const g = geo.clone();
    if (local) g.applyMatrix4(Array.isArray(local) ? M4(...local) : local);
    bone.updateWorldMatrix(true, false);
    g.applyMatrix4(bone.matrixWorld);
    const n = g.attributes.position.count, bi = bones.indexOf(bone);
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    if (!lists.has(mat)) lists.set(mat, []);
    lists.get(mat).push(g);
  };
  const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); parent.add(b); bones.push(b); return b; };
  // palma y muñeca
  // muñeca: aro grueso negro cromado con banda verde luminosa
  add(softCyl(32, 0.2), M.wristRing, root, [0, -0.008, 0, 0, 0, 0, 0.041, 0.036, 0.041]);
  add(ringGeo(0.0415, 0.0042, 36, 6), M.glow, root, [0, -0.008, 0]);
  add(ringGeo(0.036, 0.004, 32, 5), M.gap, root, [0, -0.027, 0]);
  // carcasa de la palma: perla brillante, más bombeada en el dorso
  add(new RoundedBoxGeometry(0.054, 0.09, 0.106, 4, 0.025), M.white, root, [0, -0.066, 0]);
  add(new THREE.SphereGeometry(1, 20, 12), M.white, root, [s * 0.008, -0.064, 0, 0, 0, 0, 0.024, 0.044, 0.05]);
  add(new THREE.SphereGeometry(0.026, 16, 12), M.white, root, [-s * 0.012, -0.048, 0.043, 0, 0, 0, 0.9, 1.2, 1]);
  // junta de la carcasa (línea oscura en el dorso)
  add(tube([new V3(s * 0.0285, -0.03, -0.054), new V3(s * 0.031, -0.05, -0.01), new V3(s * 0.0295, -0.083, 0.03), new V3(s * 0.026, -0.1, 0.05)], 0.0016, 16, false, 4), M.seam, root);
  // logotipo de hoja + arcos + rejilla luminosos en el dorso
  add(new THREE.PlaneGeometry(0.082, 0.082).rotateY(s * Math.PI / 2), M.handDecal, root, [s * 0.0322, -0.064, 0.0]);
  const seg = (b, r, len) => {
    const L = len - 0.009;
    const cl = Math.max(0.002, L - 2 * r);
    const sy = Math.min(1, L / (cl + 2 * r));
    add(new THREE.CapsuleGeometry(r, cl, 3, 10), M.white, b, [0, -0.0045 - L / 2, 0, 0, 0, 0, 1, sy, 1]);
    // ranura entre segmentos: núcleo oscuro con banda verde brillante
    add(softCyl(12, 0.2), M.gap, b, [0, 0, 0, 0, 0, 0, r * 0.84, 0.011, r * 0.84]);
    add(new THREE.TorusGeometry(r * 0.84, r * 0.17, 4, 14).rotateX(Math.PI / 2), M.glow, b);
  };
  const fingers = [];
  for (const F of FINGERS) {
    const j1 = bone(root, -s * 0.003, -0.1, F.z);
    seg(j1, F.r, F.L[0]);
    const j2 = bone(j1, 0, -F.L[0], 0);
    seg(j2, F.r * 0.97, F.L[1]);
    const j3 = bone(j2, 0, -F.L[1], 0);
    seg(j3, F.r * 0.94, F.L[2] + 0.004);
    fingers.push([j1, j2, j3]);
  }
  const t1 = bone(root, -s * 0.016, -0.043, 0.048);
  seg(t1, 0.0156, 0.045);
  const t2 = bone(t1, 0, -0.045, 0);
  seg(t2, 0.015, 0.042);
  hand.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  for (const [mat, list] of lists) {
    const anyNon = list.some((g) => !g.index);
    const geo = mergeGeometries(anyNon ? list.map((g) => (g.index ? g.toNonIndexed() : g)) : list, false);
    const m = new THREE.SkinnedMesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    hand.add(m);
    m.bind(skeleton);
  }
  const h = { group: hand, fingers, thumb: [t1, t2], s, cur: copyShape(HAND_SHAPES.relaxed), target: copyShape(HAND_SHAPES.relaxed) };
  applyHand(h);
  return h;
}
function applyHand(h) {
  const { s, cur } = h;
  h.fingers.forEach((f, i) => {
    f[0].rotation.set(-cur.spread * (FINGERS[i].z / 0.037), 0, -s * cur.f[i][0]);
    f[1].rotation.z = -s * cur.f[i][1];
    f[2].rotation.z = -s * cur.f[i][2];
  });
  h.thumb[0].rotation.set(cur.t[0], cur.t[1] * s, -s * cur.t[2]);
  h.thumb[1].rotation.z = -s * cur.tc;
}
function dampHand(h, k) {
  const c = h.cur, t = h.target;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.f[i][j] += (t.f[i][j] - c.f[i][j]) * k;
  c.spread += (t.spread - c.spread) * k;
  for (let j = 0; j < 3; j++) c.t[j] += (t.t[j] - c.t[j]) * k;
  c.tc += (t.tc - c.tc) * k;
  applyHand(h);
}

// ---------------------------------------------------------------------
// Solver de brazo (descenso por coordenadas, sólo en construcción)
// ---------------------------------------------------------------------
function solveArm(chain, target, guesses, limits) {
  const [sh, el, wr] = chain;
  const bx = new V3(), by = new V3(), bz = new V3(), P = new V3();
  const apply = (p) => {
    sh.rotation.set(p[0], p[1], p[2]); el.rotation.set(p[3], p[4], p[5]); wr.rotation.set(p[6], p[7], p[8]);
    wr.updateWorldMatrix(true, false);
  };
  const cost = (p, g) => {
    apply(p);
    wr.matrixWorld.extractBasis(bx, by, bz); bx.normalize(); by.normalize(); bz.normalize();
    P.setFromMatrixPosition(wr.matrixWorld);
    let c = P.distanceToSquared(target.pos) * 600 + (3 - bx.dot(target.x) - by.dot(target.y) - bz.dot(target.z)) * 0.8;
    for (let i = 0; i < 9; i++) c += (p[i] - g[i]) ** 2 * (i >= 6 ? 0.03 : 0.008);
    return c;
  };
  let best = null, bestC = Infinity;
  for (const g of guesses) {
    const p = g.slice();
    let c = cost(p, g);
    for (const step of [0.4, 0.2, 0.1, 0.05, 0.025, 0.012, 0.006, 0.003]) {
      for (let it = 0; it < 80; it++) {
        let improved = false;
        for (let i = 0; i < 9; i++) {
          for (const d of [1, -1]) {
            const old = p[i];
            p[i] = clamp(old + d * step, limits[i][0], limits[i][1]);
            const nc = cost(p, g);
            if (nc < c - 1e-10) { c = nc; improved = true; break; }
            p[i] = old;
          }
        }
        if (!improved) break;
      }
    }
    if (c < bestC) { bestC = c; best = p.slice(); }
  }
  apply(best);
  return best.map((v) => +v.toFixed(4));
}
function handFrame(pos, fingers, palm, s) {
  const y = new V3(...fingers).normalize().negate();
  const x = new V3(...palm).normalize().multiplyScalar(-s);
  x.addScaledVector(y, -x.dot(y)).normalize();
  const z = new V3().crossVectors(x, y);
  return { pos: new V3(...pos), x, y, z };
}

// ---------------------------------------------------------------------
// ECO
// ---------------------------------------------------------------------
// Dimensiones de la cabeza (elipsoide) en el espacio de headG
const RX = 0.41, RY = 0.35, RZ = 0.38, HC = 0.35;
const NECK_Y = 1.26, HIP_Y = 0.7, SH_X = 0.345, SH_Y = 1.1;
const UPPER = 0.24, FORE = 0.25;
const BS = 0.83, HS = 1.25; // escala del cuerpo y de la cabeza (cabeza ≈ 42 % de la altura)
const TAB_W = 0.44, TAB_H = 0.33, TAB_D = 0.022;

function headPt(th, ph, off, t) {
  const dx = Math.sin(th) * Math.cos(ph), dy = Math.sin(ph), dz = Math.cos(th) * Math.cos(ph);
  t.set(RX * dx, RY * dy, RZ * dz);
  if (off) {
    const n = new V3(t.x / (RX * RX), t.y / (RY * RY), t.z / (RZ * RZ)).normalize();
    t.addScaledVector(n, off);
  }
  t.y += HC;
  return t;
}

// Chaqueta: perfil (y, r) y apertura frontal
const JK = [[0.63, 0.3], [0.7, 0.306], [0.8, 0.314], [0.9, 0.318], [1.0, 0.316], [1.06, 0.308], [1.1, 0.293],
  [1.14, 0.27], [1.17, 0.238], [1.19, 0.198], [1.204, 0.152], [1.212, 0.11]].map(([y, r]) => [y, r * 1.07]);
const jkCurve = new THREE.SplineCurve(JK.map(([y, r]) => new THREE.Vector2(r, y)));
const jkSamples = jkCurve.getPoints(400);
function jacketR(y) {
  const S = jkSamples;
  if (y <= S[0].y) return S[0].x;
  for (let i = 1; i < S.length; i++) {
    if (S[i].y >= y) { const a = S[i - 1], b = S[i]; return a.x + (b.x - a.x) * ((y - a.y) / Math.max(1e-6, b.y - a.y)); }
  }
  return S[S.length - 1].x;
}
const jkGap = (y) => 0.17 + 0.23 * sstep(0.7, 1.12, y) + 0.38 * sstep(1.12, 1.212, y);
function jacketPoint(y, a, t, r0) {
  const g = jkGap(y);
  let an = ((a % TAU) + TAU) % TAU;
  const dEdge = Math.max(0, Math.min(an - g, TAU - g - an));
  let r = r0 ?? jacketR(y);
  r *= 1 + 0.008 * Math.sin(3 * a + 11 * y) + 0.006 * Math.sin(7 * a - 17 * y + 1) + 0.028 * Math.exp(-dEdge / 0.05);
  return t.set(r * Math.sin(a), y, r * 0.78 * Math.cos(a));
}

export function makeEco() {
  const root = new THREE.Group();
  root.name = 'eco';

  // ---------- materiales ----------
  const quilt = quiltNormal(), ribN = ribNormal(), plush = plushNormal(), web = webNormal();
  const fRough = fabricRough(), sRough = shellRough();
  const n2 = (x) => new THREE.Vector2(x, x);
  const fab = (o, nTex, rx, ry, ns = 0.6) => new THREE.MeshPhysicalMaterial(Object.assign({
    roughness: 0.92, roughnessMap: rep(fRough, rx, ry), normalMap: rep(nTex, rx, ry), normalScale: n2(ns),
    sheen: 1, sheenRoughness: 0.55,
  }, o));
  const M = {
    white: new THREE.MeshPhysicalMaterial({ color: 0xF2F1EC, roughness: 0.34, roughnessMap: sRough, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: 0xffffff, sheenRoughness: 0.4, iridescence: 0.15, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 220] }),
    dark: new THREE.MeshPhysicalMaterial({ color: 0x15191a, roughness: 0.42, metalness: 0.5, clearcoat: 0.5 }),
    gap: new THREE.MeshStandardMaterial({ color: 0x070908, roughness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe2e6e8, metalness: 1, roughness: 0.15 }),
    darkChrome: new THREE.MeshStandardMaterial({ color: 0x4a5250, metalness: 1, roughness: 0.2 }),
    rim: new THREE.MeshPhysicalMaterial({ color: 0x1a3423, metalness: 0.9, roughness: 0.18, clearcoat: 1 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x2c3330, roughness: 0.7 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x5CFF7A, emissive: 0x5CFF7A, emissiveIntensity: 4.5, roughness: 0.35 }),
    fabric: fab({ color: 0xE9E2D0, sheenColor: 0xfff0d2, side: THREE.DoubleSide }, quilt, 8, 3),
    sleeve: fab({ color: 0xE9E2D0, sheenColor: 0xfff0d2 }, quilt, 3, 1.4),
    greenFab: fab({ color: 0x3E8A22, sheenColor: 0x9ed86a, sheenRoughness: 0.35, side: THREE.DoubleSide }, plush, 3, 2, 0.8),
    ribHem: fab({ color: 0x3C8620, sheenColor: 0x8ccf5a, side: THREE.DoubleSide }, ribN, 8, 1, 0.9),
    ribCuff: fab({ color: 0x3C8620, sheenColor: 0x8ccf5a }, ribN, 2.5, 1, 0.9),
    pack: fab({ color: 0x2F6E1C, sheenColor: 0x7fbf55, sheen: 0.6 }, plush, 2, 2, 0.5),
    strap: fab({ color: 0x24491B, sheenColor: 0x6f9f50, sheen: 0.5, roughness: 0.8 }, web, 1, 1, 0.8),
    bottle: new THREE.MeshPhysicalMaterial({ color: 0x3E9E2A, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x121514, roughness: 0.55, clearcoat: 0.3 }),
    alu: new THREE.MeshPhysicalMaterial({ color: 0xC6CBCF, metalness: 0.92, roughness: 0.3, roughnessMap: sRough }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x050706, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 }),
    zipTape: new THREE.MeshStandardMaterial({ color: 0x3a3d3a, roughness: 0.8 }),
    hole: new THREE.MeshStandardMaterial({ color: 0x0b1a10, emissive: 0x2a9a48, emissiveIntensity: 1.2, roughness: 0.6 }),
    stem: new THREE.MeshPhysicalMaterial({ color: 0x4f9a2c, roughness: 0.4, clearcoat: 0.6, sheen: 0.25, sheenColor: 0x9fdc70 }),
    midrib: new THREE.MeshPhysicalMaterial({ color: 0x9fd86a, roughness: 0.35, clearcoat: 0.8 }),
  };
  const hd = handDecalTex();
  M.handDecal = new THREE.MeshStandardMaterial({ map: hd, emissiveMap: hd, emissive: 0x5CFF7A, emissiveIntensity: 2.8, transparent: true, alphaTest: 0.08, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  M.wristRing = new THREE.MeshPhysicalMaterial({ color: 0x15191a, metalness: 0.9, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  M.accent = new THREE.MeshPhysicalMaterial({ color: 0x2a7a22, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, metalness: 0.1 });
  const earLogo = earLogoTex();
  M.earLogo = new THREE.MeshStandardMaterial({ map: earLogo, emissiveMap: earLogo, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.2 });
  M.glowSoft = new THREE.MeshStandardMaterial({ color: 0x5CFF7A, emissive: 0x5CFF7A, emissiveIntensity: 2.7, roughness: 0.35 });
  M.leaf = new THREE.MeshPhysicalMaterial({ map: leafTex(), roughness: 0.36, sheen: 0.3, sheenRoughness: 0.4, sheenColor: 0xb8f080, clearcoat: 0.85, clearcoatRoughness: 0.12, side: THREE.DoubleSide, emissive: 0x2a6a10, emissiveIntensity: 0.25 });
  const logo = logoTex();
  M.logo = new THREE.MeshStandardMaterial({ map: logo, emissiveMap: logo, emissive: 0xffffff, emissiveIntensity: 3.2, roughness: 0.22 });
  const tabLeaf = tabLeafTex();
  M.tabLeaf = new THREE.MeshStandardMaterial({ map: tabLeaf, emissiveMap: tabLeaf, emissive: 0xffffff, emissiveIntensity: 3.2, transparent: true, depthWrite: false, roughness: 0.3 });
  const patchMat = (tex) => new THREE.MeshPhysicalMaterial({ map: tex, alphaTest: 0.5, roughness: 0.85, roughnessMap: fRough, normalMap: rep(quilt, 0.5, 0.5), normalScale: n2(0.35), sheen: 0.4, sheenColor: 0xffffff, side: THREE.DoubleSide });
  M.patchEco = patchMat(patchEcoTex());
  M.patchUpc = patchMat(patchUpcTex());
  M.patchLeaf = patchMat(patchLeafTex());
  M.decal = new THREE.MeshPhysicalMaterial({ map: decalLeafTex(), alphaTest: 0.5, roughness: 0.25, clearcoat: 1 });
  const faceTex = canvasTex(1024, 512, (ctx, w, h) => drawEcoFace(ctx, w, h, 'idle', 0, 0));
  // placa de la cara: emisiva y mate; el brillo lo aporta la cúpula de vidrio exterior
  M.visor = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: faceTex, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 1.3, roughness: 0.45, envMapIntensity: 0.15 });
  M.visorGlass = new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.25, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.5, depthWrite: false });
  const glowMats = [M.glow, M.glowSoft, M.logo, M.earLogo, M.handDecal, M.tabLeaf, M.hole];
  for (const m of glowMats) m.userData.base = m.emissiveIntensity;



  // ---------- jerarquía ----------
  const scaler = new THREE.Group(); scaler.scale.setScalar(BS); root.add(scaler);
  const body = new THREE.Group(); body.name = 'eco-body';
  body.position.y = HIP_Y;
  scaler.add(body);
  const upper = new THREE.Group(); upper.position.y = -HIP_Y;
  body.add(upper);

  // ---------- piernas ----------
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.125, 0, 0.0); leg.rotation.y = s * 0.09;
    scaler.add(leg);
    const P = new Parts();
    P.add(lathe([[0.001, 0.455], [0.066, 0.46], [0.087, 0.49], [0.096, 0.56], [0.098, 0.63], [0.09, 0.69], [0.06, 0.715], [0.001, 0.72]], 30), M.white);
    P.add(softCyl(28, 0.12), M.dark, [0, 0.443, 0, 0, 0, 0, 0.062, 0.05, 0.062]);
    P.add(ringGeo(0.07, 0.006, 40, 6), M.gap, [0, 0.462, 0]);
    P.add(ringGeo(0.078, 0.006, 40, 6), M.gap, [0, 0.428, 0]);
    P.add(ringGeo(0.064, 0.0068, 32, 6), M.glow, [0, 0.442, 0]);
    P.add(new THREE.SphereGeometry(1, 24, 16), M.white, [0, 0.447, 0.058, 0, 0, 0, 0.058, 0.05, 0.03]);
    P.add(lathe([[0.001, 0.1], [0.112, 0.11], [0.12, 0.16], [0.116, 0.22], [0.108, 0.3], [0.1, 0.37], [0.093, 0.405], [0.075, 0.422], [0.001, 0.428]], 32), M.white);
    P.add(ringGeo(0.098, 0.0062, 36, 6), M.glow, [0, 0.39, 0]);
    P.add(ringGeo(0.1, 0.004, 44, 6), M.dark, [0, 0.31, 0]);
    // pie
    const foot = new THREE.SphereGeometry(1, 32, 20);
    const fp = foot.attributes.position;
    for (let i = 0; i < fp.count; i++) if (fp.getY(i) < -0.55) fp.setY(i, -0.55);
    foot.computeVertexNormals();
    P.add(foot, M.white, [0, 0.105, 0.05, 0, 0, 0, 0.132, 0.1, 0.195]);
    P.add(softCyl(44, 0.22), M.black, [0, 0.027, 0.05, 0, 0, 0, 0.14, 0.054, 0.207]);
    P.add(ringGeo(1, 0.02, 44, 6), M.gap, [0, 0.053, 0.05, 0, 0, 0, 0.133, 1, 0.197]);
    const strip = [];
    for (let i = 0; i <= 24; i++) {
      const al = -1.35 + (i / 24) * 2.7;
      strip.push(new V3(0.126 * Math.sin(al), 0.078, 0.05 + 0.186 * Math.cos(al)));
    }
    P.add(tube(strip, 0.0065, 48), M.glow);
    P.add(ringGeo(0.117, 0.006, 36, 6), M.glow, [0, 0.165, 0]);
    P.add(ringGeo(0.116, 0.004, 44, 6), M.gap, [0, 0.182, 0]);
    P.build(leg);
  }

  // ---------- pelvis, cuerpo interior ----------
  {
    const P = new Parts();
    P.add(new THREE.SphereGeometry(1, 28, 16), M.white, [0, 0.66, 0, 0, 0, 0, 0.215, 0.1, 0.165]);
    for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.072, 20, 14), M.dark, [s * 0.125, 0.69, 0]);
    P.add(new THREE.SphereGeometry(1, 32, 22), M.white, [0, 0.88, 0, 0, 0, 0, 0.27, 0.4, 0.232]);
    P.add(ringGeo(1, 0.08, 48, 8), M.dark, [0, 0.79, 0, 0, 0, 0, 0.25, 0.25, 0.217]);
    P.add(ringGeo(1, 0.05, 48, 8), M.glow, [0, 0.765, 0, 0, 0, 0, 0.246, 0.25, 0.213]);
    // cuello
    P.add(softCyl(28, 0.15), M.darkChrome, [0, 1.215, 0, 0, 0, 0, 0.074, 0.08, 0.074]);
    P.add(ringGeo(0.078, 0.007, 32, 6), M.gap, [0, 1.19, 0]);
    P.add(ringGeo(0.074, 0.009, 32, 8), M.chrome, [0, 1.245, 0]);
    // emblema de pecho
    const em = M4(0, 1.04, 0.212, -0.23, 0, 0);
    const emT = (x, y, z, rx = 0) => new THREE.Matrix4().multiplyMatrices(em, M4(x, y, z, rx));
    P.add(new THREE.TorusGeometry(0.055, 0.009, 10, 40), M.darkChrome, emT(0, 0, 0.004));
    P.add(new THREE.TorusGeometry(0.046, 0.0045, 8, 40), M.glow, emT(0, 0, 0.007));
    P.add(softCyl(40, 0.3), M.dark, new THREE.Matrix4().multiplyMatrices(emT(0, 0, -0.002, Math.PI / 2), M4(0, 0, 0, 0, 0, 0, 0.06, 0.014, 0.06)));
    P.add(new THREE.CircleGeometry(0.043, 40), M.logo, emT(0, 0, 0.0065));
    P.build(upper);
  }

  // ---------- chaqueta ----------
  {
    const P = new Parts();
    const jacket = surf((u, v, t) => {
      const q = jkCurve.getPoint(v);
      const g = jkGap(q.y);
      return jacketPoint(q.y, g + u * (TAU - 2 * g), t, q.x);
    }, 90, 34);
    P.add(jacket, M.fabric);
    // bordes delanteros enrollados + cremallera
    const teeth = [];
    for (const s of [-1, 1]) {
      const edge = [], zip = [];
      for (let i = 0; i <= 30; i++) {
        const y = 0.66 + (i / 30) * 0.53;
        const g = jkGap(y);
        const a = s > 0 ? g + 0.004 : TAU - g - 0.004;
        edge.push(jacketPoint(y, a, new V3()));
        const az = s > 0 ? g - 0.012 : TAU - g + 0.012;
        const pz = jacketPoint(y, az, new V3(), jacketR(y) * 1.02);
        zip.push(pz);
      }
      P.add(tube(edge, 0.0115, 80, false, 8), M.fabric);
      P.add(tube(zip.slice(0, 26), 0.0052, 80, false, 6), M.zipTape);
      const crv = new THREE.CatmullRomCurve3(zip.slice(0, 26));
      const nT = 70;
      for (let i = 0; i < nT; i++) {
        const u = (i + (s > 0 ? 0 : 0.5)) / nT;
        const p = crv.getPointAt(u), tg = crv.getTangentAt(u);
        const out = new V3(p.x, 0, p.z).normalize();
        const side = new V3().crossVectors(tg, out).normalize();
        const m = new THREE.Matrix4().makeBasis(side, tg, out).setPosition(p.clone().addScaledVector(out, 0.003).addScaledVector(side, s * 0.0045));
        teeth.push(m);
      }
    }
    const toothG = new THREE.BoxGeometry(0.011, 0.0046, 0.005);
    for (const m of teeth) P.add(toothG, M.chrome, m);
    // tirador de cremallera
    const zp = jacketPoint(0.7, jkGap(0.7) - 0.012, new V3(), jacketR(0.7) * 1.03);
    P.add(new RoundedBoxGeometry(0.018, 0.04, 0.006, 2, 0.003), M.chrome, [zp.x, zp.y - 0.02, zp.z + 0.008, -0.1, 0, 0]);
    P.add(new RoundedBoxGeometry(0.014, 0.012, 0.01, 2, 0.003), M.chrome, [zp.x, zp.y + 0.002, zp.z + 0.004]);
    // dobladillo acanalado (sección redondeada cerrada)
    const hem = surf((u, v, t) => {
      const g = jkGap(0.66) - 0.01;
      const a = g + u * (TAU - 2 * g);
      const ang = v * TAU, c = Math.cos(ang), sn = Math.sin(ang);
      const dr = 0.013 * Math.sign(c) * Math.abs(c) ** 0.5, dy = 0.036 * Math.sign(sn) * Math.abs(sn) ** 0.5;
      const y = 0.655 + dy;
      const r = jacketR(0.66) + 0.006 + dr;
      return jacketPoint(y, a, t, r);
    }, 100, 12);
    P.add(hem, M.ribHem);
    P.build(upper);

    // parches (superficies desplazadas sobre la chaqueta)
    const patch = (mat, y0, y1, a0, a1) => {
      const geo = surf((u, v, t) => jacketPoint(y0 + v * (y1 - y0), a0 + u * (a1 - a0), t), 16, 8, { offset: 0.007 });
      const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; upper.add(m);
    };
    patch(M.patchEco, 1.045, 1.13, -1.0, -0.5);
    patch(M.patchUpc, 1.045, 1.13, 0.5, 1.0);
  }

  // ---------- capucha verde ----------
  {
    const P = new Parts();
    const gapH = 0.5;
    const hood = surf((u, v, t) => {
      const a = gapH + u * (TAU - 2 * gapH);
      const d = Math.min(a - gapH, TAU - gapH - a);
      const taper = 0.3 + 0.7 * sstep(0, 0.7, d);
      const back = 1 + 0.28 * Math.max(0, -Math.cos(a));
      const ang = v * TAU;
      let rad = 0.072 * taper * back * (1 + 0.06 * Math.sin(5 * a + 3 * ang) + 0.04 * Math.sin(11 * a - 2 * ang));
      const cx = 0.215 * Math.sin(a), cz = 0.19 * Math.cos(a);
      const cy = 1.165 - 0.035 * Math.cos(a) - 0.03 * (1 - taper);
      const ox = Math.sin(a), oz = Math.cos(a);
      return t.set(cx + ox * rad * Math.cos(ang), cy + rad * 0.85 * Math.sin(ang), cz + oz * rad * Math.cos(ang));
    }, 80, 14);
    P.add(hood, M.greenFab);
    const bag = new THREE.SphereGeometry(1, 32, 20);
    const bp = bag.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const n = 1 + 0.05 * Math.sin(x * 9 + y * 5) + 0.04 * Math.sin(z * 11 - x * 4);
      bp.setXYZ(i, x * n, y * n, z * n);
    }
    bag.computeVertexNormals();
    P.add(bag, M.greenFab, [0, 1.13, -0.235, -0.55, 0, 0, 0.21, 0.125, 0.09]);
    P.build(upper);
  }

  // ---------- mochila, botella, correas ----------
  {
    const P = new Parts();
    P.add(new RoundedBoxGeometry(0.42, 0.42, 0.17, 5, 0.07), M.pack, [0, 0.95, -0.35]);
    P.add(new RoundedBoxGeometry(0.31, 0.2, 0.07, 4, 0.03), M.pack, [0, 0.86, -0.445]);
    P.add(tube([new V3(-0.14, 0.955, -0.482), new V3(0, 0.962, -0.484), new V3(0.14, 0.955, -0.482)], 0.004, 20), M.dark);
    P.add(new RoundedBoxGeometry(0.014, 0.03, 0.006, 2, 0.002), M.chrome, [0.1, 0.94, -0.485]);
    P.add(tube([new V3(-0.06, 1.15, -0.355), new V3(-0.045, 1.2, -0.355), new V3(0.045, 1.2, -0.355), new V3(0.06, 1.15, -0.355)], 0.01, 24), M.strap);
    P.add(new RoundedBoxGeometry(0.075, 0.17, 0.14, 3, 0.03), M.pack, [-0.215, 0.86, -0.355]);
    P.add(new RoundedBoxGeometry(0.075, 0.17, 0.14, 3, 0.03), M.pack, [0.215, 0.86, -0.355]);
    // botella
    const bx = -0.268, by = 0.84, bz = -0.355;
    P.add(lathe([[0.001, 0], [0.044, 0.0], [0.051, 0.012], [0.052, 0.2], [0.048, 0.235], [0.036, 0.258], [0.033, 0.27]], 36), M.bottle, [bx, by, bz]);
    P.add(new THREE.CylinderGeometry(0.037, 0.038, 0.045, 32), M.black, [bx, by + 0.29, bz]);
    P.add(new THREE.SphereGeometry(0.037, 24, 10, 0, TAU, 0, Math.PI / 2), M.black, [bx, by + 0.312, bz, 0, 0, 0, 1, 0.35, 1]);
    P.add(new THREE.TorusGeometry(0.024, 0.0065, 8, 28), M.black, [bx, by + 0.34, bz, 0, Math.PI / 2, 0]);
    P.build(upper);
    const dec = surf((u, v, t) => {
      const a = -Math.PI / 2 - 0.75 + u * 1.5;
      return t.set(bx + 0.0528 * Math.sin(a), by + 0.05 + v * 0.12, bz + 0.0528 * Math.cos(a));
    }, 12, 6);
    const dm = new THREE.Mesh(dec, M.decal); dm.castShadow = dm.receiveShadow = true; upper.add(dm);

    // correas sobre los hombros
    const SP = new Parts();
    for (const s of [-1, 1]) {
      const ctrl = [[Math.PI - 0.3, 1.02], [Math.PI - 0.7, 1.13], [Math.PI - 1.2, 1.185], [Math.PI / 2, 1.196],
        [1.25, 1.175], [1.12, 1.09], [1.1, 0.99], [1.17, 0.89], [1.45, 0.83], [1.95, 0.83], [Math.PI - 0.9, 0.85]]
        .map(([a, y]) => new V3(s * a, y, 0));
      const c2 = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
      const pts = [], nrm = [];
      const A = new V3(), B = new V3(), C = new V3(), D = new V3();
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const q = c2.getPoint(i / N);
        const y = Math.min(q.y, 1.205);
        const p = jacketPoint(y, q.x, new V3());
        jacketPoint(y, q.x + 0.01, A); jacketPoint(y, q.x - 0.01, B);
        jacketPoint(Math.min(1.208, y + 0.004), q.x, C); jacketPoint(y - 0.004, q.x, D);
        const n = new V3().crossVectors(A.sub(B), C.sub(D)).normalize();
        if (n.dot(new V3(p.x, 0, p.z)) < 0 && y < 1.15) n.negate();
        p.addScaledVector(n, 0.011);
        pts.push(p); nrm.push(n);
      }
      SP.add(ribbon(pts, nrm, 0.052, 0.009), M.strap);
      // hebilla a la altura del pecho
      let bi = 0, bd = 1;
      for (let i = 0; i < pts.length; i++) { const d = Math.abs(pts[i].y - 1.0) + (pts[i].z < 0 ? 1 : 0); if (d < bd) { bd = d; bi = i; } }
      const T = new V3().subVectors(pts[bi + 1], pts[bi - 1]).normalize();
      const Bn = new V3().crossVectors(T, nrm[bi]).normalize();
      const Nn = new V3().crossVectors(Bn, T).normalize();
      const bm = new THREE.Matrix4().makeBasis(Bn, T, Nn).setPosition(pts[bi].clone().addScaledVector(Nn, 0.007));
      SP.add(new RoundedBoxGeometry(0.072, 0.042, 0.01, 2, 0.004), M.chrome, bm);
      SP.add(new RoundedBoxGeometry(0.054, 0.012, 0.012, 1, 0.003), M.dark, bm.clone().multiply(M4(0, 0.002, 0.001)));
      const bm2 = new THREE.Matrix4().makeBasis(Bn, T, Nn).setPosition(pts[bi + 12].clone().addScaledVector(Nn, 0.006));
      SP.add(new RoundedBoxGeometry(0.064, 0.022, 0.008, 2, 0.004), M.darkChrome, bm2);
    }
    SP.build(upper);
  }

  // ---------- cabeza ----------
  const headG = new THREE.Group(); headG.name = 'eco-head';
  headG.position.set(0, NECK_Y, 0);
  headG.scale.setScalar(HS / BS);
  upper.add(headG);
  const leaves = [];
  {
    const P = new Parts();
    P.add(new THREE.SphereGeometry(1, 56, 40), M.white, [0, HC, 0, 0, 0, 0, RX, RY, RZ]);
    P.add(lathe([[0.001, -0.025], [0.058, -0.025], [0.064, -0.018], [0.066, 0.0], [0.066, 0.03], [0.06, 0.04], [0.001, 0.04]], 28), M.darkChrome);
    P.add(ringGeo(0.068, 0.006, 32, 6), M.chrome, [0, 0.006, 0]);
    P.add(ringGeo(0.085, 0.014, 36, 8), M.gap, [0, 0.035, 0]);
    // visor (superelipse proyectada sobre la cabeza)
    const TH = 0.8, PC = -0.12, PH = 0.68, NE = 4;
    const se = (al) => {
      const c = Math.cos(al), s = Math.sin(al);
      return [Math.sign(c) * Math.abs(c) ** (2 / NE), Math.sign(s) * Math.abs(s) ** (2 / NE)];
    };
    const visor = surf((u, v, t) => {
      const [sx, sy] = se(u * TAU);
      const r = v;
      return headPt(sx * r * TH, PC + sy * r * PH, 0.003 + 0.017 * (1 - r * r), t);
    }, 96, 14, { flip: true, closedU: true, uv: (u, v) => { const [sx, sy] = se(u * TAU); return [sx * v * 0.5 + 0.5, sy * v * 0.5 + 0.5]; } });
    const vm = new THREE.Mesh(visor, M.visor);
    vm.castShadow = false; vm.receiveShadow = true;
    headG.add(vm);
    // cúpula de vidrio negro brillante (refleja el cielo)
    const glassGeo = surf((u, v, t) => {
      const [sx, sy] = se(u * TAU);
      const r = v * 1.01;
      return headPt(sx * r * TH, PC + sy * r * PH, 0.009 + 0.019 * (1 - v * v), t);
    }, 80, 10, { flip: true, closedU: true });
    const gm = new THREE.Mesh(glassGeo, M.visorGlass);
    gm.renderOrder = 2; gm.castShadow = false;
    headG.add(gm);
    const rimPts = [], gapPts = [];
    for (let i = 0; i < 140; i++) {
      const [sx, sy] = se((i / 140) * TAU);
      rimPts.push(headPt(sx * TH * 1.012, PC + sy * PH * 1.012, 0.006, new V3()));
      gapPts.push(headPt(sx * TH * 1.075, PC + sy * PH * 1.09, -0.002, new V3()));
    }
    P.add(tube(rimPts, 0.0145, 150, true, 8), M.rim);
    // ranura oscura entre la placa facial y la carcasa (AO falso)
    P.add(tube(gapPts, 0.0042, 140, true, 4), M.gap);
    // juntas de panel
    const seam = (fn, n, closed = false) => {
      const pts = [];
      for (let i = 0; i <= n; i++) { const [th, ph] = fn(i / n); pts.push(headPt(th, ph, 0.0005, new V3())); }
      if (closed) pts.pop();
      P.add(tube(pts, 0.0036, Math.ceil(n * 1.1), closed, 4), M.seam);
    };
    // junta de la tapa superior (con muesca frontal) que baja hasta los auriculares
    seam((k) => {
      const th = -Math.PI + k * TAU, a = Math.abs(th);
      const notch = 1 - sstep(0.24, 0.34, a);
      const ear = Math.exp(-(((a - Math.PI / 2) / 0.32) ** 2));
      return [th, 0.66 + 0.06 * Math.cos(th) + 0.13 * notch - 0.24 * ear];
    }, 200, true);
    seam((k) => { const th = -Math.PI + k * TAU; return [th, 1.08]; }, 90, true);
    seam((k) => [Math.PI, 1.08 - k * 0.42], 16);
    for (const s of [-1, 1]) seam((k) => [s * (0.24 + k * 0.5), 0.85 + 0.03 * k], 14);
    // agujero en la coronilla
    P.add(ringGeo(0.05, 0.013, 36, 10), M.white, [0, HC + RY - 0.004, 0]);
    P.add(new THREE.CircleGeometry(0.05, 32), M.hole, [0, HC + RY - 0.001, 0, -Math.PI / 2, 0, 0]);
    // tallo
    const top = HC + RY;
    P.add(tube([new V3(0, top - 0.02, 0), new V3(0.004, top + 0.03, 0.004), new V3(0.0, top + 0.05, 0.01), new V3(-0.004, top + 0.065, 0.012)], 0.011, 14, false, 8), M.stem);
    // acentos verdes brillantes en los laterales de la cabeza
    for (const s of [-1, 1]) {
      const acc = surf((u, v, t) => {
        const ph = 0.22 + v * 0.4;
        const th = s * (0.9 + u * (0.3 - 0.12 * v));
        return headPt(th, ph, 0.0025, t);
      }, 10, 8, { flip: s < 0 });
      P.add(acc, M.accent);
      const edge = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; edge.push(headPt(s * 0.895, 0.2 + k * 0.44, 0.001, new V3())); }
      P.add(tube(edge, 0.003, 14, false, 4), M.seam);
    }
    // orejas / auriculares
    for (const s of [-1, 1]) {
      const e = headPt(s * Math.PI / 2, -0.03, 0, new V3());
      const base = M4(e.x - s * 0.012, e.y, e.z, 0, 0, -s * Math.PI / 2);
      const ET = (m) => new THREE.Matrix4().multiplyMatrices(base, m);
      // carcasa blanca con borde biselado, más saliente
      P.add(lathe([[0.001, -0.03], [0.152, -0.03], [0.163, -0.01], [0.168, 0.015], [0.167, 0.045], [0.161, 0.07], [0.152, 0.085],
        [0.14, 0.093], [0.128, 0.095], [0.121, 0.092], [0.118, 0.086], [0.001, 0.086]], 52), M.white, base);
      // anillo oscuro de unión con la cabeza (AO) y aro negro intermedio
      P.add(lathe([[0.158, -0.032], [0.172, -0.024], [0.176, -0.008], [0.172, 0.004], [0.165, 0.006]], 52), M.dark, base);
      P.add(new THREE.TorusGeometry(0.168, 0.004, 6, 52), M.gap, ET(M4(0, 0.008, 0, Math.PI / 2, 0, 0)));
      P.add(new THREE.TorusGeometry(0.113, 0.0095, 10, 48), M.chrome, ET(M4(0, 0.088, 0, Math.PI / 2, 0, 0)));
      P.add(new THREE.TorusGeometry(0.099, 0.0068, 8, 48), M.glow, ET(M4(0, 0.09, 0, Math.PI / 2, 0, 0)));
      P.add(new THREE.CircleGeometry(0.093, 40), M.earLogo, ET(M4(0, 0.0885, 0, -Math.PI / 2, 0, s * Math.PI / 2)));
    }
    P.build(headG);

    // hojas del brote
    const leafGeo = (L, W) => {
      const g = surf((u, v, t) => {
        const tt = v, sv = u * 2 - 1;
        const wv = (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(tt, 0.72)), 0.95) * (1 - 0.12 * tt);
        const x = L * tt;
        const z = sv * wv;
        const y = 0.55 * Math.abs(sv) ** 1.7 * wv + 0.18 * Math.abs(sv) * wv - 0.22 * L * tt * tt + 0.012 * Math.sin(tt * 9) * sv;
        return t.set(x, y, z);
      }, 10, 24);
      return g;
    };
    const ribGeo = (L) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const tt = i / 10; pts.push(new V3(L * tt, -0.22 * L * tt * tt + 0.002, 0)); }
      return tube(pts, 0.0034, 20, false, 6);
    };
    const stemTop = new V3(-0.004, top + 0.062, 0.012);
    const mkLeaf = (L, W, yaw, pitch, roll) => {
      const g = new THREE.Group();
      g.position.copy(stemTop);
      g.rotation.order = 'YZX';
      g.rotation.set(roll, yaw, pitch);
      const m = new THREE.Mesh(leafGeo(L, W), M.leaf);
      const r = new THREE.Mesh(ribGeo(L), M.midrib);
      m.castShadow = r.castShadow = true;
      m.receiveShadow = true;
      g.add(m, r);
      headG.add(g);
      leaves.push({ g, base: g.rotation.clone() });
    };
    mkLeaf(0.25, 0.13, Math.PI - 0.12, 0.36, 0.18);
    mkLeaf(0.27, 0.14, 0.22, 0.5, -0.15);
  }

  // ---------- brazos ----------
  const joints = {};
  const hands = {};
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const sh = new THREE.Group(); sh.name = 'shoulder' + side;
    sh.position.set(s * SH_X, SH_Y, 0);
    upper.add(sh);
    const el = new THREE.Group(); el.name = 'elbow' + side; el.position.y = -UPPER; sh.add(el);
    const wr = new THREE.Group(); wr.name = 'wrist' + side; wr.position.y = -FORE; el.add(wr);
    for (const j of [sh, el, wr]) j.rotation.order = 'ZXY';
    joints['shoulder' + side] = sh; joints['elbow' + side] = el; joints['wrist' + side] = wr;

    const wrinkle = (pts, amp, f) => pts.map(([r, y]) => [r * (1 + amp * Math.sin(y * f)), y]);
    const PU = new Parts();
    PU.add(new THREE.SphereGeometry(0.1, 32, 20), M.sleeve, [0, 0.0, 0]);
    // manga superior abullonada con pliegues junto al codo
    PU.add(lathe(wrinkle([[0.001, -0.275], [0.06, -0.27], [0.086, -0.255], [0.097, -0.236], [0.089, -0.222], [0.099, -0.205], [0.091, -0.19],
      [0.097, -0.165], [0.098, -0.12], [0.101, -0.07], [0.104, -0.02], [0.1, 0.03], [0.08, 0.065], [0.001, 0.08]], 0.018, 55), 40), M.sleeve);
    PU.build(sh);
    // parche de hoja en el hombro izquierdo (lado −x)
    if (s < 0) {
      const c = -1.05;
      const geo = surf((u, v, t) => {
        const y = -0.135 + v * 0.085;
        const a = c - 0.5 + u * 1.0;
        const r = 0.0985 + 0.0045;
        return t.set(r * Math.sin(a), y, r * Math.cos(a));
      }, 14, 6);
      const pm = new THREE.Mesh(geo, M.patchLeaf); pm.castShadow = pm.receiveShadow = true; sh.add(pm);
    }
    const PF = new Parts();
    // antebrazo con pliegues en el codo
    PF.add(lathe(wrinkle([[0.001, -0.19], [0.072, -0.188], [0.082, -0.17], [0.085, -0.12], [0.089, -0.075], [0.084, -0.055], [0.094, -0.035],
      [0.087, -0.017], [0.096, 0.005], [0.088, 0.03], [0.07, 0.058], [0.001, 0.072]], 0.02, 70), 40), M.sleeve);
    PF.add(lathe([[0.042, -0.252], [0.068, -0.254], [0.08, -0.244], [0.084, -0.21], [0.082, -0.172], [0.072, -0.163], [0.055, -0.17]], 40), M.ribCuff);
    PF.add(ringGeo(0.079, 0.006, 40, 6), M.gap, [0, -0.168, 0]);
    PF.add(new THREE.CircleGeometry(0.06, 28), M.gap, [0, -0.25, 0, Math.PI / 2, 0, 0]);
    PF.build(el);
    {
      const c = s * Math.PI / 2 + s * 0.35;
      const geo = surf((u, v, t) => {
        const y = -0.15 + v * 0.07;
        const a = c - 0.45 * s + u * 0.9 * s;
        const r = 0.086 + 0.005;
        return t.set(r * Math.sin(a), y, r * Math.cos(a));
      }, 12, 5, { flip: s < 0 });
      const pm = new THREE.Mesh(geo, M.patchLeaf); pm.castShadow = pm.receiveShadow = true; el.add(pm);
    }
    const hand = buildHand(s, M);
    hand.group.scale.setScalar(1.6);
    hand.group.position.y = -0.018;
    wr.add(hand.group);
    hands[side] = hand;
  }

  // ---------- tablet ----------
  const tab = new THREE.Group(); tab.name = 'eco-tablet';
  const tabTex = canvasTex(700, 500, defaultTabScreen);
  {
    const P = new Parts();
    P.add(new RoundedBoxGeometry(TAB_W, TAB_H, TAB_D, 4, 0.012), M.alu);
    P.add(new RoundedBoxGeometry(TAB_W - 0.012, TAB_H - 0.012, 0.002, 2, 0.001), M.glass, [0, 0, TAB_D / 2]);
    P.add(new THREE.CircleGeometry(0.008, 20), M.black, [TAB_W / 2 - 0.035, TAB_H / 2 - 0.035, -TAB_D / 2 - 0.0008, 0, Math.PI, 0]);
    P.add(new RoundedBoxGeometry(0.004, 0.05, 0.008, 2, 0.002), M.alu, [TAB_W / 2 + 0.001, 0.08, 0]);
    P.build(tab);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4 / 1.4), new THREE.MeshBasicMaterial({ map: tabTex, toneMapped: false }));
    scr.position.set(0, 0.006, TAB_D / 2 + 0.0016);
    scr.name = 'eco-tablet-screen';
    tab.add(scr);
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), M.tabLeaf);
    lf.position.set(0, 0, -TAB_D / 2 - 0.0012); lf.rotation.y = Math.PI;
    tab.add(lf);
    tab.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scr.castShadow = false; lf.castShadow = false;
  }

  // ---------- sombra de contacto ----------
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.8),
    new THREE.MeshBasicMaterial({ map: shadowBlobTex(), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.003, 0.03);
  shadow.renderOrder = -1;
  root.add(shadow);

  // ---------- poses (resueltas por cinemática inversa al construir; objetivos en coordenadas de ECO) ----------
  root.updateMatrixWorld(true);
  const limR = [[-3, 1], [-1.6, 1.6], [-0.2, 2.9], [-2.6, 0.02], [-2.4, 2.4], [-0.3, 0.3], [-1.1, 1.1], [-1.3, 1.3], [-1.2, 1.2]];
  const limL = limR.map((l, i) => ([2, 7, 8, 1, 4, 5].includes(i) ? [-l[1], -l[0]] : l));
  const chainR = [joints.shoulderR, joints.elbowR, joints.wristR];
  const chainL = [joints.shoulderL, joints.elbowL, joints.wristL];
  const solveR = (pos, fingers, palm, guesses) => solveArm(chainR, handFrame(pos, fingers, palm, 1), guesses, limR);
  const split = (p) => ({ s: p.slice(0, 3), e: p.slice(3, 6), w: p.slice(6, 9) });

  // Tablet: posición deseada en reposo y agarre (muñeca en el espacio de la tablet, unidades de ECO)
  const tabWorld = M4(-0.17, 0.77, 0.29, -0.3, 0.22, 0.04);
  const grip = new THREE.Matrix4().makeBasis(new V3(0, 1, 0), new V3(0, 0, -1), new V3(-1, 0, 0))
    .setPosition(-TAB_W / 2 + 0.095, -TAB_H / 2 - 0.04, -0.122);
  const wT = new THREE.Matrix4().multiplyMatrices(tabWorld, grip);
  const wx = new V3(), wy = new V3(), wz = new V3();
  wT.extractBasis(wx, wy, wz);
  const holdL = solveArm(chainL, { pos: new V3().setFromMatrixPosition(wT), x: wx, y: wy, z: wz },
    [[-0.4, 0, -0.2, -1.4, 0, 0, 0, 0, 0], [-0.4, -0.6, -0.2, -1.5, 1.2, 0, 0, 0, 0], [-0.6, 0.4, -0.1, -1.2, -1.0, 0, 0, 0, 0]], limL);
  joints.wristL.add(tab);
  // la muñeca hereda la escala del cuerpo (BS): se compensa para que la tablet conserve su tamaño real
  new THREE.Matrix4().makeScale(1 / BS, 1 / BS, 1 / BS).multiply(new THREE.Matrix4().copy(grip).invert())
    .decompose(tab.position, tab.quaternion, tab.scale);

  const L = split(holdL);
  const withL = (r, handR) => ({ shoulderL: L.s, elbowL: L.e, wristL: L.w, shoulderR: r.s, elbowR: r.e, wristR: r.w, handL: 'hold', handR });
  const idleR = { s: [-0.04, 0.0, 0.24], e: [-0.32, 0.0, 0.0], w: [0.0, 0.0, -0.08] };
  const POSES = {
    idle: withL(idleR, 'relaxed'),
    present: withL(split(solveR([0.54, 0.9, 0.16], [1, 0.5, 0.15], [-0.15, 0.75, 0.6],
      [[0, 0, 1.0, -0.6, 0, 0, 0, 0, 0], [-0.3, -1, 0.9, -0.9, 1.2, 0, 0, 0, 0], [0, 1, 0.9, -0.8, -1.2, 0, 0, 0, 0]])), 'open'),
    point: withL(split(solveR([0.6, 0.83, 0.15], [1, -0.22, 0.28], [0, -1, 0],
      [[-0.2, 0, 1.3, -0.1, 0, 0, 0, 0, 0], [-0.3, 0.5, 1.2, -0.2, -0.5, 0, 0, 0, 0]])), 'point'),
    thumbsUp: withL(split(solveR([0.42, 0.92, 0.23], [0.05, 0.12, 1], [-1, 0, 0],
      [[-0.2, 0, 0.35, -1.6, 0, 0, 0, 0, 0], [-0.5, 0.6, 0.4, -1.8, -0.6, 0, 0, 0, 0], [-0.2, -0.6, 0.5, -1.6, 0.8, 0, 0, 0, 0]])), 'thumbsUp'),
    wave1: withL(split(solveR([0.62, 1.03, 0.14], [0.3, 1, 0], [0, 0, 1],
      [[0, 0, 0.9, -1.2, 0, 0, 0, 0, 0], [-0.2, 1.2, 0.8, -1.4, 0, 0, 0, 0, 0], [0, -1.0, 0.9, -1.2, 1.2, 0, 0, 0, 0]])), 'open'),
    wave2: withL(split(solveR([0.57, 1.06, 0.17], [-0.25, 1, 0.05], [0, 0.05, 1],
      [[0, 0, 0.9, -1.4, 0, 0, 0, 0, 0], [-0.2, 1.2, 0.8, -1.6, 0, 0, 0, 0, 0], [0, -1.0, 0.9, -1.4, 1.2, 0, 0, 0, 0]])), 'open'),
  };
  const JOINTS = ['shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR'];
  const setJoints = (pose) => { for (const n of JOINTS) joints[n].rotation.set(...pose[n]); };
  setJoints(POSES.idle);

  root.traverse((o) => { if (o.isMesh && o !== shadow) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  shadow.castShadow = false;

  // ---------- API ----------
  const qT = new THREE.Quaternion(), eT = new THREE.Euler(0, 0, 0, 'ZXY');
  const shBase = { L: joints.shoulderL.position.y, R: joints.shoulderR.position.y };
  function setHand(side, shape) {
    const h = hands[side === 'L' ? 'L' : 'R'];
    const S = HAND_SHAPES[shape] || HAND_SHAPES.open;
    h.target = copyShape(S);
    h.shape = shape;
  }
  setHand('L', 'hold'); hands.L.cur = copyShape(HAND_SHAPES.hold); applyHand(hands.L);
  setHand('R', 'relaxed'); hands.R.cur = copyShape(HAND_SHAPES.relaxed); applyHand(hands.R);

  const U = root.userData;
  faceTex.userData.eco = U;
  faceTargets.add(faceTex);
  if (faceImg) redraw(faceTex, (ctx, w, h) => drawEcoFace(ctx, w, h, 'idle', 0, 0));
  function update(dt, t = 0, poseName = 'idle', reduced = false) {
    dt = clamp(dt || 0, 0, 0.1);
    const P = POSES[poseName] || POSES.idle;
    if (poseName !== U._pose) {
      U._pose = poseName;
      if (P.handR) setHand('R', P.handR);
      if (P.handL) setHand('L', P.handL);
    }
    const k = 1 - Math.exp(-7 * dt);
    for (const n of JOINTS) {
      const j = joints[n], a = P[n];
      eT.set(a[0], a[1], a[2], 'ZXY');
      qT.setFromEuler(eT);
      j.quaternion.slerp(qT, k);
    }
    const kh = 1 - Math.exp(-12 * dt);
    dampHand(hands.L, kh); dampHand(hands.R, kh);
    // respiración
    const br = Math.sin(t * 1.7);
    headG.position.y = NECK_Y + 0.005 * br;
    joints.shoulderL.position.y = shBase.L + 0.003 * br;
    joints.shoulderR.position.y = shBase.R + 0.003 * br;
    // balanceo y hojas
    const ks = 1 - Math.exp(-4 * dt);
    const swZ = reduced ? 0 : 0.012 * Math.sin(t * 0.7);
    const swY = reduced ? 0 : 0.025 * Math.sin(t * 0.43);
    body.rotation.z += (swZ - body.rotation.z) * ks;
    body.rotation.y += (swY - body.rotation.y) * ks;
    for (let i = 0; i < leaves.length; i++) {
      const { g, base } = leaves[i];
      const w = reduced ? 0 : 0.07 * Math.sin(t * 1.3 + i * 1.7);
      g.rotation.z += (base.z + w - g.rotation.z) * ks;
      g.rotation.x += (base.x + w * 0.6 - g.rotation.x) * ks;
    }
    const pulse = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 2.4);
    for (const m of glowMats) m.emissiveIntensity = m.userData.base * pulse;
  }

  Object.assign(U, {
    headG, faceTex, tab, tabTex, glowMats, mood: 'idle', POSES, setHand, update,
    joints, hands, body, shadow, materials: M, HAND_SHAPES,
    setPoseInstant(name) { const P = POSES[name] || POSES.idle; setJoints(P); U._pose = null; update(1, 0, name, true); },
    setMood(mood, blink = 0, look = 0) { U.mood = mood; redraw(faceTex, (ctx, w, h) => drawEcoFace(ctx, w, h, mood, blink, look)); },
  });
  return root;
}
