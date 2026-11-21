#!/usr/bin/env bash
# Baixa os pacotes 3D gratuitos KayKit (licença CC0, de Kay Lousberg) usados nos vídeos 3D.
# Uso: bash assets-3d/baixar-kaykit.sh [pasta-destino]   (padrão: ../kaykit-game-assets)
set -euo pipefail
DEST="${1:-$(cd "$(dirname "$0")/../.." && pwd)/kaykit-game-assets}"
mkdir -p "$DEST"
for r in kaykit-character-pack-adventures-1.0 kaykit-city-builder-bits-1.0 kaykit-furniture-bits-1.0 kaykit-prototype-bits-1.0; do
  if [ -d "$DEST/$r/.git" ]; then echo "já existe: $r"; continue; fi
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 "https://github.com/KayKit-Game-Assets/$r" "$DEST/$r"
done
echo "Pronto: $DEST"
