/**
 * Template email brandizzati per Home Design Lab.
 * Tutte le email condividono header (logo), stili, footer con recapiti.
 */
export function wrapHtml(bodyHtml) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f6f3f2; font-family:'Manrope','Arial',sans-serif; }
    .outer { width:100%; background:#f6f3f2; padding:32px 16px; }
    .inner { max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
    .header { background:#ffffff; padding:32px 40px 16px; text-align:center; border-bottom:1px solid #e8e5e3; }
    .header img { max-width:160px; height:auto; }
    .body { padding:32px 40px; color:#1b1c1c; font-size:15px; line-height:1.7; }
    .body h1 { font-family:'Noto Serif','Georgia',serif; font-size:22px; font-weight:400; color:#1b1c1c; margin:0 0 20px; text-align:center; }
    .body h2 { font-family:'Noto Serif','Georgia',serif; font-size:18px; font-weight:400; color:#186C32; margin:24px 0 12px; }
    .body p { margin:0 0 16px; color:#40493f; }
    .body strong { color:#1b1c1c; }
    .label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#707a6e; margin-bottom:4px; }
    .value { font-size:15px; color:#1b1c1c; margin-bottom:16px; }
    .divider { height:1px; background:#e8e5e3; margin:24px 0; }
    .cta { text-align:center; margin:28px 0; }
    .cta a { display:inline-block; background:#186C32; color:#ffffff !important; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:14px; font-weight:600; }
    .cta a:hover { background:#145a2a; }
    .footer { background:#f6f3f2; padding:24px 40px; text-align:center; font-size:12px; color:#707a6e; line-height:1.6; }
    .footer a { color:#186C32; text-decoration:underline; }
    @media only screen and (max-width:480px) {
      .inner { border-radius:8px; }
      .body { padding:24px 20px; }
      .header { padding:24px 20px 12px; }
      .footer { padding:20px; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="inner">
      <div class="header">
        <img src="https://www.homedesignlab.it/assets/images/Logo%20Home%20Design%20Lab.png" alt="Home Design Lab" style="max-width:160px;height:auto;"/>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <strong>Home Design Lab</strong><br/>
        Via Mulimento, 23 — 80033 Cicciano (NA)<br/>
        <a href="mailto:info@homedesignlab.it">info@homedesignlab.it</a> · <a href="https://www.homedesignlab.it">www.homedesignlab.it</a><br/><br/>
        &copy; ${year} Home Design Lab. Tutti i diritti riservati.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Template per Primo Accesso / Imposta Password
 * @param {string} link - URL per impostare la password
 */
export function primoAccesso(link) {
  const body = `
    <h1>Benvenuto in Home Design Lab</h1>
    <p>Siamo lieti di darti il benvenuto nel portale ufficiale dello studio.</p>
    <p>Per accedere alla piattaforma e gestire i tuoi progetti, &egrave; necessario impostare la tua password personale.</p>
    <div class="cta">
      <a href="${link}">Imposta la tua Password</a>
    </div>
    <p style="font-size:13px;color:#707a6e;">Per motivi di sicurezza, questo link scadr&agrave; tra <strong>24 ore</strong>. Se non hai richiesto tu questo accesso, ignora questa email.</p>
    <div class="divider"></div>
    <p style="font-size:13px;">A presto,<br/><strong>Il Team di Home Design Lab</strong></p>
  `;
  return wrapHtml(body);
}

/**
 * Template per notifica nuovo contatto dal sito
 * @param {object} data - { name, email, subject, message }
 */
export function nuovoContatto(data) {
  const body = `
    <h1>Nuovo messaggio dal sito</h1>
    <p style="text-align:center;color:#707a6e;">Hai ricevuto una nuova richiesta dal modulo contatti.</p>
    <div class="divider"></div>
    <div class="label">Nome</div>
    <div class="value">${sanitizeHtml(data.name)}</div>
    <div class="label">Email</div>
    <div class="value"><a href="mailto:${sanitizeHtml(data.email)}">${sanitizeHtml(data.email)}</a></div>
    <div class="label">Oggetto</div>
    <div class="value">${sanitizeHtml(data.subject || 'non specificato')}</div>
    <div class="divider"></div>
    <div class="label">Messaggio</div>
    <div class="value" style="white-space:pre-wrap;background:#f6f3f2;padding:16px;border-radius:8px;font-size:14px;">${sanitizeHtml(data.message)}</div>
  `;
  return wrapHtml(body);
}

/**
 * Template per notifica nuova iscrizione newsletter
 * @param {string} email - email dell'iscritto
 * @param {string} source - provenienza (es: journal, sito)
 */
export function nuovaNewsletter(email, source) {
  const body = `
    <h1>Nuova iscrizione Newsletter</h1>
    <p style="text-align:center;color:#707a6e;">Una nuova persona si &egrave; iscritta alla newsletter.</p>
    <div class="divider"></div>
    <div class="label">Email</div>
    <div class="value"><a href="mailto:${sanitizeHtml(email)}">${sanitizeHtml(email)}</a></div>
    <div class="label">Provenienza</div>
    <div class="value">${sanitizeHtml(source || 'sito')}</div>
  `;
  return wrapHtml(body);
}

function sanitizeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
