import crypto from 'node:crypto';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Password must be at least 12 characters');
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, encoded) {
  const [algorithm, salt, hash] = String(encoded || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const actual = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

if (process.argv[1]?.endsWith('hash-password.js')) {
  try { console.log(hashPassword(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
