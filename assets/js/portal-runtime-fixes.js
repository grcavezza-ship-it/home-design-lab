/* Shared runtime fixes loaded after portal-init on authenticated portal pages. */
(() => {
  'use strict';

  async function getFreshAccessToken() {
    if (!window.supabase?.auth) return null;
    const { data: { session } } = await window.supabase.auth.getSession();
    return session?.access_token || null;
  }

  // This helper exists for API modules such as Imprese.
  // It intentionally does not modify the shared header or avatar.
  if (typeof window.authFetch !== 'function') {
    window.authFetch = async (url, options = {}) => {
      const opts = { ...options, headers: { ...(options.headers || {}) } };
      const token = await getFreshAccessToken();
      if (token) opts.headers.Authorization = `Bearer ${token}`;
      return fetch(url, opts);
    };
  }
})();
