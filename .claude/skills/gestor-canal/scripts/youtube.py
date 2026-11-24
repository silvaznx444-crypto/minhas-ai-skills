#!/usr/bin/env python3
"""Analisa e gerencia um canal do YouTube pela API oficial (Data API v3 + Analytics API v2).

Credenciais (OAuth de "App para computador" no Google Cloud):
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN   (o refresh token sai do comando 'autorizar')
Hosts: oauth2.googleapis.com, www.googleapis.com, youtubeanalytics.googleapis.com, i.ytimg.com

  python3 youtube.py autorizar                         # uma vez, de preferência no seu computador
  python3 youtube.py conta
  python3 youtube.py analisar [--videos 50] [--dias 90] [--saida canal/youtube]
  python3 youtube.py aplicar  --plano canal/youtube/2026-11-24/plano.json          # só mostra o que mudaria
  python3 youtube.py aplicar  --plano ... --sim                                     # aplica (e guarda backup)
  python3 youtube.py reverter --backup canal/youtube/2026-11-24/backup_XXXX.json --sim
  python3 youtube.py postar   --video projetos/x/final.mp4 --titulo "..." --descricao-arquivo legenda.txt \
                              [--tags a,b] [--agendar 2026-11-25T19:00:00-03:00] [--miniatura capa.jpg]

Formato do plano.json (só inclua o que muda):
  {"canal":  {"descricao": "...", "palavras_chave": "\"palavra 1\" palavra2"},
   "videos": [{"id": "abc123", "titulo": "...", "descricao": "...", "tags": ["..."], "categoria": "24",
               "motivo": "por que mudar"}],
   "miniaturas": [{"id": "abc123", "arquivo": "canal/youtube/.../thumb_abc123.jpg"}]}
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

API = "https://www.googleapis.com/youtube/v3"
UPLOAD = "https://www.googleapis.com/upload/youtube/v3"
ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = ["https://www.googleapis.com/auth/youtube",
          "https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/yt-analytics.readonly"]


class YTError(RuntimeError):
    pass


def log(m: str) -> None:
    print(m, file=sys.stderr, flush=True)


def _env(nome: str) -> str:
    v = os.environ.get(nome, "").strip()
    if not v:
        sys.exit(f"Falta a variável {nome}. Veja o SKILL.md do gestor-canal (seção YouTube).")
    return v


# --------------------------------------------------------------------- cliente
class YouTube:
    def __init__(self):
        self.s = requests.Session()
        self._token, self._exp = None, 0.0

    def _auth(self) -> str:
        if not self._token or time.time() > self._exp - 60:
            r = requests.post(TOKEN_URL, timeout=60, data={
                "client_id": _env("YT_CLIENT_ID"), "client_secret": _env("YT_CLIENT_SECRET"),
                "refresh_token": _env("YT_REFRESH_TOKEN"), "grant_type": "refresh_token"})
            d = r.json()
            if "access_token" not in d:
                raise YTError(f"Não consegui renovar o acesso (refaça 'autorizar'): {d}")
            self._token, self._exp = d["access_token"], time.time() + d.get("expires_in", 3600)
        return self._token

    def r(self, method: str, url: str, **kw) -> dict:
        for tentativa in range(4):
            h = kw.pop("headers", {}) | {"Authorization": f"Bearer {self._auth()}"}
            resp = self.s.request(method, url, headers=h, timeout=kw.pop("timeout", 120), **kw)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(5 * (tentativa + 1))
                kw["headers"] = h
                continue
            if resp.status_code == 204 or not resp.content:
                return {}
            d = resp.json() if "json" in resp.headers.get("content-type", "") else {"raw": resp.text[:800]}
            if resp.status_code >= 400:
                raise YTError(f"HTTP {resp.status_code} {url.split('?')[0]}: "
                              f"{json.dumps(d.get('error', d), ensure_ascii=False)[:1500]}")
            return d
        raise YTError(f"Falhou após várias tentativas: {url}")

    # ------------------------------------------------------------- leitura
    def canal(self) -> dict:
        d = self.r("GET", f"{API}/channels", params={
            "part": "snippet,statistics,brandingSettings,contentDetails,status", "mine": "true"})
        if not d.get("items"):
            raise YTError("Esta conta Google não tem canal do YouTube.")
        return d["items"][0]

    def ids_recentes(self, playlist: str, n: int) -> list[str]:
        ids, page = [], None
        while len(ids) < n:
            d = self.r("GET", f"{API}/playlistItems", params={
                "part": "contentDetails", "playlistId": playlist, "maxResults": 50,
                **({"pageToken": page} if page else {})})
            ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
            page = d.get("nextPageToken")
            if not page:
                break
        return ids[:n]

    def videos(self, ids: list[str], part="snippet,statistics,contentDetails,status") -> list[dict]:
        out = []
        for i in range(0, len(ids), 50):
            out += self.r("GET", f"{API}/videos", params={"part": part, "id": ",".join(ids[i:i + 50])}).get("items", [])
        return out

    def relatorio(self, ini: str, fim: str, metricas: str, **extra) -> list[dict]:
        d = self.r("GET", ANALYTICS, params={"ids": "channel==MINE", "startDate": ini, "endDate": fim,
                                             "metrics": metricas, **extra})
        cols = [c["name"] for c in d.get("columnHeaders", [])]
        return [dict(zip(cols, row)) for row in d.get("rows", [])]


# --------------------------------------------------------------- utilidades
def segundos(iso: str) -> int:
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


def checar_texto(titulo: str | None, descricao: str | None, tags: list[str] | None) -> list[str]:
    erros = []
    if titulo is not None:
        if not 1 <= len(titulo) <= 100:
            erros.append(f"título com {len(titulo)} caracteres (limite 100)")
        if "<" in titulo or ">" in titulo:
            erros.append("título não pode ter < ou >")
    if descricao is not None:
        if len(descricao.encode()) > 5000:
            erros.append("descrição passa de 5000 bytes")
        if "<" in descricao or ">" in descricao:
            erros.append("descrição não pode ter < ou >")
    if tags is not None and sum(len(t) + (2 if " " in t else 0) + 1 for t in tags) > 500:
        erros.append("tags somam mais de 500 caracteres")
    return erros


def diagnostico_video(v: dict, a: dict | None) -> list[str]:
    sn, st = v["snippet"], v.get("statistics", {})
    t, desc, tags = sn.get("title", ""), sn.get("description", ""), sn.get("tags", [])
    dur = segundos(v.get("contentDetails", {}).get("duration"))
    f = []
    if len(t) < 25:
        f.append("titulo_curto")
    if len(t) > 70:
        f.append("titulo_longo_cortado_no_celular")
    if len(desc) < 150:
        f.append("descricao_fraca")
    if not tags:
        f.append("sem_tags")
    if "#" not in desc and "#" not in t:
        f.append("sem_hashtags")
    if dur <= 180 and "#shorts" not in (t + desc).lower():
        f.append("short_sem_#shorts")
    if not sn.get("defaultLanguage") and not sn.get("defaultAudioLanguage"):
        f.append("sem_idioma_definido")
    views = int(st.get("viewCount", 0) or 0)
    if views and int(st.get("likeCount", 0) or 0) / views < 0.02:
        f.append("poucas_curtidas_por_view")
    if a:
        if a.get("averageViewPercentage", 100) < (60 if dur <= 180 else 35):
            f.append("retencao_baixa")
    return f


# ------------------------------------------------------------------ comandos
def autorizar(_a) -> None:
    cid, sec = _env("YT_CLIENT_ID"), _env("YT_CLIENT_SECRET")
    redir = "http://localhost"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": redir, "response_type": "code", "scope": " ".join(SCOPES),
        "access_type": "offline", "prompt": "consent"})
    print("\n1) Abra no navegador, entre com a conta DONA do canal e aceite:\n\n" + url +
          "\n\n2) O navegador vai para uma página 'localhost' que não abre — isso é normal."
          "\n   Copie o endereço inteiro da barra e cole aqui:\n")
    volta = input("> ").strip()
    code = urllib.parse.parse_qs(urllib.parse.urlparse(volta).query).get("code", [volta])[0]
    d = requests.post(TOKEN_URL, timeout=60, data={"code": code, "client_id": cid, "client_secret": sec,
                                                    "redirect_uri": redir, "grant_type": "authorization_code"}).json()
    if "refresh_token" not in d:
        sys.exit(f"Falhou: {d}")
    print("\nPronto. Guarde como variável de ambiente (é uma senha, não compartilhe):\n\n"
          f"YT_REFRESH_TOKEN={d['refresh_token']}\n")


def conta(yt: YouTube, _a) -> None:
    c = yt.canal()
    print(json.dumps({"id": c["id"], "titulo": c["snippet"]["title"],
                      "customUrl": c["snippet"].get("customUrl"), **c.get("statistics", {})}, ensure_ascii=False))


def analisar(yt: YouTube, a) -> None:
    c = yt.canal()
    uploads = c["contentDetails"]["relatedPlaylists"]["uploads"]
    vids = yt.videos(yt.ids_recentes(uploads, a.videos))
    fim = date.today().isoformat()
    ini = (date.today() - timedelta(days=a.dias)).isoformat()

    por_video, extra = {}, {}
    try:
        for row in yt.relatorio(ini, fim, "views,estimatedMinutesWatched,averageViewDuration,"
                                "averageViewPercentage,likes,comments,shares,subscribersGained",
                                dimensions="video", sort="-views", maxResults=200):
            por_video[row["video"]] = row
        extra["fontes_de_trafego"] = yt.relatorio(ini, fim, "views,estimatedMinutesWatched",
                                                  dimensions="insightTrafficSourceType", sort="-views")
        extra["por_dia"] = yt.relatorio(ini, fim, "views,subscribersGained,subscribersLost", dimensions="day",
                                        sort="day")
        extra["paises"] = yt.relatorio(ini, fim, "views", dimensions="country", sort="-views", maxResults=10)
        extra["idade_genero"] = yt.relatorio(ini, fim, "viewerPercentage", dimensions="ageGroup,gender")
        extra["termos_de_busca"] = yt.relatorio(
            ini, fim, "views", dimensions="insightTrafficSourceDetail",
            filters="insightTrafficSourceType==YT_SEARCH", sort="-views", maxResults=25)
    except YTError as e:
        log(f"[aviso] Analytics indisponível ({e}). Seguindo só com os dados públicos.")

    videos = []
    for v in vids:
        sn, st = v["snippet"], v.get("statistics", {})
        an = por_video.get(v["id"])
        pub = sn["publishedAt"]
        videos.append({
            "id": v["id"], "titulo": sn["title"], "descricao": sn.get("description", ""),
            "tags": sn.get("tags", []), "categoria": sn.get("categoryId"), "publicado": pub,
            "dia_semana": datetime.fromisoformat(pub.replace("Z", "+00:00")).strftime("%a %H:%MZ"),
            "duracao_s": segundos(v["contentDetails"].get("duration")),
            "privacidade": v.get("status", {}).get("privacyStatus"),
            "views": int(st.get("viewCount", 0) or 0), "likes": int(st.get("likeCount", 0) or 0),
            "comentarios": int(st.get("commentCount", 0) or 0),
            "analytics_periodo": an, "alertas": diagnostico_video(v, an),
        })

    br = c.get("brandingSettings", {}).get("channel", {})
    dados = {
        "gerado_em": datetime.now().isoformat(timespec="seconds"), "periodo": [ini, fim],
        "canal": {"id": c["id"], "titulo": c["snippet"]["title"], "customUrl": c["snippet"].get("customUrl"),
                  "descricao": br.get("description", c["snippet"].get("description", "")),
                  "palavras_chave": br.get("keywords", ""), "pais": br.get("country"),
                  "estatisticas": c.get("statistics", {})},
        "videos": videos, **extra,
    }
    pasta = Path(a.saida) / date.today().isoformat()
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2))

    # resumo curto para o terminal
    st = c.get("statistics", {})
    print(f"Canal: {c['snippet']['title']} — {st.get('subscriberCount', '?')} inscritos, "
          f"{st.get('videoCount', '?')} vídeos, {st.get('viewCount', '?')} views")
    alertas: dict[str, int] = {}
    for v in videos:
        for x in v["alertas"]:
            alertas[x] = alertas.get(x, 0) + 1
    print(f"Analisados {len(videos)} vídeos. Alertas: " +
          ", ".join(f"{k}={n}" for k, n in sorted(alertas.items(), key=lambda kv: -kv[1])))
    top = sorted(videos, key=lambda v: -v["views"])[:5]
    print("Top 5: " + " | ".join(f"{v['titulo'][:40]} ({v['views']})" for v in top))
    print(f"Dados completos: {pasta / 'dados.json'}")


def _baixar_miniatura(yt: YouTube, vid: str, pasta: Path) -> str | None:
    v = yt.videos([vid], part="snippet")
    th = v[0]["snippet"].get("thumbnails", {}) if v else {}
    for k in ("maxres", "standard", "high"):
        if k in th:
            r = requests.get(th[k]["url"], timeout=60)
            if r.ok:
                f = pasta / f"miniatura_original_{vid}.jpg"
                f.write_bytes(r.content)
                return str(f)
    return None


def aplicar(yt: YouTube, a, plano: dict | None = None) -> None:
    arq = Path(a.plano or a.backup)
    plano = plano or json.loads(arq.read_text())
    pasta = arq.parent
    backup: dict = {"canal": {}, "videos": [], "miniaturas": []}
    mudancas = 0

    # -------- canal
    if plano.get("canal"):
        c = yt.canal()
        br = c.get("brandingSettings", {})
        atual = br.get("channel", {})
        novo = dict(atual)
        if "descricao" in plano["canal"]:
            novo["description"] = plano["canal"]["descricao"]
        if "palavras_chave" in plano["canal"]:
            novo["keywords"] = plano["canal"]["palavras_chave"]
        erros = checar_texto(None, novo.get("description"), None)
        if erros:
            sys.exit(f"Plano do canal inválido: {erros}")
        if novo != atual:
            mudancas += 1
            print("CANAL:")
            for k in ("description", "keywords"):
                if novo.get(k) != atual.get(k):
                    print(f"  {k}:\n    antes: {atual.get(k, '')!r}\n    depois: {novo.get(k, '')!r}")
            backup["canal"] = {"descricao": atual.get("description", ""), "palavras_chave": atual.get("keywords", "")}
            if a.sim:
                yt.r("PUT", f"{API}/channels", params={"part": "brandingSettings"},
                     json={"id": c["id"], "brandingSettings": {**br, "channel": novo}})

    # -------- vídeos
    alvos = {v["id"]: v for v in plano.get("videos", [])}
    for v in yt.videos(list(alvos), part="snippet"):
        p, sn = alvos[v["id"]], v["snippet"]
        novo = {k: sn[k] for k in ("title", "description", "tags", "categoryId", "defaultLanguage",
                                   "defaultAudioLanguage") if k in sn}
        mapa = {"titulo": "title", "descricao": "description", "tags": "tags", "categoria": "categoryId",
                "idioma": "defaultLanguage"}
        for pk, yk in mapa.items():
            if pk in p:
                novo[yk] = p[pk]
        erros = checar_texto(novo.get("title"), novo.get("description"), novo.get("tags"))
        if erros:
            print(f"PULANDO {v['id']}: {erros}")
            continue
        difs = [k for k in novo if novo.get(k) != sn.get(k)]
        if not difs:
            continue
        mudancas += 1
        print(f"VÍDEO {v['id']} ({sn['title'][:50]})" + (f" — {p['motivo']}" if p.get("motivo") else ""))
        for k in difs:
            antes, depois = sn.get(k, ""), novo[k]
            if k == "description":
                antes, depois = antes[:120] + "…", depois[:120] + "…"
            print(f"  {k}:\n    antes: {antes!r}\n    depois: {depois!r}")
        backup["videos"].append({"id": v["id"], "titulo": sn.get("title"), "descricao": sn.get("description", ""),
                                 "tags": sn.get("tags", []), "categoria": sn.get("categoryId")})
        if a.sim:
            yt.r("PUT", f"{API}/videos", params={"part": "snippet"}, json={"id": v["id"], "snippet": novo})
    faltando = set(alvos) - {v["id"] for v in yt.videos(list(alvos), part="id")} if alvos else set()
    for f in faltando:
        print(f"[aviso] vídeo {f} não encontrado no canal")

    # -------- miniaturas
    for m in plano.get("miniaturas", []):
        img = Path(m["arquivo"])
        if not img.exists():
            print(f"PULANDO miniatura {m['id']}: {img} não existe")
            continue
        if img.stat().st_size > 2 * 1024 * 1024:
            print(f"PULANDO miniatura {m['id']}: imagem acima de 2 MB")
            continue
        mudancas += 1
        print(f"MINIATURA {m['id']} <- {img}")
        if a.sim:
            orig = _baixar_miniatura(yt, m["id"], pasta)
            if orig:
                backup["miniaturas"].append({"id": m["id"], "arquivo": orig})
            mime = "image/png" if img.suffix.lower() == ".png" else "image/jpeg"
            yt.r("POST", f"{UPLOAD}/thumbnails/set", params={"videoId": m["id"]},
                 data=img.read_bytes(), headers={"Content-Type": mime})

    if not mudancas:
        print("Nada a mudar.")
    elif not a.sim:
        print(f"\n{mudancas} mudança(s) PREVISTAS. Nada foi alterado. Rode de novo com --sim para aplicar.")
    else:
        b = pasta / f"backup_{datetime.now():%Y%m%d_%H%M%S}.json"
        b.write_text(json.dumps(backup, ensure_ascii=False, indent=2))
        print(f"\n{mudancas} mudança(s) APLICADAS. Para desfazer: youtube.py reverter --backup {b} --sim")


def postar(yt: YouTube, a) -> None:
    video = Path(a.video)
    if not video.exists():
        sys.exit(f"Vídeo não encontrado: {video}")
    desc = Path(a.descricao_arquivo).read_text().strip() if a.descricao_arquivo else (a.descricao or "")
    tags = [t.strip() for t in (a.tags or "").split(",") if t.strip()]
    erros = checar_texto(a.titulo, desc, tags)
    if erros:
        sys.exit(f"Inválido: {erros}")
    status = {"privacyStatus": a.privacidade, "selfDeclaredMadeForKids": False,
              "containsSyntheticMedia": not a.sem_aviso_ia}
    if a.agendar:
        status["privacyStatus"] = "private"
        status["publishAt"] = datetime.fromisoformat(a.agendar).isoformat()
    meta = {"snippet": {"title": a.titulo, "description": desc, "tags": tags, "categoryId": a.categoria,
                        "defaultLanguage": "pt-BR", "defaultAudioLanguage": "pt-BR"}, "status": status}
    tam = video.stat().st_size
    ini = yt.s.post(f"{UPLOAD}/videos", params={"uploadType": "resumable", "part": "snippet,status"},
                    json=meta, timeout=60, headers={
                        "Authorization": f"Bearer {yt._auth()}", "X-Upload-Content-Type": "video/mp4",
                        "X-Upload-Content-Length": str(tam)})
    if ini.status_code >= 400 or "Location" not in ini.headers:
        sys.exit(f"ERRO ao iniciar envio: HTTP {ini.status_code} {ini.text[:1000]}")
    log(f"[youtube] enviando {video.name} ({tam / 1e6:.1f} MB)...")
    with open(video, "rb") as f:
        r = yt.s.put(ini.headers["Location"], data=f, timeout=1800,
                     headers={"Authorization": f"Bearer {yt._auth()}", "Content-Type": "video/mp4"})
    if r.status_code >= 400:
        sys.exit(f"ERRO no envio: HTTP {r.status_code} {r.text[:1000]}")
    vid = r.json()["id"]
    if a.miniatura:
        try:
            img = Path(a.miniatura)
            yt.r("POST", f"{UPLOAD}/thumbnails/set", params={"videoId": vid}, data=img.read_bytes(),
                 headers={"Content-Type": "image/png" if img.suffix.lower() == ".png" else "image/jpeg"})
        except YTError as e:
            log(f"[aviso] miniatura não aplicada (conta precisa estar verificada?): {e}")
    out = {"id": vid, "url": f"https://youtu.be/{vid}", "status": status}
    if video.parent.is_dir():
        (video.parent / "youtube.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(json.dumps(out, ensure_ascii=False))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("acao", choices=["autorizar", "conta", "analisar", "aplicar", "reverter", "postar"])
    ap.add_argument("--videos", type=int, default=50, help="quantos vídeos recentes analisar")
    ap.add_argument("--dias", type=int, default=90, help="período do Analytics")
    ap.add_argument("--saida", default="canal/youtube")
    ap.add_argument("--plano")
    ap.add_argument("--backup")
    ap.add_argument("--sim", action="store_true", help="aplica de verdade (sem isso só mostra)")
    ap.add_argument("--video")
    ap.add_argument("--titulo")
    ap.add_argument("--descricao")
    ap.add_argument("--descricao-arquivo")
    ap.add_argument("--tags", help="separadas por vírgula")
    ap.add_argument("--categoria", default="24", help="24=Entretenimento, 22=Pessoas e blogs, 1=Animação")
    ap.add_argument("--privacidade", default="public", choices=["public", "unlisted", "private"])
    ap.add_argument("--agendar", help="data/hora ISO com fuso, ex. 2026-11-25T19:00:00-03:00")
    ap.add_argument("--miniatura")
    ap.add_argument("--sem-aviso-ia", action="store_true",
                    help="não marca 'conteúdo alterado/sintético' (NÃO use em vídeos feitos com IA realista)")
    a = ap.parse_args()
    if a.acao == "autorizar":
        return autorizar(a)
    yt = YouTube()
    try:
        if a.acao == "conta":
            conta(yt, a)
        elif a.acao == "analisar":
            analisar(yt, a)
        elif a.acao == "aplicar":
            if not a.plano:
                sys.exit("Informe --plano")
            aplicar(yt, a)
        elif a.acao == "reverter":
            if not a.backup:
                sys.exit("Informe --backup")
            aplicar(yt, a)
        elif a.acao == "postar":
            if not (a.video and a.titulo):
                sys.exit("Informe --video e --titulo")
            postar(yt, a)
    except YTError as e:
        sys.exit(f"ERRO do YouTube: {e}")


if __name__ == "__main__":
    main()
