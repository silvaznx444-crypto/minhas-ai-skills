"""Funções comuns das ferramentas do Estúdio 3D."""
from __future__ import annotations

import json
import re
import subprocess
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RES = {"720p": 720, "1080p": 1080, "1440p": 1440, "2160p": 2160, "4k": 2160}


def ler(p: Path, padrao=None):
    p = Path(p)
    if not p.exists():
        if padrao is not None:
            return padrao
        raise SystemExit(f"Não achei {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def salvar(p: Path, dados) -> None:
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")


def duracao(arq: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise SystemExit(f"Não consegui ler a duração de {arq} (o ffmpeg está instalado?)")


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s).lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "video"


def projeto(caminho: str) -> Path:
    p = Path(caminho).resolve()
    if not (p / "config.json").exists():
        raise SystemExit(f"{p} não é um projeto (falta config.json). Crie com ferramentas/novo_projeto.py")
    return p


def frases_de(palavras: list[dict]) -> list[dict]:
    """Agrupa palavras em frases (fecha em . ? ! …)."""
    out, atual = [], []
    for i, p in enumerate(palavras):
        atual.append(i)
        if re.search(r"[.?!…]$", p["texto"]) or i == len(palavras) - 1:
            out.append({"texto": " ".join(palavras[k]["texto"] for k in atual), "ini": palavras[atual[0]]["ini"],
                        "fim": palavras[atual[-1]]["fim"], "palavras": [atual[0], atual[-1]]})
            atual = []
    return out
