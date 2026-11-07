/* Opções reais da biblioteca WebAuthn: "cadastrar ESTE aparelho" pede o Face ID do próprio aparelho. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationOptions } from '../src/auth/webauthn.ts';

const env = { WEBAUTHN_RP_ID: 'grifhii-painel.pages.dev' } as never;
const user = { webauthnUserId: 'u'.repeat(22), name: 'Proprietário' };

test('link de aparelho / recuperação: chave do próprio aparelho (Face ID), sem oferecer QR ou chave de segurança primeiro', async () => {
  const o = await registrationOptions(env, user, ['chave-antiga-0123456789'], { thisDevice: true }) as any;
  assert.equal(o.authenticatorSelection.authenticatorAttachment, 'platform');
  assert.deepEqual(o.hints, ['client-device']);
  assert.equal(o.authenticatorSelection.userVerification, 'required');
  assert.equal(o.authenticatorSelection.residentKey, 'required');
  assert.deepEqual(o.excludeCredentials.map((c: any) => c.id), ['chave-antiga-0123456789'], 'não cria chave repetida no mesmo aparelho');
});

test('primeiro acesso e convite continuam aceitando qualquer tipo de chave (computador sem Face ID)', async () => {
  const o = await registrationOptions(env, user) as any;
  assert.equal(o.authenticatorSelection.authenticatorAttachment, undefined);
  assert.deepEqual(o.hints ?? [], []);
});
