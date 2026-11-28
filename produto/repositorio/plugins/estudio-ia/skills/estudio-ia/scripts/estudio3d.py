#!/usr/bin/env python3
"""Instala, confere e atualiza o Estúdio 3D (vídeos 3D construídos por código) na pasta do canal.

  python3 estudio3d.py instalar  [--destino ./estudio3d]   # copia o estúdio, instala as dependências e confere
  python3 estudio3d.py verificar [--destino ./estudio3d]   # mostra o que falta
  python3 estudio3d.py atualizar [--destino ./estudio3d]   # troca o motor e o kit pela versão do plugin (projetos ficam)

O estúdio fica na pasta do canal (e não dentro do plugin) para os projetos e o node_modules sobreviverem às
atualizações do plugin.
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

ORIGEM = Path(__file__).resolve().parent.parent / "estudio3d"
MOTOR = ["motor", "kits", "som", "ferramentas", "renderizar.mjs", "player.html", "package.json", ".gitignore"]


def rodar(cmd: list[str], cwd: Path | None = None) -> bool:
    print("  $ " + " ".join(cmd))
    try:
        return subprocess.run(cmd, cwd=cwd).returncode == 0
    except FileNotFoundError:
        return False


def copiar(destino: Path, so_motor: bool) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for nome in MOTOR + ([] if so_motor else ["exemplos"]):
        o, d = ORIGEM / nome, destino / nome
        if not o.exists():
            continue
        if o.is_dir():
            if d.exists() and nome != "exemplos":
                shutil.rmtree(d)
            shutil.copytree(o, d, dirs_exist_ok=True, ignore=shutil.ignore_patterns("node_modules", "construcao", "saida", "__pycache__"))
        else:
            shutil.copy2(o, d)
    (destino / "projetos").mkdir(exist_ok=True)


def verificar(destino: Path) -> int:
    linhas = []

    def item(ok, nome, passo=""):
        linhas.append(("OK" if ok else "FALTA", nome, passo))

    node = shutil.which("node")
    v = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip() if node else ""
    item(bool(v) and int(v.lstrip("v").split(".")[0]) >= 18, f"Node.js 18+ {v}", "Instale o Node.js LTS em nodejs.org")
    item(bool(shutil.which("ffmpeg") and shutil.which("ffprobe")), "ffmpeg", "Windows: winget install Gyan.FFmpeg | Mac: brew install ffmpeg | Linux: apt-get install ffmpeg")
    nm = destino / "node_modules"
    item(all((nm / p).exists() for p in ("three", "playwright", "@fontsource/nunito")), "pacotes do estúdio (three, playwright, fontes)",
         f"cd {destino} && npm install")
    chrome = os.environ.get("CHROMIUM_PATH") and Path(os.environ["CHROMIUM_PATH"]).exists()
    if not chrome and nm.exists() and node:
        r = subprocess.run([node, "-e", "import('playwright').then(p=>console.log(p.chromium.executablePath()))"], cwd=destino, capture_output=True, text=True)
        chrome = bool(r.stdout.strip()) and Path(r.stdout.strip()).exists()
    item(bool(chrome), "navegador Chromium (para renderizar)", f"cd {destino} && npx playwright install chromium")
    item(importlib.util.find_spec("numpy") is not None, "Python: numpy (música e efeitos)", "pip install numpy")
    item(importlib.util.find_spec("faster_whisper") is not None, "Python: faster-whisper (transcrever a narração)", "pip install faster-whisper")
    print(f"\nEstúdio 3D em {destino}\n")
    for e, n, p in linhas:
        print(f"  {e:<6} {n}")
        if e != "OK" and p:
            print(f"         → {p}")
    falta = sum(e != "OK" for e, _, _ in linhas)
    print("\n" + ("Tudo pronto. Teste: node renderizar.mjs --projeto exemplos/demo --folha --escala 0.5" if not falta
                  else f"{falta} item(ns) para resolver."))
    return falta


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("acao", choices=["instalar", "verificar", "atualizar"])
ap.add_argument("--destino", default="estudio3d")
a = ap.parse_args()
dest = Path(a.destino).resolve()
if a.acao in ("instalar", "atualizar"):
    if a.acao == "atualizar" and not (dest / "renderizar.mjs").exists():
        sys.exit(f"Não há estúdio em {dest}. Use 'instalar'.")
    print(("Instalando" if a.acao == "instalar" else "Atualizando") + f" o Estúdio 3D em {dest} ...")
    copiar(dest, so_motor=a.acao == "atualizar")
    if shutil.which("npm"):
        rodar(["npm", "install", "--no-audit", "--no-fund"], dest)
        if not os.environ.get("CHROMIUM_PATH"):
            rodar(["npx", "playwright", "install", "chromium"], dest)
    else:
        print("  npm não encontrado: instale o Node.js LTS (nodejs.org) e rode de novo.")
    faltando = [p for p in ("numpy", "faster_whisper") if importlib.util.find_spec(p) is None]
    if faltando:
        pip = [sys.executable, "-m", "pip", "install", "numpy", "faster-whisper"]
        if not rodar(pip):
            rodar(pip + ["--break-system-packages"])
sys.exit(1 if verificar(dest) else 0)
