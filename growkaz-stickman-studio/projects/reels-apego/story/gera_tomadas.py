# Gera story/shots.json do Reels "estilos de apego": cada tomada ancorada no início de uma frase ou numa palavra (re-sincroniza com o áudio real).
import json, re, sys, os
proj = sys.argv[1]; W = json.load(open(os.path.join(proj, 'timeline/words.json')))['words']
norm = lambda w: re.sub(r"[^a-z0-9_']", '', w.lower())
S = [W[0]['start']] + [W[i + 1]['start'] for i, w in enumerate(W[:-1]) if re.search(r'[.?!]$', w['word'])]
def wt(m, i, fb=1.5):
    m = norm(m)
    for w in W:
        if w['start'] >= S[i] - 0.05 and norm(w['word']).startswith(m): return w['start']
    return S[i] + fb
D = round(W[-1]['end'] + 1.8, 2)
A = [('S01', 0), ('S02', wt('quando', 0, 2.5)), ('S03', S[1]), ('S04', wt('reagiam', 1, 3)), ('S05', S[2]), ('S06', S[3]), ('S07', S[4]), ('S08', S[5]), ('S09', S[6]), ('S10', wt('cada', 6, 2.5)),
     ('S11', S[7]), ('S12', S[8]), ('S13', S[9]), ('S14', S[10]), ('S15', S[11]), ('S16', wt('também', 11, 2.0)), ('S17', S[12]), ('S18', S[13]), ('S19', S[14]), ('S20', wt('ele', 14, 2.2)), ('S21', S[15]), ('S22', S[16])]
starts = [0 if i == 0 else round(t - 0.2, 2) for i, (_, t) in enumerate(A)]
WORLD = {'S01': 'park', 'S02': 'sala', 'S03': 'sala', 'S04': 'sala', 'S05': 'sala', 'S06': 'studio', 'S07': 'apt', 'S08': 'apt', 'S09': 'apt', 'S10': 'apt', 'S11': 'park', 'S12': 'park', 'S13': 'park', 'S14': 'park', 'S15': 'park', 'S16': 'park', 'S17': 'park', 'S18': 'park', 'S19': 'park', 'S20': 'apt', 'S21': 'studio', 'S22': 'studio'}
AMB = {'park': ('wind', -34), 'sala': ('roomtone', -32), 'studio': ('roomtone', -36), 'apt': ('roomtone', -30)}
TR = {'S02': ('whip', 0.3), 'S06': ('fade', 0.3), 'S07': ('whip', 0.3), 'S11': ('whip', 0.3), 'S14': ('whip', 0.3), 'S17': ('fade', 0.35), 'S20': ('whip', 0.3), 'S21': ('fade', 0.35)}
pop = wt('sentença', 13, 1.2) - 0.25; tG = wt('perceberam', 2, 3) - 0.4
SFX = {'S01': [[0.2, 'shimmer', -16], [0.5, 'pop', -14]], 'S02': [[0.5, 'blip', -16]], 'S03': [[0.6, 'swish', -20]], 'S04': [[0.3, 'ding', -16]],
       'S05': [[max(0.3, tG - starts[4]), 'shimmer', -12], [max(0.6, tG - starts[4] + 1.5), 'pop', -16]], 'S06': [[0.5, 'stinger', -18], [1.0, 'pop', -16], [1.3, 'pop', -16], [1.6, 'pop', -16]],
       'S07': [[0.1, 'ding', -14]], 'S08': [[0.5, 'thunder', -22], [0.6, 'heartbeat', -18]], 'S09': [[wt(m, 6, f) - starts[8] + d, 'blip', -12] for m, f, d in [('manda', 0.1, 0.05), ('espera', 1.0, 0.05), ('resposta', 1.6, 0.25)]],
       'S10': [[0.1, 'clock', -14]], 'S11': [[0.1, 'ding', -14]], 'S12': [[0.35, 'pop', -16]], 'S13': [[0.3, 'powerup', -16]], 'S14': [[0.1, 'ding', -14]], 'S15': [[0.7, 'pop', -16], [0.9, 'shimmer', -18]],
       'S16': [[0.3, 'swish', -18]], 'S17': [[0.2, 'shimmer', -14]], 'S18': [[max(0.1, pop - starts[17]), 'pop', -8], [max(0.15, pop - starts[17] + 0.05), 'hit', -16]], 'S19': [[1.8, 'cheer', -20]], 'S20': [[0.2, 'phonebuzz', -12]],
       'S21': [[0.4, 'pop', -16], [0.65, 'pop', -16], [0.9, 'pop', -16]], 'S22': [[0.2, 'cheer', -16], [0.4, 'ding', -12]]}
out = []
for i, (sid, _) in enumerate(A):
    st = starts[i]; en = starts[i + 1] if i + 1 < len(A) else D; tr = TR.get(sid, ('cut', 0)); w = WORLD[sid]
    out.append({'id': sid, 'start': st, 'end': en, 'line': '', 'scene': sid, 'bars': 'none', 'in': {'type': tr[0], **({'dur': tr[1]} if tr[0] != 'cut' else {})},
                'sfx': [{'at': round(a, 2), 'name': n, 'gain': g} for a, n, g in SFX.get(sid, [])], 'amb': {'name': AMB[w][0], 'gain': AMB[w][1]}})
mus = [{'start': 0, 'end': round(S[12] - 0.2, 2), 'mood': 'calm', 'intensity': 0.42}, {'start': round(S[12] - 0.2, 2), 'end': D, 'mood': 'hopeful', 'intensity': 0.5}]
json.dump({'title': 'Os 3 estilos de apego', 'duration': D, 'shots': out, 'music': mus}, open(os.path.join(proj, 'story/shots.json'), 'w'), ensure_ascii=False, indent=1)
cfg = json.load(open(os.path.join(proj, 'config.json'))); cfg['duration'] = D; json.dump(cfg, open(os.path.join(proj, 'config.json'), 'w'), ensure_ascii=False, indent=1)
for o in out: print(o['id'], o['start'], round(o['end'] - o['start'], 2))
print(len(out), 'tomadas, duração', D)
