# Abilart Preventivi — GitHub Pages

## Struttura

- `index.html` — interfaccia e i due tipi di preventivo
- `styles.css` — tutto il design del sito e del documento PDF
- `app.js` — editor, firma, calcoli, tabella e generazione PDF

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository GitHub, ad esempio `abilart-preventivi`.
2. Carica nella root del repository:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Vai in **Settings → Pages**.
4. In **Build and deployment** seleziona:
   - Source: **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
5. Salva.
6. Dopo la pubblicazione GitHub mostrerà l'indirizzo del sito.

## Come funziona

La pagina iniziale permette di scegliere:

- Preventivo / Contratto
- Preventivo Edile

Ogni schermata ha il pulsante "Torna indietro".

Il PDF viene generato **nel browser** e scaricato localmente nella cartella Download del computer. Non vengono inviati dati a un backend dal codice presente in questo progetto.

Il motore PDF è `html2pdf.js`, caricato da jsDelivr nella pagina. Per generare il PDF è quindi necessaria una connessione Internet.

## Calcoli

### Preventivo / Contratto

- Imponibile = prezzo inserito
- IVA = imponibile × IVA / 100
- Totale = imponibile + IVA
- Saldo = totale − acconto
- Un acconto superiore al totale non produce un saldo negativo.

### Preventivo Edile

- Sconto limitato all'imponibile
- Imponibile netto = imponibile − sconto
- IVA = imponibile netto × IVA / 100
- Totale = imponibile netto + IVA
- Saldo = totale − acconto
- La tabella delle lavorazioni calcola ogni riga come quantità × prezzo unitario e mostra il subtotale.

Nota: il subtotale della tabella è riportato nel PDF come dettaglio delle lavorazioni; il riepilogo economico usa il campo "Imponibile (€)" del preventivo, così non vengono sommati due volte gli stessi importi.

## Formattazione

L'editor supporta:

- grassetto
- sottolineato
- elenco puntato
- blu
- rosso
- rimozione formattazione

La formattazione viene trasferita al PDF.

La firma viene acquisita con un canvas direttamente nel browser e inserita nel PDF come immagine.

## Importante

Le condizioni contrattuali incluse nel progetto sono quelle fornite nella configurazione precedente di Abilart. Prima di usare il documento come contratto definitivo, è consigliabile far verificare il testo da un professionista, soprattutto per clausole relative a caparra, responsabilità, garanzie, foro competente e normativa applicabile.

## Dominio

Il progetto può essere successivamente collegato a un dominio personalizzato tramite GitHub Pages.
