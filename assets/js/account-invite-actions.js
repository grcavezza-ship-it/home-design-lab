(function () {
  'use strict';
  const pages = {'gestione-team.html':'collaboratore','gestione-clienti.html':'cliente'};
  const current = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!pages[current]) return;

  function findEmail() {
    const inputs = document.querySelectorAll('input[type="email"], input[id*="email" i]');
    for (const input of inputs) if (input.offsetParent !== null && /@/.test(input.value || '')) return input.value.trim();
    const root = document.querySelector('#detail, #profile-modal, main') || document.body;
    const matches = (root.innerText || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
    return matches[0] || '';
  }

  function install() {
    if (document.getElementById('account-invite-resend')) return;
    const header = document.querySelector('header');
    if (!header) return;
    if (!document.getElementById('account-invite-mobile-style')) {
      const style = document.createElement('style');
      style.id = 'account-invite-mobile-style';
      style.textContent = '@media (max-width:640px){#account-invite-resend{width:40px!important;min-width:40px!important;padding:0!important;justify-content:center!important}#account-invite-resend span:last-child{display:none!important}}';
      document.head.appendChild(style);
    }
    const button = document.createElement('button');
    button.id = 'account-invite-resend';
    button.type = 'button';
    button.className = 'hidden items-center justify-center gap-2 h-10 px-3 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-body not-italic shadow-sm shrink-0';
    button.innerHTML = '<span class="material-symbols-outlined text-[18px]">mark_email_unread</span><span>Reinvia accesso</span>';
    button.title = 'Invia nuovamente la mail per il primo accesso';
    const container = header.querySelector('.flex.items-center.gap-6') || header;
    const avatar = header.querySelector('#avatar-dropdown-container');
    if (avatar && avatar.parentElement === container) container.insertBefore(button, avatar); else container.appendChild(button);

    const update = () => {
      const email = findEmail();
      button.dataset.email = email;
      button.classList.toggle('hidden', !email);
      button.classList.toggle('flex', !!email);
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
        const response = await fetch('/api/primo-accesso', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({email,tipo})});
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Invio non riuscito');
        if (data.emailSent === false) throw new Error(data.emailError || 'Il server non ha potuto inviare la mail');
        notify(`Email di primo accesso reinviata al ${label}.`, true);
      } catch (error) { console.error('[Account Invite]', error); notify(error.message || 'Errore durante il reinvio della mail.', false); }
      finally { button.disabled = false; button.innerHTML = old; }
    });
    const observer = new MutationObserver(update);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    setInterval(update,1500);
    update();
  }

  async function getToken() {
    if (window.supabase?.auth) {
      const {data} = await window.supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;
    }
    const match = document.cookie.match(/(?:^|; )hdl_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    throw new Error('Sessione non disponibile. Effettua nuovamente il login.');
  }

  function notify(message, success) {
    let el = document.getElementById('account-invite-notice');
    if (!el) { el = document.createElement('div'); el.id='account-invite-notice'; document.body.appendChild(el); }
    el.className='fixed top-24 right-5 z-[9999] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl '+(success?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800');
    el.textContent=message; clearTimeout(el._timer); el._timer=setTimeout(()=>el.remove(),4500);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();
