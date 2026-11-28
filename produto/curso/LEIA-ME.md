# Curso Estúdio IA: a trilha das 7 missões

**Promessa:** fazer um canal no YouTube e no Instagram com vídeos 3D animados, com a sua voz, sem saber animar e sem
pagar por vídeo. Um agente de IA te ensina enquanto faz.

**Para quem é:** quem está começando e quer um canal sem aparecer. Não precisa saber programar nem animar.

**Como ensina:** o aluno aprende fazendo, no canal dele.
- **O agente é o professor.** Com `/estudio-ia:comecar`, ele conduz as 7 missões dentro do Claude Code: explica cada
  passo em português simples, mostra o progresso ("missão 4 de 7"), espera o ok e resolve os erros (`/estudio-ia:travei`).
- **As aulas em vídeo são curtas** (de 3 a 7 min): mostram o resultado primeiro e o que vai acontecer na missão. O
  aluno assiste e faz junto com o agente.
- **Cada missão termina com uma conquista concreta.** O primeiro vídeo fica pronto na missão 4.

## As missões

| Missão | No fim, o aluno tem | Aulas |
|---|---|---|
| [1. Tudo instalado](missoes/1-tudo-instalado.md) | o estúdio funcionando e o vídeo de exemplo renderizado | 4 (18 min) |
| [2. Seu canal tem cara](missoes/2-seu-canal-tem-cara.md) | nicho, padrão do canal e protagonista | 3 (13 min) |
| [3. O que funciona no seu nicho](missoes/3-o-que-funciona.md) | Google e YouTube ligados, os outliers e 10 ideias | 3 (17 min) |
| [4. Seu primeiro vídeo](missoes/4-primeiro-video.md) | roteiro, voz e o vídeo 3D pronto | 4 (20 min) |
| [5. A capa e o título que dão clique](missoes/5-capa-e-titulo.md) | títulos, capa, descrição e tags | 2 (9 min) |
| [6. No ar](missoes/6-no-ar.md) | o vídeo agendado (e o Reels, se quiser) | 2 (9 min) |
| [7. Crescer toda semana](missoes/7-crescer.md) | a retenção explicada, as regras e a rotina | 3 (14 min) |

**Total:** 21 aulas, cerca de 1h40.

**Bônus da oferta:** os materiais de `materiais/` (checklists, pedidos prontos, guia da voz, rotina semanal, plano
de 30 dias e glossário).

***Order bump*:** [20 modelos de roteiro que prendem](../bonus/modelos-de-roteiro.md).

## Como gravar
- Use o OBS Studio (grátis), um microfone de lapela ou de mesa e um lugar sem eco. Grave em 1080p, com a letra do
  Claude Code aumentada (Ctrl/Cmd +).
- O roteiro de cada aula está no arquivo da missão: **Mostre primeiro** (o resultado, em 10 a 20 s), **Fale** e
  **Na tela** (o que acontece no Claude) e **Termina com** (a frase que chama a próxima aula).
- Grave com um **canal de demonstração começando do zero** e com os números reais. Isso vira prova verdadeira para a
  página de vendas.
- Nunca mostre chaves, tokens, o JSON da conta de serviço nem o seu e-mail. Borre na edição se aparecer.
- As respostas do Claude mudam um pouco a cada vez. Mostre a conversa real e corte as esperas.
- **Ordem:** grave a missão 1 só depois da Fase 4 (teste do zero no Windows e no Mac). Comece pela missão 4, que é a
  melhor para divulgar.

## Aulas extras (opcional, depois do lançamento)
`aulas-extras/` tem 57 roteiros de aulas longas (14 módulos), do nicho à monetização. Elas não entram na oferta de
lançamento. Servem de base para aulas de aprofundamento, para um produto maior no futuro ou para responder dúvidas
frequentes.

## Capas
As capas das missões e do bônus estão em `capas/saida/` (1080×1620, 2:3), feitas no próprio estúdio 3D com a mesma
protagonista. Para refazer uma, edite `capas/cenas/capas.js` e rode, dentro de `estudio3d/` do plugin:
```bash
node renderizar.mjs --projeto ../../../../../../curso/capas --quadros 0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5
```
O quadro `N.5` é a capa N (0 = missão 1, ..., 6 = missão 7, 7 = bônus). Corte em 2:3 com
`ffmpeg -i quadro.png -vf "crop=1080:1620:0:150" capa.jpg`.
