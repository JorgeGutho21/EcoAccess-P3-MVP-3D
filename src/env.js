// =====================================================================
// Entorno de campus (cielo, adoquines, césped, árboles, edificio)
// Inspirado en el campus de la UPC; todo procedimental.
// =====================================================================
import * as THREE from 'three';
import { canvasTex } from './util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function skyTexture() {
  return canvasTex(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5FA4E6');
    g.addColorStop(0.45, '#A9D3F5');
    g.addColorStop(0.62, '#E8F3F7');
    g.addColorStop(1, '#F4F7EE');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

function paverTex() {
  const t = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#6d6862'; ctx.fillRect(0, 0, w, h);
    const bw = 128, bh = 64;
    for (let y = 0; y < h / bh; y++) for (let x = -1; x < w / bw + 1; x++) {
      const ox = (y % 2) * bw / 2;
      const r = rnd();
      const base = r < 0.12 ? [140, 86, 72] : [150 + r * 26, 144 + r * 24, 136 + r * 22];
      ctx.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`;
      ctx.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.05})`;
        ctx.fillRect(x * bw + ox + 3 + rnd() * (bw - 8), y * bh + 3 + rnd() * (bh - 8), 2 + rnd() * 5, 2 + rnd() * 5);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function grassTex() {
  const t = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5d9a35'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const g = 110 + rnd() * 80;
      ctx.strokeStyle = `rgba(${40 + rnd() * 50},${g},${30 + rnd() * 30},0.55)`;
      const x = rnd() * w, y = rnd() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function brickTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#c8775a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 24) {
      ctx.fillStyle = `rgba(${120 + rnd() * 60},${50 + rnd() * 30},${30 + rnd() * 20},0.35)`;
      ctx.fillRect(x + ((y / 8) % 2) * 12, y, 22, 6);
    }
    // ventanas y balcones verdes
    for (let fl = 0; fl < 4; fl++) {
      const y = 40 + fl * 118;
      ctx.fillStyle = '#7fa889'; ctx.fillRect(0, y + 70, w, 16);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#2b3b40'; ctx.fillRect(18 + i * 82, y, 56, 62);
        ctx.fillStyle = 'rgba(180,215,235,.35)'; ctx.fillRect(20 + i * 82, y + 2, 24, 58);
      }
    }
  });
}

function tree(scale = 1) {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.9, 10), bark);
  trunk.position.y = 0.95; trunk.rotation.z = (rnd() - 0.5) * 0.12;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.IcosahedronGeometry(0.55 + rnd() * 0.35, 2);
    const p = geo.attributes.position, col = [];
    const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      v.multiplyScalar(1 + (Math.sin(v.x * 9 + i) * Math.cos(v.z * 7) * 0.12));
      p.setXYZ(k, v.x, v.y * 0.8, v.z);
      const s = 0.75 + (v.y + 0.6) * 0.35 + rnd() * 0.1;
      col.push(0.28 * s, 0.55 * s, 0.17 * s);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, leafMat);
    const a = (i / 7) * Math.PI * 2;
    m.position.set(i ? Math.cos(a) * 0.6 : 0, 2.1 + (i ? rnd() * 0.5 : 0.6), i ? Math.sin(a) * 0.6 : 0);
    g.add(m);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function hedge(len, flowers = true) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f7f2a, roughness: 0.9, flatShading: true });
  const n = Math.ceil(len / 0.5);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36 + rnd() * 0.1, 1), mat);
    b.scale.y = 0.8; b.position.set(-len / 2 + i * 0.5, 0.3, (rnd() - 0.5) * 0.15);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }
  if (flowers) {
    const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe0352b, roughness: 0.6 }), n * 6);
    const d = new THREE.Object3D();
    for (let i = 0; i < n * 6; i++) {
      d.position.set(-len / 2 + rnd() * len, 0.45 + rnd() * 0.18, (rnd() - 0.5) * 0.5 + 0.12);
      d.updateMatrix(); fm.setMatrixAt(i, d.matrix);
    }
    g.add(fm);
  }
  return g;
}

// Campus completo. opts.extent controla el tamaño (diapositiva 2 es más ancha).
export function makeCampus({ extent = 1, trees = [] } = {}) {
  seed = 7;
  const g = new THREE.Group();
  const pav = paverTex();
  pav.repeat.set(10 * extent, 10);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40 * extent, 40), new THREE.MeshStandardMaterial({ map: pav, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  g.add(ground);
  const gr = grassTex();
  gr.repeat.set(8 * extent, 2);
  const lawnMat = new THREE.MeshStandardMaterial({ map: gr, roughness: 1 });
  for (const z of [-7, 9]) {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(40 * extent, 6), lawnMat);
    lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0.006, z); lawn.receiveShadow = true;
    g.add(lawn);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(40 * extent, 0.12, 0.18), new THREE.MeshStandardMaterial({ color: 0xc9c7c1, roughness: 0.9 }));
    curb.position.set(0, 0.06, z + (z < 0 ? 3 : -3)); curb.receiveShadow = true;
    g.add(curb);
  }
  // setos con flores detrás
  for (let x = -18 * extent; x < 18 * extent; x += 5.5) {
    const h = hedge(3.2);
    h.position.set(x + rnd(), 0, -4.6 - rnd() * 0.4);
    g.add(h);
  }
  // árboles
  const tpos = trees.length ? trees : [[-7.5, -6.5], [-3.8, -8.5], [5, -7.8], [9, -6.3], [-11, -9], [13, -9.5]];
  for (const [x, z, s] of tpos) {
    const t = tree(s || 1 + rnd() * 0.4);
    t.position.set(x, 0, z);
    g.add(t);
  }
  // edificio de ladrillo con balcones verdes (al fondo)
  const bt = brickTex();
  bt.wrapS = THREE.RepeatWrapping; bt.repeat.set(4 * extent, 1);
  const bld = new THREE.Mesh(new THREE.BoxGeometry(34 * extent, 7, 3), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 }));
  bld.position.set(0, 3.5, -16);
  g.add(bld);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(34.4 * extent, 0.3, 3.4), new THREE.MeshStandardMaterial({ color: 0xb06a50 }));
  roof.position.set(0, 7.1, -16);
  g.add(roof);
  return mergeStatic(g);
}

// Fusiona todas las mallas estáticas que comparten material → pocas llamadas de dibujo
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  const keep = [];
  root.traverse((o) => {
    if (o.isInstancedMesh) { keep.push(o); return; }
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
    geo.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] });
    byMat.get(key).geos.push(geo);
  });
  const out = new THREE.Group();
  for (const { mat, geos } of byMat.values()) {
    const sig = (g) => Object.keys(g.attributes).sort().join(',');
    const groups = new Map();
    geos.forEach((g) => { const k = sig(g); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g); });
    for (const list of groups.values()) {
      const m = new THREE.Mesh(mergeGeometries(list, false), mat);
      m.castShadow = m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      out.add(m);
    }
  }
  keep.forEach((k) => { k.updateMatrixWorld(true); k.matrix.copy(k.matrixWorld); k.matrixAutoUpdate = false; out.add(k); });
  return out;
}

export function setupSky(scene) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xdde9ef, 24, 52);
  scene.environmentIntensity = 0.55;
}
