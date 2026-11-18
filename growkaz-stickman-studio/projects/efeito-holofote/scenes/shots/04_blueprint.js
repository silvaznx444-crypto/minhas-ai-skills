// shots/04_blueprint.js — os diagramas: cérebro, mapa de assentos, comparações, cabeça, ponto de vista, ajuste.
import { E, V, S, registerShot, ease, prog, clamp, lerp, key, wordTime, seg, circle, ring, rr, poly, glow, alpha, text, FONTS } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as UI from '/engine/ui2d.js';

const BP = () => UI.bpStroke(), GOLD = () => S().ui.gold, CORAL = () => S().ui.accent;
const zoomIn = (g, t, dur, k = 0.05) => { const z = 1 + k * ease.inOut(clamp(t / dur)); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2); };
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;

// perfil de cabeça em traço
function headProfile(g, cx, cy, R, c, w = 5) {
  g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  g.arc(cx, cy, R, Math.PI * 0.95, Math.PI * 0.12);
  g.lineTo(cx + R * 1.12, cy + R * 0.25); g.lineTo(cx + R * 0.98, cy + R * 0.38); g.lineTo(cx + R * 1.0, cy + R * 0.62);
  g.quadraticCurveTo(cx + R * 0.9, cy + R * 0.9, cx + R * 0.45, cy + R * 0.92); g.lineTo(cx + R * 0.35, cy + R * 1.35);
  g.moveTo(cx - R * 0.98, cy + R * 0.15); g.quadraticCurveTo(cx - R * 0.8, cy + R * 0.9, cx - R * 0.3, cy + R * 1.0); g.lineTo(cx - R * 0.3, cy + R * 1.35);
  g.stroke();
}
function brain(g, cx, cy, r, c) {
  g.strokeStyle = c; g.lineWidth = 4;
  for (const dx of [-0.35, 0.35]) { g.beginPath(); g.ellipse(cx + dx * r, cy, r * 0.48, r * 0.62, 0, 0, 7); g.stroke(); }
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.3 + i * r * 0.22, r * 0.18, 0.2, 2.6); g.stroke(); g.beginPath(); g.arc(cx + r * 0.35, cy - r * 0.3 + i * r * 0.22, r * 0.18, 0.5, 2.9); g.stroke(); }
}

// s011 — "por que o nosso cérebro erra tanto nessa conta?"
registerShot('s011', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.06);
  const c = BP(), cx = E.W / 2 - 60, cy = E.H * 0.42, R = 230;
  headProfile(g, cx, cy, R, c);
  const tb = wt('cérebro', info, 2.6), on = ease.out(prog(t, tb - 0.2, tb + 0.3));
  brain(g, cx, cy - 20, 120, on > 0 ? GOLD() : alpha(c, 0.6)); if (on > 0) glow(g, cx, cy - 20, 220, GOLD(), 0.25 * on);
  const q = ease.outBack(prog(t, 0.3, 0.8));
  g.save(); g.translate(cx + R * 1.7, cy - R * 0.6); g.scale(q, q); g.rotate(Math.sin(t * 2) * 0.08);
  text(g, '?', 0, 0, { size: 220, color: GOLD(), glow: 30, glowColor: alpha(GOLD(), 0.6) }); g.restore();
  // "conta": 1 + 1 = 3
  text(g, '1 + 1 = 3', cx, E.H * 0.86, { size: 64, color: CORAL(), font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, tb + 0.6, tb + 1.0)), spacing: 4 });
  g.restore();
} });

// mapa de assentos visto de cima (30 lugares)
function seats(g, t, lit, color, o = {}) {
  const cols = 6, rows = 5, cw = 150, rh = 120, x0 = E.W / 2 - (cols - 1) * cw / 2 + V(160, 0), y0 = E.H * 0.3, c = BP();
  // a porta e o estudante
  rr(g, x0 - 420, y0 - 40, 24, 200, 6); g.fillStyle = alpha(c, 0.5); g.fill();
  circle(g, x0 - 340, y0 + 60, 30, '#f2c21a'); text(g, 'ESTUDANTE', x0 - 340, y0 + 130, { size: 24, color: '#f2c21a', font: FONTS.ui, weight: 900 });
  let k = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * cw, y = y0 + j * rh, idx = k++;
    rr(g, x - 50, y - 18, 100, 30, 6); g.strokeStyle = alpha(c, 0.45); g.lineWidth = 2; g.stroke();
    const order = (idx * 7) % 30, on = lit(order);
    if (on > 0) { glow(g, x, y + 34, 60, color, 0.5 * on); circle(g, x, y + 34, 22, alpha(color, on)); }
    ring(g, x, y + 34, 22, 3, on > 0 ? color : alpha(c, 0.55));
  }
}
// s016 — "Os voluntários acharam que cerca de metade da sala tinha notado a camiseta."
registerShot('s016', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const tm = wt('metade', info, 2.0);
  seats(g, t, (o) => o < 15 ? ease.out(prog(t, tm - 0.4 + o * 0.06, tm - 0.2 + o * 0.06)) : 0, GOLD());
  g.restore();
  UI.readout(g, { label: 'ACHARAM:', value: '~50%', x: V(140, 90), y: E.H - V(110, 300), a: ease.out(prog(t, tm, tm + 0.4)) });
} });
// s017 — "O número real? Pouco menos de um quarto."
registerShot('s017', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const tr = wt('Pouco', info, 1.3);
  seats(g, t, (o) => o < 15 && t < 0.5 ? 1 - prog(t, 0, 0.5) : (o < 7 ? ease.out(prog(t, tr - 0.1 + o * 0.08, tr + 0.1 + o * 0.08)) : 0), t < 0.5 ? GOLD() : CORAL());
  g.restore();
  UI.readout(g, { label: 'ACHARAM:', value: '~50%', x: V(140, 90), y: E.H - V(170, 360), color: alpha(GOLD(), 0.6), size: V(36, 40) });
  UI.readout(g, { label: 'REAL:', value: '~23%', x: V(140, 90), y: E.H - V(90, 290), color: CORAL(), a: ease.out(prog(t, tr + 0.3, tr + 0.7)) });
} });

// barras grandes qualitativas
function bigBars(g, t, rows, title) {
  const x0 = V(300, 120), w = E.W - x0 * 2, c = BP();
  text(g, title, E.W / 2, E.H * 0.2, { size: V(44, 48), color: alpha(c, 0.9), font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0, 0.4)) });
  rows.forEach((r, i) => {
    const y = E.H * (0.42 + i * 0.22), p = ease.out(prog(t, 0.3 + i * 0.4, 1.3 + i * 0.4));
    text(g, r.label, x0, y - 56, { size: V(36, 40), color: r.color, font: FONTS.ui, weight: 900, align: 'left', spacing: 2, alpha: clamp(p * 3) });
    rr(g, x0, y - 26, w, 52, 26); g.fillStyle = alpha(r.color, 0.1); g.fill();
    const ww = Math.max(52, w * r.v * p); rr(g, x0, y - 26, ww, 52, 26); g.fillStyle = r.color; g.fill(); glow(g, x0 + ww, y, 70, r.color, 0.5 * p);
  });
}
// s026 — "Percebeu muito menos do que eles imaginavam."
registerShot('s026', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03);
  bigBars(g, t, [{ label: 'O NERVOSISMO QUE O ORADOR ACHOU VISÍVEL', v: 0.85, color: CORAL() }, { label: 'O QUE A PLATEIA PERCEBEU', v: 0.3, color: BP() }], 'NERVOSISMO');
  g.restore();
} });
// s038 — "e o público avaliou as falas deles como melhores."
registerShot('s038', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03);
  bigBars(g, t, [{ label: 'ORADORES SEM A EXPLICAÇÃO', v: 0.55, color: BP() }, { label: 'ORADORES QUE CONHECIAM A ILUSÃO', v: 0.8, color: GOLD() }], 'AVALIAÇÃO DO PÚBLICO');
  g.restore();
} });

// s030 — "Você é a única pessoa que vive cem por cento do tempo dentro da sua própria cabeça."
registerShot('s030', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.08);
  const c = BP(), cx = E.W / 2 - 80, cy = E.H * 0.42, R = 300;
  headProfile(g, cx, cy, R, c, 6);
  // sala de controle dentro da cabeça
  for (let i = 0; i < 3; i++) { rr(g, cx - 170 + i * 120, cy - 150, 100, 64, 8); g.strokeStyle = alpha(c, 0.8); g.lineWidth = 3; g.stroke(); g.fillStyle = alpha(GOLD(), 0.15 + 0.1 * Math.sin(t * 3 + i)); g.fill(); }
  UI.lineFigure(g, { x: cx - 50, y: cy + 140, s: 1.0, pose: POSES.sit, color: '#ff8a6a' });
  rr(g, cx - 120, cy + 40, 200, 12, 4); g.fillStyle = alpha(c, 0.7); g.fill();
  const tc = wt('cem', info, 1.9);
  UI.readout(g, { label: 'DENTRO DA SUA CABEÇA:', value: `${Math.round(100 * ease.out(prog(t, tc - 0.2, tc + 0.6)))}%`, x: cx + R * 1.25, y: E.H * 0.82, align: 'center', size: V(64, 68), a: ease.out(prog(t, tc - 0.3, tc)) });
  g.restore();
} });

// mini cabeça
function miniHead(g, x, y, r, c, fill) { if (fill) { circle(g, x, y, r, fill); } ring(g, x, y, r, 4, c); rr(g, x - r * 0.9, y + r * 1.1, r * 1.8, r * 1.4, r * 0.6); g.strokeStyle = c; g.lineWidth = 4; g.stroke(); }
// s032 — "E quando tenta imaginar o que os outros veem, parte do seu ponto de vista."
registerShot('s032', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const c = BP(), red = '#ff8a6a', yx = E.W * 0.22, yy = E.H * 0.42;
  miniHead(g, yx, yy, 90, red, alpha(red, 0.15)); text(g, 'VOCÊ', yx, yy + 260, { size: 40, color: red, font: FONTS.ui, weight: 900, spacing: 3 });
  const ti = wt('imaginar', info, 1.0), p = ease.inOut(prog(t, ti, ti + 1.2));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = alpha(red, 0.12 * p);
  g.beginPath(); g.moveTo(yx + 70, yy - 10); g.lineTo(yx + 70 + 1100 * p, yy - 300); g.lineTo(yx + 70 + 1100 * p, yy + 340); g.closePath(); g.fill(); g.restore();
  [[E.W * 0.62, E.H * 0.3], [E.W * 0.75, E.H * 0.52], [E.W * 0.88, E.H * 0.34]].forEach(([x, y], i) => {
    const tint = ease.out(prog(t, ti + 1.0 + i * 0.3, ti + 1.5 + i * 0.3));
    miniHead(g, x, y, 60, c, alpha(red, 0.35 * tint));
    if (tint > 0) circle(g, x, y, 14 * tint, red);
  });
  const tv = wt('ponto', info, 4.0);
  text(g, 'SEU PONTO DE VISTA', E.W * 0.62, E.H * 0.82, { size: 46, color: GOLD(), font: FONTS.ui, weight: 900, spacing: 3, alpha: ease.out(prog(t, tv - 0.3, tv + 0.2)) });
  g.restore();
} });

// s033 — "Você até corrige um pouco, mas não o suficiente."
registerShot('s033', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03);
  const c = BP(), x0 = V(280, 120), x1 = E.W - x0, y = E.H * 0.5;
  seg(g, [[x0, y], [x1, y]], 6, alpha(c, 0.5));
  text(g, 'SEU PONTO DE VISTA', x0, y + 70, { size: 34, color: '#ff8a6a', font: FONTS.ui, weight: 900, align: 'left' });
  text(g, 'COMO OS OUTROS VEEM', x1, y + 70, { size: 34, color: c, font: FONTS.ui, weight: 900, align: 'right' });
  circle(g, x1, y, 16, c);
  const m = lerp(x0, lerp(x0, x1, 0.38), ease.out(prog(t, 0.2, 1.3)));
  glow(g, m, y, 80, GOLD(), 0.6); circle(g, m, y, 22, GOLD());
  const tn = wt('mas', info, 1.3), a = ease.out(prog(t, tn, tn + 0.4));
  if (a > 0) { g.setLineDash([12, 12]); seg(g, [[m + 30, y - 60], [x1 - 20, y - 60]], 4, alpha(CORAL(), a)); g.setLineDash([]);
    text(g, 'AJUSTE INSUFICIENTE', (m + x1) / 2, y - 110, { size: 48, color: CORAL(), font: FONTS.ui, weight: 900, spacing: 3, alpha: a }); }
  g.restore();
} });
