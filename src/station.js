// =====================================================================
// Estación EcoAccess · modelo procedimental detallado
//   makeBin(def)   → caneca de HDPE con tapa abatible abovedada
//   makeStation()  → bastidor de tubo negro + letrero con QR único + 3 canecas
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTex, redraw, rr, drawQR, C, FONT, FONT_B } from './util.js';
import { BINS } from './content.js';

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const TAU = Math.PI * 2;

// Redibuja una textura cuando terminan de cargar las fuentes web.
function whenFonts(tex, draw) {
  if (typeof document === 'undefined' || !document.fonts) return;
  document.fonts.ready.then(() => redraw(tex, draw)).catch(() => {});
  document.fonts.addEventListener?.('loadingdone', () => redraw(tex, draw));
}
function fontTex(w, h, draw) {
  const t = canvasTex(w, h, draw);
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  whenFonts(t, draw);
  return t;
}

// Ruido procedimental (datos, no color) para rugosidad/relieve del plástico.
let _noise = null;
function noiseTex() {
  if (_noise) return _noise;
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  let s = 1234567;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // value-noise tileable en varias octavas
  const oct = [8, 16, 32, 64].map((g) => {
    const a = new Float32Array(g * g);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    return { g, a };
  });
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, amp = 0.5, tot = 0;
    for (const { g, a } of oct) {
      const fx = (x / N) * g, fy = (y / N) * g;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = sm(fx - x0), ty = sm(fy - y0);
      const i = (xx, yy) => a[((yy % g) * g) + (xx % g)];
      const v0 = i(x0, y0) * (1 - tx) + i(x0 + 1, y0) * tx;
      const v1 = i(x0, y0 + 1) * (1 - tx) + i(x0 + 1, y0 + 1) * tx;
      v += (v0 * (1 - ty) + v1 * ty) * amp; tot += amp; amp *= 0.6;
    }
    v = v / tot;
    v = 0.78 + v * 0.3 + (rnd() - 0.5) * 0.06; // grano fino
    const b = Math.max(0, Math.min(255, v * 255)) | 0;
    const k = (y * N + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.anisotropy = 8;
  _noise = t;
  return t;
}

function plastic(color, extra = {}) {
  const n = noiseTex();
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.5, metalness: 0,
    clearcoat: 0.22, clearcoatRoughness: 0.4,
    specularIntensity: 0.55,
    roughnessMap: n, bumpMap: n, bumpScale: 0.35,
    ...extra,
  });
}

// ---------------------------------------------------------------------
// Loft de secciones rectangulares redondeadas (perfil vertical)
//   rings: [{ y, w, d, r, cz?, shade? }]  (w/d = semiancho/semifondo)
// ---------------------------------------------------------------------
const SEG = 9; // segmentos por esquina
function ringPts(w, d, r, cz = 0) {
  r = Math.max(0.002, Math.min(r, w - 0.001, d - 0.001));
  const pts = [];
  const cs = [[w - r, d - r, 0], [-(w - r), d - r, 1], [-(w - r), -(d - r), 2], [w - r, -(d - r), 3]];
  for (const [cx, cz2, k] of cs) {
    for (let i = 0; i <= SEG; i++) {
      const a = (k + i / SEG) * Math.PI / 2;
      pts.push([cx + r * Math.cos(a), cz + cz2 + r * Math.sin(a)]);
    }
  }
  pts.push(pts[0].slice()); // vértice de costura (UV)
  return pts;
}

function loft(rings, { capStart = 0, capEnd = 0 } = {}) {
  // cap: 0 = sin tapa, 1 = tapa hacia arriba, -1 = tapa hacia abajo
  const pos = [], uv = [], col = [], idx = [];
  const M = 4 * (SEG + 1) + 1;
  let vAcc = 0, prev = null;
  rings.forEach((rg, ri) => {
    const pts = ringPts(rg.w, rg.d, rg.r, rg.cz || 0);
    if (prev) vAcc += Math.hypot(rg.y - prev.y, rg.w - prev.w);
    let u = 0;
    const sh = rg.shade ?? 1;
    for (let j = 0; j < M; j++) {
      if (j > 0) u += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      pos.push(pts[j][0], rg.y, pts[j][1]);
      uv.push(u, vAcc);
      col.push(sh, sh, sh);
    }
    prev = rg;
  });
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + 1, d = a + M, c = d + 1;
      idx.push(a, d, b, b, d, c);
    }
  }
  const cap = (ri, dir) => {
    const rg = rings[ri];
    const ci = pos.length / 3;
    pos.push(0, rg.y, rg.cz || 0); uv.push(0.5, 0.5);
    const sh = rg.shade ?? 1; col.push(sh, sh, sh);
    // la tapa tiene vértices propios (normales planas)
    const pts = ringPts(rg.w, rg.d, rg.r, rg.cz || 0);
    const base = pos.length / 3;
    for (let j = 0; j < M; j++) { pos.push(pts[j][0], rg.y, pts[j][1]); uv.push(pts[j][0], pts[j][1]); col.push(sh, sh, sh); }
    for (let j = 0; j < M - 1; j++) {
      if (dir < 0) idx.push(ci, base + j, base + j + 1);
      else idx.push(ci, base + j + 1, base + j);
    }
  };
  if (capStart) cap(0, capStart);
  if (capEnd) cap(rings.length - 1, capEnd);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function roundRectShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundRectPath(w, h, r) {
  const p = new THREE.Path();
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

// ---------------------------------------------------------------------
// Etiquetas frontales de las canecas
// ---------------------------------------------------------------------
const LABEL = {
  negra: { lines: ['Residuos', 'no aprovechables'], icon: 'trash', panel: '#2A2F2C', edge: 'rgba(255,255,255,.16)', ink: '#F2F5F1', iconInk: '#F2F5F1' },
  verde: { lines: ['Residuos orgánicos', 'aprovechables'], icon: 'leaf', panel: '#23702F', edge: 'rgba(255,255,255,.22)', ink: '#FFFFFF', iconInk: '#FFFFFF' },
  blanca: { lines: ['Residuos', 'aprovechables'], icon: 'recycle', panel: '#FFFFFF', edge: 'rgba(30,60,40,.16)', ink: '#1E3B28', iconInk: '#2F8A3C' },
};

function iconTrash(ctx, s, ink) {
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // asa + tapa
  ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.38); ctx.lineTo(-s * 0.16, -s * 0.46); ctx.lineTo(s * 0.16, -s * 0.46); ctx.lineTo(s * 0.16, -s * 0.38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.44, -s * 0.36); ctx.lineTo(s * 0.44, -s * 0.36); ctx.stroke();
  // cuerpo
  ctx.beginPath(); ctx.moveTo(-s * 0.34, -s * 0.24); ctx.lineTo(-s * 0.27, s * 0.46); ctx.lineTo(s * 0.27, s * 0.46); ctx.lineTo(s * 0.34, -s * 0.24); ctx.closePath(); ctx.stroke();
  ctx.lineWidth = s * 0.06;
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * s * 0.13, -s * 0.1); ctx.lineTo(k * s * 0.11, s * 0.33); ctx.stroke(); }
}
function iconLeaf(ctx, s, ink, bg) {
  ctx.fillStyle = ink;
  const leaf = (dir) => {
    ctx.save(); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.moveTo(s * 0.02, s * 0.12);
    ctx.bezierCurveTo(s * 0.0, -s * 0.22, s * 0.22, -s * 0.42, s * 0.5, -s * 0.44);
    ctx.bezierCurveTo(s * 0.52, -s * 0.12, s * 0.34, s * 0.12, s * 0.02, s * 0.12);
    ctx.fill();
    ctx.strokeStyle = bg; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.06, s * 0.06); ctx.quadraticCurveTo(s * 0.22, -s * 0.16, s * 0.42, -s * 0.36); ctx.stroke();
    ctx.restore();
  };
  leaf(1); leaf(-1);
  ctx.strokeStyle = ink; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, s * 0.1); ctx.lineTo(0, s * 0.46); ctx.stroke();
}
function iconRecycle(ctx, s, ink) {
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'butt';
  const R = s * 0.38, lw = s * 0.15;
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.rotate(i * TAU / 3 - Math.PI / 2);
    const a0 = 0.32, a1 = TAU / 3 - 0.5;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();
    const px = R * Math.cos(a1), py = R * Math.sin(a1);
    const tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
    const hw = lw * 1.05, hl = lw * 1.15;
    ctx.beginPath();
    ctx.moveTo(px + nx * hw, py + ny * hw);
    ctx.lineTo(px + tx * hl, py + ty * hl);
    ctx.lineTo(px - nx * hw, py - ny * hw);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawBinLabel(def) {
  const L = LABEL[def.key] || { lines: ['Residuos', def.cat || ''], icon: 'recycle', panel: '#2A2F2C', edge: 'rgba(255,255,255,.2)', ink: def.text || '#fff', iconInk: def.text || '#fff' };
  return (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // panel con leve degradado (impresión vinílica)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, L.panel); g.addColorStop(1, shade(L.panel, -0.06));
    ctx.fillStyle = g; rr(ctx, 4, 4, w - 8, h - 8, 46); ctx.fill();
    ctx.strokeStyle = L.edge; ctx.lineWidth = 5; rr(ctx, 14, 14, w - 28, h - 28, 38); ctx.stroke();
    // ícono
    ctx.save(); ctx.translate(w / 2, h * 0.33);
    const s = h * 0.42;
    if (L.icon === 'trash') iconTrash(ctx, s, L.iconInk);
    else if (L.icon === 'leaf') iconLeaf(ctx, s, L.iconInk, L.panel);
    else iconRecycle(ctx, s, L.iconInk);
    ctx.restore();
    // texto (dos líneas, ajustado al ancho)
    ctx.fillStyle = L.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const fit = (txt, px, weight, y) => {
      let f = px;
      ctx.font = `${weight} ${f}px ${FONT}`;
      while (ctx.measureText(txt).width > w * 0.86 && f > 20) { f -= 2; ctx.font = `${weight} ${f}px ${FONT}`; }
      ctx.fillText(txt, w / 2, y);
    };
    fit(L.lines[0], 78, 700, h * 0.725);
    fit(L.lines[1], 78, 700, h * 0.885);
  };
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------
// Caneca
// ---------------------------------------------------------------------
const BH = 0.99;            // altura del cuerpo (borde superior)
const W0 = 0.375, W1 = 0.4; // semiancho abajo / arriba
const D0 = 0.295, D1 = 0.32;
const TOP = 0.93;           // fin de la pared recta (inicio del labio)
const Wy = (y) => W0 + (W1 - W0) * (y / TOP);
const Dy = (y) => D0 + (D1 - D0) * (y / TOP);
const TILT = Math.atan((D1 - D0) / TOP);
const LID_W = 0.43, LID_D = 0.35, LID_SK = 0.045, LID_H = 0.165;

const sharedGeo = {};
function binBodyGeo() {
  if (sharedGeo.body) return sharedGeo.body;
  const R = 0.075;
  const ring = (y, dw = 0, shadeV = 1, r = R) => ({ y, w: Wy(Math.min(y, TOP)) + dw, d: Dy(Math.min(y, TOP)) + dw, r: r + dw * 0.5, shade: shadeV });
  const rings = [
    ring(0.0, -0.024, 0.45, R - 0.02),
    ring(0.006, -0.011, 0.62),
    ring(0.02, -0.003, 0.8),
    ring(0.045, 0, 0.95),
    // nervadura de refuerzo moldeada
    ring(0.16, 0), ring(0.168, 0.006), ring(0.205, 0.006), ring(0.213, 0),
    ring(0.6, 0), ring(TOP - 0.004, 0),
    // labio superior
    ring(TOP + 0.004, 0.011), ring(TOP + 0.014, 0.016), ring(BH - 0.016, 0.016),
    ring(BH - 0.005, 0.012), ring(BH, 0.004),
    ring(BH, -0.012, 0.8), ring(BH - 0.02, -0.02, 0.55),
    ring(BH - 0.1, -0.024, 0.32), ring(0.32, -0.024, 0.18),
  ];
  rings[rings.length - 1].w = Wy(0.32) - 0.024; rings[rings.length - 1].d = Dy(0.32) - 0.024;
  sharedGeo.body = loft(rings, { capStart: -1, capEnd: 1 });
  return sharedGeo.body;
}

function lidRings() {
  const rs = [];
  // cara inferior → faldón → domo
  rs.push({ y: 0.0, w: LID_W - 0.028, d: LID_D - 0.028, r: 0.06, shade: 0.55 });
  rs.push({ y: -0.03, w: LID_W - 0.011, d: LID_D - 0.011, r: 0.07, shade: 0.7 });
  rs.push({ y: -0.034, w: LID_W - 0.004, d: LID_D - 0.004, r: 0.075, shade: 0.85 });
  rs.push({ y: -0.028, w: LID_W, d: LID_D, r: 0.078 });
  rs.push({ y: LID_SK - 0.008, w: LID_W, d: LID_D, r: 0.078 });
  rs.push({ y: LID_SK - 0.002, w: LID_W - 0.004, d: LID_D - 0.004, r: 0.076 });
  rs.push({ y: LID_SK, w: LID_W - 0.012, d: LID_D - 0.012, r: 0.072 }); // pequeño escalón
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI / 2;
    const k = 1 - Math.cos(a);
    const w = LID_W - 0.012 - 0.05 * k;
    const d = LID_D - 0.012 - (LID_D * 0.42) * k;
    const cz = -((LID_D - 0.012) - d) * 0.72;
    rs.push({ y: LID_SK + 0.004 + LID_H * Math.sin(a), w, d, r: 0.072 + 0.04 * k, cz });
  }
  return rs;
}
function lidFrontAt(a) {
  // posición y pendiente de la cara frontal del domo para el ángulo a
  const f = (aa) => {
    const k = 1 - Math.cos(aa);
    const d = LID_D - 0.012 - (LID_D * 0.42) * k;
    const cz = -((LID_D - 0.012) - d) * 0.72;
    return { y: LID_SK + 0.004 + LID_H * Math.sin(aa), z: cz + d };
  };
  const p = f(a), q = f(a + 0.001);
  const dy = q.y - p.y, dz = q.z - p.z;
  return { y: p.y, z: p.z, tilt: Math.atan2(-dz, dy) };
}

let _metal = null, _dark = null;
function metalMat() {
  return _metal || (_metal = new THREE.MeshPhysicalMaterial({ color: 0x9aa39f, metalness: 0.9, roughness: 0.32 }));
}
function darkMat() {
  return _dark || (_dark = new THREE.MeshStandardMaterial({ color: 0x090b0a, roughness: 0.95 }));
}

export function makeBin(def) {
  const g = new THREE.Group();
  g.name = 'bin_' + def.key;
  const white = def.key === 'blanca';
  const black = def.key === 'negra';
  const tune = white ? { roughness: 0.52, clearcoat: 0.15 } : black ? { roughness: 0.55, clearcoat: 0.3 } : {};
  const bodyMat = plastic(def.body, { vertexColors: true, ...tune });
  const partMat = plastic(def.body, { ...tune });
  const lidMat = plastic(def.body, { vertexColors: true, roughness: 0.42, clearcoat: 0.35, ...(white ? { roughness: 0.46 } : {}) });
  const lidPart = plastic(def.body, { roughness: 0.42, clearcoat: 0.35 });

  // cuerpo
  const body = new THREE.Mesh(binBodyGeo(), bodyMat);
  body.name = 'body';
  g.add(body);

  // marco del panel frontal empotrado
  const LY = 0.705, LWd = 0.54, LHt = 0.37;
  const front = new THREE.Group();
  front.position.set(0, LY, Dy(LY));
  front.rotation.x = TILT;
  g.add(front);
  if (!sharedGeo.bezel) {
    const sh = roundRectShape(LWd + 0.05, LHt + 0.05, 0.05);
    sh.holes.push(roundRectPath(LWd + 0.004, LHt + 0.004, 0.035));
    sharedGeo.bezel = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
    sharedGeo.labelPlane = new THREE.PlaneGeometry(LWd, LHt);
  }
  const bezel = new THREE.Mesh(sharedGeo.bezel, partMat);
  bezel.position.z = -0.002;
  front.add(bezel);
  const labTex = fontTex(768, 518, drawBinLabel(def));
  const labMat = new THREE.MeshPhysicalMaterial({
    map: labTex, emissiveMap: labTex, emissive: 0xffffff, emissiveIntensity: 0.1,
    roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.25, alphaTest: 0.5,
  });
  const label = new THREE.Mesh(sharedGeo.labelPlane, labMat);
  label.name = 'label';
  label.position.z = 0.0015;
  front.add(label);

  // asas laterales moldeadas
  if (!sharedGeo.grip) sharedGeo.grip = new RoundedBoxGeometry(0.03, 0.045, 0.3, 3, 0.012);
  for (const sx of [-1, 1]) {
    const grip = new THREE.Mesh(sharedGeo.grip, partMat);
    const y = 0.84;
    grip.position.set(sx * (Wy(y) + 0.008), y, 0);
    grip.rotation.z = -sx * TILT;
    g.add(grip);
  }

  // tira LED en el frente del labio
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x2c3a31, emissive: 0x4cd964, emissiveIntensity: 0, roughness: 0.25 });
  if (!sharedGeo.led) sharedGeo.led = new RoundedBoxGeometry(0.46, 0.016, 0.01, 2, 0.004);
  const led = new THREE.Mesh(sharedGeo.led, ledMat);
  led.name = 'led';
  led.position.set(0, (TOP + BH) / 2 + 0.002, Dy(TOP) + 0.016 + 0.004);
  g.add(led);

  // bisagras traseras (parte fija)
  const metal = metalMat();
  if (!sharedGeo.hingeBlock) {
    sharedGeo.hingeBlock = new RoundedBoxGeometry(0.1, 0.05, 0.03, 2, 0.008);
    sharedGeo.knuckle = new THREE.CylinderGeometry(0.014, 0.014, 0.1, 16);
    sharedGeo.pin = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8);
  }
  for (const sx of [-1, 1]) {
    const hb = new THREE.Mesh(sharedGeo.hingeBlock, partMat);
    hb.position.set(sx * 0.24, BH - 0.03, -(Dy(TOP) + 0.025));
    g.add(hb);
    const pin = new THREE.Mesh(sharedGeo.pin, metal);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(sx * 0.24, BH, -LID_D);
    g.add(pin);
  }

  // tapa abatible: pivote en la bisagra trasera
  const pivot = new THREE.Group();
  pivot.name = 'lidPivot';
  pivot.position.set(0, BH, -LID_D);
  g.add(pivot);
  const lidG = new THREE.Group();
  lidG.position.z = LID_D;
  pivot.add(lidG);
  if (!sharedGeo.lid) sharedGeo.lid = loft(lidRings(), { capStart: -1, capEnd: 1 });
  const lid = new THREE.Mesh(sharedGeo.lid, lidMat);
  lid.name = 'lid';
  lidG.add(lid);
  // ranura horizontal en la cara frontal del domo
  const sp = lidFrontAt(0.62);
  const slot = new THREE.Group();
  slot.position.set(0, sp.y, sp.z);
  slot.rotation.x = -sp.tilt;
  lidG.add(slot);
  if (!sharedGeo.slotBezel) {
    sharedGeo.slotBezel = new RoundedBoxGeometry(0.4, 0.085, 0.04, 3, 0.018);
    sharedGeo.slotHole = new RoundedBoxGeometry(0.33, 0.032, 0.04, 3, 0.014);
    sharedGeo.slotHood = new RoundedBoxGeometry(0.36, 0.016, 0.03, 2, 0.007);
  }
  const sb = new THREE.Mesh(sharedGeo.slotBezel, lidPart);
  sb.position.z = -0.012;
  slot.add(sb);
  const sh = new THREE.Mesh(sharedGeo.slotHole, darkMat());
  sh.position.z = -0.0095;
  slot.add(sh);
  const hood = new THREE.Mesh(sharedGeo.slotHood, lidPart);
  hood.position.set(0, 0.026, 0.006);
  slot.add(hood);
  // pestaña frontal para abrir
  if (!sharedGeo.tab) sharedGeo.tab = new RoundedBoxGeometry(0.16, 0.022, 0.03, 2, 0.009);
  const tab = new THREE.Mesh(sharedGeo.tab, lidPart);
  tab.position.set(0, -0.018, LID_D + 0.012);
  lidG.add(tab);
  // nudillos de bisagra (móviles)
  for (const sx of [-1, 1]) {
    const kn = new THREE.Mesh(sharedGeo.knuckle, lidPart);
    kn.rotation.z = Math.PI / 2;
    kn.position.set(sx * 0.24, 0, 0);
    pivot.add(kn);
  }

  // halo de suelo
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.68, 64),
    new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
  );
  halo.name = 'halo';
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.006;
  halo.renderOrder = 2;

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  label.castShadow = false;
  g.add(halo); // sin sombras

  const H = BH + LID_SK + 0.004 + LID_H;
  g.userData = { def, lid: pivot, led: ledMat, halo, open: 0, H };
  pivot.userData.binGroup = g;
  return g;
}

// ---------------------------------------------------------------------
// Letrero superior (2048 px de ancho)
// ---------------------------------------------------------------------
const SIGN = { x0: -1.615, x1: 1.615, y0: 1.98, y1: 2.835, r: 0.19 };
const SIGN_W = SIGN.x1 - SIGN.x0, SIGN_H = SIGN.y1 - SIGN.y0;
const TEX_W = 2048, TEX_H = Math.round(2048 * SIGN_H / SIGN_W);
const QR_C = { x: 1068, y: 236, box: 400 };

function drawSign(ctx, w, h) {
  // fondo
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#FBFCF8'); bg.addColorStop(1, '#EEF3EA');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // borde interior suave
  ctx.strokeStyle = 'rgba(30,60,40,.10)'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  // ondas verdes inferiores
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.66);
  ctx.bezierCurveTo(w * 0.12, h * 0.56, w * 0.22, h * 0.78, w * 0.36, h * 0.8);
  ctx.bezierCurveTo(w * 0.5, h * 0.82, w * 0.62, h * 0.92, w * 0.78, h * 0.84);
  ctx.bezierCurveTo(w * 0.88, h * 0.79, w * 0.95, h * 0.62, w, h * 0.55);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  const g1 = ctx.createLinearGradient(0, 0, w, 0);
  g1.addColorStop(0, '#1E6B30'); g1.addColorStop(0.45, '#2F8A3C'); g1.addColorStop(1, '#1E6B30');
  ctx.fillStyle = g1; ctx.fill();
  // banda clara
  ctx.beginPath();
  ctx.moveTo(0, h * 0.76);
  ctx.bezierCurveTo(w * 0.14, h * 0.66, w * 0.24, h * 0.88, w * 0.4, h * 0.9);
  ctx.bezierCurveTo(w * 0.56, h * 0.92, w * 0.68, h * 0.99, w * 0.82, h * 0.93);
  ctx.bezierCurveTo(w * 0.9, h * 0.89, w * 0.96, h * 0.76, w, h * 0.7);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = '#6DB33F'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.bezierCurveTo(w * 0.16, h * 0.78, w * 0.26, h * 0.96, w * 0.42, h * 0.97);
  ctx.bezierCurveTo(w * 0.6, h * 0.99, w * 0.72, h * 1.04, w * 0.86, h * 0.98);
  ctx.lineTo(w, h * 0.86); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = '#1E6B30'; ctx.fill();
  // línea blanca fina
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.715);
  ctx.bezierCurveTo(w * 0.13, h * 0.61, w * 0.23, h * 0.83, w * 0.38, h * 0.85);
  ctx.bezierCurveTo(w * 0.53, h * 0.87, w * 0.65, h * 0.955, w * 0.8, h * 0.885);
  ctx.bezierCurveTo(w * 0.89, h * 0.84, w * 0.955, h * 0.69, w, h * 0.625);
  ctx.stroke();
  ctx.restore();

  // hoja decorativa sobre la onda
  ctx.save();
  ctx.translate(w * 0.3, h * 0.69); ctx.rotate(-0.5);
  const lg = ctx.createLinearGradient(-90, 0, 90, 0);
  lg.addColorStop(0, '#2F8A3C'); lg.addColorStop(1, '#8FD16A');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.moveTo(-100, 0);
  ctx.bezierCurveTo(-50, -62, 50, -62, 100, 0);
  ctx.bezierCurveTo(50, 62, -50, 62, -100, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-92, 0); ctx.quadraticCurveTo(0, -6, 88, 0); ctx.stroke();
  ctx.lineWidth = 4;
  for (const k of [-50, -10, 30]) {
    ctx.beginPath(); ctx.moveTo(k, -2); ctx.lineTo(k + 26, -30); ctx.moveTo(k, -2); ctx.lineTo(k + 26, 26); ctx.stroke();
  }
  ctx.restore();

  // logotipo: cuadro redondeado con brote + "EcoAccess"
  const lx = 80, ly = 92, ls = 160;
  ctx.fillStyle = '#FFFFFF'; rr(ctx, lx, ly, ls, ls, 40); ctx.fill();
  ctx.strokeStyle = '#2F8A3C'; ctx.lineWidth = 12; rr(ctx, lx, ly, ls, ls, 40); ctx.stroke();
  ctx.save(); ctx.translate(lx + ls / 2, ly + ls / 2 + 6);
  const sprout = ctx.createLinearGradient(-60, -60, 60, 60);
  sprout.addColorStop(0, '#6DB33F'); sprout.addColorStop(1, '#1E6B30');
  iconLeaf(ctx, 132, '#2F8A3C', '#FFFFFF');
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 104px ${FONT}`;
  ctx.fillStyle = '#1E6B30'; ctx.fillText('Eco', lx + ls + 32, ly + 112);
  const ew = ctx.measureText('Eco').width;
  ctx.fillStyle = '#2F8A3C'; ctx.fillText('Access', lx + ls + 32 + ew, ly + 112);
  ctx.font = `600 36px ${FONT_B}`; ctx.fillStyle = '#4C5B53';
  ctx.fillText('Reciclaje inteligente · UPC', lx + ls + 36, ly + 160);

  // QR único con marco verde
  const { x: qx, y: qy, box } = QR_C;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#2F8A3C'; rr(ctx, qx - box / 2, qy - box / 2, box, box, 34); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; rr(ctx, qx - box / 2 + 16, qy - box / 2 + 16, box - 32, box - 32, 22); ctx.fill();
  const qs = box - 32 - 40;
  drawQR(ctx, qx - qs / 2, qy - qs / 2, qs, '#14201A');

  // píldoras de llamada a la acción
  const px = 1290, pw = 690;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  const pg = ctx.createLinearGradient(0, 58, 0, 198);
  pg.addColorStop(0, '#2F8A3C'); pg.addColorStop(1, '#1E6B30');
  ctx.fillStyle = pg; rr(ctx, px, 58, pw, 140, 70); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 80px ${FONT}`; ctx.fillText('Habla con ECO', px + pw / 2, 130);
  // segunda píldora: marco verde vivo + interior claro
  ctx.fillStyle = '#5DB33A'; rr(ctx, px + 16, 222, pw - 32, 168, 84); ctx.fill();
  ctx.fillStyle = '#EAF6E2'; rr(ctx, px + 31, 236, pw - 62, 140, 70); ctx.fill();
  ctx.fillStyle = '#1E5B2B';
  ctx.font = `700 54px ${FONT}`;
  ctx.fillText('Escanea y desecha', px + pw / 2, 280);
  ctx.fillText('tus residuos', px + pw / 2, 334);
}

// ---------------------------------------------------------------------
// Estación completa
// ---------------------------------------------------------------------
const POST_X = 1.68, FRAME_Z = -0.4, TUBE_R = 0.042, TOP_Y = 2.88, CORNER_R = 0.25;
const MID_Y = 0.46, LOW_Y = 0.2;

function tube(curve, segs, r, mat, radial = 16) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, radial, false), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function line3(a, b) { return new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b)); }
function arc3(cx, cy, cz, r, a0, a1, plane = 'xy') {
  // arco circular exacto
  const c = new THREE.Curve();
  c.getPoint = (t, out = new THREE.Vector3()) => {
    const a = a0 + (a1 - a0) * t;
    return plane === 'xy' ? out.set(cx + r * Math.cos(a), cy + r * Math.sin(a), cz)
      : out.set(cx + r * Math.cos(a), cy, cz + r * Math.sin(a));
  };
  return c;
}

export function makeStation() {
  const g = new THREE.Group();
  g.name = 'station';

  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0x17191a, metalness: 0.35, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.45,
  });
  const steel = metalMat();

  // --- bastidor principal: postes + arco superior (un solo tubo) ---
  const X = POST_X, R = CORNER_R;
  const main = new THREE.CurvePath();
  main.add(line3([-X, 0.03, FRAME_Z], [-X, TOP_Y - R, FRAME_Z]));
  main.add(arc3(-X + R, TOP_Y - R, FRAME_Z, R, Math.PI, Math.PI / 2));
  main.add(line3([-X + R, TOP_Y, FRAME_Z], [X - R, TOP_Y, FRAME_Z]));
  main.add(arc3(X - R, TOP_Y - R, FRAME_Z, R, Math.PI / 2, 0));
  main.add(line3([X, TOP_Y - R, FRAME_Z], [X, 0.03, FRAME_Z]));
  g.add(tube(main, 220, TUBE_R, frameMat, 20));

  // travesaño bajo el letrero
  g.add(tube(line3([-X, SIGN.y0 - 0.045, FRAME_Z], [X, SIGN.y0 - 0.045, FRAME_Z]), 1, 0.024, frameMat));
  // riel inferior (detrás de las canecas)
  g.add(tube(line3([-X, LOW_Y, FRAME_Z], [X, LOW_Y, FRAME_Z]), 1, 0.026, frameMat));
  // riel medio en U que abraza el frente de las canecas
  const RZ = Dy(MID_Y) + 0.03 + 0.008, RR = 0.13;
  const mid = new THREE.CurvePath();
  mid.add(line3([-X, MID_Y, FRAME_Z], [-X, MID_Y, RZ - RR]));
  mid.add(arc3(-X + RR, MID_Y, RZ - RR, RR, Math.PI, Math.PI / 2, 'xz'));
  mid.add(line3([-X + RR, MID_Y, RZ], [X - RR, MID_Y, RZ]));
  mid.add(arc3(X - RR, MID_Y, RZ - RR, RR, Math.PI / 2, 0, 'xz'));
  mid.add(line3([X, MID_Y, RZ - RR], [X, MID_Y, FRAME_Z]));
  g.add(tube(mid, 120, 0.028, frameMat));

  // abrazaderas en las uniones
  const collarGeo = new THREE.CylinderGeometry(TUBE_R + 0.012, TUBE_R + 0.012, 0.07, 24);
  for (const sx of [-1, 1]) {
    for (const y of [LOW_Y, MID_Y, SIGN.y0 - 0.045]) {
      const c = new THREE.Mesh(collarGeo, frameMat);
      c.position.set(sx * X, y, FRAME_Z);
      g.add(c);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 6), steel);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(sx * X, y, FRAME_Z + TUBE_R + 0.016);
      g.add(bolt);
    }
  }

  // --- placas base con pernos hexagonales ---
  const plateGeo = new RoundedBoxGeometry(0.2, 0.022, 0.36, 2, 0.006);
  const footGeo = new THREE.CylinderGeometry(TUBE_R + 0.016, TUBE_R + 0.03, 0.05, 24);
  const hexGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.014, 6);
  const washGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.004, 16);
  const studGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 8);
  for (const sx of [-1, 1]) {
    const plate = new THREE.Mesh(plateGeo, frameMat);
    plate.position.set(sx * X, 0.011, FRAME_Z + 0.04);
    g.add(plate);
    const foot = new THREE.Mesh(footGeo, frameMat);
    foot.position.set(sx * X, 0.022 + 0.025, FRAME_Z);
    g.add(foot);
    for (const bx of [-0.065, 0.065]) for (const bz of [-0.13, 0.13]) {
      const px = sx * X + bx, pz = FRAME_Z + 0.04 + bz;
      const w = new THREE.Mesh(washGeo, steel); w.position.set(px, 0.024, pz); g.add(w);
      const h = new THREE.Mesh(hexGeo, steel); h.position.set(px, 0.033, pz); h.rotation.y = 0.3 + bx * 7 + bz * 3; g.add(h);
      const st = new THREE.Mesh(studGeo, steel); st.position.set(px, 0.044, pz); g.add(st);
    }
  }

  // --- letrero ---
  const S = SIGN;
  const shape = new THREE.Shape();
  const r = S.r;
  shape.moveTo(S.x0, S.y0);
  shape.lineTo(S.x1, S.y0);
  shape.lineTo(S.x1, S.y1 - r);
  shape.absarc(S.x1 - r, S.y1 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(S.x0 + r, S.y1);
  shape.absarc(S.x0 + r, S.y1 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(S.x0, S.y0);
  const BD = 0.03;
  const boardGeo = new THREE.ExtrudeGeometry(shape, { depth: BD, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
  boardGeo.translate(0, 0, FRAME_Z - BD / 2);
  const board = new THREE.Mesh(boardGeo, new THREE.MeshPhysicalMaterial({ color: 0xe9ece6, roughness: 0.45, clearcoat: 0.2 }));
  g.add(board);

  const signTex = fontTex(TEX_W, TEX_H, drawSign);
  const faceGeo = new THREE.ShapeGeometry(shape, 24);
  const uv = faceGeo.attributes.uv, fp = faceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (fp.getX(i) - S.x0) / SIGN_W, (fp.getY(i) - S.y0) / SIGN_H);
  const faceZ = FRAME_Z + BD / 2 + 0.0045;
  faceGeo.translate(0, 0, faceZ);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({
    map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.16,
    roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.2,
  }));
  face.name = 'signFace';
  g.add(face);

  // presillas que sujetan el letrero al tubo
  const clipGeo = new RoundedBoxGeometry(0.05, 0.07, BD + 0.03, 2, 0.01);
  for (const [cx, cy] of [[-X + 0.012, 2.3], [-X + 0.012, 2.62], [X - 0.012, 2.3], [X - 0.012, 2.62], [-0.9, TOP_Y - 0.012], [0.9, TOP_Y - 0.012]]) {
    const clip = new THREE.Mesh(clipGeo, frameMat);
    clip.position.set(cx, cy, FRAME_Z);
    if (Math.abs(cy - (TOP_Y - 0.012)) < 0.01) clip.rotation.z = Math.PI / 2;
    g.add(clip);
  }

  // posición del QR (centro, ligeramente delante del letrero)
  const qrU = QR_C.x / TEX_W, qrV = QR_C.y / TEX_H;
  const qrPos = new THREE.Vector3(S.x0 + qrU * SIGN_W, S.y1 - qrV * SIGN_H, faceZ + 0.01);
  const qs = (QR_C.box / TEX_W) * SIGN_W;
  const glowShape = roundRectShape(qs + 0.1, qs + 0.1, 0.07);
  glowShape.holes.push(roundRectPath(qs - 0.02, qs - 0.02, 0.04));
  const qrGlow = new THREE.Mesh(
    new THREE.ShapeGeometry(glowShape, 8),
    new THREE.MeshBasicMaterial({ color: 0x8fd16a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
  );
  qrGlow.name = 'qrGlow';
  qrGlow.position.copy(qrPos);
  qrGlow.renderOrder = 3;

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  face.castShadow = false;
  g.add(qrGlow);

  // --- canecas ---
  const bins = BINS.map((def, i) => {
    const b = makeBin(def);
    b.position.set((i - 1) * 1.0, 0, 0);
    g.add(b);
    return b;
  });

  g.userData = { bins, qrGlow, qrPos };
  return g;
}
