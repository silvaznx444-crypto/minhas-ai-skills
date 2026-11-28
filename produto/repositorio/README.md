# Estúdio IA: seu canal do YouTube e Instagram com IA

Um agente que trabalha com você em cada etapa do canal, dentro do **Claude Code**:

1. **Identidade:** define nicho, público, tom, formatos e o padrão visual do canal.
2. **Diagnóstico:** lê os números do seu canal e mostra onde as pessoas param de assistir e por quê.
3. **Nicho e concorrentes:** acha os vídeos que bombaram muito acima do normal ("outliers") e o que eles têm em comum.
4. **Engenharia reversa:** a IA assiste a um vídeo viral e devolve o gancho, a estrutura e uma receita para adaptar.
5. **Estratégia:** pilares de conteúdo, frequência, horários e 10 ideias ranqueadas.
6. **Roteiro** com estrutura de retenção e **vídeo 3D animado a partir da sua narração**: bonecos 3D, cenários, câmera
   em movimento, legenda palavra por palavra, música e efeitos. Funciona em 16:9 (YouTube) e 9:16 (Reels e Shorts),
   em dois estilos: **cabeção** (cartoon de jogo, personagens fofos em mundos coloridos) e **bonecos com contorno**.
   Os personagens ficam sempre iguais e não há custo por vídeo.
7. **Títulos e capa**.
8. **Publicação** agendada no YouTube e no Instagram.
9. **Pós-publicação:** mede, aprende e melhora o próximo vídeo.

---

## Instalação (uns 10 minutos)

### O que você precisa
- **Claude Code** num plano pago do Claude. Pode ser o app para computador ou o terminal.
- **Python 3.9+** ([python.org/downloads](https://www.python.org/downloads/)), **Node.js 18+** ([nodejs.org](https://nodejs.org)) e
  **ffmpeg**. O verificador do passo 4 diz se falta algum. O estúdio 3D é instalado pelo agente na primeira vez
  (uns 500 MB, contando o modelo que transcreve a sua voz).
- Uma conta Google com o seu canal do YouTube.

### Passo 1: descompacte
Descompacte o arquivo do produto numa pasta fácil de achar, por exemplo `Documentos/estudio-ia`.

### Passo 2: instale o plugin
Abra o Claude Code e digite, trocando o caminho pelo da sua pasta:
```
/plugin marketplace add ~/Documentos/estudio-ia
```
```
/plugin install estudio-ia@estudio-ia
```
No Windows, o caminho fica parecido com `C:\Users\SeuNome\Documents\estudio-ia`.

### Passo 3: crie a pasta do seu canal
Crie uma pasta só para o canal, por exemplo `Documentos/meu-canal`, e abra o Claude Code nela. É ali que ficam o padrão
do canal, os relatórios, os roteiros e os vídeos.

### Passo 4: comece
Digite no Claude Code:
```
/estudio-ia:comecar
```
O agente te leva por **7 missões**, ensinando enquanto faz:

1. Tudo instalado (e um vídeo de exemplo pronto no seu computador)
2. Seu canal tem cara
3. O que funciona no seu nicho
4. Seu primeiro vídeo
5. A capa e o título que dão clique
6. No ar
7. Crescer toda semana

Cada missão mostra o progresso, explica cada passo em português simples e espera o seu ok. Para parar e continuar
outro dia, é só digitar `/estudio-ia:comecar` de novo. Travou em alguma coisa? Digite `/estudio-ia:travei`.

Depois da trilha, o agente do YouTube segue o ciclo com você: escreva "Use o agente do YouTube do estudio-ia".

### Usando no navegador (claude.ai/code)
As sessões na nuvem não carregam plugins instalados no computador. Para usar no navegador:
1. Crie um repositório **privado** no GitHub para o seu canal.
2. Copie a pasta do produto para dentro dele, como `estudio-ia/`.
3. Crie o arquivo `.claude/settings.json` com este conteúdo:
   ```json
   {
     "extraKnownMarketplaces": {
       "estudio-ia": { "source": { "source": "directory", "path": "./estudio-ia" } }
     },
     "enabledPlugins": { "estudio-ia@estudio-ia": true }
   }
   ```
4. Coloque as suas chaves nas **variáveis de ambiente** do ambiente de nuvem, e não nos arquivos. O agente explica cada uma.

---

## Frases úteis
- "Pesquisa o nicho de **finanças pessoais** e me mostra os outliers."
- "Analisa este vídeo e me diz como adaptar para o meu canal: <link>"
- "Por que as pessoas saem do meu último vídeo?"
- "Escreve o roteiro da ideia 3 da estratégia."
- "Faz o vídeo 3D com esta narração." (mande o áudio)
- "Faz 3 títulos e a capa e agenda para quarta às 18h45."

## Custos
- **Claude Code:** o seu plano do Claude. Produzir vídeos e analisar o canal consome bastante do limite.
- **Google (Gemini, para análises, imagens e vídeos):** conta nova do Google Cloud ganha crédito grátis.
  Uma análise custa centavos. O vídeo 3D não tem custo de API, só tempo do seu computador: cerca de 10 a 25 minutos
  para 1 minuto de vídeo. O vídeo gerado com o Veo, que é opcional, custa cerca de US$ 3 por trecho de 8 segundos. O agente
  sempre mostra o custo antes.
- **YouTube e Instagram:** grátis pelas APIs oficiais.

## Segurança
Suas chaves ficam só no seu computador ou no seu ambiente de nuvem. O agente nunca pede que você cole senha ou token
no chat, mostra a prévia antes de mudar qualquer vídeo publicado e guarda backup para desfazer.

Veja também [LICENCA.md](LICENCA.md) e [CREDITOS.md](CREDITOS.md).
