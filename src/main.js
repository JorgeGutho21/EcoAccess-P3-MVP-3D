// =====================================================================
// EcoAccess P3 · Controlador de la presentación (2 diapositivas)
// =====================================================================
import gsap from 'gsap';
gsap.ticker.lagSmoothing(0);
import { state, QUALITY } from './util.js';
import { SCRIPT, TECH_HTML } from './content.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search);

// ---------- escala del escenario 1920×1080 ----------
const stageEl = $('#stage');
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  state.scale = s;
  stageEl.style.transform = `translate(-50%, -50%) scale(${s})`;
  views.forEach((v) => v && v.view && v.view.resize());
}
addEventListener('resize', fit);

// ---------- movimiento reducido ----------
function setReduced(v) {
  state.reduced = v;
  document.body.classList.toggle('reduced', v);
  $('[data-ui="motion"]').classList.toggle('on', v);
}
setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('reduced'));

// ---------- WebGL ----------
function hasGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const gl = hasGL();
let s1 = null, s2 = null, arch = null;
const views = [];

async function boot() {
  if (gl) {
    try {
      const [{ Slide1 }, { Slide2 }, { Arch }] = await Promise.all([import('./slide1.js'), import('./slide2.js'), import('./arch.js')]);
      arch = new Arch($('#c1arch'), $('#archInfo'));
      s1 = new Slide1($('#s1'), arch);
      s2 = new Slide2($('#s2'));
      views.push(arch, s1, s2);
      // Precompila todos los shaders (incluidos residuos ocultos) para evitar tirones la primera vez que aparecen
      try {
        const hidden = [];
        s1.scene.traverse((o) => { if (o.visible === false) { hidden.push(o); o.visible = true; } });
        s1.view.renderer.compile(s1.scene, s1.camera);
        s2.view.renderer.compile(s2.scene, s2.camera);
        arch.view.renderer.compile(arch.scene, arch.camera);
        hidden.forEach((o) => (o.visible = false));
        s1.render(); s2.render(); arch.render();
        const glc = s1.view.renderer.getContext();
        const dbg = glc.getExtension('WEBGL_debug_renderer_info');
        const gpu = dbg ? String(glc.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        if (/Intel|UHD|HD Graphics|Mali|Adreno|PowerVR|SwiftShader|llvmpipe/i.test(gpu) && !/Arc/i.test(gpu)) setQuality(1);
      } catch (err) { console.warn(err); }
    } catch (err) {
      console.error(err);
      $('#nogl').hidden = false;
    }
  } else $('#nogl').hidden = false;
  fit();
  wire();
  const start = /2/.test(location.hash) ? 1 : 0;
  go(start, true);
  requestAnimationFrame(loop);
  window.__eco = { s1, s2, arch, go };
}

// ---------- bucle de render: solo la diapositiva visible ----------
let last = performance.now();
let current = 0, transitioning = false;
let frame = 0, perfT = 0, perfN = 0, settled = false, slowWindows = 0;
function setQuality(q, manual = false) {
  state.quality = Math.max(0, Math.min(2, q));
  if (manual) settled = true;
  views.forEach((v) => v && v.view && v.view.resize());
  const b = $('[data-ui="quality"]');
  if (b) b.innerHTML = `Calidad: ${QUALITY[state.quality].name} <kbd>Q</kbd>`;
}
function loop(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  frame++;
  // Ajuste automático de calidad: ventanas de 2 s; si el promedio supera ~22 ms por cuadro, baja un nivel
  if (!settled && !document.hidden && raw < 0.5) {
    perfT += raw; perfN++;
    if (perfT > 2) {
      const ms = (perfT / perfN) * 1000;
      if (ms > 22 && state.quality > 0) { slowWindows++; if (slowWindows >= 1) { setQuality(state.quality - 1); slowWindows = 0; } }
      else if (ms < 17) settled = true;
      perfT = 0; perfN = 0;
    }
  }
  if (s1 && (current === 0 || transitioning)) {
    s1.update(dt); s1.render();
    arch.update(dt);
    if (frame % 2 === 0) arch.render(); // el esquema se dibuja a 30 fps
  }
  if (s2 && (current === 1 || transitioning)) { s2.update(dt); s2.render(); }
  requestAnimationFrame(loop);
}

// ---------- navegación ----------
const slides = [$('#s1'), $('#s2')];
function go(i, instant = false) {
  i = Math.max(0, Math.min(1, i));
  if (i === current && !instant) return;
  const from = slides[current], to = slides[i];
  const dir = i > current ? 1 : -1;
  current = i;
  $('#pg').textContent = `${i + 1} / 2`;
  try { history.replaceState(null, '', '#' + (i === 0 ? 's1' : 's2')); } catch {}
  renderNotes();
  if (instant || state.reduced) {
    slides.forEach((s, k) => { s.classList.toggle('active', k === i); gsap.set(s, { opacity: k === i ? 1 : 0, x: 0, scale: 1, filter: 'none' }); });
    if (!instant) return;
    (i === 0 ? s1 : s2)?.intro?.();
    return;
  }
  transitioning = true;
  to.classList.add('active');
  const tl = gsap.timeline({ onComplete: () => { from.classList.remove('active'); transitioning = false; } });
  tl.to(from, { opacity: 0, x: -120 * dir, scale: 0.97, filter: 'blur(6px)', duration: 0.6, ease: 'power2.in' }, 0);
  tl.fromTo(to, { opacity: 0, x: 160 * dir, scale: 1.02, filter: 'blur(6px)' }, { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }, 0.35);
  tl.fromTo(to.querySelectorAll('.hdr h1, .hdr .sub, .kicker'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power2.out' }, 0.5);
  tl.call(() => (i === 0 ? s1 : s2)?.intro?.(), null, 0.35);
}

// ---------- paneles ----------
function toggle(id, force) {
  const el = $('#' + id);
  const open = force ?? !el.classList.contains('open');
  el.classList.toggle('open', open);
  $$(`[data-ui="${id === 'help' ? 'help' : id}"]`).forEach((b) => b.classList.toggle('on', open));
}
function renderNotes() {
  const sc = SCRIPT[current];
  $('#notesTitle').textContent = sc.title;
  $('#notesTime').textContent = sc.time + ' · guion total ≈ 5 min';
  $('#notesBody').innerHTML = sc.blocks.map((b) => `<div class="blk"><div class="act">▸ ${b.a}</div><div class="say">${b.s}</div></div>`).join('');
}

function fullscreen() {
  const d = document;
  if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {});
  else d.exitFullscreen?.().catch(() => {});
}

function wire() {
  $('#techBody').innerHTML = TECH_HTML;
  // HUD visible al mover el ratón
  let hudT;
  addEventListener('pointermove', () => { $('#hud').classList.add('show'); clearTimeout(hudT); hudT = setTimeout(() => $('#hud').classList.remove('show'), 2200); });
  $$('[data-ui]').forEach((b) => b.addEventListener('click', () => {
    const u = b.dataset.ui;
    if (u === 'prev') go(current - 1);
    if (u === 'next') go(current + 1);
    if (u === 'fs') fullscreen();
    if (u === 'notes') toggle('notes');
    if (u === 'tech') toggle('tech');
    if (u === 'help') toggle('help');
    if (u === 'motion') setReduced(!state.reduced);
    if (u === 'quality') setQuality(state.quality === 0 ? 2 : state.quality - 1, true);
  }));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.close, false)));
  $('#help').addEventListener('click', (e) => { if (e.target.id === 'help') toggle('help', false); });
  // simulaciones
  $$('[data-sim]').forEach((b) => b.addEventListener('click', () => s1 && s1.run(b.dataset.sim)));
  $('[data-act="pause"]').addEventListener('click', pause);
  $('[data-act="replay"]').addEventListener('click', () => s1 && s1.replay());
  $('[data-act="view"]').addEventListener('click', () => s1 && s1.resetView());
  $('[data-act="eco"]').addEventListener('click', () => s1 && s1.focusEco());
  $('[data-act="guided"]').addEventListener('click', toggleGuided);
  $$('.rail button').forEach((b) => b.addEventListener('click', () => s2 && s2.focus(+b.dataset.phase)));
  addEventListener('keydown', onKey);
  addEventListener('hashchange', () => go(/2/.test(location.hash) ? 1 : 0));
}

function toggleGuided() {
  if (!s1) return;
  s1.guided = !s1.guided;
  $('[data-act="guided"]').classList.toggle('on', s1.guided);
  if (!s1.guided) s1.resetView();
}
function pause() {
  if (!s1) return;
  const p = s1.togglePause();
  const b = $('[data-act="pause"]');
  b.classList.toggle('on', !!p);
  b.innerHTML = p ? '▶ Reanudar <kbd>P</kbd>' : '⏸ Pausar <kbd>P</kbd>';
}

function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const sims = ['pet', 'banano', 'servilleta', 'desconocido'];
  switch (k) {
    case 'arrowright': case 'pagedown': case ' ': e.preventDefault(); go(current + 1); return;
    case 'arrowleft': case 'pageup': e.preventDefault(); go(current - 1); return;
    case 'f': fullscreen(); return;
    case 'n': toggle('notes'); return;
    case 't': toggle('tech'); return;
    case 'h': case '?': toggle('help'); return;
    case 'm': setReduced(!state.reduced); return;
    case 'q': setQuality(state.quality === 0 ? 2 : state.quality - 1, true); return;
    case 'escape': ['notes', 'tech', 'help'].forEach((id) => toggle(id, false)); return;
  }
  if (current === 0 && s1) {
    if (k === 'i') s1.run('pet');
    if (['1', '2', '3', '4'].includes(k)) s1.run(sims[+k - 1]);
    if (k === 'p') pause();
    if (k === 'r') s1.replay();
    if (k === '0') s1.resetView();
    if (k === 'e') s1.focusEco();
    if (k === 'c') toggleGuided();
    if (k === 'a') s1.orbit(-0.18);
    if (k === 'd') s1.orbit(0.18);
    if (k === 'w') s1.orbit(0, 0.88);
    if (k === 's') s1.orbit(0, 1.12);
  } else if (current === 1 && s2) {
    if (['1', '2', '3', '4'].includes(k)) s2.focus(+k - 1);
    if (k === 'p') { if (s2.phase !== 2) s2.focus(2); s2.runTests(); }
    if (k === 'v') { if (s2.phase !== 3) s2.focus(3); s2.setMode4(s2.mode4 === 'meta' ? 'real' : 'meta'); }
    if (k === 'a') s2.yawOff = Math.max(-0.7, s2.yawOff - 0.15);
    if (k === 'd') s2.yawOff = Math.min(0.7, s2.yawOff + 0.15);
    if (k === 'w') s2.zoom = Math.max(0.7, s2.zoom * 0.9);
    if (k === 's') s2.zoom = Math.min(1.4, s2.zoom * 1.1);
  }
}

boot();
