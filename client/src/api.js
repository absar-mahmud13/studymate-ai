import { authHeaders, demo } from './auth.jsx';
const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export async function api(path, { method = 'GET', body } = {}) {
    const headers = await authHeaders();
    if (body !== undefined && !(body instanceof FormData))
        headers['Content-Type'] = 'application/json';
    let res;
    try {
        res = await fetch(base + '/api' + path, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
    }
    catch {
        throw new Error('Cannot reach backend. Check server and API URL.');
    }
    const result = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(result.message || `Request failed (${res.status})`);
    return result;
}
export async function checkMode() { const res = await fetch(base + '/api/health'); if (!res.ok)
    throw new Error('Backend is not available.'); const data = await res.json(); if (data.demo !== demo)
    throw new Error('Client and server demo modes do not match.'); return data; }
