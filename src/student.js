// =====================================================================
// Estudiante UPC · personaje procedimental estilizado (Three.js)
//   makeStudent() → THREE.Group (pies en y = 0, mira hacia +z, ≈ 1.75 u de alto)
// Convención de lados (igual que eco.js):
//   'L' = lado izquierdo de la pantalla (−x)   'R' = lado derecho de la pantalla (+x)
// Anclas de mano (userData.handR / handL): origen sobre la palma,
//   +z sale de la palma, +y = dirección del pulgar, +x = completa la base
//   (mano R: +x apunta hacia los dedos; mano L: −x apunta hacia los dedos).
//   Un objeto sostenido "en puño" (botella) se alinea con +y del ancla;
//   un teléfono apoyado en la palma muestra su pantalla hacia +z.
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FONT } from './util.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
}
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);

// Agrupa geometrías por material y las fusiona en una sola malla por material
class Parts {
  constructor() { this.m = new Map(); }
  add(geo, mat, t) {
    const g = geo.clone();
    if (t) g.applyMatrix4(Array.isArray(t) ? M4(...t) : t);
    if (!this.m.has(mat)) this.m.set(mat, []);
    this.m.get(mat).push(g);
    return this;
  }
  build(parent, name = '') {
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
      mesh.name = name;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      out.push(mesh);
    }
    this.m.clear();
    return out;
  }
}

// ---------------------------------------------------------------------
// Texturas procedimentales
// ---------------------------------------------------------------------
function cnv(w, h, draw, color = true, rep = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  return t;
}
function denimTex() {
  return cnv(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#24344F'; ctx.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = -h; i < w; i += 4) {
      ctx.strokeStyle = `rgba(${90 + r() * 40},${110 + r() * 40},${150 + r() * 40},${0.18 + r() * 0.12})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,10,.12)';
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
  }, true, [5, 9]);
}
function piqueTex() {
  return cnv(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const g = ctx.createRadialGradient(x * 8 + 4 + (y % 2) * 4, y * 8 + 4, 0, x * 8 + 4 + (y % 2) * 4, y * 8 + 4, 4);
      g.addColorStop(0, '#d0d0d0'); g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g; ctx.fillRect(x * 8 + (y % 2) * 4, y * 8, 8, 8);
    }
  }, false, [36, 26]);
}
function eyeTex() {
  return cnv(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#F7F3EE'; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.25, cy = h * 0.5;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 23);
    g.addColorStop(0, '#7A4B2A'); g.addColorStop(0.55, '#4E2E19'); g.addColorStop(0.92, '#2A170C'); g.addColorStop(1, '#1A0E08');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 23, 0, TAU); ctx.fill();
    ctx.fillStyle = '#090504'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(cx - 6, cy - 7, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx + 7, cy + 7, 2.2, 0, TAU); ctx.fill();
  });
}
function upcTex() {
  const draw = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2F8A3C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 104px ${FONT}`;
    ctx.fillText('UPC', w / 2, h / 2 + 4);
  };
  const t = cnv(256, 128, draw);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => { draw(t.image.getContext('2d'), 256, 128); t.needsUpdate = true; }).catch(() => {});
  }
  return t;
}

// ---------------------------------------------------------------------
// Medidas (unidades de escena, pies en y = 0)
// ---------------------------------------------------------------------
const TORSO_Y = 0.98;           // pivote del torso (cintura)
const SH_X = 0.185, SH_Y = 1.395;  // hombros
const UPPER = 0.28, FORE = 0.25;
const NECK_Y = 1.47;            // pivote de la cabeza
const HC = new V3(0, 0.122, 0.012); // centro del cráneo relativo al pivote de la cabeza
const HS = new V3(0.094, 0.126, 0.106); // semiejes del cráneo

// Perfil del torso de la camisa (radio, y)
const SHIRT = [[0.19, 0.895], [0.194, 0.915], [0.184, 0.97], [0.178, 1.04], [0.186, 1.14], [0.197, 1.24], [0.2, 1.31], [0.193, 1.36], [0.172, 1.4], [0.128, 1.433], [0.078, 1.452], [0.05, 1.46]];
const SHIRT_Z = 0.65;
function shirtR(y) {
  for (let i = 0; i < SHIRT.length - 1; i++) {
    const [r0, y0] = SHIRT[i], [r1, y1] = SHIRT[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return y < SHIRT[0][1] ? SHIRT[0][0] : SHIRT[SHIRT.length - 1][0];
}
const shirtZ = (x, y, off = 0) => SHIRT_Z * Math.sqrt(Math.max(0, shirtR(y) ** 2 - x * x)) + off;

// Deformación del cráneo (esfera unitaria → cabeza estilizada)
function headPoint(nx, ny, nz, k = 1, out = new V3()) {
  let x = nx, y = ny, z = nz;
  if (y < 0) {
    const t = -y;
    x *= 1 - 0.3 * Math.pow(t, 1.5);
    if (z < 0) z *= 1 - 0.25 * t;
    else z *= 1 - 0.06 * t;
  } else if (z < 0) z *= 1 + 0.07 * y;
  return out.set(x * HS.x * k + HC.x, y * HS.y * k + HC.y, z * HS.z * k + HC.z);
}
function deformSphere(geo, k = 1) {
  const p = geo.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    headPoint(v.x, v.y, v.z, k, v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------
// Mano (en el espacio de la muñeca: la mano cuelga hacia −y; s = +1 lado +x)
// En reposo la palma mira hacia el cuerpo (−s·x) y el pulgar hacia +z.
// ---------------------------------------------------------------------
const FINGERS = [ // z, largo de falanges, radio
  [0.027, [0.04, 0.026, 0.021], 0.0098],
  [0.009, [0.045, 0.029, 0.023], 0.0102],
  [-0.01, [0.042, 0.027, 0.021], 0.0097],
  [-0.028, [0.033, 0.021, 0.018], 0.0088],
];
const CURLS = {
  grip: [[0.55, 0.85, 0.55], [0.6, 0.95, 0.6], [0.65, 1.0, 0.6], [0.7, 1.05, 0.6]],
  point: [[0.04, 0.04, 0.03], [1.45, 1.55, 1.0], [1.45, 1.55, 1.0], [1.4, 1.5, 1.0]],
};
const ANCHOR_LOCAL = (s) => ({ pos: new V3(-s * 0.019, -0.066, 0.004), x: new V3(0, -s, 0), y: new V3(0, 0, 1), z: new V3(-s, 0, 0) });

function handGeo(s, variant) {
  const parts = [];
  const push = (g, m) => { g.applyMatrix4(m); parts.push(g); };
  push(new THREE.SphereGeometry(0.031, 12, 8), M4(0, -0.004, 0, 0, 0, 0, 0.85, 1, 1.05));
  // palma ligeramente ahuecada
  const palm = new RoundedBoxGeometry(0.032, 0.088, 0.08, 3, 0.014);
  push(palm, M4(0, -0.058, 0, 0, 0, -s * 0.06));
  const curls = CURLS[variant];
  FINGERS.forEach(([z, lens, rad], i) => {
    let m = new THREE.Matrix4().makeTranslation(-s * 0.002, -0.098, z);
    m.multiply(new THREE.Matrix4().makeRotationX((i - 1.5) * -0.04));
    lens.forEach((L, k) => {
      m = m.clone().multiply(new THREE.Matrix4().makeRotationZ(-s * curls[i][k]));
      const r = rad * (1 - k * 0.1);
      const cap = new THREE.CapsuleGeometry(r, Math.max(0.002, L - r), 2, 7);
      push(cap, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -L / 2, 0)));
      m = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -L, 0));
    });
  });
  // pulgar (opuesto hacia la palma)
  const thumbCurl = variant === 'point' ? [0.5, 0.5, 0.35] : [0.35, 0.45, 0.35];
  let m = new THREE.Matrix4().makeTranslation(-s * 0.01, -0.03, 0.03);
  m.multiply(new THREE.Matrix4().makeRotationX(-0.95));
  m.multiply(new THREE.Matrix4().makeRotationZ(-s * 0.35));
  [0.036, 0.028, 0.022].forEach((L, k) => {
    m = m.clone().multiply(new THREE.Matrix4().makeRotationZ(-s * thumbCurl[k]));
    const r = 0.0118 * (1 - k * 0.1);
    push(new THREE.CapsuleGeometry(r, Math.max(0.002, L - r), 2, 7), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -L / 2, 0)));
    m = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -L, 0));
  });
  const ps = parts.map((g0) => { const g = g0.index ? g0.toNonIndexed() : g0; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; });
  return mergeGeometries(ps, false);
}

// ---------------------------------------------------------------------
// IK de dos huesos → cuaterniones (espacio del torso)
// ---------------------------------------------------------------------
function anchorBasis(n, f, s) {
  const z = n.clone().normalize();
  const fx = f.clone().addScaledVector(z, -f.dot(z)).normalize();
  const x = s > 0 ? fx : fx.clone().negate();
  const y = new V3().crossVectors(z, x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z);
}
function solveArm(s, anchorRoot, n, f, pole) {
  const S = new V3(s * SH_X, SH_Y - TORSO_Y, -0.005);
  const A = anchorRoot.clone().sub(new V3(0, TORSO_Y, 0));
  const AL = ANCHOR_LOCAL(s);
  const Ra = anchorBasis(n, f, s);
  const Ral = new THREE.Matrix4().makeBasis(AL.x, AL.y, AL.z);
  const Rw = Ra.clone().multiply(Ral.clone().transpose());
  const qW = new THREE.Quaternion().setFromRotationMatrix(Rw);
  const W = A.clone().sub(AL.pos.clone().applyQuaternion(qW));
  const a = UPPER, b = FORE;
  const D = W.clone().sub(S);
  const d = clamp(D.length(), Math.abs(a - b) + 0.01, a + b - 0.002);
  const dir = D.normalize();
  const P = pole.clone().normalize();
  const pn = P.addScaledVector(dir, -P.dot(dir)).normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const alpha = Math.acos(cosA);
  const E = S.clone().addScaledVector(dir, a * Math.cos(alpha)).addScaledVector(pn, a * Math.sin(alpha));
  const Wc = S.clone().addScaledVector(dir, d);
  const u = E.clone().sub(S).normalize();
  const fw = Wc.clone().sub(E);
  let zA = fw.addScaledVector(u, -fw.dot(u));
  if (zA.lengthSq() < 1e-8) zA = pn.clone().negate().addScaledVector(u, pn.dot(u));
  zA.normalize();
  const yA = u.clone().negate();
  const xA = new V3().crossVectors(yA, zA);
  const qS = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  const cosG = clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1);
  const bend = Math.PI - Math.acos(cosG);
  const qE0 = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -bend);
  // reparte el giro axial al antebrazo para que la muñeca sólo flexione
  const qRel = qS.clone().multiply(qE0).invert().multiply(qW);
  const tw = 2 * Math.atan2(qRel.y, qRel.w);
  const qTw = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), tw);
  const qE = qE0.clone().multiply(qTw);
  const qWl = qTw.clone().invert().multiply(qRel);
  return { s: qS, e: qE, w: qWl };
}

// ---------------------------------------------------------------------
// Personaje
// ---------------------------------------------------------------------
export function makeStudent() {
  const root = new THREE.Group();
  root.name = 'student';

  const pique = piqueTex();
  const M = {
    skin: new THREE.MeshPhysicalMaterial({ color: 0xC68A63, roughness: 0.5, sheen: 0.55, sheenColor: 0xff9c7c, sheenRoughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5, emissive: 0x3a1508, emissiveIntensity: 0.12 }),
    shirt: new THREE.MeshPhysicalMaterial({ color: 0xF5F5F1, roughness: 0.82, sheen: 0.7, sheenColor: 0xffffff, sheenRoughness: 0.6, bumpMap: pique, bumpScale: 0.6, side: THREE.DoubleSide }),
    trim: new THREE.MeshPhysicalMaterial({ color: 0x2F8A3C, roughness: 0.6, sheen: 0.4, sheenColor: 0x9fe08a }),
    jeans: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: denimTex(), roughness: 0.88, sheen: 0.35, sheenColor: 0x6c86b8, sheenRoughness: 0.7 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: 0xF4F4F0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    sole: new THREE.MeshPhysicalMaterial({ color: 0xE3E5DF, roughness: 0.7 }),
    pack: new THREE.MeshPhysicalMaterial({ color: 0x1A1D1F, roughness: 0.7, sheen: 0.5, sheenColor: 0x5a6266, sheenRoughness: 0.5 }),
    buckle: new THREE.MeshPhysicalMaterial({ color: 0x3B4144, roughness: 0.35, metalness: 0.3, clearcoat: 0.5 }),
    hair: new THREE.MeshPhysicalMaterial({ color: 0x1E1611, roughness: 0.42, sheen: 1, sheenColor: 0x7a5d48, sheenRoughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.45 }),
    eye: new THREE.MeshPhysicalMaterial({ map: eyeTex(), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
    lips: new THREE.MeshPhysicalMaterial({ color: 0x8C4636, roughness: 0.45, clearcoat: 0.3 }),
    watch: new THREE.MeshPhysicalMaterial({ color: 0x151718, roughness: 0.3, metalness: 0.4, clearcoat: 0.8 }),
  };
  M.upc = new THREE.MeshStandardMaterial({ map: upcTex(), alphaTest: 0.4, roughness: 0.7 });

  // ---------- piernas y zapatos (estáticos) ----------
  {
    const P = new Parts();
    // cadera / pelvis
    P.add(lathe([[0.001, 0.8], [0.11, 0.805], [0.158, 0.84], [0.172, 0.9], [0.172, 0.98], [0.165, 1.0], [0.001, 1.005]], 40), M.jeans, [0, 0, 0, 0, 0, 0, 1, 1, 0.66]);
    for (const sx of [-1, 1]) {
      const leg = lathe([[0.001, 0.058], [0.062, 0.058], [0.066, 0.075], [0.061, 0.12], [0.06, 0.2], [0.062, 0.3], [0.066, 0.42],
        [0.064, 0.46], [0.068, 0.5], [0.072, 0.58], [0.08, 0.68], [0.087, 0.76], [0.09, 0.84], [0.001, 0.9]], 32);
      P.add(leg, M.jeans, [sx * 0.095, 0, 0, 0, sx * 0.04, 0, 1, 1, 0.94]);
      // zapatilla
      const fx = sx * 0.1, fz = 0.04;
      P.add(new RoundedBoxGeometry(0.108, 0.032, 0.28, 3, 0.014), M.sole, [fx, 0.016, fz]);
      const up = new RoundedBoxGeometry(0.098, 0.085, 0.255, 4, 0.038);
      const p = up.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i), y = p.getY(i);
        if (y > 0) p.setY(i, y * (1 - 0.55 * Math.max(0, z) / 0.128));
      }
      up.computeVertexNormals();
      P.add(up, M.shoe, [fx, 0.068, fz - 0.005]);
      P.add(new THREE.TorusGeometry(0.058, 0.012, 8, 24), M.shoe, [sx * 0.096, 0.105, -0.005, Math.PI / 2, 0, 0, 1, 0.95, 1]);
      // lengüeta y cordones
      P.add(new RoundedBoxGeometry(0.06, 0.012, 0.09, 2, 0.005), M.shoe, [fx, 0.1, fz + 0.035, -0.42, 0, 0]);
      for (let k = 0; k < 4; k++) P.add(new RoundedBoxGeometry(0.052, 0.006, 0.008, 1, 0.003), M.sole, [fx, 0.097 - k * 0.011, fz + 0.025 + k * 0.022, -0.4, 0, 0]);
      // acentos verdes: talón y franja lateral
      P.add(new RoundedBoxGeometry(0.1, 0.06, 0.04, 3, 0.016), M.trim, [fx, 0.068, fz - 0.118]);
      P.add(new RoundedBoxGeometry(0.008, 0.018, 0.12, 2, 0.004), M.trim, [fx + sx * 0.049, 0.06, fz - 0.03, 0.18, 0, 0]);
    }
    P.build(root, 'legs');
  }

  // ---------- torso ----------
  const torso = new THREE.Group(); torso.name = 'torso';
  torso.position.y = TORSO_Y;
  root.add(torso);
  const tl = (x, y, z, ...r) => [x, y - TORSO_Y, z, ...r];
  {
    const P = new Parts();
    P.add(lathe(SHIRT.map(([r, y]) => [r, y - TORSO_Y]), 48), M.shirt, [0, 0, 0, 0, 0, 0, 1, 1, SHIRT_Z]);
    // cuello tipo polo: base + solapa doblada
    P.add(lathe([[0.058, 1.44], [0.06, 1.47], [0.061, 1.495]].map(([r, y]) => [r, y - TORSO_Y]), 32), M.shirt, [0, 0, 0.005, 0, 0, 0, 1, 1, 0.92]);
    P.add(lathe([[0.104, 1.432], [0.09, 1.455], [0.072, 1.485], [0.064, 1.497]].map(([r, y]) => [r, y - TORSO_Y]), 32), M.shirt, [0, 0, 0.005, 0, 0, 0, 1, 1, 0.92]);
    // tapeta frontal
    P.add(new RoundedBoxGeometry(0.038, 0.13, 0.012, 2, 0.005), M.shirt, tl(0, 1.37, shirtZ(0, 1.37, 0.002), -0.12, 0, 0));
    P.build(torso, 'shirt');
    // ribete verde del cuello
    P.add(new THREE.TorusGeometry(0.104, 0.0042, 6, 48), M.trim, [0, 1.433 - TORSO_Y, 0.005, Math.PI / 2, 0, 0, 1, 0.92, 1]);
    P.add(new THREE.TorusGeometry(0.099, 0.0032, 6, 48), M.trim, [0, 1.441 - TORSO_Y, 0.005, Math.PI / 2, 0, 0, 1, 0.92, 1]);
    for (const by of [1.4, 1.335]) P.add(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12), M.trim, tl(0, by, shirtZ(0, by, 0.009), Math.PI / 2 - 0.12, 0, 0));
    P.build(torso, 'trim');
    // cuello (piel)
    P.add(lathe([[0.05, 1.4], [0.048, 1.46], [0.046, 1.52], [0.04, 1.56]].map(([r, y]) => [r, y - TORSO_Y]), 24), M.skin, [0, 0, 0.004, 0, 0, 0, 1, 1, 0.95]);
    P.build(torso, 'neck');
  }
  // texto "UPC" en el pecho (lado +x)
  {
    const x = 0.085, y = 1.275;
    const z = shirtZ(x, y, 0.003);
    const ny = Math.atan2(x / (shirtR(y) ** 2), z / ((shirtR(y) * SHIRT_Z) ** 2));
    const upc = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.0375), M.upc);
    upc.name = 'upc';
    upc.position.set(x, y - TORSO_Y, z);
    upc.rotation.y = ny;
    torso.add(upc);
  }
  // mochila negra con correas
  {
    const P = new Parts();
    P.add(new RoundedBoxGeometry(0.31, 0.42, 0.13, 4, 0.055), M.pack, tl(0, 1.16, -0.2, 0.06, 0, 0));
    P.add(new RoundedBoxGeometry(0.25, 0.19, 0.06, 4, 0.025), M.pack, tl(0, 1.06, -0.275, 0.06, 0, 0));
    P.add(new THREE.TorusGeometry(0.035, 0.009, 8, 20, Math.PI), M.pack, tl(0, 1.375, -0.19, 0, 0, 0));
    const strapPts = (sx) => {
      const pts = [new V3(sx * 0.095, 1.34, -0.16), new V3(sx * 0.12, 1.43, -0.09), new V3(sx * 0.13, 1.455, -0.01)];
      for (const y of [1.42, 1.36, 1.28, 1.2, 1.12]) {
        const x = sx * (0.135 + (1.42 - y) * 0.12);
        pts.push(new V3(x, y, shirtZ(x, y, 0.012)));
      }
      const xs = sx * 0.19;
      pts.push(new V3(xs, 1.04, shirtZ(xs, 1.04, 0.012)));
      pts.push(new V3(sx * 0.2, 1.0, -0.04), new V3(sx * 0.15, 0.98, -0.15));
      return pts.map((p) => p.sub(new V3(0, TORSO_Y, 0)));
    };
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3(strapPts(sx));
      const g = new THREE.TubeGeometry(curve, 64, 0.0125, 6, false);
      P.add(g, M.pack);
      const by = 1.24, bx = sx * (0.135 + 0.18 * 0.12);
      P.add(new RoundedBoxGeometry(0.04, 0.03, 0.012, 2, 0.004), M.buckle, tl(bx, by, shirtZ(bx, by, 0.024), -0.15, sx * 0.35, 0));
    }
    // cremalleras
    P.add(new RoundedBoxGeometry(0.26, 0.008, 0.008, 1, 0.003), M.buckle, tl(0, 1.32, -0.268, 0.06, 0, 0));
    P.add(new RoundedBoxGeometry(0.2, 0.007, 0.007, 1, 0.003), M.buckle, tl(0, 1.135, -0.305, 0.06, 0, 0));
    P.build(torso, 'backpack');
  }

  // ---------- cabeza ----------
  const headPose = new THREE.Group(); headPose.name = 'headPose';
  headPose.position.y = NECK_Y - TORSO_Y;
  torso.add(headPose);
  const head = new THREE.Group(); head.name = 'head';
  headPose.add(head);
  {
    const P = new Parts();
    P.add(deformSphere(new THREE.SphereGeometry(1, 40, 30)), M.skin);
    // orejas
    for (const sx of [-1, 1]) {
      P.add(new THREE.SphereGeometry(0.027, 16, 12), M.skin, [sx * 0.093, HC.y - 0.012, HC.z - 0.006, 0, sx * 0.3, 0, 0.45, 1, 0.72]);
      P.add(new THREE.TorusGeometry(0.016, 0.004, 6, 16), M.skin, [sx * 0.101, HC.y - 0.012, HC.z - 0.003, 0, sx * (Math.PI / 2 - 0.3), 0, 1, 1.3, 1]);
    }
    // nariz
    P.add(new THREE.SphereGeometry(0.0135, 16, 12), M.skin, [0, HC.y - 0.03, HC.z + 0.1, 0, 0, 0, 1.05, 0.9, 1]);
    P.add(new THREE.CapsuleGeometry(0.0065, 0.032, 3, 8), M.skin, [0, HC.y - 0.01, HC.z + 0.099, -0.3, 0, 0]);
    for (const sx of [-1, 1]) P.add(new THREE.SphereGeometry(0.0075, 10, 8), M.skin, [sx * 0.011, HC.y - 0.034, HC.z + 0.096]);
    // párpados superiores
    for (const sx of [-1, 1]) {
      P.add(new THREE.SphereGeometry(0.0262, 20, 8, 0, TAU, 0, 0.82), M.skin, [sx * 0.04, HC.y + 0.009, HC.z + 0.081, 0.3, 0, 0, 1, 1.08, 0.92]);
    }
    // labio inferior y mentón
    P.add(new THREE.SphereGeometry(0.016, 14, 8), M.skin, [0, HC.y - 0.071, HC.z + 0.083, 0, 0, 0, 1.1, 0.38, 0.4]);
    P.build(head, 'headSkin');

    // ojos
    for (const sx of [-1, 1]) P.add(new THREE.SphereGeometry(0.0245, 24, 16), M.eye, [sx * 0.04, HC.y + 0.006, HC.z + 0.077, 0.04, sx * 0.04, 0, 1, 1.08, 0.88]);
    P.build(head, 'eyes');
    // boca (sonrisa)
    P.add(new THREE.TorusGeometry(0.024, 0.0038, 6, 18, 1.6), M.lips, [0, HC.y - 0.034, HC.z + 0.086, -0.15, 0, -Math.PI / 2 - 0.8, 1, 1, 0.6]);
    P.build(head, 'mouth');

    // cabello esculpido: lados cortos, volumen ondulado arriba
    const tilt = new THREE.Matrix4().makeRotationX(-0.6);
    const cap = new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, 0.5 * Math.PI);
    cap.applyMatrix4(tilt);
    P.add(deformSphere(cap, 1.035), M.hair);
    const r = rng(42);
    const tmp = new V3(), n = new V3();
    const clump = new THREE.SphereGeometry(1, 10, 7);
    const addClump = (theta, phi, sc, flow, outK, roll = 0) => {
      tmp.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)).applyMatrix4(tilt);
      const pos = headPoint(tmp.x, tmp.y, tmp.z, outK);
      n.set((pos.x - HC.x) / (HS.x ** 2), (pos.y - HC.y) / (HS.y ** 2), (pos.z - HC.z) / (HS.z ** 2)).normalize();
      const g = flow.clone();
      const t = g.addScaledVector(n, -g.dot(n)).normalize();
      const x = new V3().crossVectors(n, t);
      const m = new THREE.Matrix4().makeBasis(x, n, t);
      m.multiply(new THREE.Matrix4().makeRotationY(roll + (r() - 0.5) * 0.5));
      m.setPosition(pos.addScaledVector(n, sc[1] * 0.25));
      m.multiply(new THREE.Matrix4().makeScale(...sc));
      P.add(clump, M.hair, m);
    };
    // corona: mechones que fluyen hacia atrás
    for (let i = 0; i < 30; i++) {
      const theta = Math.sqrt(r()) * 0.4 * Math.PI;
      const phi = r() * TAU;
      addClump(theta, phi, [0.03 + r() * 0.01, 0.02 + r() * 0.008, 0.05 + r() * 0.02], new V3(0.25, 0.1, -1), 1.05);
    }
    // lados y nuca: mechones planos y cortos
    for (let i = 0; i < 12; i++) {
      const phi = (i / 12) * TAU + 0.2;
      if (Math.sin(phi) > 0.5) continue;
      addClump(0.36 * Math.PI, phi, [0.03, 0.012, 0.045], new V3(0, -1, -0.4), 1.02);
    }
    // tupé ondulado al frente, peinado hacia un lado
    for (let i = 0; i < 8; i++) {
      const phi = Math.PI / 2 + (i - 3.5) * 0.24;
      addClump(0.36 * Math.PI + (i % 2) * 0.05, phi, [0.034, 0.026, 0.06 + r() * 0.01], new V3(0.9, 1.3, -0.4), 1.08, 0.3);
    }
    for (let i = 0; i < 5; i++) {
      const phi = Math.PI / 2 + (i - 2) * 0.3 + 0.12;
      addClump(0.24 * Math.PI, phi, [0.036, 0.028, 0.06], new V3(0.7, 0.6, -1), 1.12, 0.2);
    }
    // patillas y cejas arqueadas
    for (const sx of [-1, 1]) {
      P.add(new THREE.CapsuleGeometry(0.008, 0.026, 3, 8), M.hair, [sx * 0.091, HC.y + 0.012, HC.z + 0.026, 0.15, 0, 0, 0.8, 0.8, 0.5]);
      const brow = new THREE.TorusGeometry(0.034, 0.0058, 6, 12, 0.95);
      P.add(brow, M.hair, new THREE.Matrix4().compose(new V3(sx * 0.041, HC.y + 0.016, HC.z + 0.089),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, sx * 0.32, Math.PI / 2 - 0.475 - sx * 0.1)), new V3(1, 1, 0.7)));
    }
    P.build(head, 'hair');
  }

  // ---------- brazos ----------
  const joints = {};
  const handVar = { L: {}, R: {} };
  const anchors = {};
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const sh = new THREE.Group(); sh.name = 'shoulder' + side;
    sh.position.set(s * SH_X, SH_Y - TORSO_Y, -0.005);
    torso.add(sh);
    const el = new THREE.Group(); el.name = 'elbow' + side; el.position.y = -UPPER; sh.add(el);
    const wr = new THREE.Group(); wr.name = 'wrist' + side; wr.position.y = -FORE; el.add(wr);
    joints['shoulder' + side] = sh; joints['elbow' + side] = el; joints['wrist' + side] = wr;

    const P = new Parts();
    P.add(lathe([[0.066, -0.168], [0.068, -0.15], [0.071, -0.09], [0.073, -0.03], [0.071, 0.01], [0.061, 0.042], [0.036, 0.062], [0.001, 0.067]], 32), M.shirt);
    P.build(sh, 'sleeve' + side);
    P.add(new THREE.TorusGeometry(0.066, 0.0042, 6, 32), M.trim, [0, -0.164, 0, Math.PI / 2, 0, 0]);
    P.add(new THREE.TorusGeometry(0.069, 0.0032, 6, 32), M.trim, [0, -0.15, 0, Math.PI / 2, 0, 0]);
    P.build(sh, 'sleeveTrim' + side);
    P.add(lathe([[0.04, -UPPER], [0.044, -0.23], [0.047, -0.15], [0.046, -0.08]], 24), M.skin);
    P.add(new THREE.SphereGeometry(0.0405, 20, 14), M.skin, [0, -UPPER, 0]);
    P.build(sh, 'upperArm' + side);
    P.add(lathe([[0.031, -FORE + 0.005], [0.038, -0.16], [0.043, -0.06], [0.041, 0.0]], 24), M.skin, [0, 0, 0, 0, 0, 0, 1, 1, 0.9]);
    P.build(el, 'forearm' + side);
    if (s > 0) {
      P.add(new THREE.CylinderGeometry(0.036, 0.036, 0.022, 28, 1, true), M.watch, [0, -FORE + 0.03, 0, 0, 0, 0, 1, 1, 0.9]);
      P.add(new RoundedBoxGeometry(0.03, 0.032, 0.012, 2, 0.005), M.watch, [s * 0.034, -FORE + 0.03, 0, 0, 0, Math.PI / 2]);
      P.build(el, 'watch');
    }
    for (const v of (s > 0 ? ['grip', 'point'] : ['grip'])) {
      const m = new THREE.Mesh(handGeo(s, v), M.skin);
      m.name = 'hand' + side + '_' + v;
      m.castShadow = m.receiveShadow = true;
      m.visible = v === 'grip';
      wr.add(m);
      handVar[side][v] = m;
    }
    const AL = ANCHOR_LOCAL(s);
    const anchor = new THREE.Group(); anchor.name = 'hand' + side;
    anchor.position.copy(AL.pos);
    anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(AL.x, AL.y, AL.z));
    wr.add(anchor);
    anchors[side] = anchor;
  }

  // ---------- poses (IK resuelta al construir) ----------
  const arm = (s, a, n, f, pole) => solveArm(s, new V3(...a), new V3(...n), new V3(...f), new V3(...pole));
  const idleR = arm(1, [0.235, 0.835, 0.03], [-1, 0, 0.12], [0, -1, 0.12], [0.3, 0, -1]);
  const idleL = arm(-1, [-0.235, 0.835, 0.03], [1, 0, 0.12], [0, -1, 0.12], [-0.3, 0, -1]);
  const POSES = {
    idle: { R: idleR, L: idleL, head: [0, 0, 0], handR: 'grip' },
    holdPhone: {
      R: arm(1, [0.07, 1.15, 0.31], [-0.12, 0.85, -0.5], [-0.55, 0.15, 1], [0.6, -1, -0.2]),
      L: idleL, head: [0.4, 0.06, 0], handR: 'grip',
    },
    scan: {
      R: arm(1, [0.5, 1.47, 0.36], [-0.85, 0.12, -0.5], [0.05, 1, 0.1], [0.4, -1, -0.1]),
      L: idleL, head: [-0.1, 0.55, 0.04], handR: 'grip',
    },
    think: {
      L: arm(-1, [-0.015, 1.452, 0.172], [0.2, 0.45, -1], [0.1, 1, 0.25], [-0.3, -1, 0.3]),
      R: arm(1, [0.2, 1.2, 0.24], [-1, 0.05, 0.25], [0.2, 0, 1], [0.5, -1, -0.2]),
      head: [-0.06, 0.3, 0.07], handR: 'grip',
    },
    point: {
      R: arm(1, [0.72, 1.36, 0.16], [0, -0.45, 1], [1, 0.05, 0.1], [0, -1, -0.3]),
      L: idleL, head: [0, 0.5, 0], handR: 'point',
    },
  };

  const JN = [['shoulderR', 'R', 's'], ['elbowR', 'R', 'e'], ['wristR', 'R', 'w'], ['shoulderL', 'L', 's'], ['elbowL', 'L', 'e'], ['wristL', 'L', 'w']];
  const setInstant = (P) => {
    for (const [j, side, k] of JN) joints[j].quaternion.copy(P[side][k]);
    headPose.rotation.set(P.head[0], P.head[1], P.head[2], 'YXZ');
  };
  setInstant(POSES.idle);
  headPose.rotation.order = 'YXZ';

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- API ----------
  const U = root.userData;
  let curPose = 'idle';
  const showHand = (v) => { for (const k in handVar.R) handVar.R[k].visible = k === v; };
  function update(dt, t = 0, poseName = 'idle', reduced = false) {
    dt = clamp(dt || 0, 0, 0.1);
    const P = POSES[poseName] || POSES.idle;
    if (poseName !== curPose) curPose = poseName;
    const k = 1 - Math.exp(-7 * dt);
    for (const [j, side, kk] of JN) joints[j].quaternion.slerp(P[side][kk], k);
    const hk = 1 - Math.exp(-6 * dt);
    headPose.rotation.x += (P.head[0] - headPose.rotation.x) * hk;
    headPose.rotation.y += (P.head[1] - headPose.rotation.y) * hk;
    headPose.rotation.z += (P.head[2] - headPose.rotation.z) * hk;
    // cambia la forma de la mano cuando el brazo ya está cerca del destino
    const want = P.handR || 'grip';
    if (!handVar.R[want].visible && joints.shoulderR.quaternion.angleTo(P.R.s) < 0.35) showHand(want);
    // respiración (siempre) y transferencia de peso (sólo sin movimiento reducido)
    const br = Math.sin(t * 1.6);
    torso.position.y = TORSO_Y + 0.0035 * br;
    torso.scale.set(1 + 0.004 * br, 1, 1 + 0.006 * br);
    const ks = 1 - Math.exp(-3 * dt);
    const swZ = reduced ? 0 : 0.016 * Math.sin(t * 0.45);
    const swY = reduced ? 0 : 0.03 * Math.sin(t * 0.31);
    const swX = reduced ? 0 : 0.008 * Math.sin(t * 0.6 + 1);
    torso.rotation.z += (swZ - torso.rotation.z) * ks;
    torso.rotation.y += (swY - torso.rotation.y) * ks;
    torso.rotation.x += (swX - torso.rotation.x) * ks;
  }
  Object.assign(U, {
    handR: anchors.R, handL: anchors.L, head, POSES, update,
    joints, torso, headPose, materials: M,
    setPoseInstant(name) { const P = POSES[name] || POSES.idle; setInstant(P); curPose = name; showHand(P.handR || 'grip'); },
  });
  return root;
}
