import crypto from 'crypto';
import User from '../models/User.js';

// Signed admin sessions. Logging in returns a token; every admin API request sends it as
// "Authorization: Bearer <token>", and requireAdmin checks it on the server. Before this, the admin pages only
// checked localStorage in the browser and anyone who knew an API address could read applicants' data.
//
// A token is base64url(JSON payload) + "." + HMAC-SHA256 of it, signed with ADMIN_TOKEN_SECRET.
// The payload carries a fingerprint of the user's current password hash, so changing the password ends every
// older session.

export const SESSION_HOURS = 12;

let generatedSecret = null;

const getSecret = () => {
  const configured = process.env.ADMIN_TOKEN_SECRET || '';
  if (configured) {
    return configured;
  }
  if (!generatedSecret) {
    // Works without configuration; admins just sign in again after every server restart.
    generatedSecret = crypto.randomBytes(48).toString('hex');
    console.warn('ADMIN_TOKEN_SECRET is not set: admin sessions end when the server restarts. Set it in server/.env (see .env.example).');
  }
  return generatedSecret;
};

const sign = (text) => crypto.createHmac('sha256', getSecret()).update(text).digest('base64url');

// Changes when the password changes (the stored bcrypt hash gets a new salt), without revealing the hash.
export const passwordStamp = (storedPassword) => sign(`password:${storedPassword || ''}`).slice(0, 16);

// { token, expiresAt } for a signed-in user (a lean or full User document).
export const createAdminSession = (user, now = Date.now()) => {
  const expiresAt = new Date(now + SESSION_HOURS * 60 * 60 * 1000);
  const payload = {
    sub: String(user._id),
    email: user.email,
    exp: Math.floor(expiresAt.getTime() / 1000),
    pv: passwordStamp(user.password)
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${body}.${sign(body)}`, expiresAt: expiresAt.toISOString() };
};

// The payload of a valid, unexpired token, or null.
export const readAdminToken = (token, now = Date.now()) => {
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload?.sub || !Number.isFinite(payload.exp) || payload.exp * 1000 <= now) return null;
  return payload;
};

const SESSION_ENDED = {
  success: false,
  code: 'SESSION_ENDED',
  message: 'Your session has ended. Please sign in again.'
};

// Express middleware for admin-only routes. Sets req.admin = { id, email, name }.
export const requireAdmin = async (req, res, next) => {
  const header = req.get('authorization') || '';
  const payload = readAdminToken(header.startsWith('Bearer ') ? header.slice(7).trim() : '');
  if (!payload) {
    return res.status(401).json(SESSION_ENDED);
  }

  try {
    const user = await User.findById(payload.sub).select('email name role password').lean();
    if (!user || user.role !== 'admin' || passwordStamp(user.password) !== payload.pv) {
      return res.status(401).json(SESSION_ENDED);
    }
    req.admin = { id: String(user._id), email: user.email, name: user.name };
    return next();
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(401).json(SESSION_ENDED);
    }
    console.error('Error checking admin session:', error.message);
    return res.status(500).json({ success: false, message: 'Could not check your session. Please try again.' });
  }
};
