/**
 * server.mjs — Home Design Lab
 * Backend unico Node.js/Express. Nessun Flask.
 * Supabase per auth, DB e storage.
 */

// ⚠️ CRITICAL: Env vars loaded via --env-file=.env flag
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CONFIG from './config.js';
import apiRouter from './routes/api.mjs';

// Configurazione Google Gemini AI
let genAI = null;

const app = express();
const port = CONFIG.APP.PORT;
const templatesDir = join(__dirname, 'templates');

// Reindirizza il traffico dal dominio di Render al dominio personalizzato
app.use((req, res, next) => {
  if (req.hostname === 'home-design-lab.onrender.com') {
    return res.redirect(301, 'https://www.homedesignlab.it' + req.originalUrl);
  }
  next();
});

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS con supporto per preflight
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Gestione esplicita OPTIONS per tutte le route
app.options('*', cors());

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/assets', express.static(join(__dirname, 'assets')));
app.use('/lib', express.static(join(__dirname, 'lib')));

// Serve HTML files dalla root
app.use(express.static(join(__dirname), {
    extensions: ['html'],
    index: ['index.html', 'home-design-lab.html']
}));

// ─── PUBLIC API: Drive Test Connection (senza autenticazione) ───────────────
const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

let cachedGoogleToken = { token: null, expiresAt: 0, bufferTime: 5 * 60 * 1000 };

async function getGoogleAccessTokenPublic() {
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY non configurata');
    }
    
    const now = Date.now();
    if (cachedGoogleToken.token && now < (cachedGoogleToken.expiresAt - cachedGoogleToken.bufferTime)) {
        return cachedGoogleToken.token;
    }
    
    let key;
    let privateKey;
    
    try {
        // FIX: Rimuovi eventuali whitespace iniziali/finali
        let keyString = GOOGLE_SERVICE_ACCOUNT_KEY.trim();
        
        // FIX: Sostituisci newline reali con \\n (se presenti)
        keyString = keyString.replace(/\r\n/g, '\\\\n').replace(/\n/g, '\\\\n');
        
        // FIX: Sostituisci \\n escaped con newline reali per il parsing
        keyString = keyString.replace(/\\\\n/g, '\n');
        
        // FIX: Rimuovi eventuali caratteri di controllo rimasti
        keyString = keyString.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        key = JSON.parse(keyString);
        
        if (!key.private_key) {
            throw new Error('Chiave privata mancante nel Service Account');
        }
        
        // FIX: Assicurati che la private_key abbia i newline corretti
        privateKey = key.private_key;
        
        // Se la chiave contiene \\n literal, convertili in newline reali
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        
        // Rimuovi eventuali caratteri problematici
        privateKey = privateKey.replace(/\r/g, '\n');
        
        console.log('[Drive Test] Service Account parsed:', Boolean(key.client_email));
    } catch (parseError) {
        console.error('[Drive Test] ❌ Errore parsing JSON:', parseError.message);
        throw new Error(`Errore parsing Service Account key: ${parseError.message}`);
    }
    
    const crypto = await import('crypto');
    const nowSeconds = Math.floor(now / 1000);
    
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const jwtClaim = Buffer.from(JSON.stringify({
        iss: key.client_email,
        sub: key.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: nowSeconds,
        exp: nowSeconds + 3600
    })).toString('base64url');
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${jwtHeader}.${jwtClaim}`);
    const signature = sign.sign(privateKey, 'base64url');
    const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Token error: ${data.error_description || data.error}`);
    }
    
    cachedGoogleToken.token = data.access_token;
    cachedGoogleToken.expiresAt = now + (data.expires_in * 1000);
    return data.access_token;
}

// Rotta PUBBLICA per testare la connessione Drive
app.get('/api/drive/test-connection', async (req, res) => {
    try {
        console.log('[Drive Test] ================================');
        console.log('[Drive Test] Verifica connessione Google Drive...');
        console.log('[Drive Test] Service Account:', DRIVE_ROOT_FOLDER_ID ? 'Configurato' : 'Mancante');
        console.log('[Drive Test] Root Folder ID:', DRIVE_ROOT_FOLDER_ID || 'NON CONFIGURATO');
        
        if (!DRIVE_ROOT_FOLDER_ID) {
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID non configurata',
                folderId: null
            });
        }
        
        if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'
            });
        }

        console.log('[Drive Test] Ottenendo access token...');
        const accessToken = await getGoogleAccessTokenPublic();
        console.log('[Drive Test] ✅ Token ottenuto');
        
        console.log('[Drive Test] Richiesta sottocartelle a Google Drive...');
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)&orderBy=name`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!driveResponse.ok) {
            const error = await driveResponse.json();
            throw new Error(`Google Drive API error: ${error.error?.message || JSON.stringify(error)}`);
        }

        const { files: folders } = await driveResponse.json();
        
        console.log('[Drive Test] ================================');
        console.log('[Drive Test] 📁 SOTTOCARTELLE TROVATE:', folders?.length || 0);
        console.log('[Drive Test] ================================');
        
        if (folders && folders.length > 0) {
            folders.forEach((folder, idx) => {
                console.log(`[Drive Test] ${idx + 1}. ${folder.name} (ID: ${folder.id})`);
            });
        } else {
            console.log('[Drive Test] Nessuna sottocartella trovata');
        }
        console.log('[Drive Test] ================================');

        res.json({
            success: true,
            message: `Connessione Drive riuscita - ${folders?.length || 0} sottocartelle trovate`,
            rootFolderId: DRIVE_ROOT_FOLDER_ID,
            serviceAccount: 'homedesignlab@home-design-lab-493603.iam.gserviceaccount.com',
            foldersFound: folders?.length || 0,
            folders: folders?.map(f => ({ 
                id: f.id, 
                name: f.name, 
                createdTime: f.createdTime,
                url: `https://drive.google.com/drive/folders/${f.id}`
            })) || []
        });

    } catch (e) {
        console.error('[Drive Test] ❌ Errore:', e.message);
        res.status(500).json({
            success: false,
            error: e.message,
            details: 'Verifica che la cartella Drive sia condivisa con il Service Account come Editor'
        });
    }
});

// Sincronizzazione Cartelle Drive -> Progetti Supabase (GET per test browser)
app.get('/api/drive/sync-folders', async (req, res) => {
    try {
        console.log('[Drive Sync] ================================');
        console.log('[Drive Sync] Avvio sincronizzazione Drive -> Database');
        console.log('[Drive Sync] ================================');
        
        if (!DRIVE_ROOT_FOLDER_ID) {
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID non configurata'
            });
        }
        
        if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'
            });
        }

        // 1. Ottieni token Drive
        console.log('[Drive Sync] Ottenendo access token...');
        const accessToken = await getGoogleAccessTokenPublic();
        console.log('[Drive Sync] ✅ Token ottenuto');
        
        // 2. Scansiona sottocartelle dalla root
        console.log('[Drive Sync] Scansionando cartelle da Drive...');
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)&orderBy=name`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!driveResponse.ok) {
            const error = await driveResponse.json();
            throw new Error(`Google Drive API error: ${error.error?.message || JSON.stringify(error)}`);
        }

        const { files: folders } = await driveResponse.json();
        console.log(`[Drive Sync] Trovate ${folders?.length || 0} cartelle in Drive`);
        
        if (!folders || folders.length === 0) {
            return res.json({
                success: true,
                message: 'Nessuna cartella trovata in Drive',
                created: 0,
                existing: 0,
                folders: []
            });
        }

        // 3. Ottieni admin client Supabase
        console.log('[Drive Sync] Inizializzazione Supabase...');
        console.log('[Drive Sync] SUPABASE_URL:', process.env.SUPABASE_URL || 'NON DEFINITO');
        console.log('[Drive Sync] CONFIG.SUPABASE.URL:', CONFIG.SUPABASE.URL || 'NON DEFINITO');
        
        // FORZA uso SERVICE_ROLE_KEY per sincronizzazione backend
        let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseKey) {
            console.warn('[Drive Sync] ⚠️ SERVICE_ROLE_KEY mancante, fallback su ANON_KEY');
            supabaseKey = CONFIG.SUPABASE.ANON_KEY;
        }
        
        // Trim per sicurezza
        supabaseKey = supabaseKey?.trim();
        
        console.log('[Drive Sync] Service Role Key length:', supabaseKey?.length);
        console.log('[Drive Sync] Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');
        
        if (!supabaseKey) {
            throw new Error('Nessuna chiave Supabase configurata!');
        }
        
        const supabase = createClient(
            CONFIG.SUPABASE.URL,
            supabaseKey,
            { 
                auth: { 
                    persistSession: false,
                    autoRefreshToken: false
                },
                db: { schema: 'public' }
            }
        );
        console.log('[Drive Sync] ✅ Client Supabase inizializzato');
        
        // Test di connessione rapido
        console.log('[Drive Sync] Test connessione Supabase...');
        const { data: testData, error: testError } = await supabase.from('projects').select('id').limit(1);
        if (testError) {
            console.error('[Drive Sync] ❌ Test connessione fallito:', testError.message);
            throw testError;
        }
        console.log('[Drive Sync] ✅ Test connessione riuscito');

        // 4. Per ogni cartella, controlla se esiste nel database
        const results = {
            created: [],
            existing: [],
            errors: []
        };

        for (const folder of folders) {
            console.log(`[Drive Sync] Controllo: "${folder.name}" (${folder.id})`);
            
            try {
                console.log(`[Supabase] Ricerca per drive_folder_id: ${folder.id}`);
                
                // Cerca se esiste già un progetto con questo drive_folder_id
                const { data: existing, error: searchError } = await supabase
                    .from('projects')
                    .select('id, titolo, drive_folder_id, status')
                    .eq('drive_folder_id', folder.id)
                    .maybeSingle();
                
                if (searchError) {
                    console.error(`[Supabase] ❌ Errore ricerca per "${folder.name}":`, searchError.message);
                    throw searchError;
                }
                
                if (existing) {
                    // Cartella già esiste nel database
                    console.log(`[Drive Sync] ✅ Esistente: "${folder.name}" -> Progetto "${existing.titolo}"`);
                    results.existing.push({
                        driveFolderId: folder.id,
                        driveName: folder.name,
                        projectId: existing.id,
                        projectTitle: existing.titolo,
                        status: existing.status
                    });
                } else {
                    // UPSERT: Crea nuovo progetto o aggiorna esistente
                    console.log(`[Drive Sync] ➕ Creazione/Aggiornamento progetto: "${folder.name}"`);
                    
                    // Usa upsert con onConflict su drive_folder_id
                    // Se esiste già, aggiorna solo drive_folder_url e updated_at (NON il titolo!)
                    // Se non esiste, crea con il nome della cartella
                    const projectData = {
                        drive_folder_id: folder.id,  // Chiave unica
                        titolo: folder.name,          // Solo per nuovi progetti
                        description: `Progetto importato da Google Drive - Cartella: ${folder.name}`,
                        drive_folder_url: `https://drive.google.com/drive/folders/${folder.id}`,
                        status: 'attivo',           // Stato predefinito -> 'attivo'
                        updated_at: new Date().toISOString()
                    };
                    
                    console.log('[Sync] Dati da inserire:', JSON.stringify(projectData));
                    
                    const { data: upsertedProject, error: upsertError } = await supabase
                        .from('projects')
                        .upsert([projectData], {
                            onConflict: 'drive_folder_id',
                            ignoreDuplicates: false  // Aggiorna se esiste
                        })
                        .select()
                        .single();
                    
                    if (upsertError) {
                        console.error(`[Sync] ❌ Errore DB su "${folder.name}":`, upsertError.message);
                        console.error(`[Sync] Dettagli errore:`, upsertError.details || 'N/A');
                        console.error(`[Sync] Hint:`, upsertError.hint || 'N/A');
                        throw upsertError;
                    }
                    
                    // Determina se è stato creato o aggiornato (controlla se il titolo è diverso dalla cartella)
                    const wasUpdated = upsertedProject.titolo !== folder.name;
                    
                    if (wasUpdated) {
                        console.log(`[Sync] 🔄 Aggiornato progetto esistente: "${upsertedProject.titolo}" (titolo preservato)`);
                        results.existing.push({
                            driveFolderId: folder.id,
                            driveName: folder.name,
                            projectId: upsertedProject.id,
                            projectTitle: upsertedProject.titolo,
                            status: upsertedProject.status,
                            action: 'updated'
                        });
                    } else {
                        console.log(`[Sync] ✅ Inserimento "${upsertedProject.titolo}": OK (ID: ${upsertedProject.id})`);
                        results.created.push({
                            driveFolderId: folder.id,
                            driveName: folder.name,
                            projectId: upsertedProject.id,
                            projectTitle: upsertedProject.titolo,
                            status: upsertedProject.status,
                            action: 'created'
                        });
                    }
                }
            } catch (folderError) {
                console.error(`[Drive Sync] ❌ Errore su "${folder.name}":`, folderError.message);
                results.errors.push({
                    driveFolderId: folder.id,
                    driveName: folder.name,
                    error: folderError.message
                });
            }
        }

        console.log('[Drive Sync] ================================');
        console.log(`[Drive Sync] Riepilogo: ${results.created.length} creati, ${results.existing.length} esistenti, ${results.errors.length} errori`);
        console.log('[Drive Sync] ================================');

        res.json({
            success: true,
            message: `Sincronizzazione completata: ${results.created.length} nuovi, ${results.existing.length} esistenti, ${results.errors.length} errori`,
            summary: {
                totalFolders: folders.length,
                created: results.created.length,
                existing: results.existing.length,
                updated: results.existing.filter(e => e.action === 'updated').length,
                errors: results.errors.length
            },
            created: results.created,
            existing: results.existing,
            errors: results.errors
        });

    } catch (e) {
        console.error('[Supabase Sync Error]', e.message);
        console.error('[Supabase Sync Error] Stack:', e.stack);
        
        // Dettagli aggiuntivi se l'errore viene da Supabase
        if (e.details) console.error('[Supabase Sync Error] Details:', e.details);
        if (e.hint) console.error('[Supabase Sync Error] Hint:', e.hint);
        if (e.code) console.error('[Supabase Sync Error] Code:', e.code);
        
        res.status(500).json({
            success: false,
            error: e.message,
            stack: e.stack,
            details: e.details || 'Errore durante la sincronizzazione Drive -> Database'
        });
    }
});

// Listare file in cartella Drive (per dettaglio-progetto.html)
app.get('/api/drive/files/:folderId', async (req, res) => {
    try {
        const { folderId } = req.params;
        console.log(`[Drive Files] Listando file per cartella: ${folderId}`);
        
        if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'
            });
        }
        
        // Ottieni token Drive
        const accessToken = await getGoogleAccessTokenPublic();
        
        // Chiama Drive API per listare file
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink)&orderBy=modifiedTime desc`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        
        if (!driveResponse.ok) {
            const error = await driveResponse.json();
            throw new Error(`Google Drive API error: ${error.error?.message || JSON.stringify(error)}`);
        }
        
        const { files } = await driveResponse.json();
        console.log(`[Drive Files] Trovati ${files?.length || 0} file`);
        
        // Mappa icone per tipo file
        const getFileIcon = (mimeType) => {
            if (mimeType?.includes('folder')) return 'folder';
            if (mimeType?.includes('image')) return 'image';
            if (mimeType?.includes('pdf')) return 'picture_as_pdf';
            if (mimeType?.includes('document') || mimeType?.includes('word')) return 'description';
            if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'table_chart';
            if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'slideshow';
            if (mimeType?.includes('video')) return 'videocam';
            if (mimeType?.includes('audio')) return 'audiotrack';
            return 'insert_drive_file';
        };
        
        // Formatta risposta
        const formattedFiles = files?.map(file => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            icon: getFileIcon(file.mimeType),
            downloadUrl: file.webContentLink
        })) || [];
        
        res.json({
            success: true,
            files: formattedFiles,
            count: formattedFiles.length
        });
        
    } catch (e) {
        console.error('[Drive Files Error]', e);
        res.status(500).json({
            success: false,
            error: e.message,
            details: 'Errore nel recupero file da Google Drive'
        });
    }
});

// AI Task Generator - Copilota di Cantiere con Google Gemini
app.post('/api/ai/generate-tasks', async (req, res) => {
    try {
        const { descrizione } = req.body;
        if (!descrizione) return res.status(400).json({ success: false, error: 'Descrizione mancante' });

        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey) return res.status(503).json({ success: false, error: 'Servizio AI non configurato' });
        if (!genAI) genAI = new GoogleGenerativeAI(apiKey);

        // 1. Interroga l'API di Google per vedere quali modelli sono attivi su questa chiave
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();

        if (!modelsData.models) throw new Error('Errore API Google: ' + JSON.stringify(modelsData));

        // 2. Seleziona il miglior modello disponibile
        const validModels = modelsData.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
        let selectedModel = validModels.find(m => m.name.includes('gemini-1.5-flash'))?.name
                         || validModels.find(m => m.name.includes('gemini-1.5-pro'))?.name
                         || validModels[0].name;

        selectedModel = selectedModel.replace('models/', '');
        console.log('[AI] Modello selezionato dinamicamente:', selectedModel);

        // 3. Esegui la generazione (usa genAI già importato in cima al file)
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const prompt = `Il cliente richiede: ${descrizione}. Suddividi il lavoro in task pratici per lo studio di architettura. Usa ESCLUSIVAMENTE queste fasi: 'Rilievi e Sopralluoghi', 'Progettazione', 'Pratiche Edilizie', 'Sicurezza e Cantiere', 'Direzione Artistica'. Rispondi SOLO con un array JSON puro strutturato così: [{"titolo": "nome", "fase_lavorativa": "fase"}]. Non usare formattazione markdown.`;

        const result = await model.generateContent(prompt);
        let textResponse = result.response.text();

        // Pulizia preventiva
        if (textResponse.includes('```')) {
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        res.json({ success: true, tasks: JSON.parse(textResponse) });

    } catch (error) {
        console.error('[AI Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── API (con autenticazione) ─────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Config endpoint for frontend ────────────────────────────────────────────
app.get('/api/config', (_req, res) => {
    res.json({
        supabaseUrl: CONFIG.SUPABASE.URL,
        supabaseAnonKey: CONFIG.SUPABASE.ANON_KEY
    });
});

// ─── Instagram feed ────────────────────────────────────────────────────────────
app.get('/api/instagram', async (_req, res) => {
    const token = CONFIG.INSTAGRAM_TOKEN;
    if (!token) {
        return res.json([]);
    }
    try {
        const response = await fetch(
            'https://graph.instagram.com/me/media?fields=id,media_url,thumbnail_url,permalink,caption&access_token=' + token,
            { headers: { 'User-Agent': 'HDL-Server/1.0' } }
        );
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const posts = (data.data || []).slice(0, 8).map(function(post) {
            return {
                image: post.thumbnail_url || post.media_url,
                url: post.permalink,
                caption: (post.caption || '').slice(0, 120)
            };
        });
        res.json(posts);
    } catch (err) {
        console.error('[Instagram]', err.message);
        res.json([]);
    }
});

// ─── Public pages ─────────────────────────────────────────────────────────────
const publicPages = {
    '/':                   'index.html',
    '/index.html':          'index.html',
    '/chi-siamo':          'chi-siamo.html',
    '/chi-siamo.html':      'chi-siamo.html',
    '/servizi-lab':        'servizi-lab.html',
    '/servizi-lab.html':    'servizi-lab.html',
    '/portfolio':          'portfolio.html',
    '/portfolio.html':      'portfolio.html',
    '/journal':            'journal.html',
    '/journal.html':        'journal.html',
    '/collection':         'collection.html',
    '/collection.html':     'collection.html',
    '/contatti':           'contatti.html',
    '/contatti.html':       'contatti.html',
    '/login':                'login.html',
    '/login.html':            'login.html',
    '/imposta-password':      'imposta-password.html',
    '/imposta-password.html': 'imposta-password.html',
    '/dettaglio-progetto': 'dettaglio-progetto.html',
    '/dettaglio-progetto.html': 'dettaglio-progetto.html',
    '/dettaglio-immobile': 'dettaglio-immobile.html',
    '/dettaglio-immobile.html': 'dettaglio-immobile.html',
    '/dettaglio-journal': 'dettaglio-journal.html',
    '/dettaglio-journal.html': 'dettaglio-journal.html'
};

for (const [route, file] of Object.entries(publicPages)) {
    app.get(route, (_req, res) => res.sendFile(join(templatesDir, file)));
}

// ─── Client portal ────────────────────────────────────────────────────────────
app.get('/portale-cliente', (_req, res) => {
    res.sendFile(join(templatesDir, 'portale-cliente.html'), (err) => {
        if (err) res.status(404).json({ error: 'Pagina non trovata' });
    });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[server]', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(port, () => {
    console.log(`Home Design Lab → http://localhost:${port}`);
    console.log(`Supabase configured: ${Boolean(CONFIG.SUPABASE.URL)}`);
    console.log(`Drive sync enabled: ${CONFIG.GOOGLE_DRIVE.ENABLED}`);
    console.log(`Drive root folder: ${CONFIG.GOOGLE_DRIVE.ROOT_FOLDER_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`Drive service key: ${CONFIG.GOOGLE_DRIVE.SERVICE_ACCOUNT_KEY ? '✅ Set' : '❌ Missing'}`);
});
