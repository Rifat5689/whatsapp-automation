import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPhotoRequest, photoDecision, safeContact } from '../src/domain.js';

const settings = { aiEnabled: true, emergencyStop: false };
const contact = { id: 'known', relationship: 'Friend', aiEnabled: true, humanTakeover: false, photoPermissions: true, mode: 'AI Auto' };
const photo = { sharingEnabled: true, autoSendEnabled: true, visibility: 'Selected Contacts', allowedContactIds: ['known'], allowedRelationships: [], requiresApproval: false };

test('detects multilingual photo requests and categories', () => {
  assert.deepEqual(detectPhotoRequest('University photo dao'), { requested: true, category: 'university' });
  assert.equal(detectPhotoRequest('একটা ছবি দাও').requested, true);
});

test('allows an eligible known contact', () => assert.equal(photoDecision({ settings, contact, photo }).allowed, true));
test('emergency stop overrides photo permissions', () => assert.equal(photoDecision({ settings: { ...settings, emergencyStop: true }, contact, photo }).allowed, false));
test('human takeover blocks automation', () => assert.equal(photoDecision({ settings, contact: { ...contact, humanTakeover: true }, photo }).allowed, false));
test('unknown contacts cannot automatically receive photos', () => {
  const decision = photoDecision({ settings, contact: { ...contact, relationship: 'Unknown' }, photo });
  assert.equal(decision.allowed, false); assert.equal(decision.approval, true);
});
test('selected-contact visibility prevents cross-contact access', () => assert.equal(photoDecision({ settings, contact: { ...contact, id: 'other' }, photo }).allowed, false));
test('safe contact update rejects mass assignment', () => {
  const result = safeContact({ name: 'A', mode: 'Manual', ownerId: 'attacker', admin: true }, contact);
  assert.notEqual(result.ownerId, 'attacker'); assert.equal(result.admin, undefined);
});
