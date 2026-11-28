#!/usr/bin/env python3
"""Análises estratégicas para YouTube: nicho, concorrentes, vídeos de referência e retenção.

Os comandos só COLETAM e MEDEM. Quem tira as conclusões e escreve a estratégia é o Claude,
lendo os JSON gerados. A Gemini entra só onde é preciso ASSISTIR um vídeo.

  python3 estrategia.py nicho --termo "psicologia" --termo "curiosidades da mente" [--dias 180] [--duracao medium]
  python3 estrategia.py concorrente --canal @handle            # ou link do canal, ou ID UC...
  python3 estrategia.py analisar-video --url https://youtu.be/XXXX [--contexto "meu canal é ..."]
  python3 estrategia.py analisar-video --arquivo projetos/x/final.mp4 --pergunta "o gancho prende?"
  python3 estrategia.py retencao --video <id de um vídeo SEU> [--explicar]

Saída: canal/estrategia/<data>/... (os dados brutos se chamam dados_*.json e ficam fora do git).
Credenciais: as do YouTube (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN) e as da Gemini/Vertex.
Cota do YouTube: cada busca do 'nicho' custa 100 unidades (de 10.000/dia); o resto custa 1–3.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from youtube import API, YouTube, YTError, segundos  # noqa: E402

try:
    from zoneinfo import ZoneInfo
    BRT = ZoneInfo("America/Sao_Paulo")
except Exception:  # sem base de fusos: Brasília é UTC-3 o ano todo desde 2019
    BRT = timezone(timedelta(hours=-3))

DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
STOP = set("""a o as os um uma uns umas de da do das dos e é em no na nos nas por para pra com sem que se
seu sua seus suas ao aos à às ou mais menos muito como quando porque porquê quem qual quais isso isto esse essa
este esta ele ela eles elas eu você vocês voce me te nos lhe meu minha mas não nao sim já ja tem ter foi ser são
sao está esta estão vai vou the of to and in is it you your on for with shorts""".split())


def log(m: str) -> None:
    print(m, file=sys.stderr, flush=True)


def pasta_saida(base: str) -> Path:
    p = Path(base) / date.today().isoformat()
    p.mkdir(parents=True, exist_ok=True)
    return p


def slug(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40] or "x"


def quando(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def num(x: float) -> str:
    return f"{x:,.0f}".replace(",", ".")


def mmss(s: float) -> str:
    return f"{int(s // 60)}:{int(s % 60):02d}"


def gemini():
    import vertex
    from gemini import Gemini
    return vertex.Vertex() if vertex.configurado() else Gemini()


# ------------------------------------------------------------------ enriquecer
def detalhes(yt: YouTube, ids: list[str]) -> list[dict]:
    """Junta estatísticas do vídeo e do canal e calcula as métricas de desempenho."""
    vids = yt.videos(ids, part="snippet,statistics,contentDetails")
    cids = sorted({v["snippet"]["channelId"] for v in vids})
    canais = {}
    for i in range(0, len(cids), 50):
        for c in yt.r("GET", f"{API}/channels", params={"part": "snippet,statistics",
                                                       "id": ",".join(cids[i:i + 50])}).get("items", []):
            canais[c["id"]] = c
    agora = datetime.now(timezone.utc)
    out = []
    for v in vids:
        sn, st = v["snippet"], v.get("statistics", {})
        c = canais.get(sn["channelId"], {})
        cst = c.get("statistics", {})
        views = int(st.get("viewCount", 0) or 0)
        idade = max((agora - quando(sn["publishedAt"])).total_seconds() / 86400, 0.5)
        n_vid = int(cst.get("videoCount", 0) or 0)
        media_canal = int(cst.get("viewCount", 0) or 0) / n_vid if n_vid else 0
        insc = 0 if cst.get("hiddenSubscriberCount") else int(cst.get("subscriberCount", 0) or 0)
        local = quando(sn["publishedAt"]).astimezone(BRT)
        out.append({
            "id": v["id"], "url": f"https://youtu.be/{v['id']}", "titulo": sn["title"],
            "canal": sn["channelTitle"], "canal_id": sn["channelId"], "inscritos_canal": insc,
            "publicado": sn["publishedAt"], "publicado_brasilia": f"{DIAS[local.weekday()]} {local:%d/%m %H:%M}",
            "idade_dias": round(idade, 1), "duracao_s": segundos(v["contentDetails"].get("duration")),
            "views": views, "likes": int(st.get("likeCount", 0) or 0),
            "comentarios": int(st.get("commentCount", 0) or 0),
            "views_por_dia": round(views / idade),
            # quantas vezes acima da média do próprio canal (o "outlier": o tema/título que furou a bolha)
            "x_media_do_canal": round(views / media_canal, 2) if media_canal else None,
            "views_por_inscrito": round(views / insc, 2) if insc else None,
            "engajamento_pct": round(100 * (int(st.get("likeCount", 0) or 0) + int(st.get("commentCount", 0) or 0))
                                     / views, 2) if views else 0,
            "idioma": sn.get("defaultAudioLanguage") or sn.get("defaultLanguage"),
            "tags": sn.get("tags", [])[:15], "descricao_inicio": sn.get("description", "")[:300],
            "miniatura": (sn.get("thumbnails", {}).get("high") or sn.get("thumbnails", {}).get("default") or {}).get("url"),
        })
    return out


ES = re.compile(r"¿|¡|ñ|\b(los|las|del|por qué|qué|cómo|y|el|una|para que|hombres|mujeres)\b", re.I)
EN = re.compile(r"\b(the|why|how|what|you|your|and|of|to|with|this|that|explained)\b", re.I)
PT = re.compile(r"[ãõç]|\b(você|não|isso|seu|sua|quem|porque|por que|como|que|da|do|uma|pra)\b", re.I)


def idioma_ok(v: dict, idioma: str) -> bool:
    """Descarta vídeos de outro idioma (a busca do YouTube mistura espanhol e inglês mesmo pedindo pt)."""
    if v.get("idioma"):
        return v["idioma"].lower().startswith(idioma.lower())
    if idioma != "pt":
        return True
    t = v["titulo"]
    pt, es, en = len(PT.findall(t)), len(ES.findall(t)), len(EN.findall(t))
    return pt >= es and pt >= en and not (pt == 0 and (es or en))


def padroes_titulos(videos: list[dict]) -> dict:
    tit = [v["titulo"] for v in videos]
    if not tit:
        return {}
    palavras = Counter()
    for t in tit:
        for w in re.findall(r"[\wÀ-ÿ]+", t.lower()):
            if len(w) > 2 and w not in STOP and not w.isdigit():
                palavras[w] += 1
    pct = lambda f: round(100 * sum(1 for t in tit if f(t)) / len(tit))  # noqa: E731
    return {
        "tamanho_medio": round(statistics.mean(len(t) for t in tit)),
        "pct_pergunta": pct(lambda t: "?" in t),
        "pct_numero": pct(lambda t: bool(re.search(r"\d", t))),
        "pct_fala_com_voce": pct(lambda t: bool(re.search(r"\bvoc[eê]\b|\bseu\b|\bsua\b", t.lower()))),
        "pct_maiusculas": pct(lambda t: bool(re.search(r"\b[A-ZÀ-Ý]{4,}\b", t))),
        "pct_parenteses": pct(lambda t: "(" in t),
        "palavras_mais_usadas": palavras.most_common(25),
    }


def resumo_duracao(videos: list[dict]) -> dict:
    faixas = Counter()
    for v in videos:
        d = v["duracao_s"]
        faixas["até 1 min" if d <= 60 else "1–3 min" if d <= 180 else "3–8 min" if d <= 480
               else "8–15 min" if d <= 900 else "15–30 min" if d <= 1800 else "30+ min"] += 1
    return dict(faixas.most_common())


# ------------------------------------------------------------------------ nicho
def nicho(yt: YouTube, a) -> None:
    desde = (datetime.now(timezone.utc) - timedelta(days=a.dias)).strftime("%Y-%m-%dT%H:%M:%SZ")
    ids, por_termo = [], {}
    for termo in a.termo:
        params = {"part": "snippet", "q": termo, "type": "video", "order": a.ordem, "maxResults": 50,
                  "publishedAfter": desde, "regionCode": a.regiao}
        if a.idioma != "any":
            params["relevanceLanguage"] = a.idioma
        if a.duracao != "any":
            params["videoDuration"] = a.duracao
        achados, page = [], None
        while len(achados) < a.max:
            d = yt.r("GET", f"{API}/search", params={**params, **({"pageToken": page} if page else {})})
            achados += [i["id"]["videoId"] for i in d.get("items", []) if i.get("id", {}).get("videoId")]
            page = d.get("nextPageToken")
            if not page:
                break
        por_termo[termo] = achados[:a.max]
        ids += [i for i in achados[:a.max] if i not in ids]
        log(f"[nicho] '{termo}': {len(achados[:a.max])} vídeos")
    videos = detalhes(yt, ids)
    if a.idioma != "any":
        antes = len(videos)
        videos = [v for v in videos if idioma_ok(v, a.idioma)]
        log(f"[nicho] {antes - len(videos)} vídeo(s) de outro idioma descartados")
    for v in videos:
        v["termos"] = [t for t, lst in por_termo.items() if v["id"] in lst]

    relevantes = [v for v in videos if v["views"] >= a.min_views]
    outliers = sorted([v for v in relevantes if v["x_media_do_canal"]],
                      key=lambda v: -v["x_media_do_canal"])[:20]
    rapidos = sorted(relevantes, key=lambda v: -v["views_por_dia"])[:20]
    canais = Counter(v["canal"] for v in videos)
    info_canal = {}
    for v in videos:
        c = info_canal.setdefault(v["canal"], {"canal_id": v["canal_id"], "inscritos": v["inscritos_canal"],
                                               "videos_no_resultado": 0, "views_no_resultado": 0})
        c["videos_no_resultado"] += 1
        c["views_no_resultado"] += v["views"]
    concorrentes = sorted(info_canal.items(), key=lambda kv: -kv[1]["views_no_resultado"])[:15]
    pequenos_que_bombam = [v for v in outliers if 0 < v["inscritos_canal"] < 50_000][:10]

    dados = {
        "gerado_em": datetime.now().isoformat(timespec="seconds"), "termos": a.termo, "dias": a.dias,
        "filtro_duracao": a.duracao, "total_videos": len(videos),
        "resumo": {
            "views_mediana": statistics.median([v["views"] for v in videos]) if videos else 0,
            "duracao_dos_resultados": resumo_duracao(videos),
            "duracao_dos_outliers": resumo_duracao(outliers),
            "titulos_outliers": padroes_titulos(outliers),
            "titulos_todos": padroes_titulos(videos),
            "dias_de_publicacao_outliers": Counter(v["publicado_brasilia"][:3] for v in outliers).most_common(),
        },
        "outliers": outliers, "mais_rapidos": rapidos,
        "canais_pequenos_que_bombaram": pequenos_que_bombam,
        "concorrentes": [{"canal": n, **c} for n, c in concorrentes],
        "videos": videos,
    }
    out = pasta_saida(a.saida) / f"dados_nicho_{slug('_'.join(a.termo))}.json"
    out.write_text(json.dumps(dados, ensure_ascii=False, indent=2))

    print(f"Nicho: {', '.join(a.termo)} — {len(videos)} vídeos dos últimos {a.dias} dias "
          f"(mediana {dados['resumo']['views_mediana']:,.0f} views)".replace(",", "."))
    print("\nOUTLIERS (vezes acima da média do próprio canal):")
    for v in outliers[:10]:
        print(f"  {v['x_media_do_canal']:>6.1f}x  {v['views']:>10,} views  {mmss(v['duracao_s']):>6}  "
              f"{v['titulo'][:70]}  [{v['canal']}, {v['inscritos_canal']:,} insc.]".replace(",", "."))
    print("\nCRESCENDO MAIS RÁPIDO (views por dia):")
    for v in rapidos[:5]:
        print(f"  {v['views_por_dia']:>8,}/dia  {v['titulo'][:70]}  [{v['canal']}]".replace(",", "."))
    print("\nCANAIS COM MAIS VIEWS NO NICHO: " + "; ".join(
        f"{n.strip()} ({c['videos_no_resultado']} víd., {num(c['views_no_resultado'])} views)"
        for n, c in concorrentes[:8]))
    print(f"Duração dos outliers: {dados['resumo']['duracao_dos_outliers']}")
    print(f"\nDados completos: {out}")


# ------------------------------------------------------------------ concorrente
def resolver_canal(yt: YouTube, ref: str) -> dict:
    part = "snippet,statistics,contentDetails,brandingSettings"
    m = re.search(r"(UC[\w-]{22})", ref)
    if m:
        params = {"id": m.group(1)}
    else:
        h = re.search(r"@([\w.\-]+)", ref)
        params = {"forHandle": "@" + (h.group(1) if h else ref.strip())}
    itens = yt.r("GET", f"{API}/channels", params={"part": part, **params}).get("items", [])
    if not itens and not m:  # nome solto: procura pelo nome (custa 100 de cota)
        d = yt.r("GET", f"{API}/search", params={"part": "snippet", "q": ref, "type": "channel", "maxResults": 1})
        if d.get("items"):
            itens = yt.r("GET", f"{API}/channels", params={
                "part": part, "id": d["items"][0]["snippet"]["channelId"]}).get("items", [])
    if not itens:
        raise YTError(f"Canal não encontrado: {ref}")
    return itens[0]


def concorrente(yt: YouTube, a) -> None:
    c = resolver_canal(yt, a.canal)
    sn, st = c["snippet"], c.get("statistics", {})
    ids = yt.ids_recentes(c["contentDetails"]["relatedPlaylists"]["uploads"], a.videos)
    videos = sorted(detalhes(yt, ids), key=lambda v: v["publicado"], reverse=True)
    maduros = [v for v in videos if v["idade_dias"] >= 3] or videos
    med = statistics.median([v["views"] for v in maduros]) if maduros else 0
    for v in videos:
        v["x_mediana_recente"] = round(v["views"] / med, 2) if med else None
    acima = sorted([v for v in maduros if med and v["views"] >= 2 * med], key=lambda v: -v["views"])
    abaixo = sorted([v for v in maduros if med and v["views"] <= 0.5 * med], key=lambda v: v["views"])
    datas = sorted(quando(v["publicado"]) for v in videos)
    intervalos = [(b - a_).total_seconds() / 86400 for a_, b in zip(datas, datas[1:])]
    horarios = Counter(v["publicado_brasilia"].split()[0] + " " + v["publicado_brasilia"].split()[2][:2] + "h"
                       for v in videos)
    curtos = [v for v in videos if v["duracao_s"] <= 180]
    longos = [v for v in videos if v["duracao_s"] > 180]
    dados = {
        "gerado_em": datetime.now().isoformat(timespec="seconds"),
        "canal": {"id": c["id"], "titulo": sn["title"], "handle": sn.get("customUrl"),
                  "criado": sn.get("publishedAt"), "pais": sn.get("country"),
                  "descricao": sn.get("description", "")[:1500],
                  "palavras_chave": c.get("brandingSettings", {}).get("channel", {}).get("keywords", ""),
                  "inscritos": st.get("subscriberCount"), "views": st.get("viewCount"), "videos": st.get("videoCount")},
        "analisados": len(videos), "views_mediana_recente": med,
        "dias_entre_videos_mediana": round(statistics.median(intervalos), 1) if intervalos else None,
        "horarios_brasilia": horarios.most_common(10),
        "curtos_vs_longos": {
            "curtos": {"qtd": len(curtos), "views_mediana": statistics.median([v["views"] for v in curtos]) if curtos else 0},
            "longos": {"qtd": len(longos), "views_mediana": statistics.median([v["views"] for v in longos]) if longos else 0}},
        "duracao": resumo_duracao(videos),
        "titulos_que_bombaram": padroes_titulos(acima), "titulos_que_floparam": padroes_titulos(abaixo),
        "bombaram": acima[:15], "floparam": abaixo[:10], "videos": videos,
    }
    out = pasta_saida(a.saida) / f"dados_concorrente_{slug(sn.get('customUrl') or sn['title'])}.json"
    out.write_text(json.dumps(dados, ensure_ascii=False, indent=2))
    print(f"Canal: {sn['title']} ({sn.get('customUrl', '')}) — {int(st.get('subscriberCount', 0) or 0):,} inscritos, "
          f"{st.get('videoCount')} vídeos".replace(",", "."))
    print(f"Últimos {len(videos)}: mediana {med:,.0f} views; posta a cada ~{dados['dias_entre_videos_mediana']} dias; "
          f"curtos {len(curtos)} / longos {len(longos)}".replace(",", "."))
    print(f"Horários mais usados (Brasília): {', '.join(f'{h} ({n})' for h, n in horarios.most_common(4))}")
    print("\nBOMBARAM (≥ 2x a mediana):")
    for v in acima[:10]:
        print(f"  {v['x_mediana_recente']:>5.1f}x  {v['views']:>10,}  {mmss(v['duracao_s']):>6}  {v['titulo'][:75]}".replace(",", "."))
    print("\nFLOPARAM (≤ metade da mediana):")
    for v in abaixo[:5]:
        print(f"  {v['x_mediana_recente']:>5.2f}x  {v['views']:>10,}  {v['titulo'][:75]}".replace(",", "."))
    print(f"\nDados completos: {out}")


# --------------------------------------------------------------- analisar vídeo
PROMPT_VIDEO = """Você é estrategista de YouTube especialista em retenção e viralização no Brasil.
Assista ao vídeo inteiro (imagem E áudio) e faça uma engenharia reversa do que ele faz bem e mal.
{contexto}
Responda SÓ com JSON válido, em português do Brasil, neste formato:
{{
  "resumo": "do que se trata, em 2 frases",
  "formato": "ex.: explicativo narrado com animação 3D; short de humor com diálogo; lista; storytelling...",
  "duracao_aprox_s": 0,
  "gancho": {{
    "primeiros_3s": "o que se vê e se ouve, literalmente",
    "ate_30s": "como ele segura até os 30 s",
    "tecnica": "pergunta / promessa / conflito / choque / identificação / curiosidade aberta...",
    "nota_0a10": 0,
    "como_melhorar": "..."
  }},
  "estrutura": [{{"inicio": "0:00", "fim": "0:15", "parte": "gancho", "o_que_acontece": "..."}}],
  "tecnicas_de_retencao": ["loops abertos, mudança de cena a cada X s, perguntas ao público, ..."],
  "momentos_de_risco": [{{"tempo": "1:05", "motivo": "onde é provável que as pessoas saiam e por quê"}}],
  "visual": {{"estilo": "...", "ritmo_de_cortes_s": 0, "texto_na_tela": "...", "personagens": "..."}},
  "audio": {{"narracao": "tom, velocidade, voz", "musica": "...", "efeitos": "..."}},
  "titulo_e_miniatura": "por que o título/tema dão vontade de clicar (se der para inferir)",
  "chamada_para_acao": "...",
  "pontos_fortes": ["..."],
  "pontos_fracos": ["..."],
  "receita_replicavel": "passo a passo do roteiro em 5–8 etapas que dá para copiar em outro tema",
  "como_adaptar": "como usar isso no canal descrito no contexto (sem copiar o conteúdo)",
  "ideias_derivadas": [{{"titulo": "≤ 60 caracteres", "por_que": "..."}}]
}}
Dê 5 ideias_derivadas. Seja concreto, cite tempos (m:ss). Não invente o que não está no vídeo."""


def parte_video(a, tmp: Path) -> tuple[dict, str]:
    if a.url:
        m = re.search(r"(?:v=|youtu\.be/|shorts/|live/|embed/)([\w-]{11})", a.url)
        vid = m.group(1) if m else a.url.strip()
        return {"fileData": {"fileUri": f"https://www.youtube.com/watch?v={vid}", "mimeType": "video/*"}}, vid
    arq = Path(a.arquivo)
    if not arq.exists():
        sys.exit(f"Arquivo não encontrado: {arq}")
    from gemini import Gemini
    if arq.stat().st_size > 18 * 1024 * 1024:  # o envio inline tem limite: reduz para 360p e áudio mono
        menor = tmp / "menor.mp4"
        log(f"[video] reduzindo {arq.name} ({arq.stat().st_size / 1e6:.0f} MB) para enviar à Gemini...")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(arq), "-vf", "scale=-2:360,fps=12",
                        "-c:v", "libx264", "-crf", "32", "-preset", "veryfast", "-c:a", "aac", "-b:a", "48k",
                        "-ac", "1", str(menor)], check=True)
        arq = menor
    return Gemini.inline(arq), slug(Path(a.arquivo).stem)


def contexto_canal(a) -> str:
    if a.contexto:
        return f"CONTEXTO DO MEU CANAL: {a.contexto}\n"
    try:
        c = YouTube().canal()
        return (f"CONTEXTO DO MEU CANAL: '{c['snippet']['title']}': "
                f"{c['snippet'].get('description', '')[:600]}\n")
    except (YTError, SystemExit):
        return ""


def analisar_video(a) -> None:
    g = gemini()
    modelo = g.pick("texto", a.modelo)
    cfg = {"mediaResolution": "MEDIA_RESOLUTION_LOW"} if a.baixa_resolucao else None
    with tempfile.TemporaryDirectory() as tmp:
        parte, nome = parte_video(a, Path(tmp))
        log(f"[video] {modelo} assistindo ao vídeo...")
        try:
            if a.pergunta:
                r = g.text(a.pergunta + "\nResponda em português do Brasil, citando tempos (m:ss).", modelo,
                           parts=[parte], config=cfg)
                print(r)
                return
            r = g.text(PROMPT_VIDEO.format(contexto=contexto_canal(a)), modelo, parts=[parte], json_out=True, config=cfg)
        except Exception as e:  # noqa: BLE001
            sys.exit(f"ERRO ao analisar o vídeo: {e}\n(Vídeo privado/não listado não abre pelo link: use --arquivo. "
                     "Vídeo muito longo: use --baixa-resolucao.)")
    out = pasta_saida(a.saida) / f"video_{nome}.json"
    out.write_text(json.dumps(r, ensure_ascii=False, indent=2))
    gan = r.get("gancho", {})
    print(f"{r.get('resumo', '')}\nFormato: {r.get('formato', '')}")
    print(f"Gancho ({gan.get('nota_0a10', '?')}/10, {gan.get('tecnica', '')}): {gan.get('primeiros_3s', '')}")
    for m in r.get("momentos_de_risco", [])[:4]:
        print(f"  risco {m.get('tempo')}: {m.get('motivo')}")
    print("Ideias: " + " | ".join(i.get("titulo", "") for i in r.get("ideias_derivadas", [])))
    print(f"Análise completa: {out}")


# --------------------------------------------------------------------- retenção
PROMPT_RETENCAO = """Este é um vídeo do meu canal. Pelos dados do YouTube Analytics, a audiência caiu mais nestes
pontos (tempo — quanto do público saiu ali):
{quedas}
Retenção: {marcos}

Assista ao vídeo (imagem e áudio) e responda SÓ com JSON em português do Brasil:
{{
  "gancho": {{"o_que_acontece_0a5s": "...", "problema": "...", "reescrita_sugerida": "fala nova dos primeiros 5 s"}},
  "quedas": [{{"tempo": "m:ss", "o_que_acontece": "fala e imagem naquele instante", "por_que_saem": "...",
              "correcao": "o que fazer no PRÓXIMO vídeo para não perder gente nesse tipo de trecho"}}],
  "o_que_segurou": ["trechos em que a curva ficou estável ou subiu e por quê"],
  "regras_para_os_proximos_videos": ["3 a 6 regras práticas de roteiro/edição tiradas DESTE vídeo"]
}}"""


def retencao(yt: YouTube, a) -> None:
    v = yt.videos([a.video], part="snippet,contentDetails,statistics")
    if not v:
        sys.exit(f"Vídeo {a.video} não encontrado")
    v = v[0]
    dur = segundos(v["contentDetails"]["duration"])
    ini = v["snippet"]["publishedAt"][:10]
    rows = yt.relatorio(ini, date.today().isoformat(), "audienceWatchRatio,relativeRetentionPerformance",
                        dimensions="elapsedVideoTimeRatio", filters=f"video=={a.video}")
    if not rows:
        sys.exit("O YouTube ainda não tem a curva de retenção deste vídeo (poucas views ou menos de ~2 dias). "
                 "Tente de novo depois.")
    pts = [(r["elapsedVideoTimeRatio"] * dur, r["audienceWatchRatio"], r.get("relativeRetentionPerformance"))
           for r in rows]

    def em(seg: float) -> float:
        return min(pts, key=lambda p: abs(p[0] - seg))[1]

    marcos = {"3s": em(3), "10s": em(10), "30s": em(30), "50%": em(dur * 0.5), "90%": em(dur * 0.9)}
    # quedas em JANELAS de alguns segundos (pontos vizinhos viram um trecho só), sem sobreposição
    jan = max(5.0, dur * 0.04)
    janelas = []
    for i, (t0, w0, _) in enumerate(pts):
        j = next((k for k in range(i + 1, len(pts)) if pts[k][0] - t0 >= jan), None)
        if j is None:
            break
        janelas.append((t0, pts[j][0], w0 - pts[j][1], w0, pts[j][1]))
    principais = []
    for q in sorted(janelas, key=lambda q: -q[2]):
        if q[2] <= 0 or len(principais) >= a.quedas:
            break
        if all(q[1] <= p[0] or q[0] >= p[1] for p in principais):
            principais.append(q)
    principais.sort()
    subidas = sorted([(pts[i][0], pts[i][1] - pts[i - 1][1]) for i in range(1, len(pts))
                      if pts[i][1] - pts[i - 1][1] > 0.01], key=lambda s: -s[1])[:3]
    rel = [p[2] for p in pts if p[2] is not None]
    dados = {
        "video": a.video, "titulo": v["snippet"]["title"], "duracao_s": dur,
        "views": v.get("statistics", {}).get("viewCount"),
        "retencao_em": {k: round(x, 3) for k, x in marcos.items()},
        "desempenho_relativo_medio": round(statistics.mean(rel), 2) if rel else None,
        "maiores_quedas": [{"tempo": f"{mmss(t0)}–{mmss(t1)}", "inicio_s": round(t0, 1), "fim_s": round(t1, 1),
                            "perdeu_pts": round(100 * d, 1), "de": round(100 * w0, 1), "para": round(100 * w1, 1)}
                           for t0, t1, d, w0, w1 in principais],
        "releituras_ou_subidas": [{"tempo": mmss(t), "subiu_pts": round(100 * d, 1)} for t, d in subidas],
        "curva": [{"segundo": round(t, 1), "retencao": round(w, 3), "relativo": r} for t, w, r in pts],
    }
    print(f"{v['snippet']['title']} ({mmss(dur)}, {dados['views']} views)")
    print("Retenção: " + ", ".join(f"{k} {100 * x:.0f}%" for k, x in marcos.items())
          + (f"  | vs. vídeos parecidos: {dados['desempenho_relativo_medio']} (0,5 = na média)" if rel else ""))
    print("Curva: " + " ".join(f"{mmss(t)}:{100 * w:.0f}%" for t, w, _ in pts[::max(1, len(pts) // 10)]))
    print("Maiores quedas: " + "; ".join(f"{q['tempo']} (−{q['perdeu_pts']} pts)" for q in dados["maiores_quedas"]))

    if a.explicar:
        g = gemini()
        modelo = g.pick("texto", a.modelo)
        txt_quedas = "\n".join(f"- {q['tempo']}: caiu de {q['de']}% para {q['para']}%" for q in dados["maiores_quedas"])
        txt_marcos = ", ".join(f"{k}: {100 * x:.0f}%" for k, x in marcos.items())
        parte = ({"fileData": {"fileUri": f"https://www.youtube.com/watch?v={a.video}", "mimeType": "video/*"}}
                 if not a.arquivo else None)
        if a.arquivo:
            from gemini import Gemini
            parte = Gemini.inline(a.arquivo)
        log(f"[retencao] {modelo} assistindo ao vídeo para explicar as quedas...")
        try:
            dados["diagnostico"] = g.text(PROMPT_RETENCAO.format(quedas=txt_quedas, marcos=txt_marcos), modelo,
                                          parts=[parte], json_out=True)
        except Exception as e:  # noqa: BLE001
            log(f"[aviso] a Gemini não conseguiu assistir ({str(e)[:300]}). Vídeo privado? Use --arquivo.")
        diag = dados.get("diagnostico", {})
        for q in diag.get("quedas", []):
            print(f"  {q.get('tempo')}: {q.get('o_que_acontece', '')[:90]} → {q.get('correcao', '')[:110]}")
        for r in diag.get("regras_para_os_proximos_videos", []):
            print(f"  REGRA: {r}")
    out = pasta_saida(a.saida) / f"retencao_{a.video}.json"
    out.write_text(json.dumps(dados, ensure_ascii=False, indent=2))
    print(f"Dados completos: {out}")


# ------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("acao", choices=["nicho", "concorrente", "analisar-video", "retencao"])
    ap.add_argument("--saida", default="canal/estrategia")
    # nicho
    ap.add_argument("--termo", action="append", default=[], help="termo de busca (pode repetir)")
    ap.add_argument("--dias", type=int, default=180, help="só vídeos publicados nos últimos N dias")
    ap.add_argument("--duracao", default="any", choices=["any", "short", "medium", "long"],
                    help="short < 4 min, medium 4–20 min, long > 20 min")
    ap.add_argument("--ordem", default="viewCount", choices=["viewCount", "relevance", "date", "rating"])
    ap.add_argument("--max", type=int, default=50, help="vídeos por termo (cada 50 = 100 de cota)")
    ap.add_argument("--min-views", type=int, default=1000)
    ap.add_argument("--regiao", default="BR")
    ap.add_argument("--idioma", default="pt", help="pt, en, es... ou 'any' para não filtrar")
    # concorrente
    ap.add_argument("--canal", help="@handle, link do canal ou ID UC...")
    ap.add_argument("--videos", type=int, default=50)
    # vídeo
    ap.add_argument("--url", help="link do YouTube (público)")
    ap.add_argument("--arquivo", help="arquivo de vídeo local (para vídeo privado ou ainda não postado)")
    ap.add_argument("--contexto", help="descrição do SEU canal, para adaptar as ideias (padrão: lê do YouTube)")
    ap.add_argument("--pergunta", help="pergunta livre sobre o vídeo (responde em texto)")
    ap.add_argument("--baixa-resolucao", action="store_true", help="para vídeos longos (> ~20 min)")
    ap.add_argument("--modelo", default="auto")
    # retenção
    ap.add_argument("--video", help="ID de um vídeo do seu canal")
    ap.add_argument("--quedas", type=int, default=5)
    ap.add_argument("--explicar", action="store_true", help="a Gemini assiste e explica cada queda")
    a = ap.parse_args()
    try:
        if a.acao == "nicho":
            if not a.termo:
                sys.exit("Informe pelo menos um --termo")
            nicho(YouTube(), a)
        elif a.acao == "concorrente":
            if not a.canal:
                sys.exit("Informe --canal")
            concorrente(YouTube(), a)
        elif a.acao == "analisar-video":
            if not (a.url or a.arquivo):
                sys.exit("Informe --url ou --arquivo")
            analisar_video(a)
        elif a.acao == "retencao":
            if not a.video:
                sys.exit("Informe --video")
            retencao(YouTube(), a)
    except YTError as e:
        sys.exit(f"ERRO do YouTube: {e}")


if __name__ == "__main__":
    main()
