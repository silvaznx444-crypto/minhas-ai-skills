"""Efeitos sonoros e trilha sintetizados (numpy), 48 kHz mono float32."""
import numpy as np

SR = 48000
rng = np.random.default_rng(5)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
    return e


def lp(x, fc):
    """passa-baixa 1 polo simples (aplicado 2x)."""
    a = np.exp(-2 * np.pi * fc / SR)
    from scipy.signal import lfilter
    y = lfilter([1 - a], [1, -a], x)
    return lfilter([1 - a], [1, -a], y)


def hp(x, fc):
    return x - lp(x, fc)


def bp(x, lo, hi):
    return hp(lp(x, hi), lo)


def ruido(d):
    return rng.standard_normal(int(d * SR)).astype(np.float64)


def batida(n=3, esp=0.2):
    out = np.zeros(int((n * esp + 0.4) * SR))
    for i in range(n):
        t = t_(0.25)
        s = (np.sin(2 * np.pi * 180 * t) * 0.7 + np.sin(2 * np.pi * 760 * t) * 0.35) * np.exp(-t / 0.035)
        s += bp(ruido(0.25), 800, 4000) * np.exp(-t / 0.01) * 0.5
        k = int(i * esp * SR * rng.uniform(.9, 1.1))
        out[k:k + len(s)] += s * (0.9 if i else 1.0)
    return out * 0.8


def whoosh(d=0.45):
    x = ruido(d)
    t = t_(d)
    e = np.sin(np.pi * t / d) ** 2
    return bp(x, 300, 2500) * e * 0.5


def pop():
    t = t_(0.09)
    f = 700 + 900 * t / 0.09
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.003, 0.03) * 0.5


def bip():
    t = t_(0.12)
    return np.sin(2 * np.pi * 1400 * t) * env(len(t), 0.003, 0.08) * 0.3


def chamando():
    """dois toques de chamada (tuuu) de 0,6 s."""
    out = np.zeros(int(2.0 * SR))
    for k in (0, 1.2):
        t = t_(0.6)
        s = np.sin(2 * np.pi * 425 * t) * 0.18
        s *= np.minimum(1, np.minimum(t, 0.6 - t) / 0.01)
        i = int(k * SR)
        out[i:i + len(s)] += s
    return bp(out, 300, 3400)


def toque():
    """campainha de telefone fixo."""
    t = t_(0.9)
    s = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * t)))
    s *= np.minimum(1, np.minimum(t, 0.9 - t) / 0.02)
    return bp(s, 300, 3000) * 0.22


def estatica(d=0.45):
    x = ruido(d) * env(int(d * SR), 0.002, 0.25)
    t = t_(d)
    return (hp(x, 1500) * 0.35 + np.sin(2 * np.pi * 60 * t) * 0.1 * np.exp(-t / 0.3))


def impacto():
    d = 1.8
    t = t_(d)
    f = 95 * np.exp(-t / 0.6) + 32
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9) * 0.9
    s += lp(ruido(d), 400) * np.exp(-t / 0.15) * 1.2
    s += np.sin(2 * np.pi * 622 * t) * np.sin(2 * np.pi * 659 * t) * np.exp(-t / 0.7) * 0.15
    return s * 0.85


def papel():
    d = 0.5
    x = ruido(d)
    g = (rng.random(int(d * SR)) < 0.004).astype(float)
    g = np.convolve(g, np.exp(-np.arange(400) / 60), "same")
    return hp(x, 2000) * g * 0.35


def vela():
    d = 0.5
    t = t_(d)
    return bp(ruido(d), 200, 1500) * np.minimum(1, t / 0.03) * np.exp(-t / 0.12) * 0.35


def tique(d, inicio_rap=0.5):
    out = np.zeros(int(d * SR))
    k, per = 0.0, 0.5
    while k < d - 0.05:
        t = t_(0.04)
        s = (np.sin(2 * np.pi * 2600 * t) * 0.5 + hp(ruido(0.04), 3000) * 0.5) * np.exp(-t / 0.008) * 0.35
        i = int(k * SR)
        out[i:i + len(s)] += s[: len(out) - i]
        k += per
        per = max(0.18, per * 0.93)
    return out


def chuva(d):
    x = ruido(d)
    s = lp(x, 1800) * 0.06 + hp(lp(ruido(d), 6000), 2500) * 0.02
    # gotas
    g = (rng.random(int(d * SR)) < 0.0009).astype(float) * rng.uniform(0.2, 1, int(d * SR))
    s += hp(np.convolve(g, np.exp(-np.arange(300) / 40), "same"), 1200) * 0.05
    return s


def trilha(d, tensao_ini):
    """drone escuro; a partir de tensao_ini entra um agudo dissonante crescente."""
    t = t_(d)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)
    s = (np.sin(2 * np.pi * 55 * t) * 0.10 + np.sin(2 * np.pi * 82.4 * t + 1) * 0.06
         + np.sin(2 * np.pi * 110.3 * t) * 0.03) * lfo
    s += lp(ruido(d), 160) * 0.12
    cres = np.clip((t - tensao_ini) / (d - tensao_ini), 0, 1) ** 1.5
    s += (np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 932 * t) * 0.8
          + np.sin(2 * np.pi * 1245 * t) * 0.4) * cres * 0.035 * (0.7 + 0.3 * np.sin(2 * np.pi * 5.5 * t))
    # pulso de "coração" grave
    for k in np.arange(tensao_ini, d, 0.8):
        i = int(k * SR)
        tt = t_(0.25)
        p = np.sin(2 * np.pi * 50 * tt) * np.exp(-tt / 0.08) * 0.25
        s[i:i + len(p)] += p[: len(s) - i] * np.clip((k - tensao_ini) / 6, 0.2, 1)
    return s


SFX = {"batida": batida, "whoosh": whoosh, "pop": pop, "bip": bip, "chamando": chamando, "toque": toque,
       "estatica": estatica, "impacto": impacto, "papel": papel, "vela": vela}
