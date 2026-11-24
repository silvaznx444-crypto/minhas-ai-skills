"""Arte vetorial (SVG) do episódio. Tudo em 'espaço de desenho' 1200x2134 (9:16).

Camadas do plano 'porta' (de trás pra frente): fora -> chuva -> personagem -> frente (interior com vidro).
"""
import io
import math
import random

import cairosvg
import numpy as np
from PIL import Image

W, H = 1200, 2134
OL = "#15151d"          # cor do contorno
SW = 6                  # espessura padrão do contorno
PELE, PELE_S = "#8E5A3A", "#6C4129"


def svg(body: str, w=W, h=H, defs: str = "") -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<defs>{defs}</defs>{body}</svg>')


def render(s: str, escala: float = 1.0) -> np.ndarray:
    """SVG -> RGBA float32 (pré-multiplicado não; alfa separado) 0..1."""
    import re
    m = re.search(r'width="(\d+)" height="(\d+)"', s)
    w, h = int(m.group(1)), int(m.group(2))
    png = cairosvg.svg2png(bytestring=s.encode(), output_width=int(w * escala), output_height=int(h * escala))
    return np.asarray(Image.open(io.BytesIO(png)).convert("RGBA")).astype(np.float32) / 255.0


# ---------------------------------------------------------------- cenário: lado de fora
PORTA = dict(x0=330, x1=870, y0=430, y1=1310, arco=300)   # vão da porta de vidro (arco gótico no topo)


def caminho_porta(pad=0):
    x0, x1, y0, y1 = PORTA["x0"] - pad, PORTA["x1"] + pad, PORTA["y0"] - pad, PORTA["y1"] + pad
    ya = y0 + PORTA["arco"]
    cx = (x0 + x1) / 2
    return (f"M{x0},{y1} L{x0},{ya} Q{x0},{y0 + 40} {cx},{y0} Q{x1},{y0 + 40} {x1},{ya} L{x1},{y1} Z")


def fora() -> str:
    rnd = random.Random(3)
    estrelas = "".join(f'<circle cx="{rnd.randint(300, 900)}" cy="{rnd.randint(440, 900)}" r="{rnd.choice([3, 4, 5])}" fill="#dfe6ff" opacity="{rnd.uniform(.5, .95):.2f}"/>'
                       for _ in range(16))
    predios = ""
    for (x, w_, h_) in [(300, 150, 520), (440, 130, 440), (700, 190, 560), (860, 120, 420)]:
        y = 1150 - h_
        predios += f'<rect x="{x}" y="{y}" width="{w_}" height="{h_}" fill="#1f2a55" stroke="{OL}" stroke-width="4"/>'
        for yy in range(y + 40, 1120, 90):
            for xx in range(x + 22, x + w_ - 30, 52):
                cor = "#f2c14e" if rnd.random() < .22 else "#2c3a72"
                predios += f'<rect x="{xx}" y="{yy}" width="26" height="40" fill="{cor}"/>'
    defs = """
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1230"/><stop offset="1" stop-color="#26346e"/></linearGradient>
    <radialGradient id="lua" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></radialGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".40"/><stop offset="1" stop-color="#ffe9a8" stop-opacity=".07"/></linearGradient>
    <radialGradient id="poca" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
    """
    corpo = f"""
    <rect x="0" y="0" width="{W}" height="{H}" fill="url(#ceu)"/>
    {estrelas}
    <circle cx="455" cy="560" r="120" fill="url(#lua)"/>
    <circle cx="455" cy="560" r="52" fill="#efe6c4" stroke="{OL}" stroke-width="4"/>
    <circle cx="438" cy="548" r="9" fill="#d7cca3"/><circle cx="472" cy="578" r="6" fill="#d7cca3"/>
    <path d="M330,660 q60,-50 130,-10 q60,-40 120,10 q40,30 -20,40 l-210,0 q-60,-10 -20,-40z" fill="#3b4677" opacity=".85"/>
    {predios}
    <rect x="0" y="1140" width="{W}" height="200" fill="#4a557c"/>
    <rect x="0" y="1140" width="{W}" height="14" fill="#5d6a96"/>
    <path d="M0,1215 L{W},1215" stroke="#3a4468" stroke-width="5"/>
    <ellipse cx="640" cy="1250" rx="230" ry="40" fill="url(#poca)"/>
    <path d="M720,640 L520,1260 L900,1260 Z" fill="url(#cone)"/>
    <rect x="752" y="620" width="14" height="560" fill="#2a2f45" stroke="{OL}" stroke-width="4"/>
    <path d="M700,612 q60,-30 120,0 l-10,22 l-100,0 z" fill="#2a2f45" stroke="{OL}" stroke-width="4"/>
    <ellipse cx="760" cy="636" rx="40" ry="10" fill="#ffe9a8"/>
    """
    return svg(corpo, defs=defs)


def chuva_tile(seed=1) -> str:
    rnd = random.Random(seed)
    linhas = "".join(
        f'<line x1="{x}" y1="{y}" x2="{x - 7}" y2="{y + L}" stroke="#c9d6ff" stroke-width="{sw}" stroke-linecap="round" opacity="{op:.2f}"/>'
        for x, y, L, sw, op in ((rnd.randint(250, 950), rnd.randint(0, H), rnd.randint(40, 90), rnd.choice([2, 3]), rnd.uniform(.18, .42))
                                for _ in range(150)))
    return svg(linhas)


# ---------------------------------------------------------------- cenário: interior (frente)
def frente() -> str:
    x0, x1, y0, y1 = PORTA["x0"], PORTA["x1"], PORTA["y0"], PORTA["y1"]
    cx = (x0 + x1) / 2
    defs = f"""
    <mask id="buraco"><rect width="{W}" height="{H}" fill="white"/><path d="{caminho_porta()}" fill="black"/></mask>
    <linearGradient id="parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3f63"/><stop offset="1" stop-color="#5b5f8a"/></linearGradient>
    <linearGradient id="mesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6537"/><stop offset="1" stop-color="#6e4422"/></linearGradient>
    <linearGradient id="tapete" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d2126"/><stop offset="1" stop-color="#8f2b2f"/></linearGradient>
    <linearGradient id="reflexo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".10"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <radialGradient id="luminaria" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
    """
    # vidro (por cima do personagem): leve tom azulado, reflexos e gotas
    rnd = random.Random(7)
    gotas = "".join(f'<ellipse cx="{rnd.randint(x0 + 10, x1 - 10)}" cy="{rnd.randint(y0 + 120, y1 - 20)}" rx="{rnd.choice([4, 5, 6])}" ry="{rnd.choice([6, 8, 9])}" fill="#dfe8ff" opacity="{rnd.uniform(.25, .5):.2f}"/>'
                    for _ in range(45))
    vidro = f"""
    <g>
      <path d="{caminho_porta()}" fill="#2a3a7a" opacity=".16"/>
      <path d="M{x0 + 40},{y1} L{x0 + 190},{y0 + 140} L{x0 + 250},{y0 + 140} L{x0 + 100},{y1} Z" fill="url(#reflexo)"/>
      <path d="M{x1 - 170},{y1} L{x1 - 60},{y0 + 260} L{x1 - 30},{y0 + 260} L{x1 - 140},{y1} Z" fill="url(#reflexo)"/>
      {gotas}
      <line x1="{cx}" y1="{y0}" x2="{cx}" y2="{y1}" stroke="#2b2230" stroke-width="16"/>
      <line x1="{cx}" y1="{y0}" x2="{cx}" y2="{y1}" stroke="{OL}" stroke-width="3"/>
      <line x1="{cx - 30}" y1="1130" x2="{cx - 30}" y2="1260" stroke="#c8c8d0" stroke-width="9" stroke-linecap="round"/>
      <line x1="{cx + 30}" y1="1130" x2="{cx + 30}" y2="1260" stroke="#c8c8d0" stroke-width="9" stroke-linecap="round"/>
    </g>"""
    sala = f"""
    <g mask="url(#buraco)">
      <rect width="{W}" height="{H}" fill="url(#parede)"/>
      <path d="M0,0 L{W},0 L{W},250 Q600,175 0,250 Z" fill="#262842" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M0,290 Q600,215 {W},290" stroke="#2c2e4c" stroke-width="10" fill="none"/>
      <rect x="0" y="1060" width="{W}" height="260" fill="#4a2f22"/>
      <rect x="0" y="1060" width="{W}" height="18" fill="#6b4532" stroke="{OL}" stroke-width="4"/>
      {''.join(f'<line x1="{x}" y1="1080" x2="{x}" y2="1320" stroke="#3a241a" stroke-width="5"/>' for x in range(60, W, 120))}
      <ellipse cx="600" cy="260" rx="420" ry="300" fill="url(#luminaria)"/>
      <!-- cruz de madeira na parede esquerda -->
      <g transform="translate(150,560)">
        <rect x="-16" y="-120" width="32" height="250" rx="4" fill="#7a4b2c" stroke="{OL}" stroke-width="{SW}"/>
        <rect x="-85" y="-60" width="170" height="32" rx="4" fill="#7a4b2c" stroke="{OL}" stroke-width="{SW}"/>
      </g>
      <!-- relógio -->
      <g transform="translate(1040,560)">
        <circle r="56" fill="#e9e6dc" stroke="{OL}" stroke-width="{SW}"/>
        <line x1="0" y1="0" x2="0" y2="-36" stroke="{OL}" stroke-width="6" stroke-linecap="round"/>
        <line x1="0" y1="0" x2="-6" y2="-26" stroke="{OL}" stroke-width="7" stroke-linecap="round" transform="rotate(-35)"/>
        <circle r="5" fill="{OL}"/>
      </g>
      <!-- mural de avisos -->
      <g transform="translate(960,740)">
        <rect width="190" height="230" fill="#8a6340" stroke="{OL}" stroke-width="{SW}"/>
        <rect x="18" y="22" width="70" height="86" fill="#efe9d8" transform="rotate(-4 50 60)"/>
        <rect x="102" y="30" width="66" height="70" fill="#f2d16b"/>
        <rect x="30" y="128" width="130" height="80" fill="#dfe7ef"/>
        <circle cx="53" cy="26" r="6" fill="#d9302c"/><circle cx="135" cy="34" r="6" fill="#2c6ed9"/>
      </g>
      <!-- batente da porta (madeira) -->
      <path d="{caminho_porta(26)}" fill="none" stroke="#5a3825" stroke-width="40"/>
      <path d="{caminho_porta(46)}" fill="none" stroke="{OL}" stroke-width="{SW}"/>
      <path d="{caminho_porta(6)}" fill="none" stroke="{OL}" stroke-width="{SW}"/>
      <!-- chão e tapete vermelho até a porta -->
      <rect x="0" y="1320" width="{W}" height="400" fill="#3d3550"/>
      <path d="M0,1320 L{W},1320" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M{x0 + 40},1320 L{x1 - 40},1320 L{x1 + 150},1720 L{x0 - 150},1720 Z" fill="url(#tapete)" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M{x0 + 70},1320 L{x0 - 105},1720 M{x1 - 70},1320 L{x1 + 105},1720" stroke="#c9a14a" stroke-width="6"/>
      <!-- mesa da recepção -->
      <path d="M-40,1600 Q600,1540 {W + 40},1600 L{W + 40},{H} L-40,{H} Z" fill="url(#mesa)" stroke="{OL}" stroke-width="{SW + 2}"/>
      <path d="M-40,1626 Q600,1568 {W + 40},1626" stroke="#b07a47" stroke-width="8" fill="none"/>
      <!-- livro de visitas aberto -->
      <g transform="translate(330,1700) rotate(-4)">
        <rect x="-10" y="-8" width="420" height="250" rx="8" fill="#273a78" stroke="{OL}" stroke-width="{SW}"/>
        <rect x="0" y="0" width="200" height="232" fill="#efeadb" stroke="{OL}" stroke-width="4"/>
        <rect x="200" y="0" width="200" height="232" fill="#f6f1e2" stroke="{OL}" stroke-width="4"/>
        {''.join(f'<line x1="18" y1="{y}" x2="182" y2="{y}" stroke="#c3bba5" stroke-width="3"/><line x1="218" y1="{y}" x2="382" y2="{y}" stroke="#c3bba5" stroke-width="3"/>' for y in range(34, 230, 28))}
      </g>
      <!-- caneca -->
      <g transform="translate(140,1680)">
        <rect x="-38" y="-50" width="76" height="92" rx="10" fill="#dcd7cc" stroke="{OL}" stroke-width="{SW}"/>
        <path d="M38,-28 q34,0 34,24 q0,24 -34,24" fill="none" stroke="{OL}" stroke-width="{SW}"/>
        <ellipse cx="0" cy="-50" rx="38" ry="10" fill="#3a2418" stroke="{OL}" stroke-width="4"/>
      </g>
      <!-- telefone da recepção -->
      {telefone_mesa(930, 1720, 1.0)}
    </g>"""
    vinheta = f"""<radialGradient id="vin" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>"""
    sala = sala.replace('<g mask="url(#buraco)">', '<g>')
    return (svg(vidro, defs=defs),
            svg(sala + f'<rect width="{W}" height="{H}" fill="url(#vin)"/>', defs=defs + vinheta),
            svg(f'<path d="{caminho_porta()}" fill="white"/>'))


def telefone_mesa(x, y, s, fone_no_gancho=True, tela="RECEPÇÃO"):
    fone = (f'<path d="M-130,-112 q0,-34 40,-34 l180,0 q40,0 40,34 l0,16 q0,16 -20,16 l-40,0 l-10,-22 l-120,0 l-10,22 l-40,0 q-20,0 -20,-16 z" '
            f'fill="#22232b" stroke="{OL}" stroke-width="{SW}"/>') if fone_no_gancho else ""
    teclas = "".join(f'<rect x="{-10 + c * 46}" y="{-50 + r_ * 34}" width="38" height="26" rx="5" fill="#c9ccd6" stroke="{OL}" stroke-width="3"/>'
                     for r_ in range(3) for c in range(3))
    return f"""<g transform="translate({x},{y}) scale({s})">
      <path d="M-170,-80 L170,-80 L200,70 L-200,70 Z" fill="#2c2d36" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M-200,70 L200,70 L200,100 L-200,100 Z" fill="#1d1e25" stroke="{OL}" stroke-width="{SW}"/>
      <rect x="-150" y="-56" width="120" height="44" rx="6" fill="#7fe0a0" stroke="{OL}" stroke-width="4"/>
      <text x="-90" y="-26" font-family="Inter" font-weight="800" font-size="20" text-anchor="middle" fill="#123">{tela}</text>
      <circle cx="-90" cy="25" r="16" fill="#c8312c" stroke="{OL}" stroke-width="4"/>
      {teclas}
      {fone}
    </g>"""


# ---------------------------------------------------------------- personagem: o estranho
# coordenadas locais 400x900, pés em (200, 900)
CW, CH = 400, 900
CASACO, CASACO_S = "#C2A06A", "#9C7C4A"


def estranho_corpo(pose: str = "normal") -> str:
    braco_esq = f'<path d="M120,440 q-40,40 -48,170 q-2,40 12,70 l40,0 q4,-120 30,-200 z" fill="{CASACO}" stroke="{OL}" stroke-width="{SW}"/>' \
                f'<circle cx="96" cy="700" r="28" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>'
    if pose == "bate":
        braco_dir = (f'<path d="M280,450 q60,-10 82,-110 q8,-40 0,-80 l-42,-4 q-6,70 -64,110 z" fill="{CASACO}" stroke="{OL}" stroke-width="{SW}"/>'
                     f'<g transform="translate(345,240)"><rect x="-32" y="-34" width="64" height="62" rx="24" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>'
                     f'<path d="M-16,-30 l0,22 M2,-32 l0,22 M18,-30 l0,22" stroke="{PELE_S}" stroke-width="5" stroke-linecap="round"/></g>')
    elif pose == "cartao":
        braco_dir = (f'<path d="M280,450 q40,40 20,200 l-44,0 q4,-120 -30,-170 z" fill="{CASACO}" stroke="{OL}" stroke-width="{SW}"/>'
                     f'<g transform="translate(240,600) rotate(-4)">'
                     f'<rect x="-150" y="-170" width="300" height="230" rx="10" fill="#f3ecd8" stroke="{OL}" stroke-width="{SW}"/>'
                     f'<path d="M-7,-150 l14,0 l0,30 l26,0 l0,14 l-26,0 l0,52 l-14,0 l0,-52 l-26,0 l0,-14 l26,0 z" fill="#b8892f" stroke="{OL}" stroke-width="3"/>'
                     f'<text x="0" y="-26" font-family="Inter" font-weight="900" font-size="40" text-anchor="middle" fill="#b3262b">HEBREUS 13:2</text>'
                     f'<text x="0" y="8" font-family="Inter" font-weight="700" font-size="21" text-anchor="middle" fill="#3a3326">"alguns, sem o saber,</text>'
                     f'<text x="0" y="36" font-family="Inter" font-weight="700" font-size="21" text-anchor="middle" fill="#3a3326">acolheram anjos."</text>'
                     f'<rect x="-34" y="40" width="68" height="50" rx="22" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/></g>')
    else:
        braco_dir = f'<path d="M280,440 q40,40 48,170 q2,40 -12,70 l-40,0 q-4,-120 -30,-200 z" fill="{CASACO}" stroke="{OL}" stroke-width="{SW}"/>' \
                    f'<circle cx="304" cy="700" r="28" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>'
    return f"""
    <ellipse cx="200" cy="892" rx="120" ry="14" fill="#000" opacity=".35"/>
    <path d="M150,720 L148,870 L196,870 L198,720 Z" fill="#2b3148" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M204,720 L206,870 L254,870 L252,720 Z" fill="#2b3148" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M128,866 q-4,30 30,32 l46,0 l0,-32 z" fill="#3a2a20" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M272,866 q4,30 -30,32 l-46,0 l0,-32 z" fill="#3a2a20" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M130,430 q70,-30 140,0 q24,10 26,40 l22,300 q-118,26 -236,0 l22,-300 q2,-30 26,-40 z" fill="{CASACO}" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M200,450 L200,760" stroke="{CASACO_S}" stroke-width="6"/>
    <path d="M110,600 L290,600" stroke="{CASACO_S}" stroke-width="18"/>
    <rect x="186" y="588" width="28" height="24" rx="4" fill="#6b5330" stroke="{OL}" stroke-width="4"/>
    <circle cx="222" cy="500" r="7" fill="#6b5330"/><circle cx="222" cy="545" r="7" fill="#6b5330"/>
    <path d="M150,470 q20,40 10,90 M250,470 q-20,40 -10,90" stroke="{CASACO_S}" stroke-width="5" fill="none"/>
    <ellipse cx="160" cy="660" rx="26" ry="16" fill="{CASACO_S}" opacity=".6"/>
    <ellipse cx="248" cy="700" rx="20" ry="12" fill="{CASACO_S}" opacity=".6"/>
    {braco_esq}
    <path d="M140,418 q60,-26 120,0 q10,22 -6,40 q-54,22 -108,0 q-16,-18 -6,-40 z" fill="#9e3a30" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M232,440 l14,70 l-26,0 z" fill="#9e3a30" stroke="{OL}" stroke-width="5"/>
    {braco_dir if pose == "normal" else ""}
    <!-- cabeça -->
    <path d="M86,300 q-6,-130 114,-132 q120,2 114,132 q-2,104 -114,116 q-112,-12 -114,-116 z" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>
    <ellipse cx="84" cy="306" rx="18" ry="28" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>
    <ellipse cx="316" cy="306" rx="18" ry="28" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>
    <!-- barba branca -->
    <path d="M96,330 q8,84 104,90 q96,-6 104,-90 q-20,26 -50,30 q-54,-18 -108,0 q-30,-4 -50,-30 z" fill="#e8e4dc" stroke="{OL}" stroke-width="{SW}"/>
    <!-- chapéu -->
    <path d="M70,218 q130,-40 260,0 q12,14 -10,20 q-120,-26 -240,0 q-22,-6 -10,-20 z" fill="#3a3a46" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M118,214 q-6,-82 30,-96 q52,-16 104,0 q36,14 30,96 q-82,-18 -164,0 z" fill="#45454f" stroke="{OL}" stroke-width="{SW}"/>
    <path d="M122,196 q78,-14 156,0" stroke="#7d2b26" stroke-width="12" fill="none"/>
    <path d="M100,222 l-6,26 M300,222 l6,26" stroke="#9fc1ff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <path d="M96,236 q6,-12 20,-12 l0,40 q-18,0 -20,-28 z M304,236 q-6,-12 -20,-12 l0,40 q18,0 20,-28 z" fill="#d9d4cc"/>
    {braco_dir if pose != "normal" else ""}
    """


def estranho_rosto(boca: str = "fechada", cara: str = "sorriso", olhos: str = "abertos") -> str:
    """Olhos/sobrancelhas/boca (camada trocada quadro a quadro)."""
    s = ""
    if olhos == "fechados":
        s += f'<path d="M134,292 q26,14 52,0 M214,292 q26,14 52,0" stroke="{OL}" stroke-width="7" fill="none" stroke-linecap="round"/>'
    else:
        pr = 10 if cara != "arregalado" else 7
        s += (f'<circle cx="160" cy="290" r="30" fill="#fbfbf6" stroke="{OL}" stroke-width="{SW}"/>'
              f'<circle cx="240" cy="290" r="30" fill="#fbfbf6" stroke="{OL}" stroke-width="{SW}"/>'
              f'<circle cx="163" cy="292" r="{pr + 3}" fill="{OL}"/><circle cx="243" cy="292" r="{pr + 3}" fill="{OL}"/>'
              f'<circle cx="168" cy="286" r="4" fill="#fff"/><circle cx="248" cy="286" r="4" fill="#fff"/>')
    sob = {"sorriso": "M128,246 q32,-14 62,-2 M210,244 q30,-12 62,2",
           "triste": "M130,256 q30,-6 58,-22 M212,234 q28,16 58,22",
           "serio": "M128,240 q32,8 62,18 M210,258 q30,-10 62,-18",
           "arregalado": "M128,236 q32,-18 62,-6 M210,230 q30,-12 62,6"}[cara]
    s += f'<path d="{sob}" stroke="#e8e4dc" stroke-width="13" fill="none" stroke-linecap="round"/>' \
         f'<path d="{sob}" stroke="{OL}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>'
    # boca dentro da barba
    if boca == "fechada":
        if cara == "triste":
            s += f'<path d="M172,372 q28,-14 56,0" stroke="{OL}" stroke-width="7" fill="none" stroke-linecap="round"/>'
        elif cara == "serio":
            s += f'<path d="M174,366 l52,0" stroke="{OL}" stroke-width="7" fill="none" stroke-linecap="round"/>'
        else:
            s += f'<path d="M166,360 q34,26 68,0" stroke="{OL}" stroke-width="7" fill="none" stroke-linecap="round"/>'
    elif boca == "meia":
        s += (f'<path d="M172,358 q28,-4 56,0 q-4,24 -28,24 q-24,0 -28,-24 z" fill="#3a1414" stroke="{OL}" stroke-width="5"/>'
              f'<path d="M178,360 l44,0 l-2,6 l-40,0 z" fill="#fff"/>')
    else:  # aberta
        s += (f'<path d="M166,352 q34,-8 68,0 q-2,42 -34,42 q-32,0 -34,-42 z" fill="#3a1414" stroke="{OL}" stroke-width="5"/>'
              f'<path d="M174,355 l52,0 l-3,9 l-46,0 z" fill="#fff"/>'
              f'<ellipse cx="200" cy="384" rx="16" ry="7" fill="#c4565a"/>')
    return s


def estranho(pose="normal", boca="fechada", cara="sorriso", olhos="abertos") -> str:
    return svg(estranho_corpo(pose) + estranho_rosto(boca, cara, olhos), CW, CH)


# ---------------------------------------------------------------- mãos do POV (espaço de saída 1080x1920)
def mao(x, y, espelho=False, escala=1.0) -> str:
    sx = -1 if espelho else 1
    dedos = ""
    for i, (dx, L) in enumerate([(-72, 92), (-24, 108), (24, 104), (72, 86)]):
        dedos += (f'<rect x="{dx - 25}" y="{-L}" width="50" height="{L + 30}" rx="24" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>'
                  f'<rect x="{dx - 15}" y="{-L + 7}" width="30" height="28" rx="12" fill="#b88865" stroke="{OL}" stroke-width="3"/>'
                  f'<path d="M{dx - 10},{-L + 62} q10,6 20,0" stroke="{PELE_S}" stroke-width="4" fill="none"/>')
    return f"""<g transform="translate({x},{y}) scale({sx * escala},{escala})">
      <ellipse cx="0" cy="70" rx="160" ry="70" fill="#000" opacity=".25"/>
      <path d="M-104,0 q-14,80 -8,170 l222,0 q8,-90 -4,-170 z" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>
      {dedos}
      <path d="M106,40 q54,12 60,74 q2,30 -24,34 q-26,-30 -40,-56 z" fill="{PELE}" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M-80,40 l0,30 M-40,46 l0,26 M0,46 l0,26 M40,44 l0,26" stroke="{PELE_S}" stroke-width="4" stroke-linecap="round"/>
      <path d="M-112,150 l230,0 l10,140 l-250,0 z" fill="#27355f" stroke="{OL}" stroke-width="{SW}"/>
      <path d="M-114,166 l236,0" stroke="#3d4e85" stroke-width="10"/>
    </g>"""


def maos(modo="mesa") -> str:
    if modo == "mesa":
        corpo = mao(255, 1790, escala=1.12) + mao(825, 1790, espelho=True, escala=1.12)
    else:
        corpo = mao(825, 1790, espelho=True, escala=1.12)
    return svg(corpo, 1080, 1920)
