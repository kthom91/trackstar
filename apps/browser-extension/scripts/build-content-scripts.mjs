#!/usr/bin/env node
/**
 * Dynamic Content Script & Background Worker Bundler
 * Reads provider content scripts and stylesheets directly from @trackstar/integrations
 * and compiles production-ready bundles for the browser extension.
 */

import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const monorepoRoot = resolve(root, '../..');
const providersDir = join(monorepoRoot, 'packages/integrations/src/lib/providers');

// Target output directories (both local source build and dist for extension load)
const outContentScripts = join(root, 'content_scripts');
const outBackground = join(root, 'background');
const distContentScripts = join(monorepoRoot, 'dist/browser-extension/content_scripts');
const distBackground = join(monorepoRoot, 'dist/browser-extension/background');

for (const dir of [outContentScripts, outBackground, distContentScripts, distBackground]) {
  mkdirSync(dir, { recursive: true });
}

const sharedOptions = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome112'],
  logLevel: 'info',
};

// Provider content scripts mapping from @trackstar/integrations
const providerScripts = [
  {
    name: 'letterboxd',
    scriptSrc: join(providersDir, 'letterboxd.content-script.js'),
    cssSrc: join(providersDir, 'letterboxd.content-script.css'),
    scriptOut: 'letterboxd.js',
    cssOut: 'letterboxd.css'
  },
  {
    name: 'storygraph',
    scriptSrc: join(providersDir, 'storygraph.content-script.js'),
    cssSrc: join(providersDir, 'storygraph.content-script.css'),
    scriptOut: 'storygraph.js',
    cssOut: 'storygraph.css'
  }
];

const buildPromises = [];

for (const p of providerScripts) {
  if (existsSync(p.scriptSrc)) {
    buildPromises.push(
      esbuild.build({
        ...sharedOptions,
        entryPoints: [p.scriptSrc],
        outfile: join(outContentScripts, p.scriptOut),
      }).then(() => {
        if (existsSync(distContentScripts)) {
          copyFileSync(join(outContentScripts, p.scriptOut), join(distContentScripts, p.scriptOut));
        }
      })
    );
  }

  if (existsSync(p.cssSrc)) {
    copyFileSync(p.cssSrc, join(outContentScripts, p.cssOut));
    if (existsSync(distContentScripts)) {
      copyFileSync(p.cssSrc, join(distContentScripts, p.cssOut));
    }
  }
}

// Build background service worker
buildPromises.push(
  esbuild.build({
    ...sharedOptions,
    entryPoints: [join(root, 'src/background/service_worker.js')],
    outfile: join(outBackground, 'service_worker.js'),
  }).then(() => {
    if (existsSync(distBackground)) {
      copyFileSync(join(outBackground, 'service_worker.js'), join(distBackground, 'service_worker.js'));
    }
  })
);

await Promise.all(buildPromises);

console.log('✓ Provider content scripts & service worker compiled successfully from @trackstar/integrations.');
