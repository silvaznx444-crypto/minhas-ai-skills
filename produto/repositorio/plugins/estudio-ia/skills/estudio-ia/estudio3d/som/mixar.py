#!/usr/bin/env python3
"""Mixa voz + música (que abaixa sozinha quando há fala) + efeitos + ambiente, normaliza e junta com o vídeo.

  python3 som/mixar.py --projeto projetos/x

Lê config.json (musica, efeitos, loudness) e historia/tomadas.json ("musica": [{de, ate, clima}] com de/ate em
segundos ou no id de uma tomada, ex. {"de": "S04", "clima": "tenso"}; e em cada tomada
"efeitos": [[segundos_depois_do_inicio, nome, dB]] e "ambiente": [nome, dB]).
Saída: construcao/mix.wav e, se o vídeo já estiver renderizado, saida/<título>.mp4.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI)); sys.path.insert(0, str(AQUI.parent / "ferramentas"))
from efeitos import ambiente, efeito  # noqa: E402
from musica import gerar  # noqa: E402
from sintese import SR, colocar, db  # noqa: E402
from util import ler, projeto, slug  # noqa: E402


def ff(*args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit("ffmpeg falhou:\n" + r.stderr[-1500:])
    return r.stderr


def ler_audio(arq: Path, n: int) -> np.ndarray:
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(arq), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True)
    x = np.frombuffer(r.stdout, np.float32).copy()
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def gravar(arq: Path, x: np.ndarray) -> None:
    pico = np.max(np.abs(x)) or 1
    with wave.open(str(arq), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x.T / max(1.0, pico / 0.95) * 32767).astype("<i2").tobytes())


def presenca_da_voz(v: np.ndarray, limiar: float = 0.015) -> np.ndarray:
    """0..1 por amostra: 1 quando alguém está falando (ataque rápido, soltura lenta)."""
    bloco = int(0.01 * SR); m = len(v) // bloco
    rms = np.sqrt(np.mean(v[: m * bloco].reshape(m, bloco) ** 2, axis=1)) if m else np.zeros(1)
    alvo, out, cur = np.clip(rms / limiar, 0, 1), np.zeros_like(rms), 0.0
    for i, a in enumerate(alvo):
        cur += (a - cur) * (0.5 if a > cur else 0.04); out[i] = cur
    return np.interp(np.arange(len(v)), np.arange(len(out)) * bloco, out).astype(np.float32)


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--projeto", required=True)
ap.add_argument("--abaixar", type=float, default=-10, help="quanto a música abaixa sob a voz (dB)")
a = ap.parse_args()
P = projeto(a.projeto)
cfg, hist = ler(P / "config.json"), ler(P / "historia" / "tomadas.json")
dur = float(hist.get("duracao") or cfg.get("duracao") or hist["tomadas"][-1]["fim"])
n = int(dur * SR)
mix = np.zeros((2, n + SR * 4), np.float32)

voz = ler_audio(P / cfg["voz"], n) if cfg.get("voz") and not cfg.get("provisoria") else np.zeros(n, np.float32)
mix[:, :n] += voz

mus_cfg = cfg.get("musica", {})
if mus_cfg.get("ativa", True):
    trilha = np.zeros((2, n), np.float32)
    secoes = hist.get("musica") or [{"de": 0, "ate": dur, "clima": "curioso"}]
    inicio_de = {t["id"]: t["ini"] for t in hist["tomadas"]}

    def quando_(v, padrao):  # número (segundos), id de tomada ("S05") ou vazio
        return padrao if v is None else float(inicio_de[v]) if isinstance(v, str) else float(v)
    for k, s in enumerate(secoes):
        de, ate = quando_(s.get("de"), 0.0), quando_(s.get("ate"), dur)
        x = gerar(s.get("clima", "curioso"), ate - de + 1.5, k * 11 + 3)
        ramp = np.ones(x.shape[1], np.float32); f = int(1.2 * SR)
        if k > 0: ramp[:f] = np.linspace(0, 1, f)
        ramp[-f:] = np.minimum(ramp[-f:], np.linspace(1, 0, f))
        colocar(trilha, x * ramp, max(0.0, de - (0.75 if k > 0 else 0)))
    duck = 1 - (1 - db(a.abaixar)) * presenca_da_voz(voz)
    mix[:, :n] += trilha * duck * db(mus_cfg.get("ganho_db", -17))

ef_cfg = cfg.get("efeitos", {})
if ef_cfg.get("ativos", True):
    g0 = db(ef_cfg.get("ganho_db", 0))
    for i, tom in enumerate(hist["tomadas"]):
        for j, (quando, nome, nivel) in enumerate(tom.get("efeitos", [])):
            try:
                x = efeito(nome, i * 31 + j)
            except KeyError as e:
                print(f"aviso: {tom['id']}: {e}"); continue
            pan = (((i * 7 + j * 3) % 5) - 2) * 0.12
            colocar(mix[0:1], x[None, :] * (1 - max(0, pan)), tom["ini"] + float(quando), db(nivel) * g0)
            colocar(mix[1:2], x[None, :] * (1 + min(0, pan)), tom["ini"] + float(quando), db(nivel) * g0)
        if tom.get("ambiente"):
            nome, nivel = tom["ambiente"][0], tom["ambiente"][1] if len(tom["ambiente"]) > 1 else -30
            try:
                d = tom["fim"] - tom["ini"] + 0.6
                colocar(mix[0:1], ambiente(nome, d, i)[None, :], tom["ini"] - 0.3, db(nivel) * g0)
                colocar(mix[1:2], ambiente(nome, d, i + 100)[None, :], tom["ini"] - 0.3, db(nivel) * g0)
            except KeyError as e:
                print(f"aviso: {tom['id']}: {e}")

mix = mix[:, :n]
c = P / "construcao"; c.mkdir(exist_ok=True)
bruto, final = c / "mix_bruto.wav", c / "mix.wav"
gravar(bruto, mix)
alvo = cfg.get("loudness", -14)
medida = ff("-i", str(bruto), "-af", f"loudnorm=I={alvo}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-")
m = json.loads(re.findall(r"\{[^{}]*\}", medida)[-1])
ff("-i", str(bruto), "-af", f"loudnorm=I={alvo}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
   f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", "-ar", str(SR), str(final))
print(f"Mixagem: {final} ({dur:.1f} s, alvo {alvo} LUFS)" + ("  [sem voz: projeto com linha provisória]" if cfg.get("provisoria") else ""))

video = c / "video_mudo.mp4"
if video.exists():
    s = P / "saida"; s.mkdir(exist_ok=True)
    out = s / f"{slug(cfg.get('titulo', 'video'))}.mp4"
    ff("-i", str(video), "-i", str(final), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
       "-movflags", "+faststart", "-shortest", str(out))
    print(f"VÍDEO FINAL: {out}")
else:
    print("Ainda não há construcao/video_mudo.mp4: rode o render completo e depois este script de novo.")
