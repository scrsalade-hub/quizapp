// Small fetch wrapper with auth + 401 handling.
// API base: set VITE_API_URL at build time (e.g. https://your-backend.onrender.com).
// Empty = same origin (local dev uses the vite proxy).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('quizUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(data) {
  localStorage.setItem('quizUser', JSON.stringify(data));
}

export function clearUser() {
  localStorage.removeItem('quizUser');
}

export async function api(path, { method = 'GET', body } = {}) {
  const stored = getStoredUser();
  const headers = { 'Content-Type': 'application/json' };
  if (stored?.token) headers.Authorization = `Bearer ${stored.token}`;
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && stored?.token) {
    clearUser();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
