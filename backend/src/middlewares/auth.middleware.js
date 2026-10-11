import { jwtVerify } from 'jose';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { db } from '../store.js';

const verifyJwt = async (req, _res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || env.jwtSecret || 'local-development-secret-change-me');
    const { payload } = await jwtVerify(token, secret);
    if (payload.sub !== db.ownerId) throw new Error('Invalid owner');
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new ApiError(401, 'Authentication required'));
  }
};

export { verifyJwt };
