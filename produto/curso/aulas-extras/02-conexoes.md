# Módulo 2: Conectando Google, YouTube e Instagram

**Objetivo:** o agente consegue ler o canal, analisar vídeos com a Gemini e postar, com as chaves guardadas no lugar certo.
**Material:** [checklist-instalacao.md](../materiais/checklist-instalacao.md), parte 2.
**Atenção na gravação:** borre IDs, chaves, o JSON da conta de serviço e o seu e-mail.

---

## Aula 2.1: Google Cloud e Gemini (12 min)
**Na tela:** console.cloud.google.com.

**Roteiro**
1. **Resultado primeiro:** o verificador mostrando "Vertex/Gemini: OK".
2. Para que serve: a Gemini **assiste** a vídeos (o Claude lê texto e imagem, mas não assiste a vídeo). É ela que faz
   a engenharia reversa dos virais e explica as quedas de retenção.
3. Passo a passo:
   - crie a conta no Google Cloud (a conta nova ganha crédito grátis; mostre o valor atual) e um projeto;
   - ative a API **Vertex AI**;
   - em IAM → Contas de serviço, crie `video-ia` com o papel **Vertex AI User** e baixe a chave em JSON.
4. Guarde a chave como variável de ambiente `VERTEX_SA_JSON`. Peça ao agente: **"Me ensina a guardar a chave do Vertex
   como variável de ambiente no meu computador, sem colar no chat."** Ele mostra o jeito certo para o seu sistema.
5. Teste: **"Roda o verificador de novo."**

**Alternativa:** uma chave da Gemini API no AI Studio, em `GEMINI_API_KEY`. É mais simples, mas não usa o crédito do
Google Cloud.

**Erros comuns:** a API não foi ativada no projeto; ou o papel da conta de serviço está errado.

---

## Aula 2.2: Ligando o YouTube (12 min)
**Na tela:** o mesmo projeto do Google Cloud e o terminal.

**Roteiro**
1. Em APIs e serviços, ative a **YouTube Data API v3** e a **YouTube Analytics API**.
2. Configure a tela de consentimento OAuth:
   - tipo **Externo**;
   - coloque o seu e-mail em "Usuários de teste";
   - depois clique em **Publicar app**. Se ficar em teste, o acesso expira em 7 dias.
3. Em Credenciais, crie um **ID do cliente OAuth** do tipo **App para computador** e guarde o ID e a chave secreta
   como `YT_CLIENT_ID` e `YT_CLIENT_SECRET`.
4. Peça: **"Como eu autorizo o YouTube?"** O agente passa o comando `youtube.py autorizar`, para você rodar **no seu
   terminal, fora do chat**, porque o comando espera você colar uma resposta. Então:
   - abra o link;
   - entre com a conta **dona do canal** e aceite;
   - o navegador vai para uma página "localhost" que não abre, e isso é normal;
   - copie o endereço da barra e cole no terminal.

   Guarde o `YT_REFRESH_TOKEN` que aparecer como variável de ambiente, igual às outras chaves.
5. Teste: **"Mostra os dados da minha conta do YouTube."**
6. A cota grátis é de umas 10 mil unidades por dia. Uma pesquisa de nicho gasta 100 por termo, e o agente avisa
   quando está perto do limite.
7. Para usar miniatura personalizada, o canal precisa ser verificado por telefone (youtube.com/verify).

**Erros comuns**
- `invalid_grant`: o app ficou em modo de teste. Publique o app e autorize de novo.
- Erro 403 no Analytics: você entrou com uma conta que não é dona do canal.

---

## Aula 2.3: Instagram (opcional, 10 min)
**Na tela:** o Meta Business Suite.

**Roteiro**
1. Requisito: conta **profissional** do Instagram (criador ou empresa) ligada a um portfólio empresarial.
2. Crie o app em developers.facebook.com e gere o token de **usuário do sistema** (que não expira), com as permissões
   de publicar conteúdo, ver os insights e gerenciar os comentários.
3. Guarde `IG_ACCESS_TOKEN` e `IG_USER_ID`.
4. Teste: **"Mostra os dados da minha conta do Instagram."**
5. Diga que a Meta muda as telas com frequência. Se a tela estiver diferente, peça ao agente: "estou nesta tela, o que
   faço?", mandando um print **sem o token aparecendo**.

---

## Aula 2.4: Suas chaves em segurança (5 min)
**Roteiro**
1. Regra de ouro: **chave nunca vai no chat, num arquivo do canal ou num print.** Ela fica em variável de ambiente.
2. O agente foi feito para nunca pedir que você cole senha ou token na conversa. Se algum texto pedir, desconfie.
3. Se a pasta do canal for um repositório no GitHub, ele precisa ser **privado**, e as chaves não podem ir para ele.
4. Se uma chave vazar:
   - no Google Cloud, apague a chave da conta de serviço e crie outra;
   - no YouTube, revogue o acesso em myaccount.google.com → Segurança e autorize de novo;
   - na Meta, gere outro token.
5. Rode o verificador e confirme que está tudo OK.

**Tarefa do módulo:** o verificador sem nenhum FALTA (o Instagram pode ficar de fora, se você não for usar).
