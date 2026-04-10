#!/usr/bin/env node
/**
 * Local print agent: polls GET /api/print-jobs, prints raw ESC/POS via TCP to LAN printer.
 * Config: config.json in cwd, or env PRINT_AGENT_BASE_URL, PRINT_AGENT_TOKEN, PRINTER_HOST, PRINTER_PORT, POLL_INTERVAL_MS.
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import dotenv from 'dotenv';

/** Directory of this script (dev ESM, bundled CJS, or pkg — no import.meta so esbuild/pkg stay happy). */
function getSourceDir() {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  const main = process.argv[1];
  if (main) {
    return path.dirname(path.resolve(main));
  }
  return process.cwd();
}

const sourceDir = getSourceDir();

/**
 * Config lives next to the exe (pkg), or cwd when running from a shortcut with "Start in",
 * or the source folder when developing with `node agent.js`.
 */
function resolveConfigDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'config.json'))) {
    return cwd;
  }
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return sourceDir;
}

const configDir = resolveConfigDir();
dotenv.config({ path: path.join(configDir, '.env') });

function loadConfig() {
  const configPath = path.join(configDir, 'config.json');
  let file = {};
  if (fs.existsSync(configPath)) {
    try {
      file = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Invalid config.json:', e.message);
      process.exit(1);
    }
  }
  return {
    baseUrl: (process.env.PRINT_AGENT_BASE_URL || file.baseUrl || 'http://localhost:4000').replace(/\/$/, ''),
    printAgentToken: process.env.PRINT_AGENT_TOKEN || file.printAgentToken || '',
    printerHost: process.env.PRINTER_HOST || file.printerHost || '',
    printerPort: parseInt(process.env.PRINTER_PORT || String(file.printerPort || 9100), 10),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || String(file.pollIntervalMs || 2500), 10)
  };
}

const cfg = loadConfig();

if (!cfg.printAgentToken || !cfg.printerHost) {
  console.error('Missing PRINT_AGENT_TOKEN / printAgentToken or PRINTER_HOST / printerHost.');
  console.error('Copy config.json.example to config.json and fill values, or set env vars.');
  process.exit(1);
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendToPrinter(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: cfg.printerHost, port: cfg.printerPort, noDelay: true },
      () => {
        socket.write(buffer, (err) => {
          if (err) {
            socket.destroy();
            reject(err);
            return;
          }
          socket.end();
        });
      }
    );
    socket.on('error', reject);
    socket.on('close', (hadErr) => {
      if (hadErr) return;
      resolve();
    });
  });
}

async function printWithRetries(base64) {
  const buf = Buffer.from(base64, 'base64');
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendToPrinter(buf);
      return true;
    } catch (e) {
      lastErr = e;
      console.warn(`Print attempt ${attempt}/${MAX_RETRIES} failed:`, e?.message || e);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.printAgentToken}`,
      ...options.headers
    }
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function pollOnce() {
  const url = `${cfg.baseUrl}/api/print-jobs`;
  let data;
  try {
    data = await fetchJson(url);
  } catch (e) {
    console.error('GET /api/print-jobs failed:', e.message);
    return;
  }
  const jobs = data.jobs || [];
  if (jobs.length === 0) return;

  for (const job of jobs) {
    const id = job.id;
    const b64 = job.contentBase64;
    if (!id || !b64) continue;
    try {
      await printWithRetries(b64);
      await fetchJson(`${cfg.baseUrl}/api/print-done`, {
        method: 'POST',
        body: JSON.stringify({ jobId: id })
      });
      console.log(new Date().toISOString(), 'Printed job', id, job.kind || '');
    } catch (e) {
      console.error('Job', id, 'failed after retries:', e?.message || e);
      try {
        await fetchJson(`${cfg.baseUrl}/api/print-failed`, {
          method: 'POST',
          body: JSON.stringify({ jobId: id, error: String(e?.message || e) })
        });
      } catch (e2) {
        console.error('Could not report failure:', e2.message);
      }
    }
  }
}

console.log('Print agent started');
console.log('  Config dir:', configDir);
console.log('  API:', cfg.baseUrl);
console.log('  Printer:', cfg.printerHost + ':' + cfg.printerPort);
console.log('  Poll every', cfg.pollIntervalMs, 'ms');

setInterval(() => {
  pollOnce().catch((e) => console.error('Poll error:', e));
}, cfg.pollIntervalMs);

pollOnce().catch((e) => console.error('Initial poll:', e));
