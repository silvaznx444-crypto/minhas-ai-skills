#!/usr/bin/env python3
"""Gera miniatura (thumbnail) 1280x720 para YouTube com a IA de imagem do video-ia (Vertex ou Gemini API).

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

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "video-ia" / "scripts"))
import vertex  # noqa: E402
from gemini import Gemini, GeminiError  # noqa: E402

BASE = ("YouTube thumbnail, 16:9, one clear focal subject large in frame, strong facial expression, high contrast, "
        "saturated colors, simple uncluttered background, leave empty space on the {lado} third for a title, "
        "NO text, NO letters, NO logos. ")


def esc(t: str) -> str:
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--texto", default="", help="até ~4 palavras, em maiúsculas")
    ap.add_argument("--lado", default="left", choices=["left", "right"])
    ap.add_argument("--ref", action="append", default=[], help="imagens de referência (quadros do vídeo, preset)")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    g = vertex.Vertex() if vertex.configurado() else Gemini()
    with tempfile.TemporaryDirectory() as tmp:
        bruta = Path(tmp) / "bruta.png"
        try:
            g.image(BASE.format(lado=a.lado) + a.prompt, bruta, g.pick("image"), [Path(r) for r in a.ref], "16:9")
        except GeminiError as e:
            sys.exit(f"ERRO ao gerar imagem: {e}")
        vf = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
        if a.texto:
            x = "60" if a.lado == "left" else "w-tw-60"
            vf += (f",drawtext=text='{esc(a.texto.upper())}':fontsize=110:fontcolor=white:borderw=10:"
                   f"bordercolor=black:x={x}:y=(h-th)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        out = Path(a.saida)
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(bruta), "-vf", vf, "-q:v", "3", str(out)],
                       check=True)
    print(out)


if __name__ == "__main__":
    main()
