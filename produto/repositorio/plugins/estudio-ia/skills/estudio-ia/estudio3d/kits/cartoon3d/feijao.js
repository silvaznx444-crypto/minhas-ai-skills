// kits/cartoon3d/ feijao.js — personagem "feijão": cabeça preta redonda, olhos grandes expressivos, corpo pequeno com uma peça colorida.
// drawBean(g, x, y, s, o): desenha com os pés em (x, y). Altura total ≈ 290 * s (cabeça r = 62 * s).
// o = { color, expr, look:[x,y], blink, talk, arms, walk, facing, acc:[...], blush, sweat, scale }
// expr: neutral | happy | sad | shocked | love | angry | sleepy | suspicious | worried | crying | stars
// arms: down | wave | point | cheer | hug | face (mãos no rosto) | phone | shrug
// acc: hood | headphones | bun | glasses | cap | bow | tie
import { E, lim as clamp, mix as lerp } from '/motor/nucleo.js';
import { circle, ring, rr, seg, poly, glow, alpha, shade } from '/motor/desenho.js';

const INK = '#0b0a10';
function heart(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.8, y - s * 1.4, x, y - s * 0.55); g.bezierCurveTo(x + s * 0.8, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); g.fill(); }
export { heart };

export function drawBean(g, x, y, s = 1, o = {}) {
  const c = o.color || '#d64a33', f = o.facing ?? 1, ex = o.expr || 'neutral', ph = o.walk ?? null;
  const R = 62, hipY = -78, shY = -150, hy = -150 - R * 0.82;
  g.save(); g.translate(x, y); g.scale(s * f, s);
  if (o.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 4, 48, 10, 0, 0, Math.PI * 2); g.fill(); }
  // pernas
  const step = ph == null ? 0 : Math.sin(ph) * 16, lift = ph == null ? 0 : Math.max(0, Math.cos(ph)) * 8, lift2 = ph == null ? 0 : Math.max(0, -Math.cos(ph)) * 8;
  g.lineCap = 'round'; g.lineJoin = 'round';
  seg(g, [[-14, hipY], [-14 + step, -6 - lift]], 9, INK); seg(g, [[14, hipY], [14 - step, -6 - lift2]], 9, INK);
  g.fillStyle = INK; g.beginPath(); g.ellipse(-10 + step, -4 - lift, 15, 7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(18 - step, -4 - lift2, 15, 7, 0, 0, Math.PI * 2); g.fill();
  // braços (atrás e na frente do corpo)
  const A = { down: [[-50, -88], [50, -88]], wave: [[-50, -88], [70, -215]], point: [[-48, -90], [95, -150]], cheer: [[-70, -220], [70, -220]], hug: [[60, -130], [70, -118]], face: [[-34, -205], [34, -205]], phone: [[-46, -92], [30, -180]], shrug: [[-78, -160], [78, -160]] }[o.arms || 'down'];
  const wv = o.arms === 'wave' ? Math.sin((o.t || 0) * 10) * 14 : 0;
  const armL = [[-38, shY + 18], A[0]], armR = [[38, shY + 18], [A[1][0] + wv, A[1][1]]];
  // corpo/roupa
  const bob = ph == null ? Math.sin((o.t || 0) * 2.2) * 1.5 : Math.abs(Math.sin(ph)) * -4;
  g.translate(0, bob);
  seg(g, armL, 8, INK); circle(g, armL[1][0], armL[1][1], 8, INK);
  rr(g, -42, shY, 84, hipY - shY + 10, 22); g.fillStyle = c; g.fill();
  g.fillStyle = shade(c, -0.25); g.fillRect(-2, shY + 10, 4, hipY - shY - 14);
  for (const by of [shY + 26, shY + 46]) circle(g, 8, by, 3.2, shade(c, -0.45));
  if (o.acc?.includes('tie')) poly(g, [[0, shY + 4], [-7, shY + 16], [0, shY + 56], [7, shY + 16]], '#2a3a8a');
  if (o.prop === 'phone') { rr(g, 18, -196, 26, 44, 5); g.fillStyle = '#1a1a22'; g.fill(); rr(g, 21, -192, 20, 34, 3); g.fillStyle = '#9fd8ff'; g.fill(); }
  if (o.prop === 'book') { rr(g, -30, -128, 56, 40, 4); g.fillStyle = '#3a6ea5'; g.fill(); }
  seg(g, armR, 8, INK); circle(g, armR[1][0], armR[1][1], 8, INK);
  // cabeça
  g.translate(0, hy);
  if (o.acc?.includes('hood')) { circle(g, 0, 6, R * 1.12, shade(c, -0.12)); }
  if (o.acc?.includes('bun')) circle(g, 0, -R * 1.02, R * 0.36, INK);
  circle(g, 0, 0, R, INK);
  g.save(); g.globalAlpha *= 0.18; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, R - 6, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); g.restore();
  if (o.acc?.includes('cap')) { g.fillStyle = o.capColor || '#f2c21a'; g.beginPath(); g.arc(0, -10, R * 1.0, Math.PI, Math.PI * 2); g.fill(); rr(g, 0, -16, R * 1.25, 14, 7); g.fill(); }
  // olhos
  const lx = clamp(o.look?.[0] ?? 0, -1, 1) * 7, ly = clamp(o.look?.[1] ?? 0, -1, 1) * 7, eyeY = 2;
  const W = '#ffffff';
  const eye = (sx) => {
    const ex0 = sx * 22;
    if (ex === 'love') { heart(g, ex0, eyeY, 17, '#ff4a7a'); return; }
    if (ex === 'stars') { g.fillStyle = '#ffe680'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 8 : 19; g.lineTo(ex0 + Math.cos(a) * r, eyeY + Math.sin(a) * r); } g.closePath(); g.fill(); return; }
    if (ex === 'happy') { g.strokeStyle = W; g.lineWidth = 7; g.beginPath(); g.arc(ex0, eyeY + 8, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    if (o.blink || ex === 'sleepy') { g.strokeStyle = W; g.lineWidth = 6; g.beginPath(); g.arc(ex0, eyeY - 6, 14, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); return; }
    const big = ex === 'shocked' ? 1.25 : 1, er = 19 * big, pr = ex === 'shocked' ? 5 : 9;
    g.fillStyle = W; g.beginPath(); g.ellipse(ex0, eyeY, er, er * 1.1, 0, 0, Math.PI * 2); g.fill();
    circle(g, ex0 + lx, eyeY + ly + 2, pr, INK); circle(g, ex0 + lx - 3, eyeY + ly - 2, pr * 0.32, W);
    g.fillStyle = INK; // pálpebras
    if (ex === 'sad' || ex === 'worried' || ex === 'crying') { g.beginPath(); g.moveTo(ex0 - er - 2, eyeY - er * 0.2 * (sx > 0 ? 1 : -1) * -1 - er * 0.55); g.lineTo(ex0 + er + 2, eyeY - er * 0.55 + (sx > 0 ? er * 0.45 : -er * 0.45) * -1); g.lineTo(ex0 + er + 2, eyeY - er * 1.3); g.lineTo(ex0 - er - 2, eyeY - er * 1.3); g.fill(); }
    if (ex === 'angry') { g.beginPath(); g.moveTo(ex0 - er - 2, eyeY - er * 1.3); g.lineTo(ex0 + er + 2, eyeY - er * 1.3); g.lineTo(ex0 + er + 2, eyeY - er * 0.4 + (sx > 0 ? -er * 0.5 : er * 0.5)); g.lineTo(ex0 - er - 2, eyeY - er * 0.4 + (sx > 0 ? er * 0.5 : -er * 0.5)); g.fill(); }
    if (ex === 'suspicious') { g.fillRect(ex0 - er - 2, eyeY - er * 1.3, er * 2 + 4, er * 1.05); }
  };
  eye(-1); eye(1);
  if (ex === 'crying') for (const sx of [-1, 1]) { const k = ((o.t || 0) * 1.2 + (sx > 0 ? 0.5 : 0)) % 1; g.fillStyle = alpha('#7fd0ff', 1 - k); g.beginPath(); g.ellipse(sx * 22, eyeY + 22 + k * 50, 5, 8, 0, 0, Math.PI * 2); g.fill(); }
  // sobrancelhas
  if (o.brows || ['worried', 'angry', 'suspicious'].includes(ex)) { const tilt = ex === 'angry' ? 1 : ex === 'worried' ? -1 : 0; for (const sx of [-1, 1]) seg(g, [[sx * 34, -26 - tilt * 6 * 1], [sx * 10, -26 + tilt * 6]], 5, W); }
  // boca
  const talk = o.talk ? Math.abs(Math.sin((o.t || 0) * 14)) : 0, mouth = o.mouth || ({ happy: 'smile', love: 'smile', shocked: 'o', sad: 'frown', crying: 'frown', angry: 'flat', stars: 'grin' }[ex] || (talk ? 'o' : null));
  g.fillStyle = W; g.strokeStyle = W; g.lineWidth = 5; g.lineCap = 'round';
  if (talk) { g.beginPath(); g.ellipse(0, 32, 9, 3 + talk * 8, 0, 0, Math.PI * 2); g.fill(); }
  else if (mouth === 'smile') { g.beginPath(); g.arc(0, 26, 12, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  else if (mouth === 'grin') { g.beginPath(); g.moveTo(-16, 26); g.quadraticCurveTo(0, 50, 16, 26); g.closePath(); g.fill(); }
  else if (mouth === 'frown') { g.beginPath(); g.arc(0, 42, 11, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (mouth === 'o') { g.beginPath(); g.ellipse(0, 34, 7, 9, 0, 0, Math.PI * 2); g.fill(); }
  else if (mouth === 'flat') { seg(g, [[-10, 32], [10, 32]], 5, W); }
  if (o.blush) for (const sx of [-1, 1]) { g.fillStyle = 'rgba(255,110,140,.55)'; g.beginPath(); g.ellipse(sx * 36, 22, 11, 6, 0, 0, Math.PI * 2); g.fill(); }
  if (o.sweat) { g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(48, -40); g.quadraticCurveTo(60, -18, 48, -14); g.quadraticCurveTo(36, -18, 48, -40); g.fill(); }
  if (o.acc?.includes('glasses')) { for (const sx of [-1, 1]) ring(g, sx * 22, eyeY, 24, 4, '#e8e8f0'); seg(g, [[-2, eyeY], [2, eyeY]], 4, '#e8e8f0'); }
  if (o.acc?.includes('headphones')) { const hc = o.phonesColor || '#f2c21a'; g.strokeStyle = hc; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, R + 6, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); rr(g, -R - 16, -14, 20, 38, 9); g.fillStyle = hc; g.fill(); rr(g, R - 4, -14, 20, 38, 9); g.fill(); }
  if (o.acc?.includes('bow')) { heart(g, -R * 0.55, -R * 0.75, 10, '#ff6a9a'); }
  g.restore();
}

// ---------- billboard 3D: o feijão desenhado num canvas vira um sprite dentro da cena Three.js ----------
export function beanSprite(THREE, o = {}) {
  const cw = 256, ch = 400, c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.center.set(0.5, 0.04);
  const h = o.height || 1.7, H = h * ch / 215; sp.scale.set(H * cw / ch, H, 1);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32 * (h / 1.7), 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); shadow.rotation.x = -Math.PI / 2;
  const group = new THREE.Group(); group.add(sp, shadow); shadow.position.y = 0.02;
  return {
    group, sprite: sp,
    draw(opts) { g.clearRect(0, 0, cw, ch); drawBean(g, cw / 2, ch - 18, 0.78, { shadow: false, ...o, ...opts }); tex.needsUpdate = true; },
  };
}
