// kits/cartoon3d/ interface.js — peças de interface para vídeos imersivos: legenda de 1 palavra, título "carimbado",
// celular (chat/perfil/notificação), manchete de jornal, tela de TV, chuva de corações, spam de texto.
import { E, V, ease, prog, lim as clamp, mix as lerp } from '/motor/nucleo.js';
import { text, FONTS, rr, circle, ring, poly, seg, glow, alpha, shade, linGrad } from '/motor/desenho.js';
import { heart } from './feijao.js';
const DARK = '#14101e';

// legenda de uma palavra por vez (estilo vídeos narrativos)
export function wordCaption(g, T, o = {}) {
  const words = E.words; if (!words?.length) return; let w = null;
  for (let k = words.length - 1; k >= 0; k--) if (T >= words[k].start - 0.04) { if (T <= words[k].end + 0.25) w = words[k]; break; }
  if (!w) return; const str = w.word.trim(), pop = 1 + 0.08 * (1 - ease.out(prog(T, w.start, w.start + 0.15)));
  const y = o.y ?? E.H * V(0.86, 0.72), size = o.size ?? V(80, 92);
  g.save(); g.translate(E.W / 2, y); g.scale(pop, pop);
  text(g, str, 0, 0, { size, color: '#ffffff', font: FONTS.ui, weight: 900, stroke: size * 0.22, strokeColor: alpha('#000000', 0.85) });
  g.restore();
}
// título que entra girado e "carimba" (ex.: SHOW CANCELADO)
export function slamTitle(g, t, str, o = {}) {
  const a = ease.outBack(prog(t, o.at ?? 0, (o.at ?? 0) + 0.35)); if (a <= 0) return;
  g.save(); g.translate(o.x ?? E.W / 2, o.y ?? E.H * 0.18); g.rotate(o.rot ?? -0.05); g.scale(a, a);
  text(g, str, 0, 0, { size: o.size ?? V(82, 90), color: o.color ?? '#ffffff', font: FONTS.title, weight: 700, stroke: 16, strokeColor: o.stroke ?? DARK, spacing: 1 });
  if (o.sub) text(g, o.sub, 0, (o.size ?? 86) * 0.95, { size: (o.size ?? 86) * 0.55, color: o.subColor ?? '#ffd94a', font: FONTS.title, weight: 700, stroke: 12, strokeColor: DARK });
  g.restore();
}
// celular: kind = 'chat' | 'profile' | 'notif'
export function phone(g, t, o = {}) {
  const x = o.x ?? E.W / 2, y = o.y ?? E.H / 2, s = (o.s ?? V(1.0, 1.25)) * ease.outBack(prog(t, o.at ?? 0, (o.at ?? 0) + 0.4)); if (s <= 0) return;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0.03); g.scale(s, s);
  const w = 340, h = 660; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40; rr(g, -w / 2, -h / 2, w, h, 46); g.fillStyle = '#16141c'; g.fill(); g.shadowBlur = 0;
  rr(g, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 34); g.fillStyle = o.bg ?? '#f6f4fa'; g.fill(); rr(g, -50, -h / 2 + 22, 100, 22, 11); g.fillStyle = '#16141c'; g.fill();
  const top = -h / 2 + 60;
  if (o.kind === 'profile') {
    circle(g, 0, top + 70, 54, '#0b0a10'); for (const sx of [-1, 1]) { circle(g, sx * 16, top + 70, 13, '#fff'); circle(g, sx * 16, top + 72, 6, '#0b0a10'); }
    text(g, o.name ?? '@voce', 0, top + 150, { size: 30, color: '#2a2440', font: FONTS.ui, weight: 900 });
    const n = Math.round(lerp(o.from ?? 345, o.to ?? 345, ease.inOut(prog(t, (o.at ?? 0) + 0.4, (o.at ?? 0) + (o.countDur ?? 2.2)))));
    text(g, n.toLocaleString('pt-BR'), 0, top + 200, { size: 44, color: '#e0305a', font: FONTS.ui, weight: 900 }); text(g, 'seguidores', 0, top + 238, { size: 22, color: '#8a84a0', font: FONTS.ui, weight: 800 });
    (o.items ?? []).forEach((it, i) => { const a = ease.out(prog(t, (o.at ?? 0) + 0.6 + i * 0.35, (o.at ?? 0) + 0.9 + i * 0.35)); if (a <= 0) return; g.save(); g.globalAlpha *= a; rr(g, -130, top + 280 + i * 64, 260, 50, 14); g.fillStyle = '#ffe4ee'; g.fill(); heart(g, -105, top + 305 + i * 64, 9, '#ff4a7a'); text(g, it, 10, top + 306 + i * 64, { size: 22, color: '#5a3a50', font: FONTS.ui, weight: 800 }); g.restore(); });
  } else if (o.kind === 'notif') {
    (o.items ?? []).forEach((it, i) => { const a = ease.outBack(prog(t, (o.at ?? 0) + 0.3 + i * (o.gap ?? 0.25), (o.at ?? 0) + 0.6 + i * (o.gap ?? 0.25))); if (a <= 0) return; g.save(); g.translate(0, top + 40 + i * 84); g.scale(a, a); rr(g, -140, -34, 280, 70, 18); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#e4e0ee'; g.lineWidth = 2; g.stroke(); circle(g, -105, 0, 20, it.c ?? '#5a8af0'); text(g, it.t, 15, 0, { size: 22, color: '#2a2440', font: FONTS.ui, weight: 800 }); g.restore(); });
  } else {
    rr(g, -w / 2 + 14, -h / 2 + 50, w - 28, 70, 0); g.fillStyle = '#ece8f6'; g.fill(); circle(g, -120, -h / 2 + 85, 20, '#0b0a10'); text(g, o.name ?? 'Contato', -90, -h / 2 + 85, { size: 26, color: '#2a2440', font: FONTS.ui, weight: 900, align: 'left' });
    (o.msgs ?? []).forEach(([who, msg, at], i) => { const a = ease.outBack(prog(t, at, at + 0.3)); if (a <= 0) return; const me = who === 'me', yy = -h / 2 + 170 + i * 82; g.save(); g.translate(me ? 40 : -40, yy); g.scale(a, a); g.font = `800 24px "Nunito"`; const tw = Math.min(230, g.measureText(msg).width + 36); rr(g, -tw / 2, -28, tw, 56, 22); g.fillStyle = me ? '#5a8af0' : '#ffffff'; g.fill(); if (!me) { g.strokeStyle = '#e0dcea'; g.lineWidth = 2; g.stroke(); } text(g, msg, 0, 1, { size: 24, color: me ? '#fff' : '#2a2440', font: FONTS.ui, weight: 800 }); g.restore(); });
    if (o.typing != null && t > o.typing) { const yy = -h / 2 + 170 + (o.msgs ?? []).length * 82; rr(g, -150, yy - 26, 90, 52, 22); g.fillStyle = '#fff'; g.fill(); for (let k = 0; k < 3; k++) circle(g, -128 + k * 22, yy, 6 + 2 * Math.max(0, Math.sin(t * 8 - k)), '#9a94b0'); }
    if (o.seen != null && t > o.seen) text(g, 'Visto', w / 2 - 50, h / 2 - 50, { size: 20, color: '#8a84a0', font: FONTS.ui, weight: 800 });
  }
  g.restore();
}
// manchete de jornal
export function newspaper(g, t, o = {}) {
  const a = ease.outBack(prog(t, o.at ?? 0, (o.at ?? 0) + 0.5)); if (a <= 0) return; const spin = (1 - a) * 2.5;
  g.save(); g.translate(E.W / 2, E.H / 2); g.rotate(spin + (o.rot ?? -0.03)); g.scale(a * (o.s ?? 1), a * (o.s ?? 1));
  const w = 1000, h = 620; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50; g.fillStyle = '#f4efe2'; g.fillRect(-w / 2, -h / 2, w, h); g.shadowBlur = 0;
  text(g, o.paper ?? 'JORNAL DA MENTE', 0, -h / 2 + 60, { size: 54, color: '#2a2420', font: FONTS.serif, weight: 900 }); seg(g, [[-w / 2 + 40, -h / 2 + 100], [w / 2 - 40, -h / 2 + 100]], 4, '#2a2420');
  (o.lines ?? ['MANCHETE']).forEach((l, i) => text(g, l, 0, -h / 2 + 165 + i * 66, { size: 56, color: i === (o.hi ?? 1) ? '#c8203a' : '#2a2420', font: FONTS.ui, weight: 900 }));
  g.fillStyle = '#d8d0c0'; g.fillRect(-w / 2 + 50, -h / 2 + 330, 300, 240); for (let i = 0; i < 6; i++) { g.fillStyle = '#b8b0a0'; g.fillRect(-w / 2 + 390, -h / 2 + 340 + i * 38, 520 - (i % 3) * 60, 14); }
  o.photo?.(g, -w / 2 + 200, -h / 2 + 560); g.restore();
}
// TV / transmissão ao vivo
export function tvFrame(g, t, inner, o = {}) {
  const w = o.w ?? E.W * 0.78, h = o.h ?? w * 0.56, x = E.W / 2 - w / 2, y = (o.y ?? E.H * 0.42) - h / 2;
  rr(g, x - 20, y - 20, w + 40, h + 40, 24); g.fillStyle = '#1a1820'; g.fill(); g.save(); rr(g, x, y, w, h, 8); g.clip(); inner(g, x, y, w, h); g.restore();
  rr(g, x + 20, y + h - 70, 120, 44, 6); g.fillStyle = '#e0302a'; g.fill(); text(g, 'AO VIVO', x + 80, y + h - 47, { size: 24, color: '#fff', font: FONTS.ui, weight: 900 });
  if (o.ticker) { g.fillStyle = 'rgba(10,10,20,.85)'; g.fillRect(x, y + h - 22, w, 22); text(g, o.ticker, x + w - ((t * 160) % (w + 600)), y + h - 11, { size: 16, color: '#fff', font: FONTS.ui, weight: 800, align: 'left' }); }
}
// chuva de corações / partículas
export function heartsRain(g, t, o = {}) { const n = o.n ?? 40; for (let i = 0; i < n; i++) { const x = ((i * 173) % E.W) + Math.sin(t + i) * 20, y = ((t * (60 + (i % 5) * 25) + i * 97) % (E.H + 100)) - 50; heart(g, x, o.up ? E.H - y : y, 8 + (i % 4) * 4, alpha(o.color ?? '#ff4a7a', o.a ?? 0.8)); } }
// spam de texto repetido no fundo (ex.: "Eu te amo." centenas de vezes)
export function textSpam(g, t, str, o = {}) { const rows = 16; for (let r = 0; r < rows; r++) for (let k = 0; k < 6; k++) { const a = ease.out(prog(t, (r * 6 + k) * 0.012, (r * 6 + k) * 0.012 + 0.2)); if (a <= 0) continue; const x = ((k * 330 + r * 117) % (E.W + 200)) - 100, y = r * (E.H / rows) + 30; g.save(); g.translate(x, y); g.rotate(((r + k) % 3 - 1) * 0.06); g.globalAlpha *= a; rr(g, -10, -24, 260, 48, 12); g.fillStyle = o.bg ?? '#ffd4e4'; g.fill(); text(g, str, 120, 1, { size: 26, color: o.color ?? '#c8205a', font: FONTS.ui, weight: 900 }); g.restore(); } }
