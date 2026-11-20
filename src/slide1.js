// =====================================================================
// Diapositiva 1 · EcoAccess en acción
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { View, addLights, shadowFloor, canvasTex, redraw, rr, wrap, drawQR, C, FONT, FONT_B, state, damp } from './util.js';
import { makePhone, makeWaste } from './models.js';
import { makeEco, drawEcoFace } from './eco.js';
import { makeStudent } from './student.js';
import { makeStation } from './station.js';
import { makeCampus, setupSky } from './env.js';
import { BINS, WASTES, FLOW } from './content.js';

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------------
// Pantalla del teléfono (interfaz web EcoAccess)
// ---------------------------------------------------------------------
function drawPhone(ctx, w, h, s) {
  ctx.fillStyle = '#F3F6F2'; ctx.fillRect(0, 0, w, h);
  // barra de estado
  ctx.fillStyle = '#1D2320'; ctx.font = `600 26px ${FONT_B}`; ctx.textBaseline = 'middle';
  ctx.fillText('9:41', 40, 42);
  ctx.textAlign = 'right'; ctx.fillText('5G ▮▮▮', w - 40, 42); ctx.textAlign = 'left';
  // encabezado web
  ctx.fillStyle = '#0E3B20'; ctx.fillRect(0, 76, w, 120);
  ctx.fillStyle = '#fff'; ctx.font = `800 46px ${FONT}`; ctx.fillText('Eco', 40, 136);
  const ew = ctx.measureText('Eco').width; ctx.fillStyle = '#8FD16A'; ctx.fillText('Access', 40 + ew, 136);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `500 22px ${FONT_B}`; ctx.textAlign = 'right';
  ctx.fillText('Estación EA-01', w - 40, 136); ctx.textAlign = 'left';

  if (s.mode === 'home' || s.mode === 'scan') {
    // visor de cámara
    const vx = 50, vy = 250, vw = w - 100, vh = 640;
    ctx.fillStyle = '#16211B'; rr(ctx, vx, vy, vw, vh, 36); ctx.fill();
    const qs = 300, qx = w / 2 - qs / 2, qy = vy + 150;
    if (s.mode === 'scan') {
      ctx.globalAlpha = 0.95; drawQR(ctx, qx, qy, qs); ctx.globalAlpha = 1;
      const ly = qy - 20 + (qs + 40) * s.p;
      const g = ctx.createLinearGradient(0, ly - 40, 0, ly);
      g.addColorStop(0, 'rgba(110,230,120,0)'); g.addColorStop(1, 'rgba(110,230,120,.75)');
      ctx.fillStyle = g; ctx.fillRect(qx - 30, ly - 40, qs + 60, 40);
      ctx.fillStyle = '#8CF29A'; ctx.fillRect(qx - 30, ly - 3, qs + 60, 6);
    }
    ctx.strokeStyle = '#8CF29A'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    const L = 56, o = 34;
    [[qx - o, qy - o, 1, 1], [qx + qs + o, qy - o, -1, 1], [qx - o, qy + qs + o, 1, -1], [qx + qs + o, qy + qs + o, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
    });
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 34px ${FONT}`;
    ctx.fillText(s.mode === 'scan' ? (s.p > 0.95 ? 'QR reconocido ✓' : 'Escaneando…') : 'Apunta al QR', w / 2, vy + vh - 60);
    ctx.fillStyle = '#1D2320'; ctx.font = `800 44px ${FONT}`;
    ctx.fillText('Escanea el QR', w / 2, 980);
    ctx.font = `500 30px ${FONT_B}`; ctx.fillStyle = '#4C5A53';
    ctx.fillText('de la estación para hablar con ECO', w / 2, 1030);
    ctx.fillText('No necesitas instalar ninguna app', w / 2, 1076);
    ctx.textAlign = 'left';
    return;
  }

  // modo chat con ECO
  ctx.fillStyle = '#E6EEE6'; ctx.fillRect(0, 196, w, 96);
  ctx.fillStyle = '#2F8A3C'; ctx.beginPath(); ctx.arc(80, 244, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `800 24px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('ECO', 80, 245);
  ctx.textAlign = 'left'; ctx.fillStyle = '#1D2320'; ctx.font = `700 30px ${FONT}`; ctx.fillText('ECO · asistente', 128, 232);
  ctx.fillStyle = '#4C5A53'; ctx.font = `500 22px ${FONT_B}`; ctx.fillText('Interfaz web · en línea', 128, 266);

  let y = 320;
  for (const m of s.msgs) {
    ctx.font = `500 29px ${FONT_B}`;
    if (m.kind === 'result') {
      const bin = BINS.find((b) => b.key === m.bin);
      const bh = 250;
      ctx.fillStyle = '#fff'; rr(ctx, 36, y, w - 72, bh, 26); ctx.fill();
      ctx.fillStyle = bin.css; rr(ctx, 56, y + 20, 140, bh - 40, 18); ctx.fill();
      if (bin.key === 'blanca') { ctx.strokeStyle = '#B9C4B8'; ctx.lineWidth = 4; rr(ctx, 56, y + 20, 140, bh - 40, 18); ctx.stroke(); }
      ctx.fillStyle = '#1D2320'; ctx.font = `600 22px ${FONT_B}`; ctx.fillText('DESTINO RECOMENDADO', 220, y + 52);
      ctx.font = `800 40px ${FONT}`; ctx.fillText('Caneca ' + bin.key.toUpperCase(), 220, y + 100);
      ctx.font = `500 25px ${FONT_B}`; ctx.fillStyle = '#4C5A53';
      wrap(ctx, bin.cat, 220, y + 140, w - 280, 30, 2);
      ctx.fillStyle = '#2F8A3C'; ctx.font = `600 22px ${FONT_B}`; ctx.fillText('✓ Interacción registrada (demo)', 220, y + 210);
      y += bh + 22; continue;
    }
    if (m.kind === 'photo') {
      const pw = 250, ph = 190, px = w - 36 - pw;
      ctx.fillStyle = '#2F8A3C'; rr(ctx, px, y, pw, ph + 60, 26); ctx.fill();
      ctx.fillStyle = '#16211B'; rr(ctx, px + 14, y + 14, pw - 28, ph - 20, 16); ctx.fill();
      ctx.fillStyle = '#8CF29A'; ctx.font = `600 64px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(m.icon || '◎', px + pw / 2, y + ph / 2 + 4);
      ctx.fillStyle = '#fff'; ctx.font = `600 24px ${FONT_B}`; ctx.fillText(m.text, px + pw / 2, y + ph + 26);
      ctx.textAlign = 'left'; y += ph + 82; continue;
    }
    const mine = m.from === 'user';
    const maxW = w - 170;
    const lines = [];
    let line = '';
    for (const word of m.text.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW - 48 && line) { lines.push(line); line = word; } else line = t;
    }
    lines.push(line);
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 48);
    const bh = lines.length * 38 + 30;
    const bx = mine ? w - 36 - bw : 36;
    ctx.fillStyle = mine ? '#2F8A3C' : m.warn ? '#FFF3D6' : '#FFFFFF';
    rr(ctx, bx, y, bw, bh, 26); ctx.fill();
    if (m.warn) { ctx.strokeStyle = '#E3A21A'; ctx.lineWidth = 4; rr(ctx, bx, y, bw, bh, 26); ctx.stroke(); }
    ctx.fillStyle = mine ? '#fff' : '#1D2320';
    lines.forEach((l, i) => ctx.fillText(l, bx + 24, y + 36 + i * 38));
    y += bh + 18;
  }
  if (s.typing) {
    ctx.fillStyle = '#fff'; rr(ctx, 36, y, 130, 60, 26); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(47,138,60,${0.4 + 0.6 * ((Math.floor(performance.now() / 250) + i) % 3 === 0)})`; ctx.beginPath(); ctx.arc(72 + i * 28, y + 30, 9, 0, 7); ctx.fill(); }
  }
  // pie: entrada + canal Telegram (existente)
  ctx.fillStyle = '#fff'; rr(ctx, 30, h - 150, w - 60, 70, 35); ctx.fill();
  ctx.fillStyle = '#8A968F'; ctx.font = `500 26px ${FONT_B}`; ctx.fillText('Describe o fotografía tu residuo', 64, h - 114);
  ctx.fillStyle = '#4C5A53'; ctx.font = `500 21px ${FONT_B}`; ctx.textAlign = 'center';
  ctx.fillText('Canal existente: también vía bot de Telegram', w / 2, h - 46);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------
// Tablet de ECO (consulta del catálogo)
// ---------------------------------------------------------------------
const CATALOG_ROWS = ['Botella PET', 'Cáscara de fruta', 'Servilleta usada', 'Lata de aluminio', 'Papel limpio', 'Vaso desechable', 'Restos de comida', 'Cartón seco'];
function drawTablet(ctx, w, h, s) {
  ctx.fillStyle = '#0F1A14'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8CF29A'; ctx.font = `800 40px ${FONT}`; ctx.fillText('ECO', 34, 62);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `600 26px ${FONT_B}`; ctx.fillText('Catálogo verificado', 134, 60);
  if (s.mode === 'idle') {
    ctx.fillStyle = '#fff'; ctx.font = `700 44px ${FONT}`; ctx.fillText('¿Qué residuo tienes?', 34, 170);
    BINS.forEach((b, i) => {
      ctx.fillStyle = b.css; rr(ctx, 34 + i * 214, 230, 196, 150, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; rr(ctx, 34 + i * 214, 230, 196, 150, 20); ctx.stroke();
      ctx.fillStyle = b.text; ctx.font = `800 32px ${FONT}`; ctx.fillText(b.key.toUpperCase(), 54 + i * 214, 290);
      ctx.font = `500 21px ${FONT_B}`; wrap(ctx, b.cat, 54 + i * 214, 326, 160, 26, 2);
    });
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `500 24px ${FONT_B}`; ctx.fillText('Meta del MVP: ≥ 30 residuos verificados', 34, 450);
    return;
  }
  // buscador
  ctx.fillStyle = '#1E2B23'; rr(ctx, 30, 92, w - 60, 70, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `600 32px ${FONT_B}`;
  const q = s.query.slice(0, Math.ceil(s.query.length * Math.min(1, s.p * 1.6)));
  ctx.fillText('⌕  ' + q + (s.p < 0.6 && Math.floor(performance.now() / 300) % 2 ? '|' : ''), 52, 138);
  if (s.mode === 'search') {
    const scroll = s.p * 3;
    for (let i = 0; i < 6; i++) {
      const row = CATALOG_ROWS[(i + Math.floor(scroll)) % CATALOG_ROWS.length];
      const y = 190 + i * 50;
      ctx.fillStyle = i === 1 ? 'rgba(140,242,154,.18)' : 'rgba(255,255,255,.04)'; ctx.fillRect(30, y, w - 60, 44);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `500 26px ${FONT_B}`; ctx.fillText(row, 48, y + 31);
    }
    return;
  }
  if (s.mode === 'result') {
    const b = BINS.find((x) => x.key === s.bin);
    ctx.fillStyle = b.css; rr(ctx, 30, 186, w - 60, 280, 24); ctx.fill();
    ctx.fillStyle = b.text; ctx.font = `600 26px ${FONT_B}`; ctx.fillText('COINCIDENCIA VERIFICADA', 60, 236);
    ctx.font = `800 64px ${FONT}`; ctx.fillText('Caneca ' + b.key.toUpperCase(), 60, 318);
    ctx.font = `500 28px ${FONT_B}`; wrap(ctx, s.match, 60, 372, w - 120, 34, 2);
    return;
  }
  // desconocido
  ctx.fillStyle = '#3A2E0F'; rr(ctx, 30, 186, w - 60, 280, 24); ctx.fill();
  ctx.strokeStyle = '#E3A21A'; ctx.lineWidth = 5; rr(ctx, 30, 186, w - 60, 280, 24); ctx.stroke();
  ctx.fillStyle = '#FFD27A'; ctx.font = `600 26px ${FONT_B}`; ctx.fillText('SIN COINCIDENCIA VERIFICADA', 60, 236);
  ctx.font = `800 52px ${FONT}`; ctx.fillText('Pedir aclaración', 60, 312);
  ctx.fillStyle = '#fff'; ctx.font = `500 28px ${FONT_B}`; wrap(ctx, 'No recomiendo ninguna caneca hasta saber qué es.', 60, 366, w - 120, 34, 2);
}

// ---------------------------------------------------------------------
export class Slide1 {
  constructor(root, arch) {
    this.root = root;
    this.arch = arch;
    const el = root.querySelector('#c1');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0.2, 3.2, 12.4);
    this.view = new View(el, { camera: this.camera, scene: this.scene, exposure: 0.82, bloom: true, outdoor: true });
    this.view.offset = [0.15, 0.045];
    this.view.resize();
    addLights(this.scene, { key: 3.0, fill: 0.5, shadowSize: 7 });
    setupSky(this.scene);
    this.scene.add(makeCampus({ extent: 1 }));
    this.station = makeStation();
    this.station.position.set(2.15, 0, -0.4);
    this.station.rotation.y = -0.22;
    this.scene.add(this.station);
    this.bins = this.station.userData.bins;

    this.eco = makeEco();
    this.eco.position.set(-0.55, 0, 0.75);
    this.eco.scale.setScalar(1.25);
    this.eco.rotation.y = 0.12;
    this.scene.add(this.eco);
    this.ecoU = this.eco.userData;
    this.armPose = { look: 0, yaw: 0 };
    this.pose = 'idle';

    this.phone = makePhone();
    this.phone.position.set(-3.25, 2.05, 0.45);
    this.phone.scale.setScalar(1.15);
    this.phone.rotation.set(-0.06, 0.3, 0.03);
    this.scene.add(this.phone);
    this.phoneTex = this.phone.userData.screenTex;
    this.phoneHome = this.phone.position.clone();

    // Estudiante 3D con su celular (el teléfono grande muestra su pantalla ampliada)
    this.student = makeStudent();
    this.student.scale.setScalar(1.3);
    this.student.position.set(-1.75, 0, 2.05);
    this.student.rotation.y = 0.45;
    this.scene.add(this.student);
    this.stU = this.student.userData;
    this.spose = 'idle';
    this.miniPhone = makePhone();
    this.miniPhone.scale.setScalar(0.12);
    this.miniPhone.position.set(0, 0.02, 0.02);
    this.miniPhone.traverse((o) => { if (o.material && o.material.map === this.miniPhone.userData.screenTex) o.material.map = this.phoneTex; });
    this.stU.handR.add(this.miniPhone);
    // línea punteada: celular del estudiante → pantalla ampliada
    this.callout = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: 0x2f8a3c, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.85 }));
    this.callout.frustumCulled = false;
    this.scene.add(this.callout);
    this.ps = { mode: 'home', p: 0, msgs: [], typing: false };
    this.ts = { mode: 'idle', query: '', p: 0 };

    this.itemHome = new THREE.Vector3(-1.6, 0.52, 2.15);
    this.items = {};
    for (const k of Object.keys(WASTES)) {
      const it = makeWaste(k);
      it.visible = false;
      it.position.copy(this.itemHome);
      this.scene.add(it);
      this.items[k] = it;
    }
    // anillo ámbar para el residuo desconocido
    this.warnRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: 0xe3a21a, transparent: true, opacity: 0 }));
    this.warnRing.rotation.x = Math.PI / 2;
    this.warnRing.position.set(-1.6, 0.56, 2.15);
    this.scene.add(this.warnRing);

    // haz de escaneo (teléfono → QR)
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.18, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8cf29a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.beam);
    // paquetes de datos
    this.packets = [];
    this.packetMat = new THREE.MeshBasicMaterial({ color: 0x8cf29a });
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), this.packetMat);
      p.visible = false;
      this.scene.add(p);
      this.packets.push(p);
    }
    this.packetFlow = null;

    // controles
    this.controls = new OrbitControls(this.camera, this.view.renderer.domElement);
    this.controls.target.set(-0.05, 1.25, 0.2);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.2; this.controls.maxDistance = 15;
    this.controls.minAzimuthAngle = -0.75; this.controls.maxAzimuthAngle = 0.75;
    this.controls.minPolarAngle = 0.95; this.controls.maxPolarAngle = 1.5;
    this.controls.rotateSpeed = 0.6;
    this.controls.update();
    this.home = { pos: this.camera.position.clone(), target: this.controls.target.clone() };

    this.raycaster = new THREE.Raycaster();
    this.initPicking();
    this.buildOverlays();
    this.redrawPhone(); this.redrawTablet(); this.setMood('idle');
    this.guided = true;
    this.tl = null;
    this.current = null;
    this.logN = 0;
    this.t = 0;
    this.blinkT = 0;
  }

  // ----- overlays HTML -----
  buildOverlays() {
    const flow = this.root.querySelector('#flow');
    flow.innerHTML = FLOW.map((f, i) => `<li data-k="${f.k}"><span class="n">${i + 1}</span><b>${f.t}</b><small>${f.d}</small></li>`).join('');
    this.flowEls = [...flow.children];
    const tags = this.root.querySelector('#tags1');
    this.tagDefs = [
      ...this.bins.map((b) => ({ obj: b, off: new THREE.Vector3(0, -0.02, 0.75), html: `<i style="background:${b.userData.def.css}"></i>${b.userData.def.key.toUpperCase()}<small>${b.userData.def.cat}</small>`, cls: 'bin-tag' })),
    ];
    this.tagDefs.forEach((d) => {
      const e = document.createElement('div');
      e.className = d.cls; e.innerHTML = d.html;
      tags.appendChild(e); d.el = e;
    });
    this.capEl = this.root.querySelector('#cap1');
    this.demoChip = this.root.querySelector('#demoChip');
    this.logEl = this.root.querySelector('#log1');
  }

  initPicking() {
    const dom = this.view.renderer.domElement;
    const lids = this.bins.map((b) => b);
    let downAt = null;
    dom.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
    dom.addEventListener('pointerup', (e) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
      this.raycaster.setFromCamera(this.view.pointer(e), this.camera);
      const hit = this.raycaster.intersectObjects(lids, true)[0];
      if (hit) {
        let o = hit.object; while (o && !o.userData.def) o = o.parent;
        if (o) this.toggleLid(o);
        return;
      }
      const ecoHit = this.raycaster.intersectObject(this.eco, true)[0];
      if (ecoHit) this.ecoWave();
    });
    dom.addEventListener('pointermove', (e) => {
      this.raycaster.setFromCamera(this.view.pointer(e), this.camera);
      const h = this.raycaster.intersectObjects([...lids, this.eco], true).length > 0;
      dom.style.cursor = h ? 'pointer' : 'grab';
    });
  }

  toggleLid(bin) {
    if (this.tl && this.tl.isActive()) return;
    const u = bin.userData;
    const open = u.lid.rotation.x > -0.5;
    gsap.to(u.lid.rotation, { x: open ? -1.9 : 0, duration: state.reduced ? 0.01 : 0.9, ease: open ? 'back.out(1.4)' : 'bounce.out' });
    this.caption(open ? `Tapa de la caneca ${u.def.key} abierta` : `Tapa de la caneca ${u.def.key} cerrada`, 'Interacción manual del modelo 3D (clic de nuevo para cerrar).');
  }

  ecoWave() {
    if (this.tl && this.tl.isActive()) return;
    this.setMood('happy');
    const tl = gsap.timeline();
    ['wave1', 'wave2', 'wave1', 'wave2', 'wave1'].forEach((p, i) => tl.call(() => (this.pose = p), null, i * 0.35));
    tl.call(() => { this.pose = 'thumbsUp'; }, null, 1.9);
    tl.call(() => { this.pose = 'idle'; this.setMood('idle'); }, null, 3.2);
  }

  caption(title, text) {
    this.capEl.innerHTML = `<b>${title}</b><span>${text}</span>`;
  }

  setStep(k, status = 'active') {
    const idx = FLOW.findIndex((f) => f.k === k);
    this.flowEls.forEach((el, i) => {
      el.classList.toggle('active', i === idx && status === 'active');
      el.classList.toggle('done', i < idx || (i === idx && status === 'done'));
      if (status === 'reset') el.classList.remove('done', 'skip');
    });
    if (status === 'skip') this.flowEls[idx].classList.add('skip');
    this.arch && this.arch.highlightStep(k);
  }

  setMood(m) {
    this.ecoU.mood = m;
    redraw(this.ecoU.faceTex, (ctx, w, h) => drawEcoFace(ctx, w, h, m, 0, this.armPose.look));
  }
  // Las pantallas se marcan como «sucias» y se redibujan como máximo ~16 veces por segundo (menos subidas de textura a la GPU)
  redrawPhone(now = false) { this._phoneDirty = true; if (now) this.flushScreens(true); }
  redrawTablet(now = false) { this._tabDirty = true; if (now) this.flushScreens(true); }
  flushScreens(force = false) {
    const t = performance.now();
    if (!force && t - (this._lastFlush || 0) < 60) return;
    this._lastFlush = t;
    if (this._phoneDirty) { this._phoneDirty = false; redraw(this.phoneTex, (ctx, w, h) => drawPhone(ctx, w, h, this.ps)); }
    if (this._tabDirty) { this._tabDirty = false; redraw(this.ecoU.tabTex, (ctx, w, h) => drawTablet(ctx, w, h, this.ts)); }
  }

  sendPackets(from, to, color = 0x8cf29a, dur = 1.1) {
    const mid = from.clone().lerp(to, 0.5); mid.y += 1.0;
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
    this.packetMat.color.setHex(color);
    this.packetFlow = { curve, t0: this.t, dur };
  }

  worldOf(obj, local) { return obj.localToWorld(local.clone()); }

  resetScene() {
    Object.values(this.items).forEach((it) => { it.visible = false; this.stU.handL.add(it); it.position.set(0, -0.08, 0.07); it.scale.setScalar(0.8); it.rotation.set(0, 0, 0); });
    this.spose = 'idle';
    this.bins.forEach((b) => { b.userData.lid.rotation.x = 0; b.userData.led.emissiveIntensity = 0; b.userData.halo.material.opacity = 0; });
    this.warnRing.material.opacity = 0;
    this.beam.material.opacity = 0;
    this.station.userData.qrGlow.material.opacity = 0;
    this.packetFlow = null; this.packets.forEach((p) => (p.visible = false));
    Object.assign(this.ps, { mode: 'home', p: 0, msgs: [], typing: false }); this.redrawPhone();
    Object.assign(this.ts, { mode: 'idle', query: '', p: 0, bin: null, match: null }); this.redrawTablet();
    Object.assign(this.armPose, { look: 0, yaw: 0 });
    this.pose = 'idle';
    this.setMood('idle');
    this.flowEls.forEach((el) => el.classList.remove('active', 'done', 'skip'));
    this.demoChip.classList.remove('on');
    this.arch && this.arch.highlightStep(null);
  }

  // -----------------------------------------------------------------
  // Demostración paso a paso
  // -----------------------------------------------------------------
  run(kind) {
    if (this.tl) this.tl.kill();
    gsap.killTweensOf(this.bins.map((b) => b.userData.lid.rotation));
    const w = WASTES[kind];
    this.current = kind;
    this.root.querySelectorAll('[data-sim]').forEach((b) => b.classList.toggle('on', b.dataset.sim === kind));
    this.resetScene();
    const item = this.items[kind];
    const binIdx = w.bin ? BINS.findIndex((b) => b.key === w.bin) : -1;
    const bin = binIdx >= 0 ? this.bins[binIdx] : null;
    const ps = this.ps, ts = this.ts;
    const tl = gsap.timeline({ onUpdate: () => { /* redibujos continuos */ } });
    this.tl = tl;
    const phoneTop = () => this.worldOf(this.miniPhone, new THREE.Vector3(0, 0.85, 0));
    const tabletPos = () => this.worldOf(this.ecoU.tab, new THREE.Vector3(0, 0, 0.05));
    const qrPos = () => this.worldOf(this.station, this.station.userData.qrPos);

    // 1 · Estudiante
    tl.call(() => {
      this.resetScene();
      item.visible = true;
      this.setStep('estudiante');
      this.camTo('student');
      this.caption('1 · El estudiante llega con su residuo', `Trae ${w.nombre.toLowerCase()} y abre la cámara del celular.`);
    });
    tl.fromTo(item.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(2)' }, 0.05);
    tl.call(() => { this.spose = 'idle'; }, null, 0.05);
    tl.call(() => { this.spose = 'holdPhone'; }, null, 0.9);

    // 2 · QR
    tl.call(() => {
      this.setStep('qr');
      this.camTo('qr');
      this.caption('2 · Escanea el único QR de la estación', 'El código abre la interfaz web de EcoAccess, sin instalar aplicaciones.');
      ps.mode = 'scan'; ps.p = 0;
      this.pose = 'present';
      this.spose = 'scan';
    }, null, 1.4);
    tl.to(this.beam.material, { opacity: 0.4, duration: 0.3 }, 1.4);
    tl.to(this.station.userData.qrGlow.material, { opacity: 0.55, duration: 0.3, yoyo: true, repeat: 3 }, 1.4);
    tl.to(ps, { p: 1, duration: 1.4, ease: 'none', onUpdate: () => this.redrawPhone() }, 1.5);
    tl.to(this.beam.material, { opacity: 0, duration: 0.3 }, 3.0);
    tl.call(() => {
      ps.mode = 'chat';
      ps.msgs = [{ from: 'eco', text: 'Hola, soy ECO. ¿Qué residuo quieres consultar?' }];
      this.redrawPhone();
    }, null, 3.2);

    // 3 · ECO recibe
    tl.call(() => {
      this.pose = 'idle';
      this.spose = 'holdPhone';
      this.setStep('eco');
      this.camTo('eco');
      this.caption('3 · ECO recibe la consulta', `«${w.query}» viaja desde la interfaz web hasta el asistente.`);
      ps.msgs.push({ from: 'user', kind: 'photo', text: w.query, icon: kind === 'desconocido' ? '?' : '◎' });
      this.redrawPhone();
      this.setMood('happy');
      this.sendPackets(phoneTop(), tabletPos(), 0x8cf29a, 1.2);
    }, null, 3.7);
    tl.to(this.armPose, { yaw: -0.5, duration: 0.6, ease: 'sine.inOut' }, 3.7);

    // 4 · Catálogo
    tl.call(() => {
      this.setStep('catalogo');
      this.camTo('tablet');
      this.caption('4 · ECO consulta el catálogo verificado', 'Busca el residuo entre las fichas verificadas del MVP (meta inicial: ≥ 30).');
      ts.mode = 'search'; ts.query = w.query; ts.p = 0;
      this.setMood('think');
      ps.typing = true; this.redrawPhone();
    }, null, 5.1);
    tl.to(this.armPose, { yaw: 0, look: 0, duration: 0.5 }, 5.1);
    tl.to(ts, { p: 1, duration: 2.0, ease: 'none', onUpdate: () => this.redrawTablet() }, 5.2);

    // 5 · Clasificación
    tl.call(() => {
      this.setStep('clasif');
      this.camTo('eco', 1.1);
      ps.typing = false;
      if (w.bin) {
        ts.mode = 'result'; ts.bin = w.bin; ts.match = w.match;
        this.setMood('happy');
        this.caption(`5 · Clasificación: caneca ${w.bin.toUpperCase()}`, `${w.reason}.`);
        ps.msgs.push({ from: 'eco', text: w.advice });
      } else {
        ts.mode = 'unknown';
        this.setMood('question');
        this.caption('5 · Residuo desconocido: ECO pide aclaración', 'Sin coincidencia verificada no recomienda caneca. Abstenerse también es una respuesta correcta.');
        ps.msgs.push({ from: 'eco', text: w.advice, warn: true });
      }
      this.redrawTablet(); this.redrawPhone();
    }, null, 7.4);

    if (!bin) {
      tl.to(this.warnRing.material, { opacity: 1, duration: 0.4, yoyo: true, repeat: 5 }, 7.5);
      tl.to(this.warnRing.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.4, yoyo: true, repeat: 5 }, 7.5);
      tl.call(() => {
        this.setStep('caneca', 'skip');
        this.setStep('registro');
        this.camTo('wide');
        this.caption('7 · Se registra la consulta sin destino', 'La interacción queda como «abstención». No se abre ninguna tapa.');
        this.addLog(w, null);
        this.sendPackets(tabletPos(), tabletPos().add(new THREE.Vector3(1.4, -0.9, -1.2)), 0xe3a21a, 1.0);
      }, null, 9.8);
      tl.call(() => { this.flowEls.forEach((el) => el.classList.remove('active')); this.setStep('registro', 'done'); this.setMood('idle'); }, null, 11.6);
      return;
    }

    // 6 · Caneca correspondiente
    const binTop = () => this.worldOf(bin, new THREE.Vector3(0, 1.75, 0.15));
    const binIn = () => this.worldOf(bin, new THREE.Vector3(0, 0.9, 0.05));
    tl.call(() => {
      this.setStep('caneca');
      this.camTo('bins');
      this.caption(`6 · ECO señala la caneca ${w.bin.toUpperCase()}`, 'La apertura de la tapa es una representación demostrativa: no acredita hardware integrado ni validado.');
      this.demoChip.classList.add('on');
      bin.userData.led.emissiveIntensity = 2.2;
    }, null, 9.0);
    tl.call(() => { this.pose = 'point'; }, null, 9.0);
    tl.to(bin.userData.halo.material, { opacity: 0.9, duration: 0.5 }, 9.0);
    tl.to(bin.userData.lid.rotation, { x: -1.9, duration: 0.8, ease: 'back.out(1.3)' }, 9.4);
    // vuelo del residuo
    const fly = { t: 0 };
    tl.to(fly, {
      t: 1, duration: 1.5, ease: 'power1.inOut',
      onStart: () => { this.scene.attach(item); this.spose = 'point'; fly.a = item.position.clone(); fly.c = binTop(); fly.m = fly.a.clone().lerp(fly.c, 0.5); fly.m.y += 1.6; },
      onUpdate: () => {
        const a = fly.a || item.position, m = fly.m || a, c = fly.c || a, t = fly.t;
        const p = new THREE.Vector3().copy(a).multiplyScalar((1 - t) * (1 - t)).addScaledVector(m, 2 * (1 - t) * t).addScaledVector(c, t * t);
        item.position.copy(p);
        item.rotation.y = t * 6; item.rotation.z = Math.sin(t * 3) * 0.4;
      },
    }, 9.9);
    tl.to(item.position, { y: () => binIn().y, duration: 0.5, ease: 'power2.in' }, 11.4);
    tl.to(item.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 0.5 }, 11.4);
    tl.call(() => { item.visible = false; }, null, 11.9);
    tl.to(bin.userData.lid.rotation, { x: 0, duration: 0.7, ease: 'bounce.out' }, 12.0);
    tl.call(() => { this.pose = 'thumbsUp'; this.spose = 'idle'; }, null, 12.2);

    // 7 · Registro
    tl.call(() => {
      this.setStep('registro');
      this.camTo('wide', 1.8);
      this.caption('7 · Se registra la interacción', 'Consulta → clasificación → destino. Una consulta registrada no es un depósito confirmado.');
      this.addLog(w, w.bin);
      ps.msgs = [ps.msgs[0], ps.msgs[1], { kind: 'result', bin: w.bin }];
      this.redrawPhone();
      this.sendPackets(tabletPos(), tabletPos().add(new THREE.Vector3(1.4, -0.9, -1.2)), 0x8cf29a, 1.0);
    }, null, 12.5);
    tl.to(bin.userData.halo.material, { opacity: 0, duration: 0.8 }, 13.6);
    tl.call(() => {
      bin.userData.led.emissiveIntensity = 0;
      this.demoChip.classList.remove('on');
      this.setStep('registro', 'done');
      this.setMood('idle');
      this.pose = 'idle';
    }, null, 14.4);
  }

  addLog(w, bin) {
    this.logN++;
    const li = document.createElement('li');
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    li.innerHTML = `<span class="id">#${String(this.logN).padStart(3, '0')}</span><span>${hh}</span><b>${w.nombre}</b><span class="dest ${bin || 'none'}">${bin ? bin.toUpperCase() : 'ABSTENCIÓN'}</span>`;
    this.logEl.prepend(li);
    while (this.logEl.children.length > 3) this.logEl.lastChild.remove();
  }

  togglePause() {
    if (!this.tl) return false;
    this.tl.paused(!this.tl.paused());
    return this.tl.paused();
  }
  replay() {
    if (this.current) this.run(this.current); else this.run('pet');
  }
  resetView() {
    gsap.to(this.camera.position, { ...this.home.pos, duration: 0.8, ease: 'power2.inOut' });
    gsap.to(this.controls.target, { ...this.home.target, duration: 0.8, ease: 'power2.inOut' });
  }
  // Planos de cámara del recorrido guiado: cada paso lleva la mirada al objeto que se explica
  shotFor(name) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const w = (o, l) => this.worldOf(o, l);
    const eco = new THREE.Vector3(); this.eco.getWorldPosition(eco);
    switch (name) {
      case 'student': { const t = new THREE.Vector3(); this.student.getWorldPosition(t); t.x -= 0.5; t.y = 1.75; return { t, p: t.clone().add(V(1.4, 0.5, 5.6)) }; }
      case 'qr': { const q = w(this.station, this.station.userData.qrPos); const st = new THREE.Vector3(); this.student.getWorldPosition(st); const t = st.lerp(q, 0.5); t.y = 1.6; return { t, p: t.clone().add(V(0.0, 1.1, 10.6)) }; }
      case 'eco': { const t = eco.clone().add(V(0.15, 1.75, 0)); return { t, p: t.clone().add(V(0.7, 0.35, 4.6)) }; }
      case 'tablet': { const t = w(this.ecoU.tab, V(0, 0, 0)); t.y += 0.55; return { t, p: t.clone().add(V(0.6, 0.45, 4.0)) }; }
      case 'bins': { const t = w(this.station, V(-0.4, 1.0, 0.2)); t.x = (t.x + eco.x) / 2 + 0.6; t.y = 1.35; return { t, p: t.clone().add(V(-0.3, 1.3, 9.0)) }; }
      default: return { t: this.home.target.clone(), p: this.home.pos.clone() };
    }
  }
  camTo(name, dur = 1.5) {
    if (!this.guided && name !== 'wide') return;
    const { t, p } = this.shotFor(name);
    this.root.querySelector('#tags1').style.opacity = name === 'wide' || name === 'bins' ? '1' : '0';
    const d = state.reduced ? 0.01 : dur;
    gsap.to(this.controls.target, { x: t.x, y: t.y, z: t.z, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.camera.position, { x: p.x, y: p.y, z: p.z, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  }
  focusEco() {
    const p = new THREE.Vector3(); this.eco.getWorldPosition(p);
    const h = 1.6 * this.eco.scale.y;
    gsap.to(this.controls.target, { x: p.x + 0.35, y: p.y + h * 0.74, z: p.z, duration: state.reduced ? 0.01 : 1.1, ease: 'power3.inOut' });
    gsap.to(this.camera.position, { x: p.x + 0.9, y: p.y + h * 0.95, z: p.z + 4.2, duration: state.reduced ? 0.01 : 1.1, ease: 'power3.inOut', onComplete: () => this.ecoWave() });
    this.caption('Conoce a ECO', 'El asistente de EcoAccess: orienta, consulta el catálogo y te dice en qué caneca va tu residuo. Pulsa 0 para volver a la vista general.');
  }
  orbit(dTheta, zoom = 1) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta = THREE.MathUtils.clamp(sph.theta + dTheta, this.controls.minAzimuthAngle, this.controls.maxAzimuthAngle);
    sph.radius = THREE.MathUtils.clamp(sph.radius * zoom, this.controls.minDistance, this.controls.maxDistance);
    const to = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
    gsap.to(this.camera.position, { x: to.x, y: to.y, z: to.z, duration: 0.5, ease: 'power2.out' });
  }
  intro() {
    if (state.reduced) return;
    gsap.fromTo(this.camera.position, { x: -3.2, y: 4.6, z: 12.5 }, { ...this.home.pos, duration: 1.8, ease: 'power3.out' });
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const U = this.ecoU;
    U.update(dt, t, this.pose, state.reduced);
    const ap = this.armPose;
    U.headG.rotation.y = damp(U.headG.rotation.y, ap.yaw + (state.reduced ? 0 : Math.sin(t * 0.7) * 0.08), 6, dt);
    U.headG.rotation.z = U.mood === 'question' ? Math.sin(t * 2) * 0.12 : damp(U.headG.rotation.z, 0, 6, dt);
    // parpadeo
    this.blinkT -= dt;
    if (this.blinkT < 0 && (U.mood === 'idle' || U.mood === 'think')) {
      this.blinkT = 2.5 + Math.random() * 2;
      const m = U.mood; const tex = U.faceTex;
      redraw(tex, (ctx, w, h) => drawEcoFace(ctx, w, h, m, 0.9, ap.look));
      setTimeout(() => { if (U.mood === m) redraw(tex, (ctx, w, h) => drawEcoFace(ctx, w, h, m, 0, ap.look)); }, 120);
    }
    // residuo en reposo gira

    this.stU.update(dt, t, this.spose, state.reduced);
    // residuo en la mano izquierda del estudiante mientras no vuela
    // línea de la pantalla ampliada
    { const a = this.worldOf(this.miniPhone, new THREE.Vector3(0, 0, 0.1)); const b = this.worldOf(this.phone, new THREE.Vector3(0, -0.86, 0));
      const pos = this.callout.geometry.attributes.position; pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z); pos.needsUpdate = true; this.callout.computeLineDistances(); }
    if (this.warnRing.material.opacity > 0.001) { const it = this.items[this.current]; if (it) { it.getWorldPosition(this.warnRing.position); } }
    // indicador de escritura en el teléfono
    if (this.ps.typing && Math.floor(t * 4) !== this._lastType) { this._lastType = Math.floor(t * 4); this.redrawPhone(); }
    if (this.ts.mode === 'search' && this.ts.p < 1) this.redrawTablet();
    this.flushScreens();
    // haz phone → QR
    if (this.beam.material.opacity > 0.001) {
      const a = this.worldOf(this.miniPhone, new THREE.Vector3(0, 0.85, 0));
      const b = this.worldOf(this.station, this.station.userData.qrPos);
      const len = a.distanceTo(b);
      this.beam.position.copy(a).lerp(b, 0.5);
      this.beam.scale.set(1, len, 1);
      this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
    }
    // paquetes
    if (this.packetFlow) {
      const f = this.packetFlow;
      const k = (t - f.t0) / f.dur;
      this.packets.forEach((p, i) => {
        const u = k - i * 0.07;
        p.visible = u > 0 && u < 1;
        if (p.visible) { p.position.copy(f.curve.getPoint(u)); p.scale.setScalar(1 - i * 0.12); }
      });
      if (k > 1.5) { this.packetFlow = null; this.packets.forEach((p) => (p.visible = false)); }
    }
    this.controls.update();
    // etiquetas
    const v = new THREE.Vector3();
    const o = {};
    for (const d of this.tagDefs) {
      d.obj.getWorldPosition(v);
      if (d.obj === this.station) v.add(d.off.clone().applyQuaternion(d.obj.quaternion));
      else if (d.obj.parent === this.station) { this.station.localToWorld(v.copy(d.obj.position).add(d.off)); }
      else v.add(d.off);
      this.view.project(v, o);
      d.el.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, ${d.cls === 'bin-tag' ? '0' : '-100%'})`;
    }
  }
  render() { this.view.render(); }
}
