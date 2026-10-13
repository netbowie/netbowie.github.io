/* ============================================================================
   Ruang Agen 3D — kantor virtual untuk agen AI
   Demo statis: seluruh scene dibangun prosedural (tanpa file model/tekstur).
   ========================================================================== */
import * as THREE from 'three';

/* ----------------------------------------------------------------- data --- */
const CREW = [
  { id:'luna', ini:'L', name:'Luna', role:'Manajer Agen', state:'work',
    model:'deepseek-flash', plat:'Hermes · Telegram @nana2526_bot',
    color:0x5eead4, loc:'Meja 1', task:'Menyusun laporan & menjawab Bowie',
    sejak:'Aktif sejak 27 Sep', desk:0 },
  { id:'mona', ini:'M', name:'Mona', role:'Agen Kedua (OpenClaw)', state:'idle',
    model:'deepseek-v4-pro', plat:'OpenClaw · Telegram @mona2526_bot',
    color:0xf0a23c, loc:'Berkeliling kantor', task:'Menunggu perintah berikutnya',
    sejak:'Terpasang 13 Okt', desk:1 },
  { id:'kol-ai', ini:'K', name:'Kolektor AI', role:'Pengumpul berita AI', state:'plan',
    model:'belum dipilih', plat:'rencana · cron pagi 07.00', color:0x8b8cf8,
    loc:'Meja 3', task:'Belum aktif — menunggu izin Bowie', sejak:'Rencana', desk:2 },
  { id:'kol-tek', ini:'T', name:'Kolektor Tekno', role:'Pengumpul berita teknologi', state:'plan',
    model:'belum dipilih', plat:'rencana · cron pagi 07.00', color:0x7dd3fc,
    loc:'Meja 4', task:'Belum aktif — menunggu izin Bowie', sejak:'Rencana', desk:3 },
  { id:'editor', ini:'E', name:'Editor Laporan', role:'Penyusun laporan pagi', state:'plan',
    model:'belum dipilih', plat:'rencana · resume Sabtu', color:0xc4b5fd,
    loc:'Meja 5', task:'Belum aktif — menunggu izin Bowie', sejak:'Rencana', desk:4 },
  { id:'ups', ini:'U', name:'Penjaga UPS', role:'Pemantau daya & PC', state:'plan',
    model:'belum dipilih', plat:'rencana · sensor BLUETTI', color:0xfca5a5,
    loc:'Meja 6', task:'Belum aktif — menunggu izin Bowie', sejak:'Rencana', desk:5 },
];

/* posisi meja: 2 baris x 3 kolom. kursi agen di belakang meja (arah -z) */
const DESK_COLS = [-13.5, -10, -6.5];
const DESK_ROWS = [-7.5, -3.5];
const DESKS = [];
DESK_COLS.forEach((x, ci) => DESK_ROWS.forEach((z, ri) => {
  DESKS.push({ x, z, seatZ: z - 1.15, key: ci * 2 + ri });
}));

const HUD = {
  kru:'2 / 6 aktif', gateway:'2 tersambung', tugas:'1 berjalan · 4 menunggu',
  cron:'07.00 WIB · belum aktif', sesi:'3 sesi', token:'1,2 jt',
  tools:[['terminal',78],['read_file',54],['web_search',41],['write_file',23]],
  saluran:'2 terpasang', skill:'48 aktif',
};

/* --------------------------------------------------------------- helpers -- */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

function M(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading:true, roughness:o.rough ?? 0.86, metalness:o.metal ?? 0.0,
    emissive:o.emissive ?? 0x000000, emissiveIntensity:o.ei ?? 1,
    transparent:o.opacity !== undefined, opacity:o.opacity ?? 1,
  });
}
function B(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function CY(rt, rb, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function SP(r, mat, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}

/* tekstur prosedural: papan kayu, rumput, aspal */
function canvasTex(draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  draw(c.getContext('2d'), 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {
  wood: canvasTex((g, s) => {
    g.fillStyle = '#c8945c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${rand(120,175)|0},${rand(80,125)|0},${rand(40,70)|0},.5)`;
      g.fillRect(rand(0,s), rand(0,s), rand(40,140), rand(3,9)); }
    g.strokeStyle = 'rgba(70,45,25,.45)'; g.lineWidth = 1.6;
    for (let y = 0; y <= s; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
  }, 5, 5),
  grass: canvasTex((g, s) => {
    g.fillStyle = '#6fbb45'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rand(70,120)|0},${rand(150,200)|0},${rand(50,90)|0},.55)`;
      g.fillRect(rand(0,s), rand(0,s), 2, 3); }
  }, 22, 18),
  wall: canvasTex((g, s) => {
    g.fillStyle = '#f3efe6'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(190,180,165,.35)';
    for (let i = 0; i < 200; i++) g.fillRect(rand(0,s), rand(0,s), rand(1,3), rand(1,3));
    g.strokeStyle = 'rgba(180,170,155,.35)'; g.lineWidth = 2;
    for (let y = 32; y < s; y += 64) { g.beginPath(); g.moveTo(0,y); g.lineTo(s,y); g.stroke(); }
  }, 4, 1),
};

/* ---------------------------------------------------------------- scene --- */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 400);
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.getElementById('scene').appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6b3a, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
sun.position.set(26, 34, 22); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left:-46, right:46, top:46, bottom:-46, near:1, far:140 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const ambient = new THREE.AmbientLight(0xffffff, 0.18); scene.add(ambient);

const SKY = { day:new THREE.Color(0x9dccdf), dusk:new THREE.Color(0x1b2b45), night:new THREE.Color(0x131d33) };
scene.background = SKY.night.clone();
scene.fog = new THREE.Fog(0x131d33, 80, 190);

/* lampu dalam ruangan + lampu jalan (dinyalakan saat malam) */
const nightLights = [];
function addLamp(x, y, z, color = 0xffd9a0, power = 22, dist = 20) {
  const l = new THREE.PointLight(color, power, dist, 2);
  l.position.set(x, y, z); l.visible = false; l.userData.base = power; scene.add(l);
  nightLights.push(l); return l;
}

/* pepohonan di halaman (memecah bidang rumput yang tadinya polos) */
function tree(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
  g.add(CY(0.16 * s, 0.24 * s, 1.9 * s, 8, M(0x6b4a30), 0, 0.95 * s, 0));
  g.add(SP(1.25 * s, M(0x3f7a3a), 0, 2.45 * s, 0));
  g.add(SP(0.95 * s, M(0x4a8f42), 0.75 * s, 2.0 * s, 0.35 * s));
  g.add(SP(0.85 * s, M(0x357034), -0.7 * s, 2.1 * s, -0.3 * s));
  g.traverse(o => { o.castShadow = true; });
  return g;
}

/* ----------------------------------------------------------- bangunan ----- */
const world = new THREE.Group(); scene.add(world);
const BUILD = { x0:-16, x1:16, z0:-10, z1:8, h:3.25, wall:0.28 };

const groundMat = new THREE.MeshStandardMaterial({ map:TEX.grass, roughness:0.95 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 130), groundMat);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
world.add(ground);

/* jalan + trotoar di depan gedung */
const roadMat = M(0x2c2f36, { rough:0.96 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(180, 9), roadMat);
road.rotation.x = -Math.PI / 2; road.position.set(0, -0.01, 15.4); road.receiveShadow = true; world.add(road);
for (let x = -84; x < 84; x += 8) world.add(B(4, 0.02, 0.22, M(0xf2f2f2, { rough:0.7 }), x, 0.005, 15.4));
const kerb = B(180, 0.22, 0.5, M(0xb9b3a6), 0, 0.11, 10.9); world.add(kerb);
const walkMat = M(0xd6cfc1, { rough:0.93 });
const walk = new THREE.Mesh(new THREE.PlaneGeometry(64, 3.4), walkMat);
walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 9.6); walk.receiveShadow = true; world.add(walk);
const pad = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.4), walkMat);
pad.rotation.x = -Math.PI / 2; pad.position.set(-21, 0.01, 0); pad.receiveShadow = true; world.add(pad);

/* pelat lantai + dinding (potongan terbuka ke arah kamera) */
const wallMat = new THREE.MeshStandardMaterial({ map:TEX.wall, roughness:0.92 });
const floorMat = new THREE.MeshStandardMaterial({ map:TEX.wood, roughness:0.72 });
const slab = B(BUILD.x1 - BUILD.x0 + 1.1, 0.3, BUILD.z1 - BUILD.z0 + 1.1, M(0x8c8579), 0, -0.15, (BUILD.z0 + BUILD.z1) / 2);
world.add(slab);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(BUILD.x1 - BUILD.x0 + 1.0, BUILD.z1 - BUILD.z0 + 1.0), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.001, (BUILD.z0 + BUILD.z1) / 2);
floor.receiveShadow = true; world.add(floor);

const W = BUILD.h, T = BUILD.wall, cx = (BUILD.x0 + BUILD.x1) / 2, cz = (BUILD.z0 + BUILD.z1) / 2;
const bw = BUILD.x1 - BUILD.x0, bd = BUILD.z1 - BUILD.z0;
world.add(B(bw + T, W, T, wallMat, cx, W / 2, BUILD.z0 - T / 2));        // dinding belakang
world.add(B(T, W, bd + T, wallMat, BUILD.x0 - T / 2, W / 2, cz));        // dinding kiri
world.add(B(T, W, bd + T, wallMat, BUILD.x1 + T / 2, W / 2, cz));        // dinding kanan
/* balok atas hanya di tepi: atap dibiarkan terbuka supaya interior terlihat dari kamera */
const beamMat = M(0xe7e1d4);
world.add(B(bw + T * 2, 0.34, 0.4, beamMat, cx, W + 0.17, BUILD.z0 - T / 2));
world.add(B(bw + T * 2, 0.3, 0.36, beamMat, cx, W + 0.15, BUILD.z1 + 0.1));
world.add(B(0.4, 0.34, bd + T * 2, beamMat, BUILD.x0 - T / 2, W + 0.17, cz));
world.add(B(0.4, 0.34, bd + T * 2, beamMat, BUILD.x1 + T / 2, W + 0.17, cz));
/* jendela kaca di dinding belakang + samping */
const glassMat = new THREE.MeshPhysicalMaterial({ color:0x9fd8ff, transparent:true, opacity:0.32,
  roughness:0.08, metalness:0, transmission:0.6, side:THREE.DoubleSide });
for (const x of [-11, -5.5, 9, 13.5]) world.add(B(3.4, 1.5, 0.09, glassMat, x, 1.95, BUILD.z0 - 0.02));
for (const z of [-6, 2]) world.add(B(0.09, 1.5, 3, glassMat, BUILD.x0 - 0.02, 1.95, z));
for (const z of [-5, 1]) world.add(B(0.09, 1.5, 3, glassMat, BUILD.x1 + 0.02, 1.95, z));
/* papan nama di dinding belakang + panggung kecil */
const signMat = new THREE.MeshStandardMaterial({ color:0x132033, emissive:0x5eead4, emissiveIntensity:0.55, roughness:0.5 });
world.add(B(5.6, 0.62, 0.1, signMat, 0, 2.5, BUILD.z0 + 0.06));
world.add(B(0.9, 0.36, 0.9, M(0x2b3446), -13.5, 0.18, BUILD.z0 + 2.4));
/* unit AC */
for (const x of [-14, 6, 14]) world.add(B(1.5, 0.45, 0.32, M(0xf6f6f4), x, 2.72, BUILD.z0 + 0.3));

/* lampu dalam ruangan (tanpa plafon: hanya titik cahaya) */
const ceilLights = [];
addLamp(-11, 2.7, -1, 0xffe3b8, 26, 24); addLamp(2, 2.7, 0, 0xffe3b8, 22, 22);
addLamp(9, 2.7, -3, 0xffe3b8, 20, 20); addLamp(10, 2.7, 5.5, 0xffe3b8, 18, 18);
addLamp(-1.2, 2.7, 1.2, 0xffe3b8, 24, 20); addLamp(-4, 2.7, -6, 0xffe3b8, 18, 18);

/* lampu jalan di trotoar + lampu pintu masuk (biar luar tidak gelap gulita) */
(function streetLamps(){
  for (const x of [-24, -8, 8, 24]) {
    const g = new THREE.Group(); g.position.set(x, 0, 11.4); world.add(g);
    g.add(CY(0.11, 0.16, 5.6, 10, M(0x535b69), 0, 2.8, 0));
    g.add(B(0.1, 0.1, 1.5, M(0x535b69), 0, 5.6, -0.75));
    g.add(B(0.62, 0.16, 0.4, M(0x2b3240, { emissive:0xffd9a0, ei:0.55 }), 0, 5.5, -1.5));
    g.traverse(o => { o.castShadow = true; });
    addLamp(x, 5.35, 9.8, 0xffd9a0, 44, 26);
  }
  /* lampu kanopi pintu masuk */
  world.add(B(2.6, 0.18, 0.7, M(0x2b3240, { emissive:0xffd9a0, ei:0.45 }), 0, 3.55, 8.5));
  addLamp(0, 3.2, 8.2, 0xffe3b8, 30, 22);
  addLamp(-12, 3.2, 8.2, 0xffe3b8, 22, 18);
})();

/* ------------------------------------------------------------- ruang ------ */
/* partisi kaca ruang rapat + lounge */
function glassWall(axis, fixed, from, to, y = 1.65, h = 3.0) {
  const len = to - from, mid = (from + to) / 2;
  const g = axis === 'x' ? B(0.09, h, len, glassMat, fixed, y, mid) : B(len, h, 0.09, glassMat, mid, y, fixed);
  const top = axis === 'x' ? B(0.12, 0.1, len, M(0xb9c7d6, { metal:0.5, rough:0.35 }), fixed, y + h / 2, mid)
                           : B(len, 0.1, 0.12, M(0xb9c7d6, { metal:0.5, rough:0.35 }), mid, y + h / 2, fixed);
  world.add(g, top);
}
/* ruang rapat: x -2.5..4.0, z -10..-4.5 (buka di z=-4.5 dekat x 2..3.6) */
glassWall('x', -2.5, -10, -4.5); glassWall('x', 4.0, -10, -4.5);
glassWall('z', -4.5, -2.5, 2.0); glassWall('z', -4.5, 3.6, 4.0);
const mtable = new THREE.Group(); world.add(mtable);
mtable.add(B(5.0, 0.9, 1.6, M(0xf4f1ea), -0.75, 0.62, -7.0));
mtable.add(B(5.2, 0.08, 1.75, M(0xc8945c), -0.75, 1.1, -7.0));
[[-3.0,-8.1],[0.4,-8.1],[-2.4,-5.9],[0.4,-5.9]].forEach(([x, z]) => {
  mtable.add(B(0.72, 0.06, 0.72, M(0x7f8794), x, 0.46, z));
  mtable.add(B(0.72, 0.72, 0.08, M(0x7f8794), x, 0.82, z + (z < -7 ? 0.32 : -0.32)));
  mtable.add(CY(0.06, 0.06, 0.46, 10, M(0x5b6270), x, 0.23, z));
});
const tvMat = new THREE.MeshStandardMaterial({ color:0x11161f, emissive:0x3f78c9, emissiveIntensity:0.75, roughness:0.35 });
mtable.add(B(2.6, 0.06, 1.0, M(0x27303f), -0.75, 0.86, -9.4));
mtable.add(B(2.6, 1.5, 0.09, tvMat, -0.75, 1.9, -9.4));
/* papan tulis */
world.add(B(2.6, 1.35, 0.08, M(0xfdfdfb), -2.4, 1.9, -6.0));
world.add(B(2.6, 1.35, 0.08, M(0x8b8cf8, { emissive:0x2b2d6b, ei:0.4 }), -2.44, 1.9, -3.0));

/* lounge: x 5.2..16, z -10..-3.5 */
glassWall('x', 5.2, -10, -3.5);
glassWall('z', -3.5, 5.2, 9.5);
const rugMat = M(0x2f7f7a);
const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.2), rugMat);
rug.rotation.x = -Math.PI / 2; rug.position.set(10.4, 0.02, -6.6); rug.receiveShadow = true; world.add(rug);
(function lounge(){
  const sofa = M(0x3f5d8c), cush = M(0x5878a8);
  const g = new THREE.Group(); world.add(g);
  g.add(B(4.6, 0.42, 1.7, sofa, 10.6, 0.42, -4.4));
  g.add(B(4.6, 0.9, 0.34, sofa, 10.6, 0.95, -5.1));
  g.add(B(0.34, 0.62, 1.7, sofa, 8.4, 0.86, -4.4));
  g.add(B(0.34, 0.62, 1.7, sofa, 12.8, 0.86, -4.4));
  for (const x of [9.3, 10.6, 11.9]) g.add(B(1.2, 0.16, 1.4, cush, x, 0.7, -4.3));
  g.add(B(1.5, 0.36, 1.0, M(0xb98d5c), 10.6, 0.28, -6.9));
  g.add(SP(0.22, M(0xe8e2d4), 10.6, 0.5, -6.9));
  g.add(B(2.9, 0.34, 0.55, M(0x27303f), 10.6, 0.5, -9.5));
  g.add(B(3.0, 1.7, 0.09, tvMat, 10.6, 1.55, -9.5));
  const arm = B(1.3, 0.9, 1.3, M(0xc06a4f), 14.2, 0.55, -6.9); g.add(arm);
  g.add(B(1.3, 0.6, 0.28, M(0xc06a4f), 14.2, 1.2, -7.5));
})();

/* pantry: konter x 5.8..10.4 di z 2.2, galon di ujung kanan */
(function pantry(){
  world.add(B(4.6, 0.92, 0.85, M(0xf6f3ec), 8.1, 0.55, 2.2));
  world.add(B(4.8, 0.09, 1.0, M(0x3d4655), 8.1, 1.05, 2.15));
  world.add(B(2.0, 0.7, 0.5, M(0x2f3746), 7.0, 1.45, 2.6));                 // rak dinding
  const galon = new THREE.Group(); galon.position.set(11.0, 0, 1.9); world.add(galon);
  galon.add(B(0.52, 0.62, 0.5, M(0xdfe6ee), 0, 0.31, 0));
  galon.add(CY(0.2, 0.24, 0.44, 14, M(0x9fd8ff, { opacity:0.7, rough:0.2 }), 0, 0.86, 0));
  for (const x of [6.8, 8.4]) {
    world.add(CY(0.2, 0.2, 0.06, 12, M(0x8d6a45), x, 0.62, 1.5));
    world.add(CY(0.05, 0.05, 0.6, 10, M(0x5b6270), x, 0.31, 1.5));
    world.add(CY(0.22, 0.22, 0.05, 10, M(0x5b6270), x, 0.02, 1.5));
    world.add(B(0.08, 0.42, 0.08, M(0x5b6270), x, 0.82, 1.5));
  }
  world.add(SP(0.16, M(0x7c4a2d), 9.5, 1.2, 2.1));   // mangkuk buah
  world.add(B(0.42, 0.5, 0.34, M(0x2f3746), 5.4, 0.25, 0.4));
})();

/* ruang game: ping-pong + arkade (z 4..7.6) */
(function games(){
  const g = new THREE.Group(); world.add(g);
  g.add(B(2.8, 0.08, 1.6, M(0x1f6f4a), 9.0, 0.78, 5.8));
  g.add(B(2.9, 0.45, 1.7, M(0x14523a), 9.0, 0.55, 5.8));
  g.add(B(0.06, 0.5, 1.75, M(0xf2f2ef), 9.0, 1.2, 5.8));
  [-1.6, 1.6].forEach(d => { g.add(CY(0.06, 0.06, 0.78, 8, M(0x4a5160), 9.0 + d, 0.39, 5.8));
    g.add(B(0.9, 0.05, 0.05, M(0xd94f3d), 9.0 + d * 1.9, 0.8, 5.8)); });
  for (const [x, z, ry] of [[15.2, 5.0, -Math.PI / 2], [15.2, 6.5, -Math.PI / 2]]) {
    const arc = new THREE.Group(); arc.position.set(x, 0, z); arc.rotation.y = ry; g.add(arc);
    arc.add(B(1.0, 1.85, 0.7, M(0x2b2f3a), 0, 0.93, 0));
    arc.add(B(0.86, 0.62, 0.06, new THREE.MeshStandardMaterial({ color:0x0a0d13, emissive:0x8b8cf8, emissiveIntensity:0.9 }), 0, 1.5, -0.34));
    arc.add(B(1.02, 0.1, 0.72, M(0x1b1f27), 0, 1.9, 0));
  }
  g.add(B(1.2, 0.4, 1.2, M(0x6d5b8c), 12.4, 0.2, 6.6));
  g.add(B(1.4, 0.9, 0.4, M(0x3b4557), 13.6, 0.45, 7.2));
})();

/* resepsionis di area depan-kiri (mengisi ruang kosong) */
(function reception(){
  const g = new THREE.Group(); world.add(g);
  g.add(B(3.2, 0.92, 0.85, M(0xf7f5f0), -12, 0.46, 7.15));
  g.add(B(3.5, 0.09, 1.0, M(0xc8945c), -12, 0.97, 7.1));
  g.add(B(1.9, 0.5, 0.09, M(0x132033, { emissive:0x5eead4, ei:0.5 }), -12, 1.45, 7.6));
  g.add(CY(0.08, 0.08, 0.5, 10, M(0x4a5160), -12, 0.25, 6.7));
  g.add(B(0.5, 0.06, 0.4, M(0x2b3240), -12, 1.06, 7.15));
  /* kursi tamu menghadap konter */
  for (const x of [-13.4, -10.6]) {
    g.add(B(0.85, 0.12, 0.85, M(0x59606e), x, 0.5, 5.6));
    g.add(B(0.85, 0.7, 0.12, M(0x59606e), x, 0.86, 5.2));
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]])
      g.add(CY(0.05, 0.05, 0.5, 8, M(0x454c58), x + dx, 0.25, 5.6 + dz));
  }
  g.add(B(1.1, 0.42, 0.7, M(0xb98d5c), -12, 0.21, 5.6));
  g.add(B(0.34, 0.24, 0.26, M(0xd94f3d), -12.2, 0.58, 5.6));
  g.add(B(0.3, 0.24, 0.26, M(0x3f7fd9), -11.85, 0.58, 5.55));
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
})();

/* meja kolaborasi di tengah ruang (mengisi lantai yang tadinya kosong) */
(function kolab(){
  const g = new THREE.Group(); world.add(g);
  const px = -1.2, pz = 1.1;
  g.add(B(5.6, 0.035, 3.2, M(0x2f3d55, { rough:0.95 }), px, 0.02, pz));      // permadani
  g.add(B(1.4, 0.06, 1.2, M(0xc8945c), px, 0.04, pz));                       // aksen permadani
  g.add(B(2.9, 0.09, 1.2, M(0xc8945c), px, 0.75, pz));                       // papan meja
  g.add(B(0.9, 0.66, 0.16, M(0x4a5160), px - 0.9, 0.38, pz));                // kaki meja
  g.add(B(0.9, 0.66, 0.16, M(0x4a5160), px + 0.9, 0.38, pz));
  /* kursi mengelilingi meja */
  for (const [dx, dz] of [[-1.0, -0.95], [0.0, -0.95], [1.0, -0.95], [-1.0, 0.95], [0.0, 0.95], [1.0, 0.95]]) {
    const ch = new THREE.Group(); ch.position.set(px + dx, 0, pz + dz); g.add(ch);
    ch.add(B(0.62, 0.09, 0.62, M(0x59606e), 0, 0.46, 0));
    ch.add(B(0.62, 0.62, 0.09, M(0x59606e), 0, 0.78, dz > 0 ? 0.27 : -0.27));
    ch.add(B(0.62, 0.08, 0.09, M(0x4a5160), 0, 0.8, dz > 0 ? -0.27 : 0.27));
    for (const [ax, az] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]])
      ch.add(CY(0.035, 0.035, 0.45, 8, M(0x454c58), ax, 0.23, az));
  }
  /* laptop + cangkir + papan tulis kecil di atas meja */
  g.add(B(0.44, 0.03, 0.3, M(0x2b3240), px - 0.8, 0.81, pz - 0.2));
  g.add(B(0.44, 0.28, 0.02, M(0x353d4c, { emissive:0x8b8cf8, ei:0.25 }), px - 0.8, 0.94, pz - 0.35));
  g.add(B(0.4, 0.02, 0.28, M(0x2b3240), px + 0.75, 0.81, pz + 0.22));
  g.add(B(0.4, 0.26, 0.02, M(0x353d4c, { emissive:0x5eead4, ei:0.22 }), px + 0.75, 0.92, pz + 0.35));
  for (const [cx2, cz2] of [[px - 0.3, pz + 0.3], [px + 0.25, pz - 0.32]])
    g.add(CY(0.07, 0.06, 0.1, 10, M(0xf2f2ef), cx2, 0.85, cz2));
  g.add(SP(0.14, M(0x7c4a2d), px + 0.05, 0.82, pz));
  /* lampu berdiri di sudut meja */
  g.add(CY(0.04, 0.04, 1.5, 8, M(0x454c58), px - 2.6, 0.75, pz + 1.3));
  g.add(CY(0.24, 0.24, 0.04, 10, M(0x454c58), px - 2.6, 0.02, pz + 1.3));
  g.add(CY(0.14, 0.2, 0.26, 12, M(0xffe3b8, { emissive:0xffd9a0, ei:0.3 }), px - 2.6, 1.58, pz + 1.3));
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
})();

/* tanaman + permadani ruang rapat */
function plant(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
  g.add(CY(0.3 * s, 0.24 * s, 0.42 * s, 12, M(0xa8632f), 0, 0.21 * s, 0));
  const leaf = M(0x3f9a52);
  for (let i = 0; i < 5; i++) {
    const b = SP(0.3 * s, leaf, rand(-0.2, 0.2) * s, (0.62 + i * 0.2) * s, rand(-0.2, 0.2) * s, 10);
    b.scale.set(1, 0.6, 1); g.add(b);
  }
  return g;
}
plant(-15.1, -9.2); plant(-3.2, 6.8); plant(5.0, 7.2); plant(15.2, -8.6, 1.2);
plant(15.2, 0.4); plant(-5.4, 2.2, 0.85); plant(-15.2, 6.9, 1.15); plant(-8.2, 7.3, 0.9);
plant(2.2, 7.2, 1.05); plant(-15.2, 2.0, 0.75);

/* pohon di halaman: samping barat, belakang, samping timur */
tree(-24, -13, 1.15); tree(-29, -3, 1.0); tree(-22, 4, 0.85);
tree(-9, -18, 1.25); tree(4, -20, 1.05); tree(17, -15, 1.2);
tree(24, -6, 1.1); tree(22, 4, 0.9); tree(25, 25, 0.95);
tree(-26, 24, 1.0); tree(30, -16, 1.0);
const mrug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), M(0x8d4a3f));
mrug.rotation.x = -Math.PI / 2; mrug.position.set(-0.6, 0.02, -7.0); mrug.receiveShadow = true; world.add(mrug);

/* -------------------------------------------------------- perabot meja --- */
const MON = new THREE.MeshStandardMaterial({ color:0x10151d, emissive:0x5eead4, emissiveIntensity:0.85, roughness:0.28 });
const MON2 = new THREE.MeshStandardMaterial({ color:0x10151d, emissive:0x8b8cf8, emissiveIntensity:0.8, roughness:0.28 });
DESKS.forEach((d, i) => {
  const g = new THREE.Group(); world.add(g);
  g.add(B(2.4, 0.07, 1.2, M(0xdcb27e, { rough:0.6 }), d.x, 0.75, d.z));
  g.add(B(2.2, 0.68, 1.0, M(0xf7f5f0), d.x, 0.37, d.z));
  g.add(CY(0.05, 0.05, 0.34, 8, M(0x4a5160), d.x, 0.92, d.z - 0.34));
  const scr = B(1.0, 0.6, 0.05, i % 2 ? MON2 : MON, d.x, 1.24, d.z - 0.3);
  scr.rotation.x = -0.09; g.add(scr);
  g.add(B(0.72, 0.03, 0.24, M(0x2b3240), d.x, 0.8, d.z + 0.34));
  g.add(B(0.16, 0.03, 0.22, M(0x2b3240), d.x + 0.7, 0.8, d.z + 0.34));
  g.add(CY(0.075, 0.065, 0.13, 12, M(i % 2 ? 0x8b8cf8 : 0x5eead4), d.x - 1.02, 0.85, d.z - 0.36));
  /* kursi */
  g.add(B(0.66, 0.08, 0.66, M(0x59606e), d.x, 0.48, d.seatZ));
  g.add(B(0.66, 0.62, 0.09, M(0x59606e), d.x, 0.8, d.seatZ - 0.3));
  g.add(CY(0.06, 0.06, 0.48, 8, M(0x454c58), d.x, 0.24, d.seatZ));
  g.add(CY(0.3, 0.3, 0.05, 10, M(0x454c58), d.x, 0.03, d.seatZ));
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
});

/* ------------------------------------------------------------ karakter --- */
const SKIN = [0xf0c39a, 0xe0a878, 0xc98f62];
function buildAgent(a, i) {
  const g = new THREE.Group();
  const suit = M(a.color, { rough:0.55 });
  const dark = M(0x232a36);
  const skin = M(SKIN[i % SKIN.length]);
  const lift = new THREE.Group(); g.add(lift);
  const legs = new THREE.Group(); lift.add(legs);
  legs.add(B(0.17, 0.62, 0.2, dark, -0.13, 0.31, 0), B(0.17, 0.62, 0.2, dark, 0.13, 0.31, 0));
  legs.add(B(0.19, 0.09, 0.28, M(0x14181f), -0.13, 0.05, 0.03), B(0.19, 0.09, 0.28, M(0x14181f), 0.13, 0.05, 0.03));
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 5, 14), suit);
  torso.position.y = 1.03; lift.add(torso);
  lift.add(B(0.5, 0.1, 0.32, M(0x1c2230), 0, 0.8, 0));
  const arms = new THREE.Group(); lift.add(arms);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4, 4, 10), suit);
  armL.position.set(-0.31, 1.0, 0);
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4, 4, 10), suit);
  armR.position.set(0.31, 1.0, 0);
  arms.add(armL, armR);
  const head = SP(0.215, skin, 0, 1.5, 0, 16); lift.add(head);
  const hair = SP(0.225, M(0x1b1f26), 0, 1.54, -0.01, 16); hair.scale.set(1, 0.78, 1); lift.add(hair);
  const eyeMat = M(0x14181f); // mata menghadap +z (ke arah kamera)
  lift.add(SP(0.032, eyeMat, -0.075, 1.5, 0.2, 8), SP(0.032, eyeMat, 0.075, 1.5, 0.2, 8));
  lift.add(B(0.3, 0.06, 0.05, M(0x8a4a3c), 0, 1.42, 0.2));
  /* penanda di atas kepala (mudah diklik) */
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 10), M(a.color, { emissive:a.color, ei:0.5 }));
  pin.position.y = 2.15; pin.rotation.x = Math.PI; g.add(pin);
  g.userData = { agent:a, lift, legs, arms, torso, head, pin };
  g.traverse(o => { o.castShadow = true; o.receiveShadow = o.receiveShadow ?? false; });
  g.castShadow = true;
  return g;
}

/* ------------------------------------------------------- graf jalan ------- */
const N = {};
const nn = (id, x, z, kind = 'lane') => (N[id] = { id, x, z, kind, adj:[] });
/* lorong utama */
nn('n0', -15.4, -1.8); nn('n1', -11, -1.8); nn('n2', -7.5, -1.8); nn('n3', -3.5, -1.8);
nn('n4', 0.5, -1.8); nn('n5', 4.6, -1.8); nn('n6', 8.5, -1.8); nn('n7', 13.4, -1.8);
/* lorong depan-belakang */
nn('s0', -15.4, 3.4); nn('s1', -11, 3.4); nn('s2', -7.5, 3.4); nn('s3', -3.5, 3.4);
nn('s4', 0.5, 3.4); nn('s5', 4.6, 3.4); nn('s6', 8.5, 3.4); nn('s7', 13.4, 3.4);
/* lorong samping area kerja */
nn('wL1', -15.4, -8.6); nn('wL2', -15.4, -4.6); nn('wL3', -15.4, -1.8);
nn('wR1', -5.0, -8.6); nn('wR2', -5.0, -4.6); nn('wR3', -5.0, -1.8);
nn('wB1', -11, -8.6); nn('wB2', -7.5, -8.6); nn('wF1', -11, -4.6); nn('wF2', -7.5, -4.6);
/* area depan gedung */
nn('f1', -11, 6.4); nn('f2', -4, 6.4); nn('f3', 0.5, 6.4); nn('f4', 4.6, 6.4);
/* plaza & jalan */
nn('pl_w', -11, 9.6); nn('pl_m', 0.5, 9.6); nn('pl_e', 10, 9.6); nn('pl_f', 4.2, 10.6);
nn('al1', -18.8, 6.4); nn('al2', -19.2, 3.4); nn('al3', -18.8, 0.0);
nn('al4', -19.2, -3.4); nn('al5', -18.8, -6.6);
/* ruang rapat */
nn('mr1', 3.0, -3.0); nn('mr2', 3.0, -1.8); nn('mr3', 3.0, -5.6); nn('mr4', 3.0, -8.4);
/* lounge */
nn('lg1', 4.6, -4.9); nn('lg2', 6.4, -4.9); nn('lg3', 9.5, -8.4); nn('lg4', 13.0, -8.4);
/* pantry */
nn('pt1', 12.6, 2.6); nn('pt2', 12.6, 0.4); nn('pt3', 11.6, 1.0); nn('pt4', 8.6, 0.6); nn('pt5', 5.9, 0.6);
/* ruang game */
nn('gm1', 6.3, 4.6); nn('gm2', 9.0, 4.5); nn('gm3', 12.0, 4.6); nn('gm4', 6.9, 5.8);
nn('gm5', 11.2, 5.8); nn('gm6', 13.6, 5.2); nn('gm7', 12.6, 6.6);

const link = (a, b) => { N[a].adj.push(N[b]); N[b].adj.push(N[a]); };
[['n0','n1'],['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],['n5','n6'],['n6','n7'],
 ['s0','s1'],['s1','s2'],['s2','s3'],['s3','s4'],['s4','s5'],['s5','s6'],['s6','s7'],
 ['n0','wL3'],['wL3','wL2'],['wL2','wL1'],['wL1','wB1'],['wB1','wB2'],['wB2','wR1'],
 ['wR1','wR2'],['wR2','wR3'],['n3','wR3'],['wL2','wF1'],['wF1','wF2'],['wF2','wR2'],
 ['n0','s0'],['n5','s5'],['s5','s6'],['n7','s7'],
 ['f1','f2'],['f2','f3'],['f3','f4'],['f3','pl_m'],['f1','pl_w'],['f4','pl_e'],
 ['pl_w','pl_m'],['pl_m','pl_e'],['pl_m','pl_f'],
 ['f1','al1'],['al1','al2'],['al2','al3'],['al3','al4'],['al4','al5'],
 ['mr2','mr1'],['mr1','mr3'],['mr3','mr4'],['mr2','n4'],
 ['lg1','lg2'],['lg2','lg3'],['lg3','lg4'],['lg1','n5'],
 ['s7','pt1'],['pt1','pt2'],['pt2','pt3'],['pt2','pt4'],['pt4','pt5'],
 ['s6','gm1'],['gm1','gm2'],['gm2','gm3'],['gm2','gm4'],['gm4','gm5'],['gm5','gm6'],['gm6','gm7']].forEach(([a,b]) => link(a, b));
/* kursi agen terhubung ke lorong */
DESKS.forEach((d, i) => {
  const id = 'desk' + i, side = d.z < -6 ? 'wL1' : 'wL2';
  nn(id, d.x, d.seatZ, 'seat');
  const leftId = d.x < -11 ? 'wL1' : d.x < -8 ? 'wB1' : 'wB2';
  if (d.z < -6) link(id, ['wL1', 'wB1', 'wB2'].includes(leftId) ? leftId : 'wB2');
  else link(id, d.x < -11 ? 'wL2' : d.x < -8 ? 'wF1' : 'wF2');
});
/* node lorong area kerja sudah terhubung berurutan di atas */

function path(fromId, toId) {
  if (fromId === toId) return [N[toId]];
  const q = [[fromId]], seen = new Set([fromId]);
  while (q.length) {
    const p = q.shift(), last = p[p.length - 1];
    for (const nb of N[last].adj) {
      if (seen.has(nb.id)) continue;
      if (nb.id === toId) return [...p.slice(1).map(i => N[i]), nb];
      seen.add(nb.id); q.push([...p, nb.id]);
    }
  }
  return [N[toId]];
}

/* ------------------------------------------------------------- agen ------ */
const CHARS = [];
const KEGIATAN = [
  { node:'pt2', msg:'Ambil air dari galon 💧', dur:6 },
  { node:'pt4', msg:'Ngopi sebentar ☕', dur:9 },
  { node:'pt1', msg:'Cek stok di pantry', dur:8 },
  { node:'gm2', msg:'Main ping-pong 🏓', dur:11 },
  { node:'gm6', msg:'Mabar arkade 🎮', dur:10 },
  { node:'lg2', msg:'Nonton TV di lounge 📺', dur:10 },
  { node:'lg4', msg:'Rebahan di sofa 😌', dur:13 },
  { node:'mr3', msg:'Cek papan tulis ruang rapat', dur:7 },
  { node:'al2', msg:'Beli bakso di gerobak 🍜', dur:14 },
  { node:'al5', msg:'Ngopi di sepeda kopi ☕', dur:12 },
  { node:'pl_f', msg:'Lihat bendera di plaza 🌅', dur:9 },
];
const KERJA_MSG = ['Menyusun laporan pagi…', 'Membaca pesan masuk…', 'Menjalankan perintah terminal…',
  'Merapikan memori sesi…', 'Menyiapkan ringkasan untuk Bowie…', 'Mencari bahan di web…'];

CREW.forEach((a, i) => {
  const g = buildAgent(a, i);
  const d = DESKS[a.desk];
  world.add(g);
  const ch = { a, g, node:'desk' + a.desk, target:null, route:null, speed:2.1, bob:rand(0,6),
    busy:0, msg:'', msgT:0, yaw:0, sitting:a.state === 'work', next:rand(3, 8) };
  if (a.state === 'work') { g.position.set(d.x, 0.34, d.seatZ); setPose(ch, true); ch.yaw = Math.PI; }
  else if (a.state === 'idle') { g.position.set(d.x, 0, d.seatZ); ch.yaw = Math.PI; }
  else { g.position.set(d.x + 1.7, 0, d.seatZ - 0.4); g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.42; } }); }
  g.rotation.y = ch.yaw;
  CHARS.push(ch);
});

function setPose(ch, sit) {
  ch.sitting = sit;
  ch.g.userData.legs.visible = !sit;
  ch.g.userData.lift.position.y = sit ? -0.36 : 0;
  ch.g.userData.lift.rotation.x = sit ? -0.12 : 0;
}

/* label HTML di atas kepala */
const labels = CHARS.map(ch => {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.style.cssText = `position:fixed;z-index:12;pointer-events:none;transform:translate(-50%,-100%);
    font:600 11px/1.2 Inter,system-ui,sans-serif;color:#e7eef7;text-align:center;white-space:nowrap;
    transition:opacity .3s;text-shadow:0 2px 8px rgba(0,0,0,.85)`;
  el.innerHTML = `<div class="nm" style="display:inline-block;background:rgba(10,14,20,.78);cursor:pointer;
      border:1px solid rgba(148,163,184,.22);border-radius:8px;padding:3px 8px;backdrop-filter:blur(6px)">
      <span style="color:#${ch.a.color.toString(16).padStart(6, '0')}">●</span> ${ch.a.name}</div>
    <div class="ms" style="display:none;margin-top:4px;background:rgba(10,14,20,.9);border:1px solid rgba(94,234,212,.28);
      border-radius:9px;padding:5px 9px;font-weight:500;font-size:10.5px;max-width:230px;white-space:normal"></div>`;
  /* nama di label juga bisa diklik: sasaran lebih besar daripada badan agen */
  const nmBtn = el.querySelector('.nm');
  nmBtn.style.pointerEvents = 'auto';
  nmBtn.addEventListener('pointerdown', e => e.stopPropagation());
  nmBtn.addEventListener('pointerup', e => { e.stopPropagation(); openAgent(ch); });
  document.body.appendChild(el);
  return el;
});

/* -------------------------------------------------------------- kontrol -- */
const view = { r:34, theta:-0.62, phi:0.84, tx:0, ty:1.1, tz:-0.6, tr:34, tth:-0.62, tph:0.84, ttx:0, tty:1.1, ttz:-0.6 };
const DEF = { r:34, theta:-0.62, phi:0.84, tx:0, ty:1.1, tz:-0.6 };
let dragging = 0, lastX = 0, lastY = 0, moved = 0, panMode = false;

renderer.domElement.addEventListener('pointerdown', e => {
  renderer.domElement.setPointerCapture(e.pointerId);
  dragging = (e.button === 2 || panMode || e.shiftKey) ? 2 : 1; lastX = e.clientX; lastY = e.clientY; moved = 0;
  stopTour();
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (dragging === 1) { view.tth -= dx * 0.006; view.tph = Math.min(1.35, Math.max(0.16, view.tph - dy * 0.005)); }
  else {
    const s = view.tr * 0.0016, sn = Math.sin(view.tth), cs = Math.cos(view.tth);
    view.ttx += (dx * cs - dy * sn) * s; view.ttz += (dx * sn + dy * cs) * s;
    view.ttx = Math.min(48, Math.max(-48, view.ttx)); view.ttz = Math.min(40, Math.max(-40, view.ttz));
  }
});
const endDrag = e => { if (dragging === 1 && moved < 6) pickAgent(e); dragging = 0; };
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault(); stopTour();
  view.tr = Math.min(78, Math.max(9, view.tr * (1 + Math.sign(e.deltaY) * 0.11)));
}, { passive:false });
/* sentuh: cubit untuk zoom */
let pinch = 0;
renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) view.tr = Math.min(78, Math.max(9, view.tr * (pinch / d))); pinch = d; stopTour();
  }
}, { passive:true });
renderer.domElement.addEventListener('touchend', () => { pinch = 0; });

const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
let hovered = null;
function pickAgent(e, hover = false) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hits = ray.intersectObjects(CHARS.map(c => c.g), true);
  let ch = null;
  if (hits.length) { let o = hits[0].object; while (o && !o.userData.agent) o = o.parent; if (o) ch = CHARS.find(c => c.g === o); }
  if (hover) { hovered = ch; renderer.domElement.style.cursor = ch ? 'pointer' : panMode ? 'grab' : 'default'; return; }
  if (ch) openAgent(ch);
}
renderer.domElement.addEventListener('pointermove', e => { if (!dragging) pickAgent(e, true); });

/* kamera terbang ke titik */
let fly = null;
function stopTour() { tour = null; btnTour.classList.remove('on'); document.querySelector('#btnTour').blur(); }

/* --------------------------------------------------------------- panel --- */
const panel = document.getElementById('panel'), panelBody = document.getElementById('panelBody');
const el = id => document.getElementById(id);
const stTxt = { work:['Bekerja', 'work'], idle:['Berkeliling', 'idle'], plan:['Rencana', 'plan'] };
function openPanel() { panel.classList.add('open'); el('hint').classList.add('hide'); el('credit').classList.add('hide'); }
function closePanel() { panel.classList.remove('open'); el('hint').classList.remove('hide'); el('credit').classList.remove('hide'); }

function renderPanel(tab) {
  if (tab === 'stat') {
    panelBody.innerHTML = `
      <div class="grp"><h4>Ringkasan (contoh)</h4><div class="grid2">
        ${[['Agen aktif', '2'], ['Total kru', '6'], ['Sesi hari ini', HUD.sesi], ['Token', HUD.token]].map(([k, v]) =>
          `<div class="kv"><i>${k}</i><b>${v}</b></div>`).join('')}
      </div></div>
      <div class="grp"><h4>Perkakas sering dipakai</h4>
        ${HUD.tools.map(([n, v]) => `<div class="bar"><i>${n}</i><div class="track"><div class="fill" style="width:${v}%"></div></div><span>${v}</span></div>`).join('')}
      </div>
      <div class="grp"><h4>Pemakaian 7 hari (contoh)</h4>
        <div class="kv"><i>Pesan</i><b>1.234</b></div>
        <div class="kv"><i>Panggilan perkakas</i><b>567</b></div>
        <div class="kv"><i>Model teratas</i><b>deepseek-flash</b></div>
      </div>
      <div class="note">Angka di tab ini <b>contoh untuk demo</b>. Untuk statistik asli dari PC, lihat tab <b>Status</b>.</div>`;
  } else if (tab === 'lokal') {
    panelBody.innerHTML = `
      <div class="grp"><h4>Yang benar-benar berjalan di PC Bowie</h4>
        <div class="kv"><i>Agen 1</i><b>Luna · Hermes</b></div>
        <div class="kv"><i>Agen 2</i><b>Mona · OpenClaw</b></div>
        <div class="kv"><i>Gateway OpenClaw</i><b>127.0.0.1:18789</b></div>
        <div class="kv"><i>Model Luna</i><b>deepseek-flash</b></div>
        <div class="kv"><i>Model Mona</i><b>deepseek-v4-pro</b></div>
      </div>
      <div class="grp"><h4>Halaman ini</h4>
        <div class="kv"><i>Sifat</i><b>statis</b></div>
        <div class="kv"><i>Data</i><b>contoh / simulasi</b></div>
        <div class="kv"><i>Ukuran 3D</i><b>three.js, tanpa CDN</b></div>
      </div>
      <div class="note">Butuh versi yang membaca data <b>asli</b> dari PC? Ada tool bernama
        <b>Ruang</b> yang dipasang lokal (jalan di 127.0.0.1) dan membaca direktori Hermes/OpenCode.
        Bilang saja kalau mau dipasang.</div>`;
  } else {
    panelBody.innerHTML = `<div class="grp"><h4>Kru kantor</h4>${CREW.map((a, i) => {
      const [t, c] = stTxt[a.state];
      return `<button class="person" data-i="${i}">
        <span class="av" style="background:#${a.color.toString(16).padStart(6, '0')}">${a.ini}</span>
        <span class="meta"><span class="nm">${a.name}</span><span class="rl">${a.role}</span></span>
        <span class="st ${c}">${t}</span></button>`;
    }).join('')}</div>
    <div class="grp"><h4>Ikhtisar</h4>
      <div class="kv"><i>Gateway</i><b>${HUD.gateway}</b></div>
      <div class="kv"><i>Tugas</i><b>${HUD.tugas}</b></div>
      <div class="kv"><i>Jadwal</i><b>${HUD.cron}</b></div>
      <div class="kv"><i>Kanal</i><b>${HUD.saluran}</b></div>
    </div>
    <div class="note">Klik satu nama untuk melihat memori agen dan <b>mengarahkan kamera</b> ke mejanya.</div>`;
    panelBody.querySelectorAll('.person').forEach(b => b.onclick = () => {
      const ch = CHARS[+b.dataset.i]; focusAgent(ch); openAgent(ch);
    });
  }
  panelBody.querySelectorAll('.tab').forEach(() => {});
}
function focusAgent(ch) {
  const p = ch.g.position;
  view.ttx = p.x * 0.55; view.ttz = p.z * 0.5; view.tty = 1.2;
  view.tth = Math.atan2(p.x, p.z + 26) + 0.15; view.tph = 1.02; view.tr = 22;
  fly = null;
}
function openAgent(ch) {
  const a = ch.a, [t, c] = stTxt[a.state];
  el('dlg').innerHTML = `
    <div class="hd"><span class="av" style="background:#${a.color.toString(16).padStart(6, '0')}">${a.ini}</span>
      <div><h3>${a.name}</h3><div class="sub">${a.role}</div></div>
      <span class="st ${c}" style="margin-left:auto">${t}</span></div>
    <div class="bd">
      <div class="kv"><i>Model</i><b>${a.model}</b></div>
      <div class="kv"><i>Platform</i><b style="font-size:11.5px">${a.plat}</b></div>
      <div class="kv"><i>Posisi</i><b>${a.loc}</b></div>
      <div class="kv"><i>Aktivitas</i><b style="font-size:11.5px">${ch.msg || a.task}</b></div>
      <div class="kv"><i>Catatan</i><b style="font-size:11.5px">${a.sejak}</b></div>
      ${a.state === 'plan' ? '<div class="note">Agen ini masih <b>rencana</b> — belum dijalankan, menunggu izin Bowie.</div>' : ''}
    </div>
    <div class="ft"><button class="btn pri" id="dFollow">Dekatkan kamera</button><button class="btn" id="dClose">Tutup</button></div>`;
  el('scrim').classList.add('open');
  el('dFollow').onclick = () => { focusAgent(ch); el('scrim').classList.remove('open'); };
  el('dClose').onclick = () => el('scrim').classList.remove('open');
}
el('scrim').onclick = e => { if (e.target === el('scrim')) el('scrim').classList.remove('open'); };

panel.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  panel.querySelectorAll('.tab').forEach(x => x.classList.remove('on')); t.classList.add('on'); renderPanel(t.dataset.tab);
});
el('btnPanel').onclick = () => { panel.classList.contains('open') ? closePanel() : (openPanel(), renderPanel('kru')); };
el('btnClose').onclick = closePanel;
renderPanel('kru');

/* -------------------------------------------------------------- siang ---- */
let night = false;
function applyLight() {
  scene.background.copy(night ? SKY.night : SKY.day);
  scene.fog.color.copy(night ? SKY.night : SKY.day);
  scene.fog.near = night ? 80 : 105; scene.fog.far = night ? 190 : 240;
  renderer.toneMappingExposure = night ? 1.24 : 1.06;
  sun.intensity = night ? 0.26 : 1.15;
  sun.color.set(night ? 0x9fb8e8 : 0xfff2d8);
  hemi.intensity = night ? 0.26 : 0.62;
  hemi.color.set(night ? 0x33517d : 0xcfe8ff);
  ambient.intensity = night ? 0.22 : 0.2;
  nightLights.forEach(l => { l.visible = night; l.intensity = (l.userData.base || 20) * (night ? 1.55 : 1); });
  groundMat.color.setHex(night ? 0x3f5c48 : 0xffffff);
  ceilLights.forEach(p => p.material.emissiveIntensity = night ? 1.25 : 0.0);
  el('lightIcon').textContent = night ? '☀️' : '🌙';
  el('btnLight').title = night ? 'Ganti ke siang' : 'Ganti ke malam';
  el('btnLight').querySelector('.lbl') && (el('btnLight').querySelector('.lbl').textContent = night ? ' Siang' : ' Malam');
}
applyLight();
el('btnLight').onclick = () => { night = !night; applyLight(); };

el('btnReset').onclick = () => {
  stopTour(); fly = null;
  view.tr = DEF.r; view.tth = DEF.theta; view.tph = DEF.phi; view.ttx = DEF.tx; view.tty = DEF.ty; view.ttz = DEF.tz;
};

/* ---------------------------------------------------------------- tur ---- */
let tour = null;
const TOUR = [
  { p:[-30, 26, 40], l:[0, 1, 0], d:5.0 },
  { p:[-8, 9, -1], l:[-11, 1, -5], d:5.5 },
  { p:[6, 8, 6], l:[10, 1, -6], d:5.5 },
  { p:[13, 7, 12], l:[10, 1, 6], d:5.0 },
  { p:[0, 34, 46], l:[0, 1, 0], d:6.0 },
];
const btnTour = el('btnTour');
btnTour.onclick = () => {
  if (tour) { stopTour(); return; }
  tour = { i:0, t:0, from:camera.position.clone(), fl:new THREE.Vector3(view.ttx, view.tty, view.ttz) };
  btnTour.classList.add('on');
};
function updTour(dt) {
  if (!tour) return;
  const leg = TOUR[tour.i]; tour.t += dt;
  const k = Math.min(1, tour.t / leg.d), e = k < .5 ? 2 * k * k : 1 - 2 * (1 - k) ** 2;
  camera.position.lerpVectors(tour.from, new THREE.Vector3(...leg.p), e);
  const look = new THREE.Vector3().lerpVectors(tour.fl, new THREE.Vector3(...leg.l), e);
  camera.lookAt(look); view.tx = look.x; view.ty = look.y; view.tz = look.z;
  if (k >= 1) { tour.i = (tour.i + 1) % TOUR.length; tour.from.copy(camera.position); tour.fl.copy(look); tour.t = 0; }
}

/* ----------------------------------------------------------------- HUD --- */
el('chips').innerHTML = [
  ['Kru aktif', HUD.kru], ['Gateway', HUD.gateway], ['Tugas', HUD.tugas], ['Jadwal', HUD.cron],
].map(([k, v]) => `<div class="chip"><u>${k}</u><b>${v}</b></div>`).join('')
  + `<div class="chip demo"><u>Mode</u><b>DEMO</b></div>`;

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { el('scrim').classList.remove('open'); closePanel(); }
  if (e.key === 'r') el('btnReset').click();
  if (e.key === 'n') el('btnLight').click();
  const step = 2.2;
  if (e.key === 'ArrowLeft') view.ttx -= step; if (e.key === 'ArrowRight') view.ttx += step;
  if (e.key === 'ArrowUp') view.ttz -= step; if (e.key === 'ArrowDown') view.ttz += step;
});

/* --------------------------------------------------------------- loop ---- */
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function updateAgent(ch, dt, t) {
  const a = ch.a;
  if (a.state === 'plan') { ch.msg = a.task; return; }
  if (a.state === 'work') {
    ch.msgT -= dt;
    if (ch.msgT <= 0) { ch.msg = pick(KERJA_MSG); ch.msgT = rand(7, 13); }
    ch.bob += dt;
    ch.g.position.y = 0.34 + Math.sin(ch.bob * 1.6) * 0.012;
    return;
  }
  /* idle: jalan-jalan */
  if (ch.route && ch.route.length) {
    const n = ch.route[0];
    const dx = n.x - ch.g.position.x, dz = n.z - ch.g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.09) {
      ch.route.shift(); ch.node = n.id;
      if (!ch.route.length) { ch.target = null; ch.busy = ch.busy || 6; }
    } else {
      const sp = ch.speed * dt;
      ch.g.position.x += (dx / dist) * Math.min(sp, dist);
      ch.g.position.z += (dz / dist) * Math.min(sp, dist);
      ch.yaw = damp(ch.yaw, Math.atan2(dx, dz), 9, dt);
      ch.bob += dt * 1.6;
      ch.g.position.y = Math.abs(Math.sin(ch.bob * 5)) * 0.055;
      ch.g.userData.legs.rotation.x = Math.sin(ch.bob * 5) * 0.5;
    }
  } else if (ch.busy > 0) {
    ch.busy -= dt; ch.g.position.y = 0;
    ch.g.userData.legs.rotation.x = 0;
  } else if (ch.target !== null) {
    /* catatan: cek harus "!== null", bukan truthy — indeks 0 (KEGIATAN[0]) itu falsy,
       jadi agen yang dapat undian kegiatan pertama tidak akan pernah berjalan */
    const k = KEGIATAN[ch.target];
    ch.route = path(ch.node, k.node); ch.msgT = k.dur;
  } else {
    ch.next -= dt;
    if (ch.next <= 0) {
      ch.next = rand(9, 18); ch.target = Math.floor(Math.random() * KEGIATAN.length);
      ch.msg = KEGIATAN[ch.target].msg;
    }
  }
  ch.g.rotation.y = ch.yaw;
}
function updateLabels() {
  CHARS.forEach((ch, i) => {
    const el2 = labels[i], p = ch.g.position;
    tmp.set(p.x, p.y + 2.35, p.z).project(camera);
    const vis = tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.25 && Math.abs(tmp.y) < 1.25;
    const inFront = camera.position.distanceTo(p) < 68 && vis;
    el2.style.opacity = inFront ? '1' : '0';
    if (!inFront) return;
    el2.style.left = (tmp.x * 0.5 + 0.5) * innerWidth + 'px';
    el2.style.top = (-tmp.y * 0.5 + 0.5) * innerHeight + 'px';
    const ms = el2.querySelector('.ms');
    const nm = el2.querySelector('.nm');
    const plan = ch.a.state === 'plan';
    nm.style.opacity = plan ? '0.62' : '1';
    const txt = ch.msg || '';
    if (txt && ms.textContent !== txt) ms.textContent = txt;
    /* agen rencana cukup nama saja: pesan panjangnya menumpuk jadi tidak terbaca */
    ms.style.display = plan ? 'none' : (ch.route && ch.route.length) ? 'none' : txt ? 'block' : 'none';
  });
}
function tick() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  CHARS.forEach(ch => updateAgent(ch, dt, t));
  if (fly) {
    fly.t += dt; const k = Math.min(1, fly.t / fly.dur), e = 1 - (1 - k) ** 3;
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    const look = new THREE.Vector3().lerpVectors(fly.l0 || new THREE.Vector3(view.tx, view.ty, view.tz), fly.l1, e);
    camera.lookAt(look);
    view.tx = look.x; view.ty = look.y; view.tz = look.z;
    if (k >= 1) fly = null;
  } else if (!tour) {
    view.r = damp(view.r, view.tr, 6, dt); view.theta = damp(view.theta, view.tth, 7, dt);
    view.phi = damp(view.phi, view.tph, 7, dt);
    view.tx = damp(view.tx, view.ttx, 7, dt); view.ty = damp(view.ty, view.tty, 7, dt);
    view.tz = damp(view.tz, view.ttz, 7, dt);
    const sp = Math.sin(view.phi), r = view.r;
    camera.position.set(view.tx + r * sp * Math.sin(view.theta), view.ty + r * Math.cos(view.phi), view.tz + r * sp * Math.cos(view.theta));
    camera.lookAt(view.tx, view.ty, view.tz);
  }
  updTour(dt);
  updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
requestAnimationFrame(tick);
setTimeout(() => el('load').classList.add('gone'), 450);
/* pegangan debug: dipakai skrip uji render (tidak memengaruhi tampilan) */
window.__ruang = { scene, camera, renderer, CHARS, view, THREE, ray, pickAgent };
