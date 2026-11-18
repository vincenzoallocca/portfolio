# Risultati dei test — prima e dopo

Data: 18 novembre 2026. Ambiente: Windows 11, Node 24.18, Chrome 157 headless.
Strumenti: Lighthouse 12.8.2 (preset mobile di default e `--preset=desktop`), `@lhci/cli` 0.16.1,
`html-validate` 9.7.1 (baseline) e 11.21.1 (finale), `scripts/seo-check.mjs`, `curl`.

Server locale: piccolo server statico che emula GitHub Pages (gzip, `index.html` nelle cartelle,
redirect con slash finale, `404.html` con stato 404). La versione **dopo** non è pubblicata:
i numeri finali sono solo locali. Tutti i dati sono di **laboratorio**, non dati reali degli
utenti (CrUX): non sono disponibili.

## 1. Lighthouse — home `/`

| Scenario | Run | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Prima, produzione, mobile | 1 | 96 | 100 | 100 | 100 | 1,4 s | 1,6 s | 220 ms | 0 |
| Prima, produzione, desktop | 1 | 100 | 100 | 100 | 100 | 0,3 s | 0,3 s | 0 ms | 0 |
| Prima, locale, mobile | 3 (mediana) | 100 | 100 | 100 | 100 | 0,8 s | 1,8 s | 30 ms | 0 |
| Prima, locale, desktop | 3 (mediana) | 100 | 100 | 100 | 100 | 0,3 s | 0,4 s | 0 ms | 0 |
| **Dopo, locale, mobile** | 3 (mediana) | **100** | **100** | **100** | **100** | 0,8 s | 1,8 s | 40 ms | 0 |
| **Dopo, locale, desktop** | 3 (mediana) | **100** | **100** | **100** | **100** | 0,3 s | 0,4 s | 0 ms | 0 |

Singole run mobile dopo: 99/100/100 (TBT 110, 10, 40 ms). Peso totale della pagina: 118 KiB
prima, 119 KiB dopo (+1 KiB di HTML). Nessuna regressione misurabile.

## 2. Lighthouse — caso studio `/progetti/haste/` (nuova pagina)

| Scenario | Run | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile, serie 1 | 86 / 94 / 82 | mediana 86 | 100 | 100 | 100 | 1,7 s | 530 ms (270–730) | 0 |
| Mobile, serie 2 (alternata con la home) | 100 / 100 / 99 / 100 | mediana 100 | — | — | — | — | 55 ms (30–88) | — |
| Desktop | 100 / 100 / 100 | 100 | 100 | 100 | 100 | 0,4 s | 0 ms | 0 |

La pagina **non contiene JavaScript**: il TBT viene da calcolo stili/layout del rendering iniziale
sotto throttling CPU 4×. La serie 1 è stata disturbata dal carico della macchina (stesse
condizioni: la serie 2 alternata con la home, che non è cambiata, dà 30–88 ms). Un test A/B su
varianti CSS (senza `text-wrap: balance`, senza `background-attachment: fixed`, senza web font)
non ha mostrato una causa singola al di sopra del rumore. Da ricontrollare in CI su macchina pulita:
la soglia TBT ≤ 300 ms è configurata come avviso.

Peso totale: 106 KiB. Avvisi Lighthouse residui: cache TTL (limite GitHub Pages), un foglio di
stile bloccante (atteso: 3 KB gzip), immagine profilo 256 px mostrata a 40 px (4,7 KB
risparmiabili, irrilevante).

## 3. Lighthouse — altre pagine

| Pagina | Risultato | Interpretazione |
|---|---|---|
| `/progetti/` mobile / desktop | Perf 94 / 100, A11y 100, BP 100, **SEO 69** | Atteso: la pagina è `noindex` per scelta, Lighthouse penalizza il punteggio SEO |
| `/404.html` (servita con stato 404) | Lighthouse non la analizza | Atteso: Lighthouse rifiuta pagine con stato HTTP di errore |

## 4. Lighthouse CI con la configurazione del repository

`lhci autorun --config=.github/lighthouserc.json` (3 run × 2 URL) eseguito in locale:
**nessuna asserzione violata**, exit code 0. Non ancora eseguito su GitHub Actions (richiede
push).

## 5. Controlli statici

| Controllo | Prima | Dopo |
|---|---|---|
| `html-validate` preset recommended | `index.html` 0 errori; `404.html` 1 errore (doctype) | **0 errori** su tutte e 4 le pagine (v11.21.1, config del repository) |
| `scripts/seo-check.mjs` | Non esisteva | **0 errori, 0 avvisi** (4 pagine, 2 indicizzabili) |
| Test negativo di `seo-check.mjs` (copia con 5 difetti iniettati: canonical rimosso, alt rimosso, link interno rotto, nome Organization incoerente, `Disallow` sulla pagina) | — | Tutti i difetti rilevati, exit code 1 |
| JSON-LD: parsing, `@context`, `@id` assoluti e risolti tra pagine, nomi coerenti e visibili | Non verificato | **OK** |
| Sitemap: XML, namespace, URL assoluti HTTPS, solo canonical indicizzabili, lastmod W3C | 1 URL, valida | **2 URL, valida**; rigenerazione idempotente |
| robots.txt: sintassi, Sitemap assoluta, nessuna pagina indicizzabile bloccata | 15 gruppi, valido | **1 gruppo, valido** |
| Manifest e config JSON (`site.webmanifest`, `lighthouserc.json`, `htmlvalidate.json`) | — | JSON valido |
| Contenuto delle schede nell'HTML iniziale (senza JS) | Presente | Presente (verificato con `curl` per Impegno, Formazione, Contatti, link al caso studio) |
| Console del browser (home e caso studio) | — | Nessun errore |
| Overflow orizzontale a 375 px (caso studio) | — | Nessuno |

## 6. Link

| Tipo | Esito |
|---|---|
| Link interni e ancore (`seo-check.mjs`) | Tutti validi |
| Link esterni (curl con redirect, 18 URL distinti) | Tutti 200; `/progetti/` e `/progetti/haste/` in produzione danno 404 **perché non ancora pubblicati** |
| `https://haste.it/l/vincenzoallocca` (Website del profilo GitHub) | **404** — fuori dal repository, vedi BACKLOG B2 |

## 7. HTTP (produzione, prima)

| Verifica | Esito |
|---|---|
| `https://` 200, `www` → apex 301 | OK |
| `http://` → `https://` | **Nessun redirect (200)** — da correggere nelle impostazioni Pages |
| URL inesistente | 404 con pagina personalizzata |

## 8. Non eseguiti

| Test | Motivo | Come eseguirlo |
|---|---|---|
| Validatore W3C Nu (vnu) | Java non installato | `docker run --rm -v "$PWD:/w" ghcr.io/validator/validator vnu --skip-non-html /w` oppure <https://validator.w3.org/nu/> dopo il deploy |
| Rich Results Test / Schema Markup Validator | Richiedono URL pubblici con le modifiche | [SEARCH-CONSOLE.md §6](SEARCH-CONSOLE.md#6-test-dei-dati-strutturati) |
| Lighthouse in produzione dopo le modifiche | Nessun deploy autorizzato | Dopo il push: workflow "SEO quality" o PageSpeed Insights |
| Stato di indicizzazione | Nessun accesso a Search Console | [SEARCH-CONSOLE.md §3](SEARCH-CONSOLE.md#3-ispezione-url-e-richiesta-di-indicizzazione) |
| Screen reader reale (NVDA/VoiceOver) | Non disponibile in modo automatizzato | Verifica manuale consigliata sul caso studio e sulle schede |
| Workflow GitHub Actions | Richiede push | Tab Actions dopo il push |
