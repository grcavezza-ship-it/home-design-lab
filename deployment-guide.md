# Guida al Deployment - Sistema Gestione Cantieri

## Panoramica
Questa guida ti aiuterà a deployare e testare il sistema completo di gestione cantieri con Google Drive integration.

## Prerequisiti
- Database Supabase configurato
- Google Drive API configurata (opzionale ma consigliata)
- Server web per servire i file statici

## 1. Setup Database Supabase

### Esegui lo Schema SQL
1. Accedi al tuo progetto Supabase
2. Vai all'SQL Editor
3. Esegui prima il file `supabase_schema.sql` (se non già fatto)
4. Esegui il file `cantieri_schema.sql` per creare le tabelle dei cantieri

### Verifica le Tabelle
Assicurati che le seguenti tabelle siano state create:
- `cantieri` - Gestione cantieri/progetti
- `tasks` - Checklist tasks
- `cantieri_operatori` - Assegnazioni operatori

## 2. Configurazione Variabili d'Ambiente

### File .env
Crea o aggiorna il file `.env`:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Drive Configuration (opzionale)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_API_KEY=your-google-api-key

# Server Configuration
NODE_ENV=production
API_BASE_URL=https://your-domain.com
```

### File config.js
Assicurati che `config.js` sia configurato correttamente per l'ambiente di produzione.

## 3. Deploy dei File

### Struttura dei File
I file principali da deployare:
```
/
|-- cantieri-admin.html      # Pannello Admin
|-- operator-panel.html      # Pannello Operatori
|-- cantieri-admin.js        # Logica Admin
|-- operator-panel.js        # Logica Operatori
|-- google-drive-integration.js # Integrazione Drive
|-- config.js               # Configurazione
|-- supabase_schema.sql     # Schema database
|-- cantieri_schema.sql     # Schema cantieri
|-- setup-google-drive.md   # Guida Google Drive
|-- deployment-guide.md     # Questa guida
```

### Opzioni di Deploy

#### Opzione 1: Server Node.js/Express
Usa il server esistente:
```bash
npm install
npm start
```

#### Opzione 2: Static Hosting (Netlify, Vercel, GitHub Pages)
1. Carica tutti i file nella cartella root
2. Assicurati che i file `.env` non siano caricati (usa le variabili d'ambiente del provider)

#### Opzione 3: Hosting Tradizionale
1. Carica tutti i file via FTP
2. Configura il server per servire file HTML/JS statici

## 4. Test del Sistema

### 4.1 Test Autenticazione
1. Accedi a `dashboard.html`
2. Verifica il login con utenti admin e operatori
3. Controlla i permessi di accesso

### 4.2 Test Pannello Admin
1. Accedi a `cantieri-admin.html` come admin
2. Test creazione nuovo cantiere:
   - Compila tutti i campi
   - Inserisci un ID cartella Google Drive (test)
   - Salva e verifica
3. Test gestione tasks:
   - Aggiungi tasks al cantiere
   - Assegna tasks agli operatori
   - Verifica completamento
4. Test assegnazione operatori:
   - Assegna operatori esistenti
   - Verifica ruoli e permessi

### 4.3 Test Pannello Operatori
1. Accedi a `operator-panel.html` come operatore
2. Verifica visualizzazione solo cantieri assegnati
3. Test completamento tasks:
   - Spunta checkboxes
   - Verifica salvataggio
   - Controlla progress bar
4. Test filtri e ricerca

### 4.4 Test Google Drive Integration
1. Configura Google Drive API (seguendo `setup-google-drive.md`)
2. Crea un cantiere con ID cartella Drive
3. Verifica visualizzazione file in entrambi i pannelli
4. Test download e visualizzazione file

## 5. Checklist di Deploy Pre-Produzione

### Sicurezza
- [ ] Rimuovi chiavi API hardcoded
- [ ] Configura HTTPS
- [ ] Verifica RLS policies su Supabase
- [ ] Testa con ruoli diversi (admin, operatore, architetto)

### Performance
- [ ] Ottimizza immagini e assets
- [ ] Abilita caching statico
- [ ] Testa su mobile
- [ ] Verifica tempi di caricamento

### Funzionalità
- [ ] Tutti i form funzionano
- [ ] Notifiche errori funzionano
- [ ] Google Drive integration (se configurata)
- [ ] Responsive design

### Backup
- [ ] Backup database Supabase
- [ ] Versionamento codice
- [ ] Documentazione aggiornata

## 6. Monitoraggio e Manutenzione

### Log e Errori
- Monitora console JavaScript per errori
- Controlla log Supabase per problemi di database
- Verifica chiamate API fallite

### Performance
- Monitora tempi di caricamento
- Controlla utilizzo storage
- Verifica limiti API Google Drive

### Aggiornamenti
- Mantieni aggiornate le dipendenze
- Verifica compatibilità browser
- Aggiorna documentazione

## 7. Troubleshooting Comune

### Problemi di Autenticazione
```
Errore: "Accesso negato"
Soluzione: Verifica ruoli utenti in tabella profiles
```

### Problemi Database
```
Errore: "Table not found"
Soluzione: Esegui cantieri_schema.sql in Supabase
```

### Problemi Google Drive
```
Errore: "API non abilitata"
Soluzione: Segui setup-google-drive.md
```

### Problemi di Permessi
```
Errore: "RLS policy violation"
Soluzione: Verifica policies nelle tabelle cantieri, tasks, cantieri_operatori
```

## 8. Supporto Utenti

### Guide per Utenti Finali
1. **Admin**: Come creare cantieri e gestire operatori
2. **Operatori**: Come visualizzare cantieri e completare tasks
3. **Google Drive**: Come configurare cartelle e documenti

### Contatti di Supporto
- Email supporto: supporto@homedesignlab.it
- Documentazione: `setup-google-drive.md`
- FAQ: Creare sezione FAQ nel sito

## 9. Next Steps e Miglioramenti

### Funzionalità Future
- Notifiche email per task assegnati
- Reportistica avanzata
- Upload diretto di file
- Integrazione calendario
- Mobile app

### Scalabilità
- CDN per assets statici
- Database optimization
- Caching layer
- Load balancing

## 10. Riepilogo File Creati

### Database
- `cantieri_schema.sql` - Schema tabelle cantieri

### Frontend
- `cantieri-admin.html` - Interfaccia admin
- `operator-panel.html` - Interfaccia operatori
- `cantieri-admin.js` - Logica admin
- `operator-panel.js` - Logica operatori
- `google-drive-integration.js` - Integrazione Drive

### Configurazione
- `config.js` - Configurazione aggiornata
- `.env.example` - Template variabili ambiente

### Documentazione
- `setup-google-drive.md` - Guida Google Drive
- `deployment-guide.md` - Questa guida

Il sistema è ora pronto per il deployment e l'utilizzo in produzione!
