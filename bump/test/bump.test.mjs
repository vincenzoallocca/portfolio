// Test del backend BUMP: node --test (Node >= 23.6 esegue direttamente i .ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handle } from '../src/index.ts';
import { COOKIE, LIMITS, signDevice } from '../src/bump.ts';
import { createD1 } from './helpers/d1.mjs';

const ORIGIN = 'https://vincenzoallocca.dev';
const SECRET = 'test-secret-'.padEnd(48, 'x');
const UA = 'Mozilla/5.0 (Test) Chrome/140';
const ctx = { waitUntil: (p) => p };

function env(db = createD1()) {
  return { DB: db, BUMP_SECRET: SECRET, ALLOWED_ORIGINS: ORIGIN };
}

/** Un "dispositivo": tiene il suo cookie come farebbe un browser. */
function device(e, { ip = '203.0.113.10', ua = UA } = {}) {
  let cookie = null;
  let now = Date.UTC(2026, 10, 22, 12, 0, 0);
  const req = (method, body, extraHeaders = {}) => {
    const headers = { Origin: ORIGIN, 'CF-Connecting-IP': ip, 'User-Agent': ua, ...extraHeaders };
    if (cookie) headers.Cookie = `${COOKIE}=${cookie}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return new Request('https://bump.vincenzoallocca.dev/v1/bump', { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
  const keep = (res) => {
    const sc = res.headers.get('Set-Cookie');
    if (sc) cookie = sc.split(';')[0].split('=').slice(1).join('=');
    return res;
  };
  return {
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
    advance(ms) { now += ms; },
    async get() {
      const res = keep(await handle(req('GET'), e, ctx, now));
      return { status: res.status, body: await res.json(), res };
    },
    async post(token, extraHeaders) {
      const res = keep(await handle(req('POST', { token }, extraHeaders), e, ctx, now));
      return { status: res.status, body: await res.json(), res };
    },
    /** GET + attesa realistica + POST, come il pulsante. */
    async bump() {
      const g = await this.get();
      this.advance(1500);
      return this.post(g.body.token);
    },
  };
}
const count = (e) => e.DB.raw.prepare('SELECT COUNT(*) AS n FROM bumps').get().n;

test('1. primo bump valido: registrato, totale +1, cookie sicuro', async () => {
  const e = env();
  const d = device(e);
  const g = await d.get();
  assert.equal(g.status, 200);
  assert.deepEqual([g.body.total, g.body.bumped], [0, false]);
  const sc = g.res.headers.get('Set-Cookie');
  assert.match(sc, /^__Host-bump_did=[\w-]{24}\.[\w-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict/);
  d.advance(1500);
  const p = await d.post(g.body.token);
  assert.equal(p.status, 200);
  assert.deepEqual([p.body.status, p.body.total, p.body.bumped], ['ok', 1, true]);
  assert.equal(p.res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal((await d.get()).body.bumped, true);
});

test('2. secondo bump dallo stesso dispositivo: nessun incremento', async () => {
  const e = env();
  const d = device(e);
  await d.bump();
  const again = await d.bump();
  assert.equal(again.status, 200);
  assert.deepEqual([again.body.status, again.body.total], ['already', 1]);
  assert.equal(count(e), 1);
});

test('3. richieste ripetute (replay dello stesso token) da stesso IP e dispositivo', async () => {
  const e = env();
  const d = device(e);
  const g = await d.get();
  d.advance(1500);
  const results = [];
  for (let i = 0; i < 5; i++) results.push((await d.post(g.body.token)).body.status);
  assert.deepEqual(results, ['ok', 'already', 'already', 'already', 'already']);
  assert.equal(count(e), 1);
});

test('4. cookie manipolato: rifiutato, nessun bump, nuovo cookie valido', async () => {
  const e = env();
  const d = device(e);
  const g = await d.get();
  const [id, sig] = d.cookie.split('.');
  // firma alterata
  d.cookie = `${id}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`;
  d.advance(1500);
  let p = await d.post(g.body.token);
  assert.deepEqual([p.status, p.body.status], [400, 'invalid_device']);
  // id inventato con firma presa da un altro cookie
  d.cookie = `${'A'.repeat(24)}.${sig}`;
  p = await d.post(g.body.token);
  assert.equal(p.body.status, 'invalid_device');
  // valore senza struttura
  d.cookie = 'admin=true';
  p = await d.post(g.body.token);
  assert.equal(p.body.status, 'invalid_device');
  // senza cookie
  d.cookie = null;
  p = await d.post(g.body.token);
  assert.equal(p.body.status, 'invalid_device');
  assert.equal(count(e), 0);
  // il token di un dispositivo non vale per un altro (anche se il cookie è valido)
  const other = device(e, { ip: '198.51.100.7' });
  await other.get();
  other.advance(1500);
  p = await other.post(g.body.token);
  assert.equal(p.body.status, 'invalid_token');
  assert.equal(count(e), 0);
  // un cookie firmato con un altro segreto non vale
  d.cookie = await signDevice('another-secret'.padEnd(48, 'y'), 'B'.repeat(24));
  p = await d.post(g.body.token);
  assert.equal(p.body.status, 'invalid_device');
});

test('5. richieste concorrenti dallo stesso dispositivo: un solo incremento', async () => {
  const e = env();
  const d = device(e);
  const g = await d.get();
  d.advance(1500);
  const all = await Promise.all(Array.from({ length: 10 }, () => d.post(g.body.token)));
  const statuses = all.map((r) => r.body.status).sort();
  assert.equal(statuses.filter((s) => s === 'ok').length, 1);
  assert.equal(statuses.filter((s) => s === 'already').length, 9);
  assert.equal(count(e), 1);
  // vincolo UNIQUE a livello di database, anche aggirando il codice
  const h = e.DB.raw.prepare('SELECT device_hash FROM bumps').get().device_hash;
  assert.throws(() => e.DB.raw.prepare('INSERT INTO bumps (device_hash, created_at) VALUES (?, 0)').run(h), /UNIQUE/);
});

test('6. richieste automatizzate e rate limiting', async () => {
  const e = env();
  const d = device(e);
  // POST a freddo senza GET: nessun token
  let p = await d.post(undefined);
  assert.equal(p.body.status, 'invalid_device');
  const g = await d.get();
  // POST immediato (script): troppo presto
  p = await d.post(g.body.token);
  assert.deepEqual([p.status, p.body.status], [425, 'too_soon']);
  // token scaduto
  d.advance(LIMITS.tokenMaxAgeMs + 1000);
  p = await d.post(g.body.token);
  assert.equal(p.body.status, 'invalid_token');
  // token falsificato
  p = await d.post('1234567890123.' + 'A'.repeat(43));
  assert.equal(p.body.status, 'invalid_token');
  // origine non ammessa e content-type non JSON
  const bad = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }), e, ctx);
  assert.equal(bad.status, 403);
  const form = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '192.0.2.99' }, body: 'token=x' }), e, ctx);
  assert.equal(form.status, 415);
  // GET con parametri non incrementa niente
  await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump?bump=1&total=999', { headers: { Origin: ORIGIN } }), e, ctx);
  assert.equal(count(e), 0);
  // raffica di POST dallo stesso IP: oltre il limite → 429
  const burst = device(e, { ip: '192.0.2.50' });
  const statuses = [];
  for (let i = 0; i < LIMITS.postPerIpPer10Min + 3; i++) statuses.push((await burst.post('x')).status);
  assert.ok(statuses.slice(LIMITS.postPerIpPer10Min).every((s) => s === 429));
  // tetto per IP + User-Agent: cookie cancellati ripetutamente sullo stesso dispositivo
  const ip = '192.0.2.77';
  const outcomes = [];
  for (let i = 0; i < LIMITS.perIpUaPerDay + 2; i++) outcomes.push((await device(e, { ip }).bump()).body.status);
  assert.deepEqual(outcomes, [...Array(LIMITS.perIpUaPerDay).fill('ok'), 'rate_limited', 'rate_limited']);
});

test('7. IP condiviso tra dispositivi diversi: tutti contano, fino al tetto per IP', async () => {
  const e = env();
  const ip = '203.0.113.200'; // es. rete universitaria
  const models = ['iPhone Safari', 'Android Chrome', 'Windows Edge', 'Mac Firefox', 'Linux Chrome'];
  for (const m of models) assert.equal((await device(e, { ip, ua: m }).bump()).body.status, 'ok');
  assert.equal(count(e), 5);
  // stessa rete: il tetto per solo IP è alto e scatta solo oltre LIMITS.perIpPerDay
  for (let i = models.length; i < LIMITS.perIpPerDay; i++) {
    const d = device(e, { ip, ua: 'Device ' + i });
    d.advance(i * 60_000); // POST distribuiti nel tempo, come utenti reali
    assert.equal((await d.bump()).body.status, 'ok', `dispositivo ${i}`);
  }
  const over = device(e, { ip, ua: 'Device extra' });
  over.advance(3_600_000);
  assert.equal((await over.bump()).body.status, 'rate_limited');
  assert.equal(count(e), LIMITS.perIpPerDay);
});

test('8. errore del backend: 500 senza incrementi parziali', async () => {
  const e = env();
  const d = device(e);
  const g = await d.get();
  d.advance(1500);
  const broken = { ...e, DB: { prepare: (sql) => (/INSERT INTO bumps/.test(sql) ? { bind: () => ({ run: async () => { throw new Error('D1 down'); }, first: async () => null }) } : e.DB.prepare(sql)) } };
  const orig = console.error;
  const logs = [];
  console.error = (...a) => logs.push(a.join(' '));
  const res = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10', 'User-Agent': UA, Cookie: `${COOKIE}=${d.cookie}` }, body: JSON.stringify({ token: g.body.token }) }), broken, ctx, Date.UTC(2026, 10, 22, 12, 0, 2));
  console.error = orig;
  assert.equal(res.status, 500);
  assert.equal((await res.json()).status, 'error');
  assert.equal(count(e), 0);
  assert.ok(logs.every((l) => !l.includes('203.0.113.10') && !l.includes(d.cookie)), 'nessun dato personale nei log');
  // senza segreto configurato: errore, nessun cookie emesso
  const noSecret = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { headers: { Origin: ORIGIN } }), { ...e, BUMP_SECRET: '' }, ctx);
  assert.equal(noSecret.status, 500);
  // il dispositivo può riprovare dopo il guasto
  assert.equal((await d.post(g.body.token)).body.status, 'ok');
});

test('11. persistenza del totale dopo un riavvio', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bump-'));
  const file = join(dir, 'bumps.sqlite');
  try {
    let e = env(createD1(file));
    const d1 = device(e);
    const d2 = device(e, { ip: '198.51.100.20' });
    await d1.bump();
    await d2.bump();
    e.DB.close();
    // "riavvio": nuovo processo logico, stesso database
    e = env(createD1(file));
    const fresh = device(e, { ip: '198.51.100.30' });
    assert.equal((await fresh.get()).body.total, 2);
    // il vecchio dispositivo resta riconosciuto
    d1.advance(1500);
    const again = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { headers: { Origin: ORIGIN, Cookie: `${COOKIE}=${d1.cookie}` } }), e, ctx);
    assert.equal((await again.json()).bumped, true);
    e.DB.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('12. integrità del contatore: il totale è solo COUNT(*), nessun dato in chiaro', async () => {
  const e = env();
  for (let i = 0; i < 4; i++) await device(e, { ip: `198.51.100.${i + 1}` }).bump();
  const d = device(e);
  // nessun campo del client può impostare il totale
  const g = await d.get();
  d.advance(1500);
  const res = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10', Cookie: `${COOKIE}=${d.cookie}` }, body: JSON.stringify({ token: g.body.token, total: 999999, count: 1e9 }) }), e, ctx, Date.UTC(2026, 10, 22, 12, 0, 2));
  assert.equal((await res.json()).total, 5);
  // metodi non previsti
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const r = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method, headers: { Origin: ORIGIN } }), e, ctx);
    assert.equal(r.status, 405);
  }
  assert.equal(count(e), 5);
  // nel database solo hash: niente IP, User-Agent o identificativi in chiaro
  const dump = JSON.stringify(e.DB.raw.prepare('SELECT * FROM bumps').all()) + JSON.stringify(e.DB.raw.prepare('SELECT * FROM rate_limits').all());
  assert.ok(!/198\.51\.100|203\.0\.113|Mozilla|Chrome/.test(dump));
  assert.ok(!dump.includes(d.cookie.split('.')[0]));
  // conservazione: dopo 30 giorni IP e User-Agent hashati vengono azzerati, il totale resta
  const { cleanup } = await import('../src/bump.ts');
  await cleanup(e.DB, Math.floor(Date.UTC(2026, 11, 30) / 1000));
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM bumps WHERE ip_hash IS NOT NULL OR ua_hash IS NOT NULL').get().n, 0);
  assert.equal(count(e), 5);
});

test('CORS: preflight solo dall\'origine del portfolio', async () => {
  const ok = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env(), ctx);
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Credentials'), 'true');
  const ko = await handle(new Request('https://bump.vincenzoallocca.dev/v1/bump', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env(), ctx);
  assert.equal(ko.status, 403);
});
