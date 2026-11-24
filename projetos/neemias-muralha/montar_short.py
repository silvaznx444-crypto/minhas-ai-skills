#!/usr/bin/env python3
"""Monta o Short narrado: clipes cortados no tempo da narração, legenda palavra por palavra
(branca, palavra atual em amarelo), etiquetas, flashes P&B, música com ducking e som ambiente do Veo.

Uso: python3 montar_short.py [--previa]   (rode dentro de projetos/neemias-muralha)
--previa: usa os quadros (imagens) com zoom lento no lugar dos clipes que ainda não existem.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

P = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
FONT_B = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT_BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
if not Path(FONT_BLACK).exists():
    FONT_BLACK = FONT_B
NARRACAO = P / "audio" / "narr_Charon.wav"
FLASH_PB = [(10.0, 10.9), (42.7, 43.7)]   # piada visual: raposa derruba / inimigos sem graça
REWIND = (21.62, 22.1)                      # "Mas a jogada mais esperta…"


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                 str(p)], capture_output=True, text=True, check=True).stdout)


# ------------------------------------------------------------------ etiquetas
def hexrgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def etiqueta_png(e: dict, out: Path) -> None:
    tipo = e["tipo"]
    if tipo == "calendario":
        img = Image.new("RGBA", (300, 330), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((10, 20, 290, 320), 34, fill=(255, 255, 255, 255), outline=(20, 20, 30, 255), width=8)
        d.rounded_rectangle((10, 20, 290, 110), 34, fill=(230, 40, 40, 255))
        d.rectangle((10, 80, 290, 110), fill=(230, 40, 40, 255))
        d.line((10, 110, 290, 110), fill=(20, 20, 30, 255), width=6)
        for x in (90, 210):
            d.rounded_rectangle((x - 10, 0, x + 10, 50), 8, fill=(40, 40, 50, 255))
        f1 = ImageFont.truetype(FONT_BLACK, 58)
        d.text((150, 66), "DIA", font=f1, fill="white", anchor="mm")
        f2 = ImageFont.truetype(FONT_BLACK, 150)
        d.text((150, 218), e["texto"].split()[-1], font=f2, fill=(25, 25, 35, 255), anchor="mm")
    elif tipo == "selo":
        f = ImageFont.truetype(FONT_BLACK, 64)
        tw = int(f.getlength(e["texto"]))
        img = Image.new("RGBA", (tw + 120, 140), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((8, 14, tw + 112, 130), 26, fill=(0, 0, 0, 110))
        d.rounded_rectangle((4, 4, tw + 108, 120), 26, fill=(232, 30, 45, 255), outline="white", width=6)
        d.text(((tw + 112) // 2, 62), e["texto"], font=f, fill="white", anchor="mm")
    elif tipo == "sub":
        f = ImageFont.truetype(FONT_B, 40)
        tw = int(f.getlength(e["texto"]))
        img = Image.new("RGBA", (tw + 60, 74), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, tw + 60, 74), 37, fill=(10, 18, 40, 210))
        d.text(((tw + 60) // 2, 37), e["texto"], font=f, fill="white", anchor="mm")
    else:  # pill branca com bolinha colorida, como na referência
        f = ImageFont.truetype(FONT_BLACK, 50)
        tw = int(f.getlength(e["texto"]))
        wd = tw + 140
        img = Image.new("RGBA", (wd, 110), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((6, 12, wd - 2, 108), 48, fill=(0, 0, 0, 90))
        d.rounded_rectangle((2, 2, wd - 6, 98), 48, fill="white", outline=(20, 20, 30, 255), width=5)
        d.ellipse((34, 34, 68, 68), fill=hexrgb(e.get("cor", "#FF3B3B")), outline=(20, 20, 30, 255), width=3)
        d.text((92, 50), e["texto"], font=f, fill=(20, 20, 30, 255), anchor="lm")
    img.save(out)


# ------------------------------------------------------------------- legendas
def ts(s: float) -> str:
    s = max(s, 0)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def legendas(out: Path) -> None:
    words = json.loads((P / "audio" / "palavras.json").read_text())["words"]
    # blocos de até 3 palavras, quebrando em pontuação
    blocos, atual = [], []
    for w in words:
        atual.append(w)
        if len(atual) >= 3 or w["w"][-1] in ".,!?:…\"":
            blocos.append(atual)
            atual = []
    if atual:
        blocos.append(atual)
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: L,Inter ExtraBold,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,4,2,70,70,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linhas = []
    for bi, b in enumerate(blocos):
        fim_bloco = b[-1]["e"]
        prox = blocos[bi + 1][0]["s"] if bi + 1 < len(blocos) else fim_bloco + 0.6
        fim_bloco = min(max(fim_bloco, prox if prox - fim_bloco < 0.6 else fim_bloco + 0.25), prox)
        for i, w in enumerate(b):
            t0 = w["s"]
            t1 = b[i + 1]["s"] if i + 1 < len(b) else fim_bloco
            partes = []
            for j, x in enumerate(b):
                txt = x["w"].strip('"').upper()
                if j == i:
                    partes.append(r"{\c&H0AD6FF&\fscx112\fscy112}" + txt + r"{\c&HFFFFFF&\fscx100\fscy100}")
                else:
                    partes.append(txt)
            linhas.append(f"Dialogue: 0,{ts(t0)},{ts(t1)},L,,0,0,0,,{' '.join(partes)}")
    out.write_text(cab + "\n".join(linhas) + "\n", encoding="utf-8")


# --------------------------------------------------------------------- vídeo
def main() -> None:
    previa = "--previa" in sys.argv
    sb = json.loads((P / "storyboard.json").read_text())
    cenas = sb["cenas"]
    if "--ate" in sys.argv:  # prévia parcial: só até a cena N
        cenas = cenas[:int(sys.argv[sys.argv.index("--ate") + 1])]
    total = cenas[-1]["fim"]
    tmp = P / "build"
    tmp.mkdir(exist_ok=True)

    # 1) cada cena vira um pedaço de exatamente (fim - inicio) segundos
    pedacos = []
    for c in cenas:
        n, d = c["n"], c["fim"] - c["inicio"]
        clip = P / "clipes" / f"cena_{n:02d}.mp4"
        out = tmp / f"p_{n:02d}.mp4"
        base = (f"scale={W}:{H}:flags=lanczos:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"fps={FPS},setsar=1,format=yuv420p")
        if clip.exists():
            ini = c.get("cortar_inicio", 0.0)
            cd = dur(clip) - ini
            vel = "" if cd >= d else f"setpts={cd / d:.4f}*PTS,"   # estica um pouco se faltar
            vf = f"trim=start={ini},setpts=PTS-STARTPTS,{vel}{base},trim=duration={d:.3f}"
            af = (f"atrim=start={ini},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
                  f"apad,atrim=duration={d:.3f}")
            cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(clip), "-vf", vf]
            cmd += ["-af", af] if tem_audio(clip) else ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                                                       "-map", "0:v", "-map", "1:a", "-t", f"{d:.3f}"]
        elif previa:
            q = P / "quadros" / f"cena_{n:02d}.png"
            fr = int(d * FPS) + 1
            vf = (f"scale=2160:3840,zoompan=z='1+0.08*on/{fr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                  f":d={fr}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p")
            cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", str(q), "-f", "lavfi", "-i",
                   "anullsrc=r=48000:cl=stereo", "-vf", vf, "-t", f"{d:.3f}"]
        else:
            sys.exit(f"Falta {clip} (use --previa para montar com os quadros)")
        cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "14", "-c:a", "pcm_s16le", "-ar", "48000",
                "-ac", "2", str(out).replace(".mp4", ".mkv")]
        subprocess.run(cmd, check=True)
        pedacos.append(Path(str(out).replace(".mp4", ".mkv")))

    lista = tmp / "lista.txt"
    lista.write_text("".join(f"file '{p}'\n" for p in pedacos))
    base = tmp / "base.mkv"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy",
                    str(base)], check=True)

    # 2) etiquetas + legendas + efeitos
    etqs = [e for e in json.loads((P / "etiquetas.json").read_text()) if e["t0"] < total]
    inputs, fil = ["-i", str(base)], []
    for i, e in enumerate(etqs):
        png = tmp / f"etq_{i:02d}.png"
        etiqueta_png(e, png)
        inputs += ["-loop", "1", "-t", f"{total + 1:.2f}", "-i", str(png)]
    legendas(tmp / "legendas.ass")

    pb = "+".join(f"between(t,{a},{b})" for a, b in FLASH_PB)
    ra, rb = REWIND
    fil.append(f"[0:v]hue=s='if({pb},0,1)',"
               f"eq=contrast=1.06:saturation=1.08,"
               f"rgbashift=rh='if(between(t,{ra},{rb}),-14,0)':bh='if(between(t,{ra},{rb}),14,0)'[v0]")
    cur = "v0"
    for i, e in enumerate(etqs):
        k = i + 1
        t0, t1 = e["t0"], e["t1"]
        fil.append(f"[{k}:v]format=rgba,fade=in:st={t0}:d=0.15:alpha=1,fade=out:st={t1 - 0.15}:d=0.15:alpha=1[e{k}]")
        # entra deslizando de cima (0,15 s)
        y = f"{e['y']}-40*max(0\\,1-(t-{t0})/0.15)"
        fil.append(f"[{cur}][e{k}]overlay=x=(W-w)/2:y='{y}':enable='between(t,{t0},{t1})'[o{k}]")
        cur = f"o{k}"
    fil.append(f"[{cur}]ass={tmp / 'legendas.ass'}:fontsdir=/usr/share/fonts,unsharp=5:5:0.35[vout]")

    # 3) áudio: narração + música (a→b com crossfade, ducking) + ambiente do Veo baixo
    na = len(etqs) + 1
    inputs += ["-i", str(NARRACAO), "-i", str(P / "audio" / "musica_a.wav"), "-i", str(P / "audio" / "musica_b.wav")]
    fil.append(f"[{na}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,"
               f"acompressor=threshold=0.1:ratio=3:attack=5:release=80,volume=1.0,apad[voz]")
    fil.append(f"[{na + 1}:a][{na + 2}:a]acrossfade=d=2.5:c1=tri:c2=tri,aresample=48000,"
               f"aformat=channel_layouts=stereo,volume=0.30,afade=t=out:st={total - 1.2}:d=1.2[mus]")
    fil.append("[voz]asplit=2[voz1][sc]")
    fil.append("[mus][sc]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350[duck]")
    fil.append("[0:a]volume=0.22[amb]")
    fil.append(f"[voz1][duck][amb]amix=inputs=3:duration=longest:normalize=0,atrim=duration={total:.2f},"
               f"loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")

    out = P / ("previa.mp4" if previa else "final.mp4")
    cmd = ["ffmpeg", "-y", "-v", "error", "-stats", *inputs, "-filter_complex", ";".join(fil),
           "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.2f}",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    print("pronto:", out)


def tem_audio(p: Path) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return bool(r.stdout.strip())


if __name__ == "__main__":
    main()
