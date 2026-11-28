# Análises estratégicas (nicho, concorrentes, vídeos de referência, retenção)

`estrategia.py` coleta e mede; **a estratégia quem escreve é você (Claude)**, lendo os JSON inteiros.
A Gemini só entra para ASSISTIR vídeos (imagem e áudio), coisa que você não consegue fazer.

```bash
E="<pasta da skill>/scripts"   # o caminho exato está no SKILL.md
```
Tudo vai para `canal/estrategia/<data>/`. Os dados brutos (`dados_*.json`) ficam fora do git. As análises de
vídeo (`video_*.json`), de retenção (`retencao_*.json`) e o seu `estrategia.md` entram no commit.

## 1. Nicho: o que está bombando e quem domina
```bash
python3 $E/estrategia.py nicho --termo "psicologia" --termo "curiosidades da mente" [--dias 180] \
  [--duracao short|medium|long] [--min-views 1000] [--idioma pt]
```
- Use de 2 a 4 termos: o tema amplo, 1 ou 2 subtemas e o jeito que o público pesquisa. Cada termo custa 100 de cota.
- **Outlier** (`x_media_do_canal`) = views do vídeo ÷ média de views por vídeo do próprio canal. Um outlier de 5x ou mais
  num canal pequeno mostra que o **tema ou o título** furou a bolha, não o tamanho do canal. É o sinal mais forte.
- `mais_rapidos` (views por dia) mostra o que está crescendo agora. `canais_pequenos_que_bombaram` mostra o que um canal
  novo consegue alcançar, e é o melhor espelho para um canal pequeno.
- `resumo.titulos_outliers`: tamanho, % de perguntas, números, "você" e palavras mais usadas nos títulos que deram certo.
- `duracao_dos_outliers` responde se o nicho premia Shorts ou vídeos de 8, 15 ou 20 minutos.
- A busca mistura idiomas, e o script descarta pelo título o que não é português. Ainda assim, confira e ignore os vídeos
  que não forem do nicho, porque a busca do YouTube puxa muita coisa sem relação.

## 2. Concorrente: o que funciona num canal específico
```bash
python3 $E/estrategia.py concorrente --canal "https://youtube.com/channel/UC..." [--videos 50]
```
- Aceita link, `@handle` ou ID `UC...`. **Prefira o `canal_id` que veio do `nicho`**, porque um handle parecido pode
  ser de outro canal. Confira o nome e os inscritos que o script imprime.
- `bombaram` (≥ 2x a mediana recente) e `floparam` (≤ metade): compare os temas, os títulos e a duração dos dois grupos.
  A diferença entre eles é a lição.
- `dias_entre_videos_mediana`, `horarios_brasilia` e `curtos_vs_longos` mostram a frequência, o horário e o formato.

## 3. Vídeo de referência: engenharia reversa com a Gemini
```bash
python3 $E/estrategia.py analisar-video --url https://youtu.be/XXXX [--contexto "meu canal: ..."]
python3 $E/estrategia.py analisar-video --arquivo projetos/x/final.mp4          # vídeo seu, antes de postar
python3 $E/estrategia.py analisar-video --url ... --pergunta "Como ele usa a música para segurar a atenção?"
```
- Devolve o gancho (com nota), a estrutura com tempos, as técnicas de retenção, os momentos de risco, o visual e o áudio,
  uma **receita replicável**, como adaptar ao seu canal e 5 ideias derivadas.
  Sem `--contexto`, o script lê a descrição do seu canal no YouTube.
- Analise os 2 ou 3 maiores outliers do nicho, não vídeos aleatórios. Vídeo com mais de ~20 min: `--baixa-resolucao`.
- Só funciona com vídeo **público**. Para privado ou não listado, use `--arquivo`.
- **Nunca copie** roteiro, imagem ou fala de outro canal: use a estrutura e a técnica, com conteúdo e visual próprios.

## 4. Retenção dos seus vídeos
```bash
python3 $E/estrategia.py retencao --video <ID> --explicar
```
- Busca no YouTube Analytics a curva de retenção (`audienceWatchRatio`) e o desempenho relativo, que compara com vídeos
  de duração parecida (0,5 = na média). Mostra também a retenção em 3 s, 10 s, 30 s, 50% e 90%, e as maiores quedas.
- Com `--explicar`, a Gemini assiste ao vídeo e diz o que acontece em cada queda, por que as pessoas saem e o que
  mudar. Também devolve **regras para os próximos vídeos**.
- A curva só aparece depois de ~2 dias e com algumas dezenas de views. Sem dados, espere.
- Referência para vídeo de 2 a 10 min: 3 s ≥ 85%, 30 s ≥ 60%, 50% ≥ 40%. Shorts: queda nos 2 primeiros segundos ≤ 25%.
- **Toda regra nova vai para `canal/aprendizados.md`** (crie se não existir), com a data e o vídeo de onde saiu.
  O roteiro de todo vídeo novo segue esse arquivo. Exemplo:
  `- (27/11, efeito holofote 0:24) Prometeu uma resposta? Entregue antes de abrir outra pergunta.`

## 5. Escrever a estratégia (`canal/estrategia/<data>/estrategia.md`)
Junte nicho, concorrentes, vídeos de referência, os dados do seu canal (`youtube.py analisar`) e a retenção. Escreva:
1. **Diagnóstico em 5 linhas**: onde o canal está, com números, e o maior gargalo (clique, retenção, frequência, tema...).
2. **Posicionamento**: para quem é, que promessa faz e como se diferencia dos 3 maiores concorrentes.
3. **Pilares de conteúdo** (3): temas com demanda provada por outliers. Cite os vídeos e os números.
4. **Formato**: Shorts e/ou longos, duração-alvo e estrutura de roteiro (a receita que funcionou nos outliers).
   Os Shorts levam gente para os longos.
5. **Frequência e horários** que dá para manter. Constância vale mais que volume.
6. **10 ideias ranqueadas**, cada uma com título (≤ 60 caracteres), conceito de miniatura, gancho dos primeiros 5 s,
   pilar, formato e a evidência (o outlier que inspirou a ideia).
7. **Regras de roteiro** tiradas da retenção (copie para `canal/aprendizados.md`).
8. **O que medir** em 2 semanas: CTR, retenção aos 30 s, views por vídeo e inscritos por vídeo.

Estime o custo de produção quando a ideia usar o Veo (cada 8 s ≈ US$ 3,20, ou US$ 1,20 no modo rápido).
Mostre a estratégia ao usuário e peça que escolha a ideia antes de produzir.
