# Missão 1: Tudo instalado

**No fim:** o estúdio funcionando e um vídeo de exemplo renderizado no computador do aluno.
**Aulas:** 4 (18 min). **Material:** [checklist-instalacao.md](../materiais/checklist-instalacao.md), parte 1.
**Antes de gravar:** faça a Fase 4 em Windows e em Mac e grave o que o aluno realmente vê.

---

## Aula 1.1: Bem-vindo (4 min)
**Mostre primeiro:** um vídeo 3D pronto do canal de demonstração, em 16:9 e em 9:16.
**Fale:**
- "Esse vídeo saiu da minha voz. Eu não animei nada e não paguei nada por ele."
- Como funciona: as 7 missões, uma frase para cada. O primeiro vídeo fica pronto na missão 4.
- O que é preciso, sem surpresa: um computador, o plano pago do Claude (mostre o preço atual na página do Claude) e o
  celular para gravar a voz. O Google dá crédito grátis para conta nova.
- O combinado: o canal cresce com constância. A meta é 1 vídeo por semana durante 8 semanas.

**Termina com:** "Na próxima aula a gente instala tudo. Separe 30 minutos."

## Aula 1.2: Os programas (6 min, com uma parte para Windows e outra para Mac)
**Mostre primeiro:** o verificador com tudo OK.
**Fale e mostre:**
- O app do Claude para computador: instalar, entrar e abrir o Claude Code numa pasta.
- Python, Node.js e ffmpeg, cada um em uma frase ("o Node roda o estúdio 3D").
- **Windows:** Python marcando "Add python.exe to PATH", Node.js LTS, e `winget install ffmpeg`.
- **Mac:** `brew install python node ffmpeg`.
- Feche e abra o app de novo depois de instalar.

**Termina com:** "Se algo der erro, não se preocupe: na próxima aula o agente confere tudo para você."

## Aula 1.3: O Estúdio IA e o comando mágico (4 min)
**Mostre primeiro:** a tela do agente dizendo "Missão 1 de 7".
**Na tela:**
1. Descompacte o ZIP em `Documentos/estudio-ia`.
2. No Claude Code: `/plugin marketplace add ~/Documentos/estudio-ia` e `/plugin install estudio-ia@estudio-ia`.
3. Crie a pasta `Documentos/meu-canal` e abra o Claude Code nela.
4. Digite **`/estudio-ia:comecar`**.

**Fale:** "Daqui para a frente, o agente te leva pela mão. Ele explica cada passo, espera o seu ok e mostra o
progresso. Se você parar hoje e voltar amanhã, é só digitar o mesmo comando."

## Aula 1.4: Seu primeiro render (4 min)
**Mostre primeiro:** o MP4 do exemplo abrindo no computador.
**Na tela:** o agente instalando o estúdio 3D, mostrando a folha de contato e renderizando o exemplo. Corte a espera.
**Fale:**
- O que é a folha de contato: uma imagem por cena, para revisar antes de esperar o render.
- O que é renderizar: o computador desenha cada quadro do vídeo. Um minuto leva de 10 a 25 minutos, e dá para usar o
  computador enquanto isso.
- Travou? Digite `/estudio-ia:travei` e conte o que aconteceu.

**Termina com:** "Missão 1 concluída! Na próxima, seu canal ganha cara."
