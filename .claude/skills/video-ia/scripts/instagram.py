#!/usr/bin/env python3
"""Posta Reels no Instagram pela API oficial (Instagram API com Instagram Login).

Variáveis:
  IG_ACCESS_TOKEN  token (apps novos: token de usuário do sistema, não expira)
  IG_USER_ID       ID da conta do Instagram (apps novos, login unificado -> usa graph.facebook.com)
Hosts: graph.facebook.com (ou graph.instagram.com) e rupload.facebook.com.

  python3 instagram.py conta
  python3 instagram.py preparar --video projetos/x/final.mp4 --legenda "texto #tags"   # envia, NÃO publica
  python3 instagram.py publicar --id <creation_id>                                    # publica o que foi preparado
  python3 instagram.py postar   --video projetos/x/final.mp4 --legenda "..."          # envia e publica já
  python3 instagram.py renovar                                                       # renova o token (60 dias)

Um envio preparado ("container") vale por 24h no Instagram: para postar mais tarde no mesmo dia,
prepare agora e agende só o 'publicar'.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

VER = os.environ.get("IG_GRAPH_VERSION", "v24.0")
# Apps novos (login unificado / token de usuário do sistema) usam graph.facebook.com + IG_USER_ID.
# Apps antigos com "login do Instagram" usam graph.instagram.com e descobrem o ID sozinhos.
IG_USER_ID = os.environ.get("IG_USER_ID", "").strip()
HOST = os.environ.get("IG_GRAPH_HOST") or ("graph.facebook.com" if IG_USER_ID else "graph.instagram.com")
GRAPH = f"https://{HOST}/{VER}"


class IGError(RuntimeError):
    pass


def log(m: str) -> None:
    print(m, file=sys.stderr, flush=True)


class Instagram:
    def __init__(self):
        self.token = os.environ.get("IG_ACCESS_TOKEN") or "injetado-pelo-proxy"
        self.s = requests.Session()
        self.s.headers["Authorization"] = f"Bearer {self.token}"
        self._uid = IG_USER_ID or None

    def _r(self, method: str, url: str, **kw) -> dict:
        for tentativa in range(4):
            r = self.s.request(method, url, timeout=kw.pop("timeout", 120), **kw)
            if r.status_code >= 500 or r.status_code == 429:
                time.sleep(10 * (tentativa + 1))
                continue
            try:
                d = r.json()
            except ValueError:
                d = {"raw": r.text[:1000]}
            if r.status_code >= 400 or "error" in d:
                raise IGError(f"HTTP {r.status_code} {url.split('?')[0]}: {json.dumps(d, ensure_ascii=False)[:1500]}")
            return d
        raise IGError(f"Falhou após várias tentativas: {url}")

    def conta(self) -> dict:
        if IG_USER_ID:
            return self._r("GET", f"{GRAPH}/{IG_USER_ID}", params={"fields": "id,username,name"})
        d = self._r("GET", f"{GRAPH}/me", params={"fields": "user_id,username,account_type"})
        self._uid = d.get("user_id") or d.get("id")
        return d

    @property
    def uid(self) -> str:
        if not self._uid:
            self.conta()
        return self._uid

    def preparar(self, video: Path, legenda: str, capa_ms: int | None = None) -> str:
        dados = {"media_type": "REELS", "upload_type": "resumable", "caption": legenda,
                 "share_to_feed": "true"}
        if capa_ms is not None:
            dados["thumb_offset"] = str(capa_ms)
        c = self._r("POST", f"{GRAPH}/{self.uid}/media", data=dados)
        cid, uri = c["id"], c.get("uri") or f"https://rupload.facebook.com/ig-api-upload/{VER}/{c['id']}"
        tam = video.stat().st_size
        log(f"[instagram] enviando {video.name} ({tam / 1e6:.1f} MB)...")
        with open(video, "rb") as f:
            r = self.s.post(uri, data=f, timeout=900, headers={
                "Authorization": f"OAuth {self.token}", "offset": "0", "file_size": str(tam)})
        if r.status_code >= 400:
            raise IGError(f"Upload falhou: HTTP {r.status_code} {r.text[:800]}")
        t0 = time.time()
        while True:
            st = self._r("GET", f"{GRAPH}/{cid}", params={"fields": "status_code,status"})
            code = st.get("status_code")
            if code == "FINISHED":
                break
            if code in ("ERROR", "EXPIRED"):
                raise IGError(f"Instagram recusou o vídeo: {st}")
            if time.time() - t0 > 900:
                raise IGError("Processamento do Instagram demorou demais")
            log(f"[instagram] processando... ({code})")
            time.sleep(10)
        log(f"[instagram] pronto para publicar. creation_id={cid} (vale 24h)")
        return cid

    def publicar(self, cid: str) -> dict:
        st = self._r("GET", f"{GRAPH}/{cid}", params={"fields": "status_code"})
        if st.get("status_code") != "FINISHED":
            raise IGError(f"Envio {cid} não está pronto/expirou: {st}")
        m = self._r("POST", f"{GRAPH}/{self.uid}/media_publish", data={"creation_id": cid})
        info = self._r("GET", f"{GRAPH}/{m['id']}", params={"fields": "permalink,timestamp"})
        return {"media_id": m["id"], **info}

    def renovar(self) -> dict:
        if HOST != "graph.instagram.com":
            return {"expires_in": 0, "aviso": "token de usuário do sistema não expira"}
        return self._r("GET", "https://graph.instagram.com/refresh_access_token",
                       params={"grant_type": "ig_refresh_token", "access_token": self.token})


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("acao", choices=["conta", "preparar", "publicar", "postar", "renovar"])
    ap.add_argument("--video", type=Path)
    ap.add_argument("--legenda", default="")
    ap.add_argument("--legenda-arquivo", type=Path, help="lê a legenda de um arquivo .txt")
    ap.add_argument("--capa-ms", type=int, help="milissegundo do vídeo usado como capa")
    ap.add_argument("--id", help="creation_id devolvido pelo 'preparar'")
    a = ap.parse_args()
    legenda = a.legenda_arquivo.read_text().strip() if a.legenda_arquivo else a.legenda
    ig = Instagram()
    try:
        if a.acao == "conta":
            print(json.dumps(ig.conta(), ensure_ascii=False))
        elif a.acao == "renovar":
            d = ig.renovar()
            print(f"Token renovado por {d.get('expires_in', 0) // 86400} dias. "
                  "Salve o novo valor no ambiente (não é exibido aqui por segurança).")
        elif a.acao in ("preparar", "postar"):
            if not a.video or not a.video.exists():
                sys.exit("Informe --video com um arquivo existente")
            cid = ig.preparar(a.video, legenda, a.capa_ms)
            if a.video.parent.is_dir():
                (a.video.parent / "instagram.json").write_text(json.dumps(
                    {"creation_id": cid, "preparado_em": int(time.time()), "legenda": legenda},
                    ensure_ascii=False, indent=2))
            if a.acao == "postar":
                print(json.dumps(ig.publicar(cid), ensure_ascii=False))
            else:
                print(cid)
        elif a.acao == "publicar":
            if not a.id:
                sys.exit("Informe --id")
            print(json.dumps(ig.publicar(a.id), ensure_ascii=False))
    except IGError as e:
        sys.exit(f"ERRO do Instagram: {e}")


if __name__ == "__main__":
    main()
