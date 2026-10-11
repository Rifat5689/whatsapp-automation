import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { validateEnv } from './config/env.js';
import { loadState } from './services/state-persistence.service.js';

const startServer = async () => {
  const env = validateEnv();
  const databaseConnected = await connectDatabase();
  if (databaseConnected) await loadState();
  createApp().listen(env.port, () => {
    console.log(`RIFAT.AI API listening on http://localhost:${env.port}`);
    console.log(`Database: ${databaseConnected ? 'MongoDB connected' : 'local in-memory development store'}`);
  });
};

startServer().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exitCode = 1;
});
