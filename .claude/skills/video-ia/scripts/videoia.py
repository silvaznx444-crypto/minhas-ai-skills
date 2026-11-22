#!/usr/bin/env python3
"""Pipeline automático de vídeos curtos com IA (Gemini + Veo + ffmpeg).

Etapas (cada uma pula o que já existe, então dá para retomar de onde parou):
  planejar    ideia -> projetos/<nome>/storyboard.json
  referencias storyboard -> refs/ (folha de cada personagem e cada cenário)
  quadros     refs -> quadros/cena_XX.png (primeiro quadro de cada cena)
  clipes      quadros -> clipes/cena_XX.mp4 (Veo, com fala e som)
  legendas    clipes -> legendas.ass (tempo de cada fala, cor por personagem)
  montar      tudo -> final.mp4 (1080x1920, legendas, música, loudness p/ redes)
  tudo        todas as etapas em sequência

Exemplo:
  python3 videoia.py tudo --projeto projetos/rocha --ideia "Policial durão recebe ameaça pelo rádio" --cenas 3 --sim
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gemini import Gemini, GeminiError  # noqa: E402
import legendas as leg  # noqa: E402
import vertex  # noqa: E402

ESTILO_PADRAO = (
    "Stylized 3D cartoon animation, cel-shaded with thick black outlines, flat vibrant colors, "
    "slightly exaggerated proportions, expressive faces, clean lighting, high detail, cinematic"
)
NEGATIVO = ("subtitles, captions, on-screen text, watermark, logo, blurry, low quality, "
            "distorted face, extra fingers, deformed hands, flicker")
PRECO_SEG = {"fast": 0.15, "std": 0.40}  # US$/s (referência; confira a tabela atual do Google)
CORES = ["#FFFFFF", "#FF3B3B", "#FFD60A", "#3BD1FF", "#7CFF6B"]


def log(m: str) -> None:
    print(m, flush=True)


def carregar(proj: Path) -> dict:
    f = proj / "storyboard.json"
    if not f.exists():
        sys.exit(f"Não achei {f}. Rode 'planejar' antes ou escreva o storyboard à mão.")
    sb = json.loads(f.read_text())
    preset = sb.get("estilo_preset")
    if preset and (ESTILOS / preset / "estilo.txt").exists() and not sb.get("estilo_personalizado"):
        sb["estilo"] = (ESTILOS / preset / "estilo.txt").read_text().strip()
    return sb


def personagem(sb: dict, pid: str) -> dict:
    for p in sb["personagens"]:
        if p["id"] == pid:
            return p
    return {"id": pid, "nome": pid, "descricao": "", "voz": ""}


def cenario(sb: dict, cid: str) -> dict:
    for c in sb["cenarios"]:
        if c["id"] == cid:
            return c
    return {"id": cid, "descricao": cid}


ESTILOS = Path(__file__).resolve().parent.parent / "estilos"


def estilo_refs(sb: dict, proj: Path) -> list[Path]:
    """Imagens de referência de ESTILO: do preset (estilos/<nome>/ref_*.png) e/ou 'estilo_refs' do storyboard."""
    out: list[Path] = []
    if sb.get("estilo_preset"):
        out += sorted((ESTILOS / sb["estilo_preset"]).glob("ref_*.*"))
    for r in sb.get("estilo_refs", []):
        p = Path(r)
        p = p if p.is_absolute() else (proj / p if (proj / p).exists() else Path.cwd() / p)
        if p.exists():
            out.append(p)
    return out


def com_estilo(prompt: str, n_estilo: int, n_outros: int) -> str:
    if not n_estilo:
        return prompt
    txt = (f"The first {n_estilo} image(s) are ART STYLE references only: match their exact look "
           "(3D render style, shading, outlines, character proportions, eye design, colors, lighting and "
           "wide-angle camera lens). Do NOT copy their characters, text or layout. ")
    if n_outros:
        txt += f"The next {n_outros} image(s) are character/setting references for this shot. "
    return txt + prompt


def aplicar_preset(sb: dict, preset: str | None) -> None:
    if not preset:
        return
    d = ESTILOS / preset
    if not d.is_dir():
        sys.exit(f"Estilo '{preset}' não existe. Disponíveis: {[x.name for x in ESTILOS.iterdir() if x.is_dir()]}")
    sb["estilo_preset"] = preset
    if (d / "estilo.txt").exists():
        sb["estilo"] = (d / "estilo.txt").read_text().strip()


# ------------------------------------------------------------------ planejar
PROMPT_PLANO = """Você é roteirista de vídeos curtos virais (Reels/TikTok/Shorts), vertical 9:16.
Escreva um storyboard em JSON para a ideia abaixo.

IDEIA: {ideia}
NÚMERO DE CENAS: {cenas} (cada cena vira um clipe de 8 segundos)
ESTILO VISUAL: {estilo}

Regras:
- Cada cena tem no máximo ~18 palavras de fala no total (cabe em 8s), no máximo 2 falas.
- Diálogos em português do Brasil, naturais, curtos e com impacto; gancho forte na cena 1.
- Descrições visuais (descricao, camera, acao, audio) em INGLÊS, bem concretas e consistentes:
  roupas, cores, cabelo, tom de pele, idade, nome bordado no colete etc. Repita os mesmos detalhes.
- "voz" em inglês descreve timbre/idade/sotaque (ex: "deep raspy male voice, Brazilian Portuguese accent, calm and menacing").
- Fala ouvida por rádio/telefone: use "via_radio": true e o personagem que fala do outro lado.
- Não coloque texto/legenda na imagem.

Formato exato:
{{
  "titulo": "...",
  "estilo": "{estilo}",
  "personagens": [{{"id": "rocha", "nome": "Rocha", "descricao": "...", "voz": "..."}}],
  "cenarios": [{{"id": "delegacia", "descricao": "..."}}],
  "cenas": [{{
    "cenario": "delegacia",
    "personagens": ["rocha"],
    "camera": "first-person POV, holding a walkie-talkie in the right hand, ...",
    "acao": "...",
    "audio": "ambient sounds ...",
    "falas": [{{"personagem": "rocha", "texto": "...", "via_radio": false}}]
  }}]
}}"""


def planejar(g: Gemini, a) -> None:
    f = a.projeto / "storyboard.json"
    if f.exists() and not a.refazer:
        log(f"storyboard já existe: {f}")
        return
    if not a.ideia:
        sys.exit("Informe --ideia \"...\"")
    modelo = g.pick("texto", a.modelo_texto)
    log(f"[planejar] escrevendo roteiro com {modelo}...")
    sb = g.text(PROMPT_PLANO.format(ideia=a.ideia, cenas=a.cenas, estilo=a.estilo), modelo, json_out=True)
    sb.setdefault("estilo", a.estilo)
    aplicar_preset(sb, a.preset)
    for i, p in enumerate(sb["personagens"]):
        p.setdefault("cor_legenda", CORES[i % len(CORES)])
    a.projeto.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(sb, ensure_ascii=False, indent=2))
    log(f"[planejar] ok -> {f}")


# --------------------------------------------------------------- referências
def referencias(g: Gemini, a) -> None:
    sb = carregar(a.projeto)
    modelo = g.pick("image", a.modelo_imagem)
    refs = a.projeto / "refs"
    est = estilo_refs(sb, a.projeto)
    for p in sb["personagens"]:
        out = refs / f"personagem_{p['id']}.png"
        if out.exists() and not a.refazer:
            continue
        log(f"[referencias] personagem {p['nome']} ({modelo})")
        g.image(com_estilo(
            f"Character reference sheet. Single character, full body, front view, neutral standing pose, "
            f"plain light gray studio background, no text. Character: {p['descricao']}. Style: {sb['estilo']}.",
            len(est), 0), out, modelo, refs=est, aspect="3:4")
    for c in sb["cenarios"]:
        out = refs / f"cenario_{c['id']}.png"
        if out.exists() and not a.refazer:
            continue
        log(f"[referencias] cenário {c['id']}")
        g.image(com_estilo(f"Empty environment establishing shot, no people, vertical 9:16. {c['descricao']}. "
                           f"Style: {sb['estilo']}.", len(est), 0), out, modelo, refs=est, aspect="9:16")


# -------------------------------------------------------------------- quadros
def quadros(g: Gemini, a) -> None:
    sb = carregar(a.projeto)
    modelo = g.pick("image", a.modelo_imagem)
    est = estilo_refs(sb, a.projeto)
    for i, cena in enumerate(sb["cenas"], 1):
        if a.cena and i != a.cena:
            continue
        out = a.projeto / "quadros" / f"cena_{i:02d}.png"
        if out.exists() and not a.refazer:
            continue
        refs = [a.projeto / "refs" / f"cenario_{cena['cenario']}.png"]
        refs += [a.projeto / "refs" / f"personagem_{pid}.png" for pid in cena.get("personagens", [])]
        refs = [r for r in refs if r.exists()]
        chars = "; ".join(f"{personagem(sb, pid)['nome']}: {personagem(sb, pid)['descricao']}"
                          for pid in cena.get("personagens", []))
        log(f"[quadros] cena {i}")
        g.image(com_estilo(
            "Create the FIRST FRAME of a vertical 9:16 video shot. Keep the characters and the place "
            "exactly like the reference images (same face, clothes, colors, props). "
            f"Setting: {cenario(sb, cena['cenario'])['descricao']}. Characters: {chars}. "
            f"Camera: {cena.get('camera', '')}. Moment: start of this action: {cena.get('acao', '')}. "
            f"Style: {sb['estilo']}. No text, no captions, no watermark.",
            len(est), len(refs)), out, modelo, refs=est + refs, aspect="9:16")


# --------------------------------------------------------------------- clipes
def prompt_veo(sb: dict, cena: dict) -> str:
    linhas = [f"{sb['estilo'].rstrip('. ')}. Vertical 9:16 video.",
              f"Setting: {cenario(sb, cena['cenario'])['descricao']}."]
    for pid in cena.get("personagens", []):
        p = personagem(sb, pid)
        linhas.append(f"Character {p['nome']}: {p['descricao']}.")
    linhas += [f"Camera: {cena.get('camera', '')}.", f"Action: {cena.get('acao', '')}."]
    if cena.get("falas"):
        linhas.append("Dialogue, spoken in Brazilian Portuguese with accurate lip-sync, in this order:")
        for f in cena["falas"]:
            p = personagem(sb, f["personagem"])
            if f.get("via_radio"):
                linhas.append(f'- A voice coming through the walkie-talkie radio, crackly distorted radio sound '
                              f'({p.get("voz", "")}), says: "{f["texto"]}"')
            else:
                linhas.append(f'- {p["nome"]} ({p.get("voz", "")}) says: "{f["texto"]}"')
    linhas.append(f"Audio: {cena.get('audio', 'natural ambient sound')}. No background music.")
    linhas.append("No subtitles, no captions, no on-screen text, no watermark.")
    return "\n".join(linhas)


def clipes(g: Gemini, a) -> None:
    sb = carregar(a.projeto)
    modelo = g.pick("veo", a.modelo_video, rapido=a.rapido)
    pend = [i for i, _ in enumerate(sb["cenas"], 1)
            if (not a.cena or i == a.cena)
            and (a.refazer or not (a.projeto / "clipes" / f"cena_{i:02d}.mp4").exists())]
    if not pend:
        log("[clipes] nada a gerar")
        return
    custo = len(pend) * 8 * PRECO_SEG["fast" if "fast" in modelo else "std"]
    log(f"[clipes] {len(pend)} clipe(s) com {modelo} — custo estimado ~US$ {custo:.2f}")
    if not a.sim:
        if not sys.stdin.isatty() or input("Gerar? [s/N] ").strip().lower() not in ("s", "sim", "y"):
            sys.exit("Cancelado. Use --sim para confirmar automaticamente.")
    for i in pend:
        cena = sb["cenas"][i - 1]
        out = a.projeto / "clipes" / f"cena_{i:02d}.mp4"
        quadro = a.projeto / "quadros" / f"cena_{i:02d}.png"
        prompt = prompt_veo(sb, cena)
        (a.projeto / "prompts").mkdir(exist_ok=True)
        (a.projeto / "prompts" / f"cena_{i:02d}.txt").write_text(prompt)
        log(f"[clipes] cena {i} -> {out.name}")
        g.veo(prompt, out, modelo, image=quadro if quadro.exists() and not a.sem_quadro else None,
              resolution=a.resolucao or None, negative=NEGATIVO)


# ------------------------------------------------------------------- legendas
def legendas(g: Gemini, a) -> None:
    sb = carregar(a.projeto)
    modelo = None if a.sem_alinhamento else g.pick("texto", a.modelo_texto)
    eventos, offset = [], 0.0
    for i, cena in enumerate(sb["cenas"], 1):
        clip = a.projeto / "clipes" / f"cena_{i:02d}.mp4"
        if not clip.exists():
            sys.exit(f"Falta {clip}")
        ini, fim = cena.get("cortar_inicio", 0.0), leg.duracao(clip) - cena.get("cortar_fim", 0.0)
        falas = cena.get("falas", [])
        tempos = None
        if falas and not a.sem_alinhamento:
            try:
                tempos = leg.alinhar(g, modelo, clip, falas)
            except (GeminiError, ValueError, KeyError) as e:
                log(f"[legendas] cena {i}: alinhamento automático falhou ({e}); distribuindo por tamanho")
        if falas and not tempos:
            tempos = leg.distribuir(falas, ini + 0.3, fim - 0.3)
        for f, (t0, t1) in zip(falas, tempos or []):
            t0, t1 = max(t0, ini), min(t1, fim)
            if t1 <= t0:
                continue
            cor = personagem(sb, f["personagem"]).get("cor_legenda", "#FFFFFF")
            eventos.append((offset + t0 - ini, offset + t1 - ini, f["texto"], cor))
        offset += fim - ini
    leg.escrever_ass(eventos, a.projeto / "legendas.ass", palavras=a.palavras)
    log(f"[legendas] {len(eventos)} fala(s) -> legendas.ass")


# --------------------------------------------------------------------- montar
def tem_audio(p: Path) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                        "stream=index", "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return bool(r.stdout.strip())


def montar(a) -> None:
    sb = carregar(a.projeto)
    proj = a.projeto.resolve()
    clips = [proj / "clipes" / f"cena_{i:02d}.mp4" for i in range(1, len(sb["cenas"]) + 1)]
    for c in clips:
        if not c.exists():
            sys.exit(f"Falta {c}")
    W, H, FPS = 1080, 1920, a.fps
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stats"]
    for c in clips:
        cmd += ["-i", str(c)]
    n = len(clips)
    if a.musica:
        cmd += ["-stream_loop", "-1", "-i", str(Path(a.musica).resolve())]
    fil, cat = [], ""
    for i, (c, cena) in enumerate(zip(clips, sb["cenas"])):
        ini = cena.get("cortar_inicio", 0.0)
        fim = leg.duracao(c) - cena.get("cortar_fim", 0.0)
        fil.append(f"[{i}:v]trim={ini}:{fim},setpts=PTS-STARTPTS,"
                   f"scale={W}:{H}:flags=lanczos:force_original_aspect_ratio=increase,crop={W}:{H},"
                   f"fps={FPS},setsar=1,format=yuv420p[v{i}]")
        if tem_audio(c):
            fil.append(f"[{i}:a]atrim={ini}:{fim},asetpts=PTS-STARTPTS,aresample=48000,"
                       f"aformat=channel_layouts=stereo[a{i}]")
        else:
            fil.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{fim - ini}[a{i}]")
        cat += f"[v{i}][a{i}]"
    fil.append(f"{cat}concat=n={n}:v=1:a=1[vc][ac]")
    ass = proj / "legendas.ass"
    if ass.exists() and not a.sem_legenda:
        fil.append(f"[vc]ass=legendas.ass:fontsdir={leg.FONTSDIR},unsharp=5:5:0.4[vout]")
    else:
        fil.append("[vc]unsharp=5:5:0.4[vout]")
    if a.musica:
        fil.append("[ac]asplit=2[voz][sc]")
        fil.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,volume={a.volume_musica}[mus]")
        fil.append("[mus][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck]")
        fil.append("[voz][duck]amix=inputs=2:duration=first:normalize=0[mix]")
        src = "[mix]"
    else:
        src = "[ac]"
    fil.append(f"{src}loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")
    out = proj / a.saida
    cmd += ["-filter_complex", ";".join(fil), "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
            "-maxrate", "20M", "-bufsize", "40M", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-shortest", str(out)]
    log(f"[montar] renderizando {out.name} ({W}x{H} @ {FPS}fps)...")
    subprocess.run(cmd, check=True, cwd=proj)
    log(f"[montar] pronto: {out}")


# ----------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("etapa", choices=["modelos", "planejar", "referencias", "quadros", "clipes",
                                      "legendas", "montar", "tudo"])
    ap.add_argument("--projeto", type=Path, default=Path("projetos/novo"))
    ap.add_argument("--ideia")
    ap.add_argument("--cenas", type=int, default=3)
    ap.add_argument("--estilo", default=ESTILO_PADRAO)
    ap.add_argument("--preset", help="estilo pronto da pasta estilos/ (ex: policial-pov)")
    ap.add_argument("--cena", type=int, help="só esta cena (1, 2, ...)")
    ap.add_argument("--refazer", action="store_true", help="regera mesmo se o arquivo já existe")
    ap.add_argument("--sim", action="store_true", help="confirma o custo do Veo sem perguntar")
    ap.add_argument("--rapido", action="store_true", help="usa o Veo 'fast' (mais barato, menos qualidade)")
    ap.add_argument("--resolucao", default="1080p", help="1080p, 720p, 4k ou '' para o padrão do modelo")
    ap.add_argument("--sem-quadro", action="store_true", help="Veo só por texto, sem o primeiro quadro")
    ap.add_argument("--sem-alinhamento", action="store_true", help="não usa IA para cronometrar as legendas")
    ap.add_argument("--sem-legenda", action="store_true")
    ap.add_argument("--palavras", type=int, default=3, help="palavras por bloco de legenda")
    ap.add_argument("--musica", help="arquivo de música de fundo (abaixa sozinha quando alguém fala)")
    ap.add_argument("--volume-musica", type=float, default=0.25)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--saida", default="final.mp4")
    ap.add_argument("--modelo-texto", default="auto")
    ap.add_argument("--modelo-imagem", default="auto")
    ap.add_argument("--modelo-video", default="auto")
    ap.add_argument("--provedor", choices=["auto", "vertex", "gemini"], default="auto",
                    help="vertex = Google Cloud (créditos grátis); gemini = chave do AI Studio")
    a = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg não encontrado")
    try:
        usar_vertex = a.provedor == "vertex" or (a.provedor == "auto" and vertex.configurado())
        g = vertex.Vertex() if usar_vertex else Gemini()
        log(f"[provedor] {'Vertex AI (projeto ' + g.projeto + ')' if usar_vertex else 'Gemini API'}")
        if a.etapa == "modelos":
            for k in ("texto", "image", "veo"):
                log(f"{k:7s} -> {g.pick(k)}")
            log(f"veo fast -> {g.pick('veo', rapido=True)}")
            return
        etapas = {"planejar": [planejar], "referencias": [referencias], "quadros": [quadros],
                  "clipes": [clipes], "legendas": [legendas], "montar": [lambda _g, x: montar(x)],
                  "tudo": [planejar, referencias, quadros, clipes, legendas, lambda _g, x: montar(x)]}
        for fn in etapas[a.etapa]:
            fn(g, a)
    except GeminiError as e:
        sys.exit(f"\nERRO da Gemini API:\n{e}")


if __name__ == "__main__":
    main()
