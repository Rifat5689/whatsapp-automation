import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';
import { SignJWT, jwtVerify } from 'jose';
import { aiAdapter, messagingAdapter } from './adapters/index.js';
import { db, log } from './store.js';
import { detectPhotoRequest, id, now, photoDecision, safeContact } from './domain.js';
import { hashPassword, verifyPassword } from './hash-password.js';

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.OWNER_PASSWORD_HASH)) throw new Error('Production authentication secrets are required');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'local-development-secret-change-me');
  const auth = async (req, res, next) => {
    try { const token = req.headers.authorization?.replace(/^Bearer /, ''); const { payload } = await jwtVerify(token, secret); if (payload.sub !== db.ownerId) throw new Error(); req.ownerId = payload.sub; next(); }
    catch { res.status(401).json({ error: 'Authentication required' }); }
  };
  const ownedContact = (contactId) => db.contacts.find((item) => item.id === contactId && item.ownerId === db.ownerId);
  const success = (res, data, status = 200) => res.status(status).json({ data });

  app.post('/api/v1/auth/login', async (req, res) => {
    const email = process.env.OWNER_EMAIL || 'owner@example.com';
    const passwordHash = process.env.OWNER_PASSWORD_HASH || hashPassword('local-demo-only', 'local-development-salt');
    if (req.body?.email !== email || !verifyPassword(req.body?.password, passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = await new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setSubject(db.ownerId).setIssuedAt().setExpirationTime('8h').sign(secret);
    success(res, { token });
  });

  app.use('/api/v1', auth);
  app.get('/api/v1/bootstrap', (_req, res) => success(res, db));
  app.get('/api/v1/contacts', (_req, res) => success(res, db.contacts));
  app.post('/api/v1/contacts', (req, res) => { try { const contact = safeContact(req.body, { id: id(), ownerId: db.ownerId, aiEnabled: false, mode: 'Manual', memoryPermissions: false, photoPermissions: false, humanTakeover: false }); db.contacts.push(contact); db.conversations.push({ id: `conv-${contact.id}`, ownerId: db.ownerId, contactId: contact.id, mode: contact.mode, humanTakeover: false }); log('contact.created', contact.name, contact.id); success(res, contact, 201); } catch (error) { res.status(400).json({ error: error.message }); } });
  app.patch('/api/v1/contacts/:id', (req, res) => { const contact = ownedContact(req.params.id); if (!contact) return res.status(404).json({ error: 'Contact not found' }); try { Object.assign(contact, safeContact(req.body, contact)); log('contact.updated', contact.name, contact.id); success(res, contact); } catch (error) { res.status(400).json({ error: error.message }); } });
  app.put('/api/v1/personalization', (req, res) => { const allowed = ['languageStyle', 'tone', 'responseLength', 'humor', 'emojiUsage', 'about', 'share', 'neverShare', 'unknownBehavior']; for (const key of allowed) if (Object.hasOwn(req.body, key)) db.personalization[key] = String(req.body[key]).slice(0, 1000); success(res, db.personalization); });
  app.patch('/api/v1/settings', (req, res) => { for (const key of ['aiEnabled', 'emergencyStop', 'defaultMode', 'unknownBehavior', 'notifications']) if (Object.hasOwn(req.body, key)) db.settings[key] = req.body[key]; log('settings.updated', 'Application settings changed'); success(res, db.settings); });
  app.post('/api/v1/conversations/:contactId/takeover', (req, res) => { const contact = ownedContact(req.params.contactId); if (!contact) return res.status(404).json({ error: 'Contact not found' }); contact.humanTakeover = Boolean(req.body.active); log(contact.humanTakeover ? 'takeover.started' : 'takeover.ended', contact.name, contact.id); success(res, contact); });

  app.post('/api/v1/messages/incoming', async (req, res) => {
    const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' });
    const conversationId = `conv-${contact.id}`; const incoming = { id: id(), conversationId, contactId: contact.id, direction: 'in', type: 'text', content: req.body.content.slice(0, 4000), senderType: 'contact', deliveryStatus: 'received', simulated: true, createdAt: now() }; db.messages.push(incoming); log('message.received', incoming.content, contact.id);
    if (!db.settings.aiEnabled || db.settings.emergencyStop || !contact.aiEnabled || contact.humanTakeover || contact.mode === 'Manual') return success(res, { incoming, action: 'manual' }, 201);
    const photoRequest = detectPhotoRequest(incoming.content);
    if (photoRequest.requested) {
      const photo = db.photos.find((item) => item.category.toLowerCase() === photoRequest.category.toLowerCase()) || db.photos[0];
      const decision = photoDecision({ settings: db.settings, contact, photo });
      if (decision.approval && photo) { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'photo', photoId: photo.id, caption: 'Here is the photo you asked for.', reason: decision.reason, status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', decision.reason, contact.id); return success(res, { incoming, action: 'approval', approval }, 201); }
      if (!decision.allowed) return success(res, { incoming, action: 'blocked', reason: decision.reason }, 201);
    }
    const content = await aiAdapter.generateReply({ message: incoming.content, contact, personalization: db.personalization });
    if (contact.mode === 'AI Approval') { const approval = { id: id(), ownerId: db.ownerId, contactId: contact.id, conversationId, type: 'text', draft: content, reason: 'Conversation mode requires approval', status: 'pending', createdAt: now() }; db.approvals.push(approval); log('approval.created', approval.reason, contact.id); return success(res, { incoming, action: 'approval', approval }, 201); }
    const sent = await messagingAdapter.send({ content }); const message = { id: id(), conversationId, contactId: contact.id, direction: 'out', type: 'text', content, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); log('message.sent', content, contact.id); success(res, { incoming, action: 'sent', message }, 201);
  });
  app.post('/api/v1/messages/send', async (req, res) => { const contact = ownedContact(req.body.contactId); if (!contact || typeof req.body.content !== 'string') return res.status(400).json({ error: 'Invalid message' }); const sent = await messagingAdapter.send({ content: req.body.content.slice(0, 4000) }); const message = { id: id(), conversationId: `conv-${contact.id}`, contactId: contact.id, direction: 'out', type: 'text', senderType: 'owner', createdAt: now(), ...sent }; db.messages.push(message); log('message.sent', message.content, contact.id); success(res, message, 201); });
  app.post('/api/v1/approvals/:id/:action', async (req, res) => { const approval = db.approvals.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!approval || approval.status !== 'pending' || !['approve', 'reject'].includes(req.params.action)) return res.status(409).json({ error: 'Approval is unavailable' }); approval.status = req.params.action === 'approve' ? 'approved' : 'rejected'; approval.resolvedAt = now(); if (approval.status === 'approved') { const contact = ownedContact(approval.contactId); if (!contact || db.settings.emergencyStop || contact.humanTakeover) { approval.status = 'blocked'; return res.status(409).json({ error: 'Permission changed; send blocked' }); } let content = approval.draft; let type = 'text'; let photoId; if (approval.type === 'photo') { const photo = db.photos.find((item) => item.id === approval.photoId); const decision = photoDecision({ settings: db.settings, contact, photo, automation: false }); if (!decision.allowed && !decision.approval) { approval.status = 'blocked'; return res.status(409).json({ error: decision.reason }); } content = approval.caption; type = 'image'; photoId = photo.id; } const sent = await messagingAdapter.send({ content, photoId }); const message = { id: id(), conversationId: approval.conversationId, contactId: approval.contactId, direction: 'out', type, content, photoId, senderType: 'ai', createdAt: now(), ...sent }; db.messages.push(message); approval.messageId = message.id; } log(`approval.${approval.status}`, approval.type, approval.contactId); success(res, approval); });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  app.post('/api/v1/photos', upload.single('photo'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'Photo required' }); const image = sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }); const metadata = await image.metadata(); if (!['jpeg', 'png', 'webp'].includes(metadata.format)) return res.status(415).json({ error: 'Unsupported image' }); const photoId = id(); const directory = path.resolve('data/uploads'); fs.mkdirSync(directory, { recursive: true }); const filename = `${photoId}.webp`; await image.rotate().webp({ quality: 85 }).toFile(path.join(directory, filename)); const photo = { id: photoId, ownerId: db.ownerId, storageKey: filename, filename: String(req.body.title || req.file.originalname).slice(0, 100), mimeType: 'image/webp', size: req.file.size, dimensions: { width: metadata.width, height: metadata.height }, category: String(req.body.category || 'Other').slice(0, 40), description: String(req.body.description || '').slice(0, 500), sharingEnabled: false, autoSendEnabled: false, visibility: 'Private', allowedContactIds: [], allowedRelationships: [], requiresApproval: true, isPrimary: false, createdAt: now() }; db.photos.push(photo); log('photo.uploaded', photo.filename); success(res, photo, 201); } catch { res.status(400).json({ error: 'Invalid image' }); } });
  app.patch('/api/v1/photos/:id', (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); for (const key of ['filename', 'category', 'description', 'sharingEnabled', 'autoSendEnabled', 'visibility', 'allowedContactIds', 'allowedRelationships', 'requiresApproval', 'isPrimary']) if (Object.hasOwn(req.body, key)) photo[key] = req.body[key]; success(res, photo); });
  app.delete('/api/v1/photos/:id', (req, res) => { const index = db.photos.findIndex((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (index < 0) return res.status(404).json({ error: 'Photo not found' }); const [photo] = db.photos.splice(index, 1); fs.rmSync(path.resolve('data/uploads', photo.storageKey), { force: true }); log('photo.deleted', photo.filename); res.status(204).end(); });
  app.get('/api/v1/photos/:id/content', (req, res) => { const photo = db.photos.find((item) => item.id === req.params.id && item.ownerId === db.ownerId); if (!photo) return res.status(404).json({ error: 'Photo not found' }); res.type('webp').sendFile(path.resolve('data/uploads', photo.storageKey)); });
  app.use((error, _req, res, _next) => error instanceof multer.MulterError ? res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Photo exceeds 5 MB' : 'Upload rejected' }) : res.status(500).json({ error: 'Unexpected server error' }));
  return app;
}

