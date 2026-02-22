#!/usr/bin/env node
/**
 * Printer Proxy - bridges the backend WebSocket to a network thermal printer.
 * Run on a PC on the same LAN as the printer. Connects to backend via WebSocket,
 * receives ESC/POS bytes, and forwards to the printer via raw TCP socket.
 *
 * Config via env:
 *   BACKEND_WS_URL - e.g. ws://localhost:4000/printer-proxy
 *   TOKEN - JWT (staff or restaurant token)
 *   RESTAURANT_ID - restaurant ID
 *   PRINTER_HOST - printer IP (e.g. 192.168.1.100)
 *   PRINTER_PORT - printer port (default 9100)
 */

import dotenv from 'dotenv';
import path from 'path';
import net from 'net';

dotenv.config({ path: path.join(process.cwd(), '.env') });

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

console.log('Printer proxy starting...');

import WebSocket from 'ws';

const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:4000/printer-proxy';
const TOKEN = process.env.TOKEN;
const RESTAURANT_ID = process.env.RESTAURANT_ID;
const PRINTER_HOST = process.env.PRINTER_HOST;
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);

if (!TOKEN || !RESTAURANT_ID || !PRINTER_HOST) {
  console.error('Missing required env: TOKEN, RESTAURANT_ID, PRINTER_HOST');
  console.error('Make sure .env exists in this folder and has TOKEN, RESTAURANT_ID, PRINTER_HOST');
  process.exit(1);
}

console.log('Env loaded. Connecting to printer at', PRINTER_HOST + ':' + PRINTER_PORT, '...');

const sep = BACKEND_WS_URL.includes('?') ? '&' : '?';
const wsUrl = `${BACKEND_WS_URL}${sep}token=${encodeURIComponent(TOKEN)}&restaurantId=${encodeURIComponent(RESTAURANT_ID)}`;

let printerSocket: net.Socket | null = null;
let ws: WebSocket | null = null;

function connectPrinter(): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setNoDelay(true);
    socket.connect(PRINTER_PORT, PRINTER_HOST as string, () => {
      console.log(`Connected to printer at ${PRINTER_HOST}:${PRINTER_PORT}`);
      printerSocket = socket;
      resolve();
    });
    socket.on('error', (err) => {
      console.error('Printer socket error:', err);
      printerSocket = null;
      reject(err);
    });
    socket.on('close', () => {
      printerSocket = null;
      console.log('Printer disconnected');
    });
  });
}

function connectBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(wsUrl);
    ws.on('open', () => {
      console.log('Connected to backend');
      resolve();
    });
    ws.on('message', (data: Buffer | Buffer[]) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]);
      console.log('Received print job, size:', buf.length);
      if (printerSocket && !printerSocket.destroyed) {
        printerSocket.write(buf, (err) => {
          if (err) {
            console.error('Print failed:', err);
          } else {
            console.log('Sent to printer');
          }
        });
      } else {
        console.error('Printer not connected');
      }
    });
    ws.on('close', (code?: number, reason?: Buffer) => {
      console.log('Backend disconnected:', code, reason?.toString());
      reconnect();
    });
    ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
      reject(err);
    });
  });
}

async function reconnect() {
  ws = null;
  console.log('Reconnecting in 5s...');
  setTimeout(main, 5000);
}

async function main() {
  try {
    console.log('Connecting to printer...');
    await connectPrinter();
    console.log('Connecting to backend...');
    await connectBackend();
  } catch (err) {
    console.error('Startup failed:', err);
    setTimeout(main, 5000);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
