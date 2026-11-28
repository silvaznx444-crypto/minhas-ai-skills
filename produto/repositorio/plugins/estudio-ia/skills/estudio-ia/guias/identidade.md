# Identidade do canal (`canal/padrao.md`)

Todo vídeo segue o padrão do canal. Se `canal/padrao.md` não existir, crie-o **antes** de escrever qualquer roteiro,
a partir de [`../modelos/padrao-do-canal.md`](../modelos/padrao-do-canal.md).

## Como preencher (uma conversa curta, não um formulário)
1. **Descubra o que já existe.** Se o YouTube estiver conectado, leia o canal (`youtube.py conta` e `analisar`):
   nome, descrição, palavras-chave e os vídeos que mais funcionaram. Se houver pesquisa de nicho
   (`canal/estrategia/`), use os outliers e os horários dela.
2. **Pergunte só o que não dá para descobrir**, em no máximo 2 rodadas e com sugestões prontas para o usuário escolher
   (AskUserQuestion, quando disponível):
   - nicho e promessa do canal, e o público;
   - tom de voz e o que o canal nunca faz;
   - formatos: vídeo longo, Shorts/Reels ou os dois, e quantas vezes por semana dá para manter;
   - estilo visual e protagonista recorrente (descreva a aparência fixa);
   - se a pessoa vai **narrar com a própria voz** (recomendado) ou vai usar outra voz;
   - cuidados do nicho (saúde, finanças, religião, crianças...).
3. **Preencha tudo.** Nenhum `{{ }}` pode sobrar. Quando a pessoa não souber, escolha um padrão sensato a partir dos dados
   e marque com "(sugestão; ajustar depois das primeiras análises)".
4. Mostre um resumo de 8 a 10 linhas, ajuste o que a pessoa pedir, salve em `canal/padrao.md` e faça commit se for
   um repositório git.

## Depois
- O roteiro (etapa 5), a capa e os textos (etapa 7) e os horários (etapa 8) sempre leem `canal/padrao.md`.
- As regras aprendidas com a retenção vão para `canal/aprendizados.md` e vencem o padrão quando houver conflito.
- Revise o padrão a cada 4 a 6 semanas, comparando com os dados (etapa 9).
