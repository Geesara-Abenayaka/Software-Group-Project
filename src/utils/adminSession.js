// The signed-in admin's session, saved by the login page in localStorage 'user':
// { id, email, name, role, token, expiresAt }. Admin API requests send the token; the server checks it.

const STORAGE_KEY = 'user';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

// The session, or null when there is none, it has expired, or it was saved before sessions had a token.
export const getAdminSession = () => {
  const session = read();
  if (!session?.token) return null;
  if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) return null;
  return session;
};

// After logging in (with the user: replaces any old session), or after a password change (only a new token).
export const saveAdminSession = ({ user, token, expiresAt }) => {
  const base = user ? user : read() || {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, token, expiresAt }));
};

export const clearAdminSession = () => localStorage.removeItem(STORAGE_KEY);

let ending = false;

// The server said the session is no longer valid (expired, password changed, or signed out elsewhere):
// forget it and go to the login page, which explains why.
export const endAdminSession = () => {
  if (ending) return;
  ending = true;
  clearAdminSession();
  window.location.assign('/login?session=ended');
};

export const authHeaders = () => {
  const session = getAdminSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
};

// fetch() for admin API routes: adds the session and handles "session ended".
export const adminFetch = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  Object.entries(authHeaders()).forEach(([name, value]) => headers.set(name, value));
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    endAdminSession();
  }
  return response;
};
