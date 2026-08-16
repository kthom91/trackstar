#!/usr/bin/env node
/**
 * Builds the browser extension content scripts and service worker using esbuild.
 *
 * - src/content_scripts/letterboxd.js  → content_scripts/letterboxd.js  (bundled, fflate inlined)
 * - src/content_scripts/storygraph.js  → content_scripts/storygraph.js  (bundled, no external deps)
 * - src/background/service_worker.js   → background/service_worker.js   (bundled)
 *
 * CSS files are copied as-is (they don't need bundling).
 */

import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outContentScripts = join(root, 'content_scripts');
const outBackground = join(root, 'background');

mkdirSync(outContentScripts, { recursive: true });
mkdirSync(outBackground, { recursive: true });

const sharedOptions = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome112'],
  logLevel: 'info',
};

await Promise.all([
  // letterboxd content script — bundles fflate
  esbuild.build({
    ...sharedOptions,
    entryPoints: [join(root, 'src/content_scripts/letterboxd.js')],
    outfile: join(outContentScripts, 'letterboxd.js'),
  }),

  // storygraph content script
  esbuild.build({
    ...sharedOptions,
    entryPoints: [join(root, 'src/content_scripts/storygraph.js')],
    outfile: join(outContentScripts, 'storygraph.js'),
  }),

  // background service worker
  esbuild.build({
    ...sharedOptions,
    entryPoints: [join(root, 'src/background/service_worker.js')],
    outfile: join(outBackground, 'service_worker.js'),
  }),
]);

// Copy CSS files as-is (no bundling needed)
copyFileSync(
  join(root, 'src/content_scripts/letterboxd.css'),
  join(outContentScripts, 'letterboxd.css')
);
copyFileSync(
  join(root, 'src/content_scripts/storygraph.css'),
  join(outContentScripts, 'storygraph.css')
);

console.log('✓ Content scripts built successfully.');
