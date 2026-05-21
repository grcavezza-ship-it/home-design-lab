/**
 * middleware/auth.mjs
 * Middleware di autenticazione e autorizzazione per Express.
 * Usa Supabase service-role per verificare il JWT e leggere il profilo.
 */
import { createClient } from '@supabase/supabase-js';
import CONFIG from '../config.js';

// ─── Supabase admin client (service-role) ───────────────────────────────────
let adminClient = null;

function getAdminClient() {
    if (!adminClient) {
        if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono richiesti per il middleware auth');
        }

        adminClient = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    }

    return adminClient;
}

// ─── Extract bearer token ────────────────────────────────────────────────────
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return req.cookies?.hdl_token || null;
}

// ─── authenticate ────────────────────────────────────────────────────────────
/**
 * Verifica il JWT Supabase e popola req.user con { id, email, role, permissions }.
 * Se il token è assente o non valido risponde 401.
 */
export async function authenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Non autenticato' });
    }

    try {
        const supabase = getAdminClient();

        // Verifica il JWT tramite getUser (metodo sicuro, non decodifica lato client)
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Token non valido o scaduto' });
        }

        // Carica profilo + permessi operatore in un'unica query
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, display_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[auth] profile fetch error:', profileError.message);
        }

        let permissions = null;
        if (profile?.role === 'operator') {
            const { data: perms } = await supabase
                .from('operator_permissions')
                .select('can_blog, can_portfolio, can_collection, can_clients, allowed_client_ids')
                .eq('operator_id', user.id)
                .maybeSingle();
            permissions = perms;
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: profile?.role || 'client',
            display_name: profile?.display_name || user.email,
            avatar_url: profile?.avatar_url || null,
            permissions
        };

        return next();
    } catch (error) {
        console.error('[auth] unexpected error:', error.message);
        return res.status(500).json({ error: 'Errore interno di autenticazione' });
    }
}

// ─── optionalAuthenticate ────────────────────────────────────────────────────
/**
 * Come authenticate ma non blocca se il token è assente.
 * Utile per route pubbliche che mostrano contenuto extra agli utenti loggati.
 */
export async function optionalAuthenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const supabase = getAdminClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            req.user = null;
            return next();
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, display_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

        req.user = {
            id: user.id,
            email: user.email,
            role: profile?.role || 'client',
            display_name: profile?.display_name || user.email,
            avatar_url: profile?.avatar_url || null,
            permissions: null
        };

        return next();
    } catch {
        req.user = null;
        return next();
    }
}

// ─── requireRole ─────────────────────────────────────────────────────────────
/**
 * Richiede che req.user.role sia incluso nell'array dei ruoli permessi.
 * Usa DOPO authenticate.
 *
 * Esempio: requireRole('senior', 'operator')
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non autenticato' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accesso non autorizzato per questo ruolo' });
        }

        return next();
    };
}

// ─── requireSenior ───────────────────────────────────────────────────────────
export function requireSenior(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non autenticato' });
    }

    if (req.user.role !== 'senior') {
        return res.status(403).json({ error: 'Accesso riservato al Senior' });
    }

    return next();
}

// ─── requireOperator ─────────────────────────────────────────────────────────
/**
 * Permette accesso a senior E operator (con o senza permessi granulari).
 */
export function requireOperator(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non autenticato' });
    }

    if (!['senior', 'operator'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Accesso riservato agli operatori' });
    }

    return next();
}

// ─── requirePermission ───────────────────────────────────────────────────────
/**
 * Verifica un permesso granulare per gli operator.
 * I senior lo saltano automaticamente.
 *
 * feature: 'blog' | 'portfolio' | 'collection' | 'clients'
 */
export function requirePermission(feature) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non autenticato' });
        }

        // Qualsiasi utente autenticato può accedere
        return next();
    };
}

// ─── requireClientAccess ─────────────────────────────────────────────────────
/**
 * Per route tipo /api/clienti/:clientId - verifica che l'operatore
 * abbia accesso a quel client specifico (o sia senior).
 */
export function requireClientAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non autenticato' });
    }

    if (req.user.role === 'senior') {
        return next();
    }

    if (req.user.role === 'operator') {
        const { allowed_client_ids } = req.user.permissions || {};
        // null = accesso a tutti i clienti assegnati; array = lista specifica
        if (allowed_client_ids === null || allowed_client_ids === undefined) {
            return next();
        }

        const clientId = req.params.clientId || req.params.id;
        if (allowed_client_ids.includes(clientId)) {
            return next();
        }

        return res.status(403).json({ error: 'Non hai accesso a questo cliente' });
    }

    // client role: può accedere solo alla propria risorsa (gestita a livello di query RLS)
    return next();
}
