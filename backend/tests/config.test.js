import test from 'node:test';
import assert from 'node:assert/strict';
import { disconnectDatabase } from '../src/config/db.js';
import { env, validateEnv } from '../src/config/env.js';

test('uses safe local provider defaults', () => {
  assert.equal(env.aiProvider, 'mock');
  assert.equal(env.messagingProvider, 'mock');
  assert.equal(env.storageProvider, 'local');
  assert.doesNotThrow(validateEnv);
});

test.after(async () => disconnectDatabase());
