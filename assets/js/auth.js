/**
 * assets/js/auth.js - Home Design Lab
 * Sistema di autenticazione unificato - REFACTORED
 * 
 * NOTA: Questo file ora e' un wrapper che utilizza esclusivamente 
 * Supabase SDK nativo (portal-config.js). NON usa piu' token custom.
 * 
 * Gestisce login/logout, routing per ruolo (senior/operator/client),
 * protezione pagine riservate, UI state.
 */
(function () {
    'use strict';

    // 🔄 DEPRECATO: Non usare piu' localStorage custom
    // var STORAGE_TOKEN   = 'hdl_token';  // DEPRECATO
    // var STORAGE_REFRESH = 'hdl_refresh';  // DEPRECATO  
    // var STORAGE_USER    = 'hdl_user';  // DEPRECATO

    // ✅ NUOVO: Usa Supabase SDK nativo per tutta la gestione sessione
    // Il token viene gestito automaticamente da Supabase con refresh automatico

    var ROLE_REDIRECTS = { 
        senior: 'dashboard-senior.html', 
        admin: 'dashboard-senior.html',
        operator: 'dashboard-operatore.html', 
        architect: 'dashboard-operatore.html',
        client: 'area-cliente.html' 
    };
    var PROTECTED      = ['/operatore', '/portale-cliente'];

    // 🔄 DEPRECATE: Funzioni localStorage custom non piu' usate
    // Supabase SDK gestisce tutto automaticamente
    
    async function getToken() {
        // Usa Supabase SDK nativo per ottenere token fresco
        if (typeof window.getFreshToken === 'function') {
            return await window.getFreshToken();
        }
        // Fallback: usa Supabase diretto
        if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            return session?.access_token || null;
        }
        return null;
    }
    
    async function getStoredUser() {
        // Ottieni user direttamente da Supabase
        if (window.supabase) {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return null;
            
            // Aggiungi ruolo dal profilo
            try {
                const { data: profile } = await window.supabase
                .from('profiles')
                .select('role, nome, avatar_url')
                .eq('user_id', user.id)
                .single();
            
            return {
                ...user,
                role: profile?.role || 'client',
                display_name: profile?.nome || user.email,
                avatar_url: profile?.avatar_url || null
            };
            } catch(e) {
                return { ...user, role: 'client', display_name: user.email };
            }
        }
        return null;
    }
    
    function clearSession() {
        // Logout tramite Supabase
        if (window.portalLogout) {
            window.portalLogout();
        } else if (window.supabase) {
            window.supabase.auth.signOut();
        }
    }

    function showNotification(msg, type) {
        var old = document.querySelector('.hdl-notification');
        if (old) old.remove();
        var colors = { error:'#b91c1c', success:'#166534', info:'#1e40af' };
        var el = document.createElement('div');
        el.className = 'hdl-notification';
        el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;align-items:center;gap:12px;padding:14px 20px;color:#fff;font-size:14px;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.18);background:' + (colors[type]||colors.info);
        el.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">' + ({error:'error',success:'check_circle',info:'info'}[type]||'info') + '</span><p style="flex:1">' + msg + '</p><button onclick="this.parentElement.remove()" style="margin-left:8px;opacity:.7"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>';
        document.body.appendChild(el);
        setTimeout(function(){ if(el.parentElement) el.remove(); }, 5000);
    }

    function setButtonLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? 'Accesso in corso...' : 'Accedi';
    }

    async function handleLogin(email, password) {
        // ✅ NUOVO: Usa Supabase SDK nativo per login
        if (!window.supabase) {
            throw new Error('Supabase non inizializzato');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw new Error(error.message || 'Credenziali non valide');
        
        // Ottieni ruolo dal profilo
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();
        
        const role = profile?.role || 'client';
        const redirect = ROLE_REDIRECTS[role] || 'area-cliente.html';
        
        return { 
            user: { ...data.user, role }, 
            redirect,
            session: data.session 
        };
    }

    async function handleLogout() {
        // ✅ NUOVO: Usa Supabase SDK nativo per logout
        if (window.portalLogout) {
            await window.portalLogout();
        } else if (window.supabase) {
            await window.supabase.auth.signOut();
        }
        window.location.href = '/';
    }

    async function guardProtectedPage() {
        var path = window.location.pathname;
        var pageName = path.split('/').pop() || '';
        
        // Lista pagine protette (file HTML)
        var protectedPages = ['dashboard-senior.html', 'dashboard-operatore.html', 'area-cliente.html', 
                              'gestione-clienti.html', 'gestione-immobili.html', 'gestione-journal.html', 
                              'gestione-team.html', 'dettaglio-progetto.html'];
        
        if (!protectedPages.some(function(p){ return pageName.includes(p); })) return;
        
        // Verifica sessione con Supabase
        var user = await getStoredUser();
        if (!user) { 
            window.location.replace('/'); 
            return; 
        }
        
        // Verifica ruolo per pagina
        if (pageName.includes('dashboard-senior') && user.role !== 'senior' && user.role !== 'admin') { 
            window.location.replace('area-cliente.html'); 
            return; 
        }
        if (pageName.includes('dashboard-operatore') && !['senior','operator','architect'].includes(user.role)) { 
            window.location.replace('area-cliente.html'); 
            return; 
        }
        if (pageName.includes('area-cliente') && user.role !== 'client') { 
            window.location.replace(ROLE_REDIRECTS[user.role] || 'dashboard-senior.html'); 
            return;
        }
    }

    async function updateUI() {
        var user = await getStoredUser();
        var loggedIn = Boolean(user);
        
        document.querySelectorAll('[data-show-logged-in]').forEach(function(el){ el.style.display = loggedIn?'':'none'; });
        document.querySelectorAll('[data-show-logged-out]').forEach(function(el){ el.style.display = loggedIn?'none':''; });
        document.querySelectorAll('[data-user-name]').forEach(function(el){ el.textContent = (user&&user.display_name)||''; });
        document.querySelectorAll('[data-user-role]').forEach(function(el){ el.textContent = (user&&user.role)||''; });
        
        // 🆕 Aggiorna avatar nell'UI (se presente elemento data-user-avatar)
        document.querySelectorAll('[data-user-avatar]').forEach(function(el){ 
            if (user && user.avatar_url) {
                el.src = user.avatar_url;
                el.style.display = '';
            } else if (user) {
                // Genera avatar DiceBear per clienti o placeholder per staff
                var isStaff = ['senior','operator','admin','architect'].includes(user.role);
                if (!isStaff) {
                    // Clienti: avatar illustrato DiceBear
                    el.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=c0aede,b6e3f4,d1d4f9`;
                } else {
                    // Staff: placeholder con iniziali
                    el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || 'User')}&background=186C32&color=fff`;
                }
            }
        });
        
        if (user) {
            document.querySelectorAll('[data-require-role]').forEach(function(el){
                var allowed = el.getAttribute('data-require-role').split(',').map(function(r){ return r.trim(); });
                el.style.display = allowed.indexOf(user.role)!==-1?'':'none';
            });
        }
    }

    function setupLoginForm() {
        var form = document.getElementById('site-login-form');
        if (!form) return;
        var stored = getStoredUser(), token = getToken();
        if (stored && token) {
            var next = new URLSearchParams(window.location.search).get('next');
            window.location.replace(next || ROLE_REDIRECTS[stored.role] || '/');
            return;
        }
        var toggle = document.getElementById('site-login-password-toggle');
        var pwInput = document.getElementById('site-login-password');
        if (toggle && pwInput) {
            toggle.addEventListener('click', function(){
                var hidden = pwInput.type === 'password';
                pwInput.type = hidden ? 'text' : 'password';
                toggle.textContent = hidden ? 'visibility_off' : 'visibility';
            });
        }
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var email    = (document.getElementById('site-login-email')||{}).value;
            var password = (document.getElementById('site-login-password')||{}).value;
            var btn      = form.querySelector('button[type="submit"]');
            if (!email || !password) { showNotification('Email e password richiesti','error'); return; }
            setButtonLoading(btn, true);
            try {
                var data = await handleLogin(email.trim(), password);
                showNotification('Accesso effettuato','success');
                var next = new URLSearchParams(window.location.search).get('next');
                setTimeout(function(){ window.location.href = next || data.redirect || ROLE_REDIRECTS[data.user.role] || '/'; }, 600);
            } catch(err) {
                showNotification(err.message||'Errore di accesso','error');
                setButtonLoading(btn, false);
            }
        });
    }

    function setupLogoutButtons() {
        document.querySelectorAll('[data-action="logout"]').forEach(function(btn){
            btn.addEventListener('click', function(e){ e.preventDefault(); handleLogout(); });
        });
    }

    window.HDL = {
        getToken: getToken,                    // ✅ Ora async, usa Supabase SDK
        getUser:  getStoredUser,               // ✅ Ora async, usa Supabase SDK
        logout:   handleLogout,                // ✅ Usa Supabase signOut
        isLoggedIn:  async function(){ return Boolean(await getStoredUser()); },
        hasRole:     async function(r){ var u=await getStoredUser(); return u?.role===r; },
        isOperator:  async function(){ var u=await getStoredUser(); return ['senior','operator'].includes(u?.role); },
        showNotification: showNotification,
        // 🆕 NUOVO: Usa authFetch da portal-config.js (gestisce automaticamente refresh)
        authFetch: async function(url, opts) {
            if (window.authFetch) {
                return await window.authFetch(url, opts);
            }
            // Fallback manuale
            opts = opts||{};
            var token = await getToken();
            if (!token) { 
                window.location.replace('/');
                throw new Error('Sessione scaduta'); 
            }
            var headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{}, {Authorization:'Bearer '+token});
            var res = await fetch(url, Object.assign({},opts,{headers:headers}));
            if (res.status===401) { 
                await handleLogout();
                throw new Error('Sessione scaduta'); 
            }
            return res;
        }
    };

    document.addEventListener('DOMContentLoaded', async function(){
        await guardProtectedPage();
        await updateUI();
        setupLoginForm();
        setupLogoutButtons();
    });
})();
