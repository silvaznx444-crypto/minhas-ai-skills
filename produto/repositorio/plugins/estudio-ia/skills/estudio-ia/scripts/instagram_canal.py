#!/usr/bin/env python3
"""Analisa a conta do Instagram e cuida dos comentários (API oficial). A postagem fica no
instagram.py (mesma pasta), que este script reaproveita (mesmas variáveis IG_ACCESS_TOKEN / IG_USER_ID).

Permissões extras do app: instagram_manage_insights (métricas) e instagram_manage_comments (comentários).

  python3 instagram_canal.py analisar [--posts 30] [--saida canal/instagram]
  python3 instagram_canal.py comentarios [--posts 10]            # comentários recentes ainda sem resposta
  python3 instagram_canal.py responder --comentario <id> --texto "Valeu!"
  python3 instagram_canal.py ocultar   --comentario <id> [--mostrar]
  python3 instagram_canal.py legenda   --post <id> --texto "..."  # NÃO existe na API: só imprime o passo a passo

O que a API do Instagram NÃO deixa mudar: bio, nome, foto de perfil, link da bio e legenda de post já
publicado. Para esses, o agente entrega o texto pronto e o usuário cola no app (leva 1 minuto).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from instagram import GRAPH, IGError, Instagram  # noqa: E402

CAMPOS_POST = "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink"
METRICAS = {
    "REELS": ["views", "reach", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time",
              "ig_reels_video_view_total_time"],
    "FEED": ["views", "reach", "saved", "shares", "total_interactions"],
    "STORY": ["views", "reach", "replies"],
}


def insights_post(ig: Instagram, m: dict) -> dict:
    lista = METRICAS.get(m.get("media_product_type"), METRICAS["FEED"])
    # tenta tudo de uma vez; se a versão da API recusar alguma métrica, tenta uma a uma
    for grupo in ([lista], [[x] for x in lista]):
        out = {}
        for metricas in grupo:
            try:
                d = ig._r("GET", f"{GRAPH}/{m['id']}/insights", params={"metric": ",".join(metricas)})
                for item in d.get("data", []):
                    vals = item.get("values") or [{}]
                    out[item["name"]] = vals[0].get("value")
            except IGError:
                if len(metricas) > 1:
                    break
        else:
            return out
    return {}


def insights_conta(ig: Instagram, dias: int) -> dict:
    fim = datetime.now()
    ini = fim - timedelta(days=min(dias, 30))
    out = {}
    for metrica in ("reach", "views", "profile_views", "accounts_engaged", "total_interactions",
                    "follows_and_unfollows", "website_clicks"):
        try:
            d = ig._r("GET", f"{GRAPH}/{ig.uid}/insights", params={
                "metric": metrica, "period": "day", "metric_type": "total_value",
                "since": int(ini.timestamp()), "until": int(fim.timestamp())})
            for item in d.get("data", []):
                tv = item.get("total_value", {})
                out[item["name"]] = tv.get("breakdowns") or tv.get("value")
        except IGError as e:
            out[metrica] = f"indisponível: {str(e)[:120]}"
    for metrica, bd in (("follower_demographics", "city"), ("follower_demographics", "age"),
                        ("follower_demographics", "gender")):
        try:
            d = ig._r("GET", f"{GRAPH}/{ig.uid}/insights", params={
                "metric": metrica, "period": "lifetime", "metric_type": "total_value", "breakdown": bd,
                "timeframe": "last_30_days"})
            out[f"seguidores_{bd}"] = d["data"][0]["total_value"]["breakdowns"][0]["results"][:10]
        except (IGError, KeyError, IndexError):
            pass
    return out


def posts(ig: Instagram, n: int) -> list[dict]:
    out, url, params = [], f"{GRAPH}/{ig.uid}/media", {"fields": CAMPOS_POST, "limit": min(n, 50)}
    while url and len(out) < n:
        d = ig._r("GET", url, params=params)
        out += d.get("data", [])
        url, params = d.get("paging", {}).get("next"), None
    return out[:n]


def diagnostico(m: dict, med_views: float) -> list[str]:
    cap = m.get("caption") or ""
    primeira = cap.split("\n")[0]
    f = []
    if not cap:
        f.append("sem_legenda")
    if len(primeira) > 125:
        f.append("gancho_longo_cortado_no_feed")
    n_tags = cap.count("#")
    if n_tags == 0:
        f.append("sem_hashtags")
    elif n_tags > 8:
        f.append("hashtags_demais")
    if "?" not in cap and not any(x in cap.lower() for x in ("comenta", "salva", "compartilha", "marca")):
        f.append("sem_chamada_para_acao")
    v = (m.get("insights") or {}).get("views") or 0
    if med_views and v < 0.5 * med_views:
        f.append("abaixo_da_mediana")
    if med_views and v > 2 * med_views:
        f.append("destaque_replicar_formato")
    return f


def analisar(ig: Instagram, a) -> None:
    perfil = ig._r("GET", f"{GRAPH}/{ig.uid}", params={
        "fields": "id,username,name,biography,website,followers_count,follows_count,media_count"})
    lista = posts(ig, a.posts)
    for m in lista:
        m["insights"] = insights_post(ig, m)
        ts = datetime.fromisoformat(m["timestamp"].replace("+0000", "+00:00"))
        m["dia_hora_utc"] = ts.strftime("%a %H:%M")
    views = sorted((m["insights"].get("views") or 0) for m in lista)
    med = views[len(views) // 2] if views else 0
    for m in lista:
        m["alertas"] = diagnostico(m, med)
    dados = {"gerado_em": datetime.now().isoformat(timespec="seconds"), "perfil": perfil,
             "conta_ultimos_30_dias": insights_conta(ig, 30), "mediana_views": med, "posts": lista}
    pasta = Path(a.saida) / date.today().isoformat()
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=2))
    print(f"@{perfil.get('username')}: {perfil.get('followers_count')} seguidores, {perfil.get('media_count')} posts")
    print(f"Bio atual: {perfil.get('biography', '')!r}")
    print(f"Analisados {len(lista)} posts; mediana de views = {med}")
    top = sorted(lista, key=lambda m: -(m["insights"].get("views") or 0))[:5]
    print("Top 5: " + " | ".join(f"{(m.get('caption') or '')[:35]!r} ({m['insights'].get('views')})" for m in top))
    print(f"Dados completos: {pasta / 'dados.json'}")


def comentarios(ig: Instagram, a) -> None:
    eu = ig.conta().get("username")
    pend = []
    for m in posts(ig, a.posts):
        if not m.get("comments_count"):
            continue
        d = ig._r("GET", f"{GRAPH}/{m['id']}/comments", params={
            "fields": "id,text,username,timestamp,hidden,replies{username}", "limit": 50})
        for c in d.get("data", []):
            respondeu = any(r.get("username") == eu for r in c.get("replies", {}).get("data", []))
            if not respondeu and c.get("username") != eu:
                pend.append({"post": m["id"], "post_legenda": (m.get("caption") or "")[:60], "comentario": c["id"],
                             "usuario": c.get("username"), "texto": c.get("text"), "oculto": c.get("hidden")})
    print(json.dumps(pend, ensure_ascii=False, indent=2))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("acao", choices=["analisar", "comentarios", "responder", "ocultar", "legenda"])
    ap.add_argument("--posts", type=int, default=30)
    ap.add_argument("--saida", default="canal/instagram")
    ap.add_argument("--comentario")
    ap.add_argument("--post")
    ap.add_argument("--texto")
    ap.add_argument("--mostrar", action="store_true", help="com 'ocultar': volta a mostrar o comentário")
    a = ap.parse_args()
    ig = Instagram()
    try:
        if a.acao == "analisar":
            analisar(ig, a)
        elif a.acao == "comentarios":
            comentarios(ig, a)
        elif a.acao == "responder":
            if not (a.comentario and a.texto):
                sys.exit("Informe --comentario e --texto")
            print(json.dumps(ig._r("POST", f"{GRAPH}/{a.comentario}/replies", data={"message": a.texto})))
        elif a.acao == "ocultar":
            if not a.comentario:
                sys.exit("Informe --comentario")
            ig._r("POST", f"{GRAPH}/{a.comentario}", data={"hide": "false" if a.mostrar else "true"})
            print("ok")
        elif a.acao == "legenda":
            print("A API do Instagram não permite editar legenda de post publicado.\n"
                  "No app: abra o post → ⋯ → Editar → cole o texto abaixo → Concluir.\n\n" + (a.texto or ""))
    except IGError as e:
        sys.exit(f"ERRO do Instagram: {e}")


if __name__ == "__main__":
    main()
