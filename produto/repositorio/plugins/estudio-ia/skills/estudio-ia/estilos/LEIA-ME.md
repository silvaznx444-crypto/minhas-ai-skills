# Estilos (presets visuais para o pipeline do Veo)

Crie uma pasta por estilo: `estilos/<nome>/` com
- `estilo.txt`: descrição em inglês do visual (render, proporções, olhos, cabelo, paleta, luz, lente);
- `ref_1_*.png`, `ref_2_*.png`...: 2 a 4 quadros de referência **seus** (sem legenda), que a IA de imagem usa para copiar o estilo;
- `legenda.json` (opcional): `{"palavras": 3, "tamanho": 78, "margem": 620, "contorno": 6, "pop": true}`.

Use no `storyboard.json` com `"estilo_preset": "<nome>"`. Passo a passo em `guias/video-veo.md`.
