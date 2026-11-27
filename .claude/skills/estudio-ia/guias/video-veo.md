# Alternativa: vídeo gerado por IA (Gemini + Veo + ffmpeg)

> **O padrão do canal é o vídeo 3D construído por código: veja [video-3d.md](video-3d.md).** Use este pipeline
> só quando o usuário pedir explicitamente um vídeo gerado por IA (Veo), por exemplo uma cena realista com fala e
> lip-sync que o 3D não faz. Ele custa ~US$ 3,20 por clipe de 8 s.

Pipeline em `scripts/videoia.py`. Cada etapa grava em `projetos/<nome>/` e pula o que já existe,
então dá para corrigir uma cena e rodar de novo sem pagar tudo outra vez.
Credenciais: [configuracao.md](configuracao.md). Publicar: [publicar.md](publicar.md).

## Fluxo recomendado (quando o Claude conduz)
1. Pergunte só o essencial: ideia/história, nº de cenas (cada uma = 8 s), **formato** (9:16 vertical para
   Reels/Shorts/TikTok, o padrão; 16:9 horizontal para vídeo do YouTube), estilo se diferente do padrão
   (3D cartoon cel-shaded com contorno preto).
2. **Escreva você mesmo o `storyboard.json`** (melhor que o `planejar` automático) seguindo o formato abaixo.
   Regras: ≤ ~18 palavras de fala por cena; descrições visuais em inglês, concretas e repetidas
   igualzinho em todas as cenas; falas em português do Brasil. Antes, leia `canal/aprendizados.md` (se existir):
   são as regras de roteiro que a análise de retenção do canal já descobriu (gancho, ritmo, o que faz sair).
3. Rode `referencias` e `quadros`, **olhe as imagens** (Read) e regere com `--cena N --refazer` o que estiver ruim.
   Imagem é barata; vídeo é caro — acerte os quadros antes.
4. Mostre o custo estimado ao usuário e, com o ok dele, rode `clipes --sim`.
5. `legendas` e `montar`. Extraia alguns frames do `final.mp4` para conferir e entregue o arquivo.
6. Opcional, antes de postar: peça uma segunda opinião à Gemini, que assiste ao vídeo pronto:
   `python3 .claude/skills/estudio-ia/scripts/estrategia.py analisar-video --arquivo projetos/<nome>/final.mp4`
   (gancho, momentos de risco, nota). Corrija o que for barato de corrigir, como corte, legenda e ordem das cenas.

## Formato vertical ou horizontal
- `"formato": "9:16"` (padrão) → 1080x1920 para Reels/Shorts/TikTok. `"formato": "16:9"` → 1920x1080 para YouTube.
- Vai no `storyboard.json` ou na linha de comando (`--formato 16:9`, que vence o do storyboard). O formato vale para
  os cenários, os quadros, o Veo, as legendas (letra menor e mais baixa no 16:9) e a montagem.
- Personagens continuam em folha 3:4. Ao trocar o formato de um projeto já começado, rode `referencias --refazer`
  (só os cenários mudam) e `quadros --refazer`.
- Na câmera do 16:9, prefira planos abertos com o personagem fora do centro, onde sobra espaço para a ação.
  Vídeo longo do YouTube = muitas cenas: um vídeo de 3 min tem ~22 clipes de 8 s (veja o custo antes!).

## Estilos prontos (presets) — use SEMPRE que o usuário quiser "o estilo do vídeo de referência"
Texto só não basta para acertar o visual: a IA de imagem precisa VER o estilo. Cada pasta em `estilos/`
tem `estilo.txt` (descrição detalhada) e `ref_*.png` (quadros de referência sem legenda), enviados
automaticamente em toda imagem gerada (referências, quadros).
- `policial-pov`: o vídeo de referência do usuário — 3D tipo jogo indie, bonecos simples de cabeça grande,
  olhos de pálpebra caída, lente grande-angular em primeira pessoa com rádio na mão.
- Usar: no storyboard.json coloque `"estilo_preset": "policial-pov"` (o texto de `estilo` é substituído pelo
  do preset ao carregar; para manter um texto próprio use `"estilo_personalizado": true`), ou
  `planejar --preset policial-pov`. Extras: `"estilo_refs": ["caminho/img.png"]`.
- Trocar o estilo de um projeto já começado: ponha o preset e rode `referencias --refazer` e `quadros --refazer`.
- **Antes de gerar clipes, compare (Read) cada quadro com os `ref_*.png` do preset.** Se parecer ilustração 2D,
  câmera reta/chapada ou proporções realistas, regere aquele quadro. Não gaste Veo com quadro fora do estilo.
- Novo estilo a partir de um vídeo do usuário: extraia 2–4 quadros variados com ffmpeg, corte (crop) a área
  das legendas em vez de borrar, salve em `estilos/<nome>/ref_N_*.png`, escreva `estilo.txt` descrevendo
  render, proporções, olhos, cabelo, paleta, luz e lente; faça commit.

## Comandos
```bash
S=.claude/skills/estudio-ia/scripts/videoia.py
python3 $S tudo --projeto projetos/rocha --ideia "..." --cenas 3 --sim   # tudo automático
python3 $S tudo --projeto projetos/sono --ideia "..." --cenas 6 --formato 16:9 --sim   # horizontal (YouTube)
python3 $S planejar    --projeto projetos/rocha --ideia "..." --cenas 3
python3 $S referencias --projeto projetos/rocha
python3 $S quadros     --projeto projetos/rocha [--cena 2 --refazer]
python3 $S clipes      --projeto projetos/rocha --sim [--rapido] [--cena 2 --refazer]
python3 $S legendas    --projeto projetos/rocha [--palavras 3]
python3 $S montar      --projeto projetos/rocha [--musica trilha.mp3]
```
Opções úteis: `--resolucao 1080p|720p|4k`, `--sem-quadro` (Veo só por texto), `--sem-legenda`,
`--modelo-video veo-...` para forçar um modelo.

## Formato do storyboard.json
```json
{
  "titulo": "Sem troca",
  "formato": "9:16",
  "estilo": "Stylized 3D cartoon animation, cel-shaded with thick black outlines, ...",
  "personagens": [
    {"id": "rocha", "nome": "Rocha", "cor_legenda": "#FFFFFF",
     "descricao": "tall Black Brazilian police sergeant, about 50, short gray buzz cut hair, gray stubble, heavy-lidded tired eyes, navy blue uniform, black tactical vest with white name patch 'ROCHA'",
     "voz": "deep calm male voice, Brazilian Portuguese, firm and tired"},
    {"id": "chefe", "nome": "Chefe do morro", "cor_legenda": "#FF3B3B",
     "descricao": "unseen, only heard on the radio", "voz": "young raspy male voice, Rio de Janeiro slang, menacing"}
  ],
  "cenarios": [
    {"id": "delegacia", "descricao": "police station operations room, Brazilian flag on a pole, large wall map titled 'MORRO DO CASCALHO', cork board, fluorescent ceiling lights, light blue walls, white tile floor, wooden desks"}
  ],
  "cenas": [
    {"cenario": "delegacia", "personagens": ["rocha"],
     "camera": "first-person POV, my hand holding a black walkie-talkie in the lower right, Rocha standing in front of me",
     "acao": "Rocha crosses his arms and stares at the camera, unimpressed",
     "audio": "quiet office hum, radio static",
     "falas": [{"personagem": "rocha", "texto": "Não tem troca. Polícia não negocia com vagabundo."}],
     "cortar_inicio": 0, "cortar_fim": 0}
  ]
}
```
- `via_radio: true` numa fala faz o Veo gerar a voz saindo do rádio, com chiado.
- `fora_de_cena: true` numa fala: voz de quem segura a câmera em primeira pessoa (não aparece na imagem).
- POV como na referência: descreva em `camera` a mão do protagonista (manga, objeto que segura) no canto
  inferior direito em TODAS as cenas, personagem de corpo inteiro a ~2 m, lente grande-angular. Nada de closes.
- `cortar_inicio` / `cortar_fim` (segundos) aparam sobras do clipe na montagem.

## Problemas comuns
- **Veo não devolveu vídeo / filtro de segurança**: suavize palavras de violência explícita no prompt,
  ou gere a cena sem quadro (`--sem-quadro`).
- **HTTP 400 em parâmetros**: o script tenta sozinho sem `resolution`; senão use `--resolucao ''`.
- **Download do vídeo bloqueado no ambiente cloud**: o vídeo pode vir de outro host do Google;
  adicione o host que aparecer no erro à rede do ambiente.
- **Veo escreveu legenda/texto falso no vídeo** (caixinha escura com palavras sem sentido): confira cada clipe
  extraindo quadros (`fps=4`, recorte da metade de baixo). Se a área tiver fundo simples e o personagem estiver
  parado, cubra com um pedaço limpo do próprio clipe de um instante antes:
  `ffmpeg -ss T_LIMPO -i clip.mp4 -frames:v 1 limpo.png` e depois
  `[1:v]crop=W:H:X:Y[p];[0:v][p]overlay=X:Y:enable='between(t,INI,FIM)'` (guarde o original em `v1/`).
  Se o texto cobrir rosto/ação, regere o clipe (`--cena N --refazer`).
- **Filtro de segurança do Veo** (`raiMediaFilteredReasons`, não é cobrado): tente de novo; se repetir, deixe
  explícito "adult man" na descrição e use um nome neutro no campo `nome` (ex.: figura religiosa → "the Teacher");
  a legenda não muda, pois usa o texto da fala.
- **Legenda fora de sincronia**: ajuste `cortar_*` ou rode `legendas --sem-alinhamento`.
- Custos de referência (confira a tabela do Google): Veo ~US$0,40/s, Veo fast ~US$0,15/s;
  clipe de 8 s ≈ US$3,20 / US$1,20.

