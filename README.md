# Mindful Munchies

Scusa, ecco il testo completo — copialo da qui:

Crea una web app chiamata "Fame o Fame?" per aiutare le persone a distinguere la fame fisica dalla fame emotiva e a riconoscere i propri pattern di alimentazione emotiva nel tempo. È un prodotto a pagamento unico (accesso a vita), non in abbonamento.

Autenticazione

Login/registrazione con email e password tramite Supabase Auth.

Dopo la registrazione, l'utente accede a un flusso di pagamento una tantum (Stripe Checkout, modalità "payment" non "subscription") prima di sbloccare l'app. Finché non ha pagato, può vedere solo una schermata di benvenuto con il pulsante "Sblocca l'accesso a vita".

Dopo il pagamento, sblocca l'accesso permanente (salva un campo has_paid: true sul profilo utente in Supabase).

Onboarding (3 schermate, la prima volta dopo il pagamento)

Spiega brevemente cos'è la fame emotiva vs fame fisica (poche righe, tono caldo e non giudicante).

Chiede all'utente in che momenti tende a mangiare fuori pasto (checkbox: sera, stress da lavoro, noia, dopo una discussione, altro — campo libero).

Spiega come funziona il check-in giornaliero e invita a farne il primo.

Schermata principale — Check-in

Un pulsante grande e sempre visibile "Sto per mangiare qualcosa fuori pasto" che apre un piccolo flusso guidato di 4 domande, una alla volta (stile wizard, non un form lungo):

"Hai fame fisica (stomaco che brontola, energia bassa) o è un'altra cosa?" — risposta a scelta singola: Fame fisica / Non sono sicuro / Non è fame fisica

"Cosa provi in questo momento?" — selezione singola tra emoji + etichetta: stress, noia, tristezza, rabbia, ansia, solitudine, stanchezza, altro

"Cosa è successo poco prima?" — campo di testo libero breve (facoltativo, placeholder tipo "es. discussione con un collega")

"Cosa vuoi fare adesso?" — tre pulsanti: "Aspetto 10 minuti e poi decido" (avvia un countdown visivo di 10 minuti con un messaggio di respiro guidato), "Provo un esercizio breve" (mostra un esercizio casuale dalla libreria sotto), "Ho deciso di mangiare comunque, va bene così" (chiude il flusso senza giudizio, con un messaggio gentile tipo "Va bene. L'importante è che tu ne sia consapevole.")

Ogni check-in viene salvato in Supabase con: timestamp, tipo di fame selezionato, emozione, testo libero, azione scelta.

Libreria esercizi

Una lista di 8-10 micro-esercizi brevi (60-120 secondi ciascuno), testuali, tipo: Respirazione 4-7-8; Scrivere 3 cose che stanno succedendo ora senza giudicarle; Bere un bicchiere d'acqua e aspettare 5 minuti; Fare una telefonata veloce a qualcuno; Uscire 2 minuti a prendere aria. Ogni esercizio ha un titolo, una breve istruzione e un timer opzionale.

Report personale (si sblocca dopo 7 check-in)

Grafico a barre delle emozioni più frequenti; grafico che mostra le fasce orarie/giorni della settimana con più check-in; lista delle 3 situazioni scatenanti più ricorrenti (dal testo libero); un messaggio di sintesi generato con poche regole semplici (non serve AI generativa).

Report mensile (si sblocca dopo 30 giorni)

Confronto tra il primo e l'ultimo blocco di 15 giorni: numero di check-in totali, percentuale di volte in cui l'utente ha scelto "aspetto 10 minuti" invece di "mangio comunque".

Design

Palette elegante perlata oro e rosa: rosa cipria/nude come sfondo principale, dettagli e accenti in oro/dorato (bottoni, bordi, icone), tocchi bianco perlato per le card. Font con grazie/elegante per i titoli, font semplice per i testi lunghi. Piccoli fiori di ciliegio (sakura) sparsi con discrezione negli angoli della landing o come divisori leggeri, mai invasivi. Nessun elemento che assomigli a un contatore di calorie o una bilancia. Copy sempre non giudicante, tono da amica esperta.

Logo

Uso il mio logo esistente (immagine allegata: monogramma dorato "MG" dentro un doppio cerchio ovale, su sfondo rosa cipria, con "Fame o Fame?" sotto e la tagline "Non tutta la fame viene dallo stomaco."). Il monogramma "MG" è fisso: identico in entrambe le lingue, mai tradotto o alterato. In italiano mostra il logo esattamente come nell'immagine allegata. Per l'inglese serve una seconda versione identica del logo ma con testo tradotto: titolo "Hungry, or Hungry?" e tagline "Not all hunger comes from your stomach." — prepara due asset (logo-it.png e logo-en.png) identici tranne che nel testo, mostrando quello corretto in base alla lingua. Usa il logo nell'header della landing e, più piccolo, nell'header interno dell'app.

Multilingua (Italiano / Inglese)

In alto a destra su ogni pagina, un selettore di lingua "IT"/"EN" sempre visibile. Tutti i testi gestiti tramite dizionario centralizzato (it.json/en.json), non scritti a mano nei componenti. Lingua salvata in localStorage/profilo Supabase, rilevata automaticamente dal browser al primo accesso. Il logo cambia insieme alla lingua (logo-it.png/logo-en.png), monogramma MG identico in entrambe le versioni.

Schema dati (Supabase)

Tabella profiles: id, email, has_paid (bool), created_at. Tabella checkins: id, user_id, created_at, hunger_type, emotion, note (text), action_chosen. Tabella exercises: id, title, instructions, duration_seconds (dati statici).

Pagine

Landing/marketing 2. Login/Registrazione 3. Pagamento (Stripe Checkout one-time) 4. Onboarding (3 step) 5. Home/Check-in 6. Libreria esercizi 7. Report personale 8. Report mensile 9. Impostazioni account

Costruisci prima il flusso end-to-end con dati finti/mock per il report, poi collega Supabase per il salvataggio reale dei check-in.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mgwebappstore.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/035941b3-68d5-4786-80e1-a237ca2c2a3c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
