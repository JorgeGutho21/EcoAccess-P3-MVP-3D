// =====================================================================
// Arquitectura tecnológica en capas (vista isométrica 3D)
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { View, addLights, state } from './util.js';
import { ICONS } from './models.js';
import { ARCH_NODES, ARCH_EDGES, FLOW_TO_ARCH, STATUS } from './content.js';

const COLX = [-2.05, 0, 2.05];
const ROWS = ['Roles', 'Canales', 'Inteligencia', 'Lógica', 'Datos y hardware'];

export class Arch {
  constructor(el, infoEl) {
    this.el = el;
    this.infoEl = infoEl;
    this.scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    cam.userData.frustum = 7.3;
    cam.position.set(3.2, 5.6, 12);
    cam.lookAt(0, 2.05, 0.9);
    this.camera = cam;
    this.view = new View(el, { camera: cam, scene: this.scene, exposure: 1.0, maxPR: 1.25, shadows: false });
    addLights(this.scene, { key: 2.0, shadowSize: 6 });

    this.nodes = new Map();
    const labels = document.createElement('div');
    labels.className = 'arch-labels';
    el.appendChild(labels);
    this.labels = labels;

    // bandas de capa
    ROWS.forEach((r, i) => {
      const y = this.rowY(i);
      const band = new THREE.Mesh(new RoundedBoxGeometry(6.2, 0.05, 1.5, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.55 }));
      band.position.set(0, y - 0.04, this.rowZ(i));
      band.receiveShadow = true;
      this.scene.add(band);
      (this.rowBands ||= []).push(band);
    });

    for (const n of ARCH_NODES) this.addNode(n);
    this.edges = ARCH_EDGES.map(([a, b, kind]) => this.addEdge(a, b, kind));

    this.raycaster = new THREE.Raycaster();
    const dom = this.view.renderer.domElement;
    dom.addEventListener('pointermove', (e) => {
      const n = this.pick(e);
      dom.style.cursor = n ? 'pointer' : 'default';
    });
    dom.addEventListener('click', (e) => {
      const n = this.pick(e);
      if (n) this.select(n.def.id, true);
    });
    this.active = new Set();
    this.t = 0;
    this.select(null);
  }
  rowY(i) { return 4.6 - i * 1.15; }
  rowZ(i) { return i * 0.42; }

  addNode(def) {
    const g = new THREE.Group();
    g.position.set(COLX[def.col], this.rowY(def.row), this.rowZ(def.row));
    const st = def.st;
    const slabMat = new THREE.MeshPhysicalMaterial({
      color: st === 'dev' ? 0x2f8a3c : st === 'mvp' ? 0xf7faf6 : 0x39433f,
      roughness: 0.35, clearcoat: 0.7, emissive: 0x4cd964, emissiveIntensity: 0,
    });
    const slab = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.16, 1.05, 3, 0.06), slabMat);
    slab.position.y = 0.08;
    slab.castShadow = slab.receiveShadow = true;
    g.add(slab);
    const edgeCol = st === 'dev' ? 0x1e6b30 : st === 'mvp' ? 0x2f8a3c : 0xe3a21a;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 0.18, 1.1)), st === 'pend'
      ? new THREE.LineDashedMaterial({ color: edgeCol, dashSize: 0.08, gapSize: 0.06 })
      : new THREE.LineBasicMaterial({ color: edgeCol }));
    if (st === 'pend') edges.computeLineDistances();
    edges.position.y = 0.08;
    g.add(edges);
    if (st === 'pend') {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe3a21a, emissive: 0xe3a21a, emissiveIntensity: 1.4 }));
      lamp.position.set(0.6, 0.2, 0.42);
      g.add(lamp);
    }
    const icon = ICONS[def.icon](def.tint);
    icon.position.y = 0.16;
    icon.scale.setScalar(0.95);
    g.add(icon);
    g.traverse((o) => { o.userData.node = g; });
    g.userData = { def, slabMat, icon, node: g };
    this.scene.add(g);
    // etiqueta
    const l = document.createElement('div');
    l.className = 'arch-label st-' + st;
    l.innerHTML = `<b>${def.t}</b><small>${def.s}</small>`;
    this.labels.appendChild(l);
    g.userData.label = l;
    this.nodes.set(def.id, g);
  }

  addEdge(a, b, kind) {
    const A = this.nodes.get(a), B = this.nodes.get(b);
    const pa = A.position.clone().add(new THREE.Vector3(0, 0.02, 0.0));
    const pb = B.position.clone().add(new THREE.Vector3(0, 0.02, 0.0));
    const mid = pa.clone().lerp(pb, 0.5).add(new THREE.Vector3(0, 0.25, 0.25));
    const curve = new THREE.CatmullRomCurve3([pa, mid, pb]);
    const mat = new THREE.MeshStandardMaterial({ color: kind === 'hw' ? 0xc89a2a : 0x56635c, roughness: 0.5, emissive: 0x4cd964, emissiveIntensity: 0 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, kind === 'flow' ? 0.035 : 0.022, 8), mat);
    this.scene.add(tube);
    const dots = [];
    const dmat = new THREE.MeshBasicMaterial({ color: kind === 'hw' ? 0xe3a21a : 0x6db33f });
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), dmat);
      this.scene.add(d);
      dots.push(d);
    }
    return { a, b, kind, curve, mat, dots, dmat, speed: 0.25 + Math.random() * 0.1, off: Math.random() };
  }

  pick(e) {
    this.raycaster.setFromCamera(this.view.pointer(e), this.camera);
    const hits = this.raycaster.intersectObjects([...this.nodes.values()], true);
    return hits.length ? hits[0].object.userData.node.userData : null;
  }

  select(id, user = false) {
    if (!this.infoEl) return;
    if (!id) {
      this.infoEl.innerHTML = '<b>Haz clic en un módulo</b> para ver su estado. Durante la demostración se iluminan los módulos que intervienen.';
      return;
    }
    const d = this.nodes.get(id).userData.def;
    this.infoEl.innerHTML = `<b>${d.t}</b> · <span class="st st-${d.st}">${STATUS[d.st].t}</span> — ${d.s}. <em>${STATUS[d.st].d}.</em>`;
    if (user) { this.active = new Set([id]); this.pulseT = this.t; }
  }

  highlightStep(k) {
    this.active = new Set(k ? FLOW_TO_ARCH[k] || [] : []);
    if (k) {
      const ids = [...this.active];
      const last = ids[ids.length - 1];
      if (last) this.select(last);
    } else this.select(null);
  }

  resize() { this.view.resize(); }

  update(dt) {
    this.t += dt;
    const t = this.t;
    for (const [id, g] of this.nodes) {
      const on = this.active.has(id);
      const u = g.userData;
      u.slabMat.emissiveIntensity += ((on ? 0.45 + Math.sin(t * 6) * 0.2 : 0) - u.slabMat.emissiveIntensity) * Math.min(1, dt * 8);
      const s = on ? 1.08 : 1;
      u.icon.scale.setScalar(u.icon.scale.x + (s * 0.95 - u.icon.scale.x) * Math.min(1, dt * 8));
      u.label.classList.toggle('on', on);
      if (u.icon.userData.spin && !state.reduced) u.icon.userData.spin.forEach((m, i) => { m.rotation.y += dt * (i ? -0.5 : 0.8); });
    }
    for (const e of this.edges) {
      const on = this.active.has(e.a) && this.active.has(e.b);
      e.mat.emissiveIntensity = on ? 0.9 : 0;
      e.mat.color.setHex(on ? 0x2f8a3c : e.kind === 'hw' ? 0xc89a2a : 0x56635c);
      e.dots.forEach((d, i) => {
        const u = ((t * e.speed * (on ? 2.4 : 1)) + e.off + i / 3) % 1;
        d.position.copy(e.curve.getPoint(u));
        d.visible = !state.reduced || on;
        d.scale.setScalar(on ? 1.3 : 0.75);
      });
    }
    // etiquetas
    const v = new THREE.Vector3(), o = {};
    for (const g of this.nodes.values()) {
      v.copy(g.position).add(new THREE.Vector3(0, -0.02, 0.55));
      this.view.project(v, o);
      g.userData.label.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, 0)`;
    }
  }
  render() { this.view.render(); }
}
