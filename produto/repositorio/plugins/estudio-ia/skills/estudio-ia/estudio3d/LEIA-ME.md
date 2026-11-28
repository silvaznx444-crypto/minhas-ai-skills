# Estúdio 3D: referência para escrever cenas

Vídeo 3D construído por código: cada quadro é desenhado com Three.js e canvas 2D no Chromium, capturado e codificado pelo
ffmpeg. Nenhuma IA gera imagem, então os personagens ficam sempre iguais e o texto sai nítido.
O passo a passo do trabalho está em `guias/video-3d.md` da skill. Este arquivo é a referência técnica.

## Pastas
```
estudio3d/
  renderizar.mjs   player.html   package.json
  motor/       nucleo.js (tempo, curvas, fala) · desenho.js (2D) · palco3d.js (3D) · player.js (monta o quadro)
  kits/cartoon3d/  bonecos.js · cenarios.js · objetos.js · maos.js · interface.js · feijao.js · modelos/ · personagens/
  som/         sintese.py · efeitos.py · musica.py · mixar.py
  ferramentas/ novo_projeto.py · provisoria.py · transcrever.py · tomadas.py
  exemplos/demo/   projeto completo de referência (6 tomadas)
  projetos/<nome>/
     config.json   entrada/ (voz, roteiro)   linha/ (palavras, frases)   historia/tomadas.json   cenas/*.js
     construcao/ (folha, quadros, prévia, vídeo sem som, mix)   saida/<título>.mp4
```
Todo `.js` em `cenas/` é carregado sozinho, menos os que começam com `_`, que servem para código comum
(ex.: `cenas/_base.js`). Importe o motor por caminho absoluto (`/motor/nucleo.js`, `/kits/cartoon3d/bonecos.js`) e o
`three` por `import * as THREE from 'three'` (ou `THREE` de `/motor/palco3d.js`).

## config.json
`titulo`, `formato` ("16:9" | "9:16"), `resolucao` ("720p" | "1080p" | "1440p" | "2160p"), `fps` (24 | 30),
`estilo` (natural, vivo, cinema, quente, frio, sonho), `legenda` (true/false ou `{y, tamanho, max, corDestaque}`),
`voz`, `roteiro`, `duracao`, `contorno` (espessura da tinta, 0 = sem contorno), `fadeEntrada`, `fadeSaida`,
`musica {ativa, ganho_db}`, `efeitos {ativos, ganho_db}`, `loudness` (-14) e `cor` (para sobrescrever o estilo).
**As cenas sempre desenham em 1920×1080 (ou 1080×1920 no vertical).** A resolução só muda o tamanho final.

## historia/tomadas.json
```json
{ "duracao": 21.6,
  "musica": [{"de": 0, "ate": "S03", "clima": "curioso"}, {"de": "S03", "clima": "misterio"}],
  "tomadas": [
    {"id": "S01", "ancora": "Você já", "ini": 0, "fim": 3.9, "cena": "o que aparece",
     "transicao": {"tipo": "fade", "dur": 0.35}, "efeitos": [[0.3, "swoosh", -18]], "ambiente": ["cidade", -30]} ] }
```
- `ancora`: as palavras em que a tomada começa. O `tomadas.py sincronizar` calcula `ini` e `fim` a partir delas.
  **Nunca escreva tempo à mão; mude a âncora.**
- `transicao.tipo`: `corte` (padrão), `fade`, `chicote` (deslize rápido) ou `branco` (clarão).
- Efeitos: pop, estalo, swoosh, ding, plim, blip, batida, grave, brilho, coracao, relogio, trovao, vibrar, torcida,
  digitar, erro e sucesso. Ambientes: sala, vento, chuva, cidade, natureza e noite. Músicas: calmo, curioso, misterio,
  tenso, alegre, emocionante, triste e epico.

## Uma tomada
```js
import { registrarTomada, E, quando, chaves, curva, prog, mix } from '/motor/nucleo.js';
import { THREE, palco, toon, moverCamera, naTela } from '/motor/palco3d.js';
import { carimbo, etiqueta, cartela } from '/motor/desenho.js';

registrarTomada('S04', {
  criar(info) {                       // 1 vez: monte a cena. 3D = devolva { cena, camera, ... }
    const p = palco({ clima: 'estudio', fov: 36 });
    const cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffd84a')); p.cena.add(cubo);
    return { ...p, cubo };
  },
  quadro(e, { t, T, dur, k }) {      // a cada quadro: anime pelo tempo (t = dentro da tomada, T = global)
    e.cubo.rotation.y = t * 1.2;
    moverCamera(e.camera, t, [[0, [0, 1.5, 5], [0, 0.5, 0]], [dur, [1, 1.8, 3.5], [0, 0.5, 0]]]);
  },
  sobre(g, { T }, e) {                // camada 2D por cima: textos, etiquetas, interface
    carimbo(g, T, quando('sincronia') ?? T, 'SINCRONIA');
  },
});
```
Tomada só 2D: não devolva `cena` e desenhe em `quadro(e, info, g)`. Uma tomada sem cena escrita aparece como aviso
amarelo na folha de contato.

## motor/nucleo.js
- `E`: W, H, fps, duracao, formato, config, tomadas, palavras `[{texto, ini, fim}]` e frases.
- `V(horizontal, vertical)`: escolhe o valor pela orientação.
- `quando('palavras', depois=0, 'ini'|'fim')`: tempo em que a fala diz aquilo. Use para sincronizar textos e ações com a voz.
- `palavraEm(T)` e `falando(T, a, b)` (0..1, para a boca dos personagens).
- `prog(t, a, b)` (0→1), `lim`, `mix` e `curva.{linear, entra, sai, entraSai, volta, elastico, pulo}`.
- `chaves(t, [[t0, v0], [t1, v1, curva.sai], ...])`: quadros-chave de números ou listas.
- `acaso(n, semente)` e `ruido(x, semente)`. **Nunca use `Math.random` nem `Date.now`:** o mesmo T precisa gerar o mesmo quadro,
  porque o vídeo é renderizado em vários processos ao mesmo tempo.

## motor/desenho.js (2D, coordenadas do quadro lógico)
- `texto(g, str, x, y, {tamanho, cor, fonte, peso, contorno, corContorno, alinhar, largura})`. Fontes: `FONTES.ui` (Nunito),
  `FONTES.titulo` (Fredoka) e `FONTES.serifa` (Playfair).
- `retangulo` (caminho arredondado), `circulo`, `anel`, `linha`, `poligono`, `brilho`, `alfa(cor, a)`, `tom(cor, k)` e `gradiente`.
- Peças prontas:
  - `legenda(g, T)` (automática com `config.legenda`);
  - `etiqueta(g, str, x, y, opacidade, {fundo, borda, tamanho})`;
  - `cartela(g, T, ini, fim, nome, descricao)` (nome de pesquisador ou fonte);
  - `carimbo(g, T, em, 'TÍTULO', {sub, y, cor, sai})`;
  - `vinheta` e `clarao(g, T, em)`.

## motor/palco3d.js
- `palco({clima, fov, ceu, nevoa: [perto, longe], corNevoa, sol: [x,y,z], intensidade, ambiente, recorte, sombra})` devolve
  `{cena, camera, sol, hemi, recorte}`. Climas: dia, entardecer, noite, interior, interiorNoite e estudio.
- `toon(cor, extra)` (material de desenho animado, com contorno automático) e `plano(cor)` (sem luz, sem contorno).
  `material.userData.contorno = false` tira o contorno de um material; `userData.espessura = 1.5` engrossa.
- `moverCamera(camera, t, [[t, pos, alvo, fov?], ...], {tremor, T, giro})`, `apontar(camera, pos, alvo, fov)` e `tremor(T, amp)`.
- `naTela(camera, [x,y,z])` devolve `{x, y, visivel}`, para pôr etiquetas 2D presas a objetos 3D.

## kits/cartoon3d
- **bonecos.js:** `makePuppet(spec)` devolve `{root, setPose(pose), setFace(rosto)}`. A frente é +z e a altura fica perto de 1,75 m.
  - `spec`: skin, top (sweater, hoodie, coat, tunic, robe), topColor, collar, inner, legColor, shoeColor,
    shoes (sneakers, sandals, bare), hair (messy, curly, short...), hairColor, hat (beanie, police), lids, eyeBags, height.
  - `POSE`: stand, relaxed, point, offer, coverEyes, shrug, crossArms, handShoulder, lookHands, phone, rubFace, reach, wipeTears,
    headDown, lieBack, shout, headInHands, laugh, stretch, wave, typing, strapsHeavy, chalk, seated, fists, openArms,
    holdFront, sitGround e lieFace.
  - `walkPose(fase, base)`, `posesAt(t, [[t, POSE.x], ...])` e `blendPose(a, b, k)`.
  - `setFace({blink, lids, look: [x,y], smile, sad, talk, brows, browUp, closed, tears, bags})`.
- **cenarios.js:** `street({night, fov})` (rua com prédios, carros e árvores) e `bedroom({night})` (quarto/sala).
  Os dois devolvem `{cena, camera, ...}`. `prop(nome, altura)` carrega um modelo de `modelos/` (prédios, carros, bancos, móveis,
  postes...).
- **objetos.js:** `TEX` (texturas), `books`, `plant`, `wallClock`, `curtain`, `frameArt`, `chandelier`, `umbrella`, `clipboard`,
  `bird`, `grassField`, `flowerField` e `crowdSpec(i)` (figurantes variados).
- **maos.js:** `makePovArm(lado, spec)`, mãos em primeira pessoa (POV).
- **interface.js:** `wordCaption`, `slamTitle`, `phone` (chat, perfil, notificação), `newspaper`, `tvFrame`, `heartsRain` e `textSpam`.
- **feijao.js:** `drawBean` (personagem 2D) e `beanSprite` (o mesmo personagem como placa dentro do 3D).
- **personagens/** (`Knight`, `Barbarian`, `Mage`, `Rogue`, `Rogue_Hooded`): personagens KayKit com animações. Carregue com
  `GLTFLoader` e toque as animações com `THREE.AnimationMixer`, avançando com `mixer.setTime(t)`, que é determinístico.

## Comandos
```bash
node renderizar.mjs --projeto projetos/x --folha --escala 0.5      # folha de contato (1 quadro por tomada)
node renderizar.mjs --projeto projetos/x --quadros 3.5,12          # quadros soltos (PNG)
node renderizar.mjs --projeto projetos/x --de 10 --ate 18 --escala 0.5   # prévia de um trecho, com a voz
node renderizar.mjs --projeto projetos/x [--processos 4]           # vídeo inteiro (sem som)
python3 som/mixar.py --projeto projetos/x                          # som + vídeo final em saida/
```
Velocidade medida numa máquina de nuvem de 4 núcleos: ~4 quadros/s em 720p. Em 1080p, conte de 2 a 3 vezes mais tempo.
Problemas: se a cena ficar preta, procure erros de Three.js no terminal (`[página]`/`[console]`). Uma `cena` com erro de
import aparece em "ERROS nas cenas" no começo do render.

Créditos: modelos e personagens KayKit de Kay Lousberg (CC0); Three.js (MIT); fontes Nunito, Fredoka e Playfair Display (SIL OFL).
