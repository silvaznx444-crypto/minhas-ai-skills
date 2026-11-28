"""Efeitos sonoros e ambientes sintetizados (sem arquivos de terceiros).

  python3 som/efeitos.py --lista            # nomes disponíveis
  python3 som/efeitos.py --ouvir pop        # grava construcao_teste_pop.wav para ouvir
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sintese import SR, corda, eco, envelope, fade, filtro, normal, nota, ruido, seno, tempo  # noqa: E402


def pop(s=0):
    d = 0.09; f = np.linspace(950, 260, int(d * SR))
    return normal(seno(f, d) * envelope(int(d * SR), 0.002, 0.08) + filtro(ruido(int(d * SR), s), 2000) * envelope(int(d * SR), 0.001, 0.01) * 0.3)


def estalo(s=0):
    n = int(0.03 * SR); return normal(filtro(ruido(n, s), 2500) * envelope(n, 0.0005, 0.012))


def swoosh(s=0, d=0.55):
    n = int(d * SR); x = ruido(n, s); grave, agudo = filtro(x, 200, 900), filtro(x, 1500, 7000)
    k = np.sin(np.linspace(0, np.pi, n)) ** 2
    return normal((grave * (1 - k) + agudo * k) * k)


def ding(s=0, f=1320.0, d=1.6):
    t = tempo(d); x = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * q) * a for r, q, a in ((1, 3.2, 1.0), (2.76, 6.0, 0.4), (5.4, 11.0, 0.2)))
    return normal(eco(x.astype(np.float32) * envelope(len(t), 0.001, d * 3), 1.0, 0.18, s))


def plim(s=0):
    a, b = ding(s, 1568, 0.9), ding(s + 1, 2093, 1.1)
    out = np.zeros(len(b) + int(0.09 * SR), np.float32); out[: len(a)] += a * 0.8; out[int(0.09 * SR):] += b
    return normal(out)


def blip(s=0):
    d = 0.08; return normal(np.sign(seno(880, d)) * 0.5 * envelope(int(d * SR), 0.002, 0.07))


def batida(s=0):
    d = 0.5; f = np.geomspace(140, 45, int(d * SR))
    return normal(seno(f, d) * envelope(int(d * SR), 0.002, 0.45) + filtro(ruido(int(d * SR), s), None, 1200) * envelope(int(d * SR), 0.001, 0.08) * 0.5)


def grave(s=0):
    d = 2.2; f = np.geomspace(70, 32, int(d * SR))
    return normal(seno(f, d) * envelope(int(d * SR), 0.01, 2.0) + filtro(ruido(int(d * SR), s), None, 200) * envelope(int(d * SR), 0.005, 1.2) * 0.6)


def brilho(s=0, d=1.6):
    rng, t, out = np.random.default_rng(s), tempo(d), np.zeros(int(d * SR), np.float32)
    for _ in range(14):
        f, ini = rng.uniform(2200, 6500), rng.uniform(0, d * 0.6)
        out += (np.sin(2 * np.pi * f * t) * np.exp(-np.maximum(t - ini, 0) * 5) * (t > ini)).astype(np.float32)
    return normal(eco(out * np.sin(np.linspace(0, np.pi, len(out))), 1.2, 0.35, s))


def coracao(s=0):
    um = batida(s)[: int(0.25 * SR)] * 0.9; out = np.zeros(int(0.9 * SR), np.float32)
    out[: len(um)] += um; out[int(0.22 * SR): int(0.22 * SR) + len(um)] += um * 0.6
    return normal(filtro(out, None, 300))


def relogio(s=0):
    out = np.zeros(int(2.0 * SR), np.float32)
    for k in range(4):
        c = filtro(estalo(s + k), 1800 if k % 2 else 3000, 6000)
        out[int(k * 0.5 * SR): int(k * 0.5 * SR) + len(c)] += c
    return normal(out)


def trovao(s=0):
    d = 3.5; n = int(d * SR); x = filtro(ruido(n, s), None, 260)
    env = np.interp(np.arange(n), np.linspace(0, n, 12), np.abs(np.random.default_rng(s).standard_normal(12)) * np.linspace(1, 0.1, 12))
    return normal(x * env.astype(np.float32) * envelope(n, 0.05, 3.3))


def vibrar(s=0):
    out = np.zeros(int(1.2 * SR), np.float32)
    for k in range(3):
        z = np.sign(seno(170, 0.22)) * 0.6 * envelope(int(0.22 * SR), 0.005, 0.3); i = int(k * 0.36 * SR); out[i: i + len(z)] += z
    return normal(filtro(out, 80, 2500))


def torcida(s=0, d=2.4):
    n, rng = int(d * SR), np.random.default_rng(s); out = np.zeros(n, np.float32)
    for k in range(30):
        f = rng.uniform(400, 1400); x = filtro(ruido(n, s + k), f * 0.7, f * 1.6)
        out += x * np.interp(np.arange(n), np.linspace(0, n, 10), rng.uniform(0.2, 1, 10)).astype(np.float32)
    return normal(out * np.minimum(1, np.linspace(0, 6, n)) * np.linspace(1, 0.3, n))


def digitar(s=0, d=1.4):
    rng, out = np.random.default_rng(s), np.zeros(int(d * SR), np.float32)
    t = 0.02
    while t < d - 0.05:
        c = filtro(ruido(int(0.012 * SR), int(t * 1000) + s), 1500, 7000) * envelope(int(0.012 * SR), 0.0005, 0.01)
        out[int(t * SR): int(t * SR) + len(c)] += c * rng.uniform(0.5, 1); t += rng.uniform(0.06, 0.16)
    return normal(out)


def erro(s=0):
    a = np.sign(seno(220, 0.18)) * envelope(int(0.18 * SR), 0.005, 0.4); b = np.sign(seno(165, 0.3)) * envelope(int(0.3 * SR), 0.005, 0.5)
    return normal(filtro(np.concatenate([a, b]) * 0.5, 80, 2000))


def sucesso(s=0):
    out = np.zeros(int(1.2 * SR), np.float32)
    for k, m in enumerate((72, 76, 79, 84)):
        c = corda(nota(m), 0.7, 1.4, 0.6); i = int(k * 0.09 * SR); out[i: i + len(c)] += c
    return normal(eco(out, 1.0, 0.25, s))


# ---------------------------------------------------------------- ambientes (qualquer duração)
def amb_sala(d, s=0):
    x = filtro(ruido(int(d * SR), s), 40, 220) + seno(60, d) * 0.03
    return normal(x, 0.5)


def amb_vento(d, s=0):
    n = int(d * SR); x = filtro(ruido(n, s), 180, 1100)
    lfo = 0.6 + 0.4 * np.interp(np.arange(n), np.linspace(0, n, max(2, int(d / 1.5))), np.random.default_rng(s).uniform(0, 1, max(2, int(d / 1.5))))
    return normal(x * lfo.astype(np.float32), 0.5)


def amb_chuva(d, s=0):
    n, rng = int(d * SR), np.random.default_rng(s); x = filtro(ruido(n, s), 1800, 9000) * 0.6
    for _ in range(int(d * 40)):
        i = rng.integers(0, max(1, n - 600)); x[i: i + 600] += filtro(ruido(600, int(i)), 2500) * envelope(600, 0.0005, 0.01) * rng.uniform(0.3, 1)
    return normal(x, 0.5)


def amb_cidade(d, s=0):
    n, rng = int(d * SR), np.random.default_rng(s); x = filtro(ruido(n, s), 30, 400)
    for _ in range(max(1, int(d / 5))):
        c = min(n, int(rng.uniform(2.5, 4) * SR)); i = rng.integers(0, max(1, n - c + 1)); carro = filtro(ruido(c, int(i)), 80, 1500) * np.sin(np.linspace(0, np.pi, c)) ** 2
        x[i: i + c] += carro * 1.5
    return normal(x, 0.5)


def amb_natureza(d, s=0):
    n, rng = int(d * SR), np.random.default_rng(s); x = amb_vento(d, s) * 0.5
    for _ in range(max(1, int(d / 1.2))):
        c = int(0.12 * SR); i = rng.integers(0, max(1, n - c)); f = np.linspace(rng.uniform(2500, 4000), rng.uniform(3500, 6000), c)
        x[i: i + c] += seno(f, 0.12) * envelope(c, 0.005, 0.12) * 0.35
    return normal(x, 0.5)


def amb_noite(d, s=0):
    n = int(d * SR); grilo = seno(4600, d) * (np.sin(2 * np.pi * 28 * tempo(d)) > 0.3) * (np.sin(2 * np.pi * 0.7 * tempo(d)) > -0.2)
    return normal(filtro(grilo.astype(np.float32), 3000, 7000) * 0.4 + amb_vento(d, s) * 0.3, 0.5)


EFEITOS = {f.__name__: f for f in (pop, estalo, swoosh, ding, plim, blip, batida, grave, brilho, coracao, relogio, trovao, vibrar, torcida, digitar, erro, sucesso)}
AMBIENTES = {"sala": amb_sala, "vento": amb_vento, "chuva": amb_chuva, "cidade": amb_cidade, "natureza": amb_natureza, "noite": amb_noite}
# nomes em inglês aceitos como apelido
APELIDOS = {"whoosh": "swoosh", "swish": "swoosh", "click": "estalo", "hit": "batida", "boom": "grave", "shimmer": "brilho", "heartbeat": "coracao",
            "clock": "relogio", "thunder": "trovao", "phonebuzz": "vibrar", "cheer": "torcida", "typing": "digitar", "powerup": "sucesso",
            "roomtone": "sala", "wind": "vento", "rain": "chuva", "city": "cidade"}


def efeito(nome: str, semente: int = 0) -> np.ndarray:
    nome = APELIDOS.get(nome, nome)
    if nome not in EFEITOS:
        raise KeyError(f"efeito desconhecido: {nome}. Disponíveis: {', '.join(sorted(EFEITOS))}")
    return fade(EFEITOS[nome](semente), 0.001, 0.01)


def ambiente(nome: str, d: float, semente: int = 0) -> np.ndarray:
    nome = APELIDOS.get(nome, nome)
    if nome not in AMBIENTES:
        raise KeyError(f"ambiente desconhecido: {nome}. Disponíveis: {', '.join(sorted(AMBIENTES))}")
    return fade(AMBIENTES[nome](d, semente), 0.3, 0.3)


if __name__ == "__main__":
    import argparse
    import wave
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lista", action="store_true")
    ap.add_argument("--ouvir")
    a = ap.parse_args()
    if a.lista or not a.ouvir:
        print("Efeitos:", ", ".join(sorted(EFEITOS))); print("Ambientes:", ", ".join(sorted(AMBIENTES)))
    if a.ouvir:
        x = ambiente(a.ouvir, 6) if a.ouvir in AMBIENTES else efeito(a.ouvir)
        with wave.open(f"teste_{a.ouvir}.wav", "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32000).astype("<i2").tobytes())
        print(f"teste_{a.ouvir}.wav")
