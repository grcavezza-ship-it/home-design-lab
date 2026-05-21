(() => {
  'use strict';

  const toast = (message, type) => {
    const old = document.querySelector('[data-hdl-toast]');
    if (old) old.remove();

    const colors = {
      success: '#166534',
      error: '#b91c1c',
      info: '#1e40af'
    };

    const el = document.createElement('div');
    el.setAttribute('data-hdl-toast', '1');
    el.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'padding:14px 18px',
      'color:#fff',
      'font-size:14px',
      'max-width:380px',
      'border-radius:12px',
      'box-shadow:0 10px 30px rgba(0,0,0,.18)',
      `background:${colors[type] || colors.info}`
    ].join(';');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.style.cssText = 'margin-left:6px;opacity:.85;font-size:18px;line-height:1;padding:0 6px;';
    btn.addEventListener('click', () => el.remove());

    const p = document.createElement('p');
    p.style.cssText = 'margin:0;flex:1;';
    p.textContent = message;

    el.appendChild(p);
    el.appendChild(btn);
    document.body.appendChild(el);

    setTimeout(() => {
      if (el.parentElement) el.remove();
    }, 6000);
  };

  const setLoading = (form, loading) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.75' : '';
  };

  const pickValue = (form, selector) => {
    const el = form.querySelector(selector);
    if (!el) return '';
    return String(el.value || '').trim();
  };

  const buildVisitMessage = (form) => {
    const types = Array.from(form.querySelectorAll('input[name="propertyType"]:checked')).map((i) => i.value);
    const phone = pickValue(form, '[name="visitPhone"]');
    const code = pickValue(form, '[name="visitCode"]');
    const date = pickValue(form, '[name="visitDate"]');

    const parts = [];
    if (types.length) parts.push(`Tipologia: ${types.join(', ')}`);
    if (phone) parts.push(`Telefono: ${phone}`);
    if (code) parts.push(`Codice immobile: ${code}`);
    if (date) parts.push(`Data visita: ${date}`);

    return parts.join('\n');
  };

  const setup = () => {
    const forms = document.querySelectorAll('form[data-contact-form]');
    if (!forms.length) return;

    forms.forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const kind = form.getAttribute('data-contact-form');
        let name = '';
        let email = '';
        let subject = '';
        let message = '';

        if (kind === 'lab') {
          name = pickValue(form, '[name="labName"]');
          email = pickValue(form, '[name="labEmail"]');
          const size = pickValue(form, '[name="labProjectSize"]');
          const brief = pickValue(form, '[name="labBrief"]');
          subject = 'Consulenza Lab';
          message = [size ? `Dimensioni progetto: ${size}` : '', brief ? `Brief tecnico: ${brief}` : ''].filter(Boolean).join('\n');
        } else {
          name = pickValue(form, '[name="visitName"]');
          email = pickValue(form, '[name="visitEmail"]');
          subject = 'Visita Immobili';
          message = buildVisitMessage(form);
        }

        if (!name || !email || !message) {
          toast('Compila nome, email e richiesta.', 'error');
          return;
        }

        setLoading(form, true);
        try {
          const res = await fetch('/api/contatti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast(data.error || 'Errore durante l’invio. Riprova tra poco.', 'error');
            return;
          }

          toast(data.message || 'Messaggio inviato.', 'success');
          form.reset();
        } catch {
          toast('Errore di rete. Controlla la connessione e riprova.', 'error');
        } finally {
          setLoading(form, false);
        }
      });
    });
  };

  document.addEventListener('DOMContentLoaded', setup);
})();
