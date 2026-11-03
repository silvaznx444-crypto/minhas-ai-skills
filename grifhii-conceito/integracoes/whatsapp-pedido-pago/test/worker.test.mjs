import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {handleOrderPaid, normalizeBrPhone, verifyShopifyHmac, optedIn} from '../worker.js';

const SECRET = 'segredo-de-teste';
const kv = () => { const m = new Map(); return {m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); }}; };
const env = (over = {}) => ({SHOPIFY_WEBHOOK_SECRET: SECRET, SHOP_DOMAIN: 'grifhiiconceito.myshopify.com', WHATSAPP_TOKEN: 't',
  WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_TEMPLATE: 'pedido_pago_envio', WHATSAPP_TEMPLATE_LANG: 'pt_BR', GRAPH_API_VERSION: 'v23.0', PEDIDOS: kv(), ...over});
const order = (over = {}) => ({id: 5550001, name: '#1001', financial_status: 'paid', customer: {first_name: 'Marina'},
  shipping_address: {phone: '(64) 98102-5225'}, note_attributes: [{name: 'whatsapp_optin', value: 'sim'}], ...over});
function req(body, {secret = SECRET, topic = 'orders/paid', shop = 'grifhiiconceito.myshopify.com', hmac} = {}) {
  const raw = JSON.stringify(body);
  const sig = hmac ?? crypto.createHmac('sha256', secret).update(raw).digest('base64');
  return new Request('https://w/webhooks/shopify/orders-paid', {method: 'POST', body: raw,
    headers: {'X-Shopify-Hmac-Sha256': sig, 'X-Shopify-Topic': topic, 'X-Shopify-Shop-Domain': shop}});
}
const okFetch = calls => async (url, init) => { calls.push({url, body: JSON.parse(init.body)}); return new Response(JSON.stringify({messages: [{id: 'wamid.X'}]}), {status: 200}); };

test('rejeita assinatura inválida', async () => {
  const calls = []; const r = await handleOrderPaid(req(order(), {secret: 'outro'}), env(), okFetch(calls));
  assert.equal(r.status, 401); assert.equal(calls.length, 0);
});
test('rejeita loja diferente', async () => {
  const calls = []; const r = await handleOrderPaid(req(order(), {shop: 'outra.myshopify.com'}), env(), okFetch(calls));
  assert.equal(r.status, 401); assert.equal(calls.length, 0);
});
test('envia template com nome e número do pedido, sem dados sensíveis', async () => {
  const calls = []; const e = env(); const r = await handleOrderPaid(req(order()), e, okFetch(calls));
  assert.equal(r.status, 200); assert.equal(calls.length, 1);
  assert.match(calls[0].url, /graph\.facebook\.com\/v23\.0\/123\/messages$/);
  assert.equal(calls[0].body.to, '5564981025225');
  assert.deepEqual(calls[0].body.template.components[0].parameters.map(p => p.text), ['Marina', '#1001']);
  const log = JSON.parse(e.PEDIDOS.m.get('pedido:5550001'));
  assert.equal(log.status, 'enviado'); assert.ok(!JSON.stringify(log).includes('98102-5225'), 'telefone mascarado no log');
});
test('deduplica reenvio do mesmo pedido', async () => {
  const calls = []; const e = env();
  await handleOrderPaid(req(order()), e, okFetch(calls));
  const r2 = await handleOrderPaid(req(order()), e, okFetch(calls));
  assert.equal(r2.status, 200); assert.equal(calls.length, 1);
  assert.equal((await r2.json()).duplicado, true);
});
test('não envia sem opt-in', async () => {
  const calls = []; const r = await handleOrderPaid(req(order({note_attributes: [{name: 'whatsapp_optin', value: 'nao'}]})), env(), okFetch(calls));
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
});
test('não envia pedido não pago', async () => {
  const calls = []; const r = await handleOrderPaid(req(order({financial_status: 'pending'})), env(), okFetch(calls));
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
});
test('falha temporária (500) devolve 503 para a Shopify reenviar e libera a trava', async () => {
  const e = env(); const r = await handleOrderPaid(req(order()), e, async () => new Response('{}', {status: 500}));
  assert.equal(r.status, 503); assert.equal(e.PEDIDOS.m.get('trava:5550001'), undefined);
  const calls = []; const r2 = await handleOrderPaid(req(order()), e, okFetch(calls));
  assert.equal(r2.status, 200); assert.equal(calls.length, 1);
});
test('erro permanente (400) é registrado e não gera reenvio infinito', async () => {
  const e = env(); const r = await handleOrderPaid(req(order()), e, async () => new Response(JSON.stringify({error: {message: 'template inexistente'}}), {status: 400}));
  assert.equal(r.status, 200); assert.equal(JSON.parse(e.PEDIDOS.m.get('pedido:5550001')).status, 'erro-permanente');
});
test('pedido em processamento concorrente responde 409', async () => {
  const e = env(); await e.PEDIDOS.put('trava:5550001', '1');
  const r = await handleOrderPaid(req(order()), e, okFetch([]));
  assert.equal(r.status, 409);
});
test('normaliza telefones brasileiros', () => {
  assert.equal(normalizeBrPhone('+55 (64) 98102-5225'), '5564981025225');
  assert.equal(normalizeBrPhone('64 3641-1234'), '556436411234');
  assert.equal(normalizeBrPhone('123'), null);
  assert.equal(normalizeBrPhone('+1 415 555 0100'), null);
});
test('verifyShopifyHmac recusa base64 quebrado', async () => {
  assert.equal(await verifyShopifyHmac(new TextEncoder().encode('x'), '###', SECRET), false);
});
test('optedIn aceita atributos de carrinho', () => {
  assert.equal(optedIn({note_attributes: [{name: 'whatsapp_optin', value: 'sim'}]}), true);
  assert.equal(optedIn({}), false);
});
