"""Trilha de fundo sintetizada por clima (sem licença de terceiros).

Climas: calmo, curioso, misterio, tenso, alegre, emocionante, triste, epico.
  python3 som/musica.py --clima curioso --duracao 20     # grava teste_curioso.wav
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sintese import SR, corda, eco, envelope, filtro, nota, normal, ruido, seno, serra, tempo  # noqa: E402

MAIOR, MENOR = [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]
# tom (MIDI da tônica), escala, bpm, progressão (graus 0-6), camadas
CLIMAS = {
    "calmo":       dict(tom=57, escala=MAIOR, bpm=72, prog=[0, 3, 5, 4], pad=0.5, corda=0.35, baixo=0.25, bateria=0.0, arp="lento"),
    "curioso":     dict(tom=62, escala=MAIOR, bpm=96, prog=[0, 5, 3, 4], pad=0.25, corda=0.55, baixo=0.3, bateria=0.25, arp="saltado"),
    "misterio":    dict(tom=57, escala=MENOR, bpm=78, prog=[0, 5, 2, 6], pad=0.55, corda=0.35, baixo=0.3, bateria=0.0, arp="sino"),
    "tenso":       dict(tom=52, escala=MENOR, bpm=112, prog=[0, 0, 5, 6], pad=0.4, corda=0.0, baixo=0.5, bateria=0.45, arp="pulso"),
    "alegre":      dict(tom=60, escala=MAIOR, bpm=118, prog=[0, 4, 5, 3], pad=0.2, corda=0.6, baixo=0.35, bateria=0.5, arp="saltado"),
    "emocionante": dict(tom=59, escala=MENOR, bpm=92, prog=[5, 3, 0, 4], pad=0.55, corda=0.45, baixo=0.35, bateria=0.35, arp="cheio"),
    "triste":      dict(tom=57, escala=MENOR, bpm=66, prog=[0, 5, 3, 4], pad=0.45, corda=0.4, baixo=0.2, bateria=0.0, arp="lento"),
    "epico":       dict(tom=50, escala=MENOR, bpm=96, prog=[0, 5, 6, 4], pad=0.6, corda=0.3, baixo=0.5, bateria=0.6, arp="cheio"),
}


def acorde(c, grau, oitava=0):
    e, base = c["escala"], c["tom"] + 12 * oitava
    return [base + e[(grau + k) % 7] + 12 * ((grau + k) // 7) for k in (0, 2, 4)]


def gerar(clima: str, d: float, semente: int = 0) -> np.ndarray:
    """Devolve estéreo (2, n) com d segundos de música no clima pedido."""
    c = CLIMAS.get(clima) or CLIMAS["curioso"]
    rng = np.random.default_rng(semente)
    n, batida = int(d * SR), 60 / c["bpm"]
    compasso = batida * 4
    E = np.zeros((2, n + SR * 3), np.float32)

    def por(x, t, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= n:
            return
        x = x[: E.shape[1] - i]
        E[0, i: i + len(x)] += x * g * (1 - max(0, pan)); E[1, i: i + len(x)] += x * g * (1 + min(0, pan))

    t, k = 0.0, 0
    while t < d:
        grau = c["prog"][k % len(c["prog"])]
        notas = acorde(c, grau)
        if c["pad"]:
            pad = sum(serra(nota(m) * (1 + det), compasso + 0.6, 10) for m in notas for det in (-0.004, 0.004))
            pad = filtro(pad.astype(np.float32), 90, 1300) * envelope(int((compasso + 0.6) * SR), 0.35, compasso * 3)
            por(pad, t, c["pad"] * 0.16, -0.2); por(pad, t + 0.012, c["pad"] * 0.16, 0.2)
        if c["baixo"]:
            for b in range(0, 4, 2 if c["arp"] != "pulso" else 1):
                m = notas[0] - 12
                x = (seno(nota(m), batida * 1.6) + 0.3 * seno(nota(m) * 2, batida * 1.6)) * envelope(int(batida * 1.6 * SR), 0.01, batida * 1.8)
                por(x, t + b * batida, c["baixo"] * 0.5)
        if c["corda"]:
            passo = {"lento": batida, "saltado": batida / 2, "sino": batida, "cheio": batida / 2, "pulso": batida / 2}[c["arp"]]
            seq = notas + [notas[1] + 12, notas[2]] if c["arp"] != "lento" else notas
            j, tt = 0, 0.0
            while tt < compasso - 1e-6:
                if not (c["arp"] == "saltado" and rng.random() < 0.18):
                    m = seq[j % len(seq)] + 12
                    dur = 0.35 if c["arp"] == "saltado" else 1.4
                    x = corda(nota(m), dur, 2.2 if c["arp"] == "sino" else 1.2, dur * (2.5 if c["arp"] == "sino" else 1))
                    por(x, t + tt, c["corda"] * 0.22, rng.uniform(-0.5, 0.5))
                j += 1; tt += passo
        if c["bateria"]:
            for b in range(4):
                tb = t + b * batida
                if b in (0, 2) or c["arp"] == "pulso":
                    kk = seno(np.geomspace(120, 48, int(0.25 * SR)), 0.25) * envelope(int(0.25 * SR), 0.001, 0.22)
                    por(kk, tb, c["bateria"] * 0.55)
                if b in (1, 3):
                    palma = filtro(ruido(int(0.12 * SR), int(tb * 100)), 900, 5000) * envelope(int(0.12 * SR), 0.001, 0.1)
                    por(palma, tb, c["bateria"] * 0.18)
                for h in (0, 0.5):
                    chimbal = filtro(ruido(int(0.04 * SR), int(tb * 1000 + h * 10)), 6000) * envelope(int(0.04 * SR), 0.0005, 0.035)
                    por(chimbal, tb + h * batida, c["bateria"] * 0.07, 0.3)
        t += compasso; k += 1
    out = E[:, :n]
    molhado = np.stack([eco(out[0], 1.8, 0.25, semente)[:n], eco(out[1], 1.8, 0.25, semente + 1)[:n]])
    return normal(molhado, 0.8)


if __name__ == "__main__":
    import argparse
    import wave
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--clima", default="curioso", choices=sorted(CLIMAS))
    ap.add_argument("--duracao", type=float, default=16)
    a = ap.parse_args()
    x = gerar(a.clima, a.duracao)
    with wave.open(f"teste_{a.clima}.wav", "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x.T, -1, 1) * 32000).astype("<i2").tobytes())
    print(f"teste_{a.clima}.wav")
