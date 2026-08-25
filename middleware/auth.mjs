/**
 * middleware/auth.mjs
 * Middleware di autenticazione e autorizzazione per Express.
 * Usa Supabase service-role per verificare il JWT e leggere il profilo.
 */
import { createClient } from '@supabase/supabase-js';
import CONFIG from '../config.js';

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

function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return req.cookies?.hdl_token || null;
}

async function loadOperatorAccess(supabase, user) {
    const { data, error } = await supabase
        .from('operatori_profiles')
        .select('id, ruolo, ruolo_portale, accesso_attivo, nome, cognome, avatar_url, permessi_dettagli, progetti_assegnati')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[auth] operator profile fetch error:', error.message);
        return null;
    }
    return data || null;
}

export async function authenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Non autenticato' });

    try {
        const supabase = getAdminClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return res.status(401).json({ error: 'Token non valido o scaduto' });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, nome, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();
        if (profileError) console.error('[auth] profile fetch error:', profileError.message);

        const operatorProfile = await loadOperatorAccess(supabase, user);

        // accesso_attivo è un kill-switch server-side: se l'account operatore è
        // sospeso, il token Supabase esistente non può più usare le API protette.
        if (operatorProfile && operatorProfile.accesso_attivo === false) {
            return res.status(403).json({ error: 'Accesso sospeso dall’amministratore', code: 'ACCESS_DISABLED' });
        }

        let permissions = null;
        if (profile?.role === 'operator') {
            const { data: perms } = await supabase
                .from('operator_permissions')
                .select('can_blog, can_portfolio, can_collection, can_clients, allowed_client_ids')
                .eq('operator_id', profile.id)
                .maybeSingle();
            permissions = perms;
        }

        let role = profile?.role || 'client';
        let displayName = profile?.nome || user.email;

        if (operatorProfile) {
            const legacyRole = (operatorProfile.ruolo || '').toLowerCase();
            if (!profile || role === 'client') {
                role = legacyRole === 'admin' ? 'admin' : (legacyRole === 'senior' ? 'senior' : 'architect');
            }
            displayName = [operatorProfile.nome, operatorProfile.cognome].filter(Boolean).join(' ') || displayName;
        }

        if (!profile || role === 'client') {
            const { data: impresa } = await supabase
                .from('imprese')
                .select('ragione_sociale')
                .eq('user_id', user.id)
                .maybeSingle();
            if (impresa) {
                role = 'impresa';
                displayName = impresa.ragione_sociale;
            }
        }

        req.user = {
            id: user.id,
            email: user.email,
            role,
            portal_role: operatorProfile?.ruolo_portale || null,
            display_name: displayName,
            avatar_url: operatorProfile?.avatar_url || profile?.avatar_url || null,
            permissions: operatorProfile?.permessi_dettagli || permissions,
            assigned_projects: operatorProfile?.progetti_assegnati || null,
            operator_profile_id: operatorProfile?.id || null
        };

        return next();
    } catch (error) {
        console.error('[auth] unexpected error:', error.message);
        return res.status(500).json({ error: 'Errore interno di autenticazione' });
    }
}

export async function optionalAuthenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) { req.user = null; return next(); }
    try {
        const supabase = getAdminClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) { req.user = null; return next(); }
        const { data: profile } = await supabase.from('profiles').select('id, role, nome, avatar_url').eq('user_id', user.id).maybeSingle();
        const operatorProfile = await loadOperatorAccess(supabase, user);
        if (operatorProfile?.accesso_attivo === false) { req.user = null; return next(); }
        let role = profile?.role || 'client';
        let displayName = profile?.nome || user.email;
        if (operatorProfile) {
            const legacyRole = (operatorProfile.ruolo || '').toLowerCase();
            if (!profile || role === 'client') role = legacyRole === 'admin' ? 'admin' : (legacyRole === 'senior' ? 'senior' : 'architect');
            displayName = [operatorProfile.nome, operatorProfile.cognome].filter(Boolean).join(' ') || displayName;
        }
        if (!profile || role === 'client') {
            const { data: impresa } = await supabase.from('imprese').select('ragione_sociale').eq('user_id', user.id).maybeSingle();
            if (impresa) { role = 'impresa'; displayName = impresa.ragione_sociale; }
        }
        req.user = { id: user.id, email: user.email, role, portal_role: operatorProfile?.ruolo_portale || null, display_name: displayName, avatar_url: operatorProfile?.avatar_url || profile?.avatar_url || null, permissions: operatorProfile?.permessi_dettagli || null, assigned_projects: operatorProfile?.progetti_assegnati || null, operator_profile_id: operatorProfile?.id || null };
        return next();
    } catch { req.user = null; return next(); }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Accesso non autorizzato per questo ruolo' });
        return next();
    };
}

export function requireSenior(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    if (req.user.role !== 'senior') return res.status(403).json({ error: 'Accesso riservato al Senior' });
    return next();
}

export function requireOperator(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    if (!['senior', 'operator', 'architect', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Accesso riservato agli operatori' });
    return next();
}

export function requirePermission(feature) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
        // Admin e senior hanno accesso completo. Il controllo granulare dei nuovi
        // moduli viene effettuato dalle API che dichiarano esplicitamente la feature.
        if (['admin', 'senior'].includes(req.user.role)) return next();
        const p = req.user.permissions || {};
        const allowed = p?.[feature] ?? p?.[`can_${feature}`];
        if (allowed === true || allowed === 'gestisci' || allowed === 'modifica' || allowed === 'view') return next();
        // Compatibilità: i vecchi operatori senza configurazione granulare non vengono bloccati.
        if (!req.user.portal_role) return next();
        return res.status(403).json({ error: `Permesso mancante: ${feature}` });
    };
}

export function requireClientAccess(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    if (['senior', 'admin'].includes(req.user.role)) return next();
    if (['operator', 'architect'].includes(req.user.role)) {
        const { allowed_client_ids } = req.user.permissions || {};
        if (allowed_client_ids === null || allowed_client_ids === undefined) return next();
        const clientId = req.params.clientId || req.params.id;
        if (allowed_client_ids.includes(clientId)) return next();
        return res.status(403).json({ error: 'Non hai accesso a questo cliente' });
    }
    return next();
}

export function requireImpresa(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    if (['senior', 'admin', 'operator', 'architect', 'impresa'].includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Accesso riservato a imprese e staff' });
}
