# Configuração (uma vez)

Tudo fica em variáveis de ambiente do ambiente de nuvem (ou `export` na máquina local).
Nunca peça para o usuário colar chave/token no chat.

```bash
E=.claude/skills/estudio-ia/scripts
python3 $E/videoia.py modelos      # Vertex/Gemini ok? mostra os modelos escolhidos
python3 $E/youtube.py conta        # YouTube ok?
python3 $E/instagram.py conta      # Instagram ok?
```

## Vertex AI / Gemini (imagens, vídeos com Veo, análises com Gemini)
Dois provedores; o script escolhe sozinho (`--provedor auto`): Vertex se houver credencial do Google Cloud, senão Gemini API.

**A) Vertex AI / Google Cloud (recomendado — usa os US$ 300 de crédito grátis de conta nova)**
1. console.cloud.google.com → criar conta (teste grátis) e um projeto.
2. Ativar a API **Vertex AI** no projeto.
3. IAM → Service accounts → criar `video-ia` com o papel **Vertex AI User** → Keys → Add key → JSON.
4. Variáveis de ambiente: `VERTEX_SA_JSON` = conteúdo do JSON (texto ou base64) e,
   opcional, `GOOGLE_CLOUD_LOCATION` (padrão `us-central1`). O projeto vem do próprio JSON.
   Localmente também serve `gcloud auth application-default login` + `GOOGLE_CLOUD_PROJECT`.
- `pip install google-auth`
- Hosts usados: `oauth2.googleapis.com`, `us-central1-aiplatform.googleapis.com`, `aiplatform.googleapis.com`.

**B) Gemini API (AI Studio)**
- Chave da Gemini API com faturamento (aistudio.google.com → Get API key).
  - No ambiente cloud: salve em *Network secrets* para o host `generativelanguage.googleapis.com`,
    header `x-goog-api-key`; ou como variável de ambiente `GEMINI_API_KEY`.
  - Na máquina local: `export GEMINI_API_KEY=...`
- `ffmpeg` com libass e `pip install requests google-auth`.
- Teste: `python3 $E/videoia.py modelos` (mostra os modelos escolhidos automaticamente).


## YouTube (análise, estratégia, otimização e postagem)
Usado por `youtube.py` e `estrategia.py`. Pode ser o mesmo projeto do Google Cloud do Vertex.
1. console.cloud.google.com → APIs e serviços → ativar **YouTube Data API v3** e **YouTube Analytics API**.
2. Tela de consentimento OAuth → tipo *Externo* → adicionar o próprio e-mail em *Usuários de teste*
   (e depois *Publicar app*, senão o token expira em 7 dias).
3. Credenciais → Criar → **ID do cliente OAuth** → tipo **App para computador**. Anote ID e chave secreta.
4. No computador do usuário: `export YT_CLIENT_ID=... YT_CLIENT_SECRET=...` e `python3 $E/youtube.py autorizar`
   → abre o link, entra com a conta dona do canal, cola o endereço de volta → recebe `YT_REFRESH_TOKEN`.
5. Salvar `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` nas variáveis do ambiente.
   Hosts: `oauth2.googleapis.com`, `www.googleapis.com`, `youtubeanalytics.googleapis.com`, `i.ytimg.com`.
6. Teste: `python3 $E/youtube.py conta`.
- Cota grátis: ~10.000 unidades/dia. Busca (`estrategia.py nicho`, 50 vídeos por termo) = 100, editar vídeo = 50,
  envio de vídeo ≈ 1.600, o resto 1–3 (confira a tabela atual). Não edite mais que ~40 vídeos por dia.
- Miniatura personalizada exige canal verificado (youtube.com/verify).
- A Gemini assiste vídeos do YouTube pelo link (só públicos). Vídeo privado, não listado ou ainda não postado:
  passe o arquivo (`--arquivo`).

## Instagram
**Postar Reels** — `$E/instagram.py` (API oficial, "Instagram API com Instagram Login").
Apps novos da Meta (login unificado): `IG_ACCESS_TOKEN` = token de **usuário do sistema** (não expira,
gerado em business.facebook.com → Configurações → Usuários do sistema, com o app e a conta do Instagram
atribuídos e as permissões `instagram_basic` + `instagram_content_publish`) e `IG_USER_ID` = ID da conta do
Instagram (Configurações do negócio → Contas → Contas do Instagram). Hosts: `graph.facebook.com`, `rupload.facebook.com`.
Apps antigos com login do Instagram: só `IG_ACCESS_TOKEN` (60 dias) e host `graph.instagram.com`. Teste: `python3 $E/instagram.py conta`.

**Analisar o perfil e responder comentários** — `$E/instagram_canal.py`, com as mesmas variáveis e as permissões
extras `instagram_manage_insights` e `instagram_manage_comments` no token. Teste: `python3 $E/instagram_canal.py analisar --posts 3`.

## Estúdio 3D (vídeos construídos por código)
Não usa chave de API. Precisa de Node 18+, ffmpeg, Chromium e Python com `numpy`, `scipy` e `faster-whisper`.
Passo a passo e teste: [video-3d.md](video-3d.md#preparar-o-ambiente-uma-vez-por-máquina).
- No ambiente de nuvem `minhas-ai-skills` já estão salvos:
  - o script de preparação (`npm install` do estúdio e os pacotes Python);
  - as variáveis `CHROMIUM_PATH=/opt/pw-browsers/chromium` e `HF_HUB_DISABLE_XET=1`;
  - os hosts `huggingface.co` e `us.aws.cdn.hf.co`, usados uma vez para baixar o modelo do Whisper.
- Teste: `cd growkaz-stickman-studio && python3 tools/doctor.py && python3 tools/verify_kit.py`.
