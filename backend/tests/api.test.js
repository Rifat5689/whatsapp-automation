import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/hash-password.js';

process.env.JWT_SECRET = 'a-test-secret-that-is-not-used-in-production';
process.env.OWNER_EMAIL = 'test@example.com';
process.env.OWNER_PASSWORD_HASH = hashPassword('correct-password');
const server = createApp().listen(0);
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
test.after(() => server.close());

async function login(password = 'correct-password') { const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password }) }); return response; }
test('rejects invalid login', async () => assert.equal((await login('wrong')).status, 401));
test('protects API routes', async () => assert.equal((await fetch(`${base}/bootstrap`)).status, 401));
test('valid login accesses owner-scoped bootstrap', async () => { const response = await login(); assert.equal(response.status, 200); const token = (await response.json()).data.token; const bootstrap = await fetch(`${base}/bootstrap`, { headers: { authorization: `Bearer ${token}` } }); assert.equal(bootstrap.status, 200); assert.equal((await bootstrap.json()).data.ownerId, 'owner-local'); });
