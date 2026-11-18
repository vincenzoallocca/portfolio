#!/usr/bin/env node
// Rigenera le immagini Open Graph (1200×630, JPEG) dai modelli HTML in questa cartella.
// assets/og-image.jpg (home) non è generata qui: è l'immagine originale, da non sovrascrivere.
//
//   npm i --no-save --prefix .og-tmp puppeteer-core@24
//   NODE_PATH=.og-tmp/node_modules node scripts/og/render.mjs
//
// Usa il Chrome installato (variabile CHROME_PATH per un percorso diverso).
// .og-tmp/ è ignorata da git.

import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'noop.js'));
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error('puppeteer-core non trovato: vedi le istruzioni in testa al file.');
  process.exit(1);
}

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..', '..');
const JOBS = [
  { template: 'haste.html', out: 'assets/og-haste.jpg' },
];
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const job of JOBS) {
    await page.goto(pathToFileURL(join(HERE, job.template)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = join(ROOT, job.out);
    await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
    console.log(`${job.out}  ${(statSync(out).size / 1024).toFixed(1)} KB`);
  }
} finally {
  await browser.close();
}
