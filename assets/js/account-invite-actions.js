(function () {
  'use strict';

  const pages = { 'gestione-team.html': 'collaboratore', 'gestione-clienti.html': 'cliente' };
  const current = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!pages[current]) return;

  const CSS_ID = 'account-actions-ui';
  function installStyles() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      .account-action-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;width:100%;margin-top:18px}
      .account-action-grid.account-action-grid-client{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:18px}
      .account-action-card{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;min-height:58px!important;width:100%!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #e5e7eb!important;background:#fff!important;color:#1f2937!important;box-shadow:0 1px 2px rgba(0,0,0,.03)!important;text-align:left!important;transition:all .16s ease!important}
      .account-action-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.06)!important;transform:translateY(-1px)}
      .account-action-card .material-symbols-outlined{font-size:20px!important;flex:0 0 auto}
      .account-action-card .action-copy{display:flex;flex-direction:column;min-width:0}
      .account-action-card .action-title{font-weight:700;font-size:14px;line-height:1.2}
      .account-action-card .action-subtitle{font-size:11px;color:#78716c;margin-top:3px;line-height:1.25}
      .account-action-card.action-edit .material-symbols-outlined{color:#186c32}
      .account-action-card.action-resend{border-color:#b7e4c2!important;background:#f6fff7!important;color:#166534!important}
      .account-action-card.action-resend .material-symbols-outlined{color:#16a34a}
      .account-action-card.action-danger{border-color:#f1c7c3!important;background:#fffafa!important;color:#b42318!important}
      .account-action-card.action-danger .material-symbols-outlined{color:#d92d20}
      @media(max-width:700px){.account-action-grid,.account-action-grid.account-action-grid-client{grid-template-columns:1fr!important}.account-action-card{min-height:54px!important}}
    `;
    document.head.appendChild(style);
  }

  function findEmail(root) {
    const scope = root || document;
    const inputs = scope.querySelectorAll('input[type="email"], input[id*="email" i]');
    for (const input of inputs) {
      if (input.offsetParent !== null && /@/.test(input.value || '')) return input.value.trim();
    }
    const text = scope.innerText || '';
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
    return matches[0] || '';
  }

  function makeActionButton(kind, icon, title, subtitle) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `account-action-card ${kind}`;
    b.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span class="action-copy"><span class="action-title">${title}</span><span class="action-subtitle">${subtitle}</span></span>`;
    return b;
  }

  function decorateTeamDetail() {
    const detail = document.querySelector('#detail');
    if (!detail || detail.offsetParent === null) return false;

    const buttons = [...detail.querySelectorAll('button')];
    const edit = buttons.find(b => /^\s*Modifica\s*$/i.test(b.textContent || ''));
    const suspend = buttons.find(b => /Sospendi accesso|Riattiva accesso/i.test(b.textContent || ''));
    const reset = buttons.find(b => /Reset password/i.test(b.textContent || ''));
    if (!edit || !suspend) return false;
    if (reset) reset.remove();

    const row = edit.parentElement;
    if (!row) return false;
    row.classList.add('account-action-grid');

    const existingResend = row.querySelector('[data-account-invite="true"]');
    if (!existingResend) {
      const resend = makeActionButton('action-resend', 'mark_email_unread', 'Reinvia accesso', 'Invia nuovamente la mail di primo accesso');
      resend.dataset.accountInvite = 'true';
      row.insertBefore(resend, suspend);
      resend.addEventListener('click', () => sendInvite(resend));
    }

    edit.className = 'account-action-card action-edit';
    edit.innerHTML = '<span class="material-symbols-outlined">edit</span><span class="action-copy"><span class="action-title">Modifica</span><span class="action-subtitle">Dati, ruolo, moduli e progetti</span></span>';

    const active = /Sospendi accesso/i.test(suspend.textContent || '');
    suspend.className = `account-action-card ${active ? 'action-danger' : 'action-resend'}`;
    suspend.innerHTML = active
      ? '<span class="material-symbols-outlined">block</span><span class="action-copy"><span class="action-title">Sospendi accesso</span><span class="action-subtitle">Blocca l\'accesso al portale</span></span>'
      : '<span class="material-symbols-outlined">check_circle</span><span class="action-copy"><span class="action-title">Riattiva accesso</span><span class="action-subtitle">Riabilita l\'accesso al portale</span></span>';

    const headerRow = row.parentElement;
    if (headerRow && headerRow.className.includes('lg:flex-row')) {
      headerRow.classList.remove('lg:flex-row');
      headerRow.classList.add('lg:flex-col');
      headerRow.classList.add('items-stretch');
    }
    return true;
  }

  function decorateClientDetail() {
    const panel = document.querySelector('#detail-panel');
    const edit = document.querySelector('#detail-edit');
    if (!panel || !edit) return false;
    const top = edit.parentElement;
    if (!top || top.dataset.accountActionsDecorated === 'true') return true;

    const actionGrid = document.createElement('div');
    actionGrid.className = 'account-action-grid account-action-grid-client';
    top.parentElement.insertBefore(actionGrid, top.nextSibling);
    top.dataset.accountActionsDecorated = 'true';

    top.classList.remove('justify-between');
    top.classList.add('flex-col','items-stretch');
    edit.className = 'account-action-card action-edit';
    edit.innerHTML = '<span class="material-symbols-outlined">edit</span><span class="action-copy"><span class="action-title">Modifica</span><span class="action-subtitle">Aggiorna i dati del cliente</span></span>';
    actionGrid.appendChild(edit);

    const resend = makeActionButton('action-resend', 'mark_email_unread', 'Reinvia accesso', 'Invia nuovamente la mail di primo accesso');
    resend.dataset.accountInvite = 'true';
    actionGrid.appendChild(resend);
    resend.addEventListener('click', () => sendInvite(resend));
    return true;
  }

  async function sendInvite(button) {
    const root = current === 'gestione-team.html' ? document.querySelector('#detail') : document.querySelector('#detail-panel');
    const email = button.dataset.email || findEmail(root || document);
    if (!email) return notify('Email non disponibile per questo account.', false);
    const label = pages[current];
    if (!window.confirm(`Inviare nuovamente la mail di primo accesso a ${email}?`)) return;

    const old = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span><span class="action-copy"><span class="action-title">Invio...</span><span class="action-subtitle">Attendere</span></span>';
    try {
      const token = await getToken();
      const response = await fetch('/api/primo-accesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ email, tipo: label })
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

  function run() {
    installStyles();
    if (current === 'gestione-team.html') decorateTeamDetail();
    if (current === 'gestione-clienti.html') decorateClientDetail();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
