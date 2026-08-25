(function () {
  'use strict';

  const pages = { 'gestione-team.html': 'collaboratore', 'gestione-clienti.html': 'cliente' };
  const current = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!pages[current]) return;

  function findEmail() {
    const inputs = document.querySelectorAll('main input[type="email"], main input[id*="email" i]');
    for (const input of inputs) {
      if (input.offsetParent !== null && /@/.test(input.value || '')) return input.value.trim();
    }
    const roots = [document.querySelector('#detail'), document.querySelector('#profile-modal'), document.querySelector('main')].filter(Boolean);
    for (const root of roots) {
      const matches = (root.innerText || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
      if (matches[0]) return matches[0];
    }
    return '';
  }

  function findTargetContainer() {
    const detail = document.querySelector('#detail');
    if (detail && detail.offsetParent !== null) return detail;
    const modal = document.querySelector('#profile-modal:not(.hidden)');
    if (modal) return modal.querySelector('.bg-white') || modal;
    const main = document.querySelector('main');
    if (!main) return null;
    const email = main.querySelector('input[type="email"], [id*="email" i]');
    if (email) return email.closest('section, article, [role="dialog"], .bg-white, .bg-surface-container-low, div') || main;
    return main;
  }

  function install() {
    if (document.getElementById('account-invite-resend')) return;
    const target = findTargetContainer();
    if (!target) return;

    const button = document.createElement('button');
    button.id = 'account-invite-resend';
    button.type = 'button';
    button.className = 'inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-sm font-body shadow-sm mt-4';
    button.innerHTML = '<span class="material-symbols-outlined text-[18px]">mark_email_unread</span><span>Reinvia email di primo accesso</span>';
    button.title = 'Invia nuovamente la mail per il primo accesso';
    button.setAttribute('data-account-invite', 'true');

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap items-center gap-2 mt-4';
    actions.appendChild(button);

    target.appendChild(actions);

    const update = () => {
      const email = findEmail();
      button.dataset.email = email;
      actions.style.display = email ? 'flex' : 'none';
    };

    button.addEventListener('click', async () => {
      const email = button.dataset.email || findEmail();
      if (!email) return;
      const tipo = pages[current];
      const label = tipo === 'cliente' ? 'cliente' : 'collaboratore';
      if (!window.confirm(`Inviare nuovamente la mail di primo accesso a ${email}?`)) return;

      const old = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Invio...</span>';
      try {
        const token = await getToken();
        const response = await fetch('/api/primo-accesso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ email, tipo })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Invio non riuscito');
        if (data.emailSent === false) throw new Error(data.emailError || 'Il server non ha potuto inviare la mail');
        notify(`Email di primo accesso reinviata al ${label}.`, true);
      } catch (error) {
        console.error('[Account Invite]', error);
        notify(error.message || 'Errore durante il reinvio della mail.', false);
      } finally {
        button.disabled = false;
        button.innerHTML = old;
      }
    });

    const observer = new MutationObserver(() => {
      const currentTarget = findTargetContainer();
      if (currentTarget && !document.getElementById('account-invite-resend')) currentTarget.appendChild(actions);
      update();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    update();
  }

  async function getToken() {
    if (window.supabase?.auth) {
      const { data } = await window.supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;
    }
    const match = document.cookie.match(/(?:^|; )hdl_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    throw new Error('Sessione non disponibile. Effettua nuovamente il login.');
  }

  function notify(message, success) {
    let el = document.getElementById('account-invite-notice');
    if (!el) { el = document.createElement('div'); el.id = 'account-invite-notice'; document.body.appendChild(el); }
    el.className = 'fixed top-24 right-5 z-[9999] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl ' + (success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800');
    el.textContent = message;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
