# Abilart Preventivi — GitHub Pages

Generatore frontend-only per i due documenti Abilart:

- **Preventivo / Contratto** — interventi tecnici e servizi.
- **Preventivo Edile** — lavori edili, ristrutturazioni e dettaglio delle lavorazioni.

## Struttura

- `index.html` — interfaccia, moduli, condizioni contrattuali e configurazione delle librerie PDF.
- `styles.css` — interfaccia web e impaginazione A4 del PDF.
- `app.js` — editor, firme, calcoli, tabella lavorazioni, paginazione, link PDF e download.
- `assets/abilart-logo.png` — logo aziendale.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub.
2. Carica tutti i file e la cartella `assets` nella root.
3. Vai in **Settings → Pages**.
4. In **Build and deployment** seleziona **Deploy from a branch**.
5. Seleziona `main` e `/ (root)`.
6. Salva e attendi la pubblicazione.

## Generazione PDF

Il PDF viene generato **interamente nel browser** e scaricato localmente. Il progetto non utilizza un backend e non invia i dati del preventivo a un server Abilart.

Il motore usa:

- `html2canvas 1.4.1`
- `jsPDF 2.5.1`

Le librerie sono caricate da cdnjs con versioni bloccate e Subresource Integrity (SRI). Per la generazione PDF è quindi necessaria una connessione Internet.

Il documento viene composto come un unico flusso verticale A4 a lunghezza variabile e successivamente suddiviso in pagine. Questo evita la perdita di testo nei preventivi lunghi.

## Paginazione e impaginazione

La logica PDF è progettata per:

- mantenere margini A4 sicuri;
- evitare titoli isolati in fondo pagina;
- mantenere insieme box compatti quando entrano nello spazio disponibile;
- lasciare che descrizione e condizioni generali continuino naturalmente sulla pagina successiva;
- evitare, quando possibile, la divisione delle singole righe della tabella;
- mantenere le firme nello stesso blocco;
- agganciare il footer al fondo dell'ultima pagina realmente utilizzata quando lo spazio lo consente;
- creare una nuova pagina solo quando il contenuto non lascia spazio sufficiente per il footer;
- usare una filigrana molto discreta come **background**, sotto il contenuto e non come elemento sovrapposto al testo.

Il footer non viene ripetuto automaticamente su ogni pagina: viene posizionato nell'ultima pagina disponibile, come richiesto.

## Calcoli

### Preventivo / Contratto

- Imponibile = prezzo inserito.
- IVA = imponibile × IVA / 100.
- Totale = imponibile + IVA.
- Saldo = totale − acconto, senza valori negativi.

### Preventivo Edile

- Sconto limitato all'imponibile.
- Imponibile netto = imponibile − sconto.
- IVA = imponibile netto × IVA / 100.
- Totale = imponibile netto + IVA.
- Saldo = totale − acconto, senza valori negativi.
- Ogni riga della tabella = quantità × prezzo unitario.
- Il subtotale della tabella è riportato come dettaglio delle lavorazioni; il riepilogo economico usa il campo imponibile del preventivo per evitare doppi conteggi.

## Formattazione editor

L'editor supporta:

- grassetto;
- sottolineato;
- elenco puntato;
- blu;
- rosso;
- nero;
- rimozione formattazione.

Il contenuto dell'editor viene ripulito prima del rendering PDF: vengono rimossi script, iframe, embed, handler JavaScript e URL non sicuri.

## Link presenti nei PDF

Sono cliccabili, ove presenti:

- telefono Abilart;
- WhatsApp Abilart;
- email Abilart;
- sito `impresaedileabilart.com`;
- sito `idraulicoservizi.com`;
- indirizzo Abilart verso Google Maps;
- indirizzo del cliente verso Google Maps;
- telefono ed email del cliente.

L'apertura del link Google Maps con l'indirizzo del cliente comporta naturalmente la trasmissione dell'indirizzo a Google secondo le condizioni del relativo servizio.

## Privacy e sicurezza

Il progetto è frontend-only: non salva preventivi in un database e non dispone di endpoint propri per inviare i dati.

Le clausole privacy dei documenti richiamano il Regolamento (UE) 2016/679 (GDPR), il D.Lgs. 196/2003 e successive modifiche e indicano Abilart Srls come titolare del trattamento con il relativo contatto email.

La clausola contrattuale non sostituisce, quando necessaria, una vera informativa privacy completa ai sensi degli artt. 13-14 GDPR. L'informativa aziendale completa dovrebbe essere mantenuta separatamente e aggiornata in base ai trattamenti effettivamente svolti.

## Condizioni contrattuali

Le condizioni presenti nei due moduli sono state strutturate per il flusso del preventivo e includono riferimenti a caparra, responsabilità, vizi, foro competente, privacy e approvazione delle clausole.

Per l'utilizzo come contratto definitivo è consigliabile una verifica professionale del testo, in particolare per clausole di limitazione di responsabilità, caparra confirmatoria, foro competente, approvazione specifica ex artt. 1341-1342 c.c. e rapporti con consumatori.

## Dati aziendali utilizzati

- **Abilart Srls**
- **P. IVA / C.F.: 10439280966**
- **Via Caprera 2, 20851 Lissone (MB), Italia**
- **Telefono: +39 320 429 5445**
- **Email: abilart.impresaedile@gmail.com**
- **Sito: https://impresaedileabilart.com/**
- **Sito: https://idraulicoservizi.com/**
