"""Blocos básicos de síntese de áudio (numpy puro, 48 kHz, mono float32)."""
from __future__ import annotations

import numpy as np

SR = 48000


def tempo(d: float) -> np.ndarray:
    return np.arange(max(1, int(d * SR))) / SR


def ruido(n: int, semente: int = 0) -> np.ndarray:
    return np.random.default_rng(semente).standard_normal(n).astype(np.float32)


def envelope(n: int, ataque: float = 0.005, queda: float = 0.3, forma: float = 1.0) -> np.ndarray:
    """Sobe em `ataque` segundos e cai exponencialmente (queda = tempo para cair ~60 dB)."""
    t = np.arange(n) / SR
    sobe = np.clip(t / max(ataque, 1e-4), 0, 1)
    desce = np.exp(-np.maximum(t - ataque, 0) * 6.9 / max(queda, 1e-3)) ** forma
    return (sobe * desce).astype(np.float32)


def fade(x: np.ndarray, entra: float = 0.01, sai: float = 0.05) -> np.ndarray:
    x = x.copy(); a, b = int(entra * SR), int(sai * SR)
    if a: x[:a] *= np.linspace(0, 1, min(a, len(x)))[: len(x[:a])]
    if b: x[-b:] *= np.linspace(1, 0, min(b, len(x)))[-len(x[-b:]):]
    return x


def filtro(x: np.ndarray, baixo: float | None = None, alto: float | None = None, ordem: int = 2) -> np.ndarray:
    """Passa-faixa por FFT: corta abaixo de `baixo` Hz e acima de `alto` Hz com queda suave."""
    n = len(x)
    if n < 2:
        return x
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR) + 1e-6
    h = np.ones_like(f)
    if alto:
        h /= np.sqrt(1 + (f / alto) ** (2 * ordem))
    if baixo:
        h /= np.sqrt(1 + (baixo / f) ** (2 * ordem))
    return np.fft.irfft(X * h, n).astype(np.float32)


def convolver(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = len(x) + len(ir) - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:n].astype(np.float32)


def eco(x: np.ndarray, duracao: float = 1.4, quantidade: float = 0.22, semente: int = 7, brilho: float = 6000) -> np.ndarray:
    """Reverberação simples (ruído com queda exponencial)."""
    ir = ruido(int(duracao * SR), semente) * np.exp(-tempo(duracao) * 6.9 / duracao).astype(np.float32)
    ir = filtro(ir, 120, brilho)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    molhado = convolver(x, ir)[: len(x) + int(duracao * SR * 0.6)]
    seco = np.concatenate([x, np.zeros(len(molhado) - len(x), np.float32)])
    return seco * (1 - quantidade) + molhado * quantidade * 2.2


def seno(f, d: float, fase: float = 0.0) -> np.ndarray:
    """Seno com frequência fixa ou variável (f pode ser um array do mesmo tamanho)."""
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * tempo(d) + fase).astype(np.float32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + fase).astype(np.float32)


def serra(f: float, d: float, harmonicos: int = 18) -> np.ndarray:
    t, out = tempo(d), 0
    for k in range(1, harmonicos + 1):
        if f * k > 16000:
            break
        out = out + np.sin(2 * np.pi * f * k * t) / k
    return (out * 0.6).astype(np.float32)


def corda(f: float, d: float, brilho: float = 1.0, queda: float = 1.2) -> np.ndarray:
    """Nota dedilhada (harmônicos que somem mais rápido quanto mais agudos)."""
    t, out = tempo(d), np.zeros(int(d * SR), np.float32)
    for k in range(1, 12):
        if f * k > 15000:
            break
        out += (np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6.9 / queda) * (1 + (k - 1) * 0.55 / brilho)) / k ** 1.1).astype(np.float32)
    return out * envelope(len(out), 0.003, d * 4)


def nota(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def normal(x: np.ndarray, pico: float = 0.9) -> np.ndarray:
    m = np.max(np.abs(x)) if len(x) else 0
    return (x / m * pico).astype(np.float32) if m > 0 else x


def db(v: float) -> float:
    return 10 ** (v / 20)


def colocar(destino: np.ndarray, x: np.ndarray, inicio: float, ganho: float = 1.0) -> None:
    i, m = int(inicio * SR), x.shape[-1]  # x pode ser mono (n,) ou estéreo (2, n)
    if i >= destino.shape[-1] or i + m <= 0:
        return
    a, b = max(0, -i), min(m, destino.shape[-1] - i)
    destino[..., i + a: i + b] += x[..., a:b] * ganho
