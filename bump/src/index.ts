/**
 * Worker "portfolio-bump" su https://bump.vincenzoallocca.dev
 *
 *   GET  /v1/bump  → { total, bumped, token }  (imposta il cookie del dispositivo se manca)
 *   POST /v1/bump  → body JSON { token }       (registra al massimo un bump per dispositivo)
 *
 * Il totale non è mai modificabile dal client: è COUNT(*) della tabella bumps.
 */
import {
  type BumpEnv,
  COOKIE,
  LIMITS,
  checkToken,
  cleanup,
  deviceCookie,
  hasBumped,
  hit,
  hmac,
  insertBump,
  issueToken,
  randomId,
  readCookie,
  signDevice,
  total,
  verifyDevice,
} from './bump.ts';

export interface Env extends BumpEnv {}

type Ctx = { waitUntil(p: Promise<unknown>): void };

/** Intestazioni di sicurezza per ogni risposta: è un'API JSON, non deve mai essere interpretata
 *  come pagina, incorporata in un frame o letta da un altro sito. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS };
/** Corpo massimo di una POST: il token occupa meno di 100 byte. */
const MAX_BODY = 512;
/** Pulizia di conservazione su una GET ogni ~20: basta a garantire i 30 giorni senza scrivere a ogni visita. */
const GET_CLEANUP_RATE = 0.05;

/** Legge il corpo fermandosi oltre `max` byte, anche senza Content-Length (richieste chunked). */
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

function allowedOrigin(env: Env, origin: string | null): string | null {
  if (!origin) return null;
  return env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(origin) ? origin : null;
}
function cors(origin: string | null): Record<string, string> {
  if (!origin) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}
function json(body: unknown, status: number, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...cors(origin), ...extra } });
}

export async function handle(req: Request, env: Env, ctx: Ctx, nowMs = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  const origin = allowedOrigin(env, req.headers.get('Origin'));
  const nowSec = Math.floor(nowMs / 1000);

  if (url.pathname !== '/v1/bump') return json({ status: 'not_found' }, 404, origin);

  if (req.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 403, headers: SECURITY_HEADERS });
    return new Response(null, {
      status: 204,
      headers: {
        ...SECURITY_HEADERS,
        ...cors(origin),
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      },
    });
  }
  if (req.method !== 'GET' && req.method !== 'POST') return json({ status: 'method_not_allowed' }, 405, origin, { Allow: 'GET, POST, OPTIONS' });

  const secret = env.BUMP_SECRET;
  if (!secret || secret.length < 32) return json({ status: 'error' }, 500, origin);

  try {
    const ip = req.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const ipHash = await hmac(secret, 'ip|' + ip);
    const rawCookie = readCookie(req.headers.get('Cookie'), COOKIE);
    const deviceId = await verifyDevice(secret, rawCookie);

    if (req.method === 'GET') {
      if ((await hit(env.DB, 'g|' + ipHash, 600, nowSec)) > LIMITS.getPerIpPer10Min) {
        return json({ status: 'rate_limited' }, 429, origin, { 'Retry-After': '600' });
      }
      let id = deviceId;
      const headers: Record<string, string> = {};
      if (!id) {
        // Cookie assente o alterato: nuovo identificativo casuale firmato.
        id = randomId();
        headers['Set-Cookie'] = deviceCookie(await signDevice(secret, id));
      }
      if (Math.random() < GET_CLEANUP_RATE) ctx.waitUntil(cleanup(env.DB, nowSec).catch(() => {}));
      const deviceHash = await hmac(secret, 'dev|' + id);
      const [n, bumped] = await Promise.all([total(env.DB), deviceId ? hasBumped(env.DB, deviceHash) : Promise.resolve(false)]);
      return json({ status: 'ok', total: n, bumped, token: await issueToken(secret, id, nowMs) }, 200, origin, headers);
    }

    // POST: solo dal sito, solo JSON (forza il preflight CORS), solo con cookie integro.
    if (!origin) return json({ status: 'forbidden' }, 403, null);
    if (!(req.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
      return json({ status: 'bad_request' }, 415, origin);
    }
    if ((await hit(env.DB, 'p|' + ipHash, 600, nowSec)) > LIMITS.postPerIpPer10Min) {
      return json({ status: 'rate_limited' }, 429, origin, { 'Retry-After': '600' });
    }
    if (!deviceId) {
      // Cookie mancante o manipolato: nessun bump; si riparte con un cookie nuovo e valido.
      const id = randomId();
      return json({ status: 'invalid_device' }, 400, origin, { 'Set-Cookie': deviceCookie(await signDevice(secret, id)) });
    }
    const len = Number(req.headers.get('Content-Length') || '0');
    if (len > MAX_BODY) return json({ status: 'bad_request' }, 413, origin);
    const raw = await readCapped(req, MAX_BODY);
    if (raw === null) return json({ status: 'bad_request' }, 413, origin);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ status: 'bad_request' }, 400, origin);
    }
    const token = body && typeof body === 'object' ? (body as { token?: unknown }).token : undefined;
    const tc = await checkToken(secret, deviceId, token, nowMs);
    if (tc !== 'ok') return json({ status: tc === 'too_soon' ? 'too_soon' : 'invalid_token' }, tc === 'too_soon' ? 425 : 400, origin);

    const deviceHash = await hmac(secret, 'dev|' + deviceId);
    const uaHash = await hmac(secret, 'ua|' + ip + '|' + (req.headers.get('User-Agent') || '').slice(0, 300));
    const result = await insertBump(env.DB, deviceHash, ipHash, uaHash, nowSec);
    ctx.waitUntil(cleanup(env.DB, nowSec).catch(() => {}));
    const n = await total(env.DB);
    if (result === 'inserted') return json({ status: 'ok', total: n, bumped: true }, 200, origin);
    if (result === 'duplicate') return json({ status: 'already', total: n, bumped: true }, 200, origin);
    return json({ status: 'rate_limited', total: n, bumped: false }, 429, origin, { 'Retry-After': '86400' });
  } catch {
    // Nessun dettaglio nei log oltre al tipo di evento: niente IP, cookie o token.
    console.error('bump: errore interno');
    return json({ status: 'error' }, 500, origin);
  }
}

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    return handle(req, env, ctx);
  },
};
