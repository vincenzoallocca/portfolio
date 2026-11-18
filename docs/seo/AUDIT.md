# Audit SEO iniziale — vincenzoallocca.dev

Data audit: 18 novembre 2026. Commit di partenza: `f4f2f63` (branch `main`, working tree pulito).

Questo documento descrive lo stato **prima** degli interventi. Le correzioni sono in
[IMPLEMENTATION.md](IMPLEMENTATION.md), i numeri prima/dopo in [TEST-RESULTS.md](TEST-RESULTS.md).

## 1. Ricognizione

| Voce | Stato rilevato |
|---|---|
| Stack | Sito statico scritto a mano: un `index.html` (≈60 KB, CSS e JS inline), nessun framework, nessun build step, nessun `package.json` |
| Hosting | GitHub Pages, deploy da branch `main` (cartella root), `.nojekyll` presente |
| Dominio | `CNAME` = `vincenzoallocca.dev`; `vincenzoallocca.github.io/portfolio/` → 301 verso il dominio |
| Pagine HTML | `index.html` (home a 4 schede via hash: `#home`, `#about`, `#impegno`, `#contatti`), `404.html` |
| File di supporto | `robots.txt`, `sitemap.xml` (1 URL), `llms.txt`, `assets/site.webmanifest`, chiave IndexNow (`28d9…a886.txt`) |
| Altri file serviti pubblicamente | `extreme-performance-report.md`, `typography-redesign-report.md` (report interni) |
| CI / test | Nessuno: niente GitHub Actions, niente test |

## 2. Verifiche HTTP (eseguite con `curl` il 18/11/2026)

| URL | Risposta | Valutazione |
|---|---|---|
| `https://vincenzoallocca.dev/` | 200 `text/html` | OK |
| `http://vincenzoallocca.dev/` | **200** (nessun redirect) | **Problema**: HTTPS non forzato da GitHub Pages |
| `https://www.vincenzoallocca.dev/` | 301 → `https://vincenzoallocca.dev/` | OK |
| `http://www.vincenzoallocca.dev/` | 301 → `http://vincenzoallocca.dev/` | Catena http, vedi sopra |
| `https://vincenzoallocca.dev/index.html` | 200 | Duplicato tecnico, gestito dal canonical |
| `https://vincenzoallocca.dev/non-esiste` | 404 con `404.html` | OK |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | 200 | OK |
| `/extreme-performance-report.md` | 200 `text/markdown` | Report interno pubblico e scansionabile |
| Header di cache | `Cache-Control: max-age=600` | Limite di GitHub Pages, non configurabile |

Nota: il TLD `.dev` è nella HSTS preload list dei browser, quindi gli utenti reali vengono
portati su HTTPS dal browser stesso. I crawler e i client che non usano la preload list
(es. `curl`) ricevono invece la versione `http://` con stato 200: è un duplicato
tecnico, mitigato dal canonical assoluto in HTTPS ma non eliminato.

Verifiche DNS: **non eseguite** (fuori perimetro: nessuna modifica o lettura di pannelli esterni).
L'esistenza del file `CNAME` non è stata considerata prova di configurazione corretta: la prova è
il comportamento HTTP sopra.

## 3. Baseline misurata

Lighthouse 12.8.2, Chrome 157 headless. Dettagli in [TEST-RESULTS.md](TEST-RESULTS.md).

| Ambiente | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Produzione, mobile (1 run) | 96 | 100 | 100 | 100 | 1,6 s | 220 ms | 0 |
| Produzione, desktop (1 run) | 100 | 100 | 100 | 100 | 0,3 s | 0 ms | 0 |
| Locale, mobile (mediana 3 run) | 100 | 100 | 100 | 100 | 1,8 s | 30 ms | 0 |
| Locale, desktop (mediana 3 run) | 100 | 100 | 100 | 100 | 0,4 s | 0 ms | 0 |

Validazione HTML (`html-validate` 9.7.1, preset `recommended`): `index.html` 0 errori;
`404.html` 1 errore (`doctype-style`: doctype minuscolo).

Questi sono **dati di laboratorio**. Dati reali degli utenti (CrUX / report Core Web Vitals di
Search Console) non sono disponibili: il sito ha probabilmente traffico insufficiente per CrUX e
non c'è accesso a Search Console.

## 4. Criticità individuate

Gravità: **P0** blocca crawling/rendering/indicizzazione · **P1** errore strutturale SEO o
architetturale · **P2** performance, accessibilità, qualità · **P3** editoriale/strategico.

### P0

Nessun problema P0 trovato. In particolare:

- `robots.txt` non blocca nulla, la home risponde 200, `meta robots` è `index,follow`.
- Il canonical è assoluto, in HTTPS e autoreferenziale.
- **Tutto il contenuto delle 4 schede è nell'HTML iniziale.** Le schede non attive sono nascoste
  via CSS/`hidden` solo dopo l'esecuzione del JS: il testo resta nel DOM renderizzato e quindi
  è disponibile a Googlebot. Non dipende da interazioni.

Lo stato di indicizzazione reale **non è verificato**: richiede Search Console (vedi
[SEARCH-CONSOLE.md](SEARCH-CONSOLE.md)).

### P1

| # | Problema | Causa | Impatto |
|---|---|---|---|
| P1-1 | `http://` risponde 200 senza redirect | Opzione "Enforce HTTPS" di GitHub Pages non attiva | Duplicato http/https per i crawler; segnali divisi (mitigati dal canonical) |
| P1-2 | Report interni (`*.md`) serviti e scansionabili alla root | File di lavoro committati nella root pubblicata | Contenuti non destinati agli utenti indicizzabili; uno contiene dati obsoleti (font non più usati, dominio scritto male nel titolo) |
| P1-3 | Un solo URL indicizzabile: il progetto principale (HASTE) non ha una pagina propria | Architettura single-page a schede con hash (i frammenti `#…` non sono URL distinti per Google) | Nessuna pagina può rispondere in modo approfondito a ricerche su HASTE e sul lavoro tecnico svolto |
| P1-4 | Nome dell'entità HASTE incoerente | Il JSON-LD del portfolio usa `"name": "HASTE"` con `@id` `https://haste.it/#organization`, mentre haste.it dichiara per lo stesso `@id` `"name": "HASTE Collective"` | Due descrizioni divergenti della stessa entità |
| P1-5 | Link "website" del profilo GitHub rotto | Il profilo GitHub punta a `https://haste.it/l/vincenzoallocca`, che risponde **404** | Il profilo che conferma l'identità (`sameAs`) non rimanda al sito ufficiale |
| P1-6 | `robots.txt` con 15 gruppi `User-agent` separati, tutti `Allow: /` | Elenco esplicito di crawler | Trappola di manutenzione: un crawler con gruppo proprio **ignora** le regole del gruppo `*`; aggiungendo un `Disallow` solo a `*`, Googlebot non lo rispetterebbe |
| P1-7 | Nessuna verifica automatica | Assenza di CI | Regressioni su metadata, JSON-LD, sitemap e link non vengono intercettate |

### P2

| # | Problema | Impatto |
|---|---|---|
| P2-1 | `404.html` con `<!doctype html>` minuscolo | Errore di validazione (nessun impatto sul rendering) |
| P2-2 | JSON-LD: `email` con prefisso `mailto:`; manca `rel="me"` verso Facebook pur essendo in `sameAs` | Coerenza dei segnali d'identità |
| P2-3 | TBT mobile in produzione 220 ms (lab) | Margine ridotto sull'INP percepito su dispositivi lenti; causa principale: inizializzazione della scena WebGL e lavoro di stile/layout |
| P2-4 | Icone PWA pesanti (`icon-512.png` 197 KB, `icon-maskable-512.png` 182 KB, `icon-192.png` 34 KB) | Non incidono sul caricamento della pagina (scaricate solo per installazione/manifest), ma sono ottimizzabili |
| P2-5 | Cache TTL di 10 minuti su font e immagini | Limite di GitHub Pages, non risolvibile senza CDN davanti |
| P2-6 | Nessuna Content-Security-Policy | GitHub Pages non permette header custom; una CSP in `<meta>` con hash degli script inline è possibile ma fragile |

Accessibilità (verifica manuale + Lighthouse 100): skip link presente, focus visibile, landmark
(`header`, `nav`, `main`, `aside`), `aria-current` sulla navigazione, `prefers-reduced-motion`
rispettato, alt presente sull'unica immagine di contenuto, target touch ≥ 44 px. Nessun problema
bloccante; nota minore: le frecce sinistra/destra cambiano scheda a livello di pagina.

### P3

| # | Opportunità |
|---|---|
| P3-1 | La formazione è descritta in modo generico; il README del profilo GitHub riporta fatti verificabili (diploma 2026, 90/100; 1° posto PCTO 2025; Model European Parliament 2024) |
| P3-2 | La scheda "Nemici-Miei" non dice cosa sia il progetto oltre allo stack |
| P3-3 | L'interesse per la sicurezza informatica non compare tra le aree di interesse |
| P3-4 | `llms.txt` non riflette le informazioni aggiornate e non punta a pagine di approfondimento |

## 5. Elementi verificati senza problemi

`lang="it"`, `charset`, `viewport`, title (60 caratteri), meta description (150 caratteri),
Open Graph completo (immagine 1200×630 verificata), Twitter Card `summary_large_image`, favicon
ICO/SVG/apple-touch, manifest valido, un solo H1, gerarchia H2/H3 coerente, link esterni con
`rel="noopener"`, immagine profilo con `width`/`height` (CLS 0), font self-hosted con
`font-display: swap` e preload, sitemap XML ben formata, pagina 404 con `noindex`.

## 6. Fonti usate per verificare i fatti

| Fatto | Fonte |
|---|---|
| Studente di Ingegneria Informatica, Federico II; sviluppatore full-stack | Repository del portfolio; bio e README del profilo GitHub `vincenzoallocca` |
| Diploma ITIS Majorana 2026 (90/100), 1° posto PCTO 2025, Model European Parliament 2024 | README del profilo GitHub (dichiarazione del proprietario); uso autorizzato dal proprietario |
| HASTE Collective: collettivo indipendente nato in Campania nel 2026, magazine, manifesto, catalogo; "V. Allocca – Direzione editoriale" tra i fondatori | `https://haste.it` (meta e JSON-LD della home) |
| Stack HASTE: Cloudflare Pages, Workers, D1, R2, TypeScript | Repository del portfolio (dichiarazione del proprietario) |
| HASTE servito da Cloudflare con HSTS preload e CSP con nonce | Header HTTP di `https://haste.it` |
| Discovery per agenti AI e endpoint MCP di sola lettura su haste.it | `https://haste.it/.well-known/mcp/server-card.json` e header `Link` |
| Status page: Worker + D1 + cron ogni minuto, SvelteKit/TypeScript | Repository pubblico `vincenzoallocca/haste-status-new` (`wrangler.toml`, `package.json`) |
| Nemici-Miei: progetto PCTO 2024–2025, vista isometrica, Python/Pygame | README di `vincenzoallocca/nemici-miei` |

Dati **non disponibili** durante l'audit: volumi di ricerca, difficoltà keyword, posizioni,
CTR, impression, stato di indicizzazione, dati CrUX. Non sono stati stimati né inventati.
