// shots/03_diagrams.js — diagramas (blueprint): a região, 35 horas, amígdala, amêndoa, comparação, +60%, conexões, alarme/freio, REM, processamento, 7 horas.
import { E, V, S, registerShot, ease, prog, clamp, lerp, key, wordTime, seg, circle, ring, rr, poly, glow, alpha, text, FONTS } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as UI from '/engine/ui2d.js';
import { brainSide, region, link } from '../sets/props.js';

const BP = () => UI.bpStroke(), GOLD = () => S().ui.gold, RED = '#ff5a4a', BLUE = '#7fd0ff';
const zoomIn = (g, t, dur, k = 0.05) => { const z = 1 + k * ease.inOut(clamp(t / dur)); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2); };
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;
const pulse = (t, f = 3) => 0.85 + 0.15 * Math.sin(t * f * Math.PI);

// cabeça em perfil (frente à direita) com cérebro dentro
function head(g, cx, cy, R, c) {
  g.strokeStyle = alpha(c, 0.6); g.lineWidth = 4; g.beginPath();
  g.arc(cx, cy, R, Math.PI * 0.95, Math.PI * 0.12); g.lineTo(cx + R * 1.12, cy + R * 0.25); g.lineTo(cx + R * 0.98, cy + R * 0.38); g.lineTo(cx + R * 1.0, cy + R * 0.62);
  g.quadraticCurveTo(cx + R * 0.9, cy + R * 0.9, cx + R * 0.45, cy + R * 0.92); g.lineTo(cx + R * 0.35, cy + R * 1.35);
  g.moveTo(cx - R * 0.98, cy + R * 0.15); g.quadraticCurveTo(cx - R * 0.8, cy + R * 0.9, cx - R * 0.3, cy + R * 1.0); g.lineTo(cx - R * 0.3, cy + R * 1.35); g.stroke();
}

// s011 — "Mas e se o problema estiver numa pequena região do seu cérebro, que perde o controle quando você não dorme?"
registerShot('s011', { draw(g, t, info) {
  UI.blueprint(g); g.save();
  const zk = ease.inOut(prog(t, 2.0, info.dur)), z = lerp(1, 2.0, zk), cx = E.W / 2 - 40, cy = E.H * 0.42;
  const pts0 = { amy: [cx + 300 * 0.62 * 0.15, cy - 20 + 300 * 0.62 * 0.18] };
  g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-lerp(E.W / 2, pts0.amy[0], zk), -lerp(E.H / 2, pts0.amy[1], zk));
  head(g, cx, cy, 300, BP());
  const P = brainSide(g, cx, cy - 20, 300 * 0.62, BP(), { w: 4 });
  const tr = wt('região', info, 1.8);
  region(g, P.amy, 14, RED, ease.out(prog(t, tr - 0.2, tr + 0.3)), null, { pulse: pulse(t) });
  g.restore();
} });

// s016 — "cerca de trinta e cinco horas sem dormir."
registerShot('s016', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.05);
  const c = BP(), cx = E.W / 2 - V(300, 0), cy = E.H * 0.47, R = 200, h = Math.round(35 * ease.inOut(prog(t, 0.2, 2.2)));
  ring(g, cx, cy, R, 8, alpha(c, 0.3));
  g.strokeStyle = GOLD(); g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (h / 35) * Math.PI * 2 * 0.999); g.stroke();
  const a = -Math.PI / 2 + t * 9; seg(g, [[cx, cy], [cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75]], 6, c); circle(g, cx, cy, 10, c);
  text(g, `${h}`, cx + V(520, 0), cy - 20, { size: 200, color: GOLD(), glow: 30, glowColor: alpha(GOLD(), 0.6) });
  text(g, 'HORAS SEM DORMIR', cx + V(520, 0), cy + 110, { size: 46, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 4 });
  g.restore();
} });

// s020 — "a amígdala."
registerShot('s020', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.06);
  const P = brainSide(g, E.W / 2, E.H * 0.45, 330, BP());
  region(g, P.amy, 22, RED, ease.outBack(prog(t, 0.05, 0.4)), 'AMÍGDALA', { pulse: pulse(t), size: 44, ly: -70 });
  g.restore();
} });

// s022 — "Ela tem o tamanho de uma amêndoa"
registerShot('s022', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const c = BP(), ax = E.W * 0.32, bx = E.W * 0.68, y = E.H * 0.47;
  // amêndoa
  g.save(); g.translate(ax, y); g.rotate(-0.4); g.fillStyle = '#c98a5a'; g.beginPath(); g.moveTo(0, -150); g.bezierCurveTo(110, -80, 90, 110, 0, 150); g.bezierCurveTo(-90, 110, -110, -80, 0, -150); g.fill();
  g.strokeStyle = 'rgba(80,40,20,.5)'; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 18, -110 + Math.abs(i) * 10); g.quadraticCurveTo(i * 26, 0, i * 18, 110 - Math.abs(i) * 10); g.stroke(); } g.restore();
  text(g, 'AMÊNDOA', ax, y + 230, { size: 44, color: '#e8c8a8', font: FONTS.ui, weight: 900, spacing: 3 });
  text(g, '=', E.W / 2, y, { size: 120, color: alpha(c, 0.8), alpha: ease.out(prog(t, 0.4, 0.8)) });
  const a = ease.outBack(prog(t, 0.5, 0.9)); g.save(); g.translate(bx, y); g.scale(a, a); g.rotate(-0.4);
  glow(g, 0, 0, 260, RED, 0.5 * pulse(t)); g.fillStyle = alpha(RED, 0.85); g.beginPath(); g.moveTo(0, -150); g.bezierCurveTo(110, -80, 90, 110, 0, 150); g.bezierCurveTo(-90, 110, -110, -80, 0, -150); g.fill(); g.restore();
  text(g, 'AMÍGDALA', bx, y + 230, { size: 44, color: RED, font: FONTS.ui, weight: 900, spacing: 3, alpha: a });
  g.restore();
} });

// s025 — "No grupo que não dormiu, diante das imagens negativas, a amígdala"
function twoBrains(g, t, react) {
  const R = 220, L = [E.W * 0.28, E.H * 0.46], Rr = [E.W * 0.72, E.H * 0.46];
  const P1 = brainSide(g, L[0], L[1], R, BP(), { w: 4 }), P2 = brainSide(g, Rr[0], Rr[1], R, BP(), { w: 4 });
  text(g, 'DORMIU', L[0], E.H * 0.16, { size: 46, color: BLUE, font: FONTS.ui, weight: 900, spacing: 4 });
  text(g, 'NÃO DORMIU', Rr[0], E.H * 0.16, { size: 46, color: RED, font: FONTS.ui, weight: 900, spacing: 4 });
  region(g, P1.amy, 16, RED, 0.55, null, { pulse: pulse(t, 2) });
  region(g, P2.amy, 16 * (1 + 0.6 * react), RED, 0.55 + 0.45 * react, null, { pulse: pulse(t, 2 + 4 * react) * (1 + 0.6 * react) });
  return { P1, P2 };
}
registerShot('s025', { draw(g, t, info) { UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03); twoBrains(g, t, 0); g.restore(); } });

// s026 — "reagiu cerca de sessenta por cento mais."
registerShot('s026', { draw(g, t, info) {
  UI.blueprint(g);
  const x0 = V(380, 140), w = E.W - x0 - V(380, 140), y1 = E.H * 0.42, y2 = E.H * 0.64, base = w / 1.7;
  const p1 = ease.out(prog(t, 0.1, 0.8)), ts = wt('sessenta', info, 1.2), p2 = ease.inOut(prog(t, 0.4, ts + 0.9));
  text(g, 'REAÇÃO DA AMÍGDALA A IMAGENS NEGATIVAS', E.W / 2, E.H * 0.2, { size: V(40, 40), color: alpha(BP(), 0.9), font: FONTS.ui, weight: 900, spacing: 3 });
  for (const [y, lab, ww, col] of [[y1, 'DORMIU', base * p1, BLUE], [y2, 'NÃO DORMIU', base * (1 + 0.6 * p2) * p1, RED]]) {
    text(g, lab, x0, y - 56, { size: 36, color: col, font: FONTS.ui, weight: 900, align: 'left', spacing: 2 });
    rr(g, x0, y - 26, Math.max(52, ww), 52, 26); g.fillStyle = col; g.fill(); glow(g, x0 + ww, y, 70, col, 0.5);
  }
  if (p2 > 0.05) text(g, `+${Math.round(60 * p2)}%`, x0 + base * (1 + 0.6 * p2) + 40, y2 + 4, { size: 72, color: GOLD(), align: 'left', glow: 20, glowColor: alpha(GOLD(), 0.6), font: FONTS.ui, weight: 900 });
  if (p2 > 0) { g.setLineDash([8, 10]); seg(g, [[x0 + base, y1 + 40], [x0 + base, y2 + 40]], 3, alpha(BP(), 0.6)); g.setLineDash([]); }
} });

// conexões: pré-frontal ↔ amígdala ↔ tronco
function circuit(g, t, info, o) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const cx = E.W / 2 - 60, cy = E.H * 0.44, P = brainSide(g, cx, cy, 340, alpha(BP(), 0.8));
  link(g, t, P.pfc, P.amy, BLUE, { strength: o.pfcLink, dashed: o.pfcLink < 0.5, dots: o.pfcLink < 0.5 ? 1 : 3 });
  if (o.stemLink > 0) link(g, t * 1.6, P.amy, P.stem, RED, { strength: o.stemLink, width: 6 + 6 * o.stemLink });
  region(g, P.pfc, 26, BLUE, o.pfcOn, 'CÓRTEX PRÉ-FRONTAL', { ly: -72, size: 34 });
  region(g, P.amy, 18 * (o.amyScale ?? 1), RED, o.amyOn, 'AMÍGDALA', { ly: 64, size: 34, pulse: pulse(t, o.amyRate ?? 2) });
  if (o.stemOn > 0) region(g, P.stem, 20, '#ff8a3a', o.stemOn, 'TRONCO CEREBRAL', { lx: -60, ly: 40, size: 32, align: 'right' });
  o.extra?.(g, P);
  g.restore();
}
// s030 — "Normalmente, a amígdala conversa com o córtex pré-frontal, a parte da frente do cérebro, logo atrás da testa."
registerShot('s030', { draw(g, t, info) {
  const tp = wt('córtex', info, 2.2);
  circuit(g, t, info, { pfcLink: ease.out(prog(t, tp, tp + 0.8)), pfcOn: ease.out(prog(t, tp - 0.2, tp + 0.3)), amyOn: 1, stemLink: 0, stemOn: 0,
    extra: (g, P) => { const tt = wt('testa', info, 5.6); UI.callout(g, t, { at: [P.pfc[0] + 60, P.pfc[1] - 10], to: [P.pfc[0] + 220, P.pfc[1] - 220], str: 'ATRÁS DA TESTA', color: BLUE, start: tt - 0.2 }); } });
} });
// s031 — "É ele que avalia a situação e diz: calma, não é tão grave."
registerShot('s031', { draw(g, t, info) {
  const tc = wt('calma', info, 2.4), calm = ease.inOut(prog(t, tc, tc + 1.2));
  circuit(g, t, info, { pfcLink: 1, pfcOn: 1, amyOn: 1 - 0.5 * calm, amyScale: 1 - 0.3 * calm, amyRate: 2 - calm, stemLink: 0, stemOn: 0,
    extra: (g, P) => { const a = ease.outBack(prog(t, tc - 0.1, tc + 0.3)); if (a > 0) { g.save(); g.translate(P.pfc[0] + 170, P.pfc[1] - 170); g.scale(a, a); rr(g, -130, -50, 260, 100, 46); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-60, 40], [-120, 90], [-20, 40]], '#f4efe6'); text(g, 'CALMA…', 0, 2, { size: 46, color: '#2a3a6a', font: FONTS.ui, weight: 900 }); g.restore(); } } });
} });
// s032 — "Sem sono, essa conversa ficou mais fraca."
registerShot('s032', { draw(g, t, info) {
  const k = ease.inOut(prog(t, 0.3, 1.8));
  circuit(g, t, info, { pfcLink: 1 - 0.8 * k, pfcOn: 1 - 0.6 * k, amyOn: 1, stemLink: 0, stemOn: 0 });
  UI.badge(g, { str: 'SEM SONO', color: RED, a: ease.out(prog(t, 0.1, 0.4)) });
} });
// s033 — "Ao mesmo tempo, a amígdala ficou mais conectada a uma região do tronco cerebral ligada à reação de alerta."
registerShot('s033', { draw(g, t, info) {
  const ts = wt('tronco', info, 3.0), k = ease.inOut(prog(t, ts - 0.4, ts + 1.2));
  circuit(g, t, info, { pfcLink: 0.2, pfcOn: 0.4, amyOn: 1, amyScale: 1 + 0.3 * k, amyRate: 2 + 3 * k, stemLink: k, stemOn: ease.out(prog(t, ts - 0.3, ts + 0.2)) });
  UI.badge(g, { str: 'SEM SONO', color: RED });
} });

// s034 — "Em outras palavras: o alarme ficou mais alto, e o freio ficou mais fraco."
registerShot('s034', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03);
  const ta = wt('alarme', info, 1.4), tf = wt('freio', info, 3.4), up = ease.outBack(prog(t, ta, ta + 0.6)), dn = ease.inOut(prog(t, tf, tf + 0.8));
  const ax = E.W * 0.3, fx = E.W * 0.7, y = E.H * 0.45;
  // alarme (sino) crescendo
  g.save(); g.translate(ax, y); const s = 0.6 + 0.6 * up; g.scale(s, s); g.rotate(up > 0 ? Math.sin(t * 40) * 0.12 : 0);
  glow(g, 0, 0, 240, RED, 0.4 * up); circle(g, -70, -40, 46, RED); circle(g, 70, -40, 46, RED); circle(g, 0, 0, 80, RED); circle(g, 0, 0, 62, '#f4efe6'); seg(g, [[0, 0], [0, -40]], 6, '#1a1622'); seg(g, [[0, 0], [30, 14]], 6, '#1a1622'); g.restore();
  text(g, 'ALARME', ax, y + 220, { size: 52, color: RED, font: FONTS.ui, weight: 900, spacing: 4, alpha: clamp(up * 2) });
  if (up > 0) text(g, '▲', ax + 200, y - 100, { size: 90, color: RED, alpha: clamp(up) });
  // freio (pedal) enfraquecendo
  g.save(); g.translate(fx, y); g.globalAlpha *= 1 - 0.55 * dn;
  rr(g, -90, -120, 180, 240, 30); g.fillStyle = alpha(BLUE, 0.25); g.fill(); g.strokeStyle = BLUE; g.lineWidth = 6; g.stroke();
  for (let i = -2; i <= 2; i++) seg(g, [[-60, i * 40], [60, i * 40]], 6, alpha(BLUE, 0.8));
  if (dn > 0.3) { g.strokeStyle = RED; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -120); g.lineTo(0, -40); g.lineTo(-20, 20); g.lineTo(30, 120); g.stroke(); }
  g.restore();
  text(g, 'FREIO', fx, y + 220, { size: 52, color: BLUE, font: FONTS.ui, weight: 900, spacing: 4, alpha: clamp(prog(t, tf - 0.4, tf)) * (1 - 0.4 * dn) });
  if (dn > 0) text(g, '▼', fx + 200, y - 100, { size: 90, color: BLUE, alpha: clamp(dn) });
  g.restore();
} });

// s040 — "principalmente a fase REM, a fase dos sonhos,"  hipnograma
registerShot('s040', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.03);
  const x0 = V(220, 100), x1 = E.W - x0, yTop = E.H * 0.3, step = 110, c = BP();
  const labels = ['ACORDADO', 'REM', 'LEVE', 'PROFUNDO'];
  labels.forEach((l, i) => text(g, l, x0 - 20, yTop + i * step, { size: 26, color: i === 1 ? GOLD() : alpha(c, 0.8), font: FONTS.ui, weight: 900, align: 'right' }));
  // sequência típica de uma noite (ilustrativa): nível por segmento
  const seq = [0, 2, 3, 2, 1, 2, 3, 2, 1, 2, 2, 1, 2, 1, 0];
  const p = ease.inOut(prog(t, 0.1, 2.0)), n = seq.length, segW = (x1 - x0 - 60) / n, end = p * n;
  g.lineWidth = 6; g.lineJoin = 'round';
  for (let i = 0; i < Math.min(n, Math.ceil(end)); i++) {
    const xa = x0 + 30 + i * segW, xb = xa + segW * Math.min(1, end - i), y = yTop + seq[i] * step;
    if (seq[i] === 1) { rr(g, xa, y - 22, xb - xa, 44, 10); g.fillStyle = alpha(GOLD(), 0.85); g.fill(); glow(g, (xa + xb) / 2, y, 80, GOLD(), 0.4); }
    else seg(g, [[xa, y], [xb, y]], 6, c);
    if (i > 0) seg(g, [[xa, yTop + seq[i - 1] * step], [xa, y]], 3, alpha(c, 0.6));
  }
  text(g, 'SONHOS', E.W / 2, E.H * 0.82, { size: 54, color: GOLD(), font: FONTS.ui, weight: 900, spacing: 6, alpha: ease.out(prog(t, wt('sonhos', info, 2.2) - 0.2, wt('sonhos', info, 2.2) + 0.3)) });
  text(g, 'UMA NOITE DE SONO (ILUSTRATIVO)', E.W / 2, E.H * 0.14, { size: 30, color: alpha(c, 0.8), font: FONTS.ui, weight: 900, spacing: 3 });
  g.restore();
} });

// s043 — "Ou seja: dormir não é só descansar. É também processar o que você sentiu."
registerShot('s043', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const P = brainSide(g, E.W / 2, E.H * 0.45, 260, BP()), tp = wt('processar', info, 3.0), on = ease.out(prog(t, tp - 0.3, tp + 0.3));
  for (let i = 0; i < 7; i++) {
    const ph = ((t * 0.35 + i / 7) % 1), x = lerp(E.W * 0.08, E.W * 0.92, ph), y = E.H * 0.45 + Math.sin(ph * Math.PI * 2 + i) * 60;
    const k = clamp((ph - 0.4) / 0.2), proc = on > 0 ? k : 0;
    const col = `rgb(${Math.round(lerp(255, 127, proc))},${Math.round(lerp(90, 208, proc))},${Math.round(lerp(74, 255, proc))})`;
    if (ph > 0.42 && ph < 0.58) continue;
    glow(g, x, y, 50, col, 0.5); circle(g, x, y, 18, col);
  }
  text(g, 'DESCANSAR', E.W / 2, E.H * 0.13, { size: 46, color: alpha(BP(), 0.9), font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.6, 1.0)) * (1 - 0.6 * on) });
  text(g, '+ PROCESSAR EMOÇÕES', E.W / 2, E.H * 0.86, { size: 52, color: GOLD(), font: FONTS.ui, weight: 900, spacing: 4, alpha: on });
  g.restore();
} });

// s045 — "Mas a mensagem é clara: para a maioria dos adultos, os especialistas recomendam sete horas ou mais de sono por noite."
registerShot('s045', { draw(g, t, info) {
  UI.blueprint(g); g.save(); zoomIn(g, t, info.dur, 0.04);
  const c = BP(), cx = E.W / 2 - V(300, 0), cy = E.H * 0.48, R = 230, ts = wt('sete', info, 4.0), k = ease.inOut(prog(t, 0.4, ts + 0.6));
  ring(g, cx, cy, R, 10, alpha(c, 0.3));
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; seg(g, [[cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82], [cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92]], 4, alpha(c, 0.7)); }
  g.strokeStyle = GOLD(); g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + k * (7 / 12) * Math.PI * 2); g.stroke(); glow(g, cx, cy, R * 1.3, GOLD(), 0.12 * k);
  text(g, '☾', cx, cy, { size: 120, color: alpha('#fff1dc', 0.85) });
  text(g, '7+ HORAS', cx + V(560, 0), cy - 20, { size: 130, color: GOLD(), glow: 30, glowColor: alpha(GOLD(), 0.6), alpha: ease.out(prog(t, ts - 0.2, ts + 0.3)) });
  text(g, 'POR NOITE · ADULTOS', cx + V(560, 0), cy + 90, { size: 40, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, ts + 0.4, ts + 0.8)) });
  g.restore();
} });
