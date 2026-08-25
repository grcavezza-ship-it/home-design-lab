import fs from 'fs/promises';
import express from 'express';

const originalSendFile = express.response.sendFile;
const SCRIPT = '<script src="/assets/js/account-invite-actions.js" defer></script>';
const TARGETS = new Set(['gestione-team.html', 'gestione-clienti.html']);

express.response.sendFile = function accountInviteSendFile(filePath, options, callback) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const file = normalized.split('/').pop() || '';
  if (!TARGETS.has(file)) {
    return originalSendFile.call(this, filePath, options, callback);
  }

  const res = this;
  fs.readFile(filePath, 'utf8').then((html) => {
    const output = html.includes('account-invite-actions.js')
      ? html
      : html.replace(/<\/body>/i, `${SCRIPT}</body>`);
    res.type('html').send(output);
  }).catch((error) => {
    console.error('[account-invite-inject]', error.message);
    originalSendFile.call(res, filePath, options, callback);
  });
};
