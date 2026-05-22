# Setup Guida - Integrazione Google Drive

## Panoramica
Questa guida ti aiuterà a configurare l'integrazione con Google Drive per permettere agli operatori di visualizzare e scaricare documenti direttamente dal portale dei cantieri.

## Prerequisiti
- Account Google Cloud
- Accesso alla Google Cloud Console
- Progetto Google Cloud esistente o nuovo

## Passaggi di Configurazione

### 1. Creare/Selezionare un Progetto Google Cloud

1. Vai alla [Google Cloud Console](https://console.cloud.google.com/)
2. Accedi con il tuo account Google
3. Crea un nuovo progetto o seleziona uno esistente

### 2. Abilitare Google Drive API

1. Nel menu di navigazione, vai su "API e servizi" > "Libreria"
2. Cerca "Google Drive API"
3. Clicca su "Abilita"
4. Attendi l'attivazione dell'API

### 3. Configurare OAuth 2.0

1. Vai su "API e servizi" > "Schermata consenso OAuth"
2. Clicca su "Crea schermata consenso"
3. Seleziona "Esterno" e clicca "Crea"
4. Compila i campi richiesti:
   - **Nome dell'applicazione**: Home Design Lab Cantieri
   - **Email di supporto**: La tua email
   - **Email per sviluppatori**: La tua email
5. Clicca "Salva e continua" attraverso tutti gli step
6. Nella sezione "Domini autorizzati", aggiungi il dominio del tuo sito (es. tuo-dominio.com)
7. Nella sezione "Utenti di prova", aggiungi il tuo email Google

### 4. Creare Credenziali OAuth 2.0

1. Vai su "API e servizi" > "Credenziali"
2. Clicca su "Crea credenziali" > "ID client OAuth"
3. Seleziona "Applicazione web"
4. Configura le origini autorizzate:
   - `http://localhost:3000` (per sviluppo)
   - `https://tuo-dominio.com` (per produzione)
5. Configura gli URI di reindirizzamento autorizzati:
   - `http://localhost:3000` (per sviluppo)
   - `https://tuo-dominio.com` (per produzione)
6. Clicca "Crea"
7. Copia l'ID client (sarà simile a: `123456789-abc.apps.googleusercontent.com`)

### 5. Creare Chiave API

1. Vai su "API e servizi" > "Credenziali"
2. Clicca su "Crea credenziali" > "Chiave API"
3. Clicca "Crea"
4. Copia la chiave API generata
5. **Importante**: Limita la chiave API per uso solo con Google Drive API

### 6. Configurare le Variabili d'Ambiente

Aggiungi le seguenti variabili al tuo file `.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_API_KEY=AIzaSyABC123XYZ789
```

Oppure aggiungi direttamente al file `config.js`:

```javascript
GOOGLE_DRIVE: {
    CLIENT_ID: '123456789-abc.apps.googleusercontent.com',
    API_KEY: 'AIzaSyABC123XYZ789',
    SCOPES: ['https://www.googleapis.com/auth/drive.readonly']
}
```

### 7. Testare l'Integrazione

1. Riavvia il server dell'applicazione
2. Accedi al pannello admin
3. Crea un nuovo cantiere inserendo l'ID di una cartella Google Drive
4. Verifica che i documenti vengano visualizzati correttamente

## Come Ottenere l'ID della Cartella Google Drive

1. Apri Google Drive
2. Naviga fino alla cartella che vuoi collegare
3. Guarda l'URL nella barra degli indirizzi
4. L'ID è la parte finale dell'URL dopo `/folders/`

Esempio:
```
https://drive.google.com/drive/folders/1ABC123XYZ789
```
L'ID della cartella è: `1ABC123XYZ789`

## Funzionalità Disponibili

Una volta configurata, l'integrazione Google Drive permette:

- **Visualizzazione file**: Gli operatori possono vedere l'elenco dei file nella cartella Drive
- **Download diretto**: Download immediato dei documenti senza uscire dal sito
- **Anteprime**: Visualizzazione di anteprime per i formati supportati
- **Apertura in Google Docs**: Link diretto per modificare documenti Google

## Sicurezza e Limitazioni

- L'integrazione utilizza OAuth 2.0 con scope di sola lettura
- I file non vengono caricati sul tuo server, vengono solo visualizzati
- Gli utenti devono autenticarsi con il proprio account Google
- L'accesso è limitato alle cartelle esplicitamente configurate

## Risoluzione Problemi Comuni

### "API non abilitata"
- Verifica di aver abilitato Google Drive API nella console Google Cloud

### "Accesso negato"
- Controlla che l'ID client e la chiave API siano corretti
- Verifica che gli URI di reindirizzamento siano configurati correttamente

### "Nessun file trovato"
- Verifica che l'ID della cartella sia corretto
- Assicurati che la cartella sia condivisa pubblicamente o con l'account Google utilizzato

### "Token scaduto"
- Il sistema gestisce automaticamente il refresh dei token
- Se il problema persiste, effettua nuovamente il login

## Supporto

Per assistenza tecnica:
1. Controlla la console del browser per errori JavaScript
2. Verifica la configurazione nella Google Cloud Console
3. Assicurati che tutte le variabili d'ambiente siano correttamente impostate
