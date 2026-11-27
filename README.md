# minhas-ai-skills

## estudio-ia: estratégia, criação de vídeos e canal com IA
Uma skill para o ciclo inteiro de um canal: **descobrir o que funciona → criar → publicar → medir → aprender**.

- **Análises estratégicas** (`estrategia.py`)
  - **Nicho:** pesquisa com outliers, ou seja, vídeos que fizeram muito mais views que a média do próprio canal.
  - **Concorrentes:** o que bomba e o que flopa em cada canal.
  - **Engenharia reversa:** a Gemini assiste a um vídeo viral pelo link e devolve gancho, estrutura e receita replicável.
  - **Retenção:** a curva do YouTube Analytics com cada queda explicada.
- **Vídeo 3D construído por código** (`growkaz-stickman-studio/` + kit Psique)
  - A partir da sua narração: transcrição palavra por palavra e uma cena nova a cada 3–5 s.
  - Bonecos 3D, cenários KayKit, câmera em movimento, legenda palavra por palavra, música e efeitos gerados.
  - 16:9 (YouTube) ou 9:16 (Reels/Shorts). Sem IA gerando imagem, então os personagens ficam sempre iguais e não há custo de API.
  - Alternativa sob pedido: clipes gerados pelo Google Veo (`videoia.py`).
- **Canal** (`youtube.py`, `miniatura.py`, `instagram*.py`)
  - Diagnóstico e otimização de títulos, descrições, tags e miniaturas, com prévia, backup e desfazer.
  - Publicação e agendamento no YouTube e no Instagram.
- **Agente do YouTube passo a passo** (`agente-youtube`): conexão → diagnóstico → nicho → concorrentes →
  estratégia → roteiro → produção 3D → embalagem → publicação → pós-publicação, guardando o progresso em `canal/jornada.md`.

No Claude Code: *"use o agente-youtube para analisar meu canal"*, *"pesquisa o nicho de psicologia"*,
*"analisa este vídeo: <link>"*, *"faz o vídeo 3D com esta narração"*.

```bash
E=.claude/skills/estudio-ia/scripts
python3 $E/estrategia.py nicho --termo "psicologia" --termo "curiosidades da mente"
python3 $E/estrategia.py analisar-video --url https://youtu.be/XXXX
python3 $E/estrategia.py retencao --video <id> --explicar
cd growkaz-stickman-studio && node render.mjs --project projects/<slug> --sheet --scale 0.5   # folha de contato 3D
python3 $E/youtube.py postar --video "growkaz-stickman-studio/projects/<slug>/out/<título>.mp4" --titulo "..." --agendar 2026-12-01T18:45:00-03:00
```
Guia completo: [.claude/skills/estudio-ia/SKILL.md](.claude/skills/estudio-ia/SKILL.md).
Credenciais: [guias/configuracao.md](.claude/skills/estudio-ia/guias/configuracao.md).
