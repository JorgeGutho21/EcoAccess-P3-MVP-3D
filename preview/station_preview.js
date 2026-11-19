import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeStation } from '../src/station.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe0ea);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;

const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0xb9b2a8, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb59f, 0.5));
const sun = new THREE.DirectionalLight(0xfff7ec, 2.4);
sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);

const st = makeStation();
scene.add(st);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 100);
const target = new THREE.Vector3(0, 1.4, 0);
function setCam(x = 1.2, y = 1.8, z = 6.2, tx = 0, ty = 1.4, tz = 0, fov = 35) {
  camera.position.set(x, y, z); target.set(tx, ty, tz); camera.fov = fov;
  camera.updateProjectionMatrix(); camera.lookAt(target); render();
}
function render() { renderer.render(scene, camera); }
let tris = 0; st.traverse((o) => { if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
window.TRIS = tris;
window.st = st;
window.render = render;
window.setCam = setCam;
window.openLid = (i, v = -1.9) => { st.userData.bins[i].userData.lid.rotation.x = v; render(); };
window.led = (i, v = 2) => { st.userData.bins[i].userData.led.emissiveIntensity = v; st.userData.bins[i].userData.halo.material.opacity = v ? 0.9 : 0; render(); };
window.glow = (v) => { st.userData.qrGlow.material.opacity = v; render(); };
setCam();
document.fonts?.ready.then(() => setTimeout(render, 300));
