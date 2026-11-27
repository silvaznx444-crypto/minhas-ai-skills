// Teste do estilo imersivo: feijões em cenários 3D + inserções de interface + legenda de 1 palavra.
import { E, registerShot, ease, prog, lerp, backdrop, glow, text, FONTS, alpha, circle } from '/engine/core.js';
import { drawBean } from '/kits/psique/bean.js';
import { street, bedroom } from '/kits/psique/world3d.js';
import { wordCaption, slamTitle, phone, newspaper, heartsRain } from '/kits/psique/ui.js';
import * as FX from '/engine/fx2d.js';

const HERO = { color: '#d64a33', acc: ['hood'] };
const FRIEND = { color: '#2aa198', acc: ['bun', 'glasses'] };
let day = null, night = null, room = null;
const C = (pos, look, fov = 40) => ({ pos, look, fov });

function shot3D(id, make, draw, cam, overlay) {
  registerShot(id, { kind: '3d', init(T) { return make(T).handle; },
    draw(s, t, info, T) { draw(t, info); const k = cam(t, info); T.dolly(s.camera, t, [[0, k[0]], [info.dur, k[1]]]); },
    overlay(g, t, info) { overlay?.(g, t, info); wordCaption(g, info.globalT); } });
}

// t1 — dois feijões conversando na rua
let hero1, friend1;
shot3D('t1', (T) => { if (!day) { day = street(T); hero1 = day.addBean(HERO, -0.7, 0); friend1 = day.addBean(FRIEND, 0.7, -0.2); } return day; },
  (t) => { crowd.forEach((b) => (b.group.visible = false)); hero1.group.visible = friend1.group.visible = true; hero1.group.position.set(-0.7, 0, 0); friend1.group.position.set(0.7, 0, -0.2); hero1.draw({ expr: t < 1.2 ? 'neutral' : 'shocked', t, talk: t < 1.2, look: [0.8, 0] }); friend1.draw({ expr: 'suspicious', t, facing: -1, look: [-0.6, 0], arms: 'shrug' }); },
  () => [C([0.2, 1.3, 3.4], [0, 1.1, -0.2], 38), C([0.1, 1.25, 2.8], [0, 1.1, -0.2], 36)]);
// t2 — multidão apaixonada caminhando na rua
let crowd = [];
shot3D('t2', (T) => { if (!day) day = street(T); if (!crowd.length) for (let i = 0; i < 9; i++) crowd.push(day.addBean({ color: ['#ff7aa8', '#8a5ad6', '#f2c21a', '#3a6ea5', '#5fd39a'][i % 5], acc: [['bun'], ['cap'], [], ['glasses'], ['bow']][i % 5] }, 0, 0)); return day; },
  (t) => { hero1 && (hero1.group.visible = false); friend1 && (friend1.group.visible = false); crowd.forEach((b, i) => { b.group.visible = true; const x = ((i % 3) - 1) * 1.4 + (i > 5 ? 0.6 : 0), z = -4 - Math.floor(i / 3) * 2.2 + t * 1.3; b.group.position.set(x, 0, z); b.draw({ expr: 'love', t: t + i, walk: t * 7 + i, arms: i % 2 ? 'down' : 'hug', blush: true }); }); },
  () => [C([0, 1.6, 4.5], [0, 1.2, -6], 42), C([0, 1.5, 3.6], [0, 1.2, -6], 40)], (g, t) => heartsRain(g, t, { n: 30, a: 0.6 }));
// t3 — celular (chat)
registerShot('t3', { draw(g, t, info) {
  backdrop(g, ['#2a1048', '#4a1a6a', '#7a2a7a']); heartsRain(g, t, { n: 24, a: 0.35, up: true });
  phone(g, t, { kind: 'chat', name: 'Mãe', x: E.W * 0.36, y: E.H * 0.5, s: 1.35, msgs: [['them', 'Filho, tá tudo bem?', 0.2], ['them', 'Você sumiu...', 0.7], ['me', 'tô bem sim', 1.3]], typing: 1.8, seen: 1.6 });
  drawBean(g, E.W * 0.72, E.H * 1.02, 2.6, { ...HERO, expr: 'worried', prop: 'phone', arms: 'phone', look: [-0.6, 0.4], t });
  wordCaption(g, info.globalT);
} });
// t4 — manchete de jornal
registerShot('t4', { draw(g, t, info) {
  backdrop(g, ['#0e0e1a', '#1a1a2e']); glow(g, E.W / 2, E.H / 2, 900, '#ffd94a', 0.1);
  newspaper(g, t, { lines: ['CIENTISTAS EXPLICAM:', 'POR QUE VOCÊ SE SENTE', 'SEMPRE OBSERVADO'], hi: 2, s: 1.35, photo: (g, x, y) => drawBean(g, x, y, 0.7, { ...HERO, expr: 'shocked', shadow: false, t }) });
  wordCaption(g, info.globalT);
} });
// t5 — rua à noite, estrelas
let hero5;
shot3D('t5', (T) => { if (!night) { night = street(T, { night: true }); hero5 = night.addBean(HERO, 0.4, -2); } return night; },
  (t) => hero5.draw({ expr: t < 1.4 ? 'neutral' : 'stars', look: [0, -1], t, arms: t < 1.4 ? 'down' : 'cheer' }),
  () => [C([1.6, 0.9, 2.6], [0.2, 2.2, -4], 46), C([1.2, 0.8, 2.0], [0.2, 2.6, -4], 46)],
  (g, t) => { const k = prog(t, 0.8, 1.6); if (k > 0 && k < 1) { const x = lerp(E.W * 0.2, E.W * 0.7, k), y = lerp(E.H * 0.1, E.H * 0.3, k); glow(g, x, y, 60, '#ffffff', 0.9); for (let i = 1; i < 12; i++) circle(g, x - i * 14, y - i * 5, 4 - i * 0.3, alpha('#ffffff', 0.7 - i * 0.05)); } slamTitle(g, t, 'NAQUELA NOITE...', { at: 0.2, y: E.H * 0.14, size: 70 }); });
// t6 — quarto de manhã
let hero6;
shot3D('t6', (T) => { if (!room) { room = bedroom(T); hero6 = room.addBean(HERO, -0.5, -0.6); } return room; },
  (t) => hero6.draw({ expr: t < 1.0 ? 'sleepy' : 'happy', t, arms: t < 1.0 ? 'down' : 'cheer' }),
  () => [C([1.6, 1.5, 2.8], [-0.8, 1.0, -0.8], 44), C([1.0, 1.3, 2.2], [-0.7, 1.0, -0.8], 42)],
  (g, t) => { slamTitle(g, t, 'NA MANHÃ SEGUINTE', { at: 0.3, y: E.H * 0.14, size: 66, color: '#ffd94a' }); for (let i = 0; i < 6; i++) FX.sparkle(g, E.W * (0.25 + i * 0.03), E.H * (0.3 + (i % 2) * 0.05), 14 * Math.abs(Math.sin(t * 3 + i)), '#fff6c8'); });
