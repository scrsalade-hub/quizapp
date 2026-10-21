// Small fetch wrapper with auth + 401 handling.
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
  const res = await fetch(path, {
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
