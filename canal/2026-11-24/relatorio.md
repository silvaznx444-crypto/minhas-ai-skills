# Psique (@explica_psique) — análise de 24/11/2026

Período do Analytics: 26/08 a 24/11/2026 (90 dias). Primeira análise do canal (não há rodada anterior para comparar).
Dados: `canal/youtube/2026-11-24/dados.json` e `dados_extra.json` (formato, dispositivos, retenção segundo a segundo).

## Resumo em 5 linhas
1. Canal com 6 dias de vida: 3 vídeos, 109 views, 5 inscritos (6 ganhos, 1 perdido). Amostra muito pequena — o que segue são sinais, não conclusões.
2. Um vídeo carrega o canal: **"Ninguém está te observando"** tem 95 das 109 views (87%), 4 dos 6 inscritos e 45% de retenção média.
3. Esse vídeo cresceu por **vídeos sugeridos** (67 de 80 views no Analytics = 84%), não por busca (5) nem por inscritos (2): o YouTube está testando o canal ao lado de vídeos de outros canais.
4. O vídeo de burnout perde o público no começo: só **38% continuam aos 17 s e 25% aos 35 s** (retenção média 21%).
5. Os 3 vídeos estão com idioma **pt-PT** (o público é 100% Brasil), 2 estão sem tags, o canal não tem palavras-chave e nenhum vídeo tem legenda.

## Números por vídeo
| Vídeo | Publicado (Brasília) | Duração | Views | Retenção média | Duração média vista | Curtidas | Inscritos ganhos |
|---|---|---|---|---|---|---|---|
| Ninguém está te observando (e a ciência prova) | sáb 21/11, 12:16 | 2:35 | 95 | 45,2% | 1:10 | 11 (11,6%) | 4 |
| Burnout: os 3 sinais que a OMS reconhece | qua 18/11, 18:31 | 2:58 | 19 | 21,0% | 0:37 | 2 (10,5%) | 2 |
| O que uma noite sem dormir faz com o seu cérebro? | seg 23/11, 18:45 | 3:00 | 8 | sem dados (1 dia) | — | 1 | — |

Mediana de views: 19. "Ninguém está te observando" está a 5× a mediana nos últimos 14 dias → **regra: não mexer no título nem na miniatura**.

Outros números do período (98 views com Analytics):
- Fontes: sugeridos 71 (72%), busca 7, "outros/sem link" 6, página do canal 5, inscritos 3, playlist 3, externo 1, notificação 1. Shorts feed: 0.
- Dispositivos: **TV 43 (44%)**, celular 33 (34%), computador 22 (22%).
- 91% das views vêm de quem não é inscrito.
- País: Brasil 100%. Idade/gênero e termos de busca: volume pequeno demais, o YouTube não liberou.

## O que funciona
- **Tema do dia a dia + experimento famoso + alívio no final.** "Ninguém está te observando" junta uma situação que todo mundo viveu (tropeçar e achar que todos viram), um experimento clássico (camiseta do Barry Manilow, Gilovich/Cornell) e uma conclusão que tranquiliza. Conversão alta: 4 inscritos em 80 views (5%), 11,6% de curtidas por view.
- **Título com promessa clara e curta** (46 caracteres): afirmação contraintuitiva + "(e a ciência prova)". Funciona melhor que o formato "lista" do burnout.
- **Retenção do holofote é boa para um canal novo**: 72% ainda assistindo aos 15 s, 54% no meio (1:02), 20% no fim. A maior queda (54% → 44%, entre 1:02 e 1:17) vem logo depois de revelar o resultado do experimento — quem veio pela "resposta" sai quando a recebe.
- **Descrições já estão boas**: gancho na 1ª linha, capítulos, fontes científicas, pergunta para comentar, aviso de saúde/CVV e 3–6 hashtags. Não precisam mudar.
- **TV como tela principal** (44%): o formato horizontal 16:9 de ~2:30–3:00 está certo para esse público. Atenção ao texto na tela: precisa ser legível de longe.

## O que não funciona (ou ainda não dá para saber)
- **Abertura do burnout**: 81% no 1º segundo → 38% aos 17 s → 25% aos 35 s. O início ("Você acorda cansado…? Não é preguiça") parece um anúncio de saúde; o público sai antes da parte da OMS. Ressalva: a curva tem ~16 pessoas, cada pessoa vale ~6 pontos.
- **Burnout teve só 4 views por sugeridos** (contra 67 do holofote). Tema "doença/diagnóstico" tende a concorrer com canais de saúde grandes; o canal vai melhor com curiosidade sobre comportamento.
- **Constância**: a descrição do canal promete "quarta e sábado", mas o 3º vídeo saiu numa segunda. Intervalos: 3 dias e 2 dias. Com 3 vídeos não dá para saber qual dia/horário rende mais — o holofote saiu sábado ao meio-dia, mas o pico pode ser do tema e não do horário.
- **Metadados**: idioma pt-PT nos 3 vídeos (o YouTube usa isso para decidir a quem mostrar), tags vazias em 2, categoria "Pessoas e blogs" em vez de "Educação", canal sem palavras-chave, nenhuma legenda (closed caption).
- **Alerta falso**: o script marcou os 3 vídeos como "Short sem #shorts" por terem até 3 min. Eles são **1920×1080 (horizontais)**, ou seja, vídeos normais. **Não** vamos colocar #shorts.
- **Não deu para medir**: CTR e impressões da miniatura (a API não devolve para este canal/período), termos de busca, idade/gênero, melhor horário. Vamos ter isso com mais 4–6 vídeos.

## Mudanças propostas (plano `canal/youtube/2026-11-24/plano.json`) — NADA APLICADO
Prévia rodada em 24/11 (`youtube.py aplicar` sem `--sim`): 4 mudanças previstas, nenhuma feita.

| Onde | Campo | Antes → Depois | Motivo |
|---|---|---|---|
| Canal | palavras-chave | (vazio) → psicologia, "saúde mental", neurociência, "comportamento humano", "psicologia explicada", cérebro, emoções, "curiosidades de psicologia", ansiedade, sono, burnout, "experimentos de psicologia", psique | Canal sem nenhuma palavra-chave |
| Ninguém está te observando | tags | (vazio) → efeito holofote, spotlight effect, ilusão de transparência, todo mundo está olhando, medo de julgamento, vergonha, ansiedade social, Thomas Gilovich, psicologia social, comportamento humano, psicologia, experimento de psicologia | Está bombando: só metadados invisíveis, título/miniatura intocados |
| Ninguém está te observando | idioma | pt-PT → pt-BR | Público 100% Brasil |
| Noite sem dormir | tags | (vazio) → noite sem dormir, privação de sono, falta de sono, sono e emoções, sono REM, amígdala, Matthew Walker, irritabilidade, cérebro, neurociência, psicologia, saúde mental | Sem tags |
| Noite sem dormir | categoria / idioma | 22 → 27 (Educação) / pt-PT → pt-BR | Título fica: 1 dia é cedo demais para julgar |
| Burnout | categoria / idioma | 22 → 27 (Educação) / pt-PT → pt-BR | Tags já boas; o problema é a abertura do vídeo, não o texto |

Não mexi em títulos nem em miniaturas nesta rodada: o único com dados suficientes é o que está bombando, e os outros dois têm 8 e 19 views.
Não incluí mudança de categoria no vídeo que está bombando, para não mexer em nada que possa influenciar a distribuição dele agora.

Para aplicar (com backup automático):
```bash
python3 .claude/skills/gestor-canal/scripts/youtube.py aplicar --plano canal/youtube/2026-11-24/plano.json --sim
```

## Para fazer à mão (a API não faz)
1. **Idioma do áudio** (a API do script só troca o idioma do título/descrição): YouTube Studio → Conteúdo → cada vídeo → Mostrar mais → *Idioma do vídeo* = **Português (Brasil)**. Faça também em Configurações → Padrões de envio → Idioma do vídeo = Português (Brasil), para os próximos.
2. **Legendas**: Studio → Legendas → em cada vídeo, confira a legenda automática em português e clique em *Publicar* (ou suba o roteiro como "transcrição"). Ajuda quem vê sem som e a busca. Como os roteiros já existem, é rápido.
3. **Constância**: escolha entre manter "quarta e sábado" e postar só nesses dias, ou trocar o texto do canal. Sugestão de texto se quiser deixar sem dias fixos: troque a linha "🧠 Novos vídeos toda quarta e sábado." por "🧠 Vídeo novo toda semana."
4. **Tela final e cards**: no holofote (o vídeo que traz gente nova), coloque a tela final apontando para "Melhor para o espectador" + botão de inscrição, e um card aos ~1:50 para o vídeo do sono. Studio → vídeo → Editor → Tela final.
5. **Playlist** "Truques da mente" (holofote + próximos de vieses) e "Corpo e mente" (sono, burnout) — Studio → Playlists. Ajuda as views por playlist e a sessão na TV.
6. **Comentário fixado** no holofote, pronto para colar:
   > Qual foi a situação em que você teve CERTEZA de que todo mundo estava olhando? A minha é tropeçar na escada rolante 😅 Próximo vídeo: por que o cérebro guarda aquele mico de 10 anos atrás.

## Instagram — o que falta configurar
O ambiente tem `IG_ACCESS_TOKEN` e `IG_USER_ID`, mas o gestor-canal ainda não foi configurado/testado para o Instagram nesta rodada. Para ativar:
1. No app da Meta (developers.facebook.com), gere o token da conta profissional do Instagram com as permissões `instagram_basic`, `instagram_content_publish`, **`instagram_manage_insights`** e **`instagram_manage_comments`**.
2. Atualize `IG_ACCESS_TOKEN` (e confira `IG_USER_ID`) nas variáveis do ambiente.
3. Teste: `python3 .claude/skills/gestor-canal/scripts/instagram_canal.py analisar --posts 3`.

## Plano de conteúdo (próximos 8 vídeos)
Fórmula que funcionou: **situação do dia a dia que dá vergonha/dúvida → experimento famoso com nome → o que isso significa para você (alívio)**. Horizontal, 2:30–3:00, animação 3D. Regras para a abertura (lição do burnout): nos primeiros 10 s mostrar a cena, não o tema; segurar a revelação do experimento até depois da metade (lição do holofote: a saída começa logo após a resposta).

| # | Título (≤ 60 caracteres) | Ideia / experimento | Por que deve funcionar |
|---|---|---|---|
| 1 | Por que você lembra daquele mico de 10 anos atrás? | Memória emocional e ruminação: a amígdala marca o que dá vergonha (liga com o vídeo do sono) | Mesmo gatilho do holofote (vergonha), continuação natural |
| 2 | O gorila que ninguém viu (teste você mesmo) | Cegueira por desatenção — Simons & Chabris, 1999. Convide o espectador a fazer o teste antes da revelação | Experimento famoso + participação: segura a retenção até o meio |
| 3 | Por que é tão difícil dizer "não"? | Conformidade — experimento das linhas de Asch, 1951 | Situação do dia a dia + experimento clássico |
| 4 | Você não é uma fraude (mesmo sentindo que é) | Síndrome do impostor — Clance & Imes, 1978 | Mesma estrutura "sensação ruim → ciência → alívio" do holofote |
| 5 | Por que a gente procrastina mesmo sabendo | Procrastinação como fuga de emoção ruim (Pychyl, Sirois) | Alto volume de busca; troca a culpa por explicação |
| 6 | Por que todo mundo acha que dirige acima da média? | Superioridade ilusória — Svenson, 1981 (93% dos americanos) | Número surpreendente logo no começo, tom leve |
| 7 | O padeiro que você nunca esquece (e o nome que esquece) | Paradoxo Baker/baker: por que esquecemos nomes | Situação universal e constrangedora, experimento pouco conhecido |
| 8 | Tropeçou na frente de todo mundo? Ninguém viu (versão curta) | **Short vertical** de 40–50 s cortado do holofote: cena da camiseta + resultado | Abre a fonte "Shorts" (hoje 0 views) e leva gente ao vídeo longo |

Sugestão de calendário: quarta 18h30 e sábado 12h (Brasília), mantendo o que o canal promete. Ideia 8 pode sair já, porque é corte de material pronto.
Nenhum vídeo foi gerado nesta rodada (sem custo). Para gerar com Veo, a skill video-ia calcula o custo antes.

## O que medir na próxima rodada
- Holofote: views por sugeridos continuam? Retenção se mantém acima de 40%?
- Sono: retenção nos primeiros 30 s (comparar com 25% do burnout) e views por sugeridos.
- Efeito das tags/idioma pt-BR (se aplicadas): views por busca (hoje 7) e termos de busca começando a aparecer.
- Primeiro dado de CTR de miniatura no Studio (Analytics → Alcance), que a API não trouxe.
- Inscritos por 100 views (hoje 6,1 no canal; 5,0 no holofote).
