# Vídeo 3D construído por código (padrão do canal)

Cada quadro é **desenhado por código** (Three.js + canvas), capturado no Chromium sem tela e codificado com o
ffmpeg. Nenhuma IA gera imagem ou vídeo: os personagens ficam sempre iguais, o texto sai nítido e não há custo de
API, só tempo de render. A base é a **narração do usuário** e cada cena ilustra a frase falada enquanto está na tela.

- **Estúdio:** `growkaz-stickman-studio/`, com `render.mjs`, `engine/`, `tools/` e `audio/`. Cada vídeo fica em `projects/<slug>/`.
- **Kit Psique:** `growkaz-stickman-studio/kits/psique/`. O cabeçalho de cada arquivo documenta a API:

  | Arquivo | O que faz |
  |---|---|
  | `puppet3d.js` | bonecos 3D procedurais: `makePuppet`, poses em `POSE`, `walkPose` e `posesAt` (andar, sentar, apontar, cobrir os olhos...) |
  | `world3d.js` | cenários com modelos KayKit: `street` (dia/noite) e `bedroom`; `prop(nome, altura)` |
  | `props3d.js` | texturas (`TEX`), livros, plantas, relógio, cortina, quadros e figurantes |
  | `pov.js` | mãos em primeira pessoa (`makePovArm`) |
  | `ui.js` | legenda de 1 palavra, título carimbado, celular, jornal, TV, chuva de corações |
  | `bean.js` | personagem "feijão" em 2D |

  Os modelos KayKit (CC0) ficam em `kits/psique/assets/`. Os bonecos de aventureiro (`Knight.glb`,
  `Barbarian.glb`, `Mage.glb`, `Rogue*.glb`) estão em `projects/reels-apego/assets/` (copie para o projeto novo) ou saem do
  `bash assets-3d/baixar-kaykit.sh`, que baixa ~185 MB do GitHub.
- **Referência do motor:** `plugins/tubemakers/skills/make-2d-video/references/`. São eles `engine-api.md` (API de
  cena, `config.json`, `shots.json` e `three-kit`), `story-breakdown.md` (ritmo e tomadas), `sound-design.md`
  (música e efeitos), `render-qc.md` (render, checklist de QC e problemas) e `style-bible.md` (estilo original de bonecos
  de palito, útil para luz e câmera). Leia `engine-api.md` uma vez antes de escrever as tomadas.
- **Padrão do canal Psique:** `roteiros/PROMPT_PADRAO_PSIQUE.md`. Leia-o inteiro em todo vídeo do Psique, porque ele
  define roteiro, estilo, capa, textos e horários.
- **Aprenda com um projeto parecido**, sem copiar as cenas (cada vídeo precisa de cenas próprias):
  - 16:9 do YouTube: `projects/sono-imersivo` (`scenes/_lib.js` + 6 arquivos de tomadas por cenário).
  - 9:16 dos Reels: `projects/reels-apego` (`scenes/shots/apego.js` e `story/gera_tomadas.py`).

## Preparar o ambiente (uma vez por máquina)
```bash
cd growkaz-stickman-studio
npm install                                  # three, playwright, fontes
pip install numpy scipy faster-whisper       # transcrição e som
export CHROMIUM_PATH=/opt/pw-browsers/chromium   # Chromium já instalado no ambiente de nuvem
export HF_HUB_DISABLE_XET=1                  # baixa o modelo do Whisper pelos hosts liberados
python3 tools/doctor.py && python3 tools/verify_kit.py
```
No ambiente de nuvem `minhas-ai-skills`, o script de preparação e essas duas variáveis já estão salvos. Os hosts liberados
são `huggingface.co` e `us.aws.cdn.hf.co`, usados no primeiro download do modelo do Whisper.

## Fluxo (rode tudo dentro de `growkaz-stickman-studio/`)
1. **Roteiro e narração.** Siga o `PROMPT_PADRAO_PSIQUE.md` e `canal/aprendizados.md`. Salve em `roteiros/<slug>/`:
   `roteiro.md`, `narracao.txt` (só a fala) e o prompt de voz. **O usuário grava a narração.** Sem ela, você pode montar
   as tomadas com uma linha do tempo provisória e re-sincronizar quando a voz chegar (veja o passo 4).
2. **Projeto.**
   ```bash
   python3 tools/new_project.py --name <slug> --voice <narracao.wav|mp3> --script roteiros/<slug>/narracao.txt \
     --aspect 16:9 --resolution 1080p --style mosaico --fps 24      # YouTube (Reels: --aspect 9:16 --fps 30)
   ```
   Estilos de cor do canal: `mosaico` (o padrão dos vídeos do Psique) e `vivo` (claro, sem vinheta). Os outros estão em `engine/styles.js`.
3. **Transcrição palavra por palavra.**
   `python3 tools/transcribe.py --project projects/<slug> --script projects/<slug>/input/script.txt --lang pt --model small`.
   A correspondência precisa ser **≥ 90%**. Abaixo disso, o áudio e o texto são diferentes: pergunte ao usuário.
   Depois rode `python3 tools/beats.py --project projects/<slug>`, que gera o rascunho de `story/shots.json`.
4. **Tomadas (`story/shots.json`).** Uma cena nova a cada 3 a 5 s, cortes no limite das frases e um cenário de
   abertura para cada lugar novo. Prefira escrever um `story/gera_tomadas.py` que ancora cada tomada numa palavra do
   `timeline/words.json`, como no `reels-apego`. Assim, quando a narração real chegar ou mudar, basta transcrever de
   novo e rodar o script para tudo re-sincronizar. Ponha também `music` (clima por trecho), `sfx` e `amb` (ambiente)
   por tomada.
5. **Cenas (`scenes/shots/*.js`).** Monte os cenários e as tomadas com o kit Psique. Siga o padrão do canal:
   - 3D cartoon com contorno de tinta e luz de cinema.
   - O protagonista recorrente é o rapaz de suéter azul.
   - A ciência aparece de forma visual: laboratório, cérebro 3D, gráficos.
   - As etiquetas na tela trazem dados e nomes de cientistas.
   - A câmera se move em toda tomada e nada fica parado.
   - Para a legenda palavra por palavra, use `wordCaption` do `ui.js` (Reels) ou `captions` no `config.json`.
6. **Folha de contato, antes de tudo.** Rode `node render.mjs --project projects/<slug> --sheet --scale 0.5` e **olhe**
   (Read) cada `build/sheets/sheet_XX.png`. Corrija o que estiver errado: tomada faltando, enquadramento, texto
   cortado ou cena repetida. Para conferir movimento, use `--stills 12,30.5` ou `--from 40 --to 52 --scale 0.5`, que
   gera `build/preview.mp4`. **Mostre a folha ao usuário antes do render final.**
7. **Render final, em segundo plano.** `node render.mjs --project projects/<slug>` (com `run_in_background`).
   Medido aqui: ~1 s de vídeo a cada 14 s a meia resolução. Em 1080p conte ~25 min para um Reels de 1 min e 1h30 ou mais
   para um vídeo de 3 min. O log mostra fps e ETA: diga a previsão ao usuário.
8. **Som e entrega.** `python3 audio/mix.py --project projects/<slug>` gera a música e os efeitos, abaixa a música
   sob a voz, normaliza em −14 LUFS e junta tudo em `out/<título>.mp4`. Para conferir, veja se a duração bate, se há
   áudio e faça uma folha de contato do MP4 (`-vf fps=1/10,scale=320:-1,tile=6x5`). Se quiser uma segunda opinião,
   rode `python3 ../.claude/skills/estudio-ia/scripts/estrategia.py analisar-video --arquivo out/<título>.mp4`.
   Mande o arquivo ao usuário (SendUserFile).
9. **Capa.** Crie uma tomada de capa **sem textos**, com o personagem e a emoção forte (veja `projects/capa-perdao`).
   Renderize com `--stills <t>` e ponha o título com
   `python3 .claude/skills/estudio-ia/scripts/miniatura.py --imagem <still.png> --texto "PERGUNTA CURTA" --lado right --saida ...`.
   Também dá para entregar o prompt da capa e o texto para o Canva, como manda o padrão do Psique.

## Commit
Faça commit de `roteiros/<slug>/` e `projects/<slug>/`: config, input (a narração do usuário), timeline, story e
scenes. As pastas `build/` e `out/` ficam fora do git, porque o MP4 é grande. Entregue o vídeo pela conversa.
