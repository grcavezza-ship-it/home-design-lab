/**
 * Portal Config - Configurazione condivisa per tutti i moduli del portale
 * Home Design Lab - Admin & Clienti
 * 
 * NOTA: Questo file usa esclusivamente Supabase SDK nativo per la gestione sessioni.
 * NON utilizzare localStorage custom per i token (hdl_token, etc.).
 */

// Configurazione Supabase - verrà caricata dal server
let PORTAL_CONFIG = {
    supabase: {
        url: '',
        anonKey: ''
    },
    
    // Ruoli supportati
    roles: {
        CLIENT: 'client',
        OPERATOR: 'operator', 
        SENIOR: 'senior',
        ADMIN: 'admin'
    },
    
    // 🔄 Pagine per ruolo - Redirect corretti a file HTML fisici
    rolePages: {
        client: 'area-cliente.html',
        operator: 'dashboard-operatore.html',
        architect: 'dashboard-operatore.html',
        senior: 'dashboard-senior.html',
        admin: 'dashboard-senior.html'
    },
    
    // 🔗 URL di login
    loginPage: 'templates/login.html',
    
    // Google API Configuration
    google: {
        clientId: '', // verrà caricato dal server
        apiKey: ''    // verrà caricato dal server
    },
    
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
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', module: 'immobili' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', module: 'clienti' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', module: 'journal' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', module: 'team' }
        ],
        architect: [
            { id: 'dashboard', label: 'Dashboard', icon: 'assignment', href: 'dashboard-operatore.html', always: true },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html', always: true },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html', module: 'immobili' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html', module: 'clienti' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html', module: 'journal' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html', module: 'team' }
        ],
        senior: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-senior.html' },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html' },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html' },
            { id: 'compiti', label: 'Compiti', icon: 'assignment', href: 'gestione-compiti.html' }
        ],
        admin: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard-senior.html' },
            { id: 'progetti', label: 'Progetti', icon: 'architecture', href: 'gestione-progetti.html' },
            { id: 'immobili', label: 'Immobili', icon: 'inventory_2', href: 'gestione-immobili.html' },
            { id: 'clienti', label: 'Clienti', icon: 'handshake', href: 'gestione-clienti.html' },
            { id: 'journal', label: 'Journal', icon: 'menu_book', href: 'gestione-journal.html' },
            { id: 'team', label: 'Team', icon: 'groups', href: 'gestione-team.html' },
            { id: 'compiti', label: 'Compiti', icon: 'assignment', href: 'gestione-compiti.html' }
        ]
    }
};

// Carica configurazione dal server
async function loadPortalConfig() {
    try {
        // Rileva se siamo su Live Server (porta 5500) o Node server (porta 3000)
        const isLiveServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '5500';
        const apiUrl = isLiveServer 
            ? 'http://localhost:3000/api/config'  // Live Server → chiama Node server
            : '/api/config';                     // Node server → stesso origin
        
        console.log('[Portal Config] Chiamando API config:', apiUrl);
        const response = await fetch(apiUrl);
        if (response.ok) {
            const config = await response.json();
            PORTAL_CONFIG.supabase.url = config.supabaseUrl;
            PORTAL_CONFIG.supabase.anonKey = config.supabaseAnonKey;
            
            // Carica anche configurazione Google se disponibile
            if (config.googleClientId) PORTAL_CONFIG.google.clientId = config.googleClientId;
            if (config.googleApiKey) PORTAL_CONFIG.google.apiKey = config.googleApiKey;
            
            console.log('[Portal Config] ✅ Configurazione caricata dal server');
        } else {
            console.error('[Portal Config] ❌ Errore caricamento configurazione:', response.status);
        }
    } catch (error) {
        console.error('[Portal Config] ❌ Errore fetch configurazione:', error);
    }
}

// Inizializza Supabase
async function initSupabase() {
    // Carica config se non è già stata caricata
    if (!PORTAL_CONFIG.supabase.url) {
        await loadPortalConfig();
    }
    
    if (!window.supabase && PORTAL_CONFIG.supabase.url) {
        window.supabase = supabase.createClient(
            PORTAL_CONFIG.supabase.url,
            PORTAL_CONFIG.supabase.anonKey
        );
    }
    return window.supabase;
}

// Utility per ottenere ruolo utente
async function getUserRole() {
    const supabase = await initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, nome')
        .eq('user_id', user.id)
        .single();
    
    if (profile && profile.role && profile.role !== 'client') {
        if (profile.nome) {
            window.currentUserDisplayName = profile.nome;
        }
        return profile.role;
    }

    const { data: operatore } = await supabase
        .from('operatori_profiles')
        .select('ruolo, nome, cognome, permessi_dettagli, progetti_assegnati')
        .eq('email', user.email)
        .maybeSingle();

    if (operatore) {
        const fullName = [operatore.nome, operatore.cognome].filter(Boolean).join(' ');
        if (fullName) {
            window.currentUserDisplayName = fullName;
        }
        if (operatore.permessi_dettagli) {
            window.currentUserPermissions = typeof operatore.permessi_dettagli === 'string'
                ? JSON.parse(operatore.permessi_dettagli)
                : operatore.permessi_dettagli;
        }
        if (operatore.progetti_assegnati && operatore.progetti_assegnati.trim() !== '') {
            window.currentUserAssignedProjects = operatore.progetti_assegnati.split(',').map(function(p) { return p.trim(); });
        } else {
            window.currentUserAssignedProjects = [];
        }
        return operatore.ruolo === 'admin' ? 'admin' : 'architect';
    }

    return PORTAL_CONFIG.roles.CLIENT;
}

// Redirect in base al ruolo
async function redirectByRole() {
    const role = await getUserRole();
    if (!role) {
        window.location.href = '/login';
        return;
    }
    
    const targetPage = PORTAL_CONFIG.rolePages[role];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage !== targetPage) {
        window.location.href = targetPage;
    }
}

// Check se utente ha accesso a pagina
async function checkPageAccess(allowedRoles) {
    const userRole = await getUserRole();
    
    if (!userRole || !allowedRoles.includes(userRole)) {
        alert('Accesso negato. Non hai i permessi per questa pagina.');
        await redirectByRole();
        return false;
    }
    
    return true;
}

// Logout
async function portalLogout() {
    const supabase = await initSupabase();
    await supabase.auth.signOut();
    window.location.href = '/login';
}

function renderSidebarMenu(containerId, activeItem) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const role = window.currentUserRole || 'client';
    const menuItems = PORTAL_CONFIG.menus[role] || PORTAL_CONFIG.menus.client;
    const permissions = window.currentUserPermissions || {};
    const isStaff = ['senior', 'admin', 'operator', 'architect'].includes(role);
    const isOperatorOrArchitect = role === 'operator' || role === 'architect';

    const pageTitle = {
        client: 'Client Dashboard',
        operator: 'Operatore Dashboard',
        architect: 'Collaboratore Dashboard',
        senior: 'Senior Dashboard',
        admin: 'Amministrazione'
    }[role] || 'Dashboard';

    const filteredItems = menuItems.filter(function(item) {
        if (item.always) return true;
        if (isOperatorOrArchitect && item.module) {
            var modules = permissions.modules || {};
            return modules[item.module] === true;
        }
        return true;
    });

    var html = '';
    html += '<div class="px-8 mb-12">';
    html += '<h1 class="font-[\'Noto_Serif\'] text-2xl font-bold tracking-tighter text-[#186C32] dark:text-[#4ade80]">Atelier Studio</h1>';
    html += '<p class="text-stone-500 mt-1 capitalize tracking-normal text-xs">' + pageTitle + '</p>';
    html += '</div>';

    html += '<div class="flex-1 space-y-2">';
    filteredItems.forEach(function(item) {
        var isActive = item.id === activeItem;
        var href = item.href;
        if (isActive) {
            html += '<a class="text-[#186C32] dark:text-[#4ade80] font-bold bg-[#ffffff] dark:bg-stone-800 rounded-l-xl ml-4 pl-4 py-3 transition-all border-r-4 border-[#186C32] transition-all duration-300 flex items-center gap-4" href="' + href + '">';
        } else {
            html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-3 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="' + href + '">';
        }
        html += '<span class="material-symbols-outlined">' + item.icon + '</span>';
        html += item.label;
        html += '</a>';
    });
    html += '</div>';

    html += '<div class="space-y-2 border-t border-stone-200 dark:border-stone-800 pt-4 mt-auto">';
    html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="profilo.html">';
    html += '<span class="material-symbols-outlined text-[18px]">settings</span>';
    html += 'Impostazioni';
    html += '</a>';
    html += '</div>';

    // 👇 Navigazione pubblica per clienti (tornare al sito)
    if (role === 'client') {
        html += '<div class="border-t border-stone-200 dark:border-stone-800 pt-4">';
        html += '<p class="px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">Torna al sito</p>';
        html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="/"><span class="material-symbols-outlined text-[18px]">home</span> Home</a>';
        html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="/chi-siamo"><span class="material-symbols-outlined text-[18px]">info</span> Chi Siamo</a>';
        html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="/portfolio"><span class="material-symbols-outlined text-[18px]">collections_bookmark</span> Portfolio</a>';
        html += '<a class="text-stone-500 dark:text-stone-400 hover:text-[#186C32] dark:hover:text-[#4ade80] px-8 py-2 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/50 flex items-center gap-4" href="/contatti"><span class="material-symbols-outlined text-[18px]">mail</span> Contatti</a>';
        html += '</div>';
    }

    container.innerHTML = html;
}

// 🎨 FUNZIONE AVATAR: Genera URL avatar in base al ruolo
function generateAvatarUrl(user) {
    if (!user) return null;
    
    // Se ha avatar_url salvato, usa quello (per staff con foto reale)
    if (user.avatar_url) {
        return user.avatar_url;
    }
    
    const isStaff = ['senior', 'operator', 'admin', 'architect'].includes(user.role);
    const displayName = user.display_name || user.email || 'User';
    
    if (isStaff) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=186C32&color=fff&size=128`;
    } else {
        // 👤 CLIENTI: Iniziali come lo staff, ma con colore diverso
        // Se il cliente ha caricato una foto (avatar_url), verrà mostrata quella
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=c0aede&color=fff&size=128`;
    }
}

// 🔄 Render avatar in un elemento HTML
function renderAvatar(elementId, user, size = 40) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const avatarUrl = generateAvatarUrl(user);
    if (!avatarUrl) return;
    
    element.src = avatarUrl;
    element.width = size;
    element.height = size;
    element.className = `rounded-full object-cover border-2 border-primary/20`;
    element.alt = user?.display_name || 'User Avatar';
    
    // Aggiungi fallback se l'immagine non carica
    element.onerror = function() {
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.display_name || 'U')}&background=ccc&color=666&size=${size}`;
    };
}

// 🔄 Render user info nella top bar (nome + avatar)
function renderUserInfo(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const avatarUrl = generateAvatarUrl(user);
    const displayName = user?.display_name || user?.email || 'Utente';
    const role = user?.role || 'client';
    
    container.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="${avatarUrl}" 
                 alt="${displayName}" 
                 class="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ccc&color=666&size=128'">
            <div class="hidden md:block text-left">
                <p class="text-sm font-semibold text-on-surface">${displayName}</p>
                <p class="text-xs text-on-surface-variant capitalize">${role}</p>
            </div>
        </div>
    `;
}

// 🔄 FUNZIONE CRITICA: Ottieni token fresco da Supabase SDK nativo
// Usare questa funzione per TUTTE le chiamate API autenticate
async function getFreshToken() {
    const supabase = initSupabase();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        console.error('[getFreshToken] Sessione non valida:', error);
        return null;
    }
    
    // Supabase SDK gestisce automaticamente il refresh del token
    return session.access_token;
}

// 🔄 Wrapper per fetch autenticato con token fresco
async function authFetch(url, options = {}) {
    const token = await getFreshToken();
    
    if (!token) {
        console.error('[authFetch] Token non disponibile, redirect a login');
        window.location.href = PORTAL_CONFIG.loginPage;
        throw new Error('Sessione scaduta');
    }
    
    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers: authHeaders
    });
    
    // Se 401, prova a refreshare la sessione una volta
    if (response.status === 401) {
        console.log('[authFetch] 401 ricevuto, tentativo refresh...');
        const supabase = initSupabase();
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
            // Riprova con nuovo token
            const newToken = refreshData.session.access_token;
            const retryResponse = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`
                }
            });
            return retryResponse;
        } else {
            // Refresh fallito, redirect a login
            window.location.href = PORTAL_CONFIG.loginPage;
            throw new Error('Sessione scaduta');
        }
    }
    
    return response;
}

// Esporta funzioni globali
window.PORTAL_CONFIG = PORTAL_CONFIG;
window.initSupabase = initSupabase;
window.getUserRole = getUserRole;
window.redirectByRole = redirectByRole;
window.checkPageAccess = checkPageAccess;
window.portalLogout = portalLogout;
window.renderSidebarMenu = renderSidebarMenu;
window.getFreshToken = getFreshToken;     // 🔑 Token auth
window.authFetch = authFetch;
window.loadPortalConfig = loadPortalConfig;             // 🔑 Fetch con auth
window.generateAvatarUrl = generateAvatarUrl; // 🎨 Avatar dinamico
window.renderAvatar = renderAvatar;         // 🎨 Render avatar
window.renderUserInfo = renderUserInfo;     // 🎨 User info con avatar

// 📋 AUDIT LOG: Registra attività su tabella activities
async function logActivity(action, entityType, entityId, details) {
    try {
        var supabase = await initSupabase();
        var { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('activities').insert({
            user_id: user.id,
            action: action,
            entity_type: entityType,
            entity_id: entityId || null,
            details: typeof details === 'string' ? { message: details } : (details || {})
        });
    } catch(e) {
        console.warn('[AuditLog] Errore:', e.message);
    }
}
window.logActivity = logActivity;
