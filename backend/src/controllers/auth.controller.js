import { SignJWT } from 'jose';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from './controller.utils.js';
import { env } from '../config/env.js';
import { db } from '../store.js';
import { hashPassword, verifyPassword } from '../hash-password.js';

const login = asyncHandler(async (req, res) => {
  const passwordHash = process.env.OWNER_PASSWORD_HASH || env.ownerPasswordHash || hashPassword('local-demo-only', 'local-development-salt');
  const ownerEmail = process.env.OWNER_EMAIL || env.ownerEmail;
  if (req.body?.email !== ownerEmail || !verifyPassword(req.body?.password, passwordHash)) throw new ApiError(401, 'Invalid credentials');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || env.jwtSecret || 'local-development-secret-change-me');
  const token = await new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setSubject(db.ownerId).setIssuedAt().setExpirationTime('8h').sign(secret);
  res.cookie('accessToken', token, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 8 * 60 * 60 * 1000 });
  return respond(res, { token }, 200, 'Login successful');
});

const logout = asyncHandler(async (_req, res) => { res.clearCookie('accessToken'); return respond(res, null, 200, 'Logout successful'); });

export { login, logout };
