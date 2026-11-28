# Curso Estúdio IA: grade, roteiros de gravação e materiais

**Promessa do curso:** fazer um canal no YouTube e no Instagram com vídeos 3D animados, com a sua voz, sem saber animar
e sem pagar por vídeo, guiado por um agente de IA que cuida da pesquisa de nicho, do roteiro e da análise dos números.

**Para quem é:** quem quer um canal sem aparecer, ou quer parar de gastar horas editando. Também serve para quem já
tem canal e quer usar dados para crescer. Não precisa saber programar nem animar.

**Formato:** 14 módulos e 57 aulas curtas (de 5 a 12 min, umas 8 horas no total). Junto vêm o plugin **Estúdio IA**
(bônus) e os materiais da pasta `materiais/`.

## Grade

| # | Módulo | Aulas | Ao final, o aluno tem |
|---|---|---|---|
| 0 | [Comece aqui](modulos/00-comece-aqui.md) | 3 | a visão do caminho, os custos reais e o que derruba canal de IA |
| 1 | [Instalação sem medo](modulos/01-instalacao.md) | 5 | Claude Code, plugin e estúdio 3D instalados, e o primeiro exemplo renderizado |
| 2 | [Conectando Google, YouTube e Instagram](modulos/02-conexoes.md) | 4 | as contas ligadas e as chaves guardadas em segurança |
| 3 | [Identidade do canal](modulos/03-identidade.md) | 4 | nicho, padrão do canal, protagonista e perfil prontos |
| 4 | [Estratégia com dados](modulos/04-estrategia.md) | 5 | outliers do nicho, concorrentes dissecados e 10 ideias ranqueadas |
| 5 | [Roteiro que prende](modulos/05-roteiro.md) | 4 | o primeiro roteiro com estrutura de retenção |
| 6 | [Sua voz](modulos/06-voz.md) | 3 | a narração gravada no celular, limpa e com bom ritmo |
| 7 | [Seu primeiro vídeo 3D](modulos/07-primeiro-video-3d.md) | 6 | o primeiro vídeo pronto, com legenda, música e efeitos |
| 8 | [Personagens, cenários e efeitos](modulos/08-personagens-e-efeitos.md) | 5 | o protagonista fixo e o domínio do elenco, dos cenários e dos efeitos |
| 9 | [Shorts e Reels](modulos/09-shorts-e-reels.md) | 3 | o primeiro vídeo vertical |
| 10 | [Embalagem: título, capa e descrição](modulos/10-embalagem.md) | 4 | 3 títulos, a capa, a descrição com capítulos e as tags |
| 11 | [Publicar e agendar](modulos/11-publicar.md) | 3 | o vídeo no ar ou agendado, e um calendário possível |
| 12 | [Medir e crescer](modulos/12-medir-e-crescer.md) | 5 | a retenção explicada, regras de aprendizado e uma rotina semanal |
| 13 | [Monetização e próximos passos](modulos/13-monetizacao.md) | 3 | os caminhos de renda e um plano de 30 dias |

Materiais (entregues como anexo das aulas, em PDF ou no próprio texto da aula):

| Arquivo | Usado em |
|---|---|
| [checklist-instalacao.md](materiais/checklist-instalacao.md) | módulos 1 e 2 |
| [pedidos-prontos.md](materiais/pedidos-prontos.md): o que escrever para o agente em cada etapa | o curso todo |
| [guia-da-voz.md](materiais/guia-da-voz.md) | módulo 6 |
| [checklist-do-video.md](materiais/checklist-do-video.md): antes de publicar | módulos 7, 10 e 11 |
| [rotina-semanal.md](materiais/rotina-semanal.md) | módulo 12 |
| [plano-30-dias.md](materiais/plano-30-dias.md) | módulo 13 |
| [glossario.md](materiais/glossario.md) | o curso todo |
| capas dos módulos (`capas/saida/`) | área de membros e página de vendas |

## Como gravar as aulas

**Equipamento mínimo.** Gravador de tela (OBS Studio, que é grátis), um microfone de lapela ou de mesa e um lugar sem
eco. Grave em 1080p e 30 quadros por segundo. Aumente a letra do Claude Code (Ctrl/Cmd +) para ler bem no celular.

**Padrão de toda aula (repita sempre, o aluno se acostuma):**
1. **Resultado primeiro (10 a 20 s):** mostre o que a pessoa vai ter no fim da aula.
2. **O que vamos fazer:** 2 ou 3 frases.
3. **Demonstração real na tela:** você pedindo ao agente e o agente fazendo. Corte as esperas (render, downloads),
   mas não esconda os erros comuns: mostrar como resolver vale mais que uma aula perfeita.
4. **Erros comuns** da etapa.
5. **Tarefa** e o que vem na próxima aula.

**Use um canal de demonstração.** Crie um canal novo só para o curso e grave a jornada dele do zero, com os números
reais. Isso vira prova verdadeira para a página de vendas. Nunca mostre números inventados.

**Cuidados na tela.**
- Nunca mostre chaves, tokens, o arquivo JSON da conta de serviço nem o seu e-mail pessoal. Se aparecer, borre na edição.
- As respostas do Claude mudam um pouco a cada vez. Não leia um texto decorado: mostre a conversa real e explique o
  que está acontecendo.
- Quando um comando demorar, diga quanto tempo leva e corte.

**Ordem de gravação sugerida.** Grave primeiro os módulos 1, 7 e 0 (instalação, primeiro vídeo e abertura). Eles
servem para a aula gratuita do lançamento e para a página de vendas. Depois grave na ordem da grade.

**Antes de gravar o módulo 1, faça a Fase 4** (teste do zero como comprador, em Windows e Mac). As aulas de
instalação precisam mostrar exatamente o que o aluno vai ver.

## Capas dos módulos
As 14 capas prontas estão em `capas/saida/modulo-00.jpg` a `modulo-13.jpg`, em 1080×1620 (2:3, o formato "pôster" da
maioria das áreas de membros). Elas são feitas no próprio estúdio 3D, com a mesma protagonista em todas. Para refazer
uma capa (mudar um título, por exemplo), edite `capas/cenas/capas.js` e rode:
```bash
cd ../repositorio/plugins/estudio-ia/skills/estudio-ia/estudio3d
node renderizar.mjs --projeto ../../../../../../curso/capas --quadros 7.5        # módulo 7 (quadro 7.5)
ffmpeg -y -i ../../../../../../curso/capas/construcao/quadros/001_7.50s.png -vf "crop=1080:1620:0:150" -q:v 3 ../../../../../../curso/capas/saida/modulo-07.jpg
```
O quadro original é 9:16 (1080×1920). Se a área de membros pedir capa vertical inteira, use o PNG sem o corte.
