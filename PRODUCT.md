# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confermati dal proprietario (23/11/2026), tutti rilevanti:

- **Recruiter e aziende**: valutano Vincenzo Allocca per stage, lavoro o opportunità universitarie come software developer. Vogliono capire in pochi secondi cosa sa fare e vedere prove concrete.
- **Collaboratori e clienti**: persone che vogliono realizzare un progetto web o chiedere sviluppo o comunicazione digitale. Cercano un modo diretto per scrivergli.
- **Comunità di HASTE**: lettori, membri e stampa che arrivano dal collettivo (link dalla pagina autore su haste.it) e vogliono sapere chi c'è dietro la piattaforma.
- **Chi cerca il nome**: amici, scuola, istituzioni locali, chi lo incontra nell'impegno civico. Devono riconoscerlo e distinguerlo dagli omonimi (su Google il nome è conteso da un docente omonimo della stessa università).

## Product Purpose

Portfolio personale e riferimento ufficiale online di Vincenzo Allocca (nome completo Vincenzo Cristiano Allocca): software developer full-stack, studente di Ingegneria Informatica alla Federico II di Napoli, fondatore e sviluppatore di HASTE Collective.

Il sito fa il suo lavoro quando (tutti confermati):

- qualcuno lo **contatta** per lavoro, stage o collaborazioni (email, WhatsApp, social);
- il visitatore **capisce HASTE**: cosa ha costruito e come (caso studio tecnico);
- è **riconosciuto online** come la persona giusta, separata dagli omonimi;
- il visitatore lo **sostiene e condivide** con il pulsante BUMP!.

## Positioning

Uno studente che ha già portato in produzione una piattaforma reale: HASTE, migrata da PHP/VPS a un unico Cloudflare Worker con D1 e KV, con test, dati aperti e sicurezza verificabili. Unisce sviluppo software e impegno civico nel territorio (Marigliano, tratta EAV Baiano–Napoli): la tecnologia "ha senso quando incide positivamente sulla realtà" (dal testo del sito).

## Operating Context

- Lingua: italiano (`lang="it"`); alcuni articoli tecnici esterni sono in inglese e lo dichiarano.
- Si consulta da telefono quanto da computer: molti visitatori arrivano da Instagram, WhatsApp e storie con link; la home è progettata mobile-first per le schede.
- Pagine: home a quattro schede via hash (`#home`, `#about`, `#impegno`, `#contatti`), `/progetti/` (navigazione, `noindex`), `/progetti/haste/` (caso studio), `/progetti/nemici-miei/` (gioco giocabile nel browser), `404.html`.
- Identità collegata: GitHub `vincenzoallocca`, ORCID 0009-0002-3926-1948, profilo autore su `haste.it/u/vincenzo-allocca`, Instagram, Facebook, LinkedIn.

## Capabilities and Constraints

- **Stack**: sito statico scritto a mano (HTML, CSS e JS inline nella home, `assets/css/pagina.css` per le pagine interne), nessun framework né build step, pubblicato con GitHub Pages dal branch `main` (dominio `vincenzoallocca.dev`, HTTPS forzato).
- **Scena 3D**: motore WebGL procedurale fatto a mano nella home (sfere, toro, nodo di vetro), con fallback CSS e rispetto di `prefers-reduced-motion`.
- **BUMP!**: un voto per dispositivo, contato solo da un Cloudflare Worker (`bump/`, su `bump.vincenzoallocca.dev`) con D1; deduplicazione con cookie firmato, vincolo UNIQUE e limiti per IP. Il Worker si pubblica a parte (`npm run deploy` in `bump/`).
- **Statistiche**: GoatCounter, senza cookie; i bump non passano da GoatCounter.
- **Qualità**: `scripts/seo-check.mjs` e html-validate in CI (`.github/workflows/seo-quality.yml`), test del Worker in CI (`bump.yml`).
- Il piano Cloudflare Free dell'account ha già esaurito i 5 cron trigger (usati da haste.it).

## Brand Commitments

Vincoli confermati dal proprietario come vincolanti:

- palette violet/cyan del sito, font Mona Sans, superfici in vetro (glassmorphism), sfere decorative 3D: sono l'identità e non vanno sostituite;
- lingua italiana;
- sito statico su GitHub Pages;
- solo fatti veri e verificabili: nessuna esperienza, cifra, recensione, cliente o collaborazione inventata.

Il pulsante BUMP! usa le emoji 🚀 e ❤️ per scelta esplicita del proprietario.

## Evidence on Hand

- Caso studio HASTE con dati tecnici verificati sul codice (`progetti/haste/index.html`).
- Gioco Nemici Miei giocabile (`progetti/nemici-miei/`, versione Rust/WebAssembly) e codice pubblico su GitHub.
- Tre articoli tecnici pubblicati (DEV, Hashnode), linkati dalla home.
- Formazione e riconoscimenti dichiarati dal proprietario: diploma ITIS Ettore Majorana 2026 (90/100), 1° posto PCTO in sviluppo di videogiochi (2025), Model European Parliament (2024).
- Impegno civico con fonte: Direttivo del Circolo PD di Marigliano (La Provincia Online, 19/02/2026), petizione "Senza bus non si studia bene" su haste.it, EcoGreen Marigliano, Fridays for Future Marigliano (2019–2021).
- Immagini: `assets/profilo.webp`, immagini Open Graph in `assets/og-*.jpg`.
- **Assenti**: testimonianze, clienti, metriche d'uso o di traffico pubbliche. Non vanno create.

## Product Principles

1. **Prima la persona, poi i progetti**: chi arriva deve capire in un colpo d'occhio chi è Vincenzo e cosa fa, poi trovare le prove.
2. **Prove, non promesse**: ogni competenza mostrata ha un progetto, un articolo o una fonte che la dimostra.
3. **Contattare dev'essere immediato** da qualunque pagina e dispositivo.
4. **Un'identità sola**: home, pagine progetto, 404 e immagini social parlano lo stesso linguaggio visivo e dicono le stesse cose sulla persona.
5. **Leggero e accessibile**: effetti scenografici solo se non costano prestazioni o accessibilità.

## Accessibility & Inclusion

Obiettivo WCAG 2.2 AA (oggi Lighthouse accessibilità 100 su tutte le pagine): focus visibile, aree di tocco di almeno 44 px, rispetto di `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast`.
