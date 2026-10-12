const optional = (name, fallback = '') => process.env[name]?.trim() || fallback;

const env = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3001')),
  frontendOrigins: optional('FRONTEND_ORIGIN', 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  mongodbUri: optional('MONGODB_URI'),
  ownerUsername: optional('OWNER_USERNAME', 'owner'),
  ownerPassword: optional('OWNER_PASSWORD', 'local-demo-only'),
  jwtSecret: optional('JWT_SECRET'),
  openRouterApiKey: optional('OPENROUTER_API_KEY'),
  openRouterModels: optional('OPENROUTER_MODELS', 'openrouter/free').split(',').map((model) => model.trim()).filter(Boolean),
  geminiApiKey: optional('GEMINI_API_KEY'),
  geminiModels: optional('GEMINI_MODELS').split(',').map((model) => model.trim()).filter(Boolean),
  messagingProvider: optional('MESSAGING_PROVIDER', 'mock'),
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN'),
  telegramWebhookSecret: optional('TELEGRAM_WEBHOOK_SECRET'),
  storageProvider: optional('STORAGE_PROVIDER', 'local'),
  cloudStorageAccountId: optional('CLOUD_STORAGE_ACCOUNT_ID'),
  cloudStorageAccessKey: optional('CLOUD_STORAGE_ACCESS_KEY'),
  cloudStorageSecretKey: optional('CLOUD_STORAGE_SECRET_KEY'),
  cloudStorageBucket: optional('CLOUD_STORAGE_BUCKET')
});

const requireValues = (names) => {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
};

const validateEnv = () => {
  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) throw new Error('PORT must be a valid TCP port');
  if (env.nodeEnv === 'production') requireValues(['MONGODB_URI', 'OWNER_USERNAME', 'OWNER_PASSWORD', 'JWT_SECRET', 'FRONTEND_ORIGIN']);
  if (!['mock', 'telegram'].includes(env.messagingProvider)) throw new Error('MESSAGING_PROVIDER must be mock or telegram');
  if (env.messagingProvider === 'telegram') {
    requireValues(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET']);
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(env.telegramWebhookSecret)) throw new Error('TELEGRAM_WEBHOOK_SECRET has an invalid format');
  }
  if (!['local', 'r2'].includes(env.storageProvider)) throw new Error('STORAGE_PROVIDER must be local or r2');
  if (env.storageProvider === 'r2') requireValues(['CLOUD_STORAGE_ACCOUNT_ID', 'CLOUD_STORAGE_ACCESS_KEY', 'CLOUD_STORAGE_SECRET_KEY', 'CLOUD_STORAGE_BUCKET']);
  return env;
};

export { env, validateEnv };
