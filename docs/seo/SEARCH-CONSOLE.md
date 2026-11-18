# Google Search Console — procedure operative

Queste attività richiedono l'account Google del proprietario. Nessuna è stata eseguita durante
l'audit: non c'è accesso autorizzato a Search Console né alle API Google.

## 1. Verifica della proprietà (una tantum)

Consigliata la **proprietà Dominio** (`vincenzoallocca.dev`): copre http/https e tutti i
sottodomini.

1. Apri <https://search.google.com/search-console> → "Aggiungi proprietà" → **Dominio** →
   `vincenzoallocca.dev`.
2. Google mostra un record **TXT** (`google-site-verification=…`).
3. Aggiungilo nel pannello DNS del registrar del dominio (record TXT sulla radice `@`).
4. Torna in Search Console → "Verifica". La propagazione DNS può richiedere da minuti a ore.

Alternativa senza DNS: proprietà **Prefisso URL** `https://vincenzoallocca.dev/` con file HTML di
verifica da committare nella root del repository (Google fornisce il file). Non rimuovere poi il
file, altrimenti la verifica decade.

## 2. Invio della sitemap

1. Search Console → **Sitemap** → inserisci `sitemap.xml` → Invia.
2. Atteso: stato "Operazione riuscita" e 2 URL rilevati (`/`, `/progetti/haste/`).
3. La sitemap è dichiarata anche in `robots.txt`, quindi Google la trova comunque.

## 3. Ispezione URL e richiesta di indicizzazione

Per ciascun URL della sitemap:

1. Barra in alto → incolla l'URL (es. `https://vincenzoallocca.dev/progetti/haste/`).
2. Leggi "L'URL è su Google" / "L'URL non è su Google".
3. **Testa URL pubblicato** → "Visualizza pagina sottoposta a test" → controlla screenshot e HTML
   renderizzato (devono contenere il testo delle schede e del caso studio).
4. Se non è indicizzato: **Richiedi indicizzazione** (una volta; ripetere non accelera).

Solo questo strumento può confermare che una pagina è indicizzata. Una ricerca `site:` è
indicativa ma non affidabile.

## 4. Canonical scelto da Google

Ispezione URL → sezione "Indicizzazione delle pagine":

- "Canonical dichiarato dall'utente" deve coincidere con "Canonical selezionato da Google".
- Ispeziona anche `http://vincenzoallocca.dev/` e `https://vincenzoallocca.dev/index.html`: devono
  risultare come pagine alternative con canonical `https://vincenzoallocca.dev/`.

## 5. Report da controllare

| Report | Cosa guardare | Frequenza |
|---|---|---|
| **Indicizzazione → Pagine** | Le 2 URL in "Indicizzate"; motivi di esclusione per le altre (attese: `/progetti/` "Esclusa dal tag noindex", varianti http "Pagina alternativa con tag canonical appropriato") | Mensile |
| **Prestazioni** | Query che portano impression: verifica la keyword map in [STRATEGY.md](STRATEGY.md) | Mensile, dopo 4–8 settimane di dati |
| **Esperienza → Core Web Vitals** | Probabilmente "Dati insufficienti" (traffico basso). In quel caso usare i dati di laboratorio in CI | Trimestrale |
| **Miglioramenti → Breadcrumb / Profile page** | Errori o avvisi sui dati strutturati | Dopo ogni modifica al JSON-LD |
| **Sicurezza e azioni manuali** | Deve essere vuoto | Mensile |

## 6. Test dei dati strutturati

1. <https://search.google.com/test/rich-results> → URL `https://vincenzoallocca.dev/` →
   atteso: **Profile page** rilevata, nessun errore.
2. Stesso test su `/progetti/haste/` → atteso: **Breadcrumb** valido.
3. <https://validator.schema.org/> sugli stessi URL per la validazione schema.org completa
   (include i tipi non coperti dai risultati avanzati, es. `SoftwareSourceCode`).

## 7. Bing e IndexNow

La chiave IndexNow è già pubblicata (`/28d9cb950fd348ee86a7fc44c1a8a886.txt`). Dopo ogni modifica
importante si può notificare Bing/Yandex. Verifica della proprietà in Bing Webmaster Tools:
"Importa da Google Search Console" (più rapido) oppure record DNS.

## 8. Checklist del proprietario (in ordine)

- [ ] GitHub → repository `portfolio` → Settings → Pages → attivare **Enforce HTTPS**
      (oggi `http://vincenzoallocca.dev/` risponde 200 senza redirect).
- [ ] GitHub → profilo → Edit profile → campo **Website**: sostituire
      `https://haste.it/l/vincenzoallocca` (404) con `https://vincenzoallocca.dev`.
- [ ] Verificare la proprietà Dominio in Search Console (§1).
- [ ] Inviare la sitemap (§2).
- [ ] Ispezionare e, se serve, richiedere l'indicizzazione di `/` e `/progetti/haste/` (§3).
- [ ] Eseguire il Rich Results Test sulle 2 pagine (§6).
- [ ] Dopo 4–8 settimane: rivedere il report Prestazioni e aggiornare la keyword map.
