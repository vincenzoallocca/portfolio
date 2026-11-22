// Test end-to-end del pulsante BUMP nel browser (Chrome headless + puppeteer-core).
//   node test/e2e.mjs [http://localhost:4173]
// Richiede: sito statico su :4173 e `wrangler dev` su :8799 con ALLOWED_ORIGINS=http://localhost:4173.
// Ogni scenario usa un contesto incognito = un dispositivo nuovo.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.env.PUPPETEER_FROM + '/noop.js');
const puppeteer = require('puppeteer-core');
const SITE = process.argv[2] || 'http://localhost:4173';
const API = SITE.includes('localhost') ? 'http://localhost:8799/v1/bump' : 'https://bump.vincenzoallocca.dev/v1/bump';

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

/** Apre la home in un contesto pulito. share: 'none' | 'ok' | 'cancel' */
async function open({ share = 'none', mobile = false, failPost = 0 } = {}) {
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(SITE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await ctx.newPage();
  if (mobile) await page.emulate(puppeteer.KnownDevices['iPhone 13']);
  else await page.setViewport({ width: 1280, height: 900 });
  const calls = { post: 0, get: 0 };
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith(API) && req.method() === 'POST') calls.post++;
    if (u.startsWith(API) && req.method() === 'GET') calls.get++;
    // GoatCounter sostituito da uno stub che registra ogni chiamata
    if (/gc\.zgo\.at\/count\.js/.test(u)) {
      return req.respond({ status: 200, contentType: 'application/javascript', body: 'window.goatcounter={count:function(v){(window.__gc=window.__gc||[]).push(v)}};' });
    }
    if (failPost && u.startsWith(API) && req.method() === 'POST') {
      return req.respond({ status: failPost, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': SITE, 'Access-Control-Allow-Credentials': 'true' }, body: JSON.stringify({ status: 'error' }) });
    }
    req.continue();
  });
  await page.evaluateOnNewDocument((mode) => {
    window.__shares = [];
    if (mode === 'none') Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    else
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data) => {
          window.__shares.push(data);
          return mode === 'ok' ? Promise.resolve() : Promise.reject(new DOMException('Share canceled', 'AbortError'));
        },
      });
  }, share);
  await page.goto(SITE + '/', { waitUntil: 'load' });
  // attende che il totale reale arrivi dal backend
  await page.waitForFunction(() => /bump ricevut/.test(document.querySelector('#bump .bump-count').textContent), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1200)); // il pulsante non si preme entro un secondo
  return { ctx, page, calls };
}
const ui = (page) =>
  page.evaluate(() => ({
    state: document.getElementById('bump').getAttribute('data-state'),
    label: document.querySelector('#bump .bump-label').textContent,
    count: document.querySelector('#bump .bump-count').textContent,
    status: document.getElementById('status').innerText,
    panelOpen: !document.getElementById('share-panel').hidden,
    shares: window.__shares,
    gc: window.__gc || [],
  }));
const totalOf = (txt) => Number((txt.match(/([\d.]+) bump ricevut/) || [])[1]?.replace(/\./g, ''));
const clickAndSettle = async (page) => {
  await page.click('#bump');
  await page.waitForFunction(() => !document.getElementById('bump').hasAttribute('aria-busy') && document.getElementById('status').innerText.length > 0, { timeout: 8000 });
};

// 10a. Desktop senza Web Share: bump, copia del link, pannello aperto
{
  const { ctx, page, calls } = await open({ share: 'none' });
  const before = totalOf((await ui(page)).count);
  await clickAndSettle(page);
  const s = await ui(page);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  console.log('10a desktop:', JSON.stringify({ label: s.label, count: s.count, status: s.status, panelOpen: s.panelOpen, clip }));
  assert.equal(s.state, 'bumped');
  assert.equal(s.label, 'HAI GIÀ BUMPATO');
  assert.equal(totalOf(s.count), before + 1);
  assert.match(s.status, /Grazie per il bump! 🚀/);
  assert.match(s.status, /Condividi il portfolio e aiutami a raggiungere nuove persone\./);
  assert.match(s.status, /Link copiato negli appunti ✓/);
  assert.equal(clip, 'https://vincenzoallocca.dev/');
  assert.equal(s.panelOpen, true);
  assert.equal(calls.post, 1);
  // 2. secondo clic sullo stesso dispositivo: nessun nuovo POST, nessun incremento
  await page.click('#bump');
  await new Promise((r) => setTimeout(r, 800));
  const s2 = await ui(page);
  assert.match(s2.status, /Hai già bumpato! ❤️/);
  assert.equal(calls.post, 1);
  assert.equal(totalOf(s2.count), before + 1);
  // dopo un ricaricamento il server riconosce il dispositivo
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('bump').getAttribute('data-state') === 'bumped', { timeout: 8000 });
  // nessuna chiamata a GoatCounter generata dal bump (né pageview né eventi)
  assert.deepEqual(s2.gc, []);
  console.log('    GoatCounter durante il bump:', JSON.stringify(s2.gc), '(atteso [])');
  await ctx.close();
}

// 10b. Smartphone con Web Share: condivisione nativa con URL canonico
{
  const { ctx, page, calls } = await open({ share: 'ok', mobile: true });
  const before = totalOf((await ui(page)).count);
  await clickAndSettle(page);
  const s = await ui(page);
  console.log('10b mobile:', JSON.stringify({ shares: s.shares, count: s.count, status: s.status }));
  assert.equal(s.shares.length, 1);
  assert.equal(s.shares[0].url, 'https://vincenzoallocca.dev/');
  assert.equal(s.panelOpen, false);
  assert.equal(totalOf(s.count), before + 1);
  assert.equal(calls.post, 1);
  await ctx.close();
}

// 9. Condivisione annullata: il bump resta valido, nessun secondo bump
{
  const { ctx, page, calls } = await open({ share: 'cancel', mobile: true });
  const before = totalOf((await ui(page)).count);
  await clickAndSettle(page);
  const s = await ui(page);
  console.log('9 annullata:', JSON.stringify({ shares: s.shares.length, state: s.state, count: s.count }));
  assert.equal(s.state, 'bumped');
  assert.equal(totalOf(s.count), before + 1);
  assert.equal(calls.post, 1);
  await ctx.close();
}

// 8. Errore del backend: messaggio, stato invariato, totale invariato
{
  const { ctx, page } = await open({ share: 'none', failPost: 500 });
  const before = (await ui(page)).count;
  await clickAndSettle(page);
  const s = await ui(page);
  console.log('8 errore backend:', JSON.stringify({ state: s.state, count: s.count, status: s.status }));
  assert.equal(s.state, 'idle');
  assert.equal(s.count, before);
  assert.match(s.status, /Bump non registrato/);
  await ctx.close();
}

// Accessibilità e reduced motion
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(SITE + '/', { waitUntil: 'load' });
  const a = await page.evaluate(() => {
    const b = document.getElementById('bump');
    b.classList.add('pop');
    return { anim: getComputedStyle(b).animationName, tag: b.tagName, type: b.type, desc: b.getAttribute('aria-describedby'), live: document.getElementById('status').getAttribute('aria-live'), h: b.getBoundingClientRect().height };
  });
  console.log('a11y:', JSON.stringify(a));
  assert.equal(a.anim, 'none');
  assert.equal(a.tag, 'BUTTON');
  assert.equal(a.live, 'polite');
  assert.ok(a.h >= 44);
  await ctx.close();
}

await browser.close();
console.log('e2e OK');
