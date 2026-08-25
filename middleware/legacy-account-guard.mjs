import { createClient } from '@supabase/supabase-js';
import CONFIG from '../config.js';

const adminClient = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

function extractToken(req) {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return req.cookies?.hdl_token || null;
}

async function loadIdentity(req) {
    const token = extractToken(req);
    if (!token) return { error: { status: 401, message: 'Non autenticato' } };

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return { error: { status: 401, message: 'Token non valido o scaduto' } };

    const { data: operator } = await adminClient
        .from('operatori_profiles')
        .select('ruolo_portale, accesso_attivo')
        .eq('user_id', user.id)
        .maybeSingle();

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (operator?.accesso_attivo === false) {
        return { error: { status: 403, message: 'Accesso sospeso dall’amministratore' } };
    }

    return { user, portalRole: operator?.ruolo_portale || null, legacyRole: profile?.role || null };
}

export async function legacyAccountGuard(req, res, next) {
    if (req.method !== 'POST') return next();

    const path = req.path;
    const protectedPaths = new Set(['/primo-accesso', '/imposta-password', '/admin/promuovi-senior']);
    if (!protectedPaths.has(path)) return next();

    try {
        const identity = await loadIdentity(req);
        if (identity.error) return res.status(identity.error.status).json({ error: identity.error.message });

        const { portalRole, legacyRole } = identity;

        if (path === '/primo-accesso') {
            if (portalRole === 'admin' || portalRole === 'segretaria' || legacyRole === 'admin') return next();
            return res.status(403).json({ error: 'Creazione account riservata ad Admin e Segreteria' });
        }

        if (path === '/admin/promuovi-senior' || path === '/imposta-password') {
            if (portalRole === 'admin' || legacyRole === 'admin') return next();
            return res.status(403).json({ error: 'Operazione riservata agli Admin' });
        }

        return res.status(403).json({ error: 'Accesso negato' });
    } catch (error) {
        console.error('[legacy-account-guard]', error.message);
        return res.status(500).json({ error: 'Errore interno di autorizzazione' });
    }
}
