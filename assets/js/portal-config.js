/**
 * Portal Config - Configurazione condivisa per tutti i moduli del portale
 * Home Design Lab - Admin & Clienti
 */

let PORTAL_CONFIG = {
    supabase: { url: '', anonKey: '' },
    roles: {
        CLIENT: 'client',
        OPERATOR: 'operator',
        ARCHITECT: 'architect',
        SENIOR: 'senior',
        ADMIN: 'admin',
        SEGRETARIA: 'segretaria',
        COLLABORATORE: 'collaboratore',
        IMPRESA: 'impresa'
    },
    rolePages: {
        client: 'area-cliente.html',
        operator: 'dashboard-operatore.html',
        architect: 'dashboard-operatore.html',
        collaboratore: 'dashboard-operatore.html',
        segretaria: 'dashboard-senior.html',
        senior: 'dashboard-senior.html',
        admin: 'dashboard-senior.html',
        impresa: 'dashboard-impresa.html'
    },
    loginPage: 'templates/login.html',
    google: { clientId: '', apiKey: '' },
    menus: {
        client: [
            { id: 'overview', label: 'Dashboard', icon: 'dashboard', href: 'area-cliente.html' },
            { id: 'documenti', label: 'Documenti & Contratti', icon: 'folder', href: 'documenti-contratti.html' },
            { id: 'bozze', label: 'Bozze & Idee', icon: 'lightbulb', href: 'bozze-idee.html' },
            { id: 'messaggi', label: 'Messaggi', icon: 'chat', href: 'messaggi.html' }
        ],
        operator: [
            { id: 'dashboard', label: 'Dashboard', icon: 'assignment', href: 'dashboard-operatore.html', always: true },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html', always: true },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', module: 'immobiliare' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', module: 'clienti' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', module: 'journal' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', module: 'team' }
        ],
        architect: [
            { id: 'dashboard', label: 'Dashboard', icon: 'assignment', href: 'dashboard-operatore.html', always: true },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html', always: true },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', module: 'immobiliare' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', module: 'clienti' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', module: 'journal' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', module: 'team' }
        ],
        collaboratore: [
            { id: 'dashboard', label: 'Dashboard', icon: 'assignment', href: 'dashboard-operatore.html', always: true },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html', module: 'progettazione' },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', module: 'immobiliare' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', module: 'clienti' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', module: 'journal' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', module: 'team' }
        ],
        segretaria: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-senior.html', always: true },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', always: true },
            { id: 'finanze', label: 'Finanze', icon: 'payments', href: 'gestione-finanze.html', always: true },
            { id: 'documenti', label: 'Documenti', icon: 'folder', href: 'documenti-contratti.html', always: true }
        ],
        senior: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-senior.html' },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html' },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html' },
            { id: 'compiti', label: 'Compiti', icon: 'assignment', href: 'gestione-compiti.html' },
            { id: 'imprese', label: 'Imprese', icon: 'business', href: 'gestione-imprese.html' }
        ],
        admin: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-senior.html', always: true },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html', always: true },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', always: true },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', always: true },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', always: true },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', always: true },
            { id: 'compiti', label: 'Compiti', icon: 'assignment', href: 'gestione-compiti.html', always: true },
            { id: 'imprese', label: 'Imprese', icon: 'business', href: 'gestione-imprese.html', always: true }
        ],
        impresa: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-impresa.html' },
            { id: 'cantieri', label: 'I Miei Cantieri', icon: 'handyman', href: 'cantieri-impresa.html' }
        ]
    }
};

async function loadPortalConfig() {
    try {
        const isLiveServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '5500';
        const apiUrl = isLiveServer ? 'http://localhost:3000/api/config' : '/api/config';
        const response = await fetch(apiUrl);
        if (response.ok) {
            const config = await response.json();
            PORTAL_CONFIG.supabase.url = config.supabaseUrl;
            PORTAL_CONFIG.supabase.anonKey = config.supabaseAnonKey;
            if (config.googleClientId) PORTAL_CONFIG.google.clientId = config.googleClientId;
            if (config.googleApiKey) PORTAL_CONFIG.google.apiKey = config.googleApiKey;
        }
    } catch (error) {
        console.error('[Portal Config] Errore fetch configurazione:', error);
    }
}

async function initSupabase() {
    if (!PORTAL_CONFIG.supabase.url) await loadPortalConfig();
    if (!window.supabase && PORTAL_CONFIG.supabase.url) {
        window.supabase = supabase.createClient(PORTAL_CONFIG.supabase.url, PORTAL_CONFIG.supabase.anonKey);
    }
    return window.supabase;
}

function normalizePortalRole(value) {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'admin') return 'admin';
    if (v === 'senior') return 'senior';
    if (v === 'segretaria' || v === 'segretary' || v === 'secretary') return 'segretaria';
    if (v === 'collaboratore' || v === 'operator' || v === 'architect' || v === 'operatore') return 'collaboratore';
    if (v === 'impresa') return 'impresa';
    return v === 'client' ? 'client' : null;
}

async function getUserRole() {
    const sb = await initSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data: profile } = await sb
        .from('profiles')
        .select('role, nome')
        .eq('user_id', user.id)
        .maybeSingle();

    const { data: operatore } = await sb
        .from('operatori_profiles')
        .select('ruolo, ruolo_portale, nome, cognome, permessi_dettagli, progetti_assegnati, accesso_attivo')
        .eq('user_id', user.id)
        .maybeSingle();

    const operatorByEmail = operatore || (await sb
        .from('operatori_profiles')
        .select('ruolo, ruolo_portale, nome, cognome, permessi_dettagli, progetti_assegnati, accesso_attivo')
        .eq('email', user.email)
        .maybeSingle()).data;

    if (operatorByEmail) {
        if (operatorByEmail.accesso_attivo === false) return null;
        const resolved = normalizePortalRole(operatorByEmail.ruolo_portale) || normalizePortalRole(operatorByEmail.ruolo) || normalizePortalRole(profile?.role);
        if (resolved) {
            const fullName = [operatorByEmail.nome, operatorByEmail.cognome].filter(Boolean).join(' ');
            if (fullName) window.currentUserDisplayName = fullName;
            if (operatorByEmail.permessi_dettagli) {
                try { window.currentUserPermissions = typeof operatorByEmail.permessi_dettagli === 'string' ? JSON.parse(operatorByEmail.permessi_dettagli) : operatorByEmail.permessi_dettagli; }
                catch { window.currentUserPermissions = {}; }
            }
            window.currentUserAssignedProjects = operatorByEmail.progetti_assegnati ? String(operatorByEmail.progetti_assegnati).split(',').map(p => p.trim()).filter(Boolean) : [];
            return resolved;
        }
    }

    const profileRole = normalizePortalRole(profile?.role);
    if (profileRole) {
        if (profile?.nome) window.currentUserDisplayName = profile.nome;
        return profileRole;
    }

    const { data: impresa } = await sb.from('imprese').select('ragione_sociale, referente').eq('user_id', user.id).maybeSingle();
    if (impresa) {
        window.currentUserDisplayName = impresa.ragione_sociale || impresa.referente || user.email;
        return 'impresa';
    }

    return 'client';
}

async function redirectByRole() {
    const role = await getUserRole();
    if (!role) { window.location.href = '/login'; return; }
    const targetPage = PORTAL_CONFIG.rolePages[role] || PORTAL_CONFIG.rolePages.client;
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== targetPage) window.location.href = targetPage;
}

async function checkPageAccess(allowedRoles) {
    const userRole = await getUserRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
        alert('Accesso negato. Non hai i permessi per questa pagina.');
        await redirectByRole();
        return false;
    }
    return true;
}

async function portalLogout() {
    const sb = await initSupabase();
    await sb.auth.signOut();
    window.location.href = '/login';
}

function moduleIsEnabled(value) {
    if (value === true) return true;
    if (typeof value === 'string') return !['none', 'false', '0'].includes(value.toLowerCase());
    if (value && typeof value === 'object') return !['none', 'false', '0'].includes(String(value.level || 'none').toLowerCase());
    return false;
}

function renderSidebarMenu(containerId, activeItem) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let role = normalizePortalRole(window.currentUserRole) || window.currentUserRole || 'client';
    const menuItems = PORTAL_CONFIG.menus[role] || PORTAL_CONFIG.menus.client;
    const permissions = window.currentUserPermissions || {};
    const isCollaborator = role === 'collaboratore' || role === 'operator' || role === 'architect';
    const modules = permissions.modules || permissions;

    const pageTitle = {
        client: 'Client Dashboard',
        collaboratore: 'Collaboratore Dashboard',
        operator: 'Collaboratore Dashboard',
        architect: 'Collaboratore Dashboard',
        segretaria: 'Segreteria',
        senior: 'Senior Dashboard',
        admin: 'Amministrazione',
        impresa: 'Impresa Dashboard'
    }[role] || 'Dashboard';

    const filteredItems = menuItems.filter(item => {
        if (item.always) return true;
        if (isCollaborator && item.module) return moduleIsEnabled(modules[item.module] ?? modules[item.id]);
        return true;
    });

    let html = '<div class="px-8 mb-12">';
    html += '<h1 class="font-[\'Noto_Serif\'] text-2xl font-bold tracking-tighter text-[#186C32] dark:text-[#4ade80]">Atelier Studio</h1>';
    html += '<p class="text-stone-500 mt-1 capitalize tracking-normal text-xs">' + pageTitle + '</p>';
    html += '</div><div class="flex-1 space-y-2">';

    filteredItems.forEach(item => {
        const isActive = item.id === activeItem;
        const classes = isActive
            ? 'text-[#186C32] dark:text-[#4ade80] font-bold bg-[#ffffff] dark:bg-stone-800 rounded-l-xl ml-4 pl-4 py-3 transition-all border-r-4 border-[#186C32] flex items-center gap-4'
            : 'text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-3 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4';
        html += '<a class="' + classes + '" href="' + item.href + '"><span class="material-symbols-outlined">' + item.icon + '</span>' + item.label + '</a>';
    });

    html += '</div><div class="space-y-2 border-t border-stone-200 dark:border-stone-800 pt-4 mt-auto">';
    html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="profilo.html"><span class="material-symbols-outlined text-[18px]">settings</span>Impostazioni</a>';
    html += '</div>';

    container.innerHTML = html;
}
