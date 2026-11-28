#!/usr/bin/env python3
"""Linha do tempo PROVISÓRIA a partir do roteiro, para montar as cenas antes da narração chegar.

  python3 ferramentas/provisoria.py --projeto projetos/x [--velocidade 2.6]

Estima o tempo de cada palavra (pausas em vírgulas e pontos) e cria um áudio mudo com essa duração.
Quando a voz real chegar: copie o áudio, rode transcrever.py e depois 'tomadas.py sincronizar' — as tomadas
ancoradas em palavras se ajustam sozinhas à voz.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from util import frases_de, ler, projeto, salvar  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--projeto", required=True)
ap.add_argument("--velocidade", type=float, default=2.75, help="palavras por segundo, pausas incluídas (fala natural: 2.4 a 3.0)")
a = ap.parse_args()

P = projeto(a.projeto)
cfg = ler(P / "config.json")
rot = P / (cfg.get("roteiro") or "entrada/roteiro.txt")
if not rot.exists():
    sys.exit(f"Falta o roteiro em {rot}")
ws = [w for w in re.split(r"\s+", rot.read_text(encoding="utf-8").strip()) if w]
media = sum(len(w) for w in ws) / max(1, len(ws))
# peso de cada palavra (mais letras = mais tempo) + pausas em pontuação; depois ajusta tudo à velocidade média
pesos = [(0.55 + 0.45 * len(w) / max(1.0, media), 0.9 if re.search(r"[.?!…]$", w) else 0.35 if re.search(r"[,;:]$", w) else 0.0) for w in ws]
k = (len(ws) / a.velocidade) / max(1e-6, sum(p + q for p, q in pesos))
palavras, t = [], 0.4
for w, (p, q) in zip(ws, pesos):
    palavras.append({"texto": w, "ini": round(t, 3), "fim": round(t + p * k * 0.92, 3)})
    t += (p + q) * k
total = round(t + 0.8, 2)
salvar(P / "linha" / "palavras.json", {"palavras": palavras, "fonte": "provisoria"})
salvar(P / "linha" / "frases.json", {"frases": frases_de(palavras)})
mudo = P / "entrada" / "voz_provisoria.wav"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
                "-t", str(total), str(mudo)], check=True)
cfg.update({"voz": f"entrada/{mudo.name}", "duracao": total, "provisoria": True})
salvar(P / "config.json", cfg)
print(f"Linha provisória: {len(palavras)} palavras em ~{total} s. Próximo passo: tomadas.py --projeto {a.projeto} rascunho")
