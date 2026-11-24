# minhas-ai-skills

## video-ia
Vídeos curtos verticais feitos 100% com IA: roteiro → personagens consistentes → clipes do Google Veo
com fala e lip-sync → legendas coloridas por personagem → `final.mp4` 1080x1920.

```bash
export VERTEX_SA_JSON="$(cat service-account.json)"   # Google Cloud (créditos grátis)
# ou: export GEMINI_API_KEY=...
python3 .claude/skills/video-ia/scripts/videoia.py tudo \
  --projeto projetos/meu-video --ideia "sua ideia aqui" --cenas 3 --sim
```
Detalhes em [.claude/skills/video-ia/SKILL.md](.claude/skills/video-ia/SKILL.md).

## gestor-canal (agente `gestor-de-canal`)
Analisa o canal do YouTube e o Instagram pelas APIs oficiais, diz o que melhorar, aplica as mudanças
(títulos, descrições, tags, miniaturas, descrição do canal — com prévia, backup e desfazer), responde
comentários, cria vídeos 3D com a `video-ia` e posta/agenda no YouTube Shorts e no Instagram.

No Claude Code: *"use o agente gestor-de-canal para analisar meu canal"*.
Configuração e rotina em [.claude/skills/gestor-canal/SKILL.md](.claude/skills/gestor-canal/SKILL.md).
