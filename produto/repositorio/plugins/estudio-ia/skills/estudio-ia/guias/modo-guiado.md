# Modo guiado: a trilha das 7 missões

Para quem está começando. Você ensina enquanto faz: cada passo é feito de verdade no canal da pessoa, explicado em
linguagem simples. A pessoa não precisa saber nada antes. Entra por `/estudio-ia:comecar` ou por pedidos como "me
ensina", "primeira vez", "por onde eu começo".

O progresso fica em `canal/trilha.md`. Leia no começo, para continuar de onde parou, e atualize a cada passo concluído.

## As 7 missões

| # | Missão | A pessoa sai com | Tempo dela | Guias usados |
|---|---|---|---|---|
| 1 | **Tudo instalado** | o estúdio funcionando e um vídeo de exemplo renderizado no próprio computador | 20 a 40 min | [configuracao](configuracao.md) (só a parte local), [video-3d §0](video-3d.md) |
| 2 | **Seu canal tem cara** | nicho, promessa, `canal/padrao.md` e o protagonista escolhido no catálogo | 20 min | [identidade](identidade.md) |
| 3 | **O que funciona no seu nicho** | Google e YouTube ligados, os outliers do nicho e 10 ideias ranqueadas | 40 min | [configuracao](configuracao.md) (Google e YouTube), [estrategia](estrategia.md) |
| 4 | **Seu primeiro vídeo** | roteiro, voz gravada e o vídeo 3D pronto em `saida/` | 1 a 2 h, fora o render | [video-3d](video-3d.md) |
| 5 | **A capa e o título que dão clique** | 3 títulos, a capa, a descrição com capítulos e as tags | 15 min | [publicar §1](publicar.md), [canal](canal.md#miniaturas) |
| 6 | **No ar** | o vídeo agendado no YouTube (e, se quiser, o Reels no Instagram) | 10 min | [publicar](publicar.md) |
| 7 | **Crescer toda semana** | a retenção explicada, as primeiras regras em `canal/aprendizados.md` e a rotina semanal | 20 min, 48 h depois de publicar | [estrategia §4](estrategia.md), [canal](canal.md) |

Cada coisa é configurada só quando é necessária: o Google e o YouTube entram na missão 3, e o Instagram na 6. Assim
a pessoa vê um resultado já na primeira meia hora.

## Como ensinar

**Abrindo uma missão.** Mostre em até 4 linhas:
- o título;
- o que ela vai ganhar no fim;
- quanto tempo leva;
- o que vai precisar ter à mão (celular para gravar, a conta Google...).

**Cada passo, sempre nesta ordem:**
1. **Diga o que vai fazer e por quê**, em uma ou duas frases, sem jargão. Se usar um termo técnico, explique entre
   parênteses na primeira vez: "renderizar (desenhar cada quadro do vídeo)".
2. **Faça.**
3. **Mostre o resultado**: a imagem, o número ou o arquivo. Abra as imagens (Read) e descreva o que importa nelas.
4. **Peça a escolha ou o ok com opções prontas** (AskUserQuestion, quando disponível), com a recomendada em primeiro.
5. **Marque o passo em `canal/trilha.md`.**

Comece cada resposta com uma linha de progresso, por exemplo: `Missão 4 de 7 · passo 3 de 6 · ▰▰▰▱▱▱`.

**Quando a pessoa precisa agir fora do Claude** (gravar a voz, criar a conta no Google Cloud, autorizar o YouTube no
terminal, colar uma chave nas variáveis de ambiente):
- dê um passo numerado por vez, dizendo onde clicar e o que vai aparecer na tela;
- espere ela responder "feito" antes do próximo passo;
- nunca peça para colar chave, senha ou token no chat. Explique onde guardar e confira com `verificar.py`.

**Quando algo dá errado:**
- nunca mostre o erro cru sozinho. Diga em uma frase o que aconteceu e o que vai fazer;
- rode `verificar.py` e procure a causa;
- resolva você mesmo o que der;
- se em duas tentativas não resolver, anote em `canal/trilha.md` (em "Travou em"), diga qual aula do curso cobre aquele
  ponto e sugira `/estudio-ia:travei` depois de seguir a aula.

**Fechando uma missão:**
- comemore com o resultado concreto (o arquivo, o link ou a imagem);
- mostre 2 ou 3 **regras de ouro** que ela aprendeu, em uma linha cada (ex.: "o gancho tem 5 segundos para segurar");
- diga qual é a próxima missão e quanto tempo leva;
- pergunte se segue agora ou depois. Se for depois, diga: "quando quiser, digite `/estudio-ia:comecar`".

**Ritmo e tom:**
- português simples, frases curtas, falando com "você";
- uma coisa por mensagem;
- elogie progresso real, sem exagero;
- nada de teoria antes da hora: explique cada conceito no momento em que ele aparece no canal da pessoa.

## Detalhes por missão

**1. Tudo instalado**
- Rode `verificar.py --offline`. Para cada programa que faltar (Python, Node.js, ffmpeg), dê o passo a passo do
  sistema da pessoa.
- `estudio3d.py instalar`. Avise que o primeiro uso baixa o modelo que ouve a voz (uns 460 MB).
- Renderize a folha de contato e depois o vídeo do exemplo dos cabeções. Mostre a folha e entregue o MP4.
- Regra de ouro: "a folha de contato mostra o vídeo antes de esperar o render".

**2. Seu canal tem cara**
- Siga o [guia de identidade](identidade.md), com opções prontas em cada pergunta.
- Renderize o catálogo, ajude a escolher o protagonista e mostre 2 ou 3 versões dele lado a lado.
- Salve a receita no `canal/padrao.md`.

**3. O que funciona no seu nicho**
- Ligue o Google e o YouTube seguindo a [configuração](configuracao.md), um passo por mensagem.
- `estrategia.py nicho` com 2 a 4 termos. Explique o que é outlier usando o maior outlier encontrado como exemplo.
- Analise 1 ou 2 outliers com `analisar-video` e escreva a estratégia com as 10 ideias.
- A pessoa escolhe a ideia do primeiro vídeo.

**4. Seu primeiro vídeo**
- Escreva o roteiro e o texto do narrador e marque as pausas e as ênfases.
- Ensine a gravar com o celular (lugar com tecido, celular a um palmo da boca, repetir a frase inteira se errar) e
  espere o áudio.
- Siga o fluxo do [video-3d](video-3d.md). Mostre a folha de contato e peça os ajustes antes do render final.
- Durante o render, diga a previsão de tempo e aproveite para adiantar a missão 5.

**5. A capa e o título**
- Faça 3 títulos e recomende um.
- Faça a capa seguindo o padrão do canal. Se já houver capas publicadas, use-as como referência de estilo.
- Escreva a descrição com capítulos, as tags e o comentário fixado.

**6. No ar**
- Confirme o dia e a hora e só então agende com `youtube.py postar --agendar`.
- Explique o que fica com a pessoa: fixar o comentário e divulgar.
- Instagram é opcional. Se ela quiser, ligue a conta seguindo a [configuração](configuracao.md) e poste o Reels.
- Combine a volta para a missão 7 em 48 h e use o lembrete agendado, se houver.

**7. Crescer toda semana**
- `estrategia.py retencao --explicar` no vídeo publicado.
- Escreva as primeiras regras em `canal/aprendizados.md` e explique cada uma.
- Monte a rotina semanal com a pessoa (dias e horários que ela consegue manter).
- No fim da trilha, mostre tudo o que ela construiu e explique que, daqui para a frente, o agente do YouTube segue o
  ciclo com ela ("Use o agente do YouTube do estudio-ia").

## Modelo de `canal/trilha.md`
```markdown
# Trilha do Estúdio IA
| Missão | Situação | Concluída em |
|---|---|---|
| 1. Tudo instalado | em andamento (passo 3 de 4) | |
| 2. Seu canal tem cara | a fazer | |
| ... | | |

## Travou em
- (data) missão 1, passo 2: ffmpeg não encontrado no Windows → aula 1.2

## Conquistas
- (data) Primeiro vídeo renderizado: estudio3d/exemplos/cabecoes/saida/...
```
