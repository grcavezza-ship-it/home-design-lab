/* Shared runtime helpers loaded after portal-init. Does not alter sidebar or topbar structure. */
(() => {
  'use strict';

  function initials(name, email) {
    const source = String(name || '').trim() || String(email || '').trim().split('@')[0] || 'HDL';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function initialsSvg(name, email) {
    const text = initials(name, email).replace(/[^A-Za-z0-9À-ÖØ-öø-ÿ]/g, '').slice(0, 2) || 'HD';
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <rect x="0" y="0" width="40" height="40" rx="11" fill="#E8F5E9"/>
        <text x="20" y="25" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#186C32">${text}</text>
      </svg>`)} `;
  }

  async function getFreshAccessToken() {
    if (!window.supabase?.auth) return null;
    const { data: { session } } = await window.supabase.auth.getSession();
    return session?.access_token || null;
  }

  if (typeof window.authFetch !== 'function') {
    window.authFetch = async (url, options = {}) => {
      const opts = { ...options, headers: { ...(options.headers || {}) } };
      const token = await getFreshAccessToken();
      if (token) opts.headers.Authorization = `Bearer ${token}`;
      return fetch(url, opts);
    };
  }

  function installScopedStyles() {
    if (document.getElementById('portal-runtime-fixes-style')) return;
    const style = document.createElement('style');
    style.id = 'portal-runtime-fixes-style';
    style.textContent = `
      /* Preserve the existing rounded-square avatar frame. */
      #avatar-btn { border-radius: 12px !important; overflow: hidden !important; }
      #avatar-img { border-radius: 0 !important; display: block !important; width: 100% !important; height: 100% !important; object-fit: cover !important; }

      /* Team list cards: restore balanced proportions without touching the shared menu/header. */
      #team-list > button { min-height: 84px; padding: 15px 16px !important; }
      #team-list > button > div { gap: 14px !important; }
      #team-list > button .w-11.h-11 { width: 48px !important; height: 48px !important; flex: 0 0 48px !important; }
      #team-list > button p { line-height: 1.25; }
      @media (max-width: 640px) {
        #team-list > button { min-height: 80px; padding: 14px !important; }
      }

      /* Mobile portal sidebar: use the existing sidebar/overlay elements and classes. */
      @media (max-width: 1023px) {
        #sidebar-menu { transform: translateX(-100%); transition: transform 300ms ease-in-out !important; }
        #sidebar-menu.portal-mobile-open { transform: translateX(0) !important; }
        #mobile-sidebar-overlay.portal-mobile-visible { display: block !important; }
        body.portal-sidebar-open { overflow: hidden; }
      }
    `;
    document.head.appendChild(style);
  }

  function applyAvatarFallback() {
    const imgs = document.querySelectorAll('#avatar-img');
    if (!imgs.length) return;
    const user = window.currentUser || {};
    const profile = window.currentUserProfile || {};
    const display = window.currentUserDisplayName ||
      [profile.nome, profile.cognome].filter(Boolean).join(' ') ||
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email || '';
    const url = profile.avatar_url || user.user_metadata?.avatar_url || '';

    imgs.forEach(img => {
      img.onerror = () => {
        img.onerror = null;
        if (!url) img.src = initialsSvg(display, user.email);
        img.alt = display || 'Avatar';
      };

      if (url) {
        img.src = url;
      } else {
        img.src = initialsSvg(display, user.email);
        img.alt = display || 'Avatar';
      }
    });
  }

  function ensureAvatarDropdown() {
    const btn = document.getElementById('avatar-btn');
    const dropdown = document.getElementById('avatar-dropdown');
    const container = document.getElementById('avatar-dropdown-container');
    if (!btn || !dropdown || !container || btn.dataset.dropdownBound === '1') return;

    btn.dataset.dropdownBound = '1';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    }, true);

    document.addEventListener('click', (event) => {
      if (!container.contains(event.target)) {
        dropdown.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    }, true);
  }

  function ensureMobileSidebarToggle() {
    const sidebar = document.getElementById('sidebar-menu');
    const toggle = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (!sidebar || !toggle || !overlay || toggle.dataset.sidebarBound === '1') return;

    toggle.dataset.sidebarBound = '1';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'sidebar-menu');

    const icon = toggle.querySelector('.material-symbols-outlined');

    const closeSidebar = () => {
      sidebar.classList.remove('portal-mobile-open');
      overlay.classList.remove('portal-mobile-visible');
      document.body.classList.remove('portal-sidebar-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (icon) icon.textContent = 'menu';
    };

    const openSidebar = () => {
      sidebar.classList.add('portal-mobile-open');
      overlay.classList.add('portal-mobile-visible');
      document.body.classList.add('portal-sidebar-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (icon) icon.textContent = 'close';
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (sidebar.classList.contains('portal-mobile-open')) closeSidebar();
      else openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) closeSidebar();
    });

    closeSidebar();
  }

  window.portalAvatarInitialsSvg = initialsSvg;
  installScopedStyles();
  ensureAvatarDropdown();
  ensureMobileSidebarToggle();
  window.addEventListener('load', () => {
    applyAvatarFallback();
    ensureAvatarDropdown();
    ensureMobileSidebarToggle();
  });
  document.addEventListener('DOMContentLoaded', () => {
    applyAvatarFallback();
    ensureAvatarDropdown();
    ensureMobileSidebarToggle();
  });
  setTimeout(() => {
    applyAvatarFallback();
    ensureAvatarDropdown();
    ensureMobileSidebarToggle();
  }, 300);
  setTimeout(() => {
    applyAvatarFallback();
    ensureAvatarDropdown();
    ensureMobileSidebarToggle();
  }, 1000);
})();
