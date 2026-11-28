# Checklist de instalação

Marque cada item. Se travar, mande ao agente: **"Travei no item X do checklist; o erro é este: ..."** (sem chave nem token).

## Parte 1: o computador (módulo 1)
- [ ] Plano pago do Claude com o Claude Code
- [ ] App do Claude para computador instalado (ou o Claude Code no terminal)
- [ ] Python 3.9 ou mais novo (no Windows: "Add python.exe to PATH" marcado)
- [ ] Node.js 18 ou mais novo (versão LTS)
- [ ] ffmpeg
- [ ] Uns 2 GB livres no disco
- [ ] ZIP do Estúdio IA descompactado em `Documentos/estudio-ia`
- [ ] `/plugin marketplace add <pasta>` e `/plugin install estudio-ia@estudio-ia` feitos
- [ ] Pasta do canal criada (`Documentos/meu-canal`) e Claude Code aberto nela
- [ ] "Use o agente do YouTube do estudio-ia para começar meu canal" → verificador rodou
- [ ] "Instala o estúdio 3D" → instalado e conferido
- [ ] Exemplo renderizado: há um MP4 em `estudio3d/exemplos/.../saida/`

## Parte 2: as contas (módulo 2)
- [ ] Conta e projeto no Google Cloud (com o crédito de conta nova ativo)
- [ ] API Vertex AI ativada
- [ ] Conta de serviço `video-ia` com o papel Vertex AI User e a chave JSON guardada em `VERTEX_SA_JSON`
- [ ] YouTube Data API v3 e YouTube Analytics API ativadas
- [ ] Tela de consentimento: tipo Externo, seu e-mail como usuário de teste e **app publicado**
- [ ] ID do cliente OAuth (App para computador): `YT_CLIENT_ID` e `YT_CLIENT_SECRET` guardados
- [ ] `youtube.py autorizar` rodado no seu terminal: `YT_REFRESH_TOKEN` guardado
- [ ] Canal verificado por telefone (youtube.com/verify), para usar miniatura personalizada
- [ ] (Opcional) Instagram profissional + token de usuário do sistema: `IG_ACCESS_TOKEN` e `IG_USER_ID`
- [ ] Verificador sem nenhum FALTA

## Segurança
- [ ] Nenhuma chave foi colada no chat, num arquivo do canal ou num print
- [ ] Se a pasta do canal estiver no GitHub, o repositório é **privado**
