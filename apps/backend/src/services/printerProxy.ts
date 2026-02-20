/**
 * Printer proxy connection manager.
 * Proxies connect via WebSocket and register with restaurantId.
 * Backend pushes ESC/POS bytes to the proxy for network printing.
 */

import { WebSocket } from 'ws';

export interface ProxyConnection {
  ws: WebSocket;
  restaurantId: string;
  connectedAt: Date;
}

const connections = new Map<string, ProxyConnection>();

export function registerProxy(restaurantId: string, ws: WebSocket): void {
  const existing = connections.get(restaurantId);
  if (existing) {
    try {
      existing.ws.close();
    } catch {}
  }
  connections.set(restaurantId, { ws, restaurantId, connectedAt: new Date() });
}

export function unregisterProxy(restaurantId: string): void {
  connections.delete(restaurantId);
}

export function unregisterByWebSocket(ws: WebSocket): void {
  for (const [rid, conn] of connections.entries()) {
    if (conn.ws === ws) {
      connections.delete(rid);
      return;
    }
  }
}

export function isProxyConnected(restaurantId: string): boolean {
  const conn = connections.get(restaurantId);
  if (!conn) return false;
  return conn.ws.readyState === WebSocket.OPEN;
}

export function sendPrintJob(restaurantId: string, bytes: Uint8Array): boolean {
  const conn = connections.get(restaurantId);
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) return false;
  try {
    conn.ws.send(Buffer.from(bytes));
    return true;
  } catch {
    return false;
  }
}
