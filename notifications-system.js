// Sistema Notifiche Globale per il Portale
// Include badge, dropdown in tempo reale e toast

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.channel = null;
        this.userId = null;
        this.userRole = null;
        this.init();
    }

    async init() {
        this.userId = await this.getCurrentUserId();
        if (!this.userId) { setTimeout(() => this.init(), 500); return; }
        this.userRole = window.currentUserRole || 'client';
        await this.loadNotifications();
        this.setupUI();
        this.setupRealTime();
    }

    async getCurrentUserId() {
        if (window.supabase) {
            var { data: { user } } = await window.supabase.auth.getUser();
            if (user) return user.id;
        }
        return null;
    }

    async loadNotifications() {
        try {
            if (!window.supabase || !this.userId) return;
            var { data, error } = await window.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            this.notifications = data || [];
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (err) {
            console.error('[Notifiche] Errore caricamento:', err.message);
        }
    }

    findNotificationBtn() {
        var btn = document.querySelector('[data-icon="notifications"]');
        if (btn) return btn.parentElement;
        var spans = document.querySelectorAll('.material-symbols-outlined');
        for (var i = 0; i < spans.length; i++) {
            if (spans[i].textContent.trim() === 'notifications') return spans[i].parentElement;
        }
        return null;
    }

    setupUI() {
        var container = this.findNotificationBtn();
        if (!container) return;
        container.style.position = 'relative';
        var badge = document.createElement('span');
        badge.id = 'notification-badge';
        badge.className = 'absolute -top-1 -right-1 bg-error text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold leading-none';
        badge.style.display = 'none';
        container.appendChild(badge);
        container.addEventListener('click', function(e) {
            e.stopPropagation();
            if (window.notificationSystem) window.notificationSystem.toggleDropdown();
        });
        document.addEventListener('click', function() {
            if (window.notificationSystem) window.notificationSystem.hideDropdown();
        });
    }

    setupRealTime() {
        if (!window.supabase || !this.userId) return;
        this.channel = window.supabase
            .channel('notifications-' + this.userId)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + this.userId
            }, (payload) => this.handleNewNotification(payload.new))
            .subscribe();
    }

    handleNewNotification(notification) {
        this.notifications.unshift(notification);
        this.updateUnreadCount();
        this.renderNotifications();
        this.showToast(notification.title, notification.message);
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(function(n) { return !n.is_read; }).length;
        var badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else badge.style.display = 'none';
        }
    }

    createDropdown() {
        var dropdown = document.createElement('div');
        dropdown.id = 'notifications-dropdown';
        dropdown.className = 'hidden absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-50';
        dropdown.style.top = '100%';
        dropdown.innerHTML = '<div class="p-3 border-b border-stone-200 dark:border-stone-700"><div class="flex justify-between items-center"><h3 class="text-sm font-bold text-on-surface">Notifiche</h3><button id="notif-mark-all" class="text-xs text-primary hover:text-primary/80">Segna tutte come lette</button></div></div><div id="notifications-list" class="max-h-96 overflow-y-auto"></div>';
        var container = this.findNotificationBtn();
        if (container) container.parentElement.appendChild(dropdown);
        setTimeout(function() {
            var markAll = document.getElementById('notif-mark-all');
            if (markAll) markAll.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.notificationSystem) window.notificationSystem.markAllAsRead();
            });
        }, 0);
        return dropdown;
    }

    renderNotifications() {
        var dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) dropdown = this.createDropdown();
        var list = document.getElementById('notifications-list');
        if (!list) return;
        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="p-6 text-center text-on-surface-variant"><span class="material-symbols-outlined text-3xl mb-2 block">notifications_none</span><p class="text-sm">Nessuna notifica</p></div>';
        } else {
            var html = '';
            for (var i = 0; i < this.notifications.length; i++) {
                var n = this.notifications[i];
                html += '<div class="notification-item p-3 border-b border-stone-100 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 ' + (!n.is_read ? 'bg-primary/5' : '') + '" data-id="' + n.id + '"><div class="flex justify-between items-start"><div class="flex-1 min-w-0"><h4 class="text-sm ' + (!n.is_read ? 'font-bold' : 'font-medium') + ' text-on-surface">' + (n.title || '') + '</h4><p class="text-xs text-on-surface-variant mt-0.5">' + (n.message || '') + '</p><p class="text-xs text-stone-400 mt-1.5">' + this.formatDate(n.created_at) + '</p></div>' + (!n.is_read ? '<span class="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0"></span>' : '') + '</div></div>';
            }
            list.innerHTML = html;
            var items = list.querySelectorAll('.notification-item');
            for (var j = 0; j < items.length; j++) items[j].addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                if (window.notificationSystem) window.notificationSystem.markAsRead(id);
            });
        }
    }

    toggleDropdown() { var dropdown = document.getElementById('notifications-dropdown'); if (dropdown) dropdown.classList.toggle('hidden'); }
    hideDropdown() { var dropdown = document.getElementById('notifications-dropdown'); if (dropdown) dropdown.classList.add('hidden'); }

    async markAsRead(id) {
        try {
            if (!window.supabase) return;
            var { error } = await window.supabase.from('notifications').update({ is_read: true }).eq('id', id);
            if (error) throw error;
            for (var i = 0; i < this.notifications.length; i++) if (this.notifications[i].id === id) { this.notifications[i].is_read = true; break; }
            this.updateUnreadCount(); this.renderNotifications();
        } catch (err) { console.error('[Notifiche] Errore markAsRead:', err.message); }
    }

    async markAllAsRead() {
        try {
            if (!window.supabase) return;
            var { error } = await window.supabase.from('notifications').update({ is_read: true }).eq('user_id', this.userId).eq('is_read', false);
            if (error) throw error;
            for (var i = 0; i < this.notifications.length; i++) this.notifications[i].is_read = true;
            this.updateUnreadCount(); this.renderNotifications();
        } catch (err) { console.error('[Notifiche] Errore markAllAsRead:', err.message); }
    }

    showToast(title, message) {
        var toast = document.createElement('div');
        toast.className = 'fixed top-20 right-4 bg-primary text-white px-4 py-3 rounded-lg shadow-lg z-[9999] max-w-sm transition-opacity duration-300';
        toast.style.opacity = '1';
        toast.innerHTML = '<div class="flex items-start gap-3"><span class="material-symbols-outlined text-lg flex-shrink-0">notifications</span><div><p class="font-medium text-sm">' + (title || '') + '</p><p class="text-xs opacity-90 mt-0.5">' + (message || '') + '</p></div></div>';
        document.body.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 5000);
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        var date = new Date(dateStr); if (isNaN(date.getTime())) return '';
        var now = new Date(); var diffMs = now - date;
        var diffMins = Math.floor(diffMs / 60000); var diffHours = Math.floor(diffMs / 3600000); var diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Adesso'; if (diffMins < 60) return diffMins + ' min fa'; if (diffHours < 24) return diffHours + ' ore fa'; if (diffDays < 7) return diffDays + ' giorni fa';
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    }

    async create(title, message, userId) {
        try {
            if (!window.supabase) return;
            var targetUserId = userId || this.userId; if (!targetUserId) return;
            var { error } = await window.supabase.from('notifications').insert({ title: title, message: message, user_id: targetUserId, is_read: false });
            if (error) throw error;
        } catch (err) { console.error('[Notifiche] Errore creazione:', err.message); }
    }
}

var notificationSystem;
function initNotificationSystem() {
    if (window.supabase && typeof window.supabase.from === 'function') {
        if (!window.notificationSystem) window.notificationSystem = new NotificationSystem();
    } else setTimeout(initNotificationSystem, 200);
}
document.addEventListener('DOMContentLoaded', initNotificationSystem);
window.createNotification = function(title, message, userId) {
    if (window.notificationSystem) return window.notificationSystem.create(title, message, userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// Centralized portal access guard
// ─────────────────────────────────────────────────────────────────────────────
(function initPortalAccessGuard(){
    if (window.__portalAccessGuardInitialized) return;
    window.__portalAccessGuardInitialized = true;

    const pageConfig = window.PORTAL_PAGE_CONFIG;
    if (!pageConfig || !pageConfig.allowedRoles) return;

    const path = (window.location.pathname || '').split('/').pop() || 'index.html';
    const pathModules = {
        'dashboard-senior.html':'dashboard','dashboard-operatore.html':'dashboard',
        'gestione-progetti.html':'progetti','dettaglio-progetto.html':'progetti',
        'gestione-immobili.html':'immobili','dettaglio-immobile.html':'immobili',
        'gestione-clienti.html':'clienti','dettaglio-cliente.html':'clienti',
        'gestione-journal.html':'journal','dettaglio-journal.html':'journal',
        'gestione-team.html':'team','gestione-compiti.html':'compiti','gestione-imprese.html':'imprese',
        'gestione-finanze.html':'finanze','documenti-contratti.html':'documenti'
    };
    const page = pathModules[path] || pageConfig.defaultActiveMenu || '';
    if (!page) return;

    const portalConfig = (typeof PORTAL_CONFIG !== 'undefined') ? PORTAL_CONFIG : null;
    const supabaseUrl = portalConfig?.supabase?.url;
    const anonKey = portalConfig?.supabase?.anonKey;
    if (!supabaseUrl || !anonKey || !window.supabase?.auth) return;

    const guardStyle = document.createElement('style');
    guardStyle.id = 'portal-access-guard-style';
    guardStyle.textContent = 'body{opacity:0 !important}';
    document.head.appendChild(guardStyle);

    const roleFallbackPage = {
        admin:'/dashboard-senior.html', senior:'/dashboard-senior.html',
        segretaria:'/dashboard-operatore.html', collaboratore:'/dashboard-operatore.html',
        operator:'/dashboard-operatore.html', architect:'/dashboard-operatore.html'
    };

    async function callAccess(body, token){
        const r = await fetch(supabaseUrl.replace(/\/$/, '') + '/functions/v1/portal-access', {
            method:'POST',
            headers:{'Authorization':'Bearer ' + token,'apikey':anonKey,'Content-Type':'application/json'},
            body:JSON.stringify(body)
        });
        const data = await r.json().catch(()=>({}));
        return {ok:r.ok,data};
    }

    function deny(role){
        const target = roleFallbackPage[role] || '/login';
        window.location.replace(target + (target.includes('?')?'&':'?') + 'access=denied');
    }

    async function runGuard(){
        try{
            const {data:{session}} = await window.supabase.auth.getSession();
            if(!session){ window.location.replace('/login'); return; }
            const pageResult = await callAccess({page}, session.access_token);
            if(!pageResult.data?.allowed){
                if(pageResult.data?.code === 'ACCESS_DISABLED'){
                    window.location.replace('/login?access=suspended'); return;
                }
                deny(pageResult.data?.role || window.currentUserRole); return;
            }
            const menuResult = await callAccess({page:'menu'}, session.access_token);
            if(menuResult.data?.allowed){
                const modules = menuResult.data.modules || {};
                const hrefModule = {
                    'gestione-progetti.html':'progettazione','dettaglio-progetto.html':'progettazione','gestione-compiti.html':'progettazione',
                    'gestione-immobili.html':'immobiliare','dettaglio-immobile.html':'immobiliare',
                    'gestione-clienti.html':'clienti','dettaglio-cliente.html':'clienti',
                    'gestione-journal.html':'journal','dettaglio-journal.html':'journal',
                    'gestione-team.html':'team','gestione-imprese.html':'team','gestione-finanze.html':'finanze','documenti-contratti.html':'documenti'
                };
                const sidebar = document.getElementById('sidebar-menu');
                if(sidebar){
                    sidebar.querySelectorAll('a[href]').forEach(a=>{
                        const raw=(a.getAttribute('href')||'').split('/').pop();
                        const mod=hrefModule[raw];
                        if(mod && modules[mod]===false) a.remove();
                    });
                }
            }
            document.getElementById('portal-access-guard-style')?.remove();
            document.body.style.opacity='1';
        }catch(err){
            console.error('[Portal Access Guard]',err);
            window.location.replace('/login?access=check-failed');
        }
    }
    runGuard();
})();

// Load shared runtime fixes after the current page has authenticated.
(function loadPortalRuntimeFixes(){
    if (window.__portalRuntimeFixes) return;
    window.__portalRuntimeFixes = true;
    const s = document.createElement('script');
    s.src = 'assets/js/portal-runtime-fixes.js?v=20260825';
    s.async = true;
    document.head.appendChild(s);
})();
