#!/usr/bin/env python3
"""Miniatura (thumbnail) 1280x720 para YouTube: a partir de um quadro do vídeo 3D (padrão) ou gerada pela IA.

  # quadro do próprio vídeo (ex.: ffmpeg -ss 12.5 -i video.mp4 -frames:v 1 quadro.png) + título por cima
  python3 miniatura.py --imagem quadro.png \
      --texto "CÉREBRO SEM SONO" --lado right --saida canal/youtube/2026-11-24/thumb_abc123.jpg
  # gerada pela IA de imagem (Gemini, Vertex ou Gemini API)
  python3 miniatura.py --prompt "rosto surpreso de policial 3D cartoon, fundo vermelho" \
      --texto "ELE NÃO NEGOCIA" --saida canal/youtube/2026-11-24/thumb_abc123.jpg [--ref quadro.png ...]

O texto é desenhado pelo ffmpeg (fica nítido e sem erro de ortografia), não pela IA.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vertex  # noqa: E402
from gemini import Gemini, GeminiError  # noqa: E402

BASE = ("YouTube thumbnail, 16:9, one clear focal subject large in frame, strong facial expression, high contrast, "
        "saturated colors, simple uncluttered background, leave empty space on the {lado} third for a title, "
        "NO text, NO letters, NO logos. ")


def esc(t: str) -> str:
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")


FONTE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def quebrar(texto: str) -> list[str]:
    """1 linha se for curto; senão 2 linhas com tamanhos parecidos."""
    w = texto.split()
    if len(w) <= 1 or len(texto) <= 10:
        return [texto]
    melhor = min(range(1, len(w)), key=lambda i: abs(len(" ".join(w[:i])) - len(" ".join(w[i:]))))
    return [" ".join(w[:melhor]), " ".join(w[melhor:])]


def texto_filtro(texto: str, lado: str) -> str:
    """Texto no terço livre (≈ 45% da largura), com a letra do maior tamanho que cabe."""
    ls = quebrar(texto)
    fs = int(min(150, max(60, 0.45 * 1280 / (0.72 * max(len(x) for x in ls)))))
    alt = int(fs * 1.12)
    topo = (720 - alt * len(ls)) // 2
    x = "60" if lado == "left" else "w-tw-60"
    return "".join(f",drawtext=text='{esc(l)}':fontsize={fs}:fontcolor=white:borderw={max(6, fs // 12)}:"
                   f"bordercolor=black:x={x}:y={topo + i * alt}:expansion=none:fontfile={FONTE}" for i, l in enumerate(ls))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--imagem", help="imagem pronta (ex.: quadro do vídeo 3D); dispensa a IA")
    ap.add_argument("--prompt", help="descrição para a IA de imagem (quando não houver --imagem)")
    ap.add_argument("--texto", default="", help="até ~4 palavras, em maiúsculas")
    ap.add_argument("--lado", default="left", choices=["left", "right"])
    ap.add_argument("--ref", action="append", default=[], help="imagens de referência (quadros do vídeo, preset)")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    if not (a.imagem or a.prompt):
        sys.exit("Informe --imagem (quadro do 3D) ou --prompt (IA de imagem)")
    with tempfile.TemporaryDirectory() as tmp:
        bruta = Path(tmp) / "bruta.png"
        if a.imagem:
            bruta = Path(a.imagem)
            if not bruta.exists():
                sys.exit(f"Imagem não encontrada: {bruta}")
        else:
            g = vertex.Vertex() if vertex.configurado() else Gemini()
            try:
                g.image(BASE.format(lado=a.lado) + a.prompt, bruta, g.pick("image"), [Path(r) for r in a.ref], "16:9")
            except GeminiError as e:
                sys.exit(f"ERRO ao gerar imagem: {e}")
        vf = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
        if a.texto:
            vf += texto_filtro(a.texto.upper(), a.lado)
        out = Path(a.saida)
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(bruta), "-vf", vf, "-q:v", "3", str(out)],
                       check=True)
    print(out)


if __name__ == "__main__":
    main()
