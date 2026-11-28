# Gera o "Kit Psique" (HTML -> PDF via Chromium). Rode: python3 produtos/kit-psique/gerar_pdf.py
import html, os, subprocess, json
BASE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(BASE))
FONTS = os.path.join(ROOT, 'growkaz-stickman-studio/node_modules/@fontsource')
P = os.path.join(ROOT, 'growkaz-stickman-studio/projects')
rd = lambda p: open(p, encoding='utf-8').read().strip()
esc = lambda s: html.escape(s)

ROTEIROS = [
  ('Reels · 45 s', 'Por que ninguém ajuda quando todos estão olhando', 'Efeito espectador (Darley e Latané, 1968)', rd(f'{P}/reels-efeito-espectador/input/script.txt')),
  ('Reels · 53 s', '4 truques para as pessoas gostarem de você', 'Efeito Ben Franklin, efeito camaleão, efeito pratfall, mera exposição', rd(f'{P}/reels-truques/input/script.txt')),
  ('Reels · 60 s', 'Os 3 estilos de apego', 'Ainsworth (anos 70); Hazan e Shaver (1987)', rd(os.path.join(ROOT, 'roteiros/estilos-de-apego/narracao.txt'))),
  ('YouTube · 2:30', 'Ninguém está te observando', 'Efeito holofote (Gilovich, Medvec e Savitsky, 2000)', rd(f'{P}/efeito-holofote/input/script.txt')),
]

PROMPT = """Você é o produtor do canal [NOME DO CANAL] (YouTube) e do perfil [@SEU PERFIL] (Instagram). Crie o vídeo abaixo seguindo TODO este padrão, de forma estratégica para prender atenção, gerar comentários e crescer o canal.

📌 PEDIDO
- PLATAFORMA: [YouTube (longo) | Instagram (Reels)]
- TEMA: [tema ou pergunta]
- NARRAÇÃO: [vou mandar o áudio | escreva o roteiro primeiro]
- OBSERVAÇÕES: [opcional: personagem, cenário, referência]

1. ROTEIRO (se eu ainda não mandei o áudio)
- Português do Brasil, falando com "você", frases curtas, tom de narrador de documentário curioso.
- Duração: YouTube 2:30 a 3:00 (cerca de 450 palavras) | Reels 45 a 60 s (cerca de 130 palavras).
- Estrutura obrigatória:
  1. GANCHO (0–5 s): situação em que a pessoa se reconhece ou um teste interativo + promessa de resposta. Nada de "olá, pessoal".
  2. IDENTIFICAÇÃO: "você já…?"
  3. CIÊNCIA: estudo real (pesquisador, ano, instituição) com o dado principal. Nunca invente números.
  4. LOOPS: uma frase de suspense a cada 30–40 s ("mas o resultado mais revelador não foi esse…").
  5. VIRADA: explicação simples com uma metáfora visual.
  6. PEDIDO DE INSCRIÇÃO logo após o momento mais forte (só no YouTube).
  7. CONCLUSÃO prática + ressalva honesta (quando o estudo for pequeno ou limitado).
  8. FINAL: pergunta fácil de responder. YouTube: chamar para o próximo vídeo. Reels: "manda para alguém que…".
- Entregue também o texto do narrador limpo (só a fala) e o prompt de voz com a entonação.

2. VÍDEO
- Estilo: [boneco de palito cinematográfico | 3D cartoon com contorno], cenários detalhados com figurantes, luz de cinema.
- YouTube: 16:9, terceira pessoa. Reels: 9:16, imersivo.
- Uma cena nova a cada 3 a 5 segundos; nada parado; câmera sempre em movimento.
- Protagonista recorrente do canal: [descreva: ex. rapaz de moletom vermelho].
- Mostre a ciência de forma visual: laboratório, gráficos, cérebro, dados animados.
- Legenda palavra por palavra (branca, palavra atual em amarelo), etiquetas na tela com os dados e o nome dos cientistas.
- Som: música por clima, efeitos e ambiente sob a narração.
- Antes do render final, mostre uma folha de contato com todas as cenas e corrija o que estiver ruim.
- Ninguém atravessa objetos; nada aparece do nada; cada vídeo tem cenas próprias.

3. CAPA
- YouTube (16:9): personagem com emoção forte à ESQUERDA, símbolo do tema à DIREITA, fundo azul-marinho com brilho roxo, pergunta curta em branco com UMA palavra em amarelo e selo vermelho com o dado. Prompt em inglês + texto para o Canva.
- Reels (9:16): visão de cima, personagem no centro num foco de luz dourada, pessoas em volta na sombra azul, pergunta em branco no topo. Elementos no centro (o perfil corta em 3:4).

4. TEXTOS
- TÍTULO: tom de pergunta, até 60 caracteres. Dê 1 recomendado e 2 alternativas.
- DESCRIÇÃO do YouTube: gancho, resumo, capítulos com tempo, pergunta, convite para se inscrever, referências reais, aviso "conteúdo educativo" e 6 hashtags.
- LEGENDA do Reels: gancho, 2 ou 3 tópicos curtos, "manda para alguém que…" e 6 a 8 hashtags.
- COMENTÁRIO FIXADO: pergunta fácil com emoji.

5. POSTAGEM
- Diga o dia e a hora em que este vídeo deve ser postado, seguindo o meu cronograma.

6. REGRAS
- Fatos verificados e referências reais; se algo for incerto, diga.
- Não se apresentar como psicólogo, sem diagnóstico. Temas sensíveis com cuidado (sofrimento intenso: incluir o CVV, ligue 188).

✅ ENTREGA (nesta ordem)
1. Roteiro + texto do narrador + prompt de voz
2. Vídeo final em MP4
3. Prompt da capa + texto para o Canva
4. Título, descrição/legenda e comentário fixado
5. Dia e horário de postagem"""

VOZ = 'Narrador brasileiro, tom de documentário curioso e próximo, ritmo médio. Pausas curtas depois das perguntas e uma pausa dramática antes da revelação principal. Tom mais baixo e tenso no suspense; mais caloroso no final.'

CAPA_REELS = '''Vertical 9:16 Instagram Reels cover WITH TITLE TEXT. At the top center, render this exact text in bold clean white sans-serif uppercase letters (like Montserrat ExtraBold), in two centered lines: line 1 "[LINHA 1]", line 2 "[LINHA 2]". Directly below it, a smaller thin golden-yellow lowercase subtitle: "[subtítulo]". Keep the Portuguese accents exactly as written. The text must be sharp, perfectly spelled and easy to read.

Scene: 3D stylized cartoon render with smooth, cute Pixar-like characters, cinematic and minimal. Bird's-eye view from high above. In the exact center, [PERSONAGEM PRINCIPAL E O QUE ELE FAZ], inside a single circular pool of warm golden spotlight coming straight from above. Around, at a distance and in cool navy blue shadow, [AS PESSOAS EM VOLTA E O QUE FAZEM]. Strong contrast between the warm amber center and the cool blue surroundings, soft volumetric light, subtle film grain. Keep all main elements close to the center (the profile grid crops to 3:4). Leave the top area darker so the title stands out. No other text, no watermark.'''

CAPA_YT = '''Wide 16:9 YouTube thumbnail WITH TEXT. Minimalist cinematic stick-figure style (black stick figures with round heads and simple white dot eyes, soft rim light), dark navy background with a purple glow. LEFT: close-up of [PERSONAGEM] with a strong emotion ([EMOÇÃO]), lit by a warm spotlight. RIGHT: [SÍMBOLO DO TEMA]. On top, bold clean white sans-serif uppercase text in two lines: "[LINHA 1]" / "[LINHA 2]", with only the word "[PALAVRA]" in bright yellow. In the bottom right corner, a red rounded badge with white text "[DADO]". Keep the Portuguese accents exactly. High contrast, sharp text, no other text, no watermark.'''

def fontface(fam, w, f): return f"@font-face{{font-family:'{fam}';font-weight:{w};src:url('file://{FONTS}/{f}') format('woff2');}}"
CSS = ''.join([fontface('Fredoka', w, f'fredoka/files/fredoka-latin-{w}-normal.woff2') for w in (500, 600, 700)] + [fontface('Nunito', w, f'nunito/files/nunito-latin-{w}-normal.woff2') for w in (400, 600, 700, 800, 900)]) + """
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'Nunito',sans-serif;color:#1d1a2b;font-size:11.2pt;line-height:1.5}
.pg{width:210mm;height:297mm;padding:18mm 17mm 16mm;position:relative;page-break-after:always;overflow:hidden;background:#fbf8f3}
.pg:last-child{page-break-after:auto}
.foot{position:absolute;bottom:8mm;left:17mm;right:17mm;display:flex;justify-content:space-between;font-size:8.5pt;color:#8a8496;font-weight:700;letter-spacing:.06em}
h1{font-family:'Fredoka';font-weight:700;font-size:25pt;margin:0 0 3mm;color:#141428;line-height:1.15}
h2{font-family:'Fredoka';font-weight:600;font-size:14.5pt;margin:6mm 0 2mm;color:#3a2a7a}
.kick{font-weight:900;font-size:9pt;letter-spacing:.18em;color:#e0574a;text-transform:uppercase;margin-bottom:2mm}
p{margin:0 0 2.6mm}
ul,ol{margin:0 0 3mm;padding-left:6mm} li{margin:0 0 1.4mm}
.box{background:#fff;border:1.5px solid #e6e0ef;border-radius:10px;padding:4mm 5mm;margin:3mm 0}
.warn{background:#fff5e8;border:1.5px solid #f2c27a;border-radius:10px;padding:4mm 5mm;margin:3mm 0}
.warn b{color:#a8580a}
.code{font-family:'DejaVu Sans Mono',monospace;font-size:8.6pt;background:#16142a;color:#f2ecff;border-radius:8px;padding:3.5mm 4mm;white-space:pre-wrap;word-break:break-word;line-height:1.45;margin:2mm 0 3mm}
.small{font-size:9.6pt}
.step{display:flex;gap:4mm;margin:0 0 3.4mm}
.num{flex:0 0 9mm;height:9mm;border-radius:50%;background:#3a2a7a;color:#fff;font-family:'Fredoka';font-weight:700;display:flex;align-items:center;justify-content:center;font-size:12pt}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.pill{display:inline-block;background:#3a2a7a;color:#fff;border-radius:20px;padding:.6mm 3mm;font-weight:800;font-size:8.5pt;letter-spacing:.06em}
.script{white-space:pre-wrap;font-size:10pt;line-height:1.5}
table{border-collapse:collapse;width:100%;font-size:10pt} td,th{border-bottom:1px solid #e6e0ef;padding:2mm 2mm;text-align:left} th{color:#3a2a7a;font-family:'Fredoka';font-weight:600}
.cover{background:linear-gradient(160deg,#141428 0%,#2a1a4a 55%,#4a2a3a 100%);color:#fff;padding:0}
.cover .in{padding:24mm 18mm}
.cover h1{color:#fff;font-size:38pt;line-height:1.05;margin-top:6mm}
.cover .gold{color:#ffc94a}
.shots{display:flex;gap:4mm;margin:9mm 0 0;align-items:flex-end}
.shots img{border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.45)}
.check li{list-style:none;margin-left:-6mm} .check li:before{content:'☐  ';color:#3a2a7a;font-weight:900}
"""
def page(inner, n, title='KIT PSIQUE'): return f'<section class="pg">{inner}<div class="foot"><span>{title}</span><span>{n}</span></div></section>'
img = lambda f: f'file://{BASE}/img/{f}'
pages = []
# 1 capa
pages.append(f'''<section class="pg cover"><div class="in"><div class="kick" style="color:#ffc94a">Kit Psique</div>
<h1>Vídeos animados de <span class="gold">psicologia</span> com IA</h1>
<p style="font-size:14pt;color:#e6dcff;max-width:150mm">Guia de instalação passo a passo, o prompt universal que eu uso em todo vídeo, roteiros prontos, prompts de capa e o cronograma de postagem do meu canal.</p>
<div class="shots"><img src="{img('reels1.jpg')}" style="width:46mm"><img src="{img('reels2.jpg')}" style="width:46mm"><div style="display:flex;flex-direction:column;gap:4mm"><img src="{img('yt1.jpg')}" style="width:76mm"><img src="{img('yt3.jpg')}" style="width:76mm"></div></div>
<p style="margin-top:12mm;font-size:10pt;color:#bfb4dc">Feito pelo canal Psique · @umminutodepsique</p></div></section>''')
# 2 o que tem + requisitos
pages.append(page(f'''<div class="kick">Antes de começar</div><h1>O que vem no kit</h1>
<ul><li><b>Guia de instalação</b> do Claude Code e da skill de vídeo animado, do zero ao primeiro vídeo.</li>
<li><b>Fluxo de trabalho completo:</b> roteiro → voz → vídeo → capa → legenda → postagem.</li>
<li><b>Prompt Padrão</b> (universal): cole no começo de todo pedido de vídeo.</li>
<li><b>7 estratégias de retenção</b> que eu uso para segurar o público até o fim.</li>
<li><b>4 roteiros prontos</b> (3 Reels e 1 YouTube) com fontes científicas reais.</li>
<li><b>Prompts de capa</b> para Reels e YouTube, no modelo que funcionou no meu canal.</li>
<li><b>Cronograma de postagem</b> e <b>checklist</b> antes de publicar.</li></ul>
<h2>Do que você precisa</h2>
<ul><li>Uma assinatura do <b>Claude</b> que inclua o <b>Claude Code</b> (por exemplo, Pro ou Max). Funciona no navegador (claude.ai/code), no app ou no terminal.</li>
<li>Uma conta no <b>GitHub</b> (gratuita), se for usar o Claude Code no navegador.</li>
<li>A skill de vídeo <b>GrowKaz Stickman Studio</b>, obtida pelo canal oficial do autor (veja o aviso abaixo).</li>
<li>Um gerador de voz com IA de sua preferência, para a narração.</li>
<li>Cerca de 1 GB livre (o próprio Claude instala o resto).</li></ul>
<div class="warn"><b>Importante sobre a skill:</b> a skill GrowKaz Stickman Studio é de autoria de <b>GrowKaz</b> e <b>não está inclusa neste kit</b>. Este material ensina a instalar e a usar a skill. Obtenha-a pelo canal oficial do autor: <b>[LINK OFICIAL DA SKILL]</b>, respeitando os termos de uso dele.</div>''', 2))
# 3 instalação
def step(n, t, body): return f'<div class="step"><div class="num">{n}</div><div><b>{t}</b><br>{body}</div></div>'
pages.append(page(f'''<div class="kick">Guia de instalação</div><h1>Do zero ao primeiro vídeo</h1>
{step(1, 'Abra o Claude Code', 'No navegador, entre em <b>claude.ai/code</b> e conecte o seu GitHub. Ou, no computador, instale pelo terminal (requer Node.js 18 ou mais novo):<div class="code">npm install -g @anthropic-ai/claude-code\ncd pasta-dos-meus-videos\nclaude</div>')}
{step(2, 'Crie a pasta (ou repositório) dos vídeos', 'Crie um repositório vazio no GitHub, por exemplo <b>meus-videos</b>, e abra uma sessão do Claude Code nele. Tudo o que o Claude criar (roteiros, cenas e vídeos) fica salvo ali.')}
{step(3, 'Instale a skill pelo canal oficial', 'Siga as instruções do autor. Em geral, a instalação de plugins no Claude Code é feita com estes comandos, trocando os campos entre &lt; &gt; pelos dados que o autor fornece:<div class="code">/plugin marketplace add &lt;endereço-do-marketplace-oficial&gt;\n/plugin install growkaz-stickman@&lt;nome-do-marketplace&gt;</div>Depois, feche e abra a sessão para a skill aparecer.')}
{step(4, 'Deixe o Claude preparar o estúdio', 'No primeiro pedido de vídeo, o Claude copia o estúdio para a sua pasta e instala sozinho o que precisa: ffmpeg, pacotes do Node, um navegador Chromium sem tela e as bibliotecas de Python. Ele avisa o que está instalando. Isso acontece uma vez só.')}
{step(5, 'Teste com um vídeo curto', 'Peça: <i>"Faça um vídeo 2D de boneco de palito com esta narração, 16:9, 1080p"</i> e anexe um áudio curto de 20 a 30 segundos. Na primeira vez, peça também a <b>folha de contato</b> (uma imagem de cada cena) antes do render final.')}
<div class="box small"><b>Tempo de render:</b> num computador comum, um Reels de 1 minuto em 2D sai em poucos minutos; cenas 3D em 1080×1920 levam de 20 a 30 minutos. Na nuvem (claude.ai/code), o Claude roda tudo em segundo plano e te avisa quando terminar.</div>''', 3))
# 4 fluxo + problemas
pages.append(page(f'''<div class="kick">Fluxo de trabalho</div><h1>Como eu faço cada vídeo</h1>
<ol><li><b>Peça o roteiro</b> colando o Prompt Padrão (página 5) e escolhendo o tema.</li>
<li><b>Gere a narração</b> no seu gerador de voz com o texto do narrador e o prompt de voz que o Claude entregar.</li>
<li><b>Mande o áudio junto com o texto do roteiro.</b> Com o texto, as cenas ficam sincronizadas com a fala, frase por frase.</li>
<li><b>Peça a folha de contato</b> e corrija o que não gostou: enquadramento, expressão, texto na tela.</li>
<li><b>Render final</b> com música, efeitos e legendas.</li>
<li><b>Capa:</b> use o prompt de capa (página 12) num gerador de imagem; se errar letras, faça sem texto e escreva no Canva.</li>
<li><b>Poste</b> no horário do cronograma, com a legenda e o comentário fixado prontos.</li></ol>
<h2>Pedidos que fazem diferença na qualidade</h2>
<ul><li>"Uma cena nova a cada 3 a 4 segundos, câmera sempre em movimento."</li>
<li>"Ninguém atravessando objetos, nada aparecendo do nada."</li>
<li>"Close no rosto nos momentos de emoção e dados animados quando falar um número."</li>
<li>"Mostre a prévia antes do render final."</li></ul>
<h2>Problemas comuns</h2>
<table><tr><th>Problema</th><th>O que pedir ao Claude</th></tr>
<tr><td>Legenda fora do tempo da fala</td><td>"Realinhe a linha do tempo com o texto do roteiro e confira as pausas."</td></tr>
<tr><td>Personagem cortado na borda</td><td>"Abra o enquadramento da cena X e confira na folha de contato."</td></tr>
<tr><td>Fonte esquisita no vídeo</td><td>"Rode o doctor do estúdio e reinstale os pacotes do Node."</td></tr>
<tr><td>Render muito lento</td><td>"Renderize uma prévia em escala 0.5 e o final em segundo plano."</td></tr></table>''', 4))
# 5-6 prompt padrão
pp = PROMPT.split('\n2. VÍDEO')
pages.append(page(f'<div class="kick">Prompt Padrão</div><h1>Cole no começo de todo pedido</h1><p class="small">Troque o que está entre colchetes. É este prompt que garante o mesmo padrão em todos os vídeos.</p><div class="code">{esc(pp[0])}</div>', 5))
pages.append(page(f'<div class="kick">Prompt Padrão (continuação)</div><div class="code">{esc("2. VÍDEO" + pp[1])}</div>', 6))
# 7 retenção
pages.append(page(f'''<div class="kick">Retenção</div><h1>7 estratégias para segurar o público</h1>
<ol><li><b>Gancho interativo nos 5 primeiros segundos.</b> Um teste ("qual linha é igual?") ou uma situação em que a pessoa se reconhece.</li>
<li><b>Promessa no começo, entregue perto do fim.</b> "Fica até o final, porque eu vou te mostrar o único detalhe que…"</li>
<li><b>Micro-recompensa no meio.</b> Responda o teste do começo no meio do vídeo.</li>
<li><b>Frase de suspense a cada 30–40 s.</b> "Mas o resultado mais assustador não veio dessa sala."</li>
<li><b>Pedido de inscrição depois do momento mais forte,</b> nunca no começo.</li>
<li><b>Ritmo visual:</b> cena nova a cada 3–4 s, close nas emoções, números animados, um congelamento de cena no clímax.</li>
<li><b>Final sem despedida longa:</b> pergunta fácil para comentar + chamada para o próximo vídeo + tela final.</li></ol>
<h2>Prompt de voz (modelo)</h2><div class="code">{esc(VOZ)}</div>''', 7))
# 8+ roteiros
n = 8
for a, b, c, d in ROTEIROS:
    fs = '10pt' if len(d) < 1500 else '9.4pt'
    blk = f'<div class="box"><span class="pill">{esc(a)}</span><h2 style="margin-top:2mm">{esc(b)}</h2><p class="small" style="color:#6a6480">Base científica: {esc(c)}</p><div class="script" style="font-size:{fs}">{esc(d)}</div></div>'
    pages.append(page(f'<div class="kick">Roteiros prontos</div>{blk}', n)); n += 1
# capas
pages.append(page(f'''<div class="kick">Capas</div><h1>Prompts de capa</h1>
<h2>Reels (9:16): visão de cima com foco de luz</h2><div class="code">{esc(CAPA_REELS)}</div>
<h2>YouTube (16:9): emoção à esquerda, símbolo à direita</h2><div class="code">{esc(CAPA_YT)}</div>
<p class="small"><b>Exemplo de texto:</b> "VOCÊ SEGUIRIA / O GRUPO?" com "GRUPO" em amarelo e selo "75% CEDERAM".</p>''', n)); n += 1
# cronograma + checklist
pages.append(page(f'''<div class="kick">Postagem</div><h1>Cronograma e checklist</h1>
<table><tr><th>Plataforma</th><th>Quando</th></tr>
<tr><td>YouTube (vídeos de 2 a 3 min)</td><td>Segunda, quarta e sábado. Dias de semana às 18h45; sábado às 11h30.</td></tr>
<tr><td>Instagram (Reels independentes)</td><td>No máximo 1 por dia, alternando 12h e 20h; domingo às 14h.</td></tr></table>
<p class="small" style="margin-top:2mm">É o cronograma do meu canal. Depois de algumas semanas, olhe as estatísticas e ajuste para o horário do seu público.</p>
<h2>Checklist antes de publicar</h2>
<ul class="check"><li>O gancho aparece nos 2 primeiros segundos, sem introdução.</li><li>Legendas no tempo da fala, sem palavra cortada.</li>
<li>Nenhum personagem cortado na borda nem atravessando objetos.</li><li>Todo número citado aparece na tela e confere com a fonte.</li>
<li>Capa legível no celular (título com até 4 palavras).</li><li>Título em forma de pergunta, com até 60 caracteres.</li>
<li>Legenda com gancho, 2 ou 3 tópicos, chamada para comentar e hashtags.</li><li>Comentário fixado pronto para colar logo depois de postar.</li>
<li>Referências reais na descrição e aviso de conteúdo educativo.</li></ul>''', n)); n += 1
# créditos
pages.append(page(f'''<div class="kick">Créditos e licenças</div><h1>Créditos</h1>
<ul><li><b>GrowKaz Stickman Studio</b> (skill de vídeo): autoria de GrowKaz. Não incluída neste kit; obtenha pelo canal oficial e siga os termos do autor.</li>
<li><b>Claude e Claude Code</b>: produtos da Anthropic; uso conforme a sua assinatura.</li>
<li><b>Personagens 3D KayKit</b> (Kay Lousberg): licença CC0 (domínio público).</li>
<li><b>Fontes Fredoka, Nunito e Playfair Display</b>: licença SIL Open Font.</li>
<li><b>Three.js</b>: licença MIT.</li></ul>
<div class="box small">Os roteiros deste kit citam estudos reais e são modelos: adapte com as suas palavras e confira as fontes antes de publicar. O conteúdo é educativo e não substitui acompanhamento psicológico. Este kit não é afiliado à Anthropic nem ao autor da skill.</div>
<p style="margin-top:10mm;font-family:Fredoka;font-weight:600;font-size:16pt;color:#3a2a7a">Bons vídeos! Me marca quando postar: @umminutodepsique</p>''', n))

out_html = os.path.join(BASE, 'kit-psique.html')
open(out_html, 'w', encoding='utf-8').write(f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Kit Psique</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch({{executablePath:process.env.CHROMIUM_PATH||'/opt/pw-browsers/chromium'}});const p=await b.newPage();await p.goto('file://{out_html}');await p.evaluate(()=>document.fonts.ready);await p.pdf({{path:'{os.path.join(BASE, "Kit_Psique.pdf")}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close();}})();"""
subprocess.run(['node', '-e', js], check=True, cwd=os.path.join(ROOT, 'growkaz-stickman-studio'))
print('ok', len(pages), 'páginas')
