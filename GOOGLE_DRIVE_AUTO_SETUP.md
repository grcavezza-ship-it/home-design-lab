# 🤖 Sincronizzazione Google Drive Automatica

## Come funziona (100% automatico!)

**Tu fai:** Clicchi un bottone nella dashboard  
**Sistema fa:**
1. Legge automaticamente la cartella root configurata su Drive
2. Trova tutte le sottocartelle (i tuoi progetti)
3. Crea automaticamente i progetti nel portale
4. **Zero input richiesto!**

---

## Setup (solo una volta)

### 1. Crea Service Account Google

1. Vai su [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Seleziona il tuo progetto
3. Clicca **"Create Service Account"**
4. Nome: `home-design-lab-sync`
5. Ruoli: **Drive Reader** (solo lettura cartelle)
6. Clicca **Done**

### 2. Genera Chiave JSON

1. Clicca sui 3 punti del Service Account → **Manage keys**
2. **Add Key** → **Create new key**
3. Seleziona **JSON**
4. Scarica il file `.json`

### 3. Prendi ID Cartella Root Drive

1. Apri [Google Drive](https://drive.google.com)
2. Crea/o vai alla cartella principale (es: `Progetti Home Design Lab`)
3. Clicca con il destro → **Condividi**
4. Copia l'URL: `https://drive.google.com/drive/folders/1BxiMVs0XRA...`
5. Prendi solo la parte dopo `/folders/` → `1BxiMVs0XRA...`

### 4. Configura il Backend

Modifica il file `.env` nella root del progetto:

```bash
# Aggiungi queste righe (il JSON deve essere su UNA SINGOLA RIGA!)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"TUO_PROGETTO","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n","client_email":"home-design-lab-sync@TUO_PROGETTO.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}
GOOGLE_DRIVE_ROOT_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

**⚠️ Importante:** Il JSON della chiave deve essere tutto su **UNA RIGA SENZA SPAZI**

#### Come convertire il JSON in una riga:

**Metodo 1 - Online:**
- Vai su [jsonminifier.com](https://www.curlconverter.com/json-minify/)
- Incolla il contenuto del file JSON scaricato
- Copia il risultato minified

**Metodo 2 - VS Code:**
1. Apri il file `.json` scaricato
2. Seleziona tutto (`Ctrl+A`)
3. Apri command palette (`Ctrl+Shift+P`)
4. Digita: `Join Lines` e premi Enter
5. Rimuovi spazi extra tra i campi

**Metodo 3 - PowerShell:**
```powershell
Get-Content "percorso/chiave.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress | Set-Clipboard
# Ora incolla con Ctrl+V nel file .env
```

### 5. Dai Accesso alla Cartella Drive

1. Torna su [Google Drive](https://drive.google.com)
2. Clicca con il destro sulla cartella root (`Progetti Home Design Lab`)
3. **Condividi**
4. Aggiungi l'email del Service Account:
   - `home-design-lab-sync@TUO_PROGETTO.iam.gserviceaccount.com`
5. Ruolo: **Lettore** (o Viewer)
6. **Invia**

---

## Utilizzo

### 1. Avvia il Server
```bash
node server.mjs
```

### 2. Vai su Dashboard Senior
Apri: `http://localhost:3000/dashboard-senior.html`

### 3. Clicca "Sincronizza da Drive"
Nella sezione **Google Drive** (destra), clicca il bottone.

**Succede automaticamente:**
- ✅ Scansione cartella root
- ✅ Trova tutte le sottocartelle
- ✅ Crea progetti nel database
- ✅ Mostra risultato

---

## Struttura Drive

La tua cartella root su Drive dovrebbe essere così:

```
📁 Progetti Home Design Lab/          ← Questa è la cartella root (GOOGLE_DRIVE_ROOT_FOLDER_ID)
├── 📁 Villa Manzi/                   ← Diventa: Progetto "Villa Manzi"
├── 📁 Attico Milano/                   ← Diventa: Progetto "Attico Milano"
├── 📁 Casa al Mare 2024/               ← Divetta: Progetto "Casa al Mare 2024"
└── 📁 Ufficio Rossi & Co/              ← Diventa: Progetto "Ufficio Rossi & Co"
```

**Ogni cartella = Un progetto automatico!**

---

## Troubleshooting

### "GOOGLE_SERVICE_ACCOUNT_KEY non configurata"
→ Non hai impostato la chiave nel `.env`

### "Cartella Drive root non configurata"
→ Non hai impostato `GOOGLE_DRIVE_ROOT_FOLDER_ID`

### "Google Drive API error: Forbidden"
→ Il Service Account non ha accesso alla cartella. Condividi la cartella con l'email del Service Account.

### "Invalid JWT"
→ La chiave JSON è malformata. Assicurati sia su una singola riga con `\n` per i newlines.

---

## API Endpoint

### POST /api/drive/sync-auto
Sincronizza automaticamente TUTTO da Drive. **Nessun parametro richiesto!**

**Headers:**
```
Authorization: Bearer <token>
```

**Risposta:**
```json
{
  "success": true,
  "message": "Sincronizzazione automatica completata: 3 creati, 1 aggiornati",
  "created": [{"id": "...", "title": "Villa Manzi", ...}],
  "updated": [{"id": "...", "title": "Attico Milano", ...}],
  "foldersFound": 4,
  "rootFolder": "1BxiMVs0XRA..."
}
```

---

## Note

- **100% automatico**: Non devi copiare ID o autenticarti manualmente
- **Sicuro**: Usa Service Account con permessi solo lettura
- **Veloce**: Una chiamata API, nessun popup OAuth
- **Smart**: Se rinomini una cartella su Drive, il progetto si aggiorna automaticamente
