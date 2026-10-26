import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Reads the JWT from the "token" cookie on an incoming Request (App Router)
export function getUserFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  return verifyToken(decodeURIComponent(match[1]));
}

// Throws-free guard: returns { ok: true, user } or { ok: false, status, message }
export function requireRole(request, allowedRoles) {
  const user = getUserFromRequest(request);
  if (!user) {
    return { ok: false, status: 401, message: 'Not authenticated' };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, message: 'Not authorized for this action' };
  }
  return { ok: true, user };
}
