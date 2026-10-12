const optional = (name, fallback = '') => process.env[name]?.trim() || fallback;

const env = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3001')),
  frontendOrigins: optional('FRONTEND_ORIGIN', 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  mongodbUri: optional('MONGODB_URI'),
  ownerUsername: optional('OWNER_USERNAME', 'owner'),
  ownerPassword: optional('OWNER_PASSWORD', 'local-demo-only'),
  jwtSecret: optional('JWT_SECRET'),
  aiProvider: optional('AI_PROVIDER', 'mock'),
  openaiApiKey: optional('OPENAI_API_KEY'),
  openaiModel: optional('OPENAI_MODEL'),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  anthropicModel: optional('ANTHROPIC_MODEL'),
  messagingProvider: optional('MESSAGING_PROVIDER', 'mock'),
  metaAccessToken: optional('META_WHATSAPP_ACCESS_TOKEN'),
  metaPhoneNumberId: optional('META_WHATSAPP_PHONE_NUMBER_ID'),
  metaBusinessAccountId: optional('META_WHATSAPP_BUSINESS_ACCOUNT_ID'),
  metaAppSecret: optional('META_APP_SECRET'),
  metaWebhookVerifyToken: optional('META_WEBHOOK_VERIFY_TOKEN'),
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
  if (env.aiProvider === 'openai') requireValues(['OPENAI_API_KEY', 'OPENAI_MODEL']);
  if (env.aiProvider === 'anthropic') requireValues(['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']);
  if (env.messagingProvider === 'meta') requireValues(['META_WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_PHONE_NUMBER_ID', 'META_WHATSAPP_BUSINESS_ACCOUNT_ID', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN']);
  if (!['local', 'r2'].includes(env.storageProvider)) throw new Error('STORAGE_PROVIDER must be local or r2');
  if (env.storageProvider === 'r2') requireValues(['CLOUD_STORAGE_ACCOUNT_ID', 'CLOUD_STORAGE_ACCESS_KEY', 'CLOUD_STORAGE_SECRET_KEY', 'CLOUD_STORAGE_BUCKET']);
  return env;
};

export { env, validateEnv };
