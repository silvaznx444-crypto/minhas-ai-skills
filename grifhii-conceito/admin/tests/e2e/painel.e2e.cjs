/* E2E do painel no navegador (Chromium) em iPhone emulado, com AUTENTICADOR VIRTUAL WebAuthn:
 * a passkey é criada e verificada de verdade pela biblioteca do servidor (nada simulado na criptografia).
 * Uso: node tests/e2e/painel.e2e.cjs <pastaDeSaida> <fotoJpg>  (o servidor tests/e2e/server.ts é iniciado aqui) */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert/strict');
const OUT = process.argv[2]; const PHOTO = process.argv[3];
const PORT = 8799; const BASE = `http://localhost:${PORT}`;
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(['ok', name]); console.log('ok   ', name); } catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL ', name, '\n     ', e.message.split('\n')[0]); throw e; } };

(async () => {
  const srv = spawn(process.execPath, ['--no-warnings', path.join(__dirname, 'server.ts'), String(PORT)], { stdio: ['pipe', 'pipe', 'inherit'] });
  let setupToken = ''; let stateResolve = null;
  srv.stdout.on('data', d => { const s = String(d); const m = /setup=(\S+)/.exec(s); if (m) setupToken = m[1]; const st = /STATE (.+)/.exec(s); if (st && stateResolve) { stateResolve(JSON.parse(st[1])); stateResolve = null; } });
  const state = () => new Promise(r => { stateResolve = r; srv.stdin.write('state\n'); });
  while (!setupToken) await new Promise(r => setTimeout(r, 100));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|409)/.test(m.text())) errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  const shot = n => page.screenshot({ path: path.join(OUT, `painel-${n}.png`), fullPage: true });
  const noHScroll = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'rolagem horizontal');

  try {
    await step('sem sessão: abre a tela de login (painel protegido)', async () => {
      await page.goto(BASE + '/'); await page.getByText('Entrar no painel').waitFor(); await noHScroll(); await shot('01-login');
    });
    await step('configuração inicial: cria a passkey real e mostra 10 códigos de recuperação', async () => {
      await page.goto(BASE + '/#/configurar');
      await page.getByLabel('Seu nome').fill('Kellson');
      await page.getByLabel('Código de configuração').fill(setupToken);
      await page.getByRole('button', { name: 'Criar minha chave de acesso' }).click();
      await page.getByText('Guarde seus códigos').waitFor();
      assert.equal(await page.locator('.codes span').count(), 10);
      await shot('02-codigos');
      await page.getByLabel('Guardei os códigos em local seguro').check();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('heading', { name: 'Visão geral' }).waitFor(); await noHScroll(); await shot('03-visao-geral');
    });
    await step('configurações: escolhe local de estoque e canal (com reconfirmação)', async () => {
      await page.goto(BASE + '/#/configuracoes');
      await page.getByLabel('Local de estoque').selectOption({ label: 'Loja Santa Helena' });
      await page.getByRole('button', { name: 'Headless' }).click();
      await page.getByPlaceholder('https://seu-site.netlify.app').fill('https://grifhii-conceito.netlify.app');
      await page.getByRole('button', { name: /Salvar/ }).click();
      await page.getByText('Configurações salvas.').waitFor(); await shot('04-configuracoes');
    });
    await step('reconciliação somente leitura traz o catálogo existente', async () => {
      await page.goto(BASE + '/#/sincronizacao');
      await page.getByText(/Conectado a grifhiiconceito\.myshopify\.com/).waitFor();
      await page.getByRole('button', { name: 'Reconciliar agora' }).click();
      await page.getByText(/1 produtos · 3 variantes na Shopify/).waitFor(); await shot('05-sincronizacao');
    });
    await step('lista de produtos mostra as peças que já estavam na Shopify, com preço e botão "Atualizar da Shopify"', async () => {
      await page.goto(BASE + '/#/produtos');
      await page.getByRole('button', { name: 'Atualizar da Shopify' }).waitFor();
      await page.locator('.list-item').first().waitFor();
      const txt = await page.locator('.list-item').first().innerText();
      if (!/R\$\s?\d/.test(txt)) throw new Error('preço não aparece na lista: ' + txt);
      await noHScroll(); await shot('05b-lista-produtos');
    });
    await step('cadastro completo: 4 tamanhos + foto real enviada → publicado e confirmado', async () => {
      await page.goto(BASE + '/#/novo');
      await page.getByLabel('Nome do produto').fill('Camiseta Abercrombie Fitch New York');
      await page.getByLabel('Marca').selectOption('Abercrombie & Fitch');
      await page.getByLabel('Categoria').selectOption('bones'); await page.getByText('No site, aparece em Acessórios.').waitFor();
      await page.getByLabel('Categoria').selectOption('camisetas');
      await page.getByLabel('Preço de venda (R$)').fill('139,90');
      await shot('06-novo-1');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Nome da cor').fill('Vermelha');
      for (const s of ['M', 'G', 'GG', 'G1']) await page.getByRole('button', { name: s, exact: true }).click();
      await noHScroll(); await shot('07-novo-2');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.locator('input[type=file]').setInputFiles(PHOTO);
      await page.locator('.media-tile img').waitFor(); await shot('08-novo-3');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByText('4 variantes · 4 unidades · 1 foto(s) real(is)').waitFor(); await shot('09-novo-revisao');
      await page.getByRole('button', { name: 'Publicar produto' }).click();
      await page.locator('h1.page-title').filter({ hasText: /Pronto|atenção|andamento/ }).waitFor({ timeout: 90000 });
      await shot('10-novo-resultado');
      const h = await page.locator('h1.page-title').textContent(); if (h !== 'Pronto.') throw new Error('Resultado: ' + h + ' — ' + await page.locator('.notice').first().textContent());
      await page.getByText(/publicado no canal de vendas/).waitFor(); await shot('10-novo-pronto');
      const s = await state(); const p = s.products.find(x => x.title.includes('New York'));
      assert.deepEqual(p.combos.sort(), ['Vermelha/G', 'Vermelha/G1', 'Vermelha/GG', 'Vermelha/M']);
      assert.equal(p.status, 'ACTIVE'); assert.equal(p.media, 1); assert.deepEqual(p.published, ['gid://shopify/Publication/9']);
    });
    await step('estoque: altera M de 1 para 3 e a Shopify confirma', async () => {
      await page.getByRole('link', { name: 'Abrir produto' }).click();
      await page.getByRole('heading', { name: 'Estoque' }).waitFor();
      await page.getByLabel('Mais Vermelha / M').click(); await page.getByLabel('Mais Vermelha / M').click();
      await page.getByRole('button', { name: 'Salvar' }).click();
      await page.getByText('Estoque de Vermelha / M: 1 → 3').waitFor(); await noHScroll(); await shot('11-produto-estoque');
      assert.ok((await state()).levels.includes(3));
    });
    await step('nova cor Preta na peça existente sem alterar as antigas', async () => {
      await page.goto(BASE + '/#/produtos'); await page.getByText('Camiseta Tommy Hilfiger Resort').click();
      await page.getByRole('button', { name: '+ Adicionar nova cor a esta peça' }).click();
      await page.getByLabel('Nome da cor').fill('Preta');
      await page.getByRole('button', { name: 'M', exact: true }).click();
      await page.getByRole('button', { name: 'Adicionar cor' }).click();
      await page.getByText('Nova cor confirmada na Shopify.').waitFor({ timeout: 20000 }); await shot('12-nova-cor');
      const p = (await state()).products.find(x => x.title.includes('Resort'));
      assert.deepEqual(p.combos.sort(), ['Azul-marinho/G', 'Azul-marinho/M', 'Preta/M', 'Verde/G']);
    });
    await step('fotos/3D: troca a foto de uma cor que já existe (Azul-marinho) e a Shopify confirma', async () => {
      await page.goto(BASE + '/#/produtos'); await page.getByText('Camiseta Tommy Hilfiger Resort').click();
      await page.getByRole('button', { name: 'Trocar ou adicionar fotos / 3D de uma cor' }).click();
      await page.getByRole('button', { name: 'Azul-marinho', exact: true }).click();
      await page.locator('input[type=file]').setInputFiles(PHOTO);
      await page.locator('.media-tile img').waitFor();
      await page.getByRole('button', { name: 'Salvar fotos/3D' }).click();
      await page.getByText(/Fotos\/3D confirmados na Shopify/).waitFor({ timeout: 20000 }); await noHScroll(); await shot('12b-fotos-cor');
      const s = await state(); const p = s.products.find(x => x.title.includes('Resort'));
      assert.ok(p.media >= 1, 'foto registrada na Shopify');
    });
    await step('editar nome e remover uma cor (com Face ID) — a Shopify confirma', async () => {
      await page.goto(BASE + '/#/produtos'); await page.getByText('Camiseta Tommy Hilfiger Resort').click();
      await page.getByRole('button', { name: 'Editar nome, marca, categoria ou descrição' }).click();
      await page.getByLabel('Nome da peça').fill('Camiseta Tommy Hilfiger Resort Floral');
      await page.getByRole('button', { name: 'Salvar alterações' }).click();
      await page.getByText('Informações salvas na Shopify.').waitFor();
      await page.getByRole('heading', { name: 'Camiseta Tommy Hilfiger Resort Floral' }).waitFor();
      await page.getByRole('button', { name: 'Remover uma cor ou tamanho' }).click();
      await page.getByRole('button', { name: 'Preta / M', exact: true }).click();
      await page.getByRole('button', { name: 'Remover selecionadas' }).click();
      await page.getByText('Removido: Preta/M.').waitFor({ timeout: 15000 }); await noHScroll(); await shot('12c-editar-remover');
      const p = (await state()).products.find(x => x.title === 'Camiseta Tommy Hilfiger Resort Floral');
      assert.ok(p && !p.combos.includes('Preta/M'));
    });
    await step('apagar peça: exige digitar APAGAR + Face ID; some da Shopify', async () => {
      await page.goto(BASE + '/#/produtos'); await page.getByText('Camiseta Abercrombie Fitch New York').first().click();
      await page.getByRole('button', { name: 'Apagar esta peça…' }).click();
      assert.ok(await page.getByRole('button', { name: 'Apagar definitivamente' }).isDisabled());
      await page.getByLabel('Para confirmar, digite APAGAR').fill('apagar');
      await page.getByRole('button', { name: 'Apagar definitivamente' }).click();
      await page.getByRole('heading', { name: 'Produtos' }).waitFor({ timeout: 15000 });
      assert.ok(!(await state()).products.some(x => x.title.includes('New York')));
    });
    await step('atividades registram as ações', async () => {
      await page.goto(BASE + '/#/atividades');
      await page.getByText('Estoque alterado').first().waitFor(); await page.getByText('1 → 3 unidade(s)').waitFor(); await shot('13-atividades');
    });
    await step('visitas do site: o site envia contadores anônimos e o painel mostra os totais', async () => {
      const send = (e, origin = 'https://grifhii-conceito.netlify.app') => fetch(BASE + '/api/admin/v1/public/events', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain' }, body: JSON.stringify({ e }) });
      await send([{ t: 'visit' }, { t: 'view', k: 'inicio' }, { t: 'product', k: 'camiseta-diesel-masculina' }, { t: 'whatsapp', k: 'banner' }]);
      await send([{ t: 'visit' }, { t: 'product', k: 'camiseta-diesel-masculina' }, { t: 'brand', k: 'diesel' }, { t: 'cart_add', k: 'camiseta-diesel-masculina' }, { t: 'checkout' }]);
      await send([{ t: 'visit' }], 'https://site-falso.example'); // ignorado
      await page.goto(BASE + '/#/');
      await page.getByText(/Visitas: 2/).waitFor();
      await page.goto(BASE + '/#/visitas');
      await page.getByRole('heading', { name: 'Peças mais abertas' }).waitFor();
      await page.getByText('Camiseta diesel masculina').first().waitFor();
      await page.getByText('Banner Black Friday').waitFor();
      await noHScroll(); await shot('13b-visitas');
    });
    await step('sair e entrar de novo com a passkey (login real)', async () => {
      await page.getByRole('button', { name: 'Sair do painel' }).click();
      await page.getByText('Entrar no painel').waitFor();
      await page.getByRole('button', { name: /Entrar com Face ID/ }).click();
      await page.getByRole('heading', { name: 'Visão geral' }).waitFor();
    });
    await step('API sem sessão recusa; cookie é HttpOnly (JS não lê)', async () => {
      assert.equal(await page.evaluate(() => document.cookie.includes('gh_admin')), false);
      const st = await page.evaluate(() => fetch('/api/admin/v1/products', { credentials: 'omit' }).then(r => r.status));
      assert.equal(st, 401);
      assert.equal(await page.evaluate(() => Object.keys(localStorage).length), 0, 'nada no localStorage');
    });
    await step('desktop: barra lateral e sem erros de JavaScript/CSP', async () => {
      const d = await browser.newContext({ viewport: { width: 1366, height: 860 } });
      const p2 = await d.newPage(); await p2.goto(BASE + '/'); await p2.getByText('Entrar no painel').waitFor();
      await p2.screenshot({ path: path.join(OUT, 'painel-14-desktop-login.png') }); await d.close();
      assert.deepEqual(errors, []);
    });
  } catch { /* registrado */ }
  finally { await browser.close(); srv.kill(); }
  console.log(JSON.stringify({ passed: results.filter(r => r[0] === 'ok').length, failed: results.filter(r => r[0] !== 'ok').length }));
  process.exit(results.some(r => r[0] !== 'ok') ? 1 : 0);
})();
