/**
 * Portal Init - Script di inizializzazione per tutte le pagine del portale
 * Da includere in fondo ad ogni pagina HTML
 * 
 * Uso:
 * <script>
 *   PORTAL_PAGE_CONFIG = {
 *     allowedRoles: ['senior', 'admin'],
 *     defaultActiveMenu: 'overview',
 *     pageName: 'Dashboard Senior'
 *   };
 * </script>
 * <script src="assets/js/portal-init.js"></script>
 */

// LOG IMMEDIATO per verificare caricamento file
console.log('[Portal Init] 🚀 File portal-init.js caricato ed in esecuzione...');

document.addEventListener('DOMContentLoaded', async () => {
    // Nascondi il contenuto principale finché non viene renderizzato
    // Usa un wrapper per evitare di nascondere eventuali secondi <main> (es. editor journal)
    document.head.insertAdjacentHTML('beforeend', '<style>main:not([id^="editor"]) { opacity: 0; transition: opacity 0.2s ease-in; }</style>');
    const mainEl = document.querySelector('main');
    
    console.log('[Portal Init] DOMContentLoaded event fired');
    
    const config = window.PORTAL_PAGE_CONFIG || {
        allowedRoles: ['client'],
        defaultActiveMenu: 'overview',
        pageName: 'Portale'
    };
    
    // 🎨 Renderizza SUBITO la sidebar di fallback (anche senza Supabase/auth)
    // così il menu è sempre visibile. Verrà ri-renderizzato dopo l'auth.
    renderSidebarFallback(config.defaultActiveMenu);
    console.log('[Portal Init] Config:', config);
    
    // Attendi che portal-config.js sia caricato (max 3 secondi)
    let configAttempts = 0;
    while ((typeof initSupabase !== 'function' || typeof getUserRole !== 'function') && configAttempts < 30) {
        console.log(`[Portal Init] Attendo portal-config.js... tentativo ${configAttempts + 1}`);
        await new Promise(r => setTimeout(r, 100));
        configAttempts++;
    }
    
    // Check if portal-config.js functions are available
    if (typeof initSupabase !== 'function' || typeof getUserRole !== 'function') {
        console.error('[Portal Init] ❌ Funzioni da portal-config.js non disponibili dopo 3 secondi!');
        console.error('[Portal Init] initSupabase:', typeof initSupabase);
        console.error('[Portal Init] getUserRole:', typeof getUserRole);
    }
    
    try {
        // Attendi che libreria Supabase sia pronta
        let libAttempts = 0;
        while ((typeof window.supabase === 'undefined' || !window.supabase.createClient) && 
               (typeof supabase === 'undefined' || !supabase.createClient) && 
               libAttempts < 30) {
            console.log(`[Portal Init] Attendo libreria Supabase... tentativo ${libAttempts + 1}`);
            await new Promise(r => setTimeout(r, 100));
            libAttempts++;
        }
        
        // Se la libreria è disponibile, crea client anche senza autenticazione
        console.log('[Portal Init] Check creazione client - loadPortalConfig:', typeof loadPortalConfig);
        console.log('[Portal Init] Check creazione client - window.supabase?.createClient:', !!window.supabase?.createClient);
        console.log('[Portal Init] Check creazione client - global supabase?.createClient:', !!supabase?.createClient);
        
        if ((window.supabase?.createClient || supabase?.createClient) && typeof loadPortalConfig === 'function') {
            console.log('[Portal Init] 🔄 Creo client Supabase...');
            
            // Carica config se necessario
            if (!PORTAL_CONFIG?.supabase?.url) {
                console.log('[Portal Init] Caricando configurazione dal server...');
                await loadPortalConfig();
            }
            
            console.log('[Portal Init] PORTAL_CONFIG dopo load:', { 
                url: PORTAL_CONFIG?.supabase?.url ? 'presente' : 'mancante',
                key: PORTAL_CONFIG?.supabase?.anonKey ? 'presente' : 'mancante'
            });
            
            // Crea client
            const supabaseUrl = PORTAL_CONFIG?.supabase?.url;
            const supabaseKey = PORTAL_CONFIG?.supabase?.anonKey;
            
            if (supabaseUrl && supabaseKey) {
                console.log('[Portal Init] URL e Key presenti, creo client...');
                if (window.supabase?.createClient) {
                    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                    console.log('[Portal Init] ✅ Client creato da window.supabase.createClient');
                } else if (supabase?.createClient) {
                    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                    console.log('[Portal Init] ✅ Client creato da global supabase.createClient');
                }
                window.supabase = window.supabaseClient;
                console.log('[Portal Init] ✅ window.supabase esposto globalmente!');
            } else {
                console.error('[Portal Init] ❌ URL o Key mancanti:', { url: supabaseUrl, key: supabaseKey ? 'presente' : 'mancante' });
            }
        } else {
            console.error('[Portal Init] ❌ Condizioni non soddisfatte per creare client');
        }
        
        // Verifica che Supabase sia stato inizializzato
        if (!window.supabase || !window.supabase.auth) {
            console.error('[Portal Init] ❌ Supabase non inizializzato dopo tentativi!');
            return;
        }
        
        console.log('[Portal Init] ✅ Supabase pronto, proseguo con autenticazione...');
        
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('[Portal Init] Utente non autenticato');
            
            // Evita redirect in loop se già sulla pagina di login
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const isLoginPage = currentPage.includes('login') || currentPage === '' || currentPage === 'index.html';
            
            if (!isLoginPage && !sessionStorage.getItem('login_redirect_attempted')) {
                console.log('[Portal Init] Redirect a login...');
                sessionStorage.setItem('login_redirect_attempted', 'true');
                // Disattivato redirect forzato per debug
                console.error('Redirect a login disattivato per debug');
                // window.location.href = '/login';
                return;
            } else if (isLoginPage) {
                console.log('[Portal Init] Già sulla pagina di login, nessun redirect');
            } else {
                console.log('[Portal Init] Redirect già tentato, proseguo con menu hardcoded');
            }
            
            // Pulisci il flag dopo 10 secondi per permettere futuri redirect
            setTimeout(() => {
                sessionStorage.removeItem('login_redirect_attempted');
            }, 10000);
            
            // Prosegui comunque per permettere funzionalità limitate (es. Drive sync)
            console.log('[Portal Init] ⚠️ Modalità non autenticata - funzionalità limitate');
            return;
        }
        
        // Utente autenticato, reset del flag
        sessionStorage.removeItem('login_redirect_attempted');
        console.log('[Portal Init] ✅ Utente autenticato:', user.email);
        
        // Store current user for avatar generation (solo se autenticato)
        window.currentUser = user;
        
        // Get user role
        var role = await getUserRole();
        window.currentUserRole = role;
        
        // 🎨 Ri-renderizza la sidebar con il ruolo determinato
        // Sovrascrive il fallback iniziale
        if (typeof renderSidebarMenu === 'function') {
            renderSidebarMenu('sidebar-menu', config.defaultActiveMenu);
            console.log('[Portal Init] Sidebar ri-renderizzata per ruolo:', role);
        }
        
        // Carica profilo da operatori_profiles per nome, cognome, telefono, avatar_url
        try {
            const { data: profile } = await window.supabase
                .from('operatori_profiles')
                .select('nome, cognome, telefono, avatar_url')
                .eq('user_id', user.id)
                .maybeSingle();
            if (profile) {
                window.currentUserProfile = profile;
            }
        } catch (e) {
            console.warn('[Portal Init] Impossibile caricare profilo operatore:', e.message);
        }
        
        // Blocca accesso se profilo incompleto (solo per operatori/architetti, non admin/senior/cliente)
        if (role && (role === 'operator' || role === 'architect')) {
            var prof = window.currentUserProfile;
            var isProfilePage = window.location.href.indexOf('profilo.html') !== -1;
            if (!isProfilePage && prof && (!prof.nome || !prof.cognome || !prof.telefono)) {
                console.log('[Portal Init] Profilo incompleto, reindirizzo a profilo.html');
                window.location.href = 'profilo.html';
                return;
            }
        }
        
        // Check page access (solo se autenticato)
        if (role && !config.allowedRoles.includes(role)) {
            console.log(`Accesso negato: ruolo ${role} non autorizzato per questa pagina`);
            await redirectByRole();
            return;
        }
        
        // Update user name in header (solo se autenticato)
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = window.currentUserDisplayName || user.email;
        }
        
        // 🎨 Aggiorna avatar esistente con dati utente dinamici (se avatar-img esiste)
        const avatarImg = document.getElementById('avatar-img');
        if (avatarImg) {
            const avatarUrl = generateAvatarUrl({
                email: user.email,
                display_name: window.currentUserDisplayName || user.user_metadata?.display_name || user.email,
                role: role,
                avatar_url: user.user_metadata?.avatar_url || null
            });
            avatarImg.src = avatarUrl;
            avatarImg.alt = user.email || 'User Avatar';
            console.log('[Portal Init] Avatar aggiornato dinamicamente');
        }
        
        // 🔄 Ricarica progetti se siamo sulla pagina di gestione progetti
        if (typeof window.loadExistingProjects === 'function') {
            window.loadExistingProjects();
            console.log('[Portal Init] loadExistingProjects eseguito con permessi aggiornati');
        }
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                portalLogout();
            });
        }
        
        console.log(`[Portal Init] ${config.pageName} loaded - User: ${user.email}, Role: ${role}`);
        
        // Carica notifiche globali
        var notifScript = document.createElement('script');
        notifScript.src = 'notifications-system.js';
        document.body.appendChild(notifScript);
        
    } catch (error) {
        console.error(`Errore inizializzazione ${config.pageName}:`, error);
        // Non mostrare alert, potrebbe essere fastidioso
    }
    
    // Mostra il contenuto principale dopo aver renderizzato tutto
    if (mainEl) {
        // Piccolo timeout per permettere al DOM di stabilizzarsi
        setTimeout(function() { mainEl.style.opacity = '1'; }, 50);
    }
});

// 🔄 Funzione di fallback per renderizzare la sidebar immediatamente (anche senza auth)
// Mostra solo un placeholder, il menu vero viene renderizzato dopo l'auth.
function renderSidebarFallback(activeItem) {
    const el = document.getElementById('sidebar-menu');
    if (!el) return;
    
    var html = '<div class="px-8 mb-12">';
    html += '<h1 class="font-[\'Noto_Serif\'] text-2xl font-bold tracking-tighter text-[#186C32] dark:text-[#4ade80]">Atelier Studio</h1>';
    html += '<p class="text-stone-500 mt-1 capitalize tracking-normal text-xs">&nbsp;</p>';
    html += '</div>';
    html += '<div class="flex-1 flex items-center justify-center">';
    html += '<div class="flex flex-col items-center gap-3">';
    html += '<div class="w-6 h-6 border-2 border-[#186C32] border-t-transparent rounded-full animate-spin"></div>';
    html += '<p class="text-xs text-stone-400">Caricamento...</p>';
    html += '</div></div>';
    
    el.innerHTML = html;
}
