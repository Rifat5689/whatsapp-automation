import test from 'node:test';
import assert from 'node:assert/strict';
import { AIProviderRouter, GeminiAIAdapter, OpenRouterAIAdapter, TelegramMessagingAdapter } from '../src/adapters/index.js';

const payload = { message: 'Hello', contact: { language: 'English', communicationStyle: 'Friendly', relationship: 'Friend' }, personalization: {} };

test('OpenRouter sends an ordered model fallback list', async () => {
  let request;
  const adapter = new OpenRouterAIAdapter({ apiKey: 'test-key', fetchImpl: async (_url, options) => { request = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'Hi' } }] }), { status: 200 }); } });
  assert.equal(await adapter.generateReply({ ...payload, models: 'first/free, second/free' }), 'Hi');
  assert.deepEqual(request.models, ['first/free', 'second/free']);
  assert.equal(request.messages[0].role, 'system');
});

test('raw mode sends no application system prompt', async () => {
  let request;
  const adapter = new OpenRouterAIAdapter({ apiKey: 'test-key', fetchImpl: async (_url, options) => { request = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'Hi' } }] }), { status: 200 }); } });
  await adapter.generateReply({ ...payload, instructionMode: 'Raw', models: 'openrouter/free' });
  assert.deepEqual(request.messages, [{ role: 'user', content: 'Hello' }]);
});

test('Gemini switches models after a rate limit', async () => {
  const calls = [];
  const adapter = new GeminiAIAdapter({ apiKey: 'test-key', fetchImpl: async (url) => { calls.push(url); return calls.length === 1 ? new Response('{}', { status: 429 }) : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Fallback reply' }] } }] }), { status: 200 }); } });
  assert.equal(await adapter.generateReply({ ...payload, models: 'model-one,model-two' }), 'Fallback reply');
  assert.equal(calls.length, 2);
});

test('provider router falls back to the secondary provider', async () => {
  const adapters = { broken: { generateReply: async () => { throw new Error('quota'); } }, working: { generateReply: async () => 'Safe fallback' } };
  const router = new AIProviderRouter({ adapters });
  const configuration = { primary: { provider: 'broken', enabled: true }, fallback: { provider: 'working', enabled: true } };
  assert.equal(await router.generateReply({ ...payload, configuration }), 'Safe fallback');
});

test('Telegram sends text only to the linked chat', async () => {
  let request;
  const adapter = new TelegramMessagingAdapter({ botToken: 'test-token', fetchImpl: async (url, options) => { request = { url, body: JSON.parse(options.body) }; return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }); } });
  const result = await adapter.send({ chatId: '12345', content: 'Hello from RIFAT.AI' });
  assert.equal(request.url, 'https://api.telegram.org/bottest-token/sendMessage');
  assert.deepEqual(request.body, { chat_id: '12345', text: 'Hello from RIFAT.AI' });
  assert.deepEqual(result, { content: 'Hello from RIFAT.AI', providerMessageId: '42', deliveryStatus: 'sent', simulated: false });
});

test('Telegram refuses to send without a linked chat', async () => {
  const adapter = new TelegramMessagingAdapter({ botToken: 'test-token' });
  await assert.rejects(() => adapter.send({ content: 'Hello' }), /not linked/);
});
