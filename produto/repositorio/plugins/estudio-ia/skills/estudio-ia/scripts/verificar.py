#!/usr/bin/env python3
"""Confere se está tudo pronto para usar o Estúdio IA e diz o que falta, em português simples.

  python3 verificar.py            # confere tudo (faz chamadas de teste baratas às APIs)
  python3 verificar.py --offline  # só confere o que está instalado, sem chamar nenhuma API

Cada linha mostra OK, FALTA ou ERRO e, quando não está OK, o próximo passo e a seção do guia.
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
GUIA = "guias/configuracao.md"
linhas: list[tuple[str, str, str, str]] = []  # (estado, item, detalhe, próximo passo)


def marca(estado: str, item: str, detalhe: str = "", passo: str = "") -> None:
    linhas.append((estado, item, detalhe, passo))


def base() -> None:
    v = sys.version_info
    marca("OK" if v >= (3, 9) else "FALTA", "Python 3.9 ou mais novo", f"{v.major}.{v.minor}",
          "Instale o Python em python.org/downloads")
    for mod, pip in (("requests", "requests"), ("google.auth", "google-auth")):
        ok = importlib.util.find_spec(mod.split(".")[0]) is not None and (
            mod != "google.auth" or importlib.util.find_spec("google.auth") is not None)
        marca("OK" if ok else "FALTA", f"pacote Python {pip}", "", f"Rode: pip install {pip}")
    ff = shutil.which("ffmpeg") and shutil.which("ffprobe")
    marca("OK" if ff else "FALTA", "ffmpeg (montar vídeos e miniaturas)", "",
          "Windows: winget install Gyan.FFmpeg | Mac: brew install ffmpeg | Linux: sudo apt-get install -y ffmpeg")


def gemini(offline: bool) -> None:
    import vertex
    tem_vertex = vertex.configurado()
    tem_chave = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    if not (tem_vertex or tem_chave):
        marca("FALTA", "Gemini (análise de vídeos, imagens, Veo)", "nenhuma credencial encontrada",
              f"Configure o Vertex AI ou a chave da Gemini API ({GUIA}, seção Vertex AI / Gemini)")
        return
    nome = "Vertex AI (Google Cloud)" if tem_vertex else "Gemini API (AI Studio)"
    if offline:
        marca("OK", f"Gemini via {nome}", "credencial encontrada (não testada)")
        return
    try:
        from gemini import Gemini
        g = vertex.Vertex() if tem_vertex else Gemini()
        marca("OK", f"Gemini via {nome}", f"modelo de texto: {g.pick('texto')}")
    except Exception as e:  # noqa: BLE001
        marca("ERRO", f"Gemini via {nome}", str(e)[:160], f"Confira a credencial ({GUIA})")


def youtube(offline: bool) -> None:
    faltam = [v for v in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN") if not os.environ.get(v)]
    if faltam:
        marca("FALTA", "YouTube (análise, estratégia, postagem)", "faltam: " + ", ".join(faltam),
              f"Siga {GUIA}, seção YouTube (uns 15 minutos, uma vez só)")
        return
    if offline:
        marca("OK", "YouTube", "variáveis encontradas (não testadas)")
        return
    try:
        from youtube import YouTube
        c = YouTube().canal()
        st = c.get("statistics", {})
        marca("OK", "YouTube", f"canal '{c['snippet']['title']}': {st.get('subscriberCount', '?')} inscritos, "
              f"{st.get('videoCount', '?')} vídeos")
    except SystemExit as e:
        marca("ERRO", "YouTube", str(e)[:160], f"Confira as variáveis ({GUIA}, seção YouTube)")
    except Exception as e:  # noqa: BLE001
        msg = str(e)
        dica = ("Rode de novo o 'youtube.py autorizar' e publique o app na tela de consentimento"
                if "invalid_grant" in msg else f"Veja {GUIA}, seção YouTube")
        marca("ERRO", "YouTube", msg[:160], dica)


def instagram(offline: bool) -> None:
    if not os.environ.get("IG_ACCESS_TOKEN"):
        marca("OPCIONAL", "Instagram (postar Reels, analisar o perfil)", "IG_ACCESS_TOKEN não configurado",
              f"Só se você quiser postar no Instagram: {GUIA}, seção Instagram")
        return
    if offline:
        marca("OK", "Instagram", "token encontrado (não testado)")
        return
    try:
        from instagram import Instagram
        d = Instagram().conta()
        marca("OK", "Instagram", f"@{d.get('username', '?')}")
    except Exception as e:  # noqa: BLE001
        marca("ERRO", "Instagram", str(e)[:160], f"Gere o token de novo ({GUIA}, seção Instagram)")


def estudio3d() -> None:
    node = shutil.which("node")
    versao = ""
    if node:
        try:
            versao = subprocess.run([node, "--version"], capture_output=True, text=True, timeout=20).stdout.strip()
        except Exception:  # noqa: BLE001
            pass
    ok = bool(versao) and int(versao.lstrip("v").split(".")[0] or 0) >= 18
    marca("OK" if ok else "FALTA", "Node.js 18+ (vídeo 3D)", versao, "Instale o Node.js LTS em nodejs.org")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="não chama nenhuma API")
    a = ap.parse_args()
    base()
    if importlib.util.find_spec("requests") is None:
        marca("FALTA", "testes das APIs", "precisam do pacote requests", "Rode: pip install requests google-auth")
    else:
        gemini(a.offline)
        youtube(a.offline)
        instagram(a.offline)
    estudio3d()

    larg = max(len(i) for _, i, _, _ in linhas)
    print("\nEstúdio IA: verificação\n")
    for estado, item, detalhe, passo in linhas:
        print(f"  {estado:<8} {item:<{larg}}  {detalhe}")
        if estado in ("FALTA", "ERRO") and passo:
            print(f"  {'':<8} {'':<{larg}}  → {passo}")
    faltando = [x for x in linhas if x[0] in ("FALTA", "ERRO")]
    print("\n" + ("Tudo pronto." if not faltando else
                  f"{len(faltando)} item(ns) para resolver. Resolva de cima para baixo e rode de novo."))
    sys.exit(1 if faltando else 0)


if __name__ == "__main__":
    main()
