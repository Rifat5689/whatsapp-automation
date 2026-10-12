import crypto from 'node:crypto';

export const MODES = ['AI Auto', 'AI Approval', 'Manual'];
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();

export function photoDecision({ settings, contact, photo, automation = true }) {
  if (!settings.aiEnabled || settings.emergencyStop) return { allowed: false, reason: 'Global automation disabled' };
  if (!contact || !contact.aiEnabled || contact.humanTakeover) return { allowed: false, reason: 'Contact automation disabled' };
  if (!photo || !photo.sharingEnabled) return { allowed: false, reason: 'Photo sharing disabled' };
  if (photo.visibility === 'Selected Contacts' && !photo.allowedContactIds.includes(contact.id)) return { allowed: false, reason: 'Contact is not allowed' };
  if (photo.visibility === 'Relationships' && !photo.allowedRelationships.includes(contact.relationship)) return { allowed: false, reason: 'Relationship is not allowed' };
  if (contact.relationship === 'Unknown' && automation) return { allowed: false, approval: true, reason: 'Unknown contacts require approval' };
  if (!contact.photoPermissions || photo.requiresApproval || !photo.autoSendEnabled || contact.mode !== 'AI Auto') return { allowed: false, approval: true, reason: 'Owner approval required' };
  return { allowed: true };
}

export function detectPhotoRequest(text = '') {
  const value = text.toLowerCase();
  const requested = /(photo|picture|pic|ছবি|chobi)/i.test(value);
  const categories = ['university', 'travel', 'professional', 'casual'];
  return { requested, category: categories.find((item) => value.includes(item)) || 'Other' };
}

export function safeContact(input, current = {}) {
  const allowed = ['name', 'phone', 'relationship', 'language', 'communicationStyle', 'replyGuidance', 'aiEnabled', 'mode', 'notes', 'memoryPermissions', 'photoPermissions'];
  const output = { ...current };
  for (const key of allowed) if (Object.hasOwn(input, key)) output[key] = input[key];
  if (!output.name || String(output.name).length > 80) throw new Error('A valid name is required');
  if (!MODES.includes(output.mode)) throw new Error('Invalid conversation mode');
  return output;
}
