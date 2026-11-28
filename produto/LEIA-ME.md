# Produto: Estúdio IA (trilha de 7 missões + plugin, R$ 79,90)

Pasta de trabalho do infoproduto. **Nada aqui usa o código da GrowKaz nem arquivos pessoais do Psique**
(narrações, projetos, quadros de referência).

## Estrutura
- `repositorio/`: o que o comprador recebe (ZIP ou repositório privado). É um marketplace do Claude Code com 1 plugin.
  - `README.md`: instalação para iniciantes, frases úteis, custos e segurança.
  - `LICENCA.md`: modelo de licença de uso pessoal. **Revisar com um advogado e preencher os [ ].**
  - `CREDITOS.md`: componentes de terceiros e licenças.
  - `plugins/estudio-ia/`: o plugin, com `agents/agente-youtube.md` e `skills/estudio-ia/` (SKILL, guias, modelos e scripts).
- `curso/`: a trilha (`LEIA-ME.md`), os roteiros das 21 aulas curtas (`missoes/`), os materiais do aluno (`materiais/`),
  as capas das 7 missões e do bônus (`capas/saida/`, feitas no estúdio 3D pelo projeto `capas/`) e 57 roteiros de aulas
  longas para depois (`aulas-extras/`, fora da oferta).
- `bonus/modelos-de-roteiro.md`: o *order bump* de R$ 27 (20 modelos de roteiro).
- `oferta.md`: preço (R$ 79,90), *order bump*, *upsell*, garantia, plataforma, afiliados, lançamento, regras de
  comunicação e objeções.
- O plugin ensina sozinho: `/estudio-ia:comecar` conduz as 7 missões (guia `guias/modo-guiado.md` da skill) e
  `/estudio-ia:travei` resolve problemas.
- `pagina-de-vendas/`: a página (`index.html`) com as imagens e vídeos em `midia/`, todos feitos pelo estúdio. O projeto
  `cena/` gera a imagem do estilo cabeção. Antes de publicar, siga o comentário no topo do `index.html` (link do
  checkout, preço e o bloco "quem ensina").

## Fases
| Fase | Situação |
|---|---|
| 1. Plugin limpo e genérico (estratégia, canal, publicação, vídeo com Veo, identidade do canal, verificador) | **pronta**: valida com `claude plugin validate` e instala com `/plugin marketplace add` + `/plugin install` |
| 2. Motor 3D próprio (render, palco, desenho, som, transcrição, tomadas sincronizadas pela fala), kit cartoon3d, modelos KayKit (CC0), instalador e exemplo | **pronta**: exemplo renderiza e mixa; transcrição e re-sincronização testadas com voz real |
| 3. Estrutura do curso, materiais, preço e página de vendas | **pronta**: trilha de 7 missões (21 aulas curtas) com o modo guiado no plugin, 7 materiais, 8 capas, *order bump*, oferta de R$ 79,90 e página de vendas |
| 4. Teste do zero como comprador (pasta limpa, conta nova) | a fazer. Conferir: a instalação no Windows e no Mac; como guardar as chaves para o app do Claude enxergar (variáveis de ambiente ou `env` do settings local); `youtube.py autorizar` rodado pela pessoa no terminal; o tempo real de render num computador comum |

## Gerar o ZIP de entrega
```bash
cd produto && zip -qr estudio-ia-v0.3.0.zip repositorio -x '*/__pycache__/*' '*/node_modules/*' '*/construcao/*' '*/saida/*' && unzip -l estudio-ia-v0.3.0.zip | tail -1
```

## Antes de vender (checklist)
- [ ] Deixar o repositório pessoal `minhas-ai-skills` **privado** (GitHub → Settings → General → Danger Zone →
      Change visibility). Hoje ele expõe as suas narrações e o plugin da GrowKaz, que você comprou.
- [ ] Conferir nos termos da compra da GrowKaz se o uso no seu canal está liberado (uso pessoal costuma estar).
- [ ] Escolher o nome comercial (hoje "Estúdio IA") e trocar em `plugin.json`, `marketplace.json`, `README.md` e `LICENCA.md`.
- [ ] Revisar a `LICENCA.md` com um advogado.
- [ ] Fase 4 e gravação das 21 aulas (a missão 1 só depois da Fase 4; comece pela missão 4, que é a melhor para divulgar).
- [ ] Preencher na página de vendas o link do checkout, o preço escolhido e o bloco "quem ensina", e conferir os preços citados.
- [ ] Preencher o prazo de atualizações (12 meses) na `LICENCA.md`.
