# Implementazione — interventi del 18 novembre 2026

Riferimenti ai problemi: vedi codici in [AUDIT.md](AUDIT.md). Nessun commit, push o deploy è
stato eseguito: tutte le modifiche sono nel working tree in attesa di revisione.

## Decisioni prese con il proprietario

| Domanda | Decisione |
|---|---|
| Ruolo principale in title, sottotitolo e `jobTitle` | **"Digital Entrepreneur"** resta il ruolo principale (scelta del commit `f4f2f63` confermata); "sviluppatore full-stack" resta come qualifica in description, lead e testo |
| Uso dei fatti presenti nel README del profilo GitHub | **Solo formazione**: diploma 2026 (90/100), 1° posto PCTO 2025, Model European Parliament 2024. Escluso il progetto "Candelora Mediazioni" |

## Decisioni architetturali

1. **Nessun cambio di stack.** Il sito resta HTML statico senza build: è adeguato alla dimensione
   del progetto e già veloce (Lighthouse 100 in locale). Un framework o un generatore statico
   aggiungerebbe dipendenze senza un beneficio misurabile.
2. **Una sola nuova pagina indicizzabile: `/progetti/haste/`.** È l'unica proposta con intento di
   ricerca distinto e contenuto verificabile sufficiente. Le altre (chi-sono, competenze,
   formazione, contatti, intelligenza-artificiale) sarebbero state sottili o in cannibalizzazione
   con la home. Motivazione completa in [STRATEGY.md §3](STRATEGY.md#3-decisione-architetturale).
3. **`/progetti/` come pagina di navigazione `noindex,follow`**, per non lasciare un 404 sul
   genitore del caso studio e per sostenere il breadcrumb, senza proporre all'indice una pagina
   con poco contenuto proprio.
4. **CSS condiviso esterno solo per le pagine interne** (`assets/css/pagina.css`). La home mantiene
   il CSS inline per il percorso di rendering critico: spostarlo peggiorerebbe FCP/LCP.
5. **Controlli automatici senza dipendenze nel repository**: uno script Node puro e strumenti
   esterni a versione fissata invocati con `npx` solo in CI. Niente `package.json`, niente
   `node_modules` committati, niente secret.

## Modifiche per file

### `index.html`

| Modifica | Problema | Motivazione |
|---|---|---|
| Organization `name` → "HASTE Collective", `alternateName` "HASTE", `url` con slash finale | P1-4 | Allineamento all'entità dichiarata da haste.it per lo stesso `@id` |
| Testo della card HASTE: "HASTE Collective è un collettivo…" | P1-4 | Il nome nel JSON-LD deve comparire nel testo visibile |
| `subjectOf` dall'Organization verso `/progetti/haste/#webpage` | P1-3 | Collega l'entità alla pagina che la approfondisce |
| Pulsante "Caso studio: come è costruito HASTE" → `/progetti/haste/` | P1-3 | Link interno scansionabile con anchor descrittivo |
| `email` senza prefisso `mailto:` | P2-2 | Formato atteso per `Person.email` |
| `<link rel="me">` verso Facebook | P2-2 | Coerenza con `sameAs` |
| Formazione: università "dal 2026", diploma 2026 (90/100), PCTO 2025, MEP 2024 con sottotitoli H3 | P3-1 | Fatti verificati e autorizzati |
| JSON-LD: `hasCredential` (diploma), `award` (PCTO), nodo `HighSchool` con `@id` riusato da `alumniOf` | P3-1 | I dati strutturati riflettono i contenuti visibili |
| Nemici-Miei: descrizione concreta (vista isometrica, animazioni, PCTO 2024–2025) | P3-2 | Dal README del repository |
| Chip "TypeScript", "Python", "Sicurezza informatica"; stessi termini in `knowsAbout` | P3-3 | TypeScript e Python già evidenti nei progetti citati; interesse per la sicurezza dichiarato dal proprietario |
| CSS: `.group .edu` con lo stesso margine di `.group .chips` | — | Layout della nuova card Formazione |

Invariati: title, description, Open Graph, ruolo principale, design, script, WebGL.

### Nuovi file

| File | Contenuto |
|---|---|
| `progetti/haste/index.html` | Caso studio: cos'è HASTE, ruolo, architettura (Cloudflare, sicurezza, status page, integrazione MCP), link di approfondimento. Breadcrumb visibile; JSON-LD `WebPage` + `BreadcrumbList` + `Organization` + `SoftwareSourceCode` (status page) + riferimento al `Person` della home. Canonical, OG e Twitter Card propri |
| `progetti/index.html` | Pagina di navigazione `noindex,follow` con l'elenco dei progetti |
| `assets/css/pagina.css` | Stile delle pagine interne con gli stessi token della home; link fuori dal testo con area di tocco ≥ 24 px (WCAG 2.2, 2.5.8) |
| `scripts/seo-check.mjs` | Controlli SEO statici e rigenerazione della sitemap (`--write-sitemap`, `lastmod` dalla data dell'ultimo commit del file) |
| `.github/workflows/seo-quality.yml` | CI: controlli SEO + validazione HTML (bloccanti), freschezza sitemap e link esterni (avvisi), Lighthouse CI |
| `.github/lighthouserc.json` | Soglie Lighthouse: SEO 100, A11y ≥ 95, CLS ≤ 0,1 bloccanti; performance e budget come avvisi |
| `.github/htmlvalidate.json` | Preset `recommended`; consentiti gli stili inline (scelta di performance della home) |
| `.gitignore` | Esclude `.lighthouseci/` e `node_modules/` |
| `docs/seo/*.md` | Questa documentazione |

### File modificati o spostati

| File | Modifica | Problema |
|---|---|---|
| `robots.txt` | Un solo gruppo `User-agent: *` con `Allow: /`, `Disallow: /docs/` e `/scripts/`, Sitemap assoluta. Il commento spiega perché non usare gruppi per singolo bot. I crawler AI restano ammessi (nessuno era bloccato prima, nessuno lo è ora) | P1-6, P1-2 |
| `sitemap.xml` | Rigenerata: `/` (con immagine) e `/progetti/haste/` | P1-3 |
| `llms.txt` | Sezione "Pagine" con il caso studio; nome "HASTE Collective"; formazione, status page, competenze e interessi aggiornati | P3-4 |
| `404.html` | `<!DOCTYPE html>` | P2-1 |
| `extreme-performance-report.md`, `typography-redesign-report.md` | Spostati con `git mv` in `docs/reports/` (contenuto invariato). Non sono più alla root e `/docs/` è esclusa dalla scansione | P1-2 |

## Immagini Open Graph (seconda iterazione)

| File | Modifica |
|---|---|
| `assets/og-image.jpg` | Ricreata (1200×630, JPEG, ~74 KB): pannello di vetro con sfere e Mona Sans come il sito; foto, handle, ruolo "Digital Entrepreneur", "Fondatore di HASTE Collective", "Sviluppatore full-stack · Ingegneria Informatica · Federico II", dominio. Stesso nome file: i meta tag della home non cambiano |
| `assets/og-haste.jpg` | Nuova (1200×630, ~74 KB) per `/progetti/haste/`: "Caso studio", "HASTE Collective", ruolo, tecnologie verificate, firma con URL. `og:image`, `twitter:image` e relativi `alt` della pagina aggiornati |
| `scripts/og/` | Modelli HTML (`profilo.html`, `haste.html`, `og.css`) e `render.mjs`, che li fotografa con Chrome headless tramite `puppeteer-core` |
| `scripts/seo-check.mjs` | Nuovo errore bloccante se `og:image`/`twitter:image` puntano a un file inesistente nel sito |

## Cosa non è stato modificato, e perché

| Elemento | Motivo |
|---|---|
| Redirect HTTP → HTTPS | Si attiva solo dalle impostazioni GitHub Pages (manuale, [BACKLOG.md](BACKLOG.md) B1) |
| Campo Website del profilo GitHub | Account esterno (manuale, B2) |
| Scena WebGL e animazioni | Parte dell'identità visiva; performance già entro soglia |
| Icone PWA | Nessuno strumento di compressione disponibile; non incidono sul caricamento (B5) |
| Numero WhatsApp pubblico in Contatti | Scelta del proprietario, non un problema SEO |
| DNS, dominio, Search Console | Fuori perimetro: nessun accesso a sistemi esterni |
