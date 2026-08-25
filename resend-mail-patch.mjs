import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
const resendFrom = String(process.env.RESEND_FROM_EMAIL || '').trim();

if (resendApiKey) {
    const originalCreateTransport = nodemailer.createTransport.bind(nodemailer);

    nodemailer.createTransport = function createTransportPatched(options = {}, ...rest) {
        // The existing application uses Nodemailer's sendMail() API.
        // We preserve that contract and transparently route mail through
        // Resend's HTTPS API, avoiding Render Free's SMTP egress block.
        if (!resendApiKey) return originalCreateTransport(options, ...rest);

        return {
            async sendMail(message = {}) {
                const from = resendFrom || message.from;
                const to = message.to;

                if (!from) throw new Error('RESEND_FROM_EMAIL non configurata');
                if (!to) throw new Error('Destinatario email mancante');

                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from,
                        to: Array.isArray(to) ? to : [to],
                        subject: message.subject || '',
                        html: message.html || undefined,
                        text: message.text || undefined,
                        reply_to: message.replyTo || message.reply_to || undefined
                    })
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const detail = payload?.message || payload?.error || `HTTP ${response.status}`;
                    throw new Error(`Resend: ${detail}`);
                }

                return {
                    messageId: payload?.id,
                    response: '250 2.0.0 OK',
                    accepted: Array.isArray(to) ? to : [to],
                    rejected: []
                };
            }
        };
    };

    console.log('[Email] Resend HTTPS transport enabled');
} else {
    console.warn('[Email] RESEND_API_KEY non configurata: fallback SMTP attivo');
}
