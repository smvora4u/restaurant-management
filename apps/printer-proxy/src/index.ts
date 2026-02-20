#!/usr/bin/env node
/**
 * Printer Proxy - bridges the backend WebSocket to a network thermal printer.
 * Run on a PC on the same LAN as the printer. Connects to backend via WebSocket,
 * receives ESC/POS bytes, and forwards to the printer.
 *
 * Config via env:
 *   BACKEND_WS_URL - e.g. ws://localhost:4000/printer-proxy
 *   TOKEN - JWT (staff or restaurant token)
 *   RESTAURANT_ID - restaurant ID
 *   PRINTER_HOST - printer IP (e.g. 192.168.1.100)
 *   PRINTER_PORT - printer port (default 9100)
 */

import 'dotenv/config';
import WebSocket from 'ws';
import NetworkReceiptPrinter from '@point-of-sale/network-receipt-printer';

const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:4000/printer-proxy';
const TOKEN = process.env.TOKEN;
const RESTAURANT_ID = process.env.RESTAURANT_ID;
const PRINTER_HOST = process.env.PRINTER_HOST;
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);

if (!TOKEN || !RESTAURANT_ID || !PRINTER_HOST) {
  console.error('Missing required env: TOKEN, RESTAURANT_ID, PRINTER_HOST');
  process.exit(1);
}

const sep = BACKEND_WS_URL.includes('?') ? '&' : '?';
const wsUrl = `${BACKEND_WS_URL}${sep}token=${encodeURIComponent(TOKEN)}&restaurantId=${encodeURIComponent(RESTAURANT_ID)}`;

let printer: InstanceType<typeof NetworkReceiptPrinter> | null = null;
let ws: WebSocket | null = null;

function connectPrinter(): Promise<void> {
  return new Promise((resolve, reject) => {
    printer = new NetworkReceiptPrinter({
      host: PRINTER_HOST as string,
      port: PRINTER_PORT
    });
    printer.addEventListener('connected', () => {
      console.log(`Connected to printer at ${PRINTER_HOST}:${PRINTER_PORT}`);
      resolve();
    });
    printer.connect().catch(reject);
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
      if (printer) {
        printer.print(new Uint8Array(buf)).catch((err: unknown) => {
          console.error('Print failed:', err);
        });
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
    await connectPrinter();
    await connectBackend();
  } catch (err) {
    console.error('Startup failed:', err);
    setTimeout(main, 5000);
  }
}

main();
