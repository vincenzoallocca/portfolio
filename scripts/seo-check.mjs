#!/usr/bin/env node
// Controlli SEO statici per vincenzoallocca.dev — nessuna dipendenza, Node >= 20.
//
//   node scripts/seo-check.mjs                  controlla tutto (exit 1 se ci sono errori)
//   node scripts/seo-check.mjs --write-sitemap  rigenera sitemap.xml e poi controlla
//
// Errori = bloccanti in CI. Avvisi = da valutare, non bloccano.
// Il sito è HTML scritto a mano e controllato da noi: un parsing a espressioni regolari
// è sufficiente e mantiene lo script senza dipendenze.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ORIGIN = 'https://vincenzoallocca.dev';
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'docs', 'scripts']);
// Immagini da dichiarare nella sitemap (estensione image di Google), per percorso.
const SITEMAP_IMAGES = { '/': ['/assets/profilo.webp'] };
const LIMITS = { titleMax: 60, titleHard: 70, descMin: 70, descMax: 160 };

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ── utilità ─────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}
const rel = (f) => relative(ROOT, f).split(sep).join('/');
function urlPathFor(file) {
  const r = rel(file);
  if (r === 'index.html') return '/';
  if (r.endsWith('/index.html')) return '/' + r.slice(0, -'index.html'.length);
  return '/' + r;
}
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&agrave;/g, 'à').replace(/&egrave;/g, 'è')
  .replace(/&deg;/g, '°').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[2] ?? m[3]) : null;
};
const metaContent = (html, key, val) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ((attr(tag, key) || '').toLowerCase() === val) return attr(tag, 'content');
  }
  return null;
};
const linkHref = (html, relVal) => {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if ((attr(tag, 'rel') || '').toLowerCase().split(/\s+/).includes(relVal)) return attr(tag, 'href');
  }
  return null;
};
const visibleText = (html) => decode(
  html.replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ');

function gitLastModified(file) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', rel(file)], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) return new Date().toISOString().slice(0, 10);
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel(file)], { cwd: ROOT, encoding: 'utf8' }).trim();
    return d || new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ── analisi delle pagine ────────────────────────────────────────────────
const pages = walk(ROOT).map((file) => {
  const html = readFileSync(file, 'utf8');
  const path = urlPathFor(file);
  const robots = (metaContent(html, 'name', 'robots') || '').toLowerCase();
  const ids = new Set([...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((m) => m[1]));
  const jsonld = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonld.push(JSON.parse(m[1])); } catch (e) { err(rel(file), `JSON-LD non valido: ${e.message}`); }
  }
  return {
    file, path, html, ids, jsonld,
    is404: rel(file) === '404.html',
    noindex: /noindex/.test(robots),
    title: decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim(),
    description: metaContent(html, 'name', 'description'),
    canonical: linkHref(html, 'canonical'),
    ogUrl: metaContent(html, 'property', 'og:url'),
    lang: attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang'),
    h1: (html.match(/<h1\b/gi) || []).length,
    text: visibleText(html),
  };
});
const byPath = new Map(pages.map((p) => [p.path, p]));
const indexable = pages.filter((p) => !p.noindex && !p.is404);

// ── sitemap (opzionale: rigenerazione) ──────────────────────────────────
if (process.argv.includes('--write-sitemap')) {
  const urls = indexable
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((p) => {
      const imgs = (SITEMAP_IMAGES[p.path] || [])
        .map((i) => `\n    <image:image>\n      <image:loc>${ORIGIN}${i}</image:loc>\n    </image:image>`).join('');
      return `  <url>\n    <loc>${ORIGIN}${p.path}</loc>\n    <lastmod>${gitLastModified(p.file)}</lastmod>${imgs}\n  </url>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(join(ROOT, 'sitemap.xml'), xml);
  console.log(`sitemap.xml rigenerata: ${urls.length} URL`);
}

// ── controlli per pagina ────────────────────────────────────────────────
const graphNodes = [];
for (const p of pages) {
  const where = rel(p.file);
  if (!/^<!DOCTYPE html>/.test(p.html.trimStart())) err(where, 'doctype mancante o non in forma <!DOCTYPE html>');
  if (!p.lang) err(where, 'attributo lang mancante su <html>');
  if (!/<meta\s+charset=/i.test(p.html)) err(where, 'meta charset mancante');
  if (!metaContent(p.html, 'name', 'viewport')) err(where, 'meta viewport mancante');
  if (!p.title) err(where, 'title mancante');
  else if (p.title.length > LIMITS.titleHard) err(where, `title troppo lungo (${p.title.length} > ${LIMITS.titleHard})`);
  else if (p.title.length > LIMITS.titleMax) warn(where, `title lungo (${p.title.length} caratteri): rischio troncamento`);

  for (const tag of p.html.match(/<img\b[^>]*>/gi) || []) {
    if (attr(tag, 'alt') === null) err(where, `immagine senza alt: ${tag.slice(0, 80)}`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) warn(where, `immagine senza width/height (rischio CLS): ${attr(tag, 'src')}`);
  }

  if (p.is404) {
    if (!p.noindex) err(where, 'la pagina 404 deve avere meta robots noindex');
    continue;
  }
  if (!p.description) err(where, 'meta description mancante');
  else if (p.description.length > LIMITS.descMax || p.description.length < LIMITS.descMin) {
    warn(where, `meta description di ${p.description.length} caratteri (consigliati ${LIMITS.descMin}-${LIMITS.descMax})`);
  }
  if (p.h1 === 0) err(where, 'nessun H1');
  if (p.h1 > 1) warn(where, `${p.h1} H1 nella pagina`);

  const expected = ORIGIN + p.path;
  if (!p.canonical) err(where, 'canonical mancante');
  else if (p.canonical !== expected) err(where, `canonical "${p.canonical}" diverso dall'URL atteso "${expected}"`);
  if (!p.noindex) {
    if (!p.ogUrl) warn(where, 'og:url mancante');
    else if (p.ogUrl !== p.canonical) err(where, `og:url "${p.ogUrl}" diverso dal canonical`);
    for (const k of ['og:title', 'og:description', 'og:image']) {
      if (!metaContent(p.html, 'property', k)) warn(where, `${k} mancante`);
    }
    if (p.jsonld.length === 0) warn(where, 'nessun dato strutturato JSON-LD');
  }

  // link interni e ancore
  for (const m of p.html.matchAll(/<a\b[^>]*\shref\s*=\s*"([^"]+)"/gi)) {
    const href = decode(m[1]);
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      if (href.startsWith('http://')) warn(where, `link non HTTPS: ${href}`);
      if (href.startsWith(ORIGIN)) warn(where, `link interno assoluto, meglio relativo alla root: ${href}`);
      continue;
    }
    const [pathPart, hash] = href.split('#');
    const target = pathPart === '' ? p : byPath.get(posix.normalize(pathPart.startsWith('/') ? pathPart : posix.join(posix.dirname(p.path + 'x'), pathPart)));
    if (!target) {
      // asset statici (non HTML)
      const f = join(ROOT, pathPart.replace(/^\//, ''));
      if (!existsSync(f)) err(where, `link interno rotto: ${href}`);
      continue;
    }
    if (hash && !target.ids.has(hash)) err(where, `ancora inesistente: ${href}`);
  }
  // risorse referenziate (link/script/img)
  for (const m of p.html.matchAll(/<(?:link|script|img)\b[^>]*\s(?:href|src)\s*=\s*"([^"]+)"/gi)) {
    const ref = m[1];
    if (/^(https?:|data:|mailto:)/.test(ref) || ref.startsWith('#')) continue;
    const f = ref.startsWith('/') ? join(ROOT, ref.slice(1)) : join(p.file, '..', ref);
    if (!existsSync(f)) err(where, `risorsa mancante: ${ref}`);
  }

  // JSON-LD
  for (const block of p.jsonld) {
    if (block['@context'] !== 'https://schema.org') err(where, `JSON-LD con @context "${block['@context']}" (atteso https://schema.org)`);
    const nodes = block['@graph'] || [block];
    for (const n of nodes) {
      if (!n['@type']) err(where, `nodo JSON-LD senza @type (${n['@id'] || '?'})`);
      graphNodes.push({ node: n, page: p });
    }
  }
}

// ── coerenza JSON-LD tra pagine ─────────────────────────────────────────
const defined = new Map(); // @id → nodi con proprietà oltre a @id
for (const { node, page } of graphNodes) {
  if (!node['@id']) continue;
  if (!/^https:\/\//.test(node['@id'])) err(rel(page.file), `@id non assoluto: ${node['@id']}`);
  if (!defined.has(node['@id'])) defined.set(node['@id'], []);
  defined.get(node['@id']).push({ node, page });
}
function collectRefs(v, out) {
  if (Array.isArray(v)) v.forEach((x) => collectRefs(x, out));
  else if (v && typeof v === 'object') {
    if (v['@id'] && Object.keys(v).length === 1) out.push(v['@id']);
    for (const [k, x] of Object.entries(v)) if (k !== '@id') collectRefs(x, out);
  }
  return out;
}
for (const { node, page } of graphNodes) {
  for (const ref of collectRefs(node, [])) {
    if (ref.startsWith(ORIGIN) && !defined.has(ref)) err(rel(page.file), `JSON-LD: riferimento a @id non definito: ${ref}`);
    if (ref.startsWith(ORIGIN + '/')) {
      const target = ref.split('#')[0].slice(ORIGIN.length);
      const tp = byPath.get(target);
      if (tp && tp.noindex) warn(rel(page.file), `JSON-LD punta a una pagina noindex: ${ref}`);
    }
  }
}
// stessi @id: name e tipo devono coincidere ovunque
for (const [id, list] of defined) {
  const names = new Set(list.map((x) => x.node.name).filter(Boolean));
  const types = new Set(list.map((x) => x.node['@type']).filter(Boolean));
  if (names.size > 1) err('JSON-LD', `@id ${id} ha nomi diversi tra le pagine: ${[...names].join(' / ')}`);
  if (types.size > 1) err('JSON-LD', `@id ${id} ha tipi diversi tra le pagine: ${[...types].join(' / ')}`);
}
// i nomi dichiarati devono comparire nel testo visibile della pagina
for (const { node, page } of graphNodes) {
  if (!['Person', 'Organization', 'WebPage', 'ProfilePage'].includes(node['@type'])) continue;
  const name = node['@type'].endsWith('Page') ? null : node.name;
  if (name && !page.text.includes(name)) warn(rel(page.file), `JSON-LD: "${name}" non compare nel testo visibile`);
}
const persons = graphNodes.filter((x) => x.node['@type'] === 'Person' && x.node.sameAs);
for (const { node, page } of persons) {
  for (const url of node.sameAs) {
    if (!/^https:\/\//.test(url)) err(rel(page.file), `sameAs non HTTPS: ${url}`);
  }
}

// ── duplicati tra pagine indicizzabili ──────────────────────────────────
for (const key of ['title', 'description']) {
  const seen = new Map();
  for (const p of indexable) {
    if (!p[key]) continue;
    if (seen.has(p[key])) err(rel(p.file), `${key} duplicato con ${rel(seen.get(p[key]).file)}`);
    else seen.set(p[key], p);
  }
}

// ── sitemap.xml ─────────────────────────────────────────────────────────
const sitemapFile = join(ROOT, 'sitemap.xml');
if (!existsSync(sitemapFile)) err('sitemap.xml', 'file mancante');
else {
  const xml = readFileSync(sitemapFile, 'utf8');
  if (!/^<\?xml version="1.0" encoding="UTF-8"\?>/.test(xml)) err('sitemap.xml', 'intestazione XML mancante');
  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) err('sitemap.xml', 'namespace sitemap mancante');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const pageLocs = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (new Set(pageLocs).size !== pageLocs.length) err('sitemap.xml', 'URL duplicati');
  for (const loc of pageLocs) {
    if (!loc.startsWith(ORIGIN + '/')) { err('sitemap.xml', `URL non assoluto o di altro dominio: ${loc}`); continue; }
    const p = byPath.get(loc.slice(ORIGIN.length));
    if (!p) err('sitemap.xml', `URL senza pagina corrispondente: ${loc}`);
    else if (p.noindex) err('sitemap.xml', `URL noindex in sitemap: ${loc}`);
    else if (p.canonical !== loc) err('sitemap.xml', `URL non canonico: ${loc} (canonical ${p.canonical})`);
  }
  for (const loc of locs.filter((l) => !pageLocs.includes(l))) {
    if (!existsSync(join(ROOT, loc.slice(ORIGIN.length + 1)))) err('sitemap.xml', `immagine inesistente: ${loc}`);
  }
  for (const p of indexable) {
    if (!pageLocs.includes(ORIGIN + p.path)) err('sitemap.xml', `pagina indicizzabile assente: ${ORIGIN + p.path}`);
  }
  for (const m of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
    if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/.test(m[1])) err('sitemap.xml', `lastmod non W3C: ${m[1]}`);
  }
}

// ── robots.txt ──────────────────────────────────────────────────────────
const robotsFile = join(ROOT, 'robots.txt');
if (!existsSync(robotsFile)) err('robots.txt', 'file mancante');
else {
  const lines = readFileSync(robotsFile, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  const known = /^(user-agent|allow|disallow|sitemap|crawl-delay)\s*:/i;
  lines.forEach((l) => { if (!known.test(l)) err('robots.txt', `direttiva non riconosciuta: ${l}`); });
  if (!lines.some((l) => l.toLowerCase() === `sitemap: ${ORIGIN}/sitemap.xml`.toLowerCase())) err('robots.txt', 'Sitemap assoluta non dichiarata');
  const agents = lines.filter((l) => /^user-agent:/i.test(l)).map((l) => l.split(':')[1].trim());
  if (agents.length > 1) warn('robots.txt', `${agents.length} gruppi User-agent: un bot con gruppo proprio ignora le regole di "*"`);
  const disallow = lines.filter((l) => /^disallow:/i.test(l)).map((l) => l.slice(l.indexOf(':') + 1).trim()).filter(Boolean);
  for (const p of indexable) {
    const hit = disallow.find((d) => p.path.startsWith(d));
    if (hit) err('robots.txt', `pagina indicizzabile bloccata da "Disallow: ${hit}": ${p.path}`);
  }
}

// ── report ──────────────────────────────────────────────────────────────
console.log(`Pagine analizzate: ${pages.length} (${indexable.length} indicizzabili: ${indexable.map((p) => p.path).join(', ')})`);
for (const w of warnings) console.log(`AVVISO  ${w}`);
for (const e of errors) console.log(`ERRORE  ${e}`);
console.log(`\n${errors.length} errori, ${warnings.length} avvisi`);
process.exit(errors.length ? 1 : 0);
