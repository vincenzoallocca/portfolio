# Strategia SEO — vincenzoallocca.dev

## 1. Obiettivo realistico

Il sito è il riferimento ufficiale per una persona. La ricerca più importante è **navigazionale**:
chi cerca "Vincenzo Allocca" deve trovare questo sito, con un'identità chiara e coerente con
GitHub, HASTE e i profili social. Il secondo obiettivo è dare a chi arriva da HASTE (o lo cerca)
una pagina che spieghi in modo concreto cosa ha fatto Vincenzo nel progetto.

Il sito **non** è pensato per posizionarsi su ricerche generiche e molto competitive come
"sviluppatore web" o "full-stack developer": con 1–2 pagine e un dominio giovane non è un obiettivo
credibile, e inseguirlo produrrebbe contenuti di riempimento.

Google decide in autonomia scansione, indicizzazione e ranking: nessuna di queste scelte garantisce
un risultato.

## 2. Dati disponibili e non disponibili

| Dato | Disponibile? |
|---|---|
| Volumi di ricerca, difficoltà, CPC | **Parziale** (OpenSEO, 19/11/2026): le query sul nome sono sotto la soglia dei fornitori; vedi [REPORT-2026-11-19.md](REPORT-2026-11-19.md) §G |
| Impression, clic, CTR, posizioni | **No** (nessun accesso a Search Console) |
| Stato di indicizzazione | **No** (richiede Search Console → Ispezione URL) |
| Contenuti e fatti verificabili | Sì (repository, GitHub, haste.it) |

Le priorità sotto sono quindi basate su **intento di ricerca e pertinenza**, non su volumi.
Le SERP del 19/11/2026 mostrano che sul nome domina un omonimo (docente di geologia alla Federico II):
la disambiguazione dell'entità è parte della strategia.
Vanno riviste dopo 4–8 settimane di dati Search Console (report Prestazioni → Query).

## 3. Decisione architetturale

### Valutazione delle pagine proposte

| URL proposto | Intento distinto? | Contenuto reale sufficiente? | Decisione |
|---|---|---|---|
| `/` | Sì: navigazionale sul nome | Sì | **Mantenuta** come hub (ProfilePage) |
| `/chi-sono/` | No: coincide con l'intento della home | Duplicherebbe la scheda "Chi sono" | **Non creata** (cannibalizzazione) |
| `/progetti/` | Debole: 1 caso studio + 1 progetto scolastico | No | **Creata come pagina di navigazione `noindex,follow`**, genitore di `/progetti/haste/` |
| `/progetti/haste/` | Sì: "Vincenzo Allocca HASTE", "HASTE Collective" + tecnologia | Sì, con fatti verificabili | **Creata e indicizzabile** |
| `/competenze/` | No: elenco di tecnologie senza profondità propria | No | **Non creata** (pagina sottile) |
| `/intelligenza-artificiale/` | Potenziale, ma oggi non c'è contenuto originale verificabile oltre all'integrazione MCP di HASTE | No | **Non creata**; l'argomento è trattato nel caso studio. Rivalutare con un progetto o articolo reale |
| `/formazione/` | No | No (2 voci + 2 attività) | **Non creata** |
| `/contatti/` | No | No | **Non creata**; resta la scheda `#contatti` |

### Perché restano le schede con hash in home

I frammenti `#about`, `#impegno`, `#contatti` non sono URL distinti per Google, ma tutto il loro
testo è nell'HTML iniziale e viene indicizzato come parte della home. Per un profilo personale
questo concentra i segnali su un solo URL forte, che è ciò che serve per la ricerca sul nome.
Separarli in pagine diverse creerebbe pagine sottili in competizione con la home.

### Gerarchia e collegamenti interni

```
/                        ProfilePage (Person) — indicizzabile
├── /progetti/           pagina di navigazione — noindex,follow
│   └── /progetti/haste/ caso studio (WebPage + SoftwareSourceCode) — indicizzabile
└── /404.html            noindex
```

- Home → caso studio: pulsante "Caso studio: come è costruito HASTE" nella card HASTE.
- Caso studio → home: logo/nome, breadcrumb, footer (Profilo, Progetti, Contatti).
- Breadcrumb visibile e `BreadcrumbList` sul caso studio: Home › Progetti › HASTE Collective.
- URL in minuscolo, senza estensione, con slash finale (comportamento nativo di GitHub Pages
  per `cartella/index.html`).

### Quando aggiungere nuove pagine

Una nuova pagina si aggiunge solo se ha **un intento distinto e contenuto originale che non
esiste già in home**. Esempi validi: un secondo caso studio con dettagli tecnici reali; un
articolo tecnico originale. Quando i casi studio saranno almeno 2–3, `/progetti/` può diventare
indicizzabile con descrizioni proprie (vedi [BACKLOG.md](BACKLOG.md)).

## 4. Keyword map

Le query sono **ipotesi di intento**, non keyword con volumi verificati.

| Gruppo di ricerca | Intento | Pagina | Elementi on-page |
|---|---|---|---|
| vincenzo allocca · vincenzo allocca portfolio · vincenzoallocca | Navigazionale | `/` | Title, H1 "Vincenzo Allocca", Person JSON-LD, `sameAs`, `rel="me"` |
| vincenzo allocca sviluppatore · vincenzo allocca developer · vincenzo allocca full stack | Navigazionale + qualifica | `/` | Description e lead ("sviluppatore full-stack"), scheda "Chi sono", Tech stack |
| vincenzo allocca digital entrepreneur | Navigazionale + ruolo | `/` | Title, sottotitolo, `jobTitle` |
| vincenzo allocca haste · fondatore haste · haste collective fondatore | Navigazionale su progetto | `/progetti/haste/` (secondaria: `/`) | H1 "HASTE Collective", sezione "Il mio ruolo", Organization `founder` |
| haste collective tecnologia · haste.it cloudflare · status page cloudflare workers d1 | Informativo/tecnico, nicchia | `/progetti/haste/` | Sezione "Architettura e scelte tecniche", SoftwareSourceCode |
| vincenzo allocca federico ii · vincenzo allocca ingegneria informatica | Navigazionale + formazione | `/` | Scheda Formazione, `affiliation`, `hasCredential` |
| vincenzo allocca marigliano · fridays for future marigliano · ecogreen marigliano | Navigazionale/locale | `/` (scheda Impegno) | H2 dedicati per ogni iniziativa |
| sviluppatore web · full-stack developer · progetti software | Generico, alta concorrenza | Nessuna pagina dedicata | Termini usati in modo naturale; non perseguiti come obiettivo |
| sviluppo web cloudflare · intelligenza artificiale sviluppo software | Informativo, alta concorrenza | Nessuna pagina oggi | Possibili articoli futuri con contenuto originale (backlog) |

Regola anti-cannibalizzazione: la home possiede le query sul **nome**; il caso studio possiede le
query su **HASTE + aspetti tecnici**. La home cita HASTE ma rimanda al caso studio per i dettagli.

## 5. Entity SEO e personal branding

Segnali d'identità da tenere allineati (stesso nome, stessa descrizione sintetica):

| Segnale | Stato |
|---|---|
| Nome visibile e `Person.name` | "Vincenzo Allocca" ovunque |
| Ruolo principale | "Digital Entrepreneur" (scelta del proprietario), con "sviluppatore full-stack" come qualifica |
| `sameAs` / `rel="me"` | GitHub, Instagram, Facebook (solo profili autentici già linkati dal sito) |
| GitHub → sito | **Da sistemare (manuale)**: il campo "website" del profilo GitHub punta a `haste.it/l/vincenzoallocca`, che risponde 404 |
| HASTE → persona | haste.it elenca "V. Allocca – Direzione editoriale" tra i fondatori: coerente con il caso studio |
| Nome dell'organizzazione | "HASTE Collective" (alternateName "HASTE"), come su haste.it |

Non sono stati aggiunti profili non verificati (es. LinkedIn: nessun URL presente nel repository
né nei profili consultati).

## 6. Multilingua

**Decisione: nessuna versione inglese per ora.** Il pubblico attuale (HASTE, impegno civico in
Campania, università a Napoli) è italiano e tutte le fonti sono in italiano. Una traduzione
servirebbe solo con un obiettivo concreto (es. candidature internazionali) e andrebbe mantenuta
allineata a ogni modifica. Se diventerà utile, il progetto è descritto in
[BACKLOG.md](BACKLOG.md): URL `/en/`, `hreflang` reciproci + `x-default`, canonical per lingua,
sitemap con alternates, traduzione scritta a mano.

## 7. Strategia editoriale

1. Aggiornare il caso studio quando HASTE esce dal pre-lancio (data, cosa è cambiato).
2. Aggiungere un secondo caso studio solo con materiale reale (codice pubblico, decisioni
   tecniche spiegate, problemi risolti).
3. Ogni nuova pagina: title ≤ 60 caratteri, description 70–160, un H1, canonical, JSON-LD
   coerente, link dalla home o da `/progetti/`, aggiunta alla sitemap con
   `node scripts/seo-check.mjs --write-sitemap`.
