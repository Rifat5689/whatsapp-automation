import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { SignJWT, jwtVerify } from 'jose';
import { aiAdapter, messagingAdapter } from './adapters/index.js';
import { db, log } from './store.js';
import { detectPhotoRequest, id, now, photoDecision, safeContact } from './domain.js';
import { saveState } from './services/state-persistence.service.js';
import { env } from './config/env.js';
import { router as authRouter } from './routes/auth.routes.js';
import { router as contactRouter } from './routes/contact.routes.js';
import { verifyJwt } from './middlewares/auth.middleware.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
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

  app.get('/api/v1/health', (_req, res) => {
    const database = mongoose.connection.readyState === 1 ? 'connected' : env.mongodbUri ? 'disconnected' : 'local';
    const healthy = database !== 'disconnected';
    return res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', database });
  });

  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1', verifyJwt);
  app.get('/api/v1/bootstrap', (_req, res) => success(res, db));
  app.use('/api/v1/contacts', contactRouter);
  app.put('/api/v1/personalization', async (req, res) => { const allowed = ['languageStyle', 'tone', 'responseLength', 'humor', 'emojiUsage', 'about', 'share', 'neverShare', 'unknownBehavior']; for (const key of allowed) if (Object.hasOwn(req.body, key)) db.personalization[key] = String(req.body[key]).slice(0, 1000); await saveState(); success(res, db.personalization); });
  app.patch('/api/v1/settings', async (req, res) => { for (const key of ['aiEnabled', 'emergencyStop', 'defaultMode', 'unknownBehavior', 'notifications']) if (Object.hasOwn(req.body, key)) db.settings[key] = req.body[key]; log('settings.updated', 'Application settings changed'); await saveState(); success(res, db.settings); });
  app.patch('/api/v1/ai', async (req, res) => { for (const tier of ['primary', 'fallback']) if (req.body[tier]) for (const key of ['provider', 'model', 'enabled']) if (Object.hasOwn(req.body[tier], key)) db.ai[tier][key] = req.body[tier][key]; log('ai.updated', 'AI provider settings changed'); await saveState(); success(res, db.ai); });
  app.post('/api/v1/conversations/:contactId/takeover', async (req, res) => { const contact = ownedContact(req.params.contactId); if (!contact) return res.status(404).json({ error: 'Contact not found' }); contact.humanTakeover = Boolean(req.body.active); log(contact.humanTakeover ? 'takeover.started' : 'takeover.ended', contact.name, contact.id); await saveState(); success(res, contact); });

  app.post('/api/v1/messages/incoming', async (req, res) => {
    const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' });
    if (req.body.providerMessageId) { const duplicate = db.messages.find((item) => item.providerMessageId === req.body.providerMessageId); if (duplicate) return success(res, { incoming: duplicate, action: 'duplicate' }); }
    const conversationId = `conv-${contact.id}`; const incoming = { id: id(), conversationId, contactId: contact.id, direction: 'in', type: 'text', content: req.body.content.slice(0, 4000), senderType: 'contact', deliveryStatus: 'received', simulated: true, createdAt: now() }; db.messages.push(incoming); log('message.received', incoming.content, contact.id);
    incoming.providerMessageId = req.body.providerMessageId || null;
    await saveState();
    if (!db.settings.aiEnabled || db.settings.emergencyStop || !contact.aiEnabled || contact.humanTakeover || contact.mode === 'Manual') return success(res, { incoming, action: 'manual' }, 201);
    const photoRequest = detectPhotoRequest(incoming.content);
    if (photoRequest.requested) {
      const photo = db.photos.find((item) => item.category.toLowerCase() === photoRequest.category.toLowerCase()) || db.photos[0];
      const decision = photoDecision({ settings: db.settings, contact, photo });
      if (decision.approval && photo) { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'photo', photoId: photo.id, caption: 'Here is the photo you asked for.', reason: decision.reason, status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', decision.reason, contact.id); await saveState(); return success(res, { incoming, action: 'approval', approval }, 201); }
      if (!decision.allowed) return success(res, { incoming, action: 'blocked', reason: decision.reason }, 201);
      const sent = await messagingAdapter.send({ content: 'Here is the photo you asked for.', photoId: photo.id }); const message = { id: id(), conversationId, contactId: contact.id, direction: 'out', type: 'image', content: sent.content, photoId: photo.id, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); log('photo.sent', photo.filename, contact.id); await saveState(); return success(res, { incoming, action: 'sent', message }, 201);
    }
    const content = await aiAdapter.generateReply({ message: incoming.content, contact, personalization: db.personalization });
    if (contact.mode === 'AI Approval') { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'text', draft: content, reason: 'Conversation mode requires approval', status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', approval.reason, contact.id); await saveState(); return success(res, { incoming, action: 'approval', approval }, 201); }
    const sent = await messagingAdapter.send({ content }); const message = { id: id(), conversationId, contactId: contact.id, direction: 'out', type: 'text', content, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); log('message.sent', content, contact.id); await saveState(); success(res, { incoming, action: 'sent', message }, 201);
  });
  app.post('/api/v1/messages/send', async (req, res) => { const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' }); const content = req.body.content.slice(0, 4000); const sent = req.body.simulateFailure ? { content, providerMessageId: null, deliveryStatus: 'failed', simulated: true } : await messagingAdapter.send({ content }); const message = { id: id(), conversationId: `conv-${contact.id}`, contactId: contact.id, direction: 'out', type: 'text', senderType: 'owner', createdAt: now(), ...sent }; db.messages.push(message); log(message.deliveryStatus === 'failed' ? 'message.failed' : 'message.sent', message.content, contact.id); await saveState(); success(res, message, 201); });
  app.post('/api/v1/messages/:id/retry', async (req, res) => { const message = db.messages.find((item) => item.id === req.params.id && item.direction === 'out'); if (!message) return res.status(404).json({ error: 'Message not found' }); if (message.deliveryStatus !== 'failed') return res.status(409).json({ error: 'Only failed messages can be retried' }); const sent = await messagingAdapter.send({ content: message.content, photoId: message.photoId }); Object.assign(message, sent, { retriedAt: now() }); log('message.retried', message.content, message.contactId); await saveState(); success(res, message); });
  app.post('/api/v1/messages/send-photo', async (req, res) => { const contact = ownedContact(req.body.contactId); const photo = db.photos.find((item) => item.id === req.body.photoId && item.ownerId === db.ownerId); if (!contact || !photo) return res.status(404).json({ error: 'Contact or photo not found' }); const decision = photoDecision({ settings: db.settings, contact, photo, automation: false }); if (!decision.allowed && !decision.approval) return res.status(403).json({ error: decision.reason }); const sent = await messagingAdapter.send({ content: String(req.body.caption || '').slice(0, 1000), photoId: photo.id }); const message = { id: id(), conversationId: `conv-${contact.id}`, contactId: contact.id, direction: 'out', type: 'image', content: sent.content, photoId: photo.id, senderType: 'owner', createdAt: now(), ...sent }; db.messages.push(message); log('photo.sent.manual', photo.filename, contact.id); await saveState(); success(res, message, 201); });
  app.post('/api/v1/approvals/:id/:action', async (req, res) => { const approval = db.approvals.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!approval || approval.status !== 'pending' || !['approve', 'reject'].includes(req.params.action)) return res.status(409).json({ error: 'Approval is unavailable' }); approval.status = req.params.action === 'approve' ? 'approved' : 'rejected'; approval.resolvedAt = now(); if (approval.status === 'approved') { const contact = ownedContact(approval.contactId); if (!contact || db.settings.emergencyStop || contact.humanTakeover) { approval.status = 'blocked'; await saveState(); return res.status(409).json({ error: 'Permission changed; send blocked' }); } let content = approval.draft; let type = 'text'; let photoId; if (approval.type === 'photo') { const photo = db.photos.find((item) => item.id === approval.photoId); const decision = photoDecision({ settings: db.settings, contact, photo, automation: false }); if (!decision.allowed && !decision.approval) { approval.status = 'blocked'; await saveState(); return res.status(409).json({ error: decision.reason }); } content = approval.caption; type = 'image'; photoId = photo.id; } const sent = await messagingAdapter.send({ content, photoId }); const message = { id: id(), conversationId: approval.conversationId, contactId: approval.contactId, direction: 'out', type, content, photoId, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); approval.messageId = message.id; } log(`approval.${approval.status}`, approval.type, approval.contactId); await saveState(); success(res, approval); });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  app.post('/api/v1/photos', upload.single('photo'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'Photo required' }); const image = sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }); const metadata = await image.metadata(); if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return res.status(415).json({ error: 'Unsupported image' }); const photoId = id(); fs.mkdirSync(uploadDirectory, { recursive: true }); const filename = `${photoId}.webp`; await image.rotate().webp({ quality: 85 }).toFile(path.join(uploadDirectory, filename)); const photo = { id: photoId, ownerId: db.ownerId, storageKey: filename, filename: String(req.body.title || req.file.originalname).slice(0, 100), mimeType: 'image/webp', size: req.file.size, dimensions: { width: metadata.width, height: metadata.height }, category: String(req.body.category || 'Other').slice(0, 40), description: String(req.body.description || '').slice(0, 500), sharingEnabled: false, autoSendEnabled: false, visibility: 'Private', allowedContactIds: [], allowedRelationships: [], requiresApproval: true, isPrimary: false, createdAt: now() }; db.photos.push(photo); log('photo.uploaded', photo.filename); await saveState(); success(res, photo, 201); } catch { res.status(400).json({ error: 'Invalid image' }); } });
  app.patch('/api/v1/photos/:id', async (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); for (const key of ['filename', 'category', 'description', 'sharingEnabled', 'autoSendEnabled', 'visibility', 'allowedContactIds', 'allowedRelationships', 'requiresApproval', 'isPrimary']) if (Object.hasOwn(req.body, key)) photo[key] = req.body[key]; await saveState(); success(res, photo); });
  app.put('/api/v1/photos/:id/content', upload.single('photo'), async (req, res) => { try { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo || !req.file) return res.status(404).json({ error: 'Photo or replacement not found' }); const image = sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }); const metadata = await image.metadata(); if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return res.status(415).json({ error: 'Unsupported image' }); await image.rotate().webp({ quality: 85 }).toFile(path.join(uploadDirectory, photo.storageKey)); Object.assign(photo, { mimeType: 'image/webp', size: req.file.size, dimensions: { width: metadata.width, height: metadata.height }, updatedAt: now() }); log('photo.replaced', photo.filename); await saveState(); success(res, photo); } catch { res.status(400).json({ error: 'Invalid image' }); } });
  app.delete('/api/v1/photos/:id', async (req, res) => { const index = db.photos.findIndex((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (index < 0) return res.status(404).json({ error: 'Photo not found' }); const [photo] = db.photos.splice(index, 1); fs.rmSync(path.join(uploadDirectory, photo.storageKey), { force: true }); log('photo.deleted', photo.filename); await saveState(); res.status(204).end(); });
  app.get('/api/v1/photos/:id/content', (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); res.type('webp').sendFile(path.join(uploadDirectory, photo.storageKey)); });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

