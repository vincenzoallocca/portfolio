# Backlog SEO

Attività rimaste in ordine di priorità. "Manuale" = richiede account o repository esterni al
portfolio; "Codice" = realizzabile nel repository.

## Completate nei cicli precedenti

| # | Attività | Verifica |
|---|---|---|
| B1 | Enforce HTTPS su GitHub Pages | `http://vincenzoallocca.dev/` → `301` → `https://vincenzoallocca.dev/` |
| B2 | Campo Website e nome sul profilo GitHub | `blog: https://vincenzoallocca.dev`, `name: Vincenzo Allocca` |
| B3 | Verifica Search Console e invio sitemap | Proprietà `sc-domain:vincenzoallocca.dev` verificata, sitemap inviata |
| B4 | Push e verifica workflow `SEO quality` e `Pages` | Run verdi su `main` |
| B13 | Profilo LinkedIn in `sameAs`, `<link rel="me">` e `#contatti` | Presente in `index.html` e `llms.txt` |

## P1 (esterno / entità)

| # | Attività | Tipo | Perché | Come |
|---|---|---|---|---|
| B16 | Pubblicare l'aggiornamento JSON-LD su `haste.it` | Manuale (repo HASTE) | La home live di `haste.it` riporta ancora `founder` `"V. Allocca"` senza `url` né `@id` verso `https://vincenzoallocca.dev/#person`; `haste.it/u/vincenzo-allocca` usa `"Vincenzo Cristiano Allocca"` e `@id` locale | Deploy del branch HASTE con `founder` collegato al portfolio e allineamento del nome canonico `"Vincenzo Allocca"` |
| B17 | Verificare visibilità ORCID (`0009-0002-3926-1948`) | Verifica | L'API pubblica ORCID (`pub.orcid.org`) conferma che `https://vincenzoallocca.dev/` è già in `researcher-urls` e `biography`, ma la pagina HTML di `orcid.org` è renderizzata lato client | Nessuna modifica necessaria su ORCID salvo aggiornare la descrizione se cambia il ruolo; tenere presente che i crawler senza JS potrebbero non leggere il link |

## P2

| # | Attività | Tipo | Note |
|---|---|---|---|
| B5 | Ottimizzare le icone PWA (`icon-512.png` 197 KB, `icon-maskable-512.png` 182 KB, `icon-192.png` 34 KB) | Codice | Compressione PNG lossless/quantizzata (es. `oxipng`, `pngquant`). Non incide sul caricamento della pagina |
| B6 | Ridurre il TBT mobile in produzione (220 ms in un run lab) | Codice | Il costo principale è l'avvio della scena WebGL. Già rimandata a interazione/idle; ulteriori riduzioni cambiano l'esperienza visiva: decisione del proprietario |
| B7 | Content-Security-Policy via `<meta>` | Codice | GitHub Pages non consente header. Con script inline servono hash `sha256-…` da ricalcolare a ogni modifica: farlo solo insieme a un controllo automatico in `seo-check.mjs` |
| B8 | Frecce sinistra/destra che cambiano scheda a livello di pagina | Codice | Valutare di limitarle al focus dentro `main`/`nav` per non interferire con lo scorrimento orizzontale da tastiera |
| B9 | Cache più lunga per font e immagini | Manuale/infra | Max-age 600 s è fisso su GitHub Pages; serve una CDN davanti (es. Cloudflare in proxy), cioè una modifica DNS da valutare |

## P3

| # | Attività | Tipo | Note |
|---|---|---|---|
| B10 | Rendere `/progetti/` indicizzabile | Codice | Quando ci saranno almeno 2–3 casi studio propri con descrizioni distinte; poi aggiungerla alla sitemap |
| B11 | Secondo caso studio | Contenuto | Solo con materiale reale e verificabile (codice pubblico, scelte tecniche documentate) |
| B12 | Sezione `/articoli/` e cross-posting con canonical | Codice + Contenuto | Non creare pagine vuote: aprire `/articoli/` solo con articoli tecnici originali completi pronti, pubblicando prima sul portfolio e usando `canonical_url` verso il portfolio solo sulle piattaforme che lo supportano realmente (es. DEV, Hashnode) |
| B14 | Versione inglese | Codice + Contenuto | Solo con un obiettivo concreto. Progetto: `/en/` e `/en/projects/haste/`, `hreflang` it/en reciproci + `x-default` verso `/`, canonical per lingua, sitemap con `xhtml:link`, `og:locale:alternate`, selettore lingua, traduzione scritta a mano |
| B15 | Rivedere la keyword map con dati reali | Manuale | Dopo 4–8 settimane di dati Search Console (report Rendimenti) |
