---
name: gestor-canal
description: Gestor de canal do YouTube e Instagram — puxa métricas pelas APIs oficiais, diagnostica o que melhorar (títulos, descrições, tags, miniaturas, bio, legendas, horários, formatos que dão certo), aplica as mudanças com backup e desfazer, responde comentários, cria vídeos 3D com a skill video-ia e posta/agenda no YouTube Shorts e no Instagram. Use quando o usuário pedir para analisar, otimizar, melhorar ou cuidar do canal/perfil, ou para gerar e postar vídeos.
---

# Gestor de canal (YouTube + Instagram)

Scripts em `.claude/skills/gestor-canal/scripts/`. Os scripts só buscam dados e aplicam mudanças; **quem
pensa é você (Claude)**: lê os dados, decide o que melhorar, escreve o plano e o relatório.

```bash
G=.claude/skills/gestor-canal/scripts
V=.claude/skills/video-ia/scripts
```

## O que dá e o que não dá para mudar automaticamente
| | Automático pela API | Só manual (você entrega o texto pronto) |
|---|---|---|
| YouTube | título, descrição, tags, categoria e idioma dos vídeos; descrição e palavras-chave do canal; miniatura; postar/agendar vídeo | nome do canal, @handle, banner, foto, playlists em destaque (layout) |
| Instagram | postar/agendar Reels, responder e ocultar comentários | bio, nome, link da bio, foto, **legenda de post já publicado** |

Nunca prometa ao usuário alterar o que está na coluna da direita: entregue o texto e o passo a passo.

## Configuração (uma vez)
**YouTube** (Google Cloud — pode ser o mesmo projeto do video-ia):
1. console.cloud.google.com → APIs e serviços → ativar **YouTube Data API v3** e **YouTube Analytics API**.
2. Tela de consentimento OAuth → tipo *Externo* → adicionar o próprio e-mail em *Usuários de teste*
   (e depois *Publicar app*, senão o token expira em 7 dias).
3. Credenciais → Criar → **ID do cliente OAuth** → tipo **App para computador**. Anote ID e chave secreta.
4. No computador do usuário: `export YT_CLIENT_ID=... YT_CLIENT_SECRET=...` e `python3 $G/youtube.py autorizar`
   → abre o link, entra com a conta dona do canal, cola o endereço de volta → recebe `YT_REFRESH_TOKEN`.
5. Salvar `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` nas variáveis do ambiente.
   Hosts: `oauth2.googleapis.com`, `www.googleapis.com`, `youtubeanalytics.googleapis.com`, `i.ytimg.com`.
6. Teste: `python3 $G/youtube.py conta`.
- Cota grátis: ~10.000 unidades/dia. Editar vídeo = 50, envio de vídeo ≈ 1.600 (confira a tabela atual).
  Não edite mais que ~40 vídeos por dia.
- Miniatura personalizada exige canal verificado (youtube.com/verify).

**Instagram**: as mesmas variáveis do video-ia (`IG_ACCESS_TOKEN`, `IG_USER_ID`), com as permissões extras
`instagram_manage_insights` e `instagram_manage_comments` no token. Teste: `python3 $G/instagram_canal.py analisar --posts 3`.

## Rotina de análise e melhoria
1. **Coletar**
   ```bash
   python3 $G/youtube.py analisar --videos 50 --dias 90        # -> canal/youtube/<data>/dados.json
   python3 $G/instagram_canal.py analisar --posts 30           # -> canal/instagram/<data>/dados.json
   ```
   Leia os `dados.json` inteiros. Cada vídeo/post já vem com `alertas` automáticos — use como ponto de partida,
   não como conclusão.
2. **Diagnosticar** — responda com números:
   - O que funciona: top 20% por views e por retenção (`averageViewPercentage`). Tema, formato, duração,
     gancho dos primeiros 3 s, horário e dia. O que os piores têm em comum.
   - Fontes de tráfego (busca, Shorts feed, sugeridos, externo) e termos de busca → palavras-chave reais.
   - Constância: intervalo entre posts; dias/horários com mais views (converta UTC para Brasília, −3 h).
   - Títulos: gancho/curiosidade, palavra-chave no começo, ≤ 60 caracteres para não cortar no celular.
   - Descrições: 2 primeiras linhas fortes, palavras-chave, links, 3–5 hashtags; Shorts com `#shorts`.
   - Canal: descrição (o que é, para quem, frequência, chamada para inscrever), palavras-chave.
   - Instagram: bio (quem é, o que entrega, chamada + link), gancho da legenda ≤ 125 caracteres,
     chamada para ação, 3–6 hashtags, Reels vs. carrossel, horários.
3. **Escrever** em `canal/<data>/`:
   - `relatorio.md`: resumo em 5 linhas, o que funciona, o que não funciona, mudanças feitas, textos
     prontos para colar (bio do Instagram, legendas), e um **plano de conteúdo** de 5–10 ideias de vídeos 3D
     baseadas no que já deu certo.
   - `canal/youtube/<data>/plano.json` no formato do topo de `youtube.py` (com `motivo` em cada vídeo).
4. **Aplicar com segurança**
   ```bash
   python3 $G/youtube.py aplicar --plano canal/youtube/<data>/plano.json        # prévia, não muda nada
   python3 $G/youtube.py aplicar --plano canal/youtube/<data>/plano.json --sim  # aplica e grava backup
   python3 $G/youtube.py reverter --backup canal/youtube/<data>/backup_XXX.json --sim
   ```
   Regras:
   - Mostre a prévia ao usuário e aplique só com o ok dele — **exceto** se ele já autorizou o modo automático
     (ex.: "pode aplicar sozinho"); mesmo assim, só mudanças de texto/miniatura e sempre com backup.
   - **Não mexa no título nem na miniatura de vídeos que estão bombando** (views acima de 2× a mediana nos
     últimos 14 dias): mudar pode derrubar o alcance. Melhore só a descrição/tags deles.
   - No máximo ~10 vídeos por rodada, priorizando os com mais impressões e pior retenção/CTR; reavalie
     na rodada seguinte (compare com o `dados.json` anterior) e reverta o que piorou.
   - Nunca coloque promessas falsas, clickbait enganoso ou hashtags sem relação.
   - Faça commit de `relatorio.md`, `plano.json` e `backup_*.json` (o container é apagado depois).
5. **Comentários do Instagram** (opcional): `instagram_canal.py comentarios` → escreva respostas curtas, no
   tom do canal, e mande com `responder`. Spam/ofensa: `ocultar`. Mostre as respostas ao usuário antes,
   a não ser que ele tenha liberado o modo automático.

## Miniaturas
```bash
python3 $G/miniatura.py --prompt "close-up of the 3D cartoon police sergeant, shocked face, red background" \
  --texto "ELE NÃO NEGOCIA" --ref projetos/x/quadros/cena_01.png --saida canal/youtube/<data>/thumb_<id>.jpg
```
Olhe a imagem (Read) antes de pôr no plano (`"miniaturas": [{"id": ..., "arquivo": ...}]`). Texto ≤ 4 palavras.

## Criar vídeo 3D e postar
1. Escolha a ideia no plano de conteúdo (ou a do usuário) e siga a skill **video-ia**
   (`.claude/skills/video-ia/SKILL.md`): storyboard → quadros (confira) → custo → clipes → legendas → montar.
   O estilo padrão já é 3D cartoon; use `estilo_preset` se o canal tiver uma identidade (ex. `policial-pov`).
2. Escreva título (≤ 60 caracteres, com gancho), descrição/legenda e hashtags com base no que funciona no canal.
3. Postar:
   ```bash
   # YouTube Shorts (agenda nativa do YouTube: não precisa de agendamento do lado de cá)
   python3 $G/youtube.py postar --video projetos/x/final.mp4 --titulo "Título #shorts" \
     --descricao-arquivo projetos/x/legenda.txt --tags "tag1,tag2" [--agendar 2026-11-25T19:00:00-03:00] \
     [--miniatura canal/.../thumb.jpg]
   # Instagram Reels
   python3 $V/instagram.py postar --video projetos/x/final.mp4 --legenda-arquivo projetos/x/legenda.txt
   ```
   Instagram em horário futuro: veja "Postar no Instagram no horário pedido" no SKILL.md do video-ia.
   - `youtube.py postar` marca o vídeo como **conteúdo sintético/alterado** (exigência do YouTube para IA
     realista). Só use `--sem-aviso-ia` em animação claramente não realista, e avise o usuário.
   - Mostre custo do Veo e peça ok antes de gerar, a não ser que o usuário tenha liberado um orçamento.

## Rodar sozinho toda semana
Se o usuário pedir, crie um agendamento (`create_trigger`, `create_new_session_on_fire: true`, horário de
Brasília) com o prompt completo: "Use o agente gestor-de-canal: rode a rotina de análise e melhoria do
gestor-canal (YouTube e Instagram), aplique as mudanças seguras com backup [ou: só proponha], compare com a
análise anterior, faça commit e me mande o resumo." Para gerar e postar vídeos sozinho, inclua o orçamento
máximo por semana no prompt.

## Problemas comuns
- `invalid_grant` ao renovar: refresh token revogado ou app OAuth em modo teste (expira em 7 dias) → publique
  o app na tela de consentimento e rode `autorizar` de novo.
- `quotaExceeded`: cota diária acabou; tente amanhã ou peça aumento no Google Cloud.
- Analytics 403: a conta autorizada não é dona do canal, ou faltou o escopo — refaça `autorizar`.
- Métrica do Instagram "indisponível": a Meta muda nomes de métricas entre versões; o script pula as que falham.
- Miniatura 403: canal sem verificação por telefone.
