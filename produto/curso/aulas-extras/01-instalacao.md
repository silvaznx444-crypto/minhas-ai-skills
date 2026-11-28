# Módulo 1: Instalação sem medo

**Objetivo:** sair do módulo com o Claude Code, o plugin e o estúdio 3D funcionando, e o primeiro exemplo renderizado
no próprio computador.
**Material:** [checklist-instalacao.md](../materiais/checklist-instalacao.md).
**Antes de gravar:** faça a Fase 4 em Windows e em Mac e grave o que o aluno realmente vê.

---

## Aula 1.1: Claude Code: o que é e onde usar (6 min)
**Na tela:** o app do Claude para computador, a aba do Claude Code e o terminal.

**Roteiro**
1. **Resultado primeiro:** o agente respondendo dentro da pasta do canal.
2. O Claude Code é o Claude trabalhando **dentro de uma pasta do seu computador**: ele lê e cria arquivos e roda
   programas, sempre pedindo permissão. É isso que permite fazer o vídeo na sua máquina.
3. Os três jeitos de usar:
   - o **app para computador** (recomendado para iniciantes);
   - o **terminal**;
   - o **navegador** (claude.ai/code), que exige um repositório no GitHub. Esse caso está no README e não é o caminho
     do curso.
4. Instale o app, entre na conta e abra o Claude Code numa pasta qualquer.
5. As permissões: o Claude pergunta antes de rodar um comando. Mostre como aprovar uma vez ou sempre, e diga que, na
   dúvida, é melhor ler o pedido antes de aprovar.

**Tarefa:** abrir o Claude Code e perguntar "o que você consegue fazer nesta pasta?".

---

## Aula 1.2: Python, Node.js e ffmpeg (10 min, com uma parte para Windows e outra para Mac)
**Na tela:** os sites oficiais e o instalador de cada programa.

**Roteiro**
1. Para que serve cada um: o **Python** roda os scripts do agente, o **Node.js** roda o estúdio 3D e o **ffmpeg**
   monta o vídeo e o áudio.
2. **Windows:**
   - Python em python.org, marcando **"Add python.exe to PATH"**;
   - Node.js LTS em nodejs.org;
   - ffmpeg com `winget install ffmpeg` (ou pelo pacote do site oficial).
3. **Mac:**
   - instale o Homebrew;
   - rode `brew install python node ffmpeg`.
4. Feche e abra o terminal (ou o app) de novo, para que os programas novos sejam encontrados.
5. **Atalho:** peça ao Claude Code "confere se tenho Python 3.9+, Node 18+ e ffmpeg e me diz o que falta". Ele roda
   os comandos e explica o resultado.

**Erros comuns**
- "python não é reconhecido": o PATH não foi marcado na instalação. Reinstale com a opção marcada.
- No Mac, o `python3` que vem com o sistema é antigo. Use o do Homebrew.

**Tarefa:** os três programas instalados.

---

## Aula 1.3: Instalando o Estúdio IA e criando a pasta do canal (6 min)
**Na tela:** o ZIP baixado da área de membros, a pasta descompactada e os dois comandos.

**Roteiro**
1. Baixe o ZIP desta aula e descompacte em `Documentos/estudio-ia`. Não mude essa pasta de lugar depois.
2. No Claude Code:
   ```
   /plugin marketplace add ~/Documentos/estudio-ia
   /plugin install estudio-ia@estudio-ia
   ```
   No Windows, o caminho é `C:\Users\SeuNome\Documents\estudio-ia`.
3. Crie a pasta do canal, `Documentos/meu-canal`, e abra o Claude Code nela. É ali que ficam o padrão do canal, os
   relatórios, os roteiros e os vídeos.
4. Diga o que tem dentro do plugin: o agente do YouTube, a skill com os guias, os scripts e o estúdio 3D.
5. Leia a licença em voz alta, resumida: uso nos seus canais e nos de clientes, mas sem repassar o plugin.

**Tarefa:** plugin instalado e pasta do canal criada.

---

## Aula 1.4: Primeira conversa com o agente (6 min)
**Na tela:** a pasta `meu-canal` no Claude Code.

**Roteiro**
1. Escreva: **"Use o agente do YouTube do estudio-ia para começar meu canal."**
2. O agente roda o **verificador** e mostra OK, FALTA ou ERRO para cada item. Explique que é normal o Google e o
   YouTube aparecerem como FALTA, porque eles são ligados no módulo 2.
3. Mostre o arquivo `canal/jornada.md`: é o diário do canal, e o agente continua de onde parou quando você volta outro dia.
4. Explique que o agente para nas decisões importantes e que dá para pedir uma etapa só ("faz só a pesquisa de nicho").

**Tarefa:** rodar o verificador e anotar o que falta.

---

## Aula 1.5: Instalando o estúdio 3D e renderizando o primeiro exemplo (10 min)
**Na tela:** a instalação do estúdio e o exemplo renderizando.

**Roteiro**
1. Peça: **"Instala o estúdio 3D."** O agente roda `estudio3d.py instalar`, que copia o estúdio para `./estudio3d`,
   instala as dependências e confere tudo. Diga que o primeiro uso baixa o modelo que transcreve a voz (uns 460 MB).
2. Peça: **"Renderiza a folha de contato do exemplo dos cabeções e me mostra."** Explique o que é a folha de contato:
   uma imagem por tomada, para revisar o vídeo antes de gastar tempo com o render.
3. Peça: **"Agora renderiza o exemplo inteiro e mixa o som."** Mostre a previsão de tempo no log e corte a espera.
4. Abra o MP4 da pasta `saida/`: o primeiro vídeo feito no computador do aluno.
5. Mostre o catálogo de personagens: **"Renderiza o catálogo e me mostra."** Ele volta no módulo 8.

**Erros comuns**
- Faltou o ffmpeg ou o Node: volte à aula 1.2.
- Sem espaço em disco: o estúdio e o modelo de voz ocupam uns 2 GB.
- Render muito lento: é normal em computador com poucos núcleos. Use `--escala 0.5` para as prévias.

**Tarefa:** o MP4 do exemplo gerado no seu computador. Poste um print no grupo, se houver.
