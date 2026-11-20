import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeStudent } from '../src/student.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun);

const st = makeStudent();
scene.add(st);
// prop markers on hands
const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.009), new THREE.MeshStandardMaterial({ color: 0x111111 }));
phone.position.z = 0.006; st.userData.handR.add(phone);
const ax = new THREE.AxesHelper(0.08); st.userData.handL.add(ax);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
function setCam(x = 0.6, y = 1.2, z = 4.2, tx = 0, ty = 0.9, tz = 0, fov = 30) {
  camera.position.set(x, y, z); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tx, ty, tz); render();
}
function render() { renderer.render(scene, camera); }
let tris = 0, meshes = 0; st.traverse((o) => { if (o.isMesh && o !== phone) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
Object.assign(window, { TRIS: tris, MESHES: meshes, st, render, setCam, phone,
  pose: (n, steps = 120) => { for (let i = 0; i < steps; i++) st.userData.update(1 / 30, i / 30, n, true); render(); },
  bbox: () => { const b = new THREE.Box3().setFromObject(st); return [b.min.toArray(), b.max.toArray()]; } });
setCam();
document.fonts?.ready.then(() => setTimeout(render, 300));
