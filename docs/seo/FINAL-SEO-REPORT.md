# Report SEO finale — vincenzoallocca.dev

Data: 19 novembre 2026, aggiornato in serata. Raccoglie:
- il lavoro del 18/11 ([AUDIT.md](AUDIT.md), [IMPLEMENTATION.md](IMPLEMENTATION.md));
- il lavoro del 19/11 ([REPORT-2026-11-19.md](REPORT-2026-11-19.md));
- il completamento con le operazioni su Google, GitHub, Cloudflare e HASTE.

**Stato del codice:** le modifiche ai file del portfolio sono in un commit locale su `main`, **non pubblicato** (nessun push).
Punto di ripristino: tag `pre-seo-2026-11-19` (commit `f105046`, uguale a `origin/main`).
Le modifiche al codice di haste.it sono in un commit locale separato nel repository `haste-git-2` (branch `audit-2026-11-18`), non pubblicato né deployato.
Le operazioni sulle piattaforme esterne (sezione 4bis) sono invece **già attive**.

---

## 1. Stato iniziale (prima del 18/11)

- Una sola pagina (home a schede) e nessun caso studio.
- Nessuna CI.
- Report interni pubblicati alla root.
- Nessun collegamento verificabile tra persona, GitHub e HASTE.
- Il sito non era mai stato aggiunto a Search Console.

Dettagli in [AUDIT.md](AUDIT.md).

## 2. Stato finale

| Area | Stato |
|---|---|
| Pagine indicizzabili | 3: `/`, `/progetti/haste/`, `/progetti/nemici-miei/` (in sitemap). `/progetti/` è `noindex,follow` di proposito; `404.html` è `noindex` |
| Metadata | Title, description, canonical, Open Graph e Twitter Card unici su ogni pagina indicizzabile; nuova immagine OG della home |
| Dati strutturati | Grafo con `Person` stabile `https://vincenzoallocca.dev/#person`, richiamato da tutte le pagine e da haste.it |
| HTTPS | Forzato su GitHub Pages: http → 301 → https, verificato |
| Search Console | Proprietà Dominio `sc-domain:vincenzoallocca.dev` verificata. Sitemap inviata e letta (3 URL, 0 errori). Indicizzazione richiesta per `/` e `/progetti/haste/` |
| Indicizzazione reale | **Non ancora indicizzato.** Prima di oggi Google non conosceva il sito; ora è in coda di scansione (sezione 10) |

## 3. Problemi individuati

| # | Gravità | Problema | Evidenza | Esito |
|---|---|---|---|---|
| 1 | **Critica** | Google non conosceva nessuna pagina del sito | Ispezione URL via mcp-gsc: le 4 URL erano "URL is unknown to Google", mai scansionate; nessuna sitemap inviata; 0 impression in 90 giorni | Proprietà verificata, sitemap inviata, indicizzazione richiesta |
| 2 | Alta | Stack di HASTE descritto come "Cloudflare Pages, Workers, D1, R2" | Il codice usa un Worker con Workers Static Assets, D1 e **KV**; R2 non è usato perché richiede una carta di pagamento | Corretto |
| 3 | Alta | Il caso studio citava un endpoint MCP di haste.it | `/.well-known/mcp/server-card.json` → 404; `/api/mcp` non è mai esistito | Corretto nel portfolio; su haste.it corretto in locale |
| 4 | Alta | `http://` rispondeva 200 senza redirect | `https_enforced: false` | Corretto: `https_enforced: true`, 301 verificato |
| 5 | Alta | Omonimo docente della stessa università nelle SERP | SERP OpenSEO del 19/11 | Segnali di disambiguazione completati; effetto da misurare dopo l'indicizzazione |
| 6 | Media | Profilo GitHub con nome "Vincenzo" e Website `haste.it/l/vincenzoallocca` (404) | `gh api users/vincenzoallocca` | Corretto |
| 7 | Media | La pagina autore HASTE non collegava il portfolio | HTML di `haste.it/u/vincenzo-allocca` | Corretto: link visibile e `sameAs` |
| 8 | Media | haste.it home: nel JSON-LD c'era solo "V. Allocca" | `worker/src/pages/home.ts` | Corretto in locale, non pubblicato |
| 9 | Bassa | Immagine OG della home con "Digital Entrepreneur" | `assets/og-image.jpg` | Nuova immagine `assets/og-home.jpg` |
| 10 | Bassa | Repository pubblici senza homepage | `gh api` | Corretto |

## 4. Modifiche applicate al codice (locali)

**Identità e disambiguazione (`index.html`)**
- `Person` con:
  - `jobTitle` `["Software Developer", "Digital Entrepreneur"]`;
  - `alternateName` con il nome completo "Vincenzo Cristiano Allocca", già pubblico su haste.it;
  - `disambiguatingDescription`, senza citare altre persone;
  - `sameAs` verso GitHub, la pagina autore HASTE, **ORCID `0009-0002-3926-1948`** (collegato all'account GitHub, registro pubblico "Vincenzo Allocca"), Instagram e Facebook.
- Ruolo principale **Software Developer** in title, description, schede social, sidebar, footer delle sottopagine, manifest e `llms.txt`.
- Link visibile "Profilo autore su HASTE" con `rel="me"`.
- **Immagine Open Graph**:
  - nuova `assets/og-home.jpg` (1200×630, stile del sito), generata da `scripts/og/home.html` con `node scripts/og/render.mjs`;
  - il testo dice "Software Developer e fondatore di HASTE" e Ingegneria Informatica alla Federico II;
  - `og:image`, `twitter:image` e gli alt sono aggiornati;
  - la vecchia `og-image.jpg` resta nel repository ma non è più referenziata.

**Caso studio HASTE (`/progetti/haste/`)**
- Sezione "Il problema", con la migrazione:
  - partenza: VPS con PHP, Nginx e SQLite, più di 200 file PHP;
  - backend riscritto in circa 95 moduli TypeScript;
  - convertitore SQLite → D1;
  - KV al posto di R2.
- Architettura reale; sezione AI senza l'endpoint MCP; immagine OG con le tecnologie corrette.

**haste.it (repository separato, non pubblicato)**
- Fondatore in `home.ts`:
  - `@id` del portfolio;
  - nome completo e `alternateName`;
  - `url`;
  - `sameAs` verso la pagina autore e GitHub.
- Server card MCP inesistente rimossa da 3 file.

**Sicurezza locale**
- `.gitignore`: aggiunta `.claude/`. È la configurazione dell'anteprima locale: resta su disco ma non verrà committata.

## 4bis. Operazioni eseguite su piattaforme esterne (già attive)

| Piattaforma | Operazione | Verifica |
|---|---|---|
| GitHub Pages | Enforce HTTPS attivato (`gh api … pages -F https_enforced=true`) | Certificato "approved" (scade il 2027-02-09); `http://` e `http://www.` → 301 → `https://vincenzoallocca.dev/` |
| GitHub, profilo | Nome "Vincenzo Allocca"; Website `https://vincenzoallocca.dev`; bio "Software Developer \| Computer Engineering student at University of Naples Federico II \| Founder & Developer of HASTE (haste.it)" | `gh api users/vincenzoallocca` restituisce i nuovi valori |
| GitHub, repository | Homepage: `portfolio` → vincenzoallocca.dev; `nemici-miei` → /progetti/nemici-miei/; `haste-status-new` → status.haste.it | Risposta dell'API |
| HASTE, pannello staff | Link "Portfolio" → `https://vincenzoallocca.dev` aggiunto **solo** al profilo di Vincenzo Cristiano Allocca (gli altri 3 link restano invariati) | Pagina pubblica `haste.it/u/vincenzo-allocca`: link visibile presente e `sameAs` include `https://vincenzoallocca.dev/` |
| Google Cloud, progetto "HasteIT" (`liquid-kite-515220-d9`) | Search Console API già abilitata. Configurata la schermata di consenso: app "GSC MCP lettura", tipo Esterno, stato **Test**, norme sui dati utente accettate con l'autorizzazione del proprietario. Utente di prova `vincenzoallocca07@gmail.com`. Creato il client OAuth **Desktop** "mcp-gsc portfolio (sola lettura)" | Nessun progetto duplicato: il progetto non aveva client OAuth |
| Credenziali | JSON scaricato e spostato in `C:\Users\vince\.mcp-gsc\client_secrets.json` (fuori da ogni repository; nessuna copia in Download). Permessi NTFS limitati all'utente `vince`. Il token OAuth è in `C:\Users\vince\AppData\Local\mcp-gsc\mcp-gsc\token.json`, con gli stessi permessi | Contenuto mai mostrato; la scansione dei segreti nel repository trova solo il nome del file nei documenti |
| mcp-gsc | `reauthenticate` completato (consenso nel browser), scope `webmasters.readonly`, `GSC_ALLOW_DESTRUCTIVE=false` | `list_properties` risponde |
| Cloudflare DNS, zona `vincenzoallocca.dev` | **Aggiunto un solo record TXT** `@` `google-site-verification=…`. I 9 record esistenti (A/AAAA di GitHub Pages, CNAME `www`) non sono stati toccati. Necessario perché la proprietà non esisteva e gli altri metodi di verifica richiedevano un deploy | Visibile dal nameserver autorevole e da 8.8.8.8 |
| Search Console | Proprietà Dominio `sc-domain:vincenzoallocca.dev` aggiunta e verificata ("Provider del nome di dominio"). Ho scelto la verifica manuale con TXT e non l'opzione automatica Cloudflare, che avrebbe dato a Google l'accesso all'account DNS. Sitemap inviata. Indicizzazione richiesta per `/` e `/progetti/haste/` (approvato dal proprietario) | Sitemap: "Riuscita", 3 URL, 0 errori. Indicizzazione: "L'URL è stato aggiunto a una coda di scansione prioritaria" (entrambe) |

**Attenzione:** il record TXT va lasciato nel DNS, altrimenti la proprietà perde la verifica.

## 5. File modificati

Portfolio:
- `index.html`
- `progetti/haste/index.html`
- `progetti/index.html`
- `progetti/nemici-miei/index.html`
- `llms.txt`
- `sitemap.xml`
- `assets/site.webmanifest`
- `assets/og-haste.jpg`
- `scripts/og/haste.html`
- `scripts/og/render.mjs`
- `.gitignore`
- `docs/seo/STRATEGY.md`
- nuovi: `assets/og-home.jpg`, `scripts/og/home.html`, `docs/seo/REPORT-2026-11-19.md`, `docs/seo/FINAL-SEO-REPORT.md`
- `.claude/launch.json`: locale, ignorato da git

haste.it:
- `worker/src/pages/home.ts`
- `worker/src/templates/chrome.ts`
- `worker/src/content/api-catalog.json`
- `.well-known/agent-skills/index.json`

## 6. Pagine SEO migliorate

| Pagina | Title | Desc. | Parole |
|---|---|---:|---:|
| `/` | Vincenzo Allocca – Software Developer e fondatore di HASTE (58) | 156 | 528 |
| `/progetti/haste/` | HASTE Collective: caso studio tecnico \| Vincenzo Allocca (56) | 153 | 934 (era 449) |
| `/progetti/nemici-miei/` | Nemici Miei: gioca nel browser \| Vincenzo Allocca (49) | 128 | 351 |

## 7. Dati strutturati

| Pagina | Tipi |
|---|---|
| `/` | `WebSite`, `ProfilePage`, `Person` (`#person`), `HighSchool`, `Organization` HASTE (`founder` → `#person`) |
| `/progetti/haste/` | `WebPage`, `BreadcrumbList`, `Person` (rimando), `Organization`, `SoftwareSourceCode`; `mentions` → `WebSite` di haste.it |
| `/progetti/nemici-miei/` | `WebPage`, `BreadcrumbList`, `Person` (rimando), `VideoGame`, `SoftwareSourceCode` |
| haste.it home (locale) | `Organization.founder` → stesso `@id` del portfolio |
| haste.it/u/vincenzo-allocca (live) | `ProfilePage` → `Person` con `sameAs` che include il portfolio |

## 8. Risultati dei test (19/11/2026)

| Test | Risultato |
|---|---|
| `node scripts/seo-check.mjs --write-sitemap` | 0 errori, 0 avvisi |
| `html-validate@11.21.1` (configurazione della CI) | exit 0 |
| JSON-LD | Validi su tutte le pagine; `Person` con lo stesso `@id` ovunque |
| Claude SEO `page_checks` (45 controlli) | 0 problemi sulle 3 pagine indicizzabili (home ricontrollata dopo la nuova OG) |
| Link interni / esterni | 0 rotti / tutti 200 (302 attesi per status.haste.it e unina.it; 403 di gnu.org ai bot) |
| Browser, desktop e 375 px | Nessun errore in console, nessuna immagine rotta, nessuno scroll orizzontale |
| Lighthouse 12, locale | Home mobile: mediana di 3 run **99** (LCP 1,96 s, TBT 8–16 ms, CLS 0). Altre pagine 99–100. Accessibilità, Best Practices e SEO 100 |
| Redirect in produzione | `http://` e `http://www.` → 301 → https; `www` → apex 301; `/progetti` → `/progetti/` 301 |
| haste.it | `worker:typecheck` exit 0; `worker:test` 62/62 |
| Immagine OG servita | **Non verificabile prima del push**: in produzione `og-home.jpg` risponde 404 e viene servita ancora la vecchia `og-image.jpg` |

## 9. Dati GSC realmente disponibili (letti il 19/11 con mcp-gsc e con l'interfaccia)

| Dato | Valore |
|---|---|
| Proprietà accessibili | `sc-domain:vincenzoallocca.dev` (siteOwner), `sc-domain:haste.it` (siteOwner) |
| Query, impression, clic, CTR, posizione (90 giorni) | **Nessun dato**: il sito non è mai apparso nei risultati |
| Sitemap | `https://vincenzoallocca.dev/sitemap.xml`, inviata e scaricata il 19/11 21:21, 3 URL, 0 errori, 0 avvisi |
| Ispezione URL (prima dell'invio) | `/`, `/progetti/`, `/progetti/haste/`, `/progetti/nemici-miei/`: "URL is unknown to Google", mai scansionate |
| Ispezione URL (dopo l'invio della sitemap) | `/` e `/progetti/haste/`: "Rilevata, ma attualmente non indicizzata"; indicizzazione richiesta |
| Canonical scelto da Google | Non ancora disponibile (pagine mai scansionate) |
| Core Web Vitals (dati utente reali) | Non disponibili (nessun traffico) |
| Azioni manuali | Nessun problema rilevato |
| Problemi di sicurezza | Nessun problema rilevato |

## 10. Stato dell'indicizzazione

Il problema principale era **la scoperta (classe A)**: Google non conosceva il sito. Non era un
problema di contenuto, di canonicalizzazione o di omonimia. Ora:
- la sitemap è stata letta;
- le pagine sono "rilevate";
- le due principali sono in coda di scansione prioritaria.

L'indicizzazione effettiva **non è garantita né verificata**: va ricontrollata con
`inspect_url_enhanced` nei prossimi giorni.

## 11. Stato del problema di omonimia

**Parzialmente risolto**, ora con tutti i segnali esterni allineati:
- GitHub: nome completo e sito;
- HASTE: pagina autore con link e `sameAs`;
- ORCID come identificatore univoco;
- dati strutturati coerenti.

L'effetto si potrà misurare solo dopo l'indicizzazione.

## 12. Collegamento portfolio ↔ HASTE

| Direzione | Stato |
|---|---|
| Portfolio → haste.it e pagina autore | Completato (locale, da pubblicare) |
| Pagina autore HASTE → portfolio | **Completato e live** |
| haste.it home → portfolio (`founder`) | Implementato in locale, non pubblicato |

## 13. Attività ancora necessarie (richiedono il proprietario)

1. **Commit e push del portfolio**: senza il push, il sito live non ha nuova OG, ruolo aggiornato, ORCID e caso studio esteso.
2. **Commit e deploy di haste.it** per i 4 file elencati in sezione 5.
3. Dopo il push: ripetere la richiesta di indicizzazione per `/` e `/progetti/haste/`, così Google scansiona la nuova versione.
4. **Facoltativo**:
   - aggiungere `https://vincenzoallocca.dev` tra i siti web del record ORCID (serve l'accesso a orcid.org);
   - fissare i repository in evidenza sul profilo GitHub;
   - aggiungere il link al portfolio nel README del profilo, che è un commit.
5. Se la proprietà Search Console dovesse essere usata da un altro account Google, aggiungerlo tra gli utenti di prova dell'app OAuth.

## 14. Problemi non risolvibili automaticamente

| Problema | Motivo |
|---|---|
| Header di sicurezza e cache oltre 10 minuti | Limite di GitHub Pages; il TLD `.dev` è comunque nella lista HSTS preload |
| `/index.html` duplicato tecnico con stato 200 | Limite di GitHub Pages; lo gestisce il canonical |
| La richiesta parlava di "Cloudflare Pages … e R2" | Il codice dimostra che haste.it non usa né Pages né R2; il caso studio descrive ciò che è vero |
| Tempi e posizionamento in Google | Dipendono da Google |

## 15. Crediti OpenSEO

| Data | Operazione | Crediti |
|---|---|---:|
| 19/11 | Site audit | 0 |
| 19/11 | 6 SERP sul nome | 30 |
| 19/11 | Metriche per 14 keyword | 16 |
| 19/11 (sera) | Nessuna operazione a pagamento | 0 |
| **Totale** | | **46** (488 → 442) |

## 16. Prossime priorità

1. Push del portfolio e deploy di haste.it, poi nuova richiesta di indicizzazione.
2. Tra 3 e 7 giorni: `batch_url_inspection` delle 3 pagine (gratuito) per confermare l'indicizzazione e il canonical scelto da Google.
3. Tra 4 e 6 settimane: report Prestazioni di GSC (query reali), poi le stesse 6 SERP con OpenSEO (circa 30 crediti) per misurare l'omonimia.
4. Secondo caso studio solo con materiale pubblico.

---

## Checklist finale

| Attività | Stato |
|---|---|
| Recupero del lavoro precedente, nessuna sovrascrittura | COMPLETATO |
| Claude SEO, uv, mcp-gsc installati | COMPLETATO |
| Credenziali OAuth create e protette | COMPLETATO |
| Autenticazione mcp-gsc (sola lettura) | COMPLETATO |
| Proprietà Search Console verificata | COMPLETATO |
| Sitemap inviata e letta | COMPLETATO |
| Richiesta di indicizzazione `/` e `/progetti/haste/` | COMPLETATO |
| Pagine effettivamente indicizzate | PARZIALMENTE COMPLETATO (in coda; da ricontrollare) |
| Query, impression, CTR, posizioni | BLOCCATO (nessun dato finché il sito non è indicizzato) |
| Redirect HTTP → HTTPS | COMPLETATO (verificato in produzione) |
| Profilo GitHub (nome, sito, bio) e homepage dei repository | COMPLETATO |
| Link al portfolio sulla pagina autore HASTE | COMPLETATO (verificato sulla pagina pubblica) |
| Immagine OG della home aggiornata | PARZIALMENTE COMPLETATO (pronta in locale; servita dopo il push) |
| Metadata, HTML, JSON-LD, robots, sitemap, canonical, 404 | COMPLETATO |
| Disambiguazione dall'omonimo | PARZIALMENTE COMPLETATO (segnali completi; effetto da misurare) |
| Caso studio HASTE | COMPLETATO (da pubblicare) |
| Collegamento haste.it home → portfolio | PARZIALMENTE COMPLETATO (codice pronto, deploy da fare) |
| GEO/AEO (`llms.txt`, contenuti citabili, fonti) | COMPLETATO |
| Performance | COMPLETATO (dati di laboratorio) |
| Nessun segreto nel repository | COMPLETATO |
| Header di sicurezza e cache | NON NECESSARIO / non realizzabile su GitHub Pages |
| Versione inglese, nuove pagine sottili | NON NECESSARIO |
| Commit, push, deploy | BLOCCATO (richiedono l'autorizzazione del proprietario) |
