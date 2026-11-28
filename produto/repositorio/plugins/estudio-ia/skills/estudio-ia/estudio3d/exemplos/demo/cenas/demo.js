// cenas/demo.js — exemplo completo do Estúdio 3D (6 tomadas). Use como referência da API, não como molde visual:
// cada vídeo novo precisa de cenas próprias.
import { registrarTomada, E, quando, chaves, curva, prog, mix, ruido } from '/motor/nucleo.js';
import { THREE, palco, toon, plano, moverCamera, naTela } from '/motor/palco3d.js';
import { carimbo, cartela, etiqueta } from '/motor/desenho.js';
import { makePuppet, POSE, walkPose, posesAt } from '/kits/cartoon3d/bonecos.js';
import { street, bedroom } from '/kits/cartoon3d/cenarios.js';

// ---------- elenco (aparência fixa em todas as cenas) ----------
const HEROI = { skin: '#c99a72', top: 'sweater', topColor: '#3f7fbf', collar: '#f4f4f4', legColor: '#33384a', shoeColor: '#2a2020', hair: 'messy', hairColor: '#2a1a12', lids: 0.4 };
const PESQ_A = { skin: '#8a5a3a', top: 'coat', topColor: '#eef0f4', inner: '#4a6a8a', legColor: '#2a3a5a', shoeColor: '#2a2020', hair: 'curly', hairColor: '#1a1210', lids: 0.3 };
const PESQ_B = { skin: '#f0c8a0', top: 'sweater', topColor: '#e0a040', legColor: '#3a3a44', shoeColor: '#f0f0f0', shoes: 'sneakers', hair: 'short', hairColor: '#c8b890', lids: 0.35 };
const CONTA = { ...PESQ_B, topColor: '#d0503f' };
const OUVE = { ...PESQ_A, top: 'hoodie', topColor: '#3f9a7a' };

function boneco(cena, spec, x, z, giro = 0) { const p = makePuppet(spec); p.root.position.set(x, 0, z); p.root.rotation.y = giro; cena.add(p.root); return p; }
const piscar = (T, s = 0) => ((T + s) % 3.4) < 0.12;
const fala = (T, k = 1) => (0.35 + 0.55 * Math.abs(Math.sin(T * 14))) * k;

// ---------- S01: rua, o protagonista vem andando ----------
registrarTomada('S01', {
  criar() { const w = street(); const h = boneco(w.cena, HEROI, 0.35, -7); return { cena: w.cena, camera: w.camera, h }; },
  quadro({ camera, h }, { t, T, dur }) {
    const z = mix(-7, -1.6, curva.sai(prog(t, 0, dur))), ph = (z + 7) * 3.1;
    h.root.position.z = z;
    h.setPose(t < dur - 0.9 ? walkPose(ph, POSE.relaxed) : POSE.relaxed);
    h.setFace({ blink: piscar(T), smile: 0.35, look: t > dur - 1.4 ? [0, 0.05] : [0.2, -0.2] });
    moverCamera(camera, t, [[0, [0.9, 1.55, 4.2], [0.2, 1.25, -5]], [dur, [0.5, 1.5, 2.2], [0.3, 1.3, -1.6]]], { tremor: 0.015, T });
  },
});

// ---------- S02: laboratório, dois pesquisadores + cartela ----------
registrarTomada('S02', {
  criar() {
    const w = bedroom();
    const a = boneco(w.cena, PESQ_A, -0.75, -1.2, 0.9), b = boneco(w.cena, PESQ_B, 0.75, -1.2, -0.9);
    return { cena: w.cena, camera: w.camera, a, b };
  },
  quadro({ camera, a, b }, { t, T, dur }) {
    a.setPose(posesAt(t, [[0, POSE.relaxed], [0.8, POSE.offer], [2.4, POSE.relaxed]]));
    b.setPose(posesAt(t, [[0, POSE.crossArms], [2.0, POSE.point]]));
    a.setFace({ blink: piscar(T), talk: t < 2 ? fala(T) : 0, smile: 0.3, look: [0.6, 0] });
    b.setFace({ blink: piscar(T, 1.1), talk: t > 2.2 ? fala(T, 0.8) : 0, look: [-0.6, 0], browUp: 0.5 });
    const ang = mix(-0.35, 0.25, curva.entraSai(prog(t, 0, dur)));
    moverCamera(camera, t, [[0, [Math.sin(ang) * 3.6, 1.6, -1.2 + Math.cos(ang) * 3.6], [0, 1.25, -1.2]]]);
  },
  sobre(g, { T, ini, fim }) { cartela(g, T, ini + 0.25, fim - 0.05, 'Universidade de Princeton', 'Stephens, Silbert e Hasson · 2010'); },
});

// ---------- S03 e S04: palco escuro com dois cérebros ----------
function palcoCerebros() {
  const p = palco({ clima: 'estudio', fov: 36, sombra: 6 });
  const chao = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), toon('#2c2850')); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; p.cena.add(chao);
  const luz = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), plano('#ffe8b0', { transparent: true, opacity: 0.12 })); luz.rotation.x = -Math.PI / 2; luz.position.y = 0.01; p.cena.add(luz);
  const conta = boneco(p.cena, CONTA, -1.25, 0, 1.25), ouve = boneco(p.cena, OUVE, 1.25, 0, -1.25);
  const cerebro = (x, cor) => {
    const g = new THREE.Group(); g.position.set(x, 2.35, 0);
    const m = toon(cor, { emissive: new THREE.Color(cor), emissiveIntensity: 0.35 });
    [[-0.09, 0, 0], [0.09, 0, 0]].forEach(([dx]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), m); s.scale.set(0.95, 0.85, 1.25); s.position.x = dx; g.add(s); });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), plano(cor, { transparent: true, opacity: 0.18, depthWrite: false })); g.add(halo);
    const pl = new THREE.PointLight(new THREE.Color(cor), 3, 3, 1.5); g.add(pl);
    p.cena.add(g); return { g, halo };
  };
  const c1 = cerebro(-1.25, '#ff7aa8'), c2 = cerebro(1.25, '#7ac8ff');
  const ondas = Array.from({ length: 5 }, () => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 40), plano('#fff2b0', { transparent: true, depthWrite: false })); r.rotation.y = Math.PI / 2; r.visible = false; p.cena.add(r); return r; });
  return { ...p, conta, ouve, c1, c2, ondas };
}
function animarPalco(e, t, T, sincronia) {
  e.conta.setPose(posesAt(t, [[0, POSE.openArms], [1.2, POSE.offer], [2.6, POSE.openArms], [3.8, POSE.point]]));
  e.ouve.setPose(POSE.relaxed);
  e.conta.setFace({ blink: piscar(T), talk: fala(T), smile: 0.4, look: [0.5, 0] });
  e.ouve.setFace({ blink: piscar(T, 1.3), look: [-0.5, 0.1], browUp: 0.3 + 0.4 * sincronia, smile: 0.2 + 0.5 * sincronia });
  const p1 = 1 + 0.1 * Math.sin(T * 6), p2 = 1 + 0.1 * Math.sin(T * 6 + (1 - sincronia) * 2.4);
  e.c1.g.scale.setScalar(p1); e.c2.g.scale.setScalar(p2);
  e.c1.g.position.y = 2.35 + 0.04 * Math.sin(T * 2); e.c2.g.position.y = 2.35 + 0.04 * Math.sin(T * 2 + 1);
  e.ondas.forEach((r, i) => {
    const u = (t * 0.7 + i / e.ondas.length) % 1; r.visible = sincronia > 0.05;
    r.position.set(mix(-1.05, 1.05, u), 2.35 + Math.sin(u * Math.PI) * 0.25, 0);
    r.scale.setScalar(0.6 + Math.sin(u * Math.PI) * 0.9); r.material.opacity = Math.sin(u * Math.PI) * 0.85 * sincronia;
  });
}
registrarTomada('S03', {
  criar: () => palcoCerebros(),
  quadro(e, { t, T, dur }) {
    animarPalco(e, t, T, 0);
    moverCamera(e.camera, t, [[0, [0, 1.8, 6.0], [0, 1.7, 0]], [dur, [0, 1.85, 5.0], [0, 1.75, 0]]]);
  },
  sobre(g, { T, ini }, e) {
    const a = curva.sai(prog(T, ini + 0.4, ini + 0.9));
    for (const [c, txt] of [[e.c1, 'quem conta'], [e.c2, 'quem ouve']]) { const s = naTela(e.camera, c.g.position); if (s.visivel) etiqueta(g, txt, s.x, s.y - 120, a); }
  },
});
registrarTomada('S04', {
  criar: () => palcoCerebros(),
  quadro(e, { t, T, dur }) {
    animarPalco(e, t, T, curva.sai(prog(t, 0.2, 1.6)));
    moverCamera(e.camera, t, [[0, [0.6, 2.2, 4.4], [0, 2.1, 0]], [dur, [-0.4, 2.3, 3.6], [0, 2.2, 0]]]);
  },
  sobre(g, { T }) { const em = quando('sincronia', T - 6) ?? T; carimbo(g, T, em - 0.1, 'SINCRONIA', { y: E.H * 0.2, cor: '#ffd84a' }); },
});

// ---------- S05: gráfico 3D ----------
registrarTomada('S05', {
  criar() {
    const p = palco({ clima: 'estudio', fov: 34, sombra: 5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 2.2), toon('#3a3466')); base.position.y = -0.06; base.receiveShadow = true; p.cena.add(base);
    const cores = ['#5ab0ff', '#62c8e8', '#7ad8b8', '#b8e070', '#ffd84a'];
    const barras = cores.map((c, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), toon(c)); b.position.set(-2.2 + i * 1.1, 0, 0); b.castShadow = true; p.cena.add(b); return b; });
    return { ...p, barras };
  },
  quadro(e, { t, dur }) {
    const alturas = [0.5, 0.9, 1.4, 2.0, 2.7];
    e.barras.forEach((b, i) => { const h = Math.max(0.02, alturas[i] * curva.volta(prog(t, 0.25 + i * 0.3, 0.75 + i * 0.3))); b.scale.y = h; b.position.y = h / 2; });
    const ang = mix(-0.25, 0.2, curva.entraSai(prog(t, 0, dur)));
    moverCamera(e.camera, t, [[0, [Math.sin(ang) * 7.5, 2.4, Math.cos(ang) * 7.5], [0, 1.2, 0]]]);
  },
  sobre(g, { T, ini, t }, e) {
    etiqueta(g, 'mais sincronia = mais compreensão', E.W * 0.36, E.H * 0.13, curva.sai(prog(t, 1.6, 2.1)), { tamanho: 44, fundo: 'rgba(20,16,40,.88)', borda: '#ffd84a' });
    const topo = naTela(e.camera, e.barras[4].position.clone().setY(e.barras[4].scale.y + 0.25));
    if (topo.visivel) etiqueta(g, '+ compreensão', topo.x, topo.y, curva.sai(prog(T, ini + 1.9, ini + 2.3)), { tamanho: 30, fundo: '#2f9a5a' });
  },
});

// ---------- S06: pergunta final ----------
registrarTomada('S06', {
  criar() { const w = street(); const h = boneco(w.cena, HEROI, 0, -1.8); return { cena: w.cena, camera: w.camera, h }; },
  quadro({ camera, h }, { t, T, dur }) {
    const onda = chaves(t, [[0, 0], [0.5, 1, curva.volta]]);
    h.setPose(onda > 0.5 ? POSE.wave : POSE.relaxed);
    h.root.rotation.z = 0.04 * Math.sin(T * 9) * onda;
    h.setFace({ blink: piscar(T), smile: 0.8, talk: 0, look: [0, 0.05], browUp: 0.4 });
    moverCamera(camera, t, [[0, [0.3, 1.6, 2.2], [0, 1.45, -1.8]], [dur, [0.1, 1.6, 1.5], [0, 1.5, -1.8]]], { tremor: 0.01, T });
  },
  sobre(g, { T, ini, fim }) {
    const em = quando('qual', ini) ?? ini + 0.8;
    carimbo(g, T, em, 'QUAL É A SUA?', { y: E.H * 0.13, tamanho: 96, sub: 'conta aqui nos comentários' });
    if (T > fim - 1.6) etiqueta(g, 'inscreva-se para mais', E.W * 0.78, E.H * 0.5, curva.sai(prog(T, fim - 1.6, fim - 1.2)), { fundo: '#d0303a' });
  },
});
