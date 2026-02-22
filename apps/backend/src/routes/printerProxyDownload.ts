/**
 * GET /api/download-printer-proxy
 * Returns a zip with the printer proxy bundle and pre-filled config.
 * Requires Authorization: Bearer <restaurant token only - staff tokens are rejected>
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const README_CONTENT = `Printer Proxy - Quick Start
========================

1. Edit .env and set PRINTER_HOST to your printer's IP (e.g. 192.168.1.100)
2. Windows: Double-click start.bat
   Mac/Linux: Run ./start.sh (chmod +x start.sh first)

On first run, dependencies will be installed automatically (requires internet).
Requires Node.js (https://nodejs.org) to be installed.

The token in .env lasts about 90 days. If the proxy stops connecting after that, download a fresh zip from Restaurant Settings.
`;

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    if (decoded.staffId) {
      res.status(403).json({ error: 'Restaurant owner access required. Staff cannot download the printer proxy.' });
      return;
    }
    const restaurantId = decoded.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const expiry = (process.env.PRINTER_PROXY_TOKEN_EXPIRY || '90d') as string;
    const printerProxyToken = jwt.sign(
      { restaurantId: String(restaurantId), purpose: 'printer-proxy' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: expiry } as jwt.SignOptions
    );

    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || process.env.FRONTEND_URL?.replace(/:\d+$/, ':4000') || 'http://localhost:4000';
    const wsProtocol = backendPublicUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = backendPublicUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const backendWsUrl = `${wsProtocol}://${wsHost}/printer-proxy`;

    const bundlePath = path.join(__dirname, '../../..', 'printer-proxy', 'dist', 'bundle.js');
    if (!fs.existsSync(bundlePath)) {
      res.status(500).json({ error: 'Printer proxy bundle not found. Run: npm run bundle -w @restaurant/printer-proxy' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="printer-proxy.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const envContent = `# Printer Proxy Configuration
# Edit PRINTER_HOST to match your printer's IP address

BACKEND_WS_URL=${backendWsUrl}
TOKEN=${printerProxyToken}
RESTAURANT_ID=${restaurantId}
PRINTER_HOST=192.168.1.100
PRINTER_PORT=9100
`;

    const packageJson = JSON.stringify({
      name: 'printer-proxy',
      private: true,
      dependencies: {
        'ws': '^8.18.3'
      }
    }, null, 2);

    const startBat = `@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)
node bundle.js
pause
`;

    const startSh = `#!/bin/sh
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
node bundle.js
`;

    archive.append(envContent, { name: '.env' });
    archive.append(packageJson, { name: 'package.json' });
    archive.append(startBat, { name: 'start.bat' });
    archive.append(startSh, { name: 'start.sh' });
    archive.append(README_CONTENT, { name: 'README.txt' });
    archive.file(bundlePath, { name: 'bundle.js' });

    await archive.finalize();
  } catch (err) {
    console.error('Printer proxy download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create download' });
    }
  }
});

export default router;
