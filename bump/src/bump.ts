/**
 * Logica del BUMP: un voto per dispositivo, contatore solo lato server.
 *
 * Deduplicazione, dal vincolo più forte al più debole:
 *  1. UNIQUE(device_hash) nel database: lo stesso dispositivo non può contare due volte,
 *     nemmeno con richieste concorrenti (un'unica INSERT … ON CONFLICT DO NOTHING).
 *  2. Cookie __Host- firmato con HMAC: un cookie alterato o inventato viene rifiutato.
 *  3. Token monouso legato al dispositivo, con età minima e scadenza: niente POST a freddo
 *     da script, niente token riusati da un altro dispositivo.
 *  4. Limiti per IP + User-Agent (chi cancella il cookie sullo stesso dispositivo) e per
 *     solo IP (tetto alto: una rete domestica o universitaria ha molti dispositivi legittimi).
 *  5. Rate limit delle richieste per IP.
 * IP e User-Agent non vengono mai salvati in chiaro: solo HMAC, azzerati dopo 30 giorni.
 */

export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
      run(): Promise<{ meta: { changes?: number } }>;
    };
  };
}

export interface BumpEnv {
  DB: D1Like;
  BUMP_SECRET: string;
  ALLOWED_ORIGINS: string;
}

export const LIMITS = {
  /** Età minima del token: chi preme davvero il pulsante non lo fa entro un secondo dal caricamento. */
  tokenMinAgeMs: 1000,
  /** Scadenza del token. */
  tokenMaxAgeMs: 30 * 60 * 1000,
  /** Bump nuovi per stessa coppia IP + User-Agent in 24 ore (chi cancella il cookie). Non 1: molti iPhone hanno lo stesso User-Agent sulla stessa rete. */
  perIpUaPerDay: 3,
  /** Bump nuovi per stesso IP nelle ultime 24 ore, qualunque dispositivo. */
  perIpPerDay: 25,
  /** POST per IP in 10 minuti. */
  postPerIpPer10Min: 12,
  /** GET per IP in 10 minuti. */
  getPerIpPer10Min: 240,
  /** Giorni dopo cui IP e User-Agent hashati vengono cancellati. */
  retentionDays: 30,
} as const;

export const COOKIE = '__Host-bump_did';
const enc = new TextEncoder();

// ── crittografia ─────────────────────────────────────────────────────────
function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string): Promise<CryptoKey> {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keyCache.set(secret, k);
  }
  return k;
}
export async function hmac(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return b64url(new Uint8Array(sig));
}
/** Confronto a tempo costante tra due stringhe. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function randomId(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(18)));
}

// ── cookie del dispositivo ───────────────────────────────────────────────
const ID_RE = /^[A-Za-z0-9_-]{24}$/;
const SIG_RE = /^[A-Za-z0-9_-]{43}$/;

export async function signDevice(secret: string, id: string): Promise<string> {
  return `${id}.${await hmac(secret, 'did|' + id)}`;
}
/** Restituisce l'id se il valore del cookie è integro, altrimenti null. */
export async function verifyDevice(secret: string, value: string | null): Promise<string | null> {
  if (!value) return null;
  const [id, sig, extra] = value.split('.');
  if (extra !== undefined || !ID_RE.test(id ?? '') || !SIG_RE.test(sig ?? '')) return null;
  return safeEqual(sig, await hmac(secret, 'did|' + id)) ? id : null;
}
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
export function deviceCookie(value: string): string {
  return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=31536000`;
}

// ── token di bump ────────────────────────────────────────────────────────
export async function issueToken(secret: string, deviceId: string, nowMs: number): Promise<string> {
  const t = String(nowMs);
  return `${t}.${await hmac(secret, `tok|${deviceId}|${t}`)}`;
}
export type TokenCheck = 'ok' | 'invalid' | 'too_soon' | 'expired';
export async function checkToken(secret: string, deviceId: string, token: unknown, nowMs: number): Promise<TokenCheck> {
  if (typeof token !== 'string' || token.length > 80) return 'invalid';
  const m = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return 'invalid';
  if (!safeEqual(m[2], await hmac(secret, `tok|${deviceId}|${m[1]}`))) return 'invalid';
  const age = nowMs - Number(m[1]);
  if (age < 0) return 'invalid';
  if (age < LIMITS.tokenMinAgeMs) return 'too_soon';
  if (age > LIMITS.tokenMaxAgeMs) return 'expired';
  return 'ok';
}

// ── database ─────────────────────────────────────────────────────────────
export async function total(db: D1Like): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM bumps').bind().first<{ n: number }>();
  return Number(row?.n ?? 0);
}
export async function hasBumped(db: D1Like, deviceHash: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS x FROM bumps WHERE device_hash = ?').bind(deviceHash).first()) !== null;
}
/** Incrementa atomicamente il contatore di una finestra e restituisce il nuovo valore. */
export async function hit(db: D1Like, key: string, windowSec: number, nowSec: number): Promise<number> {
  const win = nowSec - (nowSec % windowSec);
  const row = await db
    .prepare(
      'INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ' +
        'ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count',
    )
    .bind(key, win)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export type InsertResult = 'inserted' | 'duplicate' | 'ip_ua_limit' | 'ip_limit';
/**
 * Un'unica istruzione: inserisce il bump solo se il dispositivo non c'è già e i tetti per IP
 * e per IP + User-Agent non sono superati. D1 esegue le scritture in serie, quindi due
 * richieste concorrenti non possono superare il vincolo UNIQUE né i tetti.
 */
export async function insertBump(
  db: D1Like,
  deviceHash: string,
  ipHash: string,
  uaHash: string,
  nowSec: number,
): Promise<InsertResult> {
  const since = nowSec - 86400;
  const res = await db
    .prepare(
      'INSERT INTO bumps (device_hash, ip_hash, ua_hash, created_at) ' +
        'SELECT ?, ?, ?, ? ' +
        'WHERE (SELECT COUNT(*) FROM bumps WHERE ua_hash = ? AND created_at > ?) < ? ' +
        'AND (SELECT COUNT(*) FROM bumps WHERE ip_hash = ? AND created_at > ?) < ? ' +
        'ON CONFLICT (device_hash) DO NOTHING',
    )
    .bind(deviceHash, ipHash, uaHash, nowSec, uaHash, since, LIMITS.perIpUaPerDay, ipHash, since, LIMITS.perIpPerDay)
    .run();
  if ((res.meta.changes ?? 0) > 0) return 'inserted';
  if (await hasBumped(db, deviceHash)) return 'duplicate';
  const ua = await db
    .prepare('SELECT COUNT(*) AS n FROM bumps WHERE ua_hash = ? AND created_at > ?')
    .bind(uaHash, since)
    .first<{ n: number }>();
  return Number(ua?.n ?? 0) >= LIMITS.perIpUaPerDay ? 'ip_ua_limit' : 'ip_limit';
}

/** Conservazione limitata: azzera IP/User-Agent hashati vecchi e i contatori scaduti. */
export async function cleanup(db: D1Like, nowSec: number): Promise<void> {
  const cutoff = nowSec - LIMITS.retentionDays * 86400;
  await db.prepare('UPDATE bumps SET ip_hash = NULL, ua_hash = NULL WHERE created_at < ? AND ip_hash IS NOT NULL').bind(cutoff).run();
  await db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(nowSec - 86400).run();
}
