// Test di integrazione contro `wrangler dev --local` (workerd reale + D1 locale).
//   node test/integration.mjs http://127.0.0.1:8799 [expectTotal]
// Richieste davvero parallele via HTTP; i dispositivi sono simulati con cookie distinti.
import assert from 'node:assert/strict';

const BASE = (process.argv[2] || 'http://127.0.0.1:8799') + '/v1/bump';
const ORIGIN = 'https://vincenzoallocca.dev';
const expectTotal = process.argv[3] === undefined ? null : Number(process.argv[3]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function device(ua) {
  let cookie = '';
  const headers = () => ({ Origin: ORIGIN, 'User-Agent': ua, ...(cookie ? { Cookie: cookie } : {}) });
  const keep = (res) => { const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; return res; };
  return {
    async get() { const r = keep(await fetch(BASE, { headers: headers() })); return { status: r.status, body: await r.json() }; },
    async post(token) {
      const r = keep(await fetch(BASE, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }));
      return { status: r.status, body: await r.json() };
    },
  };
}

if (expectTotal !== null) {
  // Modalità "dopo il riavvio": solo lettura del totale
  const g = await device('restart-check').get();
  assert.equal(g.body.total, expectTotal, 'totale dopo il riavvio');
  console.log(`persistenza: totale dopo il riavvio = ${g.body.total} ✓`);
  process.exit(0);
}

const start = (await device('probe').get()).body.total;

// A. lo stesso dispositivo spara 8 POST in parallelo (sotto il limite per IP) → +1
const same = device('Same device UA');
const g = await same.get();
await sleep(1100);
const burst = await Promise.all(Array.from({ length: 8 }, () => same.post(g.body.token)));
const okA = burst.filter((r) => r.body.status === 'ok').length;
const alreadyA = burst.filter((r) => r.body.status === 'already').length;
console.log(`A. 8 POST concorrenti stesso dispositivo: ok=${okA} already=${alreadyA}`);
assert.equal(okA, 1);
assert.equal(alreadyA, 7);

// B. 3 dispositivi diversi (UA diversi, stesso IP locale) in parallelo → +3
const devs = ['Device B1', 'Device B2', 'Device B3'].map(device);
const toks = await Promise.all(devs.map((d) => d.get()));
await sleep(1100);
const resB = await Promise.all(devs.map((d, i) => d.post(toks[i].body.token)));
console.log('B. 3 dispositivi in parallelo:', resB.map((r) => r.body.status).join(', '));
assert.ok(resB.every((r) => r.body.status === 'ok'));

// C. raffica oltre il limite di POST per IP (12 ogni 10 minuti): dal 13° in poi 429
const flood = device('Flood bot');
const tf = await flood.get();
await sleep(1100);
const resC = await Promise.all(Array.from({ length: 6 }, () => flood.post(tf.body.token)));
const codes = resC.map((r) => r.status);
console.log('C. raffica oltre il limite:', codes.join(', '));
assert.equal(codes.filter((c) => c === 429).length, 5, 'solo 1 POST rientra nel limite, gli altri 5 sono 429');

const end = (await device('probe-end').get()).body.total;
console.log(`totale: ${start} → ${end}`);
assert.equal(end, start + 5);
console.log('integrazione OK');
