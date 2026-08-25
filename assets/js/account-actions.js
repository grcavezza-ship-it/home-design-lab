/* Home Design Lab - Account invitation actions
 * Adds UI controls to resend first-access email for collaborators and clients.
 * Backend authorization remains the source of truth.
 */
(() => {
  const resend = async ({ entity, email, button }) => {
    if (!email) {
      window.alert('Questo account non ha un indirizzo email valido.');
      return;
    }
    if (!window.confirm(`Reinviare l'email di primo accesso a ${email}?`)) return;
    const original = button?.innerHTML || 'Reinvia email accesso';
    if (button) { button.disabled = true; button.innerHTML = '<span class="material-symbols-outlined text-[18px]">hourglass_top</span> Invio...'; }
    try {
      const response = await window.authFetch('/api/reinvia-invito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossibile inviare l’email');
      if (typeof window.showToast === 'function') window.showToast('Email di primo accesso reinviata', 'success');
      else window.alert('Email di primo accesso reinviata.');
    } catch (error) {
      console.error('[account-actions]', error);
      if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
      else window.alert(error.message || 'Errore durante il reinvio');
    } finally {
      if (button) { button.disabled = false; button.innerHTML = original; }
    }
  };

  function addTeamAction(root) {
    if (!root || root.dataset.inviteActionReady === '1') return false;
    const buttons = [...root.querySelectorAll('button')];
    const reset = buttons.find(b => (b.textContent || '').trim().toLowerCase() === 'reset password');
    if (!reset) return false;
    const emailText = root.querySelector('p.text-sm.text-on-surface-variant')?.textContent || '';
    const email = (emailText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = reset.className;
    b.innerHTML = '<span class="material-symbols-outlined text-[18px]">mark_email_unread</span> Reinvia email accesso';
    b.title = 'Reinvia email per impostare la password';
    b.addEventListener('click', () => resend({ entity: 'operator', email, button: b }));
    reset.parentElement?.insertBefore(b, reset.nextSibling);
    root.dataset.inviteActionReady = '1';
    return true;
  }

  function addClientAction(root) {
    if (!root || root.dataset.inviteActionReady === '1') return false;
    const text = root.textContent || '';
    const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
    if (!email) return false;
    const edit = root.querySelector('#detail-edit');
    if (!edit) return false;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'px-3 py-2 border rounded-lg text-sm text-primary';
    b.innerHTML = '<span class="material-symbols-outlined align-middle text-[18px]">mark_email_unread</span> Reinvia accesso';
    b.title = 'Reinvia email per impostare la password';
    b.addEventListener('click', () => resend({ entity: 'client', email, button: b }));
    edit.parentElement?.appendChild(b);
    root.dataset.inviteActionReady = '1';
    return true;
  }

  function init() {
    const page = location.pathname.split('/').pop() || '';
    if (page === 'gestione-team.html') {
      const detail = document.getElementById('detail');
      if (!detail) return;
      const observer = new MutationObserver(() => addTeamAction(detail));
      observer.observe(detail, { childList: true, subtree: true });
      addTeamAction(detail);
    }
    if (page === 'gestione-clienti.html') {
      const detail = document.getElementById('detail-panel');
      if (!detail) return;
      const observer = new MutationObserver(() => addClientAction(detail));
      observer.observe(detail, { childList: true, subtree: true });
      addClientAction(detail);
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
