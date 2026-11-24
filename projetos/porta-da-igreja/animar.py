#!/usr/bin/env python3
"""Anima o episódio: arte vetorial + câmera na mão + boca no ritmo da voz + olho de peixe + interface.

uso: python3 animar.py [--previa SEG ...]   (sem args gera final.mp4)
"""
import json
import math
import re
import subprocess
import sys
import wave
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import arte
import sons

AQUI = Path(__file__).resolve().parent
FPS, OW, OH = 30, 1080, 1920
K0 = OW / arte.W                      # escala desenho -> saída com zoom 1
FONTE = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONTE_BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FONTE_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
ROT = json.loads((AQUI / "roteiro.json").read_text())


# ============================================================== utilidades de imagem
def u8(a):
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)


def sobre(dst, src):
    """alpha-over: dst RGB float (H,W,3), src RGBA float mesmo tamanho."""
    a = src[..., 3:4]
    dst *= (1 - a)
    dst += src[..., :3] * a
    return dst


def warp(src, M, borda=cv2.BORDER_CONSTANT):
    return cv2.warpAffine(src, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=borda, borderValue=(0, 0, 0, 0))


def camera_M(foco, zoom, rot=0.0, dx=0.0, dy=0.0, escala_fonte=1.0):
    """matriz que leva pixels da camada (desenho * escala_fonte) para a saída."""
    s = K0 * zoom / escala_fonte
    c, si = math.cos(rot) * s, math.sin(rot) * s
    fx, fy = foco[0] * escala_fonte, foco[1] * escala_fonte
    tx = OW / 2 + dx - (c * fx - si * fy)
    ty = OH / 2 + dy - (si * fx + c * fy)
    return np.float32([[c, -si, tx], [si, c, ty]])


def mul(M1, M2):
    """M1 ∘ M2 (afins 2x3)."""
    A = np.vstack([M1, [0, 0, 1]]) @ np.vstack([M2, [0, 0, 1]])
    return A[:2].astype(np.float32)


# olho de peixe (barril): centro ampliado, bordas comprimidas, sem cantos pretos
def _mapa_peixe(k=0.30):
    ys, xs = np.mgrid[0:OH, 0:OW].astype(np.float32)
    cx, cy = OW / 2, OH / 2
    R = math.hypot(cx, cy)
    dx, dy = (xs - cx) / R, (ys - cy) / R
    r2 = dx * dx + dy * dy
    f = (1 + k * r2) / (1 + k)
    return (cx + dx * f * R).astype(np.float32), (cy + dy * f * R).astype(np.float32)


PEIXE = _mapa_peixe()


def peixe(img):
    return cv2.remap(img, PEIXE[0], PEIXE[1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


# ============================================================== tremor de câmera
def tremor(t, forte=False, semente=0):
    a = 2.6 if forte else 1.0
    dx = (7 * math.sin(t * 0.9 + semente) + 4 * math.sin(t * 2.3 + 1.7 * semente)) * a
    dy = (6 * math.sin(t * 1.1 + 2 + semente) + 3 * math.sin(t * 2.9 + semente)) * a
    rot = math.radians(0.35 * math.sin(t * 0.7 + semente) + 0.15 * math.sin(t * 1.9)) * a
    if forte:
        dx += 9 * math.sin(t * 23) * math.sin(t * 3.1)
        dy += 7 * math.sin(t * 19 + 1)
    return dx, dy, rot


def ease(x):
    x = min(max(x, 0), 1)
    return x * x * (3 - 2 * x)


# ============================================================== camadas pré-renderizadas
SC = 2.0   # resolução das camadas de cenário (2x o espaço de desenho)
print("renderizando cenário...", flush=True)
FORA = arte.render(arte.fora(), SC)
CHUVA = arte.render(arte.chuva_tile(), SC)
_vid, _sala, _buraco = arte.frente()
VIDRO = arte.render(_vid, SC)
SALA = arte.render(_sala, SC)
SALA[..., 3] *= 1 - arte.render(_buraco, SC)[..., 3]
MAOS = arte.render(arte.maos("mesa"))


@lru_cache(maxsize=64)
def sprite(pose, boca, cara, olhos, escala):
    return arte.render(arte.estranho(pose, boca, cara, olhos), escala)


POS_EST = {"longe": ((630, 1300), 0.62), "perto": ((650, 1430), 0.95)}


def cena_porta(t, T, p, rosto):
    """quadro do plano 'porta'/'close'/'cartao' (antes do olho de peixe)."""
    tipo = p["tipo"]
    est = p.get("est", "perto")
    if tipo in ("close", "cartao"):
        est = "perto"
    (px, py), es = POS_EST.get(est, POS_EST["perto"])
    # câmera
    if tipo == "close":
        foco, z0, z1 = (650, 930), 2.0, 2.2
    elif tipo == "cartao":
        foco, z0, z1 = (650, 1000), 1.6, 1.7
    elif est == "perto":
        foco, z0, z1 = (630, 960), 1.32, 1.40
    else:
        foco, z0, z1 = (600, 1060), 1.0, 1.05
    if p.get("zoom_out"):
        z0, z1 = 1.25, 1.0
    zoom = z0 + (z1 - z0) * ease(t / max(T, 0.1))
    if tipo == "close" and t < 0.18:          # zoom dramático de entrada
        zoom *= 1 - 0.35 * (1 - t / 0.18) ** 2
    dx, dy, rot = tremor(t + p["_i"] * 3.7, p.get("tremor", False), p["_i"])
    out = np.zeros((OH, OW, 3), np.float32)
    M = camera_M(foco, zoom, rot, dx, dy, SC)
    sobre(out, warp(FORA, M))
    # chuva rolando
    off = (t * 1500 * SC) % CHUVA.shape[0]
    Mc = mul(M, np.float32([[1, 0, -40 * SC * t % CHUVA.shape[1] * 0], [0, 1, 0]]))
    ch = np.roll(CHUVA, int(off), axis=0)
    sobre(out, warp(ch, Mc))
    # personagem
    if est != "fora":
        pose = p.get("pose", "normal")
        if tipo == "cartao":
            pose = "cartao"
        if pose == "bate":
            pose = "bate" if (t % 1.6) < 0.9 else "normal"
        esc_px = round(es * K0 * zoom * 1.15 * 4) / 4      # resolução do sprite próxima da saída
        spr = sprite(pose, *rosto, esc_px)
        resp = 1 + 0.006 * math.sin(t * 2.2)
        bal = 3 * math.sin(t * 1.3 + p["_i"])
        # sprite (pixels) -> desenho
        k = es / esc_px
        x0 = px - arte.CW * es / 2 + bal
        y0 = py - arte.CH * es * resp
        Ms = np.float32([[k, 0, x0], [0, k * resp, y0]])
        Md = camera_M(foco, zoom, rot, dx, dy, 1.0)
        spr_out = warp(spr, mul(Md, Ms))
        sobre(out, spr_out)
    sobre(out, warp(VIDRO, M))
    sobre(out, warp(SALA, M))
    # mãos com balanço próprio
    hy = 6 * math.sin(t * 1.7 + 0.5) + (5 * math.sin(t * 17) if p.get("tremor") else 0)
    hx = 3 * math.sin(t * 1.2)
    if tipo not in ("close", "cartao") or True:
        sobre(out, warp(MAOS, np.float32([[1.06, 0, -32 + hx], [0, 1.06, -40 + hy]])))
    return out


# ============================================================== celular
def svg_celular(n_msgs):
    W, H = OW, OH
    msgs = [
        ("Irmã Neide", "#E58AE0", ["alguém viu um homem de", "capa rondando a igreja?", "tô com medo"]),
        ("Pastor Davi", "#7BE38F", ["Lembrando: depois das 22h", "a porta fica trancada.", "<NINGUÉM ABRE.>"]),
    ]
    bal = ""
    y = 800
    for i, (nome, cor, linhas) in enumerate(msgs[:n_msgs]):
        h = 90 + 58 * len(linhas)
        bal += f'<rect x="246" y="{y}" width="610" height="{h}" rx="30" fill="#2a2f38"/>'
        bal += f'<text x="276" y="{y + 52}" font-family="Inter" font-weight="800" font-size="34" fill="{cor}">{nome}</text>'
        for j, ln in enumerate(linhas):
            m = re.match(r"(.*)<(.*)>", ln)
            if m:
                bal += (f'<text x="282" y="{y + 110 + j * 58}" font-family="Inter" font-weight="600" font-size="38" fill="#f2f2f2">{m.group(1)}'
                        f'<tspan fill="#ff4b4b" font-weight="900">{m.group(2)}</tspan></text>')
            else:
                bal += f'<text x="282" y="{y + 110 + j * 58}" font-family="Inter" font-weight="600" font-size="38" fill="#f2f2f2">{ln}</text>'
        y += h + 30
    corpo = f"""
    <g transform="rotate(-4 540 1100)">
      <rect x="200" y="500" width="700" height="1380" rx="70" fill="#121317" stroke="{arte.OL}" stroke-width="10"/>
      <rect x="226" y="526" width="648" height="1328" rx="50" fill="#16181d"/>
      <rect x="226" y="526" width="648" height="190" rx="50" fill="#1f232b"/>
      <rect x="226" y="660" width="648" height="56" fill="#1f232b"/>
      <rect x="470" y="546" width="160" height="36" rx="18" fill="#000"/>
      <rect x="258" y="610" width="76" height="76" rx="20" fill="#3b5bdb"/>
      <path d="M296,622 l0,52 M278,640 l36,0" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
      <text x="356" y="645" font-family="Inter" font-weight="800" font-size="40" fill="#fff">Igreja Esperança</text>
      <text x="356" y="682" font-family="Inter" font-weight="500" font-size="25" fill="#9aa3b2">Pastor Davi, Irmã Neide, você e mais 63</text>
      {bal}
    </g>
    <!-- mão segurando -->
    <g transform="translate(0,0)">
      <path d="M120,1920 q20,-260 140,-330 q80,-40 150,10 l-40,90 q-60,-10 -90,40 l-20,190 z" fill="#27355f" stroke="{arte.OL}" stroke-width="8"/>
      <path d="M300,1660 q120,-40 210,-30 q50,10 30,50 q-20,30 -90,30 l-120,20 z" fill="{arte.PELE}" stroke="{arte.OL}" stroke-width="8"/>
      <rect x="470" y="1612" width="56" height="40" rx="18" fill="#b88865" stroke="{arte.OL}" stroke-width="4"/>
    </g>"""
    return arte.svg(corpo, W, H)


CEL = [arte.render(svg_celular(n)) for n in range(3)]


def fundo_borrado():
    p = {"tipo": "porta", "est": "longe", "_i": 0}
    f = cena_porta(0.0, 1.0, p, ("fechada", "sorriso", "abertos"))
    f = cv2.GaussianBlur(f, (0, 0), 14) * 0.45
    return f


BORRADO = None


def cena_celular(t, T, p):
    global BORRADO
    if BORRADO is None:
        BORRADO = fundo_borrado()
    out = BORRADO.copy()
    n = 0 + (t >= 1.0) + (t >= 2.6)
    dx, dy, rot = tremor(t, False, 3)
    z = 1.0 + 0.3 * (1 - ease(t / 0.28))
    c = OW / 2, OH * 0.62
    M = cv2.getRotationMatrix2D(c, math.degrees(rot), z)
    M[:, 2] += (dx, dy + 40 * (1 - ease(t / 0.28)))
    sobre(out, warp(CEL[n], M.astype(np.float32)))
    return out


# ============================================================== telefone da recepção (close)
def svg_telefone(no_gancho, luz):
    corpo = f"""
    <defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d4f2a"/><stop offset="1" stop-color="#a06a3a"/></linearGradient>
    <linearGradient id="pd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2f4d"/><stop offset="1" stop-color="#3d4166"/></linearGradient></defs>
    <rect width="{OW}" height="{OH}" fill="url(#pd)"/>
    <rect x="0" y="0" width="{OW}" height="520" fill="#262a45"/>
    <g transform="translate(160,140)"><rect width="300" height="230" fill="#8a6340" stroke="{arte.OL}" stroke-width="8"/>
      <rect x="30" y="30" width="110" height="130" fill="#efe9d8"/><rect x="170" y="40" width="100" height="100" fill="#f2d16b"/></g>
    <g transform="translate(820,250)"><circle r="70" fill="#e9e6dc" stroke="{arte.OL}" stroke-width="8"/>
      <line x1="0" y1="0" x2="0" y2="-46" stroke="{arte.OL}" stroke-width="7" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="-20" y2="-28" stroke="{arte.OL}" stroke-width="8" stroke-linecap="round"/></g>
    <path d="M-40,760 Q540,640 1120,760 L1120,1960 L-40,1960 Z" fill="url(#m)" stroke="{arte.OL}" stroke-width="10"/>
    <g transform="translate(540,1080) rotate(-8) scale(2.1)">
      <path d="M-200,-90 L200,-90 L230,80 L-230,80 Z" fill="#2c2d36" stroke="{arte.OL}" stroke-width="5"/>
      <path d="M-230,80 L230,80 L230,112 L-230,112 Z" fill="#1d1e25" stroke="{arte.OL}" stroke-width="5"/>
      <rect x="-60" y="-74" width="170" height="44" rx="6" fill="#7fe0a0" stroke="{arte.OL}" stroke-width="3"/>
      <text x="25" y="-43" font-family="Inter" font-weight="900" font-size="22" text-anchor="middle" fill="#123">PASTOR DAVI</text>
      <circle cx="-120" cy="-52" r="15" fill="{'#ff3b30' if luz else '#7a1d1a'}" stroke="{arte.OL}" stroke-width="3"/>
      {''.join(f'<rect x="{-30 + c * 50}" y="{-16 + r_ * 30}" width="42" height="24" rx="5" fill="#c9ccd6" stroke="{arte.OL}" stroke-width="2.5"/>' for r_ in range(3) for c in range(3))}
      <rect x="-200" y="-20" width="140" height="90" rx="10" fill="#1d1e25" stroke="{arte.OL}" stroke-width="3"/>
      {'<path d="M-200,-60 q0,-40 40,-40 l120,0 q40,0 40,40 l0,14 l-50,0 l-10,-20 l-80,0 l-10,20 l-50,0 z" fill="#22232b" stroke="'+arte.OL+'" stroke-width="5"/>' if no_gancho else ''}
    </g>"""
    if not no_gancho:
        corpo += f"""
    <path d="M330,1340 q-40,120 60,180 q120,60 40,200 q-60,100 30,240" fill="none" stroke="#111" stroke-width="10"/>
    <g transform="translate(800,1500) rotate(28)">
      <path d="M-70,-330 q0,-60 60,-60 l20,0 q60,0 60,60 l0,520 q0,60 -60,60 l-20,0 q-60,0 -60,-60 z" fill="#22232b" stroke="{arte.OL}" stroke-width="9"/>
      <circle cx="0" cy="-300" r="10" fill="#444"/><circle cx="-22" cy="-280" r="8" fill="#444"/><circle cx="22" cy="-280" r="8" fill="#444"/>
    </g>
    <g transform="translate(860,1620) rotate(18)">
      <path d="M-130,40 q-10,-90 60,-110 l140,-30 q40,0 40,40 l-20,170 q-120,50 -220,-70 z" fill="{arte.PELE}" stroke="{arte.OL}" stroke-width="9"/>
      {''.join(f'<rect x="{-150 + i * 8}" y="{-60 + i * 52}" width="120" height="50" rx="24" fill="{arte.PELE}" stroke="{arte.OL}" stroke-width="8"/>' for i in range(3))}
      <path d="M-80,160 l230,-40 l60,300 l-260,40 z" fill="#27355f" stroke="{arte.OL}" stroke-width="9"/>
    </g>"""
    return arte.svg(corpo, OW, OH)


TEL = {(g, l): arte.render(svg_telefone(g, l)) for g in (True, False) for l in (True, False)}
MAO_ESQ = arte.render(arte.svg(arte.mao(255, 1790, escala=1.12), OW, OH))


def cena_telefone(t, T, p):
    tocando = p["_i"] == 13
    no_gancho = tocando and t < 1.05
    luz = (no_gancho and (t * 4) % 2 < 1) or not no_gancho
    dx, dy, rot = tremor(t, tocando and t < 1.05, 5)
    z = 1.0 + 0.04 * ease(t / T)
    if t < 0.22:
        z *= 1 + 0.25 * (1 - t / 0.22) ** 2
    M = cv2.getRotationMatrix2D((OW / 2, OH / 2), math.degrees(rot), z)
    M[:, 2] += (dx, dy)
    out = np.zeros((OH, OW, 3), np.float32)
    if no_gancho and tocando:          # vibra quando toca
        M[0, 2] += 4 * math.sin(t * 70)
    sobre(out, warp(TEL[(no_gancho, bool(luz))], M.astype(np.float32)))
    hy = 6 * math.sin(t * 1.7)
    sobre(out, warp(MAO_ESQ, np.float32([[1, 0, 0], [0, 1, hy]])))
    return out


# ============================================================== câmeras de segurança
def svg_cctv(qual, velas_acesas=0, chama=0.0):
    G, G2, G3 = "#9bbf8a", "#6f9461", "#3f5c37"
    if qual == "entrada":
        cena = f"""
        <rect x="0" y="0" width="900" height="1300" fill="{G3}"/>
        <path d="M0,0 L900,0 L900,520 L0,520 Z" fill="#4c6d43"/>
        <path d="M250,520 L250,170 Q250,40 450,20 Q650,40 650,170 L650,520 Z" fill="#2c4227" stroke="#16210f" stroke-width="8"/>
        <line x1="450" y1="40" x2="450" y2="520" stroke="#16210f" stroke-width="10"/>
        <path d="M0,520 L900,520 L900,1300 L0,1300 Z" fill="{G2}"/>
        {''.join(f'<path d="M0,{600 + i * 130} L900,{600 + i * 130}" stroke="#4f7445" stroke-width="8"/>' for i in range(6))}
        <ellipse cx="460" cy="820" rx="250" ry="70" fill="#86ad77" opacity=".7"/>
        <ellipse cx="460" cy="820" rx="160" ry="40" fill="#a9cf98" opacity=".5"/>
        <text x="450" y="300" font-family="Inter" font-weight="800" font-size="30" text-anchor="middle" fill="{G}" opacity=".6">IGREJA</text>"""
        titulo = "CAM 2 · ENTRADA"
    else:
        cena = f"""
        <rect x="0" y="0" width="900" height="1300" fill="{G3}"/>
        <rect x="0" y="0" width="900" height="760" fill="#4a6a41"/>
        <g transform="translate(450,300)"><rect x="-22" y="-210" width="44" height="380" fill="#2c4227" stroke="#16210f" stroke-width="8"/>
           <rect x="-130" y="-120" width="260" height="44" fill="#2c4227" stroke="#16210f" stroke-width="8"/></g>
        <path d="M120,760 L780,760 L840,1000 L60,1000 Z" fill="#d9ead0" stroke="#16210f" stroke-width="8"/>
        <path d="M60,1000 L840,1000 L840,1180 L60,1180 Z" fill="#9dbb8f" stroke="#16210f" stroke-width="8"/>
        <path d="M400,1000 L500,1000 L480,1180 L420,1180 Z" fill="#c9a14a" opacity=".6"/>
        <path d="M0,1180 L900,1180 L900,1300 L0,1300 Z" fill="{G2}"/>"""
        for i in range(5):
            x = 200 + i * 125
            hgt = 150 if i % 2 == 0 else 110
            cena += f'<rect x="{x - 18}" y="{880 - hgt}" width="36" height="{hgt}" rx="6" fill="#eef5e8" stroke="#16210f" stroke-width="6"/>'
            if i < velas_acesas:
                fl = 1 + 0.12 * math.sin(chama * 17 + i * 2)
                cena += (f'<ellipse cx="{x}" cy="{880 - hgt - 60}" rx="{70 * fl}" ry="{80 * fl}" fill="#fffbe0" opacity=".18"/>'
                         f'<path d="M{x},{880 - hgt - 56 * fl} q22,30 0,48 q-22,-18 0,-48 z" fill="#fffde8" stroke="#16210f" stroke-width="4"/>')
        titulo = "CAM 3 · ALTAR"
    scan = "".join(f'<rect x="0" y="{y}" width="900" height="3" fill="#000" opacity=".18"/>' for y in range(0, 1300, 8))
    corpo = f"""
    <rect width="{OW}" height="{OH}" fill="#0c0d10"/>
    <rect x="60" y="250" width="960" height="1420" rx="40" fill="#1b1d22" stroke="{arte.OL}" stroke-width="10"/>
    <g transform="translate(90,300)">{cena}{scan}
      <rect x="0" y="0" width="900" height="1300" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="20" y="20" width="430" height="58" rx="6" fill="#000" opacity=".55"/>
      <text x="38" y="61" font-family="Inter" font-weight="800" font-size="34" fill="#f2f2f2">{titulo}</text>
      <text x="770" y="62" font-family="Inter" font-weight="800" font-size="30" fill="#f2f2f2">REC</text>
    </g>
    <circle cx="540" cy="1630" r="8" fill="#3ddc6a"/>"""
    return arte.svg(corpo, OW, OH)


CCTV_ENT = arte.render(svg_cctv("entrada"))
_fonte_cache = {}


def fonte(path, tam):
    k = (path, tam)
    if k not in _fonte_cache:
        _fonte_cache[k] = ImageFont.truetype(path, tam)
    return _fonte_cache[k]


def cena_cctv(t, T, p, hora):
    if p["tipo"] == "cam_entrada":
        base = CCTV_ENT.copy()
        # chuva na câmera
        rng = np.random.default_rng(int(t * FPS))
        img = base
    else:
        acesas = sum(1 for k in range(5) if t >= 0.5 + k * 0.45)
        img = arte.render(svg_cctv("altar", acesas, t)) if acesas else _ALTAR0
        rng = np.random.default_rng(int(t * FPS))
    out = img[..., :3].copy()
    # ruído e linha de varredura móvel dentro da tela
    x0, y0, x1, y1 = 90, 300, 990, 1600
    sub = out[y0:y1, x0:x1]
    nz = rng.standard_normal((260, 180)).astype(np.float32)
    nz = cv2.resize(nz, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)
    sub += nz[..., None] * 0.035
    yb = int((t * 420) % (y1 - y0))
    sub[max(0, yb - 30):yb] *= 1.12
    if p["tipo"] == "cam_entrada":
        for _ in range(40):
            x = rng.integers(0, x1 - x0 - 10); y = rng.integers(0, y1 - y0 - 60)
            cv2.line(sub, (int(x), int(y)), (int(x - 6), int(y + 50)), (0.75, 0.85, 0.72), 2)
    if t < 0.3:  # estática de entrada
        out[y0:y1, x0:x1] = np.clip(sub * 0.3 + rng.random((y1 - y0, x1 - x0, 1)).astype(np.float32) * 0.8, 0, 1)
    # REC piscando + horário
    pil = Image.fromarray(u8(out))
    d = ImageDraw.Draw(pil)
    if (t % 1.0) < 0.6:
        d.ellipse((x0 + 845, y0 + 36, x0 + 873, y0 + 64), fill=(230, 40, 40))
    seg = int(t) + (31 if p["tipo"] == "cam_entrada" else 12)
    ts = f"{hora}:{seg:02d}"
    f = fonte(FONTE, 30)
    d.rounded_rectangle((x0 + 700, y0 + 90, x0 + 880, y0 + 140), 6, fill=(0, 0, 0))
    d.text((x0 + 790, y0 + 115), ts, font=f, fill=(240, 240, 240), anchor="mm")
    out = np.asarray(pil).astype(np.float32) / 255
    dx, dy, rot = tremor(t, False, 7)
    M = cv2.getRotationMatrix2D((OW / 2, OH / 2), math.degrees(rot) * 0.5, 1.03 + 0.03 * ease(t / T))
    M[:, 2] += (dx * 0.6, dy * 0.6)
    return cv2.warpAffine(out, M, (OW, OH), borderMode=cv2.BORDER_CONSTANT, borderValue=(0.047, 0.05, 0.063))


_ALTAR0 = arte.render(svg_cctv("altar", 0))


# ============================================================== interface (selo, relógio, legenda)
def texto_contorno(d, xy, txt, f, cor, contorno=8, anchor="mm", sombra=True):
    if sombra:
        d.text((xy[0] + 3, xy[1] + 6), txt, font=f, fill=(0, 0, 0, 140), anchor=anchor, stroke_width=contorno, stroke_fill=(0, 0, 0, 140))
    d.text(xy, txt, font=f, fill=cor, anchor=anchor, stroke_width=contorno, stroke_fill=(10, 10, 14))


def quebra(txt, f, larg):
    pal, linhas, cur = txt.split(), [], ""
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    for w in pal:
        tent = (cur + " " + w).strip()
        if d.textlength(tent, font=f) <= larg or not cur:
            cur = tent
        else:
            linhas.append(cur); cur = w
    linhas.append(cur)
    return linhas


@lru_cache(maxsize=256)
def img_legenda(txt, cor, rotulo):
    f = fonte(FONTE, 64)
    linhas = quebra(txt, f, 800)
    lh = 72
    h = lh * len(linhas) + 40 + (70 if rotulo else 0)
    im = Image.new("RGBA", (OW, h + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    y = 30
    if rotulo:
        fr = fonte(FONTE, 26)
        w = d.textlength(rotulo, font=fr) + 44
        d.rounded_rectangle((OW / 2 - w / 2, y - 6, OW / 2 + w / 2, y + 40), 23, fill=(8, 22, 34, 235), outline=cor, width=3)
        d.text((OW / 2, y + 17), rotulo, font=fr, fill=cor, anchor="mm")
        y += 70
    for ln in linhas:
        texto_contorno(d, (OW / 2, y + lh / 2), ln, f, cor)
        y += lh
    return np.asarray(im).astype(np.float32) / 255


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


@lru_cache(maxsize=16)
def img_topo(hora):
    im = Image.new("RGBA", (OW, 300), (0, 0, 0, 0))
    selo = Image.new("RGBA", (330, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(selo)
    d.rounded_rectangle((14, 18, 296, 104), 14, fill=(20, 8, 8), )
    d.rounded_rectangle((10, 10, 290, 96), 14, fill=(222, 34, 34), outline=(25, 10, 10), width=5)
    d.text((150, 54), ROT["parte"], font=fonte(FONTE_BLACK, 46), fill="white", anchor="mm")
    selo = selo.rotate(4, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(selo, (78, 128))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((808, 156, 996, 240), 14, fill=(10, 10, 12), outline=(226, 40, 40), width=5)
    d.text((902, 198), hora, font=fonte(FONTE, 44), fill="white", anchor="mm")
    return np.asarray(im).astype(np.float32) / 255


def cola(out, src, x, y, escala=1.0):
    if escala != 1.0:
        h, w = src.shape[:2]
        nw, nh = max(1, int(w * escala)), max(1, int(h * escala))
        src = cv2.resize(src, (nw, nh), interpolation=cv2.INTER_LINEAR)
        x += (w - nw) // 2; y += (h - nh) // 2
    h, w = src.shape[:2]
    xa, ya, xb, yb = max(x, 0), max(y, 0), min(x + w, OW), min(y + h, OH)
    if xa >= xb or ya >= yb:
        return
    s = src[ya - y:yb - y, xa - x:xb - x]
    sobre(out[ya:yb, xa:xb], s)


# ============================================================== tela de escolha
def svg_icone(nome):
    if nome == "chave":
        return (f'<g transform="translate(0,0)"><circle cx="-14" cy="0" r="22" fill="#f5c842" stroke="{arte.OL}" stroke-width="6"/>'
                f'<circle cx="-14" cy="0" r="8" fill="{arte.OL}"/><path d="M6,-6 l44,0 l0,12 l-8,0 l0,12 l-10,0 l0,-12 l-26,0 z" fill="#f5c842" stroke="{arte.OL}" stroke-width="5"/></g>')
    return (f'<g><path d="M-20,-8 l0,-14 q0,-24 22,-24 q22,0 22,24 l0,14" fill="none" stroke="#d6dbe4" stroke-width="9"/>'
            f'<rect x="-32" y="-10" width="68" height="54" rx="8" fill="#f5c842" stroke="{arte.OL}" stroke-width="6"/>'
            f'<circle cx="2" cy="14" r="7" fill="{arte.OL}"/></g>')


@lru_cache(maxsize=4)
def img_botao(i):
    o = ROT["planos"][-1]["opcoes"][i]
    s = f"""<rect x="8" y="12" width="864" height="196" rx="34" fill="#000" opacity=".55"/>
    <rect x="4" y="4" width="864" height="196" rx="34" fill="{o['cor']}" stroke="#0d0d12" stroke-width="7"/>
    <g transform="translate(86,102) scale(1.5)">{svg_icone(o['icone'])}</g>
    <text x="170" y="104" font-family="Inter" font-weight="900" font-size="86" fill="#fff">{o['titulo']}</text>
    <text x="172" y="160" font-family="Inter" font-weight="600" font-size="40" fill="#fff" opacity=".95">{o['sub']}</text>"""
    return arte.render(arte.svg(s, 880, 220))


@lru_cache(maxsize=1)
def img_titulos():
    im = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = fonte(FONTE_BLACK, 104)
    d.text((OW / 2, 380), "O QUE VOCÊ", font=f, fill="white", anchor="mm")
    d.text((OW / 2, 495), "FARIA?", font=f, fill="white", anchor="mm")
    f2 = fonte(FONTE_BLACK, 50)
    txt = "COMENTA UMA PALAVRA"
    w = d.textlength(txt, font=f2)
    d.text((OW / 2 - 34 - w / 2, 615), txt, font=f2, fill=(247, 200, 66), anchor="lm")
    em = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(em).text((0, 0), "👇", font=ImageFont.truetype(EMOJI, 109), embedded_color=True)
    em = em.crop(em.getbbox()).resize((54, 54), Image.LANCZOS)
    im.alpha_composite(em, (int(OW / 2 - 34 + w / 2 + 12), 588))
    d.text((OW / 2, 1335), "A mais votada decide a PARTE 2", font=fonte(FONTE, 42), fill="white", anchor="mm")
    return np.asarray(im).astype(np.float32) / 255


def cena_escolha(t, T, fundo):
    out = fundo.copy()
    sobre(out, img_titulos())
    for i, y in enumerate((720, 960)):
        pulso = 1 + 0.035 * max(0, math.sin(t * 4.2 + i * math.pi))
        ent = ease((t - 0.1 - i * 0.12) / 0.25)
        if ent <= 0:
            continue
        cola(out, img_botao(i), 100, y, pulso * (0.6 + 0.4 * ent))
    # barra de tempo
    fr = max(0.0, 1 - t / T)
    x0, x1, y0 = 110, 970, 1225
    cv2.rectangle(out, (x0, y0), (x1, y0 + 26), (0.06, 0.06, 0.08), -1)
    cor = (0.97, 0.80, 0.25) if fr > 0.25 else (0.92, 0.2, 0.2)
    if fr > 0:
        cv2.rectangle(out, (x0, y0), (int(x0 + (x1 - x0) * fr), y0 + 26), cor, -1)
    return out


# ============================================================== linha do tempo
def dur_wav(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def rms_quadros(p):
    with wave.open(str(p)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    n = int(len(a) / sr * FPS) + 1
    hop = sr // FPS
    r = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(n)])
    return r / (np.percentile(r, 95) + 1e-6)


def montar_linha():
    planos, legs, audios, sfx = [], [], [], []
    T0 = 0.0
    for i, p in enumerate(ROT["planos"]):
        p["_i"] = i
        t = p.get("pausa_ini", 0.25)
        inicios = []
        for j, (quem, txt) in enumerate(p.get("falas", [])):
            wav = AQUI / "vozes" / f"p{i:02d}_{j}.wav"
            d = dur_wav(wav)
            inicios.append(t)
            audios.append((T0 + t, wav, quem))
            # legenda dividida em pedaços (frases) com tempo proporcional
            pedacos = [s.strip() for s in re.split(r"(?<=[.?!])\s+", txt) if s.strip()]
            junt = []
            for s in pedacos:
                if junt and len(junt[-1]) + len(s) < 34:
                    junt[-1] += " " + s
                else:
                    junt.append(s)
            tot = sum(len(s) for s in junt)
            tt = t
            for s in junt:
                dd = d * len(s) / tot
                vz = ROT["vozes"][quem]
                rot = "LIGAÇÃO · PASTOR DAVI" if quem == "pastor" else None
                legs.append((T0 + tt, T0 + tt + dd + 0.12, s, vz["cor"], rot))
                tt += dd
            t += d + (p.get("gap", 0.35) if j + 1 < len(p["falas"]) else 0)
        T = p.get("dur") or (t + p.get("pausa_fim", 0.45))
        for s in p.get("sfx", []):
            nome, _, quando = s.partition("@")
            if quando.startswith("f"):
                m = re.match(r"f(\d+)([+-][\d.]+)?", quando)
                q = inicios[int(m.group(1))] + float(m.group(2) or 0)
            else:
                q = float(quando or 0)
            sfx.append((T0 + q, nome, T))
        p["_t0"], p["_T"], p["_inicios"] = T0, T, inicios
        planos.append(p)
        T0 += T
    return planos, legs, audios, sfx, T0


def boca_do_quadro(rms, k):
    if k < 0 or k >= len(rms):
        return "fechada"
    v = rms[k]
    # troca de sprite a cada 2 quadros (~15 trocas/s), como na referência
    k2 = k - k % 2
    v = rms[k2]
    if v > 0.55:
        return "aberta" if (k2 // 2) % 3 else "meia"
    if v > 0.2:
        return "meia"
    return "fechada"


def main():
    planos, legs, audios, sfx, TT = montar_linha()
    print(f"duração total {TT:.1f}s, {len(planos)} planos", flush=True)
    args = sys.argv[1:]
    previa = [float(x) for x in args[args.index("--previa") + 1:]] if "--previa" in args else None

    # boca: rms por fala do estranho, em tempo global
    falas_est = [(t0, rms_quadros(w)) for (t0, w, q) in audios if q == "est"]

    def rosto(tg, p, tl):
        boca = "fechada"
        for (t0, r) in falas_est:
            k = int(round((tg - t0) * FPS))
            if 0 <= k < len(r):
                boca = boca_do_quadro(r, k)
                break
        cara = p.get("cara", "sorriso")
        pisca = (tg % 3.4) < 0.12 or (tg % 7.9) < 0.1
        return boca, cara, "fechados" if pisca else "abertos"

    def quadro(tg):
        p = next(pp for pp in planos if pp["_t0"] <= tg < pp["_t0"] + pp["_T"]) if tg < TT else planos[-1]
        t = tg - p["_t0"]
        T = p["_T"]
        tipo = p["tipo"]
        mostra_topo = True
        if tipo in ("porta", "close", "cartao"):
            out = peixe(cena_porta(t, T, p, rosto(tg, p, t)))
        elif tipo == "celular":
            out = cena_celular(t, T, p)
        elif tipo == "telefone":
            out = peixe(cena_telefone(t, T, p))
        elif tipo in ("cam_entrada", "cam_altar"):
            out = cena_cctv(t, T, p, p["hora"]); mostra_topo = False
        else:
            if "_fundo" not in p:
                ant = planos[-2]
                f = peixe(cena_porta(ant["_T"], ant["_T"], ant, ("fechada", "sorriso", "abertos")))
                p["_fundo"] = cv2.GaussianBlur(f, (0, 0), 10) * 0.28
            return cena_escolha(t, T, p["_fundo"])
        if mostra_topo:
            cola(out, img_topo(p["hora"]), 0, 0)
        for (a, b, txt, cor, rot) in legs:
            if a <= tg < b:
                im = img_legenda(txt, hexrgb(cor), rot)
                dt = tg - a
                esc = 0.75 + 0.33 * ease(dt / 0.09) if dt < 0.09 else 1.08 - 0.08 * ease((dt - 0.09) / 0.08)
                y = 1230 - (70 if rot else 0)
                if tipo == "celular":
                    y = 1470
                if tipo == "cartao":
                    y = 1430
                cola(out, im, 0, int(y), esc)
                break
        return out

    if previa:
        for s in previa:
            Image.fromarray(u8(quadro(s))).save(AQUI / f"previa_{s:05.1f}.png")
            print("previa", s)
        return

    # ---------------- áudio
    n = int(TT * sons.SR) + sons.SR
    mix = np.zeros(n)
    for (t0, w, q) in audios:
        with wave.open(str(w)) as ww:
            a = np.frombuffer(ww.readframes(ww.getnframes()), np.int16).astype(np.float64) / 32768
        i = int(t0 * sons.SR)
        mix[i:i + len(a)] += a * 0.9
    for (t0, nome, T) in sfx:
        if nome == "chuva":
            continue
        s = sons.tique(T) if nome == "tique" else sons.SFX[nome]()
        i = int(t0 * sons.SR)
        mix[i:i + len(s)] += s[: n - i]
    t_esc = planos[-1]["_t0"]
    amb = sons.chuva(t_esc) * 0.8
    amb[-sons.SR:] *= np.linspace(1, 0, sons.SR)
    mix[:len(amb)] += amb
    mix[:int(TT * sons.SR)] += sons.trilha(TT, TT - 22) * 0.55
    mix = mix[:int(TT * sons.SR)]
    mix /= max(1e-6, np.abs(mix).max()) / 0.95
    aud = AQUI / "audio.wav"
    with wave.open(str(aud), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sons.SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())

    # ---------------- vídeo
    nq = int(TT * FPS)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
                           "-r", str(FPS), "-i", "-", "-i", str(aud),
                           "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
                           "-movflags", "+faststart", str(AQUI / "final.mp4")], stdin=subprocess.PIPE)
    for k in range(nq):
        ff.stdin.write(u8(quadro(k / FPS)).tobytes())
        if k % 150 == 0:
            print(f"quadro {k}/{nq}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("ok final.mp4", flush=True)


if __name__ == "__main__":
    main()
