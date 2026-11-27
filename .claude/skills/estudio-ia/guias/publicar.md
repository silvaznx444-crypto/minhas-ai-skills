# Embalar, publicar e agendar (YouTube + Instagram)

```bash
E=.claude/skills/estudio-ia/scripts
```

## 1. Embalagem (antes de postar)
O título e a miniatura decidem se alguém clica. Leia `canal/aprendizados.md` e a estratégia mais recente
(`canal/estrategia/*/estrategia.md`) antes de escrever.
- **3 títulos** diferentes (curiosidade, benefício, conflito), cada um com ≤ 60 caracteres e a palavra-chave no começo.
  Recomende um e diga por quê. Nada de promessa que o vídeo não cumpre.
- **Miniatura** (vídeo horizontal): faça 2 opções com `miniatura.py` (ver [canal.md](canal.md#miniaturas)), olhe as
  duas (Read) e escolha. Texto com ≤ 4 palavras que **complementa** o título (não repete).
  Shorts não usam miniatura personalizada: o 1º quadro precisa funcionar como capa.
- **Descrição**: as 2 primeiras linhas repetem o gancho e a palavra-chave; depois, resumo, fontes/estudos citados,
  **capítulos** para vídeos com mais de 2 min (`0:00 Título`; o 1º sempre em 0:00, no mínimo 3, cada um com ≥ 10 s)
  e 3–5 hashtags. Shorts: `#shorts` na descrição.
- **Tags**: 8–15, da mais específica para a mais ampla. Use os termos de busca reais de `youtube.py analisar`.
- **Comentário fixado**: uma pergunta que dê vontade de responder (ex.: "Qual é o seu: 1, 2 ou 3?").
- Salve tudo em `projetos/<nome>/legenda.txt` (descrição) e `projetos/<nome>/publicacao.json`
  (`{"titulo": ..., "titulos_alternativos": [...], "tags": [...], "comentario_fixado": ...}`).

## 2. Postar
```bash
# YouTube: vídeo longo ou Shorts (o YouTube agenda sozinho com --agendar, não precisa de agendamento do lado de cá)
python3 $E/youtube.py postar --video "growkaz-stickman-studio/projects/<slug>/out/<título>.mp4" --titulo "Título" \
  --descricao-arquivo projetos/x/legenda.txt --tags "tag1,tag2" [--agendar 2026-11-25T18:45:00-03:00] \
  [--miniatura canal/.../thumb.jpg] [--categoria 27]
# Instagram Reels (na hora)
python3 $E/instagram.py postar --video projetos/x/final.mp4 --legenda-arquivo projetos/x/legenda_instagram.txt
```
- Categoria: 27 = Educação, 24 = Entretenimento, 1 = Animação, 22 = Pessoas e blogs.
- `youtube.py postar` marca o vídeo como **conteúdo sintético/alterado** (exigência do YouTube para IA realista).
  Só use `--sem-aviso-ia` em animação claramente não realista, e avise o usuário.
- Legenda do Instagram é outra: gancho em ≤ 125 caracteres, chamada para comentar e 3–6 hashtags.
- `youtube.py postar` já marca o vídeo como sintético. No 3D construído (animação claramente não realista),
  `--sem-aviso-ia` é aceitável: avise o usuário.
- Depois de postar, anote em `canal/jornada.md` o link e a data, e agende a checagem de 48 h
  (etapa 9 do passo a passo do [SKILL.md](../SKILL.md)).

## 3. Postar no Instagram no horário pedido
Quando o usuário disser algo como "gera X e posta às 19h":
1. Gere o vídeo e mostre frames/arquivo; escreva a legenda (gancho + 3–6 hashtags)
   e salve em `projetos/<nome>/legenda.txt`.
2. **Horário em até ~23h:** `python3 $E/instagram.py preparar --video projetos/<nome>/final.mp4 --legenda-arquivo projetos/<nome>/legenda.txt`
   → devolve `creation_id` (o vídeo já fica no Instagram, sem publicar; vale 24h).
   Agende com `send_later` (horário com fuso, ex. `2026-11-23T19:00:00[America/Sao_Paulo]`) a mensagem:
   "Publicar no Instagram: python3 .claude/skills/estudio-ia/scripts/instagram.py publicar --id <creation_id> e avisar o link."
   Não depende do container continuar vivo.
3. **Mais de 23h à frente:** faça commit do `storyboard.json` + `legenda.txt` e crie um agendamento
   (`create_trigger` com `run_once_at` ~1h antes, `create_new_session_on_fire: true`) cujo prompt completo
   manda: rodar o pipeline `tudo --sim` no projeto e depois `instagram.py postar`.
4. Confirme ao usuário: horário (fuso de Brasília por padrão), legenda e custo estimado.
- Sempre `America/Sao_Paulo` se o usuário não disser o fuso.
- Token de usuário do sistema não expira; só o de apps antigos (60 dias) precisa de `instagram.py renovar`.

## 4. Rodar sozinho toda semana
Se o usuário pedir, crie um agendamento (`create_trigger`, `create_new_session_on_fire: true`, horário de
Brasília) com o prompt completo: "Use o agente agente-youtube: rode a etapa 9 (pós-publicação) para os vídeos
da última semana e a rotina de análise e melhoria do canal (YouTube e Instagram), aplique as mudanças seguras
com backup [ou: só proponha], atualize canal/aprendizados.md e canal/jornada.md, faça commit e me mande o resumo."
Para gerar e postar vídeos sozinho, inclua no prompt o orçamento máximo por semana.
