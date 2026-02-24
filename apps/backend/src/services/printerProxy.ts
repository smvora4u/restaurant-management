/**
 * Printer proxy connection manager.
 * Proxies connect via WebSocket and register with restaurantId.
 * Backend pushes ESC/POS bytes to the proxy for network printing.
 * Includes heartbeat (ping/pong) to keep connections alive and detect stale connections.
 */

import { WebSocket } from 'ws';

const PING_INTERVAL_MS = 30000;

export interface ProxyConnection {
  ws: WebSocket;
  restaurantId: string;
  connectedAt: Date;
  isAlive: boolean;
}

const connections = new Map<string, ProxyConnection>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(): void {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    for (const conn of connections.values()) {
      if (!conn.isAlive) {
        try {
          conn.ws.terminate();
        } catch {}
        continue;
      }
      conn.isAlive = false;
      try {
        conn.ws.ping();
      } catch {}
    }
  }, PING_INTERVAL_MS);
}

export function registerProxy(restaurantId: string, ws: WebSocket): void {
  const existing = connections.get(restaurantId);
  if (existing) {
    try {
      existing.ws.close();
    } catch {}
  }
  const conn: ProxyConnection = { ws, restaurantId, connectedAt: new Date(), isAlive: true };
  connections.set(restaurantId, conn);

  ws.on('pong', () => {
    conn.isAlive = true;
  });

  startHeartbeat();
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
