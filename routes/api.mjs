/**
 * routes/api.mjs
 * Tutte le route API REST di Home Design Lab.
 * Pubbliche + Operatore + Cliente.
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import CONFIG from '../config.js';
import {
    authenticate,
    requireSenior,
    requireOperator,
    requirePermission,
    requireClientAccess,
    requireImpresa,
    requireRole
} from '../middleware/auth.mjs';
import { primoAccesso, recuperoPassword, nuovoContatto, nuovaNewsletter } from '../assets/js/email-templates.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: CONFIG.STORAGE.MAX_FILE_SIZE } });

// ─── Health Check & Debug ────────────────────────────────────────────────────

// Endpoint pubblico SEMPLICE per verificare che il server risponde (no auth)
router.get('/ping', (req, res) => {
    res.json({ pong: true, time: Date.now() });
});

// Endpoint pubblico per verificare che il server risponda
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        drive: {
            rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ? 'set' : 'missing',
            serviceKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'set' : 'missing'
        }
    });
});

// ─── Supabase clients ────────────────────────────────────────────────────────

function getAnonClient() {
    return createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

function getAdminClient() {
    return createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

// Supabase client con il JWT dell'utente loggato (rispetta RLS)
function getUserClient(token) {
    return createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

function extractToken(req) {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) return h.slice(7);
    return req.cookies?.hdl_token || null;
}

// ─── HEALTH / CONFIG ─────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
    res.json({ status: 'ok', runtime: 'node-express', timestamp: new Date().toISOString() });
});

router.get('/config', (req, res) => {
    res.json({
        supabaseUrl: CONFIG.SUPABASE.URL,
        supabaseAnonKey: CONFIG.SUPABASE.ANON_KEY,
        apiBasePath: CONFIG.API.BASE_PATH,
        SUPABASE_URL: CONFIG.SUPABASE.URL,
        SUPABASE_ANON_KEY: CONFIG.SUPABASE.ANON_KEY,
        STORAGE_BUCKET: CONFIG.STORAGE.BUCKET
    });
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password richiesti' });
    }

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Carica il profilo per conoscere il ruolo — controlla piu' tabelle
    let role = 'client';
    let displayName = data.user.email;

    // 1) Tenta profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, nome, avatar_url')
        .eq('user_id', data.user.id)
        .maybeSingle();

    if (profile && profile.role && profile.role !== 'client') {
        role = profile.role;
        if (profile.nome) displayName = profile.nome;
    }

    // 2) Se ancora client, controlla operatori_profiles
    if (role === 'client') {
        const { data: operatore } = await supabase
            .from('operatori_profiles')
            .select('ruolo, nome, cognome')
            .eq('email', data.user.email)
            .maybeSingle();

        if (operatore) {
            var ruolo = (operatore.ruolo || '').toLowerCase();
            role = ruolo === 'admin' ? 'admin' : (ruolo === 'senior' ? 'senior' : 'architect');
            displayName = [operatore.nome, operatore.cognome].filter(Boolean).join(' ') || displayName;
        }
    }
    const redirectPath = role === 'client' ? '/portale-cliente' : '/dashboard-senior.html';

    return res.json({
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
            id: data.user.id,
            email: data.user.email,
            role,
            display_name: displayName,
            avatar_url: profile?.avatar_url || null
        },
        redirect: redirectPath
    });
});

router.post('/auth/logout', authenticate, async (req, res) => {
    const token = extractToken(req);
    const supabase = getUserClient(token);
    await supabase.auth.signOut();
    res.json({ ok: true });
});

router.post('/auth/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token richiesto' });

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Refresh non valido' });

    res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token });
});

router.get('/auth/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// ─── PUBBLICA: PROGETTI ──────────────────────────────────────────────────────

router.get('/progetti', async (req, res, next) => {
    try {
        const { data, error } = await getAnonClient()
            .from('projects')
            .select('id, titolo, descrizione, categoria, immagini, stato, created_at')
            .eq('stato', 'pubblicato')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.get('/progetti/:id', async (req, res, next) => {
    try {
        const { data, error } = await getAnonClient()
            .from('projects')
            .select('*')
            .eq('id', req.params.id)
            .eq('stato', 'pubblicato')
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Progetto non trovato' });
        res.json(data);
    } catch (e) { next(e); }
});

// ─── PUBBLICA: ARTICOLI ──────────────────────────────────────────────────────

function mapArticle(a) {
    if (!a) return null;
    return {
        id: a.id,
        slug: a.id ? String(a.id) : '0',
        title: a.titolo || '',
        excerpt: a.descrizione || '',
        body: a.contenuto || '',
        cover_image: (a.tags && a.tags.cover_image) || null,
        category: a.categoria || '',
        status: a.stato === 'pubblicato' ? 'published' : 'draft',
        published_at: a.data || a.created_at,
        created_at: a.created_at
    };
}

router.get('/articoli', async (req, res, next) => {
    try {
        const { data, error } = await getAnonClient()
            .from('articles')
            .select('*')
            .eq('stato', 'pubblicato')
            .order('data', { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapArticle));
    } catch (e) { next(e); }
});

router.get('/articoli/:slugOrId', async (req, res, next) => {
    try {
        const param = req.params.slugOrId;
        const isNumeric = /^\d+$/.test(param);
        const query = getAnonClient()
            .from('articles')
            .select('*')
            .eq('stato', 'pubblicato');

        const { data, error } = await (isNumeric ? query.eq('id', parseInt(param)) : query.eq('id', parseInt(param))).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Articolo non trovato' });
        res.json(mapArticle(data));
    } catch (e) { next(e); }
});

// ─── PRIMO ACCESSO / RESET PASSWORD ──────────────────────────────────────────

router.post('/primo-accesso', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email non valida' });
        }

        if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.SERVICE_ROLE_KEY) {
            return res.status(503).json({ error: 'Supabase non configurato. Imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel file .env' });
        }

        const adminClient = getAdminClient();
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
        const siteUrl = CONFIG.APP.SITE_URL || `${protocol}://${host}`;
        const redirectTo = `${siteUrl}/imposta-password.html`;

        // 1. Crea l'utente auth se non esiste, oppure genera link di recovery
        let authUserId = null;
        let actionLink = null;

        // Prova prima a creare l'utente (per nuovi clienti/operatori)
        const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { source: 'primo-accesso' }
        });

        if (createError && (createError.message?.toLowerCase().includes('already exists') ||
                             createError.message?.toLowerCase().includes('already been registered') ||
                             createError.message?.toLowerCase().includes('duplicate'))) {
            // Utente già esistente — genera link recovery
            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'recovery', email, options: { redirectTo }
            });
            if (linkError) throw linkError;
            authUserId = linkData.user?.id;
            actionLink = linkData.properties?.action_link;
        } else if (createError) {
            throw createError;
        } else {
            // Nuovo utente creato — genera link di invito
            authUserId = createData.user?.id;
            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'recovery', email, options: { redirectTo }
            });
            if (linkError) throw linkError;
            actionLink = linkData.properties?.action_link;
        }

        // 2. Collega l'utente auth alla tabella operatori_profiles o clienti_profiles
        if (authUserId) {
            // Prova a linkare con operatori_profiles
            const { data: existingOperator } = await adminClient
                .from('operatori_profiles')
                .select('id, user_id')
                .eq('email', email)
                .maybeSingle();

            if (existingOperator) {
                await adminClient.from('operatori_profiles')
                    .update({ user_id: authUserId })
                    .eq('id', existingOperator.id);
                console.log(`Operatore ${email} collegato a auth user ${authUserId}`);
            } else {
                // Prova a linkare con clienti_profiles
                const { data: existingClient } = await adminClient
                    .from('clienti_profiles')
                    .select('id, user_id')
                    .eq('email', email)
                    .maybeSingle();

                if (existingClient) {
                    await adminClient.from('clienti_profiles')
                        .update({ user_id: authUserId })
                        .eq('id', existingClient.id);
                    console.log(`Cliente ${email} collegato a auth user ${authUserId}`);
                } else {
                    console.log(`Nessun profilo trovato per ${email}, skip linking`);
                }
            }
        }

        // 3. Invia l'email via SMTP (se configurazione presente)
        let emailSent = false;
        let emailError = null;
        if (CONFIG.SMTP.HOST && CONFIG.SMTP.USER && CONFIG.SMTP.PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: CONFIG.SMTP.HOST,
                    port: CONFIG.SMTP.PORT,
                    secure: CONFIG.SMTP.PORT === 465,
                    auth: { user: CONFIG.SMTP.USER, pass: CONFIG.SMTP.PASS }
                });

                let impostaPasswordLink = siteUrl + '/imposta-password.html';
                if (actionLink) {
                    try {
                        const actionUrl = new URL(actionLink);
                        const tokenHash = actionUrl.searchParams.get('token');
                        if (tokenHash) {
                            impostaPasswordLink = `${siteUrl}/imposta-password.html#token_hash=${encodeURIComponent(tokenHash)}&type=recovery&user_id=${encodeURIComponent(authUserId)}`;
                        }
                    } catch (e) {
                        console.warn('Errore parsing action_link:', e.message);
                    }
                }
                await transporter.sendMail({
                    from: `"${CONFIG.SMTP.FROM_NAME}" <${CONFIG.SMTP.FROM_EMAIL}>`,
                    to: email,
                    subject: 'Benvenuto in Home Design Lab - Imposta la tua password',
                    html: primoAccesso(impostaPasswordLink)
                });
                emailSent = true;
                console.log(`Email inviata a ${email}`);
            } catch (err) {
                emailError = err.message;
                console.error('Errore invio email:', err.message);
            }
        } else {
            console.warn('SMTP non configurato, skip invio email');
        }

        res.json({
            success: true,
            emailSent: emailSent,
            emailError: emailError
        });

    } catch (error) {
        console.error('Primo accesso error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── RESET PASSWORD (Supabase built-in + nostra email brandizzata) ──────────

router.post('/reset-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email non valida' });
        }

        if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
            return res.status(503).json({ error: 'Supabase non configurato' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
        const siteUrl = CONFIG.APP.SITE_URL || `${protocol}://${host}`;
        const supabase = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);

        // 1. Chiamata Supabase built-in (invia la sua email di default)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/imposta-password.html`
        });

        if (error) throw error;

        // 2. Inoltre inviamo la nostra email brandizzata via SMTP
        let emailSent = false;
        let emailError = null;
        if (CONFIG.SMTP.HOST && CONFIG.SMTP.USER && CONFIG.SMTP.PASS) {
            try {
                // Genera il link di reset usando la service role key (se disponibile)
                let resetLink = `${siteUrl}/imposta-password.html`;
                if (CONFIG.SUPABASE.SERVICE_ROLE_KEY) {
                    try {
                        const adminClient = getAdminClient();
                        const { data: linkData } = await adminClient.auth.admin.generateLink({
                            type: 'recovery', email, options: { redirectTo: `${siteUrl}/imposta-password.html` }
                        });
                        const actionLink = linkData?.properties?.action_link;
                        const authUserId = linkData?.user?.id;
                        if (actionLink && authUserId) {
                            const actionUrl = new URL(actionLink);
                            const tokenHash = actionUrl.searchParams.get('token');
                            if (tokenHash) {
                                resetLink = `${siteUrl}/imposta-password.html#token_hash=${encodeURIComponent(tokenHash)}&type=recovery&user_id=${encodeURIComponent(authUserId)}`;
                            }
                        }
                    } catch (e) {
                        console.warn('Impossibile generare link admin, uso fallback:', e.message);
                    }
                }

                const transporter = nodemailer.createTransport({
                    host: CONFIG.SMTP.HOST,
                    port: CONFIG.SMTP.PORT,
                    secure: CONFIG.SMTP.PORT === 465,
                    auth: { user: CONFIG.SMTP.USER, pass: CONFIG.SMTP.PASS }
                });
                await transporter.sendMail({
                    from: `"${CONFIG.SMTP.FROM_NAME}" <${CONFIG.SMTP.FROM_EMAIL}>`,
                    to: email,
                    subject: 'Recupero Password - Home Design Lab',
                    html: recuperoPassword(resetLink)
                });
                emailSent = true;
                console.log(`Email reset brandizzata inviata a ${email}`);
            } catch (err) {
                emailError = err.message;
                console.error('Errore invio email brandizzata:', err.message);
            }
        }

        res.json({ success: true, emailSent, emailError });
    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── IMPOSTA PASSWORD (via admin per evitare problemi di sessione client) ────

router.post('/imposta-password', async (req, res, next) => {
    try {
        const { user_id, password } = req.body;

        if (!user_id || !password) {
            return res.status(400).json({ error: 'Dati mancanti' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La password deve essere di almeno 6 caratteri' });
        }

        const adminClient = getAdminClient();

        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            user_id,
            { password }
        );

        if (updateError) throw updateError;

        res.json({ success: true });
    } catch (error) {
        console.error('Imposta password error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── UPLOAD IMMAGINI (proxy con service_role per bypassare RLS) ──────────────

router.post('/upload-immagine', upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File immagine richiesto' });
        }

        const admin = getAdminClient();
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;

        const { error: uploadError } = await admin.storage
            .from('immobili')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype || 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = admin.storage
            .from('immobili')
            .getPublicUrl(fileName);

        res.json({ url: publicUrlData.publicUrl });
    } catch (e) {
        console.error('[Upload Immagine] Errore:', e.message);
        next(e);
    }
});

// ─── PUBBLICA: IMMOBILI ──────────────────────────────────────────────────────

router.get('/gestione-immobili', async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('immobili')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.get('/gestione-immobili/:id', async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('immobili')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Immobile non trovato' });
        res.json(data);
    } catch (e) { next(e); }
});

router.put('/gestione-immobili/:id', async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;

        const { data, error } = await getAdminClient()
            .from('immobili')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

router.delete('/gestione-immobili/:id', async (req, res, next) => {
    try {
        const { error } = await getAdminClient().from('immobili').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.get('/immobili', async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('immobili')
            .select('*')
            .neq('status', 'bozza')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.get('/immobili/:id', async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('immobili')
            .select('*')
            .eq('id', req.params.id)
            .neq('status', 'bozza')
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Immobile non trovato' });
        res.json(data);
    } catch (e) { next(e); }
});

// ─── PUBBLICA: CONTATTI FORM ─────────────────────────────────────────────────

router.post('/contatti', async (req, res, next) => {
    try {
        const { name, email, message, subject } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Nome, email e messaggio sono richiesti' });
        }

        // Salva in Supabase
        const { error } = await getAdminClient()
            .from('contact_requests')
            .insert({ name, email, subject, message });

        if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('table') && error.message.includes('contact_requests'))) {
                // Tabella non ancora creata — procedi
            } else {
                throw error;
            }
        }

        // Invia email via SMTP (se configurato)
        if (CONFIG.SMTP.HOST && CONFIG.SMTP.USER && CONFIG.SMTP.PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: CONFIG.SMTP.HOST,
                    port: CONFIG.SMTP.PORT,
                    secure: CONFIG.SMTP.PORT === 465,
                    auth: { user: CONFIG.SMTP.USER, pass: CONFIG.SMTP.PASS }
                });

                await transporter.sendMail({
                    from: `"${CONFIG.SMTP.FROM_NAME}" <${CONFIG.SMTP.FROM_EMAIL}>`,
                    to: CONFIG.SMTP.FROM_EMAIL,
                    subject: `Nuovo contatto dal sito: ${subject || 'nessun oggetto'}`,
                    html: nuovoContatto({ name, email, subject, message })
                });
                console.log(`Email contatto inviata a info@homedesignlab.it da ${email}`);
            } catch (err) {
                console.error('Errore invio email contatto:', err.message);
            }
        }

        res.json({ ok: true, message: 'Messaggio ricevuto, ti risponderemo presto' });
    } catch (e) { next(e); }
});

// ─── NEWSLETTER ──────────────────────────────────────────────────────────────

router.post('/newsletter', async (req, res, next) => {
    try {
        const { email, source } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email non valida' });
        }

        // Salva in Supabase
        if (CONFIG.SUPABASE.URL && CONFIG.SUPABASE.SERVICE_ROLE_KEY) {
            const { error } = await getAdminClient()
                .from('newsletter_subscribers')
                .upsert({ email, source: source || 'sito', is_active: true }, { onConflict: 'email' });

            if (error && error.code !== '42P01') {
                console.error('[Newsletter] Errore salvataggio:', error.message);
            }
        }

        // Invia notifica email
        if (CONFIG.SMTP.HOST && CONFIG.SMTP.USER && CONFIG.SMTP.PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: CONFIG.SMTP.HOST,
                    port: CONFIG.SMTP.PORT,
                    secure: CONFIG.SMTP.PORT === 465,
                    auth: { user: CONFIG.SMTP.USER, pass: CONFIG.SMTP.PASS }
                });

                await transporter.sendMail({
                    from: `"${CONFIG.SMTP.FROM_NAME}" <${CONFIG.SMTP.FROM_EMAIL}>`,
                    to: CONFIG.SMTP.FROM_EMAIL,
                    subject: `[HDL Newsletter] Nuovo iscritto: ${email}`,
                    html: nuovaNewsletter(email, source)
                });
                console.log('[Newsletter] Notifica inviata per', email);
            } catch (err) {
                console.error('[Newsletter] Errore invio email:', err.message);
            }
        }

        res.json({ ok: true, message: 'Iscrizione completata con successo!' });
    } catch (e) { next(e); }
});

// ─── NOTIFICHE ───────────────────────────────────────────────────────────────

router.get('/notifiche', authenticate, async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.post('/notifiche/:id/read', authenticate, async (req, res, next) => {
    try {
        const { error } = await getAdminClient()
            .from('notifications')
            .update({ read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── PUBBLICA: RICERCA ──────────────────────────────────────────────────

router.get('/search', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        if (!q || q.length < 2) return res.json({ results: [] });

        const results = [];

        // Cerca tra i progetti
        const { data: projects } = await getAnonClient()
            .from('projects')
            .select('id, titolo, categoria, descrizione')
            .ilike('titolo', `%${q}%`)
            .limit(5);
        if (projects) {
            projects.forEach(p => results.push({
                type: 'progetto',
                title: p.titolo,
                desc: p.descrizione,
                url: '/dettaglio-progetto.html?id=' + p.id,
                category: p.categoria
            }));
        }

        // Cerca tra gli immobili
        const { data: immobili } = await getAnonClient()
            .from('properties')
            .select('id, titolo, citta, descrizione')
            .or(`titolo.ilike.%${q}%,citta.ilike.%${q}%,descrizione.ilike.%${q}%`)
            .limit(5);
        if (immobili) {
            immobili.forEach(p => results.push({
                type: 'immobile',
                title: p.titolo,
                desc: p.citta || p.descrizione,
                url: '/dettaglio-immobile.html?id=' + p.id,
                category: 'proprietà'
            }));
        }

        // Cerca tra gli articoli del journal
        const { data: articles } = await getAnonClient()
            .from('blog_posts')
            .select('id, title, excerpt, slug')
            .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(5);
        if (articles) {
            articles.forEach(p => results.push({
                type: 'articolo',
                title: p.title,
                desc: p.excerpt,
                url: '/dettaglio-journal.html?slug=' + (p.slug || p.id),
                category: 'journal'
            }));
        }

        res.json({ results });
    } catch (e) { next(e); }
});

// ─── OPERATORE: DASHBOARD ────────────────────────────────────────────────────

router.get('/operatore/dashboard', authenticate, requireOperator, async (req, res, next) => {
    try {
        const admin = getAdminClient();
        const [
            { count: projectsCount },
            { count: clientsCount },
            { count: blogCount },
            { count: propertiesCount }
        ] = await Promise.all([
            admin.from('projects').select('*', { count: 'exact', head: true }),
            admin.from('clients').select('*', { count: 'exact', head: true }),
            admin.from('articles').select('*', { count: 'exact', head: true }),
            admin.from('properties').select('*', { count: 'exact', head: true })
        ]);

        res.json({
            stats: { projects: projectsCount, clients: clientsCount, blog: blogCount, properties: propertiesCount },
            user: req.user
        });
    } catch (e) { next(e); }
});

// ─── OPERATORE: BLOG CRUD ─────────────────────────────────────────────────────

router.get('/operatore/blog', authenticate, requirePermission('blog'), async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapArticle));
    } catch (e) { next(e); }
});

router.post('/operatore/blog', authenticate, requirePermission('blog'), async (req, res, next) => {
    try {
        const { title, slug, excerpt, body, category, status, cover_image } = req.body;
        if (!title) return res.status(400).json({ error: 'title richiesto' });

        const record = {
            titolo: title,
            descrizione: excerpt || null,
            contenuto: (typeof body === 'object' ? (body.content || '') : body) || null,
            tags: cover_image ? { cover_image: cover_image } : {},
            categoria: category || null,
            stato: status === 'published' ? 'pubblicato' : 'bozza',
            data: status === 'published' ? new Date().toISOString().split('T')[0] : null
        };

        const { data, error } = await getAdminClient().from('articles').insert(record).select().single();
        if (error) throw error;
        res.status(201).json(mapArticle(data));
    } catch (e) { next(e); }
});

router.put('/operatore/blog/:id', authenticate, requirePermission('blog'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { title, slug, excerpt, body, category, status, cover_image } = req.body;

        const updates = {};
        if (title !== undefined) updates.titolo = title;
        if (excerpt !== undefined) updates.descrizione = excerpt;
        if (body !== undefined) updates.contenuto = typeof body === 'object' ? (body.content || '') : body;
        if (cover_image !== undefined) updates.tags = cover_image ? { cover_image: cover_image } : {};
        if (category !== undefined) updates.categoria = category;
        if (status !== undefined) updates.stato = status === 'published' ? 'pubblicato' : 'bozza';
        if (status === 'published') updates.data = new Date().toISOString().split('T')[0];

        const { data, error } = await getAdminClient()
            .from('articles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(mapArticle(data));
    } catch (e) {
        console.error('[Blog PUT]', e);
        next(e);
    }
});

router.delete('/operatore/blog/:id', authenticate, requirePermission('blog'), async (req, res, next) => {
    try {
        const { error } = await getAdminClient().from('articles').delete().eq('id', parseInt(req.params.id));
        if (error) throw error;
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── UPLOAD COVER (Journal) ───────────────────────────────────────────────────

router.post('/upload-cover', authenticate, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File mancante' });

        const ext = req.file.originalname.split('.').pop();
        const fileName = 'covers/cover_' + Date.now() + '.' + ext;

        const adminClient = getAdminClient();
        const { data, error } = await adminClient.storage
            .from('immobili')
            .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = adminClient.storage
            .from('immobili')
            .getPublicUrl(fileName);

        res.json({ url: publicUrl });
    } catch (e) { next(e); }
});

// ─── OPERATORE: PORTFOLIO CRUD ───────────────────────────────────────────────

router.get('/operatore/portfolio', authenticate, requirePermission('portfolio'), async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('projects')
            .select('id, title, description, category, cover_image, location, status, is_public, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.post('/operatore/portfolio', authenticate, requirePermission('portfolio'), async (req, res, next) => {
    try {
        const { title, description, category, cover_image, location, surface, duration, budget, is_public, client_id } = req.body;
        if (!title || !client_id) return res.status(400).json({ error: 'title e client_id richiesti' });

        const { data, error } = await getAdminClient()
            .from('projects')
            .insert({ title, description, category, cover_image, location, surface, duration, budget, is_public: Boolean(is_public), client_id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (e) { next(e); }
});

router.put('/operatore/portfolio/:id', authenticate, requirePermission('portfolio'), async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;

        const { data, error } = await getAdminClient()
            .from('projects')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

router.delete('/operatore/portfolio/:id', authenticate, requirePermission('portfolio'), async (req, res, next) => {
    try {
        const { error } = await getAdminClient().from('projects').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── OPERATORE: COLLECTION (IMMOBILI) CRUD ───────────────────────────────────

router.get('/operatore/collection', authenticate, requirePermission('collection'), async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.post('/operatore/collection', authenticate, requirePermission('collection'), async (req, res, next) => {
    try {
        const { title, description, market_status, price, currency, surface, rooms, location, energy_class, cover_image, is_public } = req.body;
        if (!title) return res.status(400).json({ error: 'title richiesto' });

        const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
        const { data, error } = await getAdminClient()
            .from('properties')
            .insert({ title, slug, description, market_status, price, currency, surface, rooms, location, energy_class, cover_image, is_public: Boolean(is_public), created_by: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (e) { next(e); }
});

router.put('/operatore/collection/:id', authenticate, requirePermission('collection'), async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        const { data, error } = await getAdminClient()
            .from('properties')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

router.delete('/operatore/collection/:id', authenticate, requirePermission('collection'), async (req, res, next) => {
    try {
        const { error } = await getAdminClient().from('properties').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ─── OPERATORE: CLIENTI ──────────────────────────────────────────────────────

router.get('/operatore/clienti', authenticate, requirePermission('clients'), async (req, res, next) => {
    try {
        let query = getAdminClient()
            .from('clients')
            .select('id, legal_name, billing_email, phone, assigned_operator_id, created_at')
            .order('legal_name');

        // operator con allowed_client_ids limitato
        const perms = req.user.permissions;
        if (req.user.role === 'operator' && perms?.allowed_client_ids?.length) {
            query = query.in('id', perms.allowed_client_ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.get('/operatore/clienti/:id', authenticate, requirePermission('clients'), requireClientAccess, async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('clients')
            .select('*, projects(id, title, status, created_at)')
            .eq('id', req.params.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Cliente non trovato' });
        res.json(data);
    } catch (e) { next(e); }
});

router.post('/operatore/clienti', authenticate, requirePermission('clients'), async (req, res, next) => {
    try {
        const { legal_name, billing_email, phone, tax_id, billing_address, notes_internal, assigned_operator_id } = req.body;
        if (!legal_name) return res.status(400).json({ error: 'legal_name richiesto' });

        const { data, error } = await getAdminClient()
            .from('clients')
            .insert({ legal_name, billing_email, phone, tax_id, billing_address, notes_internal, assigned_operator_id, created_by: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (e) { next(e); }
});

router.put('/operatore/clienti/:id', authenticate, requirePermission('clients'), requireClientAccess, async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        const { data, error } = await getAdminClient()
            .from('clients')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

// ─── OPERATORE: FILE UPLOAD per cliente ──────────────────────────────────────

router.post('/operatore/clienti/:id/documenti', authenticate, requirePermission('clients'), requireClientAccess, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File richiesto' });

        const clientId = req.params.id;
        const { projectId, title, visibility } = req.body;
        const admin = getAdminClient();

        // 1. Upload su Supabase Storage
        const ext = req.file.originalname.split('.').pop();
        const storagePath = `clients/${clientId}/${Date.now()}_${req.file.originalname}`;

        const { error: uploadError } = await admin.storage
            .from(CONFIG.STORAGE.BUCKET)
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 2. Registro in DB
        const { data: doc, error: dbError } = await admin
            .from('project_documents')
            .insert({
                project_id: projectId,
                uploaded_by: req.user.id,
                title: title || req.file.originalname,
                storage_path: storagePath,
                mime_type: req.file.mimetype,
                size_bytes: req.file.size,
                visibility: visibility || 'internal'
            })
            .select()
            .single();

        if (dbError) throw dbError;
        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// ─── SENIOR: GESTIONE PERMESSI OPERATORI ────────────────────────────────────

router.get('/senior/operatori', authenticate, requireSenior, async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('profiles')
            .select('id, nome, avatar_url, created_at, operator_permissions(can_blog, can_portfolio, can_collection, can_clients, allowed_client_ids)')
            .eq('role', 'operator')
            .order('created_at');
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

router.put('/senior/operatori/:id/permessi', authenticate, requireSenior, async (req, res, next) => {
    try {
        const { can_blog, can_portfolio, can_collection, can_clients, allowed_client_ids } = req.body;
        const admin = getAdminClient();

        const record = {
            operator_id: req.params.id,
            can_blog: Boolean(can_blog),
            can_portfolio: Boolean(can_portfolio),
            can_collection: Boolean(can_collection),
            can_clients: Boolean(can_clients),
            allowed_client_ids: allowed_client_ids || null,
            granted_by: req.user.id
        };

        const { data, error } = await admin
            .from('operator_permissions')
            .upsert(record, { onConflict: 'operator_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

// Promuovi utente a operator
router.post('/senior/utenti/:id/promuovi', authenticate, requireSenior, async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['operator', 'client', 'senior'].includes(role)) {
            return res.status(400).json({ error: 'Ruolo non valido' });
        }

        const { data, error } = await getAdminClient()
            .from('profiles')
            .update({ role })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

// ─── PORTALE CLIENTE ─────────────────────────────────────────────────────────

router.get('/cliente/dashboard', authenticate, async (req, res, next) => {
    try {
        const token = extractToken(req);
        const supabase = getUserClient(token);

        // Trova il cliente in clienti_profiles tramite user_id (o email come fallback)
        const { data: clientProfile } = await supabase
            .from('clienti_profiles')
            .select('id, nome, email')
            .eq('user_id', req.user.id)
            .maybeSingle();

        if (!clientProfile && req.user.email) {
            // Fallback: cerca per email se user_id non è ancora collegato
            const { data: byEmail } = await supabase
                .from('clienti_profiles')
                .select('id, nome, email')
                .eq('email', req.user.email)
                .maybeSingle();
            if (byEmail) {
                // Collega user_id per il futuro
                await supabase.from('clienti_profiles').update({ user_id: req.user.id }).eq('id', byEmail.id);
                return res.json({
                    client: { id: byEmail.id, legal_name: byEmail.nome || byEmail.email },
                    projects: [],
                    documents: []
                });
            }
        }

        if (!clientProfile) {
            return res.json({ client: null, projects: [], documents: [] });
        }

        const clientId = clientProfile.id;

        // Ottieni prima i progetti del cliente
        const { data: projects } = await supabase
            .from('projects')
            .select('id, titolo, descrizione, status, stato, avanzamento, created_at, data_inizio, data_consegna')
            .eq('cliente_id', clientId)
            .order('created_at', { ascending: false });

        // Poi ottieni i documenti visibili al cliente per questi progetti
        let documents = [];
        if (projects && projects.length > 0) {
            const projectIds = projects.map(p => p.id);
            const { data: docs } = await supabase
                .from('project_documents')
                .select('id, title, storage_path, mime_type, size_bytes, visibility, created_at')
                .eq('visibility', 'client_visible')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false });
            documents = docs || [];
        }

        res.json({
            client: { id: clientProfile.id, legal_name: clientProfile.nome || clientProfile.email },
            projects: projects || [],
            documents: documents
        });
    } catch (e) { next(e); }
});

// Upload file dal cliente
router.post('/cliente/upload', authenticate, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'client') {
            return res.status(403).json({ error: 'Solo i clienti possono usare questo endpoint' });
        }
        if (!req.file) return res.status(400).json({ error: 'File richiesto' });

        const { projectId, title } = req.body;
        if (!projectId) return res.status(400).json({ error: 'projectId richiesto' });

        const admin = getAdminClient();
        const storagePath = `client-uploads/${req.user.id}/${Date.now()}_${req.file.originalname}`;

        const { error: uploadError } = await admin.storage
            .from(CONFIG.STORAGE.BUCKET)
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: doc, error: dbError } = await admin
            .from('project_documents')
            .insert({
                project_id: projectId,
                uploaded_by: req.user.id,
                title: title || req.file.originalname,
                storage_path: storagePath,
                mime_type: req.file.mimetype,
                size_bytes: req.file.size,
                visibility: 'internal'   // visibile all'operatore, non pubblico
            })
            .select()
            .single();

        if (dbError) throw dbError;
        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// Download URL firmato
router.get('/documenti/:id/download', authenticate, async (req, res, next) => {
    try {
        const token = extractToken(req);
        const supabase = getUserClient(token);

        const { data: doc, error } = await supabase
            .from('project_documents')
            .select('storage_path')
            .eq('id', req.params.id)
            .maybeSingle();

        if (error) throw error;
        if (!doc) return res.status(404).json({ error: 'Documento non trovato' });

        const { data: signedUrl, error: urlError } = await getAdminClient().storage
            .from(CONFIG.STORAGE.BUCKET)
            .createSignedUrl(doc.storage_path, 3600);

        if (urlError) throw urlError;
        res.json({ url: signedUrl.signedUrl });
    } catch (e) { next(e); }
});

// ─── PORTALE IMPRESE ─────────────────────────────────────────────────────────

// Dashboard impresa: cantieri + documenti + profilo impresa (con DURC)
router.get('/impresa/dashboard', authenticate, requireImpresa, async (req, res, next) => {
    try {
        var admin = getAdminClient();
        var userId = req.user.id;

        // Trova l'impresa collegata all'utente
        var { data: impresa } = await admin
            .from('imprese')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!impresa) {
            return res.status(404).json({ error: 'Profilo impresa non trovato' });
        }

        // Trova i cantieri a cui l'impresa è associata
        var { data: cantieri } = await admin
            .from('cantiere_imprese')
            .select('id_cantiere, data_inizio_lavori, note_incarico')
            .eq('id_impresa', impresa.id);

        var cantiereIds = (cantieri || []).map(function(c) { return c.id_cantiere; });

        var progetti = [];
        if (cantiereIds.length > 0) {
            var { data: projs } = await admin
                .from('projects')
                .select('id, titolo, descrizione, status, avanzamento, created_at, data_inizio, data_consegna')
                .in('id', cantiereIds)
                .order('created_at', { ascending: false });
            progetti = projs || [];
        }

        // Trova i documenti condivisi in questi cantieri
        var documentiCondivisi = [];
        var documentiPrivati = [];
        if (cantiereIds.length > 0) {
            var { data: docs } = await admin
                .from('project_documents')
                .select('*')
                .in('project_id', cantiereIds);
            (docs || []).forEach(function(d) {
                if (d.storage_path && d.storage_path.indexOf('aree_private_imprese/' + impresa.id) !== -1) {
                    documentiPrivati.push(d);
                } else if (d.storage_path && d.storage_path.indexOf('documenti_condivisi') !== -1) {
                    documentiCondivisi.push(d);
                }
            });
        }

        res.json({
            impresa: {
                id: impresa.id,
                ragione_sociale: impresa.ragione_sociale,
                partita_iva: impresa.partita_iva,
                stato_durc: impresa.stato_durc,
                scadenza_durc: impresa.scadenza_durc,
                specializzazione: impresa.specializzazione,
                pec: impresa.pec,
                codice_sdi: impresa.codice_sdi,
                referente_cantiere: impresa.referente_cantiere,
                telefono: impresa.telefono,
                email_principale: impresa.email_principale
            },
            progetti: progetti,
            cantieri: cantieri || [],
            documenti_condivisi: documentiCondivisi,
            documenti_privati: documentiPrivati
        });
    } catch (e) { next(e); }
});

// Upload file impresa (nella propria cartella privata o documenti condivisi)
router.post('/impresa/upload', authenticate, requireImpresa, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
        if (req.user.role !== 'impresa' && !['senior', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Solo le imprese o admin possono caricare qui' });
        }

        var admin = getAdminClient();
        var userId = req.user.id;
        var { data: impresa } = await admin.from('imprese').select('id').eq('user_id', userId).maybeSingle();
        if (!impresa) return res.status(404).json({ error: 'Impresa non trovata' });

        var cantiereId = req.body.cantiere_id;
        var tipo = req.body.tipo || 'privato'; // 'privato' o 'condiviso'
        var folderPath = tipo === 'condiviso'
            ? cantiereId + '/documenti_condivisi/'
            : cantiereId + '/aree_private_imprese/' + impresa.id + '/';
        var storagePath = folderPath + Date.now() + '_' + req.file.originalname;

        var { error: uploadError } = await admin.storage
            .from(CONFIG.STORAGE.BUCKET)
            .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) throw uploadError;

        var { data: doc, error: dbError } = await admin
            .from('project_documents')
            .insert({
                project_id: cantiereId,
                title: req.body.title || req.file.originalname,
                storage_path: storagePath,
                mime_type: req.file.mimetype,
                size_bytes: req.file.size,
                visibility: 'internal',
                tipo_upload: 'impresa'
            })
            .select()
            .single();
        if (dbError) throw dbError;

        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// Download documenti per impresa (con controllo accesso)
router.get('/impresa/documenti/:id/download', authenticate, requireImpresa, async (req, res, next) => {
    try {
        var admin = getAdminClient();
        var { data: doc } = await admin
            .from('project_documents')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (!doc) return res.status(404).json({ error: 'Documento non trovato' });

        if (req.user.role === 'impresa') {
            var { data: impresa } = await admin.from('imprese').select('id').eq('user_id', req.user.id).maybeSingle();
            var path = doc.storage_path || '';
            var impresaId = impresa ? impresa.id : '0';
            var isCondiviso = path.indexOf('documenti_condivisi') !== -1;
            var isProprio = path.indexOf('aree_private_imprese/' + impresaId) !== -1;
            if (!isCondiviso && !isProprio) {
                return res.status(403).json({ error: 'Accesso negato a questo documento' });
            }
        }

        var { data: signedUrl, error: urlError } = await admin.storage
            .from(CONFIG.STORAGE.BUCKET)
            .createSignedUrl(doc.storage_path, 3600);
        if (urlError) throw urlError;
        res.json({ url: signedUrl.signedUrl });
    } catch (e) { next(e); }
});

// Dettaglio cantiere (tutti i documenti condivisi + privati per questa impresa)
router.get('/impresa/cantiere/:id', authenticate, requireImpresa, async (req, res, next) => {
    try {
        var admin = getAdminClient();
        var cantiereId = parseInt(req.params.id, 10);

        var { data: cantiere, error: cErr } = await admin
            .from('projects')
            .select('id, titolo, descrizione, stato, data_inizio, data_consegna, avanzamento, cliente')
            .eq('id', cantiereId)
            .maybeSingle();
        if (cErr) throw cErr;
        if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });

        console.log('[cantiere] trovato:', cantiere.id, cantiere.titolo, 'utente:', req.user.email);

        var impresaId = '0';
        var { data: impresa } = await admin.from('imprese').select('id').eq('user_id', req.user.id).maybeSingle();
        if (impresa) impresaId = impresa.id;

        var { data: incarico } = await admin
            .from('cantiere_imprese')
            .select('data_inizio_lavori, note_incarico')
            .eq('id_cantiere', cantiereId)
            .eq('id_impresa', impresaId)
            .maybeSingle();

        var { data: docs } = await admin
            .from('project_documents')
            .select('*')
            .eq('project_id', cantiereId);

        var documentiCondivisi = [];
        var documentiPrivati = [];
        (docs || []).forEach(function(d) {
            if (d.storage_path && d.storage_path.indexOf('aree_private_imprese/' + impresaId) !== -1) {
                documentiPrivati.push(d);
            } else if (d.storage_path && d.storage_path.indexOf('documenti_condivisi') !== -1) {
                documentiCondivisi.push(d);
            }
        });

        res.json({
            cantiere: cantiere,
            incarico: incarico,
            documenti_condivisi: documentiCondivisi,
            documenti_privati: documentiPrivati
        });
    } catch (e) { next(e); }
});

// ─── AMMINISTRAZIONE: GESTIONE IMPRESE ──────────────────────────────────────

// Lista tutte le imprese (per admin/senior)
router.get('/senior/imprese', authenticate, requireRole('senior', 'admin'), async (req, res, next) => {
    try {
        const admin = getAdminClient();
        const { data, error } = await admin
            .from('imprese')
            .select('*')
            .order('ragione_sociale', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

// Dettaglio singola impresa
router.get('/senior/imprese/:id', authenticate, requireRole('senior', 'admin'), async (req, res, next) => {
    try {
        const admin = getAdminClient();
        const { data, error } = await admin
            .from('imprese')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Impresa non trovata' });
        res.json(data);
    } catch (e) { next(e); }
});

// Aggiorna impresa (dati anagrafici, fiscali, DURC)
router.put('/senior/imprese/:id', authenticate, requireRole('senior', 'admin'), async (req, res, next) => {
    try {
        const admin = getAdminClient();
        var updates = req.body;
        delete updates.id;
        delete updates.user_id;
        delete updates.created_at;
        delete updates.updated_at;

        const { data, error } = await admin
            .from('imprese')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) { next(e); }
});

// Upload admin — file nella cartella privata di una specifica impresa (per cantiere)
router.post('/senior/imprese/upload-privato', authenticate, requireRole('senior', 'admin'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

        var admin = getAdminClient();
        var cantiereId = req.body.cantiere_id;
        var impresaId = req.body.impresa_id;
        if (!cantiereId || !impresaId) return res.status(400).json({ error: 'cantiere_id e impresa_id richiesti' });

        var storagePath = cantiereId + '/aree_private_imprese/' + impresaId + '/' + Date.now() + '_' + req.file.originalname;

        var { error: uploadError } = await admin.storage
            .from(CONFIG.STORAGE.BUCKET)
            .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) throw uploadError;

        var { data: doc, error: dbError } = await admin
            .from('project_documents')
            .insert({
                project_id: cantiereId,
                title: req.body.title || req.file.originalname,
                storage_path: storagePath,
                mime_type: req.file.mimetype,
                size_bytes: req.file.size,
                visibility: 'internal',
                tipo_upload: 'admin_impresa'
            })
            .select()
            .single();
        if (dbError) throw dbError;

        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// ─── GOOGLE DRIVE SYNC: Creazione automatica progetti da cartelle ────────────

// Configurazione cartella root Drive (da env vars)
const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

// Debug: log config status (senza esporre la chiave completa)
console.log('[Drive Config] Root folder:', DRIVE_ROOT_FOLDER_ID ? '✅ Set' : '❌ Missing');
console.log('[Drive Config] Service key:', GOOGLE_SERVICE_ACCOUNT_KEY ? `✅ Set (${GOOGLE_SERVICE_ACCOUNT_KEY.length} chars)` : '❌ Missing');

// 🔄 CACHE TOKEN GOOGLE - evita rigenerazione JWT ad ogni chiamata
let cachedGoogleToken = {
    token: null,
    expiresAt: 0,  // timestamp in millisecondi
    bufferTime: 5 * 60 * 1000  // 5 minuti di margine prima della scadenza
};

// Ottieni access token usando Service Account (con caching automatico)
async function getGoogleAccessToken() {
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY non configurata nel backend');
    }
    
    const now = Date.now();
    
    // Forza refresh del token (scope cambiato)
    cachedGoogleToken.token = null;
    cachedGoogleToken.expiresAt = 0;

    // Genera nuovo token
    console.log('[Drive Sync] Generating new Google JWT...');
    
    // Fix: pulisci caratteri di controllo dal JSON del Service Account
    let keyString = GOOGLE_SERVICE_ACCOUNT_KEY;
    // Rimuovi SOLO caratteri di controllo reali (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F-0x9F)
    // NON rimuovere \n (0x0A) e \r (0x0D) e \t (0x09) perché validi in JSON
    keyString = keyString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    // NON convertire \\n in newline prima del parse! JSON.parse gestisce \n da solo
    let key = JSON.parse(keyString);
    
    if (!key.private_key) {
        throw new Error('Chiave privata mancante nel Service Account');
    }
    
    // Fix: assicurati che la private_key abbia i newline corretti
    let privateKey = key.private_key;
    // Se dopo JSON.parse ci sono ancora \n letterali (doppio escape), convertili
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    console.log('[Drive Sync] Generating JWT for:', key.client_email);
    
    const nowSeconds = Math.floor(now / 1000);
    
    // Crea JWT per Service Account
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const jwtClaim = Buffer.from(JSON.stringify({
        iss: key.client_email,
        sub: key.client_email,
        scope: 'https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        iat: nowSeconds,
        exp: nowSeconds + 3600  // 1 ora
    })).toString('base64url');
    
    // Firma JWT con chiave privata
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${jwtHeader}.${jwtClaim}`);
    const signature = sign.sign(privateKey, 'base64url');
    const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;
    
    // Scambia JWT per access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Token error: ${data.error_description || data.error}`);
    }
    
    // 💾 Salva in cache con scadenza (1 ora dal momento della generazione)
    cachedGoogleToken.token = data.access_token;
    cachedGoogleToken.expiresAt = now + (data.expires_in * 1000);  // expires_in è in secondi
    
    console.log(`[Drive Sync] New Google token cached (expires in ${data.expires_in}s)`);
    return data.access_token;
}

// 🔄 Funzione per forzare il refresh del token (utile in caso di errori 401 da Google)
function forceGoogleTokenRefresh() {
    console.log('[Drive Sync] Forcing Google token refresh...');
    cachedGoogleToken.token = null;
    cachedGoogleToken.expiresAt = 0;
}

// Test endpoint - verifica configurazione Drive
router.get('/drive/test-config', authenticate, requireSenior, async (req, res) => {
    const config = {
        rootFolderId: DRIVE_ROOT_FOLDER_ID,
        hasServiceKey: Boolean(GOOGLE_SERVICE_ACCOUNT_KEY),
        serviceKeyLength: GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0,
        serviceKeyValid: false,
        serviceEmail: null
    };
    
    if (GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
            const keyString = GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
            const key = JSON.parse(keyString);
            config.serviceKeyValid = true;
            config.serviceEmail = key.client_email;
        } catch (e) {
            config.serviceKeyError = e.message;
        }
    }
    
    res.json(config);
});

// Test Connection: Elenca sottocartelle della root di Drive
router.get('/drive/test-connection', authenticate, async (req, res, next) => {
    try {
        console.log('[Drive Test] Verifica connessione Google Drive...');
        
        if (!DRIVE_ROOT_FOLDER_ID) {
            console.log('[Drive Test] ❌ Root folder non configurata');
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID non configurata',
                message: 'Imposta la variabile d\'ambiente GOOGLE_DRIVE_ROOT_FOLDER_ID'
            });
        }
        
        if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
            console.log('[Drive Test] ❌ Service Account Key mancante');
            return res.status(500).json({ 
                success: false,
                error: 'GOOGLE_SERVICE_ACCOUNT_KEY non configurata',
                message: 'Configura la chiave del Service Account'
            });
        }

        console.log('[Drive Test] Root folder ID:', DRIVE_ROOT_FOLDER_ID);
        console.log('[Drive Test] Ottenendo access token...');
        
        // Ottieni token
        const accessToken = await getGoogleAccessToken();
        console.log('[Drive Test] ✅ Token ottenuto');
        
        // Elenca sottocartelle dalla root
        console.log('[Drive Test] Richiesta sottocartelle a Google Drive...');
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)&orderBy=name`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
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
            console.log('[Drive Test] Nessuna sottocartella trovata nella root');
        }
        console.log('[Drive Test] ================================');

        res.json({
            success: true,
            message: `Connessione Drive riuscita - ${folders?.length || 0} sottocartelle trovate`,
            rootFolderId: DRIVE_ROOT_FOLDER_ID,
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
        next(e);
    }
});

// Elenca file in una cartella Drive specifica
router.get('/drive/files/:folderId', authenticate, async (req, res, next) => {
    try {
        const { folderId } = req.params;
        
        if (!folderId) {
            return res.status(400).json({ error: 'folderId richiesto' });
        }

        console.log(`[Drive Files] Listing files in folder: ${folderId}`);
        
        const accessToken = await getGoogleAccessToken();
        
        // Elenca file (non cartelle) dalla cartella specificata
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=name`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!driveResponse.ok) {
            const error = await driveResponse.json();
            throw new Error(`Google Drive API error: ${error.error?.message || JSON.stringify(error)}`);
        }

        const { files } = await driveResponse.json();
        
        console.log(`[Drive Files] Trovati ${files?.length || 0} file`);

        res.json({
            success: true,
            folderId,
            filesFound: files?.length || 0,
            files: files?.map(f => ({
                id: f.id,
                name: f.name,
                mimeType: f.mimeType,
                size: f.size,
                createdTime: f.createdTime,
                modifiedTime: f.modifiedTime,
                webViewLink: f.webViewLink,
                webContentLink: f.webContentLink,
                downloadUrl: f.webContentLink,
                icon: getFileIcon(f.mimeType)
            })) || []
        });

    } catch (e) {
        console.error('[Drive Files] ❌ Errore:', e.message);
        next(e);
    }
});

// Helper per icona file
function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'description';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'movie';
    if (mimeType.includes('audio')) return 'audio_file';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'article';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'folder_zip';
    if (mimeType.includes('dwg') || mimeType.includes('cad')) return 'architecture';
    return 'insert_drive_file';
}

// Sincronizzazione automatica - nessun input richiesto
router.post('/drive/sync-auto', authenticate, async (req, res, next) => {
    try {
        console.log('[Drive Sync] Starting auto sync...');
        
        if (!DRIVE_ROOT_FOLDER_ID) {
            console.log('[Drive Sync] ERROR: Root folder not configured');
            return res.status(500).json({ 
                error: 'Cartella Drive root non configurata',
                message: 'Imposta GOOGLE_DRIVE_ROOT_FOLDER_ID nel file .env del server'
            });
        }
        
        console.log('[Drive Sync] Root folder:', DRIVE_ROOT_FOLDER_ID);

        // Ottieni token automatico con Service Account
        console.log('[Drive Sync] Getting access token...');
        const accessToken = await getGoogleAccessToken();
        console.log('[Drive Sync] Token obtained successfully');
        
        // 1. Leggi sottocartelle dalla cartella root configurata
        let driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        // 🔄 Se Google ritorna 401, forza refresh del token e riprova
        if (driveResponse.status === 401) {
            console.log('[Drive Sync] Google token 401, forcing refresh...');
            forceGoogleTokenRefresh();
            
            // Ottieni nuovo token
            const newAccessToken = await getGoogleAccessToken();
            
            // Riprova la chiamata
            driveResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)`,
                {
                    headers: {
                        'Authorization': `Bearer ${newAccessToken}`
                    }
                }
            );
        }

        if (!driveResponse.ok) {
            const error = await driveResponse.json();
            throw new Error(`Google Drive API error: ${error.error?.message || 'Unknown'}`);
        }

        const { files: folders } = await driveResponse.json();
        
        if (!folders || folders.length === 0) {
            return res.json({ 
                success: true,
                message: 'Nessuna sottocartella trovata nella cartella root',
                created: [],
                updated: [],
                foldersFound: 0
            });
        }

        // 2. Per ogni cartella, crea o aggiorna progetto in Supabase
        const admin = getAdminClient();
        const created = [];
        const updated = [];
        const errors = [];

        for (const folder of folders) {
            try {
                // Controlla se esiste già un progetto con questo drive_folder_id
                const { data: existing } = await admin
                    .from('projects')
                    .select('id, title, drive_folder_id')
                    .eq('drive_folder_id', folder.id)
                    .maybeSingle();

                if (existing) {
                    // Aggiorna se il nome è cambiato
                    if (existing.title !== folder.name) {
                        const { data: updatedProject } = await admin
                            .from('projects')
                            .update({ 
                                title: folder.name,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id)
                            .select()
                            .single();
                        updated.push(updatedProject);
                    }
                } else {
                    // Crea nuovo progetto
                    const { data: newProject, error: insertError } = await admin
                        .from('projects')
                        .insert({
                            title: folder.name,
                            description: `Progetto sincronizzato da Google Drive`,
                            drive_folder_id: folder.id,
                            drive_folder_url: `https://drive.google.com/drive/folders/${folder.id}`,
                            status: 'active',
                            is_public: false,
                            category: 'drive-auto-sync',
                            created_by: req.user.id
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    created.push(newProject);
                }
            } catch (err) {
                errors.push({ folder: folder.name, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Sincronizzazione automatica completata: ${created.length} creati, ${updated.length} aggiornati`,
            created,
            updated,
            errors: errors.length > 0 ? errors : undefined,
            foldersFound: folders.length,
            rootFolder: DRIVE_ROOT_FOLDER_ID
        });

    } catch (e) { next(e); }
});

// Endpoint legacy (manuale) - deprecato ma mantenuto per compatibilità
router.post('/drive/sync-folders', authenticate, requireSenior, async (req, res, next) => {
    try {
        // Reindirizza alla nuova sincronizzazione automatica
        if (DRIVE_ROOT_FOLDER_ID) {
            return res.redirect(307, '/api/drive/sync-auto');
        }
        
        // Fallback alla vecchia implementazione manuale
        const { driveFolderId } = req.body;
        if (!driveFolderId) {
            return res.status(400).json({ error: 'driveFolderId richiesto (o configura GOOGLE_DRIVE_ROOT_FOLDER_ID in .env)' });
        }

        const accessToken = req.headers['x-google-access-token'];
        if (!accessToken) {
            return res.status(400).json({ 
                error: 'Token Google mancante',
                message: 'Configura GOOGLE_SERVICE_ACCOUNT_KEY nel .env per sincronizzazione automatica'
            });
        }

        // ... (vecchia implementazione)
        res.json({ message: 'Usa /api/drive/sync-auto per sincronizzazione automatica' });

    } catch (e) { next(e); }
});

// Ottieni lista progetti con link Drive
router.get('/drive/projects', authenticate, requireSenior, async (req, res, next) => {
    try {
        const { data, error } = await getAdminClient()
            .from('projects')
            .select('id, title, description, status, drive_folder_id, drive_folder_url, client_id, created_at')
            .not('drive_folder_id', 'is', null)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (e) { next(e); }
});

// Upload file su Google Drive
router.post('/drive/upload', authenticate, async (req, res, next) => {
    try {
        const { folderId, fileName, fileContent, mimeType } = req.body;
        
        if (!folderId || !fileName || !fileContent) {
            return res.status(400).json({ 
                error: 'folderId, fileName e fileContent sono richiesti' 
            });
        }

        console.log(`[Drive Upload] Uploading ${fileName} to folder ${folderId}`);
        
        const accessToken = await getGoogleAccessToken();
        
        // Converti base64 in buffer se necessario
        const content = fileContent.includes('base64') 
            ? Buffer.from(fileContent.split(',')[1], 'base64')
            : Buffer.from(fileContent, 'base64');
        
        // Crea il file metadata
        const metadata = {
            name: fileName,
            parents: [folderId]
        };
        
        // Boundary per multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelimiter = "\r\n--" + boundary + "--";
        
        // Crea il body multipart
        const multipartBody = 
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n` +
            content +
            closeDelimiter;
        
        // Upload a Drive
        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`,
                    'Content-Length': multipartBody.length
                },
                body: multipartBody
            }
        );

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(`Upload error: ${error.error?.message || JSON.stringify(error)}`);
        }

        const fileData = await uploadResponse.json();
        
        console.log(`[Drive Upload] ✅ File uploaded: ${fileData.id}`);

        res.json({
            success: true,
            message: 'File caricato con successo',
            file: {
                id: fileData.id,
                name: fileData.name,
                mimeType: fileData.mimeType,
                url: `https://drive.google.com/file/d/${fileData.id}/view`
            }
        });

    } catch (e) {
        console.error('[Drive Upload] ❌ Errore:', e.message);
        next(e);
    }
});

// ─── Setup: Promuovi utente a Senior (one-time) ────────────────────────────────────
router.post('/admin/promuovi-senior', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email richiesta' });
        }

        const admin = getAdminClient();

        const { data: users, error: userError } = await admin.auth.admin.listUsers();
        if (userError) {
            return res.status(500).json({ error: 'Errore ricerca utente: ' + userError.message });
        }

        const targetUser = users.users.find(function(u) { return u.email === email; });
        if (!targetUser) {
            return res.status(404).json({ error: 'Utente non trovato: ' + email });
        }

        // Upsert il record in profiles (crea se non esiste, aggiorna se esiste)
        var result = await admin
            .from('profiles')
            .upsert({ user_id: targetUser.id, role: 'senior', email: email, nome: email.split('@')[0] })
            .select();

        if (result.error) {
            return res.status(500).json({ error: 'Errore upsert profilo: ' + result.error.message, detail: result.error });
        }

        console.log('[Setup] ✅ Utente', email, 'promosso a senior');
        res.json({ success: true, message: 'Utente ' + email + ' promosso a senior', data: result.data });
    } catch (e) {
        console.error('[Setup] ❌ Errore:', e.message);
        res.status(500).json({ error: e.message });
    }
});


// ─── CREA SOTTOCARTELLE DRIVE PER PROGETTO ────────────────────────────
router.post('/drive/setup-project-folders', authenticate, async (req, res, next) => {
    try {
        const { projectId } = req.body;
        if (!projectId) return res.status(400).json({ error: 'projectId richiesto' });

        const admin = getAdminClient();
        const { data: project, error: projErr } = await admin.from('projects').select('id, titolo, drive_folder_id, dettagli').eq('id', projectId).single();
        if (projErr) return res.status(500).json({ error: 'Errore query progetto: ' + projErr.message });
        if (!project) return res.status(404).json({ error: 'Progetto non trovato' });

        let parentFolderId = project.drive_folder_id;
        const accessToken = await getGoogleAccessToken();
        
        if (!parentFolderId) {
            if (!DRIVE_ROOT_FOLDER_ID) return res.status(500).json({ error: 'Root folder Drive non configurata' });
            var folderName = (project.id || '') + '-' + (project.titolo || 'progetto').replace(/[^a-zA-Z0-9]/g, '_');
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_ROOT_FOLDER_ID] })
            });
            const folderData = await createRes.json();
            if (!createRes.ok) throw new Error('Creazione cartella fallita: ' + JSON.stringify(folderData));
            parentFolderId = folderData.id;
            await admin.from('projects').update({ drive_folder_id: parentFolderId, drive_folder_url: 'https://drive.google.com/drive/folders/' + parentFolderId }).eq('id', projectId);
        }

        const subfolders = ['Documenti', 'Contratti', 'Moodboard', 'Bozze_e_Idee'];
        const results = {};
        for (const name of subfolders) {
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] })
            });
            const data = await createRes.json();
            if (!createRes.ok) throw new Error('Errore creazione ' + name + ': ' + JSON.stringify(data));
            results[name] = data.id;
        }

        const dettagli = project.dettagli || {};
        dettagli.drive = dettagli.drive || {};
        dettagli.drive.documenti_id = results['Documenti'];
        dettagli.drive.contratti_id = results['Contratti'];
        dettagli.drive.moodboard_id = results['Moodboard'];
        dettagli.drive.bozze_id = results['Bozze_e_Idee'];
        dettagli.drive.root_id = parentFolderId;
        await admin.from('projects').update({ dettagli: dettagli }).eq('id', projectId);

        res.json({ success: true, message: 'Sottocartelle Drive create con successo', parentFolderId, parentFolderUrl: 'https://drive.google.com/drive/folders/' + parentFolderId, subfolders: results });
    } catch (e) {
        console.error('[Setup Drive]', e);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

export default router;
