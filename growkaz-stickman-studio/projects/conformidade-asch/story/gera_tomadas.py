# Gera story/shots.json do vídeo "Asch / conformidade": cada tomada ancorada no início de uma frase ou numa palavra
# da narração, então tudo re-sincroniza sozinho quando a narração real chegar (basta realinhar words.json e rodar de novo).
import json, re, sys, os
proj = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(proj, 'timeline/words.json')))['words']
norm = lambda w: re.sub(r"[^a-z0-9_']", '', w.lower())
S = [W[0]['start']] + [W[i + 1]['start'] for i, w in enumerate(W[:-1]) if re.search(r'[.?!]$', w['word'])]
def wt(m, i, fb=1.5):
    m = norm(m)
    for w in W:
        if w['start'] >= S[i] - 0.05 and norm(w['word']).startswith(m): return w['start']
    return S[i] + fb
TAIL = 9.0  # tela final: espaço para os elementos de fim de vídeo do YouTube
D = round(W[-1]['end'] + TAIL, 2)
# (id, âncora, transição, barras, ambiente, efeitos [(t relativo ou ('w', palavra, frase, desloc)), nome, ganho])
A = [
 ('A01', S[0], 'cut', 'none', 'roomtone', [(0.2, 'riser', -16)]),
 ('A02', S[2], 'cut', 'none', 'roomtone', [(('w', 'A', 2, 0), 'blip', -12), (('w', 'B', 2, 0), 'blip', -12), (('w', 'C', 2, 0), 'blip', -12)]),
 ('A03', S[3], 'cut', None, 'roomtone', [(0.2, 'tick', -16)]),
 ('A04', S[4], 'cut', None, 'murmur', [(('w', 'uma', 4, 0), 'pop', -14), (('w', 'outra', 4, 0), 'pop', -14), (('w', 'errada', 4, 0), 'pop', -12)]),
 ('A05', S[5], 'cut', None, 'murmur', [(0.2, 'pop', -14)]),
 ('A06', S[6], 'cut', None, 'roomtone', [(0.1, 'heartbeat', -10)]),
 ('A07', S[7], 'flash', 'scope', None, [(0.0, 'freeze', -8), (0.4, 'heartbeat', -8)]),
 ('A08', S[8], 'dip', 'scope', 'hum', [(0.3, 'riser', -14)]),
 ('A09', S[9], 'fade', 'scope', 'wind', [(0.1, 'stinger', -8)]),
 ('B01', S[10], 'dip', None, 'roomtone', [(0.4, 'swish', -16)]),
 ('B02', wt('só', 10), 'cut', None, 'roomtone', []),
 ('B03', S[11], 'whip', None, 'murmur', [(0.0, 'whoosh', -14)]),
 ('B04', wt('todo', 11), 'cut', None, 'murmur', []),
 ('B05', S[12], 'cut', None, None, [(('w', 'fraqueza', 12, 0), 'impact', -8)]),
 ('B06', S[13], 'cut', 'none', None, [(0.3, 'tick', -14)]),
 ('C01', S[14], 'dip', None, 'wind', [(0.2, 'counter', -14)]),
 ('C02', wt('Solomon', 14), 'cut', None, 'roomtone', [(0.3, 'blip', -16)]),
 ('C03', wt('convidou', 14), 'cut', None, 'murmur', [(0.2, 'footstep', -16)]),
 ('C04', S[15], 'cut', None, 'roomtone', [(0.3, 'shimmer', -14)]),
 ('C05', S[16], 'cut', None, 'roomtone', [(0.6, 'pop', -16), (1.0, 'pop', -16), (1.4, 'pop', -16)]),
 ('C06', S[17], 'cut', None, 'roomtone', [(0.5, 'ding', -16)]),
 ('C07', S[18], 'whip', None, 'roomtone', [(0.0, 'whoosh', -12), (('w', 'errada', 18, 0), 'stinger', -10)]),
 ('C08', wt('mesma', 18), 'cut', 'scope', None, [(0.1, 'heartbeat', -8)]),
 ('C09', S[19], 'cut', 'none', 'roomtone', [(('w', 'menos', 19, 0), 'counter', -12)]),
 ('C10', S[20], 'cut', 'none', None, [(('w', 'terço', 20, 0), 'pop', -12)]),
 ('C11', S[21], 'cut', 'none', None, [(('w', 'três', 21, 0), 'blip', -12)]),
 ('C12', S[22], 'cut', 'none', None, [(('w', 'B', 22, 0), 'ding', -8)]),
 ('D01', S[23], 'dip', None, 'hum', [(0.3, 'hum', -18)]),
 ('D02', S[24], 'zoom', 'none', None, [(0.1, 'counter', -10), (('w', 'cérebro', 24, -0.4), 'riser', -12)]),
 ('E01', S[25], 'dip', None, 'hum', [(0.3, 'hum', -16)]),
 ('E02', wt('Gregory', 25), 'cut', None, 'hum', [(0.3, 'blip', -16)]),
 ('E03', wt('levou', 25), 'cut', None, 'hum', [(0.3, 'powerup', -16)]),
 ('E04', S[26], 'zoom', 'none', None, [(('w', 'percepção', 26, 0), 'shimmer', -12)]),
 ('E05', S[27], 'cut', None, 'roomtone', [(0.3, 'pop', -16)]),
 ('E06', S[28], 'cut', 'scope', None, [(0.2, 'slowmo', -10)]),
 ('E07', S[29], 'cut', 'none', None, [(('w', 'amígdala', 29, 0), 'buzz', -12)]),
 ('E08', wt('região', 29), 'cut', 'scope', 'hum', [(0.1, 'heartbeat', -8)]),
 ('E09', S[30], 'cut', 'none', None, [(0.2, 'heartbeat', -10)]),
 ('F01', S[31], 'whip', None, None, [(0.0, 'whoosh', -14), (('w', 'inscreve', 31, 0), 'pop', -8), (('w', 'canal', 31, 0.2), 'ding', -10)]),
 ('F02', S[32], 'cut', None, None, [(0.2, 'shimmer', -14)]),
 ('G01', S[33], 'dip', 'scope', 'hum', [(0.2, 'riser', -14)]),
 ('G02', S[34], 'cut', None, 'roomtone', [(('w', 'variação', 34, 0), 'blip', -14)]),
 ('G03', wt('única', 34), 'cut', None, 'roomtone', [(0.4, 'shimmer', -12)]),
 ('G04', S[35], 'cut', 'scope', None, [(0.2, 'ding', -10)]),
 ('G05', S[36], 'flash', None, None, [(0.0, 'impact', -6)]),
 ('G06', S[37], 'cut', 'none', None, [(('w', 'quarto', 37, 0), 'pop', -10)]),
 ('H01', S[38], 'whip', None, 'wind', [(0.0, 'whoosh', -12)]),
 ('H02', S[39], 'cut', None, 'wind', [(0.3, 'swish', -12), (0.9, 'footstep', -12)]),
 ('H03', S[40], 'cut', None, 'wind', [(0.5, 'footstep', -12)]),
 ('H04', wt('firmar', 40), 'cut', None, 'wind', [(0.15, 'impact', -6)]),
 ('I01', S[41], 'dip', None, 'roomtone', [(0.4, 'swish', -18)]),
 ('I02', wt('erros', 41), 'cut', 'none', None, [(0.2, 'counter', -12)]),
 ('I03', S[42], 'cut', None, None, [(0.4, 'ding', -14)]),
 ('I04', S[43], 'cut', 'scope', 'wind', [(0.2, 'slowmo', -14)]),
 ('J01', S[44], 'dip', None, None, [(0.3, 'tick', -16)]),
 ('J02', wt('cultura', 44), 'cut', 'none', None, [(0.2, 'blip', -14)]),
 ('K01', S[45], 'dip', None, 'roomtone', [(('w', 'herói', 45, 0), 'shimmer', -12)]),
 ('K02', S[46], 'cut', None, 'roomtone', [(0.2, 'ding', -12)]),
 ('K03', S[47], 'cut', None, 'roomtone', [(0.3, 'heartbeat', -14)]),
 ('K04', wt('esperando', 47), 'cut', 'scope', 'roomtone', [(0.2, 'shimmer', -10)]),
 ('L01', S[48], 'fade', 'none', None, [(0.3, 'shimmer', -16)]),
 ('L02', S[49], 'cut', 'none', None, [(0.1, 'pop', -10)]),
 ('L03', S[50], 'whip', 'none', None, [(0.0, 'whoosh', -12)]),
 ('L04', S[51], 'cut', 'none', None, [(0.2, 'ding', -12)]),
]
starts = [0 if i == 0 else round(a[1] - 0.15, 2) for i, a in enumerate(A)]
AMBG = {'roomtone': -30, 'murmur': -27, 'wind': -30, 'hum': -30}
out = []
for i, (sid, _, tr, bars, amb, fx) in enumerate(A):
    st = starts[i]; en = starts[i + 1] if i + 1 < len(A) else D
    sfx = []
    for at, name, gain in fx:
        if isinstance(at, tuple): at = wt(at[1], at[2]) + at[3] - st
        if 0 <= at < en - st: sfx.append({'at': round(at, 2), 'name': name, 'gain': gain})
    sh = {'id': sid, 'start': st, 'end': en, 'line': '', 'scene': sid, 'bars': bars, 'in': {'type': tr, **({'dur': 0.35} if tr != 'cut' else {})}, 'sfx': sfx}
    if amb: sh['amb'] = {'name': amb, 'gain': AMBG[amb]}
    out.append(sh)
def sec(a, b, mood, k): return {'start': round(a, 2), 'end': round(b, 2), 'mood': mood, 'intensity': k}
cut = lambda i: starts[[x[0] for x in A].index(i)]
mus = [sec(0, cut('A09'), 'tension', 0.45), sec(cut('A09'), cut('C01'), 'playful', 0.32), sec(cut('C01'), cut('D01'), 'mystery', 0.42),
       sec(cut('D01'), cut('F01'), 'dark', 0.5), sec(cut('F01'), cut('G01'), 'calm', 0.3), sec(cut('G01'), cut('J01'), 'hopeful', 0.55),
       sec(cut('J01'), cut('L01'), 'wonder', 0.45), sec(cut('L01'), D, 'hopeful', 0.4)]
json.dump({'title': 'Por que você concorda com o grupo mesmo sabendo que ele está errado', 'duration': D, 'shots': out, 'music': mus},
          open(os.path.join(proj, 'story/shots.json'), 'w'), ensure_ascii=False, indent=1)
cfg = json.load(open(os.path.join(proj, 'config.json'))); cfg['duration'] = D; json.dump(cfg, open(os.path.join(proj, 'config.json'), 'w'), ensure_ascii=False, indent=1)
durs = sorted(o['end'] - o['start'] for o in out)
print(len(out), 'tomadas, duração', D, '| mediana', round(durs[len(durs) // 2], 2), 'min', round(durs[0], 2), 'max', round(durs[-1], 2))
