#!/usr/bin/env python3
"""Tomadas (cenas) do vídeo em historia/tomadas.json, sempre presas à fala.

  python3 ferramentas/tomadas.py --projeto projetos/x rascunho [--alvo 3.5] [--forcar]
  python3 ferramentas/tomadas.py --projeto projetos/x sincronizar
  python3 ferramentas/tomadas.py --projeto projetos/x conferir

rascunho     cria uma tomada a cada ~3,5 s, cortando nas frases e vírgulas. Cada tomada tem uma "ancora" (as palavras
             em que ela começa) e um campo "cena" para você descrever o que aparece.
sincronizar  recalcula ini/fim de TODAS as tomadas a partir das âncoras e da linha do tempo atual (use sempre que a
             narração mudar: voz nova, regravação, corte). Mantém todos os outros campos.
conferir     aponta buracos, tomadas longas ou curtas demais e âncoras que não existem na fala.

Formato de cada tomada:
  {"id": "S03", "ancora": "em 2010", "cena": "laboratório, dois pesquisadores...",
   "transicao": {"tipo": "fade|chicote|branco|corte", "dur": 0.35},
   "efeitos": [[0.2, "pop", -12]], "ambiente": ["sala", -30]}
E no topo: "musica": [{"de": 0, "ate": "S05", "clima": "curioso"}, {"de": "S05", "clima": "tenso"}]
  (de/ate em segundos ou no id da tomada; preso à tomada, a música acompanha quando a voz muda)
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from util import ler, normalizar, projeto, salvar  # noqa: E402

ANTECIPA = 0.15  # a imagem troca um pouco antes da palavra (parece mais natural)
CAUDA = 1.2      # segundos depois da última palavra
CONJ = {"e", "mas", "porque", "quando", "que", "entao", "enquanto", "porem", "so", "depois", "ate", "como", "onde"}


def achar(palavras, ancora: str, depois: float) -> int | None:
    alvo = [normalizar(x) for x in ancora.split() if normalizar(x)]
    for i, p in enumerate(palavras):
        if p["ini"] < depois - 0.05:
            continue
        if all(i + j < len(palavras) and normalizar(palavras[i + j]["texto"]).startswith(alvo[j]) for j in range(len(alvo))):
            return i
    return None


def rascunho(P: Path, palavras, alvo: float, forcar: bool) -> None:
    arq = P / "historia" / "tomadas.json"
    if arq.exists() and not forcar:
        sys.exit(f"{arq} já existe. Use 'sincronizar' (ou --forcar para jogar fora e recomeçar).")
    inicios, ultimo = [0], palavras[0]["ini"]
    for i in range(1, len(palavras)):
        ant = palavras[i - 1]["texto"]
        quebra_forte = re.search(r"[.?!…]$", ant) and palavras[i]["ini"] - ultimo > alvo * 0.6
        quebra_fraca = re.search(r"[,;:]$", ant) and palavras[i]["ini"] - ultimo > alvo
        conjuncao = normalizar(palavras[i]["texto"]) in CONJ and palavras[i]["ini"] - ultimo > alvo * 1.2
        longa = palavras[i]["ini"] - ultimo > alvo * 2.0
        if quebra_forte or quebra_fraca or conjuncao or longa:
            inicios.append(i)
            ultimo = palavras[i]["ini"]
    tomadas = []
    for n, i in enumerate(inicios):
        j = inicios[n + 1] if n + 1 < len(inicios) else len(palavras)
        trecho = " ".join(p["texto"] for p in palavras[i:j])
        tomadas.append({"id": f"S{n + 1:02d}", "ancora": " ".join(p["texto"] for p in palavras[i:i + 3]),
                        "fala": trecho, "cena": "(descreva o que aparece)"})
    dados = {"tomadas": tomadas, "musica": [{"de": 0, "ate": None, "clima": "curioso"}]}
    sincronizar_dados(dados, palavras)
    salvar(arq, dados)
    print(f"{len(tomadas)} tomadas em {arq} (média {dados['duracao'] / len(tomadas):.1f} s). Escreva o campo 'cena' de cada uma.")


def sincronizar_dados(dados, palavras) -> list[str]:
    T, avisos, antes = dados["tomadas"], [], 0.0
    for n, t in enumerate(T):
        if n == 0:
            t["ini"] = 0.0
            continue
        i = achar(palavras, t.get("ancora", ""), antes) if t.get("ancora") else None
        if i is None:
            avisos.append(f"{t['id']}: âncora '{t.get('ancora')}' não encontrada na fala; tempo mantido")
            t["ini"] = max(t.get("ini", antes), antes)
        else:
            t["ini"] = round(max(palavras[i]["ini"] - ANTECIPA, antes + 0.3), 2)
        antes = t["ini"]
    fim = round(palavras[-1]["fim"] + CAUDA, 2)
    for n, t in enumerate(T):
        t["fim"] = T[n + 1]["ini"] if n + 1 < len(T) else fim
    dados["duracao"] = fim
    for m in dados.get("musica", []):
        if m.get("ate") is None or (not isinstance(m["ate"], str) and m["ate"] > fim):
            m["ate"] = fim
    return avisos


def conferir(dados) -> list[str]:
    out, T = [], dados["tomadas"]
    ids = [t["id"] for t in T]
    out += [f"id repetido: {x}" for x in sorted({x for x in ids if ids.count(x) > 1})]
    for a, b in zip(T, T[1:]):
        if abs(a["fim"] - b["ini"]) > 0.01:
            out.append(f"buraco/sobreposição entre {a['id']} e {b['id']}")
    for t in T:
        d = t["fim"] - t["ini"]
        if d > 6.5:
            out.append(f"{t['id']}: {d:.1f} s (longa; o ideal é 3 a 5 s, quebre em duas)")
        if d < 1.0:
            out.append(f"{t['id']}: {d:.1f} s (curta demais)")
        if not t.get("cena") or t["cena"].startswith("("):
            out.append(f"{t['id']}: falta descrever a 'cena'")
    return out


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--projeto", required=True)
ap.add_argument("acao", choices=["rascunho", "sincronizar", "conferir"])
ap.add_argument("--alvo", type=float, default=3.5, help="duração-alvo de cada tomada no rascunho (s)")
ap.add_argument("--forcar", action="store_true")
a = ap.parse_args()
P = projeto(a.projeto)
palavras = ler(P / "linha" / "palavras.json", {"palavras": []})["palavras"]
if not palavras:
    sys.exit("Falta a linha do tempo: rode transcrever.py (com a narração) ou provisoria.py (sem ela).")
if a.acao == "rascunho":
    rascunho(P, palavras, a.alvo, a.forcar)
else:
    arq = P / "historia" / "tomadas.json"
    dados = ler(arq)
    if a.acao == "sincronizar":
        avisos = sincronizar_dados(dados, palavras)
        salvar(arq, dados)
        print(f"Sincronizado: {len(dados['tomadas'])} tomadas, {dados['duracao']} s.")
        print("\n".join("AVISO " + x for x in avisos))
    problemas = conferir(dados)
    print("\n".join(problemas) if problemas else "Tomadas ok.")
