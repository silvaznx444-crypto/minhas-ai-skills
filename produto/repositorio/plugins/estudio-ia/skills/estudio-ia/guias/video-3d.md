# Vídeo 3D construído por código (padrão)

O vídeo nasce da **narração**: cada cena ilustra a frase falada enquanto está na tela. Não há IA gerando imagem, então os
personagens ficam iguais em todos os vídeos, o texto sai nítido e não há custo de API, só tempo de render.
A referência técnica (API das cenas, kit, formatos) está em `estudio3d/LEIA-ME.md`. Leia uma vez antes de escrever cenas.

**Dois estilos de personagem.** Use o que estiver em `canal/padrao.md`; se não houver nada definido, pergunte:
- **Cabeção (cartoon de jogo):** personagens KayKit de cabeça grande com 76 animações, em mundos coloridos (parque, praça,
  sala, palco pastel). É o mais fofo e chamativo, ótimo para Reels e Shorts. Referência: `exemplos/cabecoes/`.
- **Bonecos com contorno:** bonecos 3D procedurais com rosto expressivo (piscar, sorrir, falar, chorar) e poses, em
  rua e quarto. É melhor para histórias e emoções no rosto. Referência: `exemplos/demo/`.

Dá para misturar os dois, mas mantenha sempre o mesmo protagonista.

**Elenco disponível.**
- **Cabeções:** 9 tipos e 22 personagens prontos do figurino, que dá para mudar.
- **Esqueletos:** 4.
- **Kenney:** 20 pessoas comuns, 18 personagens de blocos e 24 bichos, mais de 900 objetos de cenário e os bonecos com contorno.

Antes de escolher o elenco com a pessoa, renderize o catálogo (`exemplos/catalogo`, `--folha`) e mostre a imagem.

**Personagens do dia a dia.** No estilo cabeção, use o `figurino.js`. Ele traz 16 personagens prontos (estudante,
professora, médica, executivo, vovó, criança, chef, atleta...) e permite montar novos trocando a pele (6 tons), o cabelo
e as cores da roupa e pondo acessórios (óculos, boné, gravata, mochila, estetoscópio, fones, celular...). Guarde a receita
do protagonista no `canal/padrao.md`, para ele ser igual em todos os vídeos.

**Rosto e efeitos.**
- Os cabeções têm rosto expressivo (`rosto()`): piscam, sorriem, gargalham, falam acompanhando a narração, ficam bravos,
  tristes ou surpresos, coram, choram e suam.
- O `motor/efeitos2d.js` traz confete, brilhos, linhas de velocidade, impacto, destaque, seta, contador, barra, gráfico de
  rosca, texto digitando, balão de pensamento e figurinhas. Há também o tremor de tela, o "soco" de câmera e as
  transições zoom, íris e deslizar.
- Use um efeito por ideia, sincronizado com a palavra (`quando`). Efeito demais cansa.

## 0. Instalar (uma vez por pasta de canal)
```bash
python3 "$E/estudio3d.py" instalar          # copia o estúdio para ./estudio3d, instala tudo e confere
```
`verificar` mostra o que falta e `atualizar` troca o motor pela versão nova do plugin sem mexer nos projetos.
Requisitos: Node.js 18+, ffmpeg e Python com `numpy` e `faster-whisper`. No primeiro uso, o Whisper baixa o modelo
(~460 MB). Num ambiente com rede restrita, libere `huggingface.co` e o CDN para onde ele redireciona.

## Fluxo (dentro de `estudio3d/`)
1. **Roteiro.** Siga `canal/padrao.md` e `canal/aprendizados.md`. Entregue o roteiro, o texto do narrador (só a fala,
   em `roteiros/<nome>/narracao.txt`) e as indicações de voz. **A pessoa grava a narração.**
2. **Projeto.**
   `python3 ferramentas/novo_projeto.py --nome <nome> --titulo "..." --roteiro ../roteiros/<nome>/narracao.txt --formato 16:9`.
   Para Reels e Shorts, use `--formato 9:16`, que já liga a legenda palavra por palavra.
   Se a narração já existir, passe `--voz arquivo`.
3. **Linha do tempo.**
   - Com a voz: `python3 ferramentas/transcrever.py --projeto projetos/<nome> [--voz arquivo]`. As palavras do roteiro
     precisam bater **≥ 90%** com o áudio; se baterem menos, pergunte se o texto mudou.
   - Sem a voz ainda: `python3 ferramentas/provisoria.py --projeto projetos/<nome>`. Monte tudo com essa linha e, quando
     a voz chegar, rode `transcrever.py --voz ...` e depois `tomadas.py sincronizar`.
4. **Tomadas.** `python3 ferramentas/tomadas.py --projeto projetos/<nome> rascunho` cria uma tomada a cada ~3,5 s. Depois:
   - Ajuste as **âncoras** (uma ideia por tomada, cortando onde a fala muda de assunto) e descreva a `cena` de cada uma.
   - Ponha `transicao`, `efeitos` e `ambiente` nas tomadas e os trechos de `musica` (presos aos ids das tomadas).
   - Rode `sincronizar` e `conferir`.
   - Regras de ritmo: uma cena nova a cada 3 a 5 s, nada parado, um cenário de abertura para cada lugar novo e uma
     metáfora visual para cada ideia abstrata.
5. **Cenas (`cenas/*.js`).** Escreva com o motor e o kit `cartoon3d`. Mantenha a aparência do protagonista igual à do
   `canal/padrao.md`. A câmera se move em toda tomada, e os textos entram junto com a palavra falada (`quando(...)`).
   Cada vídeo precisa de cenas próprias: não copie a estrutura do exemplo.
6. **Folha de contato, antes de qualquer render longo.**
   `node renderizar.mjs --projeto projetos/<nome> --folha --escala 0.5`. **Olhe** (Read) cada `construcao/folha/folha_XX.jpg`
   e corrija:
   - tomada faltando (aviso amarelo);
   - enquadramento ruim ou personagem cortado;
   - texto em cima de rosto ou fora da tela;
   - cena repetida.

   Para conferir movimento, use `--de A --ate B --escala 0.5`, que gera `construcao/previa.mp4` com a voz.
   **Mostre a folha à pessoa e peça ok.**
7. **Render final, em segundo plano.** `node renderizar.mjs --projeto projetos/<nome>` (com `run_in_background`). O log
   mostra quadros por segundo e o tempo que falta: diga a previsão à pessoa.
8. **Som e entrega.** `python3 som/mixar.py --projeto projetos/<nome>` gera a música e os efeitos, abaixa a música sob a voz,
   normaliza em −14 LUFS e grava `saida/<título>.mp4`. Para conferir:
   - a duração bate com `tomadas.json`;
   - há áudio;
   - a folha de contato do MP4 está certa: `ffmpeg -i saida/x.mp4 -vf fps=1/3,scale=320:-1,tile=5x4 -frames:v 1 folha.jpg`.

   Se quiser uma segunda opinião, rode `estrategia.py analisar-video --arquivo saida/x.mp4`. Entregue o arquivo.
9. **Capa.** Crie uma tomada de capa sem textos, com o personagem e a emoção forte. Renderize com `--quadros <t>` e ponha o
   título com `miniatura.py --imagem construcao/quadros/xxx.png --texto "PERGUNTA" --lado right`.

## Commit
Entram `roteiros/` e `estudio3d/projetos/<nome>/` (config, entrada, linha, historia e cenas). `construcao/` e `saida/`
ficam de fora, porque o vídeo é grande e é entregue pela conversa.
