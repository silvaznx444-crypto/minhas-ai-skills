#!/usr/bin/env python3
"""Gera as páginas legais da GRIFHII com o mesmo cabeçalho/menu/rodapé da loja.
Uso: python3 tools/gerar-paginas-legais.py site/legal
Campos sem informação real ficam como [PREENCHER: ...]; o build de produção bloqueia se restarem."""
import sys, pathlib, html

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'site/legal')
ATUALIZADO = '03/11/2026'
F = lambda t: f'<mark class="legal-pending">[PREENCHER: {html.escape(t)}]</mark>'

EMAIL = '<a href="mailto:grifhiiconceito@gmail.com">grifhiiconceito@gmail.com</a>'
ENDERECO = '10 R da Aroeira, S/N, Quadra 10, Lote 17, Jardim Primavera, Santa Helena de Goiás — GO, CEP 75920-000'
EMPRESA = f'''<p><strong>Fornecedor e controlador dos dados:</strong> GRIFHII CONCEITO, nome comercial de <strong>64.979.097 KELLSON REGYS ANDRADE DA COSTA</strong> (empresário individual, microempresa), CNPJ <strong>64.979.097/0001-09</strong>, com sede em {ENDERECO}.</p>
<p><strong>Canais de atendimento:</strong> WhatsApp <a href="https://wa.me/5564981025225" target="_blank" rel="noopener">(64) 98102-5225</a> · e-mail {EMAIL} · Instagram <a href="https://www.instagram.com/grifhii/" target="_blank" rel="noopener">@grifhii</a>.</p>'''

PAGES = {
'privacidade': ('Política de Privacidade', 'Como a GRIFHII CONCEITO trata dados pessoais na loja online: finalidades, bases legais, fornecedores, cookies, prazos e direitos previstos na LGPD.', f'''
<p class="legal-meta">Última atualização: {ATUALIZADO}. Versão sujeita a revisão jurídica antes da abertura das vendas.</p>
<h2>1. Quem é o controlador</h2>
{EMPRESA}
<p><strong>Canal de privacidade (LGPD):</strong> {EMAIL}. Como agente de tratamento de pequeno porte, a loja mantém este canal de comunicação com os titulares (Resolução CD/ANPD nº 2/2022).</p>
<h2>2. Quais dados tratamos e por quê</h2>
<table class="legal-table"><thead><tr><th>Situação</th><th>Dados</th><th>Finalidade</th><th>Base legal (LGPD, art. 7º)</th></tr></thead><tbody>
<tr><td>Navegação no site</td><td>Itens da sacola guardados no seu próprio navegador (armazenamento local); endereço IP e dados técnicos recebidos pela hospedagem</td><td>Manter a sacola, entregar as páginas com segurança e prevenir abusos</td><td>Execução de contrato / procedimentos preliminares (V) e legítimo interesse (IX)</td></tr>
<tr><td>Compra</td><td>Nome, CPF quando exigido, e-mail, telefone, endereço de entrega e cobrança, itens, valores e status do pagamento — informados no checkout da Shopify</td><td>Processar o pedido, emitir documento fiscal, entregar, atender trocas e devoluções</td><td>Execução de contrato (V) e cumprimento de obrigação legal/regulatória (II)</td></tr>
<tr><td>Pagamento</td><td>Dados de pagamento informados diretamente ao checkout da Shopify e ao provedor de pagamento</td><td>Cobrança e prevenção a fraudes</td><td>Execução de contrato (V) e proteção do crédito (X)</td></tr>
<tr><td>WhatsApp sobre o pedido (opcional)</td><td>Nome, telefone e número do pedido</td><td>Combinar envio, informar rastreio e prestar atendimento</td><td>Execução de contrato (V); a mensagem automática só é enviada a quem marcar a opção na sacola</td></tr>
<tr><td>Contato pelo site</td><td>Nome, telefone, e-mail e mensagem — o formulário apenas prepara a mensagem no seu WhatsApp; nada é enviado a servidor da GRIFHII</td><td>Responder ao seu pedido de contato</td><td>Procedimentos preliminares (V) / legítimo interesse (IX)</td></tr>
</tbody></table>
<p>A GRIFHII não recebe nem armazena número de cartão, validade ou código de segurança. Esses dados são digitados somente no checkout hospedado pela Shopify.</p>
<h2>3. Com quem compartilhamos</h2>
<ul>
<li><strong>Shopify</strong> — plataforma de catálogo, carrinho, checkout e pedidos (Shopify International Ltd. e afiliadas).</li>
<li><strong>Provedor de pagamento</strong> configurado na Shopify: {F("ex.: Shopify Payments / Mercado Pago / Pagar.me — informar o ativo")}.</li>
<li><strong>Cloudflare</strong> — hospedagem e segurança do site (Cloudflare Pages).</li>
<li><strong>Google</strong> — fontes tipográficas (Google Fonts) e ícones das marcas exibidos no menu; o navegador solicita esses arquivos aos servidores do Google, que recebem o endereço IP.</li>
<li><strong>Meta (WhatsApp)</strong> — quando você fala com a loja pelo WhatsApp ou aceita receber mensagens sobre o pedido (WhatsApp Business Platform, da própria Meta).</li>
<li><strong>Correios / transportadora</strong> — nome, endereço e telefone para a entrega.</li>
<li><strong>Contabilidade e autoridades</strong> — quando exigido por lei.</li>
</ul>
<h2>4. Transferência internacional</h2>
<p>Shopify, Cloudflare, Google e Meta podem processar dados fora do Brasil. Essas transferências ocorrem para a execução do contrato com você e com base nas garantias contratuais oferecidas por esses fornecedores (LGPD, art. 33).</p>
<h2>5. Cookies e armazenamento no navegador</h2>
<p><strong>Estritamente necessários:</strong> a sacola é guardada no armazenamento local do seu navegador (chave <code>grifhii-cart-v1</code>) e pode ser apagada a qualquer momento limpando os dados do site. O checkout da Shopify usa cookies próprios necessários à compra.</p>
<p><strong>Estatística e marketing:</strong> o site <em>não</em> utiliza, nesta versão, Google Analytics, pixels de anúncios ou outros rastreadores. Se forem ativados no futuro, só carregarão depois do seu consentimento, com opção de recusar, e esta política será atualizada.</p>
<h2>6. Por quanto tempo guardamos</h2>
<ul>
<li>Dados de pedidos e documentos fiscais: pelo prazo exigido pela legislação fiscal e de defesa do consumidor ({F("confirmar com a contabilidade, em regra 5 anos")}).</li>
<li>Conversas de atendimento: {F("prazo definido pela loja")}, ou até você pedir a exclusão, quando não houver obrigação de guarda.</li>
<li>Sacola no navegador: até você finalizar a compra, remover os itens ou limpar os dados do navegador.</li>
</ul>
<h2>7. Seus direitos (LGPD, art. 18)</h2>
<p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamentos, revogação de consentimento e revisão de decisões automatizadas. Envie o pedido pelo canal de privacidade acima; responderemos em até 15 dias. Você também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
<h2>8. Segurança</h2>
<p>O site é servido exclusivamente por HTTPS, não guarda chaves privadas no navegador e entrega a compra ao checkout oficial da Shopify. Nenhum sistema é totalmente imune a incidentes; caso ocorra um incidente relevante, os titulares e a ANPD serão comunicados conforme a lei.</p>
<h2>9. Alterações</h2>
<p>Esta política pode ser atualizada. A data no topo indica a versão vigente.</p>
'''),
'termos': ('Termos de Uso e Condições de Compra', 'Condições de uso do site e de compra na GRIFHII CONCEITO: identificação do fornecedor, preços, pagamento, entrega, arrependimento e atendimento.', f'''
<p class="legal-meta">Última atualização: {ATUALIZADO}. Versão sujeita a revisão jurídica antes da abertura das vendas.</p>
<h2>1. Identificação do fornecedor</h2>
{EMPRESA}
<h2>2. Produtos, fotos e disponibilidade</h2>
<p>Cada peça é apresentada com fotografia real e, quando disponível, imagem em volume (3D) da mesma cor. Cores podem variar levemente conforme a tela. Estoque, cores e tamanhos são confirmados pela Shopify no momento da finalização; se uma peça ficar indisponível, o checkout não é concluído para ela.</p>
<h2>3. Preços e despesas adicionais</h2>
<p>Os preços estão em reais (R$). Antes do pagamento, o checkout da Shopify exibe o valor das peças, o frete ou a opção de retirada, eventuais descontos e o <strong>valor total</strong>. Nenhuma cobrança adicional é feita sem a sua concordância expressa. Em caso de erro evidente de preço, a loja entrará em contato antes do envio e você poderá cancelar com reembolso integral.</p>
<h2>4. Pagamento</h2>
<p>O pagamento é feito somente no checkout oficial da Shopify, pelas formas habilitadas ({F("ex.: Pix e cartão de crédito — confirmar")}). A GRIFHII não solicita dados de cartão por WhatsApp, e-mail ou formulário próprio.</p>
<h2>5. Entrega</h2>
<p>Prazos, modalidades e custos estão na <a href="entrega.html">Política de Entrega</a> e aparecem no checkout antes do pagamento.</p>
<h2>6. Direito de arrependimento</h2>
<p>Em compras pela internet, você pode desistir em até <strong>7 dias corridos</strong> contados do recebimento, sem precisar justificar (CDC, art. 49), com devolução integral dos valores pagos, inclusive o frete de envio. Veja <a href="trocas-e-devolucoes.html">Trocas e Devoluções</a>.</p>
<h2>7. Confirmação do pedido</h2>
<p>Após a compra, a Shopify envia a confirmação por e-mail com o resumo do pedido. Se você marcar a opção na sacola, também receberá uma mensagem no WhatsApp sobre o envio.</p>
<h2>8. Uso do site</h2>
<p>É proibido usar o site para fraude, tentar alterar preços, quantidades ou identificadores de produtos, ou interferir em sua segurança. Marcas citadas pertencem aos respectivos titulares.</p>
<h2>9. Atendimento e foro</h2>
<p>Dúvidas e reclamações: pelos canais acima, com resposta em até 5 dias úteis. Fica eleito o foro do domicílio do consumidor.</p>
'''),
'trocas-e-devolucoes': ('Trocas e Devoluções', 'Como solicitar troca, devolução, arrependimento em 7 dias e reembolso nas compras da GRIFHII CONCEITO.', f'''
<p class="legal-meta">Última atualização: {ATUALIZADO}. Versão sujeita a revisão jurídica antes da abertura das vendas.</p>
<h2>1. Arrependimento (compras online)</h2>
<p>Você pode desistir da compra em até <strong>7 dias corridos</strong> após receber o pedido (CDC, art. 49). Basta avisar pelo WhatsApp <a href="https://wa.me/5564981025225" target="_blank" rel="noopener">(64) 98102-5225</a> ou pelo e-mail {EMAIL}, informando o número do pedido. A GRIFHII confirma o recebimento do pedido de arrependimento e informa como devolver; o custo da devolução nesse caso é da loja.</p>
<h2>2. Troca por tamanho ou cor</h2>
<p>Trocas por tamanho ou cor podem ser solicitadas em até {F("prazo de troca definido pela loja, ex.: 30 dias")} após o recebimento, com a peça sem uso, com etiquetas e na embalagem original, sujeitas à disponibilidade. Custos de reenvio na troca por preferência: {F("definir quem paga")}.</p>
<h2>3. Produto com defeito</h2>
<p>Defeitos aparentes podem ser reclamados em até 90 dias (CDC, art. 26). A loja terá até 30 dias para resolver; se não resolver, você pode escolher a troca, a devolução do valor ou o abatimento do preço (CDC, art. 18). Nesse caso o frete é por conta da loja.</p>
<h2>4. Reembolso</h2>
<p>O reembolso é feito pelo mesmo meio de pagamento: Pix em até {F("prazo, ex.: 5 dias úteis")} após o recebimento da peça devolvida; no cartão, o estorno é solicitado à operadora no mesmo prazo e aparece conforme o ciclo da fatura.</p>
<h2>5. Como enviar</h2>
<p>Após a confirmação, a loja informa o endereço ou código de postagem. Peças retiradas na loja podem ser devolvidas presencialmente em {ENDERECO}, no horário {F("horário de atendimento")}.</p>
'''),
'entrega': ('Política de Entrega', 'Modalidades de entrega e retirada, custos de frete, prazos e rastreio das compras na GRIFHII CONCEITO.', f'''
<p class="legal-meta">Última atualização: {ATUALIZADO}. Versão sujeita a revisão jurídica antes da abertura das vendas.</p>
<h2>1. Custo do frete aparece antes do pagamento</h2>
<p>O valor do frete, o prazo estimado e o total do pedido são calculados e exibidos no checkout da Shopify <strong>antes</strong> do pagamento. A GRIFHII não cobra frete separado depois da compra.</p>
<h2>2. Modalidades</h2>
<ul>
<li><strong>Envio pelos Correios</strong> para todo o Brasil — {F("serviços (PAC/SEDEX), tabela ou cálculo usado na Shopify")}.</li>
<li><strong>Retirada na loja</strong>, sem custo, em {ENDERECO} — horário: {F("horário de retirada")}.</li>
</ul>
<h2>3. Prazos</h2>
<p>Postagem em até {F("prazo de postagem, ex.: 2 dias úteis")} após a confirmação do pagamento. O prazo de transporte é o informado no checkout para o CEP de destino.</p>
<h2>4. Mensagem sobre o envio</h2>
<p>Se você marcar a opção na sacola, após a confirmação do pagamento a loja envia uma mensagem no WhatsApp para confirmar o endereço, combinar detalhes da postagem ou retirada e informar o código de rastreio. Essa mensagem nunca pede dados de cartão nem pagamento adicional.</p>
<h2>5. Rastreio</h2>
<p>O código de rastreio é enviado por e-mail e/ou WhatsApp. A consulta pode ser feita em “Acompanhar meu pedido”, no menu do site, ou no site dos Correios.</p>
<h2>6. Endereço e tentativas de entrega</h2>
<p>Confira o endereço no checkout. Se o pedido voltar por endereço incorreto ou ausência após as tentativas da transportadora, a loja entrará em contato para combinar o reenvio.</p>
'''),
}

def page(slug, title, desc, body):
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — GRIFHII CONCEITO</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#EFEAE2">
<meta property="og:title" content="{title} — GRIFHII CONCEITO">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<link rel="icon" type="image/jpeg" href="../assets/logo-grifhii.jpg">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../visual-cleanup.css">
<link rel="stylesheet" href="../legal.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="legal-page ui-clean">
<header class="site-header" id="header">
  <button class="menu-toggle" id="menuToggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="siteMenu"><span></span><span></span><span></span></button>
  <a class="brand brand-wordmark brand-centered" href="../index.html#inicio" aria-label="GRIFHII CONCEITO - início"><span>GRIF</span><img src="../assets/lion-transparent.webp" alt="" aria-hidden="true"><span>HII</span></a>
  <a class="product-page-cart" href="../index.html?cart=open#inicio" aria-label="Abrir carrinho"><span class="cart-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3.5 4.5h2l1.7 10.1h10.9l2-7.2H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.2" cy="19" r="1.2" fill="currentColor"/><circle cx="17.5" cy="19" r="1.2" fill="currentColor"/></svg></span></a>
</header>
<div class="site-menu" id="siteMenu" hidden>
  <div class="site-menu-backdrop" data-menu-close></div>
  <aside class="site-menu-panel" aria-label="Menu principal">
    <div class="site-menu-head"><span>GRIFHII <em>CONCEITO</em></span><button type="button" class="site-menu-close" data-menu-close aria-label="Fechar menu">×</button></div>
    <nav class="site-menu-nav">
      <a href="../index.html#inicio">Início</a>
      <a href="../produtos.html" class="is-featured">Produtos</a>
      <a href="../produtos.html?marca=todas">Marcas</a>
      <a href="../index.html?tracking=open#rastreio" data-open-tracking>Acompanhar meu pedido</a>
      <a href="../index.html#contato">Entre em contato</a>
    </nav>
    <div class="site-menu-footer">UM NOVO CONCEITO DE MODA MASCULINA</div>
  </aside>
</div>
<main class="legal-content">
<nav class="legal-breadcrumb" aria-label="Você está em"><a href="../index.html">Início</a> <span aria-hidden="true">/</span> <span>{title}</span></nav>
<h1>{title}</h1>
{body.strip()}
<nav class="legal-nav" aria-label="Outras políticas"><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a><a href="trocas-e-devolucoes.html">Trocas e devoluções</a><a href="entrega.html">Entrega</a></nav>
</main>
<script src="../site-ui.js"></script>
</body>
</html>
'''

OUT.mkdir(parents=True, exist_ok=True)
for slug, (title, desc, body) in PAGES.items():
    (OUT / f'{slug}.html').write_text(page(slug, title, desc, body), encoding='utf-8')
    print('gerado', OUT / f'{slug}.html')
