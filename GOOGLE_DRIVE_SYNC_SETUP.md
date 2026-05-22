# 🔗 Sincronizzazione Google Drive → Progetti

## Come funziona
Quando crei una cartella su Google Drive (es. "Villa Manzi"), puoi sincronizzarla automaticamente con il portale. Ogni cartella diventa un progetto vuoto sul sito, pronto per essere popolato con file e dettagli.

## Configurazione richiesta

### 1. Google Cloud Console
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto (o usa quello esistente)
3. Abilita l'API **Google Drive API**
4. Vai su **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configura:
   - Application type: Web application
   - Name: Home Design Lab Portal
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`
6. Copia il **Client ID** (es: `123456789-abc123.apps.googleusercontent.com`)

### 2. Configura il Portale

#### Backend (.env)
```bash
# Aggiungi al file .env
GOOGLE_CLIENT_ID=il-tuo-client-id.apps.googleusercontent.com
```

#### Frontend (dashboard-senior.html)
Modifica la riga 300 in `dashboard-senior.html`:
```javascript
client_id: 'IL_TUO_CLIENT_ID.apps.googleusercontent.com',
```

### 3. Database Supabase
Esegui lo script SQL in Supabase:
```bash
sql/add_drive_sync_columns.sql
```

## Utilizzo

### Sincronizzare cartelle Drive

1. **Apri** `dashboard-senior.html`
2. Trova la sezione **"Google Drive"** (in alto a destra)
3. **Inserisci l'ID cartella Drive**:
   - Apri Google Drive
   - Clicca con il destro sulla cartella → "Condividi"
   - Copia l'ID dall'URL: `https://drive.google.com/drive/folders/XXXXXXXX`
   - Incolla solo la parte `XXXXXXXX` nel campo
4. **Clicca "Sincronizza Progetti"**
5. **Autenticati con Google** (prima volta)
6. I progetti vengono creati automaticamente!

### Esempio
```
Cartella Drive: "Villa Manzi"
↓ [Sincronizza]
Progetto creato: "Villa Manzi"
Stato: active
Link Drive: https://drive.google.com/drive/folders/...
```

## API Endpoints

### POST /api/drive/sync-folders
Sincronizza cartelle Drive con progetti.

**Headers:**
```
Authorization: Bearer <token>
x-google-access-token: <google_oauth_token>
Content-Type: application/json
```

**Body:**
```json
{
  "driveFolderId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
}
```

**Risposta:**
```json
{
  "success": true,
  "message": "Sincronizzazione completata: 3 creati, 1 aggiornati",
  "created": [...],
  "updated": [...],
  "foldersFound": 4
}
```

### GET /api/drive/projects
Lista progetti sincronizzati da Drive.

## Troubleshooting

### "Token Google mancante"
→ Autenticati prima cliccando "Sincronizza" - si aprirà il popup Google

### "Google API non caricata"
→ Ricarica la pagina. Verifica che lo script `accounts.google.com/gsi/client` sia presente

### Progetti non appaiono
→ Verifica di aver eseguito lo SQL per aggiungere le colonne `drive_folder_id`

### Errore CORS
→ Verifica che `http://localhost:3000` sia nelle origini autorizzate in Google Cloud Console

## Note

- I progetti creati automaticamente hanno `category: 'drive-sync'`
- Se rinomini una cartella su Drive, il progetto si aggiorna automaticamente alla prossima sincronizzazione
- Il link alla cartella Drive rimane sempre visibile nella pagina dettaglio progetto
