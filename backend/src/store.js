import { id, now } from './domain.js';

const ownerId = 'owner-local';
const contacts = [
  { id: 'tanvir', ownerId, name: 'Tanvir Islam', phone: '+8801XXXXXXXXX', relationship: 'Close Friend', language: 'Bangla', communicationStyle: 'Casual and friendly', aiEnabled: true, mode: 'AI Auto', memoryPermissions: true, photoPermissions: true, humanTakeover: false, notes: 'University friend.' },
  { id: 'nadia', ownerId, name: 'Nadia Rahman', phone: '+8801XXXXXXXXX', relationship: 'Friend', language: 'English', communicationStyle: 'Friendly', aiEnabled: true, mode: 'AI Approval', memoryPermissions: true, photoPermissions: true, humanTakeover: false, notes: '' },
  { id: 'unknown', ownerId, name: 'Unknown', phone: '+8801XXXXXXXXX', relationship: 'Unknown', language: 'Mixed', communicationStyle: 'Polite and brief', aiEnabled: false, mode: 'Manual', memoryPermissions: false, photoPermissions: false, humanTakeover: false, notes: '' }
];

export const db = {
  ownerId,
  contacts,
  personalization: { languageStyle: 'Bangla + Banglish + English', tone: 'Friendly and natural', responseLength: 'Medium', humor: 'Sometimes', emojiUsage: 'Moderate', about: 'I am Rifat. I am a university student and tech lover.', share: 'General info, interests, non-sensitive details', neverShare: 'Private personal info, exact location, family details', unknownBehavior: 'Be polite, keep it short, avoid personal details' },
  settings: { aiEnabled: true, emergencyStop: false, defaultMode: 'AI Approval', unknownBehavior: 'Manual', notifications: true },
  ai: { instructionMode: 'Personalized', primary: { provider: 'Mock', model: 'rifat-local', enabled: true }, fallback: { provider: 'Mock', model: 'safe-template', enabled: true } },
  photos: [], approvals: [], activities: [],
  conversations: contacts.map((contact) => ({ id: `conv-${contact.id}`, ownerId, contactId: contact.id, mode: contact.mode, humanTakeover: false })),
  messages: [
    { id: id(), conversationId: 'conv-tanvir', contactId: 'tanvir', direction: 'in', type: 'text', content: 'Bro, ekta pic de na', senderType: 'contact', deliveryStatus: 'received', simulated: true, createdAt: now() },
    { id: id(), conversationId: 'conv-tanvir', contactId: 'tanvir', direction: 'out', type: 'text', content: 'Konta dibo? Casual naki formal?', senderType: 'ai', deliveryStatus: 'sent', simulated: true, createdAt: now() }
  ]
};

export function log(type, detail, contactId = null) {
  const event = { id: id(), ownerId, type, detail, contactId, createdAt: now() };
  db.activities.unshift(event);
  return event;
}
