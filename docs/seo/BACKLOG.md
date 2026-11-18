# Backlog SEO

Attività non svolte, in ordine di priorità. "Manuale" = richiede account o pannelli esterni del
proprietario; "Codice" = realizzabile nel repository.

## P1

| # | Attività | Tipo | Perché | Come |
|---|---|---|---|---|
| B1 | Attivare **Enforce HTTPS** su GitHub Pages | Manuale | `http://vincenzoallocca.dev/` risponde 200: duplicato tecnico per i crawler | Repository → Settings → Pages → spunta "Enforce HTTPS". Verifica: `curl -I http://vincenzoallocca.dev/` deve dare 301 verso https |
| B2 | Correggere il campo **Website** del profilo GitHub | Manuale | Punta a `haste.it/l/vincenzoallocca` (404): il profilo usato in `sameAs` non conferma il sito ufficiale | Profilo GitHub → Edit profile → Website = `https://vincenzoallocca.dev` |
| B3 | Verifica Search Console, invio sitemap, ispezione URL | Manuale | Unico modo per conoscere lo stato reale di indicizzazione | [SEARCH-CONSOLE.md](SEARCH-CONSOLE.md) §1–3 |
| B4 | Fare un push e controllare il primo run del workflow | Manuale | Il workflow è stato testato in locale (stessi comandi), non ancora su GitHub | Dopo il push: tab Actions → "SEO quality" |

## P2

| # | Attività | Tipo | Note |
|---|---|---|---|
| B5 | Ottimizzare le icone PWA (`icon-512.png` 197 KB, `icon-maskable-512.png` 182 KB, `icon-192.png` 34 KB) | Codice | Compressione PNG lossless/quantizzata (es. `oxipng`, `pngquant`) non disponibile nell'ambiente dell'audit. Non incide sul caricamento della pagina |
| B6 | Ridurre il TBT mobile in produzione (220 ms in un run lab) | Codice | Il costo principale è l'avvio della scena WebGL. Già rimandata a interazione/idle; ulteriori riduzioni (es. avviarla solo su desktop) cambiano l'esperienza visiva: decisione del proprietario |
| B7 | Content-Security-Policy via `<meta>` | Codice | GitHub Pages non consente header. Con script inline servono hash `sha256-…` da ricalcolare a ogni modifica: farlo solo insieme a un controllo automatico in `seo-check.mjs` |
| B8 | Frecce sinistra/destra che cambiano scheda a livello di pagina | Codice | Valutare di limitarle al focus dentro `main`/`nav` per non interferire con lo scorrimento orizzontale da tastiera |
| B9 | Cache più lunga per font e immagini | Manuale/infra | Max-age 600 s è fisso su GitHub Pages; serve una CDN davanti (es. Cloudflare in proxy), cioè una modifica DNS da valutare |

## P3

| # | Attività | Tipo | Note |
|---|---|---|---|
| B10 | Rendere `/progetti/` indicizzabile | Codice | Quando ci saranno almeno 2–3 casi studio con descrizioni proprie; poi aggiungerla alla sitemap |
| B11 | Secondo caso studio | Contenuto | Solo con materiale reale e verificabile (codice pubblico, scelte tecniche documentate) |
| B12 | Contenuto su IA applicata allo sviluppo | Contenuto | Oggi l'unico fatto verificabile è l'endpoint MCP di HASTE (già nel caso studio). Una pagina dedicata ha senso solo con esperienza o progetto originale |
| B13 | Profilo LinkedIn in `sameAs` | Manuale + Codice | Solo se esiste ed è pubblico; aggiungere anche il link visibile in Contatti |
| B14 | Versione inglese | Codice + Contenuto | Solo con un obiettivo concreto. Progetto: `/en/` e `/en/projects/haste/`, `hreflang` it/en reciproci + `x-default` verso `/`, canonical per lingua, sitemap con `xhtml:link`, `og:locale:alternate`, selettore lingua, traduzione scritta a mano |
| B15 | Rivedere la keyword map con dati reali | Manuale | Dopo 4–8 settimane di dati Search Console |
| B16 | Immagine Open Graph dedicata al caso studio | Contenuto | Oggi riusa l'immagine del profilo |
