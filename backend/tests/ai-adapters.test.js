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

test('OpenRouter converts a chat analysis response into bounded contact rules', async () => {
  const response = JSON.stringify({ language: 'Mixed', communicationStyle: 'Casual Banglish', replyGuidance: 'Use short friendly replies and occasional emojis.' });
  const adapter = new OpenRouterAIAdapter({ apiKey: 'test-key', fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: response } }] }), { status: 200 }) });
  const profile = await adapter.analyzeContactChat({ transcript: 'sample chat', ownerName: 'Owner', contactName: 'Friend', models: 'openrouter/free' });
  assert.deepEqual(profile, { language: 'Mixed', communicationStyle: 'Casual Banglish', replyGuidance: 'Use short friendly replies and occasional emojis.' });
});

test('personalized replies give contact rules explicit priority', async () => {
  let request;
  const adapter = new OpenRouterAIAdapter({ apiKey: 'test-key', fetchImpl: async (_url, options) => { request = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'yo' } }] }), { status: 200 }); } });
  await adapter.generateReply({ ...payload, contact: { ...payload.contact, replyGuidance: 'Always greet with yo.' }, instructionMode: 'Personalized', models: 'openrouter/free' });
  assert.match(request.messages[0].content, /overrides general style preferences/);
  assert.match(request.messages[0].content, /Always greet with yo/);
});

test('OpenRouter converts multiple chats into global casual style rules', async () => {
  const response = JSON.stringify({ languageStyle: 'Bangla and Banglish', tone: 'Relaxed', responseLength: 'Short', humor: 'Playful', emojiUsage: 'Occasional', casualStyleRules: 'Use short Banglish replies and informal spelling.', unknownBehavior: 'Be polite and avoid personal details.' });
  let request;
  const adapter = new OpenRouterAIAdapter({ apiKey: 'test-key', fetchImpl: async (_url, options) => { request = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: response } }] }), { status: 200 }); } });
  const profile = await adapter.analyzeGlobalChats({ transcripts: 'Owner: ki obsta', ownerName: 'Owner', models: 'openrouter/free' });
  assert.equal(profile.casualStyleRules, 'Use short Banglish replies and informal spelling.');
  assert.equal(profile.unknownBehavior, 'Be polite and avoid personal details.');
  assert.match(request.messages[0].content, /untrusted data/);
});
