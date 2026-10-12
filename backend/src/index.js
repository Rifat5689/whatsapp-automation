import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { validateEnv } from './config/env.js';
import { loadState, saveState } from './services/state-persistence.service.js';
import { db } from './store.js';

const startServer = async () => {
  const env = validateEnv();
  const databaseConnected = await connectDatabase();
  if (databaseConnected) {
    await loadState();
    const mode = ['AI Auto', 'AI Approval', 'Manual'].includes(db.settings.defaultMode) ? db.settings.defaultMode : 'AI Approval';
    const legacyTelegramContacts = db.contacts.filter((contact) => contact.telegramChatId && contact.telegramDefaultModeApplied !== true);
    for (const contact of legacyTelegramContacts) { contact.mode = mode; contact.aiEnabled = mode !== 'Manual'; contact.telegramDefaultModeApplied = true; }
    if (legacyTelegramContacts.length) await saveState();
  }
  createApp().listen(env.port, () => {
    console.log(`RIFAT.AI API listening on http://localhost:${env.port}`);
    console.log(`Database: ${databaseConnected ? 'MongoDB connected' : 'local in-memory development store'}`);
  });
};

startServer().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exitCode = 1;
});
