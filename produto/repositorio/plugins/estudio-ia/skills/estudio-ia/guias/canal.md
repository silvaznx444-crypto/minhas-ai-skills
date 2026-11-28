# Gestão do canal (YouTube + Instagram)

Diagnóstico do canal e otimização dos vídeos que já estão no ar. Os scripts só buscam dados e aplicam
mudanças; **quem pensa é você (Claude)**: lê os dados, decide o que melhorar, escreve o plano e o relatório.
Para entender POR QUE um vídeo perdeu público, use também `estrategia.py retencao --explicar`
([estrategia.md](estrategia.md#4-retenção-dos-seus-vídeos)).

```bash
E="<pasta da skill>/scripts"   # o caminho exato está no SKILL.md
```

## O que dá e o que não dá para mudar automaticamente
| | Automático pela API | Só manual (você entrega o texto pronto) |
|---|---|---|
| YouTube | título, descrição, tags, categoria e idioma dos vídeos; descrição e palavras-chave do canal; miniatura; postar/agendar vídeo | nome do canal, @handle, banner, foto, playlists em destaque (layout) |
| Instagram | postar/agendar Reels, responder e ocultar comentários | bio, nome, link da bio, foto, **legenda de post já publicado** |

Nunca prometa ao usuário alterar o que está na coluna da direita: entregue o texto e o passo a passo.

## Rotina de análise e melhoria
1. **Coletar**
   ```bash
   python3 $E/youtube.py analisar --videos 50 --dias 90        # -> canal/youtube/<data>/dados.json
   python3 $E/instagram_canal.py analisar --posts 30           # -> canal/instagram/<data>/dados.json
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
   python3 $E/youtube.py aplicar --plano canal/youtube/<data>/plano.json        # prévia, não muda nada
   python3 $E/youtube.py aplicar --plano canal/youtube/<data>/plano.json --sim  # aplica e grava backup
   python3 $E/youtube.py reverter --backup canal/youtube/<data>/backup_XXX.json --sim
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
python3 $E/miniatura.py --prompt "close-up of the 3D cartoon police sergeant, shocked face, red background" \
  --texto "ELE NÃO NEGOCIA" --ref projetos/x/quadros/cena_01.png --saida canal/youtube/<data>/thumb_<id>.jpg
```
Olhe a imagem (Read) antes de pôr no plano (`"miniaturas": [{"id": ..., "arquivo": ...}]`). Texto ≤ 4 palavras.

## Problemas comuns
- `invalid_grant` ao renovar: refresh token revogado ou app OAuth em modo teste (expira em 7 dias) → publique
  o app na tela de consentimento e rode `autorizar` de novo.
- `quotaExceeded`: cota diária acabou; tente amanhã ou peça aumento no Google Cloud.
- Analytics 403: a conta autorizada não é dona do canal, ou faltou o escopo — refaça `autorizar`.
- Métrica do Instagram "indisponível": a Meta muda nomes de métricas entre versões; o script pula as que falham.
- Miniatura 403: canal sem verificação por telefone.

