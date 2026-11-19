// =====================================================================
// Diapositiva 2 · Cómo construir y validar el MVP (infografía 3D)
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { View, addLights, shadowFloor, canvasTex, C, FONT, state } from './util.js';
import { makeCampus, setupSky } from './env.js';
import { makeEco, drawEcoFace } from './eco.js';
import { redraw } from './util.js';
import { ICONS, iconPerson, iconPhone, iconDB, iconServer, iconEcoHead, iconWindow, iconChip, phys, shadowAll } from './models.js';
import { PHASES, STATUS } from './content.js';

const ISL_X = [-9, -3, 3, 9];
const $ = (s, r = document) => r.querySelector(s);

function numberTex(n) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0E3B20'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 120, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 150px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), w / 2, h / 2 + 8);
  });
}

export class Slide2 {
  constructor(root) {
    this.root = root;
    const el = $('#c2', root);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.view = new View(el, { camera: this.camera, scene: this.scene, exposure: 0.82, bloom: true, outdoor: true });
    this.view.offset = [0, 0.035];
    this.view.resize();
    const L = addLights(this.scene, { key: 3.0, fill: 0.5, shadowSize: 14 });
    this.sun = L.sun;
    setupSky(this.scene);
    this.scene.add(makeCampus({ extent: 1.6, trees: [[-13, -6.5], [-6, -7.5], [0.5, -6.8], [6.5, -7.6], [12.5, -6.6], [-10, -9.5], [3.5, -9.8], [15, -9]] }));
    this.target = new THREE.Vector3();
    this.islands = [];
    this.labelsEl = $('#tags2', root);
    this.labels = [];
    ISL_X.forEach((x, i) => this.islands.push(this.makeIsland(i, x)));
    this.buildPhase1(this.islands[0]);
    this.buildPhase2(this.islands[1]);
    this.buildPhase3(this.islands[2]);
    this.buildPhase4(this.islands[3]);
    // camino que une las fases
    const path = new THREE.CatmullRomCurve3(ISL_X.map((x, i) => new THREE.Vector3(x, 0.02, i % 2 ? 0.6 : -0.6)));
    const road = new THREE.Mesh(new THREE.TubeGeometry(path, 200, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x6db33f, emissive: 0x2f8a3c, emissiveIntensity: 0.4 }));
    this.scene.add(road);
    this.roadCurve = path;
    this.runnerDots = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0x8cf29a })); this.scene.add(m); return m; });

    // ECO como guía que acompaña cada fase
    this.guide = makeEco();
    this.guide.scale.setScalar(1.0);
    this.guide.position.set(ISL_X[0] - 2.75, 0, 1.6);
    this.guide.rotation.y = 0.55;
    this.scene.add(this.guide);
    this.guidePose = 'present';
    redraw(this.guide.userData.faceTex, (ctx, w, h) => drawEcoFace(ctx, w, h, 'happy', 0, 0.3));
    this.raycaster = new THREE.Raycaster();
    this.initPicking();
    this.phase = 0;
    this.mode4 = 'meta';
    this.t = 0;
    this.focus(0, true);
  }

  makeIsland(i, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.6, 0.22, 96), phys({ color: 0xe9e7e0, roughness: 0.82, sheen: 0.2 }));
    const lawnTop = new THREE.Mesh(new THREE.CircleGeometry(2.38, 96), new THREE.MeshStandardMaterial({ color: 0x7fb24e, roughness: 0.95 }));
    lawnTop.rotation.x = -Math.PI / 2; lawnTop.position.y = 0.222; lawnTop.receiveShadow = true;
    g.add(lawnTop);
    base.position.y = 0.11; base.receiveShadow = base.castShadow = true;
    g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.46, 0.035, 10, 128), new THREE.MeshStandardMaterial({ color: 0x6db33f, emissive: 0x2f8a3c, emissiveIntensity: 0.3 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.22;
    g.add(rim);
    const num = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), new THREE.MeshBasicMaterial({ map: numberTex(i + 1), transparent: true }));
    num.position.set(-1.95, 0.6, 1.6); num.rotation.y = 0.35;
    g.add(num);
    this.scene.add(g);
    return { g, i, rim, pick: [], labels: [] };
  }

  label(isl, obj, off, html, cls = 'p-label') {
    const e = document.createElement('div');
    e.className = cls; e.innerHTML = html;
    this.labelsEl.appendChild(e);
    const L = { obj, off, el: e, isl: isl.i };
    this.labels.push(L);
    isl.labels.push(L);
    return L;
  }

  // ---------------- Fase 1 · Definir: zigurat del alcance ----------------
  buildPhase1(isl) {
    const P = PHASES[0];
    const cols = [0x3a4440, 0xe9eee8, 0x8fd16a, 0x2f8a3c];
    const radii = [2.05, 1.6, 1.15, 0.7];
    this.layers1 = P.layers.map((ly, k) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radii[k], radii[k] + 0.06, 0.34, 72), phys({ color: cols[k], roughness: 0.4, clearcoat: 0.6, emissive: 0x4cd964, emissiveIntensity: 0 }));
      m.position.y = 0.22 + 0.17 + k * 0.36;
      m.castShadow = m.receiveShadow = true;
      m.userData = { phase: 0, item: k };
      isl.g.add(m);
      isl.pick.push(m);
      this.label(isl, m, new THREE.Vector3(radii[k] + 0.05, 0.05, 0.35), `<b>${ly.t}</b>`, 'p-label side');
      return m;
    });
    // usuarios en el segundo nivel
    [[0x2f8a3c, -1.2], [0x7a8a80, 1.25], [0x30403a, -0.2]].forEach(([c, a]) => {
      const p = iconPerson(c); p.scale.setScalar(0.55);
      p.position.set(Math.cos(a) * 1.38, 0.22 + 0.36 * 2, Math.sin(a) * 1.38);
      isl.g.add(p);
    });
    // propuesta de valor: teléfono
    const ph = iconPhone(); ph.scale.setScalar(0.7); ph.position.set(-0.85, 0.22 + 0.36 * 3, 0.45); isl.g.add(ph);
    // núcleo: alcance mínimo
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), phys({ color: 0x8cf29a, roughness: 0.1, clearcoat: 1, transmission: 0.3, emissive: 0x2f8a3c, emissiveIntensity: 0.6, flatShading: true }));
    this.gem.position.y = 0.22 + 0.36 * 4 + 0.45;
    this.gem.castShadow = true;
    isl.g.add(this.gem);
    this.label(isl, this.gem, new THREE.Vector3(0.9, 0.2, 0), 'MVP<small>consultar · orientar · registrar</small>', 'p-label core');
  }

  // ---------------- Fase 2 · Integrar: pila de módulos ----------------
  buildPhase2(isl) {
    const g = new THREE.Group();
    g.scale.setScalar(1.15);
    g.position.set(-0.1, 0, -0.2);
    isl.g.add(g);
    this.stack2 = [];
    const add = (obj, y, labelHtml, off = new THREE.Vector3(1.0, 0.2, 0)) => {
      obj.position.y = y; g.add(obj); this.stack2.push(obj);
      obj.userData.baseY = y;
      if (labelHtml) this.label(isl, obj, off, labelHtml, 'p-label side');
      return obj;
    };
    // Oracle
    const db = iconDB(); db.scale.setScalar(1.6);
    add(db, 0.17, '<b>Oracle</b><small>persistencia</small>', new THREE.Vector3(1.25, 0.5, 0.3));
    // Backend C#
    const slab = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.22, 1.2, 3, 0.06), phys({ color: 0x2a332f, roughness: 0.4, metalness: 0.3, clearcoat: 0.5 }));
    const csTex = canvasTex(512, 96, (ctx, w, h) => { ctx.fillStyle = '#8FD16A'; ctx.font = `800 64px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillText('Backend C#', 20, h / 2 + 4); });
    const csLbl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshBasicMaterial({ map: csTex, transparent: true }));
    csLbl.position.set(-0.3, 0, 0.605); slab.add(csLbl);
    add(shadowAll(new THREE.Group().add(slab)), 1.05, '<b>Backend C#</b><small>lógica y reglas</small>', new THREE.Vector3(1.75, 0.15, 0.3));
    // Catálogo: 30 fichas
    const catBase = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.08, 1.2, 2, 0.03), phys({ color: 0xe9eee8, roughness: 0.5 }));
    const cat = new THREE.Group(); cat.add(catBase);
    this.cards = [];
    const cardGeo = new RoundedBoxGeometry(0.2, 0.08, 0.15, 2, 0.02);
    for (let i = 0; i < 30; i++) {
      const c = new THREE.Mesh(cardGeo, phys({ color: [0x1d2320, 0x2f8a3c, 0xf7faf6][i % 3], roughness: 0.35, clearcoat: 0.6 }));
      c.position.set(-0.65 + (i % 6) * 0.26, 0.08, -0.42 + Math.floor(i / 6) * 0.21);
      c.castShadow = true;
      cat.add(c); this.cards.push(c);
    }
    add(cat, 1.42, '<b>Catálogo inicial</b><small>≥ 30 residuos verificados (meta)</small>', new THREE.Vector3(1.85, 0.3, 0.3));
    // Interfaz + ECO + QR
    const top = new THREE.Group();
    const eco = iconEcoHead(); eco.scale.setScalar(1.25); eco.position.set(0.15, 0, 0); top.add(eco);
    const ph = iconPhone(); ph.scale.setScalar(1.0); ph.position.set(-0.6, 0, 0.1); top.add(ph);
    const qrTex = canvasTex(256, 256, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#1D2320'; for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) if (((r * 7 + c * 13) % 5) < 2 || (r < 3 && c < 3) || (r < 3 && c > 8) || (r > 8 && c < 3)) ctx.fillRect(16 + c * 19, 16 + r * 19, 19, 19); });
    const qr = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.04, 2, 0.02), [phys({ color: 0xffffff }), phys({ color: 0xffffff }), phys({ color: 0xffffff }), phys({ color: 0xffffff }), new THREE.MeshStandardMaterial({ map: qrTex }), phys({ color: 0xffffff })]);
    qr.position.set(0.75, 0.42, 0.1); qr.rotation.y = -0.3; top.add(qr);
    add(shadowAll(top), 1.62, '<b>QR · Interfaz web · ECO</b><small>entrada del ciudadano</small>', new THREE.Vector3(-1.55, 0.75, 0));
    // roles satélite
    const mkSat = (x, z, tint, html, extra) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 40), phys({ color: 0xffffff, roughness: 0.5 }));
      pad.position.set(x, 0.27, z); pad.receiveShadow = true; isl.g.add(pad);
      const p = iconPerson(tint); p.scale.setScalar(0.75); p.position.set(x, 0.32, z); isl.g.add(p);
      if (extra) { extra.position.set(x + 0.35, 0.32, z + 0.1); extra.scale.setScalar(0.45); isl.g.add(extra); }
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.9, z), new THREE.Vector3(x * 0.6, 1.4, z * 0.6), new THREE.Vector3(Math.sign(x) * 0.8, 1.2, 0)]);
      isl.g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0x6db33f, emissive: 0x2f8a3c, emissiveIntensity: 0.4 })));
      this.label(isl, p, new THREE.Vector3(0, -0.25, 0.55), html, 'p-label');
    };
    mkSat(-1.85, 1.0, 0x7a8a80, '<b>Operario</b><small>operación mínima</small>', iconWindow());
    mkSat(1.2, 1.55, 0x30403a, '<b>Supervisor</b><small>consulta básica</small>', iconWindow());
  }

  assemble2() {
    if (state.reduced) return;
    const tl = gsap.timeline();
    this.stack2.forEach((o, i) => {
      tl.fromTo(o.position, { y: o.userData.baseY + 2.5 }, { y: o.userData.baseY, duration: 0.6, ease: 'bounce.out' }, i * 0.28);
    });
    this.cards.forEach((c, i) => tl.fromTo(c.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(3)' }, 0.7 + i * 0.03));
  }

  // ---------------- Fase 3 · Probar: circuito de pruebas ----------------
  buildPhase3(isl) {
    const P = PHASES[2];
    const R = 1.55;
    const track = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 12, 128), phys({ color: 0x2a332f, roughness: 0.4, metalness: 0.3 }));
    track.rotation.x = Math.PI / 2; track.position.y = 0.3;
    isl.g.add(track);
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.4, 48), phys({ color: 0xe9eee8, roughness: 0.5 }));
    center.position.y = 0.42; center.castShadow = center.receiveShadow = true;
    isl.g.add(center);
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 16, 48), phys({ color: 0x2f8a3c, roughness: 0.3, clearcoat: 1 }));
    lens.position.y = 1.15; isl.g.add(lens);
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 6, 12), phys({ color: 0x2a332f, roughness: 0.4 }));
    handle.position.set(0.32, 0.8, 0); handle.rotation.z = 0.75; isl.g.add(handle);
    this.lens = lens;
    const icons = [
      () => iconPhone(),
      () => { const g = new THREE.Group(); [0x1d2320, 0x2f8a3c, 0xeef1ec].forEach((c, i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.3, 0.18, 2, 0.03), phys({ color: c, roughness: 0.4, clearcoat: 0.5 })); b.position.set(-0.21 + i * 0.21, 0.17, 0); g.add(b); }); return shadowAll(g); },
      () => { const g = new THREE.Group(); const tex = canvasTex(128, 128, (ctx) => { ctx.fillStyle = '#E3A21A'; ctx.font = `800 110px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 64, 70); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex })); s.scale.setScalar(0.5); s.position.y = 0.35; g.add(s); return g; },
      () => iconDB(),
      () => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.28, 0.16, 2, 0.04), phys({ color: 0x2f8a3c, roughness: 0.3, clearcoat: 0.7 })); b.position.y = 0.16; g.add(b); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 24, Math.PI), phys({ color: 0x9aa39e, metalness: 0.8, roughness: 0.3 })); sh.position.y = 0.3; g.add(sh); return shadowAll(g); },
      () => { const g = new THREE.Group(); const a = iconWindow(); a.scale.setScalar(0.6); a.position.x = -0.18; g.add(a); const b = iconWindow(); b.scale.setScalar(0.6); b.position.set(0.2, 0, 0.1); g.add(b); return g; },
      () => iconChip(),
    ];
    this.tests3 = P.tests.map((tst, k) => {
      const a = (k / P.tests.length) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.24, 32), phys({ color: 0xffffff, roughness: 0.4, clearcoat: 0.6, emissive: 0x4cd964, emissiveIntensity: 0 }));
      ped.position.set(x, 0.38, z); ped.castShadow = ped.receiveShadow = true;
      ped.userData = { phase: 2, item: k };
      isl.g.add(ped); isl.pick.push(ped);
      const ic = icons[k](); ic.scale.multiplyScalar(1.05); ic.position.set(x, 0.5, z);
      ic.traverse((o) => { o.userData = { phase: 2, item: k }; });
      isl.g.add(ic); isl.pick.push(ic);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe3a21a, emissive: 0xe3a21a, emissiveIntensity: 1.2 }));
      lamp.position.set(x + Math.cos(a) * 0.3, 0.52, z + Math.sin(a) * 0.3);
      isl.g.add(lamp);
      this.label(isl, ped, new THREE.Vector3(Math.cos(a) * 0.75, -0.1, Math.sin(a) * 0.55), `<b>${k + 1}</b> ${tst.t}`, 'p-label test');
      return { ped, lamp, a };
    });
    this.runner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x8cf29a, emissive: 0x4cd964, emissiveIntensity: 1.5 }));
    this.runner.position.y = 0.42;
    isl.g.add(this.runner);
    this.runnerA = Math.PI / 2;
    this.selTest = 0;
  }

  runTests() {
    if (this.testTl) this.testTl.kill();
    const tl = gsap.timeline();
    this.testTl = tl;
    const o = { a: Math.PI / 2 };
    this.tests3.forEach((t, k) => {
      tl.to(o, { a: t.a + (k === 0 ? 0 : 0), duration: k === 0 ? 0.01 : 0.7, ease: 'power1.inOut', onUpdate: () => (this.runnerA = o.a) });
      tl.call(() => this.selectTest(k));
      tl.to({}, { duration: 1.3 });
    });
    tl.to(o, { a: Math.PI / 2 + Math.PI * 2, duration: 0.7, onUpdate: () => (this.runnerA = o.a) });
    tl.call(() => {
      const box = $('#p3detail', this.root);
      if (box) box.innerHTML = '<b>Recorrido completo del protocolo.</b> Las siete pruebas siguen <span class="st st-pend">por ejecutar</span>: el recorrido muestra cómo se probará, no un resultado.';
    });
  }

  selectTest(k) {
    this.selTest = k;
    this.tests3.forEach((t, i) => (t.ped.material.emissiveIntensity = i === k ? 0.5 : 0));
    this.root.querySelectorAll('#plist3 li').forEach((li, i) => li.classList.toggle('on', i === k));
    const tst = PHASES[2].tests[k];
    const box = $('#p3detail', this.root);
    if (box) box.innerHTML = `<b>${k + 1}. ${tst.t}</b><span><i>Criterio:</i> ${tst.c}</span><span><i>Evidencia:</i> ${tst.e}</span>`;
  }

  // ---------------- Fase 4 · Validar: indicadores ----------------
  buildPhase4(isl) {
    const P = PHASES[3];
    const pos = [[-1.65, -0.8], [-0.55, -0.8], [0.55, -0.8], [1.65, -0.8], [-1.1, 0.85], [0.0, 0.85], [1.1, 0.85]];
    const riser = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.4, 0.9, 3, 0.06), phys({ color: 0xe9eee8, roughness: 0.6 }));
    riser.position.set(0, 0.42, -0.8); riser.castShadow = riser.receiveShadow = true;
    isl.g.add(riser);
    const arc = Math.PI * 1.5, start = Math.PI * 1.25; // 270°
    this.gauges = P.metrics.map((m, k) => {
      const [x, z] = pos[k];
      const y = (z < 0 ? 0.62 : 0.22) + 0.62 * 1.3;
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.scale.setScalar(1.3);
      g.rotation.y = -x * 0.08;
      const bg = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 12, 64, arc), phys({ color: 0xd4dcd3, roughness: 0.5 }));
      bg.rotation.z = start - arc; g.add(bg);
      const frac = m.v / m.max;
      const ghostMat = new THREE.MeshPhysicalMaterial({ color: 0x6db33f, transparent: true, opacity: 0.55, roughness: 0.2, emissive: 0x2f8a3c, emissiveIntensity: 0.3, depthWrite: false });
      const ghost = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.075, 12, 64, arc * frac), ghostMat);
      ghost.rotation.z = start - arc * frac;
      g.add(ghost);
      // marcador de la meta
      const ma = start - arc * frac;
      const mk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: 0x0e3b20 }));
      mk.position.set(Math.cos(ma) * 0.38, Math.sin(ma) * 0.38, 0); mk.rotation.z = ma; g.add(mk);
      // resultado real: aún no existe → disco vacío con guion
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
      face.position.z = -0.01; g.add(face);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.26, 12), phys({ color: 0x2a332f }));
      stand.position.y = -0.38 - 0.12; g.add(stand);
      shadowAll(g);
      ghost.castShadow = false;
      isl.g.add(g);
      g.traverse((o) => { o.userData = { phase: 3, item: k }; });
      isl.pick.push(g);
      const L = this.label(isl, g, new THREE.Vector3(0, 0, 0.02), '', 'p-label gauge');
      return { g, ghost, ghostMat, m, L };
    });
    this.updateGaugeLabels();
  }

  updateGaugeLabels() {
    this.gauges.forEach(({ m, L, ghostMat }) => {
      if (this.mode4 === 'meta') L.el.innerHTML = `<b>${m.meta}</b><small>${m.t}</small>`;
      else L.el.innerHTML = `<b class="nodata">Sin medir</b><small>${m.t}</small>`;
      gsap.to(ghostMat, { opacity: this.mode4 === 'meta' ? 0.6 : 0.08, duration: 0.5 });
    });
  }

  setMode4(m) {
    this.mode4 = m;
    this.updateGaugeLabels();
    this.root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    this.root.querySelectorAll('#ptable4 td.real').forEach((td) => td.classList.toggle('hl', m === 'real'));
    this.root.querySelectorAll('#ptable4 td.meta').forEach((td) => td.classList.toggle('hl', m === 'meta'));
    const note = $('#p4note', this.root);
    if (note) note.innerHTML = m === 'meta'
      ? 'Las metas son <b>hipótesis de aceptación</b>: se ajustan con los datos del piloto.'
      : '<b>Sin resultados reales todavía:</b> el piloto no se ha ejecutado. No se presentan cifras inexistentes.';
  }

  // ---------------- Panel de detalle ----------------
  renderPanel(i) {
    const P = PHASES[i];
    const el = $('#panel2', this.root);
    let body = '';
    if (i === 0) {
      body = `<ol class="plist" id="plist1">${P.layers.map((l, k) => `<li data-item="${k}"><b>${l.t}</b><span>${l.d}</span></li>`).join('')}</ol>
        <p class="pout">${P.out}</p>`;
    } else if (i === 1) {
      body = `<ul class="plist parts">${P.parts.map((p) => `<li><b>${p.t}</b><span>${p.d}</span><em class="st st-${p.s}">${STATUS[p.s].t}</em></li>`).join('')}</ul>
        <p class="pout">${P.note}</p>`;
    } else if (i === 2) {
      body = `<ol class="plist tests" id="plist3">${P.tests.map((t, k) => `<li data-test="${k}"><b>${t.t}</b><em class="st st-pend">Por ejecutar</em></li>`).join('')}</ol>
        <div class="pdetail" id="p3detail"></div>
        <button class="pbtn" data-act="runTests">▶ Recorrer pruebas <kbd>P</kbd></button>`;
    } else {
      body = `<div class="seg"><button data-mode="meta" class="on">Metas propuestas</button><button data-mode="real">Resultados reales</button><kbd>V</kbd></div>
        <table class="ptable" id="ptable4"><tr><th>Indicador</th><th>Meta propuesta</th><th>Resultado real</th></tr>
        ${P.metrics.map((m) => `<tr><td><b>${m.t}</b><small>${m.how}</small></td><td class="meta hl">${m.meta}</td><td class="real">Sin medir</td></tr>`).join('')}</table>
        <p class="pout" id="p4note"></p>`;
    }
    el.innerHTML = `<div class="ph-head"><span class="ph-n">${P.n}</span><div><h3>${P.k}</h3><p>${P.q}</p></div></div>${body}`;
    $('#cap2', this.root).textContent = P.caption;
    if (i === 2) {
      el.querySelectorAll('[data-test]').forEach((li) => li.addEventListener('click', () => this.selectTest(+li.dataset.test)));
      el.querySelector('[data-act="runTests"]').addEventListener('click', () => this.runTests());
      this.selectTest(this.selTest || 0);
    }
    if (i === 3) {
      el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => this.setMode4(b.dataset.mode)));
      this.setMode4(this.mode4);
    }
    if (i === 0) el.querySelectorAll('[data-item]').forEach((li) => li.addEventListener('click', () => this.selectLayer(+li.dataset.item)));
    gsap.fromTo(el, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: state.reduced ? 0.01 : 0.5, ease: 'power2.out' });
  }

  selectLayer(k) {
    this.layers1.forEach((m, i) => { m.material.emissiveIntensity = i === k ? 0.35 : 0; });
    this.root.querySelectorAll('#plist1 li').forEach((li, i) => li.classList.toggle('on', i === k));
    this.selLayer = k;
  }

  initPicking() {
    const dom = this.view.renderer.domElement;
    const pickables = () => this.islands.flatMap((s) => s.pick);
    let down = null;
    dom.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
    dom.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      this.raycaster.setFromCamera(this.view.pointer(e), this.camera);
      const hit = this.raycaster.intersectObjects(pickables(), true)[0];
      if (hit) {
        const u = hit.object.userData;
        const ph = u.phase ?? this.islandOf(hit.object);
        if (ph !== this.phase) { this.focus(ph); return; }
        if (ph === 0) this.selectLayer(u.item);
        if (ph === 2) this.selectTest(u.item);
        if (ph === 3) this.flashRow(u.item);
        return;
      }
      // clic en una isla lejana
      const isl = this.raycaster.intersectObjects(this.islands.map((s) => s.g), true)[0];
      if (isl) { const i = this.islandOf(isl.object); if (i !== this.phase) this.focus(i); }
    });
    dom.addEventListener('pointermove', (e) => {
      this.raycaster.setFromCamera(this.view.pointer(e), this.camera);
      dom.style.cursor = this.raycaster.intersectObjects(this.islands.map((s) => s.g), true).length ? 'pointer' : 'grab';
    });
    // arrastre para girar la vista alrededor de la isla activa
    let drag = null;
    this.yawOff = 0; this.zoom = 1;
    dom.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y0: this.yawOff }; dom.setPointerCapture(e.pointerId); });
    dom.addEventListener('pointermove', (e) => { if (drag && e.buttons) this.yawOff = THREE.MathUtils.clamp(drag.y0 + (e.clientX - drag.x) * 0.004 / state.scale, -0.7, 0.7); });
    dom.addEventListener('pointerup', () => (drag = null));
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = THREE.MathUtils.clamp(this.zoom * (e.deltaY > 0 ? 1.08 : 0.93), 0.7, 1.4); }, { passive: false });
  }
  islandOf(o) { while (o && !this.islands.some((s) => s.g === o)) o = o.parent; return this.islands.findIndex((s) => s.g === o); }

  flashRow(k) {
    const rows = this.root.querySelectorAll('#ptable4 tr');
    const r = rows[k + 1];
    if (!r) return;
    r.classList.add('flash');
    setTimeout(() => r.classList.remove('flash'), 1200);
  }

  focus(i, instant = false) {
    this.phase = i;
    this.yawOff = 0; this.zoom = 1;
    const x = ISL_X[i];
    const tgt = new THREE.Vector3(x + 1.6, i === 1 ? 1.45 : 1.15, 0);
    this.camTarget = tgt;
    const dur = instant || state.reduced ? 0 : 1.4;
    gsap.to(this.target, { x: tgt.x, y: tgt.y, z: tgt.z, duration: dur, ease: 'power3.inOut' });
    this.root.querySelectorAll('.rail button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
    const fill = $('.rail .fill', this.root);
    if (fill) fill.style.width = `${(i / 3) * 100}%`;
    this.islands.forEach((s, k) => {
      gsap.to(s.rim.material, { emissiveIntensity: k === i ? 1.0 : 0.25, duration: 0.6 });
    });
    this.renderPanel(i);
    if (this.guide) {
      const gx = x - 2.75;
      this.guidePose = 'idle';
      gsap.to(this.guide.position, { x: gx, duration: dur, ease: 'power2.inOut', onComplete: () => { this.guidePose = i === 2 ? 'point' : 'present'; } });
      if (!dur) this.guidePose = i === 2 ? 'point' : 'present';
    }
    if (i === 1 && !instant) this.assemble2();
    if (i === 0) this.selectLayer(this.selLayer ?? 3);
  }

  intro() { if (!state.reduced) { this.camDist = 20; gsap.to(this, { camDist: 12.6, duration: 1.6, ease: 'power3.out' }); } }

  update(dt) {
    this.t += dt;
    const t = this.t;
    if (this.camDist == null) this.camDist = 12.6;
    const d = this.camDist * this.zoom;
    const yaw = this.yawOff + (state.reduced ? 0 : Math.sin(t * 0.25) * 0.04);
    const cx = this.target.x;
    const camRel = new THREE.Vector3(0, 0.36 * d, d).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.camera.position.copy(this.target).add(camRel);
    this.camera.lookAt(this.target);
    this.sun.position.set(cx + 4, 9, 6);
    this.sun.target.position.set(cx, 0, 0);
    this.sun.target.updateMatrixWorld();
    // animaciones ambientales
    if (!state.reduced) {
      this.gem.rotation.y += dt * 0.9;
      this.gem.position.y = 0.22 + 0.36 * 4 + 0.45 + Math.sin(t * 2) * 0.06;
      this.lens.rotation.y += dt * 0.6;
    }
    this.guide.userData.update(dt, t, this.guidePose, state.reduced);
    this.runner.position.set(Math.cos(this.runnerA) * 1.55, 0.42, Math.sin(this.runnerA) * 1.55);
    this.tests3.forEach((tt, k) => (tt.lamp.material.emissiveIntensity = 0.8 + Math.sin(t * 3 + k) * 0.4));
    this.runnerDots.forEach((m, i) => { const u = ((t * 0.04) + i / 5) % 1; m.position.copy(this.roadCurve.getPoint(u)); m.position.y = 0.06; });
    // etiquetas: solo de la isla activa
    const v = new THREE.Vector3(), o = {};
    for (const L of this.labels) {
      const show = L.isl === this.phase;
      L.el.classList.toggle('hide', !show);
      if (!show) continue;
      L.obj.getWorldPosition(v); v.add(L.off);
      this.view.project(v, o);
      L.el.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, -50%)`;
    }
  }
  render() { this.view.render(); }
}
