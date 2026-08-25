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
        <circle cx="20" cy="20" r="19" fill="#E8F5E9"/>
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
      if (url) {
        img.onerror = () => {
          img.onerror = null;
          img.src = initialsSvg(display, user.email);
          img.alt = display || 'Avatar';
        };
        img.src = url;
      } else {
        img.onerror = null;
        img.src = initialsSvg(display, user.email);
        img.alt = display || 'Avatar';
      }
    });
  }

  window.portalAvatarInitialsSvg = initialsSvg;
  window.addEventListener('load', applyAvatarFallback);
  document.addEventListener('DOMContentLoaded', applyAvatarFallback);
  setTimeout(applyAvatarFallback, 300);
  setTimeout(applyAvatarFallback, 1000);
})();
