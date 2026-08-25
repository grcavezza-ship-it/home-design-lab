import 'dotenv/config';
import fs from 'fs/promises';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import CONFIG from './config.js';

const originalStatic = express.static;
const originalSendFile = express.response.sendFile;

const protectedPages = new Map([
    ['dashboard-senior.html', 'dashboard'],
    ['dashboard-operatore.html', 'dashboard_collaboratore'],
    ['gestione-team.html', 'team'],
    ['gestione-clienti.html', 'clienti'],
    ['dettaglio-cliente.html', 'clienti'],
    ['gestione-immobili.html', 'immobiliare'],
    ['creazione-immobile.html', 'immobiliare'],
    ['gestione-journal.html', 'journal'],
    ['gestione-progetti.html', 'progettazione'],
    ['gestione-imprese.html', 'imprese'],
    ['scheda-impresa.html', 'imprese'],
    ['cantieri-impresa.html', 'imprese'],
    ['cantiere-impresa.html', 'imprese'],
    ['gestione-compiti.html', 'progettazione']
]);

const injectedScripts = {
    'gestione-team.html': ['/assets/js/portal-runtime-fixes.js', '/assets/js/account-invite-actions.js'],
    'gestione-clienti.html': ['/assets/js/portal-runtime-fixes.js', '/assets/js/account-invite-actions.js'],
    'gestione-imprese.html': ['/assets/js/portal-runtime-fixes.js']
};

function getPageKey(pathname) {
    const file = pathname.split('/').pop() || '';
    return protectedPages.get(file) || null;
}

function moduleLevel(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof value.level === 'string') return value.level;
    if (value === true) return 'view';
    return 'none';
}

function hasPermission(permissions, moduleName, required = 'view') {
    const p = permissions && typeof permissions === 'object' ? permissions : {};
    const modules = p.modules && typeof p.modules === 'object' ? p.modules : {};
    const value = modules[moduleName] ?? p[moduleName];
    const rank = { none: 0, view: 1, edit: 2, manage: 3 };
    return (rank[moduleLevel(value)] || 0) >= (rank[required] || 1);
}

function cookieOptions(maxAge) {
    return { httpOnly: false, secure: true, sameSite: 'lax', path: '/', maxAge };
}

function setSessionCookies(res, session) {
    if (!session?.access_token || !session?.refresh_token) return;
    res.cookie('hdl_token', session.access_token, cookieOptions((session.expires_in || 3600) * 1000));
    res.cookie('hdl_refresh', session.refresh_token, cookieOptions(1000 * 60 * 60 * 24 * 30));
}

async function loadSession(req, res) {
    let accessToken = req.cookies?.hdl_token || null;
    const refreshToken = req.cookies?.hdl_refresh || null;
    if (!accessToken && !refreshToken) return null;
    const admin = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.SERVICE_ROLE_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
    if (accessToken) {
        const { data, error } = await admin.auth.getUser(accessToken);
        if (!error && data?.user) return { user:data.user, accessToken };
    }
    if (!refreshToken) return null;
    const anon = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
    const { data: refreshed, error: refreshError } = await anon.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshError || !refreshed?.session?.user) return null;
    setSessionCookies(res, refreshed.session);
    return { user:refreshed.session.user, accessToken:refreshed.session.access_token };
}

async function loadIdentity(req, res) {
    const session = await loadSession(req, res);
    if (!session) return null;
    const admin = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.SERVICE_ROLE_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
    const { data: profile } = await admin.from('profiles').select('role, nome, avatar_url').eq('user_id', session.user.id).maybeSingle();
    const { data: operator } = await admin.from('operatori_profiles').select('id,user_id,email,ruolo,ruolo_portale,accesso_attivo,nome,cognome,permessi_dettagli,progetti_assegnati').or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`).limit(1).maybeSingle();
    if (operator?.accesso_attivo === false) return { blocked:true };
    let role = profile?.role || 'client';
    const legacyRole = String(operator?.ruolo || '').toLowerCase();
    const portalRole = operator?.ruolo_portale || null;
    if (portalRole) role = portalRole;
    else if (operator) role = legacyRole === 'admin' ? 'admin' : (legacyRole === 'senior' ? 'senior' : 'collaboratore');
    if (String(profile?.role || '').toLowerCase() === 'admin') role = 'admin';
    let permissions = operator?.permessi_dettagli || {};
    if (typeof permissions === 'string') { try { permissions = JSON.parse(permissions); } catch { permissions = {}; } }
    return { user:session.user, role, legacyRole, portalRole, permissions, operator };
}

function pageAllowed(identity, pageKey) {
    if (!identity || identity.blocked) return false;
    if (['admin','senior'].includes(identity.role) || identity.legacyRole === 'admin') return true;
    if (pageKey === 'dashboard') return identity.role === 'segretaria' || identity.role === 'collaboratore';
    if (pageKey === 'dashboard_collaboratore') return identity.role === 'collaboratore';
    if (identity.role === 'segretaria') return ['clienti','finanze','documenti'].includes(pageKey);
    if (identity.role === 'collaboratore') {
        if (pageKey === 'team' || pageKey === 'imprese') return false;
        return hasPermission(identity.permissions, pageKey, 'view');
    }
    return false;
}

function deny(res, status=403, message='Accesso non autorizzato') {
    return res.status(status).type('html').send(`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accesso negato | Home Design Lab</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf9f8;color:#1c1b1f;font-family:Manrope,Arial,sans-serif}.card{max-width:520px;padding:48px;background:#fff;border:1px solid #e4e2e1;box-shadow:0 20px 50px rgba(0,0,0,.06);text-align:center}.code{font:700 12px Manrope,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#186c32}h1{font-family:Georgia,serif;font-size:30px;font-weight:500}p{color:#6b7280;line-height:1.6}a{display:inline-block;margin-top:14px;padding:12px 18px;background:#186c32;color:#fff;text-decoration:none;border-radius:8px}</style></head><body><div class="card"><div class="code">Home Design Lab</div><h1>${message}</h1><p>Il tuo account non dispone dei permessi necessari per visualizzare questa pagina.</p><a href="/login">Torna all'accesso</a></div></body></html>`);
}

async function guardPage(req, res, serve) {
    const pageKey = getPageKey(req.path);
    if (!pageKey) return serve();
    try {
        const identity = await loadIdentity(req, res);
        if (!identity) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
        if (identity.blocked) return deny(res,403,'Account sospeso');
        if (!pageAllowed(identity,pageKey)) return deny(res,403,'Pagina non disponibile');
        return serve();
    } catch (error) {
        console.error('[page-guard]',error.message);
        return deny(res,500,'Impossibile verificare i permessi');
    }
}

function injectScriptsIntoHtml(html, pageFile) {
    const scripts = injectedScripts[pageFile] || [];
    if (!scripts.length) return html;
    const tags = scripts.map(src => `<script src="${src}" defer></script>`).join('');
    return html.includes('/assets/js/account-invite-actions.js') || html.includes('/assets/js/portal-runtime-fixes.js') ? html : html.replace(/<\/body>/i, `${tags}</body>`);
}

express.static = function guardedStatic(root, options) {
    const serve = originalStatic.call(this, root, options);
    return (req,res,next) => guardPage(req,res,async () => {
        const pageFile = String(req.path || '').split('/').pop() || '';
        if (!injectedScripts[pageFile]) return serve(req,res,next);
        try {
            const filePath = requirePath(root, pageFile);
            const html = await fs.readFile(filePath,'utf8');
            return res.type('html').send(injectScriptsIntoHtml(html,pageFile));
        } catch { return serve(req,res,next); }
    });
};

function requirePath(root,file){ return `${String(root).replace(/\\$/,'')}/${file}`; }

express.response.sendFile = function guardedSendFile(filePath, options, callback) {
    const normalized = String(filePath).replace(/\\/g,'/');
    const pageFile = normalized.split('/').pop() || '';
    const pageKey = protectedPages.get(pageFile);
    if (pageKey) return guardPage(this.req || {},this,() => originalSendFile.call(this,filePath,options,callback));
    if (injectedScripts[pageFile]) {
        const res = this;
        fs.readFile(filePath,'utf8').then(html => {
            res.type('html').send(injectScriptsIntoHtml(html,pageFile));
            if (typeof callback === 'function') callback(null);
        }).catch(error => {
            if (typeof callback === 'function') return callback(error);
            res.status(500).send('Errore caricamento pagina');
        });
        return;
    }
    if (normalized.endsWith('/templates/login.html')) {
        const res = this;
        fs.readFile(filePath,'utf8').then(html => {
            const syncScript = `<script>(function(){function set(n,v,m){document.cookie=n+'='+encodeURIComponent(v)+'; Max-Age='+m+'; Path=/; Secure; SameSite=Lax';}function clear(n){document.cookie=n+'=; Max-Age=0; Path=/; Secure; SameSite=Lax';}function bind(){try{if(typeof supabaseClient==='undefined'){setTimeout(bind,50);return;}supabaseClient.auth.getSession().then(function(r){if(r.data&&r.data.session){set('hdl_token',r.data.session.access_token,Math.floor((r.data.session.expires_at*1000-Date.now())/1000));set('hdl_refresh',r.data.session.refresh_token,2592000);}});supabaseClient.auth.onAuthStateChange(function(event,session){if(session){set('hdl_token',session.access_token,Math.floor((session.expires_at*1000-Date.now())/1000));set('hdl_refresh',session.refresh_token,2592000);}else if(event==='SIGNED_OUT'){clear('hdl_token');clear('hdl_refresh');}});}catch(e){setTimeout(bind,100);}}bind();})();</script>`;
            res.type('html').send(html.replace('</body>',syncScript+'</body>'));
            if (typeof callback === 'function') callback(null);
        }).catch(error => { if(typeof callback==='function') return callback(error); res.status(500).send('Errore caricamento pagina'); });
        return;
    }
    return originalSendFile.call(this,filePath,options,callback);
};

await import('./server.mjs');
