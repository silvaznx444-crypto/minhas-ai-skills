# Módulo 7: Seu primeiro vídeo 3D

**Objetivo:** transformar a narração do módulo 6 num vídeo 3D pronto, com legenda, música e efeitos. É o coração do curso.
**Material:** [checklist-do-video.md](../materiais/checklist-do-video.md).
**Gravação:** grave este módulo com um vídeo real do canal de demonstração, do começo ao fim.

---

## Aula 7.1: Como o estúdio pensa (7 min)
**Na tela:** um desenho do fluxo e um projeto aberto.

**Roteiro**
1. **Resultado primeiro:** o vídeo final do canal de demonstração.
2. O fluxo, em uma linha: **narração → linha do tempo das palavras → tomadas → cenas → folha de contato → render → som.**
3. Por que é diferente de gerar vídeo por IA:
   - cada quadro é desenhado por código, então o personagem é sempre o mesmo, o texto sai nítido e o vídeo não custa
     nada por segundo;
   - a imagem segue a sua voz: quando você fala "coração", o coração aparece.
4. O que você faz e o que o agente faz:
   - **você** grava a voz, aprova a folha de contato e pede ajustes;
   - **o agente** escreve as cenas, renderiza e mixa.
5. As pastas de um projeto: `entrada/` (a voz), `linha/` (as palavras), `historia/tomadas.json`, `cenas/`,
   `construcao/` (o que é temporário) e `saida/` (o vídeo final).

---

## Aula 7.2: Projeto e linha do tempo (8 min)
**Roteiro**
1. Peça: **"Cria o projeto do vídeo [nome] em 16:9 com esta narração: roteiros/[nome]/narracao.m4a."**
2. O agente cria o projeto e **transcreve a voz**: cada palavra ganha o tempo exato em que foi falada.
3. A conferência: as palavras do roteiro precisam bater **90% ou mais** com o áudio. Se baterem menos, o agente
   pergunta se o texto mudou. Responda e siga.
4. **Sem a voz ainda?** Peça: "monta com a linha provisória e depois a gente sincroniza com a voz". Dá para adiantar as
   cenas enquanto você grava.
5. Mostre o `linha/palavras.json` só de passagem, para o aluno ver que cada palavra tem tempo de início e de fim.

---

## Aula 7.3: Tomadas: uma ideia por tomada (10 min)
**Na tela:** `historia/tomadas.json`.

**Roteiro**
1. Uma **tomada** é um trecho do vídeo com uma cena. A regra é uma cena nova a cada 3 a 5 segundos e nada parado.
2. Cada tomada começa numa **âncora**, que são as palavras em que ela entra. Se você regravar a voz, o agente
   ressincroniza tudo sozinho, porque as âncoras seguem as palavras.
3. Peça: **"Faz o rascunho das tomadas e me mostra a lista com a âncora e a cena de cada uma."**
4. Revise como diretor:
   - uma ideia por tomada;
   - corte onde a fala muda de assunto;
   - uma **metáfora visual** para cada ideia abstrata;
   - um cenário de abertura para cada lugar novo.
5. O agente também põe as transições, os efeitos sonoros, o ambiente e a música por trecho (calma, curiosa, mistério,
   tensa, alegre, emocionante, triste ou épica).
6. Peça mudanças em português: "na tomada 4, em vez da sala, põe o protagonista no parque olhando o celular".

---

## Aula 7.4: Cenas: o agente escreve, você dirige (10 min)
**Roteiro**
1. Peça: **"Escreve as cenas."** O agente escreve as cenas em código: personagens, cenário, animação, rosto, câmera e
   textos que entram junto com a palavra falada.
2. Você não precisa ler o código. Você vai julgar pela folha de contato (próxima aula).
3. Mostre um pedido de cena bem feito, com **quem**, **onde**, **o que faz**, **a emoção** e **o que aparece escrito**:
   "o protagonista sentado no sofá, rolando o celular, cansado; quando eu falar 'três horas', aparece um relógio
   girando e o texto 3 HORAS".
4. Mantenha o protagonista igual em todas as cenas: ele usa a receita do padrão do canal.
5. Cada vídeo tem cenas próprias. Peça variedade: "não repete o cenário da tomada anterior".

---

## Aula 7.5: Folha de contato: revisar antes de renderizar (8 min)
**Na tela:** a folha de contato, com um quadro por tomada.

**Roteiro**
1. **Nunca renderize o vídeo inteiro sem olhar a folha.** Ela leva 1 minuto, e o render leva bem mais.
2. Peça: **"Me mostra a folha de contato."** O que procurar:
   - tomada faltando (aviso amarelo);
   - personagem cortado ou de costas;
   - texto em cima do rosto ou fora da tela;
   - cena repetida;
   - cena que não tem nada a ver com a fala.
3. Peça os ajustes pelo número da tomada: "na 3 a câmera está longe demais; na 6 o texto cobre o rosto".
4. Para conferir o movimento de um trecho: **"Faz uma prévia de 0:10 a 0:18 com a voz."**
5. Só aprove quando gostar da folha toda.

---

## Aula 7.6: Render, som e entrega (8 min)
**Roteiro**
1. Peça: **"Renderiza o vídeo final."** O render roda em segundo plano, e o log mostra os quadros por segundo e o
   tempo que falta. Dá para usar o computador enquanto isso.
2. Depois, o agente **mixa o som**:
   - a música é gerada por código, sem direitos autorais de terceiros;
   - os efeitos sonoros entram nas palavras certas;
   - a música abaixa sozinha quando você fala;
   - o volume final fica no padrão das plataformas (−14 LUFS).
3. As conferências do agente: a duração bate com as tomadas, há áudio e a folha do MP4 final está certa.
4. Assista ao vídeo inteiro **no celular**, porque é lá que o público assiste.
5. Opcional: "analisa o vídeo antes de postar e me diz onde as pessoas podem sair", para a Gemini dar uma segunda opinião.
6. Use o checklist do vídeo antes de passar para a embalagem.

**Tarefa do módulo:** o primeiro vídeo 3D pronto em `saida/`.
