// Capa do vídeo do Asch no padrão do canal: personagem com emoção forte à ESQUERDA, símbolo do tema à DIREITA,
// fundo azul-marinho com brilho roxo. O título e o selo entram depois, por cima (texto nítido).
import { E, registerShot, linGrad, glow } from '/engine/core.js';
import { drawFigure, POSES, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import { beam, cards } from '/projects/conformidade-asch/scenes/sets/common.js';
import { YOU, EXTRA } from '/projects/conformidade-asch/scenes/cast.js';

registerShot('CAPA', { draw(g, t) {
  const GY = E.H * 0.97;
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#060a1c', '#0c1536', '#0a1030']); g.fillRect(0, 0, E.W, E.H);
  glow(g, E.W * 0.7, E.H * 0.62, 760, '#7b3cff', 0.5);
  glow(g, E.W * 0.86, E.H * 0.35, 420, '#b05cff', 0.25);
  // direita: o grupo apontando, e os cartões (B é a certa; o grupo aponta a errada)
  for (let i = 0; i < 5; i++) {
    const x = E.W * 0.52 + i * 140;
    drawFigure(g, { x, y: GY, s: 1.05, facing: -1, outfit: EXTRA, pose: POSES.point, expr: 'smirk', rim: { color: '#a98cff', dir: [0, -1] } });
  }
  cards(g, E.W * 0.71, E.H * 0.53, 540, { hi: 'A', hiColor: '#ff5a4f' });
  // esquerda: você, nervoso, na luz quente
  beam(g, E.W * 0.25, GY, 820, 0.85, '#ffd49a', -60);
  glow(g, E.W * 0.25, E.H * 0.62, 460, '#ffb060', 0.35);
  bigFace(g, E.W * 0.25, E.H * 0.7, 300, { outfit: YOU, expr: 'nervous', face: { brows: 'raised', mouth: 'wavy' }, look: [0.7, 0], rimColor: '#ffc27a', rimSide: 1, blink: false });
  FX.dust(g, 3, { count: 40, color: '#ffe2c0', a: 0.3 });
} });
