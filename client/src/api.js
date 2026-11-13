import { getToken, clearSession } from './session';

export async function api(path, method = 'GET', body) {
  const token = getToken();
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') { clearSession(); location.href = '/login?expired=1'; }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
