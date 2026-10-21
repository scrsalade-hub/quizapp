// Admin fetch wrapper (token stored under "quizAdmin").
export function getStoredAdmin() {
  try {
    const raw = localStorage.getItem('quizAdmin');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAdmin(data) {
  localStorage.setItem('quizAdmin', JSON.stringify(data));
}

export function clearAdmin() {
  localStorage.removeItem('quizAdmin');
}

export async function api(path, { method = 'GET', body } = {}) {
  const stored = getStoredAdmin();
  const headers = { 'Content-Type': 'application/json' };
  if (stored?.token) headers.Authorization = `Bearer ${stored.token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && stored?.token) {
    clearAdmin();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = data.errors; // validation error arrays from topic save
    throw err;
  }
  return data;
}
