// =====================================================================
// Modelos 3D procedimentales (sin archivos externos)
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTex, redraw, rr, drawQR, C, FONT, FONT_B } from './util.js';
import { BINS } from './content.js';

const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const std = (o) => new THREE.MeshStandardMaterial(o);
const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

// ---------------------------------------------------------------------
// Caneca con tapa independiente
// ---------------------------------------------------------------------
function taper(geo, h, k = 0.1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h;
    const s = 1 - k + k * t;
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  geo.computeVertexNormals();
  return geo;
}

function binLabelTex(def) {
  return canvasTex(512, 400, (ctx, w, h) => {
    const dark = def.key === 'negra';
    const white = def.key === 'blanca';
    ctx.fillStyle = dark ? '#2A322E' : white ? '#FFFFFF' : '#3E9B4A';
    rr(ctx, 0, 0, w, h, 34); ctx.fill();
    ctx.strokeStyle = white ? '#C9D2C8' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 6; rr(ctx, 8, 8, w - 16, h - 16, 28); ctx.stroke();
    // ícono
    ctx.save(); ctx.translate(w / 2, 118);
    ctx.strokeStyle = def.text; ctx.fillStyle = def.text; ctx.lineWidth = 12; ctx.lineCap = 'round';
    if (def.key === 'verde') { // hoja
      ctx.beginPath(); ctx.moveTo(-50, 50); ctx.bezierCurveTo(-60, -40, 20, -70, 58, -62);
      ctx.bezierCurveTo(60, 10, 10, 60, -50, 50); ctx.fill();
      ctx.strokeStyle = '#3E9B4A'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, 40); ctx.lineTo(30, -36); ctx.stroke();
    } else if (def.key === 'blanca') { // flechas de reciclaje
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(i * 2.094);
        ctx.beginPath(); ctx.arc(0, 0, 54, -1.2, -0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(48, -40); ctx.lineTo(54, -8); ctx.lineTo(24, -16); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else { // bolsa / no aprovechable
      ctx.beginPath(); ctx.moveTo(-44, -20); ctx.lineTo(44, -20); ctx.lineTo(36, 60); ctx.lineTo(-36, 60); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-54, -36); ctx.lineTo(54, -36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, -48); ctx.lineTo(14, -48); ctx.stroke();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-10, 44); ctx.moveTo(14, -2); ctx.lineTo(10, 44); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = def.text; ctx.textAlign = 'center';
    ctx.font = `800 54px ${FONT}`; ctx.fillText(def.label[0], w / 2, 262);
    ctx.font = `700 40px ${FONT}`; ctx.fillText(def.label[1], w / 2, 314);
    ctx.font = `600 30px ${FONT_B}`; ctx.globalAlpha = 0.75;
    ctx.fillText('CANECA ' + def.key.toUpperCase(), w / 2, 366);
  });
}

export function makeBin(def) {
  const g = new THREE.Group();
  g.name = 'bin_' + def.key;
  const H = 1.15;
  const isWhite = def.key === 'blanca';
  const bodyMat = phys({ color: def.body, roughness: isWhite ? 0.42 : 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.2 });
  const body = new THREE.Mesh(taper(new RoundedBoxGeometry(0.86, H, 0.8, 6, 0.08), H, 0.1), bodyMat);
  body.position.y = H / 2 + 0.02;
  g.add(body);
  // ranuras verticales (relieve)
  const ribMat = phys({ color: def.rim, roughness: 0.5, clearcoat: 0.3 });
  for (const sx of [-1, 1]) {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.035, H * 0.78, 0.66, 2, 0.015), ribMat);
    rib.position.set(sx * 0.405, H * 0.47, 0);
    g.add(rib);
  }
  // borde superior
  const rim = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.07, 0.84, 3, 0.03), ribMat);
  rim.position.y = H + 0.02;
  g.add(rim);
  // tira LED de destino recomendado
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x9fe08a, emissive: 0x4cd964, emissiveIntensity: 0, roughness: 0.3 });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.022, 0.02), ledMat);
  led.position.set(0, H - 0.04, 0.405);
  g.add(led);
  // etiqueta frontal
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.5), new THREE.MeshStandardMaterial({ map: binLabelTex(def), roughness: 0.55, transparent: true }));
  label.position.set(0, 0.74, 0.392);
  label.rotation.x = 0.035;
  g.add(label);
  // pedal
  const metal = std({ color: 0x8d9893, metalness: 0.85, roughness: 0.3 });
  const pedal = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.05, 0.14, 2, 0.02), metal);
  pedal.position.set(0, 0.07, 0.43);
  g.add(pedal);
  // tapa con bisagra trasera (pivote)
  const pivot = new THREE.Group();
  pivot.position.set(0, H + 0.055, -0.41);
  const lidMat = phys({ color: def.body, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 });
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.1, 0.88, 4, 0.045), lidMat);
  lid.position.set(0, 0.05, 0.43);
  pivot.add(lid);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.05, 0.07, 2, 0.02), metal);
  handle.position.set(0, 0.04, 0.89);
  pivot.add(handle);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 16), metal);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.01, 0.0);
  pivot.add(hinge);
  // interior oscuro visible al abrir
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.7), std({ color: 0x0b0f0d, roughness: 1 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(0, H + 0.015, 0);
  g.add(inner);
  g.add(pivot);
  // halo de suelo
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 64), new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.012;
  g.add(halo);
  shadowAll(g);
  inner.castShadow = false;
  halo.castShadow = false;
  g.userData = { def, lid: pivot, led: ledMat, halo, open: 0, H };
  pivot.userData.binGroup = g;
  return g;
}

// ---------------------------------------------------------------------
// Estación de tres canecas con UN ÚNICO QR en el panel superior
// ---------------------------------------------------------------------
function panelTex() {
  return canvasTex(2048, 440, (ctx, w, h) => {
    const grd = ctx.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#163F26'); grd.addColorStop(1, '#0F2E1B');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6DB33F'; ctx.fillRect(0, h - 14, w, 14);
    // marca
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 104px ${FONT}`; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Eco', 80, 190);
    const ew = ctx.measureText('Eco').width;
    ctx.fillStyle = '#8FD16A'; ctx.fillText('Access', 80 + ew, 190);
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = `600 46px ${FONT_B}`;
    ctx.fillText('Estación EA-01 · UPC', 84, 262);
    ctx.font = `500 38px ${FONT_B}`; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('Valledupar, Cesar', 84, 318);
    // QR único (centro)
    const qs = 300, qx = w / 2 - qs / 2, qy = 56;
    ctx.fillStyle = '#FFFFFF'; rr(ctx, qx - 30, qy - 30, qs + 60, qs + 60, 26); ctx.fill();
    drawQR(ctx, qx, qy, qs);
    ctx.strokeStyle = '#6DB33F'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    const L = 46, o = 46;
    [[qx - o, qy - o, 1, 1], [qx + qs + o, qy - o, -1, 1], [qx - o, qy + qs + o, 1, -1], [qx + qs + o, qy + qs + o, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
    });
    // instrucciones
    ctx.textAlign = 'right'; ctx.fillStyle = '#FFFFFF'; ctx.font = `800 66px ${FONT}`;
    ctx.fillText('Escanea y consulta', w - 80, 170);
    ctx.font = `600 42px ${FONT_B}`; ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fillText('ECO te dice en qué caneca va', w - 80, 236);
    ctx.fillText('tu residuo · un solo QR', w - 80, 290);
  });
}

export function makeStation() {
  const g = new THREE.Group();
  g.name = 'station';
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.14, 1.3, 4, 0.05), phys({ color: 0xcfd8cf, roughness: 0.75 }));
  base.position.y = 0.07;
  g.add(base);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: 0x6db33f, emissive: 0x3c8a2c, emissiveIntensity: 0.5 }));
  trim.position.set(0, 0.1, 0.655);
  g.add(trim);
  const frameMat = phys({ color: 0x2a332f, roughness: 0.35, metalness: 0.4, clearcoat: 0.4 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.12, 2.5, 0.12, 3, 0.04), frameMat);
    post.position.set(sx * 1.66, 1.39, -0.52);
    g.add(post);
  }
  const back = new THREE.Mesh(new RoundedBoxGeometry(3.3, 1.2, 0.05, 2, 0.02), phys({ color: 0xe7ece6, roughness: 0.6 }));
  back.position.set(0, 0.76, -0.56);
  g.add(back);
  // panel superior compartido con el QR
  const panel = new THREE.Mesh(new RoundedBoxGeometry(3.44, 0.8, 0.12, 3, 0.05), frameMat);
  panel.position.set(0, 2.36, -0.5);
  g.add(panel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.71), new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.08 }));
  screen.position.set(0, 2.36, -0.437);
  g.add(screen);
  // marco del QR (para resaltar escaneo)
  const qrGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ color: 0x8fd16a, transparent: true, opacity: 0, depthWrite: false }));
  qrGlow.position.set(0, 2.41, -0.43);
  g.add(qrGlow);
  // caja del controlador (ESP32) detrás del panel: pendiente de validación
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.16, 2, 0.03), phys({ color: 0x39443f, roughness: 0.5 }));
  box.position.set(1.3, 1.68, -0.58);
  g.add(box);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe3a21a, emissive: 0xe3a21a, emissiveIntensity: 1.2 }));
  lamp.position.set(1.42, 1.72, -0.49);
  g.add(lamp);

  const bins = BINS.map((def, i) => {
    const b = makeBin(def);
    b.position.set((i - 1) * 1.08, 0.14, 0.02);
    g.add(b);
    return b;
  });
  shadowAll(g);
  screen.castShadow = false;
  qrGlow.castShadow = false;
  g.userData = { bins, qrGlow, qrPos: new THREE.Vector3(0, 2.41, -0.42) };
  return g;
}

// ---------------------------------------------------------------------
// ECO · asistente digital con tablet
// ---------------------------------------------------------------------
export function drawEcoFace(ctx, w, h, mood = 'idle', blink = 0, look = 0) {
  ctx.fillStyle = '#0F1A14'; ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(80,200,110,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8CF29A'; ctx.strokeStyle = '#8CF29A'; ctx.lineCap = 'round';
  ctx.shadowColor = '#5CFF7A'; ctx.shadowBlur = 24;
  const ex = 92 + look * 26, cy = h * 0.5;
  const eye = (x) => {
    if (mood === 'happy') { ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(x, cy + 14, 34, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); return; }
    if (mood === 'question') { ctx.font = `800 110px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, cy + 6); return; }
    const eh = 72 * (1 - blink) + 6;
    const ty = mood === 'think' ? -18 : 0;
    rr(ctx, x - 24, cy - eh / 2 + ty, 48, eh, 22); ctx.fill();
  };
  eye(w / 2 - ex); eye(w / 2 + ex);
  if (mood === 'think') {
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(w / 2 - 30 + i * 30, cy + 64, 8, 0, 7); ctx.fill(); }
  } else if (mood !== 'question') {
    ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(w / 2, cy + 34, 22, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  }
}

export function makeEco() {
  const root = new THREE.Group();
  root.name = 'eco';
  const shell = phys({ color: 0xf7faf6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const green = phys({ color: 0x2f8a3c, roughness: 0.35, clearcoat: 0.7 });
  const graphite = phys({ color: 0x252d29, roughness: 0.4, metalness: 0.3, clearcoat: 0.5 });

  const float = new THREE.Group();
  root.add(float);
  // cuerpo
  const prof = [[0, 0], [0.16, 0.015], [0.27, 0.09], [0.33, 0.24], [0.345, 0.4], [0.33, 0.58], [0.28, 0.74], [0.19, 0.85], [0.07, 0.9], [0, 0.905]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), shell);
  body.position.y = 0.42;
  float.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.338, 0.028, 16, 64), green);
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.42 + 0.36;
  float.add(belt);
  // insignia ECO
  const badgeTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2F8A3C'; rr(ctx, 6, 6, w - 12, h - 12, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 76px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ECO', w / 2, h / 2 + 4);
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true, roughness: 0.4 }));
  badge.position.set(0, 0.42 + 0.2, 0.322); badge.rotation.x = -0.12;
  float.add(badge);
  // anillo de propulsión
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8cf29a, emissive: 0x4cd964, emissiveIntensity: 1.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 12, 48), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.43;
  float.add(ring);
  // cabeza
  const headG = new THREE.Group();
  headG.position.y = 0.42 + 0.9 + 0.3;
  float.add(headG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.12, 24), graphite);
  neck.position.y = -0.3;
  headG.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 48, 32), shell);
  head.scale.set(1.08, 0.86, 0.96);
  headG.add(head);
  const faceTex = canvasTex(512, 256, (ctx, w, h) => drawEcoFace(ctx, w, h));
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.366, 48, 24, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.3, Math.PI * 0.4),
    new THREE.MeshStandardMaterial({ map: faceTex, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1 })
  );
  head.add(visor);
  // orejas
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 32), green);
    ear.rotation.z = Math.PI / 2; ear.position.set(sx * 0.39, 0, 0);
    headG.add(ear);
  }
  // antena con hoja
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), graphite);
  ant.position.set(0, 0.38, 0);
  headG.add(ant);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.bezierCurveTo(0.09, 0.03, 0.12, 0.12, 0.05, 0.2); leafShape.bezierCurveTo(-0.04, 0.14, -0.05, 0.05, 0, 0);
  const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(leafShape, { depth: 0.015, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }),
    phys({ color: 0x5fb83f, roughness: 0.4, clearcoat: 0.6 }));
  leaf.position.set(-0.01, 0.47, -0.01); leaf.rotation.z = -0.5;
  headG.add(leaf);
  // brazos
  const mkArm = (sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.35, 0.42 + 0.66, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 8, 16), shell);
    arm.position.y = -0.22;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), green);
    hand.position.y = -0.43;
    pivot.add(hand);
    float.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // tablet
  const tab = new THREE.Group();
  tab.position.set(0, 0.42 + 0.47, 0.44);
  tab.rotation.x = -0.18;
  const tframe = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.5, 0.035, 4, 0.03), graphite);
  tab.add(tframe);
  const tabTex = canvasTex(700, 500);
  const tscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.44), new THREE.MeshBasicMaterial({ map: tabTex, toneMapped: false }));
  tscreen.position.z = 0.019;
  tab.add(tscreen);
  float.add(tab);
  // sombra de contacto
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: 0x0b2a16, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.011;
  root.add(shadow);

  shadowAll(root);
  shadow.castShadow = false; visor.castShadow = false;
  root.userData = { float, headG, armL, armR, tab, faceTex, tabTex, ringMat, shadow, mood: 'idle' };
  return root;
}

// ---------------------------------------------------------------------
// Teléfono inteligente
// ---------------------------------------------------------------------
export function makePhone() {
  const g = new THREE.Group();
  g.name = 'phone';
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.84, 1.7, 0.09, 6, 0.11), phys({ color: 0x2b3430, metalness: 0.75, roughness: 0.28, clearcoat: 0.8 }));
  g.add(frame);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.66, 0.01, 4, 0.09), phys({ color: 0x050807, roughness: 0.08, clearcoat: 1 }));
  glass.position.z = 0.043;
  g.add(glass);
  const screenTex = canvasTex(600, 1260);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 1.555), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = 0.0492;
  g.add(screen);
  const isl = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.004, 2, 0.02), new THREE.MeshBasicMaterial({ color: 0x050807 }));
  isl.position.set(0, 0.72, 0.052);
  g.add(isl);
  // cámara trasera
  const camBlock = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.28, 0.03, 3, 0.06), phys({ color: 0x1f2623, roughness: 0.3, metalness: 0.5 }));
  camBlock.position.set(-0.2, 0.62, -0.055);
  g.add(camBlock);
  for (const [x, y] of [[-0.26, 0.68], [-0.14, 0.56]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), phys({ color: 0x0a0f0d, roughness: 0.05, clearcoat: 1 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(x, y, -0.075);
    g.add(lens);
  }
  for (const y of [0.35, 0.18]) {
    const btn = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.12, 0.03, 2, 0.008), frame.material);
    btn.position.set(0.43, y, 0); g.add(btn);
  }
  shadowAll(g);
  g.userData = { screenTex };
  return g;
}

// ---------------------------------------------------------------------
// Residuos de ejemplo
// ---------------------------------------------------------------------
export function makeWaste(kind) {
  const g = new THREE.Group();
  if (kind === 'pet') {
    const pts = [[0, 0], [0.085, 0], [0.1, 0.02], [0.105, 0.06], [0.095, 0.1], [0.105, 0.14], [0.105, 0.3], [0.1, 0.34], [0.07, 0.4], [0.035, 0.44], [0.032, 0.48]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const bottle = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), phys({ color: 0xcfeaf5, transmission: 0.9, thickness: 0.05, roughness: 0.06, ior: 1.45, transparent: true, opacity: 0.95 }));
    g.add(bottle);
    const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.1, 40, 1, true), std({ color: 0x2f8a3c, roughness: 0.5, side: THREE.DoubleSide }));
    lbl.position.y = 0.21; g.add(lbl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 24), std({ color: 0x1f6fd1, roughness: 0.4 }));
    cap.position.y = 0.5; g.add(cap);
    g.scale.setScalar(1.15);
  } else if (kind === 'banano') {
    const mat = phys({ color: 0xf2cf3a, roughness: 0.55, vertexColors: true, side: THREE.DoubleSide, clearcoat: 0.2 });
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.1, 20, 16, 0, Math.PI, 0, Math.PI);
      geo.scale(0.6, 2.6, 1);
      const p = geo.attributes.position, col = [];
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        const brown = y > 0.2 ? 0.55 : 0;
        col.push(0.95 - brown * 0.5, 0.8 - brown * 0.5, 0.25 - brown * 0.15);
        p.setY(k, y + 0.26);
        p.setZ(k, p.getZ(k) + Math.pow(Math.max(0, y), 2) * 0.9);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const petal = new THREE.Mesh(geo, mat);
      petal.rotation.y = (i / 4) * Math.PI * 2;
      petal.rotation.x = 0.5;
      const holder = new THREE.Group(); holder.rotation.y = (i / 4) * Math.PI * 2 + 0.3;
      petal.rotation.y = 0; holder.add(petal); g.add(holder);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 12), std({ color: 0x6b4f22, roughness: 0.8 }));
    stem.position.y = 0.04; g.add(stem);
    g.scale.setScalar(1.05);
  } else if (kind === 'servilleta') {
    const geo = new THREE.IcosahedronGeometry(0.16, 5);
    const p = geo.attributes.position, col = [];
    const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      const n = Math.sin(v.x * 37) * Math.cos(v.y * 41) * Math.sin(v.z * 29) * 0.045 + Math.sin(v.x * 13 + v.z * 9) * 0.02;
      v.multiplyScalar(1 + n / 0.16);
      v.y *= 0.8;
      p.setXYZ(k, v.x, v.y, v.z);
      const stain = Math.max(0, Math.sin(v.x * 18 + 1) * Math.cos(v.z * 14) - 0.35);
      col.push(0.96 - stain * 0.5, 0.94 - stain * 0.62, 0.88 - stain * 0.75);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, phys({ color: 0xffffff, vertexColors: true, roughness: 0.95, sheen: 0.5, flatShading: true })));
    g.children[0].position.y = 0.13;
  } else {
    const k = new THREE.Mesh(new THREE.TorusKnotGeometry(0.1, 0.035, 96, 12, 2, 3), phys({ color: 0x9aa39e, metalness: 0.8, roughness: 0.3 }));
    k.position.y = 0.16; g.add(k);
    const wire = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 48, 4.2), std({ color: 0xc8442e }));
    wire.position.y = 0.12; wire.rotation.x = 1.2; g.add(wire);
  }
  shadowAll(g);
  return g;
}

// ---------------------------------------------------------------------
// Íconos tecnológicos 3D (arquitectura y fases)
// ---------------------------------------------------------------------
const M = {
  white: () => phys({ color: 0xf7faf6, roughness: 0.3, clearcoat: 0.8 }),
  green: () => phys({ color: 0x2f8a3c, roughness: 0.35, clearcoat: 0.6 }),
  lime: () => phys({ color: 0x6db33f, roughness: 0.35, clearcoat: 0.6 }),
  graph: () => phys({ color: 0x2a332f, roughness: 0.4, metalness: 0.3, clearcoat: 0.4 }),
  amber: () => new THREE.MeshStandardMaterial({ color: 0xe3a21a, emissive: 0xe3a21a, emissiveIntensity: 0.6 }),
};

export function iconPerson(tint = 0x2f8a3c) {
  const g = new THREE.Group();
  const mat = phys({ color: tint, roughness: 0.35, clearcoat: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 8, 20), mat);
  body.position.y = 0.3; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), M.white());
  head.position.y = 0.66; g.add(head);
  return shadowAll(g);
}
export function iconPhone() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.62, 0.05, 3, 0.05), M.graph());
  b.position.y = 0.38; b.rotation.x = -0.2; g.add(b);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.54), new THREE.MeshStandardMaterial({ color: 0x6db33f, emissive: 0x2f8a3c, emissiveIntensity: 0.5 }));
  s.position.z = 0.027; b.add(s);
  return shadowAll(g);
}
export function iconPlane() {
  const sh = new THREE.Shape();
  sh.moveTo(-0.3, 0); sh.lineTo(0.32, 0.22); sh.lineTo(0.12, -0.26); sh.lineTo(0.02, -0.06); sh.lineTo(-0.3, 0);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }), phys({ color: 0x2aa3e0, roughness: 0.3, clearcoat: 0.7 }));
  m.position.y = 0.38; m.rotation.y = -0.4;
  const g = new THREE.Group(); g.add(m);
  return shadowAll(g);
}
export function iconWindow() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.44, 0.05, 3, 0.03), M.white());
  b.position.y = 0.36; g.add(b);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.055), M.graph());
  bar.position.set(0, 0.54, 0); g.add(bar);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.44 - i * 0.1, 0.035, 0.056), M.green());
    r.position.set(-0.04 - i * 0.05 + 0.04, 0.44 - i * 0.08, 0); g.add(r);
  }
  return shadowAll(g);
}
export function iconEcoHead() {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 20), M.white());
  h.scale.set(1.08, 0.86, 0.96); h.position.y = 0.36; g.add(h);
  const v = new THREE.Mesh(new THREE.SphereGeometry(0.245, 32, 16, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.32, Math.PI * 0.36), new THREE.MeshStandardMaterial({ color: 0x0f1a14, emissive: 0x2a8a3a, emissiveIntensity: 0.35, roughness: 0.2 }));
  h.add(v);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.04, 4, 8), new THREE.MeshBasicMaterial({ color: 0x8cf29a }));
    e.position.set(sx * 0.07, 0.37, 0.235); g.add(e);
  }
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8), M.lime());
  leaf.scale.set(0.6, 1.3, 0.3); leaf.position.set(0, 0.62, 0); leaf.rotation.z = -0.5; g.add(leaf);
  // fichas del catálogo
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.04, 0.12, 2, 0.015), i === 1 ? M.green() : M.white());
    c.position.set(0.36, 0.06 + i * 0.05, 0.1); g.add(c);
  }
  return shadowAll(g);
}
export function iconIA() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), phys({ color: 0x6db33f, roughness: 0.25, clearcoat: 1, flatShading: true }));
  core.position.y = 0.38; g.add(core);
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.29, 1), new THREE.MeshBasicMaterial({ color: 0x2a332f, wireframe: true, transparent: true, opacity: 0.5 }));
  cage.position.y = 0.38; g.add(cage);
  g.userData.spin = [core, cage];
  return shadowAll(g);
}
export function iconServer() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.14, 0.42, 3, 0.03), M.graph());
    s.position.y = 0.12 + i * 0.17; g.add(s);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.01), new THREE.MeshStandardMaterial({ color: 0x8cf29a, emissive: 0x4cd964, emissiveIntensity: 1 }));
    led.position.set(-0.14, 0.12 + i * 0.17, 0.212); g.add(led);
  }
  const tag = canvasTex(256, 128, (ctx, w, h) => { ctx.fillStyle = '#6DB33F'; ctx.font = `800 90px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C#', w / 2, h / 2 + 4); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ map: tag, transparent: true }));
  p.position.set(0.14, 0.46, 0.213); g.add(p);
  return shadowAll(g);
}
export function iconDB() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 40), i % 2 ? M.white() : phys({ color: 0xc8442e, roughness: 0.35, clearcoat: 0.6 }));
    c.position.y = 0.1 + i * 0.16; g.add(c);
  }
  return shadowAll(g);
}
export function iconChip() {
  const g = new THREE.Group();
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.05, 0.36, 2, 0.015), phys({ color: 0x1e3a6e, roughness: 0.5 }));
  pcb.position.y = 0.2; g.add(pcb);
  const shield = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.05, 0.2, 2, 0.01), std({ color: 0xbfc6c2, metalness: 0.9, roughness: 0.25 }));
  shield.position.set(0.08, 0.25, 0); g.add(shield);
  for (let i = 0; i < 10; i++) for (const z of [-0.16, 0.16]) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), std({ color: 0xd9b44a, metalness: 0.9, roughness: 0.3 }));
    pin.position.set(-0.25 + i * 0.055, 0.15, z); g.add(pin);
  }
  // mini canecas (negra, verde, blanca)
  [0x1d2320, 0x2f8a3c, 0xeef1ec].forEach((col, i) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.2, 0.13, 2, 0.02), phys({ color: col, roughness: 0.4, clearcoat: 0.5 }));
    b.position.set(-0.17 + i * 0.17, 0.35, -0.28); g.add(b);
  });
  return shadowAll(g);
}
export const ICONS = { person: iconPerson, phone: iconPhone, plane: iconPlane, window: iconWindow, eco: iconEcoHead, ia: iconIA, server: iconServer, db: iconDB, chip: iconChip };

export { redraw, M as MATS, phys, shadowAll };
