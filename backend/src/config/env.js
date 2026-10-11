const optional = (name, fallback = '') => process.env[name]?.trim() || fallback;

const env = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3001')),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:5173'),
  mongodbUri: optional('MONGODB_URI'),
  ownerEmail: optional('OWNER_EMAIL', 'owner@example.com'),
  ownerPasswordHash: optional('OWNER_PASSWORD_HASH'),
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
  awsRegion: optional('AWS_REGION'),
  awsS3Bucket: optional('AWS_S3_BUCKET'),
  awsAccessKeyId: optional('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: optional('AWS_SECRET_ACCESS_KEY')
});

const requireValues = (names) => {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
};

const validateEnv = () => {
  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) throw new Error('PORT must be a valid TCP port');
  if (env.nodeEnv === 'production') requireValues(['MONGODB_URI', 'OWNER_EMAIL', 'OWNER_PASSWORD_HASH', 'JWT_SECRET', 'FRONTEND_ORIGIN']);
  if (env.aiProvider === 'openai') requireValues(['OPENAI_API_KEY', 'OPENAI_MODEL']);
  if (env.aiProvider === 'anthropic') requireValues(['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']);
  if (env.messagingProvider === 'meta') requireValues(['META_WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_PHONE_NUMBER_ID', 'META_WHATSAPP_BUSINESS_ACCOUNT_ID', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN']);
  if (env.storageProvider === 's3') requireValues(['AWS_REGION', 'AWS_S3_BUCKET']);
  return env;
};

export { env, validateEnv };
