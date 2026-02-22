#!/usr/bin/env node
/**
 * Bundles the printer proxy into a single dist/bundle.js file.
 * Run: npm run bundle
 */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(__dirname, 'dist/bundle.js'),
  format: 'cjs',
  external: ['ws'],
}).then(() => console.log('Bundled to dist/bundle.js')).catch(() => process.exit(1));
