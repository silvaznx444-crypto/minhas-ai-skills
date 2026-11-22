"""Legendas no estilo Reels: blocos curtos, uma cor por personagem, efeito 'pop'."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

FONTSDIR = "/usr/share/fonts"
FONTE = "Inter ExtraBold"


def duracao(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def alinhar(g, modelo: str, clip: Path, falas: list[dict]) -> list[tuple[float, float]]:
    """Pede à Gemini o início/fim de cada fala no clipe (texto já conhecido)."""
    linhas = "\n".join(f'{i + 1}. "{f["texto"]}"' for i, f in enumerate(falas))
    prompt = (
        "Listen to this video's audio. These lines are spoken in it, in this order:\n"
        f"{linhas}\n\nReturn ONLY a JSON array with one object per line, same order: "
        '[{"inicio": seconds_float, "fim": seconds_float}]. Times in seconds from the start of the '
        "video with 2 decimals, start = first syllable, end = last syllable.")
    d = g.text(prompt, modelo, parts=[g.inline(clip)], json_out=True)
    dur = duracao(clip)
    out = [(float(x["inicio"]), float(x["fim"])) for x in d]
    if len(out) != len(falas):
        raise ValueError("quantidade de falas diferente")
    ant = 0.0
    for t0, t1 in out:
        if not (0 <= t0 < t1 <= dur + 0.5) or t0 < ant - 0.3:
            raise ValueError(f"tempos inválidos {out}")
        ant = t1
    return out


def distribuir(falas: list[dict], ini: float, fim: float) -> list[tuple[float, float]]:
    """Plano B: divide o tempo proporcional ao tamanho de cada fala."""
    tam = [max(len(f["texto"]), 1) for f in falas]
    tot, t, out = sum(tam), ini, []
    for n in tam:
        d = (fim - ini) * n / tot
        out.append((t, t + d - 0.1))
        t += d
    return out


def _ts(s: float) -> str:
    s = max(s, 0)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _cor(hexa: str) -> str:
    h = hexa.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


def blocos(texto: str, n: int) -> list[str]:
    palavras, out, atual = texto.split(), [], []
    for w in palavras:
        atual.append(w)
        if len(atual) >= n or re.search(r"[.,!?;:…]$", w):
            out.append(" ".join(atual))
            atual = []
    if atual:
        out.append(" ".join(atual))
    return out


def escrever_ass(eventos: list[tuple[float, float, str, str]], out: Path, palavras: int = 3) -> None:
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,{FONTE},78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,3,2,80,80,620,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linhas = []
    for t0, t1, texto, cor in eventos:
        bs = blocos(texto, palavras)
        pesos = [len(b) + 2 for b in bs]
        tot, t = sum(pesos), t0
        for b, p in zip(bs, pesos):
            d = (t1 - t0) * p / tot
            txt = b.replace("{", "(").replace("}", ")")
            efeito = r"{\c" + _cor(cor) + r"\fscx85\fscy85\t(0,90,\fscx100\fscy100)}"
            linhas.append(f"Dialogue: 0,{_ts(t)},{_ts(t + d)},Fala,,0,0,0,,{efeito}{txt}")
            t += d
    out.write_text(cab + "\n".join(linhas) + "\n", encoding="utf-8")


if __name__ == "__main__":  # teste rápido
    escrever_ass([(0.5, 2.5, "Polícia não negocia com vagabundo.", "#FFFFFF"),
                  (3.0, 6.0, "Fica esperto, que a cachorra de vocês não sobe aqui não.", "#FF3B3B")],
                 Path("teste.ass"))
    print(json.dumps(blocos("Fica esperto, que a cachorra de vocês não sobe aqui não.", 3), ensure_ascii=False))
