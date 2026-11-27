// QUARTO — noite (celular de madrugada, sono REM, sonhos) e manhã (despertador 7h, acordar descansado)
import { THREE, E, ease, prog, clamp, lerp, POSE, blendPose, posesAt, toon, texM, basic, BOX, V3, add, ctex, blinkAt, handleOf, puppet, HERO, C, plus, shk, shot, anchor, chip, slam, vignette } from '../_lib.js';
import { TEX, rbox, books, plant, curtain, frameArt } from '/kits/psique/props3d.js';
import { prop } from '/kits/psique/world3d.js';

const BED = { x: -0.6, top: 0.58, foot: -0.55 };
let Q = null;
const W = { build(T) {
  if (Q) return Q;
  const st = T.stage({ mood: 'night', fov: 40, fog: false, keyPos: [-8, 4, -1], keyColor: '#8aa0ff', keyIntensity: 0.6, ambient: 0.45, ambientSky: '#6a74a8', bloom: 0.5, bloomThreshold: 0.86, shadowSize: 5 });
  const sc = st.scene; sc.background = new THREE.Color('#06070e');
  add(sc, new THREE.PlaneGeometry(7, 7), texM(TEX.wood('#7a5a42', [3, 3])), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  const wall = texM(TEX.plaster('#8a92a8', [4, 2]));
  add(sc, BOX(7, 3.2, 0.1), wall, 0, 1.6, -3, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 7), wall, -3, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 7), wall, 3, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(7, 0.1, 7), '#3a3e4e', 0, 3.2, 0, 0, 0, 0, { shadow: false });
  for (const [w, d, x, z] of [[7, 0.06, 0, -2.94], [0.06, 7, -2.94, 0], [0.06, 7, 2.94, 0]]) add(sc, BOX(w, 0.12, d), '#e8e4dc', x, 0.06, z, 0, 0, 0, { shadow: false });
  // cama
  add(sc, rbox(1.75, 0.34, 2.25, 0.04), '#5a3e2e', BED.x, 0.17, -1.7); add(sc, rbox(1.85, 1.05, 0.12, 0.04), '#5a3e2e', BED.x, 0.6, -2.85); add(sc, rbox(1.65, 0.24, 2.12, 0.08), '#e8ecf4', BED.x, 0.46, -1.7);
  add(sc, rbox(0.62, 0.14, 0.4, 0.07), '#f4f4f8', BED.x - 0.38, 0.64, -2.5); add(sc, rbox(0.62, 0.14, 0.4, 0.07), '#f4f4f8', BED.x + 0.38, 0.64, -2.5);
  const blanket = add(sc, rbox(1.74, 0.34, 1.42, 0.1), '#3a5a8a', BED.x, 0.74, -1.18); add(blanket, BOX(1.76, 0.02, 0.2), '#e8ecf4', 0, 0.16, -0.62, 0, 0, 0, { shadow: false });
  // criado-mudo com despertador digital e abajur
  add(sc, rbox(0.52, 0.56, 0.46, 0.03), '#6a4a32', 0.7, 0.28, -2.55); add(sc, BOX(0.36, 0.02, 0.02), '#3a2a1a', 0.7, 0.42, -2.31);
  const ck = new THREE.Group(); ck.position.set(0.62, 0.6, -2.5); ck.rotation.y = 0.35; sc.add(ck); add(ck, rbox(0.24, 0.1, 0.09, 0.02), '#1a1a20', 0, 0.05, 0); const cv = ctex(256, 96); const scr = add(ck, new THREE.PlaneGeometry(0.2, 0.075), basic('#ffffff', { map: cv.t }), 0, 0.05, 0.047, 0, 0, 0, { shadow: false });
  const ckL = new THREE.PointLight(new THREE.Color('#ff4040'), 0.25, 1.2, 2); ckL.position.set(0.62, 0.7, -2.35); sc.add(ckL);
  add(sc, new THREE.CylinderGeometry(0.05, 0.07, 0.3, 12), '#d8c8a8', 0.86, 0.71, -2.62); const shade = add(sc, new THREE.CylinderGeometry(0.1, 0.15, 0.16, 16, 1, true), toon('#f0e0c0', { side: THREE.DoubleSide }), 0.86, 0.92, -2.62);
  const lampL = new THREE.PointLight(new THREE.Color('#ffc890'), 0, 4, 1.6); lampL.position.set(0.86, 0.95, -2.5); sc.add(lampL);
  // janela (noite/manhã) com cortinas
  const wn = ctex(256, 320), drawWin = (morning) => { const g = wn.g, gr = g.createLinearGradient(0, 0, 0, 320); if (morning) { gr.addColorStop(0, '#7ab4f0'); gr.addColorStop(1, '#ffe0b0'); } else { gr.addColorStop(0, '#060a24'); gr.addColorStop(1, '#1a2452'); } g.fillStyle = gr; g.fillRect(0, 0, 256, 320); if (!morning) { for (let i = 0; i < 50; i++) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect((i * 67) % 256, (i * 41) % 180, 1.5, 1.5); } g.fillStyle = '#f0f4ff'; g.beginPath(); g.arc(70, 70, 24, 0, 7); g.fill(); } else { g.fillStyle = 'rgba(255,250,220,.9)'; g.beginPath(); g.arc(190, 220, 40, 0, 7); g.fill(); } g.fillStyle = morning ? '#8a9ab8' : '#0a0e20'; for (let i = 0; i < 8; i++) g.fillRect(i * 34, 235 - (i % 3) * 30, 30, 120); g.fillStyle = morning ? '#c8d8f0' : '#ffd27a'; for (let i = 0; i < 18; i++) g.fillRect(4 + (i * 29) % 250, 250 + (i * 13) % 60, 5, 6); wn.t.needsUpdate = true; };
  drawWin(false); add(sc, new THREE.PlaneGeometry(1.2, 1.5), basic('#ffffff', { map: wn.t }), -2.94, 1.75, -0.6, 0, Math.PI / 2, 0, { shadow: false });
  for (const [h, d, y, z] of [[0.07, 1.34, 2.53, -0.6], [0.07, 1.34, 0.97, -0.6], [1.6, 0.07, 1.75, -1.24], [1.6, 0.07, 1.75, 0.04], [1.5, 0.04, 1.75, -0.6]]) add(sc, BOX(0.08, h, d), '#e8e0d4', -2.92, y, z);
  for (const zc of [-1.42, 0.22]) { const c = curtain(0.5, 2.1, '#2a3a5a'); c.position.set(-2.85, 1.85, zc); c.rotation.y = Math.PI / 2; sc.add(c); }
  const shaft = add(sc, new THREE.PlaneGeometry(1.1, 3.6), basic('#9ab4ff', { transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -1.9, 1.0, -0.6, -Math.PI / 2 + 0.45, 0, -0.9, { shadow: false });
  // móveis e detalhes
  const wd = prop('cabinet_medium_decorated', 1.7); wd.position.set(2.3, 0, -2.45); sc.add(wd); const rug = prop('rug_rectangle_stripes_A', 0.04, { shadow: false }); rug.position.set(0.6, 0.005, 0.3); sc.add(rug);
  const ch = prop('chair_A', 0.95); ch.position.set(2.2, 0, 0.6); ch.rotation.y = -Math.PI / 2; sc.add(ch); add(sc, rbox(0.45, 0.12, 0.5, 0.05), '#8a3a3a', 2.2, 0.55, 0.6, 0, 0, 0.15);
  const pl = plant(1.3); pl.position.set(-2.4, 0, 1.6); sc.add(pl); const bk = books(7, { h: 0.22, seed: 4, lean: true }); bk.position.set(2.62, 1.72, -2.5); bk.rotation.y = -Math.PI / 2; sc.add(bk);
  const poster = frameArt(0.7, 0.95, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2a5a'); gr.addColorStop(1, '#e86a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe0a0'; g.beginPath(); g.arc(w / 2, h * 0.55, 50, 0, 7); g.fill(); g.fillStyle = '#0e1430'; g.fillRect(0, h * 0.7, w, h * 0.3); g.fillStyle = '#ffffff'; g.font = '900 26px Nunito'; g.textAlign = 'center'; g.fillText('DREAM', w / 2, 40); }, '#1a1a1a');
  poster.position.set(2.94, 1.75, -1.0); poster.rotation.y = -Math.PI / 2; sc.add(poster);
  // protagonista, celular, orbes de sonho, quadro de memória
  const hero = puppet(sc, HERO); const phone = add(hero.parts.AR.hand, rbox(0.075, 0.15, 0.012, 0.008), '#141418', 0, -0.1, 0.03); add(phone, new THREE.PlaneGeometry(0.066, 0.135), basic('#bcd8ff'), 0, 0, -0.0065, 0, Math.PI, 0, { shadow: false });
  const phL = new THREE.PointLight(new THREE.Color('#9fc8ff'), 0, 1.6, 2); sc.add(phL);
  const orbs = [], om = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }); for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + (i % 4) * 0.012, 10, 8), om(['#8ab4ff', '#c89aff', '#9affd8'][i % 3])); m.visible = false; sc.add(m); orbs.push(m); }
  const mem = ctex(512, 300); { const g = mem.g; g.fillStyle = '#2a1a1a'; g.fillRect(0, 0, 512, 300); g.fillStyle = '#8a3a3a'; g.fillRect(0, 220, 512, 80); g.fillStyle = '#c99a72'; g.beginPath(); g.arc(256, 130, 60, 0, 7); g.fill(); g.fillStyle = '#1a0a0a'; g.beginPath(); g.ellipse(256, 160, 26, 18, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(232, 118, 12, 0, 7); g.arc(280, 118, 12, 0, 7); g.fill(); g.fillStyle = '#ff5a3a'; g.font = '900 40px Nunito'; g.fillText('!!', 340, 90); mem.t.needsUpdate = true; }
  const memM = new THREE.MeshBasicMaterial({ map: mem.t, transparent: true, opacity: 0, color: new THREE.Color('#ffffff') }); const panel = add(sc, new THREE.PlaneGeometry(0.9, 0.53), memM, BED.x, 1.75, -1.65, 0, 0.35, 0, { shadow: false }); const frame = add(panel, new THREE.RingGeometry(0.0, 0.0, 4), basic('#ffffff'), 0, 0, 0, 0, 0, 0, { shadow: false });
  Q = { st, sc, cv, ckL, lampL, drawWin, morning: false, shaft, blanket, hero, phone, phL, orbs, panel, memM, handle: handleOf(st) }; return Q;
}, update(T, W) {
  // luz: noite até 150 s, manhã depois
  const morning = T > 150; if (morning !== W.morning) { W.drawWin(morning); W.morning = morning; }
  W.st.sun.color.set(morning ? '#ffd8a0' : '#8aa0ff'); W.st.sun.intensity = morning ? 2.6 : 0.85; W.st.hemi.intensity = morning ? 1.05 : 0.58; W.st.hemi.color.set(morning ? '#ffe8d0' : '#6a74a8'); W.st.scene.background.set(morning ? '#f0e0c8' : '#06070e'); W.shaft.material.color.set(morning ? '#fff0c8' : '#9ab4ff'); W.shaft.material.opacity = morning ? 0.13 : 0.07;
  // despertador
  const alarm = T > 156.2 && T < 158.0, hh = T < 100 ? '03:47' : T < 150 ? '04:12' : '07:00'; { const g = W.cv.g; g.fillStyle = '#050507'; g.fillRect(0, 0, 256, 96); if (!alarm || Math.sin(T * 14) > 0) { g.fillStyle = morning ? '#5aff8a' : '#ff3a3a'; g.font = '900 70px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(hh, 128, 52); } W.cv.t.needsUpdate = true; } W.ckL.color.set(morning ? '#fff0d0' : '#ff4040'); W.ckL.intensity = morning ? 0.15 : 0.12;
  // protagonista
  const h = W.hero; W.phone.visible = T < 2; W.phL.intensity = T < 2 ? 0.45 : 0;
  if (T < 150) { h.root.position.set(BED.x, BED.top, BED.foot); h.root.rotation.y = 0; const sleep = T > 100; const br = Math.sin(T * 1.6) * 0.012;
    h.setPose(sleep ? { ...POSE.lieBack, torso: [br, 0, 0], head: [0.1, 0.25, 0] } : { ...POSE.lieBack, shR: [-1.25, 0, -0.18], elR: 1.05, handR: 0.7, head: [0.15, 0, 0] }); h.setFace(sleep ? { closed: 1, t: T } : { lids: 0.25, brows: -0.4, browUp: 0.8, look: [0, 0.4], t: T, blink: blinkAt(T, 1) });
    W.blanket.position.y = 0.74 + (sleep ? br * 0.6 : 0); const hd = V3(BED.x, BED.top + 0.35, -2.3); W.phL.position.set(BED.x, BED.top + 0.75, -2.05); }
  else { const up = ease.inOut(prog(T, 158.2, 159.2)), z = lerp(BED.foot, BED.foot - 0.78, up); h.root.position.set(BED.x, BED.top + up * 0.06, z); h.setPose(posesAt(T, [[150, POSE.lieBack], [158.2, { ...POSE.sitGround, rootY: -0.62 }], [159.6, { ...POSE.sitGround, ...POSE.stretch, rootY: -0.62 }], [161.8, { ...POSE.sitGround, rootY: -0.62, head: [-0.1, 0.4, 0] }]], 0.7)); h.setFace({ closed: T < 157.4 ? 1 : 0, lids: 0.3, smile: T > 159.4, bags: false, t: T, blink: T > 157.4 && blinkAt(T, 2) }); W.blanket.position.y = 0.74 - up * 0.02; }
  // orbes de sonho (S31-S33) e quadro de memória (S32)
  W.orbs.forEach((m, i) => { const on = T > 132.4 && T < 150; m.visible = on; if (!on) return; const ph = ((T - 132.4) * 0.25 + i * 0.137) % 1; m.position.set(BED.x + Math.sin(i * 2.1 + T * 0.6) * (0.2 + ph * 0.5), BED.top + 0.45 + ph * 1.6, -2.35 + Math.cos(i * 1.7 + T * 0.5) * (0.15 + ph * 0.4)); m.material.opacity = Math.sin(ph * Math.PI) * 0.85; });
  const pa = clamp(prog(T, 138.4, 139.2)) * (1 - prog(T, 143.4, 144.5)), calm = ease.inOut(prog(T, 139.8, 142.6)); W.panel.visible = pa > 0.01; W.memM.opacity = pa; W.memM.color.setRGB(lerp(1, 0.55, calm), lerp(1, 0.75, calm), lerp(1, 1.3, calm)); W.panel.position.y = 1.75 + Math.sin(T * 1.2) * 0.04; W.panel.scale.setScalar(1 - prog(T, 143.4, 144.5) * 0.5);
} };

const B = BED.x;
shot('S01', W, () => [C([1.35, 1.65, -1.05], [B, 0.92, -2.25], 34), C([1.15, 1.55, -1.25], [B, 0.92, -2.27], 30)], { overlay: (g) => vignette(g, 0.55) });
shot('S30', W, () => [C([2.3, 2.5, 1.4], [B, 0.6, -1.6], 42), C([1.9, 2.2, 0.9], [B, 0.7, -1.7], 40)], { overlay: (g, T) => { vignette(g, 0.5); chip(g, 'FASE REM · O SONO DOS SONHOS', E.W / 2, E.H * 0.12, ease.out(prog(T, 129.5, 130.0))); } });
shot('S31', W, () => [C([0.7, 2.05, -0.7], [B, 1.4, -2.2], 44), C([0.5, 2.15, -0.9], [B, 1.6, -2.2], 42)], { overlay: (g, T) => { vignette(g, 0.5); chip(g, 'TERAPIA NOTURNA', E.W / 2, E.H * 0.12, ease.out(prog(T, 136.4, 136.9))); } });
shot('S32', W, () => [C([1.25, 1.75, 0.55], [B, 1.6, -1.6], 40), C([1.0, 1.8, 0.2], [B, 1.65, -1.6], 36)], { overlay: (g) => vignette(g, 0.5) });
shot('S33', W, (t, i, T) => { const a = 0.6 + (T - 144.5) * 0.04; return [C([B + Math.cos(a) * 3.2, 2.0, -1.6 + Math.sin(a) * 3.2], [B, 0.8, -1.8], 42), C([B + Math.cos(a) * 3.2, 2.0, -1.6 + Math.sin(a) * 3.2], [B, 0.8, -1.8], 42)]; }, { overlay: (g) => vignette(g, 0.45) });
shot('S35', W, () => [[0, C([1.2, 0.98, -1.7], [0.62, 0.66, -2.5], 30)], [1.8, C([1.25, 1.05, -1.6], [0.45, 0.72, -2.4], 36)], [7.5, C([2.0, 1.6, 0.7], [B, 1.3, -1.7], 44)]], { overlay: (g, T) => slam(g, T, 160.0, '7+ HORAS', { size: 130, y: E.H * 0.2, sub: 'de sono por noite', out: 163.0 }) });
