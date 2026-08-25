/* Shared runtime fixes loaded after portal-init on authenticated portal pages. */
(() => {
  'use strict';

  function initials(name, email) {
    const source = String(name || '').trim() || String(email || '').trim().split('@')[0] || 'HDL';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function initialsSvg(name, email) {
    const text = initials(name, email);
    const safe = text.replace(/[&<>"']/g, '');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="24" fill="#E8F5E9"/>
        <text x="48" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#186C32">${safe}</text>
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
    const display = window.currentUserDisplayName || [profile.nome, profile.cognome].filter(Boolean).join(' ') || user.user_metadata?.display_name || user.email || '';
    const url = profile.avatar_url || user.user_metadata?.avatar_url || '';

    imgs.forEach(img => {
      if (url) {
        img.onerror = () => {
          img.onerror = null;
          img.src = initialsSvg(display, user.email);
          img.classList.remove('object-cover');
        };
        img.src = url;
      } else {
        img.src = initialsSvg(display, user.email);
        img.alt = display || 'Avatar';
        img.classList.remove('object-cover');
      }
    });
  }

  window.portalAvatarInitialsSvg = initialsSvg;
  window.addEventListener('load', applyAvatarFallback);
  document.addEventListener('DOMContentLoaded', applyAvatarFallback);
  setTimeout(applyAvatarFallback, 300);
})();
