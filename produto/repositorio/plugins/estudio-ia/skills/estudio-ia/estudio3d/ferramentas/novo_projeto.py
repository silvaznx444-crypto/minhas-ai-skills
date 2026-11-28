#!/usr/bin/env python3
"""Cria a pasta de um vídeo novo no Estúdio 3D.

  python3 ferramentas/novo_projeto.py --nome meu-video --titulo "Por que você procrastina?" \\
      [--voz narracao.mp3] [--roteiro roteiro.txt] [--formato 16:9|9:16] [--resolucao 1080p] [--estilo natural]

Sem --voz, o projeto fica esperando a narração (use ferramentas/provisoria.py para montar as cenas antes).
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from util import RAIZ, duracao, salvar  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--nome", required=True, help="nome curto da pasta (sem espaços)")
ap.add_argument("--titulo", required=True)
ap.add_argument("--voz", help="arquivo da narração (mp3, wav, m4a...)")
ap.add_argument("--roteiro", help="texto da narração (.txt), para corrigir a transcrição")
ap.add_argument("--formato", default="16:9", choices=["16:9", "9:16"])
ap.add_argument("--resolucao", default="1080p", choices=["720p", "1080p", "1440p", "2160p"])
ap.add_argument("--fps", type=int, help="padrão: 24 no 16:9 e 30 no 9:16")
ap.add_argument("--estilo", default="natural", help="natural, vivo, cinema, quente, frio ou sonho")
ap.add_argument("--legenda", choices=["sim", "nao"], help="legenda palavra por palavra (padrão: sim no 9:16)")
ap.add_argument("--pasta", default=str(RAIZ / "projetos"))
a = ap.parse_args()

p = Path(a.pasta) / a.nome
if (p / "config.json").exists():
    sys.exit(f"Já existe: {p}")
for d in ("entrada", "historia", "cenas", "linha"):
    (p / d).mkdir(parents=True, exist_ok=True)
cfg = {
    "titulo": a.titulo, "formato": a.formato, "resolucao": a.resolucao,
    "fps": a.fps or (30 if a.formato == "9:16" else 24), "estilo": a.estilo,
    "legenda": (a.legenda == "sim") if a.legenda else a.formato == "9:16",
    "voz": None, "roteiro": None, "duracao": None, "contorno": 0.0045,
    "fadeEntrada": 0.4, "fadeSaida": 0.8,
    "musica": {"ativa": True, "ganho_db": -17}, "efeitos": {"ativos": True, "ganho_db": 0}, "loudness": -14,
}
if a.voz:
    v = Path(a.voz)
    if not v.exists():
        sys.exit(f"Não achei a narração: {v}")
    destino = p / "entrada" / f"voz{v.suffix.lower()}"
    shutil.copy(v, destino)
    cfg["voz"], cfg["duracao"] = f"entrada/{destino.name}", round(duracao(destino), 2)
if a.roteiro:
    shutil.copy(a.roteiro, p / "entrada" / "roteiro.txt")
    cfg["roteiro"] = "entrada/roteiro.txt"
salvar(p / "config.json", cfg)
print(f"Projeto criado: {p}  ({a.formato} {a.resolucao} @ {cfg['fps']} fps"
      + (f", narração de {cfg['duracao']} s" if cfg["duracao"] else ", sem narração ainda") + ")")
print("Próximo passo: " + ("python3 ferramentas/transcrever.py --projeto " + str(p) if a.voz
                           else "python3 ferramentas/provisoria.py --projeto " + str(p) + "  (linha do tempo até a voz chegar)"))
