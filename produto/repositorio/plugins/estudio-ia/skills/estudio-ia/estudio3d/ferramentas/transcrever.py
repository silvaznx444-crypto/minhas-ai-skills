#!/usr/bin/env python3
"""Transcreve a narração palavra por palavra (faster-whisper) e grava a linha do tempo do projeto.

  python3 ferramentas/transcrever.py --projeto projetos/x [--idioma pt] [--modelo small]

Se o projeto tiver roteiro (entrada/roteiro.txt), as palavras ficam com a grafia e a pontuação do roteiro e só os
tempos vêm do áudio. Mostra quanto do roteiro bate com o áudio: abaixo de 90%, o texto e a voz são diferentes.
Saída: linha/palavras.json, linha/frases.json e linha/transcricao.txt.
Primeira vez: baixa o modelo do Whisper (~460 MB para o 'small').
"""
from __future__ import annotations

import argparse
import difflib
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from util import duracao, frases_de, ler, normalizar, projeto, salvar  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--projeto", required=True)
ap.add_argument("--idioma", default="pt")
ap.add_argument("--modelo", default="small", help="tiny, base, small (padrão), medium, large-v3")
ap.add_argument("--voz", help="arquivo da narração real (copia para entrada/ e substitui a provisória)")
a = ap.parse_args()

P = projeto(a.projeto)
cfg = ler(P / "config.json")
if a.voz:
    import shutil
    v = Path(a.voz)
    if not v.exists():
        sys.exit(f"Não achei a narração: {v}")
    destino = P / "entrada" / f"voz{v.suffix.lower()}"
    shutil.copy(v, destino)
    cfg.update({"voz": f"entrada/{destino.name}", "provisoria": False})
    salvar(P / "config.json", cfg)
if not cfg.get("voz") or cfg.get("provisoria"):
    sys.exit("Este projeto ainda não tem a narração real. Rode de novo com --voz <arquivo da narração>.")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
try:
    from faster_whisper import WhisperModel
except ImportError:
    sys.exit("Falta o faster-whisper: pip install faster-whisper")

import subprocess
import numpy as np

print(f"Transcrevendo com o modelo '{a.modelo}' (na primeira vez ele é baixado)...")
# o próprio ffmpeg decodifica o áudio (16 kHz mono), sem depender da biblioteca 'av'
bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", str(P / cfg["voz"]), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                       capture_output=True, check=True).stdout
audio = np.frombuffer(bruto, np.float32)
modelo = WhisperModel(a.modelo, device="auto", compute_type="int8")
segs, _ = modelo.transcribe(audio, language=a.idioma, word_timestamps=True, vad_filter=True)
ouvidas = [{"texto": w.word.strip(), "ini": round(w.start, 3), "fim": round(w.end, 3)} for s in segs for w in (s.words or []) if w.word.strip()]
if not ouvidas:
    sys.exit("Nenhuma fala encontrada no áudio.")

palavras, taxa = ouvidas, None
rot = P / (cfg.get("roteiro") or "entrada/roteiro.txt")
if rot.exists():
    escritas = [w for w in re.split(r"\s+", rot.read_text(encoding="utf-8").strip()) if w]
    na, nb = [normalizar(w) for w in escritas], [normalizar(w["texto"]) for w in ouvidas]
    sm = difflib.SequenceMatcher(a=na, b=nb, autojunk=False)
    tempos: list[tuple[float, float] | None] = [None] * len(escritas)
    batidas = 0
    for bloco in sm.get_matching_blocks():
        for k in range(bloco.size):
            o = ouvidas[bloco.b + k]
            tempos[bloco.a + k] = (o["ini"], o["fim"])
            batidas += 1
    taxa = batidas / max(1, len(escritas))
    # palavras do roteiro sem par no áudio: distribui no buraco entre as vizinhas
    i = 0
    while i < len(tempos):
        if tempos[i] is not None:
            i += 1
            continue
        j = i
        while j < len(tempos) and tempos[j] is None:
            j += 1
        a0 = tempos[i - 1][1] if i > 0 else 0.0
        b0 = tempos[j][0] if j < len(tempos) else a0 + 0.35 * (j - i)
        passo = max(0.05, (b0 - a0) / (j - i))
        for k in range(i, j):
            tempos[k] = (round(a0 + passo * (k - i), 3), round(a0 + passo * (k - i + 1), 3))
        i = j
    palavras = [{"texto": w, "ini": t[0], "fim": t[1]} for w, t in zip(escritas, tempos)]

frases = frases_de(palavras)
salvar(P / "linha" / "palavras.json", {"palavras": palavras, "fonte": "whisper", "modelo": a.modelo})
salvar(P / "linha" / "frases.json", {"frases": frases})
(P / "linha" / "transcricao.txt").write_text(
    "\n".join(f"{f['ini']:7.2f}  {f['texto']}" for f in frases) + "\n", encoding="utf-8")
cfg["duracao"] = round(duracao(P / cfg["voz"]), 2)
salvar(P / "config.json", cfg)
print("\n".join(f"{f['ini']:7.2f}  {f['texto']}" for f in frases))
print(f"\n{len(palavras)} palavras, {len(frases)} frases. Narração: {cfg['duracao']} s.")
if taxa is not None:
    print(f"Roteiro x áudio: {100 * taxa:.0f}% das palavras batem" + ("" if taxa >= 0.9 else
          "  <-- ABAIXO DE 90%: o roteiro não é o que foi gravado. Confira antes de seguir."))
print("Próximo passo: python3 ferramentas/tomadas.py --projeto " + a.projeto + " rascunho   (ou 'sincronizar', se as tomadas já existem)")
