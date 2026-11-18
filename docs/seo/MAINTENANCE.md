# Manutenzione SEO

## Controlli automatici (GitHub Actions)

Il workflow [`.github/workflows/seo-quality.yml`](../../.github/workflows/seo-quality.yml) gira a
ogni push su `main`, su ogni pull request, ogni lunedì alle 06:00 UTC e su richiesta manuale.
Non pubblica nulla: il deploy resta quello di GitHub Pages dal branch `main`.

| Job | Cosa controlla | Esito in caso di problema |
|---|---|---|
| SEO statico e HTML | `scripts/seo-check.mjs` (title, description, canonical, og:url, H1, alt, lang, JSON-LD valido e coerente tra pagine, `@id` risolti, nomi visibili, duplicati, link e ancore interne, risorse, sitemap, robots) + `html-validate` | **Bloccante** |
| SEO statico e HTML → "Sitemap aggiornata" | La sitemap rigenerata coincide con quella committata | Avviso |
| Link esterni | `lychee` su tutte le pagine e su `llms.txt` (esclusi social che bloccano i bot) | Avviso |
| Lighthouse CI | 3 run mobile per `/` e `/progetti/haste/`; SEO = 100 e Accessibility ≥ 95 e CLS ≤ 0,1 **bloccanti**; Performance ≥ 90, Best Practices ≥ 95, LCP ≤ 2,5 s, TBT ≤ 300 ms, peso JS/totale come avvisi | Misto |

I report Lighthouse sono scaricabili come artifact `lighthouse-report` per 14 giorni. Non vengono
caricati su servizi esterni.

## Comandi locali

```bash
node scripts/seo-check.mjs
```

```bash
node scripts/seo-check.mjs --write-sitemap
```

```bash
npx --yes html-validate@11.21.1 --config .github/htmlvalidate.json index.html 404.html "progetti/**/*.html"
```

```bash
npx --yes @lhci/cli@0.16.1 autorun --config=.github/lighthouserc.json
```

## Quando modifichi il sito

| Modifica | Cosa fare |
|---|---|
| Testo della home o del caso studio | Aggiornare `dateModified` nel JSON-LD della pagina; rigenerare la sitemap; se cambiano fatti, aggiornare `llms.txt` |
| Nuova pagina | Seguire la checklist in [STRATEGY.md §7](STRATEGY.md#7-strategia-editoriale); usare percorsi assoluti (`/assets/…`) e `assets/css/pagina.css`; rigenerare la sitemap |
| Nuovo profilo social | Aggiungerlo a `sameAs` **e** come `<link rel="me">` solo se è autentico e linkato visibilmente |
| Ruolo/biografia | Cambiare in modo coerente: `<title>`, description, `og:*`, `twitter:*`, sottotitolo, `jobTitle`/`description` del Person, testo JS che aggiorna `document.title`, `llms.txt`, `site.webmanifest`, bio GitHub |
| Pagina da togliere dall'indice | Usare `<meta name="robots" content="noindex">` e lasciarla scansionabile; **non** usare `robots.txt` per rimuovere URL dall'indice |
| Pagina eliminata | Lasciare che risponda 404 (GitHub Pages non supporta redirect 301 lato server); se esiste un sostituto, linkarlo dalla 404 |

## Checklist periodica

**Mensile (10 minuti)**

- [ ] Ultimo run del workflow verde; leggere gli avvisi.
- [ ] Search Console → Pagine: le URL della sitemap sono indicizzate?
- [ ] Search Console → Sicurezza e azioni manuali: vuoto.
- [ ] `https://vincenzoallocca.dev/` e `/progetti/haste/` rispondono 200; `http://` reindirizza a
      `https://` (dopo l'attivazione di "Enforce HTTPS").

**Trimestrale**

- [ ] Report Prestazioni: query, impression, CTR; aggiornare la keyword map.
- [ ] Rich Results Test su entrambe le pagine.
- [ ] Rileggere i fatti del caso studio HASTE (stato pre-lancio, sezioni del sito, stack).
- [ ] Profili `sameAs` ancora attivi e con lo stesso nome.

**Annuale**

- [ ] Aggiornare le versioni fissate nel workflow (`actions/*`, `lychee-action`, `html-validate`,
      `@lhci/cli`).
- [ ] Rivedere [BACKLOG.md](BACKLOG.md).
