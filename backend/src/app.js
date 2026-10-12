import express from 'express';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { SignJWT, jwtVerify } from 'jose';
import { aiAdapter, messagingAdapter } from './adapters/index.js';
import { storageAdapter } from './adapters/storage.adapter.js';
import { db, log } from './store.js';
import { detectPhotoRequest, id, now, photoDecision, safeContact } from './domain.js';
import { saveState } from './services/state-persistence.service.js';
import { env } from './config/env.js';
import { router as authRouter } from './routes/auth.routes.js';
import { router as contactRouter } from './routes/contact.routes.js';
import { verifyJwt } from './middlewares/auth.middleware.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.OWNER_USERNAME || !process.env.OWNER_PASSWORD)) throw new Error('Production authentication secrets are required');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'local-development-secret-change-me');
  const auth = async (req, res, next) => {
    try { const token = req.headers.authorization?.replace(/^Bearer /, ''); const { payload } = await jwtVerify(token, secret); if (payload.sub !== db.ownerId) throw new Error(); req.ownerId = payload.sub; next(); }
    catch { res.status(401).json({ error: 'Authentication required' }); }
  };
  const ownedContact = (contactId) => db.contacts.find((item) => item.id === contactId && item.ownerId === db.ownerId);
  const success = (res, data, status = 200) => res.status(status).json({ data });
  const sameSecret = (provided, expected) => {
    const left = Buffer.from(String(provided || '')); const right = Buffer.from(String(expected || ''));
    return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
  };

  const processIncoming = async ({ contact, content, providerMessageId, simulated = false }) => {
    if (providerMessageId) { const duplicate = db.messages.find((item) => item.providerMessageId === providerMessageId); if (duplicate) return { incoming: duplicate, action: 'duplicate' }; }
    const conversationId = `conv-${contact.id}`; const incoming = { id: id(), conversationId, contactId: contact.id, direction: 'in', type: 'text', content: content.slice(0, 4000), senderType: 'contact', deliveryStatus: 'received', simulated, providerMessageId: providerMessageId || null, createdAt: now() }; db.messages.push(incoming); log('message.received', incoming.content, contact.id);
    await saveState();
    if (!db.settings.aiEnabled || db.settings.emergencyStop || !contact.aiEnabled || contact.humanTakeover || contact.mode === 'Manual') return { incoming, action: 'manual' };
    const photoRequest = detectPhotoRequest(incoming.content);
    if (photoRequest.requested) {
      const photo = db.photos.find((item) => item.category.toLowerCase() === photoRequest.category.toLowerCase()) || db.photos[0];
      const decision = photoDecision({ settings: db.settings, contact, photo });
      if (decision.approval && photo) { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'photo', photoId: photo.id, caption: 'Here is the photo you asked for.', reason: decision.reason, status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', decision.reason, contact.id); await saveState(); return { incoming, action: 'approval', approval }; }
      if (!decision.allowed) return { incoming, action: 'blocked', reason: decision.reason };
      const sent = await messagingAdapter.send({ content: 'Here is the photo you asked for.', photoId: photo.id, chatId: contact.telegramChatId }); const message = { id: id(), conversationId, contactId: contact.id, direction: 'out', type: 'image', content: sent.content, photoId: photo.id, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); log('photo.sent', photo.filename, contact.id); await saveState(); return { incoming, action: 'sent', message };
    }
    let reply;
    try { reply = await aiAdapter.generateReply({ message: incoming.content, contact, personalization: db.personalization, configuration: db.ai }); }
    catch (error) { log('ai.failed', `Provider request failed${error.status ? ` (${error.status})` : ''}`, contact.id); await saveState(); return { incoming, action: 'failed' }; }
    if (contact.mode === 'AI Approval') { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'text', draft: reply, reason: 'Conversation mode requires approval', status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', approval.reason, contact.id); await saveState(); return { incoming, action: 'approval', approval }; }
    const sent = await messagingAdapter.send({ content: reply, chatId: contact.telegramChatId }); const message = { id: id(), conversationId, contactId: contact.id, direction: 'out', type: 'text', content: reply, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); log('message.sent', reply, contact.id); await saveState(); return { incoming, action: 'sent', message };
  };

  app.get('/api/v1/health', (_req, res) => {
    const database = mongoose.connection.readyState === 1 ? 'connected' : env.mongodbUri ? 'disconnected' : 'local';
    const healthy = database !== 'disconnected';
    return res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', database });
  });

  app.post('/api/v1/webhooks/telegram', async (req, res, next) => {
    try {
      if (env.messagingProvider !== 'telegram' || !sameSecret(req.get('x-telegram-bot-api-secret-token'), env.telegramWebhookSecret)) return res.sendStatus(401);
      const message = req.body?.message;
      if (!message?.chat?.id || typeof message.text !== 'string' || !message.text.trim()) return res.sendStatus(200);
      const chatId = String(message.chat.id);
      let contact = db.contacts.find((item) => item.telegramChatId === chatId);
      if (!contact) {
        const displayName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ').trim() || message.from?.username || `Telegram ${chatId}`;
        const mode = ['AI Auto', 'AI Approval', 'Manual'].includes(db.settings.defaultMode) ? db.settings.defaultMode : 'AI Approval';
        contact = { id: id(), ownerId: db.ownerId, name: displayName.slice(0, 80), phone: '', telegramChatId: chatId, telegramUsername: String(message.from?.username || '').slice(0, 64), telegramDefaultModeApplied: true, relationship: 'Unknown', language: 'Natural', communicationStyle: 'Polite and brief', aiEnabled: mode !== 'Manual', mode, memoryPermissions: false, photoPermissions: false, humanTakeover: false, notes: 'Created from Telegram.' };
        db.contacts.push(contact); db.conversations.push({ id: `conv-${contact.id}`, ownerId: db.ownerId, contactId: contact.id, mode: contact.mode, humanTakeover: false }); log('contact.created.telegram', contact.name, contact.id);
      }
      if (contact.telegramDefaultModeApplied !== true) {
        const mode = ['AI Auto', 'AI Approval', 'Manual'].includes(db.settings.defaultMode) ? db.settings.defaultMode : 'AI Approval';
        contact.mode = mode; contact.aiEnabled = mode !== 'Manual'; contact.telegramDefaultModeApplied = true;
      }
      await processIncoming({ contact, content: message.text.trim(), providerMessageId: `telegram-${chatId}-${message.message_id}`, simulated: false });
      return res.sendStatus(200);
    } catch (error) { return next(error); }
  });

  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1', verifyJwt);
  app.get('/api/v1/bootstrap', (_req, res) => success(res, { ...db, integrations: { messagingProvider: env.messagingProvider } }));
  app.use('/api/v1/contacts', contactRouter);
  app.put('/api/v1/personalization', async (req, res) => { const allowed = ['languageStyle', 'tone', 'responseLength', 'humor', 'emojiUsage', 'about', 'share', 'neverShare', 'unknownBehavior']; for (const key of allowed) if (Object.hasOwn(req.body, key)) db.personalization[key] = String(req.body[key]).slice(0, 1000); await saveState(); success(res, db.personalization); });
  app.patch('/api/v1/settings', async (req, res) => { for (const key of ['aiEnabled', 'emergencyStop', 'defaultMode', 'unknownBehavior', 'notifications']) if (Object.hasOwn(req.body, key)) db.settings[key] = req.body[key]; log('settings.updated', 'Application settings changed'); await saveState(); success(res, db.settings); });
  app.patch('/api/v1/ai', async (req, res) => { const providers = ['Mock', 'OpenRouter', 'Gemini']; if (['Raw', 'Personalized'].includes(req.body.instructionMode)) db.ai.instructionMode = req.body.instructionMode; for (const tier of ['primary', 'fallback']) if (req.body[tier]) { if (Object.hasOwn(req.body[tier], 'provider') && providers.includes(req.body[tier].provider)) db.ai[tier].provider = req.body[tier].provider; if (Object.hasOwn(req.body[tier], 'model')) db.ai[tier].model = String(req.body[tier].model).slice(0, 500); if (Object.hasOwn(req.body[tier], 'enabled')) db.ai[tier].enabled = Boolean(req.body[tier].enabled); } log('ai.updated', 'AI provider settings changed'); await saveState(); success(res, db.ai); });
  app.post('/api/v1/conversations/:contactId/takeover', async (req, res) => { const contact = ownedContact(req.params.contactId); if (!contact) return res.status(404).json({ error: 'Contact not found' }); contact.humanTakeover = Boolean(req.body.active); log(contact.humanTakeover ? 'takeover.started' : 'takeover.ended', contact.name, contact.id); await saveState(); success(res, contact); });

  app.post('/api/v1/messages/incoming', async (req, res) => { const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' }); const result = await processIncoming({ contact, content: req.body.content, providerMessageId: req.body.providerMessageId, simulated: true }); return success(res, result, result.action === 'duplicate' ? 200 : 201); });
  app.post('/api/v1/messages/send', async (req, res) => { const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' }); const content = req.body.content.slice(0, 4000); const sent = req.body.simulateFailure ? { content, providerMessageId: null, deliveryStatus: 'failed', simulated: true } : await messagingAdapter.send({ content, chatId: contact.telegramChatId }); const message = { id: id(), conversationId: `conv-${contact.id}`, contactId: contact.id, direction: 'out', type: 'text', senderType: 'owner', createdAt: now(), ...sent }; db.messages.push(message); log(message.deliveryStatus === 'failed' ? 'message.failed' : 'message.sent', message.content, contact.id); await saveState(); success(res, message, 201); });
  app.post('/api/v1/messages/:id/retry', async (req, res) => { const message = db.messages.find((item) => item.id === req.params.id && item.direction === 'out'); if (!message) return res.status(404).json({ error: 'Message not found' }); if (message.deliveryStatus !== 'failed') return res.status(409).json({ error: 'Only failed messages can be retried' }); const contact = ownedContact(message.contactId); const sent = await messagingAdapter.send({ content: message.content, photoId: message.photoId, chatId: contact?.telegramChatId }); Object.assign(message, sent, { retriedAt: now() }); log('message.retried', message.content, message.contactId); await saveState(); success(res, message); });
  app.post('/api/v1/messages/send-photo', async (req, res) => { const contact = ownedContact(req.body.contactId); const photo = db.photos.find((item) => item.id === req.body.photoId && item.ownerId === db.ownerId); if (!contact || !photo) return res.status(404).json({ error: 'Contact or photo not found' }); const decision = photoDecision({ settings: db.settings, contact, photo, automation: false }); if (!decision.allowed && !decision.approval) return res.status(403).json({ error: decision.reason }); const sent = await messagingAdapter.send({ content: String(req.body.caption || '').slice(0, 1000), photoId: photo.id, chatId: contact.telegramChatId }); const message = { id: id(), conversationId: `conv-${contact.id}`, contactId: contact.id, direction: 'out', type: 'image', content: sent.content, photoId: photo.id, senderType: 'owner', createdAt: now(), ...sent }; db.messages.push(message); log('photo.sent.manual', photo.filename, contact.id); await saveState(); success(res, message, 201); });
  app.post('/api/v1/approvals/:id/:action', async (req, res) => { const approval = db.approvals.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!approval || approval.status !== 'pending' || !['approve', 'reject'].includes(req.params.action)) return res.status(409).json({ error: 'Approval is unavailable' }); approval.status = req.params.action === 'approve' ? 'approved' : 'rejected'; approval.resolvedAt = now(); if (approval.status === 'approved') { const contact = ownedContact(approval.contactId); if (!contact || db.settings.emergencyStop || contact.humanTakeover) { approval.status = 'blocked'; await saveState(); return res.status(409).json({ error: 'Permission changed; send blocked' }); } let content = approval.draft; let type = 'text'; let photoId; if (approval.type === 'photo') { const photo = db.photos.find((item) => item.id === approval.photoId); const decision = photoDecision({ settings: db.settings, contact, photo, automation: false }); if (!decision.allowed && !decision.approval) { approval.status = 'blocked'; await saveState(); return res.status(409).json({ error: decision.reason }); } content = approval.caption; type = 'image'; photoId = photo.id; } const sent = await messagingAdapter.send({ content, photoId, chatId: contact.telegramChatId }); const message = { id: id(), conversationId: approval.conversationId, contactId: approval.contactId, direction: 'out', type, content, photoId, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); approval.messageId = message.id; } log(`approval.${approval.status}`, approval.type, approval.contactId); await saveState(); success(res, approval); });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  app.post('/api/v1/photos', upload.single('photo'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'Photo required' }); const image = sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }); const metadata = await image.metadata(); if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return res.status(415).json({ error: 'Unsupported image' }); const photoId = id(); const filename = `${photoId}.webp`; const content = await image.rotate().webp({ quality: 85 }).toBuffer(); await storageAdapter.put({ key: filename, body: content, contentType: 'image/webp' }); const photo = { id: photoId, ownerId: db.ownerId, storageKey: filename, filename: String(req.body.title || req.file.originalname).slice(0, 100), mimeType: 'image/webp', size: content.length, dimensions: { width: metadata.width, height: metadata.height }, category: String(req.body.category || 'Other').slice(0, 40), description: String(req.body.description || '').slice(0, 500), sharingEnabled: false, autoSendEnabled: false, visibility: 'Private', allowedContactIds: [], allowedRelationships: [], requiresApproval: true, isPrimary: false, createdAt: now() }; db.photos.push(photo); log('photo.uploaded', photo.filename); await saveState(); success(res, photo, 201); } catch { res.status(400).json({ error: 'Invalid image' }); } });
  app.patch('/api/v1/photos/:id', async (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); for (const key of ['filename', 'category', 'description', 'sharingEnabled', 'autoSendEnabled', 'visibility', 'allowedContactIds', 'allowedRelationships', 'requiresApproval', 'isPrimary']) if (Object.hasOwn(req.body, key)) photo[key] = req.body[key]; await saveState(); success(res, photo); });
  app.put('/api/v1/photos/:id/content', upload.single('photo'), async (req, res) => { try { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo || !req.file) return res.status(404).json({ error: 'Photo or replacement not found' }); const image = sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }); const metadata = await image.metadata(); if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return res.status(415).json({ error: 'Unsupported image' }); const content = await image.rotate().webp({ quality: 85 }).toBuffer(); await storageAdapter.put({ key: photo.storageKey, body: content, contentType: 'image/webp' }); Object.assign(photo, { mimeType: 'image/webp', size: content.length, dimensions: { width: metadata.width, height: metadata.height }, updatedAt: now() }); log('photo.replaced', photo.filename); await saveState(); success(res, photo); } catch { res.status(400).json({ error: 'Invalid image' }); } });
  app.delete('/api/v1/photos/:id', async (req, res) => { const index = db.photos.findIndex((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (index < 0) return res.status(404).json({ error: 'Photo not found' }); const photo = db.photos[index]; await storageAdapter.delete(photo.storageKey); db.photos.splice(index, 1); log('photo.deleted', photo.filename); await saveState(); res.status(204).end(); });
  app.get('/api/v1/photos/:id/content', async (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); const content = await storageAdapter.get(photo.storageKey); res.type('webp').send(content); });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

