import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.MESSAGING_PROVIDER = 'telegram';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test_webhook_secret';

const { createApp } = await import('../src/app.js');
const { db } = await import('../src/store.js');
const server = createApp().listen(0);
await once(server, 'listening');
const webhook = `http://127.0.0.1:${server.address().port}/api/v1/webhooks/telegram`;
test.after(() => server.close());

const update = { update_id: 100, message: { message_id: 200, from: { id: 300, first_name: 'Telegram', username: 'telegram_test' }, chat: { id: 300, type: 'private' }, text: 'hello bot' } };

test('Telegram webhook rejects a missing secret', async () => {
  const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(update) });
  assert.equal(response.status, 401);
});

test('Telegram webhook stores a new sender safely in Manual mode', async () => {
  const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test_webhook_secret' }, body: JSON.stringify(update) });
  assert.equal(response.status, 200);
  const contact = db.contacts.find((item) => item.telegramChatId === '300');
  assert.equal(contact?.telegramUsername, 'telegram_test');
  assert.equal(contact?.mode, 'Manual');
  assert.equal(contact?.aiEnabled, false);
  assert.equal(db.messages.some((item) => item.providerMessageId === 'telegram-300-200' && item.contactId === contact.id), true);
});

test('Telegram webhook deduplicates retried updates', async () => {
  const before = db.messages.filter((item) => item.providerMessageId === 'telegram-300-200').length;
  const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test_webhook_secret' }, body: JSON.stringify(update) });
  assert.equal(response.status, 200);
  assert.equal(db.messages.filter((item) => item.providerMessageId === 'telegram-300-200').length, before);
});
