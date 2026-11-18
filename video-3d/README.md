# video-3d — vídeos com animações 3D (Three.js + Remotion)

## Instalado
- **remotion**, **@remotion/cli**: criação e renderização de vídeo com React
- **three**, **@react-three/fiber**, **@remotion/three**: animações 3D
- **@remotion/captions**: legendas (estilo TikTok, palavra por palavra)
- **@remotion/media**, **@remotion/media-utils**: áudio/vídeo e visualização de áudio
- **@remotion/transitions**: transições entre cenas

## Comandos
```bash
npm install         # instala as dependências
npm run dev         # abre o Remotion Studio (pré-visualização no navegador)
npm run render      # renderiza out/video.mp4
npm run still       # gera uma imagem de um frame
```

## Estrutura
- `src/Root.tsx` — define as composições (duração, fps, resolução)
- `src/Cena3D.tsx` — cena 3D (cubo animado)
- `src/Legendas.tsx` — legendas sincronizadas
- `public/` — coloque aqui áudios/imagens e use `staticFile("arquivo.mp3")`
