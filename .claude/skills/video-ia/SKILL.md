---
name: video-ia
description: Cria vídeos curtos verticais (Reels/TikTok/Shorts) com IA de ponta a ponta — roteiro, personagens consistentes, clipes do Google Veo com fala e lip-sync, legendas coloridas por personagem e montagem final 1080x1920. Use quando o usuário pedir para fazer/gerar um vídeo, animação, cena com diálogo, ou "vídeo igual a este".
---

# Vídeo com IA (Gemini + Veo + ffmpeg)

Pipeline em `scripts/videoia.py`. Cada etapa grava em `projetos/<nome>/` e pula o que já existe,
então dá para corrigir uma cena e rodar de novo sem pagar tudo outra vez.

## Pré-requisitos
- Chave da Gemini API com faturamento (aistudio.google.com → Get API key).
  - No ambiente cloud: salve em *Network secrets* para o host `generativelanguage.googleapis.com`,
    header `x-goog-api-key`; ou como variável de ambiente `GEMINI_API_KEY`.
  - Na máquina local: `export GEMINI_API_KEY=...`
- `ffmpeg` com libass e `pip install requests`.
- Teste: `python3 scripts/videoia.py modelos` (mostra os modelos escolhidos automaticamente).

## Fluxo recomendado (quando o Claude conduz)
1. Pergunte só o essencial: ideia/história, nº de cenas (cada uma = 8 s), estilo se diferente do padrão
   (3D cartoon cel-shaded com contorno preto).
2. **Escreva você mesmo o `storyboard.json`** (melhor que o `planejar` automático) seguindo o formato abaixo.
   Regras: ≤ ~18 palavras de fala por cena; descrições visuais em inglês, concretas e repetidas
   igualzinho em todas as cenas; falas em português do Brasil.
3. Rode `referencias` e `quadros`, **olhe as imagens** (Read) e regere com `--cena N --refazer` o que estiver ruim.
   Imagem é barata; vídeo é caro — acerte os quadros antes.
4. Mostre o custo estimado ao usuário e, com o ok dele, rode `clipes --sim`.
5. `legendas` e `montar`. Extraia alguns frames do `final.mp4` para conferir e entregue o arquivo.

## Comandos
```bash
S=.claude/skills/video-ia/scripts/videoia.py
python3 $S tudo --projeto projetos/rocha --ideia "..." --cenas 3 --sim   # tudo automático
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
- `cortar_inicio` / `cortar_fim` (segundos) aparam sobras do clipe na montagem.

## Problemas comuns
- **Veo não devolveu vídeo / filtro de segurança**: suavize palavras de violência explícita no prompt,
  ou gere a cena sem quadro (`--sem-quadro`).
- **HTTP 400 em parâmetros**: o script tenta sozinho sem `resolution`; senão use `--resolucao ''`.
- **Download do vídeo bloqueado no ambiente cloud**: o vídeo pode vir de outro host do Google;
  adicione o host que aparecer no erro à rede do ambiente.
- **Legenda fora de sincronia**: ajuste `cortar_*` ou rode `legendas --sem-alinhamento`.
- Custos de referência (confira a tabela do Google): Veo ~US$0,40/s, Veo fast ~US$0,15/s;
  clipe de 8 s ≈ US$3,20 / US$1,20.
