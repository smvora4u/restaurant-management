/**
 * Server-side print queue: POST /api/print (ESC/POS jobs picked up by local print agent).
 */

export function getApiBaseUrl(): string {
  const u = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/graphql';
  return String(u).replace(/\/graphql\/?$/, '') || 'http://localhost:4000';
}

function authHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('staffToken') ||
    localStorage.getItem('restaurantToken') ||
    localStorage.getItem('adminToken');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function queueOrderPrint(
  orderId: string,
  kind: 'bill' | 'kot'
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/print`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orderId, kind })
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    return { ok: false, message: data.error || `Print failed (${res.status})` };
  }
  return { ok: true, message: data.message || 'Printing…' };
}

export async function queueTestPrint(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/print/test`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    return { ok: false, message: data.error || `Test print failed (${res.status})` };
  }
  return { ok: true, message: data.message || 'Test print queued.' };
}
