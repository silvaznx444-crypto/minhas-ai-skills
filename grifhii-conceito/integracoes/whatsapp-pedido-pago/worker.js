/* GRIFHII CONCEITO — mensagem automática no WhatsApp após PEDIDO PAGO.
 *
 * Fluxo: Shopify (webhook orders/paid, assinado com HMAC) -> este Cloudflare Worker -> WhatsApp Cloud API (template aprovado).
 * Nada aqui roda no navegador: segredos ficam só nas variáveis secretas do Worker.
 *
 * Variáveis (wrangler secret / vars):
 *   SHOPIFY_WEBHOOK_SECRET   (secret) segredo de assinatura dos webhooks da Shopify
 *   SHOP_DOMAIN              (var)    grifhiiconceito.myshopify.com
 *   WHATSAPP_TOKEN           (secret) token permanente do usuário do sistema (Meta Business)
 *   WHATSAPP_PHONE_NUMBER_ID (var)    ID do número no WhatsApp Business Platform
 *   WHATSAPP_TEMPLATE        (var)    nome do template aprovado, ex.: pedido_pago_envio
 *   WHATSAPP_TEMPLATE_LANG   (var)    pt_BR
 *   GRAPH_API_VERSION        (var)    versão da Graph API vigente (ex.: v23.0) — confirmar na documentação da Meta
 *   PEDIDOS                  (KV)     deduplicação e registro
 */

const enc = new TextEncoder();
const json = (status, body) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

export async function verifyShopifyHmac(rawBody, headerValue, secret) {
  if (!headerValue || !secret) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, rawBody));
  let expected;
  try { expected = Uint8Array.from(atob(headerValue), c => c.charCodeAt(0)); } catch { return false; }
  if (expected.length !== mac.length) return false;
  let diff = 0; // comparação em tempo constante
  for (let i = 0; i < mac.length; i++) diff |= mac[i] ^ expected[i];
  return diff === 0;
}

/** Normaliza telefone brasileiro para E.164 sem "+": 55 + DDD + número (10 ou 11 dígitos). */
export function normalizeBrPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55[1-9]\d(9\d{8}|[2-5]\d{7})$/.test(d)) return null;
  return d;
}

export function optedIn(order) {
  const attrs = [...(order.note_attributes || []), ...(order.attributes || [])];
  return attrs.some(a => String(a?.name ?? a?.key).toLowerCase() === 'whatsapp_optin' && String(a?.value).toLowerCase() === 'sim');
}

const mask = phone => phone ? phone.slice(0, 4) + '*****' + phone.slice(-2) : null;
const firstName = order => String(order.customer?.first_name || order.billing_address?.first_name || order.shipping_address?.first_name || 'cliente')
  .replace(/[^\p{L}\p{M}' -]/gu, '').trim().slice(0, 40) || 'cliente';

async function record(env, orderId, entry) {
  const key = `pedido:${orderId}`;
  const prev = JSON.parse((await env.PEDIDOS.get(key)) || '{"eventos":[]}');
  prev.eventos = [...(prev.eventos || []), {em: new Date().toISOString(), ...entry}].slice(-20);
  prev.status = entry.status;
  await env.PEDIDOS.put(key, JSON.stringify(prev), {expirationTtl: 60 * 60 * 24 * 180});
  console.log(JSON.stringify({pedido: orderId, ...entry}));
  return prev;
}

export async function sendTemplate(env, phone, order, fetchImpl = fetch) {
  const ver = env.GRAPH_API_VERSION;
  if (!/^v\d+\.\d+$/.test(ver || '')) throw Object.assign(new Error('GRAPH_API_VERSION não configurada'), {permanent: true});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetchImpl(`https://graph.facebook.com/${ver}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
      method: 'POST', signal: controller.signal,
      headers: {'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: phone, type: 'template',
        template: {name: env.WHATSAPP_TEMPLATE, language: {code: env.WHATSAPP_TEMPLATE_LANG || 'pt_BR'},
          components: [{type: 'body', parameters: [
            {type: 'text', text: firstName(order)},
            {type: 'text', text: String(order.name || `#${order.order_number || order.id}`).slice(0, 20)},
          ]}]},
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.messages?.[0]?.id) return {messageId: body.messages[0].id};
    const err = new Error(`WhatsApp HTTP ${res.status}: ${body?.error?.message || 'sem detalhes'}`);
    err.permanent = res.status >= 400 && res.status < 500 && res.status !== 429; // 429/5xx -> tentar de novo
    throw err;
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('WhatsApp não respondeu em 4s'), {permanent: false});
    throw e;
  } finally { clearTimeout(timer); }
}

export async function handleOrderPaid(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return json(405, {erro: 'método não permitido'});
  const raw = await request.arrayBuffer();
  if (raw.byteLength > 512 * 1024) return json(413, {erro: 'payload grande demais'});
  if (!(await verifyShopifyHmac(raw, request.headers.get('X-Shopify-Hmac-Sha256'), env.SHOPIFY_WEBHOOK_SECRET))) {
    return json(401, {erro: 'assinatura inválida'});
  }
  if (request.headers.get('X-Shopify-Topic') !== 'orders/paid') return json(200, {ignorado: 'tópico'});
  if (String(request.headers.get('X-Shopify-Shop-Domain') || '').toLowerCase() !== String(env.SHOP_DOMAIN).toLowerCase()) {
    return json(401, {erro: 'loja não autorizada'});
  }
  let order;
  try { order = JSON.parse(new TextDecoder().decode(raw)); } catch { return json(400, {erro: 'JSON inválido'}); }
  const orderId = String(order?.id || '');
  if (!/^\d{1,20}$/.test(orderId)) return json(400, {erro: 'pedido sem id'});

  // Deduplicação: a Shopify pode reenviar o mesmo evento; uma mensagem por pedido.
  const key = `pedido:${orderId}`;
  const current = JSON.parse((await env.PEDIDOS.get(key)) || 'null');
  if (current?.status === 'enviado' || current?.status === 'sem-optin' || current?.status === 'erro-permanente') {
    return json(200, {duplicado: true, status: current.status});
  }
  const lock = await env.PEDIDOS.get(`trava:${orderId}`);
  if (lock) return json(409, {emAndamento: true}); // 409 faz a Shopify tentar novamente depois
  await env.PEDIDOS.put(`trava:${orderId}`, '1', {expirationTtl: 60});

  try {
    if (order.financial_status && order.financial_status !== 'paid') {
      await record(env, orderId, {status: 'ignorado', motivo: `financial_status=${order.financial_status}`});
      return json(200, {ignorado: 'não pago'});
    }
    if (!optedIn(order)) {
      await record(env, orderId, {status: 'sem-optin', motivo: 'cliente não marcou receber WhatsApp'});
      return json(200, {enviado: false, motivo: 'sem opt-in'});
    }
    const phone = normalizeBrPhone(order.shipping_address?.phone || order.billing_address?.phone || order.phone || order.customer?.phone);
    if (!phone) {
      await record(env, orderId, {status: 'erro-permanente', motivo: 'telefone ausente ou inválido'});
      return json(200, {enviado: false, motivo: 'telefone inválido'});
    }
    try {
      const {messageId} = await sendTemplate(env, phone, order, fetchImpl);
      await record(env, orderId, {status: 'enviado', telefone: mask(phone), messageId});
      return json(200, {enviado: true});
    } catch (err) {
      if (err.permanent) {
        await record(env, orderId, {status: 'erro-permanente', telefone: mask(phone), motivo: err.message});
        return json(200, {enviado: false, motivo: 'erro permanente registrado'});
      }
      await record(env, orderId, {status: 'falha-temporaria', telefone: mask(phone), motivo: err.message});
      return json(503, {erro: 'falha temporária; a Shopify vai reenviar'});
    }
  } finally {
    await env.PEDIDOS.delete(`trava:${orderId}`);
  }
}

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    if (pathname === '/webhooks/shopify/orders-paid') return handleOrderPaid(request, env);
    if (pathname === '/saude') return json(200, {ok: true});
    return json(404, {erro: 'não encontrado'});
  },
};
